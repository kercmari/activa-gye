import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type Session } from '../data';
import { AuthProvider } from '../auth/AuthContext';
import RegistroPage from './RegistroPage';

vi.mock('../data', () => ({
  repo: { getSession: vi.fn(), onAuthChange: vi.fn(() => () => {}), signUp: vi.fn() },
}));

const SESSION: Session = {
  user: { id: 'u2', email: 'ana@correo.com' },
  profile: {
    id: 'u2', full_name: 'Ana Pérez', birth_date: '2000-05-10', sex: null, phone: null, sector_id: null,
    goal: null, activity_level: null, role: 'usuario', created_at: '2026-01-01', updated_at: '2026-01-01',
  },
};

let current: Session | null = null;

function LocationProbe() {
  const loc = useLocation();
  return <p>PERFIL:{loc.search}</p>;
}

function renderPage() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/registro']}>
        <Routes>
          <Route path="/registro" element={<RegistroPage />} />
          <Route path="/perfil" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

async function fillBase(user: ReturnType<typeof userEvent.setup>, confirm: string) {
  await user.type(screen.getByLabelText('Nombre completo'), 'Ana Pérez');
  await user.type(screen.getByLabelText('Correo electrónico'), 'ana@correo.com');
  await user.type(screen.getByLabelText('Contraseña'), 'Clave-segura-1');
  await user.type(screen.getByLabelText('Confirmar contraseña'), confirm);
  fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '2000-05-10' } });
}

describe('RegistroPage', () => {
  beforeEach(() => {
    current = null;
    vi.mocked(repo.getSession).mockImplementation(async () => current);
    vi.mocked(repo.signUp).mockReset();
    vi.mocked(repo.signUp).mockImplementation(async () => {
      current = SESSION;
      return SESSION;
    });
  });

  it('valida contraseñas distintas y términos sin llamar a signUp', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillBase(user, 'otra-clave-2');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(screen.getByText('Debes aceptar los términos y la política de privacidad para continuar.')).toBeInTheDocument();
    expect(repo.signUp).not.toHaveBeenCalled();
  });

  it('registro exitoso navega a /perfil?bienvenida=1', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillBase(user, 'Clave-segura-1');
    await user.click(screen.getByLabelText('Acepto los términos y la política de privacidad'));
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText('PERFIL:?bienvenida=1')).toBeInTheDocument();
    expect(repo.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ana@correo.com', full_name: 'Ana Pérez', birth_date: '2000-05-10' }),
    );
  });
});
