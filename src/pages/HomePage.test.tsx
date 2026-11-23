import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/AuthContext';
import { usePhase } from '../auth/SettingsContext';
import HomePage from './HomePage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../auth/SettingsContext', () => ({ usePhase: vi.fn() }));

function renderPage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ session: null, loading: false, refresh: async () => {} } as never);
});

describe('HomePage (portada de Nutrición)', () => {
  it('sin sesión muestra «Soy paciente» y «Soy nutricionista» con sus enlaces exactos', () => {
    vi.mocked(usePhase).mockReturnValue(true);
    renderPage();
    expect(screen.getByRole('link', { name: 'Soy paciente' })).toHaveAttribute('href', '/registro?tipo=paciente');
    expect(screen.getByRole('link', { name: 'Soy nutricionista' })).toHaveAttribute('href', '/registro?tipo=nutricionista');
    expect(screen.queryByRole('link', { name: 'Ir a mi ficha' })).not.toBeInTheDocument();
  });

  it('con sesión muestra «Ir a mi ficha» y no los botones de registro', () => {
    vi.mocked(usePhase).mockReturnValue(true);
    vi.mocked(useAuth).mockReturnValue({ session: { user: { id: '1' }, profile: { role: 'usuario' } } as never, loading: false, refresh: async () => {} });
    renderPage();
    expect(screen.getByRole('link', { name: 'Ir a mi ficha' })).toHaveAttribute('href', '/mi-panel');
    expect(screen.queryByRole('link', { name: 'Soy paciente' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Soy nutricionista' })).not.toBeInTheDocument();
  });

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
