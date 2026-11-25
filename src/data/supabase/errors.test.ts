import { describe, expect, it } from 'vitest';
import { AppError } from '../types';
import { toAppError, unwrap } from './errors';

describe('toAppError', () => {
  it('traduce un código de negocio conocido a su mensaje en español', () => {
    const e = toAppError({ message: 'CUPO_LLENO' });
    expect(e).toBeInstanceOf(AppError);
    expect(e.code).toBe('CUPO_LLENO');
    expect(e.message).toBe('Por ahora no hay cupos para nuevos pacientes. Inténtalo más adelante.');
  });

  it('traduce las credenciales incorrectas', () => {
    const e = toAppError({ message: 'Invalid login credentials' });
    expect(e.code).toBe('CREDENCIALES');
    expect(e.message).toBe('Correo o contraseña incorrectos.');
  });

  it('traduce un error desconocido a DATOS_INVALIDOS', () => {
    const e = toAppError({ message: 'algo raro del servidor' });
    expect(e.code).toBe('DATOS_INVALIDOS');
    expect(e.message).toBe('Revisa los datos e inténtalo de nuevo.');
  });

  it('traduce un fallo de red a RED', () => {
    const e = toAppError(new TypeError('Failed to fetch'));
    expect(e.code).toBe('RED');
  });

  it('traduce los códigos de recetas, planes y registros a su texto en español', () => {
    const esperados: Record<string, string> = {
      SIN_RECETAS: 'Este paciente ya usó sus 10 recetas del mes. Podrá recibir más cuando renueve su suscripción.',
      SIN_SUSCRIPCION_PACIENTE: 'Este paciente no tiene una suscripción activa.',
      LIMITE_DIARIO: 'Llegaste a tu límite de registros de hoy. Mejora tu plan para registrar más.',
      PACIENTE_NO_REGISTRADO: 'No hay una cuenta con ese correo. Pídele que se registre y vuelve a agregarlo.',
      PACIENTE_OCUPADO: 'Ese paciente ya está con una nutricionista.',
      RECETA_REQUERIDA: 'Cada día del calendario debe pertenecer a una receta. Crea una receta primero.',
      RECETA_CERRADA: 'Esta receta ya fue entregada y no se puede cambiar.',
      DIA_OCUPADO: 'Ese día ya tiene una receta. Elige un día libre.',
    };
    for (const [codigo, texto] of Object.entries(esperados)) {
      const e = toAppError({ message: codigo });
      expect(e.code).toBe(codigo);
      expect(e.message).toBe(texto);
    }
  });

  it('devuelve el mismo AppError si ya lo es', () => {
    const original = new AppError('NO_EXISTE', 'No encontramos eso. Puede que ya no exista.');
    expect(toAppError(original)).toBe(original);
  });
});

describe('unwrap', () => {
  it('devuelve data cuando no hay error', () => {
    expect(unwrap({ data: { id: 1 }, error: null })).toEqual({ id: 1 });
  });

  it('lanza AppError traducido cuando hay error', () => {
    expect(() => unwrap({ data: null, error: { message: 'SOLO_ADMIN' } })).toThrow(AppError);
    try {
      unwrap({ data: null, error: { message: 'SOLO_ADMIN' } });
    } catch (e) {
      expect((e as AppError).code).toBe('SOLO_ADMIN');
    }
  });
});
