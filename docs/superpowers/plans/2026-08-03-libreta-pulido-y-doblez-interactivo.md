# Pulido visual y doblez de página interactivo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pulir el sistema visual de "Mis Gastos" y reemplazar el gesto de pasar página por uno que sigue al dedo en vivo en 3D, con resorte al soltar.

**Architecture:** Todo vive en dos archivos ya existentes, sin dependencias nuevas: `logic.js` gana tres funciones puras para la matemática del arrastre (testables con Node), y `index.html` (HTML+CSS+JS inline) consume esas funciones para animar `#leaf` a mano durante el gesto, en vez de depender solo de clases CSS con `@keyframes`.

**Tech Stack:** HTML/CSS/JS vanilla, sin build ni librerías externas. Pruebas con `node --test` (ya usado en el proyecto).

## Global Constraints

- Cero dependencias externas ni CDN — solo `logic.js` e `index.html`, como ya está.
- No se toca el modelo de datos (`{ id, monto, categoria, pago, fecha }`) ni la clave de `localStorage` (`gastos_v1`).
- No se tocan las categorías (Shaun, Swift, Salidas, Gastos Personales, Hogar) ni las formas de pago (BreB, RappiCard, Efectivo).
- Toda animación debe respetar `prefers-reduced-motion: reduce` (ya hay media queries para esto; no romperlas).
- Las 6 pruebas existentes de `logic.test.js` deben seguir pasando sin modificarlas.
- Mecánica de doblez: bisagra arriba (como bloc de notas con espiral), NUNCA curl de esquina — así quedó decidido en el spec.

---

## Archivos que se tocan

- `logic.js` — se agregan 3 funciones puras nuevas al final, antes del `module.exports`.
- `logic.test.js` — se agregan tests para esas 3 funciones.
- `index.html` — CSS de pulido visual, un pequeño cambio en `htmlDePagina`, y una reescritura de la mecánica de arrastre (`moverPagina`, `gestos()`, y funciones nuevas para el arrastre en vivo).

---

### Task 1: Funciones puras de la matemática del arrastre

**Files:**
- Modify: `logic.js` (agregar antes de la línea 48, `if (typeof module !== 'undefined') {`)
- Modify: `logic.test.js` (agregar al final del archivo)

**Interfaces:**
- Produces: `anguloDesdeArrastre(deltaAbsoluto, altoPx) -> number` (0 a 180, grados), `debeCompletarDoblez(anguloAbsoluto) -> boolean`, `opacidadPliegue(anguloAbsoluto) -> number` (0 a 1). Las tres reciben siempre magnitudes **no negativas** (el signo de la dirección se aplica afuera, en `index.html`). Todas exportadas en `module.exports` junto a las funciones existentes.

- [ ] **Step 1: Escribir los tests que fallan**

Agregar al final de `logic.test.js`:

```javascript
const { anguloDesdeArrastre, debeCompletarDoblez, opacidadPliegue } = require('./logic.js');

test('anguloDesdeArrastre convierte distancia arrastrada en grados, acotado a 180', () => {
  assert.strictEqual(anguloDesdeArrastre(0, 220), 0);
  assert.strictEqual(anguloDesdeArrastre(110, 220), 90);
  assert.strictEqual(anguloDesdeArrastre(220, 220), 180);
  assert.strictEqual(anguloDesdeArrastre(500, 220), 180, 'no debe pasarse de 180 aunque se arrastre más que el alto');
  assert.strictEqual(anguloDesdeArrastre(50, 0), 0, 'con alto 0 no debe dividir por cero');
});

test('debeCompletarDoblez se cumple desde la mitad del giro (90 grados) en adelante', () => {
  assert.strictEqual(debeCompletarDoblez(89), false);
  assert.strictEqual(debeCompletarDoblez(90), true);
  assert.strictEqual(debeCompletarDoblez(180), true);
  assert.strictEqual(debeCompletarDoblez(0), false);
});

test('opacidadPliegue crece hacia la mitad del giro y baja cerca de los extremos', () => {
  assert.strictEqual(opacidadPliegue(0), 0);
  assert.ok(Math.abs(opacidadPliegue(90) - 1) < 0.0001, 'a 90 grados la sombra debe estar en su punto máximo');
  assert.ok(opacidadPliegue(170) < opacidadPliegue(90), 'cerca de 180 grados la sombra vuelve a bajar');
  assert.ok(Math.abs(opacidadPliegue(180)) < 0.0001);
});
```

- [ ] **Step 2: Correr los tests para confirmar que fallan**

Run: `cd /home/sebas/gastos-tracker && node --test logic.test.js`
Expected: FAIL — `anguloDesdeArrastre is not a function` (o similar) para los 3 tests nuevos; los 6 tests existentes siguen en verde.

- [ ] **Step 3: Implementar las funciones**

En `logic.js`, agregar justo antes de la línea `if (typeof module !== 'undefined') {` (línea 48 actual):

```javascript
function anguloDesdeArrastre(deltaAbsoluto, altoPx) {
  if (!altoPx) return 0;
  return clamp((deltaAbsoluto / altoPx) * 180, 0, 180);
}

function debeCompletarDoblez(anguloAbsoluto) {
  return anguloAbsoluto >= 90;
}

function opacidadPliegue(anguloAbsoluto) {
  const grados = clamp(anguloAbsoluto, 0, 180);
  return Math.sin(grados * Math.PI / 180);
}
```

Y agregar las tres funciones al `module.exports` existente, que queda así:

```javascript
if (typeof module !== 'undefined') {
  module.exports = {
    CATEGORIAS,
    mesKeyDeFecha, agruparPorMes, mesesDisponibles,
    calcularResumenMes, obtenerPaginas, clamp,
    anguloDesdeArrastre, debeCompletarDoblez, opacidadPliegue
  };
}
```

- [ ] **Step 4: Correr los tests para confirmar que pasan**

Run: `cd /home/sebas/gastos-tracker && node --test logic.test.js`
Expected: PASS — 9 tests en total (los 6 de antes más los 3 nuevos), 0 fallos.

- [ ] **Step 5: Commit**

```bash
cd /home/sebas/gastos-tracker
git add logic.js logic.test.js
git commit -m "$(cat <<'EOF'
Agrega funciones puras para la matemática del arrastre de página

anguloDesdeArrastre, debeCompletarDoblez y opacidadPliegue quedan
testables con Node, separadas del código de DOM que las va a usar
en index.html para el doblez de página interactivo.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Pulido visual

**Files:**
- Modify: `index.html:59` (encabezado del mes)
- Modify: `index.html:69-91` (chips y botón guardar)
- Modify: `index.html:96-101` (badges — se agregan colores de filo)
- Modify: `index.html:121-122` y `128` (`.pagina-cara` / `.face` — textura de papel)
- Modify: `index.html:264-301` (`BADGE_CATEGORIA` y `htmlDePagina` — se agrega la clase de color al contenedor de la hoja escrita)

**Interfaces:**
- Consumes: nada nuevo de Task 1.
- Produces: nada que otras tareas consuman — es CSS + un ajuste menor de HTML generado, autocontenido.

- [ ] **Step 1: Textura de papel en las tarjetas**

En `index.html`, dentro de la regla `.pagina-cara` (línea 122) y `.face` (línea 128), agregar un `background-image` de ruido sutil superpuesto al color sólido que ya tienen. Reemplazar:

```css
  .pagina-cara { background: var(--card); border: 1px solid var(--line); padding: 18px; box-sizing: border-box; box-shadow: var(--shadow); overflow: auto; }
```

por:

```css
  .pagina-cara {
    background-color: var(--card);
    background-image:
      radial-gradient(circle at 20% 30%, rgba(0,0,0,0.015) 0, transparent 40%),
      radial-gradient(circle at 80% 70%, rgba(0,0,0,0.015) 0, transparent 40%),
      radial-gradient(circle at 50% 90%, rgba(0,0,0,0.012) 0, transparent 45%);
    border: 1px solid var(--line); padding: 18px; box-sizing: border-box; box-shadow: var(--shadow); overflow: auto;
  }
```

Y en `.face` (línea 128), agregar el mismo `background-image` manteniendo el resto de sus propiedades:

```css
  .face {
    background-image:
      radial-gradient(circle at 20% 30%, rgba(0,0,0,0.015) 0, transparent 40%),
      radial-gradient(circle at 80% 70%, rgba(0,0,0,0.015) 0, transparent 40%),
      radial-gradient(circle at 50% 90%, rgba(0,0,0,0.012) 0, transparent 45%);
    backface-visibility: hidden; border: 1px solid var(--line); box-sizing: border-box; padding: 18px; box-shadow: var(--shadow); overflow: auto;
  }
```

- [ ] **Step 2: Jerarquía tipográfica de la hoja de un gasto guardado**

En `htmlDePagina` (línea 292-300), el monto pasa a ser el elemento más grande, categoría y pago quedan como texto secundario. Reemplazar el bloque de retorno para el caso de un gasto ya guardado:

```javascript
    const badgeClase = BADGE_CATEGORIA[contenido.categoria] || 'badge-hogar';
    const iniciales = INICIALES_CATEGORIA[contenido.categoria] || '?';
    return `
      <div class="hoja-escrita ${badgeClase}">
        <div class="masthead rounded">Recibo</div>
        <p class="monto-grande rounded">${moneda(contenido.monto)}</p>
        <p class="content detalle-secundario"><span class="badge ${badgeClase}">${iniciales}</span>${contenido.categoria}</p>
        <p class="content detalle-secundario">${contenido.pago}</p>
        <button class="anular" data-id="${contenido.id}">Anular este gasto</button>
      </div>
    `;
```

Y agregar las clases nuevas al `<style>`, después de la regla `.content` (línea 94):

```css
  .monto-grande { font-size: 2rem; font-weight: 700; margin: 4px 0 10px; }
  .detalle-secundario { color: var(--muted); font-size: 0.85rem; margin: 2px 0; }
```

- [ ] **Step 3: Filo de color por categoría**

Agregar, después de las reglas `.badge-*` (línea 101), un filo izquierdo de color en `.hoja-escrita` según la misma clase de badge que ya trae (reutiliza `badgeClase`, agregada al contenedor en el Step 2):

```css
  .hoja-escrita { border-left: 5px solid transparent; padding-left: 13px; margin: -18px -18px -18px -13px; padding-top: 0; padding-right: 0; padding-bottom: 0; }
  .hoja-escrita.badge-shaun { border-left-color: var(--tag-shaun); }
  .hoja-escrita.badge-swift { border-left-color: var(--tag-swift); }
  .hoja-escrita.badge-salidas { border-left-color: var(--tag-salidas); }
  .hoja-escrita.badge-gp { border-left-color: var(--tag-gp); }
  .hoja-escrita.badge-hogar { border-left-color: var(--tag-hogar); }
```

Nota: como `.pagina-cara`/`.face` ya traen `padding: 18px`, el margen negativo en `.hoja-escrita` hace que el filo llegue hasta el borde real de la tarjeta en vez de quedar flotando a 18px del borde; el `padding-left: 13px` deja 5px de filo + 8px de aire antes del texto. Verificar visualmente en el Step 6 que no se ve descuadrado.

- [ ] **Step 4: Chips tipo sello y botón "Guardar gasto" con relieve**

Reemplazar la regla `.chip.selected` (línea 76):

```css
  .chip.selected { border-color: var(--emerald); background: var(--emerald); color: #fff; box-shadow: 0 3px 10px rgba(31,111,84,0.35); }
```

por:

```css
  .chip.selected { border-color: var(--emerald); background: var(--emerald); color: #fff; box-shadow: 0 3px 10px rgba(31,111,84,0.35); transform: rotate(-2deg); }
  .chip.selected:nth-child(even) { transform: rotate(2deg); }
```

Reemplazar la regla `#guardarBtn` (línea 83-89):

```css
  #guardarBtn {
    width: 100%; padding: 14px; margin-top: 14px; border: none; border-radius: 12px;
    background: var(--emerald); color: #fff; font-weight: 700; font-size: 1rem;
    letter-spacing: 0.04em; text-transform: uppercase;
    box-shadow: 0 4px 14px rgba(31,111,84,0.3);
    transition: transform .15s ease, opacity .15s ease, box-shadow .15s ease;
  }
```

por:

```css
  #guardarBtn {
    width: 100%; padding: 14px; margin-top: 14px; border: none; border-radius: 12px;
    background: linear-gradient(180deg, var(--emerald) 0%, var(--emerald-deep) 100%);
    color: #fff; font-weight: 700; font-size: 1rem;
    letter-spacing: 0.04em; text-transform: uppercase;
    box-shadow: 0 4px 14px rgba(31,111,84,0.35), inset 0 1px 0 rgba(255,255,255,0.15);
    transition: transform .15s ease, opacity .15s ease, box-shadow .15s ease;
  }
```

- [ ] **Step 5: Encabezado del mes más marcado**

Reemplazar la regla `#mesHeader` (línea 59):

```css
  #mesHeader { text-align: center; font-size: 1.5rem; font-weight: 700; letter-spacing: 0.02em; margin: 4px 0 18px; }
```

por:

```css
  #mesHeader { text-align: center; font-size: 1.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin: 4px 0 8px; }
  #mesHeader::after { content: ''; display: block; width: 48px; height: 2px; background: var(--gold); margin: 10px auto 0; border-radius: 2px; }
```

- [ ] **Step 6: Verificación manual en navegador**

```bash
cd /home/sebas/gastos-tracker && python3 -m http.server 8000
```

Abrir `http://localhost:8000` con las herramientas de desarrollador en modo de vista móvil (iPhone). Confirmar:
- Las tarjetas se ven con una textura sutil, no un color plano ni ruidosa al punto de estorbar la lectura.
- En una hoja de gasto guardado, el monto es claramente el elemento más grande; categoría y pago se ven más chicos y grises debajo.
- El filo de color a la izquierda coincide con el color del badge de esa categoría y llega hasta el borde de la tarjeta, sin dejar un hueco raro ni desbordarse.
- Al elegir un chip de categoría o pago, gira levemente y se ve con más sombra, tipo sello.
- El botón "Guardar gasto" se ve con relieve (gradiente + sombra), no plano.
- El nombre del mes arriba se ve más grande, en mayúsculas, con una rayita dorada debajo.
- Insertar un gasto de prueba, guardar, y confirmar que nada de esto rompe el flujo existente (máquina de escribir, sello "GUARDADO", doblez al guardar).

- [ ] **Step 7: Commit**

```bash
cd /home/sebas/gastos-tracker
git add index.html
git commit -m "$(cat <<'EOF'
Pulido visual: textura de papel, jerarquía del monto, filo de
categoría, chips tipo sello y botón guardar con relieve

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Doblez de página interactivo (sigue al dedo)

**Files:**
- Modify: `index.html:138-139` (corrige la dirección del keyframe `flipDown`, necesaria para que el nuevo código de arrastre y el de los botones compartan la misma convención de ángulos)
- Modify: `index.html:316-355` (reemplaza `moverPagina` por `commitCambioPagina` + `moverPagina` más las funciones nuevas de arrastre)
- Modify: `index.html:450-487` (`cambiarMes` — ajuste de tiempos)
- Modify: `index.html:502-553` (reescribe `gestos()`)

**Interfaces:**
- Consumes: `anguloDesdeArrastre`, `debeCompletarDoblez`, `opacidadPliegue` de `logic.js` (Task 1), ya cargado en la página vía `<script src="logic.js">`.
- Produces: nada que otra tarea consuma — es la última pieza.

- [ ] **Step 1: Corregir la dirección del keyframe `flipDown`**

El keyframe actual asume que la hoja ya está en -180° antes de empezar a bajar, pero `terminar()` siempre la resetea a 0° al final de cada doblez — así que en realidad `flipDown` arranca en 0°, no en -180°, y el navegador salta de golpe al valor "from" del keyframe en vez de animar. Reemplazar en `index.html` (línea 138-139):

```css
  @keyframes flipUp { from{transform:rotateX(0deg);} to{transform:rotateX(-180deg);} }
  @keyframes flipDown { from{transform:rotateX(-180deg);} to{transform:rotateX(0deg);} }
```

por:

```css
  @keyframes flipUp { from{transform:rotateX(0deg);} to{transform:rotateX(-180deg);} }
  @keyframes flipDown { from{transform:rotateX(0deg);} to{transform:rotateX(180deg);} }
```

Esto no cambia el resultado visual final (`.face-back` sigue quedando de frente al terminar, porque `180 + 180 = 360 = 0` igual que antes con `-180 + 180 = 0`), pero ahora la animación sí interpola desde donde la hoja realmente está.

- [ ] **Step 2: Separar "decidir y aplicar el cambio de estado" de "animar" en `moverPagina`**

Esto se necesita porque el arrastre en vivo (Step 3) necesita adelantar `estado.posicion` y re-renderizar **antes** de que el usuario termine de soltar el dedo (para saber si hay una página siguiente y prepararla en `pageUnder`), algo que hoy `moverPagina` hace todo junto. Reemplazar la función completa `moverPagina` (líneas 318-355) por:

```javascript
  function commitCambioPagina(direccion) {
    const posicionAnterior = estado.posicion;
    estado.posicion += (direccion === 'arriba' ? -1 : 1);
    const datos = render();
    const alcanzoLimite = estado.posicion === posicionAnterior;
    return { datos, alcanzoLimite };
  }

  function moverPagina(direccion) {
    if (animando) return;
    const { datos, alcanzoLimite } = commitCambioPagina(direccion);
    const leaf = document.getElementById('leaf');
    if (alcanzoLimite) {
      leaf.classList.remove('rebote'); void leaf.offsetWidth; leaf.classList.add('rebote');
      return;
    }
    animando = true;
    leaf.classList.remove('flip-up', 'flip-down');
    void leaf.offsetWidth;
    document.getElementById('pageUnder').innerHTML = datos.html;
    leaf.classList.add(direccion === 'arriba' ? 'flip-up' : 'flip-down');

    let terminado = false;
    const terminar = () => {
      if (terminado) return;
      terminado = true;
      leaf.style.transform = 'rotateX(0deg)';
      leaf.classList.remove('flip-up', 'flip-down');
      document.getElementById('faceFront').innerHTML = datos.html;
      document.getElementById('pageUnder').innerHTML = '';
      marcarSeleccionActiva();
      actualizarGuardar();
      actualizarRecibo();
      leaf.removeEventListener('animationend', terminar);
      animando = false;
    };
    leaf.addEventListener('animationend', terminar, { once: true });
    setTimeout(terminar, 750);
  }
```

Esta función queda igual de comportamiento que antes (la usan `guardarGasto`, y los botones ocultos `#btnArriba`/`#btnAbajo`) — el único cambio real es que la parte de "avanzar `estado.posicion` y re-renderizar" ahora vive en `commitCambioPagina`, reutilizable por el arrastre en vivo.

- [ ] **Step 3: Funciones del arrastre en vivo**

Agregar, inmediatamente después de la función `moverPagina` recién reescrita (antes de `function guardarGasto()`):

```javascript
  let arrastrePagina = null;

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

Notas sobre este código para quien lo implemente:
- `empezarArrastrePagina` usa `commitCambioPagina` (de Task 2 de este mismo archivo) para "espiar" si hay una página siguiente, dejando `estado.posicion` ya adelantado. Si al soltar no se completa el doblez, `terminarArrastrePagina` lo revierte sumando/restando 1 de nuevo y llamando a `render()`.
- El tope de 18° en el caso `alcanzoLimite` (línea con `Math.min(angulo, 18)`) da sensación de "resistencia" en el límite (portada o gasto más viejo) en vez de dejar que la hoja gire libremente hacia una página que no existe.
- `notebook.style.transition = 'none'` al empezar el arrastre evita que la animación de alto (`transition: height .25s ease` de la regla `#notebook`) compita visualmente con el arrastre; se restaura (`= ''`) al terminar, dejando que la transición normal de la clase vuelva a aplicar para los próximos cambios de mes o de página por botón.

- [ ] **Step 4: Reescribir `gestos()` para decidir el eje en vivo y conectar el arrastre**

Reemplazar el IIFE completo `gestos()` (líneas 502-553) por:

```javascript
  (function gestos() {
    const UMBRAL_EJE = 10;
    const UMBRAL_X = 60;
    let inicio = null;
    let eje = null;

    function esCampoInteractivo(el) {
      return !!(el && el.closest && el.closest('input, textarea, select, button, .chip, .anular, [contenteditable]'));
    }

    function empezar(x, y, target) {
      if (esCampoInteractivo(target)) { inicio = null; eje = null; return; }
      inicio = { x, y };
      eje = null;
    }

    function mover(x, y, evento) {
      if (!inicio) return;
      const deltaX = x - inicio.x;
      const deltaY = y - inicio.y;

      if (eje === null) {
        if (Math.abs(deltaX) < UMBRAL_EJE && Math.abs(deltaY) < UMBRAL_EJE) return;
        eje = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
        if (eje === 'vertical') {
          const direccion = deltaY < 0 ? 'arriba' : 'abajo';
          empezarArrastrePagina(direccion);
        }
      }

      if (eje === 'vertical' && arrastrePagina) {
        if (evento.cancelable) evento.preventDefault();
        const deltaEnDireccion = arrastrePagina.direccion === 'arriba' ? -deltaY : deltaY;
        actualizarArrastrePagina(deltaEnDireccion);
      } else if (eje === 'horizontal') {
        if (evento.cancelable) evento.preventDefault();
      }
    }

    function terminar(x, y) {
      if (eje === 'vertical' && arrastrePagina) {
        terminarArrastrePagina();
      } else if (eje === 'horizontal' && inicio) {
        const deltaX = x - inicio.x;
        if (deltaX <= -UMBRAL_X) cambiarMes(1);
        else if (deltaX >= UMBRAL_X) cambiarMes(-1);
      }
      inicio = null;
      eje = null;
    }

    const notebook = document.getElementById('notebook');
    notebook.addEventListener('touchstart', (e) => empezar(e.touches[0].clientX, e.touches[0].clientY, e.target), { passive: true });
    notebook.addEventListener('touchmove', (e) => mover(e.touches[0].clientX, e.touches[0].clientY, e), { passive: false });
    notebook.addEventListener('touchend', (e) => terminar(e.changedTouches[0].clientX, e.changedTouches[0].clientY));

    notebook.addEventListener('mousedown', (e) => empezar(e.clientX, e.clientY, e.target));
    document.addEventListener('mousemove', (e) => { if (inicio) mover(e.clientX, e.clientY, e); });
    document.addEventListener('mouseup', (e) => terminar(e.clientX, e.clientY));
  })();
```

- [ ] **Step 5: Ajustar los tiempos de `cambiarMes` al nuevo ritmo**

El doblez de página ahora cierra en 350ms (Step 3). En `cambiarMes` (línea 450-487), ajustar los dos `setTimeout` para que el cambio de mes se sienta con el mismo ritmo. Reemplazar:

```javascript
    setTimeout(() => {
      estado.mesIndex = nuevoIndex;
      estado.posicion = -1;
      window._paginaInicial = false;
      render();

      notebook.classList.remove('mes-saliendo');
      notebook.classList.add('mes-entrando', direccion);
      void notebook.offsetWidth;
      requestAnimationFrame(() => {
        notebook.classList.remove('mes-entrando');
        notebook.classList.add('mes-mostrar');
      });
      setTimeout(() => {
        notebook.classList.remove(direccion, 'mes-mostrar');
        animando = false;
      }, 240);
    }, 200);
```

por:

```javascript
    setTimeout(() => {
      estado.mesIndex = nuevoIndex;
      estado.posicion = -1;
      window._paginaInicial = false;
      render();

      notebook.classList.remove('mes-saliendo');
      notebook.classList.add('mes-entrando', direccion);
      void notebook.offsetWidth;
      requestAnimationFrame(() => {
        notebook.classList.remove('mes-entrando');
        notebook.classList.add('mes-mostrar');
      });
      setTimeout(() => {
        notebook.classList.remove(direccion, 'mes-mostrar');
        animando = false;
      }, 350);
    }, 260);
```

(También conviene revisar las duraciones en CSS de `#notebook.mes-saliendo`/`.mes-entrando`/`.mes-mostrar`, línea 110, hoy en `.22s` — subirlas a `.26s` para que combinen con el `setTimeout` de 260ms. Reemplazar `transition: transform .22s ease, opacity .22s ease;` por `transition: transform .26s ease, opacity .26s ease;` en esa regla.)

- [ ] **Step 6: Correr las pruebas de `logic.js` (no deben romperse)**

Run: `cd /home/sebas/gastos-tracker && node --test logic.test.js`
Expected: PASS — 9 tests, 0 fallos (nada de este task toca `logic.js`, pero sirve como red de seguridad antes de dar la tarea por terminada).

- [ ] **Step 7: Verificación manual en el iPhone real**

```bash
cd /home/sebas/gastos-tracker && python3 -m http.server 8000 --bind 0.0.0.0
```

Confirmar la IP local vigente (`hostname -I` o `ip -4 addr show <interfaz-wifi>`) y abrir `http://<esa-ip>:8000` en Safari del iPhone, en la misma wifi. Verificar:
- Arrastrar lentamente hacia abajo dentro del cuaderno y soltar antes de la mitad del giro: la hoja debe volver a su lugar sin cambiar de contenido.
- Arrastrar pasando la mitad y soltar: la hoja debe terminar de doblarse sola y mostrar la página siguiente.
- Repetir ambos casos arrastrando hacia arriba.
- La sombra de pliegue debe verse crecer y disminuir de forma progresiva durante el arrastre (no aparecer de golpe).
- En la portada (límite superior) y en el gasto más antiguo del mes (límite inferior), arrastrar debe sentirse "con resistencia" (la hoja gira poco) y siempre volver a su lugar con el rebote, sin importar qué tan fuerte se arrastre.
- Deslizar a los lados sigue cambiando de mes con el fundido lateral, sin que se dispare a la vez el doblez de página en un swipe diagonal.
- Registrar un gasto nuevo y confirmar que el doblez automático al guardar (el que dispara `guardarGasto` vía `moverPagina`) se sigue viendo bien.
- Repetir la prueba también con "Reducir movimiento" activado en Ajustes > Accesibilidad > Movimiento del iPhone, y confirmar que el cambio de página ocurre sin ninguna rotación 3D (solo cambia el contenido).

- [ ] **Step 8: Commit**

```bash
cd /home/sebas/gastos-tracker
git add index.html
git commit -m "$(cat <<'EOF'
Doblez de página interactivo: la hoja sigue al dedo en vivo

Reemplaza el swipe-dispara-animación-completa por un arrastre en 3D
en tiempo real (ángulo, sombra de pliegue y resistencia en los límites
calculados con las funciones puras de logic.js), con resorte de vuelta
si se suelta antes de la mitad del giro. De paso corrige la dirección
del keyframe flipDown, que animaba desde un ángulo en el que la hoja
nunca estaba realmente.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Cobertura del spec:**
- Papel con textura → Task 2, Step 1. ✅
- Jerarquía tipográfica del monto → Task 2, Step 2. ✅
- Filo de categoría → Task 2, Step 3. ✅
- Chips tipo sello y botón con relieve → Task 2, Step 4. ✅
- Encabezado del mes más marcado → Task 2, Step 5. ✅
- Ángulo en vivo durante el arrastre → Task 1 (matemática) + Task 3, Steps 3-4. ✅
- Sombra de pliegue progresiva → Task 1 (`opacidadPliegue`) + Task 3, Step 3. ✅
- Completar o volver según la mitad del giro → Task 1 (`debeCompletarDoblez`) + Task 3, Step 3. ✅
- Bloqueo de gestos superpuestos (`animando`) → se mantiene en Task 3, Steps 2-4. ✅
- `prefers-reduced-motion` respetado → ya cubierto por las media queries existentes (no se tocan); Task 3 Step 7 lo verifica explícitamente. ✅
- Ajuste de ritmo del cambio de mes → Task 3, Step 5. ✅
- Fuera de alcance (curl de esquina, librerías externas, modelo de datos) → ninguna tarea lo toca. ✅

**Placeholders:** ninguno — cada step tiene código completo o un comando exacto.

**Consistencia de tipos/nombres:** `anguloDesdeArrastre`, `debeCompletarDoblez` y `opacidadPliegue` se definen en Task 1 con esos nombres exactos y se usan sin variación en Task 3. `commitCambioPagina` se define en Task 3 Step 2 y se usa en Step 3 con la misma forma `{ datos, alcanzoLimite }`. `arrastrePagina` se declara `let` en Step 3 y se lee/asigna igual en Step 4 (mismo alcance de `<script>`, sin necesidad de exportarlo).
