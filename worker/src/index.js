const { agregarGasto } = require('./sheets.js');

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const auth = request.headers.get('Authorization');
    if (auth !== `Bearer ${env.TOKEN_COMPARTIDO}`) {
      return new Response('No autorizado', { status: 401 });
    }

    if (request.method === 'POST' && url.pathname === '/gasto') {
      const gasto = await request.json();
      await agregarGasto(env, gasto);
      return new Response('ok');
    }

    return new Response('No encontrado', { status: 404 });
  },
};
