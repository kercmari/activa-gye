import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import AdminPagosPage from './AdminPagosPage';

vi.mock('../../data', () => ({ repo: {} }));

function Destino() {
  const { pathname } = useLocation();
  return <p>Destino: {pathname}</p>;
}

describe('AdminPagosPage', () => {
  it('/admin/pagos redirige a /admin/suscripciones', () => {
    render(
      <MemoryRouter initialEntries={['/admin/pagos']}>
        <Routes>
          <Route path="/admin/pagos" element={<AdminPagosPage />} />
          <Route path="/admin/suscripciones" element={<Destino />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Destino: /admin/suscripciones')).toBeInTheDocument();
  });
});
