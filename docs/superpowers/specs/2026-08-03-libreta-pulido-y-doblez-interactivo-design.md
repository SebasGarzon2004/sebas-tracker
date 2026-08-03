# Diseño: pulido visual y doblez de página interactivo para "Mis Gastos"

Fecha: 2026-08-03
Proyecto: `/home/sebas/gastos-tracker` (app "Mis Gastos")
Agente responsable del diseño y arquitectura: Ryan (`.claude/agents/ryan.md`)
Spec anterior relacionada: `docs/superpowers/specs/2026-08-03-libreta-recibo-vintage-design.md`

## Contexto

La reconstrucción completa de la libreta (spec anterior) ya está fusionada en `master` y funciona en el iPhone real de Sebas por wifi local. Al probarla encontró tres problemas concretos:

1. El doblez de página, aunque programado, no se sentía real: la tarjeta tenía una altura fija de 220px mientras que el contenido de la hoja en blanco es mucho más alto, así que se salía del recuadro y la animación se veía cortada/rota. **Esto ya se corrigió** en una vuelta anterior (el tamaño del cuaderno ahora se ajusta al contenido de cada página antes de doblarse).
2. La interfaz en general se ve genérica y poco cuidada: chips, botones y jerarquía tipográfica sin pulir.
3. El cambio de página se dispara de golpe al detectar el swipe; no responde al dedo mientras se arrastra, y por eso se siente poco fluido — muy distinto a cómo se dobla una hoja de un bloc de notas físico en la mano.

Este spec cubre la segunda vuelta: pulir el sistema visual y reemplazar el gesto de pasar página por uno interactivo que sigue al dedo en tiempo real.

## Objetivo

Dos frentes, sin tocar el modelo de datos ni la estructura de navegación (mes → portada → hoja en blanco → gastos), que ya quedaron definidos en el spec anterior:

1. **Pulido visual**: que la libreta se sienta cuidada y agradable, no un formulario con estilos encima.
2. **Doblez de página interactivo**: la hoja gira en 3D en vivo según el arrastre del dedo, con sombra de pliegue progresiva, y se completa o se devuelve según qué tan lejos llegó el arrastre al soltar.

## Sistema visual — pulido

- **Papel con textura**: las tarjetas (`.pagina-cara`, `.face`) llevan un gradiente de ruido muy sutil superpuesto (vía `background-image` con un `radial-gradient` repetido de bajo contraste) en vez de un color plano — sugiere papel sin volverse ruidoso ni afectar la legibilidad del texto.
- **Jerarquía tipográfica en la hoja de un gasto guardado**: el monto pasa a ser el elemento más grande de la página (`ui-rounded`, peso alto), categoría y forma de pago quedan como texto secundario más pequeño debajo, en vez de las tres líneas al mismo peso que hay ahora.
- **Filo de categoría**: cada hoja de gasto guardado lleva un borde izquierdo de 4-5px con el color de su categoría (mismo color que ya existe por categoría: `--tag-shaun`, `--tag-swift`, etc.), además del badge de dos letras — así se reconoce la categoría de un vistazo al hojear rápido, sin tener que leer.
- **Chips tipo sello**: al seleccionarse, además del cambio de color ya existente, se le agrega una leve rotación (2-3°, alternando signo por chip para que no se vean todos iguales) y una sombra un poco más marcada, simulando un sello de tinta presionado sobre papel.
- **Botón "Guardar gasto"**: gradiente sutil de dos tonos de esmeralda (de `--emerald` a `--emerald-deep`) en vez de color plano, y una sombra más definida — que se note presionable.
- **Encabezado del mes**: tipografía más grande, con más espaciado entre letras, y una regla decorativa fina debajo (ya existe ese patrón en `.masthead`, se reutiliza aquí).

Esto es ajuste de CSS puro sobre clases ya existentes (`.pagina-cara`, `.face`, `.chip`, `#guardarBtn`, `#mesHeader`, `.hoja-escrita`) — no cambia el HTML generado por `htmlDePagina`, salvo agregar la clase de color de filo a la hoja de gasto guardado.

## Doblez de página — mecánica interactiva

Reemplaza la función `moverPagina` actual (que hoy dispara la animación completa apenas detecta el swipe) por un seguimiento en vivo del gesto, en tres fases:

**1. Arrastre (`touchmove`)**

Mientras el dedo se mueve verticalmente dentro del cuaderno:
- Se calcula un ángulo de giro proporcional a la distancia arrastrada: `angulo = clamp(deltaY / altoNotebook * 180, -180, 180)` (mismo signo que la dirección: arrastrar hacia arriba da ángulo negativo, hacia abajo positivo).
- Ese ángulo se aplica en vivo a `#leaf` vía `leaf.style.transform = rotateX(angulo)` (sin animación CSS de por medio — se actualiza a mano en cada evento, acotado con `requestAnimationFrame` para no saturar).
- La sombra de pliegue (`.crease-shadow`) deja de estar atada solo a la animación por keyframes de la mitad del giro: su opacidad pasa a calcularse a partir del mismo ángulo (`opacidad = sin(angulo en radianes)` o una aproximación simple), de forma que oscurece progresivamente a medida que la hoja se inclina, no de golpe a la mitad.
- Antes de empezar a girar la hoja, `pageUnder` ya debe tener cargada la página vecina correspondiente (la siguiente si se arrastra hacia abajo, la anterior si es hacia arriba) — igual que hace hoy `moverPagina` al preparar `pageUnder` antes de animar.

**2. Soltar el dedo (`touchend`)**

- Si el ángulo alcanzado al soltar pasa la mitad (90° en valor absoluto): la animación se completa sola desde el ángulo actual hasta 180°/-180°, con una transición CSS corta (curva de resorte tipo `cubic-bezier` con leve rebote, reutilizando el mismo timing que ya existe para `flipUp`/`flipDown`). Al terminar, se intercambia el contenido (`faceFront` recibe el HTML de la página nueva, igual que hoy) y se resetea el ángulo a 0.
- Si no pasa la mitad: la animación vuelve desde el ángulo actual hasta 0° con una transición corta — la hoja "regresa" a su lugar, como devolver una página que no querías pasar. No hay cambio de contenido ni de posición en `estado`.
- En ambos casos se usa el flag `animando` para bloquear un nuevo arrastre mientras la transición de cierre corre, igual que hoy.

**3. Tap sin arrastre real (compatibilidad con los botones ocultos de accesibilidad)**

Los botones `#btnArriba`/`#btnAbajo` (ocultos visualmente, ya existen para accesibilidad) siguen disparando la animación completa de una vez (sin fase de arrastre en vivo, porque no hay gesto que seguir) — mismo comportamiento de hoy, sin cambios.

**Reducción de movimiento**: si `prefers-reduced-motion: reduce` está activo, se salta toda la fase de arrastre en vivo y de resorte: el cambio de página ocurre con un fundido cruzado instantáneo entre `faceFront` y el contenido nuevo, sin rotación. Esto ya es el comportamiento actual para esa preferencia y se mantiene igual.

## Cambio de mes

Sin cambios de mecánica respecto a lo que ya quedó funcionando (deslizamiento lateral con fundido). Solo se ajustan los tiempos de la transición para que el ritmo combine con el nuevo doblez de página (duraciones similares, misma curva de easing donde aplique).

## Fuera de alcance

- Curl de esquina tipo Apple Books (se descartó explícitamente; la mecánica elegida es bisagra arriba, como un bloc de notas con espiral).
- Cualquier librería externa de animación o gestos — sigue siendo JS y CSS puro, sin dependencias, consistente con el resto de la app.
- Cambios al modelo de datos, a la estructura de navegación mes/página, o a las categorías y formas de pago — nada de eso cambia en este spec.
- Registrar/instalar la app en el iPhone (hosting estático) — sigue siendo un pendiente aparte, no parte de este trabajo.

## Verificación manual

Sigue sin haber manera de automatizar la prueba de un gesto táctil real, así que la verificación es manual en el iPhone de Sebas:

- Arrastrar lentamente hacia abajo y hacia arriba dentro del cuaderno, soltando antes de la mitad del giro — la hoja debe volver a su lugar sin cambiar de contenido.
- Arrastrar pasando la mitad y soltar — la hoja debe terminar de doblarse sola y mostrar la página siguiente/anterior.
- Confirmar que la sombra de pliegue se ve progresiva durante el arrastre, no de golpe.
- Confirmar que los límites (portada arriba, gasto más antiguo abajo) siguen rebotando en vez de arrastrar hacia la nada.
- Revisar visualmente el filo de color por categoría, el chip tipo sello al seleccionar, y el botón "Guardar gasto" con el nuevo relieve.
- Las 6 pruebas de `logic.test.js` deben seguir pasando sin cambios (esta vuelta no toca `logic.js`).
