# Libreta de recibos vintage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la interfaz actual de "Mis Gastos" por una libreta de recibos vintage: cuadernos mensuales navegables deslizando a los lados, páginas de gastos que se navegan deslizando arriba/abajo y se doblan de verdad al guardar.

**Architecture:** Todo sigue viviendo en `/home/sebas/gastos-tracker/` sin build tools, sin backend, sin librerías externas. Se divide en dos archivos locales: `logic.js` (funciones puras de datos — agrupar por mes, calcular totales, calcular páginas — sin tocar el DOM, para poder probarlas con Node sin navegador) y `index.html` (markup, estilos y JS de interacción/animación/gestos, que carga `logic.js` con un `<script src="logic.js">` normal). Los datos siguen en `localStorage` bajo la clave `gastos_v1`, mismo esquema de siempre.

**Tech Stack:** HTML, CSS y JavaScript vanilla. Sin frameworks, sin npm, sin build. Las pruebas de `logic.js` usan el test runner incluido en Node (`node --test`), que no requiere instalar nada — es solo una herramienta de desarrollo, nunca se sube al teléfono.

## Global Constraints

- Cero dependencias externas y cero necesidad de internet en el artefacto final (`index.html` + `logic.js`) — deben poder abrirse y funcionar sin conexión.
- Persistencia únicamente en `localStorage`, clave `gastos_v1`, esquema `{ id, monto, categoria, pago, fecha }` sin cambios de forma.
- Categorías fijas: Shaun, Swift, Salidas, Gastos Personales, Hogar. Formas de pago fijas: BreB, RappiCard, Efectivo.
- No agregar funciones fuera del spec (sin nube, sin notificaciones, sin gráficas) sin preguntar antes.
- Cada commit se hace con `git -C /home/sebas/gastos-tracker` y sigue el estilo de mensajes ya usado en el repo.

---

## Task 1: `logic.js` — fechas y agrupación por mes

**Files:**
- Create: `logic.js`
- Test: `logic.test.js`

**Interfaces:**
- Produces: `mesKeyDeFecha(fechaISO: string): string` (formato `"YYYY-MM"`), `agruparPorMes(gastos: Array<{fecha,...}>): Record<string, Array<gasto>>` (cada grupo ordenado del gasto más reciente al más viejo), `mesesDisponibles(gastosPorMes: Record<string,Array>, mesActualKey: string): string[]` (ordenado de más viejo a más nuevo, siempre incluye `mesActualKey`).

- [ ] **Step 1: Escribir las pruebas que van a fallar**

Crear `logic.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { mesKeyDeFecha, agruparPorMes, mesesDisponibles } = require('./logic.js');

test('mesKeyDeFecha devuelve año-mes de una fecha ISO', () => {
  assert.strictEqual(mesKeyDeFecha('2026-08-15T10:00:00.000Z'), '2026-08');
  assert.strictEqual(mesKeyDeFecha('2026-01-03T10:00:00.000Z'), '2026-01');
});

test('agruparPorMes agrupa y ordena del más reciente al más viejo', () => {
  const gastos = [
    { id: 1, monto: 1000, categoria: 'Hogar', pago: 'Efectivo', fecha: '2026-08-01T10:00:00.000Z' },
    { id: 2, monto: 2000, categoria: 'Salidas', pago: 'BreB', fecha: '2026-08-15T10:00:00.000Z' },
    { id: 3, monto: 3000, categoria: 'Swift', pago: 'RappiCard', fecha: '2026-07-20T10:00:00.000Z' },
  ];
  const grupos = agruparPorMes(gastos);
  assert.deepStrictEqual(Object.keys(grupos).sort(), ['2026-07', '2026-08']);
  assert.strictEqual(grupos['2026-08'].length, 2);
  assert.strictEqual(grupos['2026-08'][0].id, 2, 'el más reciente de agosto va primero');
  assert.strictEqual(grupos['2026-08'][1].id, 1);
  assert.strictEqual(grupos['2026-07'][0].id, 3);
});

test('mesesDisponibles incluye siempre el mes actual, incluso sin gastos', () => {
  const grupos = { '2026-06': [], '2026-08': [] };
  assert.deepStrictEqual(mesesDisponibles(grupos, '2026-08'), ['2026-06', '2026-08']);
  assert.deepStrictEqual(mesesDisponibles(grupos, '2026-09'), ['2026-06', '2026-08', '2026-09']);
});
```

- [ ] **Step 2: Correr las pruebas y confirmar que fallan**

Run: `cd /home/sebas/gastos-tracker && node --test logic.test.js`
Expected: FAIL — `Error: Cannot find module './logic.js'`

- [ ] **Step 3: Escribir la implementación mínima**

Crear `logic.js`:

```js
function mesKeyDeFecha(fechaISO) {
  const d = new Date(fechaISO);
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${anio}-${mes}`;
}

function agruparPorMes(gastos) {
  const grupos = {};
  for (const g of gastos) {
    const key = mesKeyDeFecha(g.fecha);
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(g);
  }
  for (const key in grupos) {
    grupos[key].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }
  return grupos;
}

function mesesDisponibles(gastosPorMes, mesActualKey) {
  const keys = new Set(Object.keys(gastosPorMes));
  keys.add(mesActualKey);
  return Array.from(keys).sort();
}

if (typeof module !== 'undefined') {
  module.exports = { mesKeyDeFecha, agruparPorMes, mesesDisponibles };
}
```

- [ ] **Step 4: Correr las pruebas y confirmar que pasan**

Run: `cd /home/sebas/gastos-tracker && node --test logic.test.js`
Expected: PASS — 3 pruebas, 0 fallos

- [ ] **Step 5: Commit**

```bash
cd /home/sebas/gastos-tracker
git add logic.js logic.test.js
git commit -m "Agrega agrupación de gastos por mes en logic.js"
```

---

## Task 2: `logic.js` — totales, páginas y clamp

**Files:**
- Modify: `logic.js`
- Modify: `logic.test.js`

**Interfaces:**
- Consumes: nada de la Task 1 directamente (funciones independientes en el mismo archivo).
- Produces: `calcularResumenMes(gastosDelMes: Array<gasto>): { total: number, porCategoria: Record<string, number> }` (con las 5 categorías siempre presentes, aunque sea en 0), `obtenerPaginas(gastosDelMes: Array<gasto>, esMesActual: boolean): Array<'blanco'|gasto>`, `clamp(valor: number, minimo: number, maximo: number): number`.

- [ ] **Step 1: Escribir las pruebas que van a fallar**

Añadir al final de `logic.test.js`:

```js
const { calcularResumenMes, obtenerPaginas, clamp } = require('./logic.js');

test('calcularResumenMes suma el total y el desglose por categoría', () => {
  const gastos = [
    { id: 1, monto: 1000, categoria: 'Hogar', pago: 'Efectivo', fecha: '2026-08-01T10:00:00.000Z' },
    { id: 2, monto: 2000, categoria: 'Hogar', pago: 'BreB', fecha: '2026-08-02T10:00:00.000Z' },
    { id: 3, monto: 500, categoria: 'Salidas', pago: 'Efectivo', fecha: '2026-08-03T10:00:00.000Z' },
  ];
  const resumen = calcularResumenMes(gastos);
  assert.strictEqual(resumen.total, 3500);
  assert.strictEqual(resumen.porCategoria.Hogar, 3000);
  assert.strictEqual(resumen.porCategoria.Salidas, 500);
  assert.strictEqual(resumen.porCategoria.Shaun, 0, 'las categorías sin gastos quedan en 0, no ausentes');
  assert.strictEqual(resumen.porCategoria.Swift, 0);
  assert.strictEqual(resumen.porCategoria['Gastos Personales'], 0);
});

test('obtenerPaginas antepone la hoja en blanco solo en el mes actual', () => {
  const gastos = [{ id: 1, monto: 100, categoria: 'Hogar', pago: 'Efectivo', fecha: '2026-08-01T10:00:00.000Z' }];
  assert.deepStrictEqual(obtenerPaginas(gastos, true), ['blanco', gastos[0]]);
  assert.deepStrictEqual(obtenerPaginas(gastos, false), [gastos[0]]);
  assert.deepStrictEqual(obtenerPaginas([], true), ['blanco']);
});

test('clamp limita un valor entre un mínimo y un máximo', () => {
  assert.strictEqual(clamp(5, 0, 3), 3);
  assert.strictEqual(clamp(-2, 0, 3), 0);
  assert.strictEqual(clamp(2, 0, 3), 2);
});
```

- [ ] **Step 2: Correr las pruebas y confirmar que fallan**

Run: `cd /home/sebas/gastos-tracker && node --test logic.test.js`
Expected: FAIL — `calcularResumenMes is not defined` (o `not a function`)

- [ ] **Step 3: Escribir la implementación mínima**

Añadir a `logic.js`, antes del bloque `if (typeof module ...)`:

```js
const CATEGORIAS = ['Shaun', 'Swift', 'Salidas', 'Gastos Personales', 'Hogar'];

function calcularResumenMes(gastosDelMes) {
  const porCategoria = {};
  for (const cat of CATEGORIAS) porCategoria[cat] = 0;
  let total = 0;
  for (const g of gastosDelMes) {
    total += g.monto;
    porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.monto;
  }
  return { total, porCategoria };
}

function obtenerPaginas(gastosDelMes, esMesActual) {
  return esMesActual ? ['blanco', ...gastosDelMes] : [...gastosDelMes];
}

function clamp(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}
```

Y actualizar el `module.exports` para incluir las nuevas funciones y `CATEGORIAS`:

```js
if (typeof module !== 'undefined') {
  module.exports = {
    CATEGORIAS,
    mesKeyDeFecha, agruparPorMes, mesesDisponibles,
    calcularResumenMes, obtenerPaginas, clamp
  };
}
```

- [ ] **Step 4: Correr las pruebas y confirmar que pasan**

Run: `cd /home/sebas/gastos-tracker && node --test logic.test.js`
Expected: PASS — 6 pruebas, 0 fallos

- [ ] **Step 5: Commit**

```bash
cd /home/sebas/gastos-tracker
git add logic.js logic.test.js
git commit -m "Agrega totales por categoría, páginas del cuaderno y clamp a logic.js"
```

---

## Task 3: Esqueleto de `index.html` con navegación por botones

Construye el estado de navegación (mes actual, posición dentro del cuaderno) usando botones simples de una sola pulsación — sin gestos ni animaciones todavía. Esto valida que la máquina de estados (límites, rebotes, aterrizar en portada) funciona antes de complicarla con gestos táctiles.

**Files:**
- Create: `index.html` (reemplaza por completo el prototipo anterior)

**Interfaces:**
- Consumes: `mesKeyDeFecha`, `agruparPorMes`, `mesesDisponibles`, `calcularResumenMes`, `obtenerPaginas`, `clamp`, `CATEGORIAS` de `logic.js` (Tasks 1-2).
- Produces: variable global `estado = { mesIndex: number|null, posicion: number }` y función `render()`, que las Tasks 4-9 seguirán extendiendo.

- [ ] **Step 1: Crear el esqueleto**

Crear `index.html`:

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Gastos">
<title>Mis Gastos</title>
<style>
  body { font-family: -apple-system, sans-serif; margin: 0; padding: 16px; max-width: 480px; margin-inline: auto; }
  #totales { padding: 14px; border: 1px solid #ccc; border-radius: 10px; margin-bottom: 18px; }
  #pagina { padding: 18px; border: 1px solid #ccc; border-radius: 10px; min-height: 200px; }
  #controles { display: flex; justify-content: space-between; margin-top: 16px; gap: 8px; }
  #controles button { padding: 12px 14px; font-size: 1rem; }
  #controles button:disabled { opacity: 0.3; }
</style>
</head>
<body>
  <div id="totales"></div>
  <div id="pagina"></div>
  <div id="controles">
    <button id="btnMesAnterior">◀ Mes</button>
    <button id="btnArriba">▲</button>
    <button id="btnAbajo">▼</button>
    <button id="btnMesSiguiente">Mes ▶</button>
  </div>

<script src="logic.js"></script>
<script>
  const KEY = 'gastos_v1';

  function cargarGastos() { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  function guardarGastos(gastos) { localStorage.setItem(KEY, JSON.stringify(gastos)); }
  function moneda(n) { return '$' + Math.round(n).toLocaleString('es-CO'); }
  function mesActualKey() { return mesKeyDeFecha(new Date().toISOString()); }

  let estado = { mesIndex: null, posicion: -1 };

  function render() {
    const gastos = cargarGastos();
    const gastosPorMes = agruparPorMes(gastos);
    const mesActual = mesActualKey();
    const meses = mesesDisponibles(gastosPorMes, mesActual);

    if (estado.mesIndex === null) estado.mesIndex = meses.indexOf(mesActual);
    estado.mesIndex = clamp(estado.mesIndex, 0, meses.length - 1);

    const mesKey = meses[estado.mesIndex];
    const esMesActual = mesKey === mesActual;
    const gastosDelMes = gastosPorMes[mesKey] || [];
    const resumen = calcularResumenMes(gastosDelMes);
    const paginas = obtenerPaginas(gastosDelMes, esMesActual);

    estado.posicion = clamp(estado.posicion, -1, paginas.length - 1);

    document.getElementById('totales').innerHTML = `
      <strong>${nombreMes(mesKey)}</strong><br>
      Total: ${moneda(resumen.total)}<br>
      ${CATEGORIAS.map(cat => `${cat}: ${moneda(resumen.porCategoria[cat])}`).join(' · ')}
    `;

    const pagina = document.getElementById('pagina');
    if (estado.posicion === -1) {
      pagina.textContent = `Portada de ${nombreMes(mesKey)} — total ${moneda(resumen.total)}`;
    } else {
      const contenido = paginas[estado.posicion];
      pagina.textContent = contenido === 'blanco'
        ? 'Hoja en blanco — aquí se registra el gasto nuevo (llega en la Task 4)'
        : `${contenido.categoria} · ${contenido.pago} · ${moneda(contenido.monto)}`;
    }

    document.getElementById('btnMesAnterior').disabled = estado.mesIndex === 0;
    document.getElementById('btnMesSiguiente').disabled = estado.mesIndex === meses.length - 1;
    document.getElementById('btnArriba').disabled = estado.posicion === -1;
    document.getElementById('btnAbajo').disabled = estado.posicion === paginas.length - 1;
  }

  function nombreMes(mesKey) {
    const NOMBRES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const [anio, mes] = mesKey.split('-').map(Number);
    return `${NOMBRES[mes - 1]} ${anio}`;
  }

  document.getElementById('btnMesAnterior').addEventListener('click', () => { estado.mesIndex -= 1; estado.posicion = -1; render(); });
  document.getElementById('btnMesSiguiente').addEventListener('click', () => { estado.mesIndex += 1; estado.posicion = -1; render(); });
  document.getElementById('btnArriba').addEventListener('click', () => { estado.posicion -= 1; render(); });
  document.getElementById('btnAbajo').addEventListener('click', () => { estado.posicion += 1; render(); });

  render();
</script>
</body>
</html>
```

- [ ] **Step 2: Verificación manual**

Run: `cd /home/sebas/gastos-tracker && python3 -m http.server 8765`

Abrir `http://localhost:8765/index.html` (con la vista de iPhone activada en el inspector) y confirmar:
- La franja de totales muestra el mes y año actuales con total $0.
- La página muestra el texto de portada.
- El botón ▲ está deshabilitado (ya estás en portada) y ▼ no.
- Al pulsar ▼ una vez, aparece el texto de la hoja en blanco; al pulsar ▼ otra vez, el botón se deshabilita (no hay más páginas).
- Los botones de mes están deshabilitados en ambos sentidos (solo existe el mes actual).
- Abrir la consola del navegador y ejecutar:
  ```js
  localStorage.setItem('gastos_v1', JSON.stringify([{id:1, monto:5000, categoria:'Hogar', pago:'Efectivo', fecha:'2026-06-10T10:00:00.000Z'}]));
  location.reload();
  ```
  y confirmar que ahora `◀ Mes` está habilitado y te lleva a la portada de junio con el gasto guardado.

- [ ] **Step 3: Commit**

```bash
cd /home/sebas/gastos-tracker
git add index.html
git commit -m "Reescribe index.html con la máquina de estados del cuaderno (navegación por botones)"
```

---

## Task 4: Registrar un gasto en la hoja en blanco

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `estado`, `render()`, `cargarGastos()`, `guardarGastos()`, `moneda()`, `CATEGORIAS` de la Task 3; añade `PAGOS` local.
- Produces: `seleccion = { categoria: string|null, pago: string|null }`, función `guardarGasto()` que usan las Tasks 5-8.

- [ ] **Step 1: Reemplazar el render de la página por una versión con sub-plantillas**

En `index.html`, reemplazar el bloque que arma `#pagina` (dentro de `render()`) por una llamada a una función dedicada, y añadir esa función y su soporte:

```js
// Reemplaza el bloque `const pagina = document.getElementById('pagina'); ...` por:
renderPagina(estado.posicion === -1 ? 'portada' : paginas[estado.posicion], mesKey, resumen);
```

```js
const PAGOS = ['BreB', 'RappiCard', 'Efectivo'];
let seleccion = { categoria: null, pago: null };

function renderPagina(contenido, mesKey, resumen) {
  const pagina = document.getElementById('pagina');

  if (contenido === 'portada') {
    pagina.innerHTML = `<div class="portada"><h2>${nombreMes(mesKey)}</h2><p>Total: ${moneda(resumen.total)}</p></div>`;
    return;
  }

  if (contenido === 'blanco') {
    pagina.innerHTML = `
      <div class="hoja-blanco">
        <input type="number" id="monto" inputmode="decimal" placeholder="Monto">
        <div class="chips" id="chipsCategoria">
          ${CATEGORIAS.map(c => `<button type="button" class="chip" data-cat="${c}">${c}</button>`).join('')}
        </div>
        <div class="chips" id="chipsPago">
          ${PAGOS.map(p => `<button type="button" class="chip" data-pago="${p}">${p}</button>`).join('')}
        </div>
        <button id="guardarBtn" disabled>Guardar gasto</button>
      </div>
    `;
    marcarSeleccionActiva();
    actualizarGuardar();
    return;
  }

  pagina.innerHTML = `
    <div class="hoja-escrita">
      <p>${contenido.categoria}</p>
      <p>${contenido.pago}</p>
      <p>${moneda(contenido.monto)}</p>
    </div>
  `;
}

function marcarSeleccionActiva() {
  document.querySelectorAll('#chipsCategoria .chip').forEach(b => b.classList.toggle('selected', b.dataset.cat === seleccion.categoria));
  document.querySelectorAll('#chipsPago .chip').forEach(b => b.classList.toggle('selected', b.dataset.pago === seleccion.pago));
}

function actualizarGuardar() {
  const btn = document.getElementById('guardarBtn');
  const montoInput = document.getElementById('monto');
  if (!btn || !montoInput) return;
  const monto = parseFloat(montoInput.value);
  btn.disabled = !(monto > 0 && seleccion.categoria && seleccion.pago);
}

function guardarGasto() {
  const monto = parseFloat(document.getElementById('monto').value);
  if (!(monto > 0) || !seleccion.categoria || !seleccion.pago) return;
  const gastos = cargarGastos();
  gastos.push({ id: Date.now(), monto, categoria: seleccion.categoria, pago: seleccion.pago, fecha: new Date().toISOString() });
  guardarGastos(gastos);
  seleccion = { categoria: null, pago: null };
  render();
}

document.getElementById('pagina').addEventListener('click', (e) => {
  const catBtn = e.target.closest('#chipsCategoria .chip');
  if (catBtn) { seleccion.categoria = catBtn.dataset.cat; marcarSeleccionActiva(); actualizarGuardar(); return; }
  const pagoBtn = e.target.closest('#chipsPago .chip');
  if (pagoBtn) { seleccion.pago = pagoBtn.dataset.pago; marcarSeleccionActiva(); actualizarGuardar(); return; }
  if (e.target.id === 'guardarBtn') guardarGasto();
});

document.getElementById('pagina').addEventListener('input', (e) => {
  if (e.target.id === 'monto') actualizarGuardar();
});
```

Añadir estilos mínimos para que los chips sean tocables:

```css
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0; }
.chip { padding: 8px 12px; border: 1.5px solid #ccc; border-radius: 8px; background: white; }
.chip.selected { border-color: #1F6F54; background: #e6f2ee; }
#monto { font-size: 1.4rem; width: 100%; padding: 8px; box-sizing: border-box; }
#guardarBtn { width: 100%; padding: 12px; margin-top: 10px; }
#guardarBtn:disabled { opacity: 0.4; }
```

- [ ] **Step 2: Verificación manual**

Recargar `http://localhost:8765/index.html`, deslizar (con el botón ▼) a la hoja en blanco, y confirmar:
- Tocar una categoría y una forma de pago las marca como seleccionadas (se ven distintas).
- Escribir un monto y tener categoría + pago elegidos habilita "Guardar gasto".
- Al guardar, la franja de totales se actualiza, y al pulsar ▼ aparece el gasto recién guardado con sus datos correctos; ▲ vuelve a la hoja en blanco (ahora vacía otra vez).

- [ ] **Step 3: Commit**

```bash
cd /home/sebas/gastos-tracker
git add index.html
git commit -m "Agrega el flujo de registrar un gasto en la hoja en blanco"
```

---

## Task 5: Animación de máquina de escribir

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `seleccion` de la Task 4.
- Produces: `escribirTexto(el, texto)`, `actualizarRecibo()`.

- [ ] **Step 1: Añadir la vista previa del recibo y la animación**

Añadir dentro del template de `'blanco'` en `renderPagina` (antes del botón guardar) un contenedor:

```html
<div class="recibo-preview"><pre id="reciboPreview"></pre></div>
```

Y en el bloque `if (contenido === 'blanco') { ... }`, después de `actualizarGuardar();`, llamar `actualizarRecibo();`.

Añadir las funciones:

```js
function textoRecibo() {
  const montoInput = document.getElementById('monto');
  const monto = montoInput ? parseFloat(montoInput.value) : NaN;
  const partes = [];
  if (seleccion.categoria) partes.push(`Categoría: ${seleccion.categoria}`);
  if (seleccion.pago) partes.push(`Pago: ${seleccion.pago}`);
  if (monto > 0) partes.push(`Monto: ${moneda(monto)}`);
  return partes.join('\n');
}

function escribirTexto(el, texto) {
  clearInterval(el._intervalo);
  el.textContent = '';
  let i = 0;
  el._intervalo = setInterval(() => {
    el.textContent += texto[i];
    i += 1;
    if (i >= texto.length) clearInterval(el._intervalo);
  }, 18);
}

function actualizarRecibo() {
  const el = document.getElementById('reciboPreview');
  if (el) escribirTexto(el, textoRecibo());
}
```

Llamar `actualizarRecibo();` también dentro de los tres lugares donde ya se llama `actualizarGuardar()` en los listeners de clic e input (chip de categoría, chip de pago, y el input de monto).

- [ ] **Step 2: Verificación manual**

Recargar la página, ir a la hoja en blanco, y confirmar que al tocar una categoría, luego una forma de pago, y luego escribir un monto, el recuadro del recibo se va llenando letra por letra en cada paso (no aparece todo de golpe).

- [ ] **Step 3: Commit**

```bash
cd /home/sebas/gastos-tracker
git add index.html
git commit -m "Agrega animación de máquina de escribir al llenar el recibo"
```

---

## Task 6: Doblez de página con sombra y sello al guardar/navegar

Reestructura `#pagina` en una hoja con cara y reverso (técnica validada en el brainstorming: `face-front` / `face-back` con `backface-visibility: hidden`, más una página debajo que ya tiene el contenido siguiente).

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `renderPagina` (Task 4), `estado`, `render()`.
- Produces: `moverPagina(direccion)` (reemplaza el cambio directo de `estado.posicion` en los botones ▲/▼), `guardarGasto()` extendido con animación.

- [ ] **Step 1: Reestructurar el markup del cuaderno**

Reemplazar `<div id="pagina"></div>` por:

```html
<div id="notebook">
  <div class="spiral"></div>
  <div id="pageUnder" class="pagina-cara"></div>
  <div id="leaf" class="leaf">
    <div id="faceFront" class="pagina-cara face-front"></div>
    <div class="face face-back"></div>
    <div class="crease-shadow"></div>
  </div>
  <div id="stamp" class="stamp">GUARDADO</div>
</div>
```

- [ ] **Step 2: Estilos del doblez**

Añadir a `<style>`:

```css
.spiral { width: 100%; height: 14px; background: repeating-linear-gradient(90deg,#8a6a4e 0 6px, transparent 6px 14px); margin-bottom: -6px; position: relative; z-index: 5; }
#notebook { position: relative; width: 100%; min-height: 220px; perspective: 1400px; }
.pagina-cara, .leaf, .face { position: absolute; inset: 0; border-radius: 6px; }
.pagina-cara { background: #f4ead2; border: 2px solid #8a6a4e; padding: 18px; box-sizing: border-box; box-shadow: 0 10px 20px rgba(0,0,0,.25); }
.leaf { transform-style: preserve-3d; transform-origin: top center; }
.face { backface-visibility: hidden; border: 2px solid #8a6a4e; box-sizing: border-box; padding: 18px; box-shadow: 0 10px 20px rgba(0,0,0,.25); }
.face-front { background: #f4ead2; }
.face-back { background: #b89f74; transform: rotateX(180deg); }
.crease-shadow { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 40%, rgba(0,0,0,.4) 50%, transparent 60%); opacity: 0; pointer-events: none; }
.stamp { position: absolute; top: 40%; left: 50%; width: 150px; padding: 6px 0; border: 3px solid #c1503b; color: #c1503b; font-weight: bold; text-align: center; letter-spacing: .1em; transform: translate(-50%,-50%) rotate(-14deg) scale(1); opacity: 0; pointer-events: none; z-index: 10; }
.stamp.show { animation: stampPop .9s ease forwards; }
@keyframes stampPop { 0%{opacity:0; transform:translate(-50%,-50%) rotate(-14deg) scale(2.2);} 30%{opacity:1; transform:translate(-50%,-50%) rotate(-14deg) scale(1);} 75%{opacity:1;} 100%{opacity:0; transform:translate(-50%,-50%) rotate(-14deg) scale(1);} }
.leaf.flip-up { animation: flipUp .7s cubic-bezier(.5,-0.2,.3,1.3) forwards; }
.leaf.flip-down { animation: flipDown .7s cubic-bezier(.5,-0.2,.3,1.3) forwards; }
.leaf.flip-up .crease-shadow, .leaf.flip-down .crease-shadow { animation: crease .7s ease forwards; }
@keyframes flipUp { from{transform:rotateX(0deg);} to{transform:rotateX(-180deg);} }
@keyframes flipDown { from{transform:rotateX(-180deg);} to{transform:rotateX(0deg);} }
@keyframes crease { 0%{opacity:0;} 45%{opacity:1;} 55%{opacity:1;} 100%{opacity:0;} }
@media (prefers-reduced-motion: reduce) {
  .leaf.flip-up, .leaf.flip-down, .leaf.flip-up .crease-shadow, .leaf.flip-down .crease-shadow { animation: none; }
}
```

- [ ] **Step 3: Reemplazar `renderPagina` por versión que arma HTML (sin tocarlo directamente) y añadir el mecanismo de doblez**

`renderPagina` ahora debe devolver un string de HTML en vez de escribir directamente en el DOM (para poder ponerlo tanto en `faceFront` como en `pageUnder`):

```js
function htmlDePagina(contenido, mesKey, resumen) {
  if (contenido === 'portada') {
    return `<div class="portada"><h2>${nombreMes(mesKey)}</h2><p>Total: ${moneda(resumen.total)}</p></div>`;
  }
  if (contenido === 'blanco') {
    return `
      <input type="number" id="monto" inputmode="decimal" placeholder="Monto">
      <div class="recibo-preview"><pre id="reciboPreview"></pre></div>
      <div class="chips" id="chipsCategoria">
        ${CATEGORIAS.map(c => `<button type="button" class="chip" data-cat="${c}">${c}</button>`).join('')}
      </div>
      <div class="chips" id="chipsPago">
        ${PAGOS.map(p => `<button type="button" class="chip" data-pago="${p}">${p}</button>`).join('')}
      </div>
      <button id="guardarBtn" disabled>Guardar gasto</button>
    `;
  }
  return `<div class="hoja-escrita"><p>${contenido.categoria}</p><p>${contenido.pago}</p><p>${moneda(contenido.monto)}</p></div>`;
}
```

Y sustituir la función `render()` para que, en vez de escribir directamente el contenido, use el nuevo mecanismo con doblez. Reemplazar el cuerpo de `render()` desde `const paginas = ...` en adelante por:

```js
    const paginas = obtenerPaginas(gastosDelMes, esMesActual);
    estado.posicion = clamp(estado.posicion, -1, paginas.length - 1);

    document.getElementById('totales').innerHTML = `
      <strong>${nombreMes(mesKey)}</strong><br>
      Total: ${moneda(resumen.total)}<br>
      ${CATEGORIAS.map(cat => `${cat}: ${moneda(resumen.porCategoria[cat])}`).join(' · ')}
    `;

    const contenidoActual = estado.posicion === -1 ? 'portada' : paginas[estado.posicion];
    const html = htmlDePagina(contenidoActual, mesKey, resumen);

    if (!window._paginaInicial) {
      document.getElementById('faceFront').innerHTML = html;
      document.getElementById('pageUnder').innerHTML = html;
      window._paginaInicial = true;
    }

    marcarSeleccionActiva();
    actualizarGuardar();
    actualizarRecibo();

    document.getElementById('btnMesAnterior').disabled = estado.mesIndex === 0;
    document.getElementById('btnMesSiguiente').disabled = estado.mesIndex === meses.length - 1;
    document.getElementById('btnArriba').disabled = estado.posicion === -1;
    document.getElementById('btnAbajo').disabled = estado.posicion === paginas.length - 1;

    return { mesKey, esMesActual, gastosDelMes, resumen, paginas, contenidoActual, html };
```

Añadir la función que hace la animación de doblez y reemplaza el contenido, y usarla desde los botones y desde `guardarGasto`:

```js
function moverPagina(direccion) {
  estado.posicion += (direccion === 'arriba' ? -1 : 1);
  const datos = render();
  const leaf = document.getElementById('leaf');
  leaf.classList.remove('flip-up', 'flip-down');
  void leaf.offsetWidth;
  document.getElementById('pageUnder').innerHTML = datos.html;
  leaf.classList.add(direccion === 'arriba' ? 'flip-up' : 'flip-down');
  leaf.addEventListener('animationend', function reset() {
    leaf.style.transform = 'rotateX(0deg)';
    leaf.classList.remove('flip-up', 'flip-down');
    document.getElementById('faceFront').innerHTML = datos.html;
    marcarSeleccionActiva();
    actualizarGuardar();
    actualizarRecibo();
    leaf.removeEventListener('animationend', reset);
  }, { once: true });
}
```

Modificar `guardarGasto()` para animar y mostrar el sello:

```js
function guardarGasto() {
  const monto = parseFloat(document.getElementById('monto').value);
  if (!(monto > 0) || !seleccion.categoria || !seleccion.pago) return;
  const gastos = cargarGastos();
  gastos.push({ id: Date.now(), monto, categoria: seleccion.categoria, pago: seleccion.pago, fecha: new Date().toISOString() });
  guardarGastos(gastos);
  seleccion = { categoria: null, pago: null };

  const stamp = document.getElementById('stamp');
  stamp.classList.remove('show'); void stamp.offsetWidth; stamp.classList.add('show');

  setTimeout(() => moverPagina('abajo'), 250);
}
```

Y cambiar los listeners de ▲/▼ para usar `moverPagina` en vez de tocar `estado.posicion` directamente:

```js
document.getElementById('btnArriba').addEventListener('click', () => moverPagina('arriba'));
document.getElementById('btnAbajo').addEventListener('click', () => moverPagina('abajo'));
```

Los botones de mes siguen llamando a `render()` directamente (cambian de cuaderno, no de hoja, así que no llevan doblez — solo aterrizan en portada):

```js
document.getElementById('btnMesAnterior').addEventListener('click', () => { estado.mesIndex -= 1; estado.posicion = -1; window._paginaInicial = false; render(); });
document.getElementById('btnMesSiguiente').addEventListener('click', () => { estado.mesIndex += 1; estado.posicion = -1; window._paginaInicial = false; render(); });
```

- [ ] **Step 2: Verificación manual**

Recargar la página y confirmar:
- Al pulsar ▼ desde la portada, la hoja se dobla hacia abajo mostrando el reverso kraft a mitad del giro, y aterriza en la hoja en blanco.
- Al guardar un gasto completo, aparece el sello rojo "GUARDADO" y la hoja se dobla, quedando una hoja en blanco nueva arriba y el gasto guardado accesible deslizando hacia abajo.
- Al cambiar de mes (botones de mes), la portada aparece sin animación de doblez (es un cambio de cuaderno, no de hoja).

- [ ] **Step 3: Commit**

```bash
cd /home/sebas/gastos-tracker
git add index.html
git commit -m "Agrega el doblez de página con sombra y sello al guardar y navegar"
```

---

## Task 7: Gestos táctiles reales (reemplazan los botones)

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `moverPagina(direccion)` (Task 6), `estado`, `render()`.
- Produces: manejadores de gesto sobre `#notebook` (vertical) y sobre `body` (horizontal); los botones de la Task 3 se ocultan pero se dejan en el DOM como respaldo de accesibilidad.

- [ ] **Step 1: Ocultar los botones visualmente sin quitarlos del DOM**

En `<style>`, añadir:

```css
#controles { position: absolute; width: 1px; height: 1px; overflow: hidden; opacity: 0; }
```

(Los botones siguen funcionando para quien navegue con teclado/lector de pantalla, pero ya no se ven — la interacción normal es por gesto.)

- [ ] **Step 2: Añadir detección de gesto vertical sobre el cuaderno**

```js
(function gestosVerticales() {
  const notebook = document.getElementById('notebook');
  let inicioY = null;

  function empezar(y) { inicioY = y; }
  function terminar(y) {
    if (inicioY === null) return;
    const deltaY = y - inicioY;
    inicioY = null;
    const UMBRAL = 40;
    if (deltaY <= -UMBRAL) moverPagina('arriba');
    else if (deltaY >= UMBRAL) moverPagina('abajo');
  }

  notebook.addEventListener('touchstart', (e) => empezar(e.touches[0].clientY), { passive: true });
  notebook.addEventListener('touchend', (e) => terminar(e.changedTouches[0].clientY), { passive: true });

  // Respaldo para probar con mouse en el navegador de escritorio
  notebook.addEventListener('mousedown', (e) => empezar(e.clientY));
  notebook.addEventListener('mouseup', (e) => terminar(e.clientY));
})();
```

- [ ] **Step 3: Añadir detección de gesto horizontal para cambiar de mes**

```js
(function gestosHorizontales() {
  let inicioX = null;

  function empezar(x) { inicioX = x; }
  function terminar(x) {
    if (inicioX === null) return;
    const deltaX = x - inicioX;
    inicioX = null;
    const UMBRAL = 60;
    if (deltaX <= -UMBRAL) { estado.mesIndex += 1; estado.posicion = -1; window._paginaInicial = false; render(); }
    else if (deltaX >= UMBRAL) { estado.mesIndex -= 1; estado.posicion = -1; window._paginaInicial = false; render(); }
  }

  document.body.addEventListener('touchstart', (e) => empezar(e.touches[0].clientX), { passive: true });
  document.body.addEventListener('touchend', (e) => terminar(e.changedTouches[0].clientX), { passive: true });
  document.body.addEventListener('mousedown', (e) => empezar(e.clientX));
  document.body.addEventListener('mouseup', (e) => terminar(e.clientX));
})();
```

- [ ] **Step 4: Rebote en los límites**

Modificar `moverPagina` para que, cuando el movimiento no cambia nada (ya estás en el límite), se note un rebote en vez de no hacer nada. Reemplazar la primera línea de `moverPagina`:

```js
function moverPagina(direccion) {
  const posicionAnterior = estado.posicion;
  estado.posicion += (direccion === 'arriba' ? -1 : 1);
  const datosPrevios = render(); // recalcula clamping
  if (estado.posicion === posicionAnterior) {
    const leaf = document.getElementById('leaf');
    leaf.classList.remove('rebote'); void leaf.offsetWidth; leaf.classList.add('rebote');
    return;
  }
  // ... resto de la función igual que en la Task 6, usando datosPrevios como "datos"
```

Añadir a `<style>`:

```css
.leaf.rebote { animation: rebote .25s ease; }
@keyframes rebote { 0%,100%{transform:rotateX(0deg);} 50%{transform:rotateX(-12deg);} }
```

Y aplicar la misma lógica de rebote para el cambio de mes: en `gestosHorizontales`, antes de cambiar `estado.mesIndex`, comprobar límites y, si no hay cambio posible, aplicar la clase `.rebote` a `#notebook` en vez de a `#leaf` (añadir `#notebook.rebote { animation: rebote .25s ease; }` reutilizando el mismo `@keyframes`).

- [ ] **Step 5: Verificación manual**

Con la vista de iPhone activada (que sí dispara eventos `touch` en Chrome DevTools), confirmar:
- Deslizar hacia arriba/abajo sobre el cuaderno pasa las páginas con el doblez ya construido en la Task 6.
- Deslizar a los lados sobre la pantalla cambia de mes y aterriza en la portada.
- Intentar pasar del límite (portada hacia arriba, o mes actual hacia la derecha) produce el rebote visual en vez de no responder.
- Los botones siguen existiendo (revisar con el inspector) aunque no se vean, y siguen funcionando si se les da foco con Tab + Enter.

- [ ] **Step 6: Commit**

```bash
cd /home/sebas/gastos-tracker
git add index.html
git commit -m "Reemplaza los botones por gestos táctiles con rebote en los límites"
```

---

## Task 8: Anular un gasto y borrar todos los registros

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: `cargarGastos()`, `guardarGastos()`, `render()`.
- Produces: `anularGasto(id)`, botón discreto "Borrar todos los registros".

- [ ] **Step 1: Añadir el botón de anular a las hojas ya escritas**

En `htmlDePagina`, modificar la rama final (gasto ya guardado):

```js
  return `
    <div class="hoja-escrita">
      <p>${contenido.categoria}</p>
      <p>${contenido.pago}</p>
      <p>${moneda(contenido.monto)}</p>
      <button class="anular" data-id="${contenido.id}">Anular este gasto</button>
    </div>
  `;
```

- [ ] **Step 2: Manejar el clic con confirmación**

Añadir junto a los demás listeners de `#pagina` (ahora deben ir sobre `#notebook`, ya que el contenido vive dentro de `#faceFront`):

```js
document.getElementById('notebook').addEventListener('click', (e) => {
  const anularBtn = e.target.closest('.anular');
  if (!anularBtn) return;
  if (!confirm('¿Anular este gasto? No se puede deshacer.')) return;
  const id = Number(anularBtn.dataset.id);
  const gastos = cargarGastos().filter(g => g.id !== id);
  guardarGastos(gastos);
  window._paginaInicial = false;
  estado.posicion = -1;
  render();
});
```

(Nota: los listeners de chips y guardar que estaban en `#pagina` desde la Task 4 deben moverse también a `#notebook`, ya que ese elemento ya no existe — reemplazar `document.getElementById('pagina').addEventListener(...)` por `document.getElementById('notebook').addEventListener(...)` en los dos listeners existentes de clic e input.)

- [ ] **Step 3: Botón de borrar todo, discreto**

Añadir al final del `<body>`, después de `#notebook`:

```html
<button id="borrarTodo">Borrar todos los registros</button>
```

```css
#borrarTodo { display: block; margin: 30px auto 0; background: none; border: none; color: #b5473a; font-size: 0.8rem; padding: 8px; }
```

```js
document.getElementById('borrarTodo').addEventListener('click', () => {
  if (!confirm('¿Borrar todos los gastos guardados? No se puede deshacer.')) return;
  guardarGastos([]);
  estado = { mesIndex: null, posicion: -1 };
  window._paginaInicial = false;
  render();
});
```

- [ ] **Step 4: Verificación manual**

Guardar dos o tres gastos de prueba, deslizar hasta uno de ellos, tocar "Anular este gasto", confirmar el diálogo, y verificar que desaparece y los totales se recalculan. Luego probar "Borrar todos los registros" y confirmar que la app vuelve al estado inicial (portada del mes actual, total $0).

- [ ] **Step 5: Commit**

```bash
cd /home/sebas/gastos-tracker
git add index.html
git commit -m "Agrega anular gasto individual y borrar todos los registros"
```

---

## Task 9: Sistema visual final (paleta, tipografía, profundidad)

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: toda la estructura de las Tasks 3-8. No añade funciones nuevas, solo estilos.

- [ ] **Step 1: Reemplazar la paleta de grises del esqueleto por el sistema definido en el spec**

Reemplazar todo el bloque `<style>` por la versión con variables CSS (claro/oscuro), tal como se dejó validado en el prototipo anterior de esta misma app (paleta esmeralda/dorado/coral con papel crema/kraft, tipografía `ui-rounded` para títulos y monoespaciada para el contenido del recibo, colores de sello por categoría: Shaun esmeralda, Swift dorado, Salidas coral, Gastos Personales gris pizarra, Hogar café tierra), y añadir 2-3 hojas apiladas detrás de `#pageUnder` (mismos estilos de `.pagina-cara` con pequeños `transform: rotate(...)` y `top/left` desplazados, para dar sensación de grosor real al cuaderno) reutilizando el mismo patrón que ya se probó en la maqueta del companion visual (`libreta-fold-v2.html`, guardada en `.superpowers/brainstorm/` de este mismo repo si se quiere referenciar).

- [ ] **Step 2: Verificación manual**

Recorrer toda la app (agregar gasto, guardar, deslizar entre páginas y entre meses, anular un gasto) y confirmar que se ve y se siente como el spec: papel crema/kraft, rojo cereza, sellos de categoría, y el cuaderno con volumen real, en modo claro y en modo oscuro del sistema.

- [ ] **Step 3: Commit**

```bash
cd /home/sebas/gastos-tracker
git add index.html
git commit -m "Aplica el sistema visual final: paleta vintage, tipografía y profundidad del cuaderno"
```

---

## Task 10: Actualizar el conocimiento de Ryan y la memoria

**Files:**
- Modify: `.claude/agents/ryan.md`
- Modify: `/home/sebas/.claude/projects/-home-sebas-TUM/memory/agente-ryan-app-gastos.md`

**Interfaces:**
- No produce código; sincroniza documentación con el estado real del repo tras las Tasks 1-9.

- [ ] **Step 1: Actualizar `ryan.md`**

Reemplazar la sección "Arquitectura actual" de `ryan.md` para reflejar los dos archivos (`index.html` + `logic.js`), el esquema de navegación (portada / hoja en blanco / gastos, con `mesIndex` y `posicion`), y el modelo de gestos (vertical = páginas, horizontal = meses) con sus límites y rebote — reemplazando la descripción del prototipo anterior (hoja deslizante única) por la de la libreta.

- [ ] **Step 2: Actualizar la memoria**

Editar `agente-ryan-app-gastos.md` para que la sección "Qué sabe Ryan" mencione la libreta mensual con doblez de página en vez del prototipo de hoja deslizante.

- [ ] **Step 3: Commit**

```bash
cd /home/sebas/gastos-tracker
git add .claude/agents/ryan.md
git commit -m "Actualiza el conocimiento de Ryan con la arquitectura final de la libreta"
```

(La memoria en `/home/sebas/.claude/projects/-home-sebas-TUM/memory/` vive fuera de este repo y no lleva commit de git — solo se edita el archivo.)

---

## Self-Review

**Cobertura del spec:** Modelo de datos sin cambios (Tasks 1-2 lo agrupan sin migración) ✓. Navegación horizontal/vertical con límites y portada (Tasks 3, 7) ✓. Flujo de registrar con chips y máquina de escribir (Tasks 4-5) ✓. Doblez con sombra y sello (Task 6) ✓. Franja de totales del mes visible (Task 3) ✓. Anular/borrar todo (Task 8) ✓. Sistema visual (Task 9) ✓. Decisión de implementación (CSS/JS puro, sin Canvas ni librerías) respetada en todas las tasks ✓. Actualización de Ryan (Task 10) ✓.

**Placeholders:** ninguno — cada paso trae código completo o instrucciones concretas de verificación manual.

**Consistencia de nombres:** `estado.mesIndex` / `estado.posicion` se usan igual desde la Task 3 en adelante; `moverPagina(direccion)` se introduce en la Task 6 y se reutiliza sin cambiar su firma en las Tasks 7-8; `renderPagina`/`htmlDePagina` se refactoriza una sola vez (Task 4 → Task 6) y queda estable de ahí en adelante; los listeners que apuntaban a `#pagina` se migran explícitamente a `#notebook` en la Task 8 con una nota explícita para no dejar cabos sueltos.
