# Rediseño visual: look vintage único, doblez con curvatura y totales individuales — Design

**Contexto:** Después de fusionar la Tarea 3 del plan anterior (doblez interactivo), Sebas probó "Mis Gastos" en su iPhone real y dio feedback negativo sobre casi todo el sistema visual — no solo la mecánica de arrastre que se acababa de construir. Este documento diseña esa segunda ronda de correcciones, todas sobre los mismos dos archivos existentes (`index.html`, `logic.js`), sin cambiar el modelo de datos ni la arquitectura de páginas/arrastre ya construida.

**Evidencia:** dos capturas de pantalla del iPhone de Sebas (portada del mes, y la página de "agregar gasto"), revisadas en la sesión de brainstorming.

## Problemas identificados y decisión para cada uno

### 1. Modo oscuro rompe el look vintage

Hoy `:root` define la paleta cálida (papel crema `#FBFBF7`, esmeralda `#1F6F54`, dorado `#B98A2E`, coral `#B5473A`), pero un bloque `@media (prefers-color-scheme: dark)` y una regla `:root[data-theme="dark"]` la reemplazan por completo con una paleta oscura genérica verdosa-negra cuando el sistema está en modo oscuro. Con el iPhone de Sebas en modo oscuro, la app se ve "toda negra", perdiendo el look de libreta de papel.

**Decisión:** eliminar el bloque `@media (prefers-color-scheme: dark)` y la regla `:root[data-theme="dark"]` de `index.html`. La app usa siempre la paleta vintage cálida, sin importar el modo del sistema — como una libreta de papel física, que no cambia de color de noche. Se conserva `:root[data-theme="light"]` como no-op (ya coincide con los valores por defecto) o se elimina también por redundancia — es lo mismo output, se decide en implementación cuál genera menos diff.

### 2. El doblez de página se ve rígido, no como papel

La animación actual (`.leaf` con `transform-style: preserve-3d` y `rotateX`) rota un rectángulo perfectamente plano. Sebas describe el resultado como "la página nunca se dobla... simplemente desaparece" — sin curvatura ni sensación de flexión.

**Decisión:** la hoja se divide visualmente en dos franjas durante el giro — una franja angosta cerca de la bisagra (arriba) que concentra la curvatura visible, y el resto de la página que se mantiene casi plano — en vez de un solo rectángulo rígido. Técnica: aplicar un `border-radius` dinámico en la esquina superior de `.leaf` que crece con el ángulo de giro (vía la misma variable de ángulo que ya calcula `anguloDesdeArrastre`), combinado con el gradiente de sombra de pliegue (`.crease-shadow`) ya existente, pero más pronunciado y con un segundo gradiente sutil de "luz" en el lado opuesto a la sombra, para dar sensación de superficie curva en vez de plana. No es un curl de esquina (eso lo descarta el spec original de la Tarea 3 y sigue sin encajar con una libreta de espiral) — es una curvatura de la hoja completa alrededor del eje de la bisagra.

Esto reutiliza las funciones puras existentes en `logic.js` (`anguloDesdeArrastre`, `debeCompletarDoblez`, `opacidadPliegue`) sin cambiarlas — el cambio vive enteramente en cómo `index.html` traduce el ángulo a estilos visuales.

### 3. Totales por categoría: texto plano → filas individuales

Hoy el resumen es una sola línea de texto gris: `Shaun: $X · Swift: $0 · Salidas: $0 · ...`.

**Decisión:** cada categoría se muestra en su propia fila, con una barra de color a la izquierda (el mismo color de su etiqueta, ya definido en `--tag-shaun`, `--tag-swift`, etc.) y el monto alineado a la derecha. Se muestran las 5 categorías siempre, incluidas las de $0 (así lo eligió Sebas, para ver de un vistazo dónde no se ha gastado nada). El total del mes se destaca arriba de la lista, en tamaño más grande que las filas individuales.

Esto consume `calcularResumenMes` tal cual existe hoy (`{ total, porCategoria }`) — cambio puramente de presentación en `index.html`, sin tocar `logic.js`.

### 4. Layout: piezas sueltas con huecos grandes

La tarjeta de la libreta reserva más altura de la que su contenido usa en la portada (dejando un hueco vacío grande), y el link "Borrar todos los registros" flota solo entre dos tarjetas con mucho margen a cada lado, rompiendo la sensación de que todo es una sola pantalla cohesiva.

**Decisión:** se mantienen las tarjetas separadas (libreta y resumen), pero: (a) la altura de la tarjeta de la libreta se ajusta al contenido real de cada página en vez de dejar espacio de sobra — la función `ajustarAltura` ya mide el contenido con `#medidor`, así que el ajuste es de márgenes/paddings en CSS, no de lógica nueva; (b) se reducen los márgenes verticales entre notebook → link de borrar → resumen; (c) el link de borrar se vuelve más pequeño y discreto (texto más chico, menos padding), en vez de ocupar una línea completa con tanto aire alrededor.

### 5. Tipografía fría → toque manuscrito

El encabezado del mes usa hoy `ui-rounded` en mayúsculas con letter-spacing amplio — se lee frío y genérico, no como una anotación de libreta.

**Decisión:** el encabezado del mes (`#mesHeader`) cambia a una fuente cursiva/manuscrita disponible como fuente de sistema en iOS (`Snell Roundhand`, con fallback a `cursive` y a `ui-rounded` si no está disponible), ya no en mayúsculas forzadas — el nombre del mes se muestra en formato título normal ("Agosto 2026"). El cuerpo de los recibos se mantiene en `Courier New` (ya funciona bien para el look de recibo impreso, y no fue parte de la queja).

### 6. Chips de categoría/pago: indistinguibles entre sí

Los ocho chips (5 categorías + 3 formas de pago) se ven idénticos — mismo borde gris, mismo relleno — sin ninguna etiqueta de grupo ni color que ayude a diferenciarlos de un vistazo. Además, el recuadro de vista previa del recibo (`.recibo-preview`) se ve como una caja vacía y rota cuando el usuario aún no ha llenado nada.

**Decisión:**
- Se agrega un título pequeño encima de cada grupo de chips: "Categoría" y "Forma de pago" (texto chico, en mayúsculas discretas, color `--muted`).
- Los chips de categoría, incluso sin seleccionar, toman un tono suave del color de su etiqueta (borde y texto en el color de la categoría sobre fondo `--card`); al seleccionarse pasan al relleno sólido de ese mismo color (ya existe ese patrón para el estado seleccionado, solo se extiende el color al estado no-seleccionado).
- Los chips de forma de pago se quedan neutros (border `--line`, texto `--ink`) para no competir visualmente con los de categoría.
- `.recibo-preview` se oculta (`display: none`) mientras no haya ninguna línea que mostrar, en vez de rendersear un contenedor vacío con borde.

## Qué NO cambia

- Modelo de datos (`{ id, monto, categoria, pago, fecha }`) y clave de `localStorage` (`gastos_v1`).
- Categorías (Shaun, Swift, Salidas, Gastos Personales, Hogar) y formas de pago (BreB, RappiCard, Efectivo).
- Arquitectura de páginas (portada / blanco / gastos guardados) y el modelo de arrastre vertical / cambio de mes horizontal ya construido en la Tarea 3.
- Las funciones puras de `logic.js` — este rediseño es 100% presentación (`index.html`), sin necesidad de nuevas funciones puras ni de tocar `logic.test.js`.
- `prefers-reduced-motion: reduce` se sigue respetando igual que hoy (las reglas existentes no se tocan; la curvatura nueva del doblez debe añadirse a esa misma media query si introduce alguna animación adicional).

## Archivos que se tocan

Solo `index.html` — CSS (paleta, chips, tipografía, curvatura del doblez, totales) y los pequeños ajustes de HTML generado en `htmlDePagina` y el bloque de `#resumen` en `render()`. `logic.js` y `logic.test.js` no se tocan.
