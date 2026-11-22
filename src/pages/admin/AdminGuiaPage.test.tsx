import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import AdminGuiaPage from './AdminGuiaPage';
import type { GuideEntry } from '../../data';

const h = vi.hoisted(() => ({
  repo: {
    adminListGuide: vi.fn(),
    adminSaveGuideEntry: vi.fn(),
    adminDeleteGuideEntry: vi.fn(),
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

const ENTRADA: GuideEntry = {
  id: 'g1',
  slug: 'agua',
  category: 'hidratacion',
  title: 'Agua durante el día',
  summary: null,
  objective: 'Mantener hidratación.',
  do_items: ['Agua natural'],
  avoid_items: ['Bebidas azucaradas'],
  steps: ['Lleva una botella'],
  source: null,
  published: true,
  sort: 10,
  updated_at: '2026-11-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  h.repo.adminListGuide.mockResolvedValue([ENTRADA]);
  h.repo.adminSaveGuideEntry.mockImplementation(async (input: object) => ({ ...ENTRADA, ...input, id: 'nuevo-id', updated_at: 'hoy' }));
  h.repo.adminDeleteGuideEntry.mockResolvedValue(undefined);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminGuiaPage />
    </MemoryRouter>,
  );
}

describe('AdminGuiaPage', () => {
  it('lista las entradas con su estado de publicación', async () => {
    renderPage();
    expect(await screen.findByText('Agua durante el día')).toBeInTheDocument();
    expect(screen.getByText('Publicada')).toBeInTheDocument();
  });

  it('muestra el estado vacío con acción para crear', async () => {
    h.repo.adminListGuide.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Crear la primera entrada' }));
    expect(screen.getByRole('heading', { name: 'Nueva entrada' })).toBeInTheDocument();
  });

  it('guardar llama adminSaveGuideEntry con las listas partidas por línea', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Agua durante el día');

    await user.click(screen.getByRole('button', { name: 'Nueva entrada' }));
    await user.type(screen.getByLabelText('Identificador (slug)'), 'comida-rapida');
    await user.type(screen.getByLabelText('Título'), 'Comer fuera sin culpa');
    fireEvent.change(screen.getByLabelText('Sí (una por línea)'), { target: { value: 'Ensalada\n  Pollo a la plancha  \n' } });
    fireEvent.change(screen.getByLabelText('Evita (una por línea)'), { target: { value: 'Frituras\n\nGaseosas' } });
    fireEvent.change(screen.getByLabelText('Pasos (una por línea)'), { target: { value: 'Pide sin salsa\nCome despacio' } });
    await user.click(screen.getByRole('button', { name: 'Guardar entrada' }));

    await waitFor(() => expect(h.repo.adminSaveGuideEntry).toHaveBeenCalledTimes(1));
    const input = h.repo.adminSaveGuideEntry.mock.calls[0][0];
    expect(input).toEqual(expect.objectContaining({
      slug: 'comida-rapida',
      category: 'hidratacion',
      title: 'Comer fuera sin culpa',
      summary: null,
      objective: null,
      do_items: ['Ensalada', 'Pollo a la plancha'],
      avoid_items: ['Frituras', 'Gaseosas'],
      steps: ['Pide sin salsa', 'Come despacio'],
      source: null,
      published: true,
    }));
    expect(input).not.toHaveProperty('id');
    expect(await screen.findByText('Se guardó «Comer fuera sin culpa».')).toBeInTheDocument();
  });

  it('valida el slug y el título antes de guardar', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Agua durante el día');

    await user.click(screen.getByRole('button', { name: 'Nueva entrada' }));
    await user.type(screen.getByLabelText('Identificador (slug)'), 'Mal Slug');
    await user.click(screen.getByRole('button', { name: 'Guardar entrada' }));

    expect(screen.getByText(/Usa solo minúsculas/)).toBeInTheDocument();
    expect(screen.getByText('Escribe el título.')).toBeInTheDocument();
    expect(h.repo.adminSaveGuideEntry).not.toHaveBeenCalled();
  });

  it('editar carga los datos y envía el id de la entrada', async () => {
    const user = userEvent.setup();
    renderPage();
    const row = (await screen.findByText('Agua durante el día')).closest('li') as HTMLElement;

    await user.click(within(row).getByRole('button', { name: 'Editar' }));
    expect(screen.getByLabelText('Título')).toHaveValue('Agua durante el día');
    expect(screen.getByLabelText('Sí (una por línea)')).toHaveValue('Agua natural');

    fireEvent.change(screen.getByLabelText('Pasos (una por línea)'), { target: { value: 'Lleva una botella\nRevisa el color de la orina' } });
    await user.click(screen.getByRole('button', { name: 'Guardar entrada' }));

    await waitFor(() => expect(h.repo.adminSaveGuideEntry).toHaveBeenCalledTimes(1));
    expect(h.repo.adminSaveGuideEntry.mock.calls[0][0]).toEqual(expect.objectContaining({
      id: 'g1',
      steps: ['Lleva una botella', 'Revisa el color de la orina'],
    }));
  });

  it('borrar pide confirmación antes de llamar al repo', async () => {
    const user = userEvent.setup();
    renderPage();
    const row = (await screen.findByText('Agua durante el día')).closest('li') as HTMLElement;

    await user.click(within(row).getByRole('button', { name: 'Borrar' }));
    const dialog = await screen.findByRole('dialog');
    expect(h.repo.adminDeleteGuideEntry).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Sí, borrar' }));
    await waitFor(() => expect(h.repo.adminDeleteGuideEntry).toHaveBeenCalledWith('g1'));
  });

  it('cancelar el borrado no llama al repo', async () => {
    const user = userEvent.setup();
    renderPage();
    const row = (await screen.findByText('Agua durante el día')).closest('li') as HTMLElement;

    await user.click(within(row).getByRole('button', { name: 'Borrar' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(h.repo.adminDeleteGuideEntry).not.toHaveBeenCalled();
  });
});
