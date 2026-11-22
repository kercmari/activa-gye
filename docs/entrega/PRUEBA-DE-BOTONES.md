# Prueba de botones

Lista de los botones y enlaces de cada página: qué hacen, a dónde llevan y si el usuario puede regresar.

✓ = cubierto por una prueba automática en `e2e/*.spec.ts`. Sin ✓ = revisado a mano o sin prueba automática todavía.

## Menú y pie de página (todas las páginas)

| BOTÓN | ACCIÓN | DESTINO | ¿PUEDE REGRESAR? |
|---|---|---|---|
| Logo Activa GYE | Va al inicio | `/` | Sí (es el inicio) ✓ |
| Inicio, Conócenos, Explorar deportes, Buscar lugares, Nutricionista, Contacto | Abre la página | `/`, `/conocenos`, `/deportes`, `/lugares`, `/nutricion`, `/contacto` | Sí, con el menú ✓ |
| Explorar actividades | Abre deportes | `/deportes` | Sí, con el menú ✓ |
| Ingresar | Abre el ingreso | `/ingresar` | Sí, con el menú |
| Abrir menú / Cerrar menú (celular) | Muestra u oculta el menú | Mismo lugar | Sí |
| Menú de cuenta (escritorio) | Muestra opciones de cuenta | Mismo lugar | Sí |
| Mi perfil (menú de cuenta) | Abre la cuenta | `/perfil` | Sí, con el menú ✓ |
| Mi plan nutricional (menú de cuenta) | Abre el plan | `/nutricion` | Sí, con el menú |
| Panel (menú de cuenta, solo nutricionista y admin) | Abre el panel | `/admin` | Sí, con el menú ✓ |
| Salir (menú de cuenta) | Cierra la sesión | `/` | Sí ✓ |
| Pie: Deportes, Buscar lugares, Nutricionista, Mi perfil, Ingresar, Crear cuenta, Conócenos, Contacto, Privacidad y términos | Abre la página | Su ruta | Sí, con el menú del pie |

## Páginas públicas

| BOTÓN | ACCIÓN | DESTINO | ¿PUEDE REGRESAR? |
|---|---|---|---|
| **Inicio**: Explorar lugares | Abre los lugares | `/lugares` | Sí, con el menú ✓ |
| **Inicio**: Conoce más | Abre Conócenos | `/conocenos` | Sí, con el menú ✓ |
| **Inicio**: Ver todos los lugares | Abre los lugares | `/lugares` | Sí, con el menú |
| **Inicio**: tarjeta de deporte | Abre los lugares de ese deporte | `/deportes/:slug` | Sí, con Volver |
| **Inicio**: Empezar mi plan (nutrición) | Abre Nutrición | `/nutricion` | Sí, con el menú |
| **Inicio**: buscador (Buscar) | Abre los lugares con los filtros | `/lugares?…` | Sí, con Volver ✓ |
| **Deportes**: tarjeta de deporte | Abre el deporte | `/deportes/:slug` | Sí, con Volver ✓ |
| **Deporte**: Ver lugares | Abre los lugares del deporte | `/lugares?deporte=…` | Sí, con Volver |
| **Deporte**: Volver | Regresa a la página anterior | Página anterior | Sí |
| **Lugares**: tarjeta de lugar | Abre la ficha | `/lugares/:id` | Sí, con Volver |
| **Lugares**: Lista / Mapa | Cambia la vista | Misma página | Sí |
| **Lugares**: Cerca de mí | Usa la ubicación | Misma página | Sí |
| **Lugares**: Ver más | Muestra más lugares | Misma página | Sí |
| **Lugares**: Comparar (con lugares elegidos) | Abre la comparación | `/comparar?ids=…` | Sí, con Volver |
| **Lugares**: Limpiar | Quita los lugares elegidos para comparar | Misma página | Sí |
| **Ficha**: Volver | Regresa | Página anterior | Sí |
| **Ficha**: Cómo llegar | Abre Google Maps | Otra pestaña de Google Maps | Sí, es otra pestaña ✓ |
| **Ficha**: Ver en OpenStreetMap | Abre OpenStreetMap | Otra pestaña | Sí, es otra pestaña |
| **Ficha**: Guardar en favoritos (sin cuenta) | Lleva a ingresar | `/ingresar?volver=/lugares/:id` | Sí, vuelve a la ficha ✓ |
| **Ficha**: Entra (texto) | Lleva a ingresar | `/ingresar?volver=/lugares/:id` | Sí, vuelve a la ficha |
| **Ficha**: teléfono, WhatsApp, sitio web, Instagram | Abre el dato | Otra pestaña o llamada | Sí |
| **Comparar**: Ver lugar | Abre la ficha | `/lugares/:id` | Sí, con Volver |
| **Comparar**: Quitar | Quita un lugar de la comparación | Misma página | Sí |
| **Comparar**: Buscar más lugares | Abre los lugares | `/lugares` | Sí |
| **Conócenos**: Buscar lugares | Abre los lugares | `/lugares` | Sí |
| **Conócenos**: Crear mi cuenta | Abre el registro | `/registro` | Sí, con el menú ✓ |
| **Conócenos**: enlace de Nutrición | Abre Nutrición | `/nutricion` | Sí |
| **Contacto**: Enviar otro mensaje | Vuelve a mostrar el formulario | Misma página | Sí |
| **Privacidad**: Tengo una pregunta | Abre Contacto | `/contacto` | Sí |
| **No encontrada (404)**: Ir al inicio | Abre el inicio | `/` | Sí |
| **No encontrada (404)**: Buscar lugares | Abre los lugares | `/lugares` | Sí |
| **Sin acceso**: Ir al inicio / Mi perfil | Abre el inicio o la cuenta | `/` o `/perfil` | Sí |

## Cuenta

| BOTÓN | ACCIÓN | DESTINO | ¿PUEDE REGRESAR? |
|---|---|---|---|
| **Ingresar**: Ingresar | Entra con la cuenta | `/perfil` o la página pedida ✓ | Sí |
| **Ingresar**: ¿Olvidaste tu contraseña? | Abre recuperar | `/recuperar` | Sí, con Volver a ingresar |
| **Ingresar**: Crear cuenta | Abre el registro | `/registro` | Sí, con Ingresar |
| **Registro**: Crear cuenta | Crea la cuenta | `/perfil?bienvenida=1` ✓ | Sí |
| **Registro**: enlace de privacidad | Abre privacidad en otra pestaña | `/privacidad` | Sí |
| **Registro**: Ingresar | Abre ingresar | `/ingresar` | Sí |
| **Recuperar**: Volver a ingresar | Abre ingresar | `/ingresar` | Sí |
| **Mi perfil**: Editar perfil / Editar | Abre la edición | `/perfil/editar` | Sí, con Volver |
| **Mi perfil**: Salir | Cierra la sesión | `/` ✓ | Sí |
| **Mi perfil**: pestañas | Cambia de pestaña | Misma página | Sí |
| **Mi perfil**: Llenar mi ficha / Mi plan | Abre el panel del paciente | `/mi-panel` (la pestaña Plan y Progreso de `/perfil` se retiraron) | Sí |
| **Editar perfil**: Guardar | Guarda y vuelve al perfil | `/perfil` ✓ | Sí |
| **Editar perfil**: Borrar mi cuenta | Pide confirmar y borra la cuenta | `/` | Sí, con Cancelar en la confirmación |

## Nutrición (página informativa) y ficha

La guía antigua (`/nutricion/nueva`, `/nutricion/:id`) se retiró. `/nutricion` queda como página «Cómo funciona».

| BOTÓN | ACCIÓN | DESTINO | ¿PUEDE REGRESAR? |
|---|---|---|---|
| **Nutrición**: Ir a mi ficha | Abre la ficha inicial | `/mi-panel?tab=ficha` ✓ (`e2e/nutricion.spec.ts`) | Sí, con Volver |
| `/nutricion/nueva` | Ruta retirada | «No encontramos esta página» ✓ | Sí, con el menú |

## Mi panel del paciente (fases 1–3)

| BOTÓN | ACCIÓN | DESTINO | ¿PUEDE REGRESAR? |
|---|---|---|---|
| **Mi ficha**: Elegir foto / Quitar foto | Elige o quita la foto de cuerpo entero | Misma página | Sí |
| **Mi ficha**: Guardar mi ficha | Guarda la ficha y muestra «Ficha guardada» | Misma página ✓ (`fase1`) | Sí |
| **Calendario y progreso** / **Pagos** (fase 2 apagada) | Muestran «Próximamente» | Misma página ✓ (`fase1`) | Sí, con Volver |
| **Mi nutricionista**: Solicitar nutricionista | Envía la solicitud | Misma página ✓ (`fase2`) | Sí |
| **Mi nutricionista**: Cancelar solicitud | Cancela la solicitud abierta | Misma página | Sí |
| **Pagos**: Informar pago | Reporta el comprobante de una factura | Misma página ✓ (`fase2`) | Sí |
| **Calendario**: marcar día cumplido | Registra el progreso del día | Misma página ✓ (`fase2`) | Sí |
| **Tu reseña**: Enviar reseña (lugar y nutricionista) | Guarda la calificación y el comentario | Misma página ✓ (`fase3`) | Sí |
| **Reporte**: Descargar PDF | Abre el diálogo de imprimir (PDF) | `/mi-panel/reporte` ✓ (`fase3`) | Sí, con Volver |

## Nutricionista (fase 2)

| BOTÓN | ACCIÓN | DESTINO | ¿PUEDE REGRESAR? |
|---|---|---|---|
| **Campana** de notificaciones | Muestra los avisos sin leer | `/notificaciones` ✓ (`fase2`) | Sí, con Volver |
| **Solicitudes**: Aceptar | Toma al paciente | `/nutri/pacientes/:id` ✓ (`fase2`, `fase3`) | Sí, con Volver |
| **Solicitudes**: Ver mi suscripción | Va a elegir o pagar el plan | `/nutri/suscripcion` ✓ (`fase2`, `fase3`) | Sí, con Volver |
| **Suscripción**: Elegir este plan / Informar pago | Crea la factura del plan y reporta el pago | Misma página ✓ (`fase2`) | Sí |
| **Paciente**: Nuevo seguimiento / nuevo día | Agrega seguimiento o día del plan | Misma página ✓ (`fase2`) | Sí |
| **Paciente**: Marcar pagada (factura) | Marca la factura como pagada | Misma página ✓ (`fase2`) | Sí |
| **Paciente**: Finalizar atención | Cierra la atención (pide confirmar) | `/nutri` ✓ (`fase2`, `fase3`) | Sí, con Cancelar en la confirmación |

## Admin (fases 1–3)

| BOTÓN | ACCIÓN | DESTINO | ¿PUEDE REGRESAR? |
|---|---|---|---|
| **Admin → Fases**: casillas de fase 1, 2, 3 y cupo; Guardar cambios | Cambia las fases y el cupo | `/admin/fases` ✓ (`fase1`, `fase2`, `fase3`) | Sí, con el menú del panel |
| **Admin → Pagos**: Marcar pagada | Marca la suscripción o factura pagada | `/admin/pagos` ✓ (`fase2`) | Sí, con Volver |
| **Admin → Datos de lugares** | Lista los lugares con datos faltantes | `/admin/datos-lugares` ✓ (`fase3`) | Sí, con Volver |

## Panel (nutricionista y admin)

| BOTÓN | ACCIÓN | DESTINO | ¿PUEDE REGRESAR? |
|---|---|---|---|
| **Panel**: tarjetas (pagos, fases, lugares, mensajes, usuarios, datos de lugares) | Abre la lista | `/admin/pagos`, `/admin/fases`, `/admin/lugares`, `/admin/mensajes`, `/admin/usuarios`, `/admin/datos-lugares` | Sí, con el menú del panel |
| **Panel lugares**: Nuevo lugar | Abre el formulario | `/admin/lugares/nuevo` ✓ | Sí, con Cancelar |
| **Panel lugares**: Editar | Abre el lugar | `/admin/lugares/:id` | Sí, con Cancelar |
| **Panel lugares**: Anterior / Siguiente / filtros | Cambia de página o filtro | Misma página | Sí |
| **Lugar (admin)**: Guardar | Guarda y vuelve a la lista | `/admin/lugares` ✓ | Sí |
| **Lugar (admin)**: Cancelar | Vuelve a la lista | `/admin/lugares` | Sí |
| **Usuarios**: Cancelar / Confirmar cambio de rol | Cancela o cambia el rol | Misma página | Sí |
| **Mensajes**: enviar correo, marcar como no leído | Abre el correo o marca el mensaje | Misma página o el correo | Sí |

## Lo que queda sin prueba automática

- Los botones del panel de administración (lugares, usuarios, mensajes) se revisaron a mano; solo `e2e/admin.spec.ts` prueba ocultar un lugar y el acceso de un usuario normal.
