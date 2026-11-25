import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { repo, AppError, type PatientSummary } from '../../data';
import PhaseGate from '../../components/PhaseGate';
import NutriShell from '../../components/nutri/NutriShell';
import Badge from '../../components/ui/Badge';
import { Button, LinkButton } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { ErrorState, Loading, errorMessage } from '../../components/ui/States';
import { formatDateLong } from '../../components/profile/labels';
import { useAsync } from '../../components/profile/useAsync';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const REGISTRO_URL_PATH = '/registro?tipo=paciente';

function OrigenBadge({ origin }: { origin: PatientSummary['origin'] }) {
  return origin === 'propio' ? <Badge tone="slate">Propio</Badge> : <Badge tone="blue">Plataforma</Badge>;
}

function PatientRow({ p }: { p: PatientSummary }) {
  return (
    <li className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-extrabold text-navy-900">{p.full_name}</p>
          <OrigenBadge origin={p.origin} />
        </div>
        <p className="text-sm text-slate-500">
          {p.origin === 'propio'
            ? 'No descuenta recetas del paciente'
            : `Recetas restantes: ${p.recipes_left ?? 0}`}
        </p>
        <p className="text-sm text-slate-500">
          {p.days_done} de {p.days_total} días cumplidos
        </p>
        <p className="text-sm text-slate-500">
          {p.last_followup_date ? `Último registro: ${formatDateLong(p.last_followup_date)}` : 'Sin registros todavía'}
        </p>
      </div>
      <LinkButton to={`/nutri/pacientes/${p.patient_id}`} variant="secondary" size="md">Ver ficha</LinkButton>
    </li>
  );
}

function AddPatientDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [noRegistrado, setNoRegistrado] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setFieldError('Escribe un correo válido, por ejemplo paciente@correo.com.');
      return;
    }
    setFieldError(undefined);
    setSubmitError(null);
    setNoRegistrado(false);
    setCopied(false);
    setBusy(true);
    try {
      const res = await repo.nutriAddPatient(value);
      navigate(`/nutri/pacientes/${res.patient_id}?tab=recetas`);
    } catch (err) {
      if (err instanceof AppError && err.code === 'PACIENTE_NO_REGISTRADO') {
        setNoRegistrado(true);
      }
      setSubmitError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function copiar() {
    const url = `${window.location.origin}${REGISTRO_URL_PATH}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setSubmitError('No pudimos copiar el enlace. Cópialo a mano: ' + url);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/40 p-4 md:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="agregar-paciente-titulo"
        className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-xl"
      >
        <h2 id="agregar-paciente-titulo" className="display text-2xl text-navy-900">Agregar paciente</h2>
        <p className="mt-2 text-sm text-slate-600">
          Escribe el correo con el que tu paciente creó su cuenta. Se agregará con una semana de recetas en borrador.
        </p>

        <form onSubmit={submit} noValidate className="mt-5 space-y-4">
          <TextField
            label="Correo del paciente"
            type="email"
            inputMode="email"
            autoComplete="off"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldError}
          />

          {submitError ? (
            <div role="alert" className="space-y-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              <p>{submitError}</p>
              {noRegistrado ? (
                <div className="space-y-2">
                  <p className="font-normal text-red-800">
                    Pídele que cree su cuenta en VITGO desde el enlace de registro y vuelve a agregarlo.
                  </p>
                  <Button variant="secondary" size="md" onClick={copiar}>
                    {copied ? 'Enlace copiado' : 'Copiar enlace de registro'}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" size="md" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="primary" size="md" disabled={busy} aria-busy={busy || undefined}>
              {busy ? 'Agregando…' : 'Agregar paciente'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PacientesContent() {
  const state = useAsync<PatientSummary[]>(() => repo.listMyPatients(), []);
  const [dialogOpen, setDialogOpen] = useState(false);
  // Botón que abrió el diálogo: al cerrarlo, el foco vuelve ahí.
  const openerRef = useRef<HTMLElement | null>(null);

  function abrir() {
    openerRef.current = document.activeElement as HTMLElement | null;
    setDialogOpen(true);
  }

  function cerrar() {
    setDialogOpen(false);
    queueMicrotask(() => openerRef.current?.focus());
  }

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <ErrorState message={state.message} onRetry={state.reload} />;

  const pacientes = state.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-slate-600">
          {pacientes.length === 0
            ? 'Aún no tienes pacientes.'
            : `${pacientes.length} ${pacientes.length === 1 ? 'paciente' : 'pacientes'} con atención activa.`}
        </p>
        <Button variant="primary" size="md" onClick={abrir}>
          Agregar paciente
        </Button>
      </div>

      {pacientes.length === 0 ? (
        <div className="rounded-[1.75rem] bg-white p-8 text-center shadow-xl shadow-navy-900/5">
          <p className="display text-2xl text-navy-900">Mis pacientes</p>
          <p className="mt-2 text-slate-600">
            Agrega a una persona que ya tenga cuenta en VITGO. Podrás armar su semana de recetas desde su ficha.
          </p>
          <div className="mt-6 flex justify-center">
            <Button variant="primary" size="md" onClick={abrir}>Agregar mi primer paciente</Button>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-[1.75rem] bg-white px-6 shadow-xl shadow-navy-900/5">
          {pacientes.map((p) => <PatientRow key={p.patient_id} p={p} />)}
        </ul>
      )}

      {dialogOpen ? <AddPatientDialog onClose={cerrar} /> : null}
    </div>
  );
}

export default function Page() {
  return (
    <PhaseGate phase={2} title="Mis pacientes" back={{ to: '/', label: 'Ir al inicio' }}>
      <NutriShell title="Mis pacientes">
        <PacientesContent />
      </NutriShell>
    </PhaseGate>
  );
}
