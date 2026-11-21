import { Link, useSearchParams } from 'react-router';
import AdminShell from '../../components/admin/AdminShell';
import { ACTIVITY_LABELS, GOAL_LABELS, NUTRITION_STATUS_LABELS, formatDate } from '../../components/admin/format';
import { useLoad } from '../../components/admin/useLoad';
import { useAuth } from '../../auth/AuthContext';
import { repo, type NutritionRequest } from '../../data';
import Badge from '../../components/ui/Badge';
import { EmptyState, ErrorState, Loading } from '../../components/ui/States';
import { LinkButton } from '../../components/ui/Button';

type Filtro = 'sin-asignar' | 'mias' | 'respondidas' | 'todas';

const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'sin-asignar', label: 'Sin asignar' },
  { value: 'mias', label: 'Mías' },
  { value: 'respondidas', label: 'Respondidas' },
  { value: 'todas', label: 'Todas' },
];

function esFiltro(value: string | null): value is Filtro {
  return FILTROS.some((f) => f.value === value);
}

function asignadaA(r: NutritionRequest, myId: string): string {
  if (r.nutritionist_id === null) return 'Nadie';
  if (r.nutritionist_id === myId) return 'Yo';
  return 'Otra persona';
}

export default function AdminNutricionPage() {
  const { session } = useAuth();
  const myId = session?.user.id ?? '';
  const [params] = useSearchParams();
  const param = params.get('filtro');
  const filtro: Filtro = esFiltro(param) ? param : 'sin-asignar';

  const { state, retry } = useLoad(() => repo.listAllNutritionRequests(), [myId]);

  const pasa = (r: NutritionRequest): boolean => {
    switch (filtro) {
      case 'sin-asignar': return r.nutritionist_id === null;
      case 'mias': return r.nutritionist_id === myId;
      case 'respondidas': return r.status === 'respondida';
      default: return true;
    }
  };

  return (
    <AdminShell title="Solicitudes de nutrición">
      <nav aria-label="Filtrar solicitudes" className="mb-6 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.value}
            to={`/admin/nutricion?filtro=${f.value}`}
            aria-current={filtro === f.value ? 'page' : undefined}
            className={`rounded-full px-4 py-2 text-sm font-extrabold transition-colors ${
              filtro === f.value ? 'bg-navy-900 text-white' : 'bg-white text-navy-900 hover:bg-slate-100'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {state.status === 'loading' ? <Loading /> : null}
      {state.status === 'error' ? <ErrorState message={state.message} onRetry={retry} /> : null}
      {state.status === 'ok' ? (() => {
        const lista = state.data
          .filter(pasa)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        if (lista.length === 0) {
          return (
            <EmptyState
              title="No hay solicitudes aquí"
              text={filtro === 'todas' ? 'Todavía nadie ha pedido una guía nutricional.' : 'Cambia el filtro para ver otras solicitudes.'}
              action={filtro === 'todas' ? undefined : { to: '/admin/nutricion?filtro=todas', label: 'Ver todas' }}
            />
          );
        }
        return (
          <ul className="space-y-4">
            {lista.map((r) => (
              <li key={r.id} className="flex flex-col gap-4 rounded-[1.75rem] bg-white p-5 shadow-xl shadow-navy-900/5 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-500">{formatDate(r.created_at)}</p>
                  <p className="display mt-1 truncate text-xl text-navy-900">{r.requester_name ?? 'Sin nombre'}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {GOAL_LABELS[r.goal]} · {ACTIVITY_LABELS[r.activity_level]} · IMC {r.ai_guide ? r.ai_guide.bmi.toFixed(1) : '—'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={r.status === 'respondida' ? 'green' : 'blue'}>{NUTRITION_STATUS_LABELS[r.status]}</Badge>
                  <Badge tone="slate">Asignada a: {asignadaA(r, myId)}</Badge>
                  <LinkButton to={`/admin/nutricion/${r.id}`} variant="secondary" size="md">Ver</LinkButton>
                </div>
              </li>
            ))}
          </ul>
        );
      })() : null}
    </AdminShell>
  );
}
