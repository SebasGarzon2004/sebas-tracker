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
