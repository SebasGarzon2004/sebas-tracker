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
  assert.deepStrictEqual(
    mesesDisponibles(grupos, '2026-08'),
    ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10']
  );
  assert.deepStrictEqual(
    mesesDisponibles(grupos, '2026-09'),
    ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']
  );
});

test('mesesDisponibles agrega 2 meses atrás y 2 adelante del actual, incluso cruzando de año', () => {
  const grupos = {};
  assert.deepStrictEqual(
    mesesDisponibles(grupos, '2026-01'),
    ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03']
  );
  assert.deepStrictEqual(
    mesesDisponibles(grupos, '2026-12'),
    ['2026-10', '2026-11', '2026-12', '2027-01', '2027-02']
  );
});

const { cambioPorcentual } = require('./logic.js');

test('cambioPorcentual calcula el cambio redondeado contra el mes anterior', () => {
  assert.strictEqual(cambioPorcentual(120000, 100000), 20);
  assert.strictEqual(cambioPorcentual(80000, 100000), -20);
  assert.strictEqual(cambioPorcentual(100000, 100000), 0);
  assert.strictEqual(cambioPorcentual(133000, 100000), 33);
  assert.strictEqual(cambioPorcentual(50000, 0), null, 'sin gasto el mes anterior no hay base para comparar');
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
  assert.strictEqual(resumen.porPago.Efectivo, 1500);
  assert.strictEqual(resumen.porPago.BreB, 2000);
  assert.strictEqual(resumen.porPago.RappiCard, 0, 'las formas de pago sin gastos quedan en 0, no ausentes');
});

test('obtenerPaginas antepone la hoja en blanco solo en el mes actual', () => {
  const gastos = [{ id: 1, monto: 100, categoria: 'Hogar', pago: 'Efectivo', fecha: '2026-08-01T10:00:00.000Z' }];
  assert.deepStrictEqual(obtenerPaginas(gastos, true), ['blanco', gastos[0]]);
  assert.deepStrictEqual(obtenerPaginas(gastos, false), [gastos[0]]);
  assert.deepStrictEqual(obtenerPaginas([], true), ['blanco']);
});

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

test('obtenerPaginas también filtra por forma de pago, y combina ambos filtros si vienen juntos', () => {
  const gastos = [
    { id: 1, monto: 100, categoria: 'Hogar', pago: 'Efectivo', fecha: '2026-08-01T10:00:00.000Z' },
    { id: 2, monto: 200, categoria: 'Shaun', pago: 'BreB', fecha: '2026-08-02T10:00:00.000Z' },
    { id: 3, monto: 300, categoria: 'Shaun', pago: 'Efectivo', fecha: '2026-08-03T10:00:00.000Z' },
  ];
  assert.deepStrictEqual(obtenerPaginas(gastos, true, null, 'Efectivo'), [gastos[0], gastos[2]]);
  assert.deepStrictEqual(obtenerPaginas(gastos, true, 'Shaun', 'Efectivo'), [gastos[2]], 'con los dos filtros a la vez, solo pasa lo que cumple ambos');
  assert.deepStrictEqual(obtenerPaginas(gastos, true, null, 'RappiCard'), [], 'sin gastos con esa forma de pago, la lista queda vacía');
});

test('clamp limita un valor entre un mínimo y un máximo', () => {
  assert.strictEqual(clamp(5, 0, 3), 3);
  assert.strictEqual(clamp(-2, 0, 3), 0);
  assert.strictEqual(clamp(2, 0, 3), 2);
});

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
