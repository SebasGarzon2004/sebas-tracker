# Diseño: "Mis Gastos" como libreta de recibos vintage

Fecha: 2026-08-03
Proyecto: `/home/sebas/gastos-tracker` (app "Mis Gastos")
Agente responsable del diseño y arquitectura: Ryan (`.claude/agents/ryan.md`)

## Contexto

La app ya existe como un prototipo funcional de un solo archivo (`index.html`, HTML+CSS+JS inline, sin dependencias externas, persistencia en `localStorage` bajo la clave `gastos_v1`). Este spec rediseña por completo la interfaz y la interacción de esa app, manteniendo la arquitectura de archivo único y el esquema de datos existente.

La app es de uso estrictamente personal y local: vive solo en el iPhone de Sebas, sin backend, sin sincronización en la nube, y debe ser tan simple de operar que alguien sin ninguna familiaridad con la tecnología (referencia explícita: la mamá de Sebas) la pueda usar sin instrucciones.

## Objetivo del rediseño

Reemplazar la interfaz genérica actual (formulario + hoja deslizante + lista) por una metáfora física completa: la app se siente como una **libreta de recibos vintage**, con hojas que se doblan de verdad al pasar de página y cuadernos mensuales que se deslizan como un archivo de gastos.

## Modelo de datos

Sin cambios respecto al prototipo actual. Cada gasto se guarda en `localStorage` (clave `gastos_v1`) como:

```
{ id, monto, categoria, pago, fecha }
```

`categoria` es una de: Shaun, Swift, Salidas, Gastos Personales, Hogar.
`pago` es una de: BreB, RappiCard, Efectivo.
`fecha` es un string ISO.

**Los "cuadernos" (meses) no se almacenan como una entidad aparte.** Se calculan en tiempo de render agrupando los gastos existentes por año y mes de su `fecha`. Esto significa que no hace falta ninguna migración de datos: los gastos ya guardados durante las pruebas anteriores del prototipo se siguen viendo, ahora agrupados automáticamente por mes.

## Estructura de navegación

La interfaz tiene dos ejes de navegación, cada uno atado a un gesto:

**Eje horizontal (deslizar a los lados) → cambia de cuaderno (mes).**
- Deslizar a la izquierda retrocede a meses anteriores. El límite es el mes más antiguo que tenga al menos un gasto registrado — no existen cuadernos vacíos "de relleno" para meses sin nada.
- Deslizar a la derecha avanza a meses más recientes. El límite es el mes actual (no existen cuadernos de meses futuros).
- Al entrar a cualquier cuaderno (por primera vez o al volver a él), siempre aterrizas primero en su **portada**.
- Si se intenta pasar de cualquiera de los dos límites, el cuaderno se resiste y rebota de vuelta a su posición, en vez de no responder o saltar a la nada.

**Eje vertical (deslizar arriba/abajo) → navega las páginas dentro del cuaderno abierto.**

Dentro de un cuaderno, las posiciones de arriba hacia abajo son, en este orden:

1. **Portada** — nombre del mes y su total gastado.
2. **Hoja en blanco** — lista para registrar un gasto nuevo. Solo existe en el cuaderno del mes actual; los cuadernos de meses ya cerrados no tienen hoja en blanco.
3. **Gastos guardados**, del más reciente al más antiguo dentro de ese mes.

- Deslizar hacia **arriba** mueve hacia lo más nuevo (de un gasto guardado hacia el siguiente más reciente, luego hacia la hoja en blanco, luego hacia la portada).
- Deslizar hacia **abajo** mueve hacia lo más viejo (de la portada a la hoja en blanco, de ahí al gasto más reciente, y hacia atrás en el tiempo).
- Igual que en el eje horizontal, pasar de los límites (el gasto más antiguo del mes, o la portada) produce un rebote, no un salto ni un silencio.

## Flujo de registrar un gasto

1. Sobre la hoja en blanco del mes actual, el usuario elige categoría y forma de pago con botones grandes tipo sello (selección única por grupo), y escribe el monto.
2. A medida que se eligen los datos, el recibo en la hoja se autocompleta con una animación de máquina de escribir (las letras de cada dato aparecen una por una), no con una escritura manual del usuario sobre el papel.
3. El botón "Guardar gasto" solo se habilita (y se enciende) cuando los tres datos están completos.
4. Al presionar guardar: aparece brevemente un sello rojo de "GUARDADO" sobre la hoja, y esta se dobla hacia atrás (mismo sentido visual que deslizar hacia abajo) para archivarse como el gasto más reciente. Simultáneamente aparece una hoja en blanco nueva en su lugar, lista para el siguiente registro.

## Totales visibles

Una franja de totales permanece siempre visible, fuera del cuaderno (no hay que deslizar para verla). Muestra el total y el desglose por categoría **del mes que se está viendo en ese momento** — cambia según en qué cuaderno estés parado. Esto es intencional: cuando un mes se cierra, su portada ya queda como el registro final de ese mes, y la franja de arriba es simplemente un espejo en vivo de esa portada mientras la estás viendo.

## Borrar gastos

Cada hoja ya escrita tiene un botón discreto para anular ese gasto individual, con una confirmación antes de borrar. Se mantiene también, bien escondido (no como acción principal), un botón para borrar todos los registros guardados.

## Sistema visual

Dirección: vintage americano, con más peso hacia la estética de diner/Americana de los años 50 (rojo cereza, crema, cursiva pintada a mano) que hacia la de oficina de contador, pero con detalles de esta última como textura secundaria (papel kraft, sellos).

- **Paleta**: papel crema al frente de cada hoja, kraft oscuro en el reverso (visible durante el doblez). Rojo cereza como acento principal (sello de "guardado", detalles clave). Colores de sello por categoría: Shaun = esmeralda, Swift = dorado, Salidas = coral, Gastos Personales = gris pizarra, Hogar = café tierra.
- **Tipografía**: máquina de escribir (monoespaciada) para el contenido del recibo; una tipografía serif/slab con carácter para títulos; toques cursivos pintados a mano en el nombre de la app y en la portada de cada mes.
- **Profundidad**: el cuaderno se ve con grosor real — varias hojas apiladas detrás de la hoja visible, con sombras en capas.
- **Animaciones**: máquina de escribir al llenar la hoja en blanco; doblez de página con sombra de pliegue y sello rojo al guardar; el cuaderno y las hojas siguen el dedo mientras se arrastra, no solo saltan al soltar.

## Decisión de implementación

Todo se construye en CSS y JavaScript puro dentro del mismo `index.html`, sin librerías externas ni Canvas/WebGL. Se descartó dibujar la escena en Canvas (el texto dejaría de ser seleccionable/accesible, y añade complejidad de mantenimiento innecesaria) y se descartó usar una librería de terceros para el efecto de pasar páginas (rompería la regla de cero dependencias externas y cero necesidad de internet, y añadiría código de un tercero sin revisar). La profundidad y el realismo del doblez se logran con hojas apiladas, sombras en capas, y seguimiento del gesto en tiempo real — no con física de papel exacta.

## Casos borde

- **Primera vez / sin historial**: el cuaderno del mes actual existe con total en $0 y su hoja en blanco lista; no hay nada más atrás para hojear.
- **Límites de navegación** (mes más antiguo, mes actual, gasto más antiguo del mes, portada): rebote visual, nunca un salto brusco ni ausencia de respuesta.
- **Compatibilidad de datos**: los gastos guardados durante las pruebas del prototipo anterior se siguen viendo igual, agrupados automáticamente por mes según su fecha.

## Verificación manual

No hay manera de tener pruebas automatizadas para una interfaz gestual como esta, así que la verificación es manual, en el navegador con la vista de iPhone activada:

- Registrar un gasto nuevo y confirmar la animación de máquina de escribir y el doblez al guardar.
- Deslizar arriba/abajo dentro de un cuaderno y comprobar los límites (rebote en la portada y en el gasto más antiguo).
- Deslizar a los lados entre meses y comprobar que la franja de totales cambia según el mes visible, y que no se puede pasar del mes actual ni de un mes sin gastos anteriores.
- Insertar gastos de prueba con fechas de otros meses directamente en el almacenamiento del navegador (sin esperar a que pase un mes real) para confirmar que la agrupación mensual funciona.
- Anular un gasto individual y confirmar la confirmación previa antes de borrar.

## Fuera de alcance (por ahora)

- Sincronización en la nube o respaldo fuera del propio iPhone.
- Notificaciones push.
- Gráficas o reportes más allá del total y el desglose por categoría del mes visible.
- Instalación real en el iPhone como app de pantalla de inicio (paso pendiente ya identificado: requiere subir el archivo a un hosting estático).
