/** Semana gratis, chequeos, suscripción del paciente, plantillas y guía con Supabase (dueño: D4). */
import type {
  CheckinInput,
  DailyCheckin,
  GuideEntry,
  GuideEntryInput,
  Invoice,
  PatientSubscription,
  PlanTemplate,
  PlanTemplateInput,
  PlanTemplateItem,
  PlanTemplateItemInput,
  Repo,
  SubscriptionPlan,
  Trial,
  TrialDay,
  TrialItem,
} from '../types';
import { AppError } from '../types';
import { supabase } from './client';
import { toAppError, unwrap } from './errors';

const SIN_SESION = 'Inicia sesión para continuar.';
const SIN_TRIAL = 'No pudimos preparar tu semana. Inténtalo de nuevo.';
const ZONA = 'America/Guayaquil';

/* ------------------------------------------------------------------ utilidades */

/** numeric/int de Postgres puede llegar como texto: lo convierte a number (o null si está vacío). */
function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Hora 'HH:MM' (Postgres la puede devolver con segundos). */
function hora(v: string): string {
  return String(v).slice(0, 5);
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw toAppError(error);
  const id = data.session?.user.id;
  if (!id) throw new AppError('SIN_SESION', SIN_SESION);
  return id;
}

/** Hoy en Guayaquil ('AAAA-MM-DD'), igual que gye_today() en la base. */
function hoyGuayaquil(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date());
}

/** Fecha de hace `days` días desde hoy en Guayaquil ('AAAA-MM-DD'). */
function hacePorDias(days: number): string {
  const [y, m, d] = hoyGuayaquil().split('-').map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d - days));
  return fecha.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ semana gratis */

interface TrialItemJson {
  id: string;
  at_time: string;
  kind: TrialItem['kind'];
  title: string;
  detail: string | null;
  done: boolean;
}

interface TrialDayJson {
  day_number: number | string;
  unlocked: boolean;
  unlocked_on: string | null;
  completed_at: string | null;
  items_total: number | string;
  items_done: number | string;
  items?: TrialItemJson[] | null;
}

interface TrialJson {
  template_name: string;
  template_status: Trial['template_status'];
  author_name: string;
  kcal_target: number | string;
  portion_factor: number | string;
  started_on: string;
  today: string;
  current_day: number | string | null;
  finished: boolean;
  days: TrialDayJson[];
}

function toTrialItem(i: TrialItemJson): TrialItem {
  return { id: i.id, at_time: hora(i.at_time), kind: i.kind, title: i.title, detail: i.detail, done: Boolean(i.done) };
}

function toTrialDay(d: TrialDayJson): TrialDay {
  return {
    day_number: toNum(d.day_number) ?? 0,
    unlocked: Boolean(d.unlocked),
    unlocked_on: d.unlocked_on,
    completed_at: d.completed_at,
    items_total: toNum(d.items_total) ?? 0,
    items_done: toNum(d.items_done) ?? 0,
    items: (d.items ?? []).map(toTrialItem),
  };
}

function toTrial(r: TrialJson): Trial {
  return {
    template_name: r.template_name,
    template_status: r.template_status,
    author_name: r.author_name,
    kcal_target: toNum(r.kcal_target) ?? 0,
    portion_factor: toNum(r.portion_factor) ?? 1,
    started_on: r.started_on,
    today: r.today,
    current_day: toNum(r.current_day),
    finished: Boolean(r.finished),
    days: r.days.map(toTrialDay).sort((a, b) => a.day_number - b.day_number),
  };
}

/** Una respuesta de my_trial() que debe traer semana (set_trial_item_done siempre la trae). */
function trialDeRespuesta(row: TrialJson | null): Trial {
  if (!row) throw new AppError('SIN_PLANTILLA', SIN_TRIAL);
  return toTrial(row);
}

async function getMyTrial(): Promise<Trial | null> {
  const row = unwrap(await supabase.rpc('my_trial')) as TrialJson | null;
  return row ? toTrial(row) : null;
}

async function startMyTrial(): Promise<Trial> {
  unwrap(await supabase.rpc('assign_trial'));
  return trialDeRespuesta(unwrap(await supabase.rpc('my_trial')) as TrialJson | null);
}

async function setTrialItemDone(itemId: string, done: boolean): Promise<Trial> {
  const row = unwrap(await supabase.rpc('set_trial_item_done', { p_id: itemId, p_done: done })) as TrialJson | null;
  return trialDeRespuesta(row);
}

async function getPatientTrial(patientId: string): Promise<Trial | null> {
  const row = unwrap(await supabase.rpc('my_trial', { p_user: patientId })) as TrialJson | null;
  return row ? toTrial(row) : null;
}

/* ------------------------------------------------------------------ chequeos */

interface CheckinRow extends Omit<DailyCheckin, 'weight_kg' | 'water_glasses'> {
  weight_kg: number | string | null;
  water_glasses: number | string | null;
}

function toCheckin(r: CheckinRow): DailyCheckin {
  return { ...r, mood: toNum(r.mood) ?? 0, weight_kg: toNum(r.weight_kg), water_glasses: toNum(r.water_glasses) };
}

async function getTodayCheckin(): Promise<DailyCheckin | null> {
  const uid = await currentUserId();
  const row = unwrap(
    await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', uid)
      .eq('checkin_date', hoyGuayaquil())
      .maybeSingle(),
  ) as CheckinRow | null;
  return row ? toCheckin(row) : null;
}

async function saveTodayCheckin(input: CheckinInput): Promise<DailyCheckin> {
  const row = unwrap(
    await supabase.rpc('save_checkin', {
      p_mood: input.mood,
      p_weight: input.weight_kg,
      p_water: input.water_glasses,
      p_note: input.note,
    }),
  ) as CheckinRow;
  return toCheckin(row);
}

async function listCheckins(patientId: string, days: number): Promise<DailyCheckin[]> {
  const rows = unwrap(
    await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', patientId)
      .gte('checkin_date', hacePorDias(days))
      .order('checkin_date', { ascending: true }),
  ) as CheckinRow[];
  return rows.map(toCheckin);
}

/* ------------------------------------------------------------------ suscripción del paciente */

interface PlanRow {
  id: string;
  name: string;
  monthly_price: number | string;
  patient_quota: number | string;
  active: boolean;
  sort: number | string;
}

function toPlan(r: PlanRow): SubscriptionPlan {
  return {
    id: r.id,
    name: r.name,
    monthly_price: toNum(r.monthly_price) ?? 0,
    patient_quota: toNum(r.patient_quota) ?? 0,
    active: r.active,
    sort: toNum(r.sort) ?? 0,
  };
}

interface InvoiceRow extends Omit<Invoice, 'amount'> {
  amount: number | string;
}

function toInvoice(r: InvoiceRow): Invoice {
  return { ...r, amount: toNum(r.amount) ?? 0 };
}

interface PatientSubscriptionRow extends Omit<PatientSubscription, 'monthly_price'> {
  monthly_price: number | string;
}

async function listPatientPlans(): Promise<SubscriptionPlan[]> {
  const rows = unwrap(
    await supabase
      .from('subscription_plans')
      .select('*')
      .eq('audience', 'paciente')
      .eq('active', true)
      .order('sort', { ascending: true }),
  ) as PlanRow[];
  return rows.map(toPlan);
}

async function getMyPatientSubscription(): Promise<PatientSubscription | null> {
  // La función devuelve una tabla: viene como lista de filas (0 o 1).
  const rows = unwrap(await supabase.rpc('my_patient_subscription')) as PatientSubscriptionRow[] | null;
  const r = rows?.[0];
  if (!r) return null;
  return { ...r, monthly_price: toNum(r.monthly_price) ?? 0 };
}

async function choosePatientPlan(planId: string): Promise<Invoice> {
  const row = unwrap(await supabase.rpc('choose_patient_plan', { p_plan: planId })) as InvoiceRow;
  return toInvoice(row);
}

/* ------------------------------------------------------------------ plantillas (nutricionista/admin) */

interface TemplateRow extends Omit<PlanTemplate, 'bmi_min' | 'bmi_max' | 'items_count' | 'kcal_base' | 'age_min' | 'age_max'> {
  bmi_min: number | string;
  bmi_max: number | string;
  age_min: number | string;
  age_max: number | string;
  kcal_base: number | string;
  plan_template_items?: { count: number | string }[] | null;
}

function toTemplate(r: TemplateRow): PlanTemplate {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    sex: r.sex,
    age_min: toNum(r.age_min) ?? 0,
    age_max: toNum(r.age_max) ?? 0,
    bmi_min: toNum(r.bmi_min) ?? 0,
    bmi_max: toNum(r.bmi_max) ?? 0,
    goal: r.goal,
    kcal_base: toNum(r.kcal_base) ?? 0,
    author_name: r.author_name,
    status: r.status,
    is_fallback: Boolean(r.is_fallback),
    items_count: toNum(r.plan_template_items?.[0]?.count) ?? 0,
  };
}

interface TemplateItemRow extends Omit<PlanTemplateItem, 'at_time' | 'day_number' | 'sort'> {
  at_time: string;
  day_number: number | string;
  sort: number | string;
}

function toTemplateItem(r: TemplateItemRow): PlanTemplateItem {
  return { ...r, at_time: hora(r.at_time), day_number: toNum(r.day_number) ?? 0, sort: toNum(r.sort) ?? 0 };
}

/** Campos de una plantilla que se guardan (sin id, sin contar ítems, sin fechas). */
function camposPlantilla(input: PlanTemplateInput) {
  return {
    name: input.name,
    description: input.description,
    sex: input.sex,
    age_min: input.age_min,
    age_max: input.age_max,
    bmi_min: input.bmi_min,
    bmi_max: input.bmi_max,
    goal: input.goal,
    kcal_base: input.kcal_base,
    author_name: input.author_name,
    status: input.status,
    is_fallback: input.is_fallback,
  };
}

const PLANTILLA_CON_CUENTA = '*, plan_template_items(count)';

async function adminListTemplates(): Promise<PlanTemplate[]> {
  const rows = unwrap(
    await supabase.from('plan_templates').select(PLANTILLA_CON_CUENTA).order('name', { ascending: true }),
  ) as TemplateRow[];
  return rows.map(toTemplate);
}

async function adminGetTemplate(id: string): Promise<{ template: PlanTemplate; items: PlanTemplateItem[] } | null> {
  const row = unwrap(
    await supabase.from('plan_templates').select(PLANTILLA_CON_CUENTA).eq('id', id).maybeSingle(),
  ) as TemplateRow | null;
  if (!row) return null;
  const items = unwrap(
    await supabase
      .from('plan_template_items')
      .select('*')
      .eq('template_id', id)
      .order('day_number', { ascending: true })
      .order('at_time', { ascending: true }),
  ) as TemplateItemRow[];
  return { template: toTemplate(row), items: items.map(toTemplateItem) };
}

async function adminSaveTemplate(input: PlanTemplateInput): Promise<PlanTemplate> {
  const row = unwrap(
    await supabase
      .from('plan_templates')
      .upsert({ ...(input.id ? { id: input.id } : {}), ...camposPlantilla(input) })
      .select(PLANTILLA_CON_CUENTA)
      .single(),
  ) as TemplateRow;
  return toTemplate(row);
}

async function adminDeleteTemplate(id: string): Promise<void> {
  unwrap(await supabase.from('plan_templates').delete().eq('id', id));
}

async function adminSaveTemplateItem(input: PlanTemplateItemInput): Promise<PlanTemplateItem> {
  const row = unwrap(
    await supabase
      .from('plan_template_items')
      .upsert({
        ...(input.id ? { id: input.id } : {}),
        template_id: input.template_id,
        day_number: input.day_number,
        at_time: input.at_time,
        kind: input.kind,
        title: input.title,
        detail: input.detail,
        sort: input.sort,
      })
      .select('*')
      .single(),
  ) as TemplateItemRow;
  return toTemplateItem(row);
}

async function adminDeleteTemplateItem(id: string): Promise<void> {
  unwrap(await supabase.from('plan_template_items').delete().eq('id', id));
}

/* ------------------------------------------------------------------ guía */

interface GuideRow extends Omit<GuideEntry, 'sort' | 'do_items' | 'avoid_items' | 'steps'> {
  sort: number | string;
  do_items: string[] | null;
  avoid_items: string[] | null;
  steps: string[] | null;
}

function toGuide(r: GuideRow): GuideEntry {
  return {
    ...r,
    sort: toNum(r.sort) ?? 0,
    do_items: r.do_items ?? [],
    avoid_items: r.avoid_items ?? [],
    steps: r.steps ?? [],
  };
}

async function listGuide(): Promise<GuideEntry[]> {
  const rows = unwrap(
    await supabase
      .from('guide_entries')
      .select('*')
      .eq('published', true)
      .order('category', { ascending: true })
      .order('sort', { ascending: true }),
  ) as GuideRow[];
  return rows.map(toGuide);
}

async function adminListGuide(): Promise<GuideEntry[]> {
  const rows = unwrap(
    await supabase
      .from('guide_entries')
      .select('*')
      .order('category', { ascending: true })
      .order('sort', { ascending: true }),
  ) as GuideRow[];
  return rows.map(toGuide);
}

async function adminSaveGuideEntry(input: GuideEntryInput): Promise<GuideEntry> {
  const row = unwrap(
    await supabase
      .from('guide_entries')
      .upsert({
        ...(input.id ? { id: input.id } : {}),
        slug: input.slug,
        category: input.category,
        title: input.title,
        summary: input.summary,
        objective: input.objective,
        do_items: input.do_items,
        avoid_items: input.avoid_items,
        steps: input.steps,
        source: input.source,
        published: input.published,
        sort: input.sort,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single(),
  ) as GuideRow;
  return toGuide(row);
}

async function adminDeleteGuideEntry(id: string): Promise<void> {
  unwrap(await supabase.from('guide_entries').delete().eq('id', id));
}

/* ------------------------------------------------------------------ parte del repo */

export const trialPart: Partial<Repo> = {
  getMyTrial,
  startMyTrial,
  setTrialItemDone,
  getPatientTrial,
  getTodayCheckin,
  saveTodayCheckin,
  listCheckins,
  listPatientPlans,
  getMyPatientSubscription,
  choosePatientPlan,
  adminListTemplates,
  adminGetTemplate,
  adminSaveTemplate,
  adminDeleteTemplate,
  adminSaveTemplateItem,
  adminDeleteTemplateItem,
  listGuide,
  adminListGuide,
  adminSaveGuideEntry,
  adminDeleteGuideEntry,
};
