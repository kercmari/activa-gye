import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type DailyCheckin, type PatientDetail, type Trial, type TrialDay } from '../../data';
import TrialProgress from './TrialProgress';

vi.mock('../../data', () => ({
  repo: {
    getPatientTrial: vi.fn(),
    listCheckins: vi.fn(),
    getPatientDetail: vi.fn(),
  },
}));

function day(n: number, over: Partial<TrialDay> = {}): TrialDay {
  return {
    day_number: n,
    unlocked: false,
    unlocked_on: null,
    completed_at: null,
    items_total: 4,
    items_done: 0,
    items: [],
    ...over,
  };
}

const trial: Trial = {
  template_name: 'Plan de muestra mediterráneo',
  template_status: 'borrador',
  author_name: 'Ana Pérez',
  kcal_target: 1800,
  portion_factor: 1,
  started_on: '2026-11-20',
  today: '2026-11-21',
  current_day: 2,
  finished: false,
  days: [
    day(1, { unlocked: true, unlocked_on: '2026-11-20', completed_at: '2026-11-20T20:00:00Z', items_done: 4 }),
    day(2, { unlocked: true, unlocked_on: '2026-11-21', items_done: 1 }),
    day(3),
    day(4),
    day(5),
    day(6),
    day(7),
  ],
};

const checkins: DailyCheckin[] = [
  { id: 'c1', checkin_date: '2026-11-20', mood: 4, weight_kg: 71.5, water_glasses: 8, note: 'Buen día', created_at: '2026-11-20T20:00:00Z' },
  { id: 'c2', checkin_date: '2026-11-21', mood: 3, weight_kg: null, water_glasses: null, note: null, created_at: '2026-11-21T20:00:00Z' },
];

const detail = {
  profile: {},
  intake: { allergies: 'Maní', conditions: ['diabetes'] },
  photo_url: null,
  request: {},
} as unknown as PatientDetail;

beforeEach(() => {
  vi.mocked(repo.getPatientTrial).mockReset();
  vi.mocked(repo.listCheckins).mockReset();
  vi.mocked(repo.getPatientDetail).mockReset();
  vi.mocked(repo.getPatientDetail).mockResolvedValue(detail);
  vi.mocked(repo.listCheckins).mockResolvedValue(checkins);
});

describe('TrialProgress', () => {
  it('muestra los 7 días, la plantilla en borrador y los chequeos', async () => {
    vi.mocked(repo.getPatientTrial).mockResolvedValue(trial);
    render(<TrialProgress patientId="p1" />);

    expect(await screen.findByRole('heading', { name: 'Semana gratis y chequeos' })).toBeInTheDocument();
    expect(screen.getByText('Plan de muestra mediterráneo')).toBeInTheDocument();
    expect(screen.getByText('Borrador')).toBeInTheDocument();
    expect(screen.getByText('Plan de muestra pendiente de revisión por una nutricionista.')).toBeInTheDocument();
    expect(screen.getByText(/1800 kcal\/día/)).toBeInTheDocument();

    const dias = screen.getByLabelText('Días de la semana gratis');
    expect(dias.querySelectorAll('li')).toHaveLength(7);
    expect(screen.getByLabelText('Día 1: completado')).toBeInTheDocument();
    expect(screen.getByLabelText('Día 2: abierto')).toBeInTheDocument();
    expect(screen.getByLabelText('Día 3: cerrado')).toBeInTheDocument();

    expect(screen.getByText('Ánimo: Bien/5')).toBeInTheDocument();
    expect(screen.getByText('Peso: 71.5 kg')).toBeInTheDocument();
    expect(screen.getByText('Nota: Buen día')).toBeInTheDocument();
    expect(screen.getByText(/Maní/)).toBeInTheDocument();
    expect(screen.getByText(/Diabetes/)).toBeInTheDocument();
    expect(repo.listCheckins).toHaveBeenCalledWith('p1', 30);
  });

  it('sin semana muestra el vacío', async () => {
    vi.mocked(repo.getPatientTrial).mockResolvedValue(null);
    render(<TrialProgress patientId="p2" />);

    expect(await screen.findByText('Este paciente no tiene semana gratis.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Días de la semana gratis')).not.toBeInTheDocument();
  });

  it('muestra el error con botón Reintentar', async () => {
    vi.mocked(repo.getPatientTrial).mockRejectedValueOnce(new Error('sin red'));
    vi.mocked(repo.getPatientTrial).mockResolvedValueOnce(null);
    render(<TrialProgress patientId="p3" />);

    const reintentar = await screen.findByRole('button', { name: /Reintentar/ });
    await userEvent.click(reintentar);
    await waitFor(() => expect(screen.getByText('Este paciente no tiene semana gratis.')).toBeInTheDocument());
  });
});
