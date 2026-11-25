/** Traduce errores de Supabase (Postgres, Auth y red) a AppError con mensaje en español (dueño: D1). */
import { AppError } from '../types';

const MENSAJES: Record<string, string> = {
  SIN_SESION: 'Inicia sesión para continuar.',
  CREDENCIALES: 'Correo o contraseña incorrectos.',
  CORREO_EN_USO: 'Ya existe una cuenta con ese correo.',
  CORREO_SIN_CONFIRMAR: 'Revisa tu correo para confirmar la cuenta y luego inicia sesión.',
  MENOR_DE_16: 'Debes tener al menos 16 años para registrarte.',
  SOLO_ADMIN: 'Solo el administrador puede hacer esto.',
  SOLO_NUTRICIONISTA: 'Solo los nutricionistas pueden hacer esto.',
  NO_EXISTE: 'No encontramos eso. Puede que ya no exista.',
  YA_TOMADA: 'Otro nutricionista ya aceptó esta solicitud.',
  YA_TOMADA_O_NO_EXISTE: 'Otro nutricionista ya aceptó esta solicitud.',
  FOTO_SIN_CONSENTIMIENTO: 'Necesitamos tu permiso para guardar la foto.',
  FOTO_MENOR_18: 'Las fotos de cuerpo solo se guardan para mayores de 18 años.',
  FOTO_INVALIDA: 'La foto debe ser jpg, png o webp de hasta 5 MB.',
  DEMASIADOS_MENSAJES: 'Enviaste muchos mensajes. Intenta en una hora.',
  DATOS_INVALIDOS: 'Revisa los datos e inténtalo de nuevo.',
  NO_PUEDES_CAMBIAR_TU_ROL: 'No puedes cambiar tu propio rol.',
  CUENTA_NO_EXISTE: 'No encontramos esa cuenta.',
  ROL_PROTEGIDO: 'No puedes cambiar tu rol desde aquí.',
  CUPO_LLENO: 'Por ahora no hay cupos para nuevos pacientes. Inténtalo más adelante.',
  FASE_NO_ACTIVA: 'Esta función aún no está habilitada.',
  REQUIERE_NUTRICIONISTA: 'Por tus condiciones de salud, una nutricionista debe revisar tu caso. Pide atención directa desde «Nutricionista».',
  SIN_PLANTILLA: 'Todavía no hay un plan disponible para tu perfil. Pide atención a una nutricionista.',
  FALTA_FICHA: 'Primero completa tu ficha para pedir un nutricionista.',
  YA_TIENES_SOLICITUD: 'Ya tienes una solicitud en curso.',
  SIN_SUSCRIPCION: 'Necesitas una suscripción activa para aceptar pacientes.',
  CUPO_PLAN_LLENO: 'Llegaste al cupo de pacientes de tu plan.',
  YA_TIENES_SUSCRIPCION: 'Ya tienes una suscripción activa.',
  NO_ES_TU_PACIENTE: 'Esa persona no es tu paciente.',
  NO_PERMITIDO: 'No tienes permiso para hacer esto.',
  NO_ASIGNADA_A_TI: 'Esta solicitud no está asignada a ti.',
  PLAN_MUY_CORTO: 'El plan es muy corto. Escribe más detalle.',
  SIN_RECETAS: 'Este paciente ya usó sus recetas de este período. Podrá recibir más cuando renueve su suscripción.',
  SIN_SUSCRIPCION_PACIENTE: 'Este paciente no tiene una suscripción activa.',
  LIMITE_DIARIO: 'Llegaste a tu límite de registros de hoy. Mejora tu plan para registrar más.',
  PACIENTE_NO_REGISTRADO: 'No hay una cuenta con ese correo. Pídele que se registre y vuelve a agregarlo.',
  PACIENTE_OCUPADO: 'Ese paciente ya está con una nutricionista.',
  RECETA_REQUERIDA: 'Cada día del calendario debe pertenecer a una receta. Crea una receta primero.',
  RECETA_CERRADA: 'Esta receta ya fue entregada y no se puede cambiar.',
  DIA_OCUPADO: 'Ese día ya tiene una receta. Elige un día libre.',
  SIN_BASE: 'Esta función necesita la base de datos. Inténtalo más tarde.',
  RED: 'No pudimos conectarnos. Revisa tu internet.',
};

const RED_PATRON = /failed to fetch|networkerror|network request failed|load failed|fetch failed/i;

function mensajeDe(e: unknown): string {
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return '';
}

/** Convierte cualquier error (Postgres, Auth, red, AppError) en AppError con código y mensaje en español. */
export function toAppError(e: unknown): AppError {
  if (e instanceof AppError) return e;
  const message = mensajeDe(e).trim();

  if (MENSAJES[message]) return new AppError(message, MENSAJES[message]);
  if (message === 'Invalid login credentials') return new AppError('CREDENCIALES', MENSAJES.CREDENCIALES);
  if (message === 'User already registered') return new AppError('CORREO_EN_USO', MENSAJES.CORREO_EN_USO);
  if (/jwt|auth session missing|sin sesión/i.test(message)) return new AppError('SIN_SESION', MENSAJES.SIN_SESION);
  if (RED_PATRON.test(message)) return new AppError('RED', MENSAJES.RED);
  return new AppError('DATOS_INVALIDOS', MENSAJES.DATOS_INVALIDOS);
}

/** Devuelve `data` o lanza el error traducido. Úsalo con cada respuesta de Supabase. */
export function unwrap<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw toAppError(res.error);
  return res.data as T;
}
