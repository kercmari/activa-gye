import { useState, type FormEvent } from 'react';
import { repo, type AppSettings, type SubscriptionPlan, type SubscriptionPlanInput } from '../../data';
import AdminShell from '../../components/admin/AdminShell';
import { useLoad } from '../../components/admin/useLoad';
import Badge from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { TextArea, TextField } from '../../components/ui/Field';
import { ErrorState, Loading, errorMessage } from '../../components/ui/States';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Vacío = sin límite (null). Devuelve el número, null si está vacío, o undefined si no es válido (> 0). */
function limiteOpcional(texto: string): number | null | undefined {
  if (texto.trim() === '') return null;
  const n = Number(texto);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

function textoLista(lista: string[]): string {
  return lista.join('\n');
}

/** Un texto por línea; las líneas vacías se descartan. */
function listaDesdeTexto(texto: string): string[] {
  return texto.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
}

interface PlanErrors {
  name?: string;
  price?: string;
  quota?: string;
  daily?: string;
  recipes?: string;
  sort?: string;
}

function PlanForm({
  plan,
  onSaved,
  onCancel,
}: {
  plan: SubscriptionPlan;
  onSaved: (saved: SubscriptionPlan) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(plan.name);
  const [price, setPrice] = useState(String(plan.monthly_price));
  const [quota, setQuota] = useState(String(plan.patient_quota));
  const [daily, setDaily] = useState(plan.daily_record_limit === null ? '' : String(plan.daily_record_limit));
  const [recipes, setRecipes] = useState(plan.recipe_quota === null ? '' : String(plan.recipe_quota));
  const [features, setFeatures] = useState(textoLista(plan.features));
  const [sort, setSort] = useState(String(plan.sort));
  const [active, setActive] = useState(plan.active);
  const [errors, setErrors] = useState<PlanErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: PlanErrors = {};
    const priceN = Number(price);
    const quotaN = Number(quota);
    const sortN = Number(sort);
    const dailyN = limiteOpcional(daily);
    const recipesN = limiteOpcional(recipes);
    if (!name.trim()) found.name = 'Escribe el nombre del plan.';
    if (price.trim() === '' || !Number.isFinite(priceN) || priceN < 0) found.price = 'El precio no puede ser negativo. Escribe 0 o más.';
    if (quota.trim() === '' || !Number.isInteger(quotaN) || quotaN < 0) found.quota = 'Escribe un número entero de pacientes (0 o más).';
    if (dailyN === undefined) found.daily = 'Escribe un número entero mayor que 0, o déjalo vacío para sin límite.';
    if (recipesN === undefined) found.recipes = 'Escribe un número entero mayor que 0, o déjalo vacío si el plan no tiene recetas.';
    if (sort.trim() === '' || !Number.isInteger(sortN)) found.sort = 'Escribe un número entero para el orden.';
    setErrors(found);
    if (Object.keys(found).length > 0 || dailyN === undefined || recipesN === undefined) return;

    const input: SubscriptionPlanInput = {
      id: plan.id,
      name: name.trim(),
      monthly_price: priceN,
      patient_quota: quotaN,
      daily_record_limit: dailyN,
      recipe_quota: recipesN,
      features: listaDesdeTexto(features),
      active,
      sort: sortN,
    };
    setServerError(null);
    setBusy(true);
    try {
      onSaved(await repo.adminSavePlan(input));
    } catch (error) {
      setServerError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label={`Editar plan ${plan.name}`}
      className="flex flex-col gap-5 rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5"
    >
      <h2 className="display text-2xl text-navy-900">Editar plan {plan.name}</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <TextField
          label="Precio mensual (USD)"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          error={errors.price}
        />
        <TextField
          label="Cupo de pacientes"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={quota}
          onChange={(e) => setQuota(e.target.value)}
          error={errors.quota}
        />
        <TextField
          label="Registros por día"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={daily}
          onChange={(e) => setDaily(e.target.value)}
          error={errors.daily}
          hint="Vacío = sin límite."
        />
        <TextField
          label="Recetas por período"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={recipes}
          onChange={(e) => setRecipes(e.target.value)}
          error={errors.recipes}
          hint="Solo planes de paciente. Vacío = no aplica."
        />
        <TextField
          label="Orden"
          type="number"
          inputMode="numeric"
          step={1}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          error={errors.sort}
        />
      </div>
      <TextArea
        label="Textos de la tarjeta"
        rows={4}
        value={features}
        onChange={(e) => setFeatures(e.target.value)}
        hint="Uno por línea. Se muestran en la tarjeta del plan."
      />
      <label className="flex items-center gap-3 font-bold text-navy-900">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-5 w-5 accent-brand-blue"
        />
        Plan activo (visible para los usuarios)
      </label>

      {serverError ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{serverError}</p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar plan'}
        </Button>
      </div>
    </form>
  );
}

/** Bloque «Plan gratis y correo»: correo de la administradora y cupos del plan gratis. */
function ContactoForm({ initial, onSaved }: { initial: AppSettings; onSaved: (s: AppSettings) => void }) {
  const [email, setEmail] = useState(initial.admin_email);
  const [freePatients, setFreePatients] = useState(String(initial.free_patient_limit));
  const [freeDaily, setFreeDaily] = useState(String(initial.free_daily_record_limit));
  const [errors, setErrors] = useState<{ email?: string; freePatients?: string; freeDaily?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    const correo = email.trim();
    const pacientes = Number(freePatients);
    const diarios = Number(freeDaily);
    if (!EMAIL_RE.test(correo)) found.email = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
    if (!Number.isInteger(pacientes) || pacientes <= 0) found.freePatients = 'Escribe un número entero mayor que 0.';
    if (!Number.isInteger(diarios) || diarios <= 0) found.freeDaily = 'Escribe un número entero mayor que 0.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setServerError(null);
    setBusy(true);
    try {
      onSaved(await repo.adminSaveContactSettings({
        admin_email: correo,
        free_patient_limit: pacientes,
        free_daily_record_limit: diarios,
      }));
    } catch (error) {
      setServerError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate aria-label="Plan gratis y correo" className="flex flex-col gap-5 rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
      <h2 className="display text-2xl text-navy-900">Plan gratis y correo</h2>
      <p className="text-sm text-slate-600">
        El correo es el que abre el botón «Contactar por correo» y el pie de página. Cámbialo cuando cambie la persona a cargo.
      </p>
      <TextField
        label="Correo de la administración"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Pacientes del plan gratis"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={freePatients}
          onChange={(e) => setFreePatients(e.target.value)}
          error={errors.freePatients}
        />
        <TextField
          label="Registros por día del plan gratis"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={freeDaily}
          onChange={(e) => setFreeDaily(e.target.value)}
          error={errors.freeDaily}
        />
      </div>
      {serverError ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{serverError}</p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar correo y plan gratis'}
        </Button>
      </div>
    </form>
  );
}

/** Admin → Planes y correo: planes editables, plan gratis y correo de la administradora. */
export default function AdminPlanesPage() {
  const plans = useLoad<SubscriptionPlan[]>(() => repo.listPlans());
  const ajustes = useLoad<AppSettings>(() => repo.getSettings());
  const [editando, setEditando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <AdminShell title="Planes y correo">
      {aviso ? <p role="status" className="mb-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{aviso}</p> : null}

      <section aria-labelledby="planes-titulo" className="flex flex-col gap-5">
        <h2 id="planes-titulo" className="display text-2xl text-navy-900">Planes</h2>
        {plans.state.status === 'loading' ? <Loading text="Cargando planes…" /> : null}
        {plans.state.status === 'error' ? <ErrorState message={plans.state.message} onRetry={plans.retry} /> : null}
        {plans.state.status === 'ok' ? (
          <>
            <ul className="grid gap-4">
              {plans.state.data.map((plan) => (
                <li key={plan.id} className="rounded-[1.75rem] bg-white p-6 shadow-xl shadow-navy-900/5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-extrabold text-navy-900">{plan.name}</h3>
                    <Badge tone={plan.active ? 'green' : 'slate'}>{plan.active ? 'Activo' : 'Inactivo'}</Badge>
                  </div>
                  <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm text-slate-700 sm:grid-cols-2">
                    <div><dt className="inline font-bold">Precio: </dt><dd className="inline">{formatMoney(plan.monthly_price)} al mes</dd></div>
                    <div><dt className="inline font-bold">Pacientes: </dt><dd className="inline">{plan.patient_quota}</dd></div>
                    <div><dt className="inline font-bold">Registros por día: </dt><dd className="inline">{plan.daily_record_limit ?? 'Sin límite'}</dd></div>
                    <div><dt className="inline font-bold">Recetas por período: </dt><dd className="inline">{plan.recipe_quota ?? 'No aplica'}</dd></div>
                  </dl>
                  <div className="mt-4">
                    <Button variant="secondary" onClick={() => { setAviso(null); setEditando(plan.id); }}>
                      Editar {plan.name}
                    </Button>
                  </div>
                  {editando === plan.id ? (
                    <div className="mt-5">
                      <PlanForm
                        key={plan.id}
                        plan={plan}
                        onSaved={(saved) => {
                          setEditando(null);
                          setAviso(`Plan «${saved.name}» guardado.`);
                          plans.retry();
                        }}
                        onCancel={() => setEditando(null)}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
            {plans.state.data.length === 0 ? (
              <p className="text-sm text-slate-600">Todavía no hay planes para mostrar.</p>
            ) : null}
          </>
        ) : null}
      </section>

      <section className="mt-12">
        {ajustes.state.status === 'loading' ? <Loading text="Cargando correo y plan gratis…" /> : null}
        {ajustes.state.status === 'error' ? <ErrorState message={ajustes.state.message} onRetry={ajustes.retry} /> : null}
        {ajustes.state.status === 'ok' ? (
          <ContactoForm
            key={ajustes.state.data.admin_email}
            initial={ajustes.state.data}
            onSaved={() => {
              setAviso('Correo y plan gratis guardados.');
              ajustes.retry();
            }}
          />
        ) : null}
      </section>
    </AdminShell>
  );
}
