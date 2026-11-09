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
  // East is to the LEFT (as seen looking up at the sky), so RA increases leftward
  return [W/2 - xr * scale, H/2 - yr * scale];
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
  _drawHoveredConstellation(ctx, W, H);
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

// ── Constellations (shown on hover) ─────────────────────
// Data: window.UH_CONSTELLATIONS from assets/catalog/constellations.js
const _const = { list: [], hover: null, mouse: null, key: '' };

(function loadConstellations() {
  const data = (typeof window !== 'undefined') ? window.UH_CONSTELLATIONS : null;
  if (!Array.isArray(data)) {
    console.warn('[UH] window.UH_CONSTELLATIONS not found — include assets/catalog/constellations.js before starview.js');
    return;
  }
  // Subdivide boundary edges (≤2° steps, linear in RA/Dec) so edges that run
  // along a line of constant Dec are followed correctly by the hit test and drawing.
  _const.list = data.map(c => {
    const pts = [];
    const b = c.bounds;
    for (let i = 0; i < b.length - 1; i++) {
      const [ra1, de1] = b[i], [ra2, de2] = b[i + 1];
      const dRa = ((ra2 - ra1 + 540) % 360) - 180;
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(dRa), Math.abs(de2 - de1)) / 2));
      for (let k = 0; k < n; k++) {
        pts.push([(ra1 + dRa * k / n + 360) % 360, de1 + (de2 - de1) * k / n]);
      }
    }
    // Unit vector toward the boundary's mean direction — used to reject the
    // antipodal false match that a spherical winding test can't tell apart.
    let vx = 0, vy = 0, vz = 0;
    pts.forEach(([ra, de]) => { const v = _vec(ra, de); vx += v[0]; vy += v[1]; vz += v[2]; });
    const len = Math.hypot(vx, vy, vz) || 1;
    return { ...c, poly: pts, axis: [vx/len, vy/len, vz/len] };
  });
})();

function _vec(ra, dec) {
  const d2r = Math.PI / 180;
  const cd = Math.cos(dec*d2r);
  return [cd*Math.cos(ra*d2r), cd*Math.sin(ra*d2r), Math.sin(dec*d2r)];
}

// Canvas point → [ra, dec] in degrees (inverse gnomonic)
function _unproject(x, y, W, H) {
  const d2r = Math.PI / 180;
  const fovRad = (90 / _cam.zoom) * d2r;
  const scale  = Math.min(W, H) / 2 / Math.tan(fovRad / 2);
  const xr = -(x - W/2) / scale;
  const yr = -(y - H/2) / scale;
  const dec0 = _cam.dec * d2r;
  const rho = Math.hypot(xr, yr);
  if (rho < 1e-9) return [_cam.ra, _cam.dec];
  const c = Math.atan(rho);
  const dec = Math.asin(Math.cos(c)*Math.sin(dec0) + yr*Math.sin(c)*Math.cos(dec0)/rho);
  const ra  = _cam.ra*d2r + Math.atan2(xr*Math.sin(c), rho*Math.cos(dec0)*Math.cos(c) - yr*Math.sin(dec0)*Math.sin(c));
  return [((ra / d2r) % 360 + 360) % 360, dec / d2r];
}

// Spherical point-in-polygon: sum the bearing changes from the point to each
// vertex. ±2π → inside. Works across RA 0h and around the poles. (It also
// fires for the antipodal point — _findConstellationAt filters that out.)
function _insidePoly(ra, dec, poly) {
  const d2r = Math.PI / 180;
  const sd = Math.sin(dec*d2r), cd = Math.cos(dec*d2r);
  let total = 0, prev = null;
  for (let i = 0; i <= poly.length; i++) {
    const v = poly[i % poly.length];
    const dRa = (v[0] - ra) * d2r;
    const sv = Math.sin(v[1]*d2r), cv = Math.cos(v[1]*d2r);
    const brg = Math.atan2(Math.sin(dRa)*cv, cd*sv - sd*cv*Math.cos(dRa));
    if (prev !== null) {
      let d = brg - prev;
      if (d >  Math.PI) d -= 2*Math.PI;
      if (d < -Math.PI) d += 2*Math.PI;
      total += d;
    }
    prev = brg;
  }
  return Math.abs(total) > Math.PI;
}

function _findConstellationAt(x, y, W, H) {
  const [ra, dec] = _unproject(x, y, W, H);
  const v = _vec(ra, dec);
  return _const.list.find(c =>
    v[0]*c.axis[0] + v[1]*c.axis[1] + v[2]*c.axis[2] > 0 && _insidePoly(ra, dec, c.poly)
  ) || null;
}

function _drawHoveredConstellation(ctx, W, H) {
  _updateHoveredConstellation(W, H);
  const c = _const.hover;
  if (!c) return;

  ctx.save();

  // Faint dashed IAU boundary
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  _strokePath(ctx, c.poly.concat([c.poly[0]]), W, H);
  ctx.setLineDash([]);

  // Stick figure
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1;
  c.lines.forEach(seg => _strokePath(ctx, seg, W, H));

  // Name — at the constellation's centre if visible, otherwise next to the cursor
  let lp = _project(c.center[0], c.center[1], W, H);
  if (!lp || lp[0] < 40 || lp[0] > W - 40 || lp[1] < 30 || lp[1] > H - 30) {
    lp = [_const.mouse.x + 14, _const.mouse.y - 14];
  }
  const label = (c.en && c.en !== c.name) ? `${c.name} (${c.en})` : c.name;
  ctx.font = 'italic 0.85em Times New Roman';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  const tw = ctx.measureText(label).width + 12;
  ctx.fillRect(lp[0] - tw/2, lp[1] - 12, tw, 17);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(label, lp[0], lp[1]);
  ctx.restore();
}

function _strokePath(ctx, pts, W, H) {
  ctx.beginPath();
  let pen = false;
  pts.forEach(pt => {
    const p = _project(pt[0], pt[1], W, H);
    if (!p) { pen = false; return; }
    if (pen) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]);
    pen = true;
  });
  ctx.stroke();
}

// ── Target markers ──────────────────────────────────────
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
    // Once a target is locked, other targets stay visible (dimmed) so the
    // player can still switch by clicking them — hidden during observation.
    if (!showAll && !isSelected && (G.observationRunning || _svObserved)) return;

    const revealed = G.revealedTargets.includes(t.id);
    const col = isSelected ? '#f0c060' : revealed ? '#60c080' : '#ffffff';
    ctx.globalAlpha = (showAll || isSelected || _hoverTargetId === t.id) ? 1 : 0.45;

    ctx.beginPath();
    ctx.arc(p[0], p[1], isSelected ? 3.5 : 2.5, 0, Math.PI*2);
    ctx.fillStyle = col;
    ctx.fill();

    if (isSelected || _cam.zoom > 8 || _hoverTargetId === t.id) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      const label = t.name;
      ctx.font = '0.75em Times New Roman';
      const tw = ctx.measureText(label).width + 10;
      ctx.fillRect(p[0] + 10, p[1] - 8, tw, 14);
      ctx.fillStyle = col;
      ctx.fillText(label, p[0] + 15, p[1] + 3);
    }
    ctx.globalAlpha = 1;
  });

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
  ctx.fillStyle = '#ffffff';
  ctx.font = '0.8em Times New Roman';
  const raH  = (_cam.ra / 15).toFixed(2);
  const decS = (_cam.dec >= 0 ? '+' : '') + _cam.dec.toFixed(2);
  ctx.fillText(`RA ${raH}h  Dec ${decS}°   FOV ${(90/_cam.zoom).toFixed(1)}°`, 6, 14);

  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, H-22, W, 22);
  ctx.fillStyle = 'rgba(220,220,220,0.75)';
  ctx.font = '0.75em Times New Roman';
  ctx.textAlign = 'center';
  ctx.fillText('Drag to pan · Scroll to zoom · Click a target to select it · Or pick one from the left', W/2, H-7);
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

  // Instruction bar along the bottom edge, clear of the centred target
  if (!_svObserved && !G.observationRunning) {
    const msg = G.selectedInstruments.length === 0
      ? 'Choose instruments, then click Observe  ·  Click the sky to deselect'
      : 'Click Observe (or click the sky) to start observing';
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, H - 28, W, 28);
    ctx.fillStyle = 'rgba(240,192,96,0.95)';
    ctx.font = 'bold 0.92em Times New Roman';
    ctx.textAlign = 'center';
    ctx.fillText(msg, W/2, H - 9);
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

const _DRAG_THRESHOLD = 5;   // px of movement before a press becomes a pan

svCvs?.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  const r = svCvs.getBoundingClientRect();
  _dragState = { x: e.clientX - r.left, y: e.clientY - r.top, ra: _cam.ra, dec: _cam.dec, moved: false };
});
svCvs?.addEventListener('mousemove', e => {
  const r = svCvs.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  _const.mouse = { x, y };
  if (_dragState) {
    const dx = x - _dragState.x;
    const dy = y - _dragState.y;
    if (!_dragState.moved && Math.hypot(dx, dy) < _DRAG_THRESHOLD) return;
    _dragState.moved = true;
    if (G.selectedTarget) return;            // view is locked on the target
    const W = svCvs.width, H = svCvs.height;
    const degPerPx = (90 / _cam.zoom) / Math.min(W, H);
    _cam.ra  = ((_dragState.ra  + dx * degPerPx / Math.cos(_cam.dec * Math.PI/180)) + 360) % 360;
    _cam.dec = Math.max(-89.5, Math.min(89.5, _dragState.dec + dy * degPerPx));
    svCvs.style.cursor = 'grabbing';
    renderStarView();
  } else {
    const wasHover = _hoverTargetId;
    _hoverTargetId = _findTargetAt(x, y);
    svCvs.style.cursor = (_hoverTargetId || _fieldAction()) ? 'pointer' : (G.selectedTarget ? 'default' : 'grab');
    const wasConst = _const.hover;
    _updateHoveredConstellation();
    if (wasHover !== _hoverTargetId || wasConst !== _const.hover) renderStarView();
  }
});
window.addEventListener('mouseup', e => {
  const st = _dragState;
  _dragState = null;
  if (!st || st.moved || e.target !== svCvs) return;
  // A press-and-release without panning is a click: select the target under it
  const r = svCvs.getBoundingClientRect();
  _onFieldClick(e.clientX - r.left, e.clientY - r.top);
});
svCvs?.addEventListener('mouseleave', () => {
  const had = _hoverTargetId || _const.hover;
  _hoverTargetId = null;
  _const.mouse = null;
  _const.hover = null;
  if (had) renderStarView();
});

// Work out which constellation is under the cursor. The hit test re-runs only
// when the cursor or the camera has moved.
function _updateHoveredConstellation(W = svCvs.width, H = svCvs.height) {
  if (!_const.mouse || !_const.list.length || _svObserved) { _const.hover = null; return; }
  const key = `${_const.mouse.x},${_const.mouse.y},${_cam.ra},${_cam.dec},${_cam.zoom},${W},${H}`;
  if (key === _const.key) return;
  _const.key = key;
  _const.hover = _findConstellationAt(_const.mouse.x, _const.mouse.y, W, H);
}

svCvs?.addEventListener('wheel', e => {
  if (G.selectedTarget) return;
  e.preventDefault();
  const factor = e.deltaY > 0 ? 0.85 : 1.18;
  _cam.zoom = Math.max(_cam.minZoom, Math.min(_cam.maxZoom, _cam.zoom * factor));
  renderStarView();
}, { passive: false });

// Handle a click/tap on the star field at canvas point (x, y):
//  • on a target that isn't the current one → select it
//  • anywhere else, with a target locked:
//      – no instruments installed → deselect the target
//      – instruments installed    → start the observation (same as Observe)
function _onFieldClick(x, y) {
  if (G.observationRunning) return;
  const hit = _findTargetAt(x, y);
  if (hit && (!G.selectedTarget || G.selectedTarget.id !== hit)) {
    const t = TARGETS.find(t => t.id === hit);
    if (t) G.selectedCategory = t.category;   // open its category in the left list
    if (typeof selectTarget === 'function') selectTarget(hit);
    return;
  }
  const action = _fieldAction();
  if (action === 'deselect') selectTarget(G.selectedTarget.id);   // toggles it off
  else if (action === 'observe') triggerObservation();
}

// What clicking empty sky would do right now: 'deselect', 'observe' or null
function _fieldAction() {
  if (!G.selectedTarget || G.observationRunning) return null;
  if (G.selectedInstruments.length === 0) return _svObserved ? null : 'deselect';
  const btn = document.getElementById('observe-btn');
  return (btn && !btn.disabled && typeof triggerObservation === 'function') ? 'observe' : null;
}

function _findTargetAt(x, y) {
  if (typeof TARGET_COORDS === 'undefined') return null;
  if (G.selectedTarget && (G.observationRunning || _svObserved)) return null;
  const W = svCvs.width, H = svCvs.height;
  let bestId = null, bestD = 20;
  TARGETS.forEach(t => {
    const coords = TARGET_COORDS[t.id];
    if (!coords) return;
    const p = _project(coords[0], coords[1], W, H);
    if (!p || p[0] < 0 || p[0] > W || p[1] < 0 || p[1] > H) return;
    const d = Math.hypot(p[0] - x, p[1] - y);
    if (d < bestD) { bestD = d; bestId = t.id; }
  });
  return bestId;
}

// Touch support — tap selects a target, drag pans
svCvs?.addEventListener('touchstart', e => {
  if (e.touches.length !== 1) return;
  const t = e.touches[0];
  const r = svCvs.getBoundingClientRect();
  _dragState = { x: t.clientX - r.left, y: t.clientY - r.top, ra: _cam.ra, dec: _cam.dec, moved: false };
}, { passive: true });
svCvs?.addEventListener('touchmove', e => {
  if (!_dragState || e.touches.length !== 1) return;
  const t = e.touches[0];
  const r = svCvs.getBoundingClientRect();
  const x = t.clientX - r.left, y = t.clientY - r.top;
  const dx = x - _dragState.x;
  const dy = y - _dragState.y;
  if (!_dragState.moved && Math.hypot(dx, dy) < _DRAG_THRESHOLD) return;
  _dragState.moved = true;
  if (G.selectedTarget) return;
  const W = svCvs.width, H = svCvs.height;
  const degPerPx = (90 / _cam.zoom) / Math.min(W, H);
  _cam.ra  = ((_dragState.ra  + dx * degPerPx / Math.cos(_cam.dec * Math.PI/180)) + 360) % 360;
  _cam.dec = Math.max(-89.5, Math.min(89.5, _dragState.dec + dy * degPerPx));
  renderStarView();
  e.preventDefault();
}, { passive: false });
svCvs?.addEventListener('touchend', e => {
  const st = _dragState;
  _dragState = null;
  if (!st || st.moved) return;
  e.preventDefault();                       // suppress the emulated mouse events
  _onFieldClick(st.x, st.y);
});

// Resize observer — re-render when the star canvas container changes
if (typeof ResizeObserver !== 'undefined' && svCvs?.parentElement) {
  const ro = new ResizeObserver(() => renderStarView());
  ro.observe(svCvs.parentElement);
}