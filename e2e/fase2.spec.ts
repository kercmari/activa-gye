import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN,
  aceptarSolicitudDe,
  conCandadoDeFases,
  expectVolver,
  finalizarAtencion,
  fijarFases,
  ingresar,
  llenarFicha,
  NUTRI,
  registrar,
  ruta,
  salir,
  suscribirPaciente,
} from './helpers';

// Fase 2: paciente pide nutricionista → nutricionista acepta → calendario y seguimiento →
// paciente marca el día → factura → pago informado → pagada. Al final deja la fase 2 apagada.
test.describe.configure({ mode: 'serial' });
test.setTimeout(300_000);

test.afterAll(async ({ browser }, testInfo) => {
  testInfo.setTimeout(180_000);
  const page = await browser.newPage();
  await conCandadoDeFases(() => fijarFases(page, { phase1: true, phase2: false, phase3: false }));
  await page.close();
});

/** Fecha de hoy con el mismo formato que las celdas del calendario del paciente. */
function etiquetaHoy(): string {
  return new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** Paciente: abre el día de hoy en el calendario (vista mes o semana, según el ancho). */
async function abrirHoyEnCalendario(page: Page, titulo: string) {
  await page.goto('/mi-panel?tab=calendario');
  const hoy = new RegExp(`${etiquetaHoy()}|${titulo}`);
  await page.getByRole('button', { name: hoy }).first().click();
}

test('fase 2 completa: solicitud → aceptar → calendario → cumplido → factura → pagada', async ({ page }) => {
  let rutaPaciente = '';
  await conCandadoDeFases(async () => {
    const stamp = Date.now();
    const nombrePaciente = `Paciente Fase Dos ${stamp}`;
    const titulo = `Plan E2E ${stamp}`;
    const concepto = `Consulta E2E ${stamp}`;

    // 0. Admin enciende la fase 2.
    await fijarFases(page, { phase1: true, phase2: true, phase3: false });

    // 1. Paciente nuevo: ficha y pedido de nutricionista.
    const paciente = await registrar(page, nombrePaciente);
    await llenarFicha(page);
    await page.goto('/mi-panel?tab=nutricionista');
    await expectVolver(page);
    await page.getByRole('button', { name: 'Solicitar nutricionista', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Cancelar solicitud' })).toBeVisible();
    await salir(page);

    // 2. Nutricionista ve el aviso y acepta la solicitud.
    await ingresar(page, NUTRI.correo, NUTRI.clave);
    await expect.poll(() => ruta(page)).toBe('/perfil');
    await expect(page.getByRole('link', { name: /Notificaciones \(\d+ sin leer\)/ })).toBeVisible();
    await page.goto('/notificaciones');
    await expectVolver(page);

    // Si la suscripción no está activa o el cupo del plan está lleno, el helper lo resuelve.
    await salir(page);
    rutaPaciente = await aceptarSolicitudDe(page, nombrePaciente, stamp);
    await expectVolver(page);

    // 3. Seguimiento y día del plan (hoy).
    const seguimiento = page.getByRole('form', { name: 'Nuevo seguimiento' });
    await seguimiento.getByLabel('Peso (kg)', { exact: true }).fill('76');
    await seguimiento.getByLabel('Observaciones', { exact: true }).fill('Primer control E2E.');
    await seguimiento.getByLabel('Recomendaciones', { exact: true }).fill('Caminar 30 minutos al día.');
    await seguimiento.getByRole('button', { name: 'Guardar seguimiento', exact: true }).click();
    await expect(seguimiento.getByLabel('Peso (kg)', { exact: true })).toHaveValue('', { timeout: 15_000 });

    const diaHoy = page.getByRole('listitem').filter({ has: page.getByText('Hoy', { exact: true }) });
    await diaHoy.getByRole('button', { name: 'Agregar plan', exact: true }).click();
    await page.getByLabel('Título', { exact: true }).fill(titulo);
    await page.getByLabel('Comidas', { exact: true }).fill('Desayuno: avena. Almuerzo: pollo con ensalada.');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(diaHoy.getByText(titulo, { exact: true })).toBeVisible();

    // 3b. Suscripción del paciente: la agenda pagada solo se ve con suscripción activa.
    await salir(page);
    await suscribirPaciente(page, paciente.correo, paciente.clave);

    // 4. Paciente ve el día y lo marca cumplido.
    await ingresar(page, paciente.correo, paciente.clave);
    await expect.poll(() => ruta(page)).toBe('/perfil');
    await abrirHoyEnCalendario(page, titulo);
    await expect(page.getByRole('heading', { name: titulo })).toBeVisible();
    await page.getByLabel('Cumplí este día', { exact: true }).check();
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByText(/Cumpliste 1 de \d+ días este mes/)).toBeVisible();
    await salir(page);

    // El nutricionista ve el progreso del paciente.
    await ingresar(page, NUTRI.correo, NUTRI.clave);
    await expect.poll(() => ruta(page)).toBe('/perfil');
    await page.goto(rutaPaciente);
    await expect(page.getByText(/1 de 7 días cumplidos esta semana/)).toBeVisible();

    // 5. Nutricionista crea la factura.
    const factura = page.getByRole('form', { name: 'Nueva factura' });
    await factura.getByLabel('Concepto', { exact: true }).fill(concepto);
    await factura.getByLabel('Monto (USD)', { exact: true }).fill('15');
    await factura.getByRole('button', { name: 'Enviar factura', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Factura enviada al paciente' })).toBeVisible();
    await salir(page);

    // 6. Paciente informa el pago.
    await ingresar(page, paciente.correo, paciente.clave);
    await expect.poll(() => ruta(page)).toBe('/perfil');
    await page.goto('/mi-panel?tab=pagos');
    await expectVolver(page);
    await expect(page.getByText(concepto, { exact: true })).toBeVisible();
    await page.getByLabel('Número de comprobante', { exact: true }).fill(`TRF-PAC-${stamp}`);
    await page.getByRole('button', { name: 'Informar pago', exact: true }).click();
    await expect(page.getByText('En revisión', { exact: true }).first()).toBeVisible();
    await salir(page);

    // 7. Nutricionista marca la factura pagada.
    await ingresar(page, NUTRI.correo, NUTRI.clave);
    await expect.poll(() => ruta(page)).toBe('/perfil');
    await page.goto(rutaPaciente);
    const filaFactura = page.locator('li, tr, article').filter({ hasText: concepto });
    await filaFactura.getByRole('button', { name: 'Marcar pagada', exact: true }).click();
    await expect(filaFactura.getByText('Pagada', { exact: true })).toBeVisible();
    await salir(page);

    // 8. Paciente ve la factura «Pagada».
    await ingresar(page, paciente.correo, paciente.clave);
    await expect.poll(() => ruta(page)).toBe('/perfil');
    await page.goto('/mi-panel?tab=pagos');
    await expect(page.locator('li, tr, article').filter({ hasText: concepto }).getByText('Pagada', { exact: true })).toBeVisible();
    await salir(page);
  });

  // 9. Nutricionista cierra la atención: libera el cupo del plan para las siguientes pruebas.
  // Fuera del candado: no cambia fases ni cupo, así que no hace falta retener las demás pruebas.
  await finalizarAtencion(page, rutaPaciente);
});
