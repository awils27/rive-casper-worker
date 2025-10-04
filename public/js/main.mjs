import { $, pickOrNull, sanitizeFilename } from './utils.mjs';
import { inspectContents, buildSchema } from './rive-introspect.mjs';
import { els, renderSelectors, renderPropsTable, updateTriggerSelects, updateRuntimeNotice } from './ui.mjs';
import { downloadPreset } from './preset.mjs';
import { buildCasparBasic, buildCasparBasicWebGL } from './caspar-templates.mjs';

let file = null, blobURL = null, contents = null, schema = null;
let currentArt = '', currentSM = '';
let htmlFilename = 'caspar-template.html';

// runtime notice
els.runtimeRadios.forEach(r => r.addEventListener('change', updateRuntimeNotice));
updateRuntimeNotice();

// File selection
els.file.addEventListener('change', onFileSelect);

async function onFileSelect() {
  const f = els.file.files?.[0];
  if (!f) { els.fileStatus.textContent = 'No file selected.'; return; }

  file = f;
  els.fileStatus.textContent = 'Reading file…';
  schema = null;

  if (blobURL) URL.revokeObjectURL(blobURL);
  blobURL = URL.createObjectURL(file);

  try {
    contents = await inspectContents(blobURL, els.hiddenCanvas);
  } catch (e) {
    console.error('[inspect] failed', e);
    alert('Failed to read the Rive file.');
    return;
  }

  const sel = renderSelectors(contents, currentArt, currentSM);
  currentArt = sel.art; currentSM = sel.sm;

  try {
    schema = await buildSchema(blobURL, els.hiddenCanvas, currentArt, currentSM);
  } catch (e) {
    console.error('[schema] failed', e);
    alert('Failed to initialize Rive for the selected artboard/SM.');
    return;
  }

  renderPropsTable(schema.viewModelProps);
  updateTriggerSelects(schema.viewModelProps);

  els.detectedCard.style.display = 'block';
  els.mappingCard.style.display = 'block';
  els.fileStatus.textContent = `Loaded ${file.name}`;

  // EXACT HTML filename (preserve case from .riv)
  htmlFilename = sanitizeFilename(`caspar-${(file?.name || 'template').replace(/\.riv$/i, '')}.html`);

  // Enable buttons
  els.downloadBtn.disabled = false;
  if (els.downloadPresetBtn) els.downloadPresetBtn.disabled = false;
}

// Artboard/SM changes
els.artSel.addEventListener('change', async () => {
  currentArt = els.artSel.value;
  const art = (contents?.artboards || []).find(a => a.name === currentArt);
  const smNames = (art?.stateMachines || []).map(sm => sm.name);
  currentSM = smNames.includes(currentSM) ? currentSM : (smNames[0] || '');
  els.smSel.value = currentSM;
  await rebuildSchema();
});

els.smSel.addEventListener('change', async () => {
  currentSM = els.smSel.value;
  await rebuildSchema();
});

async function rebuildSchema() {
  try {
    schema = await buildSchema(blobURL, els.hiddenCanvas, currentArt, currentSM);
  } catch (e) {
    console.error('[schema] failed', e);
    alert('Failed to initialize Rive for the selected artboard/SM.');
    return;
  }
  renderPropsTable(schema.viewModelProps);
  updateTriggerSelects(schema.viewModelProps);
}

// Template download (HTML) — FRONT-END ONLY
els.downloadBtn.addEventListener('click', async () => {
  if (!schema) return;
  els.status.textContent = 'Generating…';

  const key = document.querySelector('input[name="runtime"]:checked')?.value || 'caspar-basic';
  const builder = (key === 'caspar-basic-webgl') ? buildCasparBasicWebGL : buildCasparBasic;

  const html = builder(schema, {
    aliasMap: {},
    options: {
      rivPath: (file && file.name) ? file.name : 'graphics.riv',
      includeViewModelProps: true,
      casparTriggers: {
        in:  pickOrNull(els.inSel.value),
        out: pickOrNull(els.outSel.value),
        next: pickOrNull(els.nextSel.value)
      }
    }
  });

  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = htmlFilename;
  a.click();
  URL.revokeObjectURL(a.href);

  els.status.textContent = 'Downloaded template.';
});

// One-click preset download (XML) — <name> matches HTML filename minus '.html'
if (els.downloadPresetBtn) {
  els.downloadPresetBtn.addEventListener('click', () => {
    if (!schema) return;
    downloadPreset(schema, file, htmlFilename);
    els.status.textContent = 'Downloaded preset.';
  });
}
