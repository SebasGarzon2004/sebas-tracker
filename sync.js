function crearOperacionNuevoGasto(gasto) {
  return { tipo: 'nuevo', payload: gasto };
}

function crearOperacionAnular(id) {
  return { tipo: 'anular', payload: { id } };
}

function agregarACola(cola, operacion) {
  return [...cola, operacion];
}

async function procesarCola(cola, enviarOperacion) {
  const restante = [...cola];
  while (restante.length > 0) {
    try {
      await enviarOperacion(restante[0]);
      restante.shift();
    } catch (error) {
      break;
    }
  }
  return restante;
}

if (typeof module !== 'undefined') {
  module.exports = { crearOperacionNuevoGasto, crearOperacionAnular, agregarACola, procesarCola };
}
