"""Ronda 7 (24/11): recetas que llenan el calendario, planes Gratis/Starter/Profesional, suscripción por correo.
Diseño: docs/superpowers/specs/2026-11-24-recetas-planes-suscripcion.md
Plan:   docs/superpowers/plans/2026-11-24-recetas-planes-suscripcion.md
Uso: python3 -I work/gen/briefs_recetas.py"""
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('b4', Path(__file__).with_name('briefs_semana4.py'))
b4 = importlib.util.module_from_spec(spec); spec.loader.exec_module(b4)
b1 = b4.b1
OUT = b1.OUT
SPEC = 'docs/superpowers/specs/2026-11-24-recetas-planes-suscripcion.md'
PLAN = 'docs/superpowers/plans/2026-11-24-recetas-planes-suscripcion.md'

R7 = f"""**Esta ronda (pedido de la dueña, 24/11):** lee COMPLETOS `{SPEC}` (diseño, manda) y `{PLAN}` (contrato exacto: nombres de columnas, funciones, firmas, tipos, métodos del `Repo`, códigos de error). Usa esos nombres tal cual; si algo no cuadra con el código, anótalo en «Pedidos al orquestador» y sigue con lo demás.
{b4.FASES}
**Otros agentes trabajan a la vez en otros worktrees:** toca SOLO tus archivos. No hagas push ni deploy. No toques la nube (nada de `supabase link`, `db push`, `wrangler`). No leas ni imprimas `.env*`.
"""
E2E_OWN = """Si corres e2e: con TU preview (`npm run -s build && (npx vite preview --port $E2E_PORT --strictPort --host 127.0.0.1 > /dev/null 2>&1 &)`) y `E2E_PORT=$E2E_PORT npx playwright test <tus archivos> --reporter=line`; mata tu preview por PID (nunca `pkill -f`). No corras la suite completa ni `db reset`."""
UI = """Pautas de pantalla: `work/ref/CHECKLIST-FRONT.md` (44 px, campos `text-base`, etiquetas, error junto al campo, estados cargando/vacío/error, sin scroll horizontal a 360 px). Fases: lo de paciente/nutricionista con `usePhase(2)`/`PhaseGate` como el resto. El botón de pago es SOLO «Contactar por correo para solicitar una suscripción» (usa `subscriptionMailto` de `src/lib/mailto.ts` y `settings.admin_email`): primero llama la RPC de solicitud y luego abre el `mailto:` (`window.location.href`), y muestra «Tu solicitud quedó registrada…». Nunca datos bancarios ni «Reporté mi transferencia»."""

# ------------------------------------------------------------------ R1
b1.impl('S12', 'Migración 12: planes, límites gratis, correo de admin, suscripciones (mejorar/renovar)',
 '`supabase/migrations/20261124000012_planes_suscripcion_correo.sql`, `supabase/tests/09_planes_suscripcion.sql`; y SOLO las aserciones de `supabase/tests/0*.sql` que rompa a propósito el contrato (p. ej. `YA_TIENES_SUSCRIPCION`, `SIN_SUSCRIPCION` al aceptar).',
 R7 + f"""Implementa TODA la sección «Migración 12» del plan. Antes de redefinir una función, **copia su cuerpo vigente** (la última migración que la define: `grep -ln "function public.<nombre>" supabase/migrations/*`) y cambia solo lo pedido. Repite revokes/grants como en `20261122000009_permisos_nube.sql`.""",
 """`supabase/tests/09_planes_suscripcion.sql` (pgTAP), como mínimo:
1. Planes: Starter $9/15/60, Profesional $19/50/null, Seguimiento mensual $40 con recipe_quota 10; `get_public_settings()` trae `admin_email='kerlyeliz19@gmail.com'`, `free_patient_limit=3`, `free_daily_record_limit=10`.
2. `admin_set_contact_settings` por no admin → `SOLO_ADMIN`; correo inválido → `DATOS_INVALIDOS`; por admin cambia los tres valores.
3. Nutricionista sin suscripción acepta 3 solicitudes; la 4.ª → `CUPO_PLAN_LLENO`.
4. Con Starter activa, `choose_plan(Profesional)` funciona (ya no `YA_TIENES_SUSCRIPCION`); al aprobar, la Starter queda `cancelada` y la Profesional `activa`, cupo 50.
5. Paciente: aprobar su factura → `recipes_left=10`; renovar estando vigente con 4 restantes → 14 y vencimiento +30 días; aprobar la misma factura dos veces → `ESTADO_INVALIDO`.
6. `admin_subscriptions_overview()` lista la pendiente y la activa con `audience` correcto; no admin → `SOLO_ADMIN`.
Además `npx supabase test db` completo verde (01–09).""",
 'S13 en la ronda 2', b1.SQL_RULES)

b1.impl('DT1', 'Contrato TS + capa Supabase + mailto',
 '`src/data/types.ts`, `src/data/supabase/*.ts` (+ sus `*.test.ts`), `src/data/supabase/errors.ts` (+ test), `src/lib/mailto.ts` (+ `mailto.test.ts`). NO toques pantallas, `src/data/mock/` ni `supabase/`.',
 R7 + """Implementa la sección «TypeScript» del plan: tipos, campos nuevos, métodos nuevos del `Repo` y su implementación Supabase (llamando a las RPC/tablas por los nombres del plan; mapea snake_case tal cual), y los códigos de error con sus textos.
- El simulador (`src/data/mock/`) lo implementa OTRO agente en la ronda 2: para que compile ahora, si el objeto del simulador debe cumplir `Repo`, añade allí SOLO stubs mínimos que lancen `new Error('PENDIENTE_SIMULADOR')` y avisa en el reporte.
- Si algún componente deja de compilar por un campo nuevo obligatorio, arregla SOLO el tipo de esa línea (valor por defecto) y anótalo; las pantallas son de otros agentes.
- `copyPlanWeek` ahora recibe `prescriptionId` (4.º parámetro); actualiza el único llamador (`PlanEditor`) pasando `''` provisional y anótalo para UN2.""",
 """Vitest:
1. Cada método nuevo de Supabase llama a la RPC/tabla correcta con los parámetros del plan (cliente simulado, como en `plan.test.ts`).
2. `errorMessage` traduce los 8 códigos nuevos.
3. `subscriptionMailto('a+b@x.com', {plan:'Profesional', price:19, fullName:'Ana Pérez', email:'ana@x.com'})` → empieza con `mailto:a%2Bb%40x.com?subject=` y el cuerpo decodificado contiene «Ana Pérez», «Profesional» y «$19».
4. `npx tsc --noEmit -p .` (o el build) sin errores.""",
 'S13, DT2, UA y UP en la ronda 2')

# ------------------------------------------------------------------ R2
b1.impl('S13', 'Migración 13: recetas, calendario, límite diario, agregar paciente',
 '`supabase/migrations/20261124000013_recetas_calendario_limites.sql`, `supabase/tests/10_recetas_calendario.sql`; y SOLO las aserciones de `supabase/tests/0*.sql` que rompa a propósito el contrato (insertar `plan_days` sin receta, `copy_plan_week` de 3 parámetros).',
 R7 + f"""Implementa TODA la sección «Migración 13» del plan (la 12 ya está en main). Copia el cuerpo vigente de cada función que redefinas. Repite grants explícitos. Ojo con el orden: crea `prescriptions` antes de la FK de `plan_days`; los triggers de límite usan `nutri_daily_limit()` de la migración 12.""",
 """`supabase/tests/10_recetas_calendario.sql` (pgTAP), como mínimo:
1. `plan_days` sin `prescription_id` → `RECETA_REQUERIDA`; en receta entregada → `RECETA_CERRADA`; día ya ocupado → `DIA_OCUPADO`.
2. Paciente de plataforma con suscripción (10 recetas): entregar baja a 9; la 11.ª → `SIN_RECETAS`; sin suscripción → `SIN_SUSCRIPCION_PACIENTE`; entregar dos veces la misma → error y saldo sin cambio.
3. Paciente propio: entregar no descuenta y no exige suscripción.
4. Lectura del paciente: borrador invisible; entregada visible aun con la suscripción vencida; días de otro paciente invisibles; puede marcar cumplido un día entregado.
5. Límite diario gratis (10): el 11.º registro de hoy → `LIMITE_DIARIO`; `copy_plan_week` que no cabe falla completo (0 filas nuevas); la «Semana 1» de `nutri_add_patient` no cuenta.
6. `nutri_add_patient`: correo inexistente → `PACIENTE_NO_REGISTRADO`; paciente con atención aceptada → `PACIENTE_OCUPADO`; cupo lleno → `CUPO_PLAN_LLENO`; caso feliz → atención `aceptada` `origin='propio'` + receta borrador con 7 días.
7. `list_my_patients` trae `origin` y `recipes_left`; `nutri_dashboard()->'limits'` trae `records_today` real.
Además `npx supabase test db` completo verde (01–10).""",
 'la ronda 3', b1.SQL_RULES)

b1.impl('DT2', 'Simulador: todo el contrato nuevo',
 '`src/data/mock/*` (+ sus tests). NO toques `src/data/types.ts`, `src/data/supabase/`, pantallas ni `supabase/`.',
 R7 + """Reemplaza los stubs `PENDIENTE_SIMULADOR` por la lógica real del simulador para TODO lo nuevo del `Repo` (recetas, saldo, entrega, límites gratis/plan, agregar paciente, `copyPlanWeek` con receta, `adminSubscriptionsOverview`, `adminSaveContactSettings`, planes con precios nuevos, `choosePlan`/`choosePatientPlan` con mejora y renovación, aprobación con `markInvoicePaid`). Mismas reglas y mismos códigos de error que la base (lee el plan y los §2–§4 del diseño). Semilla: planes y ajustes con los valores iniciales.""",
 """Vitest del simulador: los casos 2, 3, 5 y 6 de S13 y 3–5 de S12, en versión simulador.""",
 'las pantallas')

b1.impl('UA', 'Admin: Suscripciones, Planes y correo, portada, Usuarios, Mensajes, contacto',
 '`src/pages/admin/*` (crea `AdminSuscripcionesPage.tsx` y `AdminPlanesPage.tsx`), `src/components/admin/*`, en `src/App.tsx` SOLO las rutas `admin/*`, `src/components/layout/Footer.tsx` y `src/pages/ContactoPage.tsx` (solo el enlace «Escribir a la administración»), y sus `*.test.tsx`. NO toques `src/data/`, `supabase/`, pantallas de paciente ni de nutricionista.',
 R7 + UI + f"""
Implementa §2.7 (punto 3–4), §2.8, §2.9 y «Administradora» del §3 del diseño:
- `/admin/suscripciones`: pendientes (pacientes y nutricionistas) con quién, plan, precio, fecha, «Escribir» (`mailto:` al usuario), **Aprobar** (`repo.markInvoicePaid`) y **Rechazar** (`repo.cancelInvoice`) con `ConfirmDialog`; debajo activas con vencimiento y recetas restantes. Datos de `repo.adminSubscriptionsOverview()`. `/admin/pagos` → `<Navigate to="/admin/suscripciones" replace />`.
- `/admin/planes`: planes editables (`repo.listPlans()` + `repo.adminSavePlan`, con los campos nuevos y `features` una por línea) y bloque «Plan gratis y correo» (`repo.adminSaveContactSettings`). Validación junto al campo.
- Portada de Admin y menú del `AdminShell`: tarjetas/enlaces «Suscripciones» (con contador de pendientes) y «Planes y correo» visibles SIEMPRE (no dependen de la fase 2); «Pagos» desaparece.
- Usuarios: para nutricionistas, plan y `x/N` pacientes si el dato está disponible en `adminListUsers`/overview; si no, anótalo en «Pedidos al orquestador».
- Mensajes: botón «Responder por correo» (`mailto:` del remitente).
- Pie y Contacto: enlace «Escribir a la administración» con `contactMailto(settings.admin_email)`.""",
 """Vitest: Suscripciones (lista, aprobar con confirmación llama `markInvoicePaid`, rechazar, vacío, error); Planes (guardar plan, validación de precio negativo, guardar correo); portada muestra las tarjetas nuevas con fase 2 apagada; `/admin/pagos` redirige; Mensajes tiene «Responder por correo» con `href` correcto; pie con `mailto:kerlyeliz19@gmail.com` cuando settings lo trae.""",
 'la ronda 3')

b1.impl('UP', 'Paciente: suscripción por correo, saldo de recetas, días de recetas en Agenda y Hoy',
 '`src/pages/plan/*` (+ tests), `src/components/plan/*` si existe, y `PlanShell`. NO toques `src/data/`, `supabase/`, admin ni nutri.',
 R7 + UI + """
- **Suscripción** (`SuscribirmePage`): tarjeta del plan de paciente desde `repo.listPatientPlans()` («$40 al mes · 10 recetas de tu nutricionista» con los valores reales del plan) + botón de correo que llama `repo.choosePatientPlan`. Activa: «Te quedan X de Y recetas · vence el …» (`repo.getRecipeBalance()`), y el botón sigue disponible para **renovar**.
- **Agenda y Hoy:** cargan los días (`repo.listPlanDays`) **siempre** que haya fase 2, no solo con suscripción activa ni solo con semana gratis; si además hay semana gratis, se ven las dos cosas sin romper lo actual. Paciente sin semana gratis ni días: estado vacío con salida («Aún no tienes recetas…»).
- **Mis recetas:** lista (`repo.listMyPrescriptions()`) con tipo, título, fecha y el texto completo (expandible). Ubícala en Agenda o como pestaña de la barra si cabe a 360 px sin tapar contenido.""",
 """Vitest: suscripción sin plan → botón de correo llama `choosePatientPlan` y abre `mailto:` (espía `window.location`), muestra el aviso; activa → «Te quedan 7 de 10»; Agenda muestra días de receta sin semana gratis ni suscripción; Mis recetas lista y expande; estados vacío/error.""",
 'la ronda 3')

# ------------------------------------------------------------------ R3
b1.impl('UN1', 'Nutricionista: Tablero, Mis pacientes (agregar), Mi plan',
 '`src/pages/nutri/TableroPage.tsx`, `src/pages/nutri/MisPacientesPage.tsx` (NUEVA), `src/pages/nutri/SuscripcionPage.tsx`, `src/components/nutri/NutriShell.tsx`, en `src/App.tsx` SOLO las rutas `nutri/*`, y sus tests. NO toques `PacientePage.tsx`, `PlanEditor.tsx`, `src/data/` ni `supabase/`.',
 R7 + UI + """
- **Tablero:** pacientes `x de N`, registros de hoy `x de N` (o «sin límite»), plan actual + «Mejorar plan» (a `/nutri/suscripcion`), recetas de la semana y solicitudes abiertas. Datos de `repo.getNutriDashboard()` (`limits`, `recipes_week`).
- **Mis pacientes** `/nutri/pacientes`: lista (`repo.listMyPatients()`) con origen (Plataforma/Propio), recetas restantes (si plataforma), días cumplidos y enlace a la ficha. **Agregar paciente**: diálogo con campo de correo → `repo.nutriAddPatient` → navega a `/nutri/pacientes/:id?tab=recetas`. Con `PACIENTE_NO_REGISTRADO`: el texto + enlace de registro y botón «Copiar enlace» (`navigator.clipboard.writeText(location.origin + '/registro?tipo=paciente')`). Otros errores con su texto.
- **Mi plan** (`/nutri/suscripcion`): tres tarjetas (Gratis desde `settings.free_*`; Starter y Profesional desde `repo.listPlans()` audience nutricionista, con `features`), el plan actual marcado, botón de correo en los pagos (llama `repo.choosePlan`); quita cualquier formulario de transferencia o datos bancarios.
- Menú del `NutriShell`: Tablero · Mis pacientes · Solicitudes · Mi plan · Plantillas.""",
 """Vitest: tablero con límites (y «sin límite» cuando `daily_record_limit` es null); agregar paciente feliz navega; `PACIENTE_NO_REGISTRADO` muestra copiar enlace; `CUPO_PLAN_LLENO` muestra su texto; Mi plan muestra 3 tarjetas con precios del repo y el botón llama `choosePlan` y abre `mailto:`; no aparece «transferencia» ni número de cuenta.""",
 'EX2 en la ronda 4')

b1.impl('UN2', 'Nutricionista: Recetas del paciente (editor, días, entregar)',
 '`src/pages/nutri/PacientePage.tsx`, `src/components/nutri/PlanEditor.tsx`, `src/components/nutri/RecetaEditor.tsx` (NUEVO), y sus tests. NO toques otras páginas nutri, `src/data/` ni `supabase/`.',
 R7 + UI + """
- En la ficha del paciente, pestañas **Calendario · Recetas · Progreso · Seguimiento · Ficha** (respeta `?tab=`). Arriba: origen y «Recetas: X de Y» (`repo.getRecipeBalance(patientId)`) o «Paciente propio: no descuenta recetas».
- **Recetas:** lista de borradores y entregadas (`repo.listPrescriptions`). «Nueva receta» → `RecetaEditor`: tipo (dieta/rutina/recomendación), título, texto, y sus **días** (fecha, título, comidas, ejercicio, notas) guardados con `repo.savePlanDay(patientId, { ..., prescription_id })`; solo fechas libres (avisa `DIA_OCUPADO`). Guardar borrador (`savePrescription`), borrar borrador (`deletePrescription`, con confirmación), y **Entregar** con `ConfirmDialog` que dice «Usará 1 de tus recetas: le quedarán X» o «Paciente propio: no descuenta» → `deliverPrescription`. Entregadas: solo lectura.
- **Calendario** (`PlanEditor`): muestra todos los días (con a qué receta pertenecen); crear/editar días ahora se hace dentro de una receta borrador (el botón lleva a Recetas); «Copiar semana» pide la receta borrador destino y pasa `prescriptionId`.
- Errores con su texto: `SIN_RECETAS`, `SIN_SUSCRIPCION_PACIENTE`, `LIMITE_DIARIO`, `RECETA_CERRADA`, `DIA_OCUPADO`.""",
 """Vitest: crear borrador con 2 días llama `savePrescription` y `savePlanDay` con `prescription_id`; entregar muestra el saldo en la confirmación y llama `deliverPrescription`; `SIN_RECETAS` muestra su texto; entregada no tiene botones de editar; paciente propio muestra «no descuenta»; copiar semana pasa el 4.º parámetro.""",
 'EX2 en la ronda 4')

# ------------------------------------------------------------------ R4
b1.impl('EX2', 'E2E: recetas, suscripciones, fase 2 apagada',
 '`e2e/recetas.spec.ts` (NUEVO), `e2e/suscripciones.spec.ts` (NUEVO), `e2e/helpers.ts`, y los `e2e/*.spec.ts` viejos SOLO si quedaron desactualizados por el cambio (selector, flujo de pago, días sin receta). NO toques la app.',
 R7 + E2E_OWN + """
- `recetas.spec.ts`: nutricionista (cuenta de `docs/entrega/CUENTAS-DE-PRUEBA.md`) agrega a un paciente recién registrado por la prueba (correo único) → crea receta con 2 días → entrega → el paciente ve los días en Agenda y la receta en Mis recetas.
- `suscripciones.spec.ts`: paciente pulsa «Contactar por correo para solicitar una suscripción» (intercepta la navegación `mailto:`) → admin la ve en `/admin/suscripciones` → aprueba → el paciente ve «Te quedan 10 de 10»; nutricionista pide Starter y admin la aprueba.
- Fase 2 apagada (`fijarFases` + candado de fases del helper): no se ve Mis recetas ni Mis pacientes; Admin → Suscripciones y Planes sí.
- Datos propios con correos únicos; restaura fases al terminar. Si un fallo es de la app, anótalo en «Pedidos al orquestador» con la evidencia (no lo tapes).""",
 """Tus specs verdes con tu preview en desktop y mobile (pega el resumen). Los specs viejos que tocaste, verdes.""",
 'la revisión')

# ------------------------------------------------------------------ revisiones
REV = """# {name} — REVISOR (opus) — {title}
**Reglas:** solo revisar: nunca edites código, nunca commit, nunca push, nunca la nube. Sigue `work/TOKEN-PROTOCOL.md` (regla 3). **Máximo 15 minutos: informe escrito en los primeros 5 y reescrito tras cada paso.**
**Hallazgos:** `work/out/{name}/report.md`
**Lee:** `{spec}` (manda), `{plan}`, los reportes `work/out/{{S12,DT1,S13,DT2,UA,UP,UN1,UN2,EX2,XV}}/report.md` que existan, `work/out/gate-*.txt` y `work/out/{e2e}.txt` (suite e2e completa ya medida sobre este main: no la repitas). `git log --oneline -25`.
**Alcance:** {scope}
**NO hagas** `db reset`/`start`/`stop` ni la suite e2e completa. SQL: `docker exec supabase_db_activa-gye psql -U postgres -c "begin; ...; rollback;"` (con `set local role authenticated; set local request.jwt.claims = '{{"sub":"<uid>","role":"authenticated"}}';` para actuar como un usuario). Navegador: TU preview en `$E2E_PORT` (`npm run -s build && (npx vite preview --port $E2E_PORT --strictPort --host 127.0.0.1 > /dev/null 2>&1 &)`), script Playwright propio en `work/out/{name}/`, capturas a 360 y 1280; mátalo por PID. Cuentas: `docs/entrega/CUENTAS-DE-PRUEBA.md`. No cambies `app_settings` (otro revisor trabaja a la vez); si necesitas fase 2, hazlo dentro de una transacción con rollback o anótalo como no revisado.
**Intenta romper:**
{falsify}
**Veredicto:** `## Verdict: **SHIP**` o `## Verdict: **DO NOT SHIP**` (inglés, exacto). DO NOT SHIP solo por: algo de «Lo que no debe pasar» del diseño; un límite que se puede saltar; un paciente ve un borrador o datos de otro; doble descuento o doble activación; botón sin acción; pantalla sin salida; crash; gate rojo; e2e rojo por la app; datos bancarios o formulario de pago visibles; algo de fase 2 visible con la fase apagada. Luego `BLOCKING` (archivo:línea + cómo reproducir + arreglo sugerido, con área `[sql]` `[datos]` `[admin]` `[nutri]` `[paciente]` `[e2e]`) / `non-blocking` / `no revisado`.
**Última línea:** `NEXT: el orquestador lee {name}.`
"""

def review(name, title, scope, falsify, e2e='E2E-RX'):
    (OUT / f'{name}.md').write_text(REV.format(name=name, title=title, scope=scope, falsify=falsify, spec=SPEC, plan=PLAN, e2e=e2e))

review('RV1', 'Base de datos, límites y seguridad',
 'migraciones 12 y 13, tests 09 y 10, capa `src/data/supabase/` y simulador contra el contrato.',
 """- Como paciente con JWT: leer `prescriptions` borrador o de otro, insertar/editar `plan_days`, llamar `deliver_prescription`, `nutri_add_patient`, `admin_*`.
- Como nutricionista: entregar a paciente que no es suyo; saltarse `LIMITE_DIARIO` por `copy_plan_week`, por `save_prescription` o fijando `activa.registro_automatico` con `set_config` (¡debe NO servir desde el cliente!); cupo gratis con dos `accept_care_request`/`nutri_add_patient` seguidos.
- Aprobar dos veces, mejorar de plan, renovar vigente: saldos y fechas correctos; las funciones redefinidas no perdieron nada del cuerpo anterior (compara con la migración previa de cada una).
- Grants: cada función nueva tiene `grant execute` explícito (como la migración 9).""")
review('RV2', 'Pantallas de admin, nutricionista y paciente',
 'todas las pantallas nuevas o cambiadas (Admin → Suscripciones, Planes y correo, portada, Mensajes; Nutri → Tablero, Mis pacientes, ficha del paciente con Recetas, Mi plan; Paciente → Suscripción, Agenda, Hoy, Mis recetas; pie y Contacto) a 360 y 1280 px con `work/ref/CHECKLIST-FRONT.md`.',
 """- Flujo completo en el navegador: nutricionista agrega paciente → receta → entrega → paciente la ve; paciente pide suscripción por correo → admin aprueba → saldo 10.
- Buscar «transferencia», «cuenta bancaria», «Reporté» en pantallas: no debe haber.
- Doble clic en Entregar/Aprobar; errores de límite visibles y claros; estados vacíos con salida.
- Fase 2 apagada: nada nuevo de paciente/nutri visible; Admin completo.""")

b1.impl('XV', 'Arreglos de la revisión',
 'Los archivos que nombren `work/out/RV1/report.md` y `work/out/RV2/report.md` (y, en la segunda vuelta, `work/out/RV3-v1/report.md`: arregla lo que siga o sea BLOCKING ahí) en sus BLOCKING, con sus tests. Si hace falta cambiar SQL, en una migración NUEVA `supabase/migrations/20261124000014_arreglos_recetas.sql` (nunca edites la 12 ni la 13) con su prueba en `supabase/tests/11_arreglos_recetas.sql`.',
 R7 + E2E_OWN + """
Lee los informes de revisión. Arregla CADA BLOCKING con el cambio mínimo y su prueba; luego los non-blocking baratos (≤ 10 min). En el reporte, tabla hallazgo → arreglado (archivo:línea) / no reproducido (evidencia).""",
 """- Cada BLOCKING con una prueba que falla antes y pasa después (pgTAP, Vitest o e2e según el área).
- `npx supabase test db` y `npx vitest run` verdes.""",
 'la re-revisión RV3', b1.SQL_RULES)

review('RV3', 'Re-revisión tras los arreglos',
 'cada BLOCKING de RV1 y RV2: ¿arreglado de verdad? (mide, no confíes en XV). Y que los arreglos no rompieron nada: pasada rápida por los flujos del diseño §5.',
 """- Reproduce cada BLOCKING anterior con su receta original.
- Revisa el diff de XV (`git log -p` de sus commits) por pruebas debilitadas.""", e2e='E2E-RX2')

IDS = ['S12', 'DT1', 'S13', 'DT2', 'UA', 'UP', 'UN1', 'UN2', 'EX2', 'RV1', 'RV2', 'XV', 'RV3']
print('ok recetas', [i for i in IDS if (OUT / f'{i}.md').exists()])

# Marca: la plataforma se llama VITGO desde 2026-11-24.
for _id in ['S12','DT1','S13','DT2','UA','UP','UN1','UN2','EX2','RV1','RV2','XV','RV3']:
    _p = OUT / f'{_id}.md'
    if _p.exists():
        _p.write_text(_p.read_text().replace('Activa GYE', 'VITGO')
            .replace('**Proyecto:** VITGO,', '**Proyecto:** VITGO (antes «Activa GYE»; todo texto visible dice VITGO),'))
