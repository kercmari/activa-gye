import { expect, test, type Page } from '@playwright/test';
import { ADMIN, conCandadoDeFases, fijarFases, ingresar, llenarFicha, NUTRI, registrar, ruta, salir } from './helpers';

// Semana gratis de punta a punta: registro → ficha → Día 1 → chequeo → Agenda (candado y muro) →
// condiciones de salud (sin plan automático) → cuenta con la semana completa → suscripción → nutricionista.
// Cada prueba va dentro del candado de fases porque registra pacientes y puede cambiar el cupo.
test.describe.configure({ mode: 'serial' });
test.setTimeout(300_000);

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const SEMANA_DEMO = { correo: 'semana@activagye.test', clave: 'ActivaSemana2026!' };

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  await conCandadoDeFases(() => fijarFases(page, { phase1: true, phase2: false, phase3: false }));
  await page.close();
});

/** Etiqueta de una celda del calendario de la Agenda: «d de mes de año». */
function etiquetaDia(diasDesdeHoy: number): string {
  const d = new Date();
  d.setDate(d.getDate() + diasDesdeHoy);
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

/** Agenda: abre la celda del día (desplaza el mes si hace falta). */
async function abrirDiaAgenda(page: Page, diasDesdeHoy: number) {
  await page.goto('/mi-plan/agenda');
  // Espera el calendario ya cargado antes de decidir si hay que cambiar de mes.
  const siguiente = page.getByRole('button', { name: 'Mes siguiente', exact: true }).first();
  await expect(siguiente).toBeVisible();
  const celda = page.getByRole('button', { name: etiquetaDia(diasDesdeHoy), exact: true }).first();
  for (let i = 0; i < 2 && !(await celda.isVisible()); i++) {
    await siguiente.click();
  }
  await celda.click();
}

test('registro → ficha → semana gratis → Día 1 → chequeo → Agenda con candado y fin de la semana gratis', async ({ page }) => {
  await conCandadoDeFases(async () => {
    await fijarFases(page, { phase1: true, phase2: false, phase3: false });

    // 1. Registro nuevo y ficha sin condiciones de salud.
    await registrar(page, 'Paciente Semana E2E');
    await llenarFicha(page);
    await expect(page.getByRole('link', { name: 'Ver mi semana gratis', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Ver mi semana gratis', exact: true }).click();
    await expect.poll(() => ruta(page)).toBe('/mi-plan/hoy');

    // 2. La semana se genera al tocar el botón y Hoy muestra el Día 1 con sus ítems.
    await page.getByRole('button', { name: 'Generar mi semana gratis', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Día 1 de 7', exact: true })).toBeVisible();
    const items = page.getByRole('checkbox');
    const total = await items.count();
    expect(total).toBeGreaterThan(0);

    // 3. Marcar la mitad de los ítems (redondeo hacia arriba) y guardar el chequeo.
    const minimo = Math.ceil(total / 2);
    for (let i = 0; i < minimo; i++) {
      // El cambio se guarda en el servidor: esperamos a que la casilla quede marcada.
      await items.nth(i).click();
      await expect(items.nth(i)).toBeChecked();
    }
    await page.getByRole('button', { name: '4 de 5, Bien', exact: true }).click();
    await page.getByRole('button', { name: 'Guardar chequeo', exact: true }).click();
    await expect(page.getByText('Tu chequeo de hoy')).toBeVisible();
    // El Día 1 ya cumple: el siguiente día se abre mañana.
    await expect(page.getByText(/se abre/).first()).toBeVisible();

    // 4. Agenda: Día 1 con ítems, Día 2 con candado, un día 8 o más con el aviso de fin.
    await abrirDiaAgenda(page, 0);
    await expect(page.getByText(/^[1-9]\d* actividades?$/).first()).toBeVisible();
    await abrirDiaAgenda(page, 1);
    await expect(page.getByText('Este día se abre cuando completes el anterior')).toBeVisible();
    await abrirDiaAgenda(page, 7);
    // Fase 2 apagada: el día 8 no muestra «Próximamente», solo dice que la semana gratis terminó.
    await expect(page.getByText('Tu semana gratis terminó en el día 7.')).toBeVisible();
    await expect(page.getByTestId('paywall-proximamente')).toHaveCount(0);
    await salir(page);
  });
});

test('ficha con Diabetes con fase 2 apagada: la semana no se genera sola y solo se avisa, sin botón a la nutricionista', async ({ page }) => {
  await conCandadoDeFases(async () => {
    await fijarFases(page, { phase1: true, phase2: false, phase3: false });
    await registrar(page, 'Paciente Diabetes E2E');
    await page.goto('/mi-panel?tab=ficha');
    await page.getByLabel('Género', { exact: true }).selectOption('femenino');
    await page.getByLabel('Peso (kg)', { exact: true }).fill('76.5');
    await page.getByLabel('Estatura (cm)', { exact: true }).fill('165');
    await page.getByRole('checkbox', { name: 'Diabetes', exact: true }).check();
    await page.getByRole('button', { name: 'Guardar mi ficha', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Ficha guardada' })).toBeVisible();

    await page.goto('/mi-plan/hoy');
    await page.getByRole('button', { name: 'Generar mi semana gratis', exact: true }).click();
    await expect(page.getByText('Por tu condición de salud, tu plan lo armará una nutricionista. Te avisaremos cuando esté disponible.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Pedir atención a una nutricionista', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Volver a mi perfil', exact: true })).toHaveAttribute('href', '/perfil');
    await expect(page.getByRole('heading', { name: /Día \d de 7/ })).toHaveCount(0);
    await salir(page);
  });
});

test('cuenta con semana completada: muro de suscripción, pago y solicitud para la nutricionista', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'Flujo de pago completo: se prueba una vez en escritorio.');
  await conCandadoDeFases(async () => {
    const stamp = Date.now();
    await fijarFases(page, { phase1: true, phase2: true, phase3: false });

    // 1. Semana completada: Hoy lo dice y ofrece suscribirse.
    await ingresar(page, SEMANA_DEMO.correo, SEMANA_DEMO.clave);
    await expect.poll(() => ruta(page)).toBe('/perfil');
    await page.goto('/mi-plan/hoy');
    await expect(page.getByRole('heading', { name: '¡Semana completada!', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Suscribirme para seguir', exact: true }).click();
    await expect.poll(() => ruta(page)).toBe('/mi-plan/suscripcion');

    // 2. Elige el plan (Suscribirme) e informa la transferencia. Si ya está activa o ya hay un
    // comprobante informado (ejecuciones anteriores), no se repite: se usa la referencia que está en pantalla.
    const activa = page.getByText('Suscripción activa', { exact: true });
    const informado = page.getByText(/Comprobante informado:/);
    let referencia = `TRF-SEMANA-${stamp}`;
    const suscribirme = page.getByRole('button', { name: 'Suscribirme', exact: true }).first();
    await expect(activa.or(informado).or(suscribirme)).toBeVisible();
    // Si ya está activa, un pago anterior ya fue confirmado: el paso 3 no aplica (no busca la fila).
    const yaActiva = await activa.isVisible();
    if (!yaActiva && !(await informado.isVisible())) {
      await suscribirme.click();
      await page.getByLabel('Número de comprobante', { exact: true }).fill(referencia);
      await page.getByRole('button', { name: 'Informar pago', exact: true }).click();
      await expect(informado).toBeVisible();
    } else if (await informado.isVisible()) {
      referencia = ((await informado.textContent()) ?? '').match(/TRF-[\w-]+/)?.[0] ?? referencia;
    }
    await salir(page);

    // 3. Admin marca pagada la factura de esa referencia (si todavía está pendiente).
    if (!yaActiva) {
      await ingresar(page, ADMIN.correo, ADMIN.clave);
      await expect.poll(() => ruta(page)).toBe('/perfil');
      await page.goto('/admin/pagos');
      const fila = page.getByRole('row').filter({ hasText: referencia }).first();
      await expect(fila).toBeVisible();
      const marcar = fila.getByRole('button', { name: 'Marcar pagada', exact: true });
      if (await marcar.isVisible()) {
        await marcar.click();
        await expect(marcar).toHaveCount(0);
      }
      await salir(page);
    }

    // 4. La nutricionista ve la solicitud de la paciente de la semana demo.
    await ingresar(page, NUTRI.correo, NUTRI.clave);
    await expect.poll(() => ruta(page)).toBe('/perfil');
    await page.goto('/nutri/solicitudes');
    await expect(page.getByRole('listitem').filter({ hasText: 'Paciente semana demo' }).first()).toBeVisible();
    await salir(page);
  });
});
