/* ============================================================
   starview.js — targeted star picture (upper middle)
   - Shows blurry star initially (before Observe is clicked)
   - Clears progressively only after observation runs
   - Companion/disk shows a clickable confirmation prompt
   ============================================================ */

const svCvs = document.getElementById('sv-canvas');

// Track whether observation has been run for the current star
// (separate from G.observationComplete so re-selecting a star resets it)
let _svClarity = 0;         // 0 = fully blurry (pre-observe)
let _svObserved = false;    // true once observation animation completes
let _svCompanionClickable = false;  // true when companion visible and awaiting confirm

function resetStarView() {
  _svClarity = 0;
  _svObserved = false;
  _svCompanionClickable = false;
  _stopPulse();
}

// Dedicated low-overhead RAF loop just for the pulsing ring
let _pulseLoopId = null;
function _startPulse() {
  if (_pulseLoopId) return;
  function tick() {
    if (!_svCompanionClickable) { _pulseLoopId = null; return; }
    // Re-render the star view (which includes the ring drawing)
    renderStarView();
    _pulseLoopId = requestAnimationFrame(tick);
  }
  _pulseLoopId = requestAnimationFrame(tick);
}
function _stopPulse() {
  if (_pulseLoopId) { cancelAnimationFrame(_pulseLoopId); _pulseLoopId = null; }
}

function revealStarView(clarity) {
  _svClarity = clarity;
  _svObserved = true;
  renderStarView();
  // Check if companion/disk is visible — prompt player to click it
  if (G.selectedStar && (G.selectedStar.companion || G.selectedStar.planetVisible) && clarity > 0.45) {
    _svCompanionClickable = true;
    updateInstructions(4);
    _startPulse();          // begins the pulsing ring animation
  }
}

function renderStarView() {
  if (!svCvs) return;
  const W = svCvs.width  = svCvs.offsetWidth  || svCvs.parentElement?.offsetWidth || 300;
  const H = svCvs.height = svCvs.offsetHeight || svCvs.parentElement?.offsetHeight || 260;
  const ctx = svCvs.getContext('2d');

  if (!G.selectedStar) {
    ctx.fillStyle = '#040810'; ctx.fillRect(0,0,W,H);
    return;
  }

  const star    = G.selectedStar;
  // Before observation: always show fully blurry
  // After observation: use evaluated clarity
  const clarity = _svObserved ? _svClarity : 0;
  const blur    = Math.max(0, 1 - clarity);

  ctx.fillStyle = '#040810'; ctx.fillRect(0,0,W,H);
  const cx = W/2, cy = H/2;

  // ── Atmospheric blurring PSF ──────────────────────────────
  const psfR = 8 + blur * 60;
  const g1 = ctx.createRadialGradient(cx,cy,0, cx,cy,psfR*4);
  g1.addColorStop(0,   `rgba(255,240,180,${0.9 - blur*0.3})`);
  g1.addColorStop(0.3, `rgba(255,150,80, ${0.6 - blur*0.2})`);
  g1.addColorStop(0.7, `rgba(80,20,100,  ${0.2 * clarity})`);
  g1.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.arc(cx,cy,psfR*4,0,Math.PI*2);
  ctx.fillStyle=g1; ctx.fill();

  // ── Speckle halo ─────────────────────────────────────────
  if (_svObserved && blur > 0.1 && clarity > 0.1) {
    const n = Math.floor(blur * 18);
    for (let i=0;i<n;i++) {
      const angle = Math.random()*Math.PI*2;
      const dist  = (0.3+Math.random()*0.5)*psfR*3;
      const sx=cx+Math.cos(angle)*dist, sy=cy+Math.sin(angle)*dist;
      const sg=ctx.createRadialGradient(sx,sy,0,sx,sy,6+blur*8);
      sg.addColorStop(0,`rgba(200,100,50,${blur*0.4})`);
      sg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(sx,sy,6+blur*8,0,Math.PI*2);
      ctx.fillStyle=sg; ctx.fill();
    }
  }

  // ── Pre-observe label (only when not running and not yet observed) ──
  if (!_svObserved) {
    if (!G.observationRunning) {
      ctx.fillStyle='rgba(0,0,0,0.45)';
      ctx.fillRect(0, cy - 18, W, 36);
      ctx.fillStyle='rgba(240,192,96,0.85)'; ctx.font='bold 13px Times New Roman';
      ctx.textAlign='center';
      ctx.fillText('Build your telescope, then click Observe', cx, cy+5);
      ctx.textAlign='left';
    }
    // During observation: star view stays dark/blurry with no text
    return;
  }

  // ── Coronagraph mask ──────────────────────────────────────
  const hasCoro = G.selectedInstruments.some(id=>INSTRUMENT_GROUPS['coronagraph'].includes(id));
  const coroR   = hasCoro ? Math.max(8, 22*(1-clarity+0.3)) : 0;
  if (hasCoro && clarity > 0.3) {
    ctx.beginPath(); ctx.arc(cx,cy,coroR,0,Math.PI*2);
    ctx.fillStyle='rgba(0,0,0,0.92)'; ctx.fill();
    ctx.strokeStyle='rgba(126,207,237,0.25)'; ctx.lineWidth=1; ctx.stroke();
  }

  // ── Companion / disk ─────────────────────────────────────
  let companionPx=-1, companionPy=-1;
  if (star.companion && clarity > 0.45) {
    const visAlpha = Math.min(1,(clarity-0.45)/0.55);
    if (star.companion==='disk'||star.companion==='binary-disk') {
      drawDisk(ctx,cx,cy,W,H,visAlpha,star.diskType||'disk');
      // Disk centre as click target
      companionPx=cx; companionPy=cy;
    } else {
      drawCompanion(ctx,cx,cy,W,H,visAlpha,star);
      const angle=(star.companionAngle||210)*Math.PI/180;
      const dist=Math.min(W,H)*0.28;
      companionPx=cx+Math.cos(angle)*dist;
      companionPy=cy+Math.sin(angle)*dist;
    }
    // Store for click detection
    svCvs._companionX = companionPx;
    svCvs._companionY = companionPy;
    svCvs._companionR = 28;

    // Pulsing ring prompt when clickable — drawn each frame by _pulseLoop
    if (_svCompanionClickable) {
      const pulse=(Date.now()%1200)/1200;
      const pR=20+pulse*14;
      ctx.beginPath(); ctx.arc(companionPx,companionPy,pR,0,Math.PI*2);
      ctx.strokeStyle=`rgba(240,192,96,${0.8-pulse*0.6})`; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle='rgba(0,0,0,0.6)';
      ctx.fillRect(companionPx-60,companionPy+22,120,18);
      ctx.fillStyle='#f0c060'; ctx.font='bold 11px Times New Roman';
      ctx.textAlign='center';
      ctx.fillText('Click the companion!',companionPx,companionPy+34);
      ctx.textAlign='left';
    }
  } else {
    svCvs._companionX=-1;
  }

  // ── CHARIS rainbow tint ───────────────────────────────────
  const hasCharis=G.selectedInstruments.includes('charis');
  if (hasCharis&&clarity>0.5) {
    for(let i=0;i<5;i++){
      ctx.strokeStyle=`hsla(${i*72},80%,60%,0.08)`;
      ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(cx,cy,(coroR||10)+12+i*8,0,Math.PI*2); ctx.stroke();
    }
  }

  // ── VAMPIRES polarisation rings ───────────────────────────
  const hasVamp=G.selectedInstruments.includes('vampires');
  if(hasVamp&&clarity>0.5){
    for(let i=0;i<3;i++){
      ctx.strokeStyle=`rgba(255,80,160,${0.15-i*0.03})`;
      ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(cx,cy,W*0.25+i*12,0,Math.PI*2); ctx.stroke();
    }
  }

  // ── Clarity meter ─────────────────────────────────────────
  ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(8,H-22,120,14);
  ctx.fillStyle=`hsl(${clarity*120},80%,55%)`;
  ctx.fillRect(8,H-22,120*clarity,14);
  ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.font='9px Times New Roman';
  ctx.fillText(`Image clarity: ${Math.round(clarity*100)}%`,12,H-11);

  // ── Active instrument labels ───────────────────────────────
  let labelY=12;
  G.selectedInstruments.forEach(id=>{
    const instr=INSTRUMENTS[id]; if(!instr) return;
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(8,labelY-10,160,14);
    ctx.fillStyle=instr.color; ctx.font='9px Times New Roman';
    ctx.fillText(`${instr.name}: ${instr.shortRole}`,10,labelY);
    labelY+=16;
  });
}

// ── Star view click — companion confirmation ───────────────
svCvs?.addEventListener('click', e => {
  if (G.observationRunning) return;

  // Companion confirmation click
  if (_svCompanionClickable && svCvs._companionX >= 0) {
    const r = svCvs.getBoundingClientRect();
    const mx=(e.clientX-r.left)*(svCvs.width/r.width);
    const my=(e.clientY-r.top)*(svCvs.height/r.height);
    const dist=Math.hypot(mx-svCvs._companionX, my-svCvs._companionY);
    if (dist < (svCvs._companionR||28)) {
      _svCompanionClickable=false;
      _stopPulse();
      svCvs._companionX=-1;
      // Player confirmed the companion — trigger reward flow
      const result=evaluateObservation();
      result.discovered=true;
      G.successCount++;
      saveProgress();
      const newInstr=unlockNextInstrument();
      showRewardScreen(newInstr, result);
      return;
    }
  }

  // Regular click — trigger observation if not yet observed
  if (!_svObserved && G.selectedStar && !G.observationRunning) {
    triggerObservation();
  }
});
svCvs?.addEventListener('touchend',e=>{
  e.preventDefault();
  const t=e.changedTouches[0];
  svCvs.dispatchEvent(new MouseEvent('click',{clientX:t.clientX,clientY:t.clientY}));
},{passive:false});

// ── Disk drawing ──────────────────────────────────────────
function drawDisk(ctx,cx,cy,W,H,alpha,type){
  const r=Math.min(W,H)*0.32;
  if(type==='spiral'){
    for(let arm=0;arm<2;arm++){
      ctx.beginPath();
      ctx.strokeStyle=`rgba(200,180,100,${alpha*0.6})`;
      ctx.lineWidth=3;
      for(let t=0;t<Math.PI*3;t+=0.05){
        const sr=r*0.25+r*0.6*(t/(Math.PI*3));
        const a=t+arm*Math.PI;
        const x=cx+Math.cos(a)*sr, y=cy+Math.sin(a)*sr*0.35;
        t===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
      }
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.strokeStyle=`rgba(200,180,100,${alpha*0.7})`;
    ctx.lineWidth=4;
    ctx.ellipse(cx,cy,r,r*0.28,0.15,0,Math.PI*2); ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle=`rgba(10,8,20,${alpha*0.8})`;
    ctx.lineWidth=8;
    ctx.ellipse(cx,cy,r*0.55,r*0.55*0.28,0.15,0,Math.PI*2); ctx.stroke();
  }
}

function drawCompanion(ctx,cx,cy,W,H,alpha,star){
  const angle=(star.companionAngle||210)*Math.PI/180;
  const dist=Math.min(W,H)*0.28;
  const px=cx+Math.cos(angle)*dist, py=cy+Math.sin(angle)*dist;
  const col=star.companionColor||'#cc88ff';
  const cg=ctx.createRadialGradient(px,py,0,px,py,12);
  cg.addColorStop(0,`rgba(${hexToRgb(col)},${alpha})`);
  cg.addColorStop(.5,`rgba(${hexToRgb(col)},${alpha*0.4})`);
  cg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.arc(px,py,12,0,Math.PI*2); ctx.fillStyle=cg; ctx.fill();
  ctx.beginPath(); ctx.arc(px,py,3,0,Math.PI*2);
  ctx.fillStyle=`rgba(${hexToRgb(col)},${alpha})`; ctx.fill();
}

function hexToRgb(hex){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}