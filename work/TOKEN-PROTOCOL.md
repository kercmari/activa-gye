# Protocolo de cada agente (Activa GYE)

1. **Reporte.** Escribe el reporte completo en la ruta que dice tu brief. Responde con ≤15 líneas: estado, commits, números de los gates, dudas abiertas. Sin listados de código.
2. **Lee solo lo necesario.** Nunca hagas `cat` de archivos grandes o logs; usa `grep`, `sed -n`, `tail`.
3. **Revisores** escriben un archivo de hallazgos con tres listas: `HOTFIX NOW`, `BLOCKING` (archivo:línea + cómo reproducir), `non-blocking` (una línea cada uno). Responden ≤25 líneas. Los revisores nunca editan ni hacen commit.
4. **RESUME, DO NOT RESTART.** Empieza con `git log -3 --oneline` y `git status`, y lee tu propio reporte si existe. Lo ya hecho y commiteado con gates verdes se continúa, no se rehace. Haz commits en partes que pasen solas.
5. **Tiempo:** cada fase tiene máximo 20 minutos. Haz commit temprano y seguido.

## Reglas duras

- Los mensajes de commit empiezan con el ID del brief, p. ej. `F1: ...`. Agrega rutas explícitas (`git add <archivo>`), nunca `git add -A` ni `git add .`.
- **Sin la línea `Co-Authored-By`** en los commits (regla de la dueña). No cambies el autor configurado.
- Nunca push, nunca force-push, nunca reescribir historia. Nunca desplegar.
- **No instales dependencias** (`npm install <algo>` está prohibido): todo lo necesario ya está en `package.json`. Si de verdad falta algo, anótalo en el reporte y sigue sin ello.
- **Solo toca los archivos que tu brief dice que son tuyos.** Nunca edites `src/App.tsx`, `src/data/types.ts`, `src/data/index.ts`, `src/data/fallback.ts`, `src/data/mock/index.ts`, `src/data/supabase/index.ts`, `src/auth/*`, `src/components/PhaseGate.tsx`, `src/index.css`, `package.json`, `docs/superpowers/plans/*`, ni migraciones que no sean las de tu brief. Si necesitas un cambio ahí, escríbelo en el reporte (sección "Pedidos al orquestador").
- **Base de datos local:** solo las tareas SQL de la ronda (S1, S3, S4, XS) pueden correr `npx supabase db reset` / `npx supabase test db`. Nadie corre `supabase start`, `stop`, `link` ni `db push`.
- Comandos en primer plano. Nunca leas secretos (`.env`).
- Cero errores sin manejar: ninguna promesa sin `catch` en pantallas; cada carga tiene estado *cargando*, *vacío* y *error con botón Reintentar*.
- Textos visibles **en español de Ecuador**, sin "lorem ipsum" ni datos inventados presentados como reales.

## Gates del proyecto (córrelos todos y reporta números reales)

Desde la raíz de tu árbol de trabajo:

| Gate | Comando |
|---|---|
| Lint | `npm run -s lint` → 0 errores (los warnings se reportan) |
| Tipos + build | `npm run -s build` → exit 0 |
| Tests | `npx vitest run 2>&1 \| tail -5` → todo verde |
| E2E (solo si tu brief lo pide) | `npx playwright test --reporter=line 2>&1 \| tail -15` |

`git status` limpio al terminar (salvo archivos que no son tuyos y ya estaban).
