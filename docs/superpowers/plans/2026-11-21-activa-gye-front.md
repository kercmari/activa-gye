# Plan de trabajo — Activa GYE (frontend con datos simulados)

Fecha: 21/11/2026 · Diseño: `docs/superpowers/specs/2026-11-21-activa-gye-design.md` · Pedido de la dueña: "haz el front primero con datos simulados; luego la base; al final publícalo gratis; usa haiku para gastar pocos tokens".

## En palabras sencillas

1. **Esta noche** se construye la página completa. Los datos se guardan en el navegador (simulador). Los lugares son **reales** (OpenStreetMap).
2. **Mañana** se conecta la base real (Supabase). Ya está escrita y probada en `supabase/migrations/20261121000001_esquema_inicial.sql`. Solo hay que crear `src/data/supabase/` con el mismo contrato (`Repo` en `src/data/types.ts`) y cambiar una línea en `src/data/index.ts`.
3. **Al final**, si las revisiones dicen SHIP, se publica gratis en Cloudflare Workers (`npx wrangler deploy`, sitio estático en `dist/`).

## Cómo está repartido (para que los agentes no choquen)

- **Contrato único:** `src/data/types.ts` (tipos + `Repo`). Las pantallas solo usan `repo` de `src/data/index.ts`.
- **Archivos del orquestador** (nadie más los toca): `src/App.tsx` (rutas), `src/data/types.ts`, `src/data/index.ts`, `src/data/mock/index.ts`, `src/data/mock/store.ts`, `src/auth/*` (sesión y protecciones), `src/index.css` (colores y letras), `package.json`, `supabase/`, `work/`.
- **Cada tarea tiene su lista de archivos** (está en su brief, `work/briefs/<ID>.md`).
- Cada agente trabaja en su propia copia (worktree `../activa-gye-wt/<ID>`, rama `t/<ID>`). Al terminar cada ronda, el lanzador une las ramas en `main`.

## Rondas (cada fase dura máximo 20 minutos)

| Ronda | Tareas en paralelo (haiku) | Qué deja |
|---|---|---|
| 1 | **F1** encabezado, pie, kit de UI, landing, páginas fijas · **F2a** lugares reales OSM + simulador de catálogo · **F2b** simulador de cuentas, perfil, progreso, nutrición + guía básica | Base visual y datos |
| 2 | **G1** deportes, búsqueda, ficha con **Cómo llegar**, comparar · **G2** ingresar, registro, **Mi perfil** (favoritos, plan, **progreso**) · **G3** nutricionista · **G4** panel admin/nutricionista | Todas las pantallas |
| 3 | **E1** pruebas de navegación de punta a punta (Playwright) + evidencia en `docs/entrega/` | Pruebas y material del PDF |
| 4 | Revisiones **opus**: **R1** datos y lógica · **R2** navegación en navegador real | Veredicto SHIP / DO NOT SHIP |
| 5 (si hace falta) | **X1** / **X2** arreglos (haiku) → **R1b** / **R2b** recomprobación (opus) | Segunda ronda |
| Final | Si todo SHIP: build y publicación gratis | Enlace público |

Si una revisión dice DO NOT SHIP, la ronda de arreglos se lanza sola (la dueña está dormida). No se hacen más de 2 rondas de arreglo esta noche.

## Gates (los corre cada agente)

`npm run -s lint` · `npm run -s build` · `npx vitest run` · `npx playwright test --reporter=line` (E1 y revisiones).

## Cómo lanzarlo / retomarlo

```bash
cd /home/kerly/Desktop/proyects/activa-gye
nohup work/noche.sh > work/out/noche.console 2>&1 &
tail -f work/out/noche.log
```

Es reanudable: si se corta, se vuelve a lanzar y salta lo ya hecho (cada tarea con `report.md` y commit).

## Después (mañana, con la dueña)

- Crear proyecto Supabase gratis + clave de Groq; implementar `src/data/supabase/*` y la Edge Function `analizar-nutricion` (IA con visión; si falla, la guía básica de `src/lib/nutrition/guide.ts`).
- Correo real de recuperación de contraseña (SMTP gratis).
- Verificar precios y horarios de al menos 12 lugares.
- Código del Figma Make (si se consigue) para afinar detalles visuales; logo en alta calidad.
