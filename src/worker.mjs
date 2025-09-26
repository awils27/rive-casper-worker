// src/worker.mjs
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/generate") {
      const { schema, filename = "caspar-template.html" } = await request.json();
      // TODO: call your plugin to build HTML from schema:
      const html = "<!doctype html><meta charset='utf-8'><title>ok</title>ok";
      return new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "content-disposition": `attachment; filename="${filename}"`
        }
      });
    }

    // No match: let the assets system serve files (index.html, JS, CSS)
    return new Response("Not found", { status: 404 });
  }
};
