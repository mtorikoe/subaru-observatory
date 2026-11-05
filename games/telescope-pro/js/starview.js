/* ============================================================
   starview.js — bundled real-star field + target markers
   • No target        → pan/zoom through the bright-star catalog
   • Target selected  → auto-center & lock on target RA/Dec
   • After observing  → target photo revealed over the field
   ============================================================ */

const svCvs = document.getElementById('sv-canvas');

let _svClarity  = 0;
let _svObserved = false;

// ── Sky camera ──────────────────────────────────────────
// Default is a narrow 30° FOV (zoom=3) — gnomonic distortion is mild there.
// The user can still zoom out to 60° FOV; beyond that stretching gets visible,
// so we cap it.
const _cam = {
  ra:    180,
  dec:   0,
  zoom:  3.0,
  minZoom: 1.5,    // 60° FOV max
  maxZoom: 120,
};

// ── Star catalog ────────────────────────────────────────
const _sky = { stars: null, loaded: false, failed: false };

(function loadCatalog() {
  const bundled = (typeof window !== 'undefined') ? window.UH_BRIGHT_STARS : null;
  if (bundled && Array.isArray(bundled.stars)) {
    _sky.stars  = bundled.stars;
    _sky.loaded = true;
  } else {
    _sky.failed = true;
    console.warn('[UH] window.UH_BRIGHT_STARS not found — include <script src="assets/catalog/bright-stars.js"></script> before starview.js');
  }
})();

// ── Projection: gnomonic / tangent plane ────────────────
// At zoom ≥ 1.5 (FOV ≤ 60°), distortion is under ~15% — looks natural.
function _project(raDeg, decDeg, W, H) {
  const d2r = Math.PI / 180;
  const ra0  = _cam.ra  * d2r;
  const dec0 = _cam.dec * d2r;
  const ra   = raDeg    * d2r;
  const dec  = decDeg   * d2r;
  const dRa  = ra - ra0;
  const cosc = Math.sin(dec0)*Math.sin(dec) + Math.cos(dec0)*Math.cos(dec)*Math.cos(dRa);
  if (cosc <= 0.001) return null;
  const xr = Math.cos(dec)*Math.sin(dRa) / cosc;
  const yr = (Math.cos(dec0)*Math.sin(dec) - Math.sin(dec0)*Math.cos(dec)*Math.cos(dRa)) / cosc;
  const fovRad = (90 / _cam.zoom) * d2r;
  const scale  = Math.min(W, H) / 2 / Math.tan(fovRad / 2);
  return [W/2 + xr * scale, H/2 - yr * scale];
}

// ── Public API ──────────────────────────────────────────
function resetStarView() {
  _svClarity  = 0;
  _svObserved = false;
}

function revealStarView(clarity) {
  _svClarity  = clarity;
  _svObserved = true;
  if (G.selectedTarget) _loadTargetImage(G.selectedTarget);
  renderStarView();
}

function centerOnTarget(targetId) {
  const coords = (typeof TARGET_COORDS !== 'undefined') ? TARGET_COORDS[targetId] : null;
  if (!coords) { renderStarView(); return; }
  _animateCamTo(coords[0], coords[1], 25);
}

function _animateCamTo(ra, dec, zoom) {
  const start = { ra:_cam.ra, dec:_cam.dec, zoom:_cam.zoom };
  let dRa = ((ra - start.ra + 540) % 360) - 180;
  const dDec  = dec - start.dec;
  const dZoom = zoom - start.zoom;
  const dur = 600;
  const t0 = performance.now();
  function step(now) {
    const t = Math.min(1, (now - t0) / dur);
    const ease = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
    _cam.ra   = (start.ra + dRa  * ease + 360) % 360;
    _cam.dec  = Math.max(-89.5, Math.min(89.5, start.dec + dDec * ease));
    _cam.zoom = start.zoom + dZoom * ease;
    renderStarView();
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── Main render ─────────────────────────────────────────
function renderStarView() {
  if (!svCvs) return;
  const parent = svCvs.parentElement;
  const W = (parent && parent.offsetWidth  > 10) ? parent.offsetWidth  : (svCvs.width  || 400);
  const H = (parent && parent.offsetHeight > 10) ? parent.offsetHeight : (svCvs.height || 320);
  if (svCvs.width !== W || svCvs.height !== H) { svCvs.width = W; svCvs.height = H; }
  const ctx = svCvs.getContext('2d');

  ctx.fillStyle = '#020508';
  ctx.fillRect(0, 0, W, H);

  _drawSky(ctx, W, H);
  _drawTargetMarkers(ctx, W, H);

  if (!G.selectedTarget) {
    _drawNavOverlay(ctx, W, H);
    return;
  }

  _drawTargetLabel(ctx, W, H);
  if (_svObserved) _drawTargetPhoto(ctx, W, H);
}

// ── Draw bright-star field ──────────────────────────────
function _drawSky(ctx, W, H) {
  if (!_sky.loaded) {
    // Explicit diagnostic so a black screen is never a mystery
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px Times New Roman';
    ctx.fillStyle = _sky.failed ? '#ff6666' : 'rgba(126,207,237,0.9)';
    const msg = _sky.failed
      ? 'Star catalog not loaded'
      : 'Loading sky catalog…';
    ctx.fillText(msg, W/2, H/2 - 14);
    ctx.font = '11px Times New Roman';
    ctx.fillStyle = 'rgba(220,220,220,0.75)';
    if (_sky.failed) {
      ctx.fillText('Expected file: assets/catalog/bright-stars.js', W/2, H/2 + 6);
      ctx.fillText('Expected script tag BEFORE js/starview.js in index.html.', W/2, H/2 + 22);
      ctx.fillText('Open DevTools → Console to see the exact error.', W/2, H/2 + 38);
    }
    ctx.textAlign = 'left';
    return;
  }

  const stars = _sky.stars;
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    const p = _project(s[0], s[1], W, H);
    if (!p) continue;
    if (p[0] < -4 || p[0] > W+4 || p[1] < -4 || p[1] > H+4) continue;
    const mag = s[2];
    // Crisp stars — no blurry outline. Radius grows modestly with brightness.
    const r = Math.max(0.4, Math.min(2.6, (5.5 - mag) * 0.4));
    const a = Math.max(0.2,  Math.min(1,   (6.2 - mag) / 6.0));
    ctx.beginPath();
    ctx.arc(p[0], p[1], r, 0, Math.PI*2);
    ctx.fillStyle = `rgba(245,245,230,${a})`;
    ctx.fill();
  }
}

// ── Target markers ──────────────────────────────────────
let _pulseFrameId = null;
function _drawTargetMarkers(ctx, W, H) {
  if (typeof TARGET_COORDS === 'undefined') return;
  const showAll = !G.selectedTarget;

  TARGETS.forEach(t => {
    const coords = TARGET_COORDS[t.id];
    if (!coords) return;
    const p = _project(coords[0], coords[1], W, H);
    if (!p) return;
    if (p[0] < 0 || p[0] > W || p[1] < 0 || p[1] > H) return;

    const isSelected = G.selectedTarget && G.selectedTarget.id === t.id;
    if (!showAll && !isSelected) return;

    const revealed = G.revealedTargets.includes(t.id);
    const col = isSelected ? '#f0c060' : revealed ? '#60c080' : '#7ecfed';

    const pulse = 0.85 + 0.15*Math.sin(Date.now() / 420);
    const r = (isSelected ? 14 : 8) * pulse;

    ctx.beginPath();
    ctx.arc(p[0], p[1], r, 0, Math.PI*2);
    ctx.strokeStyle = col;
    ctx.lineWidth   = isSelected ? 2 : 1.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(p[0], p[1], 1.5, 0, Math.PI*2);
    ctx.fillStyle = col;
    ctx.fill();

    if (isSelected || _cam.zoom > 8 || _hoverTargetId === t.id) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      const label = t.name;
      ctx.font = 'bold 0.75em Times New Roman';
      const tw = ctx.measureText(label).width + 10;
      ctx.fillRect(p[0] + 10, p[1] - 8, tw, 14);
      ctx.fillStyle = col;
      ctx.fillText(label, p[0] + 15, p[1] + 3);
    }
  });

  if (showAll || (G.selectedTarget && !_svObserved)) {
    cancelAnimationFrame(_pulseFrameId);
    _pulseFrameId = requestAnimationFrame(() => renderStarView());
  }
}

// ── Navigation overlay ─────────────────────────────────
function _drawNavOverlay(ctx, W, H) {
  ctx.strokeStyle = 'rgba(126,207,237,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W/2 - 6, H/2); ctx.lineTo(W/2 + 6, H/2);
  ctx.moveTo(W/2, H/2 - 6); ctx.lineTo(W/2, H/2 + 6);
  ctx.stroke();

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, 230, 22);
  ctx.fillStyle = 'rgba(126,207,237,0.9)';
  ctx.font = '0.8em Times New Roman';
  const raH  = (_cam.ra / 15).toFixed(2);
  const decS = (_cam.dec >= 0 ? '+' : '') + _cam.dec.toFixed(2);
  ctx.fillText(`RA ${raH}h  Dec ${decS}°   FOV ${(90/_cam.zoom).toFixed(1)}°`, 6, 14);

  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, H-22, W, 22);
  ctx.fillStyle = 'rgba(220,220,220,0.75)';
  ctx.font = '0.75em Times New Roman';
  ctx.textAlign = 'center';
  ctx.fillText('Drag to pan · Scroll to zoom · Click a target to center · Or pick one from the left', W/2, H-7);
  ctx.textAlign = 'left';
}

// ── Target label ───────────────────────────────────────
function _drawTargetLabel(ctx, W, H) {
  const t = G.selectedTarget;
  const coords = (typeof TARGET_COORDS !== 'undefined') ? TARGET_COORDS[t.id] : null;

  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, 26);
  ctx.fillStyle = '#f0c060'; ctx.font = 'bold 0.92em Times New Roman';
  ctx.fillText(t.name, 10, 17);

  if (coords) {
    ctx.fillStyle = 'rgba(200,200,200,0.75)';
    ctx.font = '0.75em Times New Roman';
    const raH  = (coords[0] / 15);
    const raHh = Math.floor(raH);
    const raMm = Math.floor((raH - raHh) * 60);
    const decSign = coords[1] >= 0 ? '+' : '-';
    const decAbs  = Math.abs(coords[1]);
    const decD    = Math.floor(decAbs);
    const decM    = Math.floor((decAbs - decD) * 60);
    const coordStr = `${raHh}h${raMm.toString().padStart(2,'0')}m  ${decSign}${decD}°${decM.toString().padStart(2,'0')}'`;
    ctx.textAlign = 'right';
    ctx.fillText(coordStr, W - 10, 17);
    ctx.textAlign = 'left';
  } else {
    ctx.fillStyle = 'rgba(200,200,200,0.75)';
    ctx.font = '0.75em Times New Roman';
    ctx.textAlign = 'right';
    ctx.fillText('(solar-system — moves across sky)', W - 10, 17);
    ctx.textAlign = 'left';
  }

  if (!_svObserved && !G.observationRunning) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, H/2 - 22, W, 44);
    ctx.fillStyle = 'rgba(240,192,96,0.95)';
    ctx.font = 'bold 0.92em Times New Roman';
    ctx.textAlign = 'center';
    ctx.fillText('Choose instruments, then click Observe', W/2, H/2 + 5);
    ctx.textAlign = 'left';
  }

  if (_svObserved) {
    const c = _svClarity;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(10, H-26, 130, 16);
    ctx.fillStyle = `hsl(${c*120},80%,55%)`; ctx.fillRect(10, H-26, 130*c, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '0.7em Times New Roman';
    ctx.fillText(`Clarity: ${Math.round(c*100)}%`, 14, H-15);
  }
}

// ── Target photo ───────────────────────────────────────
const _targetImages = {};
function _loadTargetImage(target) {
  if (!target || !target.img || _targetImages[target.id]) return;
  const img = new Image();
  _targetImages[target.id] = img;
  img.onload  = () => renderStarView();
  img.onerror = () => { _targetImages[target.id] = null; };
  img.src = target.img;
}
function _drawTargetPhoto(ctx, W, H) {
  const t   = G.selectedTarget;
  const img = _targetImages[t.id];
  if (!img || !img.complete || !img.naturalWidth) { _loadTargetImage(t); return; }
  const clarity = _svClarity;
  const blurPx  = Math.max(0, (1 - clarity) * 24);
  const dim = Math.min(W, H) * 0.65;
  const scale = Math.max(dim / img.naturalWidth, dim / img.naturalHeight);
  const dw = img.naturalWidth  * scale;
  const dh = img.naturalHeight * scale;
  const dx = (W - dw) / 2;
  const dy = (H - dh) / 2;
  ctx.save();
  if (blurPx > 0.5) ctx.filter = `blur(${blurPx.toFixed(1)}px) brightness(${0.5 + clarity*0.5})`;
  else              ctx.filter = `brightness(${0.5 + clarity*0.5})`;
  ctx.globalAlpha = Math.min(1, 0.35 + clarity * 0.65);
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// ── Input: pan / zoom / click target ───────────────────
let _hoverTargetId = null;
let _dragState = null;

svCvs?.addEventListener('mousedown', e => {
  if (G.selectedTarget) return;
  const r = svCvs.getBoundingClientRect();
  _dragState = { x: e.clientX - r.left, y: e.clientY - r.top, ra: _cam.ra, dec: _cam.dec };
});
svCvs?.addEventListener('mousemove', e => {
  const r = svCvs.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  if (_dragState) {
    const W = svCvs.width, H = svCvs.height;
    const degPerPx = (90 / _cam.zoom) / Math.min(W, H);
    const dx = x - _dragState.x;
    const dy = y - _dragState.y;
    _cam.ra  = ((_dragState.ra  - dx * degPerPx / Math.cos(_cam.dec * Math.PI/180)) + 360) % 360;
    _cam.dec = Math.max(-89.5, Math.min(89.5, _dragState.dec + dy * degPerPx));
    renderStarView();
  } else {
    const wasHover = _hoverTargetId;
    _hoverTargetId = _findTargetAt(x, y);
    svCvs.style.cursor = _hoverTargetId ? 'pointer' : (G.selectedTarget ? 'default' : 'grab');
    if (wasHover !== _hoverTargetId) renderStarView();
  }
});
window.addEventListener('mouseup', () => { _dragState = null; });

svCvs?.addEventListener('wheel', e => {
  if (G.selectedTarget) return;
  e.preventDefault();
  const factor = e.deltaY > 0 ? 0.85 : 1.18;
  _cam.zoom = Math.max(_cam.minZoom, Math.min(_cam.maxZoom, _cam.zoom * factor));
  renderStarView();
}, { passive: false });

svCvs?.addEventListener('click', e => {
  const r = svCvs.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  const hit = _findTargetAt(x, y);
  if (hit && typeof selectTarget === 'function') selectTarget(hit);
});

function _findTargetAt(x, y) {
  if (typeof TARGET_COORDS === 'undefined') return null;
  const W = svCvs.width, H = svCvs.height;
  let bestId = null, bestD = 18;
  TARGETS.forEach(t => {
    const coords = TARGET_COORDS[t.id];
    if (!coords) return;
    const p = _project(coords[0], coords[1], W, H);
    if (!p) return;
    const d = Math.hypot(p[0] - x, p[1] - y);
    if (d < bestD) { bestD = d; bestId = t.id; }
  });
  return bestId;
}

// Touch support
svCvs?.addEventListener('touchstart', e => {
  if (G.selectedTarget) return;
  if (e.touches.length !== 1) return;
  const t = e.touches[0];
  const r = svCvs.getBoundingClientRect();
  _dragState = { x: t.clientX - r.left, y: t.clientY - r.top, ra: _cam.ra, dec: _cam.dec };
}, { passive: true });
svCvs?.addEventListener('touchmove', e => {
  if (!_dragState || e.touches.length !== 1) return;
  const t = e.touches[0];
  const r = svCvs.getBoundingClientRect();
  const x = t.clientX - r.left, y = t.clientY - r.top;
  const W = svCvs.width, H = svCvs.height;
  const degPerPx = (90 / _cam.zoom) / Math.min(W, H);
  const dx = x - _dragState.x;
  const dy = y - _dragState.y;
  _cam.ra  = ((_dragState.ra  - dx * degPerPx / Math.cos(_cam.dec * Math.PI/180)) + 360) % 360;
  _cam.dec = Math.max(-89.5, Math.min(89.5, _dragState.dec + dy * degPerPx));
  renderStarView();
  e.preventDefault();
}, { passive: false });
svCvs?.addEventListener('touchend', () => { _dragState = null; });

// Resize observer — re-render when the star canvas container changes
if (typeof ResizeObserver !== 'undefined' && svCvs?.parentElement) {
  const ro = new ResizeObserver(() => renderStarView());
  ro.observe(svCvs.parentElement);
}