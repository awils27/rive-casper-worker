import { listPlugins } from "../templates/registry.mjs";

export default async function listTemplates() {
  const list = listPlugins();
  return new Response(JSON.stringify(list), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
