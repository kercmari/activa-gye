import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/AuthContext';
import { usePhase } from '../auth/SettingsContext';
import NutricionPage from './NutricionPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../auth/SettingsContext', () => ({ usePhase: vi.fn() }));

function renderPage() {
  return render(
    <MemoryRouter>
      <NutricionPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ session: null, loading: false, refresh: async () => {} } as never);
});

describe('NutricionPage', () => {
  it('con fase 2 apagada no muestra «Próximamente» ni los pasos de la fase 2', () => {
    vi.mocked(usePhase).mockReturnValue(false);
    renderPage();
    expect(screen.queryByText('Próximamente')).not.toBeInTheDocument();
    expect(screen.queryByText('Un nutricionista acepta tu solicitud')).not.toBeInTheDocument();
    expect(screen.queryByText('Sigue tu calendario')).not.toBeInTheDocument();
    expect(screen.getByText('Llena tu ficha')).toBeInTheDocument();
  });

  it('con fase 2 encendida muestra los tres pasos sin «Próximamente»', () => {
    vi.mocked(usePhase).mockReturnValue(true);
    renderPage();
    expect(screen.getByText('Un nutricionista acepta tu solicitud')).toBeInTheDocument();
    expect(screen.getByText('Sigue tu calendario')).toBeInTheDocument();
    expect(screen.queryByText('Próximamente')).not.toBeInTheDocument();
  });
});
