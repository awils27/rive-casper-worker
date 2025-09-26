// src/handlers/generate.mjs
import { validate } from "../lib/schema.js";
import { getPlugin } from "../templates/registry.mjs";
import { downloadHeaders } from "../lib/utils.js";

export default async (req) => {
  const { schema, filename = "caspar-template.html", template = "caspar-basic", aliasMap = {}, options = {} } = await req.json();
  const schemaOk = validate(schema);
  const plugin = getPlugin(template);
  if (!plugin) return new Response("Unknown template", { status: 400 });

  const out = await plugin.generate(schemaOk, { aliasMap, options });
  // out can be { type: "html", content } or { type: "zip", content: ArrayBuffer }
  if (out.type === "zip") {
    return new Response(out.content, downloadHeaders(filename.replace(/\.html$/i, ".zip"), "application/zip"));
  }
  return new Response(out.content, downloadHeaders(filename, "text/html; charset=utf-8"));
};
