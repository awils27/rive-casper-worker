// src/templates/caspar-basic-webgl.mjs
// Same data-binding behaviour as caspar-basic, but uses the WebGL runtime.
export default {
  key: "caspar-basic-webgl",
  name: "Caspar Basic (WebGL)",
  kind: "single-html",
  description:
    "HTML template using the Rive WebGL runtime for animation playback",
  async generate(schema, { aliasMap = {}, options = {} } = {}) {
    const html = buildHtml(schema, aliasMap, options);
    return { type: "html", content: html };
  },
};

function buildHtml(schema, aliasMap, options) {
  const { artboard = "", stateMachine = "", viewModelProps = [] } = schema || {};
  const trigIn   = options?.casparTriggers?.in   || null;
  const trigOut  = options?.casparTriggers?.out  || null;
  const trigNext = options?.casparTriggers?.next || null;
  const runtimeUrl = options?.riveRuntimeUrl || "https://unpkg.com/@rive-app/webgl";
  const rivPath = options?.rivPath || "./graphics.riv";

  const setters = (viewModelProps || []).map(({ name, type }) => {
    const key  = aliasMap[name] || name;
    const safe = escapeJS(name);
    if (type === "string")
      return `
        if (o["${key}"] != null) {
          try {
            const inst = vmi && vmi.string("${safe}");
            if (inst) inst.value = String(o["${key}"]);
          } catch (err) {}
        }`;
    if (type === "number")
      return `
        if (o["${key}"] != null) {
          try {
            const inst = vmi && vmi.number("${safe}");
            if (inst) inst.value = Number(o["${key}"] || 0);
          } catch (err) {}
        }`;
    if (type === "boolean")
      return `
        if (o["${key}"] != null) {
          try {
            const inst = vmi && vmi.boolean("${safe}");
            if (inst) inst.value = !!o["${key}"];
          } catch (err) {}
        }`;
    if (type === "color")
      return `
        if (o["${key}"] != null) {
          try {
            const s = String(o["${key}"]).trim();
            const c = s.startsWith("#")
              ? (s.length === 7 ? (0xFF000000 | parseInt(s.slice(1),16)) >>> 0 : (parseInt(s.slice(1),16)) >>> 0)
              : Number(s);
            const inst = vmi && vmi.color("${safe}");
            if (inst) inst.value = c;
          } catch (err) {}
        }`;
    if (type === "trigger")
      return `
        if (o["${key}"] === true) {
          try {
            const inst = vmi && vmi.trigger("${safe}");
            if (inst) inst.trigger();
          } catch (err) {}
        }`;
    return "";
  }).join("\n      ");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>CasparCG + Rive (WebGL)</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  html{background:transparent;overflow:hidden}
  body{margin:0}
  #stage{position:absolute;inset:0}
  canvas{width:100vw;height:100vh}
</style>
</head>
<body>
  <div id="stage"><canvas id="cg" width="1920" height="1080"></canvas></div>
  <script src="${runtimeUrl}"></script>
  <script>
    'use strict';
    const RIVE_FILE = ${JSON.stringify(rivPath)};
    let canvasEl = null;
    let riveBytes = null;
    let riveLoading = false;
    let riveLoadFailed = false;
    let r = null;
    let vmi = null;
    let pendingData = null;

    function loadRiveBytes() {
      if (riveBytes || riveLoading || riveLoadFailed) {
        return;
      }
      riveLoading = true;
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', RIVE_FILE, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function () {
          riveLoading = false;
          if (xhr.status === 200 || xhr.status === 0) {
            if (xhr.response && xhr.response.byteLength > 0) {
              riveBytes = xhr.response;
              tryCreateRiveInstance();
            } else {
              riveLoadFailed = true;
              console.error('Rive file appears empty:', RIVE_FILE);
            }
          } else {
            riveLoadFailed = true;
            console.error('Failed to load Rive file', RIVE_FILE, xhr.status, xhr.statusText);
          }
        };
        xhr.onerror = function (err) {
          riveLoading = false;
          riveLoadFailed = true;
          console.error('Error loading Rive file', RIVE_FILE, err);
        };
        xhr.send();
      } catch (err) {
        riveLoading = false;
        riveLoadFailed = true;
        console.error('Exception while loading Rive file', err);
      }
    }

    function tryCreateRiveInstance() {
      if (r) {
        return true;
      }
      if (!window.rive || !window.rive.Rive) {
        return false;
      }
      if (!riveBytes) {
        loadRiveBytes();
        return false;
      }
      if (!canvasEl) {
        canvasEl = document.getElementById('cg');
        if (!canvasEl) {
          return false;
        }
      }
      try {
        r = new window.rive.Rive({
          buffer: riveBytes,
          canvas: canvasEl,
          autoplay: false,
          artboard: ${JSON.stringify(artboard || undefined)},
          stateMachines: ${JSON.stringify(stateMachine || undefined)},
          autoBind: true,
          onLoad() {
            try {
              if (r) r.resizeDrawingSurfaceToCanvas();
            } catch (err) {}
            try {
              vmi = r ? r.viewModelInstance : null;
            if (pendingData) { try { apply(pendingData); } catch (err) { console.error("pending apply failed", err); } }
            } catch (err) {}
            addEventListener('resize', function () {
              try {
                if (r) r.resizeDrawingSurfaceToCanvas();
              } catch (err) {}
            });
          },
          onLoadError(err) {
            console.error('Failed to load Rive animation', err);
          }
        });
      } catch (err) {
        console.error('Failed to initialise Rive', err);
        return true;
      }
      return true;
    }

    function boot() {
      if (tryCreateRiveInstance()) {
        return;
      }
      if (riveLoadFailed) {
        return;
      }
      setTimeout(boot, 60);
    }

    function start() {
      loadRiveBytes();
      boot();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }

    function apply(o){
      if (!o) return;
      pendingData = o;
      if (!vmi) return;
      ${setters}
    }

    window.update = function (raw) {
      try { apply(JSON.parse(raw)); }
      catch (e) { console.error('bad JSON for UPDATE', e, raw); }
    };

    window.play = function () {
      try {
        if (r) r.play(${JSON.stringify(stateMachine || undefined)});
      } catch (err) {}
      ${trigIn   ? `try {
        const inst = vmi && vmi.trigger(${JSON.stringify(trigIn)});
        if (inst) inst.trigger();
      } catch (err) {}
` : ""}
    };

    window.next = function () {
      ${trigNext ? `try {
        const inst = vmi && vmi.trigger(${JSON.stringify(trigNext)});
        if (inst) inst.trigger();
      } catch (err) {}
` : ""}
    };

    window.stop = function () {
      ${trigOut  ? `try {
        const inst = vmi && vmi.trigger(${JSON.stringify(trigOut)});
        if (inst) inst.trigger();
      } catch (err) {}
` : ""}
      try {
        if (r) r.stop(${JSON.stringify(stateMachine || undefined)});
      } catch (err) {}
    };

    window.remove = function () {
      try {
        if (r) r.cleanup();
      } catch (err) {}
      r = null;
      vmi = null;
    };
  </script>
</body>
</html>`;
}

function escapeJS(s) {
  return String(s).replace(/["\\]/g, function(m) { return "\\\\" + m; });
}
