import { expect, test } from '@playwright/test';
import { conCandadoDeFases, ingresar, llenarFicha, PACIENTE, registrar, ruta, salir } from './helpers';

test('registro nuevo, ficha, recargar, salir y entrar de nuevo', async ({ page }) => {
  await conCandadoDeFases(async () => {
    const { correo, clave } = await registrar(page, 'Persona Prueba E2E');
    await llenarFicha(page);

    // Recargar: la ficha sigue.
    await page.reload();
    await expect(page.getByLabel('Peso (kg)', { exact: true })).toHaveValue('76.5');
    await expect(page.getByLabel('Estatura (cm)', { exact: true })).toHaveValue('165');

    // Salir y volver a entrar: la ficha sigue.
    await salir(page);
    await ingresar(page, correo, clave);
    await expect.poll(() => ruta(page)).toBe('/perfil');
    await page.goto('/mi-panel?tab=ficha');
    await expect(page.getByLabel('Peso (kg)', { exact: true })).toHaveValue('76.5');
    await expect(page.getByLabel('Estatura (cm)', { exact: true })).toHaveValue('165');
    await salir(page);
  });
});

test('ruta protegida sin sesión pide ingresar y al entrar vuelve a Mi perfil', async ({ page }) => {
  await page.goto('/perfil');
  await expect.poll(() => ruta(page)).toBe('/ingresar');
  expect(new URL(page.url()).searchParams.get('volver')).toBe('/perfil');

  await ingresar(page, PACIENTE.correo, PACIENTE.clave);
  await expect.poll(() => ruta(page)).toBe('/perfil');
  await expect(page.getByRole('tab', { name: 'Mis datos' })).toBeVisible();
});
