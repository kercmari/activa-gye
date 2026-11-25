/**
 * Recetas, saldo, agregar pacientes, límites y suscripciones por correo con Supabase (ronda 7).
 * Diseño: docs/superpowers/specs/2026-11-24-recetas-planes-suscripcion.md
 * Contrato de BD: docs/superpowers/plans/2026-11-24-recetas-planes-suscripcion.md (migraciones 12 y 13).
 * Los nombres de RPC y tablas van tal cual; las filas llegan en snake_case y se mapean sin renombrar.
 */
import type {
  AdminSubscriptionRow,
  AdminSubscriptionsOverview,
  AppSettings,
  ContactSettingsInput,
  NutriAddPatientResult,
  NutriLimits,
  Prescription,
  PrescriptionInput,
  RecipeBalance,
  Repo,
} from '../types';
import { supabase } from './client';
import { unwrap } from './errors';
import { getSettings } from './account';
import { toNutriLimits, type NutriLimitsRow } from './care';

/* ------------------------------------------------------------------ utilidades */

/** numeric/int de Postgres puede llegar como texto: lo convierte a number (o null si está vacío). */
function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ------------------------------------------------------------------ recetas */

async function listPrescriptions(patientId: string): Promise<Prescription[]> {
  return unwrap(
    await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false }),
  ) as Prescription[];
}

/** Paciente: la política de lectura ya deja solo sus recetas entregadas. */
async function listMyPrescriptions(): Promise<Prescription[]> {
  return unwrap(
    await supabase.from('prescriptions').select('*').order('created_at', { ascending: false }),
  ) as Prescription[];
}

async function savePrescription(input: PrescriptionInput): Promise<Prescription> {
  return unwrap(
    await supabase.rpc('save_prescription', {
      p_id: input.id ?? null,
      p_patient: input.patient_id,
      p_kind: input.kind,
      p_title: input.title,
      p_body: input.body,
    }),
  ) as Prescription;
}

async function deletePrescription(id: string): Promise<void> {
  unwrap(await supabase.rpc('delete_prescription', { p_id: id }));
}

async function deliverPrescription(id: string): Promise<Prescription> {
  return unwrap(await supabase.rpc('deliver_prescription', { p_id: id })) as Prescription;
}

/* ------------------------------------------------------------------ saldo */

interface BalanceRow {
  left: number | string | null;
  quota: number | string | null;
  period_end: string | null;
}

async function getRecipeBalance(patientId?: string): Promise<RecipeBalance> {
  // Sin patientId la función usa su valor por defecto (auth.uid()): no se pasa p_patient.
  const args = patientId ? { p_patient: patientId } : {};
  const row = unwrap(await supabase.rpc('patient_recipe_balance', args)) as BalanceRow;
  return {
    left: toNum(row.left) ?? 0,
    quota: toNum(row.quota) ?? 0,
    period_end: row.period_end ?? null,
  };
}

/* ------------------------------------------------------------------ pacientes y límites */

async function nutriAddPatient(email: string): Promise<NutriAddPatientResult> {
  const row = unwrap(await supabase.rpc('nutri_add_patient', { p_email: email })) as NutriAddPatientResult;
  return { patient_id: row.patient_id, prescription_id: row.prescription_id };
}

async function getNutriLimits(): Promise<NutriLimits> {
  return toNutriLimits(unwrap(await supabase.rpc('nutri_limits')) as NutriLimitsRow);
}

/* ------------------------------------------------------------------ suscripciones (admin) */

interface AdminSubscriptionJson extends Omit<AdminSubscriptionRow, 'amount' | 'recipes_left'> {
  amount: number | string;
  recipes_left: number | string | null;
}

function toAdminRow(r: AdminSubscriptionJson): AdminSubscriptionRow {
  return { ...r, amount: toNum(r.amount) ?? 0, recipes_left: toNum(r.recipes_left) };
}

async function adminSubscriptionsOverview(): Promise<AdminSubscriptionsOverview> {
  const d = unwrap(await supabase.rpc('admin_subscriptions_overview')) as {
    pending: AdminSubscriptionJson[] | null;
    active: AdminSubscriptionJson[] | null;
  };
  return {
    pending: (d.pending ?? []).map(toAdminRow),
    active: (d.active ?? []).map(toAdminRow),
  };
}

/** Correo de la administradora y cupos del plan gratis. Devuelve los ajustes ya guardados. */
async function adminSaveContactSettings(input: ContactSettingsInput): Promise<AppSettings> {
  unwrap(
    await supabase.rpc('admin_set_contact_settings', {
      p_admin_email: input.admin_email,
      p_free_patient_limit: input.free_patient_limit,
      p_free_daily_record_limit: input.free_daily_record_limit,
    }),
  );
  return getSettings();
}

/** Parte de Supabase de este módulo. Se une en src/data/supabase/index.ts. */
export const recetasPart: Partial<Repo> = {
  listPrescriptions,
  listMyPrescriptions,
  savePrescription,
  deletePrescription,
  deliverPrescription,
  getRecipeBalance,
  nutriAddPatient,
  getNutriLimits,
  adminSubscriptionsOverview,
  adminSaveContactSettings,
};
