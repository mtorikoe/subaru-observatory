/* ============================================================
   telescope-tab.js — enclosure animation, telescope, sky view
   ============================================================ */
let enclosureAnim = null;
let teleAzimAnim  = null;
let skyFrame      = 0;

// ── Enclosure ────────────────────────────────────────────
function animateEnclosure(opening) {
  if (enclosureAnim) clearInterval(enclosureAnim);
  const target = opening ? 1 : 0;
  enclosureAnim = setInterval(() => {
    const diff = target - G.enclosureAngle;
    if (Math.abs(diff) < .01) { G.enclosureAngle = target; clearInterval(enclosureAnim); }
    else G.enclosureAngle += diff * .05;
    drawEnclosure();
    drawSkyView();
  }, 30);
}

function drawEnclosure() {
  const cvs = document.getElementById('enclosure-cvs');
  if (!cvs) return;
  const W = cvs.width = Math.round(cvs.getBoundingClientRect().width) || 200;
  const H = cvs.height = parseInt(cvs.getAttribute("height")) || Math.round(cvs.getBoundingClientRect().height) || 160;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);

  const cx = W/2, cy = H * .6;
  const r  = Math.min(W,H) * .32;
  const op = G.enclosureAngle; // 0=closed 1=open

  // Building base
  ctx.fillStyle = '#1a3a4a';
  ctx.fillRect(cx - r*1.1, cy, r*2.2, H - cy);

  // Cylinder body
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r*.22, 0, 0, Math.PI);
  ctx.fillStyle = '#244b6d'; ctx.fill();
  ctx.strokeStyle = '#2e6080'; ctx.lineWidth = 1; ctx.stroke();

  ctx.fillStyle = '#1a3a4a';
  ctx.fillRect(cx - r, cy - r*1.6, r*2, r*1.6);
  ctx.strokeStyle = '#2e6080'; ctx.strokeRect(cx - r, cy - r*1.6, r*2, r*1.6);

  // Dome slit opening — two halves that rotate apart
  const slitAngle = op * Math.PI * .65;
  [-1, 1].forEach(side => {
    ctx.save();
    ctx.translate(cx, cy - r*.8);
    ctx.rotate(side * slitAngle);
    ctx.fillStyle = side > 0 ? '#12353f' : '#1a4452';
    ctx.beginPath();
    ctx.moveTo(0, -r*.8); ctx.lineTo(side * r*.95, -r*.8);
    ctx.lineTo(side * r*.95, r*.8);  ctx.lineTo(0, r*.8);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2e6080'; ctx.lineWidth = .5; ctx.stroke();
    ctx.restore();
  });

  // Sky visible through slit when open
  if (op > .1) {
    ctx.save();
    ctx.beginPath();
    const sw = r * op * .9;
    ctx.rect(cx - sw*.5, cy - r*1.55, sw, r*1.5);
    ctx.clip();
    const sky = ctx.createLinearGradient(0,cy-r*1.55,0,cy);
    sky.addColorStop(0, `rgba(15,25,50,${op})`);
    sky.addColorStop(1, `rgba(20,40,80,${op*.5})`);
    ctx.fillStyle = sky; ctx.fill();
    // tiny stars
    for (let i=0;i<12;i++) {
      ctx.beginPath(); ctx.arc(cx-sw*.4+Math.random()*sw*.8,
        cy-r*1.5+Math.random()*r*1.4, .8, 0, Math.PI*2);
      ctx.fillStyle=`rgba(255,255,255,${op*.7})`; ctx.fill();
    }
    ctx.restore();
  }

  // Status label
  ctx.fillStyle = '#7aadbe'; ctx.font = '9px Times New Roman'; ctx.textAlign='center';
  ctx.fillText(op > .9 ? 'OPEN' : op < .1 ? 'CLOSED' : 'OPENING…', cx, H-4);
  ctx.textAlign='left';
}

// ── Telescope ────────────────────────────────────────────
function animateTelescope(star) {
  const targetAz = Math.random()*280 + 40;
  const targetEl = 30 + Math.random()*50;
  let az = G.telesAzimuth, el = G.telesElevation;
  if (teleAzimAnim) clearInterval(teleAzimAnim);
  teleAzimAnim = setInterval(() => {
    const daz = targetAz - az, del = targetEl - el;
    if (Math.abs(daz)<.5 && Math.abs(del)<.5) {
      az = targetAz; el = targetEl;
      G.telesAzimuth = az; G.telesElevation = el;
      clearInterval(teleAzimAnim);
    } else { az += daz*.04; el += del*.04; }
    drawTelescope(az, el);
  }, 30);
}

function drawTelescope(az, el) {
  const cvs = document.getElementById('telescope-cvs');
  if (!cvs) return;
  const W = cvs.width = Math.round(cvs.getBoundingClientRect().width) || 200;
  const H = cvs.height = parseInt(cvs.getAttribute("height")) || Math.round(cvs.getBoundingClientRect().height) || 160;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#071419'; ctx.fillRect(0,0,W,H);

  const cx = W/2, cy = H*.65;
  const elRad = ((el||45) - 90) * Math.PI/180; // 90° = zenith
  const tLen  = Math.min(W,H)*.38;

  // Mount base
  ctx.fillStyle = '#244b6d';
  ctx.beginPath(); ctx.ellipse(cx,cy,tLen*.35,tLen*.1,0,0,Math.PI*2);
  ctx.fill(); ctx.strokeStyle='#2e6080'; ctx.lineWidth=1; ctx.stroke();
  ctx.fillRect(cx-tLen*.06, cy, tLen*.12, tLen*.25);

  // Tube
  const tx = cx + Math.cos(elRad)*tLen;
  const ty = cy + Math.sin(elRad)*tLen;
  ctx.strokeStyle = '#7ecfed'; ctx.lineWidth = tLen*.14;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(tx,ty); ctx.stroke();
  ctx.strokeStyle = '#2e6080'; ctx.lineWidth = tLen*.14+2;
  ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(tx,ty); ctx.stroke();
  ctx.strokeStyle = '#7ecfed'; ctx.lineWidth = tLen*.12;
  ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(tx,ty); ctx.stroke();

  // Az/El labels
  ctx.fillStyle = '#7aadbe'; ctx.font = '8px Times New Roman';
  ctx.fillText(`Az ${(az||180).toFixed(0)}°  El ${(el||45).toFixed(0)}°`, 6, H-5);
}

// ── Sky view ─────────────────────────────────────────────
function drawSkyView() {
  const cvs = document.getElementById('sky-cvs');
  if (!cvs) return;
  const W = cvs.width = Math.round(cvs.getBoundingClientRect().width) || 200;
  const H = cvs.height = parseInt(cvs.getAttribute("height")) || Math.round(cvs.getBoundingClientRect().height) || 100;
  const ctx = cvs.getContext('2d');

  const op = G.enclosureAngle;
  if (op < .05) {
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#1a4452'; ctx.font = '9px Times New Roman';
    ctx.textAlign='center'; ctx.fillText('enclosure closed',W/2,H/2); ctx.textAlign='left';
    return;
  }

  // Sky gradient — dark to dark-blue as enclosure opens
  const sky = ctx.createLinearGradient(0,0,0,H);
  const blue = Math.floor(op*28);
  sky.addColorStop(0, `rgb(${blue},${blue},${blue+20})`);
  sky.addColorStop(1, `rgb(${Math.floor(blue*.6)},${Math.floor(blue*.6)},${Math.floor(blue*.6)+12})`);
  ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);

  // Stars
  if (!drawSkyView._stars) {
    drawSkyView._stars = Array.from({length:60}, () => ({
      x:Math.random(), y:Math.random(), r:Math.random()*.9+.2, op:Math.random()*.6+.2
    }));
  }
  drawSkyView._stars.forEach(s => {
    ctx.beginPath(); ctx.arc(s.x*W, s.y*H, s.r, 0, Math.PI*2);
    ctx.fillStyle = `rgba(255,255,255,${s.op*op})`; ctx.fill();
  });

  // Target star indicator
  if (G.targetStar) {
    const tx = W*.5 + (G.centered ? 0 : (Math.random()-.5)*4);
    const ty = H*.45;
    ctx.beginPath(); ctx.arc(tx,ty,3,0,Math.PI*2);
    ctx.fillStyle='#f0c060'; ctx.fill();
    if (G.centered) {
      ctx.strokeStyle='#f0c06088'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(tx,ty,8,0,Math.PI*2); ctx.stroke();
    }
    ctx.fillStyle='#f0c060'; ctx.font='8px Times New Roman'; ctx.textAlign='center';
    ctx.fillText(G.targetStar.display, tx, ty+14);
    ctx.textAlign='left';
  }
}

function updateTelescopeView() {
  drawEnclosure(); drawTelescope(G.telesAzimuth, G.telesElevation); drawSkyView();
}

function initTelescopeTab() {
  drawEnclosure();
  drawTelescope(G.telesAzimuth, G.telesElevation);
  drawSkyView();
}

// Sky animation loop
setInterval(() => {
  if (document.getElementById('tab-telescope') &&
      document.getElementById('tab-telescope').classList.contains('tab-active')) {
    drawSkyView();
  }
}, 2000);