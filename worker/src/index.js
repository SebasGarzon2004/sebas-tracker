const { agregarGasto, anularGasto } = require('./sheets.js');

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const auth = request.headers.get('Authorization');
    if (auth !== `Bearer ${env.TOKEN_COMPARTIDO}`) {
      return new Response('No autorizado', { status: 401 });
    }

    if (request.method === 'POST' && url.pathname === '/gasto') {
      try {
        const gasto = await request.json();
        await agregarGasto(env, gasto);
        return new Response('ok');
      } catch (error) {
        return new Response(error.message, { status: 500 });
      }
    }

    if (request.method === 'POST' && url.pathname === '/gasto/anular') {
      try {
        const { id } = await request.json();
        await anularGasto(env, id);
        return new Response('ok');
      } catch (error) {
        return new Response(error.message, { status: 500 });
      }
    }

    return new Response('No encontrado', { status: 404 });
  },
};
