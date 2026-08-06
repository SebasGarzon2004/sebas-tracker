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
