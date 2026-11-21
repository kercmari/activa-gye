# Pendientes y próximos pasos

Estas cosas quedan para la siguiente fase.

1. **Conectar Supabase.** Las tablas ya están escritas en `supabase/migrations/`. Hoy todo se guarda en el navegador; al conectar Supabase, las cuentas y los datos se guardan en el servidor.
2. **IA real de Groq con Edge Function.** Hoy la guía es básica (IMC, kcal y recomendaciones fijas). La IA se conecta con una función del servidor para no exponer la clave.
3. **Correo real de recuperación de contraseña.** El correo de Supabase del plan gratuito es limitado. Hay que configurar un servicio SMTP gratuito.
4. **Verificar precios y horarios de 12 lugares.** Los datos vienen de OpenStreetMap; hay que confirmarlos con cada lugar.
5. **Logo en alta calidad.** El logo actual se usa en pantalla pero necesita versión para impresión.
6. **Código del Figma Make.** Cuando llegue el código exportado, comparar la portada con el diseño y ajustar.
7. **Dominio propio.** Hoy el sitio está en la dirección de prueba; falta registrar el dominio.
8. **Pruebas con usuarios reales.** Preguntas para la guía:
   - ¿Sabe dónde hacer clic para encontrar un lugar?
   - ¿Sabe cómo llegar al lugar?
   - ¿Sabe regresar a la página anterior sin perderse?
   - ¿Entiende qué es la guía básica y que no reemplaza una consulta?
   - ¿Logra crear su cuenta y ver su progreso?
