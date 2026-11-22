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
import { trialPart } from './trial';

type TrialPart = Required<typeof trialPart>;
const {
  getMyTrial,
  startMyTrial,
  getPatientTrial,
  setTrialItemDone,
  listCheckins,
  saveTodayCheckin,
  getMyPatientSubscription,
  adminSaveTemplate,
  adminSaveTemplateItem,
  adminListTemplates,
  listGuide,
  adminSaveGuideEntry,
} = trialPart as TrialPart;
const { listPlans } = planPart as Required<Pick<typeof planPart, 'listPlans'>>;

const DIA_CERRADO = { day_number: 2, unlocked: false, unlocked_on: null, completed_at: null, items_total: '6', items_done: '0', items: [] };

function trialJson() {
  return {
    template_name: 'Mantener · general',
    template_status: 'borrador',
    author_name: 'Pendiente de revisión',
    kcal_target: '1850',
    portion_factor: '0.93',
    started_on: '2026-11-21',
    today: '2026-11-21',
    current_day: '1',
    finished: false,
    days: [
      {
        day_number: '1',
        unlocked: true,
        unlocked_on: '2026-11-21',
        completed_at: null,
        items_total: '6',
        items_done: '2',
        items: [
          { id: 'i-1', at_time: '08:00:00', kind: 'comida', title: 'Bolón de verde', detail: '1 unidad', done: true },
        ],
      },
      DIA_CERRADO,
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  sb.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'pac-1' } } }, error: null });
});

describe('semana gratis: conversión de my_trial', () => {
  it('convierte números y horas, y deja vacíos los ítems de un día cerrado', async () => {
    sb.rpc.mockResolvedValue({ data: trialJson(), error: null });

    const t = await getMyTrial();

    expect(sb.rpc).toHaveBeenCalledWith('my_trial');
    expect(t?.kcal_target).toBe(1850);
    expect(t?.portion_factor).toBe(0.93);
    expect(t?.current_day).toBe(1);
    expect(t?.days[0].items[0].at_time).toBe('08:00');
    expect(t?.days[0].items_done).toBe(2);
    expect(t?.days[1].unlocked).toBe(false);
    expect(t?.days[1].items).toEqual([]);
  });

  it('devuelve null cuando no hay semana', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: null });
    expect(await getMyTrial()).toBeNull();
  });

  it('getPatientTrial pasa p_user', async () => {
    sb.rpc.mockResolvedValue({ data: trialJson(), error: null });
    await getPatientTrial('pac-9');
    expect(sb.rpc).toHaveBeenCalledWith('my_trial', { p_user: 'pac-9' });
  });

  it('setTrialItemDone llama set_trial_item_done y convierte la respuesta', async () => {
    sb.rpc.mockResolvedValue({ data: trialJson(), error: null });
    const t = await setTrialItemDone('i-1', true);
    expect(sb.rpc).toHaveBeenCalledWith('set_trial_item_done', { p_id: 'i-1', p_done: true });
    expect(t.days).toHaveLength(2);
  });
});

describe('semana gratis: asignación', () => {
  it('startMyTrial propaga REQUIERE_NUTRICIONISTA con su mensaje en español', async () => {
    sb.rpc.mockResolvedValueOnce({ data: null, error: { message: 'REQUIERE_NUTRICIONISTA' } });

    const err = await startMyTrial().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe('REQUIERE_NUTRICIONISTA');
    expect((err as AppError).message).toMatch(/nutricionista/i);
  });

  it('startMyTrial llama assign_trial y luego my_trial', async () => {
    sb.rpc
      .mockResolvedValueOnce({ data: { id: 'x' }, error: null })
      .mockResolvedValueOnce({ data: trialJson(), error: null });

    const t = await startMyTrial();

    expect(sb.rpc.mock.calls.map((c) => c[0])).toEqual(['assign_trial', 'my_trial']);
    expect(t.template_name).toBe('Mantener · general');
  });
});

describe('chequeos', () => {
  it('listCheckins ordena por fecha ascendente', async () => {
    const q = chain({ data: [], error: null });
    sb.from.mockReturnValue(q);

    await listCheckins('pac-1', 14);

    expect(sb.from).toHaveBeenCalledWith('daily_checkins');
    expect((q as Record<string, ReturnType<typeof vi.fn>>).order).toHaveBeenCalledWith('checkin_date', { ascending: true });
    expect((q as Record<string, ReturnType<typeof vi.fn>>).eq).toHaveBeenCalledWith('user_id', 'pac-1');
  });

  it('saveTodayCheckin llama save_checkin y convierte peso y agua', async () => {
    sb.rpc.mockResolvedValue({
      data: { id: 'c-1', checkin_date: '2026-11-21', mood: 4, weight_kg: '71.5', water_glasses: '6', note: null, created_at: 'x' },
      error: null,
    });

    const c = await saveTodayCheckin({ mood: 4, weight_kg: 71.5, water_glasses: 6, note: null });

    expect(sb.rpc).toHaveBeenCalledWith('save_checkin', { p_mood: 4, p_weight: 71.5, p_water: 6, p_note: null });
    expect(c.weight_kg).toBe(71.5);
    expect(c.water_glasses).toBe(6);
  });
});

describe('planes', () => {
  it('listPlans filtra audience nutricionista', async () => {
    const q = chain({ data: [], error: null });
    sb.from.mockReturnValue(q);

    await listPlans();

    expect((q as Record<string, ReturnType<typeof vi.fn>>).eq).toHaveBeenCalledWith('audience', 'nutricionista');
  });

  it('getMyPatientSubscription devuelve la primera fila o null', async () => {
    sb.rpc.mockResolvedValueOnce({ data: [], error: null });
    expect(await getMyPatientSubscription()).toBeNull();

    sb.rpc.mockResolvedValueOnce({
      data: [
        {
          id: 's-1',
          plan_id: 'p-1',
          plan_name: 'Seguimiento mensual',
          monthly_price: '15.00',
          status: 'activa',
          current_period_end: '2026-12-21T00:00:00Z',
          created_at: 'x',
        },
      ],
      error: null,
    });
    const s = await getMyPatientSubscription();
    expect(s?.monthly_price).toBe(15);
    expect(s?.status).toBe('activa');
  });
});

describe('plantillas y guía (nutricionista)', () => {
  it('adminListTemplates cuenta los ítems de cada plantilla', async () => {
    sb.from.mockReturnValue(
      chain({
        data: [
          {
            id: 't-1',
            name: 'Bajar peso · femenino',
            description: null,
            sex: 'femenino',
            age_min: 18,
            age_max: 29,
            bmi_min: '25.0',
            bmi_max: '30.0',
            goal: 'bajar_peso',
            kcal_base: 1600,
            author_name: 'Pendiente de revisión',
            status: 'borrador',
            is_fallback: false,
            plan_template_items: [{ count: '35' }],
          },
        ],
        error: null,
      }),
    );

    const [t] = await adminListTemplates();

    expect(t.items_count).toBe(35);
    expect(t.bmi_min).toBe(25);
    expect(t.kcal_base).toBe(1600);
  });

  it('adminSaveTemplate hace upsert de la plantilla y devuelve la fila guardada', async () => {
    const q = chain({
      data: {
        id: 't-2',
        name: 'Respaldo',
        description: null,
        sex: 'cualquiera',
        age_min: 0,
        age_max: 120,
        bmi_min: '0',
        bmi_max: '99',
        goal: null,
        kcal_base: 2000,
        author_name: 'Pendiente de revisión',
        status: 'borrador',
        is_fallback: true,
        plan_template_items: [],
      },
      error: null,
    });
    sb.from.mockReturnValue(q);

    const t = await adminSaveTemplate({
      name: 'Respaldo',
      description: null,
      sex: 'cualquiera',
      age_min: 0,
      age_max: 120,
      bmi_min: 0,
      bmi_max: 99,
      goal: null,
      kcal_base: 2000,
      author_name: 'Pendiente de revisión',
      status: 'borrador',
      is_fallback: true,
    });

    expect(sb.from).toHaveBeenCalledWith('plan_templates');
    expect((q as Record<string, ReturnType<typeof vi.fn>>).upsert).toHaveBeenCalled();
    expect(t.is_fallback).toBe(true);
    expect(t.items_count).toBe(0);
  });

  it('adminSaveTemplateItem guarda la hora HH:MM', async () => {
    const q = chain({
      data: { id: 'it-1', template_id: 't-2', day_number: '1', at_time: '07:30:00', kind: 'comida', title: 'Avena', detail: null, sort: 0 },
      error: null,
    });
    sb.from.mockReturnValue(q);

    const it1 = await adminSaveTemplateItem({
      template_id: 't-2',
      day_number: 1,
      at_time: '07:30',
      kind: 'comida',
      title: 'Avena',
      detail: null,
      sort: 0,
    });

    expect(sb.from).toHaveBeenCalledWith('plan_template_items');
    expect(it1.at_time).toBe('07:30');
    expect(it1.day_number).toBe(1);
  });

  it('listGuide pide solo publicadas, por categoría y orden', async () => {
    const q = chain({ data: [], error: null });
    sb.from.mockReturnValue(q);

    await listGuide();

    expect((q as Record<string, ReturnType<typeof vi.fn>>).eq).toHaveBeenCalledWith('published', true);
    expect((q as Record<string, ReturnType<typeof vi.fn>>).order).toHaveBeenCalledWith('category', { ascending: true });
  });

  it('adminSaveGuideEntry guarda una entrada con sus listas', async () => {
    const q = chain({
      data: {
        id: 'g-1',
        slug: 'agua-diaria',
        category: 'hidratacion',
        title: 'Agua diaria',
        summary: null,
        objective: null,
        do_items: ['Beber agua en ayunas'],
        avoid_items: [],
        steps: ['Llena una botella', 'Bebe a lo largo del día', 'Revisa al final'],
        source: 'OMS',
        published: true,
        sort: '1',
        updated_at: 'x',
      },
      error: null,
    });
    sb.from.mockReturnValue(q);

    const g = await adminSaveGuideEntry({
      slug: 'agua-diaria',
      category: 'hidratacion',
      title: 'Agua diaria',
      summary: null,
      objective: null,
      do_items: ['Beber agua en ayunas'],
      avoid_items: [],
      steps: ['Llena una botella', 'Bebe a lo largo del día', 'Revisa al final'],
      source: 'OMS',
      published: true,
      sort: 1,
    });

    expect((q as Record<string, ReturnType<typeof vi.fn>>).upsert).toHaveBeenCalled();
    expect(g.sort).toBe(1);
    expect(g.steps).toHaveLength(3);
  });
});
