// Toma las capturas de la entrega (Fase 5) con Playwright.
// No levanta el servidor: asume que la app ya está servida en http://127.0.0.1:$E2E_PORT.
// Uso: E2E_PORT=4173 node scripts/capturas.mjs
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const PORT = process.env.E2E_PORT ?? '4173';
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = join(process.cwd(), 'docs', 'entrega', 'capturas');

const USUARIO = { correo: 'usuario@activagye.test', clave: 'ActivaUser2026!' };
const NUTRI = { correo: 'nutri@activagye.test', clave: 'ActivaNutri2026!' };

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

/** Crea una solicitud de nutrición sin foto (4 pasos) y espera la guía. */
async function crearSolicitud(page) {
  await ir(page, '/nutricion');
  await page.getByRole('link', { name: 'Empezar', exact: true }).click();
  await page.waitForURL(/\/nutricion\/nueva$/);
  await page.getByLabel('Sexo', { exact: true }).selectOption('femenino');
  await page.getByLabel('Altura (cm)', { exact: true }).fill('165');
  await page.getByLabel('Peso (kg)', { exact: true }).fill('76.5');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByLabel('Objetivo', { exact: true }).selectOption('bajar_peso');
  await page.getByLabel('Nivel de actividad', { exact: true }).selectOption('ligero');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click(); // Foto: opcional.
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await page.waitForURL(/\/nutricion\/(?!nueva$)[^/]+$/, { timeout: 15_000 });
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const escritorio = { width: 1280, height: 800 };

try {
  await captura(browser, 'inicio.png', { viewport: escritorio }, (page) => ir(page, '/'));

  await captura(browser, 'buscar.png', { viewport: escritorio }, (page) =>
    ir(page, '/lugares?deporte=gimnasios'),
  );

  await captura(browser, 'ficha.png', { viewport: escritorio }, async (page) => {
    await ir(page, '/lugares');
    await page.locator('a[href^="/lugares/"]').first().click();
    await page.waitForURL(/\/lugares\/[^/]+$/, { timeout: 15_000 });
    await page.waitForTimeout(800); // deja cargar el mapa
  });

  await captura(browser, 'registro.png', { viewport: escritorio }, (page) => ir(page, '/registro'));

  await captura(browser, 'perfil-progreso.png', { viewport: escritorio }, async (page) => {
    await ingresar(page, USUARIO);
    await ir(page, '/perfil?tab=progreso');
  });

  await captura(browser, 'nutricion-guia.png', { viewport: escritorio }, async (page) => {
    await ingresar(page, USUARIO);
    await ir(page, '/perfil?tab=plan');
    const guia = page.getByRole('link', { name: 'Ver guía completa', exact: true });
    if ((await guia.count()) > 0) {
      await guia.first().click();
      await page.waitForURL(/\/nutricion\/[^/]+$/, { timeout: 15_000 });
    } else {
      await crearSolicitud(page);
    }
  });

  await captura(browser, 'admin-nutricion.png', { viewport: escritorio }, async (page) => {
    await ingresar(page, NUTRI);
    await ir(page, '/admin/nutricion');
  });

  await captura(browser, 'movil-menu.png', { viewport: { width: 360, height: 780 }, fullPage: false }, async (page) => {
    await ir(page, '/');
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    await page.locator('#menu-movil').waitFor({ state: 'visible' });
  });
} finally {
  await browser.close();
}
