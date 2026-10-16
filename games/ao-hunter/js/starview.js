/* ============================================================
   starview.js
   ============================================================ */

const svCvs = document.getElementById('sv-canvas');

let _svClarity          = 0;
let _svObserved         = false;
let _svCompanionClickable = false;
let _pulseLoopId        = null;

// ── Background star field (generated once, stored as fractions) ──
let _bgStars = null;
function _makeBgStars() {
  const n = 350;                                   // density: 200 sparse … 600 dense
  _bgStars = Array.from({length:n}, () => {
    const m = Math.pow(Math.random(), 3);          // most stars faint, few bright
    return {
      fx: Math.random(), fy: Math.random(),
      r:  0.35 + m*1.3,                            // radius in px (tiny)
      a:  0.25 + m*0.7,                            // brightness
      hue: Math.random(),                          // picks colour below
    };
  });
}

function _drawBgStars(ctx, W, H) {
  if (!_bgStars) _makeBgStars();
  _bgStars.forEach(s => {
    const x = s.fx*W, y = s.fy*H;
    // keep the area around the target clear
    if (Math.hypot(x - W/2, y - H/2) < 18) return;
    const c = s.hue < 0.15 ? '170,190,255'          // blue
            : s.hue < 0.75 ? '255,250,235'          // white
            : s.hue < 0.90 ? '255,220,160'          // yellow
            :                '255,170,120';         // orange
    ctx.beginPath(); ctx.arc(x, y, s.r, 0, Math.PI*2);
    ctx.fillStyle = `rgba(${c},${s.a})`; ctx.fill();
    // only the brightest get a faint glow
    if (s.r > 1.2) {
      ctx.beginPath(); ctx.arc(x, y, s.r*2.6, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${c},${s.a*0.12})`; ctx.fill();
    }
  });
}

function resetStarView() {
  _svClarity            = 0;
  _svObserved           = false;
  _svCompanionClickable = false;
  _stopPulse();
  if (svCvs) { svCvs._companionX = -1; }
}

function _startPulse() {
  if (_pulseLoopId) return;
  (function tick() {
    if (!_svCompanionClickable) { _pulseLoopId = null; return; }
    _drawPulseRing();
    _pulseLoopId = requestAnimationFrame(tick);
  })();
}
function _stopPulse() {
  if (_pulseLoopId) { cancelAnimationFrame(_pulseLoopId); _pulseLoopId = null; }
}

// Draw ONLY the pulsing ring on top of what is already on the canvas.
// Does NOT call renderStarView — avoids any canvas-reset side effects.
function _drawPulseRing() {
  if (!svCvs || !svCvs._companionX || svCvs._companionX < 0) return;
  const ctx = svCvs.getContext('2d');
  const px  = svCvs._companionX, py = svCvs._companionY;
  const pulse = (Date.now() % 1200) / 1200;
  const pR    = 20 + pulse * 14;
  ctx.beginPath(); ctx.arc(px, py, pR, 0, Math.PI*2);
  ctx.strokeStyle = `rgba(240,192,96,${0.85 - pulse*0.65})`; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='rgba(0,0,0,0.6)';
  ctx.fillRect(px-62, py+22, 124, 18);
  ctx.fillStyle='#f0c060'; ctx.font='bold 11px Times New Roman';
  ctx.textAlign='center';
  ctx.fillText('Click the companion!', px, py+34);
  ctx.textAlign='left';
}

function revealStarView(clarity) {
  _svClarity  = clarity;
  _svObserved = true;
  renderStarView();   // draw once fully

  const star = G.selectedStar;
  const hasComp = star && (star.companion || star.planetVisible) && clarity > 0.45;
  if (hasComp) {
    _svCompanionClickable = true;
    updateInstructions(4);
    const npBtn = document.getElementById('no-planet-btn');
    if (npBtn) npBtn.style.display = 'none';
    _startPulse();
  }
}

// ── Main render ────────────────────────────────────────────
function renderStarView() {
  if (!svCvs) return;

  // Read dimensions from parent, not from offsetWidth which can be 0 while hidden
  const parent = svCvs.parentElement;
  const W = (parent && parent.offsetWidth  > 0) ? parent.offsetWidth  : (svCvs.width  || 300);
  const H = (parent && parent.offsetHeight > 0) ? parent.offsetHeight : (svCvs.height || 260);

  // Only resize the canvas if dimensions actually changed — avoids clearing context mid-frame
  if (svCvs.width !== W || svCvs.height !== H) {
    svCvs.width  = W;
    svCvs.height = H;
  }
  const ctx = svCvs.getContext('2d');

  if (!G.selectedStar) {
    ctx.fillStyle = '#040810'; ctx.fillRect(0,0,W,H);
    return;
  }

  const star    = G.selectedStar;
  const clarity = _svObserved ? _svClarity : 0;
  const blur    = Math.pow(1 - clarity, 1.6);
  ctx.fillStyle = '#040810'; ctx.fillRect(0,0,W,H);
  _drawBgStars(ctx, W, H);
  const cx=W/2, cy=H/2;

  // PSF glow: soft halo + sharp core
  const psfR = 2 + blur*28;                       // was 8 + blur*60
  const g1 = ctx.createRadialGradient(cx,cy,0, cx,cy,psfR*3);   // was psfR*4
  g1.addColorStop(0,    `rgba(255,252,235,1)`);
  g1.addColorStop(0.10, `rgba(255,235,170,${0.95-blur*0.3})`);
  g1.addColorStop(0.30, `rgba(255,150,80,${0.45-blur*0.2})`);
  g1.addColorStop(0.65, `rgba(80,20,100,${0.12*clarity})`);
  g1.addColorStop(1,    'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.arc(cx,cy,psfR*3,0,Math.PI*2); ctx.fillStyle=g1; ctx.fill();

  // crisp core (観測後、鮮明になるほどはっきり見える)
  if (_svObserved) {
    ctx.beginPath(); ctx.arc(cx,cy,1.5+blur*3,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,255,245,${0.6+clarity*0.4})`; ctx.fill();
  }

  // Speckle halo (post-observation only)
  if (_svObserved && blur>0.1 && clarity>0.1) {
    const n=Math.floor(blur*12);
    for (let i=0;i<n;i++) {
      const angle=Math.random()*Math.PI*2, dist=(0.3+Math.random()*0.5)*psfR*3;
      const sx=cx+Math.cos(angle)*dist, sy=cy+Math.sin(angle)*dist;
      const sg=ctx.createRadialGradient(sx,sy,0,sx,sy,5+blur*6);
      sg.addColorStop(0,`rgba(200,100,50,${blur*0.35})`); sg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(sx,sy,1.2+blur*2,0,Math.PI*2); ctx.fillStyle=sg; ctx.fill();
    }
  }

  // Pre-observe label
  if (!_svObserved) {
    if (!G.observationRunning) {
      ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,cy-20,W,38);
      ctx.fillStyle='rgba(240,192,96,0.9)'; ctx.font='bold 13px Times New Roman';
      ctx.textAlign='center';
      ctx.fillText('Build your telescope, then click Observe', cx, cy+6);
      ctx.textAlign='left';
    }
    return;
  }

  // Coronagraph mask
  const hasCoro=G.selectedInstruments.some(id=>INSTRUMENT_GROUPS['coronagraph'].includes(id));
  const coroR=hasCoro?Math.max(8,22*(1-clarity+0.3)):0;
  if (hasCoro&&clarity>0.3) {
    ctx.beginPath(); ctx.arc(cx,cy,coroR,0,Math.PI*2);
    ctx.fillStyle='rgba(0,0,0,0.92)'; ctx.fill();
    ctx.strokeStyle='rgba(126,207,237,0.2)'; ctx.lineWidth=1; ctx.stroke();
  }

  // Companion / disk
  let companionPx=-1, companionPy=-1;
  if (star.companion && clarity>0.45) {
    const va=Math.min(1,(clarity-0.45)/0.55);
    if (star.companion==='disk'||star.companion==='binary-disk') {
      _drawDisk(ctx,cx,cy,W,H,va,star.diskType||'disk');
      companionPx=cx; companionPy=cy;
    } else {
      _drawCompanion(ctx,cx,cy,W,H,va,star);
      const a=(star.companionAngle||210)*Math.PI/180;
      companionPx=cx+Math.cos(a)*Math.min(W,H)*0.28;
      companionPy=cy+Math.sin(a)*Math.min(W,H)*0.28;
    }
    svCvs._companionX=companionPx; svCvs._companionY=companionPy; svCvs._companionR=28;
  } else {
    svCvs._companionX=-1;
  }

  // CHARIS / VAMPIRES overlays
  if (G.selectedInstruments.includes('charis')&&clarity>0.5) {
    for(let i=0;i<5;i++){
      ctx.strokeStyle=`hsla(${i*72},80%,60%,0.07)`; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(cx,cy,(coroR||10)+12+i*8,0,Math.PI*2); ctx.stroke();
    }
  }
  if (G.selectedInstruments.includes('vampires')&&clarity>0.5) {
    for(let i=0;i<3;i++){
      ctx.strokeStyle=`rgba(255,80,160,${0.12-i*0.03})`; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(cx,cy,W*0.25+i*12,0,Math.PI*2); ctx.stroke();
    }
  }

  // Clarity meter
  ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(8,H-22,110,13);
  ctx.fillStyle=`hsl(${clarity*120},80%,55%)`; ctx.fillRect(8,H-22,110*clarity,13);
  ctx.fillStyle='rgba(255,255,255,0.75)'; ctx.font='8px Times New Roman';
  ctx.fillText(`Clarity: ${Math.round(clarity*100)}%`,11,H-12);

  // Instrument labels
  let ly=11;
  G.selectedInstruments.forEach(id=>{
    const instr=INSTRUMENTS[id]; if(!instr) return;
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(6,ly-9,150,13);
    ctx.fillStyle=instr.color; ctx.font='8px Times New Roman';
    ctx.fillText(`${instr.name}: ${instr.shortRole}`,8,ly); ly+=14;
  });
}

// ── Click on star view ─────────────────────────────────────
svCvs?.addEventListener('click', e => {
  if (G.observationRunning) return;
  if (_svCompanionClickable && svCvs._companionX >= 0) {
    const r  = svCvs.getBoundingClientRect();
    const mx = (e.clientX-r.left)*(svCvs.width/r.width);
    const my = (e.clientY-r.top)*(svCvs.height/r.height);
    if (Math.hypot(mx-svCvs._companionX, my-svCvs._companionY) < (svCvs._companionR||28)) {
      _svCompanionClickable=false; _stopPulse(); svCvs._companionX=-1;
      const result=evaluateObservation();
      result.discovered=true;
      G.successCount++; saveProgress();
      showRewardScreen(unlockNextInstrument(), result);
    }
  }
});
svCvs?.addEventListener('touchend',e=>{
  e.preventDefault();
  const t=e.changedTouches[0];
  svCvs.dispatchEvent(new MouseEvent('click',{clientX:t.clientX,clientY:t.clientY}));
},{passive:false});

// ── Drawing helpers ────────────────────────────────────────
function _drawDisk(ctx,cx,cy,W,H,a,type){
  const r=Math.min(W,H)*0.30;
  if (type==='spiral') {
    for(let arm=0;arm<2;arm++){
      ctx.beginPath(); ctx.strokeStyle=`rgba(200,180,100,${a*0.6})`; ctx.lineWidth=3;
      for(let t=0;t<Math.PI*3;t+=0.06){
        const sr=r*0.25+r*0.6*(t/(Math.PI*3)), aa=t+arm*Math.PI;
        const x=cx+Math.cos(aa)*sr, y=cy+Math.sin(aa)*sr*0.35;
        t===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
      }
      ctx.stroke();
    }
  } else {
    ctx.beginPath(); ctx.strokeStyle=`rgba(200,180,100,${a*0.7})`; ctx.lineWidth=4;
    ctx.ellipse(cx,cy,r,r*0.28,0.15,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle=`rgba(10,8,20,${a*0.8})`; ctx.lineWidth=8;
    ctx.ellipse(cx,cy,r*0.55,r*0.55*0.28,0.15,0,Math.PI*2); ctx.stroke();
  }
}

function _drawCompanion(ctx,cx,cy,W,H,a,star){
  const angle=(star.companionAngle||210)*Math.PI/180;
  const dist=Math.min(W,H)*0.28;
  const px=cx+Math.cos(angle)*dist, py=cy+Math.sin(angle)*dist;
  const col=star.companionColor||'#cc88ff';
  const [r,g,b]=[parseInt(col.slice(1,3),16),parseInt(col.slice(3,5),16),parseInt(col.slice(5,7),16)];
  const cg=ctx.createRadialGradient(px,py,0,px,py,14);
  cg.addColorStop(0,`rgba(${r},${g},${b},${a})`);
  cg.addColorStop(.5,`rgba(${r},${g},${b},${a*0.4})`);
  cg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.arc(px,py,14,0,Math.PI*2); ctx.fillStyle=cg; ctx.fill();
  ctx.beginPath(); ctx.arc(px,py,3,0,Math.PI*2);
  ctx.fillStyle=`rgba(${r},${g},${b},${a})`; ctx.fill();
}