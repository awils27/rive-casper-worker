import generate from "./handlers/generate.mjs";
import { listPlugins } from "./templates/registry.mjs";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/templates") {
      return new Response(JSON.stringify(listPlugins()), {
        headers: { "content-type": "application/json" },
      });
    }

    if (request.method === "POST" && url.pathname === "/generate") {
      return generate(request);
    }

    return new Response("Not found", { status: 404 });
  },
};
