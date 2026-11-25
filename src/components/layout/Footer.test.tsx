import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Footer from './Footer';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ session: null, loading: false, refresh: async () => {} }),
}));
vi.mock('../../auth/SettingsContext', () => ({
  useSettings: () => ({
    settings: { phase1: true, phase2: false, phase3: false, patient_limit: 5, patients_count: 0, admin_email: 'kerlyeliz19@gmail.com', free_patient_limit: 3, free_daily_record_limit: 10 },
    loading: false,
    reload: async () => {},
  }),
}));

describe('Footer', () => {
  it('«Escribir a la administración» abre mailto: con el correo de la administradora', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    const href = screen.getByRole('link', { name: 'Escribir a la administración' }).getAttribute('href') ?? '';
    // contactMailto codifica la @ como %40 (equivalente en mailto:); se compara el correo ya decodificado.
    expect(href.startsWith('mailto:')).toBe(true);
    expect(decodeURIComponent(href.slice('mailto:'.length))).toBe('kerlyeliz19@gmail.com');
  });
});
