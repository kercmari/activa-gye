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

vi.mock('../../lib/image', async () => {
  const { AppError: Err } = await import('../types');
  return {
    downscaleToDataUrl: async (file: File) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Err('FOTO_INVALIDA', 'La foto debe ser JPG, PNG o WebP de hasta 5 MB.');
      }
      return `data:image/jpeg;base64,FOTO-${file.name}`;
    },
  };
});

const repo = accountsPart as Repo;
const PLACE_IDS = ['p1', 'p2'];

const foto = (tipo = 'image/jpeg') => new File(['x'], 'foto.jpg', { type: tipo });

const signUpInput = (email = 'ana@example.com') => ({
  email,
  password: 'clave-segura-1',
  full_name: 'Ana Pérez',
  birth_date: '1995-03-15',
  account_type: 'paciente' as const,
  photo: foto(),
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

describe('registro con tipo de cuenta y foto', () => {
  it('sin foto → FOTO_REQUERIDA y no crea la cuenta', async () => {
    await expectCode(repo.signUp({ ...signUpInput(), photo: undefined }), 'FOTO_REQUERIDA');
    await expectCode(repo.signIn('ana@example.com', 'clave-segura-1'), 'CREDENCIALES');
  });

  it('foto de tipo inválido → FOTO_INVALIDA y no crea la cuenta', async () => {
    await expectCode(repo.signUp({ ...signUpInput(), photo: foto('image/gif') }), 'FOTO_INVALIDA');
    await expectCode(repo.signIn('ana@example.com', 'clave-segura-1'), 'CREDENCIALES');
  });

  it('nutricionista queda pendiente y con rol usuario hasta que el admin aprueba', async () => {
    const session = await repo.signUp({ ...signUpInput('nutri-nueva@example.com'), account_type: 'nutricionista' });
    expect(session.profile.role).toBe('usuario');
    expect(session.profile.requested_role).toBe('nutricionista');
    expect(session.profile.nutri_status).toBe('pendiente');
    expect(session.profile.avatar_path).toBe(`${session.user.id}/avatar.jpg`);
  });

  it('paciente no lleva solicitud de nutricionista', async () => {
    const session = await repo.signUp(signUpInput());
    expect(session.profile.requested_role).toBeFalsy();
    expect(session.profile.nutri_status).toBeFalsy();
  });

  it('uploadAvatar reemplaza la foto; avatarUrl(null) → null', async () => {
    await repo.signUp(signUpInput());
    const perfil = await repo.uploadAvatar(new File(['y'], 'nueva.png', { type: 'image/png' }));
    expect(perfil.avatar_path).toMatch(/\/avatar\.jpg$/);
    expect(await repo.avatarUrl(perfil.avatar_path ?? null)).toBe('data:image/jpeg;base64,FOTO-nueva.png');
    expect(await repo.avatarUrl(null)).toBeNull();
    const fotos = JSON.parse(localStorage.getItem('activa-gye:v1:photos') ?? '[]') as { path: string }[];
    expect(fotos.filter((f) => f.path === perfil.avatar_path)).toHaveLength(1);
  });

  it('admin aprueba una solicitud: cambia rol y estado; sin solicitud → SIN_SOLICITUD', async () => {
    const nueva = await repo.signUp({ ...signUpInput('nutri-ok@example.com'), account_type: 'nutricionista' });
    await repo.signOut();
    await repo.signIn('admin@activagye.test', 'ActivaAdmin2026!');
    const lista = await repo.adminListUsers();
    expect(lista[0].id).toBe(nueva.user.id); // pendientes primero
    expect(lista[0].nutri_status).toBe('pendiente');
    await repo.adminReviewNutri(nueva.user.id, true);
    const despues = (await repo.adminListUsers()).find((u) => u.id === nueva.user.id);
    expect(despues?.role).toBe('nutricionista');
    expect(despues?.nutri_status).toBe('aprobado');
    await expectCode(repo.adminReviewNutri(nueva.user.id, false), 'SIN_SOLICITUD');
  });

  it('admin rechaza: sigue usuario con estado rechazado', async () => {
    const nueva = await repo.signUp({ ...signUpInput('nutri-no@example.com'), account_type: 'nutricionista' });
    await repo.signOut();
    await repo.signIn('admin@activagye.test', 'ActivaAdmin2026!');
    await repo.adminReviewNutri(nueva.user.id, false);
    const despues = (await repo.adminListUsers()).find((u) => u.id === nueva.user.id);
    expect(despues?.role).toBe('usuario');
    expect(despues?.nutri_status).toBe('rechazado');
  });

  it('adminReviewNutri sin ser admin → SOLO_ADMIN', async () => {
    const nueva = await repo.signUp({ ...signUpInput('nutri-x@example.com'), account_type: 'nutricionista' });
    await expectCode(repo.adminReviewNutri(nueva.user.id, true), 'SOLO_ADMIN');
  });
});

