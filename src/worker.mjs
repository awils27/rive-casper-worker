// src/worker.mjs
import { Router } from "./router.mjs";
import page from "./handlers/page.mjs";
import generate from "./handlers/generate.mjs";
import listTemplates from "./handlers/list-templates.mjs";

export default {
  fetch(request, env, ctx) {
    const r = new Router();

    r.get("/", page);
    r.get("/templates", listTemplates);
    r.post("/generate", generate);

    return r.handle(request, env, ctx);
  }
};
