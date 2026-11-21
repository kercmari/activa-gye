import { AtSign, ExternalLink, Globe, Heart, MessageCircle, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import PlaceMap from '../components/places/PlaceMap';
import { SERVICE_OPTIONS } from '../components/places/placeOptions';
import BackButton from '../components/ui/BackButton';
import { Button, buttonClasses } from '../components/ui/Button';
import { EmptyState, ErrorState, Loading, errorMessage } from '../components/ui/States';
import { useAuth } from '../auth/AuthContext';
import { repo, type Place, type Sector, type Sport } from '../data';
import { DAY_LABELS, formatPrice, placeImage, summarizeHours } from '../lib/format';
import { googleDirectionsUrl, osmUrl } from '../lib/directions';
import { DAY_KEYS, dayKeyOf, isOpenNow } from '../lib/hours';

/** Número de WhatsApp en formato internacional: "0991234567" -> "https://wa.me/593991234567". */
function whatsappUrl(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const international = digits.startsWith('0') ? `593${digits.slice(1)}` : digits;
  return `https://wa.me/${international}`;
}

function withProtocol(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function instagramUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://instagram.com/${value.replace(/^@/, '')}`;
}

/** "2026-11-21..." -> "21/11/2026", sin pasar por la zona horaria. */
function formatVerified(iso: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : null;
}

const SPORT_PILL = 'rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-tag';
const CARD = 'rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8';

export default function LugarPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [place, setPlace] = useState<Place | null | undefined>(undefined);
  const [sports, setSports] = useState<Sport[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [now] = useState(() => new Date());
  const [saved, setSaved] = useState(false);
  const [savingBusy, setSavingBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setPlace(undefined);
      setError(null);
      try {
        const [found, sp, sec] = await Promise.all([repo.getPlace(id), repo.listSports(), repo.listSectors()]);
        if (alive) { setPlace(found); setSports(sp); setSectors(sec); }
      } catch (e: unknown) {
        if (alive) setError(errorMessage(e));
      }
    };
    void load();
    return () => { alive = false; };
  }, [id, attempt]);

  // Favorito: solo se pregunta si hay sesión.
  useEffect(() => {
    if (!session || !id) return;
    let alive = true;
    repo.isFavorite(id)
      .then((value) => { if (alive) setSaved(value); })
      .catch(() => { if (alive) setSaved(false); });
    return () => { alive = false; };
  }, [session, id]);

  const toggleSaved = async () => {
    if (!session) {
      navigate(`/ingresar?volver=/lugares/${id}`);
      return;
    }
    setSavingBusy(true);
    setSaveError(null);
    try {
      setSaved(await repo.toggleFavorite(id));
    } catch (e: unknown) {
      setSaveError(errorMessage(e));
    } finally {
      setSavingBusy(false);
    }
  };

  if (error) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12">
        <BackButton fallback="/lugares" className="mb-6" />
        <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} />
      </section>
    );
  }

  if (place === undefined) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12">
        <BackButton fallback="/lugares" className="mb-6" />
        <Loading />
      </section>
    );
  }

  if (place === null) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12">
        <BackButton fallback="/lugares" className="mb-6" />
        <EmptyState
          title="Este lugar no existe o ya no está publicado"
          text="Puede que el enlace sea antiguo. Busca otro lugar cerca de ti."
          action={{ label: 'Buscar lugares', to: '/lugares' }}
        />
      </section>
    );
  }

  const sectorName = sectors.find((s) => s.id === place.sector_id)?.name ?? 'Guayaquil';
  const sportNames = place.sport_ids
    .map((sid) => sports.find((s) => s.id === sid)?.name)
    .filter((name): name is string => Boolean(name));
  const openNow = isOpenNow(place.hours, now);
  const today = dayKeyOf(now);
  const verified = place.verified_at ? formatVerified(place.verified_at) : null;
  const serviceItems = SERVICE_OPTIONS.filter((s) => place.services.includes(s.id));
  const hasContact = Boolean(place.phone || place.whatsapp || place.website || place.instagram);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <BackButton fallback="/lugares" className="-ml-2 mb-6" />

      <img
        src={placeImage(place)}
        alt={`Foto de ${place.name}`}
        className="h-64 w-full rounded-[1.75rem] object-cover shadow-xl shadow-navy-900/10 md:h-96"
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <header>
            <div className="flex flex-wrap gap-2">
              {sportNames.map((name) => <span key={name} className={SPORT_PILL}>{name}</span>)}
            </div>
            <p className="eyebrow mt-4">{sectorName}</p>
            <h1 className="display mt-2 text-4xl text-navy-900 md:text-5xl">{place.name}</h1>
            <p className="mt-3 text-slate-600">{place.address?.trim() || 'Dirección por confirmar'}</p>
            {place.description?.trim() ? <p className="mt-4 leading-relaxed text-slate-700">{place.description}</p> : null}
          </header>

          {place.source === 'osm' ? (
            <p role="note" className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Datos de OpenStreetMap. Confirma precios y horarios con el lugar.
            </p>
          ) : null}

          <div className={CARD}>
            <h2 className="display text-2xl text-navy-900">Horario</h2>
            {place.hours === null ? (
              <p className="mt-4 font-semibold text-slate-600">Horario por confirmar</p>
            ) : (
              <>
                <p className="mt-3">
                  <span className={`inline-flex rounded-full px-3 py-1 text-sm font-extrabold ${openNow ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {openNow ? 'Abierto ahora' : 'Cerrado ahora'}
                  </span>
                </p>
                <table className="mt-5 w-full text-sm">
                  <caption className="sr-only">Horario de la semana</caption>
                  <tbody>
                    {DAY_KEYS.map((day) => {
                      const slots = place.hours?.[day] ?? [];
                      return (
                        <tr key={day} className={`border-b border-slate-100 last:border-0 ${day === today ? 'font-extrabold text-navy-900' : 'text-slate-600'}`}>
                          <th scope="row" className="py-2 text-left font-bold">{DAY_LABELS[day]}</th>
                          <td className="py-2 text-right">
                            {slots.length > 0 ? slots.map(([open, close]) => `${open}–${close}`).join(', ') : 'Cerrado'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-slate-400">{summarizeHours(place.hours)}</p>
              </>
            )}
          </div>

          <div className={CARD}>
            <h2 className="display text-2xl text-navy-900">Precio y promociones</h2>
            <p className="mt-4 text-2xl font-extrabold text-navy-900">{formatPrice(place)}</p>
            {place.price_note?.trim() ? <p className="mt-2 text-slate-600">{place.price_note}</p> : null}
            {place.promotions?.trim() ? (
              <div className="mt-5 rounded-2xl bg-orange-50 p-4 text-sm font-semibold text-brand-orange-dark">
                {place.promotions}
              </div>
            ) : null}
          </div>

          <div className={CARD}>
            <h2 className="display text-2xl text-navy-900">Servicios</h2>
            {serviceItems.length === 0 ? (
              <p className="mt-4 font-semibold text-slate-600">Servicios por confirmar</p>
            ) : (
              <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {serviceItems.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                    <s.icon className="h-5 w-5 text-brand-blue" aria-hidden="true" />
                    {s.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {hasContact ? (
            <div className={CARD}>
              <h2 className="display text-2xl text-navy-900">Contacto</h2>
              <ul className="mt-5 space-y-3 text-sm font-bold">
                {place.phone ? (
                  <li><a className="inline-flex items-center gap-2 text-navy-900 hover:text-brand-blue" href={`tel:${place.phone}`}><Phone className="h-4 w-4" aria-hidden="true" />{place.phone}</a></li>
                ) : null}
                {place.whatsapp ? (
                  <li><a className="inline-flex items-center gap-2 text-navy-900 hover:text-brand-blue" href={whatsappUrl(place.whatsapp)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" aria-hidden="true" />WhatsApp</a></li>
                ) : null}
                {place.website ? (
                  <li><a className="inline-flex items-center gap-2 text-navy-900 hover:text-brand-blue" href={withProtocol(place.website)} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4" aria-hidden="true" />Sitio web</a></li>
                ) : null}
                {place.instagram ? (
                  <li><a className="inline-flex items-center gap-2 text-navy-900 hover:text-brand-blue" href={instagramUrl(place.instagram)} target="_blank" rel="noopener noreferrer"><AtSign className="h-4 w-4" aria-hidden="true" />Instagram</a></li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {verified ? (
            <p className="text-sm text-slate-500">Datos verificados el {verified}. Confirma precios con el lugar.</p>
          ) : null}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className={CARD}>
            <a
              href={googleDirectionsUrl(place)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ variant: 'primary', size: 'lg' }, 'w-full')}
            >
              Cómo llegar
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
            <p className="mt-2 text-xs text-slate-500">Se abre en Google Maps en otra pestaña.</p>
            <a
              href={osmUrl(place)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-extrabold text-navy-900 hover:bg-slate-50"
            >
              Ver en OpenStreetMap
            </a>
            <Button
              type="button"
              variant={saved ? 'blue' : 'secondary'}
              className="mt-4 w-full"
              aria-pressed={saved}
              disabled={savingBusy}
              onClick={toggleSaved}
            >
              <Heart className="h-4 w-4" aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
              {saved ? 'Guardado en favoritos' : 'Guardar en favoritos'}
            </Button>
            {saveError ? <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{saveError}</p> : null}
            {!session ? (
              <p className="mt-3 text-xs text-slate-500">
                <Link to={`/ingresar?volver=/lugares/${id}`} className="font-bold text-brand-blue">Entra</Link> para guardar este lugar.
              </p>
            ) : null}
          </div>

          <div>
            <h2 className="sr-only">Mapa</h2>
            <PlaceMap places={[place]} center={[place.lat, place.lng]} zoom={16} color="orange" className="h-72" />
          </div>
        </aside>
      </div>
    </section>
  );
}
