import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import AdminNutricionDetallePage from './AdminNutricionDetallePage';

const h = vi.hoisted(() => ({
  repo: {
    getNutritionRequest: vi.fn(),
    getNutritionPhotoUrl: vi.fn(),
    takeNutritionRequest: vi.fn(),
    answerNutritionRequest: vi.fn(),
  },
  session: {
    user: { id: 'nutri-1', email: 'nutri@activagye.test' },
    profile: { role: 'nutricionista' },
  },
}));

vi.mock('../../data', () => ({ repo: h.repo }));
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ session: h.session, loading: false, refresh: async () => {} }),
}));

function solicitud(extra: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    user_id: 'u1',
    age: 30,
    sex: 'femenino',
    height_cm: 160,
    weight_kg: 60,
    waist_cm: null,
    activity_level: 'ligero',
    goal: 'bajar_peso',
    restrictions: null,
    health_conditions: null,
    photo_path: null,
    consent_photo: false,
    consent_at: null,
    ai_guide: null,
    ai_kind: null,
    ai_status: 'pendiente',
    status: 'enviada',
    nutritionist_id: null,
    nutritionist_plan: null,
    responded_at: null,
    created_at: '2026-11-20T10:00:00Z',
    updated_at: '2026-11-20T10:00:00Z',
    requester_name: 'Ana Prueba',
    ...extra,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/nutricion/r1']}>
      <Routes>
        <Route path="/admin/nutricion/:id" element={<AdminNutricionDetallePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  h.session.profile.role = 'nutricionista';
  h.repo.getNutritionPhotoUrl.mockResolvedValue(null);
  h.repo.takeNutritionRequest.mockResolvedValue(undefined);
  h.repo.answerNutritionRequest.mockResolvedValue(undefined);
});

describe('AdminNutricionDetallePage', () => {
  it('muestra Tomar solicitud si no está asignada', async () => {
    h.repo.getNutritionRequest.mockResolvedValue(solicitud());
    renderPage();
    expect(await screen.findByRole('button', { name: 'Tomar solicitud' })).toBeInTheDocument();
  });

  it('plan corto muestra error y no llama answer', async () => {
    const user = userEvent.setup();
    h.repo.getNutritionRequest.mockResolvedValue(solicitud({ nutritionist_id: 'nutri-1' }));
    renderPage();

    await user.type(await screen.findByLabelText('Escribe el plan'), 'corto');
    await user.click(screen.getByRole('button', { name: 'Enviar plan' }));

    expect(await screen.findByText('El plan debe tener al menos 20 caracteres.')).toBeInTheDocument();
    expect(h.repo.answerNutritionRequest).not.toHaveBeenCalled();
  });

  it('asignada a otra persona oculta el formulario para nutricionista', async () => {
    h.repo.getNutritionRequest.mockResolvedValue(solicitud({ nutritionist_id: 'otra-persona' }));
    renderPage();

    expect(await screen.findByText('Esta solicitud la atiende otra persona.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Escribe el plan')).not.toBeInTheDocument();
  });
});
