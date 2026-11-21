# Lista de capturas para el PDF

Las capturas marcadas con **(lista)** ya existen en `docs/entrega/capturas/`. Las demás hay que sacarlas a mano.

## Programación (código)

- `src/App.tsx` — mapa de rutas (captura del editor, no existe todavía).
- `src/data/types.ts` — contrato de datos (tipos).
- `src/data/index.ts` — punto único de acceso a los datos.
- `src/auth/AuthContext.tsx` — sesión y roles.
- `e2e/nutricion.spec.ts` — prueba del flujo completo de nutrición.

## Configuración

- `vite.config.ts`
- `wrangler.jsonc`
- `supabase/migrations/20261121000001_esquema_inicial.sql` — tablas ya escritas.

## Pantallas (escritorio, 1280 px)

- `docs/entrega/capturas/inicio.png` (**lista**) — portada.
- `docs/entrega/capturas/buscar.png` (**lista**) — búsqueda de gimnasios.
- `docs/entrega/capturas/ficha.png` (**lista**) — ficha con Cómo llegar y mapa.
- `docs/entrega/capturas/registro.png` (**lista**) — registro.
- `docs/entrega/capturas/perfil-progreso.png` (**lista**) — Mi perfil, pestaña Progreso.
- `docs/entrega/capturas/nutricion-guia.png` (**lista**) — guía de nutrición.
- `docs/entrega/capturas/admin-nutricion.png` (**lista**) — panel de nutrición.

## Celular (360 px)

- `docs/entrega/capturas/movil-menu.png` (**lista**) — menú abierto.

## Estados (a tomar con la app)

- Cargando: pantalla con el mensaje de carga (`role="status"`).
- Vacío: búsqueda sin resultados, con su botón útil.
- Error: mensaje de error con el botón **Reintentar**.

## Pruebas en verde

- Salida de `npx playwright test --reporter=line` mostrando 28 pruebas en verde (tomar de la terminal).
- Salida de `npx vitest run` y `npm run -s lint` (tomar de la terminal).
