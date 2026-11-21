/**
 * Simulador de cuentas: registro, ingreso, perfil, favoritos, progreso y admin de usuarios.
 * Solo para pruebas y modo sin base. Las funciones de fases 1–3 (ficha, nutricionista, pagos, reseñas) responden SIN_BASE.
 * Tablas en localStorage: users, favorites, progress_entries, photos.
 */
import type {
  AdminUser, Place, Profile, ProfilePatch, ProgressEntry,
  ProgressInput, Repo, Role, Session, SignUpInput, Goal, ActivityLevel, Sex,
} from '../types';
import { AppError } from '../types';
import { catalogPart } from './catalog';
import { ensureSeedUsers } from './seed-users';
import {
  readTable, writeTable, currentUser, setSessionUserId, hashPassword, wait, nowIso, type StoredUser,
} from './store';

type FavoriteRow = { user_id: string; place_id: string; created_at: string };
type PhotoRow = { path: string; user_id: string; data_url: string };

const SEX: Sex[] = ['femenino', 'masculino', 'otro', 'prefiero_no_decir'];
const GOALS: Goal[] = ['bajar_peso', 'ganar_musculo', 'mantener', 'resistencia', 'bienestar'];
const ACTIVITY: ActivityLevel[] = ['sedentario', 'ligero', 'moderado', 'intenso'];
const ROLES: Role[] = ['usuario', 'nutricionista', 'admin'];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const invalid = (msg = 'Revisa los datos e inténtalo de nuevo.') => new AppError('DATOS_INVALIDOS', msg);

// ---------- Ayudas ----------

const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** true si 'AAAA-MM-DD' es una fecha real. */
function isRealDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Años cumplidos a la fecha de hoy. */
function ageFrom(birth: string): number {
  const now = new Date();
  const [y, m, d] = birth.split('-').map(Number);
  let age = now.getFullYear() - y;
  const hadBirthday = now.getMonth() + 1 > m || (now.getMonth() + 1 === m && now.getDate() >= d);
  if (!hadBirthday) age -= 1;
  return age;
}

function toSession(u: StoredUser): Session {
  return { user: { id: u.id, email: u.email }, profile: u.profile };
}

function sessionNow(): Session | null {
  const u = currentUser();
  return u ? toSession(u) : null;
}

function requireUser(): StoredUser {
  const u = currentUser();
  if (!u) throw new AppError('SIN_SESION', 'Inicia sesión para continuar.');
  return u;
}

function requireRole(allowed: Role[], code: string, message: string): StoredUser {
  const u = requireUser();
  if (!allowed.includes(u.profile.role)) throw new AppError(code, message);
  return u;
}

const requireAdmin = () => requireRole(['admin'], 'SOLO_ADMIN', 'Solo el administrador puede hacer esto.');

/** Escucha de cambios de sesión (módulo, no React). */
const listeners = new Set<(s: Session | null) => void>();
function notifyAuth(): void {
  const s = sessionNow();
  listeners.forEach((cb) => cb(s));
}

function validateFullName(name: string): string {
  const t = name.trim();
  if (t.length < 2 || t.length > 120) throw invalid('El nombre debe tener entre 2 y 120 caracteres.');
  return t;
}

function validateBirth(birth: string): void {
  if (!isRealDate(birth)) throw invalid('Escribe una fecha de nacimiento válida.');
  if (ageFrom(birth) < 16) throw new AppError('MENOR_DE_16', 'Debes tener al menos 16 años para registrarte.');
}

// ---------- Métodos ----------

async function getSession(): Promise<Session | null> {
  await ensureSeedUsers();
  await wait();
  return sessionNow();
}

function onAuthChange(cb: (session: Session | null) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

async function signUp(input: SignUpInput): Promise<Session> {
  await ensureSeedUsers();
  await wait();
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) throw invalid('Escribe un correo válido.');
  if (input.password.length < 8) throw invalid('La contraseña debe tener al menos 8 caracteres.');
  const full_name = validateFullName(input.full_name);
  if (!isRealDate(input.birth_date)) throw invalid('Escribe una fecha de nacimiento válida.');
  validateBirth(input.birth_date);

  const users = readTable<StoredUser>('users');
  if (users.some((u) => u.email === email)) {
    throw new AppError('CORREO_EN_USO', 'Ya existe una cuenta con ese correo.');
  }

  const id = crypto.randomUUID();
  const now = nowIso();
  const user: StoredUser = {
    id,
    email,
    password_hash: await hashPassword(email, input.password),
    profile: {
      id, full_name, birth_date: input.birth_date, sex: null, phone: null, sector_id: null,
      goal: null, activity_level: null, role: 'usuario', created_at: now, updated_at: now,
    },
  };
  writeTable('users', [...readTable<StoredUser>('users'), user]);
  setSessionUserId(id);
  notifyAuth();
  return toSession(user);
}

async function signIn(email: string, password: string): Promise<Session> {
  await ensureSeedUsers();
  await wait();
  const normalized = email.trim().toLowerCase();
  const user = readTable<StoredUser>('users').find((u) => u.email === normalized);
  const hash = await hashPassword(normalized, password);
  if (!user || user.password_hash !== hash) {
    throw new AppError('CREDENCIALES', 'Correo o contraseña incorrectos.');
  }
  setSessionUserId(user.id);
  notifyAuth();
  return toSession(user);
}

async function signOut(): Promise<void> {
  await wait();
  setSessionUserId(null);
  notifyAuth();
}

async function requestPasswordReset(_email: string): Promise<void> {
  // En el simulador no se envía correo. Siempre resuelve, como la versión real.
  await wait();
}

async function updateProfile(patch: ProfilePatch): Promise<Profile> {
  await ensureSeedUsers();
  await wait();
  const me = requireUser();
  const next: Partial<Profile> = {};

  if (patch.full_name !== undefined) next.full_name = validateFullName(patch.full_name);
  if (patch.birth_date !== undefined && patch.birth_date !== null) {
    validateBirth(patch.birth_date);
    next.birth_date = patch.birth_date;
  }
  if (patch.sex !== undefined) {
    if (patch.sex !== null && !SEX.includes(patch.sex)) throw invalid();
    next.sex = patch.sex;
  }
  if (patch.phone !== undefined) {
    const phone = patch.phone?.trim() || null;
    if (phone && phone.length > 30) throw invalid('El teléfono puede tener hasta 30 caracteres.');
    next.phone = phone;
  }
  if (patch.sector_id !== undefined) next.sector_id = patch.sector_id;
  if (patch.goal !== undefined) {
    if (patch.goal !== null && !GOALS.includes(patch.goal)) throw invalid();
    next.goal = patch.goal;
  }
  if (patch.activity_level !== undefined) {
    if (patch.activity_level !== null && !ACTIVITY.includes(patch.activity_level)) throw invalid();
    next.activity_level = patch.activity_level;
  }

  const users = readTable<StoredUser>('users');
  const idx = users.findIndex((u) => u.id === me.id);
  if (idx < 0) throw new AppError('SIN_SESION', 'Inicia sesión para continuar.');
  // role e id nunca se cambian aquí.
  const updated: StoredUser = {
    ...users[idx],
    profile: { ...users[idx].profile, ...next, role: users[idx].profile.role, id: users[idx].id, updated_at: nowIso() },
  };
  users[idx] = updated;
  writeTable('users', users);
  notifyAuth();
  return updated.profile;
}

async function deleteMyAccount(): Promise<void> {
  await wait();
  const me = requireUser();
  writeTable('users', readTable<StoredUser>('users').filter((u) => u.id !== me.id));
  writeTable('favorites', readTable<FavoriteRow>('favorites').filter((f) => f.user_id !== me.id));
  writeTable('progress_entries', readTable<ProgressEntry>('progress_entries').filter((p) => p.user_id !== me.id));
  writeTable('photos', readTable<PhotoRow>('photos').filter((p) => p.user_id !== me.id));
  setSessionUserId(null);
  notifyAuth();
}

// Favoritos

async function listFavorites(): Promise<Place[]> {
  await ensureSeedUsers();
  await wait();
  const me = requireUser();
  const ids = readTable<FavoriteRow>('favorites')
    .filter((f) => f.user_id === me.id)
    .reverse()
    .map((f) => f.place_id);
  if (ids.length === 0) return [];
  if (!catalogPart.getPlaces) throw new AppError('SIN_CATALOGO', 'No pudimos cargar los lugares. Inténtalo de nuevo.');
  const places = await catalogPart.getPlaces(ids);
  return ids
    .map((id) => places.find((p) => p.id === id))
    .filter((p): p is Place => p !== undefined);
}

async function isFavorite(placeId: string): Promise<boolean> {
  await wait();
  const me = currentUser();
  if (!me) return false;
  return readTable<FavoriteRow>('favorites').some((f) => f.user_id === me.id && f.place_id === placeId);
}

async function toggleFavorite(placeId: string): Promise<boolean> {
  await wait();
  const me = requireUser();
  const rows = readTable<FavoriteRow>('favorites');
  const exists = rows.some((f) => f.user_id === me.id && f.place_id === placeId);
  if (exists) {
    writeTable('favorites', rows.filter((f) => !(f.user_id === me.id && f.place_id === placeId)));
    return false;
  }
  writeTable('favorites', [...rows, { user_id: me.id, place_id: placeId, created_at: nowIso() }]);
  return true;
}

// Progreso

async function listProgress(): Promise<ProgressEntry[]> {
  await ensureSeedUsers();
  await wait();
  const me = requireUser();
  return readTable<ProgressEntry>('progress_entries')
    .filter((p) => p.user_id === me.id)
    .sort((a, b) => (a.entry_date === b.entry_date ? a.created_at.localeCompare(b.created_at) : a.entry_date.localeCompare(b.entry_date)));
}

async function addProgress(input: ProgressInput): Promise<ProgressEntry> {
  await ensureSeedUsers();
  await wait();
  const me = requireUser();

  if (!isRealDate(input.entry_date) || input.entry_date > dateKey(new Date())) {
    throw invalid('La fecha no puede ser futura.');
  }
  const weight = input.weight_kg ?? null;
  const minutes = input.active_minutes ?? null;
  if (weight === null && minutes === null) throw invalid('Escribe el peso o los minutos de actividad.');
  if (weight !== null && (!Number.isFinite(weight) || weight < 20 || weight > 400)) {
    throw invalid('El peso debe estar entre 20 y 400 kg.');
  }
  if (minutes !== null && (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440)) {
    throw invalid('Los minutos deben estar entre 0 y 1440.');
  }
  const activity = input.activity?.trim() || null;
  if (activity && activity.length > 80) throw invalid('La actividad puede tener hasta 80 caracteres.');
  const note = input.note?.trim() || null;
  if (note && note.length > 280) throw invalid('La nota puede tener hasta 280 caracteres.');

  const entry: ProgressEntry = {
    id: crypto.randomUUID(),
    user_id: me.id,
    entry_date: input.entry_date,
    weight_kg: weight,
    active_minutes: minutes,
    activity,
    note,
    created_at: nowIso(),
  };
  writeTable('progress_entries', [...readTable<ProgressEntry>('progress_entries'), entry]);
  return entry;
}

async function deleteProgress(id: string): Promise<void> {
  await wait();
  const me = requireUser();
  const rows = readTable<ProgressEntry>('progress_entries');
  if (!rows.some((p) => p.id === id && p.user_id === me.id)) {
    throw new AppError('NO_EXISTE', 'No encontramos ese registro.');
  }
  writeTable('progress_entries', rows.filter((p) => !(p.id === id && p.user_id === me.id)));
}

// Admin de usuarios

async function adminListUsers(search?: string): Promise<AdminUser[]> {
  await ensureSeedUsers();
  await wait();
  requireAdmin();
  const q = search?.trim().toLowerCase() ?? '';
  return readTable<StoredUser>('users')
    .map((u) => ({ id: u.id, email: u.email, full_name: u.profile.full_name, role: u.profile.role, created_at: u.profile.created_at }))
    .filter((u) => !q || u.email.includes(q) || u.full_name.toLowerCase().includes(q))
    .sort((a, b) => a.email.localeCompare(b.email));
}

async function adminSetRole(userId: string, role: Role): Promise<void> {
  await wait();
  const me = requireAdmin();
  if (userId === me.id) throw new AppError('NO_PUEDES_CAMBIAR_TU_ROL', 'No puedes cambiar tu propio rol.');
  if (!ROLES.includes(role)) throw invalid();
  const users = readTable<StoredUser>('users');
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) throw new AppError('NO_EXISTE', 'No encontramos esa cuenta.');
  users[idx] = { ...users[idx], profile: { ...users[idx].profile, role, updated_at: nowIso() } };
  writeTable('users', users);
}

export const accountsPart: Partial<Repo> = {
  getSession,
  onAuthChange,
  signUp,
  signIn,
  signOut,
  requestPasswordReset,
  updateProfile,
  deleteMyAccount,
  listFavorites,
  isFavorite,
  toggleFavorite,
  listProgress,
  addProgress,
  deleteProgress,
  adminListUsers,
  adminSetRole,
};
