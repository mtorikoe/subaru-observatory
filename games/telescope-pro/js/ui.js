/* ============================================================
   ui.js — Text-size control + miscellaneous UI chrome
   ============================================================ */

const UH_UI_KEY = 'uh_ui_prefs';

// ── Text size ────────────────────────────────────────────
// Writes a class on <body> that uh.css reads to scale base font.
function setFontSize(size) {               // 'sm' | 'md' | 'lg'
  if (!['sm','md','lg'].includes(size)) size = 'md';
  document.body.classList.remove('font-sm','font-md','font-lg');
  document.body.classList.add('font-' + size);
  document.querySelectorAll('.uh-fontsize-ctrl button').forEach(b => {
    b.classList.toggle('active', b.dataset.size === size);
  });
  _saveUIPrefs({ fontSize: size });
  // Repaint anything that measures text
  try {
    if (typeof renderStarView === 'function') renderStarView();
    if (typeof renderConstructionView === 'function') renderConstructionView();
  } catch(e) {}
}

// ── Persist prefs across sessions ────────────────────────
function _saveUIPrefs(patch) {
  let cur = {};
  try { cur = JSON.parse(localStorage.getItem(UH_UI_KEY) || '{}'); } catch(e) {}
  Object.assign(cur, patch);
  try { localStorage.setItem(UH_UI_KEY, JSON.stringify(cur)); } catch(e) {}
}
function _loadUIPrefs() {
  try { return JSON.parse(localStorage.getItem(UH_UI_KEY) || '{}'); } catch(e) { return {}; }
}

// Apply saved prefs on load
document.addEventListener('DOMContentLoaded', () => {
  const prefs = _loadUIPrefs();
  if (prefs.fontSize) setFontSize(prefs.fontSize);
});