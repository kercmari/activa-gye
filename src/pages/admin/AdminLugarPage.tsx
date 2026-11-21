import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import AdminShell from '../../components/admin/AdminShell';
import { DAYS, SERVICE_LABELS, formatDate } from '../../components/admin/format';
import { useLoad } from '../../components/admin/useLoad';
import { repo, type DayKey, type Hours, type Place, type PlaceInput, type Sector, type ServiceId, type Sport } from '../../data';
import BackButton from '../../components/ui/BackButton';
import { Button } from '../../components/ui/Button';
import { SelectField, TextArea, TextField } from '../../components/ui/Field';
import { ErrorState, Loading, errorMessage } from '../../components/ui/States';

const GUAYAQUIL: [number, number] = [-2.1894, -79.8891];
const SERVICIOS = Object.keys(SERVICE_LABELS) as ServiceId[];

interface DiaForm {
  open: boolean;
  from: string;
  to: string;
}

interface Form {
  name: string;
  description: string;
  address: string;
  sector_id: string;
  lat: string;
  lng: string;
  phone: string;
  whatsapp: string;
  website: string;
  instagram: string;
  photo_url: string;
  price_from: string;
  price_note: string;
  promotions: string;
  services: ServiceId[];
  sport_ids: string[];
  sinHorario: boolean;
  dias: Record<DayKey, DiaForm>;
  published: boolean;
  verified_at: string | null;
}

type Errores = Partial<Record<'name' | 'lat' | 'lng' | 'sport_ids' | 'website' | 'photo_url' | 'price_from' | 'horario', string>>;

const vacio = (s: string | null): string => s ?? '';
const nulo = (s: string): string | null => (s.trim() ? s.trim() : null);

function formInicial(p: Place | null): Form {
  const dias = {} as Record<DayKey, DiaForm>;
  for (const { key } of DAYS) {
    const franja = p?.hours?.[key]?.[0];
    dias[key] = {
      open: !!franja,
      from: franja?.[0] ?? '06:00',
      to: franja?.[1] ?? '18:00',
    };
  }
  return {
    name: p?.name ?? '',
    description: vacio(p?.description ?? null),
    address: vacio(p?.address ?? null),
    sector_id: p?.sector_id ?? '',
    lat: p ? String(p.lat) : '',
    lng: p ? String(p.lng) : '',
    phone: vacio(p?.phone ?? null),
    whatsapp: vacio(p?.whatsapp ?? null),
    website: vacio(p?.website ?? null),
    instagram: vacio(p?.instagram ?? null),
    photo_url: vacio(p?.photo_url ?? null),
    price_from: p?.price_from === null || p?.price_from === undefined ? '' : String(p.price_from),
    price_note: vacio(p?.price_note ?? null),
    promotions: vacio(p?.promotions ?? null),
    services: p?.services ?? [],
    sport_ids: p?.sport_ids ?? [],
    sinHorario: p ? p.hours === null : false,
    dias,
    published: p?.published ?? false,
    verified_at: p?.verified_at ?? null,
  };
}

function validar(f: Form): Errores {
  const e: Errores = {};
  if (f.name.trim().length < 2) e.name = 'Escribe el nombre (mínimo 2 letras).';

  const lat = Number(f.lat);
  const lng = Number(f.lng);
  if (f.lat.trim() === '' || !Number.isFinite(lat) || lat < -2.6 || lat > -1.8) {
    e.lat = 'Latitud fuera de Guayaquil. Haz clic en el mapa o escribe un valor entre -2.6 y -1.8.';
  }
  if (f.lng.trim() === '' || !Number.isFinite(lng) || lng < -80.3 || lng > -79.5) {
    e.lng = 'Longitud fuera de Guayaquil. Haz clic en el mapa o escribe un valor entre -80.3 y -79.5.';
  }

  if (f.sport_ids.length === 0) e.sport_ids = 'Elige al menos un deporte.';

  const web = f.website.trim();
  if (web && !/^https?:\/\//i.test(web)) e.website = 'La web debe empezar con https://';
  const foto = f.photo_url.trim();
  if (foto && !/^https?:\/\//i.test(foto)) e.photo_url = 'La URL de la foto debe empezar con https://';

  const precio = f.price_from.trim();
  if (precio && (!Number.isFinite(Number(precio)) || Number(precio) < 0)) {
    e.price_from = 'Escribe un precio válido (0 o más) o déjalo vacío para "Consultar precio".';
  }

  if (!f.sinHorario) {
    const abiertos = DAYS.filter(({ key }) => f.dias[key].open);
    if (abiertos.length === 0) {
      e.horario = 'Marca al menos un día abierto, o marca "Horario por confirmar".';
    } else {
      const malo = abiertos.find(({ key }) => {
        const d = f.dias[key];
        return !d.from || !d.to || d.from >= d.to;
      });
      if (malo) e.horario = `Revisa el horario del ${malo.label.toLowerCase()}: la hora de cierre debe ser posterior a la de apertura.`;
    }
  }
  return e;
}

function horasDesde(f: Form): Hours {
  const horas = {} as Hours;
  for (const { key } of DAYS) {
    const d = f.dias[key];
    horas[key] = d.open ? [[d.from, d.to]] : [];
  }
  return horas;
}

function ClickEnMapa({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    },
  });
  return null;
}

function Casillas<T extends string>({
  legend, opciones, valor, onCambio, error,
}: {
  legend: string;
  opciones: { value: T; label: string }[];
  valor: T[];
  onCambio: (v: T[]) => void;
  error?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">{legend}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {opciones.map((o) => (
          <label key={o.value} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-navy-900">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-blue"
              checked={valor.includes(o.value)}
              onChange={(e) => onCambio(e.target.checked ? [...valor, o.value] : valor.filter((x) => x !== o.value))}
            />
            {o.label}
          </label>
        ))}
      </div>
      {error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}
    </fieldset>
  );
}

function LugarForm({ original, sectores, deportes }: { original: Place | null; sectores: Sector[]; deportes: Sport[] }) {
  const navigate = useNavigate();
  const [f, setF] = useState<Form>(() => formInicial(original));
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setF((prev) => ({ ...prev, [key]: value }));
  const setDia = (key: DayKey, patch: Partial<DiaForm>) =>
    setF((prev) => ({ ...prev, dias: { ...prev.dias, [key]: { ...prev.dias[key], ...patch } } }));

  const copiarLunes = () => {
    setF((prev) => {
      const lunes = prev.dias.mon;
      const dias = { ...prev.dias };
      for (const key of ['tue', 'wed', 'thu', 'fri'] as DayKey[]) dias[key] = { ...lunes };
      return { ...prev, dias };
    });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validar(f);
    setErrores(err);
    setError(null);
    if (Object.keys(err).length > 0) return;

    const input: PlaceInput = {
      id: original?.id,
      name: f.name.trim(),
      description: nulo(f.description),
      address: nulo(f.address),
      sector_id: f.sector_id || null,
      lat: Number(f.lat),
      lng: Number(f.lng),
      phone: nulo(f.phone),
      whatsapp: nulo(f.whatsapp),
      website: nulo(f.website),
      instagram: nulo(f.instagram),
      photo_url: nulo(f.photo_url),
      gallery: original?.gallery ?? [],
      price_from: f.price_from.trim() === '' ? null : Number(f.price_from),
      price_note: nulo(f.price_note),
      promotions: nulo(f.promotions),
      services: f.services,
      hours: f.sinHorario ? null : horasDesde(f),
      published: f.published,
      verified_at: f.verified_at,
      sport_ids: f.sport_ids,
    };

    setGuardando(true);
    try {
      await repo.adminSavePlace(input);
      navigate('/admin/lugares', { state: { aviso: 'Lugar guardado.' } });
    } catch (ex) {
      setError(errorMessage(ex));
    } finally {
      setGuardando(false);
    }
  };

  const lat = Number(f.lat);
  const lng = Number(f.lng);
  const hayPunto = f.lat.trim() !== '' && f.lng.trim() !== '' && Number.isFinite(lat) && Number.isFinite(lng);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}

      <section className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
        <h2 className="display text-2xl text-navy-900">Datos básicos</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <TextField label="Nombre" value={f.name} onChange={(e) => set('name', e.target.value)} error={errores.name} />
          <SelectField label="Sector" value={f.sector_id} onChange={(e) => set('sector_id', e.target.value)}>
            <option value="">Sin sector</option>
            {sectores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </SelectField>
          <div className="md:col-span-2">
            <TextArea label="Descripción" rows={4} value={f.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <TextField label="Dirección" value={f.address} onChange={(e) => set('address', e.target.value)} />
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
        <h2 className="display text-2xl text-navy-900">Ubicación</h2>
        <p className="mt-2 text-sm text-slate-600">Haz clic en el mapa para mover el punto, o escribe la latitud y la longitud.</p>
        <div className="mt-5 h-72 overflow-hidden rounded-2xl">
          <MapContainer center={hayPunto ? [lat, lng] : GUAYAQUIL} zoom={14} scrollWheelZoom={false} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickEnMapa onPick={(la, ln) => { set('lat', String(la)); set('lng', String(ln)); }} />
            {hayPunto ? <CircleMarker center={[lat, lng]} radius={8} pathOptions={{ color: '#2f80ed', fillColor: '#2f80ed', fillOpacity: 0.8 }} /> : null}
          </MapContainer>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <TextField label="Latitud" inputMode="decimal" value={f.lat} onChange={(e) => set('lat', e.target.value)} error={errores.lat} />
          <TextField label="Longitud" inputMode="decimal" value={f.lng} onChange={(e) => set('lng', e.target.value)} error={errores.lng} />
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
        <h2 className="display text-2xl text-navy-900">Contacto y redes</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <TextField label="Teléfono" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
          <TextField label="WhatsApp" value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
          <TextField label="Web" placeholder="https://" value={f.website} onChange={(e) => set('website', e.target.value)} error={errores.website} />
          <TextField label="Instagram" placeholder="@usuario" value={f.instagram} onChange={(e) => set('instagram', e.target.value)} />
          <div className="md:col-span-2">
            <TextField label="URL de la foto" placeholder="https://" value={f.photo_url} onChange={(e) => set('photo_url', e.target.value)} error={errores.photo_url} />
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
        <h2 className="display text-2xl text-navy-900">Precio y promociones</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <TextField
            label="Precio desde (USD)"
            inputMode="decimal"
            value={f.price_from}
            onChange={(e) => set('price_from', e.target.value)}
            error={errores.price_from}
            hint="Déjalo vacío para «Consultar precio». 0 = gratis."
          />
          <TextField label="Nota de precio" value={f.price_note} onChange={(e) => set('price_note', e.target.value)} />
          <div className="md:col-span-2">
            <TextArea label="Promociones" rows={3} value={f.promotions} onChange={(e) => set('promotions', e.target.value)} />
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
        <h2 className="display text-2xl text-navy-900">Servicios y deportes</h2>
        <div className="mt-5 space-y-6">
          <Casillas
            legend="Servicios"
            opciones={SERVICIOS.map((id) => ({ value: id, label: SERVICE_LABELS[id] }))}
            valor={f.services}
            onCambio={(v) => set('services', v)}
          />
          <Casillas
            legend="Deportes"
            opciones={deportes.map((d) => ({ value: d.id, label: d.name }))}
            valor={f.sport_ids}
            onCambio={(v) => set('sport_ids', v)}
            error={errores.sport_ids}
          />
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
        <h2 className="display text-2xl text-navy-900">Horario</h2>
        <label className="mt-4 flex items-center gap-2 text-sm font-bold text-navy-900">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand-blue"
            checked={f.sinHorario}
            onChange={(e) => set('sinHorario', e.target.checked)}
          />
          Horario por confirmar
        </label>

        {!f.sinHorario ? (
          <div className="mt-5 space-y-3">
            {DAYS.map(({ key, label }) => {
              const d = f.dias[key];
              return (
                <div key={key} className="grid grid-cols-[6.5rem_auto_1fr_1fr] items-center gap-3">
                  <span className="text-sm font-bold text-navy-900">{label}</span>
                  <input
                    type="checkbox"
                    aria-label={`${label}: abierto`}
                    className="h-4 w-4 accent-brand-blue"
                    checked={d.open}
                    onChange={(e) => setDia(key, { open: e.target.checked })}
                  />
                  <input
                    type="time"
                    aria-label={`${label}: abre`}
                    disabled={!d.open}
                    value={d.from}
                    onChange={(e) => setDia(key, { from: e.target.value })}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
                  />
                  <input
                    type="time"
                    aria-label={`${label}: cierra`}
                    disabled={!d.open}
                    value={d.to}
                    onChange={(e) => setDia(key, { to: e.target.value })}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
                  />
                </div>
              );
            })}
            <div>
              <Button variant="secondary" size="md" onClick={copiarLunes}>Copiar lunes a días hábiles</Button>
            </div>
            {errores.horario ? <p className="text-sm font-semibold text-red-600">{errores.horario}</p> : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">Se mostrará como «Horario por confirmar» en el sitio.</p>
        )}
      </section>

      <section className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
        <h2 className="display text-2xl text-navy-900">Publicación</h2>
        <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <label className="flex items-center gap-2 text-sm font-bold text-navy-900">
            <input type="checkbox" className="h-4 w-4 accent-brand-blue" checked={f.published} onChange={(e) => set('published', e.target.checked)} />
            Publicado (visible en el sitio)
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-600">
              {f.verified_at ? `Verificado el ${formatDate(f.verified_at)}` : 'Sin verificar'}
            </p>
            <Button variant="secondary" size="md" onClick={() => set('verified_at', new Date().toISOString())}>
              Marcar verificado hoy
            </Button>
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => navigate('/admin/lugares')}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar lugar'}
        </Button>
      </div>
    </form>
  );
}

export default function AdminLugarPage() {
  const { id } = useParams();
  const esNuevo = !id;

  const { state, retry } = useLoad(async () => {
    const [lugares, sectores, deportes] = await Promise.all([
      esNuevo ? Promise.resolve<Place[]>([]) : repo.adminListPlaces(),
      repo.listSectors(),
      repo.listSports(),
    ]);
    const original = esNuevo ? null : lugares.find((p) => p.id === id) ?? null;
    return { original, sectores, deportes, noExiste: !esNuevo && original === null };
  }, [id]);

  const titulo = state.status === 'ok' && state.data.original ? state.data.original.name : 'Lugar';

  return (
    <AdminShell title={esNuevo ? 'Nuevo lugar' : titulo}>
      <BackButton fallback="/admin/lugares" className="-ml-2 mb-4" />
      {state.status === 'loading' ? <Loading /> : null}
      {state.status === 'error' ? <ErrorState message={state.message} onRetry={retry} /> : null}
      {state.status === 'ok' && state.data.noExiste ? (
        <div className="rounded-[1.75rem] bg-white px-6 py-12 text-center shadow-xl shadow-navy-900/5">
          <p className="font-bold text-navy-900">Este lugar no existe o ya no está disponible.</p>
        </div>
      ) : null}
      {state.status === 'ok' && !state.data.noExiste ? (
        <LugarForm
          key={id ?? 'nuevo'}
          original={state.data.original}
          sectores={state.data.sectores}
          deportes={state.data.deportes}
        />
      ) : null}
    </AdminShell>
  );
}
