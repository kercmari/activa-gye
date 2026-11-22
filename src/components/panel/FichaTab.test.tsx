import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repo, type PatientIntake, type Session } from '../../data';
import { useAuth } from '../../auth/AuthContext';
import FichaTab from './FichaTab';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../data', () => ({
  repo: {
    getMyIntake: vi.fn(),
    saveMyIntake: vi.fn(),
    getIntakePhotoUrl: vi.fn(),
  },
}));

const SESSION: Session = {
  user: { id: 'u1', email: 'ana@activagye.test' },
  profile: {
    id: 'u1', full_name: 'Ana Pérez', birth_date: '2000-05-10', sex: 'femenino', phone: null, sector_id: null,
    goal: null, activity_level: null, role: 'usuario', created_at: '2026-01-01', updated_at: '2026-01-01',
  },
};

const SAVED: PatientIntake = {
  user_id: 'u1', weight_kg: 70, height_cm: 170, waist_cm: null, goal: 'bajar_peso', activity_level: 'ligero',
  health_notes: null, photo_path: null, consent_photo: false, consent_at: null,
  created_at: '2026-01-01', updated_at: '2026-01-01',
};

function renderTab() {
  return render(
    <MemoryRouter>
      <FichaTab />
    </MemoryRouter>,
  );
}

async function fillMedidas() {
  await userEvent.type(screen.getByLabelText('Peso (kg)'), '70');
  await userEvent.type(screen.getByLabelText('Estatura (cm)'), '170');
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({ session: SESSION, loading: false, refresh: vi.fn(async () => {}) });
  vi.mocked(repo.getMyIntake).mockResolvedValue(null);
  vi.mocked(repo.saveMyIntake).mockReset();
  vi.mocked(repo.getIntakePhotoUrl).mockResolvedValue(null);
  // jsdom no implementa las URL de objetos de archivo.
  URL.createObjectURL = vi.fn(() => 'blob:vista-previa');
  URL.revokeObjectURL = vi.fn();
});

describe('FichaTab', () => {
  it('valida peso fuera de rango sin llamar a saveMyIntake', async () => {
    renderTab();
    await screen.findByRole('button', { name: 'Guardar mi ficha' });
    await userEvent.type(screen.getByLabelText('Peso (kg)'), '10');
    await userEvent.type(screen.getByLabelText('Estatura (cm)'), '170');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar mi ficha' }));

    expect(await screen.findByText('Ingresa un peso entre 25 y 350 kg.')).toBeInTheDocument();
    expect(repo.saveMyIntake).not.toHaveBeenCalled();
  });

  it('con foto exige consentimiento', async () => {
    renderTab();
    await screen.findByRole('button', { name: 'Guardar mi ficha' });
    await fillMedidas();
    const foto = new File(['imagen'], 'cuerpo.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByLabelText(/Elegir foto/), foto);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar mi ficha' }));

    expect(await screen.findByText('Para guardar la foto debes aceptar el consentimiento.')).toBeInTheDocument();
    expect(repo.saveMyIntake).not.toHaveBeenCalled();
  });

  it('guarda y muestra Ficha guardada', async () => {
    vi.mocked(repo.saveMyIntake).mockResolvedValue(SAVED);
    renderTab();
    await screen.findByRole('button', { name: 'Guardar mi ficha' });
    await fillMedidas();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar mi ficha' }));

    expect(await screen.findByText('Ficha guardada')).toBeInTheDocument();
    expect(repo.saveMyIntake).toHaveBeenCalledWith(expect.objectContaining({
      full_name: 'Ana Pérez',
      birth_date: '2000-05-10',
      sex: 'femenino',
      weight_kg: 70,
      height_cm: 170,
      photo: null,
      remove_photo: false,
      consent_photo: false,
    }));
    // Tras guardar aparece la tarjeta de estado inicial.
    expect(screen.getByText('Tu estado inicial')).toBeInTheDocument();
  });

  it('menor de 18 no ve el campo de foto', async () => {
    renderTab();
    await screen.findByRole('button', { name: 'Guardar mi ficha' });
    const hace10 = `${new Date().getFullYear() - 10}-01-01`;
    fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), { target: { value: hace10 } });

    expect(screen.getByText('La foto solo está disponible para mayores de 18 años.')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Elegir foto/)).not.toBeInTheDocument();
  });

  it('muestra el error de carga con Reintentar', async () => {
    vi.mocked(repo.getMyIntake).mockRejectedValueOnce(new Error('x'));
    renderTab();
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo salió mal. Inténtalo de nuevo.');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('muestra el estado inicial de una ficha guardada', async () => {
    vi.mocked(repo.getMyIntake).mockResolvedValue(SAVED);
    renderTab();
    expect(await screen.findByText('Tu estado inicial')).toBeInTheDocument();
    expect(screen.getByText(/Peso saludable|Sobrepeso|Bajo peso|Obesidad/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Peso (kg)')).toHaveValue('70'));
  });
});
