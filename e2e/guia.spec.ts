import { expect, test } from '@playwright/test';
import { conCandadoDeFases, fijarFases, ingresar, NUTRI, ruta, salir } from './helpers';

// Guía de hábitos de forma pública y su edición por la nutricionista; las plantillas de la semana
// gratis se revisan desde el panel de administración. Las pruebas no cambian el contenido publicado:
// la edición guarda la entrada tal como está.
test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

test.afterAll(async ({ browser }, testInfo) => {
  testInfo.setTimeout(180_000);
  const page = await browser.newPage();
  await conCandadoDeFases(() => fijarFases(page, { phase1: true, phase2: false, phase3: false }));
  await page.close();
});

test('la guía es pública: filtrar por categoría y buscar sin iniciar sesión', async ({ page }) => {
  await page.goto('/guia');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // Sin sesión se ve la lista completa (no hay candado).
  await expect(page.getByRole('heading', { name: 'Medidas caseras', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Días de descanso', exact: true })).toBeVisible();

  // Filtrar por categoría: solo quedan las entradas de «Descanso».
  const grupo = page.getByRole('group', { name: 'Categorías', exact: true });
  await grupo.getByRole('button', { name: /^Descanso \(/ }).click();
  await expect(page.getByRole('heading', { name: 'Días de descanso', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Medidas caseras', exact: true })).toHaveCount(0);
  await grupo.getByRole('button', { name: /^Todas \(/ }).click();

  // Buscar: el texto cambia la lista y un término sin resultados muestra su mensaje.
  const buscador = page.getByRole('searchbox', { name: 'Buscar en la guía', exact: true });
  await buscador.fill('medidas');
  await expect(page.getByRole('heading', { name: 'Medidas caseras', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Días de descanso', exact: true })).toHaveCount(0);
  await buscador.fill('zzzz-sin-resultados');
  await expect(page.getByText('Prueba con otra palabra o quita el filtro de categoría.')).toBeVisible();
  await buscador.fill('');
  await expect(page.getByRole('heading', { name: 'Días de descanso', exact: true })).toBeVisible();
});

test('la nutricionista abre una entrada de la guía en /admin/guia y la guarda', async ({ page }) => {
  await conCandadoDeFases(async () => {
    await fijarFases(page, { phase1: true, phase2: false, phase3: false });
    await ingresar(page, NUTRI.correo, NUTRI.clave);
    await expect.poll(() => ruta(page)).toBe('/perfil');

    await page.goto('/admin/guia');
    await expect(page.getByRole('heading', { name: 'Editar la guía', exact: true })).toBeVisible();
    const fila = page.getByRole('listitem').filter({ hasText: 'Medidas caseras' }).first();
    await expect(fila).toBeVisible();
    await fila.getByRole('button', { name: 'Editar', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Editar entrada', exact: true })).toBeVisible();
    await expect(page.getByLabel('Título', { exact: true })).toHaveValue('Medidas caseras');
    await page.getByRole('button', { name: 'Guardar entrada', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Se guardó «Medidas caseras».' })).toBeVisible();

    // El cambio llega a la guía pública.
    await page.goto('/guia');
    await expect(page.getByRole('heading', { name: 'Medidas caseras', exact: true })).toBeVisible();
    await salir(page);
  });
});

test('las plantillas de la semana gratis se ven en /admin/plantillas', async ({ page }) => {
  await conCandadoDeFases(async () => {
    await fijarFases(page, { phase1: true, phase2: false, phase3: false });
    await ingresar(page, NUTRI.correo, NUTRI.clave);
    await expect.poll(() => ruta(page)).toBe('/perfil');

    await page.goto('/admin/plantillas');
    await expect(page.getByRole('heading', { name: 'Plantillas de la semana gratis', exact: true })).toBeVisible();
    const lista = page.getByRole('list', { name: 'Plantillas', exact: true });
    await expect(lista).toBeVisible();
    expect(await lista.getByRole('listitem').count()).toBeGreaterThan(0);
    // Las plantillas nuevas nacen en borrador hasta que una nutricionista las revise.
    await expect(lista.getByText('Borrador', { exact: true }).first()).toBeVisible();
    await salir(page);
  });
});
