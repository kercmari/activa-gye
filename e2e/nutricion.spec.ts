import { expect, test, type Page } from '@playwright/test';

function esMovil(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1280) < 1024;
}

async function ruta(page: Page): Promise<string> {
  return new URL(page.url()).pathname;
}

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

test('usuario pide guía, nutricionista responde y el usuario ve el plan', async ({ page }) => {
  const planTexto = 'Plan de prueba E2E: 5 comidas al día, agua constante y caminata de 30 minutos.';

  // 1. Usuario completa el formulario sin foto.
  await ingresar(page, 'usuario@activagye.test', 'ActivaUser2026!');
  await expect.poll(() => ruta(page)).toBe('/perfil');
  await page.goto('/nutricion');
  await page.getByRole('link', { name: 'Empezar', exact: true }).click();
  await expect.poll(() => ruta(page)).toBe('/nutricion/nueva');

  await page.getByLabel('Sexo', { exact: true }).selectOption('femenino');
  await page.getByLabel('Altura (cm)', { exact: true }).fill('165');
  await page.getByLabel('Peso (kg)', { exact: true }).fill('76.5');
  await page.getByRole('button', { name: 'Siguiente' }).click();

  await expect(page.getByRole('heading', { name: 'Objetivo y hábitos' })).toBeVisible();
  await page.getByLabel('Objetivo', { exact: true }).selectOption('bajar_peso');
  await page.getByLabel('Nivel de actividad', { exact: true }).selectOption('ligero');
  await page.getByRole('button', { name: 'Siguiente' }).click();

  await expect(page.getByRole('heading', { name: 'Tu foto (opcional)' })).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente' }).click(); // Foto: opcional, se omite.
  await expect(page.getByRole('heading', { name: 'Revisa tus datos' })).toBeVisible();
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();

  // 2. Guía con kcal y 5 comidas.
  await expect.poll(() => ruta(page)).toMatch(/^\/nutricion\/(?!nueva$)[^/]+$/);
  const solicitudId = (await ruta(page)).replace('/nutricion/', '');
  await expect(page.getByText('kcal al día').first()).toBeVisible();
  for (const comida of ['Desayuno', 'Media mañana', 'Almuerzo', 'Media tarde', 'Merienda']) {
    await expect(page.getByText(comida, { exact: true }).first()).toBeVisible();
  }

  // 3. Nutricionista toma la solicitud y responde.
  await salir(page);
  await ingresar(page, 'nutri@activagye.test', 'ActivaNutri2026!');
  await expect.poll(() => ruta(page)).toBe('/perfil');
  if (esMovil(page)) {
    await page.getByRole('button', { name: 'Abrir menú' }).click();
  } else {
    await page.getByRole('button', { name: /Menú de cuenta de/ }).click();
  }
  await page.getByRole('link', { name: 'Panel', exact: true }).click();
  await expect.poll(() => ruta(page)).toBe('/admin');
  await page.getByRole('link', { name: 'Solicitudes', exact: true }).first().click();
  await expect.poll(() => ruta(page)).toBe('/admin/nutricion');
  await page.locator(`a[href="/admin/nutricion/${solicitudId}"]`).click();
  await expect.poll(() => ruta(page)).toBe(`/admin/nutricion/${solicitudId}`);

  await page.getByRole('button', { name: 'Tomar solicitud' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Solicitud tomada' })).toBeVisible();
  await page.getByLabel('Escribe el plan', { exact: true }).fill(planTexto);
  await page.getByRole('button', { name: 'Enviar plan' }).click();
  await expect(page.getByText('Respondida', { exact: true }).first()).toBeVisible();

  // 4. Salir, entrar como usuario y ver el plan.
  await salir(page);
  await ingresar(page, 'usuario@activagye.test', 'ActivaUser2026!');
  await expect.poll(() => ruta(page)).toBe('/perfil');
  await page.goto(`/nutricion/${solicitudId}`);
  await expect(page.getByRole('heading', { name: /plan/i }).filter({ hasText: /nutricionista|plan/i }).first()).toBeVisible();
  await expect(page.getByText(planTexto, { exact: true })).toBeVisible();
});
