# Comparación con el mes anterior, filtro de categoría y atajo de Siri — Design

**Contexto:** Tras dejar cerrada la dirección visual definitiva ("Tinta y Trazo", explorada aparte en un artifact), Sebas pidió un brainstorming de mejoras para "Mis Gastos". De la lista completa, eligió tres para construir ahora: comparar el total contra el mes anterior, filtrar el cuaderno tocando una categoría del resumen, y un atajo de Siri que abra la app con el gasto ya lleno. La conversión a PWA real queda deliberadamente para después, una vez esto esté construido y probado.

**Restricción de alcance confirmada con Sebas:** la app se queda 100% local — sin servidor, sin cuenta, sin backend. Las tres funciones de este documento se implementan enteramente en `index.html`/`logic.js`, sin nada nuevo del lado de un servidor.

## 1. Comparar el total contra el mes anterior

**Problema:** el resumen solo muestra el total del mes en curso, sin ningún punto de referencia — no hay forma de saber de un vistazo si vas gastando más o menos que antes.

**Decisión:** junto a "Total del mes: $X" aparece un indicador con el cambio porcentual contra el mes calendario inmediatamente anterior (`sumarMeses(mesKey, -1)`, función que ya existe en `logic.js`), por ejemplo "↑20% vs julio".

- **Solo se muestra para meses ya terminados.** Si `mesKey` es el mes actual (`esMesActual === true`, variable que `render()` ya calcula), el indicador no se muestra — comparar un mes a medias contra uno completo es engañoso (siempre parecería que "vas gastando menos"). El indicador solo aparece al ver un mes pasado.
- Si el mes anterior no tiene ningún gasto registrado (no existe en `gastosPorMes`, o su total es 0), tampoco se muestra nada — no hay una base real contra la cual comparar.
- Cálculo: `((totalActual - totalAnterior) / totalAnterior) * 100`, redondeado al entero más cercano.
- Si el redondeo da 0% (gasto prácticamente igual), se muestra en tono neutro (`--muted`, sin flecha): "= igual que julio".
- Si es positivo (gastaste más que el mes anterior), flecha `↑` en color `--accent` (el rojo ladrillo del diseño elegido). Si es negativo (gastaste menos), flecha `↓` en un verde/pino discreto — mismo verde que ya se usa para la categoría "Shaun" en la paleta nueva, reutilizado aquí como "señal positiva" genérica, no ligado a ninguna categoría en particular.
- El nombre del mes anterior se muestra abreviado con `nombreMes()` ya existente, o una versión corta si hace falta — se decide en implementación cuál se ve mejor en el espacio disponible.

**Qué no cambia:** `calcularResumenMes`, `agruparPorMes`, el modelo de datos. Solo se agrega la resta/división sobre datos que ya existen, en el momento de renderizar el resumen.

## 2. Filtrar el cuaderno tocando una categoría del resumen

**Problema:** para revisar los recibos de una sola categoría (ej. "¿cuánto y en qué gasté en Shaun este mes?") hay que pasar hoja por hoja por todo el cuaderno, sin ningún atajo.

**Decisión:** tocar una fila del resumen (ej. "Shaun") activa un filtro: el cuaderno salta directo al primer recibo guardado de esa categoría dentro del mes que se está viendo, y desde ahí el arrastre vertical (doblar página) solo recorre los recibos de esa categoría — como si el resto del cuaderno no existiera por un momento.

- **Indicador de filtro activo:** aparece una pequeña etiqueta junto al nombre del mes (ej. "Shaun ✕") mientras el filtro está activo. Tocar la `✕` de esa etiqueta lo quita. Tocar en el resumen la misma categoría que ya está activa también lo quita (funciona como interruptor); tocar una categoría distinta mientras hay un filtro activo cambia el filtro a la nueva categoría.
- **La hoja de "agregar gasto" no aparece mientras hay un filtro activo** — es un modo de repaso, no de registro. Si el usuario quiere agregar un gasto nuevo, primero tiene que quitar el filtro (tocando la `✕`).
- **El resumen de totales no cambia** con el filtro — se sigue mostrando siempre completo, con las 5 categorías y sus montos, sea cual sea el filtro activo. Solo el recorrido del cuaderno se enfoca.
- **El filtro persiste al cambiar de mes.** Si Sebas filtra por "Shaun" y luego pasa a otro mes (con las flechas del encabezado o el swipe), el filtro se mantiene — sigue queriendo ver solo Shaun — y el cuaderno salta al primer recibo de Shaun de ese mes nuevo. Si ese mes no tiene ningún gasto de esa categoría, se muestra la portada normalmente (sin recibos que filtrar) con la etiqueta de filtro igual visible, lista para cuando sí haya datos.
- **Si el gasto anulado era el único que quedaba filtrado**, el cuaderno vuelve a la portada del mes, filtro y todo, en vez de quedar en una posición inválida.

**Impacto técnico esperado (a confirmar en el plan):** hoy `obtenerPaginas(gastosDelMes, esMesActual)` decide qué entra al arreglo de páginas navegables. El filtro probablemente se resuelve agregando un parámetro opcional de categoría a esa función (o a una nueva función pura en `logic.js`, testeada igual que las demás), de forma que el filtrado de páginas sea una operación pura y testeable — no lógica de UI mezclada con el DOM. El estado del filtro en sí (qué categoría, si está activo) vive en `estado` (el objeto de UI en `index.html`), igual que `mesIndex`/`posicion` hoy.

## 3. Atajo de Siri (Apple Shortcuts + parámetros en la URL)

**Problema:** registrar un gasto siempre requiere abrir la app y tocar varias veces. Un atajo de voz ("Oye Siri, agrega un gasto de $20.000 en Salidas") podría ahorrar ese recorrido para el caso más común.

**Decisión:** la app lee parámetros de la URL al cargar (`?monto=20000&categoria=Salidas`, con `pago` y `nota` opcionales) y, si vienen presentes, salta directo a la hoja en blanco con esos campos ya llenos — monto formateado con punto de miles como si se hubiera escrito a mano, categoría y forma de pago ya seleccionadas (sus chips ya ocultos, como si se hubieran tocado), nota si vino incluida.

- **No se guarda solo.** Sebas confirmó que prefiere revisar antes de guardar — el atajo deja todo listo, pero el botón "Guardar gasto" hay que tocarlo igual. Esto evita que un error de reconocimiento de voz (un monto mal entendido) quede guardado sin que nadie lo vea.
- `categoria` debe coincidir exactamente con uno de los valores de `CATEGORIAS` (`Shaun`, `Swift`, `Salidas`, `Gastos Personales`, `Hogar`); `pago` con uno de `PAGOS` (`BreB`, `RappiCard`, `Efectivo`). Si no coincide (typo, mayúscula distinta, etc.), ese campo específico simplemente no se preselecciona — no se rompe nada, el usuario lo completa a mano como si el atajo no hubiera mandado ese dato.
- Después de leer los parámetros, la URL se limpia (`history.replaceState`) para que recargar la página no vuelva a disparar el mismo prellenado.
- **Limitación conocida, aceptada por ahora:** como la app corre desde el servidor local (`serve-sin-cache.py`) y no desde un hosting real, el atajo de Siri tiene que apuntar a la IP local de la compu de Sebas. Si esa IP cambia (cambio de red wifi), el atajo deja de funcionar hasta actualizar la URL guardada en Apple Shortcuts. Se resuelve del todo cuando se haga la conversión a PWA con hosting real, que queda fuera de este documento a propósito.
- La configuración del Atajo en sí (crear el shortcut en la app de Apple Shortcuts, pedirle a Siri que abra una URL con esos parámetros armados a partir de lo dictado) es un paso manual que hace Sebas en su iPhone — no es código que se construya en este repo, y no forma parte del plan de implementación.

## Qué NO cambia

- Modelo de datos (`{ id, monto, categoria, pago, nota, fecha }`) y clave de `localStorage` (`gastos_v1`).
- Categorías y formas de pago.
- La dirección visual ya elegida ("Tinta y Trazo") — este documento no rediseña nada, construye sobre lo que ya está aprobado.
- La app se mantiene 100% estática y local; no se agrega ningún backend, cuenta, ni sincronización.
- La conversión a PWA (manifest.json, service worker, hosting real) queda fuera de alcance — es la siguiente ronda, después de que esto quede construido y probado.
