import { expect, test } from '@playwright/test';
import { expectVolver, ingresar, PACIENTE, ruta } from './helpers';

// La guía antigua (/nutricion/nueva y las solicitudes de guía) se retiró.
// /nutricion queda como página informativa y el flujo nuevo vive en /mi-panel.
test('/nutricion es informativa y lleva a Mi ficha; la ruta vieja ya no existe', async ({ page }) => {
  await ingresar(page, PACIENTE.correo, PACIENTE.clave);
  await expect.poll(() => ruta(page)).toBe('/perfil');

  await page.goto('/nutricion');
  await expect(page.getByRole('link', { name: 'Ir a mi ficha', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Ir a mi ficha', exact: true }).click();
  await expect.poll(() => ruta(page)).toBe('/mi-panel');
  await expect(page.getByRole('heading', { name: /Mi ficha inicial|Mi ficha/ }).first()).toBeVisible();
  await expectVolver(page);

  await page.goto('/nutricion/nueva');
  await expect(page.getByRole('heading', { name: 'No encontramos esta página' })).toBeVisible();
});
