import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, repo, type PatientSummary, type Session } from '../../data';
import { useAuth } from '../../auth/AuthContext';
import { usePhase } from '../../auth/SettingsContext';
import MisPacientesPage from './MisPacientesPage';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../auth/SettingsContext', () => ({ usePhase: vi.fn() }));
vi.mock('../../data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data')>();
  return { ...actual, repo: { listMyPatients: vi.fn(), nutriAddPatient: vi.fn() } };
});

const SESSION: Session = {
  user: { id: 'n1', email: 'nutri@vitgo.test' },
  profile: {
    id: 'n1', full_name: 'Nutri Prueba', birth_date: null, sex: null, phone: null, sector_id: null,
    goal: null, activity_level: null, role: 'nutricionista', created_at: '2026-01-01', updated_at: '2026-01-01',
  },
};

const PACIENTES: PatientSummary[] = [
  {
    patient_id: 'p1', full_name: 'Ana Paciente', age: 30, sex: null, request_id: 'r1', accepted_at: '2026-11-01T00:00:00Z',
    days_total: 7, days_done: 3, last_followup_date: '2026-11-20', origin: 'plataforma', recipes_left: 6,
  },
  {
    patient_id: 'p2', full_name: 'Luis Propio', age: 40, sex: null, request_id: 'r2', accepted_at: '2026-11-02T00:00:00Z',
    days_total: 0, days_done: 0, last_followup_date: null, origin: 'propio', recipes_left: null,
  },
];

function Destino() {
  const loc = useLocation();
  return <p>Destino {loc.pathname}{loc.search}</p>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/nutri/pacientes']}>
      <Routes>
        <Route path="/nutri/pacientes" element={<MisPacientesPage />} />
        <Route path="/nutri/pacientes/:id" element={<Destino />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usePhase).mockReturnValue(true);
  vi.mocked(useAuth).mockReturnValue({ session: SESSION } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(repo.listMyPatients).mockResolvedValue(PACIENTES);
});

describe('MisPacientesPage', () => {
  it('lista pacientes con origen, recetas y enlace a la ficha', async () => {
    renderPage();
    expect(await screen.findByText('Ana Paciente')).toBeInTheDocument();
    expect(screen.getByText('Plataforma')).toBeInTheDocument();
    expect(screen.getByText('Propio')).toBeInTheDocument();
    expect(screen.getByText('Recetas restantes: 6')).toBeInTheDocument();
    expect(screen.getByText('No descuenta recetas del paciente')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Ver ficha' })[0]).toHaveAttribute('href', '/nutri/pacientes/p1');
  });

  it('agregar paciente feliz navega a la ficha en la pestaña de recetas', async () => {
    vi.mocked(repo.nutriAddPatient).mockResolvedValue({ patient_id: 'p9', prescription_id: 'r9' });
    renderPage();
    await screen.findByText('Ana Paciente');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar paciente' }));
    await userEvent.type(screen.getByLabelText('Correo del paciente'), 'nueva@correo.com');
    await userEvent.click(screen.getAllByRole('button', { name: 'Agregar paciente' }).at(-1)!);
    expect(repo.nutriAddPatient).toHaveBeenCalledWith('nueva@correo.com');
    expect(await screen.findByText('Destino /nutri/pacientes/p9?tab=recetas')).toBeInTheDocument();
  });

  it('PACIENTE_NO_REGISTRADO muestra el texto y el botón para copiar el enlace', async () => {
    vi.mocked(repo.nutriAddPatient).mockRejectedValue(
      new AppError('PACIENTE_NO_REGISTRADO', 'No hay una cuenta con ese correo. Pídele que se registre y vuelve a agregarlo.'),
    );
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderPage();
    await screen.findByText('Ana Paciente');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar paciente' }));
    await userEvent.type(screen.getByLabelText('Correo del paciente'), 'sin@cuenta.com');
    await userEvent.click(screen.getAllByRole('button', { name: 'Agregar paciente' }).at(-1)!);
    expect(await screen.findByText(/No hay una cuenta con ese correo/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Copiar enlace de registro' }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/registro?tipo=paciente`),
    );
  });

  it('CUPO_PLAN_LLENO muestra su texto', async () => {
    vi.mocked(repo.nutriAddPatient).mockRejectedValue(
      new AppError('CUPO_PLAN_LLENO', 'Llegaste al máximo de pacientes de tu plan. Mejora tu plan para agregar más.'),
    );
    renderPage();
    await screen.findByText('Ana Paciente');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar paciente' }));
    await userEvent.type(screen.getByLabelText('Correo del paciente'), 'otra@correo.com');
    await userEvent.click(screen.getAllByRole('button', { name: 'Agregar paciente' }).at(-1)!);
    expect(await screen.findByText(/Llegaste al máximo de pacientes de tu plan/)).toBeInTheDocument();
  });

  it('rechaza un correo mal escrito sin llamar al repo', async () => {
    renderPage();
    await screen.findByText('Ana Paciente');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar paciente' }));
    await userEvent.type(screen.getByLabelText('Correo del paciente'), 'no-es-correo');
    await userEvent.click(screen.getAllByRole('button', { name: 'Agregar paciente' }).at(-1)!);
    expect(await screen.findByText(/Escribe un correo válido/)).toBeInTheDocument();
    expect(repo.nutriAddPatient).not.toHaveBeenCalled();
  });

  it('sin pacientes muestra vacío con acción y error con Reintentar', async () => {
    vi.mocked(repo.listMyPatients).mockResolvedValueOnce([]);
    const { unmount } = renderPage();
    expect(await screen.findByText('Aún no tienes pacientes.')).toBeInTheDocument();
    unmount();

    vi.mocked(repo.listMyPatients).mockRejectedValueOnce(new Error('caída'));
    renderPage();
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
