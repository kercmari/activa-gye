import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type Followup, type Invoice, type PatientDetail, type Prescription, type Session } from '../../data';
import { useAuth } from '../../auth/AuthContext';
import { usePhase } from '../../auth/SettingsContext';
import PacientePage from './PacientePage';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../auth/SettingsContext', () => ({ usePhase: vi.fn() }));
vi.mock('../../components/nutri/PlanEditor', () => ({
  default: ({ patientId }: { patientId: string }) => <p>Calendario de prueba {patientId}</p>,
}));
vi.mock('../../components/nutri/TrialProgress', () => ({
  default: () => <p>Progreso de prueba</p>,
}));
vi.mock('../../data', () => ({
  repo: {
    getPatientDetail: vi.fn(),
    listFollowups: vi.fn(),
    addFollowup: vi.fn(),
    listMyInvoices: vi.fn(),
    createInvoice: vi.fn(),
    markInvoicePaid: vi.fn(),
    finishCareRequest: vi.fn(),
    listPrescriptions: vi.fn(),
    getRecipeBalance: vi.fn(),
    listPlanDays: vi.fn(),
  },
}));

const SESSION: Session = {
  user: { id: 'n1', email: 'nutri@activagye.test' },
  profile: {
    id: 'n1', full_name: 'Nutri Prueba', birth_date: null, sex: null, phone: null, sector_id: null,
    goal: null, activity_level: null, role: 'nutricionista', created_at: '2026-01-01', updated_at: '2026-01-01',
  },
};

const DETALLE: PatientDetail = {
  profile: {
    id: 'u1', full_name: 'Ana Pérez', birth_date: '1990-05-10', sex: 'femenino', phone: null, sector_id: null,
    goal: 'bajar_peso', activity_level: 'ligero', role: 'usuario', created_at: '2026-01-01', updated_at: '2026-01-01',
  },
  intake: {
    user_id: 'u1', weight_kg: 70, height_cm: 170, waist_cm: 80, goal: 'bajar_peso', activity_level: 'ligero',
    health_notes: 'Alergia a los mariscos', photo_path: 'u1/foto.jpg', consent_photo: true, consent_at: null,
    created_at: '2026-01-01', updated_at: '2026-01-01',
  },
  photo_url: 'https://ejemplo.test/foto.jpg',
  request: {
    id: 'r1', patient_id: 'u1', nutritionist_id: 'n1', status: 'aceptada', message: null,
    created_at: '2026-01-01T10:00:00Z', accepted_at: '2026-02-01T10:00:00Z', closed_at: null, origin: 'plataforma',
  },
};

const SEGUIMIENTO: Followup = {
  id: 'f1', patient_id: 'u1', nutritionist_id: 'n1', followup_date: '2026-02-10',
  weight_kg: 69.5, waist_cm: 79, observations: 'Buen avance', recommendations: 'Más agua',
  created_at: '2026-02-10T10:00:00Z',
};

const FACTURA: Invoice = {
  id: 'inv1', payer_id: 'u1', payee_id: 'n1', kind: 'consulta', subscription_id: null,
  concept: 'Consulta de seguimiento', amount: 25, status: 'pendiente', payment_reference: null,
  reported_at: null, paid_at: null, created_at: '2026-02-11T10:00:00Z',
};

function renderPage(path = '/nutri/pacientes/u1?tab=ficha') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/nutri/pacientes/:id" element={<PacientePage />} />
        <Route path="/nutri" element={<p>Tablero de prueba</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useAuth).mockReturnValue({ session: SESSION, loading: false, refresh: vi.fn(async () => {}) });
  vi.mocked(usePhase).mockReturnValue(true);
  vi.mocked(repo.getPatientDetail).mockResolvedValue(DETALLE);
  vi.mocked(repo.listFollowups).mockResolvedValue([SEGUIMIENTO]);
  vi.mocked(repo.listMyInvoices).mockResolvedValue([]);
  vi.mocked(repo.listPrescriptions).mockResolvedValue([]);
  vi.mocked(repo.listPlanDays).mockResolvedValue([]);
  vi.mocked(repo.getRecipeBalance).mockResolvedValue({ left: 7, quota: 10, period_end: '2026-12-20' });
});

describe('PacientePage', () => {
  it('muestra la ficha y la foto', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Ana Pérez' })).toBeInTheDocument();
    expect(screen.getByText('70 kg')).toBeInTheDocument();
    expect(screen.getByText('170 cm')).toBeInTheDocument();
    expect(screen.getByText('24.2 · Peso saludable')).toBeInTheDocument();
    expect(screen.getByText('Alergia a los mariscos')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Foto de cuerpo entero del paciente' })).toHaveAttribute(
      'src',
      'https://ejemplo.test/foto.jpg',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Ampliar foto de cuerpo entero' }));
    const dialog = screen.getByRole('dialog', { name: 'Foto ampliada' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog', { name: 'Foto ampliada' })).not.toBeInTheDocument();
  });

  it('agregar seguimiento llama addFollowup y recarga', async () => {
    vi.mocked(repo.addFollowup).mockResolvedValue(SEGUIMIENTO);
    renderPage('/nutri/pacientes/u1?tab=seguimiento');
    await screen.findByRole('heading', { name: 'Ana Pérez' });

    await userEvent.type(screen.getByLabelText('Observaciones'), 'Buen ritmo');
    await userEvent.type(screen.getByLabelText('Recomendaciones'), 'Caminar más');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar seguimiento' }));

    await waitFor(() =>
      expect(repo.addFollowup).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ observations: 'Buen ritmo', recommendations: 'Caminar más' }),
      ),
    );
    await waitFor(() => expect(repo.listFollowups).toHaveBeenCalledTimes(2));
  });

  it('crear factura llama createInvoice', async () => {
    vi.mocked(repo.createInvoice).mockResolvedValue(FACTURA);
    renderPage('/nutri/pacientes/u1?tab=seguimiento');
    await screen.findByRole('heading', { name: 'Ana Pérez' });

    await userEvent.type(screen.getByLabelText('Concepto'), 'Consulta de seguimiento');
    await userEvent.type(screen.getByLabelText('Monto (USD)'), '25');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar factura' }));

    await waitFor(() =>
      expect(repo.createInvoice).toHaveBeenCalledWith({
        patient_id: 'u1',
        concept: 'Consulta de seguimiento',
        amount: 25,
      }),
    );
    expect(await screen.findByText('Factura enviada al paciente')).toBeInTheDocument();
  });

  it('marcar pagada llama markInvoicePaid', async () => {
    vi.mocked(repo.listMyInvoices).mockResolvedValue([FACTURA]);
    vi.mocked(repo.markInvoicePaid).mockResolvedValue(undefined);
    renderPage('/nutri/pacientes/u1?tab=seguimiento');

    await userEvent.click(await screen.findByRole('button', { name: 'Marcar pagada' }));

    expect(repo.markInvoicePaid).toHaveBeenCalledWith('inv1');
  });

  it('paciente inexistente muestra mensaje y Volver', async () => {
    vi.mocked(repo.getPatientDetail).mockResolvedValue(null);
    renderPage('/nutri/pacientes/u1');

    expect(await screen.findByText('No encontramos este paciente o ya no lo atiendes.')).toBeInTheDocument();
    const volver = screen.getByRole('link', { name: 'Volver al tablero' });
    expect(volver).toHaveAttribute('href', '/nutri');
    await userEvent.click(volver);
    expect(await screen.findByText('Tablero de prueba')).toBeInTheDocument();
  });
  it('muestra el origen y las recetas que le quedan', async () => {
    renderPage('/nutri/pacientes/u1');

    expect(await screen.findByText('Recetas: 7 de 10')).toBeInTheDocument();
    expect(screen.getByText('Origen: Plataforma')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Calendario', selected: true })).toBeInTheDocument();
    expect(screen.getByText('Calendario de prueba u1')).toBeInTheDocument();
  });

  it('paciente propio no muestra saldo de recetas', async () => {
    vi.mocked(repo.getPatientDetail).mockResolvedValue({
      ...DETALLE,
      request: { ...DETALLE.request, origin: 'propio' },
    });
    renderPage('/nutri/pacientes/u1');

    expect(await screen.findByText('Paciente propio: no descuenta recetas')).toBeInTheDocument();
    expect(repo.getRecipeBalance).not.toHaveBeenCalled();
  });

  it('la pestaña Recetas lista las recetas y abre el editor de una nueva', async () => {
    const borrador: Prescription = {
      id: 'rx1', patient_id: 'u1', nutritionist_id: 'n1', kind: 'rutina', title: 'Caminatas', body: '',
      status: 'borrador', counts_against_patient: false, delivered_at: null,
      created_at: '2026-11-20T10:00:00Z', updated_at: '2026-11-20T10:00:00Z',
    };
    vi.mocked(repo.listPrescriptions).mockResolvedValue([borrador]);
    renderPage('/nutri/pacientes/u1?tab=recetas');

    expect(await screen.findByText('Caminatas')).toBeInTheDocument();
    expect(screen.getByText('Borrador')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Nueva receta' })[0]);
    expect(screen.getByRole('heading', { name: 'Nueva receta' })).toBeInTheDocument();
  });

  it('la pestaña Recetas muestra vacío con acción', async () => {
    renderPage('/nutri/pacientes/u1?tab=recetas');

    expect(await screen.findByText('Sin recetas')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Nueva receta' })).toHaveLength(1);
  });
});
