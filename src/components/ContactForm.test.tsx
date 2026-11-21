import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { repo } from '../data';
import { ContactForm } from './ContactForm';

vi.mock('../data', () => ({
  repo: { sendContact: vi.fn() },
}));

describe('ContactForm', () => {
  beforeEach(() => {
    vi.mocked(repo.sendContact).mockReset();
    vi.mocked(repo.sendContact).mockResolvedValue(undefined);
  });

  it('valida campos vacíos sin llamar a sendContact', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    await user.click(screen.getByRole('button', { name: 'Enviar mensaje' }));
    expect(screen.getByText('Escribe tu nombre (mínimo 2 letras).')).toBeInTheDocument();
    expect(screen.getByText('Escribe un correo válido, por ejemplo nombre@correo.com.')).toBeInTheDocument();
    expect(repo.sendContact).not.toHaveBeenCalled();
  });

  it('muestra gracias tras enviar', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    await user.type(screen.getByLabelText('Nombre'), 'Ana Pérez');
    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@correo.com');
    await user.type(screen.getByLabelText('Asunto'), 'Consulta');
    await user.type(screen.getByLabelText('Mensaje'), 'Hola, tengo una duda.');
    await user.click(screen.getByRole('button', { name: 'Enviar mensaje' }));
    await waitFor(() =>
      expect(screen.getByText('¡Gracias! Te responderemos en 1–2 días hábiles.')).toBeInTheDocument(),
    );
    expect(repo.sendContact).toHaveBeenCalledWith({
      name: 'Ana Pérez',
      email: 'ana@correo.com',
      subject: 'Consulta',
      message: 'Hola, tengo una duda.',
    });
  });
});
