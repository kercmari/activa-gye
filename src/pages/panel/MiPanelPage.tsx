import { useRef, type KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { usePhase } from '../../auth/SettingsContext';
import PhaseGate from '../../components/PhaseGate';
import PageHeader from '../../components/ui/PageHeader';
import FichaTab from '../../components/panel/FichaTab';
import CalendarioTab from '../../components/panel/CalendarioTab';
import PagosTab from '../../components/panel/PagosTab';
import MiNutricionistaTab from '../../components/panel/MiNutricionistaTab';

const TABS = [
  { id: 'ficha', label: 'Mi ficha', phase: null },
  { id: 'calendario', label: 'Calendario y progreso', phase: 2 },
  { id: 'pagos', label: 'Pagos', phase: 2 },
  { id: 'nutricionista', label: 'Mi nutricionista', phase: 2 },
] as const;
type TabId = (typeof TABS)[number]['id'];

function isTab(value: string | null): value is TabId {
  return TABS.some((t) => t.id === value);
}

/** Mi panel (paciente): ficha inicial y, cuando estén activas, las pestañas de la fase 2. */
export default function MiPanelPage() {
  const { session } = useAuth();
  const [params, setParams] = useSearchParams();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const phase2 = usePhase(2);

  if (!session) return null;

  const firstName = session.profile.full_name.trim().split(/\s+/)[0] || '';
  // Con la fase 2 apagada solo existe la pestaña de la ficha: nada que anuncie lo que viene.
  const visibleTabs = TABS.filter((t) => t.phase === null || phase2);
  const tabParam = params.get('tab');
  const tab: TabId = isTab(tabParam) && visibleTabs.some((t) => t.id === tabParam) ? tabParam : 'ficha';

  const selectTab = (id: TabId) => {
    const next = new URLSearchParams(params);
    next.set('tab', id);
    setParams(next, { replace: true });
  };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const n = visibleTabs.length;
    let target: number | null = null;
    if (e.key === 'ArrowRight') target = (index + 1) % n;
    if (e.key === 'ArrowLeft') target = (index - 1 + n) % n;
    if (e.key === 'Home') target = 0;
    if (e.key === 'End') target = n - 1;
    if (target === null) return;
    e.preventDefault();
    selectTab(visibleTabs[target].id);
    tabRefs.current[target]?.focus();
  };

  return (
    <>
      <PageHeader
        eyebrow="Mi panel"
        title={firstName ? `Hola, ${firstName}` : 'Hola'}
        subtitle="Completa tu ficha inicial y sigue tu atención en un solo lugar."
        back="/perfil"
      />

      <section className="mx-auto max-w-6xl px-4 py-10">
        <Link
          to="/mi-plan/hoy"
          className="mb-8 flex items-center justify-between gap-4 rounded-[1.75rem] bg-brand-orange p-6 text-white shadow-xl shadow-navy-900/5 transition-opacity hover:opacity-95"
        >
          <span>
            <span className="eyebrow block text-white/80">Mi plan</span>
            <span className="display mt-1 block text-2xl text-white">Mi semana gratis</span>
            <span className="mt-1 block text-sm text-white/90">Comidas y rutinas de 7 días, día a día.</span>
          </span>
          <ArrowRight className="h-6 w-6 shrink-0" aria-hidden="true" />
        </Link>

        <div role="tablist" aria-label="Secciones de mi panel" className="mb-8 flex gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm">
          {visibleTabs.map((t, i) => {
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
                  'inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-extrabold transition-colors',
                  active ? 'bg-navy-900 text-white' : 'text-navy-900 hover:bg-slate-100',
                ].join(' ')}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'ficha' ? <FichaTab /> : null}
          {tab === 'calendario' ? (
            <PhaseGate phase={2} title="Calendario y progreso"><CalendarioTab /></PhaseGate>
          ) : null}
          {tab === 'pagos' ? (
            <PhaseGate phase={2} title="Pagos"><PagosTab /></PhaseGate>
          ) : null}
          {tab === 'nutricionista' ? (
            <PhaseGate phase={2} title="Mi nutricionista"><MiNutricionistaTab /></PhaseGate>
          ) : null}
        </div>
      </section>
    </>
  );
}
