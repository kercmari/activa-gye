import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type Session } from '../../data';
import { useAuth } from '../../auth/AuthContext';
import { usePhase } from '../../auth/SettingsContext';
import ReportePage from './ReportePage';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../auth/SettingsContext', () => ({ usePhase: vi.fn() }));
vi.mock('../../data', () => ({
  repo: {
    getMyIntake: vi.fn(),
    listProgress: vi.fn(),
    listFollowups: vi.fn(),
    listPlanDays: vi.fn(),
    getMyNutritionist: vi.fn(),
  },
}));

const SESSION: Session = {
  user: { id: 'u1', email: 'ana@activagye.test' },
  profile: {
    id: 'u1', full_name: 'Ana Pérez', birth_date: '2000-05-10', sex: 'femenino', phone: null, sector_id: null,
    goal: null, activity_level: null, role: 'usuario', created_at: '2026-01-01', updated_at: '2026-01-01',
  },
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/mi-panel/reporte']}>
      <Routes>
        <Route path="/mi-panel/reporte" element={<ReportePage />} />
        <Route path="/mi-panel" element={<p>Mi panel</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ session: SESSION, loading: false, refresh: vi.fn(async () => {}) });
  vi.mocked(usePhase).mockReturnValue(true);
  vi.mocked(repo.getMyIntake).mockResolvedValue({
    user_id: 'u1', weight_kg: 72, height_cm: 170, waist_cm: null, goal: null, activity_level: null,
    health_notes: null, photo_path: null, consent_photo: false, consent_at: null,
    created_at: '2026-01-01', updated_at: '2026-01-01',
  });
  vi.mocked(repo.listProgress).mockResolvedValue([
    { id: 'p1', user_id: 'u1', entry_date: '2026-11-01', weight_kg: 73.5, active_minutes: null, activity: null, note: null, created_at: '2026-11-01' },
  ]);
  vi.mocked(repo.listFollowups).mockResolvedValue([]);
  vi.mocked(repo.listPlanDays).mockResolvedValue([]);
  vi.mocked(repo.getMyNutritionist).mockResolvedValue(null);
});

describe('ReportePage', () => {
  it('muestra los datos y el botón Descargar PDF llama window.print', async () => {
    const user = userEvent.setup();
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Reporte de progreso — VITGO' })).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText(/^72[.,]0 kg$/)).toBeInTheDocument();
    expect(screen.getByText('170 cm')).toBeInTheDocument();
    expect(screen.getByText(/24[.,]9/)).toBeInTheDocument();
    expect(screen.getByText('Sin nutricionista asignado.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Descargar PDF' }));
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });
});
