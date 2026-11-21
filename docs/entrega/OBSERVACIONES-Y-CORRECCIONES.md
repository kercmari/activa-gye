# Observaciones del docente y correcciones

Cada fila dice qué observó el docente, qué se cambió y cómo se comprobó.

| Observación del docente | Corrección realizada | Evidencia / resultado |
|---|---|---|
| "No hay una guía de cómo llegar al sitio." | La ficha de cada lugar tiene el botón **Cómo llegar**, que abre Google Maps en otra pestaña, y un **mapa** con la ubicación. | Prueba `e2e/lugar.spec.ts`: "Cómo llegar abre Google Maps en otra pestaña" y "la ficha dibuja el mapa". Captura: `docs/entrega/capturas/ficha.png` |
| "¿Cómo guardo los datos de mi plan y progreso? Un lugar donde tenga mi cuenta." | Se puede **crear una cuenta** (registro), y dentro de **Mi perfil** están los datos, **Mi progreso** (con gráfico de peso) y **Mi plan** (solicitudes de nutrición). | Prueba `e2e/cuenta.spec.ts`: "registro nuevo, progreso, recargar, salir y entrar de nuevo". Captura: `docs/entrega/capturas/perfil-progreso.png` |
| "Lugares de ejemplo (DEMO)." | Se quitaron los lugares de ejemplo inventados. Ahora se muestran **300 lugares reales** tomados de OpenStreetMap, con la etiqueta "Datos de OpenStreetMap", "Consultar precio" y "Horario por confirmar" cuando no hay dato. | El archivo de datos tiene 300 lugares (`src/data/mock/places.osm.json`). Captura: `docs/entrega/capturas/buscar.png` |
| "Botones sin destino / pantallas sin salida." | Se revisó cada botón de cada página. Todas las páginas internas tienen **Volver** o un enlace de regreso. | Tabla completa en `docs/entrega/PRUEBA-DE-BOTONES.md`. Prueba `e2e/navegacion.spec.ts`: "Volver regresa a la página anterior desde deportes y contacto" y "ninguna página principal muestra textos de prueba". |

## Errores encontrados al probar y corregidos

Al probar el sitio en celular y en el formulario de nutrición aparecieron tres errores. Ya están corregidos.

1. **En celular, el menú no dejaba llegar a "Salir".** El menú era más alto que la pantalla y no se podía desplazar. Ahora el menú se desplaza y el botón "Salir" se puede pulsar. Captura: `docs/entrega/capturas/movil-menu.png`.
2. **En Nutrición, "Siguiente" en el paso Foto enviaba la solicitud sin avisar.** Ahora "Siguiente" solo avanza, y al enviar se revisan los datos ("Revisa tus datos") antes de mandar. Prueba: `e2e/nutricion.spec.ts`.
3. **Al pulsar Enter en un paso intermedio se enviaba todo el formulario.** Ahora Enter solo avanza al siguiente paso; el envío se hace únicamente con el botón "Enviar". Prueba: `e2e/nutricion.spec.ts`.

Resultado de las pruebas de punta a punta: **28 pruebas en verde** (`npx playwright test`).
