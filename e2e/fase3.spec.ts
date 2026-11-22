import { expect, test } from '@playwright/test';
import {
  aceptarSolicitudDe,
  finalizarAtencion,
  conCandadoDeFases,
  expectVolver,
  fijarFases,
  ingresar,
  llenarFicha,
  registrar,
  ruta,
  salir,
  ADMIN,
} from './helpers';

// Fase 3: reseñas de lugares y nutricionistas, reporte de progreso (PDF) y datos de lugares.
// Necesita la fase 2 para tener un nutricionista. Al final deja solo la fase 1 encendida.
test.describe.configure({ mode: 'serial' });
test.setTimeout(300_000);

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  await conCandadoDeFases(() => fijarFases(page, { phase1: true, phase2: false, phase3: false }));
  await page.close();
});

test('fase 3: reseña a un lugar y a su nutricionista → promedio → reporte PDF → datos de lugares', async ({ page }) => {
  await conCandadoDeFases(async () => {
    const stamp = Date.now();
    const nombrePaciente = `Paciente Fase Tres ${stamp}`;

    // 1. Fase 2 encendida (para tener nutricionista); la fase 3 aún apagada (registro con cupo).
    await fijarFases(page, { phase1: true, phase2: true, phase3: false });

    // 2. Paciente con ficha, nutricionista asignado.
    const paciente = await registrar(page, nombrePaciente);
    await llenarFicha(page);
    await page.goto('/mi-panel?tab=nutricionista');
    await page.getByRole('button', { name: 'Solicitar nutricionista', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Cancelar solicitud' })).toBeVisible();
    await salir(page);
    const rutaPaciente = await aceptarSolicitudDe(page, nombrePaciente, stamp);
    await salir(page);

    // 3. Admin enciende la fase 3.
    await fijarFases(page, { phase1: true, phase2: true, phase3: true });

    // 4. Paciente deja reseña a un lugar.
    await ingresar(page, paciente.correo, paciente.clave);
    await expect.poll(() => ruta(page)).toBe('/perfil');
    await page.goto('/lugares');
    await page.locator('a[href^="/lugares/"]').first().click();
    await expect.poll(() => ruta(page)).toMatch(/^\/lugares\/.+/);
    await expectVolver(page);
    await page.getByRole('group', { name: 'Tu calificación' }).getByRole('button', { name: '5 estrellas', exact: true }).click();
    await page.getByLabel('Comentario (opcional)', { exact: true }).fill('Muy buen lugar para entrenar (prueba E2E).');
    await page.getByRole('button', { name: 'Guardar reseña', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tu reseña' })).toBeVisible();
    await expect(page.getByRole('img', { name: /de 5 estrellas/ }).first()).toBeVisible();

    // 5. Paciente califica a su nutricionista.
    await page.goto('/mi-panel?tab=nutricionista');
    await expect(page.getByRole('heading', { name: 'Califica a tu nutricionista' })).toBeVisible();
    await page.getByRole('group', { name: 'Tu calificación' }).getByRole('button', { name: '4 estrellas', exact: true }).click();
    await page.getByLabel('Comentario (opcional)', { exact: true }).fill('Muy atento y claro (prueba E2E).');
    await page.getByRole('button', { name: 'Guardar reseña', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tu reseña' })).toBeVisible();
    await expect(page.getByText(/\d+ reseñas?$/).first()).toBeVisible();

    // 6. Reporte de progreso: se abre y tiene «Descargar PDF».
    await page.goto('/mi-panel/reporte');
    await expect(page.getByRole('button', { name: 'Descargar PDF', exact: true })).toBeVisible();
    await expectVolver(page);
    await salir(page);

    // Nutricionista cierra la atención: libera el cupo del plan para las siguientes pruebas.
    await finalizarAtencion(page, rutaPaciente);

    // 7. Admin ve «Datos de lugares».
    await ingresar(page, ADMIN.correo, ADMIN.clave);
    await expect.poll(() => ruta(page)).toBe('/perfil');
    await page.goto('/admin');
    await page.getByRole('link', { name: /Datos de lugares/ }).first().click();
    await expect.poll(() => ruta(page)).toBe('/admin/datos-lugares');
    await expect(page.getByRole('heading', { name: 'Datos de lugares' })).toBeVisible();
    await expectVolver(page);
    await salir(page);
  });
});
