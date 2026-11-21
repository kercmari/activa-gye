/**
 * CONTRATO DE DATOS de Activa GYE.
 * Las formas copian las tablas de supabase/migrations/20261121000001_esquema_inicial.sql.
 * Hoy los datos vienen de un simulador (src/data/mock). Mañana, de Supabase: las pantallas no cambian.
 * NO cambiar este archivo sin actualizar el plan (docs/superpowers/plans/2026-11-21-activa-gye-front.md).
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

/** Guía nutricional (la escribe la IA o el cálculo básico). Forma fija: la pantalla la dibuja tal cual. */
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

export interface NutritionRequest {
  id: string;
  user_id: string;
  age: number;
  sex: Sex;
  height_cm: number;
  weight_kg: number;
  waist_cm: number | null;
  activity_level: ActivityLevel;
  goal: Goal;
  restrictions: string | null;
  health_conditions: string | null;
  photo_path: string | null;
  consent_photo: boolean;
  consent_at: string | null;
  ai_guide: NutritionGuide | null;
  ai_kind: 'ia' | 'basica' | null;
  ai_status: 'pendiente' | 'lista' | 'fallo';
  status: 'enviada' | 'guia_lista' | 'respondida';
  nutritionist_id: string | null;
  nutritionist_plan: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  /** Solo para staff: nombre de quien pidió (join con profiles). */
  requester_name?: string;
}

export interface NewNutritionRequest {
  sex: Sex;
  height_cm: number;
  weight_kg: number;
  waist_cm: number | null;
  activity_level: ActivityLevel;
  goal: Goal;
  restrictions: string | null;
  health_conditions: string | null;
  /** Foto opcional; si viene, consent_photo debe ser true y la persona tener 18+. */
  photo: File | null;
  consent_photo: boolean;
}

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
 * YA_TOMADA, NO_ASIGNADA_A_TI, PLAN_MUY_CORTO, FOTO_SIN_CONSENTIMIENTO, FOTO_MENOR_18, FOTO_INVALIDA,
 * DEMASIADOS_MENSAJES, DATOS_INVALIDOS, NO_PUEDES_CAMBIAR_TU_ROL.
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

  // Nutrición (con sesión)
  /** Guarda la solicitud y genera la guía (IA o básica). Devuelve la solicitud ya con ai_guide. */
  createNutritionRequest(input: NewNutritionRequest): Promise<NutritionRequest>;
  listMyNutritionRequests(): Promise<NutritionRequest[]>; // más nueva primero
  getNutritionRequest(id: string): Promise<NutritionRequest | null>;
  /** URL para mostrar la foto (dueño o staff). null si no hay foto. */
  getNutritionPhotoUrl(request: NutritionRequest): Promise<string | null>;

  // Nutricionista / admin
  listAllNutritionRequests(): Promise<NutritionRequest[]>;
  takeNutritionRequest(id: string): Promise<void>;
  answerNutritionRequest(id: string, plan: string): Promise<void>;

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
}
