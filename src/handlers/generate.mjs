import { getPlugin } from "../templates/registry.mjs";

export default async function generate(request) {
  const {
    template = "caspar-basic",
    schema,
    filename = "caspar-template.html",
    aliasMap = {},
    options = {},
  } = await request.json();

  const plugin = getPlugin(template);
  const out = await plugin.generate(schema, { aliasMap, options });

  if (out.type === "zip") {
    return new Response(out.content, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${sanitize(filename, ".zip")}"`,
      },
    });
  }

  // default: html
  return new Response(out.content, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `attachment; filename="${sanitize(filename, ".html")}"`,
    },
  });
}

function sanitize(name, ext) {
  const base = String(name || `caspar-template${ext || ""}`);
  return base.replace(/[^\w.-]/g, "_");
}
