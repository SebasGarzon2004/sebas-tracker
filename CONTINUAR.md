# Para continuar — Mis Gastos (libreta de recibos)

Este archivo es para que, cuando vuelvas a abrir esto y llames a Ryan, retome exactamente donde quedó — sin que tengas que volver a explicar nada.

**Ubicación:** todo esto vive en `/home/sebas/universidad/gastos-tracker`, directo en Home, separado de `/home/sebas/TUM` — no hay nada de esta app ni del agente Ryan guardado dentro de TUM.

## Dónde está todo ahora mismo

- Repo principal: `/home/sebas/universidad/gastos-tracker`, en `master`, commit `7f0dfb8`.
- No hay ningún worktree activo — todo el trabajo reciente se hizo commit por commit directo sobre `master`.
- Las 12 pruebas de `node --test logic.test.js` pasan.
- Servidor local para probar en el iPhone: `python3 serve-sin-cache.py 8010` (no usar `python3 -m http.server` a secas — Safari cachea versiones viejas y ya dio dolores de cabeza; este script manda `Cache-Control: no-store` en cada respuesta). Si Safari sigue mostrando algo viejo después de eso, hay que probar en una pestaña de **Navegación privada** — cerrar y reabrir la pestaña normal NO vacía la caché de archivos.

## Lo que se hizo y ya está en `master`

**Ronda 1 y Ronda 2** (pulido visual, doblez interactivo, rediseño vintage completo) — ya fusionadas hace tiempo, sin pendientes propios.

**Después de esas rondas, una tanda larga de ajustes en vivo probando en el iPhone real de Sebas** (todo ya en `master`, cada uno su propio commit descriptivo — no hace falta releerlos para continuar, solo saber que existen):
- Se reemplazó el doblez de página 3D (rotateX + perspective) por una animación 2D de deslizar/rotar/desvanecer — el 3D nunca se vio bien ni fluido pese a varios intentos; el reemplazo sí funcionó.
- El botón de guardar, el tamaño de la tarjeta, y el orden en que aparecen los campos se ajustaron varias veces por problemas reales de espacio en pantalla (teclado tapando el botón, campos duplicados con su vista previa, etc.).
- Los chips de categoría/pago se ocultan por completo al elegir uno (no solo los no elegidos), con una `×` en la vista previa para deshacer.
- El monto ahora se escribe con punto de miles en vivo, y también se oculta al confirmarlo (mismo patrón que los chips).
- Se agregaron flechas visibles `‹ ›` para cambiar de mes (ya existía el swipe, pero no había forma visible de descubrirlo), más un swipe horizontal dedicado sobre el encabezado del mes (el gesto compartido con el doblez de página no respondía bien en touch real).
- Se puede navegar 2 meses antes/después del actual aunque estén vacíos (antes solo se podía ir a meses con datos).

## Dirección visual definitiva: "Tinta y Trazo" — **decidida pero NO aplicada todavía**

Sebas no quedó conforme con el look vintage-crema-cursiva original y pidió explorar alternativas. Se hizo un brainstorming visual completo en un artifact (papel frío, tinta índigo, serif elegante solo en los montos, con variedad sutil entre recibos — rotación, doblez de esquina, grano de papel — para que el cuaderno no se sienta repetido). **Sebas ya aprobó esta dirección como la definitiva.**

**Pendiente real, no un "nice to have":** ese diseño solo existe en el artifact de exploración — el código de `index.html` todavía tiene la paleta vintage vieja (`--emerald`, `--gold`, `--coral`, cursiva `Snell Roundhand`). Falta traducir "Tinta y Trazo" a la app de verdad: nueva paleta de variables CSS, tipografía serif en los montos, y el detalle de variedad entre recibos guardados (rotación/doblez/grano ligeramente distintos entre sí). Esto no tiene spec ni plan escrito todavía — arrancar por ahí (brainstorming → spec → plan) antes de tocar código, siguiendo el mismo proceso de siempre.

## Ronda 3 — recién cerrada: comparación, filtro y atajo de Siri

De un brainstorming de mejoras (con superpowers), Sebas eligió tres para construir ya:
1. **Comparación con el mes anterior**: "↑20% vs julio" junto al total, solo en meses ya terminados (nunca en el mes actual).
2. **Filtro del cuaderno por categoría**: tocar una fila del resumen salta a esos recibos, con una pastilla "Shaun ✕" para quitarlo; mientras está activo no aparece la hoja de agregar gasto.
3. **Atajo de Siri**: la app lee `?monto=&categoria=&pago=&nota=` de la URL y prellena la hoja en blanco (sin guardar sola — siempre hay que tocar "Guardar gasto").

Spec: `docs/superpowers/specs/2026-08-04-comparacion-filtro-atajo-siri-design.md`. Plan (3 tareas): `docs/superpowers/plans/2026-08-04-comparacion-filtro-atajo-siri.md`. Las 3 tareas se ejecutaron con subagentes (implementador + revisor por tarea), todas aprobadas, más una revisión final del conjunto: **"Ready to merge: Sí"**, 8 hallazgos Menores (ninguno bloqueante). Uno ya se corrigió (la nota del atajo de Siri no respetaba el límite de 140 caracteres al venir por URL). Quedan dos decisiones de UX, sin resolver a propósito porque son gusto de Sebas, no bugs:
- Tocar una fila del resumen mid-registro (con monto/nota ya escritos sin guardar) descarta ese progreso sin avisar ni poder deshacerlo.
- Quitar el filtro de categoría aterriza en la hoja de agregar gasto, no en la portada del mes.

**Explícitamente fuera de alcance de esta ronda, a propósito:** convertir la app en una PWA real (manifest.json + service worker) para dejar de depender del servidor local y de que Sebas tenga que actualizar la URL del Atajo de Siri si cambia de wifi. Es la siguiente ronda natural, después de que el rediseño visual quede aplicado.

## Lo único que falta — pendiente de siempre

**Verificación visual en el iPhone real.** Ningún agente de esta ronda tuvo navegador conectado — la comparación, el filtro (interacción táctil) y sobre todo el atajo de Siri (probado por inspección de código, nunca en pantalla) necesitan que Sebas los pruebe de verdad antes de darlos por cerrados del todo. Con el servidor `serve-sin-cache.py` corriendo, probar `http://<ip-local>:8010/?monto=20000&categoria=Salidas&pago=BreB&nota=prueba` para el atajo.

## Una sola instrucción para retomar

Cuando Sebas diga **"llama a Ryan"** (o algo parecido, como "sigamos con la app de gastos"), lee este archivo primero. Si menciona haber probado en el iPhone, recoge ese feedback y decide con él los siguientes pasos. Si no, pregúntale si quiere: (a) probar lo nuevo en el iPhone, (b) arrancar el rediseño visual "Tinta y Trazo" de verdad, o (c) avanzar con la PWA/hosting.
