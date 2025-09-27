import { $, escapeHtml, populateSelect, formatDefaultCell } from './utils.mjs';

export const els = {
  file: $('#rivfile'), fileStatus: $('#fileStatus'),
  detectedCard: $('#detectedCard'), mappingCard: $('#mappingCard'),
  artSel: $('#artboardSel'), smSel: $('#smSel'),
  propsTable: $('#propsTable'), propsBody: $('#propsBody'), propsEmpty: $('#propsEmpty'),
  inSel: $('#inTriggerSel'), outSel: $('#outTriggerSel'), nextSel: $('#nextTriggerSel'),
  downloadBtn: $('#downloadBtn'), downloadPresetBtn: $('#downloadPresetBtn'),
  status: $('#status'), hiddenCanvas: $('#hiddenCanvas'),
  runtimeNotice: $('#runtimeNotice'), runtimeRadios: document.querySelectorAll('input[name="runtime"]')
};

export function renderSelectors(contents, currentArt, currentSM){
  const artNames = (contents?.artboards || []).map(a => a.name);
  populateSelect(els.artSel, artNames, currentArt || artNames[0] || '');
  const art = (contents?.artboards || []).find(a => a.name === els.artSel.value);
  const smNames = (art?.stateMachines || []).map(sm => sm.name);
  populateSelect(els.smSel, smNames, currentSM || smNames[0] || '');
  return { art: els.artSel.value, sm: els.smSel.value };
}

export function renderPropsTable(viewModelProps){
  els.propsBody.innerHTML = '';
  if (!viewModelProps?.length){
    els.propsTable.style.display='none'; els.propsEmpty.style.display='block';
    return;
  }
  els.propsTable.style.display=''; els.propsEmpty.style.display='none';
  const rows = [...viewModelProps].sort((a,b)=>a.name.localeCompare(b.name));
  for (const p of rows){
    const note = p.type==='color'   ? 'Accepts <code>#RRGGBB</code> or <code>0xAARRGGBB</code>'
              : p.type==='trigger' ? 'Fire by mapping to Play/Out/Next or via UPDATE { "<name>": true }'
              : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>${escapeHtml(p.name)}</code></td>
      <td><small class="muted">${p.type}</small></td>
      <td><code>${escapeHtml(p.name)}</code></td>
      <td>${formatDefaultCell(p)}</td>
      <td>${note}</td>`;
    els.propsBody.appendChild(tr);
  }
}

export function updateTriggerSelects(viewModelProps){
  const triggerNames = (viewModelProps||[]).filter(p=>p.type==='trigger').map(p=>p.name);
  populateSelect(els.inSel,   ['(none)', ...triggerNames], '(none)');
  populateSelect(els.outSel,  ['(none)', ...triggerNames], '(none)');
  populateSelect(els.nextSel, ['(none)', ...triggerNames], '(none)');
}

export function updateRuntimeNotice(){
  const chosen = document.querySelector('input[name="runtime"]:checked')?.value;
  els.runtimeNotice.style.display = chosen === 'caspar-basic-webgl' ? '' : 'none';
}
