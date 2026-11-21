import { expect, test } from '@playwright/test';

/** Abre la ficha del primer lugar de la lista de resultados. */
async function abrirPrimerLugar(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/lugares');
  await page.locator('a[href^="/lugares/"]').first().click();
  await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/lugares\/[^/]+$/);
  return new URL(page.url()).pathname.replace('/lugares/', '');
}

test('Cómo llegar abre Google Maps en otra pestaña', async ({ page }) => {
  await abrirPrimerLugar(page);
  const llegar = page.getByRole('link', { name: 'Cómo llegar' });
  await expect(llegar).toBeVisible();
  await expect(llegar).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=/);
  await expect(llegar).toHaveAttribute('target', '_blank');
});

test('la ficha dibuja el mapa', async ({ page }) => {
  await abrirPrimerLugar(page);
  await expect(page.locator('.leaflet-container').first()).toBeVisible();
});

test('favorito sin sesión lleva a ingresar y vuelve a la ficha', async ({ page }) => {
  const id = await abrirPrimerLugar(page);
  await page.getByRole('button', { name: 'Guardar en favoritos' }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/ingresar');
  expect(new URL(page.url()).searchParams.get('volver')).toBe(`/lugares/${id}`);
});
