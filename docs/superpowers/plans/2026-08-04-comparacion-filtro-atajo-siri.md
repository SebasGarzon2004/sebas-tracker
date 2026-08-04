# Comparación con el mes anterior, filtro de categoría y atajo de Siri — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar a "Mis Gastos" tres mejoras elegidas en el brainstorming: un indicador de cambio porcentual contra el mes anterior (solo en meses ya terminados), un filtro del cuaderno por categoría (tocando una fila del resumen), y un atajo de Siri que prellena la hoja de agregar gasto vía parámetros en la URL.

**Architecture:** Todo vive en los mismos dos archivos existentes. Las Tareas 1 y 2 agregan una función pura nueva a `logic.js` (testeada con `node --test`) y consumen esa función desde `index.html`; la Tarea 3 es 100% `index.html` (lectura de `location.search`, sin lógica nueva que valga la pena extraer a `logic.js`). No se toca el modelo de datos ni `localStorage`.

**Tech Stack:** HTML/CSS/JS vanilla, sin build ni librerías externas. `node --test logic.test.js` para las funciones puras; verificación visual manual en navegador para las tres tareas (recomendado, no bloqueante si no hay navegador disponible en el entorno del agente — en ese caso, verificar por inspección cuidadosa del HTML/CSS generado).

## Global Constraints

- Cero dependencias externas ni CDN — solo `logic.js` e `index.html`, como ya está.
- No se toca el modelo de datos (`{ id, monto, categoria, pago, nota, fecha }`) ni la clave de `localStorage` (`gastos_v1`).
- No se tocan las categorías (Shaun, Swift, Salidas, Gastos Personales, Hogar) ni las formas de pago (BreB, RappiCard, Efectivo).
- La app se queda 100% local — sin servidor, sin cuenta, sin backend. Nada de este plan agrega peticiones de red.
- Las 10 pruebas existentes (`node --test logic.test.js`) deben seguir pasando sin modificarlas, en ninguna tarea de este plan.
- La comparación con el mes anterior **solo se muestra para meses ya terminados** (`esMesActual === false`) — nunca para el mes en curso.
- El atajo de Siri **prellena pero no guarda solo** — el usuario siempre tiene que tocar "Guardar gasto" para confirmar.
- La conversión a PWA (manifest.json, service worker, hosting real) queda fuera de alcance de este plan a propósito.

---

## Archivos que se tocan

- `logic.js` — se agrega `cambioPorcentual` y se extiende `obtenerPaginas` con un tercer parámetro opcional.
- `logic.test.js` — pruebas para ambas funciones nuevas/modificadas.
- `index.html` — CSS, HTML (`#filtroActivo` nuevo), y JS (`render()`, `cambiarMes()`, nuevos manejadores de clic, `precargarDesdeURL()`).

---

### Task 1: Comparación con el mes anterior

**Files:**
- Modify: `logic.js` (agrega `cambioPorcentual`, la exporta)
- Modify: `logic.test.js` (prueba nueva)
- Modify: `index.html:17,20` (paleta, sin cambios — solo referencia), `index.html:58` (CSS, agrega reglas después de `.resumen-fila .monto`), `index.html:338-342` (reemplaza `nombreMes` y agrega `nombreMesCorto`), `index.html:286-305` (bloque de `render()` que arma `#resumen`)

**Interfaces:**
- Consumes: nada de otras tareas.
- Produces: `cambioPorcentual(totalActual, totalAnterior)` en `logic.js` (exportada), usada directamente por `index.html`. `nombreMesCorto(mesKey)` en `index.html`, usada también por la Tarea 2 si hace falta mostrar nombres de mes en el futuro (no obligatorio para esta ronda).

- [ ] **Step 1: Escribir la prueba que falla**

En `logic.test.js`, después del bloque de pruebas de `mesesDisponibles` (busca el `test('mesesDisponibles agrega 2 meses atrás...')`), agregar:

```javascript
const { cambioPorcentual } = require('./logic.js');

test('cambioPorcentual calcula el cambio redondeado contra el mes anterior', () => {
  assert.strictEqual(cambioPorcentual(120000, 100000), 20);
  assert.strictEqual(cambioPorcentual(80000, 100000), -20);
  assert.strictEqual(cambioPorcentual(100000, 100000), 0);
  assert.strictEqual(cambioPorcentual(133000, 100000), 33);
  assert.strictEqual(cambioPorcentual(50000, 0), null, 'sin gasto el mes anterior no hay base para comparar');
});
```

- [ ] **Step 2: Correr la prueba y confirmar que falla**

Run: `cd /home/sebas/universidad/gastos-tracker && node --test logic.test.js`
Expected: FAIL — `cambioPorcentual is not a function` (o `undefined`), porque todavía no existe.

- [ ] **Step 3: Implementar `cambioPorcentual` en `logic.js`**

Agregar, justo después de la función `calcularResumenMes` (antes de `function obtenerPaginas`):

```javascript
function cambioPorcentual(totalActual, totalAnterior) {
  if (!totalAnterior) return null;
  return Math.round(((totalActual - totalAnterior) / totalAnterior) * 100);
}
```

Agregar `cambioPorcentual` a la lista de `module.exports` (junto a `calcularResumenMes`).

- [ ] **Step 4: Correr las pruebas y confirmar que pasan**

Run: `cd /home/sebas/universidad/gastos-tracker && node --test logic.test.js`
Expected: PASS — 11 pruebas, 0 fallos (las 10 existentes + la nueva).

- [ ] **Step 5: Commit de `logic.js`**

```bash
cd /home/sebas/universidad/gastos-tracker
git add logic.js logic.test.js
git commit -m "$(cat <<'EOF'
Agrega cambioPorcentual para comparar el total contra el mes anterior

Función pura: devuelve el cambio porcentual redondeado entre dos
totales, o null si no hay base (mes anterior en $0) contra la cual
comparar.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: Agregar el CSS del indicador**

En `index.html`, buscar la regla `.resumen-fila .monto { color: var(--muted); font-variant-numeric: tabular-nums; }` y agregar justo después:

```css
  .cambio-mes { margin-left: 8px; font-size: 0.78rem; font-weight: 600; vertical-align: middle; }
  .cambio-mes.sube { color: var(--coral); }
  .cambio-mes.baja { color: var(--emerald); }
  .cambio-mes.neutro { color: var(--muted); }
```

- [ ] **Step 7: Extraer `NOMBRES_MES` y agregar `nombreMesCorto`**

Reemplazar la función `nombreMes` completa:

```javascript
  function nombreMes(mesKey) {
    const NOMBRES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const [anio, mes] = mesKey.split('-').map(Number);
    return `${NOMBRES[mes - 1]} ${anio}`;
  }
```

por:

```javascript
  const NOMBRES_MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  function nombreMes(mesKey) {
    const [anio, mes] = mesKey.split('-').map(Number);
    return `${NOMBRES_MES[mes - 1]} ${anio}`;
  }

  function nombreMesCorto(mesKey) {
    const [, mes] = mesKey.split('-').map(Number);
    return NOMBRES_MES[mes - 1].toLowerCase();
  }
```

- [ ] **Step 8: Calcular el cambio e insertarlo en el resumen dentro de `render()`**

Reemplazar en `render()`:

```javascript
    const mesKey = meses[estado.mesIndex];
    const esMesActual = mesKey === mesActual;
    const gastosDelMes = gastosPorMes[mesKey] || [];
    const resumen = calcularResumenMes(gastosDelMes);
    const paginas = obtenerPaginas(gastosDelMes, esMesActual);
    estado.posicion = clamp(estado.posicion, -1, paginas.length - 1);

    document.getElementById('mesHeader').textContent = nombreMes(mesKey);
    document.getElementById('resumen').innerHTML = `
      <div class="resumen-total-mes rounded">Total del mes: ${moneda(resumen.total)}</div>
      <div class="resumen-filas">
        ${CATEGORIAS.map(cat => `
          <div class="resumen-fila">
            <span class="barra ${BADGE_CATEGORIA[cat].replace('badge-', 'barra-')}"></span>
            <span class="nombre">${cat}</span>
            <span class="monto">${moneda(resumen.porCategoria[cat])}</span>
          </div>
        `).join('')}
      </div>
    `;
```

por:

```javascript
    const mesKey = meses[estado.mesIndex];
    const esMesActual = mesKey === mesActual;
    const gastosDelMes = gastosPorMes[mesKey] || [];
    const resumen = calcularResumenMes(gastosDelMes);
    const paginas = obtenerPaginas(gastosDelMes, esMesActual);
    estado.posicion = clamp(estado.posicion, -1, paginas.length - 1);

    const mesAnteriorKey = sumarMeses(mesKey, -1);
    const totalMesAnterior = calcularResumenMes(gastosPorMes[mesAnteriorKey] || []).total;
    const cambio = esMesActual ? null : cambioPorcentual(resumen.total, totalMesAnterior);
    const badgeCambio = cambio === null ? '' :
      cambio === 0 ? `<span class="cambio-mes neutro">= igual que ${nombreMesCorto(mesAnteriorKey)}</span>` :
      cambio > 0 ? `<span class="cambio-mes sube">↑${cambio}% vs ${nombreMesCorto(mesAnteriorKey)}</span>` :
      `<span class="cambio-mes baja">↓${Math.abs(cambio)}% vs ${nombreMesCorto(mesAnteriorKey)}</span>`;

    document.getElementById('mesHeader').textContent = nombreMes(mesKey);
    document.getElementById('resumen').innerHTML = `
      <div class="resumen-total-mes rounded">Total del mes: ${moneda(resumen.total)}${badgeCambio}</div>
      <div class="resumen-filas">
        ${CATEGORIAS.map(cat => `
          <div class="resumen-fila">
            <span class="barra ${BADGE_CATEGORIA[cat].replace('badge-', 'barra-')}"></span>
            <span class="nombre">${cat}</span>
            <span class="monto">${moneda(resumen.porCategoria[cat])}</span>
          </div>
        `).join('')}
      </div>
    `;
```

Nota para quien implemente: `sumarMeses` ya existe como función global de `logic.js` (usada hoy por `mesesDisponibles`), no hace falta declararla de nuevo.

- [ ] **Step 9: Verificación manual en navegador**

```bash
cd /home/sebas/universidad/gastos-tracker && python3 serve-sin-cache.py 8010
```

Abrir `http://localhost:8010`. Confirmar:
- Viendo el mes actual (portada al abrir), el "Total del mes" NO trae ningún indicador de cambio.
- Navegar con `‹` a un mes anterior que tenga al menos un gasto guardado (o registrar uno de prueba primero, cambiar la fecha del sistema no es necesario — cualquier mes con datos que no sea el actual sirve): el indicador aparece junto al total, con flecha y color según si el mes fue más o menos gastador que el anterior a ese.
- Si el mes anterior a ese no tiene ningún gasto, el indicador no aparece (sin errores en consola, sin "NaN%" ni "Infinity%").

Si no hay navegador disponible en el entorno, verificar por inspección: confirmar que el bloque de `render()` quedó exactamente como en el Step 8, y que `cambioPorcentual`/`nombreMesCorto`/`sumarMeses` están definidas antes de usarse (por hoisting de `function`, el orden textual no importa, pero confirmar que los nombres coinciden exactamente).

- [ ] **Step 10: Correr las pruebas de `logic.js` (no deben romperse)**

Run: `cd /home/sebas/universidad/gastos-tracker && node --test logic.test.js`
Expected: PASS — 11 pruebas, 0 fallos.

- [ ] **Step 11: Commit**

```bash
cd /home/sebas/universidad/gastos-tracker
git add index.html
git commit -m "$(cat <<'EOF'
Muestra el cambio porcentual contra el mes anterior, solo en meses ya terminados

Junto a "Total del mes" aparece "↑20% vs julio" (o ↓, o "= igual
que...") comparando contra el mes calendario inmediatamente anterior.
Nunca se muestra para el mes en curso (comparar un mes a medias contra
uno completo sería engañoso), ni cuando el mes anterior no tiene datos
con los cuales comparar.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Filtrar el cuaderno tocando una categoría del resumen

**Files:**
- Modify: `logic.js` (extiende `obtenerPaginas` con un tercer parámetro opcional `categoriaFiltro`)
- Modify: `logic.test.js` (pruebas nuevas para el filtro)
- Modify: `index.html` (HTML: agrega `#filtroActivo`; CSS: pastilla de filtro y cursor en `.resumen-fila`; JS: `estado`, `render()`, `cambiarMes()`, nuevos manejadores de clic)

**Interfaces:**
- Consumes: `sumarMeses` (ya existe, Tarea 1 no la cambia), `escapeHtml`/`BADGE_CATEGORIA` (ya existen en `index.html`).
- Produces: `obtenerPaginas(gastosDelMes, esMesActual, categoriaFiltro)` — el tercer parámetro es opcional; sin él (`undefined`), el comportamiento es idéntico al de antes (los llamados existentes en `index.html` que no lo pasan no se rompen). `estado.categoriaFiltro` (string o `null`) y `estado._saltarAlFiltrar` (boolean), nuevas propiedades del objeto `estado` ya existente en `index.html` — no consumidas por ninguna otra tarea de este plan.

- [ ] **Step 1: Escribir las pruebas que fallan**

En `logic.test.js`, justo después del test existente `'obtenerPaginas antepone la hoja en blanco solo en el mes actual'`, agregar:

```javascript
test('obtenerPaginas filtra por categoría y nunca incluye la hoja en blanco cuando hay filtro', () => {
  const gastos = [
    { id: 1, monto: 100, categoria: 'Hogar', pago: 'Efectivo', fecha: '2026-08-01T10:00:00.000Z' },
    { id: 2, monto: 200, categoria: 'Shaun', pago: 'BreB', fecha: '2026-08-02T10:00:00.000Z' },
    { id: 3, monto: 300, categoria: 'Shaun', pago: 'Efectivo', fecha: '2026-08-03T10:00:00.000Z' },
  ];
  assert.deepStrictEqual(obtenerPaginas(gastos, true, 'Shaun'), [gastos[1], gastos[2]]);
  assert.deepStrictEqual(obtenerPaginas(gastos, false, 'Shaun'), [gastos[1], gastos[2]]);
  assert.deepStrictEqual(obtenerPaginas(gastos, true, 'Swift'), [], 'sin gastos de esa categoría, la lista queda vacía');
  assert.deepStrictEqual(obtenerPaginas(gastos, true, null), ['blanco', gastos[0], gastos[1], gastos[2]], 'sin filtro se comporta igual que antes');
});
```

- [ ] **Step 2: Correr las pruebas y confirmar que fallan**

Run: `cd /home/sebas/universidad/gastos-tracker && node --test logic.test.js`
Expected: FAIL en el test nuevo — con la firma actual de dos parámetros, `obtenerPaginas(gastos, true, 'Shaun')` ignora el tercer argumento y devuelve `['blanco', ...gastos]` sin filtrar.

- [ ] **Step 3: Extender `obtenerPaginas`**

Reemplazar en `logic.js`:

```javascript
function obtenerPaginas(gastosDelMes, esMesActual) {
  return esMesActual ? ['blanco', ...gastosDelMes] : [...gastosDelMes];
}
```

por:

```javascript
function obtenerPaginas(gastosDelMes, esMesActual, categoriaFiltro) {
  const gastosFiltrados = categoriaFiltro
    ? gastosDelMes.filter(g => g.categoria === categoriaFiltro)
    : gastosDelMes;
  if (categoriaFiltro) return [...gastosFiltrados];
  return esMesActual ? ['blanco', ...gastosFiltrados] : [...gastosFiltrados];
}
```

- [ ] **Step 4: Correr las pruebas y confirmar que pasan**

Run: `cd /home/sebas/universidad/gastos-tracker && node --test logic.test.js`
Expected: PASS — 12 pruebas, 0 fallos (las 11 de la Tarea 1 + esta nueva).

- [ ] **Step 5: Commit de `logic.js`**

```bash
cd /home/sebas/universidad/gastos-tracker
git add logic.js logic.test.js
git commit -m "$(cat <<'EOF'
Extiende obtenerPaginas con un filtro de categoría opcional

Tercer parámetro opcional categoriaFiltro: si viene, la lista de
páginas se filtra a solo los gastos de esa categoría y nunca incluye
la hoja en blanco (es modo repaso, no modo registrar). Sin el
parámetro, el comportamiento es idéntico al de antes.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: Agregar `#filtroActivo` al HTML**

Reemplazar:

```html
  <div id="mesNav">
    <button id="btnMesAnteriorVisible" aria-label="Mes anterior">‹</button>
    <h1 id="mesHeader"></h1>
    <button id="btnMesSiguienteVisible" aria-label="Mes siguiente">›</button>
  </div>
  <div id="notebook">
```

por:

```html
  <div id="mesNav">
    <button id="btnMesAnteriorVisible" aria-label="Mes anterior">‹</button>
    <h1 id="mesHeader"></h1>
    <button id="btnMesSiguienteVisible" aria-label="Mes siguiente">›</button>
  </div>
  <div id="filtroActivo"></div>
  <div id="notebook">
```

- [ ] **Step 7: CSS de la pastilla de filtro y el cursor en las filas del resumen**

Buscar la regla `.resumen-fila { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }` y reemplazarla por:

```css
  .resumen-fila { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer; }
  .resumen-fila:active { opacity: 0.65; }
```

Agregar, después de la regla `#mesNav { ... }`:

```css
  #filtroActivo { display: flex; justify-content: center; min-height: 0; }
  #filtroActivo:not(:empty) { margin: 6px 0 2px; }
  .pastilla-filtro {
    background: var(--card); border: 1px solid var(--line); border-radius: 999px;
    padding: 4px 12px; font-size: 0.78rem; font-weight: 600;
  }
  .pastilla-filtro:active { transform: scale(0.96); }
```

- [ ] **Step 8: Agregar `categoriaFiltro`/`_saltarAlFiltrar` a `estado`**

Reemplazar:

```javascript
  let estado = { mesIndex: null, posicion: -1 };
```

por:

```javascript
  let estado = { mesIndex: null, posicion: -1, categoriaFiltro: null, _saltarAlFiltrar: false };
```

- [ ] **Step 9: `data-categoria` en cada fila del resumen y salto de página al filtrar, dentro de `render()`**

Reemplazar (el bloque que ya quedó de la Tarea 1):

```javascript
    const paginas = obtenerPaginas(gastosDelMes, esMesActual);
    estado.posicion = clamp(estado.posicion, -1, paginas.length - 1);
```

por:

```javascript
    const paginas = obtenerPaginas(gastosDelMes, esMesActual, estado.categoriaFiltro);
    if (estado._saltarAlFiltrar) {
      estado.posicion = paginas.length > 0 ? 0 : -1;
      estado._saltarAlFiltrar = false;
    } else {
      estado.posicion = clamp(estado.posicion, -1, paginas.length - 1);
    }
```

Reemplazar la línea del `.resumen-fila` dentro del `.map`:

```javascript
          <div class="resumen-fila">
```

por:

```javascript
          <div class="resumen-fila" data-categoria="${cat}">
```

- [ ] **Step 10: Llamar `actualizarFiltroActivo()` desde `render()` y definir esa función**

En `render()`, justo después de la línea `document.getElementById('mesHeader').textContent = nombreMes(mesKey);`, agregar:

```javascript
    actualizarFiltroActivo();
```

Agregar la función, cerca de `marcarSeleccionActiva` (por ejemplo justo antes de esa función):

```javascript
  function actualizarFiltroActivo() {
    const el = document.getElementById('filtroActivo');
    if (!estado.categoriaFiltro) { el.innerHTML = ''; return; }
    const clase = BADGE_CATEGORIA[estado.categoriaFiltro].replace('badge-', 'chip-');
    el.innerHTML = `<button type="button" id="quitarFiltro" class="pastilla-filtro ${clase}">${escapeHtml(estado.categoriaFiltro)} ✕</button>`;
  }
```

Nota para quien implemente: las clases `chip-shaun`/`chip-swift`/etc. ya existen en el CSS (definen `border-color`/`color` por categoría) — reusarlas aquí le da a la pastilla el color de su categoría sin declarar una paleta nueva.

- [ ] **Step 11: Manejadores de clic para activar/cambiar y quitar el filtro**

Agregar, después del bloque `document.getElementById('notebook').addEventListener('input', ...)` (buscar ese bloque para ubicar el punto exacto — va inmediatamente después de su cierre `});`):

```javascript
  document.getElementById('resumen').addEventListener('click', (e) => {
    const fila = e.target.closest('.resumen-fila');
    if (!fila) return;
    const cat = fila.dataset.categoria;
    estado.categoriaFiltro = (estado.categoriaFiltro === cat) ? null : cat;
    estado._saltarAlFiltrar = true;
    window._paginaInicial = false;
    render();
  });

  document.getElementById('filtroActivo').addEventListener('click', (e) => {
    if (!e.target.closest('#quitarFiltro')) return;
    estado.categoriaFiltro = null;
    estado._saltarAlFiltrar = true;
    window._paginaInicial = false;
    render();
  });
```

- [ ] **Step 12: Mantener el filtro activo al cambiar de mes**

En `cambiarMes`, reemplazar:

```javascript
    setTimeout(() => {
      estado.mesIndex = nuevoIndex;
      estado.posicion = -1;
      window._paginaInicial = false;
      render();
```

por:

```javascript
    setTimeout(() => {
      estado.mesIndex = nuevoIndex;
      estado.posicion = -1;
      if (estado.categoriaFiltro) estado._saltarAlFiltrar = true;
      window._paginaInicial = false;
      render();
```

- [ ] **Step 13: Verificar que anular un gasto filtrado no requiere cambios**

No hay ningún código que tocar en este step — es una verificación. Leer el manejador de `.anular` dentro del listener de clic de `#notebook` (buscar `const anularBtn = e.target.closest('.anular');`) y confirmar que ya termina con:

```javascript
    window._paginaInicial = false;
    estado.posicion = -1;
    render();
```

Esto YA salta a la portada sin importar si hay un filtro activo (la portada no depende de `categoriaFiltro`, y `estado.categoriaFiltro` no se toca en ese flujo, así que la pastilla de filtro sigue visible). Confirmar con una lectura del código que es así — si por alguna razón el código no coincide con esto, avisar antes de continuar en vez de asumir.

- [ ] **Step 14: Verificación manual en navegador**

```bash
cd /home/sebas/universidad/gastos-tracker && python3 serve-sin-cache.py 8010
```

Abrir `http://localhost:8010`, con al menos dos gastos guardados de categorías distintas (registrar de prueba si hace falta). Confirmar:
- Tocar una fila del resumen (ej. "Shaun") salta directo al primer recibo de esa categoría y muestra la pastilla "Shaun ✕" junto al mes.
- Mientras el filtro está activo, deslizar/pasar página solo recorre recibos de Shaun — la hoja de agregar gasto no aparece en el recorrido.
- Tocar la `✕` de la pastilla quita el filtro y la pastilla desaparece.
- Tocar la misma categoría otra vez en el resumen (estando ya filtrada) también quita el filtro.
- Tocar una categoría distinta mientras hay un filtro activo cambia el filtro a la nueva categoría.
- El resumen de totales sigue mostrando las 5 categorías completas sin importar el filtro.
- Cambiar de mes con `‹`/`›` estando filtrado mantiene el filtro y salta al primer recibo de esa categoría en el mes nuevo (o a la portada si ese mes no tiene ninguno).
- Anular el único recibo filtrado visible: el cuaderno vuelve a la portada, con la pastilla del filtro todavía puesta.

Si no hay navegador disponible, verificar por inspección cuidadosa que los ocho steps de código quedaron exactamente como se especificó, prestando particular atención a que `estado._saltarAlFiltrar` se resetea a `false` dentro de `render()` (para no quedar pegado en `true` en renders futuros que no deban saltar).

- [ ] **Step 15: Correr las pruebas de `logic.js` (no deben romperse)**

Run: `cd /home/sebas/universidad/gastos-tracker && node --test logic.test.js`
Expected: PASS — 12 pruebas, 0 fallos.

- [ ] **Step 16: Commit**

```bash
cd /home/sebas/universidad/gastos-tracker
git add index.html
git commit -m "$(cat <<'EOF'
Filtra el cuaderno por categoría al tocar una fila del resumen

Tocar "Shaun" en el resumen salta el cuaderno directo al primer
recibo de esa categoría y muestra una pastilla "Shaun ✕" junto al
mes; mientras el filtro está activo, la hoja de agregar gasto no
aparece en el recorrido (es modo repaso). Tocar la ✕, o tocar la
misma categoría otra vez, lo quita. El filtro persiste al cambiar de
mes. El resumen de totales no cambia con el filtro, solo el cuaderno.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Atajo de Siri (parámetros en la URL)

**Files:**
- Modify: `index.html` (agrega `precargarDesdeURL()` y cambia la llamada inicial a `render()` al final del script)

**Interfaces:**
- Consumes: `CATEGORIAS`/`PAGOS` (ya existen), `seleccion` (ya existe), `ocultarMontoConfirmado`, `marcarSeleccionActiva`, `actualizarGuardar`, `actualizarRecibo`, `recalcularAlturaYMantenerVisible` (todas ya existen en `index.html`, sin cambios).
- Produces: nada que otra tarea consuma — es la última pieza del plan.

No hay pruebas automatizadas en este task: es lectura de `location.search` y manipulación del DOM, sin ninguna función pura que valga la pena extraer a `logic.js` (la validación de categoría/pago es una comparación directa contra los arreglos `CATEGORIAS`/`PAGOS` que ya existen). La verificación es manual, en navegador, con la URL de prueba del Step 3.

- [ ] **Step 1: Escribir `precargarDesdeURL()`**

Agregar, cerca de `guardarGasto` (por ejemplo justo antes de esa función):

```javascript
  // Atajo de Siri (Apple Shortcuts): la app puede abrirse con
  // ?monto=20000&categoria=Salidas&pago=BreB&nota=algo — si vienen esos
  // parámetros, se prellena la hoja en blanco con esos valores, pero NO se
  // guarda solo; el usuario sigue teniendo que tocar "Guardar gasto".
  // categoria/pago deben coincidir exactamente con CATEGORIAS/PAGOS — si no
  // coinciden, ese campo puntual simplemente no se preselecciona.
  function precargarDesdeURL() {
    const params = new URLSearchParams(location.search);
    const montoParam = params.get('monto');
    const categoriaParam = params.get('categoria');
    if (!montoParam && !categoriaParam) return false;

    const pagoParam = params.get('pago');
    const notaParam = params.get('nota');

    if (categoriaParam && CATEGORIAS.includes(categoriaParam)) seleccion.categoria = categoriaParam;
    if (pagoParam && PAGOS.includes(pagoParam)) seleccion.pago = pagoParam;

    estado.posicion = 0;
    render();

    const montoInput = document.getElementById('monto');
    const notaInput = document.getElementById('nota');
    const soloDigitos = (montoParam || '').replace(/\D/g, '');
    if (montoInput && soloDigitos) {
      montoInput.value = Number(soloDigitos).toLocaleString('es-CO');
      ocultarMontoConfirmado(true);
    }
    if (notaInput && notaParam) notaInput.value = notaParam;

    marcarSeleccionActiva();
    actualizarGuardar();
    actualizarRecibo();
    recalcularAlturaYMantenerVisible();

    history.replaceState(null, '', location.pathname);
    return true;
  }
```

- [ ] **Step 2: Usar `precargarDesdeURL()` al arrancar la app**

Reemplazar las dos últimas líneas del script:

```javascript
  ajustarAltura(htmlDePagina('blanco'));
  render();
```

por:

```javascript
  ajustarAltura(htmlDePagina('blanco'));
  if (!precargarDesdeURL()) render();
```

- [ ] **Step 3: Verificación manual en navegador**

```bash
cd /home/sebas/universidad/gastos-tracker && python3 serve-sin-cache.py 8010
```

Abrir `http://localhost:8010/?monto=20000&categoria=Salidas&pago=BreB&nota=Prueba%20de%20atajo`. Confirmar:
- La app abre directo en la hoja en blanco (no en la portada).
- El campo de monto queda oculto (confirmado), y la vista previa del recibo muestra "Monto: $20.000", "Categoría: Salidas", "Pago: BreB" y "Nota: Prueba de atajo".
- El botón "Guardar gasto" está habilitado (no gris) — listo para un solo toque.
- Nada se guardó todavía (el gasto no aparece en el resumen de totales hasta que se toque "Guardar").
- La URL en la barra de direcciones ya no trae los parámetros (`history.replaceState` los limpió).
- Recargar la página en ese punto (sin parámetros ya en la URL) abre normalmente en la portada, sin volver a prellenar nada.

Probar también con una categoría inválida: `http://localhost:8010/?monto=15000&categoria=NoExiste`. Confirmar que el monto sí se prellena pero ninguna categoría queda seleccionada (los chips de categoría siguen visibles, sin nada resaltado), y que no hay errores en la consola del navegador.

Si no hay navegador disponible, verificar por inspección que `CATEGORIAS.includes(...)`/`PAGOS.includes(...)` usan los arreglos correctos (no una copia desactualizada), y que `history.replaceState(null, '', location.pathname)` no incluye ningún parámetro adicional que reintroduzca el query string.

- [ ] **Step 4: Correr las pruebas de `logic.js` (no deben romperse)**

Run: `cd /home/sebas/universidad/gastos-tracker && node --test logic.test.js`
Expected: PASS — 12 pruebas, 0 fallos (esta tarea no toca `logic.js`, es una red de seguridad).

- [ ] **Step 5: Commit**

```bash
cd /home/sebas/universidad/gastos-tracker
git add index.html
git commit -m "$(cat <<'EOF'
Agrega atajo de Siri: prellena la hoja en blanco desde parámetros de URL

La app puede abrirse con ?monto=20000&categoria=Salidas&pago=BreB&
nota=algo (pensado para un Atajo de Apple Shortcuts activado por voz)
y salta directo a la hoja en blanco con esos campos ya llenos, lista
para un solo toque en "Guardar gasto" — nunca se guarda sola, para
que un error de reconocimiento de voz no quede guardado sin revisión.
categoria/pago deben coincidir exactamente con los valores válidos; si
no coinciden, ese campo puntual queda sin preseleccionar.

Pendiente conocido: como la app corre desde un servidor local, el
Atajo tiene que apuntar a esa IP y hay que actualizarlo si cambia de
red — se resuelve del todo con la futura conversión a PWA con hosting
real, fuera de alcance de este plan.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Cobertura del spec:**
- Comparación solo en meses terminados, sin base = sin mostrar → Task 1. ✅
- Filtro por categoría, pastilla con ✕, sin hoja en blanco mientras está activo, resumen sin cambios, persiste al cambiar de mes, anular ya funciona sin tocarlo → Task 2. ✅
- Atajo de Siri, prellena sin guardar solo, validación exacta de categoría/pago, limitación de IP local documentada → Task 3. ✅
- Las 10 pruebas existentes no se tocan, solo se agregan — verificado en cada task con el conteo exacto esperado (11, luego 12, luego 12 otra vez). ✅

**Placeholders:** ninguno — cada step trae el código completo o el comando exacto.

**Consistencia de nombres:** `cambioPorcentual`, `nombreMesCorto`, `obtenerPaginas(..., categoriaFiltro)`, `estado.categoriaFiltro`/`estado._saltarAlFiltrar`, `actualizarFiltroActivo`, `precargarDesdeURL` se declaran una vez y se usan sin variación en los steps siguientes que los consumen.
