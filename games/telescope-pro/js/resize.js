/* ============================================================
   resize.js — draggable panel dividers (like AO Hunter)
   • divider-left   — vertical, between target panel & right side
   • divider-bottom — horizontal, between sky view & lower row
   • divider-mid    — vertical, between carousel & construction
   Each divider stores its size in --left-w / --lower-h / --carousel-fr.
   ============================================================ */

const UH_RESIZE_KEY = 'uh_resize';

// Load saved sizes on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  _loadSizes();
  _wire('divider-left',   'col-resize',   _dragLeftDivider);
  _wire('divider-bottom', 'row-resize',   _dragBottomDivider);
  _wire('divider-mid',    'col-resize',   _dragMidDivider);
});

function _wire(id, cursor, handler) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.cursor = cursor;
  el.addEventListener('mousedown', e => {
    e.preventDefault();
    document.body.style.cursor = cursor;
    document.body.style.userSelect = 'none';
    const onMove = (ev) => handler(ev);
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      _saveSizes();
      // Let layouts repaint
      try {
        if (typeof renderStarView === 'function') renderStarView();
        if (typeof renderConstructionView === 'function') renderConstructionView();
      } catch(e) {}
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  });
  // Touch support
  el.addEventListener('touchstart', e => {
    if (!e.touches[0]) return;
    const onMove = (ev) => { if (ev.touches[0]) handler(ev.touches[0]); };
    const onEnd  = () => {
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend',  onEnd);
      _saveSizes();
    };
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend',  onEnd);
  }, { passive: true });
}

// ── Left divider (target-panel width) ─────────────────────
function _dragLeftDivider(e) {
  const body = document.querySelector('.uh-body');
  if (!body) return;
  const rect = body.getBoundingClientRect();
  const w = Math.max(140, Math.min(rect.width - 320, e.clientX - rect.left));
  document.documentElement.style.setProperty('--left-w', w + 'px');
}

// ── Bottom divider (lower-row height) ─────────────────────
function _dragBottomDivider(e) {
  const right = document.querySelector('.uh-right-side');
  if (!right) return;
  const rect = right.getBoundingClientRect();
  // lower-h measured from bottom of right side
  const h = Math.max(140, Math.min(rect.height - 120, rect.bottom - e.clientY));
  document.documentElement.style.setProperty('--lower-h', h + 'px');
}

// ── Mid divider (carousel vs construction) ────────────────
function _dragMidDivider(e) {
  const tab = document.getElementById('tab-instruments');
  if (!tab) return;
  const rect = tab.getBoundingClientRect();
  // Store carousel share (0.3 .. 0.8)
  const share = Math.max(0.3, Math.min(0.8, (e.clientX - rect.left) / rect.width));
  // flex ratios: carousel : construction  =  share : (1 - share)
  document.documentElement.style.setProperty('--carousel-fr', share.toFixed(3));
  document.documentElement.style.setProperty('--construction-fr', (1 - share).toFixed(3));
}

// ── Persist ──────────────────────────────────────────────
function _saveSizes() {
  const d = {
    left_w:         getComputedStyle(document.documentElement).getPropertyValue('--left-w').trim(),
    lower_h:        getComputedStyle(document.documentElement).getPropertyValue('--lower-h').trim(),
    carousel_fr:    getComputedStyle(document.documentElement).getPropertyValue('--carousel-fr').trim(),
    construction_fr:getComputedStyle(document.documentElement).getPropertyValue('--construction-fr').trim(),
  };
  try { localStorage.setItem(UH_RESIZE_KEY, JSON.stringify(d)); } catch(e) {}
}
function _loadSizes() {
  let d = {};
  try { d = JSON.parse(localStorage.getItem(UH_RESIZE_KEY) || '{}'); } catch(e) {}
  const r = document.documentElement.style;
  if (d.left_w)          r.setProperty('--left-w',          d.left_w);
  if (d.lower_h)         r.setProperty('--lower-h',         d.lower_h);
  if (d.carousel_fr)     r.setProperty('--carousel-fr',     d.carousel_fr);
  if (d.construction_fr) r.setProperty('--construction-fr', d.construction_fr);
}