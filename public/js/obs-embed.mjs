// public/js/obs-embed.mjs
import { downloadBlob, sanitizeFilename } from './utils.mjs';

/**
 * Download an OBS HTML with the .riv embedded as Base64 (no server).
 * @param {Object} schema - { artboard, stateMachine, viewModelProps }
 * @param {File}   file   - the selected .riv File
 * @param {Object} defaults - { artboard, stateMachine, startMs, outAfterMs, clearAfterMs, vmDefaults? }
 */
export async function downloadEmbeddedObsHtml(schema, file, defaults = {}) {
  if (!file) throw new Error('No .riv file selected');

  // 1) Read the .riv as data URL (fast, ~10–100ms for 10MB on desktop)
  const base64 = await fileToBase64(file); // raw base64 (no prefix)

  // 2) Build the single-file OBS HTML (Canvas, ES5-safe)
  const html = buildEmbeddedObsHtml(schema || {}, {
    base64,
    artboard: defaults.artboard ?? schema.artboard ?? '',
    stateMachine: defaults.stateMachine ?? schema.stateMachine ?? '',
    startMs: Number.isFinite(defaults.startMs) ? defaults.startMs : 0,
    outAfterMs: Number.isFinite(defaults.outAfterMs) ? defaults.outAfterMs : -1,
    clearAfterMs: Number.isFinite(defaults.clearAfterMs) ? defaults.clearAfterMs : -1,
    vmDefaults: defaults.vmDefaults || null, // optional baked defaults
  });

  // 3) Download the HTML
  const nameBase = (file.name || 'graphic').replace(/\.riv$/i, '');
  const outName = sanitizeFilename(`obs-${nameBase}.embedded.html`);
  downloadBlob(new Blob([html], { type: 'text/html' }), outName);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error || new Error('File read failed'));
    fr.onload = () => {
      const s = String(fr.result || '');
      // fr.readAsDataURL gives "data:...;base64,XXXX"
      const b64 = s.split(',')[1] || '';
      resolve(b64);
    };
    fr.readAsDataURL(file);
  });
}

function escapeJS(s) {
  return String(s).replace(/["\\]/g, (m) => '\\' + m);
}

/**
 * Builds ES5-friendly single-file OBS player that:
 * - prefers ?riv=... if present
 * - else uses embedded Base64 -> Blob URL
 * - reads ?artboard, ?sm, ?in, ?out, ?startMs, ?outAfterMs, ?clearAfterMs
 * - reads any number of ?vm.<Name>=value params
 * - optionally applies baked defaults (DEF.vm) before URL overrides
 */
function buildEmbeddedObsHtml(schema, cfg) {
  const viewModelProps = Array.isArray(schema.viewModelProps) ? schema.viewModelProps : [];

  // Per-prop URL setters
  const urlSetters = viewModelProps.map((p) => {
    const key = `vm.${p.name}`;
    const safe = escapeJS(p.name);
    if (p.type === 'string') {
      return `
        v = params.get("${key}");
        if (v != null) { try { if (vmi && vmi.string) { it = vmi.string("${safe}"); if (it) it.value = String(v); } } catch(e){} }
      `;
    }
    if (p.type === 'number') {
      return `
        v = params.get("${key}");
        if (v != null) { n = Number(v); if (isFinite(n)) { try { if (vmi && vmi.number) { it = vmi.number("${safe}"); if (it) it.value = n; } } catch(e){} } }
      `;
    }
    if (p.type === 'boolean') {
      return `
        v = params.get("${key}");
        if (v != null) { b = toBool(v, false); try { if (vmi && vmi.boolean) { it = vmi.boolean("${safe}"); if (it) it.value = b; } } catch(e){} }
      `;
    }
    if (p.type === 'color') {
      return `
        v = params.get("${key}");
        if (v != null) { c = toColor32(v); if (c != null) { try { if (vmi && vmi.color) { it = vmi.color("${safe}"); if (it) it.value = c; } } catch(e){} } }
      `;
    }
    if (p.type === 'trigger') {
      return `
        v = params.get("${key}");
        if (v === "true" || v === "1") { try { fireVmTrigger("${safe}"); } catch(e){} }
      `;
    }
    return '';
  }).join('\n      ');

  // Optional baked defaults for VM props
  const vmDefaultsObj = (cfg.vmDefaults && typeof cfg.vmDefaults === 'object')
    ? cfg.vmDefaults
    : null;

  const vmDefaultsLines = vmDefaultsObj
    ? Object.keys(vmDefaultsObj).map((name) => {
        const safe = escapeJS(name);
        const value = vmDefaultsObj[name];
        // best-effort typed assignment
        return `
          (function(){
            var it;
            try {
              if (vmi.string && (it = vmi.string("${safe}")))   { it.value = String(${JSON.stringify(String(value))}); return; }
              if (vmi.number && (it = vmi.number("${safe}")))   { var n = Number(${JSON.stringify(String(value))}); if (isFinite(n)) it.value = n; return; }
              if (vmi.boolean && (it = vmi.boolean("${safe}"))) { var b = (String(${JSON.stringify(String(value))}).toLowerCase() === "true"); it.value = b; return; }
              if (vmi.color && (it = vmi.color("${safe}")))     { var c = toColor32(${JSON.stringify(String(value))}); if (c!=null) it.value = c; return; }
            } catch(e){}
          })();
        `;
      }).join('\n      ')
    : '';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>OBS Rive Player (Embedded)</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  html{background:transparent;overflow:hidden}
  body{margin:0}
  #stage{position:absolute;inset:0}
  canvas{width:100vw;height:100vh}
</style>
</head>
<body>
  <div id="stage"><canvas id="cg" width="1920" height="1080"></canvas></div>
  <script src="https://unpkg.com/@rive-app/canvas"></script>
  <script>
  (function(){
    "use strict";
    // Embedded .riv (Base64, no data: prefix)
    var RIV_BASE64 = "${cfg.base64}";

    function base64ToBlobUrl(b64){
      var bin = atob(b64);
      var len = bin.length;
      var bytes = new Uint8Array(len);
      for (var i=0;i<len;i++) bytes[i] = bin.charCodeAt(i);
      var blob = new Blob([bytes], { type: "application/octet-stream" });
      return URL.createObjectURL(blob);
    }

    function num(v, d){ var n = Number(v); return isFinite(n) ? n : d; }
    function toBool(v, d){
      if (v == null) return d;
      var s = String(v).toLowerCase();
      if (s === "true" || s === "1" || s === "yes")  return true;
      if (s === "false"|| s === "0" || s === "no")   return false;
      return d;
    }
    function toColor32(raw){
      if (raw == null) return null;
      var s = String(raw).trim();
      if (s.charAt(0) === "#"){
        return (s.length === 7 ? (0xFF000000 | parseInt(s.slice(1),16)) >>> 0 : (parseInt(s.slice(1),16)) >>> 0);
      }
      var n = Number(s); return isFinite(n) ? (n>>>0) : null;
    }
    function fireVmTrigger(name){
      if (!name || !vmi) return false;
      try {
        var t = vmi.trigger ? vmi.trigger(name) : null;
        if (!t) return false;
        if (typeof t.fire    === "function") { t.fire();    return true; }
        if (typeof t.trigger === "function") { t.trigger(); return true; }
        if (typeof t === "object" && "value" in t) { try { t.value = true; return true; } catch(e){} }
      } catch(e){}
      return false;
    }

    var CANVAS = document.getElementById("cg");
    var r = null, vmi = null;

    var u = new URL(window.location.href);
    var params = u.searchParams;

    var DEF = {
      riv: "./graphics.riv",                         // only used if RIV_BASE64 is empty AND no ?riv=
      artboard: ${JSON.stringify(cfg.artboard || "")},
      sm: ${JSON.stringify(cfg.stateMachine || "")},
      startMs: ${Number(cfg.startMs)||0},
      outAfterMs: ${Number(cfg.outAfterMs)||-1},
      clearAfterMs: ${Number(cfg.clearAfterMs)||-1}
    };

    // Choose riv source: ?riv=... OR embedded base64 OR DEF.riv
    var riv = params.get("riv") || (RIV_BASE64 ? base64ToBlobUrl(RIV_BASE64) : DEF.riv);
    var ab  = params.get("artboard") || params.get("ab") || ${cfg.artboard ? JSON.stringify(cfg.artboard) : "undefined"};
    var sm  = params.get("sm") || params.get("statemachine") || ${cfg.stateMachine ? JSON.stringify(cfg.stateMachine) : "undefined"};
    var trigIn  = params.get("in")  || null;
    var trigOut = params.get("out") || null;
    var startMs    = num(params.get("startMs"), DEF.startMs);
    var outAfterMs = num(params.get("outAfterMs"), DEF.outAfterMs);
    var clearAfterMs = num(params.get("clearAfterMs"), DEF.clearAfterMs);

    function applyBakedDefaults(){
      ${vmDefaultsLines}
    }

    function applyFromUrl(){
      if (!vmi) return;
      var v, it, n, b, c;
      ${urlSetters}
      // Fallback: any extra vm.* not in schema
      params.forEach(function(value, key){
        if (key.indexOf("vm.") !== 0) return;
        var name = key.slice(3);
        try {
          var it;
          if (vmi.string && (it = vmi.string(name)))   { it.value = String(value); return; }
          if (vmi.number && (it = vmi.number(name)))   { var n = Number(value); if (isFinite(n)) it.value = n; return; }
          if (vmi.boolean && (it = vmi.boolean(name))) { it.value = toBool(value, false); return; }
          if (vmi.color && (it = vmi.color(name)))     { var c = toColor32(value); if (c != null) it.value = c; return; }
          if (vmi.trigger && (it = vmi.trigger(name))) { if (value === "true" || value === "1") { fireVmTrigger(name); } return; }
        } catch(e){}
      });
    }

    function boot(){
      try {
        r = new rive.Rive({
          src: riv,
          canvas: CANVAS,
          autoplay: false,
          artboard: ab,
          stateMachines: sm,
          autoBind: true,
          onLoad: function(){
            try { if (r && r.resizeDrawingSurfaceToCanvas) r.resizeDrawingSurfaceToCanvas(); } catch(e){}
            try { vmi = r && r.viewModelInstance ? r.viewModelInstance : null; } catch(e){ vmi = null; }

            try { applyBakedDefaults(); } catch(e){}
            try { applyFromUrl(); } catch(e){}

            scheduleInOut();
            try { window.addEventListener("resize", function(){ try { if (r && r.resizeDrawingSurfaceToCanvas) r.resizeDrawingSurfaceToCanvas(); } catch(e){} }); } catch(e){}
          }
        });
      } catch(e){ console.error("Rive boot error", e); }
    }

    function scheduleInOut(){
      setTimeout(function(){
        try { if (r && r.play) r.play(); } catch(e){}
        if (trigIn) fireVmTrigger(trigIn);
        if (outAfterMs > 0){
          setTimeout(function(){
            if (trigOut) fireVmTrigger(trigOut); else { try { if (r && r.stop) r.stop(); } catch(e){} }
            if (clearAfterMs > 0){
              setTimeout(function(){ try { if (r && r.cleanup) r.cleanup(); } catch(e){} }, clearAfterMs);
            }
          }, outAfterMs);
        }
      }, Math.max(0, startMs));
    }

    boot();
  })();
  </script>
</body>
</html>`;
}
