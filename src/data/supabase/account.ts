/** Cuenta con Supabase: auth, perfil, favoritos, progreso, administración de usuarios y fases (dueño: D1). */
import type { User } from '@supabase/supabase-js';
import type {
  AdminUser,
  AppSettings,
  AppSettingsInput,
  Place,
  Profile,
  ProfilePatch,
  ProgressEntry,
  ProgressInput,
  Repo,
  Role,
  Session,
  SignUpInput,
} from '../types';
import { AppError } from '../types';
import { supabase } from './client';
import { toAppError, unwrap } from './errors';

const SIN_SESION = 'Inicia sesión para continuar.';
const DATOS_INVALIDOS = 'Revisa los datos e inténtalo de nuevo.';

/** Avisos locales: se llaman cuando cambia el perfil desde esta app (Supabase solo avisa cambios de sesión). */
const perfilListeners = new Set<() => void>();

/** Años cumplidos a partir de 'AAAA-MM-DD'. Lanza DATOS_INVALIDOS si la fecha no sirve. */
function ageFrom(birth: string): number {
  const b = new Date(`${birth}T00:00:00`);
  if (!Number.isFinite(b.getTime())) throw new AppError('DATOS_INVALIDOS', DATOS_INVALIDOS);
  const hoy = new Date();
  let edad = hoy.getFullYear() - b.getFullYear();
  const aunNo = hoy.getMonth() < b.getMonth() || (hoy.getMonth() === b.getMonth() && hoy.getDate() < b.getDate());
  if (aunNo) edad -= 1;
  return edad;
}

/** Id de la sesión actual o SIN_SESION. */
async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw toAppError(error);
  const id = data.session?.user.id;
  if (!id) throw new AppError('SIN_SESION', SIN_SESION);
  return id;
}

/** Sesión completa: usuario de auth + fila de profiles. */
async function loadSession(user: Pick<User, 'id' | 'email'>): Promise<Session> {
  const profile = unwrap(
    await supabase.from('profiles').select('*').eq('id', user.id).single(),
  ) as Profile;
  return { user: { id: user.id, email: user.email ?? '' }, profile };
}

/** Lugar embebido en favorites: con sus deportes. */
type FavoritePlace = Place & { place_sports?: { sport_id: string }[] };

/** Lee el perfil y avisa a quien escucha perfil/sesión. Se usa tras editar el perfil. */
function avisarCambio(): void {
  perfilListeners.forEach((aviso) => aviso());
}

interface SettingsRow {
  phase1: boolean;
  phase2: boolean;
  phase3: boolean;
  patient_limit: number;
  patients_count: number;
}

function rowToSettings(row: SettingsRow): AppSettings {
  return {
    phase1: Boolean(row.phase1),
    phase2: Boolean(row.phase2),
    phase3: Boolean(row.phase3),
    patient_limit: Number(row.patient_limit),
    patients_count: Number(row.patients_count),
  };
}

/** Quita las claves con undefined (un parche solo lleva lo que cambia). */
function sinUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

async function getSettings(): Promise<AppSettings> {
  const row = unwrap(await supabase.rpc('get_public_settings')) as SettingsRow;
  return rowToSettings(row);
}

async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw toAppError(error);
  const user = data.session?.user;
  if (!user) return null;
  return loadSession(user);
}

async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw toAppError(error);
}

async function isFavorite(placeId: string): Promise<boolean> {
  const id = await currentUserId();
  const fila = unwrap(
    await supabase.from('favorites').select('place_id').eq('user_id', id).eq('place_id', placeId).maybeSingle(),
  );
  return fila !== null;
}

export const accountPart: Partial<Repo> = {
  getSession,

  onAuthChange(cb: (session: Session | null) => void) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        cb(null);
        return;
      }
      // Sin await dentro del callback de Supabase (evita bloqueos del cliente de auth).
      loadSession(session.user).then(cb, () => undefined);
    });
    const aviso = () => {
      getSession().then(cb, () => undefined);
    };
    perfilListeners.add(aviso);
    return () => {
      perfilListeners.delete(aviso);
      data.subscription.unsubscribe();
    };
  },

  async signUp(input: SignUpInput) {
    const email = input.email.trim().toLowerCase();
    const cupoLleno = (s: AppSettings) => !s.phase3 && s.patients_count >= s.patient_limit;

    const antes = await getSettings();
    if (cupoLleno(antes)) throw new AppError('CUPO_LLENO', 'Por ahora no hay cupos para nuevos pacientes. Inténtalo más adelante.');
    if (ageFrom(input.birth_date) < 16) throw new AppError('MENOR_DE_16', 'Debes tener al menos 16 años para registrarte.');

    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: { data: { full_name: input.full_name.trim(), birth_date: input.birth_date } },
    });
    if (error) {
      if (error.message.includes('Database error saving new user')) {
        // La base rechazó el alta: casi siempre es el cupo que se llenó mientras se llenaba el formulario.
        const despues = await getSettings();
        if (cupoLleno(despues)) throw new AppError('CUPO_LLENO', 'Por ahora no hay cupos para nuevos pacientes. Inténtalo más adelante.');
        throw new AppError('DATOS_INVALIDOS', DATOS_INVALIDOS);
      }
      throw toAppError(error);
    }
    if (!data.user || !data.session) {
      throw new AppError('CORREO_SIN_CONFIRMAR', 'Revisa tu correo para confirmar la cuenta y luego inicia sesión.');
    }
    return loadSession(data.user);
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) {
      if (/email not confirmed/i.test(error.message)) {
        throw new AppError('CORREO_SIN_CONFIRMAR', 'Revisa tu correo para confirmar la cuenta y luego inicia sesión.');
      }
      throw toAppError(error);
    }
    if (!data.user) throw new AppError('CREDENCIALES', 'Correo o contraseña incorrectos.');
    return loadSession(data.user);
  },

  signOut,

  async requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${location.origin}/ingresar`,
    });
    if (error) throw toAppError(error);
  },

  async updateProfile(patch: ProfilePatch) {
    const id = await currentUserId();
    const profile = unwrap(
      await supabase.from('profiles').update(sinUndefined(patch)).eq('id', id).select('*').single(),
    ) as Profile;
    avisarCambio();
    return profile;
  },

  async deleteMyAccount() {
    unwrap(await supabase.rpc('delete_my_account'));
    await signOut();
  },

  async listFavorites() {
    const id = await currentUserId();
    const rows = unwrap(
      await supabase
        .from('favorites')
        .select('created_at, places(*, place_sports(sport_id))')
        .eq('user_id', id)
        .order('created_at', { ascending: false }),
    ) as unknown as { places: FavoritePlace | FavoritePlace[] | null }[];
    const lugares = rows.flatMap((r) => (Array.isArray(r.places) ? r.places : r.places ? [r.places] : []));
    return lugares.map((p) => ({
      ...p,
      sport_ids: (p.place_sports ?? []).map((s) => s.sport_id),
    })) as Place[];
  },

  isFavorite,

  async toggleFavorite(placeId: string) {
    const id = await currentUserId();
    if (await isFavorite(placeId)) {
      unwrap(await supabase.from('favorites').delete().eq('user_id', id).eq('place_id', placeId));
      return false;
    }
    unwrap(await supabase.from('favorites').insert({ user_id: id, place_id: placeId }));
    return true;
  },

  async listProgress() {
    await currentUserId();
    const rows = unwrap(
      await supabase.from('progress_entries').select('*').order('entry_date', { ascending: true }),
    ) as (Omit<ProgressEntry, 'weight_kg'> & { weight_kg: number | string | null })[];
    return rows.map((r) => ({
      ...r,
      weight_kg: r.weight_kg === null ? null : Number(r.weight_kg),
    }));
  },

  async addProgress(input: ProgressInput) {
    const id = await currentUserId();
    const row = unwrap(
      await supabase
        .from('progress_entries')
        .insert({ ...input, user_id: id })
        .select('*')
        .single(),
    ) as ProgressEntry;
    return { ...row, weight_kg: row.weight_kg === null ? null : Number(row.weight_kg) };
  },

  async deleteProgress(id: string) {
    await currentUserId();
    const filas = unwrap(
      await supabase.from('progress_entries').delete().eq('id', id).select('id'),
    ) as { id: string }[];
    if (filas.length === 0) throw new AppError('NO_EXISTE', 'No encontramos ese registro.');
  },

  async adminListUsers(search?: string) {
    const rows = unwrap(await supabase.rpc('admin_list_users', { search: search ?? null }));
    return rows as AdminUser[];
  },

  async adminSetRole(userId: string, role: Role) {
    unwrap(await supabase.rpc('admin_set_role', { target: userId, new_role: role }));
  },

  getSettings,

  async adminSaveSettings(input: AppSettingsInput) {
    const row = unwrap(
      await supabase.rpc('admin_set_settings', {
        p_phase1: input.phase1,
        p_phase2: input.phase2,
        p_phase3: input.phase3,
        p_patient_limit: input.patient_limit,
      }),
    ) as SettingsRow;
    return rowToSettings(row);
  },
};
