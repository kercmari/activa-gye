import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import PlanShell from './PlanShell';
import { BottomNav } from './BottomNav';

vi.mock('../../data', () => ({
  repo: { getMyTrial: vi.fn().mockResolvedValue(null) },
}));

describe('BottomNav', () => {
  it('muestra 4 enlaces: Hoy, Progreso, Agenda y Guía', () => {
    render(
      <MemoryRouter>
        <BottomNav active="hoy" />
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: 'Secciones de Mi plan' });
    const enlaces = within(nav).getAllByRole('link');
    expect(enlaces.map((a) => a.textContent)).toEqual(['Hoy', 'Progreso', 'Agenda', 'Guía']);
    expect(enlaces.map((a) => a.getAttribute('href'))).toEqual([
      '/mi-plan/hoy',
      '/mi-plan/progreso',
      '/mi-plan/agenda',
      '/guia',
    ]);
  });

  it('marca solo la pestaña activa con aria-current', () => {
    render(
      <MemoryRouter>
        <BottomNav active="agenda" />
      </MemoryRouter>,
    );
    const activa = screen.getByRole('link', { name: 'Agenda' });
    expect(activa).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Hoy' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Guía' })).not.toHaveAttribute('aria-current');
  });
});

describe('PlanShell', () => {
  it('renderiza la barra y la pantalla hija, con Hoy marcada', async () => {
    render(
      <MemoryRouter initialEntries={['/mi-plan/hoy']}>
        <Routes>
          <Route path="/mi-plan" element={<PlanShell />}>
            <Route path="hoy" element={<p>Contenido de hoy</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Contenido de hoy')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Hoy' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Progreso' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Volver a Mi panel' })).toHaveAttribute('href', '/mi-panel');
  });
});
