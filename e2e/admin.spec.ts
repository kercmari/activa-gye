import { expect, test, type Page } from '@playwright/test';

async function ruta(page: Page): Promise<string> {
  return new URL(page.url()).pathname;
}

async function ingresar(page: Page, correo: string, clave: string) {
  await page.goto('/ingresar');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(clave);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
}

test('admin oculta un lugar y deja de salir en /lugares', async ({ page }) => {
  await ingresar(page, 'admin@activagye.test', 'ActivaAdmin2026!');
  await expect.poll(() => ruta(page)).toBe('/perfil');

  await page.goto('/admin/lugares');
  const interruptor = page.getByRole('switch').first();
  await expect(interruptor).toBeVisible();
  const etiqueta = (await interruptor.getAttribute('aria-label')) ?? '';
  const nombre = etiqueta.replace(/^Publicado:\s*/, '');
  expect(nombre.length).toBeGreaterThan(0);
  await expect(interruptor).toHaveAttribute('aria-checked', 'true');

  await interruptor.click();
  // En la lista "Publicados" el lugar oculto ya no aparece.
  await expect(page.getByRole('switch', { name: `Publicado: ${nombre}` })).toHaveCount(0);

  // Ya no aparece en la búsqueda pública.
  await page.goto(`/lugares?nombre=${encodeURIComponent(nombre)}`);
  await expect(page.getByText(nombre, { exact: true })).toHaveCount(0);
  await expect(page.locator('a[href^="/lugares/"]').filter({ hasText: nombre })).toHaveCount(0);
});

test('usuario normal no entra a /admin/lugares y ve "No tienes acceso"', async ({ page }) => {
  await ingresar(page, 'usuario@activagye.test', 'ActivaUser2026!');
  await expect.poll(() => ruta(page)).toBe('/perfil');

  await page.goto('/admin/lugares');
  await expect.poll(() => ruta(page)).toBe('/sin-acceso');
  await expect(page.getByText(/No tienes acceso/)).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: 'Ir al inicio' })).toBeVisible();
});
