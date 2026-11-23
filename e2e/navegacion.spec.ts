import { expect, test, type Page } from '@playwright/test';
import { ADMIN, conCandadoDeFases, fijarFases, ingresar, ruta } from './helpers';

/** Textos que nunca deben aparecer en una página publicada. */
const PROHIBIDOS = [/Página en construcción/i, /\bDEMO\b/, /lorem/i];

async function revisarTextos(page: Page) {
  const texto = await page.locator('body').innerText();
  for (const re of PROHIBIDOS) expect(texto, `texto prohibido: ${re}`).not.toMatch(re);
}

function esMovil(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1280) < 1024;
}

/** En móvil abre la hamburguesa; en escritorio el menú ya está visible. */
async function abrirMenuSiMovil(page: Page) {
  if (esMovil(page)) {
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Abrir menú' }).click();
  }
}

async function irPorMenu(page: Page, nombre: string) {
  await abrirMenuSiMovil(page);
  const nav = page.getByRole('navigation', { name: esMovil(page) ? 'Menú móvil' : 'Principal' });
  await nav.getByRole('link', { name: nombre, exact: true }).click();
}

async function rutaActual(page: Page): Promise<string> {
  return new URL(page.url()).pathname;
}

test('cada enlace del menú lleva a su página', async ({ page }) => {
  test.setTimeout(120_000);
  const destinos: [string, string][] = [
    ['Deportes', '/deportes'],
    ['Conócenos', '/conocenos'],
    ['Contacto', '/contacto'],
    ['Inicio', '/'],
  ];
  for (const [nombre, ruta] of destinos) {
    await page.goto('/');
    await irPorMenu(page, nombre);
    await expect.poll(() => rutaActual(page)).toBe(ruta);
    await revisarTextos(page);
  }
});

test('portada Nutrición: Soy paciente y Soy nutricionista abren el registro con su tipo', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Soy paciente', exact: true }).first().click();
  await expect.poll(() => rutaActual(page)).toBe('/registro');
  await expect(page.getByRole('radio', { name: /Soy paciente/ })).toBeChecked();
  await revisarTextos(page);

  await page.goto('/');
  await page.getByRole('link', { name: 'Soy nutricionista', exact: true }).first().click();
  await expect.poll(() => rutaActual(page)).toBe('/registro');
  await expect(page.getByRole('radio', { name: /Soy nutricionista/ })).toBeChecked();
});

test('botones del Panel de deportes: Explorar lugares y Conoce más; Explorar actividades lleva al panel', async ({ page }) => {
  await page.goto('/');
  if (esMovil(page)) {
    await abrirMenuSiMovil(page);
    await page.locator('#menu-movil').getByRole('link', { name: /Explorar actividades/ }).click();
  } else {
    await page.getByRole('link', { name: /Explorar actividades/ }).first().click();
  }
  await expect.poll(() => rutaActual(page)).toBe('/deportes');
  await revisarTextos(page);

  await page.goto('/deportes');
  await page.getByRole('link', { name: /Explorar lugares/ }).first().click();
  await expect.poll(() => rutaActual(page)).toBe('/lugares');

  await page.goto('/deportes');
  await page.getByRole('link', { name: /Conoce más/ }).first().click();
  await expect.poll(() => rutaActual(page)).toBe('/conocenos');
});

test('tarjeta de deporte lleva a sus lugares', async ({ page }) => {
  await page.goto('/deportes');
  await page.locator('a[href^="/deportes/"]').first().click();
  await expect.poll(() => rutaActual(page)).toMatch(/^\/deportes\/[a-z0-9-]+$/);
  await revisarTextos(page);
});

test('buscador con filtro lleva a /lugares con los filtros y Volver los conserva', async ({ page }) => {
  await page.goto('/deportes');
  const actividad = page.getByLabel('Actividad', { exact: true }).first();
  await actividad.selectOption({ index: 1 });
  const deporte = await actividad.inputValue();
  expect(deporte).not.toBe('');

  await page.getByRole('button', { name: 'Buscar lugares' }).click();
  await expect.poll(() => rutaActual(page)).toBe('/lugares');
  expect(new URL(page.url()).searchParams.get('deporte')).toBe(deporte);
  const urlResultados = page.url();
  await revisarTextos(page);

  // Tarjeta de lugar → ficha.
  await page.locator('a[href^="/lugares/"]').first().click();
  await expect.poll(() => rutaActual(page)).toMatch(/^\/lugares\/[^/]+$/);
  await revisarTextos(page);

  // Volver regresa a los resultados con los mismos filtros.
  await page.getByRole('button', { name: 'Volver' }).first().click();
  await expect(page).toHaveURL(urlResultados);
  await expect(page.getByLabel('Actividad', { exact: true }).first()).toHaveValue(deporte);
});

test('Volver regresa a la página anterior desde deportes y contacto', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await irPorMenu(page, 'Deportes');
  await expect.poll(() => rutaActual(page)).toBe('/deportes');
  await page.locator('a[href^="/deportes/"]').first().click();
  await expect.poll(() => rutaActual(page)).toMatch(/^\/deportes\/[a-z0-9-]+$/);
  await page.getByRole('button', { name: 'Volver' }).first().click();
  await expect.poll(() => rutaActual(page)).toBe('/deportes');

  await irPorMenu(page, 'Contacto');
  await expect.poll(() => rutaActual(page)).toBe('/contacto');
  await page.getByRole('button', { name: 'Volver' }).first().click();
  await expect.poll(() => rutaActual(page)).toBe('/deportes');
});

test('ninguna página principal muestra textos de prueba', async ({ page }) => {
  for (const ruta of ['/', '/conocenos', '/deportes', '/lugares', '/comparar', '/contacto', '/nutricion', '/privacidad']) {
    await page.goto(ruta);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('main h1, main h2').first()).toBeVisible();
    await revisarTextos(page);
  }
});

test('[landing] sin scroll horizontal a 360 px y el botón de menú está a la vista', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'solo móvil');
  for (const ruta of ['/', '/lugares', '/deportes', '/contacto']) {
    await page.goto(ruta);
    await expect(page.locator('main')).toBeVisible();
    const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(ancho, `scrollWidth en ${ruta}`).toBeLessThanOrEqual(360);
    await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeInViewport();
  }
});

test('con la fase 1 sola, el menú de cuenta no muestra Mi panel, Notificaciones ni Panel nutricionista', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'el menú de cuenta se revisa en escritorio');
  test.setTimeout(120_000);
  await conCandadoDeFases(async () => {
    await fijarFases(page, { phase1: true, phase2: false, phase3: false });
    await ingresar(page, ADMIN.correo, ADMIN.clave);
    await expect.poll(() => ruta(page)).toBe('/perfil');
    await page.goto('/');
    await page.getByRole('button', { name: /Menú de cuenta de/ }).click();
    const menu = page.getByRole('menu');
    await expect(menu.getByRole('link', { name: 'Mi plan' })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Mi panel' })).toHaveCount(0);
    await expect(menu.getByRole('link', { name: 'Notificaciones' })).toHaveCount(0);
    await expect(menu.getByRole('link', { name: 'Panel nutricionista' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Notificaciones|avisos/i })).toHaveCount(0);
  });
});

test('a 1280 px el logo se ve completo: «ACTIVA GYE» sin cortar', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'el logo a 1280 px se revisa en escritorio');
  await page.goto('/');
  const texto = page.getByRole('link', { name: 'Activa GYE, ir al inicio' }).locator('span').first();
  await expect(texto).toBeVisible();
  const sinCortar = await texto.evaluate((el) => el.scrollWidth <= el.clientWidth && el.textContent?.replace(/\s+/g, ' ').trim() === 'ACTIVA GYE');
  expect(sinCortar).toBe(true);
});
