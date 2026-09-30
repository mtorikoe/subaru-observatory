/* ============================================================
   starfield.js — star field canvas
   Stars stored as fractions (0–1) to survive canvas resizes.
   ============================================================ */

const sfCvs = document.getElementById('sf-canvas');
let sfFrame   = 0;
let sfRunning = false;

// ── Generate Stage 1 field ─────────────────────────────────
function generateField() {
  G.fieldStars = [];

  const named = shuffle([...NAMED_TARGETS_S1])
    .slice(0, 1 + (G.successCount > 2 ? 1 : 0));

  const stars = [];
  const count = 12 + Math.floor(Math.random() * 5);

  // Named targets — stored as fractions
  named.forEach(n => {
    const fx = 0.12 + Math.random() * 0.76;
    const fy = 0.12 + Math.random() * 0.76;
    const sp = getSpectralEntry(n.colorIndex);
    stars.push({
      ...n,
      fx, fy,           // ← fractions, not pixels
      css: sp.css,
      size: 4 + Math.random() * 3,
      phi: Math.random() * Math.PI * 2,
      isNamed: true,
    });
  });

  // Anonymous generated stars
  for (let i = 0; i < count; i++) {
    let fx, fy, ok, t = 0;
    do {
      fx = 0.05 + Math.random() * 0.90;
      fy = 0.05 + Math.random() * 0.90;
      // minimum separation check in fraction space
      ok = stars.every(s => Math.hypot((s.fx - fx)*800, (s.fy - fy)*500) > 55);
      t++;
    } while (!ok && t < 60);

    const roll = Math.random();
    let bprp;
    if      (roll < 0.12) bprp = -0.2 + Math.random()*0.4;
    else if (roll < 0.22) bprp =  0.0 + Math.random()*0.5;
    else if (roll < 0.38) bprp =  0.5 + Math.random()*0.5;
    else if (roll < 0.58) bprp =  1.0 + Math.random()*0.5;
    else if (roll < 0.75) bprp =  1.5 + Math.random()*0.7;
    else                  bprp =  2.2 + Math.random()*1.8;

    const sp       = getSpectralEntry(bprp);
    const hasDisk  = sp.planetProb > 0.4 && Math.random() < 0.18;
    const hasPlanet= !hasDisk && Math.random() < sp.planetProb * 0.30;

    stars.push({
      id: 'gen-' + i,
      fx, fy, bprp, css: sp.css,
      size: 2.5 + Math.random() * 4,
      phi: Math.random() * Math.PI * 2,
      companion: hasDisk ? 'disk' : hasPlanet ? 'planet' : null,
      planetVisible: hasDisk || hasPlanet,
      isNamed: false,
      spectralType: sp.type,
    });
  }
  G.fieldStars = stars;
}

// ── Stage 2: Gaia field ────────────────────────────────────
function generateGaiaField() {
  const raC=73.9, decC=30.55, raR=2.0, decR=1.8;

  G.fieldStars = GAIA_FIELD_S2.map(g => {
    // Store as fractions
    const fx = 0.5 + (g.ra  - raC) / raR * 0.45;
    const fy = 0.5 - (g.dec - decC) / decR * 0.45;
    const sp = getSpectralEntry(g.bprp);
    return {
      ...g,
      fx, fy,
      // proper motion stored as fractional shift per year
      pmfx: g.pmra  / (raR  * 3600) * 0.45 * 2,
      pmfy:-g.pmdec / (decR * 3600) * 0.45 * 2,
      css: sp.css,
      size: Math.max(2, 7 - g.gmag * 0.35),
      phi: Math.random() * Math.PI * 2,
      companion: (g.seeds && g.name) ? 'disk'
               : (g.bprp > 2.2 && Math.random() < 0.5) ? 'planet' : null,
      planetVisible: !!g.seeds,
      spectralType: sp.type,
      isNamed: !!g.name,
    };
  }).filter(s => s.fx > 0.02 && s.fx < 0.98 && s.fy > 0.02 && s.fy < 0.98);
}

// ── Render loop ────────────────────────────────────────────
function renderStarfield() {
  if (!sfCvs) return;
  sfRunning = true;
  sfFrame++;

  // Resize canvas to match its CSS box — only if changed
  const W = sfCvs.offsetWidth  || sfCvs.parentElement?.offsetWidth  || 400;
  const H = sfCvs.offsetHeight || sfCvs.parentElement?.offsetHeight || 300;
  if (sfCvs.width !== W || sfCvs.height !== H) {
    sfCvs.width  = W;
    sfCvs.height = H;
    // Invalidate bg star cache
    renderStarfield._bg = null;
  }
  const ctx = sfCvs.getContext('2d');
  ctx.fillStyle = '#040810';
  ctx.fillRect(0, 0, W, H);

  // Dim background stars (regenerated when size changes)
  if (!renderStarfield._bg) {
    renderStarfield._bg = Array.from({length:180}, () => ({
      fx: Math.random(), fy: Math.random(),
      r:  Math.random()*.6+.1, op: Math.random()*.2+.02,
    }));
  }
  renderStarfield._bg.forEach(s => {
    ctx.beginPath(); ctx.arc(s.fx*W, s.fy*H, s.r, 0, Math.PI*2);
    ctx.fillStyle = `rgba(200,220,255,${s.op})`; ctx.fill();
  });

  // Proper motion drift (Stage 2, fraction update)
  if (G.stage === 2 && G.pmPlaying) {
    G.pmAnimTime += 50;
    G.fieldStars.forEach(s => {
      if (s.pmfx === undefined) return;
      s.fx += s.pmfx * 50;
      s.fy += s.pmfy * 50;
    });
  }

  // Draw game stars using fraction coords
  G.fieldStars.forEach(s => {
    const px = s.fx * W;
    const py = s.fy * H;
    // Skip if somehow out of bounds
    if (px < 0 || px > W || py < 0 || py > H) return;

    const fl  = Math.sin(sfFrame * .025 + s.phi) * .04;
    const rad = s.size * (1 + fl);
    const isSel = G.selectedStar && G.selectedStar.id === s.id;

    // Glow
    const g = ctx.createRadialGradient(px, py, 0, px, py, rad * 3.2);
    g.addColorStop(0, s.css + 'cc'); g.addColorStop(1, s.css + '00');
    ctx.beginPath(); ctx.arc(px, py, rad * 3.2, 0, Math.PI*2);
    ctx.fillStyle = g; ctx.fill();

    // Core
    ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI*2);
    ctx.fillStyle = s.css; ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1;

    // Selection ring
    if (isSel) {
      ctx.beginPath(); ctx.arc(px, py, rad + 10, 0, Math.PI*2);
      ctx.strokeStyle = '#f0c060'; ctx.lineWidth = 2; ctx.stroke();
      for (let t = 0; t < 4; t++) {
        const a = (t/4)*Math.PI*2 + sfFrame*.005;
        ctx.beginPath();
        ctx.moveTo(px+Math.cos(a)*(rad+14), py+Math.sin(a)*(rad+14));
        ctx.lineTo(px+Math.cos(a)*(rad+20), py+Math.sin(a)*(rad+20));
        ctx.strokeStyle = '#f0c060'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }

    // Named star label
    if (s.isNamed && s.name) {
      ctx.fillStyle = 'rgba(240,200,100,0.75)';
      ctx.font = '10px Times New Roman';
      ctx.fillText(s.name, px + rad + 5, py + 4);
    }

    // M-type marker (Stage 2)
    if (G.stage === 2 && s.bprp > 2.2) {
      ctx.beginPath(); ctx.arc(px, py, rad + 5, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(255,120,60,0.28)'; ctx.lineWidth=1; ctx.stroke();
    }
  });

  // Stage 2 year counter
  if (G.stage === 2 && G.pmPlaying) {
    ctx.fillStyle='rgba(126,207,237,0.7)'; ctx.font='11px Times New Roman';
    ctx.fillText(`+${Math.round(G.pmAnimTime)} yr`, 8, H-6);
  }

  requestAnimationFrame(renderStarfield);
}

// ── Star click: convert pixel click to fraction, find star ─
sfCvs.addEventListener('click', e => {
  if (G.observationRunning) return;
  const r   = sfCvs.getBoundingClientRect();
  const W   = sfCvs.width  || sfCvs.offsetWidth;
  const H   = sfCvs.height || sfCvs.offsetHeight;
  const mx  = (e.clientX - r.left) * (W / r.width)  / W;  // fraction
  const my  = (e.clientY - r.top)  * (H / r.height) / H;  // fraction

  let best=null, bd=0.06;  // max selection distance in fraction coords
  G.fieldStars.forEach(s => {
    const d = Math.hypot(s.fx - mx, s.fy - my * (W/H));
    // Scale y by aspect to make hit area circular in screen space
    const ds = Math.hypot((s.fx-mx)*W, (s.fy-my)*H);
    if (ds < bd*Math.max(W,H)) { best=s; bd=ds/Math.max(W,H); }
  });
  if (!best) return;

  G.selectedStar       = best;
  G.observationComplete= false;
  G.observationRunning = false;
  G.starFieldExpanded  = false;
  resetStarView();
  renderLayout();
  renderStarView();
  updateInstructions(1);
});

sfCvs.addEventListener('touchend', e => {
  e.preventDefault();
  const t = e.changedTouches[0];
  sfCvs.dispatchEvent(new MouseEvent('click',{clientX:t.clientX,clientY:t.clientY}));
},{passive:false});

function shuffle(arr) {
  for (let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}