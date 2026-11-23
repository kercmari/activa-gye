import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from './App';
import { useAuth } from './auth/AuthContext';
import { usePhase } from './auth/SettingsContext';

vi.mock('./auth/AuthContext', () => ({ useAuth: vi.fn(), AuthProvider: ({ children }: { children: unknown }) => children }));
vi.mock('./auth/SettingsContext', () => ({ usePhase: vi.fn(), SettingsProvider: ({ children }: { children: unknown }) => children }));
vi.mock('./data', () => ({
  repo: {
    listSectors: vi.fn().mockResolvedValue([]),
    listSports: vi.fn().mockResolvedValue([]),
    searchPlaces: vi.fn().mockResolvedValue([]),
  },
}));

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ session: null, loading: false, refresh: async () => {} } as never);
  vi.mocked(usePhase).mockReturnValue(false);
});

describe('rutas de inicio', () => {
  it('/nutricion redirige a / (la portada de Nutrición)', () => {
    render(
      <MemoryRouter initialEntries={['/nutricion']}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Acompañamiento nutricional' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Soy paciente' })).toHaveAttribute('href', '/registro?tipo=paciente');
  });
});
