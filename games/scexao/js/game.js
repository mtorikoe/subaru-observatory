/* ============================================================
   game.js — phase control, instrument buttons, interactions
   Correct instrument order: AO3K → SCExAO → Coronagraph → Lyot
   ============================================================ */

// ── Phase bar (6 steps) ───────────────────────────────────
function setPhase(ph) {
  G.phase = ph;
  const map = { target:0, ao3k:1, scexao:2, coro:3, lyot:4, detect:5 };
  const cur = map[ph] ?? -1;
  for (let i = 0; i < 6; i++) {
    const el = document.getElementById('ph'+i);
    if (!el) continue;
    el.className = 'phase-step' + (i < cur ? ' done' : i === cur ? ' active' : '');
  }
}

// ── Button state helper ───────────────────────────────────
function setBtnState(id, state) {
  const b = document.getElementById(id);
  if (!b) return;
  b.disabled = (state === 'disabled');
  b.className = 'instr-btn'
    + (state === 'active'  ? ' active'  : '')
    + (state === 'running' ? ' running' : '');
}

// ── Companion assignment ───────────────────────────────────
function assignCompanions(stars) {
  const companions = {};
  const idx = stars.map((_, i) => i);
  for (let i = idx.length-1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  companions[idx[0]] = PLANETS[Math.floor(Math.random()*PLANETS.length)];
  const bdCount = 2 + Math.floor(Math.random()*2);
  for (let i = 1; i <= bdCount && idx[i] !== undefined; i++)
    companions[idx[i]] = BROWN_DWARFS[Math.floor(Math.random()*BROWN_DWARFS.length)];
  return { companions, planetStarIdx: idx[0] };
}

// ── Star selection ────────────────────────────────────────
function selectStar(idx) {
  G.selectedIdx = idx;
  resetInstruments();

  // All instrument buttons disabled except AO3K
  setBtnState('btn-ao3k',  'ready');
  setBtnState('btn-scexao','disabled');
  setBtnState('btn-coro',  'disabled');
  setBtnState('btn-lyot',  'disabled');
  ['ao-s1','ao-s2','ao-s3'].forEach(id => {
    document.getElementById(id).className = 'ao-stage';
  });

  // Place companion in view canvas
  const companion = G.companions[idx] || null;
  if (companion) {
    const vw = viewCvs.offsetWidth  || 250;
    const vh = viewCvs.offsetHeight || 300;
    const angle = Math.random() * Math.PI * 2;
    const dist  = 38 + Math.random() * 55;
    companionPos = {
      x: vw/2 + Math.cos(angle)*dist,
      y: vh/2 + Math.sin(angle)*dist,
      companion,
    };
  }

  viewCvs.classList.remove('clickable');
  viewCvs.onclick = null;
  setPhase('ao3k');
  setViewStatus('Star targeted. Run AO3K to begin wavefront correction.');
}

// ── Star field click ──────────────────────────────────────
fieldPanel.addEventListener('click', e => {
  if (G.phase === 'attract') return;
  if (document.getElementById('result-overlay').style.display === 'flex') return;
  const r   = fieldPanel.getBoundingClientRect();
  const idx = starAt(e.clientX - r.left, e.clientY - r.top);
  if (idx !== -1) selectStar(idx);
});
fieldPanel.addEventListener('touchend', e => {
  e.preventDefault();
  const t = e.changedTouches[0];
  fieldPanel.dispatchEvent(new MouseEvent('click',{clientX:t.clientX,clientY:t.clientY}));
}, { passive:false });

function setViewStatus(msg) {
  document.getElementById('view-status').textContent = msg;
}

// ══════════════════════════════════════════════════════════
//  INSTRUMENT STEPS
// ══════════════════════════════════════════════════════════

// ① AO3K — 188-actuator facility AO, coarse correction
function runAO3K() {
  if (G.ao3kApplied) return;
  G.ao3kApplied = true;
  setBtnState('btn-ao3k', 'running');
  setViewStatus('AO3K running — 188-actuator mirror correcting atmospheric turbulence…');
  // WFE drops from ~450 nm to ~180 nm after AO3K
  animateTo('wfNoise', 0.40, 1600, null);
  animateTo('ao3kStrength', 1, 1800, () => {
    setBtnState('btn-ao3k', 'active');
    setBtnState('btn-scexao', 'ready');
    setPhase('scexao');
    setViewStatus('AO3K complete. PSF partially concentrated. Run SCExAO for high-order correction.');
  });
}

// ② SCExAO — 2000-actuator high-order correction
function runSCExAO() {
  if (G.scexaoApplied || !G.ao3kApplied) return;
  G.scexaoApplied = true;
  setBtnState('btn-scexao', 'running');

  const stages = [
    { id:'ao-s1', msg:'Wavefront sensor reading residual errors…',   delay:0,    wfTarget:.22 },
    { id:'ao-s2', msg:'Control system computing high-order map…',    delay:1100, wfTarget:.12 },
    { id:'ao-s3', msg:'Deformable mirror — 2000 actuators applied.', delay:2300, wfTarget:.07 },
  ];

  stages.forEach(st => {
    setTimeout(() => {
      stages.filter(s => s.delay < st.delay).forEach(s => {
        document.getElementById(s.id).className = 'ao-stage done';
      });
      document.getElementById(st.id).className = 'ao-stage active';
      setViewStatus(st.msg);
      animateTo('wfNoise', st.wfTarget, 1000, null);
    }, st.delay);
  });

  setTimeout(() => {
    stages.forEach(s => { document.getElementById(s.id).className = 'ao-stage done'; });
    animateTo('scexaoStrength', 1, 1300, () => {
      setBtnState('btn-scexao', 'active');
      setBtnState('btn-coro', 'ready');
      setPhase('coro');
      setViewStatus('SCExAO complete — PSF sharp. Apply the coronagraph mask to block the stellar core.');
    });
  }, 3600);
}

// ③ Coronagraph
function applyCoronagraph() {
  if (G.coroApplied || !G.scexaoApplied) return;
  G.coroApplied = true;
  setBtnState('btn-coro', 'running');
  setViewStatus('Coronagraph PIAA mask inserting — blocking PSF core…');
  animateTo('coroStrength', 1, 1400, () => {
    setBtnState('btn-coro', 'active');
    setBtnState('btn-lyot', 'ready');
    setPhase('lyot');
    setViewStatus('Stellar core blocked. Diffracted speckle halo remains. Insert the Lyot stop.');
  });
}

// ④ Lyot stop
function applyLyot() {
  if (G.lyotApplied || !G.coroApplied) return;
  G.lyotApplied = true;
  setBtnState('btn-lyot', 'running');
  setViewStatus('Lyot stop inserting — suppressing diffracted light from coronagraph edges…');
  animateTo('lyotStrength', 1, 1200, () => {
    setBtnState('btn-lyot', 'active');
    setPhase('detect');
    const companion = G.companions[G.selectedIdx] || null;
    if (companion) {
      viewCvs.classList.add('clickable');
      viewCvs.onclick = handleViewClick;
      setViewStatus('Image clean. A faint companion is visible — click it to confirm detection.');
    } else {
      setViewStatus('Image clean. No companion detected around this star. Try another target.');
    }
  });
}

// ── View canvas click — detect companion ─────────────────
function handleViewClick(e) {
  if (G.phase !== 'detect' || !companionPos) return;
  const r    = viewCvs.getBoundingClientRect();
  const mx   = e.clientX - r.left, my = e.clientY - r.top;
  const dist = Math.hypot(mx - companionPos.x, my - companionPos.y);
  const hitR = companionPos.companion.size * 4 + 14;
  if (dist < hitR) {
    viewCvs.classList.remove('clickable'); viewCvs.onclick = null;
    showResult(companionPos.companion);
  } else {
    setViewStatus('Nothing detected there. The companion is a very faint point — look carefully.');
  }
}
viewCvs.addEventListener('touchend', e => {
  if (G.phase !== 'detect') return;
  e.preventDefault();
  const t = e.changedTouches[0];
  viewCvs.dispatchEvent(new MouseEvent('click',{clientX:t.clientX,clientY:t.clientY}));
}, { passive:false });

// ── Result overlay ────────────────────────────────────────
function showResult(companion) {
  const isPlanet = companion.type === 'planet';
  document.getElementById('result-ball').style.cssText =
    `background:radial-gradient(circle at 35% 35%,${companion.color}cc,${companion.color}22);`
    + `border:2px solid ${companion.color}55;`;
  document.getElementById('result-title').textContent =
    isPlanet ? 'Exoplanet directly imaged!' : 'Brown dwarf companion detected';
  document.getElementById('result-msg').textContent = isPlanet
    ? 'You used AO3K, SCExAO, a coronagraph, and a Lyot stop to reveal this planet — exactly how astronomers do it at Subaru.'
    : 'This is a brown dwarf — a substellar object too massive to be a true planet. They are bright in infrared and the most common false positive in direct imaging surveys.';
  document.getElementById('result-card').innerHTML =
    `<b style="color:${companion.color}">${companion.name}</b><br>`
    + `<span style="font-size:10px">${companion.desc}</span><br><br>`
    + `<span style="font-size:9px;color:var(--dim)">`
    + (isPlanet
      ? 'Pipeline: AO3K → SCExAO → PIAA coronagraph → Lyot stop · H-band 1.6 µm · Subaru 8.2 m'
      : `Classification: brown dwarf companion · Mass ~15–75 M<sub>J</sub> · Not a true planet`)
    + '</span>';
  document.getElementById('result-overlay').style.display = 'flex';
}

// ── Next field ────────────────────────────────────────────
function nextField() {
  document.getElementById('result-overlay').style.display = 'none';
  G.selectedIdx = -1;
  resetInstruments();
  ['btn-ao3k','btn-scexao','btn-coro','btn-lyot'].forEach(id => setBtnState(id,'disabled'));
  ['ao-s1','ao-s2','ao-s3'].forEach(id => {
    document.getElementById(id).className = 'ao-stage';
  });
  viewCvs.classList.remove('clickable'); viewCvs.onclick = null;
  setViewStatus('Select a star from the field to begin.');
  resizeField(); drawBgStarfield();
  G.stars = generateStars();
  const { companions, planetStarIdx } = assignCompanions(G.stars);
  G.companions = companions; G.planetStarIdx = planetStarIdx;
  setPhase('target');
}

// ── Start / attract ───────────────────────────────────────
function startGame() {
  document.getElementById('attract').style.display = 'none';
  resizeField(); drawBgStarfield();
  G.stars = generateStars();
  const { companions, planetStarIdx } = assignCompanions(G.stars);
  G.companions = companions; G.planetStarIdx = planetStarIdx;
  setPhase('target');
  if (!sfRunning) renderStars();
  renderLoop();
}

document.getElementById('attract').addEventListener('click', startGame);
document.getElementById('attract').addEventListener('touchend', e => {
  e.preventDefault(); startGame();
}, { passive:false });
setTimeout(() => { if (G.phase === 'attract') startGame(); }, 20000);

// Idle reset (5 min)
let lastAct = Date.now();
['click','touchstart','mousemove'].forEach(ev =>
  document.addEventListener(ev, () => { lastAct = Date.now(); }));
setInterval(() => {
  if (Date.now()-lastAct > 300000 && G.phase !== 'attract') {
    G.phase = 'attract';
    document.getElementById('attract').style.display = 'flex';
    document.getElementById('result-overlay').style.display = 'none';
  }
}, 15000);

window.addEventListener('resize', () => {
  if (G.phase !== 'attract') { resizeField(); drawBgStarfield(); }
});