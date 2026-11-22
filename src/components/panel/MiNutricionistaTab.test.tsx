import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, AppError, type CareRequest, type NutritionistPublic, type Session } from '../../data';
import { useAuth } from '../../auth/AuthContext';
import MiNutricionistaTab from './MiNutricionistaTab';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../data', () => ({
  repo: {
    getMyCareRequest: vi.fn(),
    requestCare: vi.fn(),
    cancelMyCareRequest: vi.fn(),
    getMyNutritionist: vi.fn(),
    listFollowups: vi.fn(),
  },
  AppError: class AppError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
      this.name = 'AppError';
    }
  },
}));

const SESSION: Session = {
  user: { id: 'u1', email: 'ana@activagye.test' },
  profile: {
    id: 'u1', full_name: 'Ana Pérez', birth_date: '2000-05-10', sex: 'femenino', phone: null, sector_id: null,
    goal: null, activity_level: null, role: 'usuario', created_at: '2026-01-01', updated_at: '2026-01-01',
  },
};

const ABIERTA: CareRequest = {
  id: 'c1', patient_id: 'u1', nutritionist_id: null, status: 'abierta', message: null,
  created_at: '2026-11-20T10:00:00Z', accepted_at: null, closed_at: null,
};

const ACEPTADA: CareRequest = {
  ...ABIERTA, nutritionist_id: 'n1', status: 'aceptada', accepted_at: '2026-11-21T09:00:00Z',
};

const NUTRI: NutritionistPublic = { id: 'n1', full_name: 'Carla Vélez', rating: { average: 4.5, count: 12 } };

function renderTab() {
  return render(
    <MemoryRouter>
      <MiNutricionistaTab />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ session: SESSION, loading: false, refresh: vi.fn(async () => {}) });
  vi.mocked(repo.getMyCareRequest).mockResolvedValue(null);
  vi.mocked(repo.requestCare).mockResolvedValue(ABIERTA);
  vi.mocked(repo.cancelMyCareRequest).mockResolvedValue(undefined);
  vi.mocked(repo.getMyNutritionist).mockResolvedValue(NUTRI);
  vi.mocked(repo.listFollowups).mockResolvedValue([]);
});

describe('MiNutricionistaTab', () => {
  it('sin solicitud, solicitar llama requestCare', async () => {
    renderTab();
    await userEvent.type(await screen.findByLabelText(/Mensaje para el nutricionista/), 'Quiero bajar de peso');
    await userEvent.click(screen.getByRole('button', { name: 'Solicitar nutricionista' }));

    await waitFor(() => expect(repo.requestCare).toHaveBeenCalledWith('Quiero bajar de peso'));
  });

  it('FALTA_FICHA muestra Primero llena tu ficha', async () => {
    vi.mocked(repo.requestCare).mockRejectedValue(new AppError('FALTA_FICHA', 'Llena tu ficha antes de pedir.'));
    renderTab();
    await userEvent.click(await screen.findByRole('button', { name: 'Solicitar nutricionista' }));

    expect(await screen.findByText('Primero llena tu ficha')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir mi ficha' })).toHaveAttribute('href', '/mi-panel?tab=ficha');
  });

  it('aceptada muestra el nombre del nutricionista', async () => {
    vi.mocked(repo.getMyCareRequest).mockResolvedValue(ACEPTADA);
    renderTab();

    expect(await screen.findByText('Carla Vélez')).toBeInTheDocument();
    expect(screen.getByText('★ 4,5 (12)')).toBeInTheDocument();
    expect(await screen.findByText('Tu nutricionista aún no registra seguimientos.')).toBeInTheDocument();
  });
});
