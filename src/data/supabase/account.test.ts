import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../types';

const sb = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
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

import { accountPart } from './account';

const { getSettings, signUp, adminSaveSettings } = accountPart as Required<
  Pick<typeof accountPart, 'getSettings' | 'signUp' | 'adminSaveSettings'>
>;

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
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getSettings', () => {
  it('llama rpc(get_public_settings) y devuelve sus campos', async () => {
    sb.rpc.mockResolvedValue({
      data: { phase1: true, phase2: false, phase3: false, patient_limit: 5, patients_count: 2 },
      error: null,
    });

    const s = await getSettings();

    expect(sb.rpc).toHaveBeenCalledWith('get_public_settings');
    expect(s).toEqual({ phase1: true, phase2: false, phase3: false, patient_limit: 5, patients_count: 2 });
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
    sb.rpc.mockResolvedValue({
      data: { phase1: true, phase2: false, phase3: false, patient_limit: 5, patients_count: 5 },
      error: null,
    });

    await expect(signUp(SIGNUP)).rejects.toMatchObject({ code: 'CUPO_LLENO' });
    expect(sb.auth.signUp).not.toHaveBeenCalled();
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
