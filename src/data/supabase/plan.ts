/** Seguimiento, calendario, pagos y reseñas con Supabase (dueño: D3). */
import type {
  Followup,
  FollowupInput,
  Invoice,
  InvoiceInput,
  PlanDay,
  PlanDayInput,
  RatingSummary,
  Repo,
  Review,
  ReviewInput,
  ReviewTarget,
  Subscription,
  SubscriptionPlan,
  SubscriptionPlanInput,
} from '../types';
import { AppError } from '../types';
import { supabase } from './client';
import { toAppError, unwrap } from './errors';

const DIA_REPETIDO = 'Ya hay un plan para ese día.';

/* ------------------------------------------------------------------ utilidades */

/** numeric/int de Postgres puede llegar como texto: lo convierte a number (o null si está vacío). */
function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Error de escritura en plan_days: el día repetido (23505) tiene mensaje propio. */
function planDayError(error: { code?: string; message?: string }): AppError {
  if (error.code === '23505') return new AppError('DATOS_INVALIDOS', DIA_REPETIDO);
  return toAppError(error);
}

/* ------------------------------------------------------------------ filas */

interface FollowupRow extends Omit<Followup, 'weight_kg' | 'waist_cm'> {
  weight_kg: number | string | null;
  waist_cm: number | string | null;
}

function toFollowup(r: FollowupRow): Followup {
  return { ...r, weight_kg: toNum(r.weight_kg), waist_cm: toNum(r.waist_cm) };
}

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

/** Fila de invoices (o de sus RPC) con nombres opcionales. */
interface InvoiceRow extends Omit<Invoice, 'amount'> {
  amount: number | string;
}

function toInvoice(r: InvoiceRow): Invoice {
  return { ...r, amount: toNum(r.amount) ?? 0 };
}

/** Suscripción tal como llega de my_subscription (plan anidado) o de admin_list_subscriptions. */
interface SubscriptionJson {
  id: string;
  nutritionist_id: string;
  plan_id: string;
  status: Subscription['status'];
  current_period_end: string | null;
  created_at: string;
  plan?: PlanRow | null;
}

function toSubscription(r: SubscriptionJson): Subscription {
  return {
    id: r.id,
    nutritionist_id: r.nutritionist_id,
    plan_id: r.plan_id,
    status: r.status,
    current_period_end: r.current_period_end,
    created_at: r.created_at,
    plan: r.plan ? toPlan(r.plan) : undefined,
  };
}

/** Fila de admin_list_subscriptions: el plan llega aplanado (plan_name, monthly_price, patient_quota). */
interface AdminSubscriptionRow {
  id: string;
  nutritionist_id: string;
  plan_id: string;
  status: Subscription['status'];
  current_period_end: string | null;
  created_at: string;
  nutritionist_name: string;
  plan_name: string;
  monthly_price: number | string;
  patient_quota: number | string;
}

function toAdminSubscription(r: AdminSubscriptionRow): Subscription {
  return {
    id: r.id,
    nutritionist_id: r.nutritionist_id,
    plan_id: r.plan_id,
    status: r.status,
    current_period_end: r.current_period_end,
    created_at: r.created_at,
    nutritionist_name: r.nutritionist_name,
    // La RPC no devuelve activo ni orden del plan; la vista de admin no los usa.
    plan: {
      id: r.plan_id,
      name: r.plan_name,
      monthly_price: toNum(r.monthly_price) ?? 0,
      patient_quota: toNum(r.patient_quota) ?? 0,
      active: true,
      sort: 0,
    },
  };
}

interface ReviewRow extends Omit<Review, 'stars'> {
  stars: number | string;
}

function toReview(r: ReviewRow): Review {
  return { ...r, stars: toNum(r.stars) ?? 0 };
}

/* ------------------------------------------------------------------ seguimiento */

async function listFollowups(patientId: string): Promise<Followup[]> {
  const rows = unwrap(
    await supabase
      .from('followups')
      .select('*')
      .eq('patient_id', patientId)
      .order('followup_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ) as FollowupRow[];
  return rows.map(toFollowup);
}

async function addFollowup(patientId: string, input: FollowupInput): Promise<Followup> {
  const row = unwrap(
    await supabase
      .from('followups')
      .insert({
        patient_id: patientId,
        followup_date: input.followup_date,
        weight_kg: input.weight_kg,
        waist_cm: input.waist_cm,
        observations: input.observations,
        recommendations: input.recommendations,
      })
      .select()
      .single(),
  ) as FollowupRow;
  return toFollowup(row);
}

/* ------------------------------------------------------------------ calendario del plan */

async function listPlanDays(patientId: string, from: string, to: string): Promise<PlanDay[]> {
  return unwrap(
    await supabase
      .from('plan_days')
      .select('*')
      .eq('patient_id', patientId)
      .gte('day', from)
      .lte('day', to)
      .order('day', { ascending: true }),
  ) as PlanDay[];
}

async function savePlanDay(patientId: string, input: PlanDayInput): Promise<PlanDay> {
  const campos = {
    day: input.day,
    title: input.title,
    meals: input.meals,
    exercise: input.exercise,
    notes: input.notes,
  };
  const res = input.id
    ? await supabase.from('plan_days').update(campos).eq('id', input.id).select().single()
    : await supabase
        .from('plan_days')
        .insert({ ...campos, patient_id: patientId })
        .select()
        .single();
  if (res.error) throw planDayError(res.error);
  return res.data as PlanDay;
}

async function deletePlanDay(id: string): Promise<void> {
  unwrap(await supabase.from('plan_days').delete().eq('id', id));
}

async function copyPlanWeek(patientId: string, fromMonday: string, toMonday: string): Promise<number> {
  const copiados = unwrap(
    await supabase.rpc('copy_plan_week', { p_patient: patientId, p_from: fromMonday, p_to: toMonday }),
  );
  return toNum(copiados) ?? 0;
}

async function setPlanDayDone(id: string, done: boolean, note: string | null): Promise<PlanDay> {
  return unwrap(
    await supabase.rpc('set_plan_day_done', { p_id: id, p_done: done, p_note: note }),
  ) as PlanDay;
}

/* ------------------------------------------------------------------ planes y pagos */

async function listPlans(): Promise<SubscriptionPlan[]> {
  // Las políticas de RLS dejan ver solo los planes activos, salvo al admin (que ve todos).
  const rows = unwrap(
    await supabase
      .from('subscription_plans')
      .select('*')
      .eq('audience', 'nutricionista')
      .order('sort', { ascending: true }),
  ) as PlanRow[];
  return rows.map(toPlan);
}

async function adminSavePlan(input: SubscriptionPlanInput): Promise<SubscriptionPlan> {
  const campos = {
    name: input.name,
    monthly_price: input.monthly_price,
    patient_quota: input.patient_quota,
    active: input.active,
    sort: input.sort,
  };
  const row = unwrap(
    await supabase
      .from('subscription_plans')
      .upsert({ ...(input.id ? { id: input.id } : {}), ...campos })
      .select()
      .single(),
  ) as PlanRow;
  return toPlan(row);
}

async function getMySubscription(): Promise<Subscription | null> {
  const row = unwrap(await supabase.rpc('my_subscription')) as SubscriptionJson | null;
  return row ? toSubscription(row) : null;
}

async function choosePlan(planId: string): Promise<Invoice> {
  const row = unwrap(await supabase.rpc('choose_plan', { p_plan: planId })) as InvoiceRow;
  return toInvoice(row);
}

async function listMyInvoices(): Promise<Invoice[]> {
  const rows = unwrap(await supabase.rpc('my_invoices')) as InvoiceRow[];
  return rows.map(toInvoice);
}

async function createInvoice(input: InvoiceInput): Promise<Invoice> {
  const row = unwrap(
    await supabase.rpc('create_invoice', {
      p_patient: input.patient_id,
      p_concept: input.concept,
      p_amount: input.amount,
    }),
  ) as InvoiceRow;
  return toInvoice(row);
}

async function reportInvoicePaid(id: string, reference: string): Promise<void> {
  unwrap(await supabase.rpc('report_invoice_paid', { p_id: id, p_reference: reference }));
}

async function markInvoicePaid(id: string): Promise<void> {
  unwrap(await supabase.rpc('mark_invoice_paid', { p_id: id }));
}

async function cancelInvoice(id: string): Promise<void> {
  unwrap(await supabase.rpc('cancel_invoice', { p_id: id }));
}

async function adminListInvoices(): Promise<Invoice[]> {
  const rows = unwrap(await supabase.rpc('admin_list_invoices')) as InvoiceRow[];
  return rows.map(toInvoice);
}

async function adminListSubscriptions(): Promise<Subscription[]> {
  const rows = unwrap(await supabase.rpc('admin_list_subscriptions')) as AdminSubscriptionRow[];
  return rows.map(toAdminSubscription);
}

/* ------------------------------------------------------------------ reseñas */

async function listReviews(target: ReviewTarget, targetId: string): Promise<Review[]> {
  const rows = unwrap(
    await supabase.rpc('list_reviews', { p_target_type: target, p_target_id: targetId }),
  ) as ReviewRow[];
  return rows.map(toReview);
}

async function getRating(target: ReviewTarget, targetId: string): Promise<RatingSummary> {
  const r = unwrap(
    await supabase.rpc('rating_summary', { p_target_type: target, p_target_id: targetId }),
  ) as { average: number | string | null; count: number | string | null };
  return { average: toNum(r.average), count: toNum(r.count) ?? 0 };
}

async function saveReview(input: ReviewInput): Promise<Review> {
  // author_id lo pone la base (auth.uid()); el conflicto es por (objetivo, autor).
  const row = unwrap(
    await supabase
      .from('reviews')
      .upsert(
        {
          target_type: input.target_type,
          target_id: input.target_id,
          stars: input.stars,
          comment: input.comment?.trim() || null,
        },
        { onConflict: 'target_type,target_id,author_id' },
      )
      .select()
      .single(),
  ) as ReviewRow;
  return toReview(row);
}

async function deleteMyReview(id: string): Promise<void> {
  unwrap(await supabase.from('reviews').delete().eq('id', id));
}

/* ------------------------------------------------------------------ parte del repo */

export const planPart: Partial<Repo> = {
  listFollowups,
  addFollowup,
  listPlanDays,
  savePlanDay,
  deletePlanDay,
  copyPlanWeek,
  setPlanDayDone,
  listPlans,
  adminSavePlan,
  getMySubscription,
  choosePlan,
  listMyInvoices,
  createInvoice,
  reportInvoicePaid,
  markInvoicePaid,
  cancelInvoice,
  adminListInvoices,
  adminListSubscriptions,
  listReviews,
  getRating,
  saveReview,
  deleteMyReview,
};
