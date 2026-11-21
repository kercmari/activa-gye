import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router';
import AdminShell from '../../components/admin/AdminShell';
import { ACTIVITY_LABELS, GOAL_LABELS, NUTRITION_STATUS_LABELS, SEX_LABELS, formatDate } from '../../components/admin/format';
import { useLoad } from '../../components/admin/useLoad';
import { useAuth } from '../../auth/AuthContext';
import { repo, type NutritionRequest } from '../../data';
import Badge from '../../components/ui/Badge';
import BackButton from '../../components/ui/BackButton';
import { Button } from '../../components/ui/Button';
import { ErrorState, Loading, errorMessage } from '../../components/ui/States';
import { TextArea } from '../../components/ui/Field';

const MIN_PLAN = 20;

interface Detalle {
  req: NutritionRequest;
  foto: string | null;
}

function Dato({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-extrabold uppercase tracking-[0.15em] text-slate-500">{label}</dt>
      <dd className="mt-1 text-base text-navy-900">{value === null || value === undefined || value === '' ? '—' : value}</dd>
    </div>
  );
}

export default function AdminNutricionDetallePage() {
  const { id = '' } = useParams();
  const { session } = useAuth();
  const isAdmin = session?.profile.role === 'admin';
  const myId = session?.user.id ?? '';

  const { state, retry } = useLoad<Detalle | null>(async () => {
    const req = await repo.getNutritionRequest(id);
    if (!req) return null;
    const foto = await repo.getNutritionPhotoUrl(req).catch(() => null);
    return { req, foto };
  }, [id, myId]);

  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // null = el usuario aún no escribió: se muestra el plan que ya existe.
  const [borrador, setBorrador] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  const req = state.status === 'ok' && state.data ? state.data.req : null;

  const plan = borrador ?? req?.nutritionist_plan ?? '';

  const onTake = async () => {
    setBusy(true);
    setError(null);
    try {
      await repo.takeNutritionRequest(id);
      setAviso('Solicitud tomada. Ahora puedes escribir el plan.');
      retry();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onAnswer = async (e: FormEvent) => {
    e.preventDefault();
    const texto = plan.trim();
    if (texto.length < MIN_PLAN) {
      setPlanError(`El plan debe tener al menos ${MIN_PLAN} caracteres.`);
      return;
    }
    setPlanError(null);
    setBusy(true);
    setError(null);
    try {
      await repo.answerNutritionRequest(id, texto);
      setAviso('Plan enviado. La persona lo verá en Mi plan.');
      retry();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const asignadaAOtra = req !== null && req.nutritionist_id !== null && req.nutritionist_id !== myId;
  const sinAsignar = req !== null && req.nutritionist_id === null;
  const puedeResponder = req !== null && (!asignadaAOtra && (req.nutritionist_id === myId || isAdmin));
  const guia = req?.ai_guide ?? null;

  return (
    <AdminShell title={req ? `Solicitud de ${req.requester_name ?? 'una persona'}` : 'Solicitud'}>
      <BackButton fallback="/admin/nutricion" className="-ml-2 mb-4" />

      {state.status === 'loading' ? <Loading /> : null}
      {state.status === 'error' ? <ErrorState message={state.message} onRetry={retry} /> : null}
      {state.status === 'ok' && state.data === null ? (
        <div className="rounded-[1.75rem] bg-white px-6 py-12 text-center shadow-xl shadow-navy-900/5">
          <p className="font-bold text-navy-900">Esta solicitud no existe o ya no está disponible.</p>
        </div>
      ) : null}

      {req && state.status === 'ok' && state.data ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-6">
            <section className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={req.status === 'respondida' ? 'green' : 'blue'}>{NUTRITION_STATUS_LABELS[req.status]}</Badge>
                <Badge tone="slate">
                  {req.nutritionist_id === null ? 'Sin asignar' : req.nutritionist_id === myId ? 'Asignada a ti' : 'Asignada a otra persona'}
                </Badge>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5">
                <Dato label="Pidió" value={req.requester_name} />
                <Dato label="Fecha" value={formatDate(req.created_at)} />
                <Dato label="Edad" value={req.age} />
                <Dato label="Sexo" value={SEX_LABELS[req.sex]} />
                <Dato label="Estatura (cm)" value={req.height_cm} />
                <Dato label="Peso (kg)" value={req.weight_kg} />
                <Dato label="Cintura (cm)" value={req.waist_cm} />
                <Dato label="Actividad" value={ACTIVITY_LABELS[req.activity_level]} />
                <Dato label="Objetivo" value={GOAL_LABELS[req.goal]} />
                <Dato label="Consentimiento de foto" value={req.consent_photo ? 'Sí' : 'No'} />
              </dl>
              <dl className="mt-5 space-y-5">
                <Dato label="Restricciones" value={req.restrictions} />
                <Dato label="Condiciones de salud" value={req.health_conditions} />
              </dl>
              {state.data.foto ? (
                <img src={state.data.foto} alt="Foto enviada por la persona" className="mt-6 max-h-80 w-full rounded-2xl object-contain bg-slate-100" />
              ) : null}
            </section>

            <section className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
              <h2 className="display text-2xl text-navy-900">Guía automática</h2>
              {guia ? (
                <div className="mt-4 space-y-4 text-sm text-slate-700">
                  <p>{guia.summary}</p>
                  <p><strong className="text-navy-900">IMC:</strong> {guia.bmi} ({guia.bmi_label})</p>
                  <p><strong className="text-navy-900">Energía diaria:</strong> {guia.daily_kcal} kcal</p>
                  <p>
                    <strong className="text-navy-900">Macros:</strong> proteína {guia.macros.protein_g} g · carbohidratos {guia.macros.carbs_g} g · grasa {guia.macros.fat_g} g
                  </p>
                  {guia.recommendations.length > 0 ? (
                    <div>
                      <p className="font-bold text-navy-900">Recomendaciones</p>
                      <ul className="ml-5 list-disc space-y-1">{guia.recommendations.map((r) => <li key={r}>{r}</li>)}</ul>
                    </div>
                  ) : null}
                  {guia.sample_day.length > 0 ? (
                    <div>
                      <p className="font-bold text-navy-900">Ejemplo de un día</p>
                      <ul className="ml-5 list-disc space-y-1">
                        {guia.sample_day.map((m) => <li key={m.meal}><strong>{m.meal}:</strong> {m.items.join(', ')}</li>)}
                      </ul>
                    </div>
                  ) : null}
                  <p><strong className="text-navy-900">Hidratación:</strong> {guia.hydration}</p>
                  {guia.warnings.length > 0 ? (
                    <div>
                      <p className="font-bold text-navy-900">Señales de alerta</p>
                      <ul className="ml-5 list-disc space-y-1">{guia.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
                    </div>
                  ) : null}
                  <p className="text-xs text-slate-500">{guia.disclaimer}</p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-600">La guía automática todavía no está lista.</p>
              )}
            </section>
          </div>

          <section className="h-fit rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
            <h2 className="display text-2xl text-navy-900">Plan del nutricionista</h2>

            {aviso ? <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{aviso}</p> : null}
            {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}

            {sinAsignar ? (
              <div className="mt-5">
                <p className="text-sm text-slate-600">Nadie la atiende todavía. Tómala para escribir el plan.</p>
                <div className="mt-4">
                  <Button variant="primary" onClick={onTake} disabled={busy}>Tomar solicitud</Button>
                </div>
              </div>
            ) : null}

            {asignadaAOtra && !isAdmin ? (
              <p className="mt-5 text-sm font-bold text-slate-600">Esta solicitud la atiende otra persona.</p>
            ) : null}

            {puedeResponder ? (
              <form onSubmit={onAnswer} noValidate className="mt-5 space-y-4">
                <TextArea
                  label="Escribe el plan"
                  rows={10}
                  value={plan}
                  onChange={(e) => setBorrador(e.target.value)}
                  error={planError ?? undefined}
                  hint={`${plan.trim().length} caracteres · mínimo ${MIN_PLAN}`}
                />
                <Button type="submit" variant="primary" disabled={busy}>Enviar plan</Button>
              </form>
            ) : null}
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}
