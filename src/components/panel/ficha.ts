/** Reglas y ayudas de «Mi ficha» (sin React). Rangos según el contrato de datos (PatientIntakeInput). */
import type { ActivityLevel, Goal, PatientIntakeInput, Sex } from '../../data';

export const FOTO_TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
export const FOTO_MAX_BYTES = 5 * 1024 * 1024;
export const FOTO_ERROR = 'La foto debe ser JPG, PNG o WebP de hasta 5 MB.';
export const CONSENTIMIENTO_FOTO = 'Acepto que mi nutricionista vea esta foto para dar seguimiento a mi estado inicial.';

export interface FichaValues {
  full_name: string;
  birth_date: string; // 'AAAA-MM-DD'
  sex: Sex | '';
  weight: string;
  height: string;
  waist: string;
  goal: Goal | '';
  activity: ActivityLevel | '';
  health_notes: string;
}

export type FichaErrors = Partial<Record<keyof FichaValues | 'consent', string>>;

/** Número de un campo de texto. null = vacío o no numérico. */
export function toNumber(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function validateFoto(file: File): string | null {
  if (!FOTO_TIPOS.includes(file.type) || file.size > FOTO_MAX_BYTES) return FOTO_ERROR;
  return null;
}

/** Errores por campo. `hasPhoto` = hay foto nueva o guardada que se conserva. */
export function validateFicha(v: FichaValues, opts: { hasPhoto: boolean; consent: boolean; today: string }): FichaErrors {
  const e: FichaErrors = {};
  if (v.full_name.trim().length < 2) e.full_name = 'Escribe tu nombre completo.';
  if (!v.birth_date) e.birth_date = 'Indica tu fecha de nacimiento.';
  else if (v.birth_date > opts.today) e.birth_date = 'La fecha no puede ser futura.';
  if (!v.sex) e.sex = 'Elige una opción.';
  const weight = toNumber(v.weight);
  if (weight === null || weight < 25 || weight > 350) e.weight = 'Ingresa un peso entre 25 y 350 kg.';
  const height = toNumber(v.height);
  if (height === null || height < 100 || height > 250) e.height = 'Ingresa una estatura entre 100 y 250 cm.';
  if (v.waist.trim()) {
    const waist = toNumber(v.waist);
    if (waist === null || waist < 40 || waist > 250) e.waist = 'La cintura debe estar entre 40 y 250 cm.';
  }
  if (v.health_notes.length > 1000) e.health_notes = 'Las notas no pueden pasar de 1000 caracteres.';
  if (opts.hasPhoto && !opts.consent) e.consent = 'Para guardar la foto debes aceptar el consentimiento.';
  return e;
}

export function buildIntakeInput(
  v: FichaValues,
  photo: { file: File | null; remove: boolean; consent: boolean },
): PatientIntakeInput {
  const waist = toNumber(v.waist);
  return {
    full_name: v.full_name.trim(),
    birth_date: v.birth_date,
    sex: v.sex as Sex,
    weight_kg: toNumber(v.weight) as number,
    height_cm: toNumber(v.height) as number,
    waist_cm: v.waist.trim() ? waist : null,
    goal: v.goal || null,
    activity_level: v.activity || null,
    health_notes: v.health_notes.trim() ? v.health_notes.trim() : null,
    photo: photo.file,
    remove_photo: photo.remove,
    consent_photo: photo.consent,
  };
}

/** IMC con 1 decimal y su etiqueta (mismos cortes que la guía básica). */
export function imc(weightKg: number, heightCm: number): { value: number; label: string } {
  const m = heightCm / 100;
  const value = Math.round((weightKg / (m * m)) * 10) / 10;
  const label = value < 18.5 ? 'Bajo peso' : value < 25 ? 'Peso saludable' : value < 30 ? 'Sobrepeso' : 'Obesidad';
  return { value, label };
}
