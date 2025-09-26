// Reads a .riv ArrayBuffer locally and returns a schema (no upload).
export async function introspect(buffer, canvas) {
  return new Promise((resolve, reject) => {
    const r = new rive.Rive({
      buffer, canvas, autoplay: false,
      onLoad() {
        // Pick first SM if present
        const smNames = r.stateMachineNames || [];
        const stateMachine = smNames[0] || "";

        let inputs = [];
        try { inputs = stateMachine ? (r.stateMachineInputs(stateMachine) || []) : []; } catch {}

        let viewModelProps = [];
        try {
          const vm = r.defaultViewModel?.();
          viewModelProps = vm?.properties ? vm.properties.map(p => ({ name: p.name, type: p.type })) : [];
        } catch {}

        let artboard = "";
        try { artboard = r.activeArtboard || ""; } catch {}

        resolve({
          artboard,
          stateMachine,
          inputs: inputs.map(i => ({ name: i.name, type: i.type })),  // boolean|number|trigger
          viewModelProps                                               // string|number|boolean|color
        });
      },
      onLoadError: reject
    });
  });
}
