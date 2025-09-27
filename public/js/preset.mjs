import { buildPresetXml } from './preset-core.mjs';
import { downloadBlob, presetValueForXml, fileBaseFromUploadKeepCase } from './utils.mjs';

// htmlFilename must be EXACTLY the same name sent to /generate (including case).
// <name> in XML will be htmlFilename minus '.html'.
export function downloadPreset(schema, file, htmlFilename) {
  const componentData = (schema.viewModelProps || [])
    .filter(p => p.type !== 'trigger' && p.value != null)
    .map(p => ({ id: p.name, value: presetValueForXml(p) })); // IDs = exact VM names

  const nameBase  = String(htmlFilename || 'caspar-template.html').replace(/\.html$/i, '');
  const labelBase = fileBaseFromUploadKeepCase(file); // keep uploaded .riv case

  const xml = buildPresetXml({
    label: labelBase,
    name:  nameBase,       // EXACT match to HTML file minus .html
    layer: 20,
    sendAsJson: true,
    componentData
  });

  downloadBlob(new Blob([xml], { type: 'application/xml' }), `${labelBase}.xml`);
}
