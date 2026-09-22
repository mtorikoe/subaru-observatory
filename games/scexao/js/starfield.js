/* ============================================================
   starfield.js — star field canvas (left panel)
   Performance: draws background once, animates stars on mainCvs
   ============================================================ */
const fieldPanel = document.getElementById('field-panel');
const sfCvs      = document.getElementById('sfCvs');
const starCvs    = document.getElementById('starCvs');
const reticle    = document.getElementById('reticle');
let FW = 0, FH = 0;

function resizeField() {
  FW = fieldPanel.offsetWidth; FH = fieldPanel.offsetHeight;
  sfCvs.width  = starCvs.width  = FW;
  sfCvs.height = starCvs.height = FH;
}

// Drawn once per field — static background dots
function drawBgStarfield() {
  const ctx = sfCvs.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, FW, FH);
  for (let i = 0; i < 250; i++) {
    const x = Math.random() * FW, y = Math.random() * FH;
    const r = Math.random() * .65 + .1, op = Math.random() * .28 + .04;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,220,255,${op})`; ctx.fill();
  }
}

function generateStars() {
  const n = 7 + Math.floor(Math.random() * 3);
  const arr = [];
  for (let i = 0; i < n; i++) {
    let x, y, ok, t = 0;
    do {
      x = 70 + Math.random() * (FW - 140);
      y = 50 + Math.random() * (FH - 100);
      ok = arr.every(s => Math.hypot(s.x - x, s.y - y) > 85); t++;
    } while (!ok && t < 60);
    const br  = .45 + Math.random() * .55;
    const tp  = Math.random();
    const col = tp < .3 ? '#bcd2ff' : tp < .7 ? '#fff5d0' : '#ffd0a0';
    arr.push({ x, y, brightness: br, baseColor: col, phi: Math.random() * Math.PI * 2 });
  }
  return arr;
}

function starAt(cx, cy) {
  let best = -1, bd = 42;
  G.stars.forEach((s, i) => {
    const d = Math.hypot(s.x - cx, s.y - cy);
    if (d < bd) { best = i; bd = d; }
  });
  return best;
}

// Render loop — only game stars, not background
let sfFrame = 0;
let sfRunning = false;
function renderStars() {
  if (G.phase === 'attract') { sfRunning = false; return; }
  sfRunning = true;
  sfFrame++;
  const ctx = starCvs.getContext('2d');
  ctx.clearRect(0, 0, FW, FH);

  G.stars.forEach((s, i) => {
    // slow flicker — update only every 2 frames to halve draw calls
    const fl  = Math.sin(sfFrame * .025 + s.phi) * .045;
    const rad = (7 + s.brightness * 10) * (1 + fl * .07);
    const al  = .7 + s.brightness * .3 + fl * .06;

    // Glow — drawn as a simple radial gradient circle (fast)
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rad * 2.8);
    g.addColorStop(0, s.baseColor + 'aa'); g.addColorStop(1, s.baseColor + '00');
    ctx.beginPath(); ctx.arc(s.x, s.y, rad * 2.8, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();

    // Core
    ctx.beginPath(); ctx.arc(s.x, s.y, rad, 0, Math.PI * 2);
    ctx.fillStyle = s.baseColor; ctx.globalAlpha = al; ctx.fill(); ctx.globalAlpha = 1;

    // Selection ring
    if (i === G.selectedIdx) {
      ctx.beginPath(); ctx.arc(s.x, s.y, rad + 10, 0, Math.PI * 2);
      ctx.strokeStyle = '#7ecfed'; ctx.lineWidth = 1.5; ctx.stroke();
      // 4 tick marks rotating slowly
      for (let t = 0; t < 4; t++) {
        const a = (t / 4) * Math.PI * 2 + sfFrame * .004;
        ctx.beginPath();
        ctx.moveTo(s.x + Math.cos(a) * (rad + 14), s.y + Math.sin(a) * (rad + 14));
        ctx.lineTo(s.x + Math.cos(a) * (rad + 20), s.y + Math.sin(a) * (rad + 20));
        ctx.stroke();
      }
    }
  });

  requestAnimationFrame(renderStars);
}

// Reticle
fieldPanel.addEventListener('mousemove', e => {
  if (G.phase === 'attract') return;
  if (document.getElementById('result-overlay').style.display === 'flex') return;
  const r = fieldPanel.getBoundingClientRect();
  reticle.style.display = 'block';
  reticle.style.left = (e.clientX - r.left) + 'px';
  reticle.style.top  = (e.clientY - r.top)  + 'px';
});
fieldPanel.addEventListener('mouseleave', () => { reticle.style.display = 'none'; });