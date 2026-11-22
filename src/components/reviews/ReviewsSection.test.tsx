import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type Review, type Session } from '../../data';
import { useAuth } from '../../auth/AuthContext';
import ReviewsSection from './ReviewsSection';

const fase = vi.hoisted(() => ({ on: true }));

vi.mock('../../auth/SettingsContext', () => ({ usePhase: () => fase.on }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../data', () => ({
  repo: {
    getRating: vi.fn(),
    listReviews: vi.fn(),
    saveReview: vi.fn(),
    deleteMyReview: vi.fn(),
  },
}));

const SESSION: Session = {
  user: { id: 'u1', email: 'ana@activagye.test' },
  profile: {
    id: 'u1', full_name: 'Ana Pérez', birth_date: '2000-05-10', sex: 'femenino', phone: null, sector_id: null,
    goal: null, activity_level: null, role: 'usuario', created_at: '2026-01-01', updated_at: '2026-01-01',
  },
};

const RESEÑAS: Review[] = [
  {
    id: 'r2', target_type: 'lugar', target_id: 'p1', author_id: 'u2', stars: 5,
    comment: 'Excelente ambiente', created_at: '2026-11-10T10:00:00Z', author_name: 'Carlos',
  },
  {
    id: 'r3', target_type: 'lugar', target_id: 'p1', author_id: 'u3', stars: 4,
    comment: null, created_at: '2026-11-09T10:00:00Z', author_name: 'María',
  },
];

function renderSection(canReview = true) {
  return render(
    <MemoryRouter>
      <ReviewsSection target="lugar" targetId="p1" canReview={canReview} title="Reseñas" />
    </MemoryRouter>,
  );
}

describe('ReviewsSection', () => {
  beforeEach(() => {
    fase.on = true;
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ session: SESSION, loading: false, refresh: async () => {} });
    vi.mocked(repo.getRating).mockResolvedValue({ average: null, count: 0 });
    vi.mocked(repo.listReviews).mockResolvedValue([]);
  });

  it('muestra promedio y reseñas', async () => {
    vi.mocked(repo.getRating).mockResolvedValue({ average: 4.5, count: 2 });
    vi.mocked(repo.listReviews).mockResolvedValue(RESEÑAS);

    renderSection();

    expect(await screen.findByText('Excelente ambiente')).toBeInTheDocument();
    expect(screen.getByText('4,5')).toBeInTheDocument();
    expect(screen.getByText('2 reseñas')).toBeInTheDocument();
    expect(screen.getByText('Carlos')).toBeInTheDocument();
    expect(screen.getByText('María')).toBeInTheDocument();
  });

  it('guardar llama saveReview con estrellas y comentario', async () => {
    vi.mocked(repo.saveReview).mockResolvedValue({ ...RESEÑAS[0], id: 'nueva', author_id: 'u1' });
    const user = userEvent.setup();

    renderSection();

    await user.click(await screen.findByRole('button', { name: '4 estrellas' }));
    await user.type(screen.getByLabelText('Comentario (opcional)'), 'Muy bueno');
    await user.click(screen.getByRole('button', { name: 'Guardar reseña' }));

    await waitFor(() => {
      expect(repo.saveReview).toHaveBeenCalledWith({
        target_type: 'lugar',
        target_id: 'p1',
        stars: 4,
        comment: 'Muy bueno',
      });
    });
    // Tras guardar se recarga la sección.
    await waitFor(() => expect(repo.listReviews).toHaveBeenCalledTimes(2));
  });

  it('con fase 3 apagada muestra Próximamente', async () => {
    fase.on = false;

    renderSection();

    expect(await screen.findByText(/Próximamente/)).toBeInTheDocument();
    expect(repo.getRating).not.toHaveBeenCalled();
    expect(repo.listReviews).not.toHaveBeenCalled();
  });

  it('NO_PERMITIDO muestra el mensaje', async () => {
    vi.mocked(repo.saveReview).mockRejectedValue(Object.assign(new Error('no permitido'), { code: 'NO_PERMITIDO' }));
    const user = userEvent.setup();

    renderSection();

    await user.click(await screen.findByRole('button', { name: '3 estrellas' }));
    await user.click(screen.getByRole('button', { name: 'Guardar reseña' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Solo puedes calificar a un nutricionista que te atendió.',
    );
  });
});
