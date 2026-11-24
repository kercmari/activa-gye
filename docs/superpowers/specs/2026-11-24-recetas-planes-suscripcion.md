# Recetas, planes de nutricionista y suscripción por correo — diseño

Fecha: 24/11/2026. Pedido de la dueña. Se construye sobre lo que ya existe (migraciones 1–11); no se rehace nada.

## 1. Intención

La plataforma cobra a los dos lados, con precios bajos:

- **Paciente:** paga **$40 al mes**, que le dan **10 recetas**. Una receta es lo que la nutricionista le entrega: una dieta, una rutina o una recomendación. Las recetas **llenan su calendario**: al entregarse, sus días se abren para el paciente.
- **Nutricionista:** usa la herramienta **gratis con límites**. Si necesita más pacientes o más registros por día, paga **Starter** o **Profesional**.
- **Pago:** siempre por transferencia. En la página **solo** aparece «Contactar por correo para solicitar una suscripción». La administradora aprueba a mano en el panel.
- **Correo de la administradora:** se guarda en la base. Hoy es `kerlyeliz19@gmail.com` y luego se cambia a la persona que corresponda, sin tocar código.
- **Vistas:** la de administradora y la de nutricionista quedan completas, con sus permisos.

### Metas
1. La nutricionista agrega a sus pacientes y, para cada uno, quedan listos por defecto el calendario, el progreso y una primera semana en borrador.
2. La nutricionista escribe recetas con días, y al entregarlas esos días aparecen en el calendario del paciente.
3. Los límites se cumplen en la **base**, no solo en pantalla:
   - pacientes activos por plan;
   - registros por día por plan;
   - 10 recetas al mes por paciente suscrito.
4. Para pedir cualquier suscripción, el botón de correo abre el correo de la administradora con el pedido listo, y la solicitud queda registrada en el panel.
5. La administradora edita precios, límites y su correo desde **Admin**.

### Fuera de alcance
- Pasarela de pago y envío de correos desde la plataforma: el botón usa `mailto:`. Brevo sigue pendiente para la fase 3.
- Cambiar la semana gratis (días 1–7), la guía, lugares o registro.
- Rehacer pantallas que ya funcionan. Solo se agregan cosas o se ajustan textos y flujos.

### Lo que no debe pasar
- Que un paciente vea días de una receta no entregada, o de otro paciente.
- Que una receta se entregue sin descontar cuando corresponde, o que se descuente dos veces.
- Que se supere un límite de plan haciendo dos clics a la vez.
- Que la página muestre datos bancarios o un formulario de pago: solo el botón de correo.
- Que apagar la fase 2 borre datos.

## 2. Modelo

### 2.1 Planes (tabla `subscription_plans`, ya existe)

Columnas nuevas:
- `daily_record_limit int null`: registros por día; `null` es sin límite.
- `recipe_quota int null`: recetas por período, solo en planes de paciente.
- `features text[] not null default '{}'`: textos que se muestran en la tarjeta del plan.

Valores iniciales (la administradora los edita):

| Plan | audience | monthly_price | patient_quota | daily_record_limit | recipe_quota |
|---|---|---|---|---|---|
| Starter (antes «Básico») | nutricionista | 9.00 | 15 | 60 | — |
| Profesional (antes «Pro») | nutricionista | 19.00 | 50 | null | — |
| Seguimiento mensual | paciente | 40.00 | 1 | — | 10 |

**Plan gratis de la nutricionista:** no es una fila. Se guarda en `app_settings` (columnas nuevas):
- `free_patient_limit int not null default 3`;
- `free_daily_record_limit int not null default 10`.

Una nutricionista sin suscripción activa usa estos límites. Hoy `accept_care_request` exige suscripción (`SIN_SUSCRIPCION`); con este cambio, sin suscripción se aplica el cupo gratis.

**Correo de la administradora:** en `app_settings`, columna `admin_email text not null default 'kerlyeliz19@gmail.com'` con un check de formato de correo. Lo devuelve `get_public_settings()` porque el botón `mailto:` lo necesita en el navegador. Es el correo de contacto público de la plataforma.

### 2.2 Origen del paciente

Columna nueva en `care_requests`: `origin text not null default 'plataforma' check (origin in ('plataforma','propio'))`.

- **`plataforma`:** el paciente llegó pidiendo atención (flujo actual). Sus recetas descuentan de su saldo y exigen suscripción activa del paciente.
- **`propio`:** la nutricionista lo agregó. No descuenta recetas del paciente ni exige su suscripción.
- **Cupo de pacientes de la nutricionista:** cuentan **todos** sus pacientes con atención `aceptada`, de los dos orígenes, como hoy en `accept_care_request`.

### 2.3 Recetas (tabla nueva `prescriptions`)

```
id uuid pk
patient_id uuid → profiles (cascade)
nutritionist_id uuid → profiles, default auth.uid()
kind text check in ('dieta','rutina','recomendacion')
title text 2..120
body text <= 4000
status text default 'borrador' check in ('borrador','entregada')
counts_against_patient bool not null default false   -- se fija al entregar
delivered_at timestamptz
created_at, updated_at
```

- Columna nueva en `plan_days`: `prescription_id uuid null → prescriptions (on delete cascade)`.
- **Toda fila nueva de `plan_days` pertenece a una receta.** Un trigger rechaza las inserciones sin `prescription_id` y las filas viejas se quedan como están. Así se cierra el camino de llenar el calendario sin gastar una receta. `PlanEditor` y `copy_plan_week` escriben dentro de la receta borrador que se está editando.
- **Un día del calendario pertenece a una sola receta.** Se mantiene `unique (patient_id, day)`, y cada día trae comidas **y** ejercicio. Si un día ya es de otra receta, lanza `DIA_OCUPADO`; el editor solo ofrece días libres. Una receta de tipo `recomendacion` puede no tener días.
- **Días de una receta entregada:** la nutricionista ya no los edita ni los borra (las políticas `plan_days_update` y `plan_days_delete` exigen receta en `borrador`). Para corregir, entrega otra receta. El paciente sigue marcándolos cumplidos con `set_plan_day_done`.
- **Borrar una receta:** solo en `borrador`, y sus días se borran en cascada.
- **Lectura del paciente:** solo recetas `entregada` suyas. La nutricionista lee las de sus pacientes y la administradora todas.
- **Escritura:** la nutricionista del paciente crea y edita **solo borradores**. Una vez entregada, la receta queda fija. Se guarda con políticas o RPC, a elección del implementador; sin borrar entregadas.
- **Entrega:** RPC `deliver_prescription(p_id uuid)`, con la fila bloqueada `for update` para que no se descuente dos veces:
  1. Debe ser la nutricionista del paciente (`is_my_patient`), la receta debe estar en `borrador` y la fase 2 encendida.
  2. Si el origen del paciente es `plataforma`:
     - exige `patient_subscription_active(patient)`, si no lanza `SIN_SUSCRIPCION_PACIENTE`;
     - bloquea su suscripción activa `for update`;
     - si `recipes_left = 0`, lanza `SIN_RECETAS`; si no, resta 1 y marca `counts_against_patient = true`.
  3. Pasa la receta a `entregada` y fija `delivered_at = now()`.
  4. Notifica al paciente: «Tu nutricionista te envió una receta: <título>».
- **Saldo de recetas:** columna nueva `patient_subscriptions.recipes_left int not null default 0`. Al aprobar una factura de paciente, `mark_invoice_paid` suma `recipe_quota` del plan al saldo; si la suscripción ya había vencido, el saldo vuelve a empezar en `recipe_quota`. Así una renovación anticipada suma 10 sin perder las que quedaban, y no hay que calcular ventanas de fechas.
- **RPC `patient_recipe_balance(p_patient uuid default auth.uid())`:** devuelve `{left, quota, period_end}`. La pueden llamar el propio paciente, su nutricionista y la administradora.

### 2.4 Calendario: qué ve el paciente

Se reemplaza la política `plan_days_read`. El paciente ve un día suyo si:
- el día pertenece a una receta `entregada`, **sin importar** si su suscripción sigue activa (lo entregado no se quita); **o**
- el día no tiene receta y se cumple la regla actual (suscripción activa). Así los datos viejos siguen viéndose igual.

La nutricionista y la administradora, igual que hoy. `set_plan_day_done` usa la misma regla.

### 2.5 Límite de registros por día de la nutricionista

Un «registro» es una fila **creada** en `plan_days` o en `prescriptions` por esa nutricionista, contada en su día de Guayaquil (`gye_today()`). Editar no cuenta.

- Un trigger `before insert` en las dos tablas cuenta los de hoy y lanza `LIMITE_DIARIO` si se llegó al límite del plan vigente, o al gratis si no tiene suscripción.
- La administradora no tiene límite.
- `copy_plan_week` copia solo en días libres y dentro de una receta borrador. Cuenta cada día que **crea**; sobrescribir no cuenta. Si no caben todos, falla completa. Se reescribe sin `on conflict do update`.
- **Lo que crea el sistema no cuenta:** la «Semana 1» de `nutri_add_patient` se marca con una variable de sesión (`activa.registro_automatico`) que el trigger respeta.

### 2.6 Agregar paciente (nutricionista)

RPC `nutri_add_patient(p_email text)`:
1. Busca un perfil con ese correo y rol `usuario`. Si no existe, lanza `PACIENTE_NO_REGISTRADO`.
2. Si ya tiene una atención abierta o aceptada, lanza `PACIENTE_OCUPADO`.
3. Revisa el cupo de pacientes activos del plan, o del gratis. Si está lleno, lanza `CUPO_PLAN_LLENO`. Usa el mismo bloqueo que `accept_care_request`.
4. Crea la `care_request` con `status='aceptada'`, `origin='propio'` y `nutritionist_id=auth.uid()`.
5. Crea una receta **borrador** «Semana 1» con 7 `plan_days` desde el primer día libre a partir de mañana. Los toma de la plantilla que elegiría `assign_trial` según la ficha; si no hay ficha, los deja vacíos y con título «Día N».
6. Notifica al paciente.

En pantalla, si el paciente no está registrado: «Pídele que cree su cuenta en activa-gye…/registro y vuelve a agregarlo», con un botón para **copiar el enlace**.

El correo de otros usuarios no es visible hoy por RLS. La búsqueda por correo la hace solo la RPC `security definer`, que no devuelve datos del perfil salvo el resultado.

### 2.7 Suscripciones: pedir por correo y aprobar

**Cambios en la base para poder mejorar de plan y renovar antes de que venza:**
- Hoy `choose_plan` y `choose_patient_plan` rechazan si ya hay una suscripción activa (`YA_TIENES_SUSCRIPCION`). Ahora aceptan la solicitud con una activa vigente, siempre que no haya otra pendiente.
- Si ya hay una pendiente, se reemplaza, como hoy.
- El índice único `*_one_open` (una sola pendiente **o** activa) se cambia por dos: como mucho una `activa` y como mucho una `pendiente` por persona.
- **Al aprobar** (`mark_invoice_paid`):
  - mismo plan: **renovación**; suma 30 días al vencimiento actual (lo de hoy) y, si es de paciente, suma recetas;
  - plan distinto de nutricionista: **mejora** o cambio; la activa pasa a `cancelada` y la nueva queda `activa` por 30 días desde hoy.


Se reutiliza el flujo actual de factura, con otra cara.

1. El botón **«Contactar por correo para solicitar una suscripción»** hace dos cosas:
   - llama a la RPC actual: `choose_plan(plan)` para la nutricionista o `choose_patient_plan(plan)` para el paciente. Así queda registrada la suscripción `pendiente` con su factura;
   - abre `mailto:<admin_email>?subject=Solicitud de suscripción <plan>&body=<nombre, correo, plan, precio>`.

   Después de pulsar, la pantalla dice «Tu solicitud quedó registrada. Envía el correo y la administradora la aprobará al confirmar tu transferencia». Si la RPC falla, el correo se abre igual y se muestra el error.
2. **No se muestran** datos bancarios, el formulario «Reporté mi transferencia» ni montos por cobrar entre usuarios. Las funciones siguen en la base, solo sin interfaz.
3. **Admin → Suscripciones** reemplaza a «Pagos» en el menú; la ruta `/admin/pagos` redirige a la nueva:
   - lista las solicitudes pendientes de pacientes y de nutricionistas: quién, plan, precio, fecha y botón para escribirle (`mailto:`);
   - botones **Aprobar** (llama `mark_invoice_paid`, con lo que se activan 30 días) y **Rechazar** (`cancel_invoice`), con confirmación;
   - lista de suscripciones activas con su vencimiento.
4. Al aprobar la de un paciente, se mantiene la regla actual: si no tiene nutricionista, se crea su solicitud de atención con origen `plataforma`.

### 2.8 Escribir a la administradora

- **Pie de página y Contacto:** enlace «Escribir a la administración» (`mailto:<admin_email>`), además del formulario de contacto actual, que sigue llegando a **Admin → Mensajes**.
- **En Admin → Mensajes:** cada mensaje tiene «Responder por correo» (`mailto:` del remitente).

### 2.9 Admin → Planes y correo

Página nueva `/admin/planes`:
- tabla editable de los planes: nombre, precio, pacientes, registros por día, recetas, textos y activo;
- los límites del plan gratis;
- el correo de la administradora.

Todo se guarda con la RPC nueva `admin_set_plans_settings(...)`, o con la política de administradora que ya existe en `subscription_plans` más una RPC para los campos de `app_settings`. Valida precios ≥ 0 y límites > 0 (o vacío = sin límite).

## 3. Pantallas

### Nutricionista (`/nutri/*`, rol nutricionista o admin, fase 2)
- **Tablero:**
  - pacientes activos `x de N`, registros de hoy `x de N` y plan actual con «Mejorar plan»;
  - recetas entregadas esta semana;
  - solicitudes abiertas.
- **Mis pacientes** (nueva, `/nutri/pacientes`):
  - lista con origen (Plataforma / Propio), recetas restantes si es de plataforma y último registro;
  - botón **Agregar paciente** (§2.6).
- **Paciente** (`/nutri/pacientes/:id`, ya existe): se suman o ordenan las pestañas **Calendario**, **Recetas**, **Progreso**, **Seguimiento** y **Ficha**.
  - **Recetas:** lista de borradores y entregadas, con un editor de receta (tipo, título, texto y días con comidas y ejercicio que se agregan al calendario). El botón **Entregar** muestra «Usará 1 de 10 recetas del paciente (quedan 7)» o «Paciente propio: no descuenta», y pide confirmación.
  - Errores claros para `SIN_RECETAS`, `SIN_SUSCRIPCION_PACIENTE`, `LIMITE_DIARIO` y `CUPO_PLAN_LLENO`.
- **Mi plan** (`/nutri/suscripcion`, ya existe):
  - tarjetas Gratis / Starter / Profesional con límites y textos, y el plan actual marcado;
  - en cada plan pago, el botón de correo (§2.7); sin datos bancarios.
- **Solicitudes:** igual que hoy, más el aviso de cupo.

### Paciente
- **Mi plan → Suscripción:** tarjeta «Seguimiento mensual: $40 al mes, 10 recetas de tu nutricionista» y el botón de correo. Si está activa: «Te quedan 7 de 10 recetas · vence el …».
- **Mi plan → Agenda y Hoy:** muestran los días de las recetas entregadas **aunque el paciente no tenga semana gratis ni suscripción** (es el caso del paciente propio). Hoy `AgendaPage` solo los carga con la suscripción activa; eso cambia. Si además tiene una semana gratis en curso, se ven las dos cosas: la semana gratis y los días de la receta. `nutri_add_patient` no inicia la semana gratis. Hay una lista **Mis recetas** con el título, el tipo, la fecha y el texto completo; va en Agenda o en una pestaña nueva, a elección del implementador si cabe sin romper la barra inferior.

### Administradora
- **Portada de Admin:** tarjetas para **Suscripciones** (con un contador de pendientes), **Planes y correo**, Usuarios (con solicitudes de nutricionista), Fases, Lugares, Datos de lugares, Plantillas, Guía y Mensajes.
- **Suscripciones** (§2.7) y **Planes y correo** (§2.9) son nuevas.
- **Usuarios:** junto a cada nutricionista, su plan y sus pacientes `x/N`.

### Fases
Todo lo nuevo es de la **fase 2**, como hoy el calendario y las suscripciones. Con la fase 2 apagada no se ve nada nuevo, igual que ahora. «Planes y correo» y «Suscripciones» se ven en Admin siempre, para dejarlos listos antes de encender la fase.

## 4. Errores (códigos nuevos)

| Código | Texto en pantalla |
|---|---|
| `SIN_RECETAS` | «Este paciente ya usó sus 10 recetas del mes. Podrá recibir más cuando renueve su suscripción.» |
| `SIN_SUSCRIPCION_PACIENTE` | «Este paciente no tiene una suscripción activa.» |
| `LIMITE_DIARIO` | «Llegaste a tu límite de registros de hoy. Mejora tu plan para registrar más.» |
| `CUPO_PLAN_LLENO` (ya existe) | «Llegaste al máximo de pacientes de tu plan. Mejora tu plan para agregar más.» |
| `PACIENTE_NO_REGISTRADO` | «No hay una cuenta con ese correo. Pídele que se registre y vuelve a agregarlo.» |
| `PACIENTE_OCUPADO` | «Ese paciente ya está con una nutricionista.» |

## 5. Pruebas

**pgTAP** (archivo nuevo):
- cupos gratis y de plan, incluida la carrera de dos aceptaciones o agregados;
- límite diario, incluido `copy_plan_week`;
- entrega con descuento, con 10 → `SIN_RECETAS`, paciente propio sin descuento y entrega doble;
- lectura del paciente: borrador invisible, entregada visible aunque la suscripción venza, y días de otro paciente invisibles;
- `admin_email` en `get_public_settings` y editable solo por la administradora;
- `nutri_add_patient` con todos sus errores.

**Vitest:** cada pantalla nueva o cambiada, con sus estados de carga, vacío y error.

**E2E:**
1. Una nutricionista agrega a un paciente, arma y entrega una receta, y el paciente ve los días.
2. La solicitud de suscripción por correo aparece en Admin → Suscripciones; la administradora la aprueba y el contador cambia.
3. Con la fase 2 apagada no se ve nada nuevo.

**Nube:** la migración nueva repite los `grant` explícitos, igual que la migración 9.

## 6. Decisiones tomadas por Claude (la dueña puede cambiarlas)
- Los pacientes **propios** no gastan recetas de los $40, porque la nutricionista ya les cobra por su cuenta.
- Las recetas se cuentan por período de 30 días de la suscripción, no por mes calendario.
- Plan gratis: 3 pacientes y 10 registros por día. Starter: $9, 15 pacientes y 60 por día. Profesional: $19, 50 pacientes, sin límite diario.
- Para agregar un paciente, este debe tener cuenta propia, porque la nutricionista no crea cuentas ajenas.
- El cupo de pacientes de la nutricionista cuenta a los dos orígenes.
- Un día pertenece a una sola receta, y cada día trae comidas y ejercicio. Los días de una receta entregada no se editan.
- Todo día nuevo del calendario va dentro de una receta, para que no se pueda llenar el calendario sin gastar recetas.
- Las recetas se llevan como saldo: aprobar una suscripción suma 10 y entregar una receta resta 1.
- Se puede pedir una mejora de plan o renovar con una suscripción activa.
- Lo que crea el sistema al agregar un paciente no cuenta para el límite diario.
- Las suscripciones activas actuales toman los precios y límites nuevos.
- Los planes se diferencian solo por límites. Los textos de cada plan se editan en Admin; no hay funciones bloqueadas por plan más allá de los límites.
