import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import AdminPlantillaPage from './AdminPlantillaPage';
import type { PlanTemplate, PlanTemplateItem } from '../../data';

const h = vi.hoisted(() => ({
  repo: {
    adminGetTemplate: vi.fn(),
    adminSaveTemplate: vi.fn(),
    adminDeleteTemplate: vi.fn(),
    adminSaveTemplateItem: vi.fn(),
    adminDeleteTemplateItem: vi.fn(),
  },
}));

vi.mock('../../data', () => ({ repo: h.repo }));
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'yo', email: 'yo@activagye.test' }, profile: { role: 'nutricionista' } },
    loading: false,
    refresh: async () => {},
  }),
}));

const template: PlanTemplate = {
  id: 't1',
  name: 'Plan mantenimiento',
  description: null,
  sex: 'cualquiera',
  age_min: 18,
  age_max: 65,
  bmi_min: 18.5,
  bmi_max: 25,
  goal: null,
  kcal_base: 1800,
  author_name: 'Lic. Ana Torres',
  status: 'borrador',
  is_fallback: false,
  items_count: 2,
};

const item = (over: Partial<PlanTemplateItem>): PlanTemplateItem => ({
  id: 'i1',
  template_id: 't1',
  day_number: 1,
  at_time: '08:00',
  kind: 'comida',
  title: 'Desayuno',
  detail: null,
  sort: 1,
  ...over,
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/plantillas/:id" element={<AdminPlantillaPage />} />
        <Route path="/admin/plantillas" element={<p>Lista de plantillas</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AdminPlantillaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.repo.adminGetTemplate.mockImplementation(async (id: string) =>
      id === 't1' ? { template, items: [item({}), item({ id: 'i2', at_time: '13:00', title: 'Almuerzo', sort: 2 })] } : null,
    );
    h.repo.adminSaveTemplateItem.mockResolvedValue(item({}));
    h.repo.adminSaveTemplate.mockResolvedValue({ ...template });
  });

  it('crear plantilla llama adminSaveTemplate con los criterios', async () => {
    renderAt('/admin/plantillas/nuevo');
    await userEvent.type(await screen.findByLabelText('Nombre'), 'Plan base');
    await userEvent.type(screen.getByLabelText('Autora o autor del plan'), 'Lic. Ana Torres');
    await userEvent.click(screen.getByRole('button', { name: 'Crear plantilla' }));

    await waitFor(() => expect(h.repo.adminSaveTemplate).toHaveBeenCalledTimes(1));
    expect(h.repo.adminSaveTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Plan base',
        author_name: 'Lic. Ana Torres',
        status: 'borrador',
        sex: 'cualquiera',
        goal: null,
        kcal_base: 1800,
      }),
    );
  });

  it('no guarda una plantilla sin nombre', async () => {
    renderAt('/admin/plantillas/nuevo');
    await userEvent.click(await screen.findByRole('button', { name: 'Crear plantilla' }));
    expect(await screen.findByText('Escribe un nombre para la plantilla.')).toBeInTheDocument();
    expect(h.repo.adminSaveTemplate).not.toHaveBeenCalled();
  });

  it('agregar ítem al Día 3 llama adminSaveTemplateItem con day_number 3', async () => {
    renderAt('/admin/plantillas/t1');
    await userEvent.click(await screen.findByRole('tab', { name: /Día 3/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Agregar ítem' }));
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '07:30' } });
    await userEvent.type(screen.getByLabelText('Título'), 'Avena con fruta');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar ítem' }));

    await waitFor(() => expect(h.repo.adminSaveTemplateItem).toHaveBeenCalledTimes(1));
    expect(h.repo.adminSaveTemplateItem).toHaveBeenCalledWith(
      expect.objectContaining({ template_id: 't1', day_number: 3, at_time: '07:30', title: 'Avena con fruta', kind: 'comida' }),
    );
  });

  it('aprobar pide confirmación y solo guarda como aprobada al confirmar', async () => {
    renderAt('/admin/plantillas/t1');
    await userEvent.selectOptions(await screen.findByLabelText('Estado'), 'aprobada');
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Se mostrará como firmado por Lic. Ana Torres/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sí, una nutricionista lo revisó' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar criterios' }));

    await waitFor(() => expect(h.repo.adminSaveTemplate).toHaveBeenCalledTimes(1));
    expect(h.repo.adminSaveTemplate).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', status: 'aprobada' }));
  });

  it('si se cancela la aprobación, la plantilla sigue en borrador', async () => {
    renderAt('/admin/plantillas/t1');
    await userEvent.selectOptions(await screen.findByLabelText('Estado'), 'aprobada');
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByLabelText('Estado')).toHaveValue('borrador');
  });

  it('copiar día llama adminSaveTemplateItem una vez por ítem y por día elegido', async () => {
    renderAt('/admin/plantillas/t1');
    await screen.findByRole('tab', { name: /Día 1/ });
    await userEvent.click(screen.getByRole('button', { name: 'Copiar este día a…' }));
    await userEvent.click(screen.getByLabelText('Día 3'));
    await userEvent.click(screen.getByLabelText('Día 5'));
    await userEvent.click(screen.getByRole('button', { name: 'Copiar' }));

    await waitFor(() => expect(h.repo.adminSaveTemplateItem).toHaveBeenCalledTimes(4));
    const days = h.repo.adminSaveTemplateItem.mock.calls.map((c) => c[0].day_number);
    expect(days).toEqual([3, 3, 5, 5]);
  });

  it('borrar plantilla pide confirmación y vuelve a la lista', async () => {
    h.repo.adminDeleteTemplate.mockResolvedValue(undefined);
    renderAt('/admin/plantillas/t1');
    await userEvent.click(await screen.findByRole('button', { name: 'Borrar plantilla' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Borrar plantilla' }));
    expect(await screen.findByText('Lista de plantillas')).toBeInTheDocument();
    expect(h.repo.adminDeleteTemplate).toHaveBeenCalledWith('t1');
  });

  it('una plantilla que no existe muestra salida a la lista', async () => {
    renderAt('/admin/plantillas/nope');
    expect(await screen.findByText('No encontramos esta plantilla')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a plantillas' })).toHaveAttribute('href', '/admin/plantillas');
  });
});
