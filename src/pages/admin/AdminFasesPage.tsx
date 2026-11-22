import { useState, type FormEvent } from 'react';
import { repo, type AppSettings, type AppSettingsInput } from '../../data';
import AdminShell from '../../components/admin/AdminShell';
import Badge from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { ErrorState, Loading, errorMessage } from '../../components/ui/States';
import { useAsync } from '../../components/profile/useAsync';
import { useSettings } from '../../auth/SettingsContext';

const PHASES = [
  {
    key: 'phase1',
    title: 'Fase 1 · Ingreso y ficha del paciente',
    text: 'Registro, ingreso y «Mi ficha» con foto.',
  },
  {
    key: 'phase2',
    title: 'Fase 2 · Nutricionista',
    text: 'Solicitudes, tablero, avisos, seguimiento, calendario, suscripciones y facturas.',
  },
  {
    key: 'phase3',
    title: 'Fase 3 · Para todos',
    text: 'Registro sin cupo, reseñas, reporte PDF, correos y datos completos de lugares.',
  },
] as const;

type PhaseKey = (typeof PHASES)[number]['key'];

interface FormState {
  phase1: boolean;
  phase2: boolean;
  phase3: boolean;
  limit: string;
}

function formFrom(settings: AppSettings): FormState {
  return {
    phase1: settings.phase1,
    phase2: settings.phase2,
    phase3: settings.phase3,
    limit: String(settings.patient_limit),
  };
}

/** Formulario de fases; se monta de nuevo (con key) cada vez que cambian los ajustes guardados. */
function FasesForm({ initial, onSaved }: { initial: AppSettings; onSaved: (saved: AppSettings) => void }) {
  const [form, setForm] = useState<FormState>(() => formFrom(initial));
  const [limitError, setLimitError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const setPhase = (key: PhaseKey, value: boolean) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSaved(false);
    const limit = Number(form.limit);
    if (form.limit.trim() === '' || !Number.isInteger(limit) || limit < 0 || limit > 100000) {
      setLimitError('Escribe un número entero entre 0 y 100000.');
      return;
    }
    setLimitError(undefined);
    const input: AppSettingsInput = {
      phase1: form.phase1,
      phase2: form.phase2,
      phase3: form.phase3,
      patient_limit: limit,
    };
    setBusy(true);
    try {
      const next = await repo.adminSaveSettings(input);
      onSaved(next);
      setSaved(true);
    } catch (error) {
      setServerError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-4">
        <legend className="sr-only">Fases encendidas</legend>
        {PHASES.map((phase) => {
          const id = `fase-${phase.key}`;
          const on = form[phase.key];
          return (
            <div key={phase.key} className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
              <div className="flex items-start gap-4">
                <input
                  id={id}
                  type="checkbox"
                  checked={on}
                  onChange={(e) => setPhase(phase.key, e.target.checked)}
                  aria-describedby={`${id}-desc`}
                  className="mt-1 h-6 w-6 shrink-0 accent-brand-blue"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <label htmlFor={id} className="display cursor-pointer text-xl text-navy-900">{phase.title}</label>
                    <Badge tone={on ? 'green' : 'slate'}>{on ? 'Encendida' : 'Apagada'}</Badge>
                  </div>
                  <p id={`${id}-desc`} className="mt-2 text-slate-600">{phase.text}</p>
                </div>
              </div>
            </div>
          );
        })}
      </fieldset>

      {!form.phase1 ? (
        <p role="alert" className="rounded-2xl bg-amber-50 px-5 py-4 font-semibold text-amber-800">
          Si apagas la fase 1, los pacientes no podrán guardar su ficha.
        </p>
      ) : null}

      <div className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
        <TextField
          label="Cupo de pacientes (mientras la fase 3 está apagada)"
          type="number"
          inputMode="numeric"
          min={0}
          max={100000}
          step={1}
          value={form.limit}
          onChange={(e) => { setSaved(false); setForm((prev) => ({ ...prev, limit: e.target.value })); }}
          error={limitError}
        />
      </div>

      {serverError ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{serverError}</p>
      ) : null}
      {saved ? (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">Cambios guardados</p>
      ) : null}

      <div>
        <Button type="submit" variant="primary" size="lg" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}

/** Admin → Fases: enciende o apaga las fases y fija el cupo de pacientes. */
export default function AdminFasesPage() {
  const { reload: reloadSettings } = useSettings();
  const load = useAsync(() => repo.getSettings(), []);
  const [latest, setLatest] = useState<AppSettings | null>(null);

  const onSaved = (next: AppSettings) => {
    setLatest(next);
    void reloadSettings();
  };

  let body;
  if (load.status === 'loading') {
    body = <Loading text="Cargando fases…" />;
  } else if (load.status === 'error') {
    body = <ErrorState message={load.message} onRetry={load.reload} />;
  } else {
    const current = latest ?? load.data;
    body = (
      <>
        <p className="mb-6 font-semibold text-slate-600">
          Pacientes registrados: {current.patients_count}
        </p>
        <FasesForm initial={load.data} onSaved={onSaved} />
      </>
    );
  }

  return <AdminShell title="Fases de la plataforma">{body}</AdminShell>;
}
