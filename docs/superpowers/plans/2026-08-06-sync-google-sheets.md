# Sincronizar gastos con Google Sheets — Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea por tarea. Los pasos usan sintaxis de checkbox (`- [ ]`) para seguimiento.

**Objetivo:** cada gasto que Sebas guarda o anula en la app se refleja automáticamente en una hoja de Google Sheets, coloreada igual que la app, con gráficas de categoría/pago/tendencia que se actualizan solas.

**Arquitectura:** la app (sin cambios en su UI) sigue guardando en `localStorage` como fuente de verdad, y además llama a un Worker propio de Cloudflare (gratis) que es el único que habla con la API de Google Sheets usando una cuenta de servicio. Las gráficas viven en una pestaña "Resumen" con fórmulas `SUMIFS` que leen la pestaña "Gastos" — se arman una sola vez a mano al crear la hoja (Tarea 2) y luego se recalculan solas cada vez que el Worker agrega una fila, sin que el Worker tenga que tocar gráficas por código. Esto simplifica bastante el Worker frente a la idea original de generarlas vía API, sin perder nada de lo pedido: las gráficas existen y se actualizan automáticamente igual.

**Tech Stack:** Cloudflare Workers (JavaScript, sin frameworks), Google Sheets API v4, Web Crypto API (`crypto.subtle`) para firmar el JWT de la cuenta de servicio, `node --test` para pruebas (mismo patrón que `logic.test.js`).

## Global Constraints

- Colores de categoría (de `index.html`, variables `--tag-*`): Shaun `#2F8F6B`, Swift `#B98A2E`, Salidas `#B5473A`, Gastos Personales `#46626F`, Hogar `#8A6A4E`.
- Colores de forma de pago (variables `--pago-*`): BreB `#6B4FA0`, Tarjeta de Crédito `#E8590C`, Efectivo `#2E7D8C`.
- Columnas de la pestaña "Gastos", en este orden exacto: A=Fecha, B=Categoría, C=Forma de pago, D=Monto, E=Nota, F=Estado, G=ID.
- Sync de un solo sentido: la app nunca lee de Sheets, solo escribe.
- Guardar un gasto en el celular nunca depende de internet — el envío a Sheets es un "además", nunca un requisito.
- No agregar el análisis mensual con Claude — quedó explícitamente fuera de esta ronda (spec `docs/superpowers/specs/2026-08-06-sync-google-sheets-design.md`).

---

## Mapa de archivos

- Crear `worker/wrangler.toml` — configuración del Worker de Cloudflare.
- Crear `worker/package.json` — sin dependencias de runtime (todo con Web APIs nativas del Worker); solo scripts.
- Crear `worker/src/auth.js` — obtiene un access token de Google a partir de la cuenta de servicio (JWT + intercambio OAuth2).
- Crear `worker/src/formato.js` — colores por categoría/pago y construcción de la fila/formato para Sheets.
- Crear `worker/src/sheets.js` — llamadas a la API de Sheets (`agregarGasto`, `anularGasto`) usando `auth.js` y `formato.js`.
- Crear `worker/src/index.js` — rutas HTTP (`/gasto`, `/gasto/anular`), valida el token compartido.
- Crear `worker/test/auth.test.js`, `worker/test/formato.test.js` — pruebas con `node --test`.
- Crear `sync.js` (en la raíz del repo, junto a `logic.js`) — cola pendiente y reintento, funciones puras.
- Crear `sync.test.js` (en la raíz, junto a `logic.test.js`).
- Modificar `index.html` — conectar guardar/anular gasto con `sync.js` y el Worker.
- Modificar `sw.js` — agregar `sync.js` a `ARCHIVOS_BASE` y subir `CACHE_NAME`.
- Modificar `CONTINUAR.md` — cerrar el pendiente al final.

---

### Tarea 1: Cuenta de servicio de Google

**Archivos:** ninguno (pasos manuales en Google Cloud Console) + un archivo de credenciales que **no se commitea**.

- [ ] **Paso 1: Crear el proyecto y habilitar la API**

  En https://console.cloud.google.com/: crear un proyecto nuevo (por ejemplo "sebas-gastos"), luego ir a "APIs & Services" → "Library", buscar "Google Sheets API" y habilitarla.

- [ ] **Paso 2: Crear la cuenta de servicio**

  "APIs & Services" → "Credentials" → "Create Credentials" → "Service account". Nombre sugerido: `gastos-sync`. No hace falta asignarle ningún rol de proyecto (el acceso real se da compartiendo la hoja directamente, en la Tarea 2).

- [ ] **Paso 3: Generar la llave**

  Dentro de la cuenta de servicio recién creada → pestaña "Keys" → "Add Key" → "Create new key" → tipo JSON. Se descarga un archivo `.json`. Guárdalo en `worker/.dev.vars.local/cuenta-servicio.json` (esa carpeta no se sube a git — se crea en la Tarea 3 con `.gitignore`).

- [ ] **Paso 4: Anotar el correo de la cuenta de servicio**

  Dentro del JSON descargado está el campo `client_email` (algo como `gastos-sync@sebas-gastos.iam.gserviceaccount.com`). Anótalo — se usa en la Tarea 2 para compartirle la hoja.

---

### Tarea 2: Crear la hoja de Google Sheets

**Archivos:** ninguno (la hoja se crea en sheets.google.com).

- [ ] **Paso 1: Crear la hoja y la pestaña "Gastos"**

  En https://sheets.google.com, crear una hoja nueva llamada "Mis Gastos". Renombrar la primera pestaña a `Gastos`. En la fila 1, estas columnas exactas:

  | A | B | C | D | E | F | G |
  |---|---|---|---|---|---|---|
  | Fecha | Categoría | Forma de pago | Monto | Nota | Estado | ID |

- [ ] **Paso 2: Crear la pestaña "Resumen" con las tablas de apoyo**

  Nueva pestaña llamada `Resumen`. En ella, tres tablas chiquitas con fórmulas (no valores fijos) que se recalculan solas cuando "Gastos" cambia:

  **Tabla 1 — por categoría, mes actual** (celdas A1:B6):
  ```
  A1: Categoría          B1: Total
  A2: Shaun              B2: =SUMIFS(Gastos!D:D, Gastos!B:B, A2, Gastos!F:F, "Activo", Gastos!A:A, ">="&EOMONTH(HOY(),-1)+1, Gastos!A:A, "<="&EOMONTH(HOY(),0))
  A3: Swift              B3: =SUMIFS(Gastos!D:D, Gastos!B:B, A3, Gastos!F:F, "Activo", Gastos!A:A, ">="&EOMONTH(HOY(),-1)+1, Gastos!A:A, "<="&EOMONTH(HOY(),0))
  A4: Salidas            B4: (misma fórmula con A4)
  A5: Gastos Personales  B5: (misma fórmula con A5)
  A6: Hogar              B6: (misma fórmula con A6)
  ```

  **Tabla 2 — por forma de pago, mes actual** (celdas D1:E4):
  ```
  D1: Forma de pago      E1: Total
  D2: BreB               E2: =SUMIFS(Gastos!D:D, Gastos!C:C, D2, Gastos!F:F, "Activo", Gastos!A:A, ">="&EOMONTH(HOY(),-1)+1, Gastos!A:A, "<="&EOMONTH(HOY(),0))
  D3: Tarjeta de Crédito E3: (misma fórmula con D3)
  D4: Efectivo           E4: (misma fórmula con D4)
  ```

  **Tabla 3 — tendencia mes a mes** (celdas G1:H13, últimos 12 meses):
  ```
  G1: Mes                H1: Total
  G2: =EDATE(EOMONTH(HOY(),0)+1,-12)   H2: =SUMIFS(Gastos!D:D, Gastos!F:F, "Activo", Gastos!A:A, ">="&EOMONTH(G2,-1)+1, Gastos!A:A, "<="&EOMONTH(G2,0))
  G3: =EDATE(G2,1)                     H3: (misma fórmula de H2, referida a G3)
  ... (arrastrar hasta G13/H13, 12 filas)
  ```

  Da formato de fecha "MMM AAAA" a la columna G para que se lea "ago 2026" en vez de una fecha completa.

- [ ] **Paso 3: Colorear los encabezados de las tablas de Resumen (opcional pero pedido)**

  Colorea el fondo de A1:B1 con el color de categoría promedio (usa `#2F8F6B`, el de Shaun, como acento neutro) y D1:E1 con `#6B4FA0` (el de BreB), solo para que la pestaña de Resumen no se vea en blanco y negro — el detalle fino de color por fila real lo pone el Worker en la pestaña "Gastos" (Tarea 6).

- [ ] **Paso 4: Insertar las 3 gráficas**

  Insertar → Gráfico, tres veces:
  1. Selecciona A1:B6 (Tabla 1) → gráfico de barras → título "Gasto por categoría (mes actual)".
  2. Selecciona D1:E4 (Tabla 2) → gráfico de barras → título "Gasto por forma de pago (mes actual)".
  3. Selecciona G1:H13 (Tabla 3) → gráfico de líneas → título "Tendencia mensual".

  Arrástralas para que queden ordenadas en la pestaña "Resumen", debajo o al lado de las tablas.

- [ ] **Paso 5: Compartir la hoja con la cuenta de servicio**

  Botón "Compartir" (arriba a la derecha) → pegar el `client_email` de la Tarea 1, Paso 4 → rol **Editor** → Enviar (puede que muestre una advertencia de que es una cuenta de servicio, es normal, continuar).

- [ ] **Paso 6: Anotar el ID de la hoja**

  De la URL `https://docs.google.com/spreadsheets/d/AQUI_VA_EL_ID/edit`, copia `AQUI_VA_EL_ID` — se usa como secreto `SPREADSHEET_ID` en la Tarea 3.

---

### Tarea 3: Scaffolding del Worker

**Archivos:**
- Crear: `worker/wrangler.toml`
- Crear: `worker/package.json`
- Crear: `worker/src/index.js`
- Crear: `worker/.gitignore`

**Interfaces:**
- Produce: un Worker desplegado que responde en `https://gastos-sync.<tu-subdominio>.workers.dev`, con secretos `TOKEN_COMPARTIDO`, `CUENTA_SERVICIO_JSON`, `SPREADSHEET_ID` configurados.

- [ ] **Paso 1: Instalar wrangler y crear la estructura**

```bash
cd /home/sebas/universidad/gastos-tracker
mkdir -p worker/src worker/test
```

- [ ] **Paso 2: `worker/package.json`**

```json
{
  "name": "gastos-sync-worker",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "node --test test/"
  },
  "devDependencies": {
    "wrangler": "^3.90.0"
  }
}
```

- [ ] **Paso 3: `worker/wrangler.toml`**

```toml
name = "gastos-sync"
main = "src/index.js"
compatibility_date = "2026-08-01"
```

- [ ] **Paso 4: `worker/.gitignore`**

```
node_modules/
.dev.vars
.dev.vars.local/
```

- [ ] **Paso 5: Worker mínimo, `worker/src/index.js`**

```js
export default {
  async fetch(request, env) {
    return new Response('ok');
  },
};
```

- [ ] **Paso 6: Instalar wrangler y probar en local**

```bash
cd worker && npm install
npx wrangler dev --local
```

En otra terminal: `curl http://localhost:8787` — se espera la respuesta `ok`.

- [ ] **Paso 7: Autenticarse en Cloudflare y desplegar**

```bash
npx wrangler login
npx wrangler deploy
```

Esperado: la terminal imprime una URL tipo `https://gastos-sync.<subdominio>.workers.dev` — anótala, se usa en la Tarea 9.

- [ ] **Paso 8: Configurar los secretos**

```bash
npx wrangler secret put TOKEN_COMPARTIDO
```
(pega un valor largo y aleatorio cuando lo pida, por ejemplo generado con `openssl rand -hex 32`; anótalo también, se usa en la Tarea 9)

```bash
npx wrangler secret put SPREADSHEET_ID
```
(pega el ID de la Tarea 2, Paso 6)

```bash
npx wrangler secret put CUENTA_SERVICIO_JSON
```
(pega el contenido completo del archivo `.json` de la Tarea 1, Paso 3, como una sola línea)

- [ ] **Paso 9: Commit**

```bash
git add worker/wrangler.toml worker/package.json worker/src/index.js worker/.gitignore
git commit -m "Scaffolding del Worker de sincronización con Sheets"
```

---

### Tarea 4: Autenticación con la cuenta de servicio de Google

**Archivos:**
- Crear: `worker/src/auth.js`
- Test: `worker/test/auth.test.js`

**Interfaces:**
- Produce: `base64urlDeTexto(texto: string): string`, `base64urlDeArrayBuffer(buffer: ArrayBuffer): string`, `construirJWT(claims: object, ahora: number): { entrada: string, encabezado: object, cuerpo: object }`, `firmarJWT(entrada: string, clavePrivadaPem: string): Promise<string>`, `obtenerAccessToken(env: { CUENTA_SERVICIO_JSON: string }): Promise<string>`.

- [ ] **Paso 1: Escribir la prueba de codificación base64url**

```js
// worker/test/auth.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { base64urlDeTexto } = require('../src/auth.js');

test('base64urlDeTexto codifica sin + / = y es la codificación esperada', () => {
  const resultado = base64urlDeTexto('{"alg":"RS256"}');
  assert.ok(!resultado.includes('+'));
  assert.ok(!resultado.includes('/'));
  assert.ok(!resultado.includes('='));
  assert.strictEqual(resultado, Buffer.from('{"alg":"RS256"}').toString('base64url'));
});
```

- [ ] **Paso 2: Correr la prueba y verificar que falla**

Run: `cd worker && node --test test/auth.test.js`
Expected: FAIL — `Cannot find module '../src/auth.js'` (el archivo no existe todavía).

- [ ] **Paso 3: Implementar la codificación y el armado del JWT**

```js
// worker/src/auth.js

function base64urlDeArrayBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  let binario = '';
  bytes.forEach((b) => { binario += String.fromCharCode(b); });
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDeTexto(texto) {
  return base64urlDeArrayBuffer(new TextEncoder().encode(texto).buffer);
}

function construirJWT(claims, ahora) {
  const encabezado = { alg: 'RS256', typ: 'JWT' };
  const cuerpo = {
    iss: claims.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: ahora,
    exp: ahora + 3600,
  };
  const entrada = `${base64urlDeTexto(JSON.stringify(encabezado))}.${base64urlDeTexto(JSON.stringify(cuerpo))}`;
  return { entrada, encabezado, cuerpo };
}

async function importarClavePrivada(pem) {
  const cuerpoPem = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binario = Uint8Array.from(atob(cuerpoPem), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    binario.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function firmarJWT(entrada, clavePrivadaPem) {
  const clave = await importarClavePrivada(clavePrivadaPem);
  const firma = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    clave,
    new TextEncoder().encode(entrada)
  );
  return `${entrada}.${base64urlDeArrayBuffer(firma)}`;
}

async function obtenerAccessToken(env) {
  const credenciales = JSON.parse(env.CUENTA_SERVICIO_JSON);
  const ahora = Math.floor(Date.now() / 1000);
  const { entrada } = construirJWT(credenciales, ahora);
  const jwt = await firmarJWT(entrada, credenciales.private_key);

  const respuesta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!respuesta.ok) {
    throw new Error(`No se pudo obtener access token: ${respuesta.status} ${await respuesta.text()}`);
  }
  const datos = await respuesta.json();
  return datos.access_token;
}

module.exports = { base64urlDeTexto, base64urlDeArrayBuffer, construirJWT, firmarJWT, obtenerAccessToken };
```

Nota: este archivo usa `module.exports` (CommonJS) para que `node --test` lo importe igual que `logic.js`, aunque el Worker en producción se despliega como ES module — Wrangler acepta ambos formatos vía su bundler (esbuild), así que no hace falta duplicar el archivo.

- [ ] **Paso 4: Correr la prueba y verificar que pasa**

Run: `cd worker && node --test test/auth.test.js`
Expected: PASS

- [ ] **Paso 5: Escribir la prueba de firma con una llave RSA generada en la propia prueba**

```js
// agregar a worker/test/auth.test.js
const { generateKeyPairSync, createVerify } = require('node:crypto');
const { construirJWT, firmarJWT } = require('../src/auth.js');

test('firmarJWT produce una firma RS256 válida contra la llave pública correspondiente', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const { entrada } = construirJWT({ client_email: 'prueba@ejemplo.com' }, 1700000000);
  const jwtCompleto = await firmarJWT(entrada, privateKey);
  const [entradaFirmada, firmaB64url] = jwtCompleto.split(/\.(?=[^.]+$)/);

  const firmaBase64 = firmaB64url.replace(/-/g, '+').replace(/_/g, '/');
  const verificador = createVerify('RSA-SHA256');
  verificador.update(entradaFirmada);
  const valido = verificador.verify(publicKey, firmaBase64, 'base64');

  assert.strictEqual(valido, true);
});
```

- [ ] **Paso 6: Correr la prueba y verificar que pasa**

Run: `cd worker && node --test test/auth.test.js`
Expected: PASS (2 pruebas)

- [ ] **Paso 7: Commit**

```bash
git add worker/src/auth.js worker/test/auth.test.js
git commit -m "Agrega autenticación con cuenta de servicio de Google (JWT firmado con Web Crypto)"
```

---

### Tarea 5: Formato y construcción de la fila para Sheets

**Archivos:**
- Crear: `worker/src/formato.js`
- Test: `worker/test/formato.test.js`

**Interfaces:**
- Consume: nada de tareas previas.
- Produce: `COLOR_CATEGORIA: { [categoria: string]: string }`, `COLOR_PAGO: { [pago: string]: string }`, `hexAColorRGB(hex: string): { red: number, green: number, blue: number }`, `construirFilaGasto(gasto: { fecha: string, categoria: string, pago: string, monto: number, nota: string, id: number }): [string, string, string, number, string, string, string]` (columnas A–G, Estado siempre "Activo" para gastos nuevos).

- [ ] **Paso 1: Escribir las pruebas**

```js
// worker/test/formato.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { COLOR_CATEGORIA, COLOR_PAGO, hexAColorRGB, construirFilaGasto } = require('../src/formato.js');

test('COLOR_CATEGORIA tiene los 5 colores exactos de la app', () => {
  assert.strictEqual(COLOR_CATEGORIA['Shaun'], '#2F8F6B');
  assert.strictEqual(COLOR_CATEGORIA['Swift'], '#B98A2E');
  assert.strictEqual(COLOR_CATEGORIA['Salidas'], '#B5473A');
  assert.strictEqual(COLOR_CATEGORIA['Gastos Personales'], '#46626F');
  assert.strictEqual(COLOR_CATEGORIA['Hogar'], '#8A6A4E');
});

test('COLOR_PAGO tiene los 3 colores exactos de la app', () => {
  assert.strictEqual(COLOR_PAGO['BreB'], '#6B4FA0');
  assert.strictEqual(COLOR_PAGO['Tarjeta de Crédito'], '#E8590C');
  assert.strictEqual(COLOR_PAGO['Efectivo'], '#2E7D8C');
});

test('hexAColorRGB convierte a fracciones 0-1 para la API de Sheets', () => {
  assert.deepStrictEqual(hexAColorRGB('#2F8F6B'), {
    red: 0x2F / 255,
    green: 0x8F / 255,
    blue: 0x6B / 255,
  });
});

test('construirFilaGasto arma las columnas A-G en el orden correcto', () => {
  const fila = construirFilaGasto({
    fecha: '2026-08-15T10:00:00.000Z',
    categoria: 'Hogar',
    pago: 'Efectivo',
    monto: 45000,
    nota: 'Mercado',
    id: 1755252000000,
  });
  assert.deepStrictEqual(fila, [
    '2026-08-15T10:00:00.000Z',
    'Hogar',
    'Efectivo',
    45000,
    'Mercado',
    'Activo',
    '1755252000000',
  ]);
});
```

- [ ] **Paso 2: Correr las pruebas y verificar que fallan**

Run: `cd worker && node --test test/formato.test.js`
Expected: FAIL — `Cannot find module '../src/formato.js'`

- [ ] **Paso 3: Implementar**

```js
// worker/src/formato.js

const COLOR_CATEGORIA = {
  'Shaun': '#2F8F6B',
  'Swift': '#B98A2E',
  'Salidas': '#B5473A',
  'Gastos Personales': '#46626F',
  'Hogar': '#8A6A4E',
};

const COLOR_PAGO = {
  'BreB': '#6B4FA0',
  'Tarjeta de Crédito': '#E8590C',
  'Efectivo': '#2E7D8C',
};

function hexAColorRGB(hex) {
  const limpio = hex.replace('#', '');
  return {
    red: parseInt(limpio.slice(0, 2), 16) / 255,
    green: parseInt(limpio.slice(2, 4), 16) / 255,
    blue: parseInt(limpio.slice(4, 6), 16) / 255,
  };
}

function construirFilaGasto(gasto) {
  return [
    gasto.fecha,
    gasto.categoria,
    gasto.pago,
    gasto.monto,
    gasto.nota || '',
    'Activo',
    String(gasto.id),
  ];
}

module.exports = { COLOR_CATEGORIA, COLOR_PAGO, hexAColorRGB, construirFilaGasto };
```

- [ ] **Paso 4: Correr las pruebas y verificar que pasan**

Run: `cd worker && node --test test/formato.test.js`
Expected: PASS (4 pruebas)

- [ ] **Paso 5: Commit**

```bash
git add worker/src/formato.js worker/test/formato.test.js
git commit -m "Agrega colores de categoría/pago y construcción de fila para Sheets"
```

---

### Tarea 6: Endpoint POST /gasto — agregar fila coloreada

**Archivos:**
- Crear: `worker/src/sheets.js`
- Modificar: `worker/src/index.js`

**Interfaces:**
- Consume: `obtenerAccessToken(env)` de `auth.js` (Tarea 4); `construirFilaGasto(gasto)`, `COLOR_CATEGORIA`, `COLOR_PAGO`, `hexAColorRGB` de `formato.js` (Tarea 5).
- Produce: `agregarGasto(env: { SPREADSHEET_ID, CUENTA_SERVICIO_JSON }, gasto): Promise<void>`.

**Nota de diseño:** la spec pide que la fila se coloree por categoría Y que la columna "Forma de pago" use su propio color de pago. Una celda no puede tener dos colores de fondo a la vez, así que se resuelve así: toda la fila (A-G) toma el color de categoría, y después la celda de la columna C (Forma de pago) se repinta encima con su color de pago — igual que en la app, donde categoría/monto llevan el color de categoría y pago/nota llevan el color de pago.

- [ ] **Paso 1: Implementar `agregarGasto` en `worker/src/sheets.js`**

```js
// worker/src/sheets.js
const { obtenerAccessToken } = require('./auth.js');
const { construirFilaGasto, COLOR_CATEGORIA, COLOR_PAGO, hexAColorRGB } = require('./formato.js');

async function llamarSheets(env, metodo, ruta, cuerpo) {
  const accessToken = await obtenerAccessToken(env);
  const respuesta = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}${ruta}`,
    {
      method: metodo,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    }
  );
  if (!respuesta.ok) {
    throw new Error(`Sheets API ${ruta}: ${respuesta.status} ${await respuesta.text()}`);
  }
  return respuesta.json();
}

async function obtenerSheetIdDeGastos(env) {
  const datos = await llamarSheets(env, 'GET', '?fields=sheets.properties');
  const hoja = datos.sheets.find((s) => s.properties.title === 'Gastos');
  return hoja.properties.sheetId;
}

async function agregarGasto(env, gasto) {
  const fila = construirFilaGasto(gasto);

  const resultadoAppend = await llamarSheets(
    env,
    'POST',
    '/values/Gastos!A:G:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS',
    { values: [fila] }
  );

  const rangoActualizado = resultadoAppend.updates.updatedRange;
  const numeroFila = Number(rangoActualizado.match(/(\d+)(?=:|$)/)[0]);
  const sheetId = await obtenerSheetIdDeGastos(env);
  const colorCategoria = hexAColorRGB(COLOR_CATEGORIA[gasto.categoria]);
  const colorPago = hexAColorRGB(COLOR_PAGO[gasto.pago]);

  await llamarSheets(env, 'POST', ':batchUpdate', {
    requests: [
      {
        // Toda la fila toma el color de la categoría.
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: numeroFila - 1,
            endRowIndex: numeroFila,
            startColumnIndex: 0,
            endColumnIndex: 7,
          },
          cell: { userEnteredFormat: { backgroundColor: colorCategoria } },
          fields: 'userEnteredFormat.backgroundColor',
        },
      },
      {
        // La celda de Forma de pago (columna C, índice 2) se repinta con su propio color.
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: numeroFila - 1,
            endRowIndex: numeroFila,
            startColumnIndex: 2,
            endColumnIndex: 3,
          },
          cell: { userEnteredFormat: { backgroundColor: colorPago } },
          fields: 'userEnteredFormat.backgroundColor',
        },
      },
    ],
  });
}

module.exports = { agregarGasto, llamarSheets };
```

- [ ] **Paso 2: Conectar la ruta en `worker/src/index.js`**

```js
// worker/src/index.js
const { agregarGasto } = require('./sheets.js');

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const auth = request.headers.get('Authorization');
    if (auth !== `Bearer ${env.TOKEN_COMPARTIDO}`) {
      return new Response('No autorizado', { status: 401 });
    }

    if (request.method === 'POST' && url.pathname === '/gasto') {
      const gasto = await request.json();
      await agregarGasto(env, gasto);
      return new Response('ok');
    }

    return new Response('No encontrado', { status: 404 });
  },
};
```

- [ ] **Paso 3: Desplegar y probar con curl (manual, contra Google real)**

```bash
cd worker && npx wrangler deploy
```

```bash
curl -X POST https://gastos-sync.<tu-subdominio>.workers.dev/gasto \
  -H "Authorization: Bearer <TOKEN_COMPARTIDO de la Tarea 3>" \
  -H "Content-Type: application/json" \
  -d '{"id":1755252000000,"fecha":"2026-08-15T10:00:00.000Z","categoria":"Hogar","pago":"Efectivo","monto":45000,"nota":"Mercado de prueba"}'
```

Expected: respuesta `ok`, y en la hoja de Sheets aparece una fila nueva en "Gastos" con fondo color café (`#8A6A4E`, el de Hogar) en toda la fila, la celda de Forma de pago en verde azulado (`#2E7D8C`, el de Efectivo), y las tablas/gráficas de "Resumen" reflejan el monto si la fecha cae en el mes actual.

- [ ] **Paso 4: Commit**

```bash
git add worker/src/sheets.js worker/src/index.js
git commit -m "Agrega POST /gasto: escribe la fila en Sheets con el color de su categoría"
```

---

### Tarea 7: Endpoint POST /gasto/anular — marcar Estado=Anulado

**Archivos:**
- Modificar: `worker/src/sheets.js`
- Modificar: `worker/src/index.js`

**Interfaces:**
- Produce: `anularGasto(env, id: number): Promise<void>`.

- [ ] **Paso 1: Implementar `anularGasto` en `worker/src/sheets.js`**

```js
// agregar a worker/src/sheets.js
async function anularGasto(env, id) {
  const datosIds = await llamarSheets(env, 'GET', '/values/Gastos!G:G');
  const filas = datosIds.values || [];
  const indiceFila = filas.findIndex((fila) => fila[0] === String(id));
  if (indiceFila === -1) {
    throw new Error(`No se encontró el gasto con id ${id} en Sheets`);
  }
  const numeroFila = indiceFila + 1; // las filas de Sheets empiezan en 1, igual que el índice del array (fila 1 = encabezado, incluida en la lectura)

  await llamarSheets(env, 'PUT', `/values/Gastos!F${numeroFila}?valueInputOption=USER_ENTERED`, {
    values: [['Anulado']],
  });
}

module.exports = { agregarGasto, anularGasto, llamarSheets };
```

- [ ] **Paso 2: Conectar la ruta en `worker/src/index.js`**

```js
// worker/src/index.js
const { agregarGasto, anularGasto } = require('./sheets.js');

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const auth = request.headers.get('Authorization');
    if (auth !== `Bearer ${env.TOKEN_COMPARTIDO}`) {
      return new Response('No autorizado', { status: 401 });
    }

    if (request.method === 'POST' && url.pathname === '/gasto') {
      const gasto = await request.json();
      await agregarGasto(env, gasto);
      return new Response('ok');
    }

    if (request.method === 'POST' && url.pathname === '/gasto/anular') {
      const { id } = await request.json();
      await anularGasto(env, id);
      return new Response('ok');
    }

    return new Response('No encontrado', { status: 404 });
  },
};
```

- [ ] **Paso 3: Desplegar y probar con curl (usando el id de prueba de la Tarea 6)**

```bash
cd worker && npx wrangler deploy
```

```bash
curl -X POST https://gastos-sync.<tu-subdominio>.workers.dev/gasto/anular \
  -H "Authorization: Bearer <TOKEN_COMPARTIDO>" \
  -H "Content-Type: application/json" \
  -d '{"id":1755252000000}'
```

Expected: respuesta `ok`, y en Sheets la columna Estado (F) de esa fila cambia de "Activo" a "Anulado".

- [ ] **Paso 4: Commit**

```bash
git add worker/src/sheets.js worker/src/index.js
git commit -m "Agrega POST /gasto/anular: marca Estado=Anulado en la fila correspondiente"
```

---

### Tarea 8: Cola pendiente y reintento en la app (TDD)

**Archivos:**
- Crear: `sync.js` (raíz del repo)
- Test: `sync.test.js` (raíz del repo)

**Interfaces:**
- Produce: `crearOperacionNuevoGasto(gasto): { tipo: 'nuevo', payload: object }`, `crearOperacionAnular(id: number): { tipo: 'anular', payload: { id: number } }`, `agregarACola(cola: Array, operacion: object): Array`, `procesarCola(cola: Array, enviarOperacion: (op: object) => Promise<void>): Promise<Array>` (devuelve la cola restante — vacía si todo se envió bien, o desde la primera que falló en adelante).

- [ ] **Paso 1: Escribir las pruebas**

```js
// sync.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { crearOperacionNuevoGasto, crearOperacionAnular, agregarACola, procesarCola } = require('./sync.js');

test('crearOperacionNuevoGasto envuelve el gasto con tipo "nuevo"', () => {
  const gasto = { id: 1, monto: 5000 };
  assert.deepStrictEqual(crearOperacionNuevoGasto(gasto), { tipo: 'nuevo', payload: gasto });
});

test('crearOperacionAnular envuelve el id con tipo "anular"', () => {
  assert.deepStrictEqual(crearOperacionAnular(42), { tipo: 'anular', payload: { id: 42 } });
});

test('agregarACola no muta la cola original y agrega al final', () => {
  const cola = [{ tipo: 'nuevo', payload: { id: 1 } }];
  const nueva = agregarACola(cola, { tipo: 'anular', payload: { id: 1 } });
  assert.strictEqual(cola.length, 1, 'la cola original no cambia');
  assert.strictEqual(nueva.length, 2);
  assert.deepStrictEqual(nueva[1], { tipo: 'anular', payload: { id: 1 } });
});

test('procesarCola envía todo en orden y deja la cola vacía si todo tiene éxito', async () => {
  const enviados = [];
  const cola = [
    { tipo: 'nuevo', payload: { id: 1 } },
    { tipo: 'nuevo', payload: { id: 2 } },
  ];
  const restante = await procesarCola(cola, async (op) => { enviados.push(op); });
  assert.deepStrictEqual(enviados, cola);
  assert.deepStrictEqual(restante, []);
});

test('procesarCola se detiene en la primera operación que falla y deja el resto pendiente', async () => {
  const enviados = [];
  const cola = [
    { tipo: 'nuevo', payload: { id: 1 } },
    { tipo: 'nuevo', payload: { id: 2 } },
    { tipo: 'nuevo', payload: { id: 3 } },
  ];
  const restante = await procesarCola(cola, async (op) => {
    if (op.payload.id === 2) throw new Error('sin internet');
    enviados.push(op);
  });
  assert.deepStrictEqual(enviados, [cola[0]]);
  assert.deepStrictEqual(restante, [cola[1], cola[2]]);
});
```

- [ ] **Paso 2: Correr las pruebas y verificar que fallan**

Run: `node --test sync.test.js`
Expected: FAIL — `Cannot find module './sync.js'`

- [ ] **Paso 3: Implementar `sync.js`**

```js
// sync.js
function crearOperacionNuevoGasto(gasto) {
  return { tipo: 'nuevo', payload: gasto };
}

function crearOperacionAnular(id) {
  return { tipo: 'anular', payload: { id } };
}

function agregarACola(cola, operacion) {
  return [...cola, operacion];
}

async function procesarCola(cola, enviarOperacion) {
  const restante = [...cola];
  while (restante.length > 0) {
    try {
      await enviarOperacion(restante[0]);
      restante.shift();
    } catch (error) {
      break;
    }
  }
  return restante;
}

if (typeof module !== 'undefined') {
  module.exports = { crearOperacionNuevoGasto, crearOperacionAnular, agregarACola, procesarCola };
}
```

- [ ] **Paso 4: Correr las pruebas y verificar que pasan**

Run: `node --test sync.test.js`
Expected: PASS (5 pruebas)

- [ ] **Paso 5: Commit**

```bash
git add sync.js sync.test.js
git commit -m "Agrega cola pendiente y reintento para sincronizar gastos (TDD)"
```

---

### Tarea 9: Conectar la app al Worker

**Archivos:**
- Modificar: `index.html:289-292` (constantes junto a `KEY`), `index.html:749-763` (`guardarGasto`), `index.html:900-914` (anular, dentro del listener de clicks de `#notebook`).
- Modificar: `sw.js:6-13` (`ARCHIVOS_BASE`), `sw.js:5` (`CACHE_NAME`).

**Interfaces:**
- Consume: `crearOperacionNuevoGasto`, `crearOperacionAnular`, `agregarACola`, `procesarCola` de `sync.js` (Tarea 8).

- [ ] **Paso 1: Agregar el script y las constantes de conexión**

En `index.html`, después de la línea `<link rel="icon" href="icons/icon-192.png">` (antes del `<title>` o junto a los demás `<script>` que cargan `logic.js` — ubicar el `<script src="logic.js">` existente y agregar debajo):

```html
<script src="sync.js"></script>
```

Cerca de la línea 289 (`const KEY = 'gastos_v1';`), agregar:

```js
const URL_WORKER = 'https://gastos-sync.<tu-subdominio>.workers.dev';
const TOKEN_WORKER = '<el mismo TOKEN_COMPARTIDO configurado en la Tarea 3>';
const COLA_KEY = 'gastos_cola_v1';

function cargarCola() {
  try { return JSON.parse(localStorage.getItem(COLA_KEY)) || []; }
  catch { return []; }
}

function guardarCola(cola) { localStorage.setItem(COLA_KEY, JSON.stringify(cola)); }

async function enviarOperacion(operacion) {
  const ruta = operacion.tipo === 'nuevo' ? '/gasto' : '/gasto/anular';
  const respuesta = await fetch(URL_WORKER + ruta, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN_WORKER}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(operacion.payload),
  });
  if (!respuesta.ok) throw new Error('Worker respondió con error');
}

async function sincronizar() {
  const restante = await procesarCola(cargarCola(), enviarOperacion);
  guardarCola(restante);
}
```

- [ ] **Paso 2: Encolar al guardar un gasto**

En `guardarGasto()` (línea 749-763), justo después de `guardarGastos(gastos);` (línea 756), agregar:

```js
    guardarGastos(gastos);
    const nuevoGasto = gastos[gastos.length - 1];
    guardarCola(agregarACola(cargarCola(), crearOperacionNuevoGasto(nuevoGasto)));
    sincronizar();
```

- [ ] **Paso 3: Encolar al anular un gasto**

En el listener de `#notebook` (línea 900-914), justo después de `guardarGastos(gastos);` (línea 910), agregar:

```js
    guardarGastos(gastos);
    guardarCola(agregarACola(cargarCola(), crearOperacionAnular(id)));
    sincronizar();
```

- [ ] **Paso 4: Reintentar la cola al abrir/reactivar la app**

Cerca del final del `<script>` principal, junto a los demás `addEventListener` de nivel superior (cerca de la línea 1038-1039), agregar:

```js
sincronizar();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') sincronizar();
});
```

- [ ] **Paso 5: Cachear `sync.js` en el service worker y subir la versión**

En `sw.js`:

```js
const CACHE_NAME = 'gastos-cache-v17';
const ARCHIVOS_BASE = [
  './',
  './index.html',
  './logic.js',
  './sync.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];
```

- [ ] **Paso 6: Probar en el navegador de escritorio (previo a probar en el iPhone)**

```bash
python3 serve-sin-cache.py 8010
```

Abrir `http://localhost:8010/index.html`, registrar un gasto de prueba, y confirmar en la consola del navegador que no hay errores de red y que en la hoja de Sheets aparece la fila nueva coloreada.

- [ ] **Paso 7: Commit**

```bash
git add index.html sw.js
git commit -m "Conecta guardar/anular gasto con el Worker de sincronización"
```

---

### Tarea 10: Verificación end-to-end en el iPhone real

**Archivos:** ninguno — solo verificación manual.

- [ ] **Paso 1: Subir todo a GitHub**

```bash
git push origin master:main
```

- [ ] **Paso 2: Reinstalar el ícono en el iPhone**

Borrar el ícono viejo de "Sebas' Tracker" de la pantalla de inicio. Abrir `https://sebasgarzon2004.github.io/sebas-tracker/` en Safari normal, confirmar que carga. Compartir → "Añadir a pantalla de inicio".

- [ ] **Paso 3: Probar con internet**

Abrir la app desde el ícono nuevo, registrar un gasto real. Confirmar en Sheets (desde la compu) que la fila aparece coloreada según la categoría, y que las gráficas/tablas de "Resumen" se movieron.

- [ ] **Paso 4: Probar sin internet**

Activar modo avión en el iPhone. Registrar otro gasto — debe guardarse igual de rápido que siempre en la app (esto nunca depende de internet). Desactivar modo avión, volver a abrir la app (o solo pasarla a primer plano) y confirmar en Sheets que el gasto encolado ya llegó, sin que Sebas tuviera que hacer nada.

- [ ] **Paso 5: Probar anular**

Anular un gasto ya sincronizado desde la app. Confirmar en Sheets que su columna Estado cambió a "Anulado".

---

### Tarea 11: Cerrar en CONTINUAR.md

**Archivos:**
- Modificar: `CONTINUAR.md`

- [ ] **Paso 1: Anotar el cierre**

Agregar una sección `## RESUELTO (fecha de hoy): sincronización con Google Sheets` describiendo que quedó funcionando, con el link a la spec y a este plan, y actualizar la sección final "Una sola instrucción para retomar" con el nuevo pendiente (la ronda de análisis mensual con Claude, si Sebas la quiere retomar después).

- [ ] **Paso 2: Commit y push**

```bash
git add CONTINUAR.md
git commit -m "Cierra en CONTINUAR.md: sincronización con Google Sheets funcionando end-to-end"
git push origin master:main
```
