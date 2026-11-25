/** Atención con Supabase: ficha, solicitudes, pacientes, tablero y avisos (dueño: D2). */
import type {
  AppNotification,
  CareOrigin,
  CareRequest,
  Goal,
  NutriDashboard,
  NutriLimits,
  NutritionistPublic,
  PatientDetail,
  PatientIntake,
  PatientIntakeInput,
  PatientSummary,
  Profile,
  Repo,
  RatingSummary,
  Sex,
  Subscription,
} from '../types';
import { AppError } from '../types';
import { downscaleToDataUrl } from '../../lib/image';
import { supabase } from './client';
import { toAppError, unwrap } from './errors';

const BUCKET = 'body-photos';
const SIGNED_URL_SECONDS = 600;
const SIN_SESION = 'Inicia sesión para continuar.';
const FOTO_SIN_CONSENTIMIENTO = 'Necesitamos tu permiso para guardar la foto.';

/* ------------------------------------------------------------------ utilidades */

/** numeric/int de Postgres puede llegar como texto: lo convierte a number (o null si está vacío). */
function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Id del usuario con sesión o SIN_SESION. */
async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw toAppError(error);
  const id = data.session?.user.id;
  if (!id) throw new AppError('SIN_SESION', SIN_SESION);
  return id;
}

/** Convierte un data URL (base64) en Blob para subirlo al bucket. */
function dataUrlToBlob(dataUrl: string): Blob {
  const coma = dataUrl.indexOf(',');
  const type = /^data:([^;,]+)/.exec(dataUrl)?.[1] ?? 'image/jpeg';
  const binario = atob(dataUrl.slice(coma + 1));
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** Fila de patient_intakes tal como llega de PostgREST. */
interface IntakeRow extends Omit<PatientIntake, 'weight_kg' | 'height_cm' | 'waist_cm'> {
  weight_kg: number | string;
  height_cm: number | string;
  waist_cm: number | string | null;
}

function toIntake(r: IntakeRow): PatientIntake {
  return {
    ...r,
    weight_kg: Number(r.weight_kg),
    height_cm: Number(r.height_cm),
    waist_cm: toNum(r.waist_cm),
    allergies: r.allergies ?? null,
    conditions: r.conditions ?? [],
  };
}

/** Fila de care_requests (o de sus RPC) con campos opcionales de cada vista. */
interface CareRow {
  id: string;
  patient_id?: string;
  nutritionist_id?: string | null;
  status: CareRequest['status'];
  message: string | null;
  created_at: string;
  accepted_at?: string | null;
  closed_at?: string | null;
  patient_name?: string;
  patient_age?: number | string | null;
  patient_sex?: Sex | null;
  patient_goal?: Goal | null;
  nutritionist_name?: string | null;
  origin?: CareOrigin | null;
}

/** Límites de la nutricionista (nutri_limits y nutri_dashboard.limits). */
export interface NutriLimitsRow {
  plan_name: string | null;
  patient_quota: number | string;
  daily_record_limit: number | string | null;
  patients_used: number | string;
  records_today: number | string;
}

export function toNutriLimits(r: NutriLimitsRow): NutriLimits {
  return {
    plan_name: r.plan_name ?? null,
    patient_quota: toNum(r.patient_quota) ?? 0,
    daily_record_limit: toNum(r.daily_record_limit),
    patients_used: toNum(r.patients_used) ?? 0,
    records_today: toNum(r.records_today) ?? 0,
  };
}

function toCareRequest(r: CareRow, patientId: string): CareRequest {
  return {
    id: r.id,
    patient_id: r.patient_id ?? patientId,
    nutritionist_id: r.nutritionist_id ?? null,
    status: r.status,
    message: r.message,
    created_at: r.created_at,
    accepted_at: r.accepted_at ?? null,
    closed_at: r.closed_at ?? null,
    origin: r.origin ?? 'plataforma',
    patient_name: r.patient_name,
    patient_age: r.patient_age === undefined ? undefined : toNum(r.patient_age),
    patient_sex: r.patient_sex,
    patient_goal: r.patient_goal,
    nutritionist_name: r.nutritionist_name,
  };
}

/** URL firmada temporal de una foto del bucket privado. */
async function signedPhotoUrl(path: string): Promise<string> {
  const data = unwrap(await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS));
  return data.signedUrl;
}

/** photo_path guardado de la ficha de un usuario (null si no hay ficha o foto). */
async function savedPhotoPath(userId: string): Promise<string | null> {
  const row = unwrap(
    await supabase.from('patient_intakes').select('photo_path').eq('user_id', userId).maybeSingle(),
  ) as { photo_path: string | null } | null;
  return row?.photo_path ?? null;
}

/* ------------------------------------------------------------------ ficha */

async function getMyIntake(): Promise<PatientIntake | null> {
  const uid = await currentUserId();
  const row = unwrap(
    await supabase.from('patient_intakes').select('*').eq('user_id', uid).maybeSingle(),
  ) as IntakeRow | null;
  return row ? toIntake(row) : null;
}

async function saveMyIntake(input: PatientIntakeInput): Promise<PatientIntake> {
  const uid = await currentUserId();
  const anterior = await savedPhotoPath(uid);

  // Foto final: la nueva, ninguna si se pidió borrar, o la guardada si no cambia.
  const nueva = input.photo !== null;
  const finalPath = input.remove_photo && !nueva ? null : anterior;
  if ((nueva || finalPath) && !input.consent_photo) {
    throw new AppError('FOTO_SIN_CONSENTIMIENTO', FOTO_SIN_CONSENTIMIENTO);
  }

  // Reducir la foto antes de escribir nada: si falla, no se toca la ficha.
  let blob: Blob | null = null;
  if (nueva && input.photo) {
    blob = dataUrlToBlob(await downscaleToDataUrl(input.photo));
  }

  unwrap(
    await supabase
      .from('profiles')
      .update({ full_name: input.full_name, birth_date: input.birth_date, sex: input.sex })
      .eq('id', uid),
  );

  let photoPath = finalPath;
  if (blob) {
    photoPath = `${uid}/ficha-${Date.now()}.jpg`;
    unwrap(await supabase.storage.from(BUCKET).upload(photoPath, blob, { contentType: blob.type, upsert: false }));
  }

  let row: IntakeRow;
  try {
    row = unwrap(
      await supabase
        .from('patient_intakes')
        .upsert(
          {
            user_id: uid,
            weight_kg: input.weight_kg,
            height_cm: input.height_cm,
            waist_cm: input.waist_cm,
            goal: input.goal,
            activity_level: input.activity_level,
            health_notes: input.health_notes,
            photo_path: photoPath,
            consent_photo: input.consent_photo,
            // Semana gratis: solo se cambian si la pantalla los manda.
            ...(input.allergies !== undefined ? { allergies: input.allergies } : {}),
            ...(input.conditions !== undefined ? { conditions: input.conditions } : {}),
          },
          { onConflict: 'user_id' },
        )
        .select('*')
        .single(),
    ) as IntakeRow;
  } catch (e) {
    // La ficha no se guardó: quita la foto recién subida para no dejar basura.
    if (blob && photoPath) await supabase.storage.from(BUCKET).remove([photoPath]);
    throw e;
  }

  // Foto reemplazada o borrada: quita la anterior (si falla, la ficha ya está bien guardada).
  if (anterior && anterior !== photoPath) {
    await supabase.storage.from(BUCKET).remove([anterior]);
  }

  return toIntake(row);
}

async function getIntakePhotoUrl(userId: string): Promise<string | null> {
  const path = await savedPhotoPath(userId);
  return path ? signedPhotoUrl(path) : null;
}

/* ------------------------------------------------------------------ solicitudes (paciente) */

interface MyCareRequestJson extends CareRow {
  nutritionist_id: string | null;
  nutritionist_name: string | null;
}

async function getMyCareRequest(): Promise<CareRequest | null> {
  const row = unwrap(await supabase.rpc('my_care_request')) as MyCareRequestJson | null;
  if (!row) return null;
  return toCareRequest(row, await currentUserId());
}

async function requestCare(message: string | null): Promise<CareRequest> {
  const row = unwrap(await supabase.rpc('request_care', { p_message: message })) as CareRow;
  return toCareRequest(row, await currentUserId());
}

async function cancelMyCareRequest(id: string): Promise<void> {
  unwrap(await supabase.rpc('cancel_care_request', { p_id: id }));
}

interface NutritionistJson { id: string; full_name: string }

async function getMyNutritionist(): Promise<NutritionistPublic | null> {
  const nutri = unwrap(await supabase.rpc('my_nutritionist')) as NutritionistJson | null;
  if (!nutri) return null;
  const resumen = unwrap(
    await supabase.rpc('rating_summary', { p_target_type: 'nutricionista', p_target_id: nutri.id }),
  ) as { average: number | string | null; count: number | string } | null;
  const rating: RatingSummary = {
    average: toNum(resumen?.average),
    count: toNum(resumen?.count) ?? 0,
  };
  return { id: nutri.id, full_name: nutri.full_name, rating };
}

/* ------------------------------------------------------------------ solicitudes (nutricionista) */

interface OpenRow extends CareRow {
  patient_id: string;
  patient_name: string;
  patient_age: number | string | null;
  patient_sex: Sex | null;
  patient_goal: Goal | null;
}

async function listOpenCareRequests(): Promise<CareRequest[]> {
  const rows = unwrap(await supabase.rpc('list_open_care_requests')) as OpenRow[];
  return rows.map((r) => toCareRequest(r, r.patient_id));
}

async function acceptCareRequest(id: string): Promise<void> {
  unwrap(await supabase.rpc('accept_care_request', { p_id: id }));
}

async function finishCareRequest(id: string): Promise<void> {
  unwrap(await supabase.rpc('finish_care_request', { p_id: id }));
}

interface PatientRow {
  patient_id: string;
  full_name: string;
  age: number | string | null;
  sex: Sex | null;
  request_id: string;
  accepted_at: string;
  days_total: number | string;
  days_done: number | string;
  last_followup_date: string | null;
  origin: CareOrigin | null;
  recipes_left: number | string | null;
}

async function listMyPatients(): Promise<PatientSummary[]> {
  const rows = unwrap(await supabase.rpc('list_my_patients')) as PatientRow[];
  return rows.map((r) => ({
    patient_id: r.patient_id,
    full_name: r.full_name,
    age: toNum(r.age),
    sex: r.sex,
    request_id: r.request_id,
    accepted_at: r.accepted_at,
    days_total: toNum(r.days_total) ?? 0,
    days_done: toNum(r.days_done) ?? 0,
    last_followup_date: r.last_followup_date,
    origin: r.origin ?? 'plataforma',
    recipes_left: toNum(r.recipes_left),
  }));
}

/** Paciente con su ficha, foto firmada y solicitud aceptada. null si no hay solicitud aceptada. */
async function getPatientDetail(patientId: string): Promise<PatientDetail | null> {
  const request = unwrap(
    await supabase
      .from('care_requests')
      .select('*')
      .eq('patient_id', patientId)
      .eq('status', 'aceptada')
      .maybeSingle(),
  ) as CareRow | null;
  if (!request) return null;

  const profile = unwrap(
    await supabase.from('profiles').select('*').eq('id', patientId).maybeSingle(),
  ) as Profile | null;
  if (!profile) return null;

  const intakeRow = unwrap(
    await supabase.from('patient_intakes').select('*').eq('user_id', patientId).maybeSingle(),
  ) as IntakeRow | null;
  const intake = intakeRow ? toIntake(intakeRow) : null;

  return {
    profile,
    intake,
    photo_url: intake?.photo_path ? await signedPhotoUrl(intake.photo_path) : null,
    request: toCareRequest(request, patientId),
  };
}

async function getNutriDashboard(): Promise<NutriDashboard> {
  const d = unwrap(await supabase.rpc('nutri_dashboard')) as Record<string, unknown>;
  return {
    open_requests: toNum(d.open_requests) ?? 0,
    my_patients: toNum(d.my_patients) ?? 0,
    week_days_total: toNum(d.week_days_total) ?? 0,
    week_days_done: toNum(d.week_days_done) ?? 0,
    pending_invoices: toNum(d.pending_invoices) ?? 0,
    subscription: (d.subscription ?? null) as Subscription | null,
    limits: toNutriLimits(d.limits as NutriLimitsRow),
    recipes_week: toNum(d.recipes_week) ?? 0,
  };
}

/* ------------------------------------------------------------------ avisos */

async function listNotifications(): Promise<AppNotification[]> {
  return unwrap(
    await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50),
  ) as AppNotification[];
}

async function countUnreadNotifications(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw toAppError(error);
  return count ?? 0;
}

async function markNotificationRead(id: string): Promise<void> {
  unwrap(await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id));
}

async function markAllNotificationsRead(): Promise<void> {
  unwrap(await supabase.rpc('mark_all_notifications_read'));
}

/* ------------------------------------------------------------------ parte del repo */

export const carePart: Partial<Repo> = {
  getMyIntake,
  saveMyIntake,
  getIntakePhotoUrl,
  getMyCareRequest,
  requestCare,
  cancelMyCareRequest,
  getMyNutritionist,
  listOpenCareRequests,
  acceptCareRequest,
  finishCareRequest,
  listMyPatients,
  getPatientDetail,
  getNutriDashboard,
  listNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
