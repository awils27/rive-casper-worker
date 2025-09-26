// src/router.mjs
export class Router {
  #routes = [];
  get(path, handler)  { this.#routes.push({ m: "GET",  p: path, h: handler }); }
  post(path, handler) { this.#routes.push({ m: "POST", p: path, h: handler }); }
  async handle(req, env, ctx) {
    const url = new URL(req.url);
    const route = this.#routes.find(r => r.m === req.method && r.p === url.pathname);
    if (!route) return new Response("Not found", { status: 404 });
    try { return await route.h(req, env, ctx); }
    catch (e) { return new Response(`Error: ${e.message}`, { status: 500 }); }
  }
}
