// src/templates/caspar-basic.mjs
/**
 * @typedef {import("../lib/schema.js").RiveSchema} RiveSchema
 */

export default {
  key: "caspar-basic",
  name: "Caspar Basic",
  kind: "single-html",
  description: "Single HTML template implementing update/play/next/stop/remove",
  /**
   * @param {RiveSchema} schema
   * @param {{ aliasMap?: Record<string,string>, options?: Record<string,unknown> }} ctx
   */
  async generate(schema, { aliasMap = {}, options = {} } = {}) {
    const html = buildHtml(schema, aliasMap);
    return { type: "html", content: html };
  }
};

function buildHtml(schema, aliasMap) {
  const { artboard = "", stateMachine = "", inputs = [], viewModelProps = [] } = schema;

  const vmSetters = viewModelProps.map(({ name, type }) => {
    const key = aliasMap[name] || name;
    const safe = escapeJS(name);
    if (type === "string")  return `if (o["${key}"] != null) try { vmi?.string("${safe}").value = String(o["${key}"]); } catch {}`;
    if (type === "number")  return `if (o["${key}"] != null) try { vmi?.number("${safe}").value = Number(o["${key}"]||0); } catch {}`;
    if (type === "boolean") return `if (o["${key}"] != null) try { vmi?.boolean("${safe}").value = !!o["${key}"]; } catch {}`;
    if (type === "color")   return `
      if (o["${key}"] != null) {
        try {
          const s = String(o["${key}"]).trim();
          const c = s.startsWith("#")
            ? (s.length === 7 ? (0xFF000000 | parseInt(s.slice(1),16)) >>> 0 : (parseInt(s.slice(1),16)) >>> 0)
            : Number(s);
          vmi?.color("${safe}").value = c;
        } catch {}
      }`;
    return "";
  }).join("\n    ");

  const smSetters = inputs.map(({ name, type }) => {
    const key = aliasMap[name] || name;
    const safe = escapeJS(name);
    if (type === "boolean") return `{ const i = smInputs.find(ii => ii.name === "${safe}"); if (i && i.type === "boolean" && o["${key}"] != null) i.value = !!o["${key}"]; }`;
    if (type === "number")  return `{ const i = smInputs.find(ii => ii.name === "${safe}"); if (i && i.type === "number"  && o["${key}"] != null) i.value = Number(o["${key}"]||0); }`;
    if (type === "trigger") return `{ const i = smInputs.find(ii => ii.name === "${safe}"); if (i && i.type === "trigger" && o["${key}"] === true) i.fire(); }`;
    return "";
  }).join("\n    ");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>CasparCG + Rive</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>html{background:transparent;overflow:hidden}body{margin:0}#stage{position:absolute;inset:0}canvas{width:100vw;height:100vh}</style>
</head>
<body>
  <div id="stage"><canvas id="cg" width="1920" height="1080"></canvas></div>
  <script src="https://unpkg.com/@rive-app/canvas"></script>
  <script>
  'use strict';
  const CANVAS = document.getElementById('cg');
  let r = null, vmi = null, smInputs = [];

  function boot(){
    r = new rive.Rive({
      // The .riv should be next to this HTML (or adjust path as needed)
      src: './graphics.riv',
      canvas: CANVAS,
      autoplay: false,
      artboard: ${JSON.stringify(artboard)},
      stateMachines: ${JSON.stringify(stateMachine)},
      autoBind: true,
      onLoad(){
        try { r.resizeDrawingSurfaceToCanvas(); } catch {}
        try { vmi = r.viewModelInstance; } catch {}
        try { smInputs = r.stateMachineInputs(${JSON.stringify(stateMachine)}) || []; } catch {}
        addEventListener('resize', () => { try { r.resizeDrawingSurfaceToCanvas(); } catch {} });
      }
    });
  }
  boot();

  function apply(o){
    if (!o) return;
    ${vmSetters}
    ${smSetters}
  }

  // CasparCG HTML API
  window.update = (raw) => { try { apply(JSON.parse(raw)); } catch(e) { console.error('bad JSON', e, raw); } };
  window.play   = () => { try { r?.play(${JSON.stringify(stateMachine)}); } catch {} };
  window.next   = () => {}; // fire triggers via UPDATE: {"Next": true}
  window.stop   = () => { try { r?.stop(${JSON.stringify(stateMachine)}); } catch {} };
  window.remove = () => { try { r?.cleanup(); } catch {} };
  </script>
</body>
</html>`;
}

const escapeJS = (s) => s.replace(/["\\]/g, (m) => `\\${m}`);
