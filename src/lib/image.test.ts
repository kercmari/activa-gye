import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downscaleToBlob, downscaleToDataUrl } from './image';

// jsdom no trae Image decodificable ni canvas: se simulan las medidas y el dibujo.
let dims = { w: 1000, h: 500 };
let decodeOk = true;
let canvasCreados: { width: number; height: number }[] = [];

class FakeImage {
  naturalWidth = 0;
  naturalHeight = 0;
  src = '';
  decode(): Promise<void> {
    this.naturalWidth = dims.w;
    this.naturalHeight = dims.h;
    return decodeOk ? Promise.resolve() : Promise.reject(new Error('no decodifica'));
  }
}

const foto = (tipo = 'image/jpeg') => new File(['x'], 'foto.jpg', { type: tipo });

beforeEach(() => {
  dims = { w: 1000, h: 500 };
  decodeOk = true;
  canvasCreados = [];
  vi.stubGlobal('Image', FakeImage);
  URL.createObjectURL = vi.fn(() => 'blob:falso');
  URL.revokeObjectURL = vi.fn();
  const crearCanvas = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string, opts?: ElementCreationOptions) => {
    if (tag !== 'canvas') return crearCanvas(tag, opts);
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn() }),
      toDataURL: () => `data:image/jpeg;base64,${canvas.width}x${canvas.height}`,
      toBlob: (cb: (b: Blob | null) => void) => {
        canvasCreados.push({ width: canvas.width, height: canvas.height });
        cb(new Blob(['jpg'], { type: 'image/jpeg' }));
      },
    };
    return canvas as unknown as HTMLCanvasElement;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('downscaleToBlob', () => {
  it('reduce el lado mayor a maxSide manteniendo la proporción y devuelve JPEG', async () => {
    const blob = await downscaleToBlob(foto(), 512);
    expect(blob.type).toBe('image/jpeg');
    expect(canvasCreados[0]).toEqual({ width: 512, height: 256 });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:falso');
  });

  it('no agranda una foto más pequeña que maxSide', async () => {
    dims = { w: 200, h: 100 };
    await downscaleToBlob(foto('image/png'), 512);
    expect(canvasCreados[0]).toEqual({ width: 200, height: 100 });
  });

  it('tipo no permitido → FOTO_INVALIDA sin leer la imagen', async () => {
    await expect(downscaleToBlob(foto('image/gif'))).rejects.toMatchObject({ code: 'FOTO_INVALIDA' });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('archivo que no se decodifica → FOTO_INVALIDA', async () => {
    decodeOk = false;
    await expect(downscaleToBlob(foto())).rejects.toMatchObject({ code: 'FOTO_INVALIDA' });
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});

describe('downscaleToDataUrl', () => {
  it('sigue devolviendo una data URL JPEG con el mismo escalado', async () => {
    const url = await downscaleToDataUrl(foto(), 800);
    expect(url).toBe('data:image/jpeg;base64,800x400');
  });
});
