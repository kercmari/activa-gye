import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { repo, type CareRequest } from '../../data';
import PhaseGate from '../../components/PhaseGate';
import NutriShell from '../../components/nutri/NutriShell';
import { codeOf, hace } from '../../components/nutri/format';
import { GOAL_LABELS, SEX_LABELS } from '../../components/nutrition/labels';
import { useAsync } from '../../components/profile/useAsync';
import { Button, LinkButton } from '../../components/ui/Button';
import { EmptyState, ErrorState, Loading, errorMessage } from '../../components/ui/States';

interface Notice {
  message: string;
  /** Botón útil junto al aviso (p. ej. ver la suscripción). */
  action?: { label: string; to: string };
}

/** Códigos que se resuelven llevando al nutricionista a su suscripción. */
const SUBSCRIPTION_CODES = new Set(['SIN_SUSCRIPCION', 'CUPO_PLAN_LLENO']);

function RequestCard({
  r,
  busy,
  onAccept,
}: {
  r: CareRequest;
  busy: boolean;
  onAccept: (r: CareRequest) => void;
}) {
  return (
    <li className="flex flex-col gap-4 rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="font-extrabold text-navy-900">{r.patient_name ?? 'Paciente'}</p>
        <p className="text-sm text-slate-500">
          {r.patient_age != null ? `${r.patient_age} años` : 'Edad sin dato'}
          {r.patient_sex ? ` · ${SEX_LABELS[r.patient_sex]}` : ''}
          {r.patient_goal ? ` · Objetivo: ${GOAL_LABELS[r.patient_goal]}` : ''}
        </p>
        {r.message ? <p className="pt-2 text-slate-700">“{r.message}”</p> : null}
        <p className="text-xs font-semibold text-slate-400">{hace(r.created_at)}</p>
      </div>
      <Button variant="primary" onClick={() => onAccept(r)} disabled={busy} className="shrink-0">
        {busy ? 'Aceptando…' : 'Aceptar'}
      </Button>
    </li>
  );
}

function SolicitudesContent() {
  const navigate = useNavigate();
  const state = useAsync<CareRequest[]>(() => repo.listOpenCareRequests(), []);
  const [gone, setGone] = useState<Set<string>>(() => new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const reload = () => {
    setNotice(null);
    state.reload();
  };

  const accept = async (r: CareRequest) => {
    setBusyId(r.id);
    setNotice(null);
    try {
      await repo.acceptCareRequest(r.id);
      navigate(`/nutri/pacientes/${r.patient_id}`);
    } catch (e) {
      const code = codeOf(e);
      if (code === 'YA_TOMADA') {
        setGone((prev) => new Set(prev).add(r.id));
        setNotice({ message: 'Otro nutricionista ya la aceptó.' });
      } else if (code && SUBSCRIPTION_CODES.has(code)) {
        setNotice({ message: errorMessage(e), action: { label: 'Ver mi suscripción', to: '/nutri/suscripcion' } });
      } else {
        setNotice({ message: errorMessage(e) });
      }
    } finally {
      setBusyId(null);
    }
  };

  let body: ReactNode;
  if (state.status === 'loading') {
    body = <Loading />;
  } else if (state.status === 'error') {
    body = <ErrorState message={state.message} onRetry={reload} />;
  } else {
    const visible = state.data.filter((r) => !gone.has(r.id));
    body = visible.length === 0 ? (
      <EmptyState title="Solicitudes" text="No hay solicitudes abiertas por ahora." action={{ label: 'Actualizar', onClick: reload }} />
    ) : (
      <ul className="space-y-4">
        {visible.map((r) => (
          <RequestCard key={r.id} r={r} busy={busyId === r.id} onAccept={accept} />
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Acepta una solicitud para atender al paciente. Se abre su ficha al aceptar.</p>
        <Button variant="secondary" onClick={reload}>Actualizar</Button>
      </div>

      {notice ? (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <p className="font-bold text-brand-orange-dark">{notice.message}</p>
          {notice.action ? <LinkButton to={notice.action.to} variant="primary" size="md">{notice.action.label}</LinkButton> : null}
        </div>
      ) : null}

      {body}
    </div>
  );
}

export default function Page() {
  return (
    <PhaseGate phase={2} title="Panel del nutricionista" back={{ to: '/', label: 'Ir al inicio' }}>
      <NutriShell title="Solicitudes">
        <SolicitudesContent />
      </NutriShell>
    </PhaseGate>
  );
}
