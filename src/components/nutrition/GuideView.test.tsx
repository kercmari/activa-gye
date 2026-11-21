import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { NutritionGuide } from '../../data';
import GuideView from './GuideView';

vi.mock('../../data', () => ({
  repo: {
    listSports: vi.fn(async () => [
      { id: 'gym', name: 'Gimnasio', icon: 'Dumbbell', image_url: null, sort: 1 },
    ]),
  },
}));

const guide: NutritionGuide = {
  summary: 'Una guía de prueba.',
  bmi: 22.5,
  bmi_label: 'Peso saludable',
  daily_kcal: 1850,
  macros: { protein_g: 120, carbs_g: 200, fat_g: 55 },
  recommendations: ['Come verduras en cada comida.'],
  sample_day: [
    { meal: 'Desayuno', items: ['Avena'] },
    { meal: 'Media mañana', items: ['Fruta'] },
    { meal: 'Almuerzo', items: ['Arroz con pollo'] },
    { meal: 'Media tarde', items: ['Yogur'] },
    { meal: 'Merienda', items: ['Ensalada'] },
  ],
  hydration: 'Unos 2 litros de agua al día.',
  activity: [{ sport_id: 'gym', reason: 'Fuerza general.', per_week: '3 días por semana' }],
  warnings: [],
  disclaimer: 'Orientación general. No reemplaza a un profesional de la salud.',
};

function renderGuide(kind: 'ia' | 'basica') {
  return render(
    <MemoryRouter>
      <GuideView guide={guide} kind={kind} />
    </MemoryRouter>,
  );
}

describe('GuideView', () => {
  it('muestra kcal, IMC y las 5 comidas', async () => {
    renderGuide('basica');
    expect(screen.getByText('1850')).toBeInTheDocument();
    expect(screen.getByText('22.5')).toBeInTheDocument();
    expect(screen.getByText('Peso saludable')).toBeInTheDocument();
    for (const meal of ['Desayuno', 'Media mañana', 'Almuerzo', 'Media tarde', 'Merienda']) {
      expect(screen.getByText(meal)).toBeInTheDocument();
    }
    await waitFor(() => expect(screen.getByText('Gimnasio')).toBeInTheDocument());
  });

  it('botón Ver lugares lleva al deporte', () => {
    renderGuide('ia');
    expect(screen.getByRole('link', { name: /Ver lugares/ })).toHaveAttribute('href', '/lugares?deporte=gym');
  });

  it('pastilla Guía básica calculada', () => {
    renderGuide('basica');
    expect(screen.getByText('Guía básica calculada')).toBeInTheDocument();
    expect(screen.queryByText('Guía con IA')).not.toBeInTheDocument();
  });
});
