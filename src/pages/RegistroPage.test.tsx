import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type Session } from '../data';
import { AppError } from '../data/types';
import { AuthProvider } from '../auth/AuthContext';
import RegistroPage from './RegistroPage';

const ajustes = vi.hoisted(() => ({
  settings: { phase1: true, phase2: false, phase3: false, patient_limit: 5, patients_count: 0 },
}));

vi.mock('../auth/SettingsContext', () => ({
  useSettings: () => ({ settings: ajustes.settings, loading: false, reload: async () => {} }),
}));

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
  return <p>PANEL:{loc.pathname}</p>;
}

function renderPage() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/registro']}>
        <Routes>
          <Route path="/registro" element={<RegistroPage />} />
          <Route path="/mi-panel" element={<LocationProbe />} />
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
    ajustes.settings = { phase1: true, phase2: false, phase3: false, patient_limit: 5, patients_count: 0 };
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

  it('registro exitoso navega a /mi-panel', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillBase(user, 'Clave-segura-1');
    await user.click(screen.getByLabelText('Acepto los términos y la política de privacidad'));
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText('PANEL:/mi-panel')).toBeInTheDocument();
    expect(repo.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ana@correo.com', full_name: 'Ana Pérez', birth_date: '2000-05-10' }),
    );
  });

  it('cupo lleno deshabilita Crear cuenta', async () => {
    ajustes.settings = { phase1: true, phase2: false, phase3: false, patient_limit: 5, patients_count: 5 };
    renderPage();
    expect(screen.getByText('Por ahora no hay cupos para nuevos pacientes.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeDisabled();
    expect(repo.signUp).not.toHaveBeenCalled();
  });

  it('muestra los cupos disponibles cuando la fase 3 está apagada', async () => {
    ajustes.settings = { phase1: true, phase2: false, phase3: false, patient_limit: 5, patients_count: 2 };
    renderPage();
    expect(screen.getByText('Cupos disponibles: 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeEnabled();
  });

  it('CORREO_SIN_CONFIRMAR muestra el aviso con role status y el enlace a ingresar', async () => {
    vi.mocked(repo.signUp).mockRejectedValue(new AppError('CORREO_SIN_CONFIRMAR', 'Revisa tu correo para confirmar la cuenta y luego inicia sesión.'));
    const user = userEvent.setup();
    renderPage();
    await fillBase(user, 'Clave-segura-1');
    await user.click(screen.getByLabelText('Acepto los términos y la política de privacidad'));
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Revisa tu correo para confirmar la cuenta');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a ingresar' })).toHaveAttribute('href', '/ingresar');
  });
});
