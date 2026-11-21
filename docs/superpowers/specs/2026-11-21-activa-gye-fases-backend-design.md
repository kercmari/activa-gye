# Diseño — Activa GYE: backend real y las 3 fases de cobro

Fecha: 21/11/2026 · Reemplaza las secciones de IA y de nutrición del diseño anterior (`2026-11-21-activa-gye-design.md`). Todo lo del catálogo de lugares sigue igual.

## 1. Qué es ahora Activa GYE (en palabras sencillas)

Una **plataforma intermediaria, como Uber**: el **paciente** pide atención, un **nutricionista** la acepta y lo atiende. La plataforma no da consejos sola (**no hay IA ni asistente**). Además mantiene el buscador de lugares deportivos de Guayaquil que ya está publicado.

La dueña cobra el trabajo **en 3 fases**. Las 3 se construyen hoy, pero cada una se **enciende con un check en la base de datos**. Lo que no está encendido se ve como «Próximamente» y la base tampoco lo permite.

## 2. Las 3 fases

| Fase | Qué se entrega | Quién lo usa |
|---|---|---|
| **1. Ingreso y ficha** | Registro e ingreso reales (Supabase). Panel del paciente con su **ficha inicial**: nombre, fecha de nacimiento (muestra la edad), género, peso, estatura y una **foto de cuerpo entero** (estado inicial). Pestañas «Calendario y progreso» y «Pagos» visibles pero bloqueadas. **Cupo de pacientes** (5 por defecto, se cambia en la base). Lugares deportivos guardados en la base. | Paciente, admin |
| **2. Nutricionista** | El paciente **solicita nutricionista**; los nutricionistas ven la bolsa de solicitudes y el primero que la **acepta** la atiende (como Uber). Panel del nutricionista: **tablero**, **notificaciones**, **ficha de seguimiento** de cada paciente, **calendario** del plan (el paciente marca cada día como cumplido = su progreso). **Suscripción** del nutricionista a la plataforma y **facturas** del paciente, con **pago manual** (transferencia; el admin o el nutricionista marca «pagado»). | Paciente, nutricionista, admin |
| **3. Para todos** | **Registro abierto** (sin cupo). **Completar datos de los lugares** (precios, horarios, servicios) con una pantalla de admin «Datos faltantes». **Calificaciones y reseñas** (estrellas + comentario) de nutricionistas y lugares. **Reporte de progreso en PDF** (descargable) y **correos** de aviso (Brevo, gratis 300/día). | Todos |

### El check de fases
- Tabla `app_settings` (una sola fila): `phase1`, `phase2`, `phase3` (sí/no) y `patient_limit` (número).
- Se marca desde **Admin → Fases** (casillas) o desde el editor de tablas de Supabase.
- **La base lo hace cumplir** (no solo la pantalla): por ejemplo, si `phase2` está apagada, nadie puede crear solicitudes ni días de calendario aunque intente saltarse la pantalla.
- La página lee las fases al abrir (`get_public_settings()`), y muestra «Próximamente» en lo apagado.

## 3. Objetivos, no-objetivos y anti-objetivos

- **Objetivos:** datos guardados de verdad (cuenta, ficha, foto, calendario); las 3 fases separadas y activables; todo gratis; mismo diseño visual actual.
- **No-objetivos:** cobrar con tarjeta; app móvil nativa; chat en vivo; IA.
- **Anti-objetivos (sería un fracaso aunque funcione):** que un paciente vea datos o fotos de otro; que una fase apagada se pueda usar «por detrás»; precios u horarios inventados mostrados como reales; que se rompa lo ya entregado (buscador, ficha de lugar, Cómo llegar).

## 4. Restricciones

- **Gratis:** Supabase plan gratis (500 MB de base, 1 GB de fotos, se **pausa tras 7 días sin uso**: se reactiva con un clic), Cloudflare Workers gratis, Brevo gratis.
- Haiku implementa, Opus solo revisa. Cada fase de trabajo ≤ 20 min; tareas en paralelo.
- Los commits salen solo como **kercmari**, sin coautor.

## 5. Enfoques considerados

| Enfoque | Ventaja | Problema |
|---|---|---|
| **A. Supabase real + check de fases en la base (elegido)** | Datos reales, seguridad en la base (RLS), gratis, ya había esquema probado. | Hay que crear el proyecto en la nube para publicar. |
| B. Seguir con el simulador en el navegador | Cero configuración. | No guarda de verdad: no sirve para nutricionista ni pagos. |
| C. Backend propio (Node) en Cloudflare + D1 | Todo en Cloudflare. | Hay que programar login, fotos y permisos desde cero: más tiempo y más riesgo. |

## 6. Cómo funciona por dentro

```
Navegador (React)  ──supabase-js──►  Supabase (gratis)
  src/data/supabase/*                   ├─ Auth (correo + contraseña)
  (cumple el contrato Repo)             ├─ PostgreSQL + RLS (quién ve qué)
                                        ├─ Storage: body-photos (privado), place-photos (público)
                                        └─ Edge Function enviar-correo (fase 3, Brevo)
Cloudflare Workers: solo sirve la página (dist/)
```

- `src/data/index.ts` usa Supabase si existen `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`; si no, el simulador (solo para pruebas). Las funciones nuevas del simulador responden «Necesita la base de datos».
- La clave `anon` es pública (va en la página); la seguridad la da RLS.

## 7. Tablas nuevas (migración 2) — en palabras sencillas

| Tabla | Qué guarda | Quién la ve |
|---|---|---|
| `app_settings` | fases encendidas y cupo de pacientes | todos leen (por función); solo admin cambia |
| `patient_intakes` | ficha inicial: peso, estatura, objetivo, foto, consentimiento | el paciente; su nutricionista; admin |
| `care_requests` | solicitud de atención: `abierta → aceptada → finalizada` (o `cancelada`) | el paciente; nutricionistas con suscripción activa ven las abiertas; el asignado ve la suya |
| `followups` | ficha de seguimiento por consulta: fecha, peso, cintura, observaciones, recomendaciones | el paciente y su nutricionista |
| `plan_days` | día del calendario: fecha, comidas, ejercicio, nota; `done_at` cuando el paciente lo cumple | el paciente (solo marca cumplido + nota) y su nutricionista (crea/edita) |
| `notifications` | avisos: título, texto, enlace, leído | solo su dueño |
| `subscription_plans` | planes del nutricionista (nombre, precio mensual, cupo de pacientes) | todos leen; admin edita |
| `subscriptions` | suscripción del nutricionista: plan, estado (`pendiente/activa/vencida`), vence | el nutricionista y admin |
| `invoices` | facturas: quién paga, a quién, concepto, monto, estado (`pendiente/reportada/pagada/anulada`), referencia de transferencia | quien paga, quien cobra, admin |
| `reviews` | calificación 1–5 + comentario de un nutricionista o un lugar | todos leen; el autor escribe (al nutricionista solo si lo atendió) |

Se **retira** `nutrition_requests` (era del flujo con IA). El cálculo básico de calorías (`src/lib/nutrition/guide.ts`) se queda como dato orientativo en la ficha, marcado como «estimación, no reemplaza al nutricionista».

### Reglas que hace cumplir la base
1. **Cupo (fase 1–2):** al registrarse, si `phase3` está apagada y ya hay `patient_limit` pacientes → error `CUPO_LLENO`.
2. **Fase 2 apagada:** no se pueden crear `care_requests`, `plan_days`, `followups`, `subscriptions`, `invoices` → error `FASE_NO_ACTIVA`.
3. **Fase 3 apagada:** no se pueden crear `reviews` → `FASE_NO_ACTIVA`.
4. **Aceptar solicitud** (`accept_care_request`): solo nutricionista (o admin) con **suscripción activa** (admin exento) y bajo el cupo de su plan; el primero gana (`YA_TOMADA`).
5. Un paciente solo tiene **una solicitud abierta o aceptada** a la vez.
6. **Avisos automáticos** (triggers): nueva solicitud → a todos los nutricionistas activos; aceptada → al paciente; día de plan nuevo → al paciente; día cumplido → al nutricionista; factura nueva / pagada → a quien paga.
7. Pagar: quien paga solo puede **reportar** (poner referencia → `reportada`); solo quien cobra o admin marca **pagada**. Al pagarse una factura de suscripción, la suscripción queda **activa 30 días**.

## 8. Pantallas

| Ruta | Pantalla | Fase |
|---|---|---|
| `/registro`, `/ingresar`, `/recuperar` | ya existen; ahora reales. Registro muestra «Cupo lleno» si aplica | 1 |
| `/mi-panel` | **Panel del paciente** con pestañas: **Mi ficha** (formulario + foto), **Calendario y progreso**, **Pagos**, **Mi nutricionista** | 1 (ficha) / 2 (resto) |
| `/mi-panel/reporte` | reporte imprimible → «Descargar PDF» (imprimir del navegador) | 3 |
| `/nutri` | **Tablero del nutricionista**: solicitudes abiertas, mis pacientes, % días cumplidos de la semana, facturas pendientes, estado de suscripción | 2 |
| `/nutri/solicitudes` | bolsa de solicitudes abiertas → «Aceptar» | 2 |
| `/nutri/pacientes/:id` | ficha del paciente: datos + foto, **seguimientos** (agregar), **calendario** (crear/editar días, copiar semana) | 2 |
| `/nutri/suscripcion` | elegir plan, ver factura, reportar transferencia | 2 |
| `/notificaciones` + campana en el encabezado | lista de avisos, marcar leídos (consulta cada 60 s) | 2 |
| `/admin/fases` | **casillas de las 3 fases + cupo** | 1 |
| `/admin/pagos` | facturas y suscripciones: marcar pagada / anular; editar planes | 2 |
| `/admin/datos-lugares` | lugares sin precio u horario, edición rápida | 3 |
| Reseñas en `/lugares/:id` y en la tarjeta del nutricionista | estrellas + comentarios | 3 |

Lo de `/perfil` (datos, favoritos) se mantiene; «Plan» y «Progreso» de `/perfil` pasan a `/mi-panel`. Se retiran `/nutricion/nueva`, `/nutricion/:id` y `/admin/nutricion*`. `/nutricion` queda como página informativa «Cómo funciona» con el botón «Llenar mi ficha».

**Roles:** `usuario` (paciente), `nutricionista`, `admin`. El admin puede atender como nutricionista sin suscripción. El admin convierte a alguien en nutricionista desde Admin → Usuarios (ya existe).

## 9. Lo que decidió la dueña (21/11)
- Fase 3 = registro abierto + datos de lugares + **reseñas** + **reporte PDF y correos**.
- Pagos = **registro manual** (sin pasarela).
- Cupo de fase 1–2 = **pocos pacientes, configurable (5)**.
- Sin IA: plataforma intermediaria tipo Uber.

## 10. Decisiones mías (la dueña puede cambiarlas)
1. Precios de los planes de suscripción: se crean **«Básico» $10/mes, 10 pacientes** y **«Pro» $25/mes, 40 pacientes** como valores iniciales **editables** en Admin → Pagos. Los cambia la dueña.
2. La factura del paciente la crea el nutricionista (concepto + monto) al atenderlo; no hay tarifa fija.
3. PDF con «Imprimir → Guardar como PDF» del navegador (cero librerías nuevas).
4. Correos: Edge Function `enviar-correo` con Brevo. Si no hay clave de Brevo, no se envía nada y la notificación igual queda en la campana.
5. Recuperar contraseña: real solo cuando se configure el SMTP gratis de Brevo en Supabase (fase 3).
6. Edad = calculada desde la fecha de nacimiento del registro (no se pide dos veces).
7. Foto de cuerpo entero: solo mayores de 18 y con consentimiento (ya estaba así), bucket privado.

## 11. Lo que necesito de la dueña para publicar
1. Crear proyecto gratis en **supabase.com** (región São Paulo) y correr en esta compu `npx supabase login` (abre el navegador). Con eso subo el esquema.
2. Copiar **Project URL** y **anon key** (Settings → API) a `.env.local` (no se sube a GitHub).
3. (Fase 3) Cuenta gratis en **brevo.com** y su clave SMTP/API, puesta por ella en los secretos de Supabase.
