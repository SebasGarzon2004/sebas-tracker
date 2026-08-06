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
