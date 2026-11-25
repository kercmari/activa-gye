/**
 * CONTRATO DE DATOS de VITGO.
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
  /** Ruta en el bucket privado `avatars` ('<user_id>/avatar.jpg'). */
  avatar_path?: string | null;
  /** Solicitud de rol pendiente: solo 'nutricionista' (lo pone el registro, no la página). */
  requested_role?: 'nutricionista' | null;
  nutri_status?: NutriStatus | null;
}
/** Estado de la solicitud de nutricionista (la aprueba el admin). */
export type NutriStatus = 'pendiente' | 'aprobado' | 'rechazado';
/** Tipo de cuenta que elige quien se registra. */
export type AccountType = 'paciente' | 'nutricionista';
export type ProfilePatch = Partial<Pick<Profile, 'full_name' | 'birth_date' | 'sex' | 'phone' | 'sector_id' | 'goal' | 'activity_level'>>;

export interface Session { user: { id: string; email: string }; profile: Profile }

export interface SignUpInput {
  email: string;
  password: string;
  full_name: string;
  birth_date: string;
  account_type: AccountType;
  /** Foto obligatoria: sin ella responde FOTO_REQUERIDA y no crea la cuenta. */
  photo?: File;
}

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
  /** Correo de la administradora: lo usa el botón «Contactar por correo» (mailto:). */
  admin_email: string;
  /** Cupo de pacientes de una nutricionista sin suscripción activa. */
  free_patient_limit: number;
  /** Registros por día de una nutricionista sin suscripción activa. */
  free_daily_record_limit: number;
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
  /** Semana gratis: alergias o comidas que no come (≤ 300). */
  allergies?: string | null;
  /** Semana gratis: si no está vacío, no hay plan automático (REQUIERE_NUTRICIONISTA). */
  conditions?: HealthCondition[];
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
  /** Semana gratis (opcional: si no viene, no cambia). */
  allergies?: string | null;
  conditions?: HealthCondition[];
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
  /** plataforma = llegó pidiendo atención; propio = la nutricionista lo agregó. */
  origin: CareOrigin;
}

/** Origen de la atención: `propio` no descuenta recetas ni exige suscripción del paciente. */
export type CareOrigin = 'plataforma' | 'propio';

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
  origin: CareOrigin;
  /** Recetas que le quedan (solo pacientes de plataforma); null en los propios. */
  recipes_left: number | null;
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
  /** Cupo y registros de hoy frente al plan vigente (o al gratis). */
  limits: NutriLimits;
  /** Recetas entregadas esta semana. */
  recipes_week: number;
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
  /** Receta a la que pertenece el día. null = día viejo (anterior a las recetas). */
  prescription_id: string | null;
  created_at: string;
  updated_at: string;
}
/** Todo día nuevo va dentro de una receta borrador (prescription_id obligatorio). */
export type PlanDayInput = Pick<PlanDay, 'day' | 'title' | 'meals' | 'exercise' | 'notes'> & {
  id?: string;
  prescription_id: string;
};

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
  /** Registros por día; null = sin límite. */
  daily_record_limit: number | null;
  /** Recetas por período (solo planes de paciente); null = no aplica. */
  recipe_quota: number | null;
  /** Textos que se muestran en la tarjeta del plan. */
  features: string[];
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
  kind: 'suscripcion' | 'consulta' | 'suscripcion_paciente';
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

/* ------------------------------------------------------------------ SEMANA GRATIS (estilo Base Vital)
 * Diseño: docs/superpowers/specs/2026-11-21-semana-gratis-design.md
 * BD:     docs/superpowers/plans/2026-11-21-db-contrato-semana.md
 */

export type HealthCondition = 'diabetes' | 'hipertension' | 'embarazo' | 'renal' | 'otra';
export type TrialItemKind = 'comida' | 'rutina' | 'habito';
export type TemplateStatus = 'borrador' | 'aprobada';

export interface TrialItem {
  id: string;
  at_time: string; // 'HH:MM'
  kind: TrialItemKind;
  title: string;
  detail: string | null;
  done: boolean;
}

export interface TrialDay {
  day_number: number; // 1–7
  /** true = abierto hoy (unlocked_on <= hoy en Guayaquil). */
  unlocked: boolean;
  /** null = cerrado; fecha futura = se abre ese día. 'AAAA-MM-DD'. */
  unlocked_on: string | null;
  completed_at: string | null;
  items_total: number;
  items_done: number;
  /** Vacío si el día está cerrado (para el paciente). */
  items: TrialItem[];
}

export interface Trial {
  template_name: string;
  template_status: TemplateStatus;
  author_name: string;
  kcal_target: number;
  portion_factor: number;
  started_on: string;
  /** Hoy en Guayaquil ('AAAA-MM-DD'), según la base. */
  today: string;
  /** Primer día abierto sin completar (null si no hay). */
  current_day: number | null;
  /** El día 7 está completado. */
  finished: boolean;
  days: TrialDay[]; // siempre 7, orden 1..7
}

export interface DailyCheckin {
  id: string;
  checkin_date: string;
  mood: number; // 1–5
  weight_kg: number | null;
  water_glasses: number | null;
  note: string | null;
  created_at: string;
}
export type CheckinInput = Pick<DailyCheckin, 'mood' | 'weight_kg' | 'water_glasses' | 'note'>;

export type TemplateSex = 'cualquiera' | 'femenino' | 'masculino';
export interface PlanTemplate {
  id: string;
  name: string;
  description: string | null;
  sex: TemplateSex;
  age_min: number;
  age_max: number;
  bmi_min: number;
  bmi_max: number;
  goal: Goal | null; // null = cualquiera
  kcal_base: number;
  author_name: string;
  status: TemplateStatus;
  is_fallback: boolean;
  items_count: number;
}
export type PlanTemplateInput = Omit<PlanTemplate, 'id' | 'items_count'> & { id?: string };

export interface PlanTemplateItem {
  id: string;
  template_id: string;
  day_number: number;
  at_time: string; // 'HH:MM'
  kind: TrialItemKind;
  title: string;
  detail: string | null;
  sort: number;
}
export type PlanTemplateItemInput = Omit<PlanTemplateItem, 'id'> & { id?: string };

export type GuideCategory =
  | 'hidratacion' | 'porciones' | 'antes_entrenar' | 'despues_entrenar' | 'comer_fuera' | 'descanso' | 'compras';
export interface GuideEntry {
  id: string;
  slug: string;
  category: GuideCategory;
  title: string;
  summary: string | null;
  objective: string | null;
  do_items: string[];
  avoid_items: string[];
  steps: string[];
  source: string | null;
  published: boolean;
  sort: number;
  updated_at: string;
}
export type GuideEntryInput = Omit<GuideEntry, 'id' | 'updated_at'> & { id?: string };

export interface PatientSubscription {
  id: string;
  plan_id: string;
  plan_name: string;
  monthly_price: number;
  status: SubscriptionStatus;
  current_period_end: string | null;
  created_at: string;
  /** Recetas que le quedan en el período. */
  recipes_left: number;
}

/* ------------------------------------------------------------------ RECETAS, PLANES Y SUSCRIPCIÓN POR CORREO (ronda 7)
 * Diseño: docs/superpowers/specs/2026-11-24-recetas-planes-suscripcion.md
 * BD:     docs/superpowers/plans/2026-11-24-recetas-planes-suscripcion.md
 */

export type PrescriptionKind = 'dieta' | 'rutina' | 'recomendacion';
export type PrescriptionStatus = 'borrador' | 'entregada';

/** Lo que la nutricionista le entrega al paciente: dieta, rutina o recomendación. */
export interface Prescription {
  id: string;
  patient_id: string;
  nutritionist_id: string;
  kind: PrescriptionKind;
  title: string;
  body: string;
  status: PrescriptionStatus;
  /** Se fija al entregar: true = descontó una receta del paciente. */
  counts_against_patient: boolean;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}
/** Sin id = receta nueva (borrador). */
export interface PrescriptionInput {
  id?: string;
  patient_id: string;
  kind: PrescriptionKind;
  title: string;
  body: string;
}

/** Saldo de recetas del paciente. period_end: fin del período de la suscripción activa. */
export interface RecipeBalance {
  left: number;
  quota: number;
  period_end: string | null;
}

/** Límites de la nutricionista. daily_record_limit null = sin límite. */
export interface NutriLimits {
  plan_name: string | null;
  patient_quota: number;
  daily_record_limit: number | null;
  patients_used: number;
  records_today: number;
}

/** Una solicitud de suscripción (pendiente) o una suscripción activa, para Admin → Suscripciones. */
export interface AdminSubscriptionRow {
  invoice_id: string;
  subscription_id: string;
  audience: 'nutricionista' | 'paciente';
  user_id: string;
  full_name: string;
  email: string;
  plan_name: string;
  amount: number;
  status: SubscriptionStatus;
  created_at: string;
  period_end: string | null;
  /** null para nutricionistas. */
  recipes_left: number | null;
}
export interface AdminSubscriptionsOverview {
  pending: AdminSubscriptionRow[];
  active: AdminSubscriptionRow[];
}

export interface ContactSettingsInput {
  admin_email: string;
  free_patient_limit: number;
  free_daily_record_limit: number;
}

/** Resultado de agregar un paciente: su id y la receta «Semana 1» en borrador. */
export interface NutriAddPatientResult {
  patient_id: string;
  prescription_id: string;
}

export interface ContactInput { name: string; email: string; subject: string; message: string }
export interface ContactMessage extends ContactInput { id: string; read: boolean; created_at: string }

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
  requested_role?: 'nutricionista' | null;
  nutri_status?: NutriStatus | null;
  avatar_path?: string | null;
}

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
 * NO_PUEDES_CAMBIAR_TU_ROL, FOTO_REQUERIDA (registro sin foto), SIN_SOLICITUD (revisar sin solicitud pendiente),
 * CUPO_LLENO (registro con cupo de pacientes lleno), FASE_NO_ACTIVA (la fase está apagada),
 * FALTA_FICHA (pedir nutricionista sin ficha), YA_TIENES_SOLICITUD, SIN_SUSCRIPCION (nutricionista sin suscripción activa),
 * CUPO_PLAN_LLENO (nutricionista sin cupo en su plan), YA_TIENES_SUSCRIPCION, NO_ES_TU_PACIENTE, NO_PERMITIDO,
 * SIN_BASE (función que necesita Supabase).
 * Semana gratis: REQUIERE_NUTRICIONISTA (ficha con condiciones de salud), SIN_PLANTILLA.
 * Recetas y suscripción: SIN_RECETAS, SIN_SUSCRIPCION_PACIENTE, LIMITE_DIARIO, PACIENTE_NO_REGISTRADO,
 * PACIENTE_OCUPADO, RECETA_REQUERIDA, RECETA_CERRADA, DIA_OCUPADO.
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
  /** Vuelve a enviar el correo de confirmación del registro. */
  resendSignupConfirmation(email: string): Promise<void>;
  updateProfile(patch: ProfilePatch): Promise<Profile>;
  deleteMyAccount(): Promise<void>;
  /** Valida (FOTO_INVALIDA), reduce a lado 512 JPEG, sube a `avatars/<uid>/avatar.jpg` (reemplaza) y guarda `avatar_path`. */
  uploadAvatar(file: File): Promise<Profile>;
  /** URL firmada de 1 h para una foto del bucket `avatars`, o null si no hay ruta. */
  avatarUrl(path: string | null): Promise<string | null>;

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
  /** Aprueba (rol nutricionista) o rechaza una solicitud pendiente. Sin solicitud pendiente → SIN_SOLICITUD. */
  adminReviewNutri(userId: string, approve: boolean): Promise<void>;

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

  // ---------------------------------------------------------------- Semana gratis (fase 1)
  /** Mi semana gratis (null si aún no se generó). */
  getMyTrial(): Promise<Trial | null>;
  /** Genera (o devuelve) mi semana. Errores: FALTA_FICHA, REQUIERE_NUTRICIONISTA, SIN_PLANTILLA, FASE_NO_ACTIVA. */
  startMyTrial(): Promise<Trial>;
  /** Marca/desmarca un ítem de un día abierto. Devuelve la semana actualizada. */
  setTrialItemDone(itemId: string, done: boolean): Promise<Trial>;
  /** Nutricionista asignado o admin. */
  getPatientTrial(patientId: string): Promise<Trial | null>;
  getTodayCheckin(): Promise<DailyCheckin | null>;
  /** Guarda (o reemplaza) el chequeo de hoy. */
  saveTodayCheckin(input: CheckinInput): Promise<DailyCheckin>;
  /** Chequeos de los últimos `days` días, fecha ascendente. patientId = yo o mi paciente. */
  listCheckins(patientId: string, days: number): Promise<DailyCheckin[]>;

  // ---------------------------------------------------------------- Suscripción del paciente (fase 2)
  /** Planes con audience 'paciente' activos. (listPlans devuelve solo los de nutricionista.) */
  listPatientPlans(): Promise<SubscriptionPlan[]>;
  getMyPatientSubscription(): Promise<PatientSubscription | null>;
  /** Crea suscripción pendiente + factura 'suscripcion_paciente'. */
  choosePatientPlan(planId: string): Promise<Invoice>;

  // ---------------------------------------------------------------- Plantillas (nutricionista/admin)
  adminListTemplates(): Promise<PlanTemplate[]>;
  adminGetTemplate(id: string): Promise<{ template: PlanTemplate; items: PlanTemplateItem[] } | null>;
  adminSaveTemplate(input: PlanTemplateInput): Promise<PlanTemplate>;
  adminDeleteTemplate(id: string): Promise<void>;
  adminSaveTemplateItem(input: PlanTemplateItemInput): Promise<PlanTemplateItem>;
  adminDeleteTemplateItem(id: string): Promise<void>;

  // ---------------------------------------------------------------- Guía (pública)
  /** Publicadas, por categoría y sort. */
  listGuide(): Promise<GuideEntry[]>;
  /** Nutricionista/admin: incluye no publicadas. */
  adminListGuide(): Promise<GuideEntry[]>;
  adminSaveGuideEntry(input: GuideEntryInput): Promise<GuideEntry>;
  adminDeleteGuideEntry(id: string): Promise<void>;

  // ---------------------------------------------------------------- Recetas, planes y suscripción por correo (ronda 7)
  /** Nutricionista/admin: recetas de un paciente (borradores y entregadas). Más nueva primero. */
  listPrescriptions(patientId: string): Promise<Prescription[]>;
  /** Paciente: solo sus recetas entregadas. Más nueva primero. */
  listMyPrescriptions(): Promise<Prescription[]>;
  /** Crea (sin id) o edita una receta. Editar solo en borrador (RECETA_CERRADA si ya se entregó). */
  savePrescription(input: PrescriptionInput): Promise<Prescription>;
  /** Solo borradores. Sus días se borran en cascada. */
  deletePrescription(id: string): Promise<void>;
  /** Entrega la receta: descuenta 1 de las recetas del paciente si es de plataforma. Sin dobles descuentos. */
  deliverPrescription(id: string): Promise<Prescription>;
  /** Saldo de recetas. Sin patientId = el propio. */
  getRecipeBalance(patientId?: string): Promise<RecipeBalance>;
  /** Agrega a un paciente que ya tiene cuenta propia (PACIENTE_NO_REGISTRADO, PACIENTE_OCUPADO, CUPO_PLAN_LLENO). */
  nutriAddPatient(email: string): Promise<NutriAddPatientResult>;
  /** Límites de la nutricionista: plan, cupo de pacientes y registros de hoy. */
  getNutriLimits(): Promise<NutriLimits>;
  /** Admin: solicitudes pendientes y suscripciones activas (pacientes y nutricionistas). */
  adminSubscriptionsOverview(): Promise<AdminSubscriptionsOverview>;
  /** Admin: correo de la administradora y cupos del plan gratis. Devuelve los ajustes nuevos. */
  adminSaveContactSettings(input: ContactSettingsInput): Promise<AppSettings>;
  /** Copia los días libres de la semana de fromMonday a la de toMonday, dentro de la receta borrador prescriptionId. Devuelve cuántos creó. */
  copyPlanWeek(patientId: string, fromMonday: string, toMonday: string, prescriptionId: string): Promise<number>;
}
