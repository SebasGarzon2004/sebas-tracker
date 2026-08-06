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
