import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type DailyCheckin, type Session, type Trial, type TrialDay } from '../../data';
import { useAuth } from '../../auth/AuthContext';
import ProgresoPage from './ProgresoPage';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../data', () => ({
  repo: {
    listCheckins: vi.fn(),
    getMyTrial: vi.fn(),
    setTrialItemDone: vi.fn(),
  },
}));

const SESSION = {
  user: { id: 'u1', email: 'ana@activagye.test' },
  profile: { id: 'u1', full_name: 'Ana Pérez' },
} as unknown as Session;

function dia(n: number, done: number, total: number, completado = false): TrialDay {
  return {
    day_number: n,
    unlocked: n <= 2,
    unlocked_on: n <= 2 ? '2026-11-21' : null,
    completed_at: completado ? '2026-11-20T12:00:00Z' : null,
    items_total: total,
    items_done: done,
    items: [],
  };
}

const TRIAL: Trial = {
  template_name: 'Plantilla de muestra',
  template_status: 'borrador',
  author_name: 'Nutricionista',
  kcal_target: 1800,
  portion_factor: 1,
  started_on: '2026-11-19',
  today: '2026-11-21',
  current_day: 2,
  finished: false,
  days: [dia(1, 3, 4, true), dia(2, 1, 4), ...[3, 4, 5, 6, 7].map((n) => dia(n, 0, 0))],
};

const CHECKINS: DailyCheckin[] = [
  { id: 'c1', checkin_date: '2026-11-19', mood: 3, weight_kg: 70, water_glasses: 4, note: null, created_at: '2026-11-19T10:00:00Z' },
  { id: 'c2', checkin_date: '2026-11-20', mood: 4, weight_kg: 69.5, water_glasses: 6, note: 'Buen día', created_at: '2026-11-20T10:00:00Z' },
  { id: 'c3', checkin_date: '2026-11-21', mood: 5, weight_kg: 69.2, water_glasses: 8, note: null, created_at: '2026-11-21T10:00:00Z' },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <ProgresoPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ session: SESSION, loading: false, refresh: vi.fn(async () => {}) });
  vi.mocked(repo.listCheckins).mockResolvedValue(CHECKINS);
  vi.mocked(repo.getMyTrial).mockResolvedValue(TRIAL);
});

describe('ProgresoPage', () => {
  it('con chequeos dibuja 3 gráficos y la tabla del historial', async () => {
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelectorAll('svg[data-chart]')).toHaveLength(3));
    expect(container.querySelector('svg[data-chart="Ánimo"]')).not.toBeNull();
    expect(container.querySelector('svg[data-chart="Peso"]')).not.toBeNull();
    expect(container.querySelector('svg[data-chart="Agua"]')).not.toBeNull();
    expect(screen.getByRole('table', { name: 'Registro de chequeos' })).toBeInTheDocument();
    expect(screen.getByText('Buen día')).toBeInTheDocument();
  });

  it('muestra el resumen con el cambio de peso y el cumplimiento', async () => {
    renderPage();
    expect(await screen.findByText('−0,8 kg')).toBeInTheDocument();
    // Ítems: 3 + 1 hechos de 4 + 4 = 50%.
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Día 1: 3 de 4 ítems' })).toBeInTheDocument();
  });

  it('sin chequeos muestra el vacío con enlace a Hoy', async () => {
    vi.mocked(repo.listCheckins).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('Aún no hay chequeos: haz el primero en Hoy')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Hoy' })).toHaveAttribute('href', '/mi-plan/hoy');
    expect(screen.queryByRole('table', { name: 'Registro de chequeos' })).not.toBeInTheDocument();
  });

  it('muestra cargando mientras llegan los datos', () => {
    vi.mocked(repo.listCheckins).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando tu progreso…');
  });

  it('error de chequeos con Reintentar', async () => {
    vi.mocked(repo.listCheckins).mockRejectedValueOnce(new Error('x'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo salió mal. Inténtalo de nuevo.');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
