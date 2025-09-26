// src/handlers/list-templates.mjs
import { registry } from "../templates/registry.mjs";
export default async () => {
  const list = registry().map(p => ({ key: p.key, name: p.name, kind: p.kind, description: p.description }));
  return new Response(JSON.stringify(list), { headers: { "content-type": "application/json" }});
};
