import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../types';

/** Cadena de PostgREST simulada: cada método devuelve la cadena y `await` entrega `result`. */
function chain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'is', 'order', 'limit', 'update', 'upsert', 'maybeSingle', 'single']) {
    c[m] = vi.fn(() => c);
  }
  c.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(result).then(ok, ko);
  return c;
}

const sb = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  storage: { from: vi.fn() },
  auth: { getSession: vi.fn() },
}));

vi.mock('./client', () => ({ supabase: sb }));
vi.mock('../../lib/image', () => ({
  downscaleToDataUrl: vi.fn(async () => 'data:image/jpeg;base64,/9j/AA=='),
}));

import { carePart } from './care';

const { saveMyIntake, getMyIntake, requestCare, countUnreadNotifications } = carePart as Required<
  Pick<typeof carePart, 'saveMyIntake' | 'getMyIntake' | 'requestCare' | 'countUnreadNotifications'>
>;

const UID = 'user-1';

const ENTRADA = {
  full_name: 'Ana Pérez',
  birth_date: '1990-05-01',
  sex: 'femenino' as const,
  weight_kg: 70.5,
  height_cm: 165,
  waist_cm: null,
  goal: 'bajar_peso' as const,
  activity_level: 'ligero' as const,
  health_notes: null,
  photo: null,
  remove_photo: false,
  consent_photo: false,
};

let tablas: Record<string, unknown[]>;
let bucket: { upload: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn>; createSignedUrl: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.clearAllMocks();
  sb.auth.getSession.mockResolvedValue({ data: { session: { user: { id: UID } } }, error: null });
  bucket = {
    upload: vi.fn(async () => ({ data: { path: 'x' }, error: null })),
    remove: vi.fn(async () => ({ data: [], error: null })),
    createSignedUrl: vi.fn(async () => ({ data: { signedUrl: 'https://x/firmada' }, error: null })),
  };
  sb.storage.from.mockReturnValue(bucket);
  // Cada llamada a from(tabla) toma el siguiente resultado de la cola de esa tabla.
  tablas = {};
  sb.from.mockImplementation((tabla: string) => {
    const cola = tablas[tabla] ?? [];
    return chain(cola.length > 1 ? cola.shift() : cola[0] ?? { data: null, error: null });
  });
});

describe('saveMyIntake', () => {
  it('sube la foto a body-photos en la carpeta del usuario y guarda photo_path', async () => {
    tablas.profiles = [{ data: null, error: null }];
    tablas.patient_intakes = [
      { data: null, error: null }, // foto anterior: ninguna
      { data: { user_id: UID, weight_kg: '70.5', height_cm: '165.0', waist_cm: null, photo_path: 'user-1/ficha-1.jpg', consent_photo: true, consent_at: null, goal: 'bajar_peso', activity_level: 'ligero', health_notes: null, created_at: '', updated_at: '' }, error: null },
    ];
    const foto = new File([new Uint8Array([1, 2, 3])], 'cuerpo.jpg', { type: 'image/jpeg' });

    const intake = await saveMyIntake({ ...ENTRADA, photo: foto, consent_photo: true });

    expect(bucket.upload).toHaveBeenCalledTimes(1);
    const [ruta, blob, opciones] = bucket.upload.mock.calls[0];
    expect(ruta).toMatch(/^user-1\/ficha-\d+\.jpg$/);
    expect(blob).toBeInstanceOf(Blob);
    expect(opciones).toMatchObject({ contentType: 'image/jpeg', upsert: false });

    const upsert = sb.from.mock.results[2].value.upsert as ReturnType<typeof vi.fn>;
    expect(upsert.mock.calls[0][0]).toMatchObject({ user_id: UID, photo_path: ruta, consent_photo: true });
    expect(intake.photo_path).toBe('user-1/ficha-1.jpg');
    expect(intake.weight_kg).toBe(70.5);
    expect(intake.height_cm).toBe(165);
  });

  it('con remove_photo guarda photo_path null y borra la foto anterior', async () => {
    tablas.profiles = [{ data: null, error: null }];
    tablas.patient_intakes = [
      { data: { photo_path: 'user-1/vieja.jpg' }, error: null },
      { data: { user_id: UID, weight_kg: 70, height_cm: 165, waist_cm: null, photo_path: null, consent_photo: false, consent_at: null, goal: null, activity_level: null, health_notes: null, created_at: '', updated_at: '' }, error: null },
    ];

    const intake = await saveMyIntake({ ...ENTRADA, remove_photo: true });

    const upsert = sb.from.mock.results[2].value.upsert as ReturnType<typeof vi.fn>;
    expect(upsert.mock.calls[0][0]).toMatchObject({ photo_path: null });
    expect(bucket.remove).toHaveBeenCalledWith(['user-1/vieja.jpg']);
    expect(bucket.upload).not.toHaveBeenCalled();
    expect(intake.photo_path).toBeNull();
  });
});

describe('getMyIntake', () => {
  it('devuelve null si el usuario no tiene ficha', async () => {
    tablas.patient_intakes = [{ data: null, error: null }];
    expect(await getMyIntake()).toBeNull();
  });
});

describe('requestCare', () => {
  it("llama rpc('request_care', { p_message })", async () => {
    sb.rpc.mockReturnValue(
      chain({ data: { id: 'c1', patient_id: UID, status: 'abierta', message: 'Hola', created_at: '', nutritionist_id: null, accepted_at: null, closed_at: null }, error: null }),
    );

    const solicitud = await requestCare('Hola');

    expect(sb.rpc).toHaveBeenCalledWith('request_care', { p_message: 'Hola' });
    expect(solicitud.id).toBe('c1');
    expect(solicitud.status).toBe('abierta');
  });

  it('traduce FALTA_FICHA a AppError con ese código', async () => {
    sb.rpc.mockReturnValue(chain({ data: null, error: { message: 'FALTA_FICHA' } }));

    const error = await requestCare(null).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe('FALTA_FICHA');
  });
});

describe('countUnreadNotifications', () => {
  it('devuelve el count de avisos sin leer', async () => {
    tablas.notifications = [{ count: 3, error: null }];
    expect(await countUnreadNotifications()).toBe(3);
  });
});
