/**
 * Acepta solo rutas internas para `?volver=`: deben empezar con "/" y no con "//" ni "/\"
 * (los navegadores tratan "/\" como "//"). Si no, devuelve null.
 */
export function safeInternalPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//') || value.startsWith('/\\')) return null;
  return value;
}
