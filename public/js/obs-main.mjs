import { $, escapeHtml, populateSelect, formatDefaultCell, presetValueForXml, sanitizeFilename } from '../js/utils.mjs';
import { inspectContents, buildSchema } from '../js/rive-introspect.mjs';
import { generateTemplate } from '../js/api.mjs';

const els = {
  file: $('#rivfile'), fileStatus: $('#fileStatus'),
  detectedCard: $('#detectedCard'), mappingCard: $('#mappingCard'),
  artSel: $('#artboardSel'), smSel: $('#smSel'),
  propsTable: $('#propsTable'), propsBody: $('#propsBody'), propsEmpty: $('#propsEmpty'),
  inSel: $('#inTriggerSel'), outSel: $('#outTriggerSel'),
  startMs: $('#startMs'), outAfterMs: $('#outAfterMs'),
  includeDefaults: $('#includeDefaults'),
  urlOut: $('#urlOut'), copyUrlBtn: $('#copyUrlBtn'),
  downloadObsHtml: $('#downloadObsHtml'),
  hiddenCanvas: $('#hiddenCanvas')
};

let file = null, blobURL = null, contents = null, schema = null;
let currentArt = '', currentSM = '';

function renderSelectors(contents){
  const artNames = (contents?.artboards || []).map(a => a.name);
  populateSelect(els.artSel, artNames, currentArt || artNames[0] || '');
  const art = (contents?.artboards || []).find(a => a.name === els.artSel.value);
  const smNames = (art?.stateMachines || []).map(sm => sm.name);
  populateSelect(els.smSel, smNames, currentSM || smNames[0] || '');
  return { art: els.artSel.value, sm: els.smSel.value };
}

function renderPropsTable(viewModelProps){
  els.propsBody.innerHTML = '';
  if (!viewModelProps?.length){
    els.propsTable.style.display='none'; els.propsEmpty.style.display='block'; return;
  }
  els.propsTable.style.display=''; els.propsEmpty.style.display='none';
  const rows = [...viewModelProps].sort((a,b)=>a.name.localeCompare(b.name));
  for (const p of rows){
    const note = p.type==='color' ? 'Use <code>#RRGGBB</code> or <code>0xAARRGGBB</code>'
              : p.type==='trigger' ? 'Use In/Out mapping below'
              : 'Set via <code>vm.'+escapeHtml(p.name)+'</code>';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>${escapeHtml(p.name)}</code></td>
      <td><small class="muted">${p.type}</small></td>
      <td><code>vm.${escapeHtml(p.name)}</code></td>
      <td>${formatDefaultCell(p)}</td>
      <td>${note}</td>`;
    els.propsBody.appendChild(tr);
  }
}

function updateTriggerSelects(viewModelProps){
  const triggerNames = (viewModelProps||[]).filter(p=>p.type==='trigger').map(p=>p.name);
  populateSelect(els.inSel,  ['(none)', ...triggerNames], '(none)');
  populateSelect(els.outSel, ['(none)', ...triggerNames], '(none)');
}

function buildUrl(){
  const base = new URL('../obs/obs-player.html', window.location.origin + '/obs/'); // points at the OBS template path for preview/testing
  const q = base.searchParams;
  // core
  q.set('riv', file?.name || 'graphics.riv');
  if (currentArt) q.set('artboard', currentArt);
  if (currentSM)  q.set('sm', currentSM);
  const inTrig  = els.inSel.value;  if (inTrig && inTrig !== '(none)')  q.set('in', inTrig);
  const outTrig = els.outSel.value; if (outTrig && outTrig !== '(none)') q.set('out', outTrig);
  const start = Math.max(0, parseInt(els.startMs.value || '0', 10) || 0);
  const outAfter = Math.max(0, parseInt(els.outAfterMs.value || '0', 10) || 0);
  q.set('startMs', String(start));
  if (outAfter > 0) q.set('outAfterMs', String(outAfter));

  // VM defaults as url params (optional)
  if (els.includeDefaults.checked){
    (schema?.viewModelProps || []).forEach(p => {
      if (p.type === 'trigger') return;
      if (p.value == null) return;
      q.set('vm.'+p.name, presetValueForXml(p));
    });
  }
  els.urlOut.value = base.toString();
}

function onChangeRebuildUrl(){
  if (!schema) return;
  buildUrl();
}

// File selection
els.file.addEventListener('change', async () => {
  const f = els.file.files?.[0];
  if (!f){ els.fileStatus.textContent = 'No file selected.'; return; }
  file = f; els.fileStatus.textContent = 'Reading file…'; schema = null;
  if (blobURL) URL.revokeObjectURL(blobURL);
  blobURL = URL.createObjectURL(file);

  try { contents = await inspectContents(blobURL, els.hiddenCanvas); }
  catch(e){ console.error(e); alert('Failed to read the Rive file.'); return; }

  const sel = renderSelectors(contents); currentArt = sel.art; currentSM = sel.sm;

  try { schema = await buildSchema(blobURL, els.hiddenCanvas, currentArt, currentSM); }
  catch(e){ console.error(e); alert('Failed to initialize Rive for the selected artboard/SM.'); return; }

  renderPropsTable(schema.viewModelProps);
  updateTriggerSelects(schema.viewModelProps);

  els.detectedCard.style.display = 'block';
  els.mappingCard.style.display = 'block';
  els.fileStatus.textContent = `Loaded ${file.name}`;
  els.downloadObsHtml.disabled = false;

  buildUrl();
});

els.artSel.addEventListener('change', async () => {
  currentArt = els.artSel.value;
  const art = (contents?.artboards || []).find(a => a.name === currentArt);
  const smNames = (art?.stateMachines || []).map(sm => sm.name);
  currentSM = smNames.includes(currentSM) ? currentSM : (smNames[0] || '');
  els.smSel.value = currentSM;
  try { schema = await buildSchema(blobURL, els.hiddenCanvas, currentArt, currentSM); }
  catch(e){ console.error(e); alert('Failed to initialize Rive for the selected artboard/SM.'); return; }
  renderPropsTable(schema.viewModelProps);
  updateTriggerSelects(schema.viewModelProps);
  buildUrl();
});

els.smSel.addEventListener('change', async () => {
  currentSM = els.smSel.value;
  try { schema = await buildSchema(blobURL, els.hiddenCanvas, currentArt, currentSM); }
  catch(e){ console.error(e); alert('Failed to initialize Rive for the selected artboard/SM.'); return; }
  renderPropsTable(schema.viewModelProps);
  updateTriggerSelects(schema.viewModelProps);
  buildUrl();
});

['change','input'].forEach(evt => {
  els.inSel.addEventListener(evt, onChangeRebuildUrl);
  els.outSel.addEventListener(evt, onChangeRebuildUrl);
  els.startMs.addEventListener(evt, onChangeRebuildUrl);
  els.outAfterMs.addEventListener(evt, onChangeRebuildUrl);
  els.includeDefaults.addEventListener(evt, onChangeRebuildUrl);
});

// Copy URL
els.copyUrlBtn.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(els.urlOut.value); els.copyUrlBtn.textContent='Copied!'; setTimeout(()=>els.copyUrlBtn.textContent='Copy', 900); } catch {}
});

// Generate OBS HTML (download)
els.downloadObsHtml.addEventListener('click', async () => {
  if (!schema || !file) return;
  const htmlFilename = sanitizeFilename(`obs-${(file.name || 'graphic').replace(/\\.riv$/i,'')}.html`);
  const payload = {
    template: "obs-url",
    schema,                              // embed VM types for accurate URL mapping
    filename: htmlFilename,
    options: {
      rivPath: file.name,                // default if ?riv= is omitted
      startMs: parseInt(els.startMs.value || '0', 10) || 0,
      outAfterMs: parseInt(els.outAfterMs.value || '-1', 10) || -1
    }
  };
  try {
    const res = await fetch('/generate', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Generate failed: ${res.status} ${res.statusText}`);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = htmlFilename; a.click();
    URL.revokeObjectURL(a.href);
  } catch (e){ console.error(e); alert(e.message); }
});
