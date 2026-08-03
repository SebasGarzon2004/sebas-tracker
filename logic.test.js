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
