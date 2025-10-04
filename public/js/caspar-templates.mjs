// public/js/caspar-templates.mjs
// Builds Caspar-compatible HTML in the browser (Canvas & WebGL variants).
// Uses ES5-friendly inline scripts (no optional chaining).

export function buildCasparBasic(schema = {}, { aliasMap = {}, options = {} } = {}) {
  return buildHtml(schema, aliasMap, options, /*runtime*/ "canvas");
}

export function buildCasparBasicWebGL(schema = {}, { aliasMap = {}, options = {} } = {}) {
  return buildHtml(schema, aliasMap, options, /*runtime*/ "webgl");
}

function buildHtml(schema, aliasMap, options, runtime) {
  var artboard       = schema.artboard || "";
  var stateMachine   = schema.stateMachine || "";
  var viewModelProps = Array.isArray(schema.viewModelProps) ? schema.viewModelProps : [];
  var rivPath        = options && options.rivPath ? options.rivPath : "./graphics.riv";
  var includeMap     = !(options && options.hasOwnProperty("includeViewModelProps") && options.includeViewModelProps === false);

  var trigIn   = options && options.casparTriggers ? (options.casparTriggers.in   || null) : null;
  var trigOut  = options && options.casparTriggers ? (options.casparTriggers.out  || null) : null;
  var trigNext = options && options.casparTriggers ? (options.casparTriggers.next || null) : null;

  var setters = viewModelProps.map(function (p) {
    var key  = (aliasMap && aliasMap[p.name]) || p.name;  // incoming JSON key
    var safe = esc(p.name);                               // VM property name in code
    if (p.type === "string") {
      return 'if (o["' + key + '"] != null) try { if (vmi && vmi.string) { var it=vmi.string("' + safe + '"); if (it) it.value = String(o["' + key + '"]); } } catch(e){}';
    }
    if (p.type === "number") {
      return 'if (o["' + key + '"] != null) try { if (vmi && vmi.number) { var it=vmi.number("' + safe + '"); if (it) it.value = Number(o["' + key + '"]||0); } } catch(e){}';
    }
    if (p.type === "boolean") {
      return 'if (o["' + key + '"] != null) try { if (vmi && vmi.boolean) { var it=vmi.boolean("' + safe + '"); if (it) it.value = !!o["' + key + '"]; } } catch(e){}';
    }
    if (p.type === "color") {
      return '' +
      'if (o["' + key + '"] != null) {' +
      '  try {' +
      '    var s = String(o["' + key + '"]).trim();' +
      '    var c = (s.charAt(0) === "#")' +
      '      ? (s.length === 7 ? (0xFF000000 | parseInt(s.slice(1),16)) >>> 0 : (parseInt(s.slice(1),16)) >>> 0)' +
      '      : Number(s);' +
      '    if (vmi && vmi.color) { var it=vmi.color("' + safe + '"); if (it) it.value = c; }' +
      '  } catch(e){}' +
      '}';
    }
    if (p.type === "trigger") {
      return '// UPDATE trigger: {"' + key + '": true}\n' +
             'if (o["' + key + '"] === true) { try { fireVmTrigger("' + safe + '"); } catch(e){} }';
    }
    return "";
  }).join("\n      ");

  var runtimeScript = (runtime === "webgl")
    ? '<script src="https://unpkg.com/@rive-app/webgl"></script>'
    : '<script src="https://unpkg.com/@rive-app/canvas"></script>';

  return '<!doctype html>\n'
+ '<html>\n<head>\n<meta charset="utf-8" />\n<title>CasparCG + Rive ('+(runtime==='webgl'?'WebGL/WebGPU':'Canvas')+')</title>\n'
+ '<meta name="viewport" content="width=device-width, initial-scale=1" />\n'
+ '<style>html{background:transparent;overflow:hidden}body{margin:0}#stage{position:absolute;inset:0}canvas{width:100vw;height:100vh}</style>\n'
+ '</head>\n<body>\n'
+ '  <div id="stage"><canvas id="cg" width="1920" height="1080"></canvas></div>\n'
+ '  ' + runtimeScript + '\n'
+ '  <script>\n'
+ '  (function(){\n'
+ '    "use strict";\n'
+ '    var CANVAS = document.getElementById("cg");\n'
+ '    var r = null, vmi = null;\n'
+ '\n'
+ '    function boot(){\n'
+ '      try {\n'
+ '        r = new rive.Rive({\n'
+ '          src: ' + JSON.stringify(rivPath) + ',\n'
+ '          canvas: CANVAS,\n'
+ '          autoplay: false,\n'
+ '          artboard: ' + JSON.stringify(artboard || undefined) + ',\n'
+ '          stateMachines: ' + JSON.stringify(stateMachine || undefined) + ',\n'
+ '          autoBind: true,\n'
+ '          onLoad: function(){\n'
+ '            try { if (r && r.resizeDrawingSurfaceToCanvas) r.resizeDrawingSurfaceToCanvas(); } catch(e){}\n'
+ '            try { vmi = r && r.viewModelInstance ? r.viewModelInstance : null; } catch(e){ vmi = null; }\n'
+ '            try { window.addEventListener("resize", function(){ try { if (r && r.resizeDrawingSurfaceToCanvas) r.resizeDrawingSurfaceToCanvas(); } catch(e){} }); } catch(e){}\n'
+ '          }\n'
+ '        });\n'
+ '      } catch(e) { console.error("Rive boot error", e); }\n'
+ '    }\n'
+ '    boot();\n'
+ '\n'
+ '    function fireVmTrigger(name){\n'
+ '      if (!name || !vmi) return false;\n'
+ '      try {\n'
+ '        var t = (vmi.trigger) ? vmi.trigger(name) : null;\n'
+ '        if (!t) return false;\n'
+ '        if (typeof t.fire === "function")    { t.fire();    return true; }\n'
+ '        if (typeof t.trigger === "function") { t.trigger(); return true; }\n'
+ '        if (typeof t === "object" && "value" in t) { try { t.value = true; return true; } catch(e){} }\n'
+ '      } catch(e) { console.warn("VM trigger failed:", name, e); }\n'
+ '      return false;\n'
+ '    }\n'
+ '\n'
+ '    function apply(o){ if (!o) return; ' + (includeMap ? setters : '// mapping disabled') + ' }\n'
+ '\n'
+ '    // CasparCG HTML API — View Model only\n'
+ '    window.update = function(raw){ try { apply(JSON.parse(raw)); } catch(e){ console.error("bad JSON for UPDATE", e, raw); } };\n'
+ '    window.play   = function(){ try { if (r && r.play) r.play(); } catch(e){} ' + (trigIn   ? ('fireVmTrigger(' + JSON.stringify(trigIn)   + ');') : '') + ' };\n'
+ '    window.next   = function(){ ' + (trigNext ? ('fireVmTrigger(' + JSON.stringify(trigNext) + ');') : '') + ' };\n'
+ '    // IMPORTANT: fire Out before stopping; only stop if nothing mapped\n'
+ '    window.stop   = function(){ var fired = ' + (trigOut ? ('fireVmTrigger(' + JSON.stringify(trigOut) + ')') : 'false') + '; if (!fired) { try { if (r && r.stop) r.stop(); } catch(e){} } };\n'
+ '    window.remove = function(){ try { if (r && r.cleanup) r.cleanup(); } catch(e){} };\n'
+ '  })();\n'
+ '  </script>\n'
+ '</body>\n</html>';
}

function esc(s) { return String(s).replace(/["\\]/g, function(m){ return "\\" + m; }); }
