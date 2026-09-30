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
      <div class="instr-role">${instr.description.slice(0,80)}…</div>
    `;
    card.addEventListener('click', () => {
      toggleInstrument(id);
      renderStarView();
    });
    rail.appendChild(card);
    const pic = card.querySelector('.instr-pic');
    if (pic) setTimeout(() => drawInstrumentPicture(pic, id, isSelected), 0);
  });

  leftBtn.style.opacity  = carouselOffset > 0 ? '1' : '0.25';
  rightBtn.style.opacity = carouselOffset < available.length - Math.ceil(VISIBLE_SLOTS) ? '1' : '0.25';
  const cardW = rail.querySelector('.instr-card')?.offsetWidth || 140;
  rail.scrollLeft = carouselOffset * (cardW + 10);
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
    renderInstrumentPallet();
    renderInstrumentCarousel();
    renderConstructionView();
    renderStarView();
  };
  col.appendChild(resetBtn);
}

// ── OBSERVATION ANIMATION ──────────────────────────────────
let observationStep = -1;

function animateObservationSteps(onDone) {
  observationStep = -1;
  const steps = G.selectedInstruments.length;
  _drawObservingLabel();
  G.observationRunning = true;

  function next() {
    observationStep++;
    renderConstructionView();
    renderInstrumentPallet();   // highlight current step in pallet
    if (observationStep < steps - 1) {
      setTimeout(next, 420);
    } else {
      setTimeout(() => {
        G.observationRunning = false;
        observationStep = -1;
        renderInstrumentPallet();  // clear highlight
        if (onDone) onDone();
      }, 350);
    }
  }
  next();
}

function _drawObservingLabel() {
  const cvs = document.getElementById('sv-canvas');
  if (!cvs) return;
  const W = cvs.offsetWidth || 300, H = cvs.offsetHeight || 260;
  cvs.width = W; cvs.height = H;
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

function drawInstrumentPicture(cvs, id, selected) {
  const W = cvs.width, H = cvs.height;
  const ctx = cvs.getContext('2d');
  const instr = INSTRUMENTS[id];
  const col   = instr ? instr.color : '#7ecfed';
  ctx.fillStyle = '#080f1e'; ctx.fillRect(0,0,W,H);
  if (id === 'suprime-cam' || id === 'hsc') {
    drawTelescopePicture(ctx, W, H, col, id === 'hsc', selected);
  } else {
    drawBoxInstrument(ctx, W, H, col, id, selected);
  }
}

// ── Suprime-Cam / HSC telescope drawing ────────────────────
// 8.2m circular primary mirror, straight support posts in
// zigzag ring pattern, thin foundation block, Cassegrain
// stair block + Nasmyth platforms on left and right.
function drawTelescopePicture(ctx, W, H, col, isHSC, sel) {
  ctx.save();
  ctx.lineWidth = 1.3;
  ctx.shadowBlur = 4; ctx.shadowColor = col + '66';
  const cx = W*0.50, cy = H*0.46;

  // ── Primary mirror: circular dish ──────────────────────
  const pR  = Math.min(W,H) * 0.26;
  const pCy = cy + H*0.10;   // vertical centre of primary
  ctx.beginPath(); ctx.arc(cx, pCy, pR, 0, Math.PI*2);
  ctx.fillStyle=col+'14'; ctx.fill();
  ctx.strokeStyle=col; ctx.lineWidth=1.8; ctx.stroke();
  // Inner ring (secondary obscuration outline)
  ctx.beginPath(); ctx.arc(cx, pCy, pR*0.18, 0, Math.PI*2);
  ctx.strokeStyle=col+'55'; ctx.lineWidth=1; ctx.stroke();
  // Radial segment lines
  for (let i=0;i<6;i++) {
    const a = (i/6)*Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(a)*pR*0.2, pCy+Math.sin(a)*pR*0.2);
    ctx.lineTo(cx+Math.cos(a)*pR*0.95, pCy+Math.sin(a)*pR*0.95);
    ctx.strokeStyle=col+'33'; ctx.lineWidth=0.8; ctx.stroke();
  }

  // ── Focal point (secondary / camera) above mirror ──────
  const focalY = pCy - H*0.38;
  const focalR = isHSC ? pR*0.20 : pR*0.14;
  ctx.beginPath(); ctx.arc(cx, focalY, focalR, 0, Math.PI*2);
  ctx.fillStyle=col+'44'; ctx.fill();
  ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.stroke();
  ctx.fillStyle=col; ctx.font=`bold ${Math.round(focalR*0.9)}px Times New Roman`;
  ctx.textAlign='center';
  ctx.fillText(isHSC?'HSC':'CAM', cx, focalY+focalR*0.35);

  // ── Support posts: straight, placed in zigzag ring ──────
  // Posts alternate between two radii to form zigzag when
  // viewed from above — they are drawn as straight verticals.
  const nPosts = 8;
  const rInner = pR*0.52, rOuter = pR*0.82;
  for (let i=0;i<nPosts;i++) {
    const angle = (i/nPosts)*Math.PI*2 - Math.PI/2;
    const r     = i%2===0 ? rInner : rOuter;
    const bx    = cx + Math.cos(angle)*r;
    const by    = pCy + Math.sin(angle)*r*0.28;  // foreshortened y
    // Straight vertical post from primary surface to focal ring
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(cx, focalY);
    ctx.strokeStyle = col + (i%2===0?'88':'55');
    ctx.lineWidth=1; ctx.stroke();
    // Post base dot on mirror
    ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI*2);
    ctx.fillStyle=col+'99'; ctx.fill();
  }

  // ── Thin wide foundation block ──────────────────────────
  const foundW=pR*2.4, foundH=H*0.045;
  const foundY=pCy+pR*0.32;
  ctx.fillStyle=col+'22';
  ctx.fillRect(cx-foundW/2, foundY, foundW, foundH);
  ctx.strokeStyle=col+'88'; ctx.lineWidth=1;
  ctx.strokeRect(cx-foundW/2, foundY, foundW, foundH);

  // ── Cassegrain focus: stair-step block on right side ────
  const csX  = cx + pR*0.9;
  const csY  = pCy + pR*0.12;
  const step = H*0.03;
  for (let s=0;s<3;s++) {
    ctx.fillStyle=col+'18';
    ctx.fillRect(csX+s*step*0.6, csY+s*step, step*2, step);
    ctx.strokeStyle=col+'55'; ctx.lineWidth=0.8;
    ctx.strokeRect(csX+s*step*0.6, csY+s*step, step*2, step);
  }
  ctx.fillStyle=col+'66'; ctx.font='7px Times New Roman'; ctx.textAlign='center';
  ctx.fillText('Cass.', csX+step*1.8, csY+step*3.8);

  // ── Two Nasmyth platforms (left and right) ──────────────
  const nW=pR*0.55, nH=H*0.06;
  const nY=pCy-pR*0.08;
  // Left Nasmyth
  ctx.fillStyle=col+'1a';
  ctx.fillRect(cx-pR-nW, nY, nW, nH);
  ctx.strokeStyle=col+'66'; ctx.lineWidth=0.8;
  ctx.strokeRect(cx-pR-nW, nY, nW, nH);
  ctx.fillStyle=col+'66'; ctx.font='7px Times New Roman'; ctx.textAlign='center';
  ctx.fillText('Nasmyth L', cx-pR-nW/2, nY+nH*0.65);
  // Right Nasmyth
  ctx.fillStyle=col+'1a';
  ctx.fillRect(cx+pR, nY, nW, nH);
  ctx.strokeStyle=col+'66'; ctx.lineWidth=0.8;
  ctx.strokeRect(cx+pR, nY, nW, nH);
  ctx.fillStyle=col+'66'; ctx.font='7px Times New Roman'; ctx.textAlign='center';
  ctx.fillText('Nasmyth R', cx+pR+nW/2, nY+nH*0.65);

  ctx.shadowBlur=0;
  ctx.fillStyle=col; ctx.font='bold 9px Times New Roman'; ctx.textAlign='center';
  ctx.fillText(isHSC?'HSC (8.2m)':'Suprime-Cam (8.2m)', cx, H-3);
  ctx.textAlign='left';
  ctx.restore();
}

// ── Box instrument: mini stub + coloured box at port ───────
const MOUNT_SIDE = {
  'spectrograph':'right',
  'survey':      'left',
  'ao':          'bottom',
  'coronagraph': 'bottom',
  'ifs':         'right',
  'visible':     'left',
  'fiber':       'right',
};

const BOX_LABELS = {
  'hds':'HDS','ird':'IRD','pfs':'PFS',
  'moircs':'MOIRCS','fmos':'FMOS',
  'ao36':'AO36','ao188':'AO188','ao3k':'AO3K',
  'ciao':'CIAO','hiciao':'HiCIAO','scexao':'SCExAO',
  'charis':'CHARIS','vampires':'VAMP','focus':'FOCUS',
};

function drawBoxInstrument(ctx, W, H, col, id, sel) {
  const instr = INSTRUMENTS[id];
  const side  = MOUNT_SIDE[instr?.group] || 'right';
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

  if (side==='right') {
    bx=tubeX+tubeW+portL; by=cy-boxH/2;
    ctx.fillStyle=col+'22';
    ctx.fillRect(bx,by,boxW,boxH);
    ctx.strokeStyle=sel?col:col+'88'; ctx.lineWidth=sel?2:1.2;
    ctx.strokeRect(bx,by,boxW,boxH);
    ctx.fillStyle=col+'88'; ctx.fillRect(tubeX+tubeW,cy-3,portL,6);
    ctx.fillStyle=col; ctx.font=`bold 8px Times New Roman`; ctx.textAlign='center';
    ctx.fillText(BOX_LABELS[id]||'',bx+boxW/2,by+boxH/2+3);
    ctx.fillStyle='#3a6a88'; ctx.font='8px Times New Roman';
    ctx.fillText('Nasmyth R',bx+boxW/2,H-3);
  } else if (side==='left') {
    bx=tubeX-portL-boxW; by=cy-boxH/2;
    ctx.fillStyle=col+'22';
    ctx.fillRect(bx,by,boxW,boxH);
    ctx.strokeStyle=sel?col:col+'88'; ctx.lineWidth=sel?2:1.2;
    ctx.strokeRect(bx,by,boxW,boxH);
    ctx.fillStyle=col+'88'; ctx.fillRect(tubeX-portL,cy-3,portL,6);
    ctx.fillStyle=col; ctx.font=`bold 8px Times New Roman`; ctx.textAlign='center';
    ctx.fillText(BOX_LABELS[id]||'',bx+boxW/2,by+boxH/2+3);
    ctx.fillStyle='#3a6a88'; ctx.font='8px Times New Roman';
    ctx.fillText('Nasmyth L',bx+boxW/2,H-3);
  } else {
    bx=cx-boxW/2; by=tubeY+tubeH+portL;
    ctx.fillStyle=col+'22';
    ctx.fillRect(bx,by,boxW,boxH);
    ctx.strokeStyle=sel?col:col+'88'; ctx.lineWidth=sel?2:1.2;
    ctx.strokeRect(bx,by,boxW,boxH);
    ctx.fillStyle=col+'88'; ctx.fillRect(cx-3,tubeY+tubeH,6,portL);
    ctx.fillStyle=col; ctx.font=`bold 8px Times New Roman`; ctx.textAlign='center';
    ctx.fillText(BOX_LABELS[id]||'',bx+boxW/2,by+boxH/2+3);
    ctx.fillStyle='#3a6a88'; ctx.font='8px Times New Roman';
    ctx.fillText('Cassegrain',bx+boxW/2,H-3);
  }
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
  ctx.fillStyle = '#050c18'; ctx.fillRect(0,0,W,H);

  if (G.selectedInstruments.length === 0) {
    ctx.fillStyle='#1a3a5c'; ctx.font='12px Times New Roman';
    ctx.textAlign='center';
    ctx.fillText('No instruments selected',W/2,H/2-8);
    ctx.fillStyle='#2e4a6c'; ctx.font='10px Times New Roman';
    ctx.fillText('Choose from the carousel below',W/2,H/2+10);
    ctx.textAlign='left'; return;
  }

  const hasWide = G.selectedInstruments.find(id => INSTRUMENT_GROUPS['wide-field'].includes(id));
  const tubeCol = hasWide ? (INSTRUMENTS[hasWide]?.color || '#2e6080') : '#2e6080';

  // ── Core telescope: circular 8.2m primary mirror ────────
  const cx = W * 0.42, cy = H * 0.44;
  const pR   = Math.min(W,H) * 0.15;
  const pCy  = cy + H*0.10;
  const focalY = pCy - H*0.30;
  const focalR = pR*0.13;

  ctx.save();
  ctx.strokeStyle = tubeCol;
  ctx.shadowBlur = 3; ctx.shadowColor = tubeCol+'44';

  // Circular primary
  ctx.beginPath(); ctx.arc(cx, pCy, pR, 0, Math.PI*2);
  ctx.fillStyle=tubeCol+'14'; ctx.fill();
  ctx.strokeStyle=tubeCol; ctx.lineWidth=1.5; ctx.stroke();
  for (let i=0;i<6;i++){
    const a=(i/6)*Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(a)*pR*0.18, pCy+Math.sin(a)*pR*0.18);
    ctx.lineTo(cx+Math.cos(a)*pR*0.92, pCy+Math.sin(a)*pR*0.92);
    ctx.strokeStyle=tubeCol+'28'; ctx.lineWidth=0.8; ctx.stroke();
  }

  // Focal point
  ctx.beginPath(); ctx.arc(cx, focalY, focalR, 0, Math.PI*2);
  ctx.fillStyle=tubeCol+'33'; ctx.fill();
  ctx.strokeStyle=tubeCol; ctx.lineWidth=1.2; ctx.stroke();

  // Straight support posts in zigzag ring pattern
  const nPosts=8, rIn=pR*0.48, rOut=pR*0.80;
  for(let i=0;i<nPosts;i++){
    const angle=(i/nPosts)*Math.PI*2 - Math.PI/2;
    const r=i%2===0?rIn:rOut;
    const bx=cx+Math.cos(angle)*r, by=pCy+Math.sin(angle)*r*0.22;
    ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(cx,focalY);
    ctx.strokeStyle=tubeCol+(i%2===0?'66':'44'); ctx.lineWidth=0.9; ctx.stroke();
    ctx.beginPath(); ctx.arc(bx,by,1.5,0,Math.PI*2);
    ctx.fillStyle=tubeCol+'88'; ctx.fill();
  }

  // Thin wide foundation block
  const foundW=pR*2.1, foundH=H*0.038;
  const foundY=pCy+pR*0.28;
  ctx.fillStyle=tubeCol+'18'; ctx.fillRect(cx-foundW/2, foundY, foundW, foundH);
  ctx.strokeStyle=tubeCol+'55'; ctx.lineWidth=0.8;
  ctx.strokeRect(cx-foundW/2, foundY, foundW, foundH);

  // Nasmyth platforms (left and right boxes)
  const nasmY2=pCy-pR*0.08, nasmW=W*0.07, nasmH=H*0.05;
  ctx.fillStyle=tubeCol+'18';
  ctx.fillRect(cx-pR-nasmW, nasmY2-nasmH/2, nasmW, nasmH);
  ctx.strokeStyle=tubeCol+'44'; ctx.lineWidth=0.8;
  ctx.strokeRect(cx-pR-nasmW, nasmY2-nasmH/2, nasmW, nasmH);
  ctx.fillRect(cx+pR, nasmY2-nasmH/2, nasmW, nasmH);
  ctx.strokeRect(cx+pR, nasmY2-nasmH/2, nasmW, nasmH);

  // Cassegrain stair block (right side, below mirror)
  const csX=cx+pR*0.65, csY=pCy+pR*0.20, sH=H*0.022;
  for(let s=0;s<3;s++){
    ctx.fillStyle=tubeCol+'14';
    ctx.fillRect(csX+s*sH*0.6, csY+s*sH, sH*2, sH);
    ctx.strokeStyle=tubeCol+'38'; ctx.lineWidth=0.7;
    ctx.strokeRect(csX+s*sH*0.6, csY+s*sH, sH*2, sH);
  }

  if(hasWide){
    ctx.fillStyle=tubeCol; ctx.font='bold 7px Times New Roman'; ctx.textAlign='center';
    ctx.fillText(INSTRUMENTS[hasWide].name, cx, focalY-5);
  }
  ctx.shadowBlur=0; ctx.textAlign='left'; ctx.restore();

  // ── Attached instrument boxes ──────────────────────────
  const nasmythRX = cx+pR+nasmW;
  const nasmythLX = cx-pR-nasmW;
  const cassY     = foundY+foundH;

  const boxW  = W*0.20, boxH = H*0.12;
  const gap   = 5;
  let rightCount=0, leftCount=0, bottomCount=0;

  G.selectedInstruments.forEach((id, stepIdx) => {
    if (INSTRUMENT_GROUPS['wide-field'].includes(id)) return;
    const instr  = INSTRUMENTS[id];
    if (!instr) return;
    const side   = MOUNT_SIDE[instr.group] || 'right';
    const col    = instr.color;
    const active = G.observationRunning && stepIdx === observationStep;
    const done   = G.observationRunning && stepIdx < observationStep;
    const lit    = active || done;

    let bx, by, lineFrom, lineTo;

    if (side==='right') {
      bx = nasmythRX + 4;
      by = nasmY - boxH/2 + rightCount*(boxH+gap);
      lineFrom = {x:nasmythRX, y:nasmY};
      lineTo   = {x:bx,        y:by+boxH/2};
      rightCount++;
    } else if (side==='left') {
      bx = nasmythLX - 4 - boxW;
      by = nasmY - boxH/2 + leftCount*(boxH+gap);
      lineFrom = {x:nasmythLX, y:nasmY};
      lineTo   = {x:bx+boxW,   y:by+boxH/2};
      leftCount++;
    } else {
      bx = cx - boxW/2;
      by = cassY + 4 + bottomCount*(boxH+gap);
      lineFrom = {x:cx,    y:cassY};
      lineTo   = {x:cx,    y:by};
      bottomCount++;
    }

    // Connector
    ctx.beginPath();
    ctx.moveTo(lineFrom.x, lineFrom.y);
    ctx.lineTo(lineTo.x,   lineTo.y);
    ctx.strokeStyle = lit ? col : col+'44';
    ctx.lineWidth   = lit ? 1.5 : 1;
    ctx.setLineDash(lit ? [] : [3,3]); ctx.stroke(); ctx.setLineDash([]);

    // Box fill + stroke
    ctx.fillStyle   = active ? col+'44' : done ? col+'22' : col+'0e';
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = active ? col : lit ? col+'88' : col+'44';
    ctx.lineWidth   = active ? 2 : 1;
    ctx.strokeRect(bx, by, boxW, boxH);

    // Active glow
    if (active) {
      ctx.shadowColor=col; ctx.shadowBlur=8;
      ctx.strokeRect(bx,by,boxW,boxH);
      ctx.shadowBlur=0;
    }

    // Step label
    ctx.fillStyle = active ? '#fff' : lit ? col+'ee' : col+'77';
    ctx.font      = `${active?'bold ':''}8px Times New Roman`;
    ctx.textAlign = 'center';
    ctx.fillText(`${stepIdx+1}. ${BOX_LABELS[id]||instr.name}`, bx+boxW/2, by+boxH*0.62);
    ctx.textAlign = 'left';
  });

  // Legend
  ctx.fillStyle='#2a4a6c'; ctx.font='7px Times New Roman';
  ctx.fillText('L=Nasmyth L  R=Nasmyth R  ↓=Cassegrain', 4, H-3);
}