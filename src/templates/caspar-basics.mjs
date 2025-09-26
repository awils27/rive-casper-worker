// src/templates/caspar-basic.mjs
export default {
  key: "caspar-basic",
  name: "Caspar Basic (Data Binding Only)",
  kind: "single-html",
  description:
    "HTML template using View Model for text/colors/booleans/numbers and triggers for Play/Out/Next",
  async generate(schema, { aliasMap = {}, options = {} } = {}) {
    const html = buildHtml(schema, aliasMap, options);
    return { type: "html", content: html };
  },
};

function buildHtml(schema, aliasMap, options) {
  const { artboard = "", stateMachine = "", viewModelProps = [] } = schema;
  const triggers = options?.casparTriggers ?? {};
  const inTrig = triggers.in || null;
  const outTrig = triggers.out || null;
  const nextTrig = triggers.next || null;

  // Setters for View Model props (string/number/boolean/color + trigger fire via UPDATE)
  const vmSetters = viewModelProps
    .map(({ name, type }) => {
      const key = aliasMap[name] || name;
      const safe = escapeJS(name);
      if (type === "string")
        return `if (o["${key}"] != null) try { vmi?.string("${safe}").value = String(o["${key}"]); } catch {}`;
      if (type === "number")
        return `if (o["${key}"] != null) try { vmi?.number("${safe}").value = Number(o["${key}"]||0); } catch {}`;
      if (type === "boolean")
        return `if (o["${key}"] != null) try { vmi?.boolean("${safe}").value = !!o["${key}"]; } catch {}`;
      if (type === "color")
        return `
      if (o["${key}"] != null) {
        try {
          const s = String(o["${key}"]).trim();
          const c = s.startsWith("#")
            ? (s.length === 7 ? (0xFF000000 | parseInt(s.slice(1),16)) >>> 0 : (parseInt(s.slice(1),16)) >>> 0)
            : Number(s);
          vmi?.color("${safe}").value = c;
        } catch {}
      }`;
      if (type === "trigger")
        return `
      // Allow firing triggers via UPDATE: {"${key}": true}
      if (o["${key}"] === true) { try { vmi?.trigger("${safe}").trigger(); } catch {} }`;
      return "";
    })
    .join("\n    ");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>CasparCG + Rive (Data Binding)</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>html{background:transparent;overflow:hidden}body{margin:0}#stage{position:absolute;inset:0}canvas{width:100vw;height:100vh}</style>
</head>
<body>
  <div id="stage"><canvas id="cg" width="1920" height="1080"></canvas></div>
  <script src="https://unpkg.com/@rive-app/canvas"></script>
  <script>
  'use strict';
  const CANVAS = document.getElementById('cg');
  let r = null, vmi = null;

  function boot(){
    r = new rive.Rive({
      src: './graphics.riv',                // place next to this HTML or adjust path
      canvas: CANVAS,
      autoplay: false,
      artboard: ${JSON.stringify(artboard)},
      stateMachines: ${JSON.stringify(stateMachine)}, // optional but typical
      autoBind: true,
      onLoad(){
        try { r.resizeDrawingSurfaceToCanvas(); } catch {}
        try { vmi = r.viewModelInstance; } catch {}
        addEventListener('resize', () => { try { r.resizeDrawingSurfaceToCanvas(); } catch {} });
      }
    });
  }
  boot();

  function apply(o){
    if (!o) return;
    ${vmSetters}
  }

  // CasparCG HTML API — mapped ONLY to View Model
  window.update = (raw) => { try { apply(JSON.parse(raw)); } catch(e) { console.error('bad JSON', e, raw); } };

  window.play = () => {
    try { r?.play(${JSON.stringify(stateMachine)}); } catch {}
    ${inTrig ? `try { vmi?.trigger(${JSON.stringify(inTrig)}).trigger(); } catch {}` : ""}
  };

  window.next = () => {
    ${nextTrig ? `try { vmi?.trigger(${JSON.stringify(nextTrig)}).trigger(); } catch {}` : ""}
  };

  window.stop = () => {
    ${outTrig ? `try { vmi?.trigger(${JSON.stringify(outTrig)}).trigger(); } catch {}` : ""}
    try { r?.stop(${JSON.stringify(stateMachine)}); } catch {}
  };

  window.remove = () => { try { r?.cleanup(); } catch {} };
  </script>
</body>
</html>`;
}

const escapeJS = (s) => s.replace(/["\\]/g, (m) => `\\${m}`);
