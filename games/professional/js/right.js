/* ============================================================
   right.js — laser, VCAM1/2, focal images, AO quicklook,
               flux, saturation (right column)
   ============================================================ */

function updateRightPanel() {
  drawLaserBar();
  drawVCAM1();
  drawVCAM2();
  drawFocalImage(1);
  drawFocalImage(2);
  drawAOQuicklook();
  drawFlux();
  drawSaturation();
}

// ── Supercontinuum laser (19 lines) ──────────────────────
function drawLaserBar() {
  const cvs = document.getElementById('laser-cvs');
  if (!cvs) return;
  const W = cvs.width = Math.round(cvs.getBoundingClientRect().width) || 300;
  const H = cvs.height = parseInt(cvs.getAttribute("height")) || cvs.offsetHeight || 36;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);

  const cameraOn = G.vampireHAlpha || G.vampireContinuum || G.vampireSplit;
  const hasHII   = G.targetStar && G.targetStar.hasHII;
  const nLines   = 19;
  const spacing  = W / (nLines + 1);
  const dotY     = H * .45;

  for (let i = 0; i < nLines; i++) {
    const x = spacing * (i+1);
    // wavelength gradient: blue→green→red
    const hue = 240 - i*(240/nLines); // 240=blue, 0=red
    const col = cameraOn ? `hsl(${hue},90%,60%)` : '#1a4452';
    ctx.strokeStyle = col; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x,4); ctx.lineTo(x,H-4); ctx.stroke();

    // dot on same x-axis for HII region
    if (cameraOn && hasHII) {
      ctx.beginPath(); ctx.arc(x, dotY, 2.5, 0, Math.PI*2);
      ctx.fillStyle = col; ctx.fill();
    }
  }
  ctx.fillStyle='#3a7088'; ctx.font='8px Times New Roman';
  ctx.fillText('Supercontinuum calibration laser · 19 channels', 4, H-3);
}

// ── VCAM1 ─────────────────────────────────────────────────
function drawVCAM1() {
  const cvs = document.getElementById('vcam1-cvs');
  if (!cvs) return;
  const W = cvs.width = Math.round(cvs.getBoundingClientRect().width) || 100;
  const H = cvs.height = parseInt(cvs.getAttribute("height")) || cvs.offsetHeight || 100;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#050a10'; ctx.fillRect(0,0,W,H);
  const active = G.vampireHAlpha || G.vampireSplit;
  const cx=W/2, cy=H/2;
  if (active && G.targetStar) {
    // Red Hα channel
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,W*.35);
    g.addColorStop(0,'rgba(255,50,50,0.9)');
    g.addColorStop(.5,'rgba(120,10,10,0.4)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(cx,cy,W*.35,0,Math.PI*2);
    ctx.fillStyle=g; ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2);
    ctx.fillStyle='#ff6666'; ctx.fill();
  } else {
    ctx.fillStyle='#0d1f2a'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#1a4452'; ctx.font='8px Times New Roman';
    ctx.textAlign='center'; ctx.fillText('VCAM1 offline',cx,cy); ctx.textAlign='left';
  }
  ctx.fillStyle='#3a7088'; ctx.font='8px Times New Roman'; ctx.textAlign='center';
  ctx.fillText('VCAM1', cx, 10); ctx.textAlign='left';
}

// ── VCAM2 ─────────────────────────────────────────────────
function drawVCAM2() {
  const cvs = document.getElementById('vcam2-cvs');
  if (!cvs) return;
  const W = cvs.width = Math.round(cvs.getBoundingClientRect().width) || 100;
  const H = cvs.height = parseInt(cvs.getAttribute("height")) || cvs.offsetHeight || 100;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#050a10'; ctx.fillRect(0,0,W,H);
  const active = G.vampireContinuum || G.vampireSplit;
  const cx=W/2, cy=H/2;
  if (active && G.targetStar) {
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,W*.35);
    g.addColorStop(0,'rgba(180,200,255,0.85)');
    g.addColorStop(.5,'rgba(60,80,160,0.35)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(cx,cy,W*.35,0,Math.PI*2);
    ctx.fillStyle=g; ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2);
    ctx.fillStyle='#aabbff'; ctx.fill();
  } else {
    ctx.fillStyle='#0d1f2a'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#1a4452'; ctx.font='8px Times New Roman';
    ctx.textAlign='center'; ctx.fillText('VCAM2 offline',cx,cy); ctx.textAlign='left';
  }
  ctx.fillStyle='#3a7088'; ctx.font='8px Times New Roman'; ctx.textAlign='center';
  ctx.fillText('VCAM2', cx, 10); ctx.textAlign='left';
}

// ── Focal images (rice-shaped prism / lenslet grid) ───────
function drawFocalImage(n) {
  const cvs = document.getElementById(`focal${n}-cvs`);
  if (!cvs) return;
  const W = cvs.width = Math.round(cvs.getBoundingClientRect().width) || 100;
  const H = cvs.height = parseInt(cvs.getAttribute("height")) || cvs.offsetHeight || 100;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#050814'; ctx.fillRect(0,0,W,H);
  const active = G.charisPrismDone;
  // Draw lenslet / prism pattern
  const cols=12, rows=10;
  const pw=W/cols, ph=H/rows;
  for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) {
    const x=c*pw+pw*.1, y=r*ph+ph*.2;
    const hw=pw*.38, hh=ph*.28;
    const bright = active ? (.4+Math.random()*.6) : (.05+Math.random()*.08);
    // rice shape = ellipse
    ctx.beginPath(); ctx.ellipse(x+hw, y+hh, hw, hh, 0, 0, Math.PI*2);
    // some thicker
    const thick = Math.random() < .12;
    const col = active
      ? `rgba(${100+Math.floor(bright*155)},${Math.floor(bright*120)},${Math.floor(bright*50)},${bright})`
      : `rgba(30,50,60,${bright*3})`;
    ctx.fillStyle=col; ctx.fill();
    if (thick && active) {
      ctx.lineWidth=1; ctx.strokeStyle=`rgba(255,200,80,${bright*.5})`; ctx.stroke();
    }
  }
  // circle overlay
  const cx=W/2,cy=H/2;
  ctx.strokeStyle='rgba(126,207,237,0.2)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(cx,cy,Math.min(W,H)*.36,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle='#3a7088'; ctx.font='8px Times New Roman'; ctx.textAlign='center';
  ctx.fillText(`Focal ${n}`, cx, 10); ctx.textAlign='left';
}

// ── AO Image quicklook ───────────────────────────────────
function drawAOQuicklook() {
  const cvs = document.getElementById('ao-quick-cvs');
  if (!cvs) return;
  const W = cvs.width = Math.round(cvs.getBoundingClientRect().width) || 100;
  const H = cvs.height = parseInt(cvs.getAttribute("height")) || cvs.offsetHeight || 100;
  const ctx = cvs.getContext('2d');
  // Blue-ish background
  ctx.fillStyle = '#050f1a'; ctx.fillRect(0,0,W,H);
  if (G.adaptiveLoopClosed) {
    // Tilted square mask
    ctx.save(); ctx.translate(W/2,H/2); ctx.rotate(.18);
    ctx.strokeStyle='rgba(126,207,237,0.35)'; ctx.lineWidth=1;
    const sz=Math.min(W,H)*.38;
    ctx.strokeRect(-sz,-sz,sz*2,sz*2); ctx.restore();
    // Point source (slightly off-center)
    const px=W*.48+Math.random()*4-2, py=H*.46+Math.random()*4-2;
    const g=ctx.createRadialGradient(px,py,0,px,py,10);
    const noise = G.scexaoDMDone?.25:.65;
    g.addColorStop(0,`rgba(${lerp(80,255,1-noise)},${lerp(100,220,1-noise)},255,0.9)`);
    g.addColorStop(.5,`rgba(30,60,120,0.3)`); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(px,py,10,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
    ctx.beginPath(); ctx.arc(px,py,2,0,Math.PI*2);
    ctx.fillStyle='rgba(180,220,255,0.9)'; ctx.fill();
  } else {
    ctx.fillStyle='#1a4452'; ctx.font='8px Times New Roman';
    ctx.textAlign='center'; ctx.fillText('AO loop open',W/2,H/2); ctx.textAlign='left';
  }
  ctx.fillStyle='#3a7088'; ctx.font='8px Times New Roman'; ctx.textAlign='center';
  ctx.fillText('AO Quicklook', W/2, 10); ctx.textAlign='left';
}

// ── Flux monitor ─────────────────────────────────────────
function drawFlux() {
  const cvs = document.getElementById('flux-cvs');
  if (!cvs) return;
  const W = cvs.width = Math.round(cvs.getBoundingClientRect().width) || 100;
  const H = cvs.height = parseInt(cvs.getAttribute("height")) || cvs.offsetHeight || 80;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#050a10'; ctx.fillRect(0,0,W,H);
  if (G.targetStar && G.enclosureOpen) {
    const base = G.scexaoCoroDone ? .12 : G.ao3kDone ? .55 : .9;
    const bars = 20;
    for (let i=0;i<bars;i++) {
      const h = (base + (Math.random()-.5)*.15)*H*.7;
      const x = (i/bars)*W + 1;
      const bw = W/bars - 2;
      const v = h/(H*.7);
      ctx.fillStyle = `hsl(${200-v*160},80%,${40+v*30}%)`;
      ctx.fillRect(x, H-8-h, bw, h);
    }
  }
  ctx.fillStyle='#3a7088'; ctx.font='8px Times New Roman'; ctx.textAlign='center';
  ctx.fillText('Flux', W/2, 10); ctx.textAlign='left';
}

// ── Saturation monitor ────────────────────────────────────
function drawSaturation() {
  const cvs = document.getElementById('sat-cvs');
  if (!cvs) return;
  const W = cvs.width = Math.round(cvs.getBoundingClientRect().width) || 100;
  const H = cvs.height = parseInt(cvs.getAttribute("height")) || cvs.offsetHeight || 80;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#050a10'; ctx.fillRect(0,0,W,H);
  if (G.targetStar && G.enclosureOpen) {
    const sat = G.cameraNDR ? .35 + Math.random()*.2 : .05+Math.random()*.08;
    const g=ctx.createLinearGradient(0,0,W,0);
    g.addColorStop(0,'#0a3a4a'); g.addColorStop(sat,'#7ecfed'); g.addColorStop(1,'#0a3a4a');
    ctx.fillStyle=g; ctx.fillRect(4, H*.25, (W-8)*sat, H*.5);
    ctx.strokeStyle='#2e6080'; ctx.lineWidth=1;
    ctx.strokeRect(4,H*.25,W-8,H*.5);
    ctx.fillStyle = sat>.7?'#e05555':'#7aadbe'; ctx.font='8px Times New Roman';
    ctx.textAlign='center'; ctx.fillText(`${(sat*100).toFixed(0)}%`,W/2,H-4); ctx.textAlign='left';
  }
  ctx.fillStyle='#3a7088'; ctx.font='8px Times New Roman'; ctx.textAlign='center';
  ctx.fillText('Saturation', W/2, 10); ctx.textAlign='left';
}

function updateCHARIS() { drawFocalImage(1); drawFocalImage(2); }
function updateVAMPIRE() { drawVCAM1(); drawVCAM2(); drawLaserBar(); drawAPAPANE(); drawPALILA(); }

setInterval(updateRightPanel, 600);