import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import GuiaPage from './GuiaPage';
import type { GuideEntry } from '../data';

const h = vi.hoisted(() => ({
  repo: { listGuide: vi.fn() },
}));

vi.mock('../data', () => ({ repo: h.repo }));

function entry(overrides: Partial<GuideEntry>): GuideEntry {
  return {
    id: 'g1',
    slug: 'agua',
    category: 'hidratacion',
    title: 'Agua durante el día',
    summary: 'Bebe agua a lo largo de la jornada.',
    objective: 'Mantener una buena hidratación.',
    do_items: ['Agua natural', 'Infusiones sin azúcar'],
    avoid_items: ['Bebidas azucaradas'],
    steps: ['Lleva una botella', 'Bebe un vaso cada hora'],
    source: 'Guía de hidratación',
    published: true,
    sort: 10,
    updated_at: '2026-11-01T00:00:00Z',
    ...overrides,
  };
}

const ENTRADAS: GuideEntry[] = [
  entry({}),
  entry({
    id: 'g2',
    slug: 'antes',
    category: 'antes_entrenar',
    title: 'Comida antes de entrenar',
    summary: 'Carbohidratos suaves una hora antes.',
    do_items: ['Avena'],
    avoid_items: ['Comida muy grasa'],
    steps: ['Come una hora antes'],
    source: null,
    objective: null,
  }),
  entry({
    id: 'g3',
    slug: 'compras',
    category: 'compras',
    title: 'Leer etiquetas',
    summary: 'Revisa azúcares y sodio.',
    objective: null,
    source: null,
    do_items: ['Revisar la tabla nutricional'],
    avoid_items: [],
    steps: [],
  }),
];

beforeEach(() => {
  vi.clearAllMocks();
  h.repo.listGuide.mockResolvedValue(ENTRADAS);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <GuiaPage />
    </MemoryRouter>,
  );
}

describe('GuiaPage', () => {
  it('muestra cargando mientras llega la guía', () => {
    h.repo.listGuide.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando');
  });

  it('muestra el estado vacío cuando no hay entradas', async () => {
    h.repo.listGuide.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('Aún no hay entradas en la guía')).toBeInTheDocument();
  });

  it('muestra el error con botón Reintentar y vuelve a cargar', async () => {
    const user = userEvent.setup();
    h.repo.listGuide.mockRejectedValueOnce(new Error('caída'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo salió mal');

    h.repo.listGuide.mockResolvedValueOnce(ENTRADAS);
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: 'Agua durante el día' })).toBeInTheDocument();
  });

  it('muestra los chips con conteo', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Agua durante el día' });
    expect(screen.getByRole('button', { name: 'Todas (3)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Hidratación (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compras (1)' })).toBeInTheDocument();
  });

  it('filtrar por categoría reduce las tarjetas', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: 'Agua durante el día' });

    await user.click(screen.getByRole('button', { name: 'Antes de entrenar (1)' }));

    expect(screen.getByRole('heading', { name: 'Comida antes de entrenar' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Agua durante el día' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Leer etiquetas' })).not.toBeInTheDocument();
  });

  it('buscar reduce las tarjetas por título, resumen o ítems', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: 'Agua durante el día' });

    await user.type(screen.getByLabelText('Buscar en la guía'), 'etiquetas');
    expect(screen.getByRole('heading', { name: 'Leer etiquetas' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Agua durante el día' })).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Buscar en la guía'));
    await user.type(screen.getByLabelText('Buscar en la guía'), 'avena');
    expect(screen.getByRole('heading', { name: 'Comida antes de entrenar' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Leer etiquetas' })).not.toBeInTheDocument();
  });

  it('sin resultados ofrece ver toda la guía', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: 'Agua durante el día' });

    await user.type(screen.getByLabelText('Buscar en la guía'), 'zzzz');
    expect(screen.getByText('Ningún resultado')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ver toda la guía' }));
    expect(screen.getByRole('heading', { name: 'Agua durante el día' })).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar en la guía')).toHaveValue('');
  });

  it('la tarjeta muestra Objetivo, Sí, Evita, Pasos y Fuente', async () => {
    renderPage();
    const card = (await screen.findByRole('heading', { name: 'Agua durante el día' })).closest('article');
    expect(card).not.toBeNull();
    const scope = within(card as HTMLElement);

    expect(scope.getByText('Objetivo')).toBeInTheDocument();
    expect(scope.getByText('Mantener una buena hidratación.')).toBeInTheDocument();

    const si = scope.getByRole('heading', { name: 'Sí' }).closest('section') as HTMLElement;
    expect(within(si).getByText('SÍ')).toBeInTheDocument();
    expect(within(si).getByText('Agua natural')).toBeInTheDocument();
    expect(within(si).getByText('Infusiones sin azúcar')).toBeInTheDocument();

    const evita = scope.getByRole('heading', { name: 'Evita' }).closest('section') as HTMLElement;
    expect(within(evita).getByText('EVITA')).toBeInTheDocument();
    expect(within(evita).getByText('Bebidas azucaradas')).toBeInTheDocument();

    expect(scope.getByText('Lleva una botella')).toBeInTheDocument();
    expect(scope.getByText('Bebe un vaso cada hora')).toBeInTheDocument();
    expect(scope.getByText('Guía de hidratación')).toBeInTheDocument();
  });

  it('oculta las secciones que no tienen contenido', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Leer etiquetas' });
    const card = screen.getByRole('heading', { name: 'Leer etiquetas' }).closest('article') as HTMLElement;
    const scope = within(card);
    expect(scope.queryByText('Objetivo')).not.toBeInTheDocument();
    expect(scope.queryByRole('heading', { name: 'Evita' })).not.toBeInTheDocument();
    expect(scope.queryByText('Pasos')).not.toBeInTheDocument();
    expect(scope.queryByText(/Fuente:/)).not.toBeInTheDocument();
  });
});
