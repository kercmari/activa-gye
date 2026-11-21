import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NutritionRequest } from '../data';
import { repo } from '../data';
import NutricionDetallePage from './NutricionDetallePage';

vi.mock('../data', () => ({
  repo: {
    getNutritionRequest: vi.fn(),
    getNutritionPhotoUrl: vi.fn(async () => null),
    listSports: vi.fn(async () => []),
  },
}));

const base: NutritionRequest = {
  id: 'req-1', user_id: 'u1', age: 36, sex: 'femenino', height_cm: 165, weight_kg: 70, waist_cm: null,
  activity_level: 'moderado', goal: 'bajar_peso', restrictions: null, health_conditions: null,
  photo_path: null, consent_photo: false, consent_at: null, ai_guide: null, ai_kind: null,
  ai_status: 'fallo', status: 'enviada', nutritionist_id: 'n1', nutritionist_plan: null,
  responded_at: null, created_at: '2026-11-20T10:00:00.000Z', updated_at: '2026-11-20T10:00:00.000Z',
};

function renderDetalle() {
  return render(
    <MemoryRouter initialEntries={['/nutricion/req-1']}>
      <Routes>
        <Route path="/nutricion/:id" element={<NutricionDetallePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(repo.getNutritionRequest).mockReset();
});

describe('NutricionDetallePage', () => {
  it('muestra plan del nutricionista cuando existe', async () => {
    vi.mocked(repo.getNutritionRequest).mockResolvedValue({
      ...base,
      status: 'respondida',
      nutritionist_plan: 'Reduce las frituras.\nCamina 30 minutos al día.',
      responded_at: '2026-11-21T09:00:00.000Z',
    });
    renderDetalle();
    expect(await screen.findByText('Plan de tu nutricionista')).toBeInTheDocument();
    expect(screen.getByText(/Reduce las frituras\./)).toBeInTheDocument();
    expect(screen.getByText('Respondida por nutricionista')).toBeInTheDocument();
  });

  it('solicitud inexistente muestra mensaje', async () => {
    vi.mocked(repo.getNutritionRequest).mockResolvedValue(null);
    renderDetalle();
    expect(await screen.findByText('No encontramos esta solicitud')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a nutrición' })).toHaveAttribute('href', '/nutricion');
  });
});
