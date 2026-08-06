const test = require('node:test');
const assert = require('node:assert/strict');
const { base64urlDeTexto, construirJWT, firmarJWT } = require('../src/auth.js');
const { generateKeyPairSync, createVerify } = require('node:crypto');

test('base64urlDeTexto codifica sin + / = y es la codificación esperada', () => {
  const resultado = base64urlDeTexto('{"alg":"RS256"}');
  assert.ok(!resultado.includes('+'));
  assert.ok(!resultado.includes('/'));
  assert.ok(!resultado.includes('='));
  assert.strictEqual(resultado, Buffer.from('{"alg":"RS256"}').toString('base64url'));
});

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
