import { expect, test, type Page } from '@playwright/test';

function esMovil(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1280) < 1024;
}

async function ruta(page: Page): Promise<string> {
  return new URL(page.url()).pathname;
}

/** Cierra sesión desde el menú de cuenta (escritorio) o el menú móvil. */
async function salir(page: Page) {
  if (esMovil(page)) {
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    await page.locator('#menu-movil').getByRole('button', { name: 'Salir', exact: true }).click();
  } else {
    await page.getByRole('button', { name: /Menú de cuenta de/ }).click();
    await page.getByRole('banner').getByRole('button', { name: 'Salir', exact: true }).click();
  }
  await expect.poll(() => ruta(page)).toBe('/');
}

async function ingresar(page: Page, correo: string, clave: string) {
  await page.goto('/ingresar');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(clave);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
}

/** Fecha ISO de hace `dias` días (en la hora local del navegador). */
function diaAtras(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test('registro nuevo, progreso, recargar, salir y entrar de nuevo', async ({ page }) => {
  const correo = `e2e.${Date.now()}@activagye.test`;
  const clave = 'ClaveSegura2026';
  const nombre = 'Persona Prueba E2E';

  await page.goto('/registro');
  await page.getByLabel('Nombre completo', { exact: true }).fill(nombre);
  await page.getByLabel('Correo electrónico', { exact: true }).fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(clave);
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill(clave);
  await page.getByLabel('Fecha de nacimiento', { exact: true }).fill('2000-05-10');
  await page.getByLabel('Acepto los términos y la política de privacidad').check();
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();

  // Mi perfil con aviso de bienvenida.
  await expect.poll(() => ruta(page)).toBe('/perfil');
  await expect(page.getByRole('status').filter({ hasText: '¡Tu cuenta está lista!' })).toBeVisible();

  // Dos registros de progreso.
  await page.getByRole('tab', { name: 'Mi progreso' }).click();
  for (const [dias, peso] of [[2, '80'], [1, '79.5']] as const) {
    await page.getByLabel('Fecha', { exact: true }).fill(diaAtras(dias));
    await page.getByLabel('Peso (kg)', { exact: true }).fill(peso);
    await page.getByRole('button', { name: 'Guardar registro' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Registro guardado.' })).toBeVisible();
  }
  await expect(page.getByRole('img', { name: /Gráfico de peso/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Borrar registro del/ })).toHaveCount(2);

  // Recargar: los datos siguen.
  await page.reload();
  await expect(page.getByRole('img', { name: /Gráfico de peso/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Borrar registro del/ })).toHaveCount(2);

  // Salir y volver a entrar: los datos siguen.
  await salir(page);
  await ingresar(page, correo, clave);
  await expect.poll(() => ruta(page)).toBe('/perfil');
  await page.getByRole('tab', { name: 'Mi progreso' }).click();
  await expect(page.getByRole('img', { name: /Gráfico de peso/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Borrar registro del/ })).toHaveCount(2);
});

test('ruta protegida sin sesión pide ingresar y al entrar vuelve a Mi perfil', async ({ page }) => {
  await page.goto('/perfil');
  await expect.poll(() => ruta(page)).toBe('/ingresar');
  expect(new URL(page.url()).searchParams.get('volver')).toBe('/perfil');

  await page.getByLabel('Correo electrónico', { exact: true }).fill('usuario@activagye.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('ActivaUser2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect.poll(() => ruta(page)).toBe('/perfil');
  await expect(page.getByRole('tab', { name: 'Mi progreso' })).toBeVisible();
});
