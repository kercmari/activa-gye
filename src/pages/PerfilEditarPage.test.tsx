import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type Session } from '../data';
import { useAuth } from '../auth/AuthContext';
import PerfilEditarPage from './PerfilEditarPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../data', () => ({
  repo: { listSectors: vi.fn(), updateProfile: vi.fn(), deleteMyAccount: vi.fn() },
}));

const SESSION: Session = {
  user: { id: 'u1', email: 'usuario@activagye.test' },
  profile: {
    id: 'u1', full_name: 'Usuario de prueba', birth_date: '2000-05-10', sex: null, phone: null, sector_id: null,
    goal: null, activity_level: null, role: 'usuario', created_at: '2026-01-01', updated_at: '2026-01-01',
  },
};

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ session: SESSION, loading: false, refresh: vi.fn(async () => {}) });
  vi.mocked(repo.listSectors).mockResolvedValue([]);
  vi.mocked(repo.deleteMyAccount).mockReset();
  vi.mocked(repo.deleteMyAccount).mockResolvedValue(undefined);
});

describe('PerfilEditarPage', () => {
  it('borrar cuenta exige escribir BORRAR', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/perfil/editar']}>
        <Routes>
          <Route path="/perfil/editar" element={<PerfilEditarPage />} />
          <Route path="/" element={<p>PANTALLA INICIO</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await user.click(await screen.findByRole('button', { name: 'Borrar mi cuenta' }));
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Sí, borrar mi cuenta' });
    expect(confirm).toBeDisabled();

    const input = within(dialog).getByLabelText('Escribe BORRAR para confirmar');
    await user.type(input, 'borrar');
    expect(confirm).toBeDisabled();
    expect(repo.deleteMyAccount).not.toHaveBeenCalled();

    await user.clear(input);
    await user.type(input, 'BORRAR');
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    expect(repo.deleteMyAccount).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('PANTALLA INICIO')).toBeInTheDocument();
  });
});
