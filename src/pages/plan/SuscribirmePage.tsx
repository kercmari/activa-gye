import { useState, type FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { repo, type Invoice, type InvoiceStatus, type PatientSubscription, type SubscriptionPlan, type Trial } from '../../data';
import { useAuth } from '../../auth/AuthContext';
import PhaseGate from '../../components/PhaseGate';
import { formatDateTimeLong } from '../../components/profile/labels';
import { useAsync } from '../../components/profile/useAsync';
import PageHeader from '../../components/ui/PageHeader';
import Badge, { type BadgeTone } from '../../components/ui/Badge';
import { Button, LinkButton } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { EmptyState, ErrorState, Loading, errorMessage } from '../../components/ui/States';

const REF_MIN = 4;
const REF_MAX = 100;

const STATUS: Record<InvoiceStatus, { label: string; tone: BadgeTone }> = {
  pendiente: { label: 'Pendiente de pago', tone: 'orange' },
  reportada: { label: 'En revisión', tone: 'blue' },
  pagada: { label: 'Pagada', tone: 'green' },
  anulada: { label: 'Anulada', tone: 'slate' },
};

const BENEFICIOS = [
  'Una nutricionista toma tu caso',
  'Agenda personalizada cada semana',
  'Seguimiento y chequeos',
];

/** Monto en dólares con coma decimal y punto de miles: 15 → "$15,00". */
function formatMoney(amount: number): string {
  const [entero, decimales] = amount.toFixed(2).split('.');
  return `$${entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimales}`;
}

/** Suscripción del paciente: estado, planes, factura y reporte de transferencia. Días 8+ de la semana gratis. */
export default function SuscribirmePage() {
  return (
    <>
      <PageHeader eyebrow="Mi plan" title="Suscripción" subtitle="Después de tu semana gratis, una nutricionista toma tu caso." back={false} />
      <section className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <PhaseGate phase={2} title="Suscripción" back={{ to: '/mi-plan', label: 'Volver a mi plan' }}>
          <SuscripcionContent />
        </PhaseGate>
        <div>
          <LinkButton to="/mi-plan/hoy" variant="secondary">Volver a Hoy</LinkButton>
        </div>
      </section>
    </>
  );
}

interface Datos {
  sub: PatientSubscription | null;
  planes: SubscriptionPlan[];
  trial: Trial | null;
  facturas: Invoice[];
}

function SuscripcionContent() {
  const { session } = useAuth();
  if (!session) return null;
  return <SuscripcionData userId={session.user.id} />;
}

function SuscripcionData({ userId }: { userId: string }) {
  const state = useAsync<Datos>(async () => {
    const [sub, planes, trial, facturas] = await Promise.all([
      repo.getMyPatientSubscription(),
      repo.listPatientPlans(),
      repo.getMyTrial(),
      repo.listMyInvoices(),
    ]);
    return { sub, planes, trial, facturas };
  }, [userId]);

  if (state.status === 'loading') return <Loading text="Cargando tu suscripción…" />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={state.reload} />;

  return <Suscripcion datos={state.data} onRetry={state.reload} />;
}

function Suscripcion({ datos, onRetry }: { datos: Datos; onRetry: () => void }) {
  // Factura creada o informada en esta sesión (tiene prioridad sobre la carga inicial).
  const [factura, setFactura] = useState<Invoice | null>(null);
  // Momento de la carga: fija la comparación de vigencia sin llamar a Date.now() en cada render.
  const [ahora] = useState(() => Date.now());
  const { sub, planes, trial, facturas } = datos;

  const facturaPendiente = facturas.find(
    (inv) => inv.kind === 'suscripcion_paciente' && (inv.status === 'pendiente' || inv.status === 'reportada'),
  );

  // Activa solo con status 'activa' y fecha de fin futura. 'vencida', o 'activa' con fecha pasada/ausente, es vencida.
  const finMs = sub?.current_period_end ? Date.parse(sub.current_period_end) : Number.NaN;
  const activa = sub?.status === 'activa' && Number.isFinite(finMs) && finMs > ahora;
  const vencida = !activa && (sub?.status === 'vencida' || sub?.status === 'activa');

  return (
    <div className="space-y-6">
      <ResumenSemana trial={trial} />

      {activa && sub ? (
        <div className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
          <p className="eyebrow text-brand-orange">Suscripción activa</p>
          <h2 className="display mt-2 text-2xl text-navy-900">{sub.plan_name}</h2>
          <p className="mt-2 text-slate-600">
            {`Tu suscripción está activa hasta el ${formatDateTimeLong(sub.current_period_end ?? '')}.`}
          </p>
          <div className="mt-6">
            <LinkButton to="/mi-plan/agenda" variant="primary">Ver mi agenda</LinkButton>
          </div>
        </div>
      ) : factura ? (
        <PagoFactura key={factura.id} invoice={factura} onCambio={setFactura} />
      ) : vencida ? (
        <>
          <div role="status" className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
            <p className="eyebrow text-brand-orange">Suscripción vencida</p>
            <p className="mt-2 font-extrabold text-navy-900">
              {sub?.current_period_end
                ? `Tu suscripción venció el ${formatDateTimeLong(sub.current_period_end)}.`
                : 'Tu suscripción ya no está vigente.'}
            </p>
            <p className="mt-2 text-sm text-slate-600">Elige un plan para volver a tener tu nutricionista y tu agenda.</p>
          </div>
          <PlanesPaciente planes={planes} onFactura={setFactura} onRetry={onRetry} />
        </>
      ) : sub?.status === 'pendiente' && facturaPendiente ? (
        <PagoFactura key={facturaPendiente.id} invoice={facturaPendiente} onCambio={setFactura} />
      ) : sub?.status === 'pendiente' ? (
        <EmptyState
          title="Tu suscripción está pendiente"
          text="No encontramos la factura de tu suscripción. Escríbenos para revisarla."
          action={{ to: '/contacto', label: 'Escribir a Activa GYE' }}
        />
      ) : (
        <PlanesPaciente planes={planes} onFactura={setFactura} onRetry={onRetry} />
      )}
    </div>
  );
}

function ResumenSemana({ trial }: { trial: Trial | null }) {
  if (!trial) {
    return (
      <div className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
        <p className="font-extrabold text-navy-900">Aún no tienes tu semana gratis.</p>
        <p className="mt-2 text-sm text-slate-600">Genera tu semana gratis desde Hoy para empezar.</p>
        <div className="mt-5">
          <LinkButton to="/mi-plan/hoy" variant="primary">Ir a Hoy</LinkButton>
        </div>
      </div>
    );
  }
  const completados = trial.days.filter((d) => d.completed_at !== null).length;
  const porcentaje = Math.round((completados / 7) * 100);
  return (
    <div className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
      <p className="eyebrow text-brand-orange">Tu semana gratis</p>
      <p className="mt-2 font-extrabold text-navy-900">{`${completados} de 7 días completados`}</p>
      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label="Días completados de tu semana gratis"
        aria-valuemin={0}
        aria-valuemax={7}
        aria-valuenow={completados}
      >
        <div className="h-full rounded-full bg-brand-orange" style={{ width: `${porcentaje}%` }} />
      </div>
      {trial.finished ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-navy-900">
          <CheckCircle2 className="h-4 w-4 text-brand-blue" aria-hidden="true" />
          Completaste tu semana gratis. Suscríbete para seguir con una nutricionista.
        </p>
      ) : null}
    </div>
  );
}

function PlanesPaciente({
  planes,
  onFactura,
  onRetry,
}: {
  planes: SubscriptionPlan[];
  onFactura: (inv: Invoice) => void;
  onRetry: () => void;
}) {
  const [elegido, setElegido] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (planes.length === 0) {
    return (
      <EmptyState
        title="Suscripción"
        text="Por ahora no hay planes disponibles. Vuelve a intentarlo más tarde."
        action={{ label: 'Reintentar', onClick: onRetry }}
      />
    );
  }

  const suscribirme = async (plan: SubscriptionPlan) => {
    setError(null);
    setElegido(plan.id);
    try {
      const inv = await repo.choosePatientPlan(plan.id);
      onFactura(inv);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setElegido(null);
    }
  };

  return (
    <section className="space-y-4" aria-label="Planes para pacientes">
      <h2 className="display text-2xl text-navy-900">Elige tu plan</h2>
      {error ? (
        <p role="alert" className="rounded-2xl bg-red-50 px-5 py-3 text-sm font-bold text-red-700">{error}</p>
      ) : null}
      <ul className="grid gap-6 md:grid-cols-2">
        {planes.map((plan) => (
          <li key={plan.id} className="flex flex-col rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
            <p className="font-extrabold text-navy-900">{plan.name}</p>
            <p className="display mt-2 text-3xl text-navy-900">
              {formatMoney(plan.monthly_price)}
              <span className="text-base font-bold text-slate-500"> / mes</span>
            </p>
            <ul className="mt-5 space-y-2 text-sm text-slate-600">
              {BENEFICIOS.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" aria-hidden="true" />
                  {b}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Button variant="primary" onClick={() => suscribirme(plan)} disabled={elegido !== null}>
                {elegido === plan.id ? 'Creando factura…' : 'Suscribirme'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PagoFactura({ invoice, onCambio }: { invoice: Invoice; onCambio: (inv: Invoice) => void }) {
  const badge = STATUS[invoice.status];
  return (
    <section className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5" aria-label="Factura de tu suscripción">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="eyebrow text-brand-orange">Tu factura</p>
          <p className="mt-2 font-extrabold text-navy-900">{invoice.concept}</p>
          <p className="mt-1 text-sm text-slate-500">{formatDateTimeLong(invoice.created_at)}</p>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <p className="display text-xl text-navy-900">{formatMoney(invoice.amount)}</p>
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>
      </div>

      <p className="mt-5 text-sm text-slate-600">
        Te enviaremos los datos de la cuenta por correo; luego informa aquí tu número de comprobante.
      </p>

      {invoice.status === 'reportada' ? (
        <p className="mt-4 text-sm text-slate-600">
          Comprobante informado: <span className="font-bold">{invoice.payment_reference}</span>. Lo revisará Activa GYE.
        </p>
      ) : null}

      {invoice.status === 'pendiente' ? <ReporteTransferencia invoice={invoice} onReportada={onCambio} /> : null}
    </section>
  );
}

function ReporteTransferencia({ invoice, onReportada }: { invoice: Invoice; onReportada: (inv: Invoice) => void }) {
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = reference.trim();
    if (value.length < REF_MIN || value.length > REF_MAX) {
      setError(`El número de comprobante debe tener entre ${REF_MIN} y ${REF_MAX} caracteres.`);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await repo.reportInvoicePaid(invoice.id, value);
      onReportada({ ...invoice, status: 'reportada', payment_reference: value, reported_at: new Date().toISOString() });
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 md:flex-row md:items-end">
      <div className="flex-1">
        <TextField
          label="Número de comprobante"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          error={error ?? undefined}
          disabled={saving}
          autoComplete="off"
        />
      </div>
      <Button type="submit" variant="blue" disabled={saving}>
        {saving ? 'Informando…' : 'Informar pago'}
      </Button>
    </form>
  );
}
