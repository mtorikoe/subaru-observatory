/* ============================================================
   middle.js — PyWFS quad display, DM grid, APAPANE, PALILA
   ============================================================ */
let middleFrame = 0;

function updateMiddlePanel() {
  drawPyWFS();
  drawDMGrid();
  drawAPAPANE();
  drawPALILA();
}

// ── PyWFS — 4 pupil quadrants ─────────────────────────────
function drawPyWFS() {
  const cvs = document.getElementById('pywfs-cvs');
  if (!cvs) return;
  const W = cvs.width = Math.round(cvs.getBoundingClientRect().width) || 120;
  const H = cvs.height = Math.round(cvs.getBoundingClientRect().height) || 120;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);

  const noise  = G.adaptiveLoopClosed ? (G.scexaoDMDone ? .15 : .45) : .85;
  const cx = W/2, cy = H/2;
  const qr = Math.min(W,H)*.22;

  [[-.5,-.5],[.5,-.5],[-.5,.5],[.5,.5]].forEach(([dx,dy]) => {
    const qx = cx + dx*(W*.46), qy = cy + dy*(H*.46);
    // pupil circle with wavefront-error color
    const phi = noise * (Math.random()-.5);
    const intensity = Math.max(0,Math.min(1, .5 + phi));
    const g = ctx.createRadialGradient(qx,qy,0,qx,qy,qr);
    g.addColorStop(0,   `rgba(${lerp(50,255,intensity)},${lerp(0,200,intensity)},${lerp(120,50,intensity)},0.9)`);
    g.addColorStop(.7,  `rgba(${lerp(20,180,intensity*0.7)},0,${lerp(60,30,intensity)},0.6)`);
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(qx,qy,qr,0,Math.PI*2);
    ctx.fillStyle = g; ctx.fill();
    // central dot
    ctx.beginPath(); ctx.arc(qx,qy,2,0,Math.PI*2);
    ctx.fillStyle = '#fff'; ctx.fill();
  });

  // cross lines
  ctx.strokeStyle = '#1a4452'; ctx.lineWidth = .5;
  ctx.beginPath(); ctx.moveTo(cx,0); ctx.lineTo(cx,H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,cy); ctx.lineTo(W,cy); ctx.stroke();

  ctx.fillStyle='#3a7088'; ctx.font='8px Times New Roman'; ctx.textAlign='center';
  ctx.fillText('PyWFS', cx, H-3); ctx.textAlign='left';
}

// ── DM actuator grid — 3×4 ────────────────────────────────
function drawDMGrid() {
  const cvs = document.getElementById('dm-grid-cvs');
  if (!cvs) return;
  const W = cvs.width = Math.round(cvs.getBoundingClientRect().width) || 160;
  const H = cvs.height = Math.round(cvs.getBoundingClientRect().height) || 120;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);

  const rows=4, cols=3;
  const pw=(W-12)/(cols), ph=(H-12)/(rows);
  const noise = G.scexaoDMDone ? .12 : G.ao3kDone ? .40 : .85;

  for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) {
    const x=6+c*pw, y=6+r*ph;
    const v = noise*(Math.random()-.5)*2;
    const intensity = Math.max(0,Math.min(1,.5+v*.5));
    // blurry circle representing PSF in that segment
    const g = ctx.createRadialGradient(x+pw/2,y+ph/2,0,x+pw/2,y+ph/2,pw*.42);
    g.addColorStop(0,   `rgba(${lerp(30,255,intensity)},${lerp(0,150,intensity)},${lerp(80,30,intensity)},0.85)`);
    g.addColorStop(.6,  `rgba(${lerp(10,100,intensity)},0,${lerp(40,10,intensity)},0.4)`);
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(x+pw/2,y+ph/2,pw*.4,0,Math.PI*2);
    ctx.fillStyle=g; ctx.fill();
    ctx.strokeStyle='#1a4452'; ctx.lineWidth=.5;
    ctx.strokeRect(x,y,pw,ph);
  }
  ctx.fillStyle='#3a7088'; ctx.font='8px Times New Roman'; ctx.textAlign='center';
  ctx.fillText('DM segments', W/2, H-2); ctx.textAlign='left';
}

// ── APAPANE ───────────────────────────────────────────────
function drawAPAPANE() {
  const cvs = document.getElementById('apapane-cvs');
  if (!cvs) return;
  const W = cvs.width = Math.round(cvs.getBoundingClientRect().width) || 120;
  const H = cvs.height = Math.round(cvs.getBoundingClientRect().height) || 120;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#050a10'; ctx.fillRect(0,0,W,H);

  const cx=W/2, cy=H/2;
  // cross
  ctx.strokeStyle = '#1a4452'; ctx.lineWidth = .7;
  ctx.beginPath(); ctx.moveTo(cx,0); ctx.lineTo(cx,H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,cy); ctx.lineTo(W,cy); ctx.stroke();

  // Star when h-alpha or split active
  const active = G.vampireHAlpha || G.vampireSplit;
  if (active && G.targetStar) {
    const sx=cx, sy=cy;
    const sg=ctx.createRadialGradient(sx,sy,0,sx,sy,18);
    sg.addColorStop(0,'rgba(255,80,80,1)');
    sg.addColorStop(.4,'rgba(180,30,30,0.5)');
    sg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(sx,sy,18,0,Math.PI*2);
    ctx.fillStyle=sg; ctx.fill();
    ctx.beginPath(); ctx.arc(sx,sy,3,0,Math.PI*2);
    ctx.fillStyle='#ff5555'; ctx.fill();
  }

  ctx.fillStyle='#3a7088'; ctx.font='8px Times New Roman'; ctx.textAlign='center';
  ctx.fillText('APAPANE', cx, 10); ctx.textAlign='left';
}

// ── PALILA ────────────────────────────────────────────────
function drawPALILA() {
  const cvs = document.getElementById('palila-cvs');
  if (!cvs) return;
  const W = cvs.width = Math.round(cvs.getBoundingClientRect().width) || 120;
  const H = cvs.height = Math.round(cvs.getBoundingClientRect().height) || 120;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#050a10'; ctx.fillRect(0,0,W,H);

  const cx=W/2, cy=H/2;
  ctx.strokeStyle = '#1a4452'; ctx.lineWidth=.7;
  ctx.beginPath(); ctx.moveTo(cx,0); ctx.lineTo(cx,H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,cy); ctx.lineTo(W,cy); ctx.stroke();

  if (G.targetStar) {
    const clearness = (G.ao3kDone?.5:0) + (G.scexaoDMDone?.35:0);
    const blur = Math.max(2, 20*(1-clearness));
    // star PSF
    const sx=cx, sy=cy-4;
    const sg=ctx.createRadialGradient(sx,sy,0,sx,sy,blur*1.8);
    const ir1=`rgba(255,${Math.floor(200*clearness)},${Math.floor(50*clearness)},0.95)`;
    const ir2=`rgba(${Math.floor(150*clearness)},${Math.floor(50*clearness)},0,0)`;
    sg.addColorStop(0,ir1); sg.addColorStop(.5,ir2.replace('0)',`${0.3})`)); sg.addColorStop(1,ir2);
    ctx.beginPath(); ctx.arc(sx,sy,blur*1.6,0,Math.PI*2);
    ctx.fillStyle=sg; ctx.fill();
    // coronagraph mask overlay
    if (G.scexaoCoroDone) {
      ctx.beginPath(); ctx.arc(sx,sy,8,0,Math.PI*2);
      ctx.fillStyle='rgba(0,0,0,0.92)'; ctx.fill();
      ctx.strokeStyle='rgba(126,207,237,0.25)'; ctx.lineWidth=1; ctx.stroke();
    }
    // companion if coro + lyot done
    if (G.scexaoCoroDone && G.scexaoLyotDone && G.targetStar) {
      const star = G.targetStar;
      const ang  = star.companionAngle * Math.PI/180;
      const dist = star.companionDist * Math.min(W,H)*.38;
      const compX = cx + Math.cos(ang)*dist;
      const compY = cy + Math.sin(ang)*dist - 4;
      const cg=ctx.createRadialGradient(compX,compY,0,compX,compY,5);
      cg.addColorStop(0,star.companionColor+'cc');
      cg.addColorStop(1,star.companionColor+'00');
      ctx.beginPath(); ctx.arc(compX,compY,5,0,Math.PI*2);
      ctx.fillStyle=cg; ctx.fill();
      ctx.beginPath(); ctx.arc(compX,compY,2,0,Math.PI*2);
      ctx.fillStyle=star.companionColor; ctx.fill();
    }
    // continuum/split star marker (slightly above center)
    if ((G.vampireContinuum || G.vampireSplit) && !G.scexaoCoroDone) {
      ctx.beginPath(); ctx.arc(cx,cy-8,3,0,Math.PI*2);
      ctx.fillStyle='#ffee88'; ctx.fill();
    }
  }

  ctx.fillStyle='#3a7088'; ctx.font='8px Times New Roman'; ctx.textAlign='center';
  ctx.fillText('PALILA', cx, 10); ctx.textAlign='left';
}

function lerp(a,b,t) { return Math.round(a+(b-a)*t); }

// Refresh middle panel on interval
setInterval(updateMiddlePanel, 500);