/* ============================================================
   instruments.js — carousel, chips, and assembled-telescope canvas
   ============================================================ */

// ── Carousel scroll helpers ────────────────────────────────
function carouselLeft()  { const r = document.getElementById('carousel-rail'); if (r) r.scrollBy({ left:-180, behavior:'smooth' }); }
function carouselRight() { const r = document.getElementById('carousel-rail'); if (r) r.scrollBy({ left: 180, behavior:'smooth' }); }

// ── Render instrument carousel ─────────────────────────────
function renderInstrumentCarousel() {
  const scroll = document.getElementById('carousel-rail');
  if (!scroll) return;

  // Which instruments to show in the carousel:
  //   • target selected → only the target's allowed set (strict)
  //   • no target       → all instruments; each is disabled by canSelectInstrument()
  const visibleIds = G.selectedTarget
    ? allowedForTarget(G.selectedTarget)
    : Object.keys(UH_INSTRUMENTS);

  let html = '';
  visibleIds.forEach(id => {
    const instr = UH_INSTRUMENTS[id];
    if (!instr) return;
    const selected = G.selectedInstruments.includes(id);
    const err      = canSelectInstrument(id);
    const disabled = (!selected && err);

    html += `
      <div class="instr-card ${selected ? 'selected' : ''} ${disabled ? 'disabled-card' : ''}"
           id="ic-${id}"
           data-id="${id}"
           onclick="onInstrumentClick('${id}', event)"
           onmouseenter="showInstrTooltip('${id}', event)"
           onmouseleave="hideTooltip()">
        <div class="instr-card-color" style="background:${instr.color}"></div>
        <div class="instr-card-name">${instr.name}</div>
        <div class="instr-card-role">${instr.shortRole}</div>
        <div class="instr-card-port">${instr.port}</div>
        <div class="instr-card-year">${instr.year}</div>
      </div>`;
  });

  // If a target leaves no instruments visible (shouldn't happen, safety net)
  if (!html) html = '<div style="padding:20px;color:var(--muted);font-size:11px">No instruments compatible with this target.</div>';

  scroll.innerHTML = html;
}

// ── Chips row below the telescope diagram ─────────────────
function _renderChips() {
  const cv = document.getElementById('construction-view');
  if (!cv) return;
  if (G.selectedInstruments.length === 0) {
    cv.innerHTML = '<span class="uh-construction-empty">No instruments selected</span>';
    return;
  }
  cv.innerHTML = G.selectedInstruments.map(id => {
    const instr = UH_INSTRUMENTS[id];
    if (!instr) return '';
    return `
      <div class="cv-chip" onclick="removeInstrument('${id}')" title="Remove ${instr.name}">
        <span class="cv-chip-dot" style="background:${instr.color}"></span>
        ${instr.name}
        <span class="cv-chip-x">×</span>
      </div>`;
  }).join('');
}

// ── Assembled-telescope canvas ─────────────────────────────
// Draws the Subaru telescope schematic with the selected instruments
// attached at their actual ports (primary / nasmyth-l / nasmyth-r / cassegrain).
function renderConstructionView() {
  _renderChips();
  _drawTelescopeCanvas();
}

function _drawTelescopeCanvas() {
  const cvs = document.getElementById('construction-canvas');
  if (!cvs) return;
  // Resize to its container
  const W = cvs.width  = cvs.offsetWidth  || 260;
  const H = cvs.height = cvs.offsetHeight || 170;
  const ctx = cvs.getContext('2d');

  // Dark background
  ctx.fillStyle = '#050c18';
  ctx.fillRect(0, 0, W, H);

  // Design units — telescope lives in a 100×97 design-unit box.
  // k = pixels per design unit. Fit to the smaller dimension so the
  // telescope scales with the panel, with ~10% margin on all sides.
  // Aspect ratio is fixed at 100 / 97 ≈ 1.03 (basically square).
  const body = '#4a90d9';
  const marginFactor = 0.90;
  const k  = Math.min(W / 100, H / 97) * marginFactor;
  const ox = (W - 100 * k) / 2;    // horizontal centering
  const oy = (H - 97  * k) / 2;    // vertical centering (was anchored at bottom before)

  // ---------- telescope body ----------
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(k, k);
  ctx.strokeStyle = body;
  ctx.fillStyle   = body + '22';
  ctx.lineWidth   = 1.1 / k;

  // Base ellipse
  ctx.beginPath(); ctx.ellipse(50, 91, 38, 5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // Fork legs (left & right)
  for (const x of [27, 69]) {
    ctx.fillRect(x-3, 52, 6, 38);
    ctx.strokeRect(x-3, 52, 6, 38);
  }
  // Nasmyth platforms (left & right)
  ctx.fillRect(0,  54, 30, 3); ctx.strokeRect(0,  54, 30, 3);
  ctx.fillRect(70, 54, 30, 3); ctx.strokeRect(70, 54, 30, 3);
  // Tube side rails
  ctx.beginPath();
  ctx.moveTo(35, 23); ctx.lineTo(33, 60);
  ctx.moveTo(65, 23); ctx.lineTo(67, 60);
  ctx.stroke();

  // Truss zigzag between primary mirror and top ring
  const RING = { cx:50, cy:22, rx:15, ry:4   };
  const MIR  = { cx:50, cy:61, rx:15, ry:4.2 };
  const SEG  = 12;
  const ptOn = (E, th) => [E.cx + Math.cos(th)*E.rx, E.cy + Math.sin(th)*E.ry];
  for (let i = 0; i < SEG; i++) {
    const t0 = (i   / SEG) * Math.PI*2;
    const t1 = ((i+1) / SEG) * Math.PI*2;
    const up = i % 2 === 0;
    const [x0, y0] = ptOn(up ? MIR : RING, t0);
    const [x1, y1] = ptOn(up ? RING : MIR, t1);
    const front = Math.sin((t0 + t1) / 2) > 0;
    ctx.strokeStyle = body + (front ? 'bb' : '44');
    ctx.lineWidth   = (front ? 1.0 : 0.7) / k;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  ctx.strokeStyle = body; ctx.lineWidth = 1.1 / k;

  // Top ring + spider + hub stem for Prime Focus
  ctx.beginPath(); ctx.ellipse(50, 22, 15, 4, 0, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(36, 20); ctx.lineTo(64, 24);
  ctx.moveTo(36, 24); ctx.lineTo(64, 20);
  ctx.moveTo(50, 18); ctx.lineTo(50, 22);
  ctx.stroke();

  // Primary mirror
  ctx.beginPath(); ctx.ellipse(50, 62, 19, 6, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(50, 61, 15, 4.2, 0, 0, Math.PI*2);
  ctx.fillStyle = body + '33'; ctx.fill(); ctx.stroke();

  // Secondary-mirror marker on the hub:
  //   prime → no secondary (prime camera lives in its place)
  //   large → orange-ish, slightly larger
  //   small → cyan, slightly smaller
  if (G.secondaryMirror !== 'prime') {
    const smallMirror = G.secondaryMirror === 'small';
    ctx.fillStyle = smallMirror ? '#60c0f0' : '#f0c060';
    const smR = smallMirror ? 1.5 : 2.6;
    ctx.beginPath(); ctx.ellipse(50, 24, smR, smR*0.55, 0, 0, Math.PI*2); ctx.fill();
  }

  ctx.restore();

  // ---------- instrument boxes at their ports ----------
  // In design units (same 100x100 space the telescope is drawn in)
  const PORTS = {
    primary:     { x:36, y:17,  w:28, h:11, dir:-1 },
    'nasmyth-l': { x:1,  y:54,  w:28, h:10, dir:-1 },
    'nasmyth-r': { x:71, y:54,  w:28, h:10, dir:-1 },
    cassegrain:  { x:38, y:68,  w:24, h:10, dir: 1 },
  };

  ctx.textAlign = 'center';
  Object.entries(PORTS).forEach(([portKey, p]) => {
    const list = G.selectedInstruments.filter(id => UH_INSTRUMENTS[id]?.port === portKey);
    const n = Math.max(1, list.length);
    const h = Math.min(p.h, 32 / n);

    // Empty port: dashed placeholder
    if (list.length === 0) {
      const y = p.dir < 0 ? p.y - h : p.y;
      const sx = ox + p.x*k, sy = oy + y*k, sw = p.w*k, sh = h*k;
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#2a4a6c';
      ctx.lineWidth   = 1;
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.setLineDash([]);
      ctx.fillStyle = '#3a6a88';
      ctx.font = Math.max(7, Math.min(9, sh * 0.5)) + 'px Times New Roman';
      ctx.fillText(portKey, sx + sw/2, sy + sh/2 + 3, sw - 2);
      return;
    }

    // Draw each installed instrument stacked at the port
    list.forEach((id, i) => {
      const y   = p.dir < 0 ? p.y - (i+1)*h - i*1.5 : p.y + i*(h + 1.5);
      const sx  = ox + p.x*k, sy = oy + y*k, sw = p.w*k, sh = h*k;
      const col = UH_INSTRUMENTS[id].color;

      ctx.fillStyle   = col + '55';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = col;
      ctx.lineWidth   = 1.4;
      ctx.strokeRect(sx, sy, sw, sh);

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(7, Math.min(10, sh * 0.55))}px Times New Roman`;
      const order = G.selectedInstruments.indexOf(id) + 1;
      ctx.fillText(`${order}. ${UH_INSTRUMENTS[id].name}`, sx + sw/2, sy + sh*0.62, sw - 2);
    });
  });
  ctx.textAlign = 'left';
}

// ── Event handlers ─────────────────────────────────────────
function onInstrumentClick(id, e) {
  e.stopPropagation();
  if (G.observationRunning) return;

  const err = toggleInstrument(id);
  if (err) {
    _flashError(err);
    return;
  }
  renderInstrumentCarousel();
  renderConstructionView();
  setButtonStates();
  renderStarView();   // refresh the star-field instruction bar
}

function removeInstrument(id) {
  if (G.observationRunning) return;
  const idx = G.selectedInstruments.indexOf(id);
  if (idx >= 0) G.selectedInstruments.splice(idx, 1);
  renderInstrumentCarousel();
  renderConstructionView();
  setButtonStates();
  renderStarView();   // refresh the star-field instruction bar
}

// Transient error toast in the instr description box
function _flashError(msg) {
  const box = document.getElementById('instr-desc');
  if (!box) return;
  const prev = box.innerHTML;
  box.innerHTML = `<span style="color:var(--danger);font-weight:600">⚠ ${msg}</span>`;
  clearTimeout(_flashError._t);
  _flashError._t = setTimeout(() => { box.innerHTML = prev; }, 2800);
}

// ── Tooltip ────────────────────────────────────────────────
function showInstrTooltip(id, e) {
  const instr = UH_INSTRUMENTS[id];
  if (!instr) return;
  const tt = document.getElementById('uh-tooltip');
  if (!tt) return;

  const err = G.selectedInstruments.includes(id) ? null : canSelectInstrument(id);

  tt.innerHTML = `
    <div class="tt-name">${instr.name}</div>
    <div class="tt-role">${instr.shortRole}</div>
    <div class="tt-desc">${instr.description}</div>
    <div class="tt-port">Port: ${instr.port}</div>
    <div class="tt-year">Since ${instr.year}</div>
    ${err ? `<div class="tt-err">⚠ ${err}</div>` : ''}`;

  tt.style.display = 'block';
  _positionTooltip(tt, e);
}

function hideTooltip() {
  const tt = document.getElementById('uh-tooltip');
  if (tt) tt.style.display = 'none';
}

function _positionTooltip(tt, e) {
  let x = e.clientX + 12, y = e.clientY + 12;
  if (x + 250 > window.innerWidth)  x = e.clientX - 254;
  if (y + 160 > window.innerHeight) y = e.clientY - 164;
  tt.style.left = x + 'px';
  tt.style.top  = y + 'px';
}
document.addEventListener('mousemove', e => {
  const tt = document.getElementById('uh-tooltip');
  if (tt && tt.style.display !== 'none') _positionTooltip(tt, e);
});

// Re-draw the assembled telescope whenever its container changes size
// (resizing the window, dragging a divider, switching tabs, etc.)
document.addEventListener('DOMContentLoaded', () => {
  const cvs = document.getElementById('construction-canvas');
  if (!cvs || typeof ResizeObserver === 'undefined') return;
  const ro = new ResizeObserver(() => {
    // avoid throttling with requestAnimationFrame
    requestAnimationFrame(_drawTelescopeCanvas);
  });
  ro.observe(cvs.parentElement);
  // Initial draw once laid out
  requestAnimationFrame(_drawTelescopeCanvas);
});