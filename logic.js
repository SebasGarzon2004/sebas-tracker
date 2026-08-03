function mesKeyDeFecha(fechaISO) {
  const d = new Date(fechaISO);
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${anio}-${mes}`;
}

function agruparPorMes(gastos) {
  const grupos = {};
  for (const g of gastos) {
    const key = mesKeyDeFecha(g.fecha);
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(g);
  }
  for (const key in grupos) {
    grupos[key].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }
  return grupos;
}

function mesesDisponibles(gastosPorMes, mesActualKey) {
  const keys = new Set(Object.keys(gastosPorMes));
  keys.add(mesActualKey);
  return Array.from(keys).sort();
}

if (typeof module !== 'undefined') {
  module.exports = { mesKeyDeFecha, agruparPorMes, mesesDisponibles };
}
