import { describe, expect, it } from 'vitest';
import { contactMailto, subscriptionMailto } from './mailto';

describe('subscriptionMailto', () => {
  const enlace = subscriptionMailto('a+b@x.com', {
    plan: 'Profesional',
    price: 19,
    fullName: 'Ana Pérez',
    email: 'ana@x.com',
  });

  it('codifica el correo de la administradora (+ y @)', () => {
    expect(enlace.startsWith('mailto:a%2Bb%40x.com?subject=')).toBe(true);
  });

  it('el cuerpo decodificado trae nombre, plan y precio', () => {
    const cuerpo = decodeURIComponent(enlace.split('&body=')[1]);
    expect(cuerpo).toContain('Ana Pérez');
    expect(cuerpo).toContain('Profesional');
    expect(cuerpo).toContain('$19');
  });

  it('el asunto decodificado nombra el plan', () => {
    const asunto = decodeURIComponent(enlace.split('?subject=')[1].split('&body=')[0]);
    expect(asunto).toBe('Solicitud de suscripción Profesional');
  });

  it('muestra precios con decimales cuando los hay', () => {
    const cuerpo = decodeURIComponent(
      subscriptionMailto('a@x.com', { plan: 'Starter', price: 9.5, fullName: 'Luis', email: 'l@x.com' }).split('&body=')[1],
    );
    expect(cuerpo).toContain('$9.50');
  });
});

describe('contactMailto', () => {
  it('sin asunto deja solo el correo codificado', () => {
    expect(contactMailto('a+b@x.com')).toBe('mailto:a%2Bb%40x.com');
  });

  it('con asunto lo codifica (tildes y espacios)', () => {
    expect(contactMailto('a@x.com', 'Respuesta: Sé más')).toBe('mailto:a%40x.com?subject=Respuesta%3A%20S%C3%A9%20m%C3%A1s');
  });
});
