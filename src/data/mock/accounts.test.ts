import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Place, Repo } from '../types';
import { AppError } from '../types';
import { accountsPart } from './accounts';

// Lugares de prueba para favoritos (no depende de la tarea del catálogo).
vi.mock('./catalog', () => {
  const places = [
    { id: 'p1', name: 'Gimnasio Uno', published: true },
    { id: 'p2', name: 'Piscina Dos', published: true },
  ];
  return {
    catalogPart: {
      getPlaces: async (ids: string[]) => places.filter((p) => ids.includes(p.id)),
    },
  };
});

vi.mock('../../lib/image', () => ({
  downscaleToDataUrl: async () => 'data:image/jpeg;base64,FOTO',
}));

const repo = accountsPart as Repo;
const PLACE_IDS = ['p1', 'p2'];

const signUpInput = (email = 'ana@example.com') => ({
  email,
  password: 'clave-segura-1',
  full_name: 'Ana Pérez',
  birth_date: '1995-03-15',
});

async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  const err = await promise.then(() => null, (e: unknown) => e);
  expect(err).toBeInstanceOf(AppError);
  expect((err as AppError).code).toBe(code);
}

beforeEach(() => {
  localStorage.clear();
});

describe('cuentas', () => {
  it('registro inicia sesión y crea perfil usuario', async () => {
    const session = await repo.signUp(signUpInput());
    expect(session.user.email).toBe('ana@example.com');
    expect(session.profile.role).toBe('usuario');
    expect(session.profile.full_name).toBe('Ana Pérez');
    expect((await repo.getSession())?.user.id).toBe(session.user.id);
  });

  it('rechaza menor de 16', async () => {
    await expectCode(repo.signUp({ ...signUpInput(), birth_date: '2015-01-01' }), 'MENOR_DE_16');
  });

  it('rechaza correo repetido', async () => {
    await repo.signUp(signUpInput());
    await repo.signOut();
    await expectCode(repo.signUp(signUpInput()), 'CORREO_EN_USO');
  });

  it('ingreso con contraseña mala falla', async () => {
    await repo.signUp(signUpInput());
    await repo.signOut();
    await expectCode(repo.signIn('ana@example.com', 'otra-clave-mala'), 'CREDENCIALES');
  });

  it('updateProfile no cambia el rol', async () => {
    await repo.signUp(signUpInput());
    const profile = await repo.updateProfile({ full_name: 'Ana María Pérez', phone: '0991234567', role: 'admin' } as never);
    expect(profile.full_name).toBe('Ana María Pérez');
    expect(profile.role).toBe('usuario');
  });

  it('cuentas de prueba existen y entran', async () => {
    const admin = await repo.signIn('admin@activagye.test', 'ActivaAdmin2026!');
    expect(admin.profile.role).toBe('admin');
    await repo.signOut();

    const nutri = await repo.signIn('nutri@activagye.test', 'ActivaNutri2026!');
    expect(nutri.profile.role).toBe('nutricionista');
    await repo.signOut();

    const usuario = await repo.signIn('usuario@activagye.test', 'ActivaUser2026!');
    expect(usuario.profile.role).toBe('usuario');
    expect(usuario.profile.birth_date).toBe('2000-05-10');
    expect(usuario.profile.goal).toBe('bajar_peso');
    const progress = await repo.listProgress();
    expect(progress).toHaveLength(4);
    expect(progress[0].weight_kg).toBe(78);
    expect(progress[3].weight_kg).toBe(76.5);
  });

  it('deleteMyAccount borra todo y cierra sesión', async () => {
    const session = await repo.signUp(signUpInput());
    await repo.addProgress({ entry_date: '2026-01-05', weight_kg: 70, active_minutes: null, activity: null, note: null });
    await repo.toggleFavorite('p1');

    await repo.deleteMyAccount();

    expect(await repo.getSession()).toBeNull();
    const uid = session.user.id;
    const tables = ['users', 'favorites', 'progress_entries', 'photos'];
    for (const t of tables) {
      const raw = localStorage.getItem(`activa-gye:v1:${t}`) ?? '[]';
      expect(raw).not.toContain(uid);
    }
  });
});

describe('perfil y progreso', () => {
  it('progreso: agrega, lista ordenado y valida peso', async () => {
    await repo.signUp(signUpInput());
    await repo.addProgress({ entry_date: '2026-02-10', weight_kg: 69, active_minutes: null, activity: null, note: null });
    await repo.addProgress({ entry_date: '2026-01-05', weight_kg: 71, active_minutes: 30, activity: 'Caminata', note: null });

    const list = await repo.listProgress();
    expect(list.map((p) => p.entry_date)).toEqual(['2026-01-05', '2026-02-10']);

    await expectCode(
      repo.addProgress({ entry_date: '2026-03-01', weight_kg: 5, active_minutes: null, activity: null, note: null }),
      'DATOS_INVALIDOS',
    );
  });

  it('favoritos: alterna', async () => {
    await repo.signUp(signUpInput());
    expect(await repo.isFavorite('p1')).toBe(false);
    expect(await repo.toggleFavorite('p1')).toBe(true);
    expect(await repo.isFavorite('p1')).toBe(true);
    expect((await repo.listFavorites()).map((p: Place) => p.id)).toEqual(['p1']);
    expect(await repo.toggleFavorite('p1')).toBe(false);
    expect(await repo.isFavorite('p1')).toBe(false);
    expect(PLACE_IDS).toContain('p2');
  });
});

describe('revisión R1/R2: datos y cuenta', () => {
  it('R1 admin: usuario normal ve el mensaje SOLO_ADMIN igual que el catálogo', async () => {
    await repo.signUp(signUpInput('normal@example.com'));
    const err = await repo.adminListUsers().then(() => null, (e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe('SOLO_ADMIN');
    expect((err as AppError).message).toBe('Solo el administrador puede hacer esto.');
  });

  it('R2 cuenta de nutricionista de prueba no se llama "Demo"', async () => {
    const nutri = await repo.signIn('nutri@activagye.test', 'ActivaNutri2026!');
    expect(nutri.profile.full_name).not.toMatch(/demo/i);
  });
});
