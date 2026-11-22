# Pendientes y próximos pasos

Lo que sigue, en orden de importancia. Lo que ya está hecho no aparece aquí.

## Para publicar

1. **Conectar la base real en la nube.** Seguir [`PUESTA-EN-MARCHA.md`](PUESTA-EN-MARCHA.md): crear el proyecto en Supabase (São Paulo), `db push`, cargar los lugares sin las cuentas de prueba, crear la cuenta de administradora, poner las claves y publicar. Lo hace la dueña, porque requiere su cuenta.
2. **Confirmar los precios de los planes** (Básico $10/mes, 10 pacientes; Pro $25/mes, 40 pacientes). Son valores iniciales editables en Admin → Pagos.

## Funciones que faltan

3. **Correos de aviso y recuperación de contraseña (fase 3).** La función `enviar-correo` con Brevo todavía no existe (no hay `supabase/functions/`). Sin ella no sale ningún correo; los avisos sí quedan en la campana. La recuperación de contraseña por correo real necesita el SMTP gratis de Brevo configurado en Supabase.
4. **Horarios con varias franjas por día.** El formulario de Admin → Datos de lugares solo muestra y guarda la primera franja de cada día. Si un lugar tiene dos franjas (por ejemplo, mañana y tarde), guardarlo desde ese formulario pierde la segunda.
5. **Subir foto de un lugar.** Hoy solo se puede poner un enlace a la foto.
6. **Pruebas de punta a punta de las fases** (Playwright contra la base local): registro con cupo, solicitud → aceptación → calendario → factura pagada, y reseña y reporte de fase 3. No están escritas.

## Errores conocidos

7. **Ingresar no respeta `?volver=`.** `RequireGuest` (`src/auth/guards.tsx`) manda a `/perfil` en cuanto hay sesión, así que tras ingresar desde «Nueva solicitud» o desde una ficha de lugar se ignora la página de origen. El registro también pierde `?bienvenida=1`. Hay que resolverlo en `guards.tsx` (que lea `?volver=` con `safeInternalPath`).
8. **Prueba roja.** `src/pages/panel/MiPanelPage.test.tsx` tiene 2 pruebas que fallan: el mock del repositorio no incluye `listProgress`, `listPlanDays` ni `listMyInvoices`, y una prueba espera el texto «En construcción» que ya se quitó. Es un arreglo de pocas líneas en el propio archivo de prueba.

## Revisar antes de la entrega

9. **Pantallas nuevas a 360 px y a 1280 px.** Se revisó el código, pero no hay capturas de las pantallas nuevas (panel del paciente, tablero y solicitudes del nutricionista, Admin → Fases, Admin → Pagos).
10. **Verificar precios y horarios de 12 lugares.** Los datos vienen de OpenStreetMap; hay que confirmarlos con cada lugar.
11. **Pruebas con usuarios reales.** Preguntas para la guía:
    - ¿Sabe dónde hacer clic para encontrar un lugar?
    - ¿Sabe cómo llegar al lugar?
    - ¿Sabe regresar a la página anterior sin perderse?
    - ¿Entiende que la guía básica no reemplaza una consulta con el nutricionista?
    - ¿Logra crear su cuenta, llenar su ficha y ver su progreso?

## Otros

12. **Logo en alta calidad.** El logo actual se usa en pantalla pero necesita versión para impresión.
13. **Código del Figma Make.** Cuando llegue el código exportado, comparar la portada con el diseño y ajustar.
14. **Dominio propio.** Hoy el sitio está en la dirección de prueba; falta registrar el dominio.
