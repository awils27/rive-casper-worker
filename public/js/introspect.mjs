// Reads a .riv ArrayBuffer locally and returns a schema (no upload).
export async function introspect(buffer, canvas) {
  return new Promise((resolve, reject) => {
    const r = new rive.Rive({
      buffer, canvas, autoplay: false,
      onLoad() {
        const smNames = r.stateMachineNames || [];
        const stateMachine = smNames[0] || "";

        let inputs = [];
        try { inputs = stateMachine ? (r.stateMachineInputs(stateMachine) || []) : []; } catch {}

        let viewModelProps = [];
        try {
          const vm = r.defaultViewModel?.();
          viewModelProps = vm?.properties
            ? vm.properties.map((p) => ({
                name: p.name,
                type: p.type,
                value: coerceVMValue(p.type, safeGet(() => p.value))
              }))
            : [];
        } catch {}

        let artboard = "";
        try { artboard = r.activeArtboard || ""; } catch {}

        resolve({
          artboard,
          stateMachine,
          inputs: inputs.map((i) => ({ name: i.name, type: i.type })),
          viewModelProps
        });
      },
      onLoadError: reject
    });
  });
}

function safeGet(fn) {
  try { return fn(); }
  catch { return null; }
}

function coerceVMValue(type, raw) {
  if (raw == null) return null;
  switch (type) {
    case "string":
      return String(raw);
    case "number": {
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }
    case "boolean":
      return !!raw;
    case "color":
      return toColorString(raw);
    default:
      return raw;
  }
}

function toColorString(raw) {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (/^#?[0-9a-f]{6}$/i.test(trimmed)) {
      return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    }
    if (/^#?[0-9a-f]{8}$/i.test(trimmed)) {
      return `#${trimmed.slice(-6)}`;
    }
  }
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  const hex = (num >>> 0).toString(16).padStart(8, "0");
  return `#${hex.slice(-6)}`;
}