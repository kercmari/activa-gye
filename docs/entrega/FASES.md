# Fases de Activa GYE

Activa GYE se entrega en tres fases. Cada fase se enciende desde la base (tabla `app_settings`, una sola fila) y se cambia desde **Admin → Fases** (casillas y cupo). La base hace cumplir las fases: aunque alguien se salte la pantalla, si una fase está apagada la base rechaza la acción.

## Qué incluye cada fase

| Fase | Qué se entrega | Quién lo usa |
|---|---|---|
| **1. Ingreso y ficha** | Registro e ingreso reales (Supabase). Panel del paciente con su **ficha inicial**: nombre, fecha de nacimiento (muestra la edad), género, peso, estatura y una **foto de cuerpo entero** (estado inicial, con consentimiento). Pestañas «Calendario y progreso» y «Pagos» visibles pero bloqueadas con «Próximamente». **Cupo de pacientes** (límite configurable). Lugares deportivos guardados en la base. | Paciente, admin |
| **2. Nutricionista** | El paciente **solicita nutricionista**; los nutricionistas ven la bolsa de solicitudes y el primero que la **acepta** la atiende (como Uber). Panel del nutricionista: **tablero**, **notificaciones**, **ficha de seguimiento** de cada paciente, **calendario** del plan (el paciente marca cada día como cumplido = su progreso). **Suscripción** del nutricionista a la plataforma y **facturas** del paciente, con **pago manual** por transferencia (el admin o el nutricionista marca «pagada»). | Paciente, nutricionista, admin |
| **3. Para todos** | **Registro abierto** (sin cupo). **Completar datos de los lugares** (precios, horarios, servicios) con la pantalla «Datos de lugares» del admin. **Calificaciones y reseñas** (estrellas + comentario) de nutricionistas y lugares. **Reporte de progreso en PDF** (descargable desde el navegador) y **correos** de aviso (Brevo). | Todos |

## Cómo se activa

1. Entrar como administrador (`admin@activagye.test` en la base local; ver `CUENTAS-DE-PRUEBA.md`).
2. Abrir **Admin → Fases**.
3. Marcar o desmarcar **Fase 1**, **Fase 2** o **Fase 3**, o cambiar el **cupo de pacientes** (mientras la fase 3 está apagada).
4. Pulsar **Guardar cambios**. Aparece «Cambios guardados».

Las páginas leen las fases al abrir (`get_public_settings()`). Lo que está apagado muestra «Próximamente».

Orden recomendado: fase 1 → fase 2 → fase 3. Cada fase solo añade; no quita lo anterior.

## Pantalla de Admin → Fases

![Admin → Fases](capturas/admin-fases.png)

## Pruebas automáticas por fase

| Archivo | Qué prueba |
|---|---|
| `e2e/fase1.spec.ts` | Registro → Mi ficha con foto → recargar la conserva; Calendario y Pagos «Próximamente»; cupo lleno impide registrar y el admin lo restaura |
| `e2e/fase2.spec.ts` | Solicitud → aceptar (con suscripción) → calendario → cumplido → factura → pagada |
| `e2e/fase3.spec.ts` | Reseñas de lugar y nutricionista → promedio → reporte PDF → Datos de lugares |

Las pruebas dejan la fase que usan encendida o apagada como la encontraron, según el caso (fase 1 encendida y 2 y 3 apagadas al final de cada archivo).
