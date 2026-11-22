// Toma las capturas de la entrega (fases 1 a 3) con Playwright.
// No levanta el servidor: asume que la app ya está servida en http://127.0.0.1:$E2E_PORT.
// Uso: E2E_PORT=4173 node scripts/capturas.mjs
// Enciende las 3 fases para tomar las pantallas y al final deja las fases y el cupo como estaban.
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const PORT = process.env.E2E_PORT ?? '4173';
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = join(process.cwd(), 'docs', 'entrega', 'capturas');

const ADMIN = { correo: 'admin@activagye.test', clave: 'ActivaAdmin2026!' };
const NUTRI = { correo: 'nutri@activagye.test', clave: 'ActivaNutri2026!' };
const USUARIO = { correo: 'usuario@activagye.test', clave: 'ActivaUser2026!' };

async function ingresar(page, { correo, clave }) {
  await page.goto(`${BASE}/ingresar`, { waitUntil: 'networkidle' });
  await page.getByLabel('Correo electrónico', { exact: true }).fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(clave);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => url.pathname === '/perfil' || url.pathname === '/admin', { timeout: 15_000 });
}

async function ir(page, ruta) {
  await page.goto(`${BASE}${ruta}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
}

async function captura(browser, nombre, { viewport, fullPage = true }, pasos) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  try {
    await pasos(page);
    await page.waitForTimeout(400);
    const ruta = join(OUT, nombre);
    await page.screenshot({ path: ruta, fullPage });
    console.log(`OK ${ruta}`);
  } finally {
    await context.close();
  }
}

/** Admin: lee las fases y el cupo, y los fija con `cambios`. Devuelve los valores de antes. */
async function fijarFases(browser, cambios) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await ingresar(page, ADMIN);
    await ir(page, '/admin/fases');
    const casillas = {
      phase1: page.getByRole('checkbox', { name: /Fase 1 · / }),
      phase2: page.getByRole('checkbox', { name: /Fase 2 · / }),
      phase3: page.getByRole('checkbox', { name: /Fase 3 · / }),
    };
    const cupo = page.getByLabel('Cupo de pacientes (mientras la fase 3 está apagada)', { exact: true });
    const antes = {
      phase1: await casillas.phase1.isChecked(),
      phase2: await casillas.phase2.isChecked(),
      phase3: await casillas.phase3.isChecked(),
      patient_limit: Number(await cupo.inputValue()),
    };
    if (cambios) {
      for (const clave of ['phase1', 'phase2', 'phase3']) {
        if (cambios[clave] !== undefined) await casillas[clave].setChecked(cambios[clave]);
      }
      if (cambios.patient_limit !== undefined) await cupo.fill(String(cambios.patient_limit));
      await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'Cambios guardados' }).waitFor({ timeout: 15_000 });
    }
    return antes;
  } finally {
    await context.close();
  }
}

/**
 * Crea un paciente de muestra con ficha, pide nutricionista y devuelve su nombre.
 * La captura de la ficha del nutricionista lo acepta, y al final se cierra la atención.
 */
async function pacienteDeMuestra(browser, nombre) {
  const stamp = Date.now();
  const clave = 'ClaveSegura2026';
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await ir(page, '/registro');
    await page.getByLabel('Nombre completo', { exact: true }).fill(nombre);
    await page.getByLabel('Correo electrónico', { exact: true }).fill(`captura+${stamp}@activagye.test`);
    await page.getByLabel('Contraseña', { exact: true }).fill(clave);
    await page.getByLabel('Confirmar contraseña', { exact: true }).fill(clave);
    await page.getByLabel('Fecha de nacimiento', { exact: true }).fill('2000-05-10');
    await page.getByLabel('Acepto los términos y la política de privacidad').check();
    await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
    await page.waitForURL((url) => url.pathname === '/mi-panel', { timeout: 15_000 });
    await ir(page, '/mi-panel?tab=ficha');
    await page.getByLabel('Género', { exact: true }).selectOption('femenino');
    await page.getByLabel('Peso (kg)', { exact: true }).fill('76.5');
    await page.getByLabel('Estatura (cm)', { exact: true }).fill('165');
    await page.getByRole('button', { name: 'Guardar mi ficha', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Ficha guardada' }).waitFor({ timeout: 15_000 });
    await ir(page, '/mi-panel?tab=nutricionista');
    await page.getByRole('button', { name: 'Solicitar nutricionista', exact: true }).click();
    await page.getByRole('button', { name: 'Cancelar solicitud' }).waitFor({ timeout: 15_000 });
  } finally {
    await context.close();
  }
}

/** Nutricionista: acepta al paciente de muestra y deja la página de su ficha. Devuelve la ruta. */
async function aceptarPacienteDeMuestra(page, nombre) {
  await ingresar(page, NUTRI);
  await ir(page, '/nutri/solicitudes');
  await page.getByRole('listitem').filter({ hasText: nombre }).getByRole('button', { name: 'Aceptar', exact: true }).click();
  await page.waitForURL(/\/nutri\/pacientes\/[^/]+$/, { timeout: 15_000 });
  await page.waitForTimeout(400);
  return new URL(page.url()).pathname;
}

/** Nutricionista: cierra la atención del paciente de muestra para liberar el cupo del plan. */
async function finalizarPacienteDeMuestra(browser, ruta) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await ingresar(page, NUTRI);
    await ir(page, ruta);
    await page.getByRole('button', { name: 'Finalizar atención', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Finalizar atención', exact: true }).click();
    await page.waitForURL(/\/nutri$/, { timeout: 15_000 });
  } finally {
    await context.close();
  }
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const escritorio = { width: 1280, height: 800 };

const antes = await fijarFases(browser, { phase1: true, phase2: true, phase3: true });
try {
  await captura(browser, 'admin-fases.png', { viewport: escritorio }, async (page) => {
    await ingresar(page, ADMIN);
    await ir(page, '/admin/fases');
  });

  await captura(browser, 'mi-ficha.png', { viewport: escritorio }, async (page) => {
    await ingresar(page, USUARIO);
    await ir(page, '/mi-panel?tab=ficha');
  });

  await captura(browser, 'paciente-calendario.png', { viewport: escritorio }, async (page) => {
    await ingresar(page, USUARIO);
    await ir(page, '/mi-panel?tab=calendario');
  });

  await captura(browser, 'paciente-pagos.png', { viewport: escritorio }, async (page) => {
    await ingresar(page, USUARIO);
    await ir(page, '/mi-panel?tab=pagos');
  });

  await captura(browser, 'nutri-tablero.png', { viewport: escritorio }, async (page) => {
    await ingresar(page, NUTRI);
    await ir(page, '/nutri');
  });

  const nombreMuestra = `Paciente de muestra ${Date.now()}`;
  await pacienteDeMuestra(browser, nombreMuestra);
  let rutaMuestra = null;
  try {
    await captura(browser, 'nutri-paciente.png', { viewport: escritorio }, async (page) => {
      rutaMuestra = await aceptarPacienteDeMuestra(page, nombreMuestra);
    });
  } finally {
    if (rutaMuestra) await finalizarPacienteDeMuestra(browser, rutaMuestra);
  }

  await captura(browser, 'resenas.png', { viewport: escritorio }, async (page) => {
    await ir(page, '/lugares');
    await page.locator('a[href^="/lugares/"]').first().click();
    await page.waitForURL(/\/lugares\/[^/]+$/, { timeout: 15_000 });
    await page.waitForTimeout(800);
  });

  await captura(browser, 'reporte.png', { viewport: escritorio }, async (page) => {
    await ingresar(page, USUARIO);
    await ir(page, '/mi-panel/reporte');
  });
} finally {
  // Deja las fases y el cupo como estaban antes de la captura.
  await fijarFases(browser, antes);
  await browser.close();
}
