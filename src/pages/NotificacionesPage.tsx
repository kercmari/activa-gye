import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { usePhase } from '../auth/SettingsContext';
import PhaseGate from '../components/PhaseGate';
import { useAsync } from '../components/profile/useAsync';
import PageHeader from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState, ErrorState, Loading, errorMessage } from '../components/ui/States';
import { repo, type AppNotification } from '../data';

/** "hace N minutos/horas/días" a partir de la fecha ISO. */
function tiempoRelativo(iso: string, ahora: number = Date.now()): string {
  const min = Math.floor((ahora - new Date(iso).getTime()) / 60_000);
  if (!Number.isFinite(min) || min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} ${min === 1 ? 'minuto' : 'minutos'}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} ${h === 1 ? 'hora' : 'horas'}`;
  const d = Math.floor(h / 24);
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
}

export default function NotificacionesPage() {
  // Con la fase 2 apagada la página no se muestra: se lleva a «Mi perfil» en vez de mostrar «Próximamente».
  const phase2 = usePhase(2);
  if (!phase2) return <Navigate to="/perfil" replace />;
  return (
    <>
      <PageHeader
        eyebrow="Avisos"
        title="Notificaciones"
        subtitle="Cambios en tus solicitudes, calendario y facturas."
        back="/"
      />
      <section className="mx-auto max-w-6xl px-4 py-10">
        <PhaseGate phase={2} title="Notificaciones" back={{ to: '/', label: 'Volver al inicio' }}>
          <NotificationsList />
        </PhaseGate>
      </section>
    </>
  );
}

function NotificationsList() {
  const navigate = useNavigate();
  const list = useAsync(() => repo.listNotifications());
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Copia local editable: se actualiza al marcar leídas sin volver a pedir la lista.
  const current = items ?? (list.status === 'ok' ? list.data : null);
  const unread = current?.filter((n) => !n.read_at).length ?? 0;

  if (!current) {
    return list.status === 'error'
      ? <ErrorState message={list.message} onRetry={list.reload} />
      : <Loading text="Cargando notificaciones…" />;
  }

  if (current.length === 0) {
    return (
      <EmptyState
        title="No tienes notificaciones."
        text="Aquí verás los avisos de tus solicitudes, calendario y facturas."
        action={{ label: 'Volver al inicio', to: '/' }}
      />
    );
  }

  const open = async (n: AppNotification) => {
    setActionError(null);
    if (!n.read_at) {
      try {
        await repo.markNotificationRead(n.id);
      } catch (e) {
        setActionError(errorMessage(e));
        return;
      }
      setItems(current.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
    }
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await repo.markAllNotificationsRead();
      const now = new Date().toISOString();
      setItems(current.map((x) => (x.read_at ? x : { ...x, read_at: now })));
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-[1.75rem] bg-white p-4 shadow-xl shadow-navy-900/5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <p className="text-sm font-semibold text-slate-600">
          {unread > 0 ? `${unread} sin leer` : 'Todo leído'}
        </p>
        <Button variant="secondary" size="md" onClick={markAll} disabled={busy || unread === 0}>
          Marcar todas como leídas
        </Button>
      </div>

      {actionError ? (
        <p role="alert" className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {actionError}
        </p>
      ) : null}

      <ul className="divide-y divide-slate-100">
        {current.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => void open(n)}
              className="flex w-full items-start gap-3 rounded-2xl px-3 py-4 text-left transition-colors hover:bg-slate-50"
            >
              <span
                aria-hidden="true"
                className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${n.read_at ? 'bg-transparent' : 'bg-brand-orange'}`}
              />
              <span className="min-w-0 flex-1">
                <span className={`block text-base ${n.read_at ? 'font-semibold text-navy-900' : 'font-extrabold text-navy-900'}`}>
                  {n.title}
                </span>
                {n.body ? <span className="mt-1 block text-sm text-slate-600">{n.body}</span> : null}
                <span className="mt-1 block text-xs font-semibold text-slate-500">
                  {tiempoRelativo(n.created_at)}
                  {n.read_at ? '' : <span className="sr-only"> (sin leer)</span>}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
