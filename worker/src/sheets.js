// worker/src/sheets.js
const { obtenerAccessToken } = require('./auth.js');
const { construirFilaGasto, COLOR_CATEGORIA, COLOR_PAGO, hexAColorRGB } = require('./formato.js');

async function llamarSheets(env, metodo, ruta, cuerpo) {
  const accessToken = await obtenerAccessToken(env);
  const respuesta = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}${ruta}`,
    {
      method: metodo,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    }
  );
  if (!respuesta.ok) {
    throw new Error(`Sheets API ${ruta}: ${respuesta.status} ${await respuesta.text()}`);
  }
  return respuesta.json();
}

async function obtenerSheetIdDeGastos(env) {
  const datos = await llamarSheets(env, 'GET', '?fields=sheets.properties');
  const hoja = datos.sheets.find((s) => s.properties.title === 'Gastos');
  return hoja.properties.sheetId;
}

async function agregarGasto(env, gasto) {
  const fila = construirFilaGasto(gasto);

  const resultadoAppend = await llamarSheets(
    env,
    'POST',
    '/values/Gastos!A:G:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS',
    { values: [fila] }
  );

  const rangoActualizado = resultadoAppend.updates.updatedRange;
  const numeroFila = Number(rangoActualizado.match(/(\d+)(?=:|$)/)[0]);
  const sheetId = await obtenerSheetIdDeGastos(env);
  const colorCategoria = hexAColorRGB(COLOR_CATEGORIA[gasto.categoria]);
  const colorPago = hexAColorRGB(COLOR_PAGO[gasto.pago]);

  await llamarSheets(env, 'POST', ':batchUpdate', {
    requests: [
      {
        // Toda la fila toma el color de la categoría.
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: numeroFila - 1,
            endRowIndex: numeroFila,
            startColumnIndex: 0,
            endColumnIndex: 7,
          },
          cell: { userEnteredFormat: { backgroundColor: colorCategoria } },
          fields: 'userEnteredFormat.backgroundColor',
        },
      },
      {
        // La celda de Forma de pago (columna C, índice 2) se repinta con su propio color.
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: numeroFila - 1,
            endRowIndex: numeroFila,
            startColumnIndex: 2,
            endColumnIndex: 3,
          },
          cell: { userEnteredFormat: { backgroundColor: colorPago } },
          fields: 'userEnteredFormat.backgroundColor',
        },
      },
    ],
  });
}

module.exports = { agregarGasto, llamarSheets };
