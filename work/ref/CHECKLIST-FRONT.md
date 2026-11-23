# Lista de revisión del front (Activa GYE)

Lista propia, inspirada en las categorías de las Web Interface Guidelines de Vercel (MIT, github.com/vercel-labs/web-interface-guidelines).
Cada punto se mide en el navegador a **360 px** (celular) y **1280 px** (escritorio).

## 1. Diseño y espacio
- Sin scroll horizontal: `document.documentElement.scrollWidth <= innerWidth`.
- Nada se corta ni se monta: textos largos (nombres, correos, títulos de lugar) hacen `truncate` o saltan de línea, no rompen la caja.
- La barra inferior o fija no tapa contenido ni botones (deja `padding-bottom`).
- Espaciado y alineación coherentes entre pantallas hermanas (mismas tarjetas, mismos títulos, mismos márgenes).
- Imágenes con tamaño reservado (sin saltos al cargar) y `alt` con sentido; decorativas con `alt=""`.

## 2. Toque y foco
- Todo lo clicable mide al menos **44×44 px** en celular (botones, íconos, casillas, enlaces del menú).
- Se ve el foco al navegar con Tab (`focus-visible`), en orden lógico; nada atrapa el foco salvo un diálogo abierto.
- Los diálogos se cierran con Esc y devuelven el foco al botón que los abrió.
- Botones con solo ícono tienen nombre (`aria-label`).
- Un enlace navega (`<a>`/`Link`); una acción es `<button>`. Nada de `div` con `onClick`.

## 3. Formularios
- Cada campo tiene etiqueta visible unida al campo (`<label for>` o envolviendo).
- Campos de texto con letra **≥ 16 px** en celular (si no, el iPhone hace zoom).
- `type`, `inputMode` y `autoComplete` correctos (correo, contraseña nueva/actual, teléfono, números).
- El error sale junto al campo, en texto claro en español, y el foco va al primer campo con error.
- El botón de enviar no se deshabilita antes de tiempo; mientras envía muestra estado y evita el doble envío.
- Nada se pierde sin avisar: salir de un formulario con cambios sin guardar avisa o guarda.

## 4. Contenido
- Estados vacíos, de carga y de error en cada lista o tabla (nunca pantalla en blanco ni «undefined»/«Invalid Date»/«NaN»).
- Fechas, horas y montos legibles y en formato local (Ecuador).
- Textos en español correcto y consistente (mismo nombre para lo mismo en todas las pantallas).
- Ninguna pantalla sin salida: siempre hay forma de volver.
- Lo de fases apagadas no se ve (ni enlaces, ni tarjetas, ni «Próximamente» en el menú).

## 5. Color y contraste
- Texto con contraste suficiente (4.5:1 normal, 3:1 grande); avisos de error, éxito e información distinguibles sin depender solo del color.
- Estados deshabilitados se ven deshabilitados y siguen siendo legibles.

## 6. Movimiento y rendimiento
- Animaciones cortas y que respetan `prefers-reduced-motion`.
- 0 errores en la consola del navegador en cada pantalla.
- Listas largas (300 lugares) no congelan el scroll en celular.
