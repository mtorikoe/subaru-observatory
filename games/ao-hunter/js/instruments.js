/* ============================================================
   instruments.js — carousel, pallet, construction view,
                    instrument pictures
   ============================================================ */

let carouselOffset = 0;
const VISIBLE_SLOTS = 3.5;

// ── CAROUSEL ───────────────────────────────────────────────
function renderInstrumentCarousel() {
  const rail    = document.getElementById('carousel-rail');
  const leftBtn = document.getElementById('carousel-left');
  const rightBtn= document.getElementById('carousel-right');
  if (!rail) return;
  rail.innerHTML = '';

  const available = PALLET_ORDER.filter(id => G.unlockedInstruments.includes(id));

  available.forEach(id => {
    const instr      = INSTRUMENTS[id];
    const isSelected = G.selectedInstruments.includes(id);
    const card       = document.createElement('div');
    card.className   = 'instr-card' + (isSelected ? ' selected' : '');
    card.dataset.id  = id;
    card.innerHTML   = `
      <div class="instr-year">${instr.year}</div>
      <div class="instr-icon-wrap" style="border-color:${instr.color}55;">
        <canvas class="instr-pic" data-id="${id}" width="130" height="64"></canvas>
      </div>
      <div class="instr-name">${instr.name}</div>
    `;
    card.addEventListener('click', () => {
      toggleInstrument(id);
    });
    rail.appendChild(card);
    const pic = card.querySelector('.instr-pic');
    if (pic) setTimeout(() => drawInstrumentPicture(pic, id, isSelected), 0);
  });

  leftBtn.style.opacity  = carouselOffset > 0 ? '1' : '0.25';
  rightBtn.style.opacity = carouselOffset < available.length - Math.ceil(VISIBLE_SLOTS) ? '1' : '0.25';
  const cardW = rail.querySelector('.instr-card')?.offsetWidth || 140;
  rail.scrollLeft = carouselOffset * (cardW + 10);
  renderInstrumentDescription();
}

function carouselLeft() {
  carouselOffset = Math.max(0, carouselOffset - 1);
  renderInstrumentCarousel();
}
function carouselRight() {
  const available = PALLET_ORDER.filter(id => G.unlockedInstruments.includes(id));
  carouselOffset  = Math.min(available.length - Math.ceil(VISIBLE_SLOTS), carouselOffset + 1);
  renderInstrumentCarousel();
}

function renderInstrumentDescription() {
  const box = document.getElementById('instr-desc');
  if (!box) return;
  const instr = G.lastPicked && INSTRUMENTS[G.lastPicked];
  if (!instr) {
    box.innerHTML = '<span class="desc-empty">Click an instrument to see what it does.</span>';
    return;
  }
  const kid = (typeof KID_DESC !== 'undefined' && KID_DESC[G.lastPicked]) || instr.short || instr.shortRole;
  box.innerHTML = `<div class="desc-text">${kid}</div>`;
}

// ── INSTRUMENT PALLET (order column, upper right) ──────────
function renderInstrumentPallet() {
  const col = document.getElementById('pallet-col');
  if (!col) return;
  // Keep the label
  col.innerHTML = '<div class="pallet-label">Build order</div>';

  if (G.selectedInstruments.length === 0) {
    col.innerHTML += '<div class="pallet-empty">Choose instruments below</div>';
    return;
  }
  G.selectedInstruments.forEach((id, idx) => {
    const instr  = INSTRUMENTS[id];
    // Highlight: active when observation running and this step is current
    const active = G.observationRunning && idx === observationStep;
    const done   = G.observationRunning && idx < observationStep;
    const item   = document.createElement('div');
    item.className = 'pallet-item' + (active ? ' pallet-active' : done ? ' pallet-done' : '');
    item.style.borderColor = instr.color;
    if (active) item.style.background = instr.color + '22';
    item.innerHTML = `
      <div class="pallet-num" style="color:${instr.color}">${idx+1}</div>
      <div class="pallet-icon">${instr.icon}</div>
      <div class="pallet-name">${instr.name}</div>
      ${active ? '<div class="pallet-active-label">▶ Active</div>' : ''}
    `;
    col.appendChild(item);
  });

  const resetBtn = document.createElement('button');
  resetBtn.className   = 'pallet-reset';
  resetBtn.textContent = 'Reset telescope';
  resetBtn.onclick     = () => {
    G.selectedInstruments = [];
    G.lastPicked = null;
    renderInstrumentPallet();
    renderInstrumentCarousel();
    renderConstructionView();
    onInstrumentsChanged(); 
  };
  col.appendChild(resetBtn);
}

// ── OBSERVATION ANIMATION ──────────────────────────────────
let observationStep = -1;
let _obsSafetyTimer = null;

function animateObservationSteps(onDone) {
  observationStep = -1;
  const steps = Math.max(1, G.selectedInstruments.length);
  const perStep = 420;
  const totalMs = steps * perStep + 400;

  G.observationRunning = true;
  _drawObservingLabel();

  // Safety net: if something goes wrong, always call onDone
  if (_obsSafetyTimer) clearTimeout(_obsSafetyTimer);
  _obsSafetyTimer = setTimeout(() => {
    G.observationRunning = false;
    observationStep = -1;
    renderInstrumentPallet();
    if (onDone) onDone();
  }, totalMs + 1000);

  function next() {
    observationStep++;
    try { renderConstructionView(); } catch(e) { /* never block */ }
    try { renderInstrumentPallet(); } catch(e) {}
    if (observationStep < steps - 1) {
      setTimeout(next, perStep);
    } else {
      setTimeout(() => {
        clearTimeout(_obsSafetyTimer);
        G.observationRunning = false;
        observationStep = -1;
        try { renderInstrumentPallet(); } catch(e) {}
        if (onDone) onDone();
      }, 350);
    }
  }
  next();
}

function _drawObservingLabel() {
  const cvs = document.getElementById('sv-canvas');
  if (!cvs) return;
  // Read from parent — never assign to cvs.width/height here
  const parent = cvs.parentElement;
  const W = (parent && parent.offsetWidth  > 10) ? parent.offsetWidth  : (cvs.width  || 300);
  const H = (parent && parent.offsetHeight > 10) ? parent.offsetHeight : (cvs.height || 260);
  // Only resize if needed, avoid clearing a valid canvas
  if (cvs.width !== W || cvs.height !== H) { cvs.width = W; cvs.height = H; }
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#040810'; ctx.fillRect(0,0,W,H);
  const cx=W/2, cy=H/2;
  const g=ctx.createRadialGradient(cx,cy,0,cx,cy,W*0.35);
  g.addColorStop(0,'rgba(255,230,160,0.55)');
  g.addColorStop(.4,'rgba(200,100,60,0.25)');
  g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.arc(cx,cy,W*0.35,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
  ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,cy-22,W,40);
  ctx.fillStyle='rgba(126,207,237,0.9)'; ctx.font='bold 14px Times New Roman';
  ctx.textAlign='center';
  ctx.fillText('Observing…', cx, cy+6);
  ctx.textAlign='left';
}

/* ============================================================
   INSTRUMENT PICTURE DRAWING — card thumbnails
   Suprime-Cam/HSC → flat primary plate + zigzag supports
   All others       → mini tube stub + coloured box at port
   ============================================================ */

const _imgCache = {};

function drawCover(ctx, img, W, H) {            // fill the canvas, crop the overflow
  const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const w = img.naturalWidth * s, h = img.naturalHeight * s;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

function drawInstrumentPicture(cvs, id, selected) {
  const W = cvs.width, H = cvs.height;
  const ctx = cvs.getContext('2d');
  const col = INSTRUMENTS[id]?.color || '#7ecfed';
  ctx.fillStyle = '#080f1e'; ctx.fillRect(0, 0, W, H);

  const src = INSTRUMENTS[id]?.image;
  if (src) {
    let img = _imgCache[id];
    if (!img) { img = _imgCache[id] = new Image(); img.src = src; }
    if (!img.complete) {                         // still loading: redraw when done or failed
      const redraw = () => drawInstrumentPicture(cvs, id, selected);
      img.addEventListener('load',  redraw, { once:true });
      img.addEventListener('error', redraw, { once:true });
      return;
    }
    if (img.naturalWidth) { drawCover(ctx, img, W, H); return; }
    // load failed: fall through to the drawn version
  }
  drawBoxInstrument(ctx, W, H, col, id, selected);
}


// ── Box instrument: mini stub + coloured box at port ───────
const THUMB_SIDE = { irnas:'left', optnas:'right', cass:'bottom', prime:'bottom' };

const BOX_LABELS = {
  'suprime-cam':'SupCam','hsc':'HSC','fmos':'FMOS',
  'hds':'HDS','ird':'IRD','pfs':'PFS',
  'moircs':'MOIRCS','ircs':'IRCS','focas':'FOCAS','comics':'COMICS',
  'ao36':'AO36','ao188':'AO188','ao3k':'AO3K',
  'ciao':'CIAO','hiciao':'HiCIAO','scexao':'SCExAO',
  'charis':'CHARIS','vampires':'VAMP','focus':'FOCUS',
};

function drawBoxInstrument(ctx, W, H, col, id, sel) {
  const mount = MOUNT_OF[id];
  const side  = THUMB_SIDE[mount] || 'right';
  const cx    = W*0.5, cy = H*0.5;

  // Mini telescope stub
  const tubeW=W*0.12, tubeH=H*0.38;
  const tubeX=cx-tubeW/2, tubeY=cy-tubeH*0.55;
  ctx.fillStyle='#1a3a5c';
  ctx.fillRect(tubeX,tubeY,tubeW,tubeH);
  ctx.strokeStyle='#2e6080'; ctx.lineWidth=1;
  ctx.strokeRect(tubeX,tubeY,tubeW,tubeH);

  const boxW=W*0.30, boxH=H*0.34, portL=W*0.07;
  let bx,by;

  ctx.fillText(PORTS[mount]?.label || '', bx+boxW/2, H-3);
  ctx.textAlign='left';
}

/* ============================================================
   ASSEMBLED TELESCOPE CONSTRUCTION VIEW
   Core telescope = flat primary plate + zigzag supports
   Instrument boxes attached at correct ports
   ============================================================ */

function renderConstructionView() {
  const cvs = document.getElementById('construction-canvas');
  if (!cvs) return;
  const W = cvs.width  = cvs.offsetWidth  || 240;
  const H = cvs.height = cvs.offsetHeight || 200;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#050c18'; ctx.fillRect(0, 0, W, H);

  // background picture (skipped if it failed to load)
  if (_bgImg.complete && _bgImg.naturalWidth) {
    drawCover(ctx, _bgImg, W, H);
    ctx.fillStyle = 'rgba(5,12,24,0.45)';        // dark veil so the telescope stays readable
    ctx.fillRect(0, 0, W, H);
  }

  drawSubaruTelescope(ctx, W, H, G.selectedInstruments);
}

const TELESCOPE_COLOR = '#4a90d9';   // pick your blue

const CONSTRUCTION_BG = '/assets/telescope-bg.jpg';   // index.html からの相対パス
const _bgImg = new Image();
_bgImg.src = CONSTRUCTION_BG;
_bgImg.addEventListener('load', () => renderConstructionView());   // 読み込み後に再描画

// Port slots in design units (100x100 space). dir: -1 = stack upward, +1 = downward
const PORTS = {
  prime:  { label:'Prime Focus',  x:36, y:18, w:28, h:11, dir:-1 },
  irnas:  { label:'IR Nasmyth',   x:1,  y:54, w:28, h:10, dir:-1 },
  optnas: { label:'Opt Nasmyth',  x:71, y:54, w:28, h:10, dir:-1 },
  cass:   { label:'Cassegrain',   x:38, y:69, w:24, h:10, dir: 1 },
};

function drawSubaruTelescope(ctx, W, H, ids, opts = {}) {
  const thumb = !!opts.thumb;
  const body = TELESCOPE_COLOR;
  const k  = Math.min(W * 0.62, H * 0.98) / 100;   // design unit -> pixels
  const ox = (W - 100 * k) / 2, oy = H - 97 * k;
  const lw = px => px / k;                           // line width in pixels

  // ---------- fixed telescope body (always drawn) ----------
  const LINE = 2.2;     // main line thickness in pixels (was 1.3)
  ctx.save();
  ctx.translate(ox, oy); ctx.scale(k, k);
  ctx.strokeStyle = body; ctx.fillStyle = body + '18'; ctx.lineWidth = lw(1.3);

  // base
  ctx.beginPath(); ctx.ellipse(50, 91, 38, 5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // fork legs
  for (const x of [27, 69]) { ctx.fillRect(x-3, 52, 6, 38); ctx.strokeRect(x-3, 52, 6, 38); }
  // Nasmyth platforms
  ctx.fillRect(0, 54, 30, 3);  ctx.strokeRect(0, 54, 30, 3);
  ctx.fillRect(70, 54, 30, 3); ctx.strokeRect(70, 54, 30, 3);
  // tube edges
  ctx.beginPath();
  ctx.moveTo(35,23); ctx.lineTo(33,60); ctx.moveTo(65,23); ctx.lineTo(67,60); ctx.stroke();
  
  // truss zigzag (vertical): mirror edge <-> ring edge, around the circumference
  const RING = { cx:50, cy:22, rx:15, ry:4   };   // top ring ellipse
  const MIR  = { cx:50, cy:61, rx:15, ry:4.2 };   // primary mirror ellipse
  const PAIRS = 6;                                 // number of up+down pairs
  const SEG   = PAIRS * 2;                         // total strut count
  const ptOn = (E, th) => [E.cx + Math.cos(th)*E.rx, E.cy + Math.sin(th)*E.ry];

  for (let i = 0; i < SEG; i++) {
    const th0 = (i   / SEG) * Math.PI * 2;         // angle at start (0 = right edge)
    const th1 = ((i+1) / SEG) * Math.PI * 2;       // angle at end
    const up  = i % 2 === 0;                       // even: mirror -> ring, odd: ring -> mirror
    const [x0, y0] = ptOn(up ? MIR : RING, th0);
    const [x1, y1] = ptOn(up ? RING : MIR, th1);
    const front = Math.sin((th0 + th1) / 2) > 0;   // sin>0 = near side (lower half of ellipse)
    ctx.strokeStyle = body + (front ? 'bb' : '44');   // back struts dimmer
    ctx.lineWidth   = lw(front ? 1.1 : 0.8);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  ctx.strokeStyle = body; ctx.lineWidth = lw(1.3);   // restore for following parts

  ctx.strokeStyle = body;
  // top ring + spider
  ctx.beginPath(); ctx.ellipse(50, 22, 15, 4, 0, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(36,20); ctx.lineTo(64,24); ctx.moveTo(36,24); ctx.lineTo(64,20);
  ctx.moveTo(50,18); ctx.lineTo(50,22);            // hub stem for Prime Focus
  ctx.stroke();
  // primary mirror cell + mirror + segment lines
  ctx.beginPath(); ctx.ellipse(50, 62, 19, 6, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(50, 61, 15, 4.2, 0, 0, Math.PI*2);
  ctx.fillStyle = body + '33'; ctx.fill(); ctx.stroke();
  ctx.strokeStyle = body + '44'; ctx.lineWidth = lw(0.8);
  for (let i = 0; i < 6; i++) {
    const a = i/6 * Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(50 + Math.cos(a)*3, 61 + Math.sin(a)*0.28*3);
    ctx.lineTo(50 + Math.cos(a)*14.5, 61 + Math.sin(a)*4);
    ctx.stroke();
  }
  ctx.restore();

  // ---------- instrument boxes at their ports ----------
  ctx.textAlign = 'center';
  Object.entries(PORTS).forEach(([key, p]) => {
    const list = ids.filter(id => MOUNT_OF[id] === key);
    const n = Math.max(1, list.length);
    let h = Math.min(p.h, 44 / n);
    let px = p.x, pw = p.w;
    if (thumb && key === 'prime') { px = 30; pw = 40; h = 16; }   // bigger in small thumbnails

    // empty port: dashed placeholder + label
    if (!list.length && !thumb) {
      const y = p.dir < 0 ? p.y - h : p.y;
      ctx.setLineDash([3,3]); ctx.strokeStyle = '#2a4a6c'; ctx.lineWidth = 1;
      ctx.strokeRect(ox + px*k, oy + y*k, pw*k, h*k); ctx.setLineDash([]);
      ctx.fillStyle = '#3a6a88'; ctx.font = '8px Times New Roman';
      ctx.fillText(p.label, ox + (px + pw/2)*k, oy + (y + h/2)*k + 3, pw*k);
    }

    list.forEach((id, i) => {
      const y   = p.dir < 0 ? p.y - (i+1)*h - i*1.5 : p.y + i*(h + 1.5);
      const sx = ox + px*k, sy = oy + y*k, sw = pw*k, sh = h*k;
      const col = INSTRUMENTS[id].color;
      const step   = G.selectedInstruments.indexOf(id);
      const active = !thumb && G.observationRunning && step === observationStep;
      const done   = !thumb && G.observationRunning && step < observationStep;
      const lit = active || done || thumb;

      ctx.fillStyle   = active ? col+'44' : lit ? col+'22' : col+'14';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeStyle = active ? col : lit ? col+'cc' : col+'88';
      ctx.lineWidth   = active ? 2 : 1.2;
      if (active) { ctx.shadowColor = col; ctx.shadowBlur = 8; }
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.shadowBlur = 0;

      const label = BOX_LABELS[id] || INSTRUMENTS[id].name;
      ctx.fillStyle = active ? '#fff' : col;
      ctx.font = `${active ? 'bold ' : ''}${Math.max(6, Math.min(10, sh*0.6))}px Times New Roman`;
      ctx.fillText(thumb ? label : `${step+1}. ${label}`, sx + sw/2, sy + sh*0.65, sw - 2);
    });
  });
  ctx.textAlign = 'left';
}