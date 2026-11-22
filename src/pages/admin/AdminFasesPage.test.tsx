import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import AdminFasesPage from './AdminFasesPage';

const h = vi.hoisted(() => ({
  repo: {
    getSettings: vi.fn(),
    adminSaveSettings: vi.fn(),
  },
  reload: vi.fn(async () => {}),
}));

vi.mock('../../data', () => ({ repo: h.repo }));
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'yo', email: 'yo@activagye.test' }, profile: { role: 'admin' } },
    loading: false,
    refresh: async () => {},
  }),
}));
vi.mock('../../auth/SettingsContext', () => ({
  useSettings: () => ({
    settings: { phase1: true, phase2: false, phase3: false, patient_limit: 5, patients_count: 2 },
    loading: false,
    reload: h.reload,
  }),
}));

const AJUSTES = { phase1: true, phase2: false, phase3: false, patient_limit: 5, patients_count: 2 };

beforeEach(() => {
  vi.clearAllMocks();
  h.repo.getSettings.mockResolvedValue(AJUSTES);
  h.repo.adminSaveSettings.mockImplementation(async (input: object) => ({ ...AJUSTES, ...input }));
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminFasesPage />
    </MemoryRouter>,
  );
}

describe('AdminFasesPage', () => {
  it('muestra las 3 fases con su estado', async () => {
    renderPage();

    expect(await screen.findByText('Fase 1 · Ingreso y ficha del paciente')).toBeInTheDocument();
    expect(screen.getByText('Fase 2 · Nutricionista')).toBeInTheDocument();
    expect(screen.getByText('Fase 3 · Para todos')).toBeInTheDocument();
    expect(screen.getByLabelText('Fase 1 · Ingreso y ficha del paciente')).toBeChecked();
    expect(screen.getByLabelText('Fase 2 · Nutricionista')).not.toBeChecked();
    expect(screen.getByLabelText('Fase 3 · Para todos')).not.toBeChecked();
    expect(screen.getByText('Pacientes registrados: 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Cupo de pacientes (mientras la fase 3 está apagada)')).toHaveValue(5);
  });

  it('guardar llama adminSaveSettings con los valores marcados', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Fase 2 · Nutricionista');
    await user.click(screen.getByLabelText('Fase 2 · Nutricionista'));
    const cupo = screen.getByLabelText('Cupo de pacientes (mientras la fase 3 está apagada)');
    await user.clear(cupo);
    await user.type(cupo, '40');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() =>
      expect(h.repo.adminSaveSettings).toHaveBeenCalledWith({
        phase1: true,
        phase2: true,
        phase3: false,
        patient_limit: 40,
      }),
    );
    expect(await screen.findByText('Cambios guardados')).toBeInTheDocument();
    expect(h.reload).toHaveBeenCalled();
  });

  it('avisa si se apaga la fase 1', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Fase 1 · Ingreso y ficha del paciente');
    await user.click(screen.getByLabelText('Fase 1 · Ingreso y ficha del paciente'));
    expect(screen.getByText('Si apagas la fase 1, los pacientes no podrán guardar su ficha.')).toBeInTheDocument();
  });

  it('muestra error con Reintentar si no carga', async () => {
    h.repo.getSettings.mockRejectedValueOnce(new Error('sin red'));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Algo salió mal. Inténtalo de nuevo.');
    h.repo.getSettings.mockResolvedValueOnce(AJUSTES);
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Fase 2 · Nutricionista')).toBeInTheDocument();
  });
});
