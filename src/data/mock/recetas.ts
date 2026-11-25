/**
 * Simulador de recetas, planes y suscripción por correo (ronda 7).
 * Replica las reglas de las migraciones 12 y 13 (diseño §2–§4 y plan «Contrato»).
 * Tablas en localStorage (store.ts): subscription_plans, app_settings, subscriptions, patient_subscriptions,
 * invoices, care_requests, prescriptions, plan_days, notifications.
 * Cada operación que escribe lee y escribe de forma síncrona tras `await wait()`: no hay huecos para doble clic.
 * Dueño: DT2. Se une a accountsPart (accounts.ts), así que no hace falta tocar index.ts.
 */
import type {
  AdminSubscriptionRow, AdminSubscriptionsOverview, AppSettings, CareRequest, ContactSettingsInput,
  Invoice, NutriAddPatientResult, NutriLimits, PatientSubscription, PlanDay, PlanDayInput,
  Prescription, PrescriptionInput, RecipeBalance, Repo, Role, Subscription, SubscriptionPlan,
  SubscriptionStatus,
} from '../types';
import { AppError } from '../types';
import { readTable, writeTable, currentUser, wait, type StoredUser } from './store';

const DAY_MS = 24 * 60 * 60 * 1000;
const GYE_MS = 5 * 60 * 60 * 1000; // Guayaquil: UTC-5, sin horario de verano
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_ADMIN_EMAIL = 'kerlyeliz19@gmail.com';
const KINDS = ['dieta', 'rutina', 'recomendacion'];

const T = {
  plans: 'subscription_plans',
  settings: 'app_settings',
  subs: 'subscriptions',
  patientSubs: 'patient_subscriptions',
  invoices: 'invoices',
  care: 'care_requests',
  prescriptions: 'prescriptions',
  days: 'plan_days',
  notices: 'notifications',
} as const;

/** `auto` = creado por el sistema (Semana 1 de nutri_add_patient): no cuenta para el límite diario. */
type Stored<X> = X & { auto?: boolean };
type Audience = 'nutricionista' | 'paciente';
type PlanRow = SubscriptionPlan & { audience: Audience };
type SubRow = {
  id: string; user_id: string; plan_id: string; status: SubscriptionStatus;
  current_period_end: string | null; created_at: string; recipes_left: number;
};

const MSG = {
  SIN_RECETAS: 'Este paciente ya usó sus 10 recetas del mes. Podrá recibir más cuando renueve su suscripción.',
  SIN_SUSCRIPCION_PACIENTE: 'Este paciente no tiene una suscripción activa.',
  LIMITE_DIARIO: 'Llegaste a tu límite de registros de hoy. Mejora tu plan para registrar más.',
  PACIENTE_NO_REGISTRADO: 'No hay una cuenta con ese correo. Pídele que se registre y vuelve a agregarlo.',
  PACIENTE_OCUPADO: 'Ese paciente ya está con una nutricionista.',
  CUPO_PLAN_LLENO: 'Llegaste al máximo de pacientes de tu plan. Mejora tu plan para agregar más.',
  RECETA_REQUERIDA: 'Cada día del calendario debe pertenecer a una receta. Crea una receta primero.',
  RECETA_CERRADA: 'Esta receta ya fue entregada y no se puede cambiar.',
  DIA_OCUPADO: 'Ese día ya tiene una receta. Elige un día libre.',
  SOLO_ADMIN: 'Solo el administrador puede hacer esto.',
  SOLO_NUTRICIONISTA: 'Solo los nutricionistas pueden hacer esto.',
  NO_ES_TU_PACIENTE: 'Esa persona no es tu paciente.',
  NO_PERMITIDO: 'No tienes permiso para hacer esto.',
  NO_EXISTE: 'No encontramos eso. Puede que ya no exista.',
  DATOS_INVALIDOS: 'Revisa los datos: hay campos vacíos o con formato incorrecto.',
  ESTADO_INVALIDO: 'Esta factura ya no se puede aprobar.',
  YA_TOMADA: 'Otro nutricionista ya aceptó esta solicitud.',
  YA_TIENES_SOLICITUD: 'Ya tienes una solicitud en curso.',
} as const;

const err = (code: keyof typeof MSG | string, msg?: string) =>
  new AppError(code, msg ?? (MSG as Record<string, string>)[code] ?? 'Algo salió mal. Inténtalo de nuevo.');

/* ------------------------------------------------------------------ utilidades */

const iso = (ms: number = Date.now()) => new Date(ms).toISOString();
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
/** Día 'AAAA-MM-DD' en Guayaquil para un instante (ISO o milisegundos). */
const gyeDay = (ts: string | number = Date.now()) =>
  new Date((typeof ts === 'string' ? Date.parse(ts) : ts) - GYE_MS).toISOString().slice(0, 10);
const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);

function notify(userId: string, kind: string, title: string, body: string | null, link: string | null = null): void {
  const rows = readTable<Record<string, unknown>>(T.notices);
  writeTable(T.notices, [...rows, { id: newId('aviso'), user_id: userId, kind, title, body, link, read_at: null, created_at: iso() }]);
}

/* ------------------------------------------------------------------ sesión y roles */

const users = () => readTable<StoredUser>('users');
const userById = (id: string) => users().find((u) => u.id === id);

function requireMe(): StoredUser {
  const u = currentUser();
  if (!u) throw err('SIN_SESION', 'Inicia sesión para continuar.');
  return u;
}
function requireRole(roles: Role[], code: string, msg: string): StoredUser {
  const u = requireMe();
  if (!roles.includes(u.profile.role)) throw err(code, msg);
  return u;
}
const requireNutri = () => requireRole(['nutricionista'], 'SOLO_NUTRICIONISTA', MSG.SOLO_NUTRICIONISTA);
const requireAdmin = () => requireRole(['admin'], 'SOLO_ADMIN', MSG.SOLO_ADMIN);

/* ------------------------------------------------------------------ ajustes y planes */

/** Correo de la administradora y cupos del plan gratis. Lo puede leer getSettings (index.ts). */
export function contactSettings(): ContactSettingsInput {
  const row = readTable<ContactSettingsInput>(T.settings)[0];
  return row ?? { admin_email: DEFAULT_ADMIN_EMAIL, free_patient_limit: 3, free_daily_record_limit: 10 };
}

const FASES_BASE = { phase1: true, phase2: false, phase3: false, patient_limit: 5, patients_count: 0 };

const SEED_PLANS: PlanRow[] = [
  {
    id: 'plan-starter', audience: 'nutricionista', name: 'Starter', monthly_price: 9, patient_quota: 15,
    active: true, sort: 1, daily_record_limit: 60, recipe_quota: null,
    features: ['Hasta 15 pacientes activos', 'Hasta 60 registros por día', 'Calendario y recetas'],
  },
  {
    id: 'plan-profesional', audience: 'nutricionista', name: 'Profesional', monthly_price: 19, patient_quota: 50,
    active: true, sort: 2, daily_record_limit: null, recipe_quota: null,
    features: ['Hasta 50 pacientes activos', 'Registros sin límite diario', 'Calendario y recetas'],
  },
  {
    id: 'plan-paciente', audience: 'paciente', name: 'Seguimiento mensual', monthly_price: 40, patient_quota: 1,
    active: true, sort: 3, daily_record_limit: null, recipe_quota: 10,
    features: ['10 recetas al mes de tu nutricionista', 'Calendario con tus días', 'Pago por transferencia'],
  },
];

function plans(): PlanRow[] {
  const rows = readTable<PlanRow>(T.plans);
  if (rows.length > 0) return rows;
  writeTable(T.plans, SEED_PLANS);
  return SEED_PLANS;
}
const planById = (id: string) => plans().find((p) => p.id === id);

function settingsView(): AppSettings {
  return { ...FASES_BASE, ...contactSettings() };
}

/** Plan vigente de la nutricionista, o los límites del gratis. */
function limitsOf(nutriId: string): { plan: PlanRow | null; patientQuota: number; daily: number | null } {
  const s = contactSettings();
  const sub = activeSub(T.subs, nutriId);
  const plan = sub ? planById(sub.plan_id) ?? null : null;
  if (plan) return { plan, patientQuota: plan.patient_quota, daily: plan.daily_record_limit };
  return { plan: null, patientQuota: s.free_patient_limit, daily: s.free_daily_record_limit };
}

/* ------------------------------------------------------------------ suscripciones */

const vigente = (s: SubRow, ms: number = Date.now()) =>
  s.status === 'activa' && (!s.current_period_end || Date.parse(s.current_period_end) > ms);

function activeSub(table: string, userId: string): SubRow | undefined {
  return readTable<SubRow>(table).find((s) => s.user_id === userId && vigente(s));
}

/** La suscripción que mostrar: la vigente, si no la más nueva que no esté cancelada. */
function pickCurrent(subs: SubRow[]): SubRow | undefined {
  const vivas = subs.filter((s) => s.status !== 'cancelada').sort((a, b) => b.created_at.localeCompare(a.created_at));
  return vivas.find((s) => vigente(s)) ?? vivas[0];
}

/* ------------------------------------------------------------------ atención (solicitudes y pacientes) */

const cares = () => readTable<CareRequest>(T.care);

function isMyPatient(nutriId: string, patientId: string): boolean {
  return cares().some((c) => c.patient_id === patientId && c.nutritionist_id === nutriId && c.status === 'aceptada');
}
const myPatientsCount = (nutriId: string) =>
  cares().filter((c) => c.nutritionist_id === nutriId && c.status === 'aceptada').length;

/* ------------------------------------------------------------------ límite diario */

type Registro = { nutritionist_id: string; created_at: string; auto?: boolean };

/** Registros creados hoy (día de Guayaquil) por la nutricionista. Editar no cuenta; lo automático tampoco. */
function recordsToday(nutriId: string): number {
  const hoy = gyeDay();
  const cuenta = (rows: Registro[]) =>
    rows.filter((r) => !r.auto && r.nutritionist_id === nutriId && gyeDay(r.created_at) === hoy).length;
  return cuenta(readTable<Registro>(T.days)) + cuenta(readTable<Registro>(T.prescriptions));
}

function assertRoom(nutriId: string, nuevos: number): void {
  const { daily } = limitsOf(nutriId);
  if (daily !== null && recordsToday(nutriId) + nuevos > daily) throw err('LIMITE_DIARIO');
}

/* ------------------------------------------------------------------ recetas */

const prescriptions = () => readTable<Stored<Prescription>>(T.prescriptions);

function findPrescription(id: string): Stored<Prescription> {
  const row = prescriptions().find((r) => r.id === id);
  if (!row) throw err('NO_EXISTE');
  return row;
}

function validPrescription(input: PrescriptionInput): void {
  const titulo = input.title.trim();
  if (!input.patient_id || !KINDS.includes(input.kind) || titulo.length < 2 || titulo.length > 120 || input.body.length > 4000) {
    throw err('DATOS_INVALIDOS');
  }
}

function listPrescriptionsOf(patientId: string): Prescription[] {
  return prescriptions()
    .filter((r) => r.patient_id === patientId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Operaciones que escriben: `await wait()` y luego todo síncrono (sin huecos entre leer y escribir). */
const later = <X>(fn: () => X): Promise<X> => wait().then(fn);

/* ------------------------------------------------------------------ días del calendario */

const planDays = () => readTable<PlanDay>(T.days);

function requirePatientOfNutri(nutriId: string, patientId: string): void {
  if (!isMyPatient(nutriId, patientId)) throw err('NO_ES_TU_PACIENTE');
}

/* ------------------------------------------------------------------ facturas y suscripción */

function solicitar(yo: StoredUser, planId: string, aud: Audience): Invoice {
  const plan = plans().find((p) => p.id === planId && p.audience === aud && p.active);
  if (!plan) throw err('NO_EXISTE');
  const tabla = aud === 'nutricionista' ? T.subs : T.patientSubs;
  const subs = readTable<SubRow>(tabla);
  const facturas = readTable<Invoice>(T.invoices);
  const ahora = iso();

  // Si ya había una pendiente, se reemplaza (y su factura se anula).
  const reemplazadas = subs.filter((s) => s.user_id === yo.id && s.status === 'pendiente').map((s) => s.id);
  const subsSin = subs.map((s) => (reemplazadas.includes(s.id) ? { ...s, status: 'cancelada' as const } : s));
  const facturasSin = facturas.map((f) =>
    f.subscription_id && reemplazadas.includes(f.subscription_id) && (f.status === 'pendiente' || f.status === 'reportada')
      ? { ...f, status: 'anulada' as const }
      : f,
  );

  const sub: SubRow = {
    id: newId('sub'), user_id: yo.id, plan_id: plan.id, status: 'pendiente',
    current_period_end: null, created_at: ahora, recipes_left: 0,
  };
  const factura: Invoice = {
    id: newId('fac'), payer_id: yo.id, payee_id: null,
    kind: aud === 'nutricionista' ? 'suscripcion' : 'suscripcion_paciente',
    subscription_id: sub.id, concept: `Suscripción ${plan.name}`, amount: plan.monthly_price,
    status: 'pendiente', payment_reference: null, reported_at: null, paid_at: null, created_at: ahora,
  };
  writeTable(tabla, [...subsSin, sub]);
  writeTable(T.invoices, [...facturasSin, factura]);
  return factura;
}

function filaAdmin(s: SubRow, aud: Audience, facturas: Invoice[]): AdminSubscriptionRow | null {
  const u = userById(s.user_id);
  const plan = planById(s.plan_id);
  if (!u || !plan) return null;
  const factura = facturas
    .filter((f) => f.subscription_id === s.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return {
    invoice_id: factura?.id ?? '', subscription_id: s.id, audience: aud, user_id: u.id,
    full_name: u.profile.full_name, email: u.email, plan_name: plan.name,
    amount: factura?.amount ?? plan.monthly_price, status: s.status, created_at: s.created_at,
    period_end: s.current_period_end, recipes_left: aud === 'paciente' ? s.recipes_left : null,
  };
}

/* ------------------------------------------------------------------ la pieza que se une al Repo */

export const recetasPart: Partial<Repo> = {
  // ---------------------------------------------------------------- recetas
  async listPrescriptions(patientId) {
    await wait();
    const yo = requireMe();
    const puede = yo.profile.role === 'admin' || (yo.profile.role === 'nutricionista' && isMyPatient(yo.id, patientId));
    if (!puede) throw err('NO_PERMITIDO');
    return listPrescriptionsOf(patientId);
  },

  async listMyPrescriptions() {
    await wait();
    const yo = requireMe();
    return listPrescriptionsOf(yo.id).filter((r) => r.status === 'entregada');
  },

  savePrescription: (input: PrescriptionInput) => later(() => {
    const yo = requireNutri();
    validPrescription(input);
    requirePatientOfNutri(yo.id, input.patient_id);
    const rows = prescriptions();
    const ahora = iso();
    if (input.id) {
      const row = rows.find((r) => r.id === input.id);
      if (!row || row.patient_id !== input.patient_id) throw err('NO_EXISTE');
      if (row.status !== 'borrador') throw err('RECETA_CERRADA');
      const next = { ...row, kind: input.kind, title: input.title.trim(), body: input.body, updated_at: ahora };
      writeTable(T.prescriptions, rows.map((r) => (r.id === row.id ? next : r)));
      return next;
    }
    assertRoom(yo.id, 1);
    const nueva: Stored<Prescription> = {
      id: newId('rec'), patient_id: input.patient_id, nutritionist_id: yo.id, kind: input.kind,
      title: input.title.trim(), body: input.body, status: 'borrador', counts_against_patient: false,
      delivered_at: null, created_at: ahora, updated_at: ahora,
    };
    writeTable(T.prescriptions, [...rows, nueva]);
    return nueva;
  }),

  deletePrescription: (id: string) => later(() => {
    const yo = requireNutri();
    const row = findPrescription(id);
    requirePatientOfNutri(yo.id, row.patient_id);
    if (row.status !== 'borrador') throw err('RECETA_CERRADA');
    writeTable(T.prescriptions, prescriptions().filter((r) => r.id !== id));
    writeTable(T.days, planDays().filter((d) => d.prescription_id !== id));
  }),

  /** Entrega: descuenta una receta si el paciente es de plataforma. Dos veces → RECETA_CERRADA y saldo intacto. */
  deliverPrescription: (id: string) => later(() => {
    const yo = requireNutri();
    const row = findPrescription(id);
    requirePatientOfNutri(yo.id, row.patient_id);
    if (row.status !== 'borrador') throw err('RECETA_CERRADA');
    const atencion = cares().find((c) => c.patient_id === row.patient_id && c.status === 'aceptada');
    let descuenta = false;
    if (atencion?.origin === 'plataforma') {
      const subs = readTable<SubRow>(T.patientSubs);
      const sub = subs.find((s) => s.user_id === row.patient_id && vigente(s));
      if (!sub) throw err('SIN_SUSCRIPCION_PACIENTE');
      if (sub.recipes_left <= 0) throw err('SIN_RECETAS');
      writeTable(T.patientSubs, subs.map((s) => (s.id === sub.id ? { ...s, recipes_left: s.recipes_left - 1 } : s)));
      descuenta = true;
    }
    const ahora = iso();
    const next = { ...row, status: 'entregada' as const, counts_against_patient: descuenta, delivered_at: ahora, updated_at: ahora };
    writeTable(T.prescriptions, prescriptions().map((r) => (r.id === id ? next : r)));
    notify(row.patient_id, 'receta_nueva', `Tu nutricionista te envió una receta: ${row.title}`, null, '/mi-plan/agenda');
    return next;
  }),

  getRecipeBalance: (patientId?: string) => wait().then((): RecipeBalance => {
    const yo = requireMe();
    const pid = patientId ?? yo.id;
    const puede = pid === yo.id || yo.profile.role === 'admin' || (yo.profile.role === 'nutricionista' && isMyPatient(yo.id, pid));
    if (!puede) throw err('NO_PERMITIDO');
    const sub = activeSub(T.patientSubs, pid);
    const plan = sub ? planById(sub.plan_id) : plans().find((p) => p.audience === 'paciente' && p.active);
    return {
      left: sub?.recipes_left ?? 0,
      quota: plan?.recipe_quota ?? 0,
      period_end: sub?.current_period_end ?? null,
    };
  }),

  // ---------------------------------------------------------------- calendario (solo dentro de recetas)
  async listPlanDays(patientId, from, to) {
    await wait();
    const yo = requireMe();
    const esNutri = yo.profile.role === 'nutricionista' && isMyPatient(yo.id, patientId);
    const esAdmin = yo.profile.role === 'admin';
    const esPropio = yo.id === patientId;
    if (!esNutri && !esAdmin && !esPropio) throw err('NO_PERMITIDO');
    const rx = prescriptions();
    const visible = (d: PlanDay) => {
      if (esNutri || esAdmin) return true;
      if (d.prescription_id) return rx.find((r) => r.id === d.prescription_id)?.status === 'entregada';
      return Boolean(activeSub(T.patientSubs, patientId));
    };
    return planDays()
      .filter((d) => d.patient_id === patientId && d.day >= from && d.day <= to && visible(d))
      .sort((a, b) => a.day.localeCompare(b.day));
  },

  savePlanDay: (patientId: string, input: PlanDayInput) => later((): PlanDay => {
    const yo = requireNutri();
    requirePatientOfNutri(yo.id, patientId);
    if (!DATE_RE.test(input.day) || input.title.trim() === '') throw err('DATOS_INVALIDOS');
    const dias = planDays();
    const ahora = iso();
    const campos = {
      day: input.day, title: input.title.trim(), meals: input.meals || null,
      exercise: input.exercise || null, notes: input.notes || null,
    };
    if (input.id) {
      const row = dias.find((d) => d.id === input.id && d.patient_id === patientId);
      if (!row) throw err('NO_EXISTE');
      if (row.prescription_id && findPrescription(row.prescription_id).status !== 'borrador') throw err('RECETA_CERRADA');
      if (dias.some((d) => d.id !== row.id && d.patient_id === patientId && d.day === input.day)) throw err('DIA_OCUPADO');
      const next = { ...row, ...campos, updated_at: ahora };
      writeTable(T.days, dias.map((d) => (d.id === row.id ? next : d)));
      return next;
    }
    if (!input.prescription_id) throw err('RECETA_REQUERIDA');
    const rx = prescriptions().find((r) => r.id === input.prescription_id && r.patient_id === patientId);
    if (!rx || rx.status !== 'borrador') throw err('RECETA_CERRADA');
    if (dias.some((d) => d.patient_id === patientId && d.day === input.day)) throw err('DIA_OCUPADO');
    assertRoom(yo.id, 1);
    const nuevo: PlanDay = {
      id: newId('dia'), patient_id: patientId, nutritionist_id: yo.id, ...campos,
      done_at: null, patient_note: null, prescription_id: rx.id, created_at: ahora, updated_at: ahora,
    };
    writeTable(T.days, [...dias, nuevo]);
    return nuevo;
  }),

  deletePlanDay: (id: string) => later(() => {
    const yo = requireNutri();
    const row = planDays().find((d) => d.id === id);
    if (!row) throw err('NO_EXISTE');
    requirePatientOfNutri(yo.id, row.patient_id);
    if (row.prescription_id && findPrescription(row.prescription_id).status !== 'borrador') throw err('RECETA_CERRADA');
    writeTable(T.days, planDays().filter((d) => d.id !== id));
  }),

  setPlanDayDone: (id: string, done: boolean, note: string | null) => later((): PlanDay => {
    const yo = requireMe();
    const row = planDays().find((d) => d.id === id);
    if (!row) throw err('NO_EXISTE');
    if (row.patient_id !== yo.id) throw err('NO_PERMITIDO');
    if (row.prescription_id && findPrescription(row.prescription_id).status !== 'entregada') throw err('NO_PERMITIDO');
    const next = { ...row, done_at: done ? iso() : null, patient_note: note?.trim() || null, updated_at: iso() };
    writeTable(T.days, planDays().map((d) => (d.id === id ? next : d)));
    return next;
  }),

  /** Copia los días de la semana `fromMonday` a la de `toMonday` en días libres, dentro de la receta borrador. */
  copyPlanWeek: (patientId: string, fromMonday: string, toMonday: string, prescriptionId: string) => later(() => {
    const yo = requireNutri();
    if (!DATE_RE.test(fromMonday) || !DATE_RE.test(toMonday)) throw err('DATOS_INVALIDOS');
    requirePatientOfNutri(yo.id, patientId);
    const rx = prescriptions().find((r) => r.id === prescriptionId && r.patient_id === patientId);
    if (!rx) throw err('NO_EXISTE');
    if (rx.status !== 'borrador') throw err('RECETA_CERRADA');
    const offset = daysBetween(fromMonday, toMonday);
    const dias = planDays();
    const mios = dias.filter((d) => d.patient_id === patientId);
    const ocupados = new Set(mios.map((d) => d.day));
    const hasta = addDays(fromMonday, 6);
    const copias = mios
      .filter((d) => d.day >= fromMonday && d.day <= hasta)
      .map((d) => ({ d, destino: addDays(d.day, offset) }))
      .filter(({ destino }) => !ocupados.has(destino));
    if (copias.length === 0) return 0;
    assertRoom(yo.id, copias.length); // si no caben todos, falla completa
    const ahora = iso();
    const nuevas: PlanDay[] = copias.map(({ d, destino }) => ({
      id: newId('dia'), patient_id: patientId, nutritionist_id: yo.id, day: destino, title: d.title,
      meals: d.meals, exercise: d.exercise, notes: d.notes, done_at: null, patient_note: null,
      prescription_id: prescriptionId, created_at: ahora, updated_at: ahora,
    }));
    writeTable(T.days, [...dias, ...nuevas]);
    return nuevas.length;
  }),

  // ---------------------------------------------------------------- atención y pacientes de la nutricionista
  requestCare: (message: string | null) => later((): CareRequest => {
    const yo = requireRole(['usuario'], 'NO_PERMITIDO', 'Solo las pacientes pueden pedir atención.');
    if (cares().some((c) => c.patient_id === yo.id && (c.status === 'abierta' || c.status === 'aceptada'))) {
      throw err('YA_TIENES_SOLICITUD');
    }
    const fila: CareRequest = {
      id: newId('atencion'), patient_id: yo.id, nutritionist_id: null, status: 'abierta',
      message: message?.trim() || null, created_at: iso(), accepted_at: null, closed_at: null, origin: 'plataforma',
    };
    writeTable(T.care, [...cares(), fila]);
    return fila;
  }),

  async listOpenCareRequests() {
    await wait();
    requireNutri();
    return cares().filter((c) => c.status === 'abierta').sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  acceptCareRequest: (id: string) => later(() => {
    const yo = requireNutri();
    const filas = cares();
    const fila = filas.find((c) => c.id === id);
    if (!fila) throw err('NO_EXISTE');
    if (fila.status !== 'abierta') throw err('YA_TOMADA');
    if (myPatientsCount(yo.id) >= limitsOf(yo.id).patientQuota) throw err('CUPO_PLAN_LLENO');
    const ahora = iso();
    writeTable(T.care, filas.map((c) => (c.id === id ? { ...c, status: 'aceptada' as const, nutritionist_id: yo.id, accepted_at: ahora } : c)));
    notify(fila.patient_id, 'solicitud_aceptada', 'Tu solicitud fue aceptada', 'Tu nutricionista ya te atiende.');
  }),

  nutriAddPatient: (email: string) => later((): NutriAddPatientResult => {
    const yo = requireNutri();
    const correo = email.trim().toLowerCase();
    if (!EMAIL_RE.test(correo)) throw err('DATOS_INVALIDOS');
    const paciente = users().find((u) => u.email.toLowerCase() === correo && u.profile.role === 'usuario');
    if (!paciente) throw err('PACIENTE_NO_REGISTRADO');
    if (cares().some((c) => c.patient_id === paciente.id && (c.status === 'abierta' || c.status === 'aceptada'))) {
      throw err('PACIENTE_OCUPADO');
    }
    if (myPatientsCount(yo.id) >= limitsOf(yo.id).patientQuota) throw err('CUPO_PLAN_LLENO');

    const ahora = iso();
    const atencion: CareRequest = {
      id: newId('atencion'), patient_id: paciente.id, nutritionist_id: yo.id, status: 'aceptada',
      message: null, created_at: ahora, accepted_at: ahora, closed_at: null, origin: 'propio',
    };
    const rxId = newId('rec');
    const semana: Stored<Prescription> = {
      id: rxId, patient_id: paciente.id, nutritionist_id: yo.id, kind: 'dieta', title: 'Semana 1', body: '',
      status: 'borrador', counts_against_patient: false, delivered_at: null, created_at: ahora, updated_at: ahora, auto: true,
    };
    // Siete días libres desde mañana (hora de Guayaquil), sin plantilla: «Día N» vacíos.
    const ocupados = new Set(planDays().filter((d) => d.patient_id === paciente.id).map((d) => d.day));
    const dias: string[] = [];
    for (let candidato = addDays(gyeDay(), 1); dias.length < 7; candidato = addDays(candidato, 1)) {
      if (!ocupados.has(candidato)) dias.push(candidato);
    }
    const filas = dias.map((day, i) => ({
      id: newId('dia'), patient_id: paciente.id, nutritionist_id: yo.id, day, title: `Día ${i + 1}`,
      meals: null, exercise: null, notes: null, done_at: null, patient_note: null, prescription_id: rxId,
      created_at: ahora, updated_at: ahora, auto: true,
    }));
    writeTable(T.care, [...cares(), atencion]);
    writeTable(T.prescriptions, [...prescriptions(), semana]);
    writeTable(T.days, [...planDays(), ...filas]);
    notify(paciente.id, 'solicitud_aceptada', 'Tu nutricionista te agregó', 'Ya tienes una semana lista en tu calendario.', '/mi-plan/agenda');
    return { patient_id: paciente.id, prescription_id: rxId };
  }),

  getNutriLimits: () => later((): NutriLimits => {
    const yo = requireNutri();
    const l = limitsOf(yo.id);
    return {
      plan_name: l.plan?.name ?? null,
      patient_quota: l.patientQuota,
      daily_record_limit: l.daily,
      patients_used: myPatientsCount(yo.id),
      records_today: recordsToday(yo.id),
    };
  }),

  // ---------------------------------------------------------------- planes y suscripción
  async listPlans() {
    await wait();
    return plans().filter((p) => p.audience === 'nutricionista' && p.active).sort((a, b) => a.sort - b.sort);
  },

  async listPatientPlans() {
    await wait();
    return plans().filter((p) => p.audience === 'paciente' && p.active).sort((a, b) => a.sort - b.sort);
  },

  choosePlan: (planId: string) => later(() => solicitar(requireNutri(), planId, 'nutricionista')),

  choosePatientPlan: (planId: string) => later(() =>
    solicitar(requireRole(['usuario'], 'NO_PERMITIDO', 'Solo las pacientes pueden pedir este plan.'), planId, 'paciente')),

  /**
   * Aprueba una factura (admin). Renovación (mismo plan): +30 días sobre el vencimiento vigente.
   * Cambio de plan de nutricionista: la activa pasa a cancelada y la nueva dura 30 días desde hoy.
   * Paciente: recetas = saldo vigente + cuota del plan. Una segunda aprobación → ESTADO_INVALIDO.
   */
  markInvoicePaid: (id: string) => later(() => {
    requireAdmin();
    const facturas = readTable<Invoice>(T.invoices);
    const factura = facturas.find((f) => f.id === id);
    if (!factura) throw err('NO_EXISTE');
    if (factura.status !== 'pendiente' && factura.status !== 'reportada') throw err('ESTADO_INVALIDO');
    const ahora = iso();
    writeTable(T.invoices, facturas.map((f) => (f.id === id ? { ...f, status: 'pagada' as const, paid_at: ahora } : f)));
    if (!factura.subscription_id) return;

    const aud: Audience = factura.kind === 'suscripcion_paciente' ? 'paciente' : 'nutricionista';
    const tabla = aud === 'nutricionista' ? T.subs : T.patientSubs;
    const subs = readTable<SubRow>(tabla);
    const nueva = subs.find((s) => s.id === factura.subscription_id);
    if (!nueva) throw err('NO_EXISTE');
    if (nueva.status !== 'pendiente') throw err('ESTADO_INVALIDO');
    const plan = planById(nueva.plan_id);
    if (!plan) throw err('NO_EXISTE');

    const ms = Date.now();
    const actual = subs.find((s) => s.user_id === nueva.user_id && s.status === 'activa' && s.id !== nueva.id);
    const actualVigente = actual !== undefined && vigente(actual, ms);
    const renovacion = actual !== undefined && actual.plan_id === nueva.plan_id;
    // Renovación: el vencimiento vigente + 30 días; si ya venció, + 30 desde hoy.
    const finVigente = actual && actualVigente && actual.current_period_end ? Date.parse(actual.current_period_end) : null;
    const base = renovacion && finVigente !== null ? finVigente : ms;
    const saldoPrevio = actual && actualVigente ? actual.recipes_left : 0;
    const activa: SubRow = {
      ...nueva,
      status: 'activa',
      current_period_end: iso(base + 30 * DAY_MS),
      recipes_left: aud === 'paciente' ? saldoPrevio + (plan.recipe_quota ?? 0) : 0,
    };
    writeTable(tabla, subs.map((s) => {
      if (s.id === nueva.id) return activa;
      if (actual && s.id === actual.id) return { ...s, status: 'cancelada' as const };
      return s;
    }));

    if (aud === 'paciente') {
      const filas = cares();
      if (!filas.some((c) => c.patient_id === nueva.user_id && (c.status === 'abierta' || c.status === 'aceptada'))) {
        writeTable(T.care, [...filas, {
          id: newId('atencion'), patient_id: nueva.user_id, nutritionist_id: null, status: 'abierta',
          message: null, created_at: ahora, accepted_at: null, closed_at: null, origin: 'plataforma',
        } as CareRequest]);
      }
    }
    notify(nueva.user_id, 'factura_pagada', 'Tu suscripción está activa', `Plan ${plan.name}, hasta ${activa.current_period_end?.slice(0, 10)}.`);
  }),

  cancelInvoice: (id: string) => later(() => {
    const yo = requireMe();
    const facturas = readTable<Invoice>(T.invoices);
    const factura = facturas.find((f) => f.id === id);
    if (!factura) throw err('NO_EXISTE');
    if (yo.profile.role !== 'admin' && factura.payer_id !== yo.id) throw err('NO_PERMITIDO');
    if (factura.status !== 'pendiente' && factura.status !== 'reportada') throw err('ESTADO_INVALIDO');
    writeTable(T.invoices, facturas.map((f) => (f.id === id ? { ...f, status: 'anulada' as const } : f)));
    if (factura.subscription_id) {
      for (const tabla of [T.subs, T.patientSubs]) {
        writeTable(tabla, readTable<SubRow>(tabla).map((s) =>
          s.id === factura.subscription_id && s.status === 'pendiente' ? { ...s, status: 'cancelada' as const } : s));
      }
    }
  }),

  async getMySubscription(): Promise<Subscription | null> {
    await wait();
    const yo = requireMe();
    const s = pickCurrent(readTable<SubRow>(T.subs).filter((x) => x.user_id === yo.id));
    if (!s) return null;
    return {
      id: s.id, nutritionist_id: s.user_id, plan_id: s.plan_id, status: s.status,
      current_period_end: s.current_period_end, created_at: s.created_at, plan: planById(s.plan_id),
    };
  },

  async getMyPatientSubscription(): Promise<PatientSubscription | null> {
    await wait();
    const yo = requireMe();
    const s = pickCurrent(readTable<SubRow>(T.patientSubs).filter((x) => x.user_id === yo.id));
    const plan = s ? planById(s.plan_id) : undefined;
    if (!s || !plan) return null;
    return {
      id: s.id, plan_id: plan.id, plan_name: plan.name, monthly_price: plan.monthly_price, status: s.status,
      current_period_end: s.current_period_end, created_at: s.created_at, recipes_left: s.recipes_left,
    };
  },

  adminSubscriptionsOverview: () => wait().then((): AdminSubscriptionsOverview => {
    requireAdmin();
    const facturas = readTable<Invoice>(T.invoices);
    const todas = [
      ...readTable<SubRow>(T.subs).map((s) => ({ s, aud: 'nutricionista' as const })),
      ...readTable<SubRow>(T.patientSubs).map((s) => ({ s, aud: 'paciente' as const })),
    ];
    const filas = (estado: SubscriptionStatus) => todas
      .filter(({ s }) => s.status === estado)
      .map(({ s, aud }) => filaAdmin(s, aud, facturas))
      .filter((f): f is AdminSubscriptionRow => f !== null);
    return { pending: filas('pendiente'), active: filas('activa') };
  }),

  adminSaveContactSettings: (input: ContactSettingsInput) => later((): AppSettings => {
    requireAdmin();
    const correo = input.admin_email.trim();
    const enteroPositivo = (n: number) => Number.isInteger(n) && n > 0;
    if (!EMAIL_RE.test(correo) || !enteroPositivo(input.free_patient_limit) || !enteroPositivo(input.free_daily_record_limit)) {
      throw err('DATOS_INVALIDOS');
    }
    writeTable(T.settings, [{
      admin_email: correo, free_patient_limit: input.free_patient_limit, free_daily_record_limit: input.free_daily_record_limit,
    }]);
    return settingsView();
  }),
};
