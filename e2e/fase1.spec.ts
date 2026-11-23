import { expect, test } from '@playwright/test';
import {
  ADMIN,
  conCandadoDeFases,
  expectVolver,
  fijarFases,
  ingresar,
  llenarFicha,
  registrar,
  ruta,
  salir,
} from './helpers';

// Fase 1: registro, ficha con foto, cupo de pacientes. Deja la fase 1 encendida y las 2 y 3 apagadas.
test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  await conCandadoDeFases(() => fijarFases(page, { phase1: true, phase2: false, phase3: false }));
  await page.close();
});

test('registro → Mi ficha con foto → guardar → recargar la conserva; con fase 2 apagada sus pestañas no aparecen', async ({ page }) => {
  await conCandadoDeFases(async () => {
    await fijarFases(page, { phase1: true, phase2: false, phase3: false });

    await registrar(page, 'Paciente Fase Uno');
    await expectVolver(page);

    // Ficha con foto de cuerpo entero (la paciente es mayor de 18 años).
    await llenarFicha(page, { foto: true });

    // Recargar: la ficha y la foto siguen ahí.
    await page.reload();
    await expect(page.getByLabel('Peso (kg)', { exact: true })).toHaveValue('76.5');
    await expect(page.getByRole('button', { name: 'Quitar foto' })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Ficha guardada' })).toHaveCount(0);

    // Calendario y Pagos (fase 2) apagada: sus pestañas no existen y no hay avisos «Próximamente».
    await expect(page.getByRole('tab', { name: 'Calendario y progreso' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Pagos' })).toHaveCount(0);
    await expect(page.getByText('Próximamente', { exact: true })).toHaveCount(0);

    await salir(page);
  });
});

test('admin pone cupo = pacientes actuales → registro dice «no hay cupos» → admin lo restaura', async ({ page }) => {
  await conCandadoDeFases(async () => {
    await fijarFases(page, { phase1: true, phase2: false, phase3: false });

    // Cuántos cupos quedan (la página de registro los muestra con la fase 3 apagada).
    await page.goto('/registro');
    await expect(page.getByText(/Cupos disponibles:|Por ahora no hay cupos/)).toBeVisible();
    // Con cupo lleno la página dice «Por ahora no hay cupos» y no muestra el contador: son 0 libres.
    const contador = page.getByText(/Cupos disponibles:/);
    const libres = (await contador.count()) ? Number((await contador.first().textContent() ?? '').replace(/\D/g, '')) : 0;

    // Límite original, para restaurarlo pase lo que pase.
    await ingresar(page, ADMIN.correo, ADMIN.clave);
    await expect.poll(() => ruta(page)).toBe('/perfil');
    await page.goto('/admin/fases');
    const cupo = page.getByLabel('Cupo de pacientes (mientras la fase 3 está apagada)', { exact: true });
    await expect(cupo).not.toHaveValue('');
    const limiteOriginal = Number(await cupo.inputValue());
    await salir(page);

    try {
      // Admin: cupo = pacientes actuales (límite − libres).
      await fijarFases(page, { patient_limit: Math.max(0, limiteOriginal - libres) });

      // Registro: ya no hay cupo.
      await page.goto('/registro');
      await expect(page.getByRole('alert').filter({ hasText: 'Por ahora no hay cupos para nuevos pacientes.' })).toBeVisible({ timeout: 15_000 });
    } finally {
      // Admin restaura el cupo original.
      await fijarFases(page, { patient_limit: limiteOriginal });
    }

    // Con el cupo restaurado, el registro vuelve a abrir.
    await page.goto('/registro');
    await expect(page.getByRole('alert').filter({ hasText: 'Por ahora no hay cupos' })).toHaveCount(0);
  });
});
