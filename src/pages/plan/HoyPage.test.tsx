import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type DailyCheckin, type Trial, type TrialDay } from '../../data';
import { usePhase } from '../../auth/SettingsContext';
import HoyPage from './HoyPage';

vi.mock('../../auth/SettingsContext', () => ({
  usePhase: vi.fn(() => true),
}));

vi.mock('../../data', () => ({
  repo: {
    getMyIntake: vi.fn(),
    startMyTrial: vi.fn(),
    getMyTrial: vi.fn(),
    setTrialItemDone: vi.fn(),
    getTodayCheckin: vi.fn(),
    saveTodayCheckin: vi.fn(),
  },
}));

const mock = vi.mocked(repo);

function dia(n: number, over: Partial<TrialDay> = {}): TrialDay {
  return {
    day_number: n,
    unlocked: false,
    unlocked_on: null,
    completed_at: null,
    items_total: 0,
    items_done: 0,
    items: [],
    ...over,
  };
}

function semana(over: Partial<Trial> = {}, dias?: TrialDay[]): Trial {
  const base: TrialDay[] = dias ?? [
    dia(1, {
      unlocked: true,
      unlocked_on: '2026-11-21',
      items_total: 4,
      items_done: 0,
      items: [
        { id: 'i1', at_time: '08:00', kind: 'comida', title: 'Avena con fruta', detail: 'Una taza de avena', done: false },
        { id: 'i2', at_time: '18:00', kind: 'rutina', title: 'Caminar 20 minutos', detail: null, done: false },
        { id: 'i3', at_time: '21:00', kind: 'habito', title: 'Dormir 8 horas', detail: null, done: false },
        { id: 'i4', at_time: '13:00', kind: 'comida', title: 'Pollo con ensalada', detail: null, done: false },
      ],
    }),
    dia(2, { unlocked_on: '2026-11-22' }),
    dia(3), dia(4), dia(5), dia(6), dia(7),
  ];
  return {
    template_name: 'Plan equilibrado',
    template_status: 'aprobada',
    author_name: 'Nutricionista',
    kcal_target: 1850,
    portion_factor: 1.2,
    started_on: '2026-11-21',
    today: '2026-11-21',
    current_day: 1,
    finished: false,
    days: base,
    ...over,
  };
}

const checkinHoy: DailyCheckin = {
  id: 'c1',
  checkin_date: '2026-11-21',
  mood: 4,
  weight_kg: 64.5,
  water_glasses: 6,
  note: null,
  created_at: '2026-11-21T13:00:00Z',
};

function renderPagina() {
  return render(
    <MemoryRouter>
      <HoyPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  mock.getTodayCheckin.mockResolvedValue(null);
});

describe('HoyPage sin semana', () => {
  it('sin ficha: invita a llenarla con enlace a la ficha', async () => {
    mock.getMyTrial.mockResolvedValue(null);
    mock.getMyIntake.mockResolvedValue(null);
    renderPagina();
    expect(await screen.findByText('Llena tu ficha para recibir tu semana gratis')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Llenar mi ficha' })).toHaveAttribute('href', '/mi-panel?tab=ficha');
  });

  it('con ficha: genera la semana con el botón', async () => {
    const user = userEvent.setup();
    mock.getMyTrial.mockResolvedValueOnce(null).mockResolvedValue(semana());
    mock.getMyIntake.mockResolvedValue({} as never);
    mock.startMyTrial.mockResolvedValue(semana());
    renderPagina();
    await user.click(await screen.findByRole('button', { name: 'Generar mi semana gratis' }));
    expect(mock.startMyTrial).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Plan equilibrado')).toBeInTheDocument();
  });

  it('REQUIERE_NUTRICIONISTA: explica y enlaza a la nutricionista', async () => {
    const user = userEvent.setup();
    mock.getMyTrial.mockResolvedValue(null);
    mock.getMyIntake.mockResolvedValue({} as never);
    mock.startMyTrial.mockRejectedValue(Object.assign(new Error('x'), { name: 'AppError', code: 'REQUIERE_NUTRICIONISTA' }));
    renderPagina();
    await user.click(await screen.findByRole('button', { name: 'Generar mi semana gratis' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('no recibes un plan automático');
    expect(screen.getByRole('link', { name: 'Pedir atención a una nutricionista' })).toHaveAttribute(
      'href',
      '/mi-panel?tab=nutricionista',
    );
  });

  it('muestra cargando mientras revisa la semana', () => {
    mock.getMyTrial.mockReturnValue(new Promise(() => undefined));
    mock.getMyIntake.mockReturnValue(new Promise(() => undefined));
    renderPagina();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('error al cargar la semana: muestra Reintentar', async () => {
    mock.getMyTrial.mockRejectedValue(new Error('caída'));
    renderPagina();
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});

describe('HoyPage con semana', () => {
  it('día con ítems: marcar uno llama setTrialItemDone', async () => {
    const user = userEvent.setup();
    mock.getMyTrial.mockResolvedValue(semana());
    mock.setTrialItemDone.mockResolvedValue(semana());
    renderPagina();
    expect(await screen.findByText('Avena con fruta')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Avena con fruta/ }));
    expect(mock.setTrialItemDone).toHaveBeenCalledWith('i1', true);
  });

  it('muestra Día N de 7, la plantilla y las porciones', async () => {
    mock.getMyTrial.mockResolvedValue(semana());
    renderPagina();
    expect(await screen.findByRole('heading', { name: 'Día 1 de 7' })).toBeInTheDocument();
    expect(screen.getByText(/≈ 1850 kcal · Porciones ×1,2/)).toBeInTheDocument();
  });

  it('plantilla en borrador: lo dice con claridad', async () => {
    mock.getMyTrial.mockResolvedValue(semana({ template_status: 'borrador' }));
    renderPagina();
    expect(await screen.findByText('Plan de muestra pendiente de revisión por una nutricionista.')).toBeInTheDocument();
  });

  it('chequeo guardado: llama saveTodayCheckin con los datos', async () => {
    const user = userEvent.setup();
    mock.getMyTrial.mockResolvedValue(semana());
    mock.saveTodayCheckin.mockResolvedValue(checkinHoy);
    renderPagina();
    await user.click(await screen.findByRole('button', { name: '4 de 5, Bien' }));
    await user.click(screen.getByRole('button', { name: 'Guardar chequeo' }));
    await waitFor(() =>
      expect(mock.saveTodayCheckin).toHaveBeenCalledWith({ mood: 4, weight_kg: null, water_glasses: 0, note: null }),
    );
  });

  it('chequeo de hoy ya guardado: muestra el resumen', async () => {
    mock.getMyTrial.mockResolvedValue(semana());
    mock.getTodayCheckin.mockResolvedValue(checkinHoy);
    renderPagina();
    expect(await screen.findByRole('heading', { name: 'Tu chequeo de hoy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });

  it('falta para abrir el día siguiente: lo indica', async () => {
    mock.getMyTrial.mockResolvedValue(semana());
    renderPagina();
    const aviso = await screen.findByRole('heading', { name: 'Para abrir el Día 2' });
    const seccion = aviso.closest('section') as HTMLElement;
    expect(within(seccion).getByText(/Marca al menos 2 de 4 ítems/)).toBeInTheDocument();
    expect(within(seccion).getByText('Haz tu chequeo de hoy')).toBeInTheDocument();
  });

  it('chequeo y mitad de ítems cumplidos: dice que el día siguiente se abre mañana', async () => {
    const items = [
      { id: 'i1', at_time: '08:00', kind: 'comida' as const, title: 'Avena', detail: null, done: true },
      { id: 'i2', at_time: '18:00', kind: 'rutina' as const, title: 'Caminar', detail: null, done: true },
      { id: 'i3', at_time: '21:00', kind: 'habito' as const, title: 'Dormir', detail: null, done: false },
      { id: 'i4', at_time: '13:00', kind: 'comida' as const, title: 'Pollo', detail: null, done: false },
    ];
    const dias = [dia(1, { unlocked: true, unlocked_on: '2026-11-21', items_total: 4, items_done: 2, items }), dia(2, { unlocked_on: '2026-11-22' }), dia(3), dia(4), dia(5), dia(6), dia(7)];
    mock.getMyTrial.mockResolvedValue(semana({}, dias));
    mock.getTodayCheckin.mockResolvedValue(checkinHoy);
    renderPagina();
    expect(await screen.findByText('¡Listo! El Día 2 se abre mañana.')).toBeInTheDocument();
  });

  it('sin día abierto hoy: indica cuándo se abre el siguiente', async () => {
    const dias = [
      dia(1, { unlocked: true, unlocked_on: '2026-11-21', completed_at: '2026-11-21T20:00:00Z', items_total: 0 }),
      dia(2, { unlocked_on: '2026-11-22' }),
      dia(3), dia(4), dia(5), dia(6), dia(7),
    ];
    mock.getMyTrial.mockResolvedValue(semana({ current_day: null }, dias));
    renderPagina();
    expect(await screen.findByText(/Vuelve mañana: tu Día 2 se abre el/)).toBeInTheDocument();
  });

  it('semana completada: tarjeta con enlace a suscribirse', async () => {
    const completos = Array.from({ length: 7 }, (_, i) =>
      dia(i + 1, { unlocked: true, unlocked_on: '2026-11-21', completed_at: '2026-11-27T20:00:00Z' }),
    );
    mock.getMyTrial.mockResolvedValue(semana({ current_day: null, finished: true }, completos));
    renderPagina();
    expect(await screen.findByRole('heading', { name: '¡Semana completada!' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Suscribirme para seguir' })).toHaveAttribute('href', '/mi-plan/suscripcion');
  });

  it('semana completada con fase 2 apagada: sin botón de suscribirse', async () => {
    vi.mocked(usePhase).mockReturnValue(false);
    const completos = Array.from({ length: 7 }, (_, i) =>
      dia(i + 1, { unlocked: true, unlocked_on: '2026-11-21', completed_at: '2026-11-27T20:00:00Z' }),
    );
    mock.getMyTrial.mockResolvedValue(semana({ current_day: null, finished: true }, completos));
    renderPagina();
    expect(await screen.findByRole('heading', { name: '¡Semana completada!' })).toBeInTheDocument();
    expect(screen.getByText('Tu semana gratis llegó a su fin.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Suscribirme para seguir' })).not.toBeInTheDocument();
  });
});

afterEach(() => {
  vi.mocked(usePhase).mockReturnValue(true);
});
