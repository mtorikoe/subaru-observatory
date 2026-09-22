/* ============================================================
   render.js — wavefront monitor + IR imaging view
   Performance: pixel loops at half resolution, redrawn only
   when instrument state changes (psf_dirty flag).
   ============================================================ */
const wfCvs   = document.getElementById('wfCvs');
const viewCvs = document.getElementById('viewCvs');

let renderFrame  = 0;
const SKIP = 3;           // heavy canvases refresh every 3 animation frames

// ── IR false-color palette ─────────────────────────────────
function irColor(d, i, v) {
  if      (v < 0.15) { const f=v/.15;       d[i]=20+(f*80)|0;  d[i+1]=0;             d[i+2]=40+(f*120)|0; }
  else if (v < 0.35) { const f=(v-.15)/.20;  d[i]=100+(f*155)|0; d[i+1]=0;             d[i+2]=160-(f*140)|0; }
  else if (v < 0.60) { const f=(v-.35)/.25;  d[i]=255;           d[i+1]=(f*140)|0;     d[i+2]=0; }
  else if (v < 0.85) { const f=(v-.60)/.25;  d[i]=255;           d[i+1]=140+(f*115)|0; d[i+2]=(f*60)|0; }
  else               { const f=(v-.85)/.15;  d[i]=255;           d[i+1]=255;           d[i+2]=60+(f*195)|0; }
  d[i+3] = 255;
}

function hexToRgba(hex, a) {
  return `rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${a})`;
}

// ── Scale a small ImageData up onto a larger canvas ────────
function scaleUp(ctx, img, dw, dh, W, H) {
  const tmp = document.createElement('canvas');
  tmp.width = dw; tmp.height = dh;
  tmp.getContext('2d').putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(tmp, 0, 0, W, H);
}

// ══════════════════════════════════════════════════════════
//  WAVEFRONT ERROR MONITOR
//  Shows atmosphere going from very noisy (raw) →
//  moderately corrected (after AO3K) →
//  sharply corrected (after SCExAO)
// ══════════════════════════════════════════════════════════
function renderWF() {
  if (renderFrame % SKIP !== 0) return;
  const W = wfCvs.width  = wfCvs.offsetWidth  || 200;
  const H = wfCvs.height = wfCvs.offsetHeight || 200;
  const ctx = wfCvs.getContext('2d');

  if (G.phase === 'attract' || G.phase === 'target') {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1a4452'; ctx.font = '10px Times New Roman';
    ctx.textAlign = 'center'; ctx.fillText('no target', W/2, H/2);
    ctx.textAlign = 'left'; return;
  }

  const noise = G.wfNoise;
  const t = renderFrame * .007;
  const dw = W >> 1, dh = H >> 1;
  const img = ctx.createImageData(dw, dh);
  const d   = img.data;

  for (let py = 0; py < dh; py++) {
    for (let px = 0; px < dw; px++) {
      const nx = (px/dw)*2-1, ny = (py/dh)*2-1;
      const r  = Math.sqrt(nx*nx + ny*ny);
      const ii = (py*dw+px)*4;
      if (r > 1) { d[ii+3]=255; continue; }
      // Zernike-like wavefront error field
      let phi = noise * (
        .38*Math.sin(3*nx+t)*Math.cos(2*ny+t*.7) +
        .26*Math.sin(5*ny-t*.5)*Math.cos(3*nx+t*.3) +
        .18*Math.sin(7*r-t*1.1) +
        .12*(nx*nx-ny*ny)*Math.sin(t*.35) +
        .06*r*r*Math.cos(2*t*.3)
      );
      irColor(d, ii, Math.min(1, Math.max(0, (phi+1)*.5)));
    }
  }
  scaleUp(ctx, img, dw, dh, W, H);

  // Pupil ring
  ctx.beginPath(); ctx.arc(W/2, H/2, Math.min(W,H)/2-2, 0, Math.PI*2);
  ctx.strokeStyle = '#2e6080'; ctx.lineWidth = 1.5; ctx.stroke();

  // WFE readout  — maps noise linearly: 1.0→450nm  0.25→80nm  0.07→22nm
  const rms = (noise * 450).toFixed(0);
  ctx.fillStyle = '#7aadbe'; ctx.font = '9px Times New Roman';
  ctx.fillText(`WFE: ${rms} nm rms`, 5, H-5);

  // Stage label
  let stage = 'Raw atmosphere';
  if (G.scexaoStrength > .05) stage = 'After SCExAO';
  else if (G.ao3kStrength > .05) stage = 'After AO3K';
  ctx.fillStyle = '#3a7088'; ctx.font = '8px Times New Roman';
  ctx.fillText(stage, 5, 12);
}

// ══════════════════════════════════════════════════════════
//  IR IMAGING VIEW
//  PSF sharpens as AO is applied, then star core disappears
//  when coronagraph comes in, then halo cleans up with Lyot.
// ══════════════════════════════════════════════════════════
let lastSnap = '';

function renderView() {
  if (renderFrame % SKIP !== 0) return;
  const W = viewCvs.width  = viewCvs.offsetWidth  || 250;
  const H = viewCvs.height = viewCvs.offsetHeight || 300;
  const ctx = viewCvs.getContext('2d');
  const vcx = W/2, vcy = H/2;

  if (G.phase === 'attract' || G.phase === 'target') {
    ctx.fillStyle = '#1a0030'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#3a7088'; ctx.font = '10px Times New Roman';
    ctx.textAlign = 'center'; ctx.fillText('no target selected', vcx, vcy);
    ctx.textAlign = 'left'; return;
  }

  const a3 = G.ao3kStrength, sx = G.scexaoStrength;
  const cs = G.coroStrength,  ls = G.lyotStrength;

  // Rebuild pixel map only when something meaningful changed
  const snap = `${a3.toFixed(2)}${sx.toFixed(2)}${cs.toFixed(2)}${ls.toFixed(2)}`;
  if (psf_dirty || snap !== lastSnap) {
    lastSnap = snap; psf_dirty = false;

    const dw = W>>1, dh = H>>1;
    const img = ctx.createImageData(dw, dh);
    const d   = img.data;
    const t   = renderFrame * .004;

    // PSF width shrinks as AO improves: raw=very wide, ao3k=medium, scexao=sharp
    const psfWidth = 4.5 - a3*1.8 - sx*1.8;   // controls spread of PSF halo

    for (let py = 0; py < dh; py++) {
      for (let px = 0; px < dw; px++) {
        const nx = (px - dw/2)/(dw/2);
        const ny = (py - dh/2)/(dh/2);
        const r  = Math.sqrt(nx*nx + ny*ny);
        const ii = (py*dw+px)*4;

        // PSF core — narrows as AO improves
        let intensity = Math.exp(-r*r*psfWidth) * .90;

        // Speckle halo — reduced by coro+lyot but first needs AO to be visible
        const aoLevel  = Math.min(1, a3*.5 + sx*.5);
        const haloAmp  = Math.max(0, aoLevel - cs*.55 - ls*.40) * .50;
        intensity += haloAmp * (
          .36*Math.sin(8*nx+t)*Math.cos(6*ny+t*.8) +
          .26*Math.cos(10*ny-t)*Math.sin(7*nx) +
          .16*Math.exp(-Math.pow(r-.5,2)*8)*Math.sin(18*r-t*1.8)
        );

        // Coronagraph: suppress PSF core (only effective once AO has sharpened it)
        if (cs > 0) {
          const coroR = .13 + (1-(a3+sx)/2)*.10; // mask is less precise without AO
          if (r < coroR) intensity *= Math.max(0, 1 - cs*(1 - r/coroR));
        }

        irColor(d, ii, Math.min(1, Math.max(0, intensity)));
      }
    }
    scaleUp(ctx, img, dw, dh, W, H);
  }

  // ── Star PSF core drawn on top (fades with coronagraph) ──
  if (cs < .95) {
    const alpha = (1-cs) * .88;
    const psfR  = (4 - G.ao3kStrength*1.5 - G.scexaoStrength*1.5) * (1-cs*.7) + 1;
    const g = ctx.createRadialGradient(vcx,vcy,0, vcx,vcy, psfR*5);
    g.addColorStop(0,   `rgba(255,255,200,${alpha})`);
    g.addColorStop(.4,  `rgba(255,190,80,${alpha*.65})`);
    g.addColorStop(1,   'rgba(255,80,0,0)');
    ctx.beginPath(); ctx.arc(vcx, vcy, psfR*5, 0, Math.PI*2);
    ctx.fillStyle = g; ctx.fill();
  }

  // ── Coronagraph mask ──
  if (cs > 0) {
    ctx.beginPath(); ctx.arc(vcx, vcy, 14*cs, 0, Math.PI*2);
    ctx.fillStyle = `rgba(0,0,0,${cs})`; ctx.fill();
    ctx.strokeStyle = `rgba(126,207,237,${cs*.3})`; ctx.lineWidth=1; ctx.stroke();
  }

  // ── Lyot stop ring ──
  if (ls > 0) {
    ctx.beginPath(); ctx.arc(vcx, vcy, Math.min(W,H)*.46, 0, Math.PI*2);
    ctx.strokeStyle = `rgba(126,207,237,${ls*.18})`;
    ctx.lineWidth = ls*3; ctx.stroke();
  }

  // ── Companion source (appears after SCExAO clears things up) ──
  if (companionPos) {
    // Visible only when SCExAO has run; Lyot helps further
    const vis = sx > 0 ? Math.min(1, sx*.9 + ls*.15) : 0;
    if (vis > .01) {
      const cp = companionPos, c = cp.companion;
      const pr = c.size * (.4 + sx*.5 + ls*.15);
      const pg = ctx.createRadialGradient(cp.x,cp.y,0, cp.x,cp.y, pr*3.2);
      pg.addColorStop(0,   hexToRgba(c.color, vis));
      pg.addColorStop(.45, hexToRgba(c.color, vis*.4));
      pg.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cp.x, cp.y, pr*3.2, 0, Math.PI*2);
      ctx.fillStyle = pg; ctx.fill();
      ctx.beginPath(); ctx.arc(cp.x, cp.y, pr, 0, Math.PI*2);
      ctx.fillStyle = hexToRgba(c.color, Math.min(1, vis*1.3)); ctx.fill();
    }
  }

  // ── Compass + scale bar ──
  ctx.fillStyle='#2e6080'; ctx.font='8px Times New Roman';
  ctx.fillText('N', vcx+2, 13); ctx.fillText('E', 4, vcy+3);
  ctx.fillText('0.5″', W-28, H-4);
  ctx.strokeStyle='#2e6080'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(W-28,H-8); ctx.lineTo(W-4,H-8); ctx.stroke();
}

// ── Master animation loop ──────────────────────────────────
function renderLoop() {
  renderFrame++;
  renderWF();
  renderView();
  requestAnimationFrame(renderLoop);
}