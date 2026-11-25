import { useState } from 'react';
import { repo, type AdminSubscriptionRow, type AdminSubscriptionsOverview } from '../../data';
import AdminShell from '../../components/admin/AdminShell';
import { formatDate } from '../../components/admin/format';
import { useLoad } from '../../components/admin/useLoad';
import ConfirmDialog from '../../components/profile/ConfirmDialog';
import { Button, buttonClasses } from '../../components/ui/Button';
import { EmptyState, ErrorState, Loading, errorMessage } from '../../components/ui/States';
import { contactMailto } from '../../lib/mailto';

type Accion = { tipo: 'aprobar' | 'rechazar'; row: AdminSubscriptionRow };

const AUDIENCIA: Record<AdminSubscriptionRow['audience'], string> = {
  nutricionista: 'Nutricionista',
  paciente: 'Paciente',
};

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Quién, plan, precio y fecha de una solicitud o suscripción. */
function Datos({ row }: { row: AdminSubscriptionRow }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-extrabold uppercase tracking-wider text-brand-blue">{AUDIENCIA[row.audience]}</p>
      <h3 className="mt-1 truncate text-lg font-extrabold text-navy-900">{row.full_name || row.email}</h3>
      <p className="truncate text-sm text-slate-600">{row.email}</p>
      <p className="mt-2 text-sm text-navy-900">
        <strong>{row.plan_name}</strong> · {formatMoney(row.amount)} al mes
      </p>
    </div>
  );
}

/** Admin → Suscripciones: solicitudes por correo (aprobar o rechazar) y suscripciones activas. */
export default function AdminSuscripcionesPage() {
  const { state, retry } = useLoad<AdminSubscriptionsOverview>(() => repo.adminSubscriptionsOverview());
  const [accion, setAccion] = useState<Accion | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const confirmar = async () => {
    if (!accion) return;
    setBusy(true);
    setError(null);
    try {
      if (accion.tipo === 'aprobar') {
        await repo.markInvoicePaid(accion.row.invoice_id);
        setAviso(`Suscripción de ${accion.row.full_name || accion.row.email} aprobada. Quedó activa por 30 días.`);
      } else {
        await repo.cancelInvoice(accion.row.invoice_id);
        setAviso(`Solicitud de ${accion.row.full_name || accion.row.email} rechazada.`);
      }
      setAccion(null);
      retry();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const cerrar = () => {
    if (!busy) setAccion(null);
  };

  return (
    <AdminShell title="Suscripciones">
      {aviso ? <p role="status" className="mb-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{aviso}</p> : null}
      {error ? <p role="alert" className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

      {state.status === 'loading' ? <Loading text="Cargando suscripciones…" /> : null}
      {state.status === 'error' ? <ErrorState message={state.message} onRetry={retry} /> : null}

      {state.status === 'ok' ? (
        <div className="flex flex-col gap-10">
          <section aria-labelledby="pendientes-titulo">
            <h2 id="pendientes-titulo" className="display text-2xl text-navy-900">Solicitudes pendientes</h2>
            <p className="mt-1 text-sm text-slate-600">
              Escríbele para confirmar, y aprueba cuando confirmes el pago.
            </p>
            {state.data.pending.length === 0 ? (
              <div className="mt-5">
                <EmptyState
                  title="No hay solicitudes pendientes"
                  text="Cuando alguien pida una suscripción por correo, aparecerá aquí."
                />
              </div>
            ) : (
              <ul className="mt-5 grid grid-cols-1 gap-4">
                {state.data.pending.map((row) => (
                  <li key={row.invoice_id} className="min-w-0 rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
                    <Datos row={row} />
                    <p className="mt-2 text-xs text-slate-500">Solicitada el {formatDate(row.created_at)}</p>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      <a
                        href={contactMailto(row.email, 'Tu suscripción VITGO')}
                        className={buttonClasses({ variant: 'secondary' })}
                      >
                        Escribir
                      </a>
                      <Button variant="primary" onClick={() => { setError(null); setAccion({ tipo: 'aprobar', row }); }}>
                        Aprobar
                      </Button>
                      <Button variant="danger" onClick={() => { setError(null); setAccion({ tipo: 'rechazar', row }); }}>
                        Rechazar
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="activas-titulo">
            <h2 id="activas-titulo" className="display text-2xl text-navy-900">Suscripciones activas</h2>
            {state.data.active.length === 0 ? (
              <div className="mt-5">
                <EmptyState title="No hay suscripciones activas" text="Las suscripciones aprobadas aparecerán aquí con su vencimiento." />
              </div>
            ) : (
              <ul className="mt-5 grid grid-cols-1 gap-4">
                {state.data.active.map((row) => (
                  <li key={row.subscription_id} className="min-w-0 rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
                    <Datos row={row} />
                    <p className="mt-3 text-sm text-slate-700">
                      Vence el {formatDate(row.period_end)}
                      {row.recipes_left !== null ? ` · Recetas restantes: ${row.recipes_left}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {accion ? (
        <ConfirmDialog
          title={accion.tipo === 'aprobar' ? '¿Aprobar esta suscripción?' : '¿Rechazar esta solicitud?'}
          text={
            accion.tipo === 'aprobar'
              ? `Confirma que recibiste el pago de ${accion.row.full_name || accion.row.email}. La suscripción quedará activa por 30 días.`
              : `La solicitud de ${accion.row.full_name || accion.row.email} se cancelará.`
          }
          confirmLabel={accion.tipo === 'aprobar' ? 'Sí, aprobar' : 'Sí, rechazar'}
          busy={busy}
          onConfirm={() => void confirmar()}
          onCancel={cerrar}
        />
      ) : null}
    </AdminShell>
  );
}
