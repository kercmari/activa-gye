import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import AdminShell from '../../components/admin/AdminShell';
import { useLoad } from '../../components/admin/useLoad';
import { useAuth } from '../../auth/AuthContext';
import { repo } from '../../data';
import { EmptyState, ErrorState, Loading } from '../../components/ui/States';

interface Counts {
  sinAsignar: number;
  mias: number;
  publicados: number | null;
  ocultos: number | null;
  mensajesSinLeer: number | null;
  usuarios: number | null;
}

interface CardProps {
  to: string;
  title: string;
  value: number | null;
  detail: string;
}

function Card({ to, title, value, detail }: CardProps) {
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 transition-transform hover:-translate-y-0.5"
    >
      <p className="text-sm font-extrabold text-slate-500">{title}</p>
      <p className="display mt-3 text-4xl text-navy-900">{value ?? '—'}</p>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
      <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-extrabold text-brand-blue group-hover:underline">
        Ver <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </Link>
  );
}

export default function AdminHomePage() {
  const { session } = useAuth();
  const isAdmin = session?.profile.role === 'admin';
  const myId = session?.user.id ?? '';

  const { state, retry } = useLoad<Counts>(async () => {
    const [requests, places, messages, users] = await Promise.all([
      repo.listAllNutritionRequests(),
      isAdmin ? repo.adminListPlaces() : Promise.resolve(null),
      isAdmin ? repo.adminListMessages() : Promise.resolve(null),
      isAdmin ? repo.adminListUsers() : Promise.resolve(null),
    ]);
    return {
      sinAsignar: requests.filter((r) => r.nutritionist_id === null).length,
      mias: requests.filter((r) => r.nutritionist_id === myId && r.status !== 'respondida').length,
      publicados: places ? places.filter((p) => p.published).length : null,
      ocultos: places ? places.filter((p) => !p.published).length : null,
      mensajesSinLeer: messages ? messages.filter((m) => !m.read).length : null,
      usuarios: users ? users.length : null,
    };
  }, [isAdmin, myId]);

  return (
    <AdminShell title="Resumen">
      {state.status === 'loading' ? <Loading /> : null}
      {state.status === 'error' ? <ErrorState message={state.message} onRetry={retry} /> : null}
      {state.status === 'ok' ? (
        state.data.sinAsignar + state.data.mias === 0 && !isAdmin ? (
          <EmptyState
            title="Todo al día"
            text="No hay solicitudes de nutrición por atender ni asignadas a ti."
            action={{ to: '/admin/nutricion', label: 'Ver solicitudes' }}
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Card to="/admin/nutricion?filtro=sin-asignar" title="Solicitudes nuevas sin asignar" value={state.data.sinAsignar} detail="Esperan a que alguien las tome." />
            <Card to="/admin/nutricion?filtro=mias" title="Mis solicitudes sin responder" value={state.data.mias} detail="Asignadas a ti y pendientes de plan." />
            {isAdmin ? (
              <>
                <Card to="/admin/lugares" title="Lugares publicados" value={state.data.publicados} detail="Visibles en el sitio." />
                <Card to="/admin/lugares?estado=ocultos" title="Lugares ocultos" value={state.data.ocultos} detail="No aparecen en las búsquedas." />
                <Card to="/admin/mensajes" title="Mensajes sin leer" value={state.data.mensajesSinLeer} detail="Llegaron desde el formulario de contacto." />
                <Card to="/admin/usuarios" title="Usuarios" value={state.data.usuarios} detail="Cuentas registradas y sus roles." />
              </>
            ) : null}
          </div>
        )
      ) : null}
    </AdminShell>
  );
}
