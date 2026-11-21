import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/AuthContext';
import NutricionNuevaPage from './NutricionNuevaPage';

const { createNutritionRequest } = vi.hoisted(() => ({ createNutritionRequest: vi.fn() }));

vi.mock('../data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data')>();
  return {
    ...actual,
    repo: { ...actual.repo, createNutritionRequest },
  };
});

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));

const yearsAgo = (years: number) => `${new Date().getFullYear() - years}-01-01`;

function sessionWith(birth_date: string | null) {
  return {
    user: { id: 'u1', email: 'ana@correo.com' },
    profile: {
      id: 'u1', full_name: 'Ana Mora', birth_date, sex: null, phone: null, sector_id: null,
      goal: null, activity_level: null, role: 'usuario' as const, created_at: '', updated_at: '',
    },
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/nutricion/nueva']}>
      <Routes>
        <Route path="/nutricion/nueva" element={<NutricionNuevaPage />} />
        <Route path="/nutricion/:id" element={<p>DETALLE abc</p>} />
        <Route path="/nutricion" element={<p>LISTA</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function llenarPaso1(user: ReturnType<typeof userEvent.setup>, altura = '170') {
  await user.selectOptions(screen.getByLabelText('Sexo'), 'femenino');
  await user.type(screen.getByLabelText('Altura (cm)'), altura);
  await user.type(screen.getByLabelText('Peso (kg)'), '70');
  await user.click(screen.getByRole('button', { name: 'Siguiente' }));
}

async function llenarPaso2(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText('Objetivo'), 'bajar_peso');
  await user.selectOptions(screen.getByLabelText('Nivel de actividad'), 'moderado');
  await user.click(screen.getByRole('button', { name: 'Siguiente' }));
}

beforeEach(() => {
  createNutritionRequest.mockReset();
  vi.mocked(useAuth).mockReturnValue({ session: sessionWith('1990-05-10'), loading: false, refresh: async () => {} });
});

describe('NutricionNuevaPage', () => {
  it('sin fecha de nacimiento pide completar perfil', () => {
    vi.mocked(useAuth).mockReturnValue({ session: sessionWith(null), loading: false, refresh: async () => {} });
    renderPage();
    expect(screen.getByRole('link', { name: 'Completar mi perfil' })).toHaveAttribute('href', '/perfil/editar');
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('no avanza del paso 1 con altura fuera de rango', async () => {
    const user = userEvent.setup();
    renderPage();
    await llenarPaso1(user, '50');
    expect(screen.getByText('La altura debe estar entre 100 y 250 cm.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tus medidas' })).toBeInTheDocument();
  });

  it('con foto exige consentimiento', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await llenarPaso1(user);
    await llenarPaso2(user);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(['x'], 'foto.jpg', { type: 'image/jpeg' }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Marca la casilla para aceptar el uso de tu foto.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tu foto (opcional)' })).toBeInTheDocument();
  });

  it('menor de 18 no puede subir foto', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue({ session: sessionWith(yearsAgo(16)), loading: false, refresh: async () => {} });
    const { container } = renderPage();
    await llenarPaso1(user);
    await llenarPaso2(user);
    expect(screen.getByText(/La foto solo se permite a mayores de 18 años\./)).toBeInTheDocument();
    expect(container.querySelector('input[type="file"]')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('heading', { name: 'Revisa tus datos' })).toBeInTheDocument();
  });

  it('envía y navega al detalle', async () => {
    const user = userEvent.setup();
    createNutritionRequest.mockResolvedValue({ id: 'abc' });
    renderPage();
    await llenarPaso1(user);
    await llenarPaso2(user);
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByText('DETALLE abc')).toBeInTheDocument();
    expect(createNutritionRequest).toHaveBeenCalledWith(
      expect.objectContaining({ sex: 'femenino', height_cm: 170, weight_kg: 70, goal: 'bajar_peso', photo: null, consent_photo: false }),
    );
  });
});
