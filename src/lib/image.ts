/** Reduce una foto del navegador antes de guardarla (lado máximo y JPEG), para no llenar localStorage. */
import { AppError } from '../data/types';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;
const FOTO_INVALIDA = 'La foto debe ser JPG, PNG o WebP de hasta 5 MB.';

export async function downscaleToDataUrl(file: File, maxSide = 800): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_BYTES) {
    throw new AppError('FOTO_INVALIDA', FOTO_INVALIDA);
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      throw new AppError('FOTO_INVALIDA', FOTO_INVALIDA);
    }

    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new AppError('FOTO_INVALIDA', FOTO_INVALIDA);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}
