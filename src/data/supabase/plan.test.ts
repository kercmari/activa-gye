import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../types';

/** Cadena de PostgREST simulada: cada método devuelve la cadena y `await` entrega `result`. */
function chain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of [
    'select',
    'eq',
    'gte',
    'lte',
    'order',
    'insert',
    'update',
    'upsert',
    'delete',
    'single',
    'maybeSingle',
  ]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(result).then(ok, ko);
  return c;
}

const sb = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  auth: { getSession: vi.fn() },
}));

vi.mock('./client', () => ({ supabase: sb }));

import { planPart } from './plan';

const {
  copyPlanWeek,
  savePlanDay,
  markInvoicePaid,
  getRating,
  listFollowups,
  listPlans,
  adminListSubscriptions,
  saveReview,
} = planPart as Required<
  Pick<
    typeof planPart,
    | 'copyPlanWeek'
    | 'savePlanDay'
    | 'markInvoicePaid'
    | 'getRating'
    | 'listFollowups'
    | 'listPlans'
    | 'adminListSubscriptions'
    | 'saveReview'
  >
>;

beforeEach(() => {
  vi.clearAllMocks();
  sb.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'nutri-1' } } }, error: null });
});

describe('copyPlanWeek', () => {
  it('llama la RPC con p_patient, p_from y p_to y devuelve el número copiado', async () => {
    sb.rpc.mockResolvedValue({ data: 7, error: null });

    const copiados = await copyPlanWeek('pac-1', '2026-11-16', '2026-11-23', 'rec-1');

    expect(sb.rpc).toHaveBeenCalledWith('copy_plan_week', {
      p_patient: 'pac-1',
      p_from: '2026-11-16',
      p_to: '2026-11-23',
      p_prescription: 'rec-1',
    });
    expect(copiados).toBe(7);
  });
});

describe('savePlanDay', () => {
  const DIA = {
    day: '2026-11-24',
    title: 'Semana de fuerza',
    meals: null,
    exercise: null,
    notes: null,
    prescription_id: 'rec-1',
  };

  it('sin id inserta el día con patient_id y su receta', async () => {
    const insertado = { id: 'd-1', ...DIA, patient_id: 'pac-1' };
    const q = chain({ data: insertado, error: null });
    sb.from.mockReturnValue(q);

    const res = await savePlanDay('pac-1', DIA);

    expect(sb.from).toHaveBeenCalledWith('plan_days');
    expect(q.insert).toHaveBeenCalledWith(
      expect.objectContaining({ patient_id: 'pac-1', day: DIA.day, prescription_id: 'rec-1' }),
    );
    expect(q.update).not.toHaveBeenCalled();
    expect(res).toEqual(insertado);
  });

  it('con id actualiza el día existente', async () => {
    const actualizado = { id: 'd-1', ...DIA, title: 'Otro título', patient_id: 'pac-1' };
    const q = chain({ data: actualizado, error: null });
    sb.from.mockReturnValue(q);

    const res = await savePlanDay('pac-1', { id: 'd-1', ...DIA, title: 'Otro título' });

    expect(q.update).toHaveBeenCalledWith(expect.objectContaining({ title: 'Otro título' }));
    expect(q.eq).toHaveBeenCalledWith('id', 'd-1');
    expect(q.insert).not.toHaveBeenCalled();
    expect(res.title).toBe('Otro título');
  });

  it('un día repetido se traduce a DATOS_INVALIDOS con mensaje en español', async () => {
    sb.from.mockReturnValue(chain({ data: null, error: { code: '23505', message: 'duplicate key' } }));

    const err = await savePlanDay('pac-1', DIA).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe('DATOS_INVALIDOS');
    expect((err as AppError).message).toBe('Ya hay un plan para ese día.');
  });
});

describe('markInvoicePaid', () => {
  it('traduce NO_PERMITIDO a AppError', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: { message: 'NO_PERMITIDO' } });

    const err = await markInvoicePaid('f-1').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe('NO_PERMITIDO');
    expect(sb.rpc).toHaveBeenCalledWith('mark_invoice_paid', { p_id: 'f-1' });
  });
});

describe('getRating', () => {
  it('devuelve { average, count } desde la RPC', async () => {
    sb.rpc.mockResolvedValue({ data: { average: 4.5, count: 2 }, error: null });

    const r = await getRating('nutricionista', 'nutri-1');

    expect(sb.rpc).toHaveBeenCalledWith('rating_summary', {
      p_target_type: 'nutricionista',
      p_target_id: 'nutri-1',
    });
    expect(r).toEqual({ average: 4.5, count: 2 });
  });

  it('convierte numeric llegado como texto y sin reseñas da average null', async () => {
    sb.rpc.mockResolvedValue({ data: { average: '3.7', count: '3' }, error: null });
    expect(await getRating('lugar', 'p-1')).toEqual({ average: 3.7, count: 3 });

    sb.rpc.mockResolvedValue({ data: { average: null, count: 0 }, error: null });
    expect(await getRating('lugar', 'p-2')).toEqual({ average: null, count: 0 });
  });
});

describe('conversión de numeric', () => {
  it('listFollowups convierte peso y cintura a number', async () => {
    sb.from.mockReturnValue(
      chain({
        data: [
          {
            id: 'f-1',
            patient_id: 'pac-1',
            nutritionist_id: 'nutri-1',
            followup_date: '2026-11-20',
            weight_kg: '68.5',
            waist_cm: null,
            observations: 'Buen progreso',
            recommendations: 'Seguir igual',
            created_at: '2026-11-20T10:00:00Z',
          },
        ],
        error: null,
      }),
    );

    const [f] = await listFollowups('pac-1');

    expect(f.weight_kg).toBe(68.5);
    expect(f.waist_cm).toBeNull();
  });

  it('listPlans convierte precio y cupo a number', async () => {
    sb.from.mockReturnValue(
      chain({
        data: [{ id: 'p-1', name: 'Básico', monthly_price: '10.00', patient_quota: '10', active: true, sort: 1 }],
        error: null,
      }),
    );

    const [p] = await listPlans();

    expect(p.monthly_price).toBe(10);
    expect(p.patient_quota).toBe(10);
  });

  it('adminListSubscriptions arma el plan anidado', async () => {
    sb.rpc.mockResolvedValue({
      data: [
        {
          id: 's-1',
          nutritionist_id: 'nutri-1',
          plan_id: 'p-2',
          status: 'activa',
          current_period_end: '2026-12-20T00:00:00Z',
          created_at: '2026-11-01T00:00:00Z',
          nutritionist_name: 'Lucía',
          plan_name: 'Pro',
          monthly_price: '25.00',
          patient_quota: '40',
        },
      ],
      error: null,
    });

    const [s] = await adminListSubscriptions();

    expect(s.plan).toMatchObject({ id: 'p-2', name: 'Pro', monthly_price: 25, patient_quota: 40 });
  });
});

describe('saveReview', () => {
  it('hace upsert por (objetivo, autor) y quita comentarios vacíos', async () => {
    const q = chain({
      data: { id: 'r-1', target_type: 'lugar', target_id: 'p-1', author_id: 'nutri-1', stars: '5', comment: null },
      error: null,
    });
    sb.from.mockReturnValue(q);

    const r = await saveReview({ target_type: 'lugar', target_id: 'p-1', stars: 5, comment: '   ' });

    expect(q.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ comment: null, stars: 5 }),
      { onConflict: 'target_type,target_id,author_id' },
    );
    expect(r.stars).toBe(5);
  });
});
