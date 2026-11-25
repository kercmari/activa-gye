import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Cadena de PostgREST simulada: cada método devuelve la cadena y `await` entrega `result`. */
function chain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'order']) {
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
vi.mock('./account', () => ({ getSettings: vi.fn() }));

import { getSettings } from './account';
import { recetasPart } from './recetas';

const {
  listPrescriptions,
  listMyPrescriptions,
  savePrescription,
  deletePrescription,
  deliverPrescription,
  getRecipeBalance,
  nutriAddPatient,
  getNutriLimits,
  adminSubscriptionsOverview,
  adminSaveContactSettings,
} = recetasPart as Required<typeof recetasPart>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('recetas', () => {
  it('listPrescriptions lee la tabla filtrando por paciente', async () => {
    const q = chain({ data: [{ id: 'r1' }], error: null });
    sb.from.mockReturnValue(q);

    const filas = await listPrescriptions('pac-1');

    expect(sb.from).toHaveBeenCalledWith('prescriptions');
    expect(q.eq).toHaveBeenCalledWith('patient_id', 'pac-1');
    expect(filas).toEqual([{ id: 'r1' }]);
  });

  it('listMyPrescriptions lee la tabla sin filtro (la política deja solo las entregadas)', async () => {
    const q = chain({ data: [], error: null });
    sb.from.mockReturnValue(q);

    await listMyPrescriptions();

    expect(sb.from).toHaveBeenCalledWith('prescriptions');
    expect(q.eq).not.toHaveBeenCalled();
  });

  it('savePrescription sin id llama save_prescription con p_id null', async () => {
    sb.rpc.mockResolvedValue({ data: { id: 'r1', status: 'borrador' }, error: null });

    const r = await savePrescription({ patient_id: 'pac-1', kind: 'dieta', title: 'Plan', body: 'Comidas' });

    expect(sb.rpc).toHaveBeenCalledWith('save_prescription', {
      p_id: null,
      p_patient: 'pac-1',
      p_kind: 'dieta',
      p_title: 'Plan',
      p_body: 'Comidas',
    });
    expect(r).toEqual({ id: 'r1', status: 'borrador' });
  });

  it('savePrescription con id pasa p_id', async () => {
    sb.rpc.mockResolvedValue({ data: { id: 'r1' }, error: null });

    await savePrescription({ id: 'r1', patient_id: 'pac-1', kind: 'rutina', title: 'Rutina', body: 'x' });

    expect(sb.rpc).toHaveBeenCalledWith('save_prescription', expect.objectContaining({ p_id: 'r1', p_kind: 'rutina' }));
  });

  it('deletePrescription llama delete_prescription', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: null });

    await deletePrescription('r1');

    expect(sb.rpc).toHaveBeenCalledWith('delete_prescription', { p_id: 'r1' });
  });

  it('deliverPrescription llama deliver_prescription y devuelve la receta', async () => {
    sb.rpc.mockResolvedValue({ data: { id: 'r1', status: 'entregada' }, error: null });

    const r = await deliverPrescription('r1');

    expect(sb.rpc).toHaveBeenCalledWith('deliver_prescription', { p_id: 'r1' });
    expect(r.status).toBe('entregada');
  });

  it('getRecipeBalance con paciente pasa p_patient y convierte números', async () => {
    sb.rpc.mockResolvedValue({ data: { left: '7', quota: '10', period_end: '2026-12-24' }, error: null });

    const saldo = await getRecipeBalance('pac-1');

    expect(sb.rpc).toHaveBeenCalledWith('patient_recipe_balance', { p_patient: 'pac-1' });
    expect(saldo).toEqual({ left: 7, quota: 10, period_end: '2026-12-24' });
  });

  it('getRecipeBalance sin paciente no pasa p_patient (usa auth.uid() de la base)', async () => {
    sb.rpc.mockResolvedValue({ data: { left: 0, quota: 0, period_end: null }, error: null });

    await getRecipeBalance();

    expect(sb.rpc).toHaveBeenCalledWith('patient_recipe_balance', {});
  });

  it('nutriAddPatient llama nutri_add_patient con el correo', async () => {
    sb.rpc.mockResolvedValue({ data: { patient_id: 'pac-1', prescription_id: 'r1' }, error: null });

    const r = await nutriAddPatient('ana@x.com');

    expect(sb.rpc).toHaveBeenCalledWith('nutri_add_patient', { p_email: 'ana@x.com' });
    expect(r).toEqual({ patient_id: 'pac-1', prescription_id: 'r1' });
  });

  it('getNutriLimits llama nutri_limits y mapea los límites', async () => {
    sb.rpc.mockResolvedValue({
      data: { plan_name: 'Starter', patient_quota: '15', daily_record_limit: '60', patients_used: 2, records_today: '4' },
      error: null,
    });

    const l = await getNutriLimits();

    expect(sb.rpc).toHaveBeenCalledWith('nutri_limits');
    expect(l).toEqual({ plan_name: 'Starter', patient_quota: 15, daily_record_limit: 60, patients_used: 2, records_today: 4 });
  });

  it('adminSubscriptionsOverview llama admin_subscriptions_overview y convierte montos', async () => {
    sb.rpc.mockResolvedValue({
      data: {
        pending: [{ invoice_id: 'f1', amount: '19.00', recipes_left: null, status: 'pendiente' }],
        active: [{ invoice_id: 'f2', amount: '40', recipes_left: '7', status: 'activa' }],
      },
      error: null,
    });

    const o = await adminSubscriptionsOverview();

    expect(sb.rpc).toHaveBeenCalledWith('admin_subscriptions_overview');
    expect(o.pending[0].amount).toBe(19);
    expect(o.active[0].recipes_left).toBe(7);
  });

  it('adminSaveContactSettings llama admin_set_contact_settings y devuelve los ajustes nuevos', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: null });
    const ajustes = { phase1: true, phase2: true, phase3: false, patient_limit: 5, patients_count: 1, admin_email: 'b@x.com', free_patient_limit: 3, free_daily_record_limit: 10 };
    vi.mocked(getSettings).mockResolvedValue(ajustes);

    const r = await adminSaveContactSettings({ admin_email: 'b@x.com', free_patient_limit: 3, free_daily_record_limit: 10 });

    expect(sb.rpc).toHaveBeenCalledWith('admin_set_contact_settings', {
      p_admin_email: 'b@x.com',
      p_free_patient_limit: 3,
      p_free_daily_record_limit: 10,
    });
    expect(r).toEqual(ajustes);
  });
});
