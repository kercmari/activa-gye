/**
 * CONTRATO DE DATOS de Activa GYE.
 * Las formas copian las tablas de supabase/migrations/20261121000001_esquema_inicial.sql.
 * Datos reales: Supabase (src/data/supabase). Pruebas / sin base: simulador (src/data/mock).
 * Dueño: orquestador. Plan: docs/superpowers/plans/2026-11-21-activa-gye-backend-fases.md
 * Diseño de fases: docs/superpowers/specs/2026-11-21-activa-gye-fases-backend-design.md
 */

export type Role = 'usuario' | 'nutricionista' | 'admin';
export type Goal = 'bajar_peso' | 'ganar_musculo' | 'mantener' | 'resistencia' | 'bienestar';
export type ActivityLevel = 'sedentario' | 'ligero' | 'moderado' | 'intenso';
export type Sex = 'femenino' | 'masculino' | 'otro' | 'prefiero_no_decir';
export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
/** Horario por día: lista de franjas [abre, cierra] en "HH:MM". Día sin franjas = cerrado. */
export type Hours = Record<DayKey, [string, string][]>;

export type ServiceId =
  | 'duchas' | 'parqueo' | 'entrenador' | 'casilleros' | 'clases_grupales' | 'piscina' | 'wifi' | 'cafeteria';

export interface Sector { id: string; name: string; sort: number }
export interface Sport { id: string; name: string; icon: string; image_url: string | null; sort: number }

export interface Place {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  sector_id: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  instagram: string | null;
  photo_url: string | null;
  gallery: string[];
  /** USD. null = "Consultar precio". 0 = gratis. */
  price_from: number | null;
  price_note: string | null;
  promotions: string | null;
  services: ServiceId[];
  /** null = "Horario por confirmar". */
  hours: Hours | null;
  source: 'osm' | 'admin';
  osm_id: string | null;
  published: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  /** Deportes que ofrece (tabla place_sports). */
  sport_ids: string[];
}

/** Lo que el admin crea o edita. Sin id = lugar nuevo. */
export type PlaceInput = Omit<Place, 'id' | 'created_at' | 'updated_at' | 'source' | 'osm_id'> & { id?: string };

export type PriceRange = 'gratis' | 'hasta20' | '20a40' | 'mas40';
/** mañana 05–12, tarde 12–18, noche 18–23 */
export type ScheduleRange = 'manana' | 'tarde' | 'noche';

export interface PlaceFilters {
  name?: string;
  sector?: string;
  sport?: string;
  price?: PriceRange;
  schedule?: ScheduleRange;
  services?: ServiceId[];
}

export interface Profile {
  id: string;
  full_name: string;
  birth_date: string | null; // 'AAAA-MM-DD'
  sex: Sex | null;
  phone: string | null;
  sector_id: string | null;
  goal: Goal | null;
  activity_level: ActivityLevel | null;
  role: Role;
  created_at: string;
  updated_at: string;
}
export type ProfilePatch = Partial<Pick<Profile, 'full_name' | 'birth_date' | 'sex' | 'phone' | 'sector_id' | 'goal' | 'activity_level'>>;

export interface Session { user: { id: string; email: string }; profile: Profile }

export interface SignUpInput { email: string; password: string; full_name: string; birth_date: string }

export interface ProgressEntry {
  id: string;
  user_id: string;
  entry_date: string; // 'AAAA-MM-DD'
  weight_kg: number | null;
  active_minutes: number | null;
  activity: string | null;
  note: string | null;
  created_at: string;
}
export type ProgressInput = Pick<ProgressEntry, 'entry_date' | 'weight_kg' | 'active_minutes' | 'activity' | 'note'>;

/** Estimación básica (cálculo Mifflin-St Jeor, sin IA). Orientativa: no reemplaza al nutricionista. */
export interface NutritionGuide {
  summary: string;
  bmi: number;            // 1 decimal
  bmi_label: string;      // 'Bajo peso' | 'Peso saludable' | 'Sobrepeso' | 'Obesidad'
  daily_kcal: number;     // entero, nunca < 1200 (mujer) / 1500 (hombre y otros)
  macros: { protein_g: number; carbs_g: number; fat_g: number };
  recommendations: string[];
  sample_day: { meal: string; items: string[] }[]; // Desayuno, Media mañana, Almuerzo, Media tarde, Merienda
  hydration: string;
  activity: { sport_id: string; reason: string; per_week: string }[];
  warnings: string[];
  disclaimer: string;
}

/* ------------------------------------------------------------------ FASES (app_settings) */

/** Fases encendidas y cupo de pacientes. `patients_count` = pacientes (rol usuario) registrados. */
export interface AppSettings {
  phase1: boolean;
  phase2: boolean;
  phase3: boolean;
  /** Cupo de pacientes mientras phase3 está apagada. */
  patient_limit: number;
  patients_count: number;
}
export type AppSettingsInput = Pick<AppSettings, 'phase1' | 'phase2' | 'phase3' | 'patient_limit'>;

/* ------------------------------------------------------------------ FASE 1: ficha inicial (patient_intakes) */

export interface PatientIntake {
  user_id: string;
  weight_kg: number;
  height_cm: number;
  waist_cm: number | null;
  goal: Goal | null;
  activity_level: ActivityLevel | null;
  health_notes: string | null;
  /** Ruta en el bucket privado body-photos: '<user_id>/<archivo>'. */
  photo_path: string | null;
  consent_photo: boolean;
  consent_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Formulario «Mi ficha». Guarda también nombre, fecha de nacimiento y género en el perfil. */
export interface PatientIntakeInput {
  full_name: string;
  birth_date: string; // 'AAAA-MM-DD'
  sex: Sex;
  weight_kg: number;   // 25–350
  height_cm: number;   // 100–250
  waist_cm: number | null; // 40–250
  goal: Goal | null;
  activity_level: ActivityLevel | null;
  health_notes: string | null; // ≤ 1000
  /** Foto nueva de cuerpo entero (jpg/png/webp ≤ 5 MB). null = no cambia. */
  photo: File | null;
  /** true = borrar la foto guardada. */
  remove_photo: boolean;
  /** Obligatorio si hay foto (nueva o guardada). Solo mayores de 18. */
  consent_photo: boolean;
}

/* ------------------------------------------------------------------ FASE 2: intermediación (care_requests) */

export type CareStatus = 'abierta' | 'aceptada' | 'finalizada' | 'cancelada';

export interface CareRequest {
  id: string;
  patient_id: string;
  nutritionist_id: string | null;
  status: CareStatus;
  message: string | null;
  created_at: string;
  accepted_at: string | null;
  closed_at: string | null;
  /** Solo en listas para nutricionista/admin. */
  patient_name?: string;
  patient_age?: number | null;
  patient_sex?: Sex | null;
  patient_goal?: Goal | null;
  /** Solo para el paciente. */
  nutritionist_name?: string | null;
}

export interface PatientSummary {
  patient_id: string;
  full_name: string;
  age: number | null;
  sex: Sex | null;
  request_id: string;
  accepted_at: string;
  days_total: number;
  days_done: number;
  last_followup_date: string | null;
}

export interface PatientDetail {
  profile: Profile;
  intake: PatientIntake | null;
  /** URL firmada temporal de la foto (o null). */
  photo_url: string | null;
  request: CareRequest;
}

export interface NutriDashboard {
  open_requests: number;
  my_patients: number;
  week_days_total: number;
  week_days_done: number;
  pending_invoices: number;
  subscription: Subscription | null;
}

export interface Followup {
  id: string;
  patient_id: string;
  nutritionist_id: string;
  followup_date: string; // 'AAAA-MM-DD'
  weight_kg: number | null;
  waist_cm: number | null;
  observations: string;
  recommendations: string;
  created_at: string;
}
export type FollowupInput = Pick<Followup, 'followup_date' | 'weight_kg' | 'waist_cm' | 'observations' | 'recommendations'>;

/** Un día del calendario del plan. El paciente solo cambia done_at y patient_note. */
export interface PlanDay {
  id: string;
  patient_id: string;
  nutritionist_id: string;
  day: string; // 'AAAA-MM-DD' (único por paciente)
  title: string;
  meals: string | null;
  exercise: string | null;
  notes: string | null;
  done_at: string | null;
  patient_note: string | null;
  created_at: string;
  updated_at: string;
}
export type PlanDayInput = Pick<PlanDay, 'day' | 'title' | 'meals' | 'exercise' | 'notes'> & { id?: string };

export interface AppNotification {
  id: string;
  user_id: string;
  /** p. ej. 'solicitud_nueva', 'solicitud_aceptada', 'dia_nuevo', 'dia_cumplido', 'factura_nueva', 'factura_reportada', 'factura_pagada' */
  kind: string;
  title: string;
  body: string | null;
  /** Ruta interna, p. ej. '/mi-panel?tab=calendario'. */
  link: string | null;
  read_at: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ FASE 2: pagos (manuales) */

export interface SubscriptionPlan {
  id: string;
  name: string;
  monthly_price: number; // USD
  patient_quota: number;
  active: boolean;
  sort: number;
}
export type SubscriptionPlanInput = Omit<SubscriptionPlan, 'id'> & { id?: string };

export type SubscriptionStatus = 'pendiente' | 'activa' | 'vencida' | 'cancelada';
export interface Subscription {
  id: string;
  nutritionist_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  current_period_end: string | null;
  created_at: string;
  plan?: SubscriptionPlan;
  nutritionist_name?: string;
}

export type InvoiceStatus = 'pendiente' | 'reportada' | 'pagada' | 'anulada';
export interface Invoice {
  id: string;
  payer_id: string;
  /** null = la plataforma (suscripciones). */
  payee_id: string | null;
  kind: 'suscripcion' | 'consulta';
  subscription_id: string | null;
  concept: string;
  amount: number; // USD
  status: InvoiceStatus;
  payment_reference: string | null;
  reported_at: string | null;
  paid_at: string | null;
  created_at: string;
  payer_name?: string;
  payee_name?: string | null;
}
/** Factura de consulta que el nutricionista crea a su paciente. */
export interface InvoiceInput { patient_id: string; concept: string; amount: number }

/* ------------------------------------------------------------------ FASE 3: reseñas */

export type ReviewTarget = 'nutricionista' | 'lugar';
export interface Review {
  id: string;
  target_type: ReviewTarget;
  target_id: string;
  author_id: string;
  stars: number; // 1–5
  comment: string | null;
  created_at: string;
  author_name?: string;
}
export type ReviewInput = Pick<Review, 'target_type' | 'target_id' | 'stars' | 'comment'>;
export interface RatingSummary { average: number | null; count: number }
export interface NutritionistPublic { id: string; full_name: string; rating: RatingSummary }

export interface ContactInput { name: string; email: string; subject: string; message: string }
export interface ContactMessage extends ContactInput { id: string; read: boolean; created_at: string }

export interface AdminUser { id: string; email: string; full_name: string; role: Role; created_at: string }

/** Error con código fijo y mensaje en español listo para mostrar. */
export class AppError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'AppError';
  }
}

/**
 * Todo lo que las pantallas pueden pedir. Las pantallas SOLO usan `repo` (src/data/index.ts), nunca otra cosa.
 * Errores: siempre AppError con mensaje en español. Códigos usados:
 * SIN_SESION, CREDENCIALES, CORREO_EN_USO, MENOR_DE_16, SOLO_ADMIN, SOLO_NUTRICIONISTA, NO_EXISTE,
 * YA_TOMADA, FOTO_SIN_CONSENTIMIENTO, FOTO_MENOR_18, FOTO_INVALIDA, DEMASIADOS_MENSAJES, DATOS_INVALIDOS,
 * NO_PUEDES_CAMBIAR_TU_ROL,
 * CUPO_LLENO (registro con cupo de pacientes lleno), FASE_NO_ACTIVA (la fase está apagada),
 * FALTA_FICHA (pedir nutricionista sin ficha), YA_TIENES_SOLICITUD, SIN_SUSCRIPCION (nutricionista sin suscripción activa),
 * CUPO_PLAN_LLENO (nutricionista sin cupo en su plan), YA_TIENES_SUSCRIPCION, NO_ES_TU_PACIENTE, NO_PERMITIDO,
 * SIN_BASE (función que necesita Supabase).
 */
export interface Repo {
  // Catálogo (público)
  listSectors(): Promise<Sector[]>;
  listSports(): Promise<Sport[]>;
  /** Solo publicados, ordenados por nombre. */
  searchPlaces(filters: PlaceFilters): Promise<Place[]>;
  /** Publicado (o cualquiera si quien pide es admin). null si no existe. */
  getPlace(id: string): Promise<Place | null>;
  getPlaces(ids: string[]): Promise<Place[]>;

  // Cuenta
  getSession(): Promise<Session | null>;
  /** Avisa cuando la sesión cambia (entrar, salir, editar perfil). Devuelve la función para dejar de escuchar. */
  onAuthChange(cb: (session: Session | null) => void): () => void;
  signUp(input: SignUpInput): Promise<Session>;
  signIn(email: string, password: string): Promise<Session>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updateProfile(patch: ProfilePatch): Promise<Profile>;
  deleteMyAccount(): Promise<void>;

  // Favoritos (con sesión)
  listFavorites(): Promise<Place[]>;
  isFavorite(placeId: string): Promise<boolean>;
  /** Devuelve el nuevo estado (true = ahora es favorito). */
  toggleFavorite(placeId: string): Promise<boolean>;

  // Progreso (con sesión)
  listProgress(): Promise<ProgressEntry[]>; // fecha ascendente
  addProgress(input: ProgressInput): Promise<ProgressEntry>;
  deleteProgress(id: string): Promise<void>;

  // Contacto (público)
  sendContact(input: ContactInput): Promise<void>;

  // Admin
  adminListPlaces(search?: string): Promise<Place[]>; // incluye no publicados
  adminSavePlace(input: PlaceInput): Promise<Place>;
  adminSetPublished(id: string, published: boolean): Promise<void>;
  adminListMessages(): Promise<ContactMessage[]>;
  adminMarkMessageRead(id: string, read: boolean): Promise<void>;
  adminListUsers(search?: string): Promise<AdminUser[]>;
  adminSetRole(userId: string, role: Role): Promise<void>;

  // ---------------------------------------------------------------- Fases
  /** Público (sin sesión). En el simulador: fase 1 encendida, 2 y 3 apagadas. */
  getSettings(): Promise<AppSettings>;
  adminSaveSettings(input: AppSettingsInput): Promise<AppSettings>;

  // ---------------------------------------------------------------- Fase 1: ficha
  getMyIntake(): Promise<PatientIntake | null>;
  saveMyIntake(input: PatientIntakeInput): Promise<PatientIntake>;
  /** URL temporal de la foto de la ficha de `userId` (dueño, su nutricionista o admin). */
  getIntakePhotoUrl(userId: string): Promise<string | null>;

  // ---------------------------------------------------------------- Fase 2: solicitudes (paciente)
  /** La solicitud abierta o aceptada del paciente (o null). */
  getMyCareRequest(): Promise<CareRequest | null>;
  requestCare(message: string | null): Promise<CareRequest>;
  cancelMyCareRequest(id: string): Promise<void>;
  getMyNutritionist(): Promise<NutritionistPublic | null>;

  // ---------------------------------------------------------------- Fase 2: nutricionista
  listOpenCareRequests(): Promise<CareRequest[]>; // más antigua primero
  acceptCareRequest(id: string): Promise<void>;
  finishCareRequest(id: string): Promise<void>;
  listMyPatients(): Promise<PatientSummary[]>;
  getPatientDetail(patientId: string): Promise<PatientDetail | null>;
  getNutriDashboard(): Promise<NutriDashboard>;

  // ---------------------------------------------------------------- Fase 2: avisos
  listNotifications(): Promise<AppNotification[]>; // más nueva primero, máx. 50
  countUnreadNotifications(): Promise<number>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;

  // ---------------------------------------------------------------- Fase 2: seguimiento y calendario
  /** patientId = el paciente (para el paciente, su propio id). */
  listFollowups(patientId: string): Promise<Followup[]>; // más nuevo primero
  addFollowup(patientId: string, input: FollowupInput): Promise<Followup>;
  /** Días entre from y to (incluidos, 'AAAA-MM-DD'), orden por fecha. */
  listPlanDays(patientId: string, from: string, to: string): Promise<PlanDay[]>;
  savePlanDay(patientId: string, input: PlanDayInput): Promise<PlanDay>;
  deletePlanDay(id: string): Promise<void>;
  /** Copia los días de la semana que empieza en fromMonday a la que empieza en toMonday. Devuelve cuántos copió. */
  copyPlanWeek(patientId: string, fromMonday: string, toMonday: string): Promise<number>;
  /** Paciente: marcar/desmarcar cumplido, con nota opcional. */
  setPlanDayDone(id: string, done: boolean, note: string | null): Promise<PlanDay>;

  // ---------------------------------------------------------------- Fase 2: pagos manuales
  listPlans(): Promise<SubscriptionPlan[]>; // activos, por sort (admin: todos)
  adminSavePlan(input: SubscriptionPlanInput): Promise<SubscriptionPlan>;
  getMySubscription(): Promise<Subscription | null>;
  /** Nutricionista elige plan: crea suscripción 'pendiente' + factura a la plataforma. */
  choosePlan(planId: string): Promise<Invoice>;
  /** Facturas donde soy quien paga o quien cobra. Más nueva primero. */
  listMyInvoices(): Promise<Invoice[]>;
  createInvoice(input: InvoiceInput): Promise<Invoice>;
  /** Quien paga informa la transferencia (referencia ≥ 4 caracteres) → 'reportada'. */
  reportInvoicePaid(id: string, reference: string): Promise<void>;
  /** Quien cobra o admin → 'pagada'. Si es de suscripción, la activa 30 días. */
  markInvoicePaid(id: string): Promise<void>;
  cancelInvoice(id: string): Promise<void>;
  adminListInvoices(): Promise<Invoice[]>;
  adminListSubscriptions(): Promise<Subscription[]>;

  // ---------------------------------------------------------------- Fase 3
  listReviews(target: ReviewTarget, targetId: string): Promise<Review[]>;
  getRating(target: ReviewTarget, targetId: string): Promise<RatingSummary>;
  /** Una reseña por autor y objetivo (si existe, se actualiza). */
  saveReview(input: ReviewInput): Promise<Review>;
  deleteMyReview(id: string): Promise<void>;
  /** Admin: lugares sin precio o sin horario. */
  adminListIncompletePlaces(): Promise<Place[]>;
}
