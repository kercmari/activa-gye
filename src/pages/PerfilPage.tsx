import { useRef, useState, type KeyboardEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { repo } from '../data';
import { useAuth } from '../auth/AuthContext';
import { usePhase } from '../auth/SettingsContext';
import BackButton from '../components/ui/BackButton';
import Badge from '../components/ui/Badge';
import { Button, LinkButton } from '../components/ui/Button';
import { errorMessage } from '../components/ui/States';
import Avatar from '../components/profile/Avatar';
import DataTab from '../components/profile/DataTab';
import FavoritesTab from '../components/profile/FavoritesTab';
import { ROLE_LABELS } from '../components/profile/labels';

const TABS = [
  { id: 'datos', label: 'Mis datos' },
  { id: 'favoritos', label: 'Mis favoritos' },
] as const;
type TabId = (typeof TABS)[number]['id'];

function isTab(value: string | null): value is TabId {
  return TABS.some((t) => t.id === value);
}

/** Mi perfil: cabecera de la cuenta y pestañas (datos, favoritos). Ficha, calendario y pagos están en /mi-panel. */
export default function PerfilPage() {
  const { session, refresh } = useAuth();
  const phase2 = usePhase(2);
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (!session) return null;

  const { profile } = session;
  const tabParam = params.get('tab');
  const tab: TabId = isTab(tabParam) ? tabParam : 'datos';
  const bienvenida = params.get('bienvenida') === '1';
  const guardado = (location.state as { saved?: boolean } | null)?.saved === true;

  const selectTab = (id: TabId) => {
    const next = new URLSearchParams(params);
    next.set('tab', id);
    setParams(next, { replace: true });
  };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let target: number | null = null;
    if (e.key === 'ArrowRight') target = (index + 1) % TABS.length;
    if (e.key === 'ArrowLeft') target = (index - 1 + TABS.length) % TABS.length;
    if (e.key === 'Home') target = 0;
    if (e.key === 'End') target = TABS.length - 1;
    if (target === null) return;
    e.preventDefault();
    selectTab(TABS[target].id);
    tabRefs.current[target]?.focus();
  };

  const signOut = async () => {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await repo.signOut();
      navigate('/', { replace: true });
      await refresh();
    } catch (error) {
      setSignOutError(errorMessage(error));
      setSigningOut(false);
    }
  };

  return (
    <>
      <section className="bg-navy-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <BackButton fallback="/" className="-ml-2 mb-6 text-white hover:bg-white/10" />
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <Avatar path={profile.avatar_path} name={profile.full_name} size="xl" />
              <div className="min-w-0">
                <p className="eyebrow !text-brand-blue">Mi cuenta</p>
                <h1 className="display mt-2 break-words text-3xl text-white md:text-4xl">{profile.full_name}</h1>
                <p className="mt-2 break-all text-slate-300">{session.user.email}</p>
                {profile.role !== 'usuario' ? (
                  <Badge tone="orange" className="mt-3">{ROLE_LABELS[profile.role]}</Badge>
                ) : null}
              </div>
            </div>
            <div className="flex flex-col items-start gap-3">
              <div className="flex flex-wrap gap-3">
                <LinkButton to="/perfil/editar" variant="secondary" onDark>Editar perfil</LinkButton>
                <Button variant="ghost" onDark onClick={signOut} disabled={signingOut}>
                  {signingOut ? 'Saliendo…' : 'Salir'}
                </Button>
              </div>
              {signOutError ? <p role="alert" className="text-sm font-semibold text-red-300">{signOutError}</p> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        {bienvenida ? (
          <div role="status" className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-semibold text-emerald-800">
            ¡Tu cuenta está lista! Completa tus datos para recibir mejores recomendaciones.
          </div>
        ) : null}
        {guardado ? (
          <div role="status" className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-semibold text-emerald-800">
            Cambios guardados
          </div>
        ) : null}
        {profile.requested_role === 'nutricionista' && profile.nutri_status === 'pendiente' ? (
          <div role="status" className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 font-semibold text-blue-800">
            Tu solicitud de nutricionista está en revisión. El equipo la aprueba y te avisamos.
          </div>
        ) : null}
        {profile.requested_role === 'nutricionista' && profile.nutri_status === 'rechazado' ? (
          <div role="status" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 font-semibold text-amber-800">
            Tu solicitud de nutricionista no fue aprobada. Tu cuenta sigue como paciente.
          </div>
        ) : null}
        {!profile.avatar_path ? (
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <p className="font-semibold text-amber-800">Agrega tu foto para que tu perfil se vea completo.</p>
            <LinkButton to="/perfil/editar" variant="primary" size="md" className="shrink-0">Agregar foto</LinkButton>
          </div>
        ) : null}

        {phase2 ? (
          <div className="mb-8 flex flex-col gap-4 rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="display text-2xl text-navy-900">Mi panel: ficha, calendario y pagos</h2>
              <p className="mt-2 text-slate-600">Tu ficha, tu calendario y tus pagos están en un solo lugar.</p>
            </div>
            <LinkButton to="/mi-panel" variant="primary" className="shrink-0">Abrir mi panel</LinkButton>
          </div>
        ) : null}

        <div role="tablist" aria-label="Secciones de mi perfil" className="mb-8 flex gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm">
          {TABS.map((t, i) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                ref={(el) => { tabRefs.current[i] = el; }}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={active}
                aria-controls={`panel-${t.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => selectTab(t.id)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={[
                  'whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-extrabold transition-colors',
                  active ? 'bg-navy-900 text-white' : 'text-navy-900 hover:bg-slate-100',
                ].join(' ')}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'datos' ? <DataTab profile={profile} email={session.user.email} /> : null}
          {tab === 'favoritos' ? <FavoritesTab /> : null}
        </div>
      </section>
    </>
  );
}
