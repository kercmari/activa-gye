import { expect, test, type Page } from '@playwright/test';
import { ADMIN, conCandadoDeFases, fijarFases, ingresar, ruta } from './helpers';

// Desbordes a 360 px con sesión: la página no debe tener scroll horizontal en el encabezado
// ni en el panel de pagos. Solo corre en el proyecto móvil (360 px).
test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

async function anchoDeLaPagina(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth);
}

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  await conCandadoDeFases(() => fijarFases(page, { phase1: true, phase2: false, phase3: false }));
  await page.close();
});

test('a 360 px con sesión de admin no hay scroll horizontal en / ni en /admin/pagos', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'la prueba de desborde corre en el perfil de 360 px');
  await conCandadoDeFases(async () => {
    await fijarFases(page, { phase1: true, phase2: true, phase3: false });
    await ingresar(page, ADMIN.correo, ADMIN.clave);
    await expect.poll(() => ruta(page)).toBe('/perfil');

    await page.goto('/');
    await expect(page.getByRole('button', { name: /Menú de cuenta de/ })).toBeVisible();
    expect(await anchoDeLaPagina(page)).toBeLessThanOrEqual(360);

    await page.goto('/admin/suscripciones');
    await expect(page.getByRole('heading', { name: 'Suscripciones', exact: true })).toBeVisible();
    expect(await anchoDeLaPagina(page)).toBeLessThanOrEqual(360);
    // Cada pestaña de pagos (con sus tablas) también cabe sin scroll horizontal de la página.
    for (const pestana of await page.getByRole('tab').all()) {
      await pestana.click();
      await expect(pestana).toHaveAttribute('aria-selected', 'true');
      expect(await anchoDeLaPagina(page)).toBeLessThanOrEqual(360);
    }
  });
});
