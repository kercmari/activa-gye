# Cuentas de prueba

Estas cuentas son **solo para la base de datos local** (la que corre en tu computadora con `npx supabase start`). Se crean al ejecutar `npx supabase db reset`, junto con los lugares.

**No existen en la nube.** La base publicada solo tiene los lugares (ver [`PUESTA-EN-MARCHA.md`](PUESTA-EN-MARCHA.md), paso 4). Las contraseñas de abajo son conocidas por cualquiera que lea este archivo, así que no sirven para nada real y no deben usarse en la página publicada.

| Rol | Correo | Contraseña | Qué se ve |
|---|---|---|---|
| Admin | `admin@activagye.test` | `ActivaAdmin2026!` | Nombre «Administración Activa GYE». Panel de administración, cambio de roles de otras cuentas (no puede cambiar el suyo) y Admin → Fases. |
| Nutricionista | `nutri@activagye.test` | `ActivaNutri2026!` | Nombre «Nutricionista de prueba». Tablero, bolsa de solicitudes y pacientes. |
| Paciente | `usuario@activagye.test` | `ActivaUser2026!` | Nombre «Usuario de prueba». Fecha de nacimiento 10/05/2000 y progreso de peso de las últimas semanas. |
| Paciente (semana gratis) | `semana@activagye.test` | `ActivaSemana2026!` | Nombre «Paciente semana demo». Semana gratis completada (días 1–7 con chequeo) y muro de suscripción para el día 8. |

Notas para probar:

- Para ver el panel del paciente (ficha, calendario, pagos), entra con la cuenta de paciente.
- Para ver el panel del nutricionista, entra con la cuenta de nutricionista.
- Un registro nuevo siempre crea una cuenta con rol paciente.
- Al empezar, solo la fase 1 está encendida. Enciende la 2 o la 3 desde Admin → Fases para probarlas.
