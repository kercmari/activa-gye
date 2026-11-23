import { expect, test } from '@playwright/test';
import {
  ADMIN,
  conCandadoDeFases,
  correoUnico,
  esMovil,
  fijarFases,
  ingresar,
  registrarCon,
  ruta,
  salir,
  FOTO_CUERPO,
} from './helpers';

// Registro con tipo de cuenta y foto obligatoria (spec 2026-11-22-registro-rol-foto-inicio).
// Cada prueba usa correos únicos: no depende de lo que dejó otra.

/** La foto de la cuenta aparece en el círculo del encabezado (img fuera del logo). */
function fotoDeCuenta(page: import('@playwright/test').Page) {
  return page.getByRole('banner').locator('img:not([src$="/img/logo.png"])');
}

test('paciente con foto → /mi-panel y la foto aparece en el encabezado', async ({ page }) => {
  const { correo } = await registrarCon(page, 'Paciente Con Foto', 'paciente');
  await expect(fotoDeCuenta(page)).toBeVisible();
  await salir(page);
  expect(correo).toContain('@activagye.test');
});

test('sin foto → el registro no avanza y el error aparece en el campo de la foto', async ({ page }) => {
  await page.goto('/registro');
  await expect(page.getByText(/Cupos disponibles:|Por ahora no hay cupos/)).toBeVisible();
  const clave = 'ClaveSegura2026';
  await page.getByLabel('Nombre completo', { exact: true }).fill('Sin Foto');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(correoUnico());
  await page.getByLabel('Contraseña', { exact: true }).fill(clave);
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill(clave);
  await page.getByLabel('Fecha de nacimiento', { exact: true }).fill('2000-05-10');
  await page.getByLabel('Acepto los términos y la política de privacidad').check();
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();

  const campo = page.locator('input[type="file"]');
  await expect(page.getByText('Agrega una foto tuya.', { exact: true })).toBeVisible();
  await expect(campo).toHaveAttribute('aria-invalid', 'true');
  expect(await ruta(page)).toBe('/registro');
});

test('nutricionista → /perfil con el aviso de solicitud en revisión', async ({ page }) => {
  await registrarCon(page, 'Nutri Pendiente', 'nutricionista');
  await expect(page.getByText('Tu solicitud de nutricionista está en revisión. El equipo la aprueba y te avisamos.')).toBeVisible();
  await salir(page);
});

test('admin aprueba la solicitud → el rol cambia; al volver a ingresar ve Panel nutricionista si la fase lo permite', async ({ page }) => {
  test.setTimeout(180_000);
  await conCandadoDeFases(async () => {
    const correo = (await registrarCon(page, 'Nutri Para Aprobar', 'nutricionista')).correo;
    await salir(page);

    // Admin aprueba la solicitud desde Admin → Usuarios.
    await ingresar(page, ADMIN.correo, ADMIN.clave);
    await expect.poll(() => ruta(page)).toBe('/perfil');
    await page.goto('/admin/usuarios');
    const fila = page.getByRole('listitem').filter({ hasText: correo });
    await expect(fila).toBeVisible();
    await fila.getByRole('button', { name: 'Aprobar', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sí, aprobar', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Solicitudes de nutricionista' })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: correo })).toHaveCount(0);
    await salir(page);

    // Ingresa la nutricionista aprobada. El menú «Panel nutricionista» solo existe con la fase 2.
    const antes = await fijarFases(page, {});
    await ingresar(page, correo, 'ClaveSegura2026');
    await expect.poll(() => ruta(page)).toBe('/perfil');
    let menu = page.getByRole('menu');
    if (esMovil(page)) {
      await page.getByRole('button', { name: 'Abrir menú' }).click();
      menu = page.locator('#menu-movil');
    } else {
      await page.getByRole('button', { name: /Menú de cuenta de/ }).click();
    }
    if (antes.phase2) {
      await expect(menu.getByRole('link', { name: 'Panel nutricionista' })).toBeVisible();
    } else {
      await expect(menu.getByRole('link', { name: 'Panel nutricionista' })).toHaveCount(0);
    }
    // La prueba termina aquí; su contexto de navegador es propio y se cierra solo.
  });
});
