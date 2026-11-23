import { useMemo, useState } from 'react';
import AdminShell from '../../components/admin/AdminShell';
import { ROLE_LABELS, formatDate } from '../../components/admin/format';
import { useLoad } from '../../components/admin/useLoad';
import { useAuth } from '../../auth/AuthContext';
import { repo, type AdminUser, type NutriStatus, type Role } from '../../data';
import Avatar from '../../components/profile/Avatar';
import ConfirmDialog from '../../components/profile/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { EmptyState, ErrorState, Loading, errorMessage } from '../../components/ui/States';

const ROLES: Role[] = ['usuario', 'nutricionista', 'admin'];

const ESTADO_NUTRI: Record<NutriStatus, string> = {
  pendiente: 'Pendiente de revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

interface Pendiente {
  user: AdminUser;
  rol: Role;
}

interface RevisionNutri {
  user: AdminUser;
  approve: boolean;
}

export default function AdminUsuariosPage() {
  const { session } = useAuth();
  const miId = session?.user.id ?? '';
  const { state, retry } = useLoad<AdminUser[]>(() => repo.adminListUsers());

  const [buscar, setBuscar] = useState('');
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [revision, setRevision] = useState<RevisionNutri | null>(null);
  const [revisando, setRevisando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rolDe = (u: AdminUser) => roles[u.id] ?? u.role;

  const visibles = useMemo(() => {
    if (state.status !== 'ok') return [];
    const term = buscar.trim().toLowerCase();
    return state.data
      .filter((u) => !term || u.email.toLowerCase().includes(term) || u.full_name.toLowerCase().includes(term))
      .sort((a, b) => a.email.localeCompare(b.email, 'es'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, buscar]);

  const solicitudes = useMemo(() => {
    if (state.status !== 'ok') return [];
    return state.data
      .filter((u) => u.nutri_status === 'pendiente')
      .sort((a, b) => a.email.localeCompare(b.email, 'es'));
  }, [state]);

  const confirmarRevision = async () => {
    if (!revision) return;
    const { user, approve } = revision;
    setRevisando(true);
    setError(null);
    setAviso(null);
    try {
      await repo.adminReviewNutri(user.id, approve);
      setAviso(approve
        ? `${user.email} ya es nutricionista.`
        : `Solicitud de ${user.email} rechazada. Sigue como paciente.`);
      setRevision(null);
      retry();
    } catch (e) {
      setError(errorMessage(e));
      setRevision(null);
    } finally {
      setRevisando(false);
    }
  };

  const elegirRol = (u: AdminUser, rol: Role) => {
    setAviso(null);
    setError(null);
    if (rol === rolDe(u)) return;
    setPendiente({ user: u, rol });
  };

  const confirmar = async () => {
    if (!pendiente) return;
    const { user, rol } = pendiente;
    setGuardando(true);
    setError(null);
    try {
      await repo.adminSetRole(user.id, rol);
      setRoles((prev) => ({ ...prev, [user.id]: rol }));
      setAviso(`Rol actualizado: ${user.email} ahora es ${ROLE_LABELS[rol].toLowerCase()}.`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setGuardando(false);
      setPendiente(null);
    }
  };

  return (
    <AdminShell title="Usuarios">
      {state.status === 'ok' ? (
        <section aria-labelledby="solicitudes-nutri" className="mb-8">
          <h2 id="solicitudes-nutri" className="display text-2xl text-navy-900">Solicitudes de nutricionista</h2>
          <p className="mt-2 text-sm text-slate-600">
            Quien pidió ser nutricionista no ve fichas de pacientes hasta que la apruebes.
          </p>
          {solicitudes.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-600 shadow-sm">
              No hay solicitudes pendientes.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {solicitudes.map((u) => (
                <li key={u.id} className="flex flex-col gap-4 rounded-[1.75rem] bg-white p-5 shadow-xl shadow-navy-900/5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <Avatar path={u.avatar_path} name={u.full_name || u.email} size="md" />
                    <div className="min-w-0">
                      <p className="truncate font-extrabold text-navy-900">{u.full_name || '—'}</p>
                      <p className="truncate text-sm text-slate-600">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-3">
                    <Button variant="primary" size="md" onClick={() => setRevision({ user: u, approve: true })} disabled={revisando}>
                      Aprobar
                    </Button>
                    <Button variant="secondary" size="md" onClick={() => setRevision({ user: u, approve: false })} disabled={revisando}>
                      Rechazar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <div className="mb-6 md:w-96">
        <TextField label="Buscar por correo o nombre" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Ej. maria@correo.com" />
      </div>

      {aviso ? <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{aviso}</p> : null}
      {error ? <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}

      {state.status === 'loading' ? <Loading /> : null}
      {state.status === 'error' ? <ErrorState message={state.message} onRetry={retry} /> : null}
      {state.status === 'ok' && state.data.length === 0 ? (
        <EmptyState title="Todavía no hay usuarios" text="Aparecerán aquí cuando alguien cree una cuenta." />
      ) : null}
      {state.status === 'ok' && state.data.length > 0 && visibles.length === 0 ? (
        <EmptyState title="Ningún usuario coincide" text="Prueba con otro correo o nombre." action={{ onClick: () => setBuscar(''), label: 'Ver todos' }} />
      ) : null}

      {state.status === 'ok' && visibles.length > 0 ? (
        <>
        <p className="mb-2 text-xs font-bold text-slate-500 md:hidden">Desliza la tabla para ver más columnas →</p>
        <div className="relative overflow-x-auto rounded-[1.75rem] bg-white shadow-xl shadow-navy-900/5">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs font-extrabold uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">Correo</th>
                <th scope="col" className="px-4 py-3">Nombre</th>
                <th scope="col" className="px-4 py-3">Rol</th>
                <th scope="col" className="px-4 py-3">Nutricionista</th>
                <th scope="col" className="px-4 py-3">Creada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibles.map((u) => {
                const esYo = u.id === miId;
                return (
                  <tr key={u.id} className="align-middle">
                    <td className="px-4 py-3 font-bold text-navy-900">{u.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar path={u.avatar_path} name={u.full_name || u.email} size="sm" />
                        <span className="text-slate-600">{u.full_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <select
                          aria-label={`Rol de ${u.email}`}
                          value={rolDe(u)}
                          disabled={esYo || guardando}
                          onChange={(e) => elegirRol(u, e.target.value as Role)}
                          className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold text-navy-900 sm:text-sm disabled:opacity-60"
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                        {esYo ? <span className="text-xs font-extrabold text-slate-500">Tú</span> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.nutri_status ? ESTADO_NUTRI[u.nutri_status] : '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(u.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      ) : null}

      {revision ? (
        <ConfirmDialog
          title={revision.approve ? '¿Aprobar como nutricionista?' : '¿Rechazar la solicitud?'}
          text={revision.approve
            ? `${revision.user.email} podrá ver las fichas de sus pacientes y atenderlos.`
            : `${revision.user.email} seguirá como paciente. Podrá volver a pedirlo más adelante.`}
          confirmLabel={revision.approve ? 'Sí, aprobar' : 'Sí, rechazar'}
          busy={revisando}
          onConfirm={() => void confirmarRevision()}
          onCancel={() => setRevision(null)}
        />
      ) : null}

      {pendiente ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 px-4">
          <div role="dialog" aria-modal="true" aria-labelledby="confirmar-rol" className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-2xl">
            <h2 id="confirmar-rol" className="display text-2xl text-navy-900">¿Cambiar el rol?</h2>
            <p className="mt-3 text-slate-600">
              {pendiente.user.email} pasará a ser <strong className="text-navy-900">{ROLE_LABELS[pendiente.rol].toLowerCase()}</strong>.
              {pendiente.rol === 'admin' ? ' Un administrador puede cambiar los roles de otras cuentas.' : ''}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setPendiente(null)} disabled={guardando}>Cancelar</Button>
              <Button variant="primary" onClick={() => void confirmar()} disabled={guardando}>
                {guardando ? 'Cambiando…' : 'Cambiar rol'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
