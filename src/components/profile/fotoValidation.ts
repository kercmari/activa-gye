/** Tipos y tamaño de la foto de perfil (mismos que el bucket `avatars`). */
export const FOTO_TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
export const FOTO_MAX_BYTES = 5 * 1024 * 1024;
export const FOTO_INVALIDA_TEXTO = 'La foto debe ser JPG, PNG o WebP de hasta 5 MB.';

/** Mensaje de error para una foto elegida (o null si sirve). Mismo texto que el código FOTO_INVALIDA. */
export function validarFoto(file: File): string | null {
  if (!FOTO_TIPOS.includes(file.type) || file.size > FOTO_MAX_BYTES) return FOTO_INVALIDA_TEXTO;
  return null;
}
