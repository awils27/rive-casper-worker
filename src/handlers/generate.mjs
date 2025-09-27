import { getPlugin } from "../templates/registry.mjs";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export default async function generate(request) {
  let payload;
  try {
    payload = await request.json();
  } catch (err) {
    return jsonError("Request body must be valid JSON", 400);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonError("Request body must be a JSON object", 400);
  }

  const {
    template = "caspar-basic",
    schema,
    filename,
    aliasMap = {},
    options = {},
  } = payload;

  const plugin = getPlugin(template);
  if (!plugin || plugin.key !== template) {
    return jsonError(`Unknown template "${template}"`, 400);
  }

  const safeAliasMap =
    aliasMap && typeof aliasMap === "object" && !Array.isArray(aliasMap)
      ? aliasMap
      : {};
  const safeOptions =
    options && typeof options === "object" && !Array.isArray(options)
      ? options
      : {};

  let out;
  try {
    out = await plugin.generate(schema, {
      aliasMap: safeAliasMap,
      options: safeOptions,
    });
  } catch (err) {
    if (typeof console !== "undefined" && typeof console.error === "function") {
      console.error("Template generation failed", err);
    }
    return jsonError("Template generation failed", 500);
  }

  if (!out || typeof out !== "object" || typeof out.content === "undefined") {
    return jsonError("Template generation returned an invalid payload", 500);
  }

  const type = out.type === "zip" ? "zip" : "html";
  const suggestedName = typeof out.filename === "string" ? out.filename : undefined;

  if (type === "zip") {
    const downloadName = sanitize(suggestedName ?? filename, ".zip");
    return new Response(out.content, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${downloadName}"`,
      },
    });
  }

  const downloadName = sanitize(suggestedName ?? filename, ".html");
  return new Response(out.content, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `attachment; filename="${downloadName}"`,
    },
  });
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: JSON_HEADERS,
  });
}

function sanitize(name, ext) {
  const normalizedExt = ext ? (ext.startsWith(".") ? ext : `.${ext}`) : "";
  const fallbackBase = "caspar-template";
  const fallback = `${fallbackBase}${normalizedExt}`;

  if (typeof name !== "string") {
    return fallback;
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return fallback;
  }

  let basePart = trimmed;
  if (
    normalizedExt &&
    trimmed.toLowerCase().endsWith(normalizedExt.toLowerCase())
  ) {
    basePart = trimmed.slice(0, -normalizedExt.length);
  }

  const cleanedBase = basePart
    .replace(/[^\w.-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_\.]+/, "")
    .replace(/[_\.]+$/, "");

  const finalBase = cleanedBase || fallbackBase;
  return `${finalBase}${normalizedExt}`;
}
