import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type CareRequest, type Session } from '../../data';
import { useAuth } from '../../auth/AuthContext';
import { usePhase } from '../../auth/SettingsContext';
import SolicitudesPage from './SolicitudesPage';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../auth/SettingsContext', () => ({ usePhase: vi.fn() }));
vi.mock('../../data', () => ({
  repo: {
    listOpenCareRequests: vi.fn(),
    acceptCareRequest: vi.fn(),
  },
}));

const SESSION: Session = {
  user: { id: 'n1', email: 'nutri@activagye.test' },
  profile: {
    id: 'n1', full_name: 'Nutri Prueba', birth_date: null, sex: null, phone: null, sector_id: null,
    goal: null, activity_level: null, role: 'nutricionista', created_at: '2026-01-01', updated_at: '2026-01-01',
  },
};

const SOLICITUD: CareRequest = {
  id: 'r1',
  patient_id: 'u1',
  nutritionist_id: null,
  status: 'abierta',
  message: 'Quiero bajar de peso',
  origin: 'plataforma',
  created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  accepted_at: null,
  closed_at: null,
  patient_name: 'Ana Pérez',
  patient_age: 34,
  patient_sex: 'femenino',
  patient_goal: 'bajar_peso',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/nutri/solicitudes']}>
      <Routes>
        <Route path="/nutri/solicitudes" element={<SolicitudesPage />} />
        <Route path="/nutri/pacientes/:id" element={<p>Ficha del paciente</p>} />
        <Route path="/nutri/suscripcion" element={<p>Mi suscripción de prueba</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Error de negocio como lo entrega el repositorio (AppError). */
function businessError(code: string, message: string) {
  return Object.assign(new Error(message), { name: 'AppError', code });
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ session: SESSION, loading: false, refresh: vi.fn(async () => {}) });
  vi.mocked(usePhase).mockReturnValue(true);
  vi.mocked(repo.listOpenCareRequests).mockResolvedValue([SOLICITUD]);
  vi.mocked(repo.acceptCareRequest).mockReset();
});

describe('SolicitudesPage', () => {
  it('aceptar navega a la ficha del paciente', async () => {
    vi.mocked(repo.acceptCareRequest).mockResolvedValue(undefined);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Aceptar' }));

    expect(repo.acceptCareRequest).toHaveBeenCalledWith('r1');
    expect(await screen.findByText('Ficha del paciente')).toBeInTheDocument();
  });

  it('YA_TOMADA quita la tarjeta y avisa', async () => {
    vi.mocked(repo.acceptCareRequest).mockRejectedValue(
      businessError('YA_TOMADA', 'Otro nutricionista ya la aceptó.'),
    );
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Aceptar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Otro nutricionista ya la aceptó.');
    await waitFor(() => expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Aceptar' })).not.toBeInTheDocument();
  });
});
