# Rediseño visual: paleta única, doblez curvo y totales individuales — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir seis problemas visuales de "Mis Gastos" encontrados al probar la Tarea 3 (doblez interactivo) en un iPhone real: modo oscuro que rompe la paleta vintage, doblez de página que se ve rígido en vez de curvo, totales en texto plano, layout con huecos, tipografía fría, y chips de categoría/pago indistinguibles entre sí.

**Architecture:** Todo el cambio vive en `index.html` (CSS + los pequeños fragmentos de HTML generados por JS). `logic.js` y `logic.test.js` no se tocan — este rediseño es 100% de presentación, no de lógica de datos ni de la matemática de arrastre ya construida (`anguloDesdeArrastre`, `debeCompletarDoblez`, `opacidadPliegue`), que se reutiliza tal cual.

**Tech Stack:** HTML/CSS/JS vanilla, sin build ni librerías externas. Pruebas con `node --test` (para confirmar que `logic.js` sigue intacto); el resto de la verificación es manual en navegador/iPhone real, porque son cambios puramente visuales sin lógica testeable con Node.

## Global Constraints

- Cero dependencias externas ni CDN — solo `logic.js` e `index.html`, como ya está.
- No se toca el modelo de datos (`{ id, monto, categoria, pago, fecha }`) ni la clave de `localStorage` (`gastos_v1`).
- No se tocan las categorías (Shaun, Swift, Salidas, Gastos Personales, Hogar) ni las formas de pago (BreB, RappiCard, Efectivo).
- No se toca `logic.js` ni `logic.test.js` — las 9 pruebas existentes (`node --test logic.test.js`) deben seguir pasando sin modificarlas, en ninguna tarea de este plan.
- Mecánica de doblez: bisagra arriba (como bloc de notas con espiral), NUNCA curl de esquina — la curvatura que se agrega en la Tarea 4 es sobre el eje de la bisagra, no una esquina que se levanta.
- Toda animación debe respetar `prefers-reduced-motion: reduce` — las reglas existentes no se rompen, y cualquier animación/capa nueva que se agregue debe incluirse en esa misma media query.
- La app usa siempre la paleta vintage cálida (papel crema, esmeralda, dorado, coral) — no debe quedar ninguna ruta de código que cambie de paleta según el modo del sistema.

---

## Archivos que se tocan

- `index.html` — únicamente. CSS (paleta, tipografía, layout, chips, totales, doblez) y los fragmentos de HTML que genera `render()`/`htmlDePagina()`/`actualizarRecibo()` en JS.

---

### Task 1: Paleta única, tipografía manuscrita y layout compacto

**Files:**
- Modify: `index.html:10-64` (bloque `:root`, media query de modo oscuro, `data-theme`, `#mesHeader`, `#resumen`)
- Modify: `index.html:179` (`#borrarTodo`)
- Modify: `index.html:185` (elimina `class="rounded"` redundante del `<h1>`)

**Interfaces:**
- Consumes: nada de otras tareas.
- Produces: nada que otras tareas consuman directamente — Task 2 sí reutiliza las variables `--tag-*` que ya existen y no se tocan aquí.

- [ ] **Step 1: Eliminar el modo oscuro y fijar `color-scheme: light`**

En `index.html`, reemplazar el bloque completo desde `:root {` (línea 10) hasta el cierre de `:root[data-theme="light"]` (línea 47) — es decir, todo el `:root` base, el `@media (prefers-color-scheme: dark)`, y los dos `:root[data-theme="..."]` — por un único `:root` sin ninguna variante oscura:

```css
  :root {
    color-scheme: light;
    --bg: #EEF0E7;
    --card: #FBFBF7;
    --ink: #1C231F;
    --muted: #6B7268;
    --line: #DEDFD3;
    --emerald: #1F6F54;
    --emerald-deep: #14503C;
    --gold: #B98A2E;
    --coral: #B5473A;
    --tag-shaun: #2F8F6B;
    --tag-swift: #B98A2E;
    --tag-salidas: #B5473A;
    --tag-gp: #46626F;
    --tag-hogar: #8A6A4E;
    --shadow: 0 8px 24px rgba(20, 30, 24, 0.10);
  }
```

`color-scheme: light` (en vez de `light dark`) evita que Safari le aplique estilos nativos oscuros a inputs/scrollbars aunque nuestra paleta se quede clara.

- [ ] **Step 2: Verificar que no quede ninguna referencia al modo oscuro**

Run: `cd /home/sebas/gastos-tracker/.claude/worktrees/libreta-pulido-doblez && grep -n "prefers-color-scheme\|data-theme" index.html`
Expected: sin resultados (ningún match).

- [ ] **Step 3: Tipografía manuscrita en el encabezado del mes**

En `index.html`, reemplazar la regla `#mesHeader` y su `::after` (ahora en la línea donde quedó tras el Step 1, buscar por el selector):

```css
  #mesHeader { text-align: center; font-size: 1.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin: 4px 0 8px; }
  #mesHeader::after { content: ''; display: block; width: 48px; height: 2px; background: var(--gold); margin: 10px auto 0; border-radius: 2px; }
```

por:

```css
  #mesHeader {
    text-align: center; font-family: 'Snell Roundhand', 'Bradley Hand', cursive, ui-rounded, -apple-system, sans-serif;
    font-size: 2.1rem; font-weight: 600; letter-spacing: 0.01em; margin: 4px 0 6px;
  }
  #mesHeader::after { content: ''; display: block; width: 48px; height: 2px; background: var(--gold); margin: 6px auto 0; border-radius: 2px; }
```

En el HTML del body, quitar la clase `rounded` del encabezado (ya no aplica, y `#mesHeader` como selector de ID tiene más especificidad que `.rounded` de todas formas, pero se quita para no confundir a quien lea el archivo después). Reemplazar:

```html
  <h1 id="mesHeader" class="rounded"></h1>
```

por:

```html
  <h1 id="mesHeader"></h1>
```

- [ ] **Step 4: Compactar los márgenes entre notebook, link de borrar y resumen**

Reemplazar la regla `#resumen` (que fija `margin-top: 22px`):

```css
  #resumen { padding: 14px 16px; border: 1px solid var(--line); border-radius: 10px; margin-top: 22px; background: var(--card); box-shadow: var(--shadow); }
```

por:

```css
  #resumen { padding: 14px 16px; border: 1px solid var(--line); border-radius: 10px; margin-top: 14px; background: var(--card); box-shadow: var(--shadow); }
```

Reemplazar la regla `#borrarTodo` (línea 179):

```css
  #borrarTodo { display: block; margin: 24px auto 0; background: none; border: none; color: var(--coral); font-size: 0.8rem; padding: 8px; }
```

por:

```css
  #borrarTodo { display: block; margin: 10px auto 0; background: none; border: none; color: var(--coral); font-size: 0.75rem; padding: 4px; }
```

Nota: la altura de la tarjeta de la libreta (`--alto-notebook`) ya se calcula midiendo el contenido real vía `ajustarAltura`/`#medidor` — no se toca esa lógica, el hueco que se percibía era de márgenes entre secciones, no de una altura mal calculada.

- [ ] **Step 5: Verificación manual en navegador**

```bash
cd /home/sebas/gastos-tracker/.claude/worktrees/libreta-pulido-doblez && python3 -m http.server 8010 --bind 0.0.0.0
```

Abrir `http://localhost:8010` (o la IP local en el iPhone). Confirmar:
- Con el sistema en modo oscuro, la app se sigue viendo con la paleta clara vintage (papel crema, esmeralda, dorado) — no cambia a negro/verde oscuro.
- El nombre del mes arriba se ve en una fuente cursiva/manuscrita, sin mayúsculas forzadas (ej. "Agosto 2026", no "AGOSTO 2026").
- El espacio entre la tarjeta de la libreta, el link de borrar y la tarjeta de resumen se ve notablemente más compacto que antes.

- [ ] **Step 6: Correr las pruebas de `logic.js` (no deben romperse)**

Run: `cd /home/sebas/gastos-tracker/.claude/worktrees/libreta-pulido-doblez && node --test logic.test.js`
Expected: PASS — 9 tests, 0 fallos (esta tarea no toca `logic.js`, es una red de seguridad).

- [ ] **Step 7: Commit**

```bash
cd /home/sebas/gastos-tracker/.claude/worktrees/libreta-pulido-doblez
git add index.html
git commit -m "$(cat <<'EOF'
Elimina el modo oscuro, tipografía manuscrita y layout más compacto

La app ahora usa siempre la paleta vintage cálida sin importar el modo
del sistema, el encabezado del mes usa una fuente cursiva en vez de
mayúsculas frías, y se reducen los márgenes entre secciones para que
la pantalla se sienta como una sola pieza.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Totales por categoría en filas individuales

**Files:**
- Modify: `index.html` (regla `#resumen .resumen-total`/`.resumen-desglose`, dentro del bloque de estilos)
- Modify: `index.html` (función `render()`, el bloque que arma `document.getElementById('resumen').innerHTML`)

**Interfaces:**
- Consumes: `calcularResumenMes(gastosDelMes) -> { total, porCategoria }` de `logic.js` (ya existe, sin cambios); `CATEGORIAS` (array de `logic.js`, ya cargado como global); `BADGE_CATEGORIA` (objeto ya definido en `index.html`, mapea nombre de categoría a clase `badge-*`).
- Produces: nada que otras tareas consuman.

- [ ] **Step 1: Reemplazar las reglas de texto plano por filas individuales**

Reemplazar en el `<style>`:

```css
  #resumen .resumen-total { font-size: 1.15rem; margin-bottom: 6px; }
  #resumen .resumen-desglose { color: var(--muted); font-size: 0.85rem; line-height: 1.7; }
```

por:

```css
  .resumen-total-mes { font-size: 1.3rem; font-weight: 700; margin-bottom: 10px; }
  .resumen-filas { display: flex; flex-direction: column; gap: 6px; }
  .resumen-fila { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }
  .resumen-fila .barra { width: 5px; height: 16px; border-radius: 3px; flex-shrink: 0; }
  .resumen-fila .nombre { flex: 1; color: var(--ink); }
  .resumen-fila .monto { color: var(--muted); font-variant-numeric: tabular-nums; }
  .barra-shaun { background: var(--tag-shaun); }
  .barra-swift { background: var(--tag-swift); }
  .barra-salidas { background: var(--tag-salidas); }
  .barra-gp { background: var(--tag-gp); }
  .barra-hogar { background: var(--tag-hogar); }
```

- [ ] **Step 2: Reescribir el bloque de `render()` que arma el resumen**

Reemplazar:

```javascript
    document.getElementById('resumen').innerHTML = `
      <div class="resumen-total rounded"><strong>Total: ${moneda(resumen.total)}</strong></div>
      <div class="resumen-desglose">${CATEGORIAS.map(cat => `${cat}: ${moneda(resumen.porCategoria[cat])}`).join(' · ')}</div>
    `;
```

por:

```javascript
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

Nota para quien implemente: `BADGE_CATEGORIA` se define más abajo en el mismo archivo (dentro del bloque de constantes, antes de `htmlDePagina`), pero como es un `const` a nivel de módulo y `render()` solo se **llama** al final del script (línea `render();`), ya está inicializado para cuando el cuerpo de la función se ejecuta — no hace falta moverlo ni declararlo de nuevo.

- [ ] **Step 3: Verificación manual en navegador**

```bash
cd /home/sebas/gastos-tracker/.claude/worktrees/libreta-pulido-doblez && python3 -m http.server 8010 --bind 0.0.0.0
```

Abrir `http://localhost:8010`, registrar un par de gastos de distintas categorías y confirmar:
- El total del mes aparece destacado arriba, más grande que las filas.
- Cada una de las 5 categorías aparece en su propia fila, con una barra de color a la izquierda que coincide con el color de su etiqueta en las hojas guardadas (mismo color que el badge de esa categoría).
- Las categorías en $0 se siguen mostrando (no desaparecen).

- [ ] **Step 4: Correr las pruebas de `logic.js` (no deben romperse)**

Run: `cd /home/sebas/gastos-tracker/.claude/worktrees/libreta-pulido-doblez && node --test logic.test.js`
Expected: PASS — 9 tests, 0 fallos.

- [ ] **Step 5: Commit**

```bash
cd /home/sebas/gastos-tracker/.claude/worktrees/libreta-pulido-doblez
git add index.html
git commit -m "$(cat <<'EOF'
Totales por categoría en filas individuales con color

Reemplaza la línea de texto plano del resumen por una fila por
categoría, con una barra del color de su etiqueta y el monto alineado
a la derecha; el total del mes queda destacado arriba.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Chips diferenciados por grupo y color, y ocultar la vista previa vacía

**Files:**
- Modify: `index.html` (CSS de `.chip`, nuevas reglas `.grupo-titulo`/`.chip-cat`/`.chip-*`)
- Modify: `index.html` (`htmlDePagina`, caso `'blanco'`)
- Modify: `index.html` (`actualizarRecibo`)

**Interfaces:**
- Consumes: `CATEGORIAS`, `PAGOS`, `BADGE_CATEGORIA` (ya existen en `index.html`, sin cambios).
- Produces: nada que otras tareas consuman.

- [ ] **Step 1: CSS de títulos de grupo y chips de categoría con color**

Agregar, justo después de la regla `.chip.selected:nth-child(even)` existente:

```css
  .grupo-titulo { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 14px 0 6px; }
  .chip-shaun { border-color: var(--tag-shaun); color: var(--tag-shaun); }
  .chip-swift { border-color: var(--tag-swift); color: var(--tag-swift); }
  .chip-salidas { border-color: var(--tag-salidas); color: var(--tag-salidas); }
  .chip-gp { border-color: var(--tag-gp); color: var(--tag-gp); }
  .chip-hogar { border-color: var(--tag-hogar); color: var(--tag-hogar); }
  .chip-cat.selected.chip-shaun { background: var(--tag-shaun); color: #fff; border-color: transparent; }
  .chip-cat.selected.chip-swift { background: var(--tag-swift); color: #fff; border-color: transparent; }
  .chip-cat.selected.chip-salidas { background: var(--tag-salidas); color: #fff; border-color: transparent; }
  .chip-cat.selected.chip-gp { background: var(--tag-gp); color: #fff; border-color: transparent; }
  .chip-cat.selected.chip-hogar { background: var(--tag-hogar); color: #fff; border-color: transparent; }
```

Estas reglas de `.selected` tienen tres clases (más específicas que la regla genérica `.chip.selected` de dos clases), así que ganan sin importar el orden en la hoja de estilos.

- [ ] **Step 2: Agregar los títulos de grupo y las clases de color a los chips en `htmlDePagina`**

Reemplazar, dentro de `htmlDePagina`, el bloque `if (contenido === 'blanco')`:

```javascript
    if (contenido === 'blanco') {
      return `
        <div class="masthead rounded">Recibo</div>
        <input type="number" id="monto" inputmode="decimal" placeholder="Monto">
        <div class="recibo-preview"><pre id="reciboPreview" class="content"></pre></div>
        <div class="chips" id="chipsCategoria">
          ${CATEGORIAS.map(c => `<button type="button" class="chip" data-cat="${c}">${c}</button>`).join('')}
        </div>
        <div class="chips" id="chipsPago">
          ${PAGOS.map(p => `<button type="button" class="chip" data-pago="${p}">${p}</button>`).join('')}
        </div>
        <button id="guardarBtn" disabled>Guardar gasto</button>
      `;
    }
```

por:

```javascript
    if (contenido === 'blanco') {
      return `
        <div class="masthead rounded">Recibo</div>
        <input type="number" id="monto" inputmode="decimal" placeholder="Monto">
        <div class="recibo-preview" id="reciboPreviewBox"><pre id="reciboPreview" class="content"></pre></div>
        <div class="grupo-titulo">Categoría</div>
        <div class="chips" id="chipsCategoria">
          ${CATEGORIAS.map(c => `<button type="button" class="chip chip-cat ${BADGE_CATEGORIA[c].replace('badge-', 'chip-')}" data-cat="${c}">${c}</button>`).join('')}
        </div>
        <div class="grupo-titulo">Forma de pago</div>
        <div class="chips" id="chipsPago">
          ${PAGOS.map(p => `<button type="button" class="chip" data-pago="${p}">${p}</button>`).join('')}
        </div>
        <button id="guardarBtn" disabled>Guardar gasto</button>
      `;
    }
```

- [ ] **Step 3: Ocultar `.recibo-preview` mientras no tenga ninguna línea que mostrar**

En `actualizarRecibo`, después del bloque `Object.keys(valores).forEach(...)` (al final de la función, antes de la llave de cierre), agregar:

```javascript
    const contenedor = document.getElementById('reciboPreviewBox');
    if (contenedor) contenedor.style.display = Object.values(valores).some(Boolean) ? '' : 'none';
```

La función completa queda (mostrando el final, sin repetir lo que ya existe arriba):

```javascript
    Object.keys(valores).forEach(key => {
      const linea = el.querySelector(`[data-linea="${key}"]`);
      const texto = valores[key];
      if (!texto) {
        clearInterval(linea._intervalo);
        linea.style.display = 'none';
        linea.textContent = '';
        delete lineasEscritas[key];
        return;
      }
      linea.style.display = '';
      if (lineasEscritas[key] !== texto) {
        if (!lineasEscritas[key]) escribirTexto(linea, texto);
        else {
          clearInterval(linea._intervalo);
          linea.textContent = texto;
        }
        lineasEscritas[key] = texto;
      }
    });

    const contenedor = document.getElementById('reciboPreviewBox');
    if (contenedor) contenedor.style.display = Object.values(valores).some(Boolean) ? '' : 'none';
  }
```

- [ ] **Step 4: Verificación manual en navegador**

```bash
cd /home/sebas/gastos-tracker/.claude/worktrees/libreta-pulido-doblez && python3 -m http.server 8010 --bind 0.0.0.0
```

Abrir `http://localhost:8010`, ir a la hoja en blanco (registrar un gasto nuevo) y confirmar:
- Aparecen los títulos "Categoría" y "Forma de pago" encima de cada grupo de chips.
- Los chips de categoría se ven con el borde y texto del color de su etiqueta, incluso sin seleccionar; al tocarlos, se rellenan con ese mismo color.
- Los chips de forma de pago se quedan neutros (sin color de categoría).
- Antes de escribir nada, no se ve ninguna caja vacía con borde entre el campo de monto y los chips; en cuanto se elige categoría/pago/monto, la vista previa del recibo aparece normalmente con la máquina de escribir.

- [ ] **Step 5: Correr las pruebas de `logic.js` (no deben romperse)**

Run: `cd /home/sebas/gastos-tracker/.claude/worktrees/libreta-pulido-doblez && node --test logic.test.js`
Expected: PASS — 9 tests, 0 fallos.

- [ ] **Step 6: Commit**

```bash
cd /home/sebas/gastos-tracker/.claude/worktrees/libreta-pulido-doblez
git add index.html
git commit -m "$(cat <<'EOF'
Diferencia los chips de categoría/pago y oculta la vista previa vacía

Cada grupo de chips lleva ahora un título ("Categoría"/"Forma de
pago"), los chips de categoría toman el color de su etiqueta incluso
sin seleccionar, y la caja de vista previa del recibo ya no se ve
como un rectángulo vacío antes de que el usuario escriba algo.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Doblez de página con curvatura de papel

**Files:**
- Modify: `index.html` (HTML dentro de `#leaf`: agregar `.crease-light`)
- Modify: `index.html` (CSS de `.crease-shadow`, nuevas reglas `.crease-light`, keyframes `flipUp`/`flipDown`/`crease`, nueva keyframe `creaseLight`, media query de `prefers-reduced-motion`)
- Modify: `index.html` (JS: `actualizarArrastrePagina`, `empezarArrastrePagina`, `terminarArrastrePagina`)

**Interfaces:**
- Consumes: `anguloDesdeArrastre`, `debeCompletarDoblez`, `opacidadPliegue` de `logic.js` (ya cargadas, sin cambios).
- Produces: nada que otra tarea consuma — es la última pieza del rediseño.

- [ ] **Step 1: Agregar la capa `.crease-light` en el HTML de `#leaf`**

Reemplazar:

```html
    <div id="leaf" class="leaf">
      <div id="faceFront" class="pagina-cara face-front"></div>
      <div class="face face-back"></div>
      <div class="crease-shadow"></div>
    </div>
```

por:

```html
    <div id="leaf" class="leaf">
      <div id="faceFront" class="pagina-cara face-front"></div>
      <div class="face face-back"></div>
      <div class="crease-shadow"></div>
      <div class="crease-light"></div>
    </div>
```

- [ ] **Step 2: CSS de la curvatura — sombra más pronunciada, luz de contraste, y keyframes con bulto a mitad de giro**

Reemplazar el bloque completo desde `.crease-shadow` hasta el cierre de la media query de `prefers-reduced-motion` que sigue a `stampFade`:

```css
  .crease-shadow { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 40%, rgba(0,0,0,.4) 50%, transparent 60%); opacity: 0; pointer-events: none; }
  .stamp { position: absolute; top: 40%; left: 50%; width: 150px; padding: 6px 0; border: 3px solid var(--coral); color: var(--coral); font-weight: bold; text-align: center; letter-spacing: .1em; transform: translate(-50%,-50%) rotate(-14deg) scale(1); opacity: 0; pointer-events: none; z-index: 10; }
  .stamp.show { animation: stampPop .9s ease forwards; }
  @keyframes stampPop { 0%{opacity:0; transform:translate(-50%,-50%) rotate(-14deg) scale(2.2);} 30%{opacity:1; transform:translate(-50%,-50%) rotate(-14deg) scale(1);} 75%{opacity:1;} 100%{opacity:0; transform:translate(-50%,-50%) rotate(-14deg) scale(1);} }
  .leaf.flip-up { animation: flipUp .7s cubic-bezier(.5,-0.2,.3,1.3) forwards; }
  .leaf.flip-down { animation: flipDown .7s cubic-bezier(.5,-0.2,.3,1.3) forwards; }
  .leaf.flip-up .crease-shadow, .leaf.flip-down .crease-shadow { animation: crease .7s ease forwards; }
  @keyframes flipUp { from{transform:rotateX(0deg);} to{transform:rotateX(-180deg);} }
  @keyframes flipDown { from{transform:rotateX(0deg);} to{transform:rotateX(180deg);} }
  @keyframes crease { 0%{opacity:0;} 45%{opacity:1;} 55%{opacity:1;} 100%{opacity:0;} }
  @media (prefers-reduced-motion: reduce) {
    .leaf.flip-up, .leaf.flip-down, .leaf.flip-up .crease-shadow, .leaf.flip-down .crease-shadow { animation: none; }
    .stamp.show { animation: stampFade .9s ease forwards; }
  }
```

por:

```css
  .crease-shadow { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 30%, rgba(0,0,0,.5) 50%, transparent 70%); opacity: 0; pointer-events: none; }
  .crease-light { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(255,255,255,.35) 0%, transparent 25%); opacity: 0; pointer-events: none; }
  .stamp { position: absolute; top: 40%; left: 50%; width: 150px; padding: 6px 0; border: 3px solid var(--coral); color: var(--coral); font-weight: bold; text-align: center; letter-spacing: .1em; transform: translate(-50%,-50%) rotate(-14deg) scale(1); opacity: 0; pointer-events: none; z-index: 10; }
  .stamp.show { animation: stampPop .9s ease forwards; }
  @keyframes stampPop { 0%{opacity:0; transform:translate(-50%,-50%) rotate(-14deg) scale(2.2);} 30%{opacity:1; transform:translate(-50%,-50%) rotate(-14deg) scale(1);} 75%{opacity:1;} 100%{opacity:0; transform:translate(-50%,-50%) rotate(-14deg) scale(1);} }
  .leaf.flip-up { animation: flipUp .7s cubic-bezier(.5,-0.2,.3,1.3) forwards; }
  .leaf.flip-down { animation: flipDown .7s cubic-bezier(.5,-0.2,.3,1.3) forwards; }
  .leaf.flip-up .crease-shadow, .leaf.flip-down .crease-shadow { animation: crease .7s ease forwards; }
  .leaf.flip-up .crease-light, .leaf.flip-down .crease-light { animation: creaseLight .7s ease forwards; }
  @keyframes flipUp {
    0%   { transform: rotateX(0deg) scaleY(1); border-radius: 6px; }
    50%  { transform: rotateX(-90deg) scaleY(0.97); border-radius: 6px 6px 18px 18px; }
    100% { transform: rotateX(-180deg) scaleY(1); border-radius: 6px; }
  }
  @keyframes flipDown {
    0%   { transform: rotateX(0deg) scaleY(1); border-radius: 6px; }
    50%  { transform: rotateX(90deg) scaleY(0.97); border-radius: 6px 6px 18px 18px; }
    100% { transform: rotateX(180deg) scaleY(1); border-radius: 6px; }
  }
  @keyframes crease { 0%{opacity:0;} 45%{opacity:1;} 55%{opacity:1;} 100%{opacity:0;} }
  @keyframes creaseLight { 0%{opacity:0;} 45%{opacity:.6;} 55%{opacity:.6;} 100%{opacity:0;} }
  @media (prefers-reduced-motion: reduce) {
    .leaf.flip-up, .leaf.flip-down, .leaf.flip-up .crease-shadow, .leaf.flip-down .crease-shadow, .leaf.flip-up .crease-light, .leaf.flip-down .crease-light { animation: none; }
    .stamp.show { animation: stampFade .9s ease forwards; }
  }
```

El `border-radius`/`scaleY` a mitad de giro (50%) simula que la hoja se curva alrededor de la bisagra en vez de girar como una tarjeta rígida, sin convertirse en un curl de esquina (la curvatura es simétrica en las dos esquinas superiores, no en una sola esquina).

- [ ] **Step 3: Aplicar la misma curvatura durante el arrastre en vivo (JS)**

En `empezarArrastrePagina`, donde ya se toma `crease` con `leaf.querySelector('.crease-shadow')`, agregar también la referencia a `.crease-light` y resetear su opacidad. Reemplazar:

```javascript
  function empezarArrastrePagina(direccion) {
    if (animando) return false;
    const { datos, alcanzoLimite } = commitCambioPagina(direccion);
    const notebook = document.getElementById('notebook');
    const leaf = document.getElementById('leaf');
    const crease = leaf.querySelector('.crease-shadow');

    notebook.style.transition = 'none';
    leaf.style.transition = 'none';
    leaf.classList.remove('flip-up', 'flip-down', 'rebote');
    leaf.style.transform = 'rotateX(0deg)';
    crease.style.transition = 'none';
    crease.style.opacity = '0';
    document.getElementById('pageUnder').innerHTML = alcanzoLimite ? '' : datos.html;

    animando = true;
    arrastrePagina = { direccion, alcanzoLimite, datos, anguloActual: 0 };
    return true;
  }
```

por:

```javascript
  function empezarArrastrePagina(direccion) {
    if (animando) return false;
    const { datos, alcanzoLimite } = commitCambioPagina(direccion);
    const notebook = document.getElementById('notebook');
    const leaf = document.getElementById('leaf');
    const crease = leaf.querySelector('.crease-shadow');
    const creaseLight = leaf.querySelector('.crease-light');

    notebook.style.transition = 'none';
    leaf.style.transition = 'none';
    leaf.classList.remove('flip-up', 'flip-down', 'rebote');
    leaf.style.transform = 'rotateX(0deg) scaleY(1)';
    leaf.style.borderRadius = '6px';
    crease.style.transition = 'none';
    crease.style.opacity = '0';
    creaseLight.style.transition = 'none';
    creaseLight.style.opacity = '0';
    document.getElementById('pageUnder').innerHTML = alcanzoLimite ? '' : datos.html;

    animando = true;
    arrastrePagina = { direccion, alcanzoLimite, datos, anguloActual: 0 };
    return true;
  }
```

Reemplazar `actualizarArrastrePagina` completa:

```javascript
  function actualizarArrastrePagina(deltaEnDireccion) {
    if (!arrastrePagina) return;
    const notebook = document.getElementById('notebook');
    const leaf = document.getElementById('leaf');
    const crease = leaf.querySelector('.crease-shadow');
    const alto = notebook.clientHeight || 220;

    let angulo = anguloDesdeArrastre(Math.max(0, deltaEnDireccion), alto);
    if (arrastrePagina.alcanzoLimite) angulo = Math.min(angulo, 18);

    const anguloConSigno = arrastrePagina.direccion === 'arriba' ? -angulo : angulo;
    leaf.style.transform = `rotateX(${anguloConSigno}deg)`;
    crease.style.opacity = String(opacidadPliegue(angulo));
    arrastrePagina.anguloActual = angulo;
  }
```

por:

```javascript
  function actualizarArrastrePagina(deltaEnDireccion) {
    if (!arrastrePagina) return;
    const notebook = document.getElementById('notebook');
    const leaf = document.getElementById('leaf');
    const crease = leaf.querySelector('.crease-shadow');
    const creaseLight = leaf.querySelector('.crease-light');
    const alto = notebook.clientHeight || 220;

    let angulo = anguloDesdeArrastre(Math.max(0, deltaEnDireccion), alto);
    if (arrastrePagina.alcanzoLimite) angulo = Math.min(angulo, 18);

    const anguloConSigno = arrastrePagina.direccion === 'arriba' ? -angulo : angulo;
    const curvatura = opacidadPliegue(angulo);
    leaf.style.transform = `rotateX(${anguloConSigno}deg) scaleY(${1 - curvatura * 0.03})`;
    leaf.style.borderRadius = `6px 6px ${6 + curvatura * 12}px ${6 + curvatura * 12}px`;
    crease.style.opacity = String(curvatura);
    creaseLight.style.opacity = String(curvatura * 0.6);
    arrastrePagina.anguloActual = angulo;
  }
```

Reemplazar `terminarArrastrePagina` completa:

```javascript
  function terminarArrastrePagina() {
    if (!arrastrePagina) return;
    const { direccion, alcanzoLimite, anguloActual, datos } = arrastrePagina;
    const notebook = document.getElementById('notebook');
    const leaf = document.getElementById('leaf');
    const crease = leaf.querySelector('.crease-shadow');
    const completar = !alcanzoLimite && debeCompletarDoblez(anguloActual);

    leaf.style.transition = 'transform .35s cubic-bezier(.34,1.56,.64,1)';
    crease.style.transition = 'opacity .35s ease';

    if (completar) {
      const anguloFinal = direccion === 'arriba' ? -180 : 180;
      leaf.style.transform = `rotateX(${anguloFinal}deg)`;
      crease.style.opacity = '0';
      setTimeout(() => {
        leaf.style.transition = '';
        leaf.style.transform = 'rotateX(0deg)';
        document.getElementById('faceFront').innerHTML = datos.html;
        document.getElementById('pageUnder').innerHTML = '';
        crease.style.transition = '';
        crease.style.opacity = '';
        notebook.style.transition = '';
        marcarSeleccionActiva();
        actualizarGuardar();
        actualizarRecibo();
        animando = false;
        arrastrePagina = null;
      }, 350);
      return;
    }

    if (!alcanzoLimite) {
      estado.posicion += (direccion === 'arriba' ? 1 : -1);
      render();
    } else {
      notebook.classList.remove('rebote'); void notebook.offsetWidth; notebook.classList.add('rebote');
    }
    leaf.style.transform = 'rotateX(0deg)';
    crease.style.opacity = '0';
    setTimeout(() => {
      leaf.style.transition = '';
      crease.style.transition = '';
      crease.style.opacity = '';
      document.getElementById('pageUnder').innerHTML = '';
      notebook.style.transition = '';
      animando = false;
      arrastrePagina = null;
    }, 350);
  }
```

por:

```javascript
  function terminarArrastrePagina() {
    if (!arrastrePagina) return;
    const { direccion, alcanzoLimite, anguloActual, datos } = arrastrePagina;
    const notebook = document.getElementById('notebook');
    const leaf = document.getElementById('leaf');
    const crease = leaf.querySelector('.crease-shadow');
    const creaseLight = leaf.querySelector('.crease-light');
    const completar = !alcanzoLimite && debeCompletarDoblez(anguloActual);

    leaf.style.transition = 'transform .35s cubic-bezier(.34,1.56,.64,1), border-radius .35s ease';
    crease.style.transition = 'opacity .35s ease';
    creaseLight.style.transition = 'opacity .35s ease';

    if (completar) {
      const anguloFinal = direccion === 'arriba' ? -180 : 180;
      leaf.style.transform = `rotateX(${anguloFinal}deg) scaleY(1)`;
      leaf.style.borderRadius = '6px';
      crease.style.opacity = '0';
      creaseLight.style.opacity = '0';
      setTimeout(() => {
        leaf.style.transition = '';
        leaf.style.transform = 'rotateX(0deg)';
        leaf.style.borderRadius = '';
        document.getElementById('faceFront').innerHTML = datos.html;
        document.getElementById('pageUnder').innerHTML = '';
        crease.style.transition = '';
        crease.style.opacity = '';
        creaseLight.style.transition = '';
        creaseLight.style.opacity = '';
        notebook.style.transition = '';
        marcarSeleccionActiva();
        actualizarGuardar();
        actualizarRecibo();
        animando = false;
        arrastrePagina = null;
      }, 350);
      return;
    }

    if (!alcanzoLimite) {
      estado.posicion += (direccion === 'arriba' ? 1 : -1);
      render();
    } else {
      notebook.classList.remove('rebote'); void notebook.offsetWidth; notebook.classList.add('rebote');
    }
    leaf.style.transform = 'rotateX(0deg) scaleY(1)';
    leaf.style.borderRadius = '6px';
    crease.style.opacity = '0';
    creaseLight.style.opacity = '0';
    setTimeout(() => {
      leaf.style.transition = '';
      leaf.style.borderRadius = '';
      crease.style.transition = '';
      crease.style.opacity = '';
      creaseLight.style.transition = '';
      creaseLight.style.opacity = '';
      document.getElementById('pageUnder').innerHTML = '';
      notebook.style.transition = '';
      animando = false;
      arrastrePagina = null;
    }, 350);
  }
```

- [ ] **Step 4: Correr las pruebas de `logic.js` (no deben romperse)**

Run: `cd /home/sebas/gastos-tracker/.claude/worktrees/libreta-pulido-doblez && node --test logic.test.js`
Expected: PASS — 9 tests, 0 fallos (esta tarea no toca `logic.js`, es una red de seguridad).

- [ ] **Step 5: Verificación manual en el iPhone real**

```bash
cd /home/sebas/gastos-tracker/.claude/worktrees/libreta-pulido-doblez && python3 -m http.server 8010 --bind 0.0.0.0
```

Confirmar la IP local (`hostname -I`) y abrir `http://<esa-ip>:8010` en Safari del iPhone. Verificar:
- Al arrastrar la hoja (con el dedo o con el mouse en escritorio), la esquina superior de la página se ve curvarse ligeramente a mitad del giro, en vez de girar como una tarjeta perfectamente plana.
- Se nota una sombra de pliegue más marcada y un destello de luz sutil en el lado opuesto, reforzando la sensación de superficie curva.
- Al guardar un gasto (doblez automático) y al usar los botones ocultos de mover página, el mismo efecto de curvatura se ve durante la animación de 0.7s.
- La curvatura desaparece por completo con "Reducir movimiento" activado en Ajustes > Accesibilidad > Movimiento — solo cambia el contenido, sin rotación ni curvatura.
- Nada de esto rompe el comportamiento ya validado en la ronda anterior: resistencia en los límites (portada / gasto más antiguo), rebote, y que el arrastre no se dispare a la vez que el cambio de mes en un swipe diagonal.

- [ ] **Step 6: Commit**

```bash
cd /home/sebas/gastos-tracker/.claude/worktrees/libreta-pulido-doblez
git add index.html
git commit -m "$(cat <<'EOF'
Doblez de página con curvatura de papel en vez de giro rígido

La hoja ahora se curva ligeramente (border-radius + scaleY dinámicos,
más una capa de luz junto a la sombra de pliegue existente) a mitad
del giro, tanto en el arrastre en vivo como en la animación automática
de guardar/botones, dando sensación de papel flexionándose alrededor
de la bisagra en vez de una tarjeta rígida rotando.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Cobertura del spec:**
- Modo oscuro eliminado, paleta única siempre → Task 1, Steps 1-2. ✅
- Doblez con curvatura, sin curl de esquina → Task 4. ✅
- Totales en filas individuales con color, incluidas categorías en $0 → Task 2. ✅
- Layout compacto (altura por contenido ya existente, márgenes reducidos, link de borrar discreto) → Task 1, Steps 3-4. ✅
- Tipografía manuscrita en el encabezado → Task 1, Step 3. ✅
- Chips diferenciados por grupo y color, vista previa oculta cuando está vacía → Task 3. ✅
- `logic.js`/`logic.test.js` sin tocar, 9 pruebas en verde → verificado como paso de cada tarea. ✅
- `prefers-reduced-motion` respetado, incluida la nueva capa `.crease-light` → Task 4, Step 2. ✅

**Placeholders:** ninguno — cada step trae el código completo o el comando exacto.

**Consistencia de nombres:** `crease-light`/`creaseLight` se declaran en Task 4 Step 1-2 y se usan sin variación en Step 3 (`leaf.querySelector('.crease-light')`, animación CSS `creaseLight`). `reciboPreviewBox` se declara en Task 3 Step 2 y se consume en Step 3 con el mismo id. `barra-*`/`chip-*` derivan siempre de `BADGE_CATEGORIA[...].replace('badge-', ...)`, sin una tabla de nombres paralela que se pueda desincronizar.
