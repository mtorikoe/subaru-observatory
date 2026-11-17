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

// ── Target menu (phones) ─────────────────────────────────
// On a narrow screen the target list is a slide-in menu opened by the ☰
// button in the header (see "PHONES" in uh.css). On wide screens the list is
// always visible and these functions change nothing you can see.
const UH_PHONE = window.matchMedia('(max-width: 760px)');

function setTargetMenu(open) {
  document.body.classList.toggle('targets-open', !!open);
  const btn = document.getElementById('targets-menu-btn');
  if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
function toggleTargetMenu() { setTargetMenu(!document.body.classList.contains('targets-open')); }
function closeTargetMenu()  { setTargetMenu(false); }

document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('target-panel');
  // Choosing a target closes the menu so the sky is visible again.
  // (Opening a category or changing the mirror keeps it open.)
  if (panel) panel.addEventListener('click', e => {
    if (e.target.closest('.tp-target')) closeTargetMenu();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTargetMenu(); });
  // A phone player starts with the menu open: picking a target is the first step
  if (UH_PHONE.matches) setTargetMenu(true);
  // Leaving phone width (e.g. rotating a tablet) must not leave the page dimmed
  UH_PHONE.addEventListener('change', e => { if (!e.matches) closeTargetMenu(); });
});

// ── Assembled-telescope section: fold away / bring back ──
// Folded, it is a narrow strip with only the toggle button, and the instrument
// cards get the freed width. The choice is remembered; on a phone it starts
// folded, because the tray is too narrow to show both comfortably.
function setTelescopePanel(collapsed, remember) {
  const tab = document.getElementById('tab-instruments');
  const btn = document.getElementById('construction-toggle');
  if (!tab) return;
  tab.classList.toggle('telescope-collapsed', !!collapsed);
  if (btn) {
    btn.textContent = collapsed ? '‹' : '›';
    btn.title = collapsed ? 'Show the assembled telescope' : 'Hide the assembled telescope';
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }
  if (remember) _saveUIPrefs({ telescopeCollapsed: !!collapsed });
  // The drawing is sized from its box, so redraw once the layout has settled
  requestAnimationFrame(() => { try { if (!collapsed && typeof renderConstructionView === 'function') renderConstructionView(); } catch (e) {} });
}
function toggleTelescopePanel() {
  const tab = document.getElementById('tab-instruments');
  setTelescopePanel(!(tab && tab.classList.contains('telescope-collapsed')), true);
}
document.addEventListener('DOMContentLoaded', () => {
  const saved = _loadUIPrefs().telescopeCollapsed;
  setTelescopePanel(typeof saved === 'boolean' ? saved : UH_PHONE.matches, false);
});

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