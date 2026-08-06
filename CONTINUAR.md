# Para continuar — Mis Gastos (libreta de recibos)

Este archivo es para que, cuando vuelvas a abrir esto y llames a Ryan, retome exactamente donde quedó — sin que tengas que volver a explicar nada.

**Ubicación:** todo esto vive en `/home/sebas/universidad/gastos-tracker`, directo en Home, separado de `/home/sebas/TUM` — no hay nada de esta app ni del agente Ryan guardado dentro de TUM.

## Dónde está todo ahora mismo (cierre del 2026-08-04)

- Repo principal: `/home/sebas/universidad/gastos-tracker`, en `master`, commit `6357c7a` — **ya subido a GitHub** (`git push origin master:main`, el remoto usa `main` como nombre de rama, no `master`).
- No hay ningún worktree activo — todo el trabajo se hizo commit por commit directo sobre `master`.
- Las 14 pruebas de `node --test logic.test.js` pasan.
- El servidor local de prueba se apagó al cerrar la sesión — para retomar, levantarlo de nuevo con `python3 serve-sin-cache.py 8010` desde esta carpeta.
- Caché del service worker en `gastos-cache-v16` — subir el número cada vez que se toque algo real, o el ícono instalado en el iPhone puede seguir mostrando la versión vieja.

## RESUELTO (2026-08-04): color en el recibo — categoría, pago, monto y nota

Sebas pidió darle vida al recibo (antes todo texto plano, sin color, aunque los chips del formulario ya sí tenían color). Se armó un artifact con 4 propuestas visuales (de sutil a marcada) y Sebas eligió la **Opción 2 — "encabezado con acento"**: el título/monto toman el color de la categoría del gasto, y la forma de pago pasa de texto plano a una pastilla suave de su propio color. Al verlo aplicado, pidió también extender el mismo tratamiento a Monto y Nota (antes solo Categoría y Pago tenían color, y se veía raro que dos líneas tuvieran vida y dos no).

**Resultado final (aplicado tanto en la vista previa con máquina de escribir como en el recibo ya guardado):**
- Categoría y Monto: texto en negrita del color de la categoría (usa las mismas variables `--tag-*` que ya usan los chips).
- Pago y Nota: pastilla suave del color de la forma de pago (usa las mismas variables `--pago-*`), Nota además en itálica.
- Mecanismo: cada tarjeta/caja recibe `--acento-cat` y `--acento-pago` como propiedades CSS inline (calculadas desde `BADGE_CATEGORIA`/`CLASE_PAGO`), y el CSS las lee con `color-mix()` para los fondos suaves — sin tocar el JS de la máquina de escribir.

No quedó pendiente nada de esto — Sebas lo confirmó en su iPhone real y se subió a GitHub.

## RESUELTO: el campo Nota ya no se corta (commit `e916546`)

## RESUELTO: el campo Nota ya no se corta (commit `e916546`)

La causa real nunca fue el colchón/mínimo/respaldo del cuaderno — era que `body` tenía `height: 100%` (además de `min-height: 100%`), y como `body` es un flex column, esa altura fija obligaba a TODOS sus hijos (incluida la tarjeta del recibo) a encogerse con `flex-shrink` para caber justo en la pantalla, sin importar qué tan grande pidiera ser la tarjeta. Por eso subir el colchón durante siete rondas (en la sesión anterior) y varias más (en esta) nunca se veía reflejado — el propio layout lo aplastaba de vuelta. En el modo "anclado al inicio" (standalone) el aplastamiento era peor porque ahí hay menos alto real de pantalla disponible que en Safari con la barra de direcciones.

**Arreglo:** se quitó `height: 100%` de `body` (se dejó solo en `html`), y se agregó `flex-shrink: 0` a `#notebook` como respaldo. Ahora, si el contenido necesita más alto que la pantalla, la página se desplaza (scroll) en vez de aplastarse. Con esto, el colchón real que hace falta resultó ser mínimo: `medidor.offsetHeight` solo, con un piso de seguridad de `260px` (nada de sumarle colchón extra) — así el margen de abajo de la Nota queda igual al margen de los lados, que fue justo lo que Sebas pidió para dejarlo "perfecto".

Para diagnosticar esto se usó un truco útil para la próxima vez que algo así no se refleje en pantalla: agregar temporalmente un texto visible en pantalla con `getBoundingClientRect().height` del elemento en cuestión comparado con la variable CSS que se le está mandando — si no coinciden, el problema no es el número que estás subiendo, es que algo más (como este `flex-shrink`) se lo está comiendo por detrás.

## Ajustes del 2026-08-04 (cuarta pasada — la causa real de "no cambió nada")

Sebas subió el colchón/mínimo/respaldo del cuaderno tres rondas seguidas y en el iPhone se seguía viendo igual. Se investigó por qué antes de seguir subiendo números:

- **No había ningún límite de altura escondido.** Se revisó todo `index.html` buscando `max-height`, `overflow: hidden` u otro tamaño fijo aparte de `--alto-notebook`; no existe otro — el único candidato, `.pagina-cara { overflow: auto }`, deja scroll en vez de recortar. La lógica de `ajustarAltura()` (colchón 160, mínimo 210, respaldo 270) está bien y sí se aplicaría si llegara a correr.
- **La causa real es la app instalada en la pantalla de inicio del iPhone, sirviendo una copia vieja vía el service worker.** El ícono que Sebas tiene instalado abre siempre `./index.html` (el `start_url` del `manifest.json`, sin `?v=`), y esa página está bajo el control del `sw.js` que quedó registrado desde antes. Aunque la estrategia es "red primero", el `fetch()` de dentro del service worker no forzaba descartar la caché HTTP del teléfono, así que en el iPhone real (a diferencia de escribir `?v=` en una pestaña nueva de Safari, que si sirvió para versiones anteriores) el ícono instalado podía seguir mostrando HTML/JS viejo aunque hubiera internet.
- **Arreglo aplicado:** en `sw.js`, el `fetch(evento.request)` ahora pasa `{ cache: 'no-store' }`, para que el service worker nunca conteste con algo que el propio teléfono tenía cacheado por su cuenta. Además se subió `CACHE_NAME` de `'gastos-cache-v1'` a `'gastos-cache-v2'`, para que la caché vieja del service worker quede huérfana y el `activate` la borre sola. Este cambio de nombre hay que repetirlo (subir el número) cada vez que se suba algo importante, para forzar que el ícono instalado lo note.
- **Lo que Sebas tiene que hacer en el iPhone para verlo de verdad esta vez** (no basta con escribir `?v=` de nuevo):
  1. Borrar el ícono viejo de "Sebas' Tracker" de la pantalla de inicio (mantener presionado → Eliminar app / Quitar de la pantalla de inicio).
  2. Abrir Safari normal (no el ícono), entrar a la URL de siempre, y forzar que cargue fresco: mejor en una pestaña de **Navegación privada**, o subiendo el número de `?v=` otra vez.
  3. Confirmar visualmente que el campo Nota ya no se ve cortado ahí, en Safari normal.
  4. Recién ahí, desde el botón de compartir, "Añadir a pantalla de inicio" de nuevo, para reinstalar el ícono con el service worker nuevo desde cero.
  5. Alternativa más rápida si no quiere reinstalar el ícono: abrir la app desde el ícono, e irse al multitarea del iPhone (deslizar hacia arriba y pausar) y deslizarla hacia arriba para **cerrarla del todo** (no solo salir/minimizar) antes de volver a abrirla — así se fuerza a que el service worker revise si hay una versión nueva.
- Los tres números del cuaderno (colchón 160, mínimo 210, respaldo 270 del commit `4e5a351`) NO se tocaron en esta pasada — no había evidencia de que estuvieran mal, el problema era que nunca estaban llegando a correr en el teléfono de Sebas.

## Ajustes del 2026-08-04 (tercera pasada, tras probar en iPhone instalado como PWA)

- **Margen a los lados y abajo:** el `body` tenía `padding: 16px` parejo por los cuatro lados. Se dejó el top igual (16px, sin tocar) y se subieron los laterales a 20px y el fondo a 28px, sumando `env(safe-area-inset-*)` para que en el iPhone (con `viewport-fit=cover` en el manifest) también respete el redondeo de esquinas y la barra de gestos de abajo.
- **Diferencia entre Safari normal y la app instalada (standalone):** no había ningún `100vh` en el proyecto (se revisó a fondo), así que no era ese el problema típico. La causa real: en Safari normal la barra del navegador ya le resta espacio al viewport, así que el `padding: 16px` del body quedaba con aire de sobra visualmente; en modo standalone (`display: standalone` del manifest, sin esa barra) el contenido ocupa la pantalla completa borde a borde, y ese mismo padding se ve pegado al filo real del celular y a la muesca/barra de gestos. Con `env(safe-area-inset-*)` sumado al padding, el margen se ajusta solo según haya o no zona segura que respetar, así que se ve consistente en ambos modos.

## Ajustes del 2026-08-04 (segunda pasada, con Ryan)

- **Hueco vacío bajo la hoja de recibo:** la altura compartida entre portada, hoja en blanco y recibos guardados (`--alto-notebook`) solo crecía y nunca bajaba, así que una vez se inflaba (por ejemplo llenando categoría+pago+monto), esa altura se quedaba pegada para siempre, dejando un hueco debajo del campo Nota en la hoja en blanco recién abierta. Se agregó `resetearAltura()`, llamada en los puntos reales de navegación (`commitCambioPagina`, usado por swipe/botones, y `cambiarMes`), que recalcula la altura desde cero contra la página que va a quedar visible. Dentro de una misma página, mientras se llena el formulario, la altura sigue solo creciendo (para no encogerse de golpe mientras se escribe). La transición sigue suave porque `#notebook` ya animaba los cambios de alto por CSS (`transition: height .25s ease`).
- **Letra del resumen más grande:** `.resumen-total-mes` subió de `1.3rem` a `1.7rem` y `.resumen-fila` de `0.9rem` a `1.15rem` (con más padding/gap alrededor), usando el espacio que se liberó del hueco.
- **Meses vacíos previos a agosto 2026, fuera:** `mesesDisponibles` en `logic.js` ya no rellena meses pasados sin datos (antes agregaba 2 meses hacia atrás siempre); ahora solo rellena hacia adelante (2 meses siguientes al actual). Los meses pasados con gastos reales se siguen mostrando igual, vía `Object.keys(gastosPorMes)`.
- Servidor local para probar en el iPhone: `python3 serve-sin-cache.py 8010` (no usar `python3 -m http.server` a secas — Safari cachea versiones viejas; este script manda `Cache-Control: no-store` en cada respuesta). Si Safari sigue mostrando algo viejo después de eso, hay que probar en una pestaña de **Navegación privada**, o agregar `?v=<número que subes cada vez>` al final de la URL — cerrar y reabrir la pestaña normal NO vacía la caché de archivos.

## RESUELTO (2026-08-06): PWA en hosting real, instalada y confirmada en el iPhone

Se verificó que el repo ya estaba al día en GitHub (`master` sincronizado con `origin/main`, sin cambios pendientes) y que GitHub Pages ya estaba sirviendo exactamente ese mismo código: **https://sebasgarzon2004.github.io/sebas-tracker/**. Se comparó byte a byte `index.html`, `manifest.json` y `sw.js` locales contra lo publicado — idénticos. Sebas instaló el ícono desde ese link en Safari real (no en un servidor local), lo usó, registró un gasto y lo cerró: guarda bien y funciona bien. Con esto, el pendiente "PWA primero" queda cerrado de verdad — la app ya no depende de que el servidor local esté corriendo en la compu.

## Próximo paso, en el orden que pidió Sebas

1. **Dirección visual "Tinta y Trazo"** — aprobada por Sebas pero todavía sin aplicar al código real (ver sección abajo); ahora que el recibo ya tiene su propio sistema de color por categoría/pago, vale la pena revisar con Sebas si esa dirección sigue siendo la que quiere o si el color actual del recibo ya le resuelve lo que buscaba.
2. **El atajo de Siri queda de último**, a propósito — Sebas lo dejó a medio armar (llegó hasta la acción de la URL, sin terminarla). No retomar el atajo hasta que él lo pida.

## Recap completo de la sesión larga de hoy (2026-08-04)

**Punto de partida:** ya estaba fusionado el rediseño visual vintage (Ronda 2).

**Tanda de ajustes probando en el iPhone real**, uno por uno según fue apareciendo cada problema:
- Se reemplazó el doblez de página 3D (rotateX + perspective) por una animación 2D de deslizar/rotar/desvanecer — el 3D nunca se vio bien ni fluido pese a varios intentos.
- Se unificó el alto de todas las páginas (portada, hoja en blanco, recibos guardados) para que no cambien de tamaño de golpe al pasar de una a otra.
- Los chips de categoría/pago se ocultan por completo al elegir uno, con una `×` en la vista previa para deshacer. El monto también se oculta al confirmarlo, con el mismo patrón.
- Se agregaron flechas visibles `‹ ›` para cambiar de mes, más un swipe horizontal dedicado sobre el encabezado (el gesto compartido con el doblez de página no respondía bien en touch real).
- Se puede navegar 2 meses antes/después del actual aunque estén vacíos.

**Ronda 3, con proceso completo** (brainstorming de ideas → spec → plan → subagentes con implementador+revisor por tarea → revisión final): comparación con el mes anterior (solo en meses ya terminados), filtro del cuaderno por categoría, y el atajo de Siri (prellena la hoja, nunca guarda sola). Spec: `docs/superpowers/specs/2026-08-04-comparacion-filtro-atajo-siri-design.md`. Plan: `docs/superpowers/plans/2026-08-04-comparacion-filtro-atajo-siri.md`.

**Extras después de la Ronda 3:**
- Desglose y filtro también por forma de pago, con línea separadora y colores propios (BreB morado, Tarjeta de Crédito naranja, Efectivo verde azulado) — los chips del formulario también los usan.
- RappiCard renombrada a "Tarjeta de Crédito" en todo el código.
- Se quitó "Borrar todos los registros" (poca utilidad).
- El botón de guardar solo aparece cuando el formulario está completo (antes se mostraba siempre, deshabilitado).
- Guardar responde al primer toque aunque el teclado siga abierto (bug clásico de iOS: el primer toque solo cerraba el teclado).
- **Bug real y sutil, ya corregido:** al quitar un filtro, la caja de vista previa quedaba visible y vacía. Causa: `render()` dibujaba dos copias idénticas de la hoja en blanco a la vez (una visible en `#faceFront`, otra de repuesto en `#pageUnder` para las transiciones) con los mismos ids duplicados — el código terminaba ocultando la copia invisible en vez de la visible. Nunca se había notado porque antes del filtro, ese camino directo siempre caía en la portada (que no tiene esos ids), nunca en la hoja en blanco.
- **Bug reportado en el iPhone real, ya corregido:** `resetearAltura()` (commit `6abde19`) hacía que el cuaderno se encogiera visiblemente al deslizar hacia el resumen y volviera a crecer al deslizar hacia el recibo — se quitó esa función y sus dos llamadas (en `commitCambioPagina` y `cambiarMes`); `alturaReferencia` volvió a su comportamiento original de solo crecer, así que el cuaderno mantiene siempre un único tamaño fijo (el grande) sin importar hacia dónde se navegue. Como efecto secundario puede reaparecer algo de hueco vacío bajo el campo Nota en recibos guardados más cortos que el formulario — es la prioridad de Sebas: tamaño fijo por encima del hueco. De paso se le dio más padding/alto mínimo a `#nota`, que se veía cortado.
- **Segunda vuelta al mismo bug de Nota (captura real del iPhone):** con la tarjeta a tamaño fijo, "Nota (opcional)" y su input seguían tapados por el borde inferior de la tarjeta RECIBO. Se redujo el margen inferior del `body` de 28px a 18px (+ safe-area, que se dejó igual) porque sobraba, y ese espacio se usó para subir la altura base del cuaderno: el colchón que se suma a la medición real (`ajustarAltura`) pasó de 110 a 130px y el piso mínimo de 160 a 180px, más el fallback de CSS de 220px a 240px. Sigue siendo un único alto de referencia que solo crece — no se reintrodujo el recálculo por página.
- **Tercera vuelta al mismo bug de Nota (Sebas probó `736e400` en el iPhone real y seguía cortado):** se le sumaron otros 10px a los mismos dos valores — el colchón de `ajustarAltura` pasó de 130 a 140px y el piso mínimo de 180 a 190px, y el fallback de CSS de 240 a 250px. No se tocó el margen inferior de 18px ni el mecanismo de altura fija.

**Lecciones para no repetir:**
- La caché de Safari fue la causa de varios "esto no funcionó" que en realidad sí estaban arreglados — de ahí `serve-sin-cache.py` y la costumbre de pestaña privada / `?v=`.
- Agrandar la tarjeta no siempre resuelve un botón cortado — a veces el problema real es que no hay forma de llegar ahí con el dedo (el gesto de doblar página capturaba el arrastre), no que falte espacio.
- Los ids duplicados en el HTML son peligrosos: `document.getElementById` siempre agarra el primero que encuentra, así que dos copias de una página con el mismo id pueden hacer que el código toque la copia equivocada sin que se note hasta que cambia el flujo que las usa.

## Dirección visual definitiva: "Tinta y Trazo" — sigue sin aplicarse

Sebas ya aprobó esta dirección (papel frío, tinta índigo, serif elegante solo en los montos, variedad sutil entre recibos guardados) en un artifact de exploración. **El código de `index.html` todavía tiene la paleta vintage vieja** (`--emerald`, `--gold`, `--coral`, cursiva `Snell Roundhand`) — falta traducir el diseño aprobado a la app de verdad. No tiene spec ni plan escrito todavía; arrancar por ahí (brainstorming → spec → plan) cuando llegue el momento.

## Lo único que falta de siempre

**Atajo de Siri** — se quedó a medias armando la acción de la URL; sin probar de punta a punta todavía. Todo lo demás (Nota, color del recibo, PWA instalada en hosting real) ya está confirmado en el iPhone real.

## Una sola instrucción para retomar

Cuando Sebas diga **"llama a Ryan"** (o algo parecido, como "sigamos con la app de gastos"), lee este archivo primero — no hace falta que él reexplique nada. Al cierre del 2026-08-06 no hay ningún bug abierto: el campo Nota, el color del recibo y la PWA en hosting real (https://sebasgarzon2004.github.io/sebas-tracker/) están confirmados y funcionando en el iPhone real. Lo próximo a retomar, en el orden de siempre:

1. **Dirección visual "Tinta y Trazo"** — aprobada por Sebas pero todavía sin aplicar al código real (ver sección abajo); ahora que el recibo ya tiene su propio sistema de color por categoría/pago, vale la pena revisar si esa dirección sigue siendo la que quiere o si el color actual del recibo ya le resuelve lo que buscaba.
2. **Atajo de Siri** — de último, solo si Sebas lo pide explícitamente (quedó a medio armar, en la acción de la URL).

Antes de levantar el servidor de nuevo, recordar subir el número de `CACHE_NAME` en `sw.js` si se toca algo real, y cerrar del todo el ícono anclado en el iPhone (no solo la pestaña) para que tome la versión nueva.
