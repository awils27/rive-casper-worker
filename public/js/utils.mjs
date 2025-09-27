export const $  = (sel, el = document) => el.querySelector(sel);
export const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

export const escapeHtml = (s) => String(s).replace(/[&<>\"']/g, (c) => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

export const pickOrNull = (v) => (v && v !== '(none)') ? v : null;

export function populateSelect(sel, items, selected = '') {
  sel.innerHTML = '';
  if (!items || !items.length) {
    sel.disabled = true;
    const opt = document.createElement('option');
    opt.value = ''; opt.textContent = '(none)';
    sel.appendChild(opt);
    return;
  }
  sel.disabled = false;
  for (const name of items) {
    const opt = document.createElement('option');
    opt.value = name; opt.textContent = name;
    if (name === selected) opt.selected = true;
    sel.appendChild(opt);
  }
}

export function toColorHex(raw){
  if (raw == null) return null;
  if (typeof raw === 'string'){
    const t = raw.trim();
    if (/^#?[0-9a-f]{6}$/i.test(t)) return t.startsWith('#')?t:'#'+t;
    if (/^#?[0-9a-f]{8}$/i.test(t)) return '#'+t.slice(-6);
  }
  const num = Number(raw); if (!Number.isFinite(num)) return null;
  const hex = (num>>>0).toString(16).padStart(8,'0'); return '#'+hex.slice(-6);
}

export function coerceVMValue(type, raw){
  if (raw == null) return null;
  if (type==='string') return String(raw);
  if (type==='number'){ const n=Number(raw); return Number.isFinite(n)?n:null; }
  if (type==='boolean') return !!raw;
  if (type==='color') return toColorHex(raw);
  return raw;
}

export function formatDefaultCell(p){
  if (p?.value == null) return '<span class="muted">n/a</span>';
  if (p.type==='boolean') return p.value ? '<code>true</code>' : '<code>false</code>';
  return '<code>'+escapeHtml(String(p.value))+'</code>';
}

export function downloadBlob(blob, filename){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename; a.click();
  URL.revokeObjectURL(a.href);
}

export function sanitizeFilename(s){
  return String(s || 'caspar-template.html').replace(/[^\w.-]/g, '_');
}

export function presetValueForXml(p){
  if (!p || p.value == null) return '';
  if (p.type === 'boolean') return p.value ? 'true' : 'false';
  return String(p.value);
}

// Keep original case from uploaded filename; strip extension; remove illegal path chars
export function fileBaseFromUploadKeepCase(fileOrName) {
  const name = typeof fileOrName === 'string' ? fileOrName : (fileOrName?.name || 'preset');
  const base = name.replace(/\.[^.]+$/, '');
  return base.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'preset';
}
