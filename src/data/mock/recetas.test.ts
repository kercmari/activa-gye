import { describe, it, expect, beforeEach } from 'vitest';
import type { CareRequest, Profile, Repo, Role, SubscriptionStatus } from '../types';
import { AppError } from '../types';
import { accountsPart } from './accounts';
import { readTable, writeTable, setSessionUserId, type StoredUser } from './store';

// Casos S13 2, 3, 5, 6 y S12 3–5, en versión simulador (diseño §5).
const repo = accountsPart as Repo;
const DAY = 24 * 60 * 60 * 1000;
const FUTURO = new Date(Date.now() + 20 * DAY).toISOString();
const PASADO = new Date(Date.now() - 5 * DAY).toISOString();

function perfil(id: string, role: Role, nombre: string): Profile {
  const ahora = new Date().toISOString();
  return {
    id, full_name: nombre, birth_date: null, sex: null, phone: null, sector_id: null, goal: null,
    activity_level: null, role, created_at: ahora, updated_at: ahora,
  };
}

const USUARIOS: StoredUser[] = [
  { id: 'adm', email: 'admin@t.test', password_hash: 'x', profile: perfil('adm', 'admin', 'Administración') },
  { id: 'nut', email: 'nut@t.test', password_hash: 'x', profile: perfil('nut', 'nutricionista', 'Nutri Uno') },
  { id: 'nut2', email: 'nut2@t.test', password_hash: 'x', profile: perfil('nut2', 'nutricionista', 'Nutri Dos') },
  ...['pac', 'pac2', 'pac3', 'pac4', 'pac5', 'pac6'].map((id) => ({
    id, email: `${id}@t.test`, password_hash: 'x', profile: perfil(id, 'usuario', `Paciente ${id}`),
  })),
];

function como(id: string): void {
  setSessionUserId(id);
}

function seedCare(patientId: string, nutriId: string | null, status: CareRequest['status'], origin: CareRequest['origin']): void {
  const filas = readTable<CareRequest>('care_requests');
  writeTable('care_requests', [...filas, {
    id: `atencion-${patientId}-${filas.length}`, patient_id: patientId, nutritionist_id: nutriId, status,
    message: null, created_at: PASADO, accepted_at: null, closed_at: null, origin,
  }]);
}

function seedSub(tabla: 'subscriptions' | 'patient_subscriptions', userId: string, planId: string, recipesLeft = 0, end = FUTURO): string {
  const id = `sub-${userId}-${planId}`;
  const filas = readTable<Record<string, unknown>>(tabla);
  writeTable(tabla, [...filas, {
    id, user_id: userId, plan_id: planId, status: 'activa' as SubscriptionStatus,
    current_period_end: end, created_at: PASADO, recipes_left: recipesLeft,
  }]);
  return id;
}

/** Devuelve el código de error, o 'OK' si la promesa se cumple. */
async function codigo(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return 'OK';
  } catch (e) {
    return e instanceof AppError ? e.code : `NO_APP_ERROR: ${String(e)}`;
  }
}

async function saldo(patientId: string): Promise<number> {
  como(patientId);
  return (await repo.getRecipeBalance()).left;
}

beforeEach(() => {
  localStorage.clear();
  writeTable('users', USUARIOS);
});

describe('S13 caso 2 — paciente de plataforma', () => {
  it('entregar descuenta; la 11.ª receta → SIN_RECETAS; entregar dos veces no descuenta', async () => {
    seedSub('patient_subscriptions', 'pac', 'plan-paciente', 10);
    seedSub('subscriptions', 'nut', 'plan-profesional');
    seedCare('pac', 'nut', 'aceptada', 'plataforma');
    como('nut');
    const recetas = [];
    for (let i = 0; i < 11; i++) {
      recetas.push(await repo.savePrescription({ patient_id: 'pac', kind: 'dieta', title: `Dieta ${i + 1}`, body: 'Texto' }));
    }

    await repo.deliverPrescription(recetas[0].id);
    expect(await saldo('pac')).toBe(9);

    como('nut');
    expect(await codigo(repo.deliverPrescription(recetas[0].id))).toBe('RECETA_CERRADA');
    expect(await saldo('pac')).toBe(9);

    como('nut');
    for (let i = 1; i < 10; i++) await repo.deliverPrescription(recetas[i].id);
    expect(await saldo('pac')).toBe(0);

    como('nut');
    expect(await codigo(repo.deliverPrescription(recetas[10].id))).toBe('SIN_RECETAS');
  });

  it('sin suscripción activa → SIN_SUSCRIPCION_PACIENTE', async () => {
    seedSub('subscriptions', 'nut', 'plan-profesional');
    seedCare('pac2', 'nut', 'aceptada', 'plataforma');
    como('nut');
    const receta = await repo.savePrescription({ patient_id: 'pac2', kind: 'rutina', title: 'Rutina', body: '' });
    expect(await codigo(repo.deliverPrescription(receta.id))).toBe('SIN_SUSCRIPCION_PACIENTE');
  });
});

describe('S13 caso 3 — paciente propio', () => {
  it('entregar no descuenta y no exige suscripción del paciente', async () => {
    seedSub('subscriptions', 'nut', 'plan-profesional');
    como('nut');
    const alta = await repo.nutriAddPatient('pac3@t.test');
    const receta = await repo.savePrescription({ patient_id: alta.patient_id, kind: 'recomendacion', title: 'Agua y descanso', body: 'Dos litros al día' });
    const entregada = await repo.deliverPrescription(receta.id);
    expect(entregada.status).toBe('entregada');
    expect(entregada.counts_against_patient).toBe(false);
    expect(await saldo('pac3')).toBe(0);
  });
});

describe('S13 caso 5 — límite diario gratis (10)', () => {
  it('el 11.º registro de hoy → LIMITE_DIARIO; copia que no cabe falla completa; la Semana 1 no cuenta', async () => {
    como('nut2');
    const alta = await repo.nutriAddPatient('pac4@t.test');
    como('nut2');
    expect((await repo.getNutriLimits()).records_today).toBe(0);

    const recetas = [];
    for (let i = 0; i < 4; i++) {
      recetas.push(await repo.savePrescription({ patient_id: alta.patient_id, kind: 'dieta', title: `Receta ${i + 1}`, body: '' }));
    }
    expect((await repo.getNutriLimits()).records_today).toBe(4);

    // Semana 1 (7 días desde mañana) sale de la copia: 4 + 7 = 11 > 10.
    const semana = (await repo.listPrescriptions(alta.patient_id)).find((r) => r.title === 'Semana 1')!;
    const primero = readTable<{ day: string; patient_id: string }>('plan_days')
      .filter((d) => d.patient_id === alta.patient_id).map((d) => d.day).sort()[0];
    const destinoDesde = '2030-03-04';
    expect(semana.title).toBe('Semana 1');

    como('nut2');
    expect(await codigo(repo.copyPlanWeek(alta.patient_id, primero, destinoDesde, recetas[0].id))).toBe('LIMITE_DIARIO');
    como('nut2');
    const sinCopias = await repo.listPlanDays(alta.patient_id, destinoDesde, '2030-03-10');
    expect(sinCopias).toHaveLength(0);

    for (let i = 4; i < 10; i++) {
      await repo.savePrescription({ patient_id: alta.patient_id, kind: 'dieta', title: `Receta ${i + 1}`, body: '' });
    }
    como('nut2');
    expect(await codigo(repo.savePrescription({ patient_id: alta.patient_id, kind: 'dieta', title: 'Receta 11', body: '' }))).toBe('LIMITE_DIARIO');
    como('nut2');
    expect((await repo.getNutriLimits()).records_today).toBe(10);
  });
});

describe('S13 caso 6 — nutri_add_patient', () => {
  it('correo inexistente → PACIENTE_NO_REGISTRADO', async () => {
    como('nut2');
    expect(await codigo(repo.nutriAddPatient('nadie@t.test'))).toBe('PACIENTE_NO_REGISTRADO');
  });

  it('paciente con atención aceptada → PACIENTE_OCUPADO', async () => {
    seedCare('pac5', 'nut', 'aceptada', 'plataforma');
    como('nut2');
    expect(await codigo(repo.nutriAddPatient('pac5@t.test'))).toBe('PACIENTE_OCUPADO');
  });

  it('cupo lleno (gratis: 3) → CUPO_PLAN_LLENO', async () => {
    como('nut2');
    await repo.nutriAddPatient('pac@t.test');
    await repo.nutriAddPatient('pac2@t.test');
    await repo.nutriAddPatient('pac3@t.test');
    como('nut2');
    expect(await codigo(repo.nutriAddPatient('pac4@t.test'))).toBe('CUPO_PLAN_LLENO');
  });

  it('caso feliz: atención aceptada con origen propio y receta borrador con 7 días', async () => {
    como('nut2');
    const alta = await repo.nutriAddPatient('pac@t.test');
    const atencion = readTable<CareRequest>('care_requests').find((c) => c.patient_id === 'pac');
    expect(alta.patient_id).toBe('pac');
    expect(atencion?.status).toBe('aceptada');
    expect(atencion?.origin).toBe('propio');

    como('nut2');
    const recetas = await repo.listPrescriptions('pac');
    expect(recetas).toHaveLength(1);
    expect(recetas[0].status).toBe('borrador');
    expect(recetas[0].id).toBe(alta.prescription_id);

    como('nut2');
    const dias = await repo.listPlanDays('pac', '2000-01-01', '2100-01-01');
    expect(dias).toHaveLength(7);
    expect(dias.every((d) => d.prescription_id === alta.prescription_id)).toBe(true);
  });
});

describe('S12 caso 3 — cupo gratis al aceptar', () => {
  it('nutri sin suscripción acepta 3 solicitudes; la 4.ª → CUPO_PLAN_LLENO', async () => {
    for (const p of ['pac', 'pac2', 'pac3', 'pac4']) seedCare(p, null, 'abierta', 'plataforma');
    const abiertas = readTable<CareRequest>('care_requests').filter((c) => c.status === 'abierta');
    como('nut2');
    for (const c of abiertas.slice(0, 3)) await repo.acceptCareRequest(c.id);
    como('nut2');
    expect(await codigo(repo.acceptCareRequest(abiertas[3].id))).toBe('CUPO_PLAN_LLENO');
  });
});

describe('S12 caso 4 — mejora de plan', () => {
  it('con Starter activa, choosePlan(Profesional) funciona; al aprobar, Starter queda cancelada y Profesional activa con cupo 50', async () => {
    seedSub('subscriptions', 'nut', 'plan-starter');
    como('nut');
    const factura = await repo.choosePlan('plan-profesional');
    expect(factura.status).toBe('pendiente');
    como('adm');
    await repo.markInvoicePaid(factura.id);

    como('nut');
    const limites = await repo.getNutriLimits();
    expect(limites.plan_name).toBe('Profesional');
    expect(limites.patient_quota).toBe(50);
    expect(await codigo(repo.adminSubscriptionsOverview())).toBe('SOLO_ADMIN');
    como('adm');
    const resumen = await repo.adminSubscriptionsOverview();
    expect(resumen.active.map((f) => f.plan_name)).toEqual(['Profesional']);
    expect(readTable<{ status: string }>('subscriptions').filter((s) => s.status === 'cancelada')).toHaveLength(1);
  });
});

describe('S12 caso 5 — suscripción de paciente', () => {
  it('aprobar da 10 recetas; renovar con 4 restantes da 14 y +30 días; aprobar dos veces → ESTADO_INVALIDO', async () => {
    como('pac6');
    const primera = await repo.choosePatientPlan('plan-paciente');
    como('adm');
    await repo.markInvoicePaid(primera.id);
    expect(await saldo('pac6')).toBe(10);

    // Renovación estando vigente con 4 restantes.
    const filas = readTable<{ user_id: string; status: string; recipes_left: number; current_period_end: string }>('patient_subscriptions');
    writeTable('patient_subscriptions', filas.map((f) => (f.user_id === 'pac6' ? { ...f, recipes_left: 4 } : f)));
    const activa = filas.find((f) => f.user_id === 'pac6' && f.status === 'activa');
    const finAntes = Date.parse(activa?.current_period_end ?? '');

    como('pac6');
    const segunda = await repo.choosePatientPlan('plan-paciente');
    como('adm');
    await repo.markInvoicePaid(segunda.id);
    como('pac6');
    const saldoFinal = await repo.getRecipeBalance();
    expect(saldoFinal.left).toBe(14);
    expect(Date.parse(saldoFinal.period_end!) - finAntes).toBe(30 * DAY);

    como('adm');
    expect(await codigo(repo.markInvoicePaid(segunda.id))).toBe('ESTADO_INVALIDO');
    como('pac6');
    expect((await repo.getRecipeBalance()).left).toBe(14);
  });
});

describe('S12 caso 6 — panel de suscripciones', () => {
  it('lista la pendiente y la activa con su audiencia; no admin → SOLO_ADMIN', async () => {
    seedSub('subscriptions', 'nut2', 'plan-starter');
    como('nut');
    await repo.choosePlan('plan-profesional');
    como('pac6');
    await repo.choosePatientPlan('plan-paciente');

    como('adm');
    const resumen = await repo.adminSubscriptionsOverview();
    expect(resumen.pending.map((f) => f.audience).sort()).toEqual(['nutricionista', 'paciente']);
    expect(resumen.active.map((f) => f.audience)).toEqual(['nutricionista']);
    expect(resumen.active[0].email).toBe('nut2@t.test');

    como('nut');
    expect(await codigo(repo.adminSubscriptionsOverview())).toBe('SOLO_ADMIN');
  });
});

describe('Ajustes de contacto y planes', () => {
  it('solo la administradora cambia el correo y los cupos; datos inválidos → DATOS_INVALIDOS', async () => {
    como('nut');
    expect(await codigo(repo.adminSaveContactSettings({ admin_email: 'x@y.test', free_patient_limit: 3, free_daily_record_limit: 10 })))
      .toBe('SOLO_ADMIN');

    como('adm');
    expect(await codigo(repo.adminSaveContactSettings({ admin_email: 'no-es-correo', free_patient_limit: 3, free_daily_record_limit: 10 })))
      .toBe('DATOS_INVALIDOS');
    expect(await codigo(repo.adminSaveContactSettings({ admin_email: 'x@y.test', free_patient_limit: 0, free_daily_record_limit: 10 })))
      .toBe('DATOS_INVALIDOS');

    const ajustes = await repo.adminSaveContactSettings({ admin_email: 'nueva@y.test', free_patient_limit: 4, free_daily_record_limit: 12 });
    expect(ajustes.admin_email).toBe('nueva@y.test');
    expect(ajustes.free_patient_limit).toBe(4);
    expect(ajustes.free_daily_record_limit).toBe(12);
  });

  it('los planes de la semilla tienen los precios nuevos', async () => {
    como('nut');
    const planes = await repo.listPlans();
    expect(planes.map((p) => [p.name, p.monthly_price, p.patient_quota, p.daily_record_limit])).toEqual([
      ['Starter', 9, 15, 60],
      ['Profesional', 19, 50, null],
    ]);
    como('pac');
    const pacientes = await repo.listPatientPlans();
    expect(pacientes[0]).toMatchObject({ name: 'Seguimiento mensual', monthly_price: 40, recipe_quota: 10 });
  });
});

describe('Días y receta (regla de lectura del paciente)', () => {
  it('el paciente no ve borradores y sí ve entregados aunque la suscripción venza', async () => {
    seedSub('subscriptions', 'nut', 'plan-profesional');
    seedCare('pac', 'nut', 'aceptada', 'propio');
    como('nut');
    const borrador = await repo.savePrescription({ patient_id: 'pac', kind: 'dieta', title: 'Borrador', body: '' });
    await repo.savePlanDay('pac', { day: '2030-05-01', title: 'Día borrador', meals: null, exercise: null, notes: null, prescription_id: borrador.id });
    como('pac');
    expect(await repo.listPlanDays('pac', '2030-05-01', '2030-05-01')).toHaveLength(0);

    como('nut');
    const entregada = await repo.savePrescription({ patient_id: 'pac', kind: 'dieta', title: 'Entregada', body: '' });
    await repo.savePlanDay('pac', { day: '2030-05-02', title: 'Día entregado', meals: 'Avena', exercise: null, notes: null, prescription_id: entregada.id });
    await repo.deliverPrescription(entregada.id);
    como('pac');
    const visibles = await repo.listPlanDays('pac', '2030-05-01', '2030-05-31');
    expect(visibles.map((d) => d.title)).toEqual(['Día entregado']);
    expect(await repo.setPlanDayDone(visibles[0].id, true, 'Hecho')).toMatchObject({ patient_note: 'Hecho' });
  });

  it('un día pertenece a una sola receta: DIA_OCUPADO y RECETA_REQUERIDA', async () => {
    seedSub('subscriptions', 'nut', 'plan-profesional');
    seedCare('pac', 'nut', 'aceptada', 'propio');
    como('nut');
    const receta = await repo.savePrescription({ patient_id: 'pac', kind: 'rutina', title: 'Rutina', body: '' });
    const dia = { day: '2030-06-01', title: 'Lunes', meals: null, exercise: 'Caminata', notes: null };
    await repo.savePlanDay('pac', { ...dia, prescription_id: receta.id });
    como('nut');
    expect(await codigo(repo.savePlanDay('pac', { ...dia, title: 'Otro', prescription_id: receta.id }))).toBe('DIA_OCUPADO');
    como('nut');
    expect(await codigo(repo.savePlanDay('pac', { ...dia, day: '2030-06-02', title: 'Sin receta', prescription_id: '' })))
      .toBe('RECETA_REQUERIDA');
  });
});

describe('Sin suscripción', () => {
  it('el saldo de un paciente sin suscripción es 0 y no tiene suscripción', async () => {
    expect(await saldo('pac2')).toBe(0);
    como('pac2');
    expect(await repo.getMyPatientSubscription()).toBeNull();
    expect(await repo.getMySubscription()).toBeNull();
  });
});
