import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, type Repo } from '../types';

const sb = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  storage: { from: vi.fn() },
  auth: {
    signUp: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
  },
}));

vi.mock('./client', () => ({ supabase: sb }));

// La reducción real usa Image/canvas (no existen en jsdom): aquí solo validamos el tipo.
vi.mock('../../lib/image', async () => {
  const { AppError: Err } = await import('../types');
  return {
    downscaleToBlob: async (file: File) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Err('FOTO_INVALIDA', 'La foto debe ser JPG, PNG o WebP de hasta 5 MB.');
      }
      return new Blob(['jpg'], { type: 'image/jpeg' });
    },
  };
});

import { accountPart } from './account';

const { getSettings, signUp, adminSaveSettings } = accountPart as Required<
  Pick<typeof accountPart, 'getSettings' | 'signUp' | 'adminSaveSettings'>
>;
const cuenta = accountPart as Repo;

const PERFIL = {
  id: 'uid', full_name: 'Ana Pérez', birth_date: '1995-03-15', sex: null, phone: null, sector_id: null,
  goal: null, activity_level: null, role: 'usuario', created_at: '2026-01-01', updated_at: '2026-01-01',
  avatar_path: 'uid/avatar.jpg', requested_role: null, nutri_status: null,
};

/** Fecha de nacimiento de hace `anios` años (y un día menos para que cuente como cumplido). */
function nacidoHace(anios: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - anios);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

const SIGNUP = {
  email: 'ana@ejemplo.com',
  password: 'clave-segura-123',
  full_name: 'Ana Pérez',
  birth_date: nacidoHace(30),
  account_type: 'paciente' as const,
  photo: new File(['x'], 'foto.jpg', { type: 'image/jpeg' }),
};

const CUPO_LIBRE = { data: { phase1: true, phase2: false, phase3: false, patient_limit: 5, patients_count: 0 }, error: null };
const CUPO_LLENO_RES = { data: { phase1: true, phase2: false, phase3: false, patient_limit: 5, patients_count: 5 }, error: null };

let upload: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  upload = vi.fn().mockResolvedValue({ error: null });
  sb.storage.from.mockReturnValue({
    upload,
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://cdn.test/foto.jpg?t=1' }, error: null }),
  });
  sb.from.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: PERFIL, error: null }),
  });
  sb.auth.signUp.mockResolvedValue({ data: { user: { id: 'uid', email: 'ana@ejemplo.com' }, session: { access_token: 't' } }, error: null });
  sb.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'uid', email: 'ana@ejemplo.com' } }, error: null });
  sb.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'uid', email: 'ana@ejemplo.com' } } }, error: null });
});

describe('getSettings', () => {
  it('llama rpc(get_public_settings) y devuelve sus campos', async () => {
    sb.rpc.mockResolvedValue({
      data: {
        phase1: true, phase2: false, phase3: false, patient_limit: 5, patients_count: 2,
        admin_email: 'kerlyeliz19@gmail.com', free_patient_limit: 3, free_daily_record_limit: 10,
      },
      error: null,
    });

    const s = await getSettings();

    expect(sb.rpc).toHaveBeenCalledWith('get_public_settings');
    expect(s).toEqual({
      phase1: true, phase2: false, phase3: false, patient_limit: 5, patients_count: 2,
      admin_email: 'kerlyeliz19@gmail.com', free_patient_limit: 3, free_daily_record_limit: 10,
    });
  });
});

describe('adminSaveSettings', () => {
  it('llama rpc(admin_set_settings) con los parámetros p_*', async () => {
    sb.rpc.mockResolvedValue({
      data: { phase1: true, phase2: true, phase3: false, patient_limit: 10, patients_count: 2 },
      error: null,
    });

    const s = await adminSaveSettings({ phase1: true, phase2: true, phase3: false, patient_limit: 10 });

    expect(sb.rpc).toHaveBeenCalledWith('admin_set_settings', {
      p_phase1: true,
      p_phase2: true,
      p_phase3: false,
      p_patient_limit: 10,
    });
    expect(s.phase2).toBe(true);
    expect(s.patient_limit).toBe(10);
  });
});

describe('signUp', () => {
  it('con el cupo lleno lanza CUPO_LLENO sin llamar a auth.signUp', async () => {
    sb.rpc.mockResolvedValue(CUPO_LLENO_RES);

    await expect(signUp(SIGNUP)).rejects.toMatchObject({ code: 'CUPO_LLENO' });
    expect(sb.auth.signUp).not.toHaveBeenCalled();
  });

  it('sin foto → FOTO_REQUERIDA y no crea la cuenta', async () => {
    await expect(signUp({ ...SIGNUP, photo: undefined })).rejects.toMatchObject({ code: 'FOTO_REQUERIDA' });
    expect(sb.auth.signUp).not.toHaveBeenCalled();
  });

  it('foto de tipo inválido → FOTO_INVALIDA y no crea la cuenta', async () => {
    const gif = new File(['x'], 'foto.gif', { type: 'image/gif' });
    await expect(signUp({ ...SIGNUP, photo: gif })).rejects.toMatchObject({ code: 'FOTO_INVALIDA' });
    expect(sb.auth.signUp).not.toHaveBeenCalled();
  });

  it('nutricionista con cupo lleno entra y envía account_type en los datos de auth', async () => {
    sb.rpc.mockResolvedValue(CUPO_LLENO_RES);

    const session = await signUp({ ...SIGNUP, account_type: 'nutricionista' });

    expect(session.user.id).toBe('uid');
    expect(sb.auth.signUp.mock.calls[0][0].options.data.account_type).toBe('nutricionista');
  });

  it('paciente con cupo lleno lanza CUPO_LLENO', async () => {
    sb.rpc.mockResolvedValue(CUPO_LLENO_RES);
    await expect(signUp({ ...SIGNUP, account_type: 'paciente' })).rejects.toMatchObject({ code: 'CUPO_LLENO' });
  });

  it('con sesión sube la foto a avatars/<uid>/avatar.jpg con upsert', async () => {
    sb.rpc.mockResolvedValue(CUPO_LIBRE);

    await signUp(SIGNUP);

    expect(sb.storage.from).toHaveBeenCalledWith('avatars');
    expect(upload.mock.calls[0][0]).toBe('uid/avatar.jpg');
    expect(upload.mock.calls[0][2]).toMatchObject({ upsert: true });
  });

  it('sin sesión guarda la foto pendiente y signIn la sube y la borra', async () => {
    sb.rpc.mockResolvedValue(CUPO_LIBRE);
    sb.auth.signUp.mockResolvedValue({ data: { user: { id: 'uid', email: 'ana@ejemplo.com' }, session: null }, error: null });

    await expect(signUp(SIGNUP)).rejects.toMatchObject({ code: 'CORREO_SIN_CONFIRMAR' });
    const clave = 'activa.fotoPendiente.ana@ejemplo.com';
    expect(localStorage.getItem(clave)).toMatch(/^data:image\/jpeg;base64,/);
    expect(upload).not.toHaveBeenCalled();

    await accountPart.signIn!('ana@ejemplo.com', 'clave-segura-123');

    expect(upload.mock.calls[0][0]).toBe('uid/avatar.jpg');
    expect(localStorage.getItem(clave)).toBeNull();
  });

  it('si la subida falla tras crear la cuenta, el registro se conserva', async () => {
    sb.rpc.mockResolvedValue(CUPO_LIBRE);
    upload.mockResolvedValue({ error: { message: 'Storage down' } });

    const session = await signUp(SIGNUP);
    expect(session.user.id).toBe('uid');
  });
});

describe('foto de perfil y revisión de nutricionistas', () => {
  it('uploadAvatar reemplaza la foto (upsert) y devuelve el perfil con avatar_path', async () => {
    const perfil = await cuenta.uploadAvatar!(new File(['y'], 'nueva.png', { type: 'image/png' }));
    expect(upload.mock.calls[0][0]).toBe('uid/avatar.jpg');
    expect(upload.mock.calls[0][2]).toMatchObject({ upsert: true });
    expect(perfil.avatar_path).toBe('uid/avatar.jpg');
  });

  it('avatarUrl(null) → null y avatarUrl(ruta) → URL firmada', async () => {
    expect(await cuenta.avatarUrl!(null)).toBeNull();
    expect(await cuenta.avatarUrl!('uid/avatar.jpg')).toBe('https://cdn.test/foto.jpg?t=1');
  });

  it('adminReviewNutri llama a admin_review_nutri con target y approve', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: null });
    await cuenta.adminReviewNutri!('u2', true);
    expect(sb.rpc).toHaveBeenCalledWith('admin_review_nutri', { target: 'u2', approve: true });
  });

  it('con un menor de 16 lanza MENOR_DE_16', async () => {
    sb.rpc.mockResolvedValue({
      data: { phase1: true, phase2: false, phase3: false, patient_limit: 5, patients_count: 0 },
      error: null,
    });

    const err = await signUp({ ...SIGNUP, birth_date: nacidoHace(15) }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe('MENOR_DE_16');
    expect(sb.auth.signUp).not.toHaveBeenCalled();
  });
});
