import { expect, type Page } from '@playwright/test';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/** Cuentas de la base local (ver docs/entrega/CUENTAS-DE-PRUEBA.md). */
export const ADMIN = { correo: 'admin@activagye.test', clave: 'ActivaAdmin2026!' };
export const NUTRI = { correo: 'nutri@activagye.test', clave: 'ActivaNutri2026!' };
export const PACIENTE = { correo: 'usuario@activagye.test', clave: 'ActivaUser2026!' };

export const FOTO_CUERPO = resolve('e2e/fixtures/cuerpo.jpg');

export function esMovil(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1280) < 1024;
}

export async function ruta(page: Page): Promise<string> {
  return new URL(page.url()).pathname;
}

/** Correo único para cada registro (formato e2e+<Date.now()>@activagye.test). */
export function correoUnico(): string {
  return `e2e+${Date.now()}${Math.random().toString(36).slice(2, 7)}@activagye.test`;
}

/** Cierra sesión desde el menú de cuenta (escritorio) o el menú móvil. */
export async function salir(page: Page) {
  if (esMovil(page)) {
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    await page.locator('#menu-movil').getByRole('button', { name: 'Salir', exact: true }).click();
  } else {
    await page.getByRole('button', { name: /Menú de cuenta de/ }).click();
    await page.getByRole('banner').getByRole('button', { name: 'Salir', exact: true }).click();
  }
  // Desde una página protegida (admin) el cierre de sesión lleva a /ingresar.
  await expect.poll(() => ruta(page)).toMatch(/^\/(ingresar)?$/);
}

export async function ingresar(page: Page, correo: string, clave: string) {
  await page.goto('/ingresar');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(clave);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
}

/**
 * Cada prueba que registra pacientes gasta cupo en la base local. Si ya no queda cupo,
 * el admin lo sube 50 lugares para la prueba (la prueba de cupo de fase1 lo restaura).
 * Solo lo llama registrarCon, que ya corre dentro de conCandadoDeFases: así ninguna otra
 * prueba cambia el cupo mientras la prueba de cupo lo tiene fijado.
 */
export async function asegurarCupo(page: Page) {
  await page.goto('/registro');
  await expect(page.getByText(/Cupos disponibles:|Por ahora no hay cupos/)).toBeVisible();
  const boton = page.getByRole('button', { name: 'Crear cuenta', exact: true });
  if (await boton.isEnabled()) return;
  const antes = await fijarFases(page, {});
  await fijarFases(page, { patient_limit: antes.patient_limit + 50 });
  await page.goto('/registro');
}

/**
 * Registra una cuenta nueva con foto (obligatoria) y deja la sesión en la pantalla que corresponde:
 * paciente → /mi-panel; nutricionista (pendiente de revisión) → /perfil con el aviso de solicitud.
 */
export function registrarCon(
  page: Page,
  nombre: string,
  tipo: 'paciente' | 'nutricionista' = 'paciente',
): Promise<{ correo: string; clave: string }> {
  // Todo el registro corre con el candado: el cupo que otra prueba fija no cambia a mitad de camino.
  return conCandadoDeFases(() => registrarSinCandado(page, nombre, tipo));
}

async function registrarSinCandado(
  page: Page,
  nombre: string,
  tipo: 'paciente' | 'nutricionista',
): Promise<{ correo: string; clave: string }> {
  const correo = correoUnico();
  const clave = 'ClaveSegura2026';
  if (tipo === 'paciente') await asegurarCupo(page);
  else await page.goto('/registro?tipo=nutricionista');
  await page.getByRole('radio', { name: tipo === 'paciente' ? /Soy paciente/ : /Soy nutricionista/ }).check();
  await page.getByLabel('Nombre completo', { exact: true }).fill(nombre);
  await page.getByLabel('Correo electrónico', { exact: true }).fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(clave);
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill(clave);
  await page.getByLabel('Fecha de nacimiento', { exact: true }).fill('2000-05-10');
  await page.locator('input[type="file"]').setInputFiles(FOTO_CUERPO);
  await page.getByLabel('Acepto los términos y la política de privacidad').check();
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect.poll(() => ruta(page)).toBe(tipo === 'paciente' ? '/mi-panel' : '/perfil');
  return { correo, clave };
}

/** Registra un paciente nuevo con foto y deja la sesión en /mi-panel. */
export async function registrar(page: Page, nombre: string): Promise<{ correo: string; clave: string }> {
  return registrarCon(page, nombre, 'paciente');
}

/** Llena y guarda la ficha inicial (mayor de edad, sin foto salvo que se pase `foto`). */
export async function llenarFicha(page: Page, opciones: { foto?: boolean } = {}) {
  await page.goto('/mi-panel?tab=ficha');
  await expect(page.getByRole('heading', { name: 'Mi ficha inicial' })).toBeVisible();
  await page.getByLabel('Género', { exact: true }).selectOption('femenino');
  await page.getByLabel('Peso (kg)', { exact: true }).fill('76.5');
  await page.getByLabel('Estatura (cm)', { exact: true }).fill('165');
  if (opciones.foto) {
    await page.locator('#ficha-foto').setInputFiles(FOTO_CUERPO);
    await page.getByLabel('Acepto que mi nutricionista vea esta foto para dar seguimiento a mi estado inicial.', { exact: false }).check();
  }
  await page.getByRole('button', { name: 'Guardar mi ficha', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Ficha guardada' })).toBeVisible();
}

/** Admin: lee y/o cambia las fases y el cupo en Admin → Fases. Devuelve los valores de antes. */
export async function fijarFases(
  page: Page,
  cambios: { phase1?: boolean; phase2?: boolean; phase3?: boolean; patient_limit?: number },
): Promise<{ phase1: boolean; phase2: boolean; phase3: boolean; patient_limit: number }> {
  await ingresar(page, ADMIN.correo, ADMIN.clave);
  await expect.poll(() => ruta(page)).toBe('/perfil');
  await page.goto('/admin/fases');
  const f1 = page.getByRole('checkbox', { name: /Fase 1 · / });
  const f2 = page.getByRole('checkbox', { name: /Fase 2 · / });
  const f3 = page.getByRole('checkbox', { name: /Fase 3 · / });
  const cupo = page.getByLabel('Cupo de pacientes (mientras la fase 3 está apagada)', { exact: true });
  await expect(f2).toBeVisible();
  await expect(cupo).not.toHaveValue('');

  const antes = {
    phase1: await f1.isChecked(),
    phase2: await f2.isChecked(),
    phase3: await f3.isChecked(),
    patient_limit: Number(await cupo.inputValue()),
  };

  const hayCambio =
    (cambios.phase1 !== undefined && cambios.phase1 !== antes.phase1) ||
    (cambios.phase2 !== undefined && cambios.phase2 !== antes.phase2) ||
    (cambios.phase3 !== undefined && cambios.phase3 !== antes.phase3) ||
    (cambios.patient_limit !== undefined && cambios.patient_limit !== antes.patient_limit);

  if (hayCambio) {
    if (cambios.phase1 !== undefined) await f1.setChecked(cambios.phase1);
    if (cambios.phase2 !== undefined) await f2.setChecked(cambios.phase2);
    if (cambios.phase3 !== undefined) await f3.setChecked(cambios.phase3);
    if (cambios.patient_limit !== undefined) await cupo.fill(String(cambios.patient_limit));
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Cambios guardados' })).toBeVisible();
  }
  await salir(page);
  return antes;
}

/**
 * Candado entre procesos: las pruebas que cambian fases o el cupo corren de una en una
 * (los workers de Playwright son procesos separados, así que se usa una carpeta como candado).
 */
const CANDADO = join(tmpdir(), 'activagye-e2e-fases.lock');

/** true mientras este proceso (un worker) tiene el candado: permite anidar sin bloquearse a sí mismo. */
let candadoPropio = false;

export async function conCandadoDeFases<T>(fn: () => Promise<T>): Promise<T> {
  if (candadoPropio) return fn();
  const inicio = Date.now();
  for (;;) {
    try {
      mkdirSync(CANDADO);
      break;
    } catch {
      // Candado de un proceso que murió hace más de 10 min: se libera.
      if (Date.now() - inicio > 600_000) rmSync(CANDADO, { recursive: true, force: true });
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  candadoPropio = true;
  try {
    return await fn();
  } finally {
    candadoPropio = false;
    rmSync(CANDADO, { recursive: true, force: true });
  }
}

/** Botón de regreso visible en una página nueva. */
export async function expectVolver(page: Page) {
  await expect(page.getByRole('link', { name: /Volver/ }).or(page.getByRole('button', { name: /Volver/ })).first()).toBeVisible();
}

/**
 * Nutricionista: acepta la solicitud del paciente `nombre` en la bolsa.
 * Si la cuenta no tiene suscripción activa, elige un plan, el admin lo marca pagado y vuelve a aceptar.
 * Si la suscripción ya está activa, solo vuelve a aceptar. Deja la página en /nutri/pacientes/:id
 * y devuelve esa ruta.
 */
export async function aceptarSolicitudDe(page: Page, nombre: string, stamp: number): Promise<string> {
  await ingresar(page, NUTRI.correo, NUTRI.clave);
  await expect.poll(() => ruta(page)).toBe('/perfil');
  await page.goto('/nutri/solicitudes');
  await expectVolver(page);
  const fila = page.getByRole('listitem').filter({ hasText: nombre });
  await expect(fila).toBeVisible();
  await fila.getByRole('button', { name: 'Aceptar', exact: true }).click();

  const verSuscripcion = page.getByRole('link', { name: 'Ver mi suscripción' });
  await expect.poll(async () => (await ruta(page)).startsWith('/nutri/pacientes/') || (await verSuscripcion.isVisible())).toBe(true);
  if (!(await ruta(page)).startsWith('/nutri/pacientes/')) {
    await verSuscripcion.click();
    await expect.poll(() => ruta(page)).toBe('/nutri/suscripcion');
    const yaActiva = page.getByRole('button', { name: 'Ya tienes una suscripción activa', exact: true }).first();
    if (!(await yaActiva.isVisible())) {
      await page.getByRole('button', { name: 'Elegir este plan', exact: true }).first().click();
      await page.getByLabel('Número de comprobante', { exact: true }).fill(`TRF-E2E-${stamp}`);
      await page.getByRole('button', { name: 'Informar pago', exact: true }).click();
      await expect(page.getByText('Comprobante reportado', { exact: true }).first()).toBeVisible();
      await salir(page);
      await ingresar(page, ADMIN.correo, ADMIN.clave);
      await expect.poll(() => ruta(page)).toBe('/perfil');
      await page.goto('/admin/pagos');
      await page.getByRole('button', { name: 'Marcar pagada', exact: true }).first().click();
      await salir(page);
      await ingresar(page, NUTRI.correo, NUTRI.clave);
      await expect.poll(() => ruta(page)).toBe('/perfil');
    }
    await page.goto('/nutri/solicitudes');
    await page.getByRole('listitem').filter({ hasText: nombre }).getByRole('button', { name: 'Aceptar', exact: true }).click();
  }
  await expect.poll(() => ruta(page)).toMatch(/^\/nutri\/pacientes\/.+/);
  return ruta(page);
}

/**
 * Nutricionista: finaliza la atención del paciente en `rutaPaciente` (/nutri/pacientes/:id).
 * Libera el cupo del plan para que las pruebas que siguen puedan aceptar pacientes.
 */
export async function finalizarAtencion(page: Page, rutaPaciente: string) {
  await ingresar(page, NUTRI.correo, NUTRI.clave);
  await expect.poll(() => ruta(page)).toBe('/perfil');
  await page.goto(rutaPaciente);
  await page.getByRole('button', { name: 'Finalizar atención', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Finalizar atención', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Finalizar atención', exact: true })).toHaveCount(0);
  await salir(page);
}

/**
 * Paciente: suscribe la cuenta a un plan y el admin marca pagada la factura de la suscripción.
 * La agenda pagada (plan_days) solo se ve con suscripción activa. Idempotente: si ya está
 * «Suscripción activa», no hace nada; si ya hay un comprobante informado, lo reutiliza.
 * Deja la sesión cerrada.
 */
export async function suscribirPaciente(page: Page, correo: string, clave: string) {
  await ingresar(page, correo, clave);
  await expect.poll(() => ruta(page)).toBe('/perfil');
  await page.goto('/mi-plan/suscripcion');
  const activa = page.getByText('Suscripción activa', { exact: true }).first();
  const informado = page.getByText(/Comprobante informado:/).first();
  const suscribirme = page.getByRole('button', { name: 'Suscribirme', exact: true }).first();
  await expect(activa.or(informado).or(suscribirme)).toBeVisible();
  if (await activa.isVisible()) {
    await salir(page);
    return;
  }

  let referencia = `TRF-SUS-${Date.now()}`;
  if (await informado.isVisible()) {
    referencia = ((await informado.textContent()) ?? '').match(/TRF-[\w-]+/)?.[0] ?? referencia;
  } else {
    await suscribirme.click();
    await page.getByLabel('Número de comprobante', { exact: true }).fill(referencia);
    await page.getByRole('button', { name: 'Informar pago', exact: true }).click();
    await expect(informado).toBeVisible();
  }
  await salir(page);

  await ingresar(page, ADMIN.correo, ADMIN.clave);
  await expect.poll(() => ruta(page)).toBe('/perfil');
  await page.goto('/admin/pagos');
  const fila = page.getByRole('row').filter({ hasText: referencia }).first();
  await expect(fila).toBeVisible();
  const marcar = fila.getByRole('button', { name: 'Marcar pagada', exact: true });
  if (await marcar.isVisible()) {
    await marcar.click();
    await expect(marcar).toHaveCount(0);
  }
  await salir(page);
}
