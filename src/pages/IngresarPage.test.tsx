import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type Session } from '../data';
import { AppError } from '../data/types';
import { useAuth } from '../auth/AuthContext';
import IngresarPage, { esBaseLocal } from './IngresarPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../data', () => ({
  repo: { signIn: vi.fn() },
}));

const SESSION: Session = {
  user: { id: 'u1', email: 'usuario@activagye.test' },
  profile: {
    id: 'u1', full_name: 'Usuario de prueba', birth_date: null, sex: null, phone: null, sector_id: null,
    goal: null, activity_level: null, role: 'usuario', created_at: '2026-01-01', updated_at: '2026-01-01',
  },
};

/** La guarda de invitados se prueba aparte: aquí solo importa la lógica de la página. */
function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/ingresar" element={<IngresarPage />} />
        <Route path="/registro" element={<p>PANTALLA REGISTRO</p>} />
        <Route path="/lugares/:id" element={<p>PANTALLA LUGAR</p>} />
        <Route path="/perfil" element={<p>PANTALLA PERFIL</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Correo electrónico'), 'usuario@activagye.test');
  await user.type(screen.getByLabelText('Contraseña'), 'ActivaUser2026!');
  await user.click(screen.getByRole('button', { name: 'Ingresar' }));
}

describe('esBaseLocal', () => {
  it('es base local sin URL o con host local', () => {
    expect(esBaseLocal(undefined)).toBe(true);
    expect(esBaseLocal('http://127.0.0.1:54321')).toBe(true);
    expect(esBaseLocal('http://localhost:54321')).toBe(true);
  });

  it('no es base local con la URL de la nube', () => {
    expect(esBaseLocal('https://abc.supabase.co')).toBe(false);
  });
});

describe('IngresarPage', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('muestra las cuentas de prueba en la base local', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321');
    renderAt('/ingresar');
    expect(screen.getByText('Cuentas de prueba')).toBeInTheDocument();
  });

  it('no muestra las cuentas de prueba con la URL de la nube', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co');
    renderAt('/ingresar');
    expect(screen.queryByText('Cuentas de prueba')).not.toBeInTheDocument();
  });

  it('CORREO_SIN_CONFIRMAR se muestra como aviso, no como error', async () => {
    vi.mocked(repo.signIn).mockRejectedValue(new AppError('CORREO_SIN_CONFIRMAR', 'Revisa tu correo para confirmar la cuenta y luego inicia sesión.'));
    const user = userEvent.setup();
    renderAt('/ingresar');
    await fillAndSubmit(user);
    expect(await screen.findByRole('status')).toHaveTextContent('Revisa tu correo para confirmar la cuenta');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ session: null, loading: false, refresh: vi.fn(async () => {}) });
    vi.mocked(repo.signIn).mockReset();
    vi.mocked(repo.signIn).mockResolvedValue(SESSION);
  });

  it('ingresa y va a volver si es ruta interna', async () => {
    const user = userEvent.setup();
    renderAt('/ingresar?volver=/lugares/abc');
    await fillAndSubmit(user);
    expect(await screen.findByText('PANTALLA LUGAR')).toBeInTheDocument();
    expect(repo.signIn).toHaveBeenCalledWith('usuario@activagye.test', 'ActivaUser2026!');
  });

  it('ignora volver externo (//evil.com) y va a /perfil', async () => {
    const user = userEvent.setup();
    renderAt('/ingresar?volver=//evil.com');
    await fillAndSubmit(user);
    expect(await screen.findByText('PANTALLA PERFIL')).toBeInTheDocument();
  });

  it('muestra error de credenciales', async () => {
    vi.mocked(repo.signIn).mockRejectedValue(new AppError('CREDENCIALES', 'Correo o contraseña incorrectos.'));
    const user = userEvent.setup();
    renderAt('/ingresar');
    await fillAndSubmit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
  });
});
