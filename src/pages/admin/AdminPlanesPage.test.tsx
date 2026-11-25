import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import AdminPlanesPage from './AdminPlanesPage';

/** Error con nombre AppError: errorMessage muestra su texto (el resto muestra un mensaje genérico). */
function appError(message: string): Error {
  const e = new Error(message);
  e.name = 'AppError';
  return e;
}

const h = vi.hoisted(() => ({
  repo: {
    listPlans: vi.fn(),
    adminSavePlan: vi.fn(),
    getSettings: vi.fn(),
    adminSaveContactSettings: vi.fn(),
    adminSubscriptionsOverview: vi.fn(),
  },
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
  usePhase: (n: number) => n === 1,
  useSettings: () => ({
    settings: { phase1: true, phase2: false, phase3: false, patient_limit: 5, patients_count: 2 },
    loading: false,
    reload: async () => {},
  }),
}));

const STARTER = {
  id: 'p-1',
  name: 'Starter',
  monthly_price: 9,
  patient_quota: 15,
  active: true,
  sort: 1,
  daily_record_limit: 60,
  recipe_quota: null,
  features: ['Hasta 15 pacientes', 'Hasta 60 registros por día'],
};

const SETTINGS = {
  phase1: true,
  phase2: false,
  phase3: false,
  patient_limit: 5,
  patients_count: 2,
  admin_email: 'kerlyeliz19@gmail.com',
  free_patient_limit: 3,
  free_daily_record_limit: 10,
};

beforeEach(() => {
  vi.clearAllMocks();
  h.repo.listPlans.mockResolvedValue([STARTER]);
  h.repo.getSettings.mockResolvedValue(SETTINGS);
  h.repo.adminSavePlan.mockImplementation(async (input: unknown) => input);
  h.repo.adminSaveContactSettings.mockResolvedValue(SETTINGS);
  h.repo.adminSubscriptionsOverview.mockResolvedValue({ pending: [], active: [] });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPlanesPage />
    </MemoryRouter>,
  );
}

async function abrirEdicionStarter() {
  const user = userEvent.setup();
  renderPage();
  await user.click(await screen.findByRole('button', { name: 'Editar Starter' }));
  return { user, form: screen.getByRole('form', { name: 'Editar plan Starter' }) };
}

describe('AdminPlanesPage', () => {
  it('guarda un plan con los campos nuevos y las líneas de textos', async () => {
    const { user, form } = await abrirEdicionStarter();

    const precio = within(form).getByLabelText('Precio mensual (USD)');
    await user.clear(precio);
    await user.type(precio, '12.5');
    await user.clear(within(form).getByLabelText('Registros por día'));
    await user.type(within(form).getByLabelText('Registros por día'), '80');
    await user.type(within(form).getByLabelText('Textos de la tarjeta'), '\nAtención prioritaria');
    await user.click(within(form).getByRole('button', { name: 'Guardar plan' }));

    await waitFor(() => expect(h.repo.adminSavePlan).toHaveBeenCalledTimes(1));
    expect(h.repo.adminSavePlan).toHaveBeenCalledWith({
      id: 'p-1',
      name: 'Starter',
      monthly_price: 12.5,
      patient_quota: 15,
      daily_record_limit: 80,
      recipe_quota: null,
      features: ['Hasta 15 pacientes', 'Hasta 60 registros por día', 'Atención prioritaria'],
      active: true,
      sort: 1,
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Plan «Starter» guardado.');
  });

  it('rechaza un precio negativo junto al campo y no guarda', async () => {
    const { user, form } = await abrirEdicionStarter();

    const precio = within(form).getByLabelText('Precio mensual (USD)');
    await user.clear(precio);
    await user.type(precio, '-3');
    await user.click(within(form).getByRole('button', { name: 'Guardar plan' }));

    expect(within(form).getByText('El precio no puede ser negativo. Escribe 0 o más.')).toBeInTheDocument();
    expect(h.repo.adminSavePlan).not.toHaveBeenCalled();
  });

  it('muestra el error del servidor si guardar falla', async () => {
    const { user, form } = await abrirEdicionStarter();
    h.repo.adminSavePlan.mockRejectedValueOnce(appError('No se pudo guardar el plan'));

    await user.click(within(form).getByRole('button', { name: 'Guardar plan' }));
    expect(await within(form).findByRole('alert')).toHaveTextContent('No se pudo guardar el plan');
  });

  it('guarda el correo de la administración y los cupos del plan gratis', async () => {
    const user = userEvent.setup();
    renderPage();
    const form = await screen.findByRole('form', { name: 'Plan gratis y correo' });

    const correo = within(form).getByLabelText('Correo de la administración');
    await user.clear(correo);
    await user.type(correo, 'otra@correo.test');
    await user.clear(within(form).getByLabelText('Pacientes del plan gratis'));
    await user.type(within(form).getByLabelText('Pacientes del plan gratis'), '5');
    await user.click(within(form).getByRole('button', { name: 'Guardar correo y plan gratis' }));

    await waitFor(() => expect(h.repo.adminSaveContactSettings).toHaveBeenCalledWith({
      admin_email: 'otra@correo.test',
      free_patient_limit: 5,
      free_daily_record_limit: 10,
    }));
  });

  it('rechaza un correo inválido junto al campo y no guarda', async () => {
    const user = userEvent.setup();
    renderPage();
    const form = await screen.findByRole('form', { name: 'Plan gratis y correo' });

    const correo = within(form).getByLabelText('Correo de la administración');
    await user.clear(correo);
    await user.type(correo, 'sin-arroba');
    await user.click(within(form).getByRole('button', { name: 'Guardar correo y plan gratis' }));

    expect(within(form).getByText('Escribe un correo válido, por ejemplo nombre@correo.com.')).toBeInTheDocument();
    expect(h.repo.adminSaveContactSettings).not.toHaveBeenCalled();
  });

  it('si la lista de planes falla, muestra el error con «Reintentar»', async () => {
    const user = userEvent.setup();
    h.repo.listPlans.mockRejectedValueOnce(appError('Sin conexión'));
    renderPage();

    expect(await screen.findByText('Sin conexión')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('button', { name: 'Editar Starter' })).toBeInTheDocument();
  });
});
