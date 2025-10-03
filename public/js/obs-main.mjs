import { $, escapeHtml, populateSelect, formatDefaultCell, presetValueForXml } from './utils.mjs';
import { inspectContents, buildSchema } from './rive-introspect.mjs';
import { downloadEmbeddedObsHtml } from './obs-embed.mjs';

const els = {
  file: $('#rivfile'), fileStatus: $('#fileStatus'),
  detectedCard: $('#detectedCard'), mappingCard: $('#mappingCard'),
  artSel: $('#artboardSel'), smSel: $('#smSel'),
  propsTable: $('#propsTable'), propsBody: $('#propsBody'), propsEmpty: $('#propsEmpty'),
  inSel: $('#inTriggerSel'), outSel: $('#outTriggerSel'),
  startMs: $('#startMs'), outAfterMs: $('#outAfterMs'),
  includeDefaults: $('#includeDefaults'),
  urlOut: $('#urlOut'), copyUrlBtn: $('#copyUrlBtn'),
  downloadObsHtmlEmbedded: $('#downloadObsHtmlEmbedded'),
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
  const sp = new URLSearchParams();

  // core (no riv!)
  if (currentArt) sp.set('artboard', currentArt);
  if (currentSM)  sp.set('sm', currentSM);

  const inTrig  = els.inSel.value;
  const outTrig = els.outSel.value;
  if (inTrig  && inTrig  !== '(none)') sp.set('in',  inTrig);
  if (outTrig && outTrig !== '(none)') sp.set('out', outTrig);

  const start = Math.max(0, parseInt(els.startMs.value || '0', 10) || 0);
  const outA  = Math.max(0, parseInt(els.outAfterMs.value || '0', 10) || 0);
  sp.set('startMs', String(start));
  if (outA > 0) sp.set('outAfterMs', String(outA));

  // VM defaults (optional)
  if (els.includeDefaults.checked){
    (schema?.viewModelProps || []).forEach(p => {
      if (p.type === 'trigger') return;
      if (p.value == null) return;
      sp.set('vm.' + p.name, presetValueForXml(p));
    });
  }

  const qs = sp.toString();
  els.urlOut.value = qs ? '?' + qs : '';
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
  els.downloadObsHtmlEmbedded.disabled = false;

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

// Copy URL (for convenience)
els.copyUrlBtn.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(els.urlOut.value); els.copyUrlBtn.textContent='Copied!'; setTimeout(()=>els.copyUrlBtn.textContent='Copy', 900); } catch {}
});

// Generate single-file OBS HTML (embedded .riv) — client-side only
els.downloadObsHtmlEmbedded.addEventListener('click', async () => {
  if (!schema || !file) return;
  const defaults = {
    artboard: currentArt,
    stateMachine: currentSM,
    startMs: Math.max(0, parseInt(els.startMs.value || '0', 10) || 0),
    outAfterMs: Math.max(-1, parseInt(els.outAfterMs.value || '-1', 10) || -1),
    vmDefaults: els.includeDefaults.checked
      ? Object.fromEntries((schema.viewModelProps || [])
          .filter(p => p.type !== 'trigger' && p.value != null)
          .map(p => [p.name, String(p.value)]))
      : null
  };
  try {
    await downloadEmbeddedObsHtml(schema, file, defaults);
  } catch (e) {
    console.error(e);
    alert(e.message || 'Failed to export embedded HTML');
  }
});
