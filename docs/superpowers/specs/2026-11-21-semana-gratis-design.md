# Diseño — Semana gratis estilo Base Vital (Activa GYE)

Fecha: 21/11/2026. Aprobado por la dueña en el chat («si… a partir de la semana ya debe costar»).

## 1. Intención

Activa GYE es una plataforma de **seguimiento nutricional** que funciona como intermediaria, al estilo Uber. Al registrarse y llenar su ficha, la persona recibe **gratis un cronograma de 7 días** de comidas y rutinas. El cronograma no lo arma una IA: sale de **plantillas que define una nutricionista**, guardadas en la base y elegidas por peso (IMC), edad, género y objetivo.

Los días **se desbloquean uno a uno con el progreso diario**. Desde el día 8 hay que **suscribirse**; entonces una nutricionista toma el caso y sigue armando la agenda.

La interfaz copia el concepto de **Base Vital** (proyecto de la hackatón, `/home/kerly/Desktop/proyects/hack-nasa`):
- secciones **Hoy · Progreso · Agenda · Guía**, con barra inferior en el celular;
- **Agenda** con el mes a la izquierda y las actividades del día con su hora a la derecha;
- **Guía** con categorías, buscador y tarjetas «✅ Sí / ⛔ Evita» (en lugar de GO / NO-GO).

## 2. Metas, no-metas y anti-metas

- **Metas**
  - Gancho gratis inmediato: el plan sale al guardar la ficha, sin esperar a nadie.
  - Desbloqueo diario que la base hace cumplir.
  - Cobro desde el día 8.
  - Plantillas editables por admin y nutricionista.
  - Guía pública.
- **No-metas**
  - IA o voz: Vita queda fuera.
  - El modelo 3D de Base Vital.
  - Pasarela de pago: el pago sigue siendo manual por transferencia, como ya está hecho.
  - Escalar porciones automáticamente dentro del texto.
- **Anti-metas (fracaso aunque «funcione»)**
  - Un paciente ve los días cerrados manipulando la página.
  - Una persona con diabetes, hipertensión, embarazo o enfermedad renal recibe un plan automático.
  - Se muestra un plan de borrador como si lo hubiera firmado una nutricionista.

## 3. Reglas

### 3.1 Elección de plantilla (`assign_trial`)

La base calcula:
- edad, desde `profiles.birth_date`;
- género, desde `profiles.sex`;
- IMC = peso / estatura², desde `patient_intakes`;
- objetivo, desde `patient_intakes.goal`.

**Candidatas:** plantillas donde el género sea «cualquiera» o igual al de la persona, la edad esté en `[age_min, age_max]`, el IMC esté en `[bmi_min, bmi_max)` y el objetivo sea nulo o igual al de la persona.

**Orden de preferencia:**
1. aprobada antes que borrador;
2. con objetivo antes que sin objetivo;
3. con género antes que «cualquiera»;
4. rango de IMC más estrecho;
5. nombre.

Si no hay candidata, se usa la plantilla `is_fallback` (siempre existe una). Si tampoco existe, `SIN_PLANTILLA`.

**Personas que no reciben plan automático:** si `conditions` no está vacío, la base responde `REQUIERE_NUTRICIONISTA` y la pantalla la invita a pedir atención directa.

**Calorías (Mifflin-St Jeor):**
- base: masculino 10p + 6,25e − 5a + 5; femenino 10p + 6,25e − 5a − 161; otro o sin dato, el promedio (−78);
- multiplicador por actividad: sedentario 1,2 · ligero 1,375 · moderado 1,55 · intenso 1,725 · sin dato 1,375;
- ajuste por objetivo: bajar_peso −400 · ganar_musculo +300;
- se limita a 1200–4000 y se redondea a 50.

`portion_factor = round(kcal_target / kcal_base, 2)`, limitado a 0,6–1,6. La pantalla lo muestra como «Porciones ×1,2».

**Si la plantilla es borrador**, la pantalla muestra: «Plan de muestra pendiente de revisión por una nutricionista».

### 3.2 Desbloqueo diario

- `assign_trial` copia los 7 días de la plantilla al paciente (`trial_items`) y abre el **día 1** con `unlocked_on = hoy en Guayaquil`.
- Un día se **completa** cuando cumple las dos condiciones:
  1. hay un **chequeo diario** (`daily_checkins`) con fecha ≥ `unlocked_on` de ese día;
  2. está marcada **al menos la mitad** (redondeo hacia arriba) de sus ítems.
- Al completarse, el día siguiente queda con `unlocked_on = hoy + 1`: **se abre mañana**.
- Un día cerrado (`unlocked_on` nulo o en el futuro) no expone sus ítems. RLS y RPC solo devuelven título, cantidad e índice.
- Al completar el día 7 llega el aviso «¡Semana completada!» y se muestra la invitación a suscribirse.

«Hoy» es siempre `(now() at time zone 'America/Guayaquil')::date`, mediante la función `gye_today()`.

### 3.3 Después de la semana: suscripción del paciente

- Hay planes para pacientes (`subscription_plans.audience = 'paciente'`). La semilla trae «Seguimiento mensual» a $15.
- `choose_patient_plan` crea una suscripción pendiente y una factura `suscripcion_paciente` cobrada por la plataforma.
- El paciente reporta la transferencia y el admin la marca pagada. Al pagarse, la suscripción queda activa 30 días y, si el paciente no tiene una solicitud abierta o aceptada, se crea una solicitud de atención para que una nutricionista la tome (flujo que ya existe).
- La agenda pagada usa `plan_days`, que ya existe. El paciente **solo la ve con suscripción activa** (política RLS).

### 3.4 Fases

- **Ficha, semana gratis, chequeo, progreso y guía:** fase 1.
- **Suscripción, nutricionista y agenda pagada:** fase 2.
- La **guía** es pública y no depende de ninguna fase.

## 4. Pantallas

| Ruta | Quién | Qué |
|---|---|---|
| `/mi-plan` | paciente | Redirige a `/mi-plan/hoy`. |
| `/mi-plan/hoy` | paciente | Saludo y «Día N de 7»; ítems de hoy con hora para marcar; barra de progreso; chequeo «¿Cómo te sientes? 1–5», peso y vasos de agua; mensaje de qué falta para abrir el día siguiente. Sin plan: botón «Generar mi semana gratis» o aviso de ficha o `REQUIERE_NUTRICIONISTA`. |
| `/mi-plan/agenda` | paciente | Como Base Vital: mes a la izquierda (puntos en días con actividades, 🔒 en los cerrados) y actividades del día con su hora a la derecha, más «Volver a hoy». Días 8+ sin suscripción: tarjeta con candado y «Suscríbete». Con suscripción: también muestra `plan_days`. |
| `/mi-plan/progreso` | paciente | Gráficos de ánimo, peso y agua (recharts no está instalado: SVG propio o el `WeightChart` existente), % cumplido por día e historial de chequeos. |
| `/mi-plan/suscripcion` | paciente | Planes para pacientes, «Suscribirme», factura y reporte de transferencia (reusa lo de pagos). |
| `/guia` | público | Chips de categoría, buscador y tarjetas con objetivo, «✅ Sí», «⛔ Evita» y pasos. |
| `/admin/plantillas` y `/admin/plantillas/:id` | nutricionista y admin | Lista y editor de plantillas: criterios, kcal base, autora, estado borrador/aprobada; ítems por día 1–7 con hora, tipo, título y detalle. |
| `/admin/guia` | nutricionista y admin | Editor de la guía. |
| `/nutri/pacientes/:id` | nutricionista | Bloque nuevo «Semana gratis y chequeos». |

- **Navegación:** las 4 secciones del paciente comparten `PlanShell`, con barra inferior fija en el celular y pestañas arriba en la computadora.
- **Ficha:** suma «Alergias o comidas que no come» y «Condiciones de salud» (casillas). Al guardar, ofrece «Ver mi semana gratis».

## 5. Enfoques considerados

- **A. Plantillas por perfil (elegido).** Fijas en la base, una nutricionista las revisa y la elección es predecible.
- **B. Combinar platos de un recetario.** Da resultados raros y no se puede revisar cada combinación.
- **C. Esperar a que un nutricionista arme el plan.** Contradice lo de «gratis al entrar».

## 6. Decisiones mías (la dueña puede corregirlas)

- Precio de $15 al mes para el paciente, editable en Admin → Pagos.
- Mitad de los ítems más el chequeo para completar un día; se abre al día siguiente.
- Las plantillas de la semilla quedan como **borrador**, firmadas «Pendiente de revisión», hasta que una nutricionista real las apruebe.
- Se dejó fuera «comidas por día» para no complicar la primera versión.
- Las porciones se muestran con un factor y no se reescriben.

## 7. Contrato

- Base de datos: `docs/superpowers/plans/2026-11-21-db-contrato-semana.md`.
- Tipos y repositorio: `src/data/types.ts`, sección «SEMANA GRATIS».
