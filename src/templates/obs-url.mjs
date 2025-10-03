// src/templates/obs-url.mjs
// Generates a single-file OBS player (Canvas) that reads all config from URL params.
// ES5-compatible for Caspar/older Chromium. No Caspar API — URL-only control.
export default {
  key: "obs-url",
  name: "OBS URL Player (Canvas)",
  kind: "single-html",
  description:
    "OBS Browser Source player for .riv controlled via URL (vm.* values, in/out triggers, timers).",
  async generate(schema, { options = {} } = {}) {
    // Defaults baked into the HTML if URL params are not provided.
    var artboard = schema && schema.artboard ? schema.artboard : "";
    var stateMachine = schema && schema.stateMachine ? schema.stateMachine : "";
    var rivFallback = (options && options.rivPath) || "./graphics.riv";
    var startMsFallback = (options && typeof options.startMs === "number") ? options.startMs : 0;
    var outAfterMsFallback = (options && typeof options.outAfterMs === "number") ? options.outAfterMs : -1;
    var clearAfterMsFallback = (options && typeof options.clearAfterMs === "number") ? options.clearAfterMs : -1;

    // Build per-property URL mapping lines so vm.NAME uses the right setter type.
    var viewModelProps = (schema && Array.isArray(schema.viewModelProps)) ? schema.viewModelProps : [];
    var urlSetters = viewModelProps.map(function (p) {
      var name = String(p.name);
      var safe = escapeJS(name);
      var key = "vm." + name; // exact (case-sensitive) mapping
      if (p.type === "string") {
        return ''
          + 'v = params.get("' + key + '");\n'
          + 'if (v != null) { try { if (vmi && vmi.string) { it=vmi.string("' + safe + '"); if (it) it.value = String(v); } } catch(e){} }\n';
      }
      if (p.type === "number") {
        return ''
          + 'v = params.get("' + key + '");\n'
          + 'if (v != null) { n=Number(v); if (isFinite(n)) { try { if (vmi && vmi.number){ it=vmi.number("' + safe + '"); if (it) it.value = n; } } catch(e){} } }\n';
      }
      if (p.type === "boolean") {
        return ''
          + 'v = params.get("' + key + '");\n'
          + 'if (v != null) { b=toBool(v,false); try { if (vmi && vmi.boolean){ it=vmi.boolean("' + safe + '"); if (it) it.value = b; } } catch(e){} }\n';
      }
      if (p.type === "color") {
        return ''
          + 'v = params.get("' + key + '");\n'
          + 'if (v != null) { c=toColor32(v); if (c!=null) { try { if (vmi && vmi.color){ it=vmi.color("' + safe + '"); if (it) it.value = c; } } catch(e){} } }\n';
      }
      if (p.type === "trigger") {
        return ''
          + 'v = params.get("' + key + '");\n'
          + 'if (v === "true" || v === "1") { try { fireVmTrigger("' + safe + '"); } catch(e){} }\n';
      }
      return '';
    }).join("      ");

    var html =
'<!doctype html>\n'
+'<html>\n'
+'<head>\n'
+'<meta charset="utf-8"/>\n'
+'<title>OBS Rive Player (URL)</title>\n'
+'<meta name="viewport" content="width=device-width, initial-scale=1"/>\n'
+'<style>html{background:transparent;overflow:hidden}body{margin:0}#stage{position:absolute;inset:0}canvas{width:100vw;height:100vh}</style>\n'
+'</head>\n'
+'<body>\n'
+'  <div id="stage"><canvas id="cg" width="1920" height="1080"></canvas></div>\n'
+'  <script src="https://unpkg.com/@rive-app/canvas"><\\/script>\n'
+'  <script>\n'
+'  (function(){\n'
+'    "use strict";\n'
+'    // ---- helpers ----\n'
+'    function num(v, d){ var n = Number(v); return isFinite(n) ? n : d; }\n'
+'    function toBool(v, d){ if (v==null) return d; var s=String(v).toLowerCase(); if (s==="true"||s==="1"||s==="yes")return true; if (s==="false"||s==="0"||s==="no")return false; return d; }\n'
+'    function toColor32(raw){ if (raw==null) return null; var s=String(raw).trim(); if (s.charAt(0)==="#"){ return (s.length===7 ? (0xFF000000|parseInt(s.slice(1),16))>>>0 : (parseInt(s.slice(1),16))>>>0); } var n=Number(s); return isFinite(n)?(n>>>0):null; }\n'
+'    function fireVmTrigger(name){ if (!name||!vmi) return false; try { var t = vmi.trigger ? vmi.trigger(name) : null; if (!t) return false; if (typeof t.fire==="function"){ t.fire(); return true; } if (typeof t.trigger==="function"){ t.trigger(); return true; } if (typeof t==="object" && "value" in t){ try { t.value = true; return true; } catch(e){} } } catch(e){} return false; }\n'
+'\n'
+'    var CANVAS = document.getElementById("cg");\n'
+'    var r = null, vmi = null;\n'
+'\n'
+'    // URL params\n'
+'    var u = new URL(window.location.href);\n'
+'    var params = u.searchParams;\n'
+'\n'
+'    // baked-in defaults (used if URL not set)\n'
+'    var DEF = {\n'
+'      riv: ' + JSON.stringify(rivFallback) + ',\n'
+'      artboard: ' + JSON.stringify(artboard || "") + ',\n'
+'      sm: ' + JSON.stringify(stateMachine || "") + ',\n'
+'      startMs: ' + String(startMsFallback) + ',\n'
+'      outAfterMs: ' + String(outAfterMsFallback) + ',\n'
+'      clearAfterMs: ' + String(clearAfterMsFallback) + '\n'
+'    };\n'
+'\n'
+'    var riv = params.get("riv") || DEF.riv;\n'
+'    var ab  = params.get("artboard") || params.get("ab") || (DEF.artboard || undefined);\n'
+'    var sm  = params.get("sm") || params.get("statemachine") || (DEF.sm || undefined);\n'
+'    var trigIn  = params.get("in")  || null;\n'
+'    var trigOut = params.get("out") || null;\n'
+'    var startMs    = num(params.get("startMs"), DEF.startMs);\n'
+'    var outAfterMs = num(params.get("outAfterMs"), DEF.outAfterMs);\n'
+'    var clearAfterMs = num(params.get("clearAfterMs"), DEF.clearAfterMs);\n'
+'\n'
+'    function applyFromUrl(){\n'
+'      if (!vmi) return;\n'
+'      var v, it, n, b, c;\n'
+'      ' + urlSetters + '\n'
+'      // Generic fallback: any param "vm.Name" not in schema attempts best-effort types\n'
+'      params.forEach(function(value, key){\n'
+'        if (key.indexOf("vm.")!==0) return;\n'
+'        var name = key.slice(3);\n'
+'        try {\n'
+'          var it;\n'
+'          if (vmi.string && (it=vmi.string(name)))   { it.value = String(value); return; }\n'
+'          if (vmi.number && (it=vmi.number(name)))   { var n=Number(value); if (isFinite(n)) it.value = n; return; }\n'
+'          if (vmi.boolean && (it=vmi.boolean(name))) { it.value = toBool(value,false); return; }\n'
+'          if (vmi.color && (it=vmi.color(name)))     { var c=toColor32(value); if (c!=null) it.value = c; return; }\n'
+'          if (vmi.trigger && (it=vmi.trigger(name))) { if (value==="true"||value==="1") { fireVmTrigger(name); } return; }\n'
+'        } catch(e){}\n'
+'      });\n'
+'    }\n'
+'\n'
+'    function boot(){\n'
+'      try {\n'
+'        r = new rive.Rive({\n'
+'          src: riv,\n'
+'          canvas: CANVAS,\n'
+'          autoplay: false,\n'
+'          artboard: ab,\n'
+'          stateMachines: sm,\n'
+'          autoBind: true,\n'
+'          onLoad: function(){\n'
+'            try { if (r && r.resizeDrawingSurfaceToCanvas) r.resizeDrawingSurfaceToCanvas(); } catch(e){}\n'
+'            try { vmi = r && r.viewModelInstance ? r.viewModelInstance : null; } catch(e){ vmi = null; }\n'
+'            try { applyFromUrl(); } catch(e){}\n'
+'            scheduleInOut();\n'
+'            try { window.addEventListener("resize", function(){ try { if (r && r.resizeDrawingSurfaceToCanvas) r.resizeDrawingSurfaceToCanvas(); } catch(e){} }); } catch(e){}\n'
+'          }\n'
+'        });\n'
+'      } catch(e){ console.error("Rive boot error", e); }\n'
+'    }\n'
+'\n'
+'    function scheduleInOut(){\n'
+'      setTimeout(function(){\n'
+'        try { if (r && r.play) r.play(); } catch(e){}\n'
+'        if (trigIn) fireVmTrigger(trigIn);\n'
+'        if (outAfterMs > 0){\n'
+'          setTimeout(function(){\n'
+'            if (trigOut) fireVmTrigger(trigOut); else { try { if (r && r.stop) r.stop(); } catch(e){} }\n'
+'            if (clearAfterMs > 0){ setTimeout(function(){ try { if (r && r.cleanup) r.cleanup(); } catch(e){} }, clearAfterMs); }\n'
+'          }, outAfterMs);\n'
+'        }\n'
+'      }, Math.max(0, startMs));\n'
+'    }\n'
+'\n'
+'    boot();\n'
+'  })();\n'
+'  <\\/script>\n'
+'</body>\n'
+'</html>\n';

    return { type: "html", content: html };
  }
};

function escapeJS(s) {
  return String(s).replace(/["\\]/g, function(m){ return "\\" + m; });
}
