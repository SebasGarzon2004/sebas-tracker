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

function sumarMeses(mesKey, delta) {
  const [anio, mes] = mesKey.split('-').map(Number);
  const totalMeses = anio * 12 + (mes - 1) + delta;
  const nuevoAnio = Math.floor(totalMeses / 12);
  const nuevoMes = ((totalMeses % 12) + 12) % 12;
  return `${nuevoAnio}-${String(nuevoMes + 1).padStart(2, '0')}`;
}

// Además de los meses con gastos guardados, se puede navegar a los 2 meses
// siguientes al actual, aunque estén vacíos — para poder probar la
// navegación hacia adelante sin depender de tener datos ahí todavía. Hacia
// atrás NO se rellenan meses vacíos: un mes pasado solo aparece si de verdad
// tiene gastos guardados (vía Object.keys(gastosPorMes) más arriba); si no,
// deslizar hacia atrás no debería mostrar páginas vacías que nunca van a
// tener datos.
function mesesDisponibles(gastosPorMes, mesActualKey) {
  const keys = new Set(Object.keys(gastosPorMes));
  keys.add(mesActualKey);
  for (let delta = 0; delta <= 2; delta++) {
    keys.add(sumarMeses(mesActualKey, delta));
  }
  return Array.from(keys).sort();
}

const CATEGORIAS = ['Shaun', 'Swift', 'Salidas', 'Gastos Personales', 'Hogar'];
const PAGOS = ['BreB', 'Tarjeta de Crédito', 'Efectivo'];

function calcularResumenMes(gastosDelMes) {
  const porCategoria = {};
  for (const cat of CATEGORIAS) porCategoria[cat] = 0;
  const porPago = {};
  for (const pago of PAGOS) porPago[pago] = 0;
  let total = 0;
  for (const g of gastosDelMes) {
    total += g.monto;
    porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.monto;
    porPago[g.pago] = (porPago[g.pago] || 0) + g.monto;
  }
  return { total, porCategoria, porPago };
}

function cambioPorcentual(totalActual, totalAnterior) {
  if (!totalAnterior) return null;
  return Math.round(((totalActual - totalAnterior) / totalAnterior) * 100);
}

function obtenerPaginas(gastosDelMes, esMesActual, categoriaFiltro, pagoFiltro) {
  let gastosFiltrados = gastosDelMes;
  if (categoriaFiltro) gastosFiltrados = gastosFiltrados.filter(g => g.categoria === categoriaFiltro);
  if (pagoFiltro) gastosFiltrados = gastosFiltrados.filter(g => g.pago === pagoFiltro);
  const hayFiltro = Boolean(categoriaFiltro || pagoFiltro);
  if (hayFiltro) return [...gastosFiltrados];
  return esMesActual ? ['blanco', ...gastosFiltrados] : [...gastosFiltrados];
}

function clamp(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

function anguloDesdeArrastre(deltaAbsoluto, altoPx) {
  if (!altoPx) return 0;
  return clamp((deltaAbsoluto / altoPx) * 180, 0, 180);
}

function debeCompletarDoblez(anguloAbsoluto) {
  return anguloAbsoluto >= 90;
}

function opacidadPliegue(anguloAbsoluto) {
  const grados = clamp(anguloAbsoluto, 0, 180);
  return Math.sin(grados * Math.PI / 180);
}

if (typeof module !== 'undefined') {
  module.exports = {
    CATEGORIAS, PAGOS,
    mesKeyDeFecha, agruparPorMes, mesesDisponibles,
    calcularResumenMes, cambioPorcentual, obtenerPaginas, clamp,
    anguloDesdeArrastre, debeCompletarDoblez, opacidadPliegue
  };
}
