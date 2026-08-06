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
