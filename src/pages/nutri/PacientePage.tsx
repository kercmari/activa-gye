import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { repo, type Followup, type Invoice, type InvoiceStatus, type PatientDetail } from '../../data';
import PhaseGate from '../../components/PhaseGate';
import NutriShell from '../../components/nutri/NutriShell';
import PlanEditor from '../../components/nutri/PlanEditor';
import FollowupForm from '../../components/nutri/FollowupForm';
import InvoiceForm from '../../components/nutri/InvoiceForm';
import { imc } from '../../components/panel/ficha';
import { ACTIVITY_LABELS, GOAL_LABELS, SEX_LABELS, ageFromBirth, formatDate } from '../../components/nutrition/labels';
import ConfirmDialog from '../../components/profile/ConfirmDialog';
import { formatDateLong } from '../../components/profile/labels';
import { useAsync } from '../../components/profile/useAsync';
import Badge, { type BadgeTone } from '../../components/ui/Badge';
import { Button, LinkButton } from '../../components/ui/Button';
import { EmptyState, ErrorState, Loading, errorMessage } from '../../components/ui/States';

const STATUS_BADGE: Record<InvoiceStatus, { label: string; tone: BadgeTone }> = {
  pendiente: { label: 'Pendiente', tone: 'orange' },
  reportada: { label: 'Pago reportado', tone: 'blue' },
  pagada: { label: 'Pagada', tone: 'green' },
  anulada: { label: 'Anulada', tone: 'slate' },
};

function Card({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="space-y-6 rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:p-8">
      <h2 id={id} className="display text-2xl text-navy-900">{title}</h2>
      {children}
    </section>
  );
}

/** Foto de cuerpo entero en tamaño mediano; al pulsar se amplía en un diálogo. */
function FotoCuerpo({ url }: { url: string | null }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!url) return <p className="text-slate-600">El paciente no subió foto.</p>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ampliar foto de cuerpo entero"
        className="mx-auto block overflow-hidden rounded-2xl bg-slate-100"
      >
        <img src={url} alt="Foto de cuerpo entero del paciente" className="mx-auto max-h-96 w-auto object-contain" />
      </button>
      {open ? (
        <div role="dialog" aria-modal="true" aria-label="Foto ampliada" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-navy-950/80 p-4">
          <img src={url} alt="Foto de cuerpo entero ampliada" className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain" />
          <Button variant="secondary" onClick={() => setOpen(false)}>Cerrar</Button>
        </div>
      ) : null}
    </>
  );
}

function SeguimientosSection({ patientId }: { patientId: string }) {
  const state = useAsync<Followup[]>(() => repo.listFollowups(patientId), [patientId]);

  let list: ReactNode;
  if (state.status === 'loading') {
    list = <Loading text="Cargando seguimientos…" />;
  } else if (state.status === 'error') {
    list = <ErrorState message={state.message} onRetry={state.reload} />;
  } else if (state.data.length === 0) {
    list = <EmptyState title="Sin seguimientos" text="Aún no registras seguimientos de este paciente." action={{ label: 'Actualizar', onClick: state.reload }} />;
  } else {
    list = (
      <ul className="space-y-4">
        {state.data.map((f) => (
          <li key={f.id} className="rounded-2xl bg-surface p-5">
            <p className="font-extrabold text-navy-900">{formatDateLong(f.followup_date)}</p>
            <p className="mt-1 text-sm text-slate-600">
              {f.weight_kg != null ? `Peso: ${f.weight_kg} kg` : 'Peso sin dato'}
              {' · '}
              {f.waist_cm != null ? `Cintura: ${f.waist_cm} cm` : 'Cintura sin dato'}
            </p>
            <p className="mt-3 whitespace-pre-line text-slate-700"><span className="font-bold">Observaciones: </span>{f.observations}</p>
            <p className="mt-2 whitespace-pre-line text-slate-700"><span className="font-bold">Recomendaciones: </span>{f.recommendations}</p>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Card title="Seguimientos" id="seguimientos-titulo">
      {list}
      <div className="border-t border-slate-100 pt-6">
        <h3 className="mb-4 font-extrabold text-navy-900">Agregar seguimiento</h3>
        <FollowupForm patientId={patientId} onSaved={state.reload} />
      </div>
    </Card>
  );
}

function CobrosSection({ patientId }: { patientId: string }) {
  const state = useAsync<Invoice[]>(() => repo.listMyInvoices(), [patientId]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const markPaid = async (inv: Invoice) => {
    setBusyId(inv.id);
    setNotice(null);
    try {
      await repo.markInvoicePaid(inv.id);
      state.reload();
    } catch (e) {
      setNotice(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  let list: ReactNode;
  if (state.status === 'loading') {
    list = <Loading text="Cargando cobros…" />;
  } else if (state.status === 'error') {
    list = <ErrorState message={state.message} onRetry={state.reload} />;
  } else {
    const mine = state.data.filter((i) => i.payer_id === patientId);
    list = mine.length === 0 ? (
      <EmptyState title="Sin facturas" text="Aún no has enviado facturas a este paciente." action={{ label: 'Actualizar', onClick: state.reload }} />
    ) : (
      <ul className="space-y-4">
        {mine.map((inv) => {
          const badge = STATUS_BADGE[inv.status];
          const canMark = inv.status === 'pendiente' || inv.status === 'reportada';
          return (
            <li key={inv.id} className="flex flex-col gap-4 rounded-2xl bg-surface p-5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="font-extrabold text-navy-900">{inv.concept}</p>
                <p className="text-sm text-slate-600">
                  ${inv.amount.toFixed(2)} · {formatDate(inv.created_at)}
                </p>
                {inv.status === 'reportada' && inv.payment_reference ? (
                  <p className="text-sm text-slate-600">Referencia reportada: <span className="font-bold">{inv.payment_reference}</span></p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={badge.tone}>{badge.label}</Badge>
                {canMark ? (
                  <Button variant="blue" size="md" disabled={busyId === inv.id} onClick={() => markPaid(inv)}>
                    {busyId === inv.id ? 'Marcando…' : 'Marcar pagada'}
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <Card title="Cobros" id="cobros-titulo">
      {notice ? <p role="alert" className="font-semibold text-red-600">{notice}</p> : null}
      {list}
      <div className="border-t border-slate-100 pt-6">
        <h3 className="mb-4 font-extrabold text-navy-900">Nueva factura</h3>
        <InvoiceForm patientId={patientId} onCreated={state.reload} />
      </div>
    </Card>
  );
}

function PacienteDetalle({ patientId, detail }: { patientId: string; detail: PatientDetail }) {
  const navigate = useNavigate();
  const { profile, intake, photo_url: photoUrl, request } = detail;
  const [confirming, setConfirming] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const age = ageFromBirth(profile.birth_date);
  const goal = intake?.goal ?? profile.goal;
  const activity = intake?.activity_level ?? profile.activity_level;
  const bmi = intake ? imc(intake.weight_kg, intake.height_cm) : null;

  const finish = async () => {
    setFinishing(true);
    setFinishError(null);
    try {
      await repo.finishCareRequest(request.id);
      navigate('/nutri');
    } catch (e) {
      setFinishError(errorMessage(e));
      setConfirming(false);
    } finally {
      setFinishing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h2 className="display text-3xl text-navy-900">{profile.full_name}</h2>
          <p className="text-sm font-semibold text-slate-600">
            {age != null ? `${age} años` : 'Edad sin dato'}
            {' · '}
            {profile.sex ? SEX_LABELS[profile.sex] : 'Sexo sin dato'}
            {' · '}
            {goal ? `Objetivo: ${GOAL_LABELS[goal]}` : 'Objetivo sin dato'}
          </p>
          {request.accepted_at ? (
            <p className="text-sm text-slate-500">Te atiende desde {formatDate(request.accepted_at)}</p>
          ) : null}
        </div>
        <LinkButton to="/nutri" variant="secondary">Volver al tablero</LinkButton>
      </div>

      {finishError ? <p role="alert" className="font-semibold text-red-600">{finishError}</p> : null}

      <Card title="Ficha" id="ficha-titulo">
        {intake ? (
          <dl className="grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Peso</dt>
              <dd className="mt-1 text-navy-900">{intake.weight_kg} kg</dd>
            </div>
            <div>
              <dt className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Estatura</dt>
              <dd className="mt-1 text-navy-900">{intake.height_cm} cm</dd>
            </div>
            <div>
              <dt className="text-xs font-extrabold uppercase tracking-widest text-slate-500">IMC</dt>
              <dd className="mt-1 text-navy-900">{bmi ? `${bmi.value.toFixed(1)} · ${bmi.label}` : 'Sin dato'}</dd>
            </div>
            <div>
              <dt className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Cintura</dt>
              <dd className="mt-1 text-navy-900">{intake.waist_cm != null ? `${intake.waist_cm} cm` : 'Sin dato'}</dd>
            </div>
            <div>
              <dt className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Actividad</dt>
              <dd className="mt-1 text-navy-900">{activity ? ACTIVITY_LABELS[activity] : 'Sin dato'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Notas de salud</dt>
              <dd className="mt-1 whitespace-pre-line text-navy-900">{intake.health_notes?.trim() ? intake.health_notes : 'Sin notas de salud'}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-slate-600">El paciente todavía no llenó su ficha inicial.</p>
        )}
        <div className="space-y-3 border-t border-slate-100 pt-6">
          <h3 className="font-extrabold text-navy-900">Foto de cuerpo entero</h3>
          <FotoCuerpo url={photoUrl} />
        </div>
      </Card>

      <Card title="Calendario" id="calendario-titulo">
        <PlanEditor patientId={patientId} />
      </Card>

      <SeguimientosSection patientId={patientId} />

      <CobrosSection patientId={patientId} />

      <Card title="Finalizar atención" id="finalizar-titulo">
        <p className="text-slate-600">Cuando termines la atención, la solicitud se cierra. Podrás seguir viendo los datos de este paciente.</p>
        <div>
          <Button variant="danger" onClick={() => setConfirming(true)} disabled={finishing}>
            Finalizar atención
          </Button>
        </div>
      </Card>

      {confirming ? (
        <ConfirmDialog
          title="¿Finalizar la atención?"
          text={`Se cerrará la atención de ${profile.full_name}.`}
          confirmLabel="Finalizar atención"
          busy={finishing}
          onConfirm={finish}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </div>
  );
}

function PacienteContent() {
  const { id = '' } = useParams();
  const state = useAsync<PatientDetail | null>(() => repo.getPatientDetail(id), [id]);

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={state.reload} />;
  if (state.data === null) {
    return (
      <EmptyState
        title="Paciente"
        text="No encontramos este paciente o ya no lo atiendes."
        action={{ label: 'Volver al tablero', to: '/nutri' }}
      />
    );
  }
  return <PacienteDetalle key={id} patientId={id} detail={state.data} />;
}

export default function Page() {
  return (
    <PhaseGate phase={2} title="Panel del nutricionista" back={{ to: '/', label: 'Ir al inicio' }}>
      <NutriShell title="Ficha del paciente">
        <PacienteContent />
      </NutriShell>
    </PhaseGate>
  );
}
