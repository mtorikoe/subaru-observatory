/* ============================================================
   minigames.js — instrument mini-game overlay system
   Universe Hunting

   HOW IT WORKS:
   1. triggerObservation() (game.js) calls startMiniGameQueue(instruments, onAllPassed)
   2. We show one mini-game overlay per instrument, in order
   3. Player clicks X → quitObservation() — pauses, instruments stay
   4. Player passes all games → onAllPassed() fires → evaluateObservation()
   ============================================================ */

// ── Queue state ────────────────────────────────────────────
let _mgQueue    = [];   // remaining instrument ids to run
let _mgOnDone   = null; // callback when all games passed
let _mgActive   = false;
let _mgCurrentId = null;   // instrument whose game is on screen

// ── Entry point called by triggerObservation() in game.js ──
function startMiniGameQueue(instrumentIds, onAllPassed) {
  _mgQueue  = instrumentIds.slice(); // copy so we can shift() safely
  _mgOnDone = onAllPassed;
  _mgActive = true;
  _runNextMiniGame();
}

function _runNextMiniGame() {
  if (!_mgActive) return;

  if (_mgQueue.length === 0) {
    // All games passed
    _mgActive = false;
    if (_mgOnDone) _mgOnDone();
    return;
  }

  const id = _mgQueue.shift();
  _showMiniGameOverlay(id);
}

// ── Overlay shell ──────────────────────────────────────────
// Each mini-game renders into #mg-game-area inside this overlay.
// Every row keeps its natural height (no flex shrinking) and the box scrolls
// if it is taller than the screen — otherwise a tall game, or the "mission
// complete" note, squeezes the play area and its contents spill over the text.
function _showMiniGameOverlay(instrId) {
  const instr = UH_INSTRUMENTS[instrId];
  if (!instr) { _runNextMiniGame(); return; } // skip unknown instrument

  // Remove any existing overlay first
  _closeMiniGameOverlay();
  _mgCurrentId = instrId;

  const html = `
    <div class="mg-overlay" id="mg-overlay">
      <div class="mg-box" style="overflow-y:auto">
        <div class="mg-header" style="flex-shrink:0">
          <div class="mg-title">
            <span class="mg-instr-dot" style="background:${instr.color}"></span>
            ${instr.name}
          </div>
          <button class="mg-close" onclick="quitObservation()" title="Quit observation">✕</button>
        </div>
        <div class="mg-teaches" id="mg-teaches" style="flex-shrink:0"></div>
        <div class="mg-game-area" id="mg-game-area" style="flex:0 0 auto"></div>
        <div class="mg-status" id="mg-status" style="flex-shrink:0"></div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  // Launch the specific mini-game for this instrument
  _launchGame(instrId);
}

function _closeMiniGameOverlay() {
  const el = document.getElementById('mg-overlay');
  if (el) el.remove();
}

// ── Called when player passes current mini-game ────────────
// The game is NOT closed straight away. A "mission complete" note with a
// short explanation is added under it, and the overlay stays up until the
// player presses the button (or ✕) — so there is time to look and read.
function _miniGamePassed() {
  const box = document.querySelector('#mg-overlay .mg-box');
  if (!box) { setTimeout(_runNextMiniGame, 300); return; }      // overlay already gone
  if (document.getElementById('mg-done')) return;               // already shown

  const instr = UH_INSTRUMENTS[_mgCurrentId] || {};
  const text  = MG_DONE_TEXT[_mgCurrentId] || instr.description || '';
  const last  = _mgQueue.length === 0;
  const next  = () => { _closeMiniGameOverlay(); setTimeout(_runNextMiniGame, 300); };

  box.insertAdjacentHTML('beforeend', `
    <div id="mg-done" style="flex-shrink:0;padding:14px 18px 16px;border-top:1px solid var(--border);background:var(--bg);color:var(--text)">
      <div style="font-size:.8em;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--success)">✓ Mission complete — ${instr.name || ''}</div>
      <div style="font-size:.87em;line-height:1.65;margin-top:6px">${text}</div>
      <div style="text-align:center;margin-top:12px">
        <button class="mg-btn" id="mg-done-btn">${last ? 'Finish' : 'Next instrument →'}</button>
      </div>
    </div>`);
  document.getElementById('mg-done-btn').addEventListener('click', next);
  // From here ✕ means "I have finished reading", not "give up the observation"
  const x = box.querySelector('.mg-close');
  if (x) { x.onclick = next; x.title = 'Close'; }
  document.getElementById('mg-done').scrollIntoView({ block: 'nearest' });
}

// ── What the player just did, and what the real instrument does ──
// Shown on the "mission complete" note. One entry per instrument id.
const MG_DONE_TEXT = {
  'suprime-cam': 'You matched Suprime-Cam\'s view to the Moon: one picture covers about a full Moon of sky (34′×27′). That was the widest view of any 8-metre telescope, letting Subaru photograph whole galaxies and galaxy clusters in a single shot from 1999 until Hyper Suprime-Cam took over.',
  'hsc':         'Hyper Suprime-Cam sees about nine full Moons of sky at once — roughly seven times more than Suprime-Cam — with an 870-megapixel camera at the top of the telescope. Astronomers use it to survey millions of distant galaxies and map the invisible dark matter between them.',
  'fmos':        'You spread white light into its colours — a spectrum. FMOS did this for up to 400 objects at the same time, using 400 optical fibres placed on distant galaxies, so astronomers could measure how far away thousands of galaxies are.',
  'focas':       'FOCAS is the Faint Object Camera And Spectrograph. As you saw, a long exposure lets faint light pile up until an object rises out of the noise; a slit then passes that object\'s light on to be spread into a spectrum. It studies some of the dimmest, most distant galaxies Subaru can reach.',
  'comics':      'COMICS looked in the mid-infrared (8–25 µm), light we feel as heat. Cold dust hides stars in visible light, but warm dust glows at these wavelengths — so COMICS could see the dusty disks where planets form. Because everything warm glows there, the instrument itself had to be kept extremely cold.',
  'moircs':      'MOIRCS is an infrared camera and spectrograph with a wide 4′×7′ field of view. A wide field means many galaxies in one picture, and with a mask of small slits it can take the spectra of dozens of them at the same time.',
  'ircs':        'IRCS photographs and takes spectra in infrared light (1–5 µm), usually with adaptive optics for sharp images. Comparing brightness through several filters shows an object\'s temperature: cool objects such as brown dwarfs and planets are faint at short wavelengths and bright at long ones.',
  'hds':         'Every element leaves its own pattern of dark lines in starlight. HDS, the High Dispersion Spectrograph, spreads visible light out so finely that these patterns can be told apart — revealing what a star is made of, and even how fast it is moving.',
  'ird':         'A planet pulls its star to and fro. IRD watches the star\'s dark lines slide toward blue and red as it moves — a shift far smaller than shown here, measured against a laser "comb" of reference lines. It hunts for planets around small, cool red stars, which shine mostly in infrared.',
  'ao36':        'The air above the telescope bends starlight and blurs every star. Adaptive optics measures that blur and bends a flexible mirror the opposite way, many times each second. AO36 was Subaru\'s first such system, with 36 actuators pushing the mirror.',
  'ao188':       'Adaptive optics cancels the blur of the atmosphere with a mirror that changes shape about a thousand times a second. AO188 uses 188 actuators, and when no bright star is nearby it can create its own guide star by shining a laser into the upper atmosphere.',
  'ao3k':        'AO3K is Subaru\'s newest adaptive optics, with about 3,000 actuators on its mirror. More actuators can copy finer ripples in the incoming light, giving the nearly perfect star images that planet-imaging instruments like SCExAO need.',
  'ciao':        'CIAO was a coronagraph: a small mask blocks the bright centre of the star and a second stop removes the light that leaks around the mask\'s edge. With the glare gone, faint companions and dusty disks right beside the star become visible.',
  'hiciao':      'Leftover starlight forms "speckles" that look just like planets. HiCIAO told them apart by watching through the night: the sky turns, so a real planet moves while speckles stay fixed to the instrument. Subtracting what stays fixed leaves the planet. This is how planets such as GJ 504 b were photographed.',
  'scexao':      'SCExAO is the last link of a chain. The first adaptive optics sharpens the star, SCExAO\'s 2,000-actuator mirror corrects what is left thousands of times a second, and a coronagraph blocks the star. Only all three together make the sky dark enough to see a planet a million times fainter than its star.',
  'charis':      'CHARIS takes a picture at many infrared wavelengths at once. Speckles shift with wavelength but a planet does not, so the planet can be picked out — and its brightness in each picture forms a spectrum whose dips reveal gases such as water vapour and methane in its atmosphere.',
  'vampires':    'Starlight is unpolarized, but light bounced off dust becomes polarized. VAMPIRES takes two pictures through polarizing filters turned 90° apart and subtracts them: the star, identical in both, cancels out, leaving only the dust. It works in visible light and reveals disks and shells of dust very close to stars.',
};

// ── Player hits X — quit observation ──────────────────────
function quitObservation() {
  _mgActive = false;
  _mgQueue  = [];
  _closeMiniGameOverlay();

  // Reset observation state so player can retry with same instruments
  G.observationRunning  = false;
  G.observationComplete = false;
  renderInstrumentCarousel();
  renderConstructionView();
  setButtonStates();
}

// ── Helper: set the "teaches" caption ─────────────────────
function _setTeaches(text) {
  const el = document.getElementById('mg-teaches');
  if (el) el.textContent = text;
}

function _setStatus(text, ok) {
  const el = document.getElementById('mg-status');
  if (!el) return;
  el.textContent = text;
  el.className   = 'mg-status ' + (ok ? 'ok' : '');
}

// ── Router: pick the right game per instrument id ─────────
function _launchGame(id) {
  switch (id) {
    case 'suprime-cam': return _game_suprimeCam();
    case 'hsc':         return _game_hsc();
    case 'ao36':        return _game_ao(id, 36,   'AO36 — 36 actuators sharpen the wavefront.');
    case 'ao188':       return _game_ao(id, 188,  'AO188 — 188 actuators give diffraction-limited images.');
    case 'ao3k':        return _game_ao(id, 3000, 'AO3K — 3,000 actuators achieve near-perfect correction.');
    case 'ircs':        return _game_ircs();
    case 'hds':         return _game_hds();
    case 'ird':         return _game_ird();
    case 'fmos':        return _game_fmos();
    // case 'pfs':      return _game_pfs();   // PFS hidden for now
    case 'moircs':      return _game_moircs();
    case 'focas':       return _game_focas();
    case 'comics':      return _game_comics();
    case 'ciao':        return _game_ciao();
    case 'hiciao':      return _game_hiciao();
    case 'scexao':      return _game_scexao();
    case 'charis':      return _game_charis();
    case 'vampires':    return _game_vampires();
    default:
      // Fallback for any instrument without a mini-game yet
      _setTeaches('Instrument: ' + (UH_INSTRUMENTS[id]?.name || id));
      _setStatus('No mini-game yet — tap to continue.', false);
      const area = document.getElementById('mg-game-area');
      if (area) {
        area.innerHTML = `<div class="mg-placeholder">
          <p>${UH_INSTRUMENTS[id]?.description || ''}</p>
          <button class="mg-btn" onclick="_miniGamePassed()">Continue →</button>
        </div>`;
      }
  }
}

/* ============================================================
   MINI-GAME IMPLEMENTATIONS
   Each function:
   1. Calls _setTeaches("...") with the educational caption
   2. Writes HTML/canvas into #mg-game-area
   3. Runs game logic
   4. Calls _miniGamePassed() when player wins
   ============================================================ */

// ──────────────────────────────────────────────────────────
// SUPRIME-CAM
// A moon sits at center. A circle pulses out and in.
// Click when the circle matches the moon's outer border.
// ──────────────────────────────────────────────────────────
function _game_suprimeCam() {
  _setTeaches('Suprime-Cam covers 34′×27′ — confirm the field of view by matching the ring to the Moon\'s size.');

  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="360" height="300" style="display:block;margin:auto;cursor:crosshair"></canvas>
    <div style="text-align:center;margin-top:8px;font-size:13px;color:var(--muted)">Click when the ring aligns with the Moon's edge</div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');
  const cx = 180, cy = 150;
  const moonR = 46; // Moon radius px

  let ringR = moonR * 0.5;  // animated ring radius
  let growing = true;
  let speed = 0.7;
  let tries = 0;
  let animId;

  // Real Moon photo. Place your image at: /assets/minigame/moon.png
  const moonImg = new Image();
  let moonReady = false;
  moonImg.onload  = () => { moonReady = true; };
  moonImg.onerror = () => { moonReady = false; };  // falls back to drawn moon
  moonImg.src = '/assets/minigame/moon.png';

  function drawMoon() {
    if (moonReady && moonImg.naturalWidth > 0) {
      // Clip to a circle and paint the photo inside
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, moonR, 0, Math.PI*2); ctx.clip();
      ctx.drawImage(moonImg, cx - moonR, cy - moonR, moonR*2, moonR*2);
      ctx.restore();
      // Soft limb shading
      const limb = ctx.createRadialGradient(cx, cy, moonR*0.6, cx, cy, moonR);
      limb.addColorStop(0, 'rgba(0,0,0,0)');
      limb.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.beginPath(); ctx.arc(cx, cy, moonR, 0, Math.PI*2);
      ctx.fillStyle = limb; ctx.fill();
    } else {
      // Fallback — drawn moon
      const grad = ctx.createRadialGradient(cx-10, cy-10, 4, cx, cy, moonR);
      grad.addColorStop(0, '#d8d0c0');
      grad.addColorStop(1, '#888070');
      ctx.beginPath(); ctx.arc(cx, cy, moonR, 0, Math.PI*2);
      ctx.fillStyle = grad; ctx.fill();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, 360, 300);

    // Stars background
    ctx.fillStyle = '#040810';
    ctx.fillRect(0, 0, 360, 300);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random()*0.6+0.1})`;
      ctx.fillRect(
        (i * 137) % 360,
        (i * 97)  % 300,
        1, 1
      );
    }

    // Moon (photo if loaded, drawn otherwise)
    drawMoon();

    // Animated ring
    const diff  = Math.abs(ringR - moonR);
    const green = diff < 6;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI*2);
    ctx.strokeStyle = green ? '#44ee44' : '#7ecfed';
    ctx.lineWidth   = 3;
    ctx.stroke();

    // Accuracy indicator
    const pct = Math.max(0, 1 - diff / (moonR * 0.8));
    ctx.fillStyle = `rgba(68,238,68,${pct})`;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(pct * 100) + '% aligned', cx, 285);
  }

  function animate() {
    // Update ring
    ringR += growing ? speed : -speed;
    if (ringR > moonR * 1.9) growing = false;
    if (ringR < moonR * 0.3) growing = true;

    draw();
    animId = requestAnimationFrame(animate);
  }

  canvas.addEventListener('click', () => {
    const diff = Math.abs(ringR - moonR);
    tries++;
    if (diff < 8) {
      cancelAnimationFrame(animId);
      _setStatus('✓ Field of view confirmed!', true);
      // Flash green ring around the Moon
      ctx.clearRect(0,0,360,300);
      ctx.fillStyle = '#040810'; ctx.fillRect(0,0,360,300);
      drawMoon();
      ctx.beginPath(); ctx.arc(cx,cy,moonR+4,0,Math.PI*2);
      ctx.strokeStyle='#44ee44'; ctx.lineWidth=4; ctx.stroke();
      setTimeout(_miniGamePassed, 900);
    } else {
      _setStatus(`Try ${tries}: off by ${Math.round(diff)}px — keep trying!`, false);
    }
  });

  animId = requestAnimationFrame(animate);
}

// ──────────────────────────────────────────────────────────
// HSC — Field-of-view quiz
// Two fields of view drawn at the SAME scale: one holds a single
// full Moon (Suprime-Cam), the other holds nine (HSC).
// "Which view field is HSC?" A wrong pick locks that option and
// reveals it as Suprime-Cam, so the second try always succeeds.
// ──────────────────────────────────────────────────────────
function _game_hsc() {
  _setTeaches('Hyper Suprime-Cam is the upgraded successor of Suprime-Cam. One shot covers 1.77 square degrees — about 9 full Moons, roughly 7× more sky than Suprime-Cam.');

  const S = 170;          // each option canvas is S×S px
  const moonR = 18;       // one full Moon — identical in both fields (same scale!)
  const options = [
    { id:'suprime', label:'Suprime-Cam', detail:'34′×27′ — about 1 full Moon', fieldR: moonR + 2, moons: 1 },
    { id:'hsc',     label:'Hyper Suprime-Cam', detail:'1.5° wide — about 9 full Moons', fieldR: 54, moons: 9 },
  ];
  if (Math.random() < 0.5) options.reverse();   // don't always put the answer on the same side

  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;width:100%">
      <div style="font-size:1.15em;font-weight:700;color:var(--on-canvas,#fff);text-align:center">Which view field is HSC?</div>
      <div style="display:flex;gap:18px;justify-content:center;flex-wrap:wrap">
        ${options.map((o, i) => `
          <button class="mg-quiz-opt" data-i="${i}" style="background:#0a1220;border:2px solid #2a3a50;border-radius:8px;padding:8px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;color:#fff;font-family:inherit;transition:border-color .15s,opacity .15s">
            <canvas width="${S}" height="${S}" style="display:block"></canvas>
            <span class="mg-quiz-lbl" style="font-weight:700;font-size:0.95em">${String.fromCharCode(65 + i)}</span>
            <span class="mg-quiz-det" style="font-size:0.75em;color:rgba(255,255,255,0.6);min-height:1.2em"></span>
          </button>`).join('')}
      </div>
    </div>`;

  // Real Moon photo (shared with the Suprime-Cam game); falls back to a drawn Moon
  const moonImg = new Image();
  moonImg.onload = () => buttons.forEach((b, i) => drawOption(b, options[i]));
  moonImg.src = '/assets/minigame/moon.png';

  function drawMoon(ctx, x, y, r) {
    if (moonImg.complete && moonImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.clip();
      ctx.drawImage(moonImg, x - r, y - r, r*2, r*2);
      ctx.restore();
    } else {
      const g = ctx.createRadialGradient(x - r*0.25, y - r*0.25, 2, x, y, r);
      g.addColorStop(0, '#d8d0c0'); g.addColorStop(1, '#888070');
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
      ctx.fillStyle = g; ctx.fill();
    }
  }

  function drawOption(btn, o) {
    const ctx = btn.querySelector('canvas').getContext('2d');
    const c = S / 2;
    ctx.fillStyle = '#040810'; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.1 + ((i*73)%10)*0.04})`;
      ctx.fillRect((i*137) % S, (i*97) % S, 1, 1);
    }
    // Field of view (dashed, like the quiz)
    ctx.beginPath(); ctx.arc(c, c, o.fieldR, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill();
    ctx.setLineDash([3, 2]);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.setLineDash([]);
    // Moons: one centred, the rest in a ring sized to fill the field so the
    // discs overlap a little — the same view as the quiz.
    drawMoon(ctx, c, c, moonR);
    const ring = o.moons - 1;
    const ringR = o.fieldR - moonR;
    for (let k = 0; k < ring; k++) {
      const a = (k / ring) * Math.PI * 2 - Math.PI/2;
      drawMoon(ctx, c + Math.cos(a) * ringR, c + Math.sin(a) * ringR, moonR);
    }
  }

  const buttons = Array.from(area.querySelectorAll('.mg-quiz-opt'));
  buttons.forEach((b, i) => drawOption(b, options[i]));

  function reveal(btn, o, colour) {
    btn.style.borderColor = colour;
    btn.querySelector('.mg-quiz-lbl').textContent = o.label;
    btn.querySelector('.mg-quiz-det').textContent = o.detail;
  }

  let done = false;
  buttons.forEach((btn, i) => btn.addEventListener('click', () => {
    if (done || btn.disabled) return;
    const o = options[i];
    if (o.id === 'hsc') {
      done = true;
      buttons.forEach((b, j) => {
        b.style.cursor = 'default';
        reveal(b, options[j], options[j].id === 'hsc' ? '#44ee44' : '#555');
      });
      _setStatus('✓ Correct! HSC replaced Suprime-Cam and sees ~7× more sky in a single shot.', true);
      setTimeout(_miniGamePassed, 2200);
    } else {
      // Lock the wrong option and show what it really is — second chance
      btn.disabled = true;
      btn.style.opacity = '0.45';
      btn.style.cursor = 'not-allowed';
      reveal(btn, o, '#e05050');
      _setStatus('Not quite — that\'s Suprime-Cam, HSC\'s older predecessor. It only fits about 1 Moon. Try the other one!', false);
    }
  }));
}

// ──────────────────────────────────────────────────────────
// AO (36 / 188 / 3K) — deformable mirror
// Wavy (atmosphere-distorted) light enters from the top-right,
// bounces off a deformable mirror "(" on the left and goes to
// the camera at the bottom-left. Drag the slider to bend the
// mirror until the reflected light comes out straight.
// AO36: needs 60% correction. AO188: 82%. AO3K: 95%.
// ──────────────────────────────────────────────────────────
function _game_ao(instrId, actuators, teachText) {
  _setTeaches(teachText + ' Bend the deformable mirror so the reflected light comes out straight.');

  // How straight the waves need to be before passing (0–1)
  const target = instrId === 'ao36' ? 0.60 : instrId === 'ao188' ? 0.82 : 0.95;

  const W = 400, H = 300;
  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="${W}" height="${H}" style="display:block;margin:auto;cursor:ns-resize"></canvas>
    <div style="text-align:center;margin-top:6px;font-size:13px;color:var(--muted)">Drag the slider up to bend the mirror and straighten the reflected light</div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');

  let correction = 0; // 0 = no correction, 1 = perfect
  let dragging   = false;
  let startY     = 0;
  let startCorr  = 0;
  let passed     = false;
  let phase      = 0;

  // ── Geometry ──
  const sliderX = 375, sliderMinY = 40, sliderMaxY = 250;
  const SRC = [345, 12];          // light enters from the top-right
  const CAM = [28,  H - 22];      // camera at the bottom-left
  const MIR = [92,  96];          // mirror centre
  const unit = (x, y) => { const l = Math.hypot(x, y); return [x/l, y/l]; };
  const dIn  = unit(MIR[0] - SRC[0], MIR[1] - SRC[1]);       // incoming direction
  const dOut = unit(CAM[0] - MIR[0], CAM[1] - MIR[1]);       // reflected direction
  const NRM  = unit(dOut[0] - dIn[0], dOut[1] - dIn[1]);     // mirror normal (faces the light)
  const TAN  = [-NRM[1], NRM[0]];                             // along the mirror surface
  const MIR_HALF = 70;                                        // half length of the mirror
  // Beam width + wave height are kept small enough that the whole beam lands on the mirror
  const BEAM_LINES = 7, BEAM_W = 34, WAVE_LEN = 34, AMP = 8;
  const EXT = 70;   // beams are drawn this far past the mirror centre, then clipped at its surface
  // Actuator pins drawn behind the mirror — more for newer AO systems
  const pins = actuators >= 3000 ? 31 : actuators >= 188 ? 15 : 7;

  function corrToSliderY(c) { return sliderMaxY - c * (sliderMaxY - sliderMinY); }

  // Draw a band of wavy lines from point a to point b
  function drawBeam(a, b, amp) {
    const dir = unit(b[0] - a[0], b[1] - a[1]);
    const n   = [-dir[1], dir[0]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let k = 0; k < BEAM_LINES; k++) {
      const off = (k / (BEAM_LINES - 1) - 0.5) * BEAM_W;
      ctx.beginPath();
      for (let t = 0; t <= len; t += 3) {
        const w = off + amp * Math.sin((t / WAVE_LEN) * Math.PI * 2 - phase + k * 0.9);
        const x = a[0] + dir[0]*t + n[0]*w;
        const y = a[1] + dir[1]*t + n[1]*w;
        t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${50 + k*4},90%,${70 + k*2}%,0.85)`;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#040810';
    ctx.fillRect(0, 0, W, H);

    // Deformable mirror "(" — nearly straight at 0 %, curved toward the light at 100 %
    const bulge = 4 + 22 * correction;
    const p0 = [MIR[0] - TAN[0]*MIR_HALF, MIR[1] - TAN[1]*MIR_HALF];
    const p1 = [MIR[0] + TAN[0]*MIR_HALF, MIR[1] + TAN[1]*MIR_HALF];
    const cp = [MIR[0] - NRM[0]*bulge*2, MIR[1] - NRM[1]*bulge*2];

    // Light only exists in front of the mirror: clip to the region on the
    // light's side of the mirror surface, so beams stop exactly at the mirror.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.quadraticCurveTo(cp[0], cp[1], p1[0], p1[1]);
    ctx.lineTo(p1[0] + TAN[0]*800,               p1[1] + TAN[1]*800);
    ctx.lineTo(p1[0] + TAN[0]*800 + NRM[0]*1600, p1[1] + TAN[1]*800 + NRM[1]*1600);
    ctx.lineTo(p0[0] - TAN[0]*800 + NRM[0]*1600, p0[1] - TAN[1]*800 + NRM[1]*1600);
    ctx.lineTo(p0[0] - TAN[0]*800,               p0[1] - TAN[1]*800);
    ctx.closePath();
    ctx.clip();
    // Incoming light: always distorted by the atmosphere
    drawBeam(SRC, [MIR[0] + dIn[0]*EXT, MIR[1] + dIn[1]*EXT], AMP);
    // Reflected light: distortion shrinks as the mirror is corrected
    drawBeam([MIR[0] - dOut[0]*EXT, MIR[1] - dOut[1]*EXT], CAM, AMP * (1 - correction));
    ctx.restore();
    // actuator pins behind the mirror
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < pins; i++) {
      const t = (i + 0.5) / pins;
      const bx = (1-t)*(1-t)*p0[0] + 2*(1-t)*t*cp[0] + t*t*p1[0];
      const by = (1-t)*(1-t)*p0[1] + 2*(1-t)*t*cp[1] + t*t*p1[1];
      ctx.beginPath();
      ctx.moveTo(bx - NRM[0]*3,  by - NRM[1]*3);
      ctx.lineTo(bx - NRM[0]*14, by - NRM[1]*14);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.quadraticCurveTo(cp[0], cp[1], p1[0], p1[1]);
    ctx.strokeStyle = '#dfe8f2';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Camera at the bottom-left
    ctx.fillStyle = '#1a2530';
    ctx.fillRect(CAM[0] - 18, CAM[1] - 6, 36, 20);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(CAM[0] - 18, CAM[1] - 6, 36, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('camera', CAM[0], CAM[1] + 8);

    // Labels
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.textAlign = 'right';
    ctx.fillText('starlight (blurred by the air)', W - 40, 82);
    ctx.textAlign = 'left';
    ctx.fillText(`deformable mirror · ${actuators} actuators`, 14, 14);

    // Quality bar (bottom)
    const barX = 110, barW = 230, barY = H - 18;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(barX, barY, barW, 10);
    ctx.fillStyle = `hsl(${120 * correction},70%,45%)`;
    ctx.fillRect(barX, barY, barW * correction, 10);
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(barX + barW * target, barY - 4);
    ctx.lineTo(barX + barW * target, barY + 13);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font      = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`straightness ${Math.round(correction*100)}%`, barX + barW/2, barY - 5);

    // Slider track + knob
    ctx.fillStyle = '#1a2530';
    ctx.fillRect(sliderX - 5, sliderMinY, 10, sliderMaxY - sliderMinY);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sliderX, corrToSliderY(correction), 10, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '9px sans-serif';
    ctx.fillText('bend', sliderX, sliderMinY - 14);
  }

  function pointerY(e) {
    const r = canvas.getBoundingClientRect();
    const scale = H / r.height;    // the canvas may be shrunk on small screens
    return ((e.touches ? e.touches[0].clientY : e.clientY) - r.top) * scale;
  }
  function onMove(e) {
    if (!dragging) return;
    if (e.touches && e.cancelable) e.preventDefault();
    const dy = startY - pointerY(e);        // drag up = more correction
    correction = Math.min(1, Math.max(0, startCorr + dy / (sliderMaxY - sliderMinY)));
  }
  function onUp() { dragging = false; }
  function cleanup() {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('touchmove', onMove);
    window.removeEventListener('mouseup', onUp);
    window.removeEventListener('touchend', onUp);
  }

  canvas.addEventListener('mousedown',  e => { dragging = true; startY = pointerY(e); startCorr = correction; });
  canvas.addEventListener('touchstart', e => { e.preventDefault(); dragging = true; startY = pointerY(e); startCorr = correction; }, { passive:false });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive:false });
  window.addEventListener('mouseup',  onUp);
  window.addEventListener('touchend', onUp);

  function tick() {
    if (!canvas.isConnected) { cleanup(); return; }   // overlay was closed
    phase += 0.08;
    if (!passed && correction >= target) {
      passed = true;
      dragging = false;
      _setStatus(`✓ Wavefront corrected to ${Math.round(correction*100)}%!`, true);
      setTimeout(_miniGamePassed, 1100);
    }
    if (!passed) {
      _setStatus(`Straightness: ${Math.round(correction*100)}% — need ${Math.round(target*100)}%`, false);
    }
    draw();
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

// ──────────────────────────────────────────────────────────
// IRCS — infrared colours tell the temperature
// Take a picture of a star and its faint companion through four
// infrared filters (J, H, K, L′). The star fades toward longer
// wavelengths while the companion brightens — so it must be cool.
// ──────────────────────────────────────────────────────────
function _game_ircs() {
  _setTeaches('IRCS is an infrared camera and spectrograph. It photographs the sky through different infrared filters. Hot objects fade toward longer wavelengths and cool ones brighten, so comparing the pictures reveals the temperature of things too cool to shine in visible light.');

  const W = 360, H = 212;
  const FILTERS = [
    { id: 'J',  wl: '1.25 µm', star: 1.00, comp: .10 },
    { id: 'H',  wl: '1.65 µm', star: .88,  comp: .28 },
    { id: 'K',  wl: '2.2 µm',  star: .72,  comp: .60 },
    { id: 'L′', wl: '3.8 µm',  star: .52,  comp: 1.00 },
  ];
  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="${W}" height="${H}" style="display:block;margin:auto"></canvas>
    <div id="ircs-filters" style="display:flex;gap:8px;justify-content:center;margin-top:8px">
      ${FILTERS.map((f, i) => `<button class="mg-btn outline" id="ircs-f${i}" style="padding:7px 14px">${f.id}<br><span style="font-weight:400;font-size:.8em">${f.wl}</span></button>`).join('')}
    </div>
    <div id="ircs-hint" style="text-align:center;margin-top:6px;font-size:13px;color:var(--muted);min-height:2.6em">Take a picture through each of the four infrared filters. Keep an eye on the faint companion beside the star.</div>
    <div id="ircs-q" style="display:none;gap:8px;justify-content:center;margin-top:6px">
      <button class="mg-btn" id="ircs-hot">Hot, like a blue star</button>
      <button class="mg-btn" id="ircs-cool">Cool, like a brown dwarf</button>
    </div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');
  const hint   = document.getElementById('ircs-hint');
  const taken  = [false, false, false, false];
  let cur = -1, done = false;

  function blob(x, y, r, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(.3, `rgba(255,240,225,${a * .6})`); g.addColorStop(1, 'rgba(255,230,210,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  function draw() {
    ctx.fillStyle = '#040810'; ctx.fillRect(0, 0, W, H);

    // ── The picture ──
    const IX = 6, IY = 6, IS = 200;
    ctx.fillStyle = '#000'; ctx.fillRect(IX, IY, IS, IS);
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.strokeRect(IX + .5, IY + .5, IS - 1, IS - 1);
    if (cur < 0) {
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Choose a filter to take a picture', IX + IS / 2, IY + IS / 2);
    } else {
      const f = FILTERS[cur];
      ctx.save(); ctx.beginPath(); ctx.rect(IX, IY, IS, IS); ctx.clip();
      for (let i = 0; i < 26; i++) { ctx.fillStyle = `rgba(255,255,255,${.15 + ((i * 73) % 10) * .03})`; ctx.fillRect(IX + (i * 137) % IS, IY + (i * 89) % IS, 1, 1); }
      blob(IX + 82, IY + 112, 16 + 30 * f.star, .95);                 // the star
      blob(IX + 142, IY + 66, 5 + 9 * f.comp, .25 + .75 * f.comp);     // the companion
      ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`${f.id} filter · ${f.wl}`, IX + 6, IY + 15);
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '9px sans-serif';
      ctx.fillText('star', IX + 70, IY + 172); ctx.fillText('companion', IX + 122, IY + 44);
    }

    // ── Measured brightness ──
    const CX = 222, CW = 132, BASE = 172, MAXH = 120, GWd = CW / 4;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('Measured brightness', CX, 16);
    ctx.fillStyle = '#8f96a3'; ctx.fillRect(CX, 24, 8, 8);
    ctx.fillStyle = '#ffb060'; ctx.fillRect(CX + 44, 24, 8, 8);
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '9px sans-serif';
    ctx.fillText('star', CX + 11, 32); ctx.fillText('companion', CX + 55, 32);
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.moveTo(CX, BASE + .5); ctx.lineTo(CX + CW, BASE + .5); ctx.stroke();
    FILTERS.forEach((f, i) => {
      const x = CX + i * GWd + 5;
      ctx.fillStyle = i === cur ? '#fff' : 'rgba(255,255,255,.6)'; ctx.font = (i === cur ? 'bold ' : '') + '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(f.id, x + 11, BASE + 13);
      if (!taken[i]) return;
      ctx.fillStyle = '#8f96a3'; ctx.fillRect(x, BASE - MAXH * f.star, 10, MAXH * f.star);
      ctx.fillStyle = '#ffb060'; ctx.fillRect(x + 12, BASE - MAXH * f.comp, 10, MAXH * f.comp);
    });
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('shorter  ←  wavelength  →  longer', CX + CW / 2, BASE + 28);
  }

  FILTERS.forEach((f, i) => {
    const b = document.getElementById('ircs-f' + i);
    b.addEventListener('click', () => {
      if (done) return;
      cur = i; taken[i] = true; b.classList.remove('outline');
      draw();
      if (taken.every(Boolean)) {
        hint.textContent = 'Compare the bars: the star fades toward longer wavelengths, the companion gets brighter. What kind of object is the companion?';
        document.getElementById('ircs-q').style.display = 'flex';
      } else {
        hint.textContent = `Picture taken through the ${f.id} filter. ${taken.filter(Boolean).length} of 4 done.`;
      }
    });
  });
  document.getElementById('ircs-hot').addEventListener('click', () => {
    if (!done) _setStatus('A hot object would be brightest at the short-wavelength end, like the star. Look at the bars again.', false);
  });
  document.getElementById('ircs-cool').addEventListener('click', () => {
    if (done) return;
    done = true;
    _setStatus('✓ Right — brighter at longer wavelengths means cool. It is a brown dwarf, too cool to shine in visible light.', true);
    setTimeout(_miniGamePassed, 1200);
  });

  draw();
}

// ──────────────────────────────────────────────────────────
// HDS — Match element "fingerprints" to the star's spectrum
// Top: the star's spectrum with dark absorption lines.
// Below: the lines each element makes in the laboratory.
// Point at an element to line its fingerprint up with the star,
// click it to test. Find the 3 elements that are in the star.
// ──────────────────────────────────────────────────────────
function _game_hds() {
  _setTeaches('Every chemical element removes its own colours from starlight, leaving dark lines — a fingerprint. HDS spreads the light out so finely that astronomers can read which elements a star is made of.');

  const W = 360, H = 270;
  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="${W}" height="${H}" style="display:block;margin:auto;cursor:pointer"></canvas>
    <div style="text-align:center;margin-top:6px;font-size:13px;color:var(--muted)">Point at an element to compare its lines with the star, then click to test it. Find the 3 elements in this star.</div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');

  // Wavelengths in nanometres (the strongest visible lines of each element)
  const ELEMENTS = [
    { id:'H',  name:'Hydrogen',  lines:[434.0, 486.1, 656.3] },
    { id:'Na', name:'Sodium',    lines:[589.3] },
    { id:'Ca', name:'Calcium',   lines:[393.4, 396.8] },
    { id:'Mg', name:'Magnesium', lines:[517.5] },
    { id:'Li', name:'Lithium',   lines:[670.8] },
  ];
  // This star: lithium is never present, and one of the other four is missing
  const missing = ['H', 'Na', 'Ca', 'Mg'][Math.floor(Math.random() * 4)];
  ELEMENTS.forEach(e => { e.present = e.id !== 'Li' && e.id !== missing; e.state = ''; });
  const need = 3;
  let found = 0, hover = -1, done = false;

  const X0 = 96, SW = 250, L0 = 380, L1 = 690;          // spectrum strip geometry
  const lx = l => X0 + (l - L0) / (L1 - L0) * SW;
  const STOPS = [[380,'#5a00b0'],[440,'#2030ff'],[490,'#00b0e0'],[530,'#20d040'],[580,'#f0e020'],[620,'#ff8000'],[690,'#c00000']];
  const colourOf = l => { let c = STOPS[0][1]; STOPS.forEach(s => { if (l >= s[0] - 15) c = s[1]; }); return c; };
  const ROW0 = 104, ROWH = 32;
  const rowAt = y => { const i = Math.floor((y - ROW0) / ROWH); return i >= 0 && i < ELEMENTS.length ? i : -1; };

  function draw() {
    ctx.fillStyle = '#040810'; ctx.fillRect(0, 0, W, H);

    // ── The star's spectrum ──
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('Starlight', 8, 46);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '9px sans-serif';
    ctx.fillText('seen by HDS', 8, 59);
    const rg = ctx.createLinearGradient(X0, 0, X0 + SW, 0);
    STOPS.forEach(s => rg.addColorStop((s[0] - L0) / (L1 - L0), s[1]));
    ctx.fillStyle = rg; ctx.fillRect(X0, 24, SW, 50);
    ELEMENTS.forEach(e => { if (e.present) e.lines.forEach(l => { ctx.fillStyle = '#04060c'; ctx.fillRect(lx(l) - 1.2, 24, 2.4, 50); }); });
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('blue', X0 + 14, 86); ctx.fillText('red', X0 + SW - 12, 86);
    ctx.fillText('Fingerprints measured in the laboratory:', X0 + SW / 2, 98);

    // ── Element fingerprints ──
    ELEMENTS.forEach((e, i) => {
      const y = ROW0 + i * ROWH;
      if (i === hover && !e.state) { ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.fillRect(0, y, W, ROWH - 4); }
      ctx.textAlign = 'left'; ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = e.state === 'yes' ? '#5fe07a' : e.state === 'no' ? 'rgba(255,255,255,.35)' : '#fff';
      ctx.fillText((e.state === 'yes' ? '✓ ' : e.state === 'no' ? '✗ ' : '') + e.name, 8, y + 18);
      ctx.fillStyle = '#000'; ctx.fillRect(X0, y + 3, SW, ROWH - 10);
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.strokeRect(X0 + .5, y + 3.5, SW - 1, ROWH - 11);
      ctx.globalAlpha = e.state === 'no' ? .3 : 1;
      e.lines.forEach(l => { ctx.fillStyle = colourOf(l); ctx.fillRect(lx(l) - 1.5, y + 3, 3, ROWH - 10); });
      ctx.globalAlpha = 1;
    });

    // ── Guide lines: carry the pointed-at (or confirmed) fingerprint up to the star ──
    ELEMENTS.forEach((e, i) => {
      if (!(i === hover && !e.state) && e.state !== 'yes') return;
      const y = ROW0 + i * ROWH;
      ctx.strokeStyle = e.state === 'yes' ? 'rgba(95,224,122,.55)' : '#fff';
      ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      e.lines.forEach(l => { ctx.beginPath(); ctx.moveTo(lx(l), 20); ctx.lineTo(lx(l), y + 3); ctx.stroke(); });
      ctx.setLineDash([]);
    });

    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`${found} / ${need} elements`, 8, 15);
  }

  const pos = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
  canvas.addEventListener('mousemove', e => { hover = rowAt(pos(e).y); draw(); });
  canvas.addEventListener('mouseleave', () => { hover = -1; draw(); });
  canvas.addEventListener('click', e => {
    if (done) return;
    const i = rowAt(pos(e).y); if (i < 0) return;
    const el = ELEMENTS[i]; if (el.state) return;
    if (el.present) {
      el.state = 'yes'; found++;
      _setStatus(`✓ ${el.name}: every line matches a dark line — it is in this star.`, true);
      if (found >= need) { done = true; setTimeout(_miniGamePassed, 1400); }
    } else {
      el.state = 'no';
      _setStatus(`✗ ${el.name}: the star has no dark line at that colour — not found here.`, false);
    }
    draw();
  });

  draw();
}

// ──────────────────────────────────────────────────────────
// IRD — Doppler wobble
// Left: a planet and its star circle each other (seen from above;
// Earth is toward the bottom). Right: the star's spectral lines
// slide toward blue when the star comes at us and toward red when
// it moves away, and the velocity graph is traced at the same time.
// Press Measure when the lines are shifted the furthest (3 times).
// ──────────────────────────────────────────────────────────
function _game_ird() {
  _setTeaches('A planet tugs its star around in a small circle. When the star moves toward us its light is squeezed to bluer colours; when it moves away, stretched to redder ones. IRD measures this tiny shift of the star\'s lines — the Doppler wobble.');

  const W = 360, H = 270;
  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="${W}" height="${H}" style="display:block;margin:auto"></canvas>
    <div style="text-align:center;margin-top:8px"><button id="ird-btn" class="mg-btn">Measure</button></div>
    <div style="text-align:center;margin-top:6px;font-size:13px;color:var(--muted)">Watch the dark lines slide. Press Measure when they are shifted the furthest to the red or to the blue.</div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');
  const btn    = document.getElementById('ird-btn');

  const need = 3;
  let t = 0, found = 0, done = false;
  const marks = [];                         // {t, rv} measurements
  const SPEED = 0.022;                      // orbit angle per frame
  // Radial velocity: +1 = moving away from Earth (redshift), −1 = toward (blueshift)
  const rvAt = tt => Math.cos(tt * SPEED);

  const REST = [.14, .30, .47, .58, .76, .90];   // line positions (fraction of the strip)

  function draw() {
    if (document.getElementById('mg-canvas') !== canvas) return;      // game was closed
    const a = t * SPEED, rv = rvAt(t);
    ctx.fillStyle = '#040810'; ctx.fillRect(0, 0, W, H);

    // ── Orbit, seen from above ──
    const cx = 80, cy = 112, pr = 54, sr = 9;
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, sr, 0, Math.PI * 2); ctx.stroke();
    const px = cx + Math.cos(a) * pr, py = cy + Math.sin(a) * pr;       // planet
    const sx = cx - Math.cos(a) * sr, sy = cy - Math.sin(a) * sr;       // star, always opposite
    // The star's colour tints with its motion (exaggerated so it can be seen)
    const tint = rv > 0 ? `rgb(255,${Math.round(150 - 70 * rv)},${Math.round(110 - 80 * rv)})`
                        : `rgb(${Math.round(255 + 90 * rv)},${Math.round(150 - 10 * rv)},${Math.round(110 - 140 * rv)})`;
    const sg = ctx.createRadialGradient(sx, sy, 2, sx, sy, 26);
    sg.addColorStop(0, '#fff'); sg.addColorStop(.35, tint); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = tint; ctx.beginPath(); ctx.arc(sx, sy, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7fb0ff'; ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('planet', px, py - 9);
    // Arrow: the star's motion along our line of sight
    if (Math.abs(rv) > .15) {
      const len = 22 * rv, ax = sx + 20, ay0 = sy, ay1 = sy - len;      // up the screen = away from Earth
      ctx.strokeStyle = rv > 0 ? '#ff7060' : '#70a8ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, ay0); ctx.lineTo(ax, ay1);
      ctx.moveTo(ax, ay1); ctx.lineTo(ax - 4, ay1 + Math.sign(len) * 5);
      ctx.moveTo(ax, ay1); ctx.lineTo(ax + 4, ay1 + Math.sign(len) * 5); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '10px sans-serif';
    ctx.fillText('↓ to Earth', cx, 196);
    ctx.fillStyle = rv > .15 ? '#ff8a7a' : rv < -.15 ? '#8ab8ff' : 'rgba(255,255,255,.6)';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(rv > .15 ? 'star moving AWAY' : rv < -.15 ? 'star moving TOWARD us' : 'moving sideways', cx, 212);

    // ── Spectrum: lines slide with the motion ──
    const SX = 168, SY = 34, SWd = 180, SH = 40, SHIFT = 9;
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('The star\'s spectrum (near-infrared)', SX, SY - 8);
    const g = ctx.createLinearGradient(SX, 0, SX + SWd, 0);
    g.addColorStop(0, '#c83a2a'); g.addColorStop(1, '#5a1010');
    ctx.fillStyle = g; ctx.fillRect(SX, SY, SWd, SH);
    ctx.save(); ctx.beginPath(); ctx.rect(SX, SY, SWd, SH); ctx.clip();
    REST.forEach(p => { ctx.fillStyle = '#05060a'; ctx.fillRect(SX + p * SWd + rv * SHIFT - 1.5, SY, 3, SH); });
    ctx.restore();
    // Rest positions (the laser comb gives IRD these fixed reference marks)
    REST.forEach(p => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(SX + p * SWd - .5, SY - 5, 1, 5); ctx.fillRect(SX + p * SWd - .5, SY + SH, 1, 5);
    });
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '8px sans-serif';
    ctx.textAlign = 'left';  ctx.fillText('← bluer', SX, SY + SH + 15);
    ctx.textAlign = 'right'; ctx.fillText('redder →', SX + SWd, SY + SH + 15);
    ctx.textAlign = 'center'; ctx.fillText('white ticks = position at rest', SX + SWd / 2, SY + SH + 15);

    // ── Velocity graph, traced as time passes ──
    const GX = 168, GY = 112, GW = 180, GH = 110, mid = GY + GH / 2, amp = 40, SPAN = 420;   // frames shown
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.strokeRect(GX + .5, GY + .5, GW - 1, GH - 1);
    ctx.beginPath(); ctx.moveTo(GX, mid); ctx.lineTo(GX + GW, mid); ctx.stroke();
    ctx.fillStyle = '#ff8a7a'; ctx.font = '8px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('away (red)', GX + 4, GY + 10);
    ctx.fillStyle = '#8ab8ff'; ctx.fillText('toward (blue)', GX + 4, GY + GH - 4);
    const xOf = tt => GX + GW - 12 - (t - tt) * (GW - 12) / SPAN;
    ctx.beginPath();
    for (let tt = Math.max(0, t - SPAN); tt <= t; tt += 2) {
      const x = xOf(tt), y = mid - rvAt(tt) * amp;
      tt === Math.max(0, t - SPAN) ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.stroke();
    marks.forEach(m => {
      const x = xOf(m.t); if (x < GX + 3) return;
      ctx.fillStyle = m.rv > 0 ? '#ff7060' : '#70a8ff';
      ctx.beginPath(); ctx.arc(x, mid - m.rv * amp, 5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(xOf(t), mid - rv * amp, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '8px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('time →', GX + GW - 4, mid + 10);

    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`${found} / ${need} measured`, 8, 15);
    if (done) {
      ctx.textAlign = 'center'; ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = '#5fe07a';
      ctx.fillText('A regular wobble — an unseen planet is pulling this star', W / 2, 250);
    }

    t++;
    requestAnimationFrame(draw);
  }

  btn.addEventListener('click', () => {
    if (done) return;
    const rv = rvAt(t);
    if (Math.abs(rv) < 0.9) {
      _setStatus('Not yet — wait until the dark lines are as far from the white ticks as they get.', false);
      return;
    }
    marks.push({ t, rv }); found++;
    _setStatus(rv > 0 ? `Largest redshift measured — the star is moving away fastest. (${found}/${need})`
                      : `Largest blueshift measured — the star is coming toward us fastest. (${found}/${need})`, found >= need);
    if (found >= need) {
      done = true;
      _setStatus('✓ The shift repeats like clockwork: a planet is there, even though we never see it.', true);
      setTimeout(_miniGamePassed, 2200);
    }
  });

  requestAnimationFrame(draw);
}

// ──────────────────────────────────────────────────────────
// FMOS — Fan white light out into its colours
// White light enters at the left. It looks like one white sheet,
// but it is really a stack of coloured sheets pinned at the left
// (like a fan of coloured paper). Grab the dot at the end of the
// stack and swing the top sheet to the matching colour dot — it
// fans out and shows its true colour. Separate them all to win.
//
// ✎ Tweak the look & difficulty in FMOS_CONFIG below — every
//   size, colour and option the game uses lives there.
//   Preview quickly with  index.html?mg=fmos
// ──────────────────────────────────────────────────────────
const FMOS_CONFIG = {
  canvasW: 400,
  canvasH: 290,

  // Fan geometry
  pivotX:      34,    // where the light comes in — every sheet is pinned here
  pivotY:     145,
  sheetLength: 300,   // pivot → far end of each sheet
  sheetWidth:   44,   // thickness of each sheet at its far end
  sheetNeck:     7,   // thickness where it leaves the prism (beams widen as they travel)
  glow:         14,   // soft glow around each beam, px (0 = none)
  fanSpread:    44,   // total fan angle in degrees, top sheet ↔ bottom sheet
  dotGap:       26,   // distance from the end of a sheet to its colour dot

  // Sheets, top of the fan → bottom. Add/remove entries to change the count.
  layers: [
    { name: 'red',    color: '#ff4a4a' },
    { name: 'orange', color: '#ffa030' },
    { name: 'yellow', color: '#f2e040' },
    { name: 'green',  color: '#40d070' },
    { name: 'blue',   color: '#4a80ff' },
    { name: 'violet', color: '#a060f0' },
  ],

  whiteColor:  '#f6f6f2',   // how the un-separated (mixed) light looks
  sheetAlpha:  0.95,        // opacity of a coloured sheet
  sheetEdge:   'rgba(0,0,0,0.18)', // thin outline so overlapping sheets stay readable

  handleR:     9,           // radius of the draggable dot at the end of the stack
  dotR:        10,          // radius of the colour dots
  snapDist:    24,          // how close (px) a drop must be to a colour dot
  peelOrder:   'random',    // 'random' = top sheet's colour is a surprise; 'inOrder' = top → bottom
  shuffleDots: false,       // true = colour dots in random order around the fan
  revealDist:  50,          // drag distance (px) over which a sheet turns from white to its colour
};

function _game_fmos() {
  const C = FMOS_CONFIG;
  _setTeaches('FMOS sends starlight down optical fibres into a spectrograph, which fans the light out into its colours (a spectrum). White light is really all the colours stacked together — pull them apart!');

  const W = C.canvasW, H = C.canvasH;
  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="${W}" height="${H}" style="display:block;margin:auto;touch-action:none"></canvas>
    <div style="text-align:center;margin-top:6px;font-size:13px;color:var(--muted)">Hold the dot at the end of the white beam and swing it to the matching colour dot</div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');
  const d2r    = Math.PI / 180;
  const n      = C.layers.length;

  // Fan angle (radians) for each dot slot, top → bottom
  const slotAngle = s => (-C.fanSpread / 2 + (n > 1 ? s * C.fanSpread / (n - 1) : 0)) * d2r;
  const dotPos = s => {
    const a = slotAngle(s), r = C.sheetLength + C.dotGap;
    return [C.pivotX + Math.cos(a) * r, C.pivotY + Math.sin(a) * r];
  };
  const handlePos = () => [C.pivotX + C.sheetLength, C.pivotY];

  // dotOrder[slot] = layer index shown at that slot
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const dotOrder = C.layers.map((_, i) => i);
  if (C.shuffleDots) shuffle(dotOrder);

  // Stack of sheets still mixed into white light; the LAST entry is on top
  const stack = C.layers.map((_, i) => i).reverse();
  if (C.peelOrder === 'random') shuffle(stack);

  const placed = [];          // { layer, angle }
  let drag = null;            // { layer, angle, reveal, startX, startY }
  let passed = false;

  // One beam of light leaving the prism: narrow at the pivot, widening toward
  // its end, bright near the source and with a soft glow of its own colour.
  function sheet(angle, fill, alpha, additive) {
    const L = C.sheetLength, w0 = C.sheetNeck / 2, w1 = C.sheetWidth / 2;
    ctx.save();
    ctx.translate(C.pivotX, C.pivotY);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -w0); ctx.lineTo(L, -w1); ctx.lineTo(L, w1); ctx.lineTo(0, w0); ctx.closePath();
    if (additive) ctx.globalCompositeOperation = 'lighter';   // overlapping colours add up toward white
    ctx.globalAlpha = alpha;
    ctx.shadowColor = fill; ctx.shadowBlur = C.glow;
    ctx.fillStyle = fill; ctx.fill();
    ctx.shadowBlur = 0;
    // brighter core along the middle of the beam
    const core = ctx.createLinearGradient(0, -w1, 0, w1);
    core.addColorStop(0, 'rgba(255,255,255,0)'); core.addColorStop(.5, 'rgba(255,255,255,.38)'); core.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = core; ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = C.sheetEdge; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // Inside the spectrograph: dark, a little lighter around the optics
    const bg = ctx.createRadialGradient(C.pivotX, C.pivotY, 10, C.pivotX, C.pivotY, W);
    bg.addColorStop(0, '#101826'); bg.addColorStop(1, '#03060c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // The optical fibre that brings the starlight in from the telescope
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, C.pivotY + 92);
    ctx.bezierCurveTo(C.pivotX - 30, C.pivotY + 90, C.pivotX - 34, C.pivotY + 4, C.pivotX - 6, C.pivotY);
    ctx.strokeStyle = '#3b4658'; ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('optical fibre', 6, C.pivotY + 112);
    ctx.fillText('(starlight in)', 6, C.pivotY + 124);

    // Separated beams. Where they still overlap near the prism they add up to white.
    placed.slice().sort((a, b) => a.angle - b.angle)
      .forEach(p => sheet(p.angle, C.layers[p.layer].color, C.sheetAlpha, true));

    // The light that is still mixed: one white beam
    if (stack.length) sheet(0, C.whiteColor, 1);

    // Beam being pulled out: white → its colour as it separates
    if (drag) {
      sheet(drag.angle, C.whiteColor, 1);
      sheet(drag.angle, C.layers[drag.layer].color, C.sheetAlpha * drag.reveal);
    }

    // The prism that splits the light, drawn as a small block of glass over the pivot
    ctx.beginPath();
    ctx.moveTo(C.pivotX - 14, C.pivotY + 20); ctx.lineTo(C.pivotX + 2, C.pivotY - 22); ctx.lineTo(C.pivotX + 18, C.pivotY + 20); ctx.closePath();
    const glass = ctx.createLinearGradient(C.pivotX - 14, C.pivotY - 22, C.pivotX + 18, C.pivotY + 20);
    glass.addColorStop(0, 'rgba(210,230,255,.55)'); glass.addColorStop(1, 'rgba(120,160,220,.22)');
    ctx.fillStyle = glass; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.2; ctx.stroke();

    // Colour targets around the end of the fan: a ring until its beam arrives, then lit
    dotOrder.forEach((li, slot) => {
      const [x, y] = dotPos(slot);
      const done = placed.some(p => p.layer === li);
      const col = C.layers[li].color;
      if (done) { ctx.shadowColor = col; ctx.shadowBlur = 16; }
      ctx.beginPath(); ctx.arc(x, y, C.dotR, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.globalAlpha = done ? 1 : .55; ctx.fill();
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      ctx.strokeStyle = done ? '#ffffff' : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = done ? 2.5 : 1; ctx.stroke();
    });
    if (passed) {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText('a spectrum', W - 8, 16);
    }

    // Handle at the end of the white beam (or following the dragged beam)
    if (stack.length && !passed || drag) {
      const a = drag ? drag.angle : 0;
      const hx = C.pivotX + Math.cos(a) * C.sheetLength, hy = C.pivotY + Math.sin(a) * C.sheetLength;
      ctx.beginPath(); ctx.arc(hx, hy, C.handleR + 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.shadowColor = '#fff'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(hx, hy, C.handleR, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(20,30,45,0.8)'; ctx.lineWidth = 2.5; ctx.stroke();
    }
  }

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height];
  }

  canvas.addEventListener('pointermove', e => {
    const [x, y] = pos(e);
    if (!drag) {
      const [hx, hy] = handlePos();
      canvas.style.cursor = stack.length && Math.hypot(x - hx, y - hy) < C.handleR + 10 ? 'grab' : 'default';
      return;
    }
    const lim = (C.fanSpread / 2 + 12) * d2r;
    drag.angle  = Math.max(-lim, Math.min(lim, Math.atan2(y - C.pivotY, x - C.pivotX)));
    drag.reveal = Math.min(1, Math.hypot(x - drag.startX, y - drag.startY) / C.revealDist);
    draw();
  });

  canvas.addEventListener('pointerdown', e => {
    if (passed || !stack.length) return;
    const [x, y] = pos(e);
    const [hx, hy] = handlePos();
    if (Math.hypot(x - hx, y - hy) > C.handleR + 10) return;
    drag = { layer: stack.pop(), angle: 0, reveal: 0, startX: x, startY: y };
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
    draw();
  });

  function release(e) {
    if (!drag) return;
    const [x, y] = pos(e);
    const d = drag;
    drag = null;
    canvas.style.cursor = 'default';
    const slot = dotOrder.findIndex((_, s) => { const [dx, dy] = dotPos(s); return Math.hypot(x - dx, y - dy) < C.snapDist; });
    if (slot >= 0 && dotOrder[slot] === d.layer) {
      placed.push({ layer: d.layer, angle: slotAngle(slot) });
      if (!stack.length) {
        passed = true;
        _setStatus('✓ White light fanned out into all its colours — that\'s a spectrum!', true);
        setTimeout(_miniGamePassed, 1300);
      } else {
        _setStatus(`✓ ${C.layers[d.layer].name} separated — ${stack.length} to go`, true);
      }
    } else {
      stack.push(d.layer);   // back on top of the pile
      _setStatus(slot >= 0
        ? `That sheet is ${C.layers[d.layer].name} — swing it to the ${C.layers[d.layer].name} dot.`
        : `Swing the sheet all the way to its colour dot.`, false);
    }
    draw();
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  _setStatus(`Separate all ${n} colours from the white light`, false);
  draw();
}

// ──────────────────────────────────────────────────────────
// PFS — Stretch the color bands from a prism to the right edge
// ──────────────────────────────────────────────────────────
function _game_pfs() {
  _setTeaches('PFS separates starlight into 2,400 spectra simultaneously. Drag each color band to the right to complete the spectrum!');

  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="360" height="260" style="display:block;margin:auto;cursor:pointer"></canvas>
    <div style="text-align:center;margin-top:6px;font-size:13px;color:var(--muted)">Drag the colored bands to the right edge</div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');

  const spectralColors = [
    {c:'#ff2200',label:'700nm'}, {c:'#ff7700',label:'620nm'},
    {c:'#ffee00',label:'580nm'}, {c:'#44ff00',label:'530nm'},
    {c:'#00aaff',label:'470nm'}, {c:'#5500ff',label:'420nm'},
  ];
  const bandH   = 28;
  const prismX  = 60;
  const goalX   = 330;
  const startX  = 110; // starting x of each band
  const bandW   = 50;

  const bands = spectralColors.map((sc, i) => ({
    ...sc,
    x: startX,
    y: 20 + i * (bandH + 4),
    done: false,
  }));

  let dragging  = null;
  let dragOffX  = 0;

  function draw() {
    ctx.clearRect(0,0,360,260);
    ctx.fillStyle='#040810'; ctx.fillRect(0,0,360,260);

    // White input bar
    ctx.fillStyle='#ffffff';
    ctx.fillRect(20, 10, 40, bands.length*(bandH+4));
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.font='9px sans-serif'; ctx.textAlign='center';
    ctx.fillText('Light', 40, bands.length*(bandH+4)/2 + 14);

    // Triangle prism
    ctx.fillStyle='rgba(126,207,237,0.4)';
    const pH = bands.length*(bandH+4);
    ctx.beginPath();
    ctx.moveTo(prismX, 10);
    ctx.lineTo(prismX + 50, 10 + pH/2);
    ctx.lineTo(prismX, 10 + pH);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#7ecfed'; ctx.lineWidth=1.5; ctx.stroke();

    // Goal line
    ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1;
    ctx.setLineDash([4,4]);
    ctx.beginPath();
    ctx.moveTo(goalX, 10); ctx.lineTo(goalX, 10 + bands.length*(bandH+4));
    ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font='9px sans-serif'; ctx.textAlign='center';
    ctx.fillText('Goal', goalX, 10 + bands.length*(bandH+4) + 12);

    // Bands
    bands.forEach(b => {
      ctx.fillStyle = b.c;
      ctx.fillRect(b.x, b.y, bandW, bandH);
      if (b.done) {
        ctx.strokeStyle='#44ee44'; ctx.lineWidth=2;
        ctx.strokeRect(b.x, b.y, bandW, bandH);
      }
      ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.font='9px sans-serif'; ctx.textAlign='center';
      ctx.fillText(b.label, b.x + bandW/2, b.y + bandH/2 + 4);
    });

    const done = bands.filter(b=>b.done).length;
    ctx.fillStyle='#fff'; ctx.font='bold 12px sans-serif'; ctx.textAlign='left';
    ctx.fillText(`${done}/${bands.length}`, 10, 250);
  }

  canvas.addEventListener('mousedown', e => {
    const r  = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    bands.forEach((b,i) => {
      if (!b.done && mx >= b.x && mx <= b.x+bandW && my >= b.y && my <= b.y+bandH) {
        dragging = i; dragOffX = mx - b.x;
      }
    });
  });
  window.addEventListener('mousemove', e => {
    if (dragging === null) return;
    const r  = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    bands[dragging].x = Math.max(startX, Math.min(goalX - bandW, mx - dragOffX));
    draw();
  });
  window.addEventListener('mouseup', e => {
    if (dragging === null) return;
    const b = bands[dragging];
    if (b.x >= goalX - bandW - 10) {
      b.x    = goalX - bandW;
      b.done = true;
      const done = bands.filter(bd=>bd.done).length;
      _setStatus(`${done}/${bands.length} bands extended`, done===bands.length);
      if (done === bands.length) {
        draw();
        setTimeout(_miniGamePassed, 800);
      }
    }
    dragging = null;
    draw();
  });

  draw();
}

// ──────────────────────────────────────────────────────────
// MOIRCS — which camera has the wide field of view?
// Three cameras look at the same real patch of sky (a Subaru image
// of the Coma galaxy cluster). The wider the field of view, the
// more galaxies fit in one picture — that one is MOIRCS.
// ──────────────────────────────────────────────────────────
function _game_moircs() {
  _setTeaches('MOIRCS has a 4′×7′ field of view — wide for an infrared camera on a large telescope. A wider field means more galaxies caught in a single picture.');

  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <div style="display:flex;gap:12px;justify-content:center;align-items:flex-start;padding:10px 0" id="moircs-cards"></div>
    <div style="text-align:center;font-size:13px;color:var(--muted)">Three cameras pointed at the same patch of sky. Which picture was taken by MOIRCS?</div>`;

  // Real picture: Coma cluster (Subaru). Each camera sees a square of this size (source pixels)
  // around the same spot; a small square means a narrow, zoomed-in view.
  const SRC = '../../assets/star-pic/cluster/coma-cluster.jpg';
  const cards = [
    { view: 672, cx: 1240, cy: 1240, correct: true,  name: 'MOIRCS — wide field' },
    { view: 300, cx: 1180, cy: 1230, correct: false, name: 'Narrower camera' },
    { view: 130, cx: 1079, cy: 1206, correct: false, name: 'Narrowest camera' },
  ];
  cards.sort(() => Math.random() - 0.5);
  const S = 106;                                   // card size on screen
  let done = false;

  // Fallback if the photo cannot be loaded: soft-edged galaxies with bright cores
  function fake(ctx, card) {
    ctx.fillStyle = '#05060c'; ctx.fillRect(0, 0, S, S);
    const zoom = 672 / card.view, n = Math.round(46 / (zoom * zoom)) + 1;
    for (let s = 0; s < 60 / zoom; s++) { ctx.fillStyle = `rgba(255,255,255,${.2 + Math.random() * .5})`; ctx.fillRect(Math.random() * S, Math.random() * S, 1, 1); }
    for (let g = 0; g < n; g++) {
      const x = Math.random() * S, y = Math.random() * S, r = (2 + Math.random() * 3) * zoom;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.random() * Math.PI); ctx.scale(1, .35 + Math.random() * .5);
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      gr.addColorStop(0, 'rgba(255,244,220,.95)'); gr.addColorStop(.25, 'rgba(240,210,160,.5)'); gr.addColorStop(1, 'rgba(200,160,110,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }

  const container = document.getElementById('moircs-cards');
  const img = new Image();
  cards.forEach((card, i) => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'text-align:center;cursor:pointer';
    const canvas = document.createElement('canvas');
    canvas.width = S; canvas.height = S;
    canvas.style.cssText = 'display:block;border:2px solid #8a8f98';
    const lbl = document.createElement('div');
    lbl.textContent = 'Camera ' + 'ABC'[i];
    lbl.style.cssText = 'font-size:12px;color:var(--muted);margin-top:5px';
    wrapper.appendChild(canvas); wrapper.appendChild(lbl); container.appendChild(wrapper);
    card.paint = ok => {
      const c = canvas.getContext('2d');
      if (ok) c.drawImage(img, card.cx - card.view / 2, card.cy - card.view / 2, card.view, card.view, 0, 0, S, S);
      else fake(c, card);
    };
    card.paint(false);

    wrapper.addEventListener('click', () => {
      if (done) return;
      if (card.correct) {
        done = true;
        canvas.style.border = '3px solid #2fae52';
        cards.forEach((k, j) => { container.children[j].lastChild.textContent = k.name; });
        _setStatus('✓ Correct! The widest view holds the most galaxies — that is MOIRCS.', true);
        setTimeout(_miniGamePassed, 1800);
      } else {
        canvas.style.border = '3px solid #d9534f';
        _setStatus('Not quite — that camera is zoomed in on a small patch. Look for the picture with the most galaxies.', false);
      }
    });
  });
  img.onload = () => cards.forEach(c => c.paint(true));
  img.src = SRC;
}

// ──────────────────────────────────────────────────────────
// FOCAS — Faint Object Camera And Spectrograph
// 1. Camera: hold the shutter open. A short exposure is mostly
//    noise; as light adds up, the faint galaxy rises out of it.
// 2. Spectrograph: click the galaxy to put the slit on it and
//    spread its light into a spectrum.
// ──────────────────────────────────────────────────────────
function _game_focas() {
  _setTeaches('FOCAS is built for very faint objects. A short exposure is mostly noise — keep the shutter open and the light adds up until the galaxy rises out of the noise. Then FOCAS can spread that light into a spectrum.');

  const W = 360, H = 262, IH = 200, GW = 90, GH = 50, NEED_MIN = 30;
  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="${W}" height="${H}" style="display:block;margin:auto"></canvas>
    <div style="text-align:center;margin-top:8px">
      <button id="focas-btn" class="mg-btn" style="font-size:16px;padding:10px 32px;touch-action:none">Hold to expose</button>
    </div>
    <div id="focas-hint" style="text-align:center;margin-top:6px;font-size:13px;color:var(--muted)">Hold the button to keep the shutter open. You can let go and continue — exposures add up.</div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');
  const btn    = document.getElementById('focas-btn');
  const hint   = document.getElementById('focas-hint');

  // Small detector image, drawn enlarged so single pixels can be seen
  const det = document.createElement('canvas'); det.width = GW; det.height = GH;
  const dctx = det.getContext('2d'), frame = dctx.createImageData(GW, GH);
  const signal = new Float32Array(GW * GH), noise = new Float32Array(GW * GH);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const dx = x - 45, dy = y - 24, u = dx * .94 + dy * .34, v = -dx * .34 + dy * .94;     // tilted ellipse
    signal[y * GW + x] = .34 * Math.exp(-(u * u) / 150 - (v * v) / 22) + .5 * Math.exp(-(u * u + v * v) / 5);
  }
  [[12, 9], [70, 12], [78, 40], [22, 42]].forEach(p => { signal[p[1] * GW + p[0]] += .5; });   // a few faint stars
  const roll = () => { for (let i = 0; i < noise.length; i++) noise[i] = Math.random() + Math.random() + Math.random() - 1.5; };
  roll();

  let minutes = 0, holding = false, stage = 'expose', frameNo = 0;
  const sigma = () => 1.15 / Math.sqrt(1 + minutes * 1.2);        // noise shrinks as light adds up
  const snr   = () => .34 / (.5 * sigma());

  function draw() {
    if (document.getElementById('mg-canvas') !== canvas) return;      // game was closed
    if (holding && stage === 'expose') {
      minutes = Math.min(NEED_MIN, minutes + 0.11);
      if (frameNo % 4 === 0) roll();                                   // new photons keep arriving
      if (minutes >= NEED_MIN) {
        stage = 'slit'; holding = false; btn.disabled = true; btn.textContent = 'Exposure complete';
        hint.textContent = 'The galaxy is clear now. Click it to place the spectrograph slit on it.';
        canvas.style.cursor = 'crosshair';
        _setStatus('Picture taken — now use FOCAS as a spectrograph.', false);
      }
    }
    frameNo++;

    const s = sigma(), d = frame.data;
    for (let i = 0; i < signal.length; i++) {
      const v = Math.max(0, Math.min(1, .16 + signal[i] + noise[i] * s)) * 255;
      d[i * 4] = v; d[i * 4 + 1] = v; d[i * 4 + 2] = v * 1.04; d[i * 4 + 3] = 255;
    }
    dctx.putImageData(frame, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(det, 0, 0, W, IH);

    // Read-outs
    ctx.fillStyle = '#040810'; ctx.fillRect(0, IH, W, H - IH);
    if (stage !== 'done') {
      ctx.fillStyle = '#1c2632'; ctx.fillRect(10, IH + 22, 340, 10);
      ctx.fillStyle = minutes >= NEED_MIN ? '#5fe07a' : '#fff';
      ctx.fillRect(10, IH + 22, 340 * minutes / NEED_MIN, 10);
      ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`Exposure time: ${Math.floor(minutes)} min`, 10, IH + 16);
      ctx.textAlign = 'right';
      ctx.fillText(`Signal-to-noise: ${snr().toFixed(1)}`, 350, IH + 16);
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(minutes < 4 ? 'Almost all noise — is anything there?' : minutes < 15 ? 'Something is appearing in the middle…' : 'Longer exposure → less noise → fainter objects', W / 2, IH + 48);
    } else {
      // Slit on the galaxy + its spectrum
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(118, 86, 124, 20);
      ctx.fillStyle = '#fff'; ctx.font = '9px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('slit', 246, 99);
      const g = ctx.createLinearGradient(10, 0, 350, 0);
      ['#5a00b0', '#2030ff', '#00b0e0', '#20d040', '#f0e020', '#ff8000', '#c00000'].forEach((c, j) => g.addColorStop(j / 6, c));
      ctx.globalAlpha = .55; ctx.fillStyle = g; ctx.fillRect(10, IH + 8, 340, 26); ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff'; ctx.fillRect(246, IH + 6, 3, 30);                    // bright emission line
      ctx.fillStyle = '#04060c'; ctx.fillRect(120, IH + 8, 2, 26); ctx.fillRect(180, IH + 8, 2, 26);
      ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('The galaxy\'s spectrum. Its lines tell how far away it is and what it is made of.', W / 2, IH + 52);
    }
    requestAnimationFrame(draw);
  }

  const press   = e => { if (e) e.preventDefault(); if (stage === 'expose') holding = true; };
  const release = () => { holding = false; };
  btn.addEventListener('mousedown', press);
  btn.addEventListener('touchstart', press, { passive: false });
  window.addEventListener('mouseup', release);
  window.addEventListener('touchend', release);

  canvas.addEventListener('click', e => {
    if (stage !== 'slit') return;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
    if (Math.abs(x - 180) < 70 && Math.abs(y - 96) < 40) {
      stage = 'done'; canvas.style.cursor = 'default';
      hint.textContent = 'FOCAS = Faint Object Camera And Spectrograph: one instrument, two jobs.';
      _setStatus('✓ Faint galaxy imaged and its spectrum taken!', true);
      setTimeout(_miniGamePassed, 2600);
    } else {
      _setStatus('The slit must sit on the galaxy — click the glow in the middle.', false);
    }
  });

  requestAnimationFrame(draw);
}

// ──────────────────────────────────────────────────────────
// COMICS — slide through wavelengths to find the warm dust
// A young star sits inside a dusty cloud. The slider changes the
// wavelength the camera looks at:
//   visible   → the cold cloud is dark and hides the star
//   near-IR   → starlight begins to pass through the dust
//   mid-IR    → the warm dust itself glows (COMICS: 8–25 µm)
// Tune into the COMICS range and take the picture.
// ──────────────────────────────────────────────────────────
function _game_comics() {
  _setTeaches('Everything warm gives off light, but at wavelengths far too long for our eyes. COMICS looks in the mid-infrared (8–25 µm), where warm dust around young stars shines. Slide through the wavelengths and watch what appears.');

  const W = 360, H = 250, IH = 196;
  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="${W}" height="${H}" style="display:block;margin:auto"></canvas>
    <div class="mg-row" style="width:min(360px,100%);margin:8px auto 0">
      <span class="mg-label" style="min-width:0">Wavelength</span>
      <input id="comics-wl" class="mg-slider" type="range" min="0" max="100" value="4">
    </div>
    <div id="comics-info" style="text-align:center;margin-top:4px;font-size:13px;color:var(--muted);min-height:2.6em"></div>
    <div style="text-align:center;margin-top:6px"><button id="comics-shot" class="mg-btn">Take image</button></div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');
  const slider = document.getElementById('comics-wl');
  const info   = document.getElementById('comics-info');
  const shot   = document.getElementById('comics-shot');
  let done = false;

  const LMIN = 0.4, LMAX = 25;                                   // micrometres, logarithmic slider
  const wl   = () => LMIN * Math.pow(LMAX / LMIN, slider.value / 100);
  const frac = l => Math.log(l / LMIN) / Math.log(LMAX / LMIN);
  const step = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // Fixed star field and cloud shape
  const stars = []; for (let i = 0; i < 90; i++) stars.push([(i * 137.5) % W, (i * 89.3) % IH, .3 + ((i * 73) % 10) * .06]);
  const cloud = [[180, 98, 62], [140, 110, 44], [222, 92, 46], [170, 70, 40], [198, 128, 42], [118, 86, 30], [246, 118, 30]];
  const dust  = [[180, 98, 60, 1], [150, 112, 34, .7], [214, 90, 36, .7], [186, 124, 30, .55]];

  function draw() {
    const l = wl();
    const through = step(.8, 3, l);            // how well starlight gets through the dust
    const warm    = step(4, 10, l);            // how brightly the dust itself glows

    // Sky: in the mid-infrared even the sky and the telescope glow a little
    ctx.fillStyle = `rgb(${Math.round(4 + 34 * warm)},${Math.round(8 + 8 * warm)},${Math.round(16 - 8 * warm)})`;
    ctx.fillRect(0, 0, W, IH);
    stars.forEach(s => { ctx.fillStyle = `rgba(255,255,255,${s[2] * (1 - .85 * warm)})`; ctx.fillRect(s[0], s[1], 1.4, 1.4); });

    // The cold dust cloud: an opaque dark shape in visible light, clearing in the infrared
    ctx.globalAlpha = 1 - through;
    ctx.fillStyle = '#020308';
    cloud.forEach(c => { ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;

    // The young star inside
    const sa = through * (1 - .45 * warm);
    if (sa > .01) {
      const g = ctx.createRadialGradient(180, 98, 0, 180, 98, 22);
      g.addColorStop(0, `rgba(255,250,235,${sa})`); g.addColorStop(.3, `rgba(255,190,120,${sa * .7})`); g.addColorStop(1, 'rgba(255,150,80,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(180, 98, 22, 0, Math.PI * 2); ctx.fill();
    }

    // Warm dust glowing by its own heat
    if (warm > .01) {
      ctx.globalCompositeOperation = 'lighter';
      dust.forEach(d => {
        const g = ctx.createRadialGradient(d[0], d[1], d[2] * .15, d[0], d[1], d[2]);
        g.addColorStop(0, `rgba(255,170,60,${.75 * warm * d[3]})`); g.addColorStop(.6, `rgba(230,80,20,${.4 * warm * d[3]})`); g.addColorStop(1, 'rgba(160,30,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(d[0], d[1], d[2], 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
    }

    const band = l < .75 ? 'VISIBLE LIGHT' : l < 5 ? 'NEAR-INFRARED' : 'MID-INFRARED';
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`${band} · ${l < 1 ? l.toFixed(2) : l.toFixed(1)} µm`, 8, 16);

    // ── Wavelength scale ──
    ctx.fillStyle = '#040810'; ctx.fillRect(0, IH, W, H - IH);
    const X0 = 14, SW = W - 28, y = IH + 14, x = f => X0 + f * SW;
    const rb = ctx.createLinearGradient(x(0), 0, x(frac(.75)), 0);
    ['#5a00b0', '#2030ff', '#20d040', '#f0e020', '#ff8000', '#c00000'].forEach((c, j) => rb.addColorStop(j / 5, c));
    ctx.fillStyle = rb;        ctx.fillRect(x(0), y, x(frac(.75)) - x(0), 12);
    ctx.fillStyle = '#7a1a14'; ctx.fillRect(x(frac(.75)), y, x(frac(5)) - x(frac(.75)), 12);
    ctx.fillStyle = '#4a0f0c'; ctx.fillRect(x(frac(5)), y, x(1) - x(frac(5)), 12);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('visible', (x(0) + x(frac(.75))) / 2, y + 24);
    ctx.fillText('near-infrared', (x(frac(.75)) + x(frac(5))) / 2, y + 24);
    ctx.fillText('mid-infrared', (x(frac(5)) + x(1)) / 2, y + 24);
    // What COMICS can see
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(x(frac(8)), y - 3, x(1) - x(frac(8)), 18);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif';
    ctx.fillText('COMICS', (x(frac(8)) + x(1)) / 2, y + 36);
    // Current wavelength
    const mx = x(frac(l));
    ctx.beginPath(); ctx.moveTo(mx, y - 2); ctx.lineTo(mx - 5, y - 11); ctx.lineTo(mx + 5, y - 11); ctx.closePath(); ctx.fill();

    info.textContent = l < .75 ? 'Visible light: the dust cloud is cold and dark. It blocks everything behind it — and the young star inside.'
      : l < 5 ? 'Near-infrared: longer waves slip through the dust, so the hidden star starts to shine through.'
      : l < 8 ? 'The dust is beginning to glow by its own heat. Go a little further, into the COMICS range.'
      : 'Mid-infrared: now the warm dust itself shines! Even the sky glows faintly, which is why COMICS is kept extremely cold.';
  }

  slider.addEventListener('input', draw);
  shot.addEventListener('click', () => {
    if (done) return;
    const l = wl();
    if (l >= 8) {
      done = true; slider.disabled = true;
      _setStatus('✓ Warm dust detected! Dust near room temperature glows brightest around 10 µm.', true);
      setTimeout(_miniGamePassed, 2200);
    } else {
      _setStatus(l < .75 ? 'In visible light there is only a dark cloud. Try longer wavelengths.'
        : 'Closer — but the dust is not glowing yet. Slide into the COMICS range (8–25 µm).', false);
    }
  });

  draw();
}

// ──────────────────────────────────────────────────────────
// CIAO — Coronagraph mask + Lyot stop
// 1. Drag the solid mask onto the star to block its bright core.
// 2. Light still leaks around the mask's edge as a blurry glow —
//    drag the hollow Lyot stop over that glow to block it too.
// With both in place, the faint planet next to the star appears.
// ──────────────────────────────────────────────────────────
function _game_ciao() {
  _setTeaches('CIAO is a coronagraph: a mask blocks the star\'s bright centre, and a ring-shaped Lyot stop blocks the light that still leaks around the mask\'s edge. Only then does the faint planet show up!');

  const W = 360, H = 260;
  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="${W}" height="${H}" style="display:block;margin:auto;cursor:move;touch-action:none"></canvas>
    <div style="text-align:center;margin-top:6px;font-size:13px;color:var(--muted)">Drag the mask onto the star, then drag the hollow Lyot stop over the blurry glow</div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');

  const starX = 180, starY = 118, starR = 15;
  const haloR = 62;                                 // reach of the blurry scattered light
  // Fuzzy blobs (speckles) inside the scattered glow — fixed positions
  const speckles = Array.from({ length: 11 }, (_, i) => {
    const a = i * 2.39, r = 26 + (i * 37) % 26;
    return { x: starX + Math.cos(a) * r, y: starY + Math.sin(a) * r, r: 6 + (i * 5) % 6 };
  });
  const planetX = starX + 68, planetY = starY - 40, planetR = 6;
  const SNAP = 9;                                   // how close counts as "on the star"

  const mask = { x: 55,  y: 212, r: 22 };           // solid occulting mask
  const lyot = { x: 298, y: 196, rIn: 27, rOut: 54 }; // hollow Lyot stop
  let drag = null, dx = 0, dy = 0;
  let passed = false;

  const onStar = o => Math.hypot(o.x - starX, o.y - starY) < SNAP;

  function glow(r0, r1, alpha) {
    const g = ctx.createRadialGradient(starX, starY, r0, starX, starY, r1);
    g.addColorStop(0, `rgba(255,236,170,${alpha})`);
    g.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.beginPath(); ctx.arc(starX, starY, r1, 0, Math.PI*2);
    ctx.fillStyle = g; ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#040810'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.1 + ((i*73)%10)*0.05})`;
      ctx.fillRect((i*137) % W, (i*97) % H, 1, 1);
    }

    const masked = onStar(mask), stopped = onStar(lyot);

    // Wide glare: drowns out the planet unless BOTH core and glow are blocked
    if (!(masked && stopped)) glow(0, 110, masked || stopped ? 0.35 : 0.6);

    // Star core
    if (!masked) {
      glow(0, starR + 18, 0.9);
      ctx.beginPath(); ctx.arc(starX, starY, starR, 0, Math.PI*2);
      ctx.fillStyle = '#fffde0'; ctx.fill();
    }

    // Scattered light: a soft, blurry glow around the star (blocked by the Lyot stop)
    if (!stopped) {
      ctx.save();
      ctx.filter = 'blur(6px)';
      const g = ctx.createRadialGradient(starX, starY, 0, starX, starY, haloR);
      g.addColorStop(0,    'rgba(255,242,200,0.85)');
      g.addColorStop(0.55, 'rgba(255,236,170,0.5)');
      g.addColorStop(1,    'rgba(255,236,170,0)');
      ctx.beginPath(); ctx.arc(starX, starY, haloR, 0, Math.PI*2);
      ctx.fillStyle = g; ctx.fill();
      speckles.forEach(s => {
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,240,190,0.45)'; ctx.fill();
      });
      ctx.restore();
    }

    // Planet — only visible once all the starlight is blocked
    if (masked && stopped) {
      const pg = ctx.createRadialGradient(planetX, planetY, 1, planetX, planetY, planetR);
      pg.addColorStop(0, '#9fd0ff'); pg.addColorStop(1, '#2a60b0');
      ctx.beginPath(); ctx.arc(planetX, planetY, planetR, 0, Math.PI*2);
      ctx.fillStyle = pg; ctx.fill();
      ctx.fillStyle = '#44ee44'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Planet!', planetX, planetY - planetR - 5);
    }

    // Mask (solid)
    ctx.beginPath(); ctx.arc(mask.x, mask.y, mask.r, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(26,37,48,0.96)'; ctx.fill();
    ctx.strokeStyle = masked ? '#44ee44' : '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('mask', mask.x, mask.y + 3);

    // Lyot stop (hollow ring)
    ctx.beginPath();
    ctx.arc(lyot.x, lyot.y, lyot.rOut, 0, Math.PI*2);
    ctx.arc(lyot.x, lyot.y, lyot.rIn, 0, Math.PI*2, true);
    ctx.fillStyle = 'rgba(26,37,48,0.96)'; ctx.fill('evenodd');
    ctx.strokeStyle = stopped ? '#44ee44' : '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(lyot.x, lyot.y, lyot.rOut, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(lyot.x, lyot.y, lyot.rIn,  0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('Lyot stop', lyot.x, lyot.y + lyot.rOut - 10);
  }

  function status() {
    const masked = onStar(mask), stopped = onStar(lyot);
    if (masked && stopped) return;
    if (masked)  _setStatus('Star core blocked — but light still leaks around the edge. Cover the blurry glow with the Lyot stop!', false);
    else if (stopped) _setStatus('Glow blocked — now cover the star\'s bright centre with the mask.', false);
    else _setStatus('Step 1: drag the mask onto the star.', false);
  }

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height];
  }

  canvas.addEventListener('pointerdown', e => {
    if (passed) return;
    const [x, y] = pos(e);
    if (Math.hypot(x - mask.x, y - mask.y) < mask.r + 6) drag = mask;          // mask sits on top
    else if (Math.hypot(x - lyot.x, y - lyot.y) < lyot.rOut + 6) drag = lyot;
    else return;
    dx = x - drag.x; dy = y - drag.y;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const [x, y] = pos(e);
    drag.x = x - dx; drag.y = y - dy;
    draw();
  });
  function release() {
    if (!drag) return;
    // Snap neatly onto the star when close enough
    if (onStar(drag)) { drag.x = starX; drag.y = starY; }
    drag = null;
    draw();
    if (!passed && onStar(mask) && onStar(lyot)) {
      passed = true;
      _setStatus('✓ Starlight blocked — planet revealed!', true);
      setTimeout(_miniGamePassed, 1100);
    } else {
      status();
    }
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  status();
  draw();
}

// ──────────────────────────────────────────────────────────
// HiCIAO — is it a planet or a speckle?
// Even with the star masked, small flaws in the optics leave
// "speckles" that look exactly like planets. During a night the
// sky slowly turns as seen by the telescope: a real planet turns
// with the sky, the speckles stay fixed to the instrument.
// Slide through the night and click the dot that moves.
// ──────────────────────────────────────────────────────────
function _game_hiciao() {
  _setTeaches('With the star hidden, HiCIAO still sees "speckles" — smudges of leftover starlight that look just like planets. The trick: over a night the sky slowly turns above the telescope. A real planet turns with the sky; speckles stay put. Subtract what stays put, and the planet remains.');

  const W = 360, H = 232, CX = 180, CY = 112;
  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="${W}" height="${H}" style="display:block;margin:auto;cursor:crosshair"></canvas>
    <div class="mg-row" style="width:min(360px,100%);margin:8px auto 0">
      <span class="mg-label" style="min-width:0">Time</span>
      <input id="hic-time" class="mg-slider" type="range" min="0" max="100" value="0">
    </div>
    <div style="text-align:center;margin-top:4px;font-size:13px;color:var(--muted)">Slide through the night, then click the one dot that moves — the real planet.</div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');
  const slider = document.getElementById('hic-time');

  const PR = 74, A0 = -2.2, SWEEP = 1.1;                 // planet: radius, start angle, how far the sky turns
  const speckles = [];
  for (let i = 0; i < 9; i++) {
    const inner = i % 2 === 0;                           // keep speckles off the planet's own track
    speckles.push({ r: inner ? 34 + Math.random() * 22 : 92 + Math.random() * 14, a: i / 9 * Math.PI * 2 + Math.random() * .4 });
  }
  let found = false, fade = 0;
  const planet = () => { const a = A0 + slider.value / 100 * SWEEP; return [CX + Math.cos(a) * PR, CY + Math.sin(a) * PR]; };

  function dot(x, y, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 8);
    g.addColorStop(0, `rgba(255,255,255,${alpha})`); g.addColorStop(.4, `rgba(255,235,210,${alpha * .55})`); g.addColorStop(1, 'rgba(255,230,200,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
  }

  function draw() {
    if (document.getElementById('mg-canvas') !== canvas) return;
    ctx.fillStyle = '#040810'; ctx.fillRect(0, 0, W, H);
    const rest = 1 - fade;                                // leftover starlight (fades out once subtracted)

    const halo = ctx.createRadialGradient(CX, CY, 12, CX, CY, 110);
    halo.addColorStop(0, `rgba(255,240,220,${.4 * rest})`); halo.addColorStop(1, 'rgba(255,240,220,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(CX, CY, 110, 0, Math.PI * 2); ctx.fill();
    speckles.forEach(s => dot(CX + Math.cos(s.a) * s.r, CY + Math.sin(s.a) * s.r, .9 * rest));

    if (found) {                                          // the path the planet took across the night
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(CX, CY, PR, A0, A0 + SWEEP); ctx.stroke(); ctx.setLineDash([]);
    }
    const p = planet(); dot(p[0], p[1], .9);
    if (found) {
      ctx.strokeStyle = '#5fe07a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p[0], p[1], 12, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#5fe07a'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('planet', p[0], p[1] - 17);
    }

    // The mask hiding the star
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(CX, CY, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.stroke();

    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`Time: ${(slider.value / 100 * 3).toFixed(1)} h into the night`, 8, 16);
    if (found && fade >= 1) {
      ctx.textAlign = 'center'; ctx.fillStyle = '#5fe07a';
      ctx.fillText('Everything that stayed still was subtracted. Only the planet is left.', W / 2, H - 8);
    }
    if (found && fade < 1) { fade = Math.min(1, fade + .02); requestAnimationFrame(draw); }
  }

  slider.addEventListener('input', draw);
  canvas.addEventListener('click', e => {
    if (found) return;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
    const p = planet();
    if (Math.hypot(x - p[0], y - p[1]) < 14) {
      found = true; canvas.style.cursor = 'default';
      _setStatus('✓ That one moved with the sky — a real planet!', true);
      requestAnimationFrame(draw);
      setTimeout(_miniGamePassed, 2400);
    } else if (speckles.some(s => Math.hypot(x - CX - Math.cos(s.a) * s.r, y - CY - Math.sin(s.a) * s.r) < 14)) {
      _setStatus('That dot never moves — it is a speckle made inside the instrument. Slide the time and look for the one that travels.', false);
    }
  });

  draw();
}

// ──────────────────────────────────────────────────────────
// SCExAO — three stages, one after another
// Switch each stage on or off and watch what it does to the star:
//   first AO stage (AO188 / AO3K)  → blob becomes a sharp star
//   SCExAO extreme AO              → the flickering speckles calm down
//   coronagraph                    → the star itself is blocked
// Only with all three is the sky dark enough to see the planet.
// ──────────────────────────────────────────────────────────
function _game_scexao() {
  _setTeaches('SCExAO works as the last link of a chain. Subaru\'s first adaptive optics sharpens the star, SCExAO\'s 2,000-actuator mirror then removes what is left of the blur, and a coronagraph finally blocks the star. Switch the stages on and off to see what each one does.');

  const W = 360, H = 216, CX = 180, CY = 104, PX = 228, PY = 78;
  const STAGES = [['ao', 'First AO'], ['ex', 'SCExAO extreme AO'], ['co', 'Coronagraph']];
  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="${W}" height="${H}" style="display:block;margin:auto"></canvas>
    <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:8px">
      ${STAGES.map(s => `<button class="mg-btn outline" id="sx-${s[0]}" style="padding:7px 12px">${s[1]}: OFF</button>`).join('')}
    </div>
    <div id="sx-hint" style="text-align:center;margin-top:6px;font-size:13px;color:var(--muted);min-height:2.6em"></div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');
  const hint   = document.getElementById('sx-hint');
  const on = { ao: false, ex: false, co: false };
  let done = false, frameNo = 0, boil = [];
  const still = []; for (let i = 0; i < 6; i++) still.push([30 + Math.random() * 55, Math.random() * Math.PI * 2]);

  function soft(x, y, r, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,250,240,${a})`); g.addColorStop(1, 'rgba(255,245,230,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const message = () => {
    const q = on.ao ? (on.ex ? 2 : 1) : 0;
    if (q === 2 && on.co) return 'Sharp star + calm speckles + mask: the sky beside the star is finally dark. Click the planet!';
    if (!on.ao && on.ex)  return 'SCExAO needs light the first AO stage has already tidied up — alone it cannot keep up with the air.';
    if (!on.ao && on.co)  return 'The mask is tiny. A blurry star simply spills out all around it.';
    if (q === 1 && on.co) return 'The star\'s core is hidden, but the flickering speckles left around it still look just like planets.';
    if (q === 2)          return 'Extreme AO: the speckles calm down and the star is nearly perfect — but it is still far too bright.';
    if (q === 1)          return 'First AO on: the blob shrinks to a sharp star, but a halo of flickering speckles remains.';
    return 'Telescope only: the air smears the star into a boiling blob. Switch the stages on.';
  };

  function draw() {
    if (document.getElementById('mg-canvas') !== canvas) return;
    const q = on.ao ? (on.ex ? 2 : 1) : 0, dark = q === 2 && on.co;
    if (frameNo % 5 === 0) {                              // the air changes all the time
      boil = [];
      const n = q === 0 ? 30 : 14;
      for (let i = 0; i < n; i++) {
        const r = q === 0 ? Math.random() * 55 : 20 + Math.random() * 62, a = Math.random() * Math.PI * 2;
        boil.push([CX + Math.cos(a) * r, CY + Math.sin(a) * r]);
      }
    }
    frameNo++;

    ctx.fillStyle = '#040810'; ctx.fillRect(0, 0, W, H);
    soft(PX, PY, 6, .95);                                  // the planet is always there…
    ctx.globalCompositeOperation = 'lighter';             // …the starlight is what hides it
    if (q === 0) {
      boil.forEach(b => soft(b[0], b[1], 17, .3));
    } else {
      soft(CX, CY, 84, (q === 1 ? .42 : .14) * (on.co ? .55 : 1));          // halo
      if (q === 1) boil.forEach(b => soft(b[0], b[1], 6, .8));
      else still.forEach(s => soft(CX + Math.cos(s[1]) * s[0], CY + Math.sin(s[1]) * s[0], 5, on.co ? .1 : .3));
      if (!on.co) {
        soft(CX, CY, 46, .9); soft(CX, CY, 14, 1);
        if (q === 2) { ctx.strokeStyle = 'rgba(255,250,240,.35)'; ctx.lineWidth = 1.5; [22, 31].forEach(r => { ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI * 2); ctx.stroke(); }); }
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    if (on.co) {
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(CX, CY, 15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1; ctx.stroke();
    }
    if (done) {
      ctx.strokeStyle = '#5fe07a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(PX, PY, 12, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#5fe07a'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('planet', PX, PY - 17);
    }
    canvas.style.cursor = dark && !done ? 'crosshair' : 'default';
    requestAnimationFrame(draw);
  }

  STAGES.forEach(s => {
    const b = document.getElementById('sx-' + s[0]);
    b.addEventListener('click', () => {
      if (done) return;
      on[s[0]] = !on[s[0]];
      b.textContent = `${s[1]}: ${on[s[0]] ? 'ON' : 'OFF'}`;
      b.classList.toggle('outline', !on[s[0]]);
      hint.textContent = message();
    });
  });
  canvas.addEventListener('click', e => {
    if (done || !(on.ao && on.ex && on.co)) return;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
    if (Math.hypot(x - PX, y - PY) < 16) {
      done = true;
      _setStatus('✓ Planet found — it took all three stages working together.', true);
      setTimeout(_miniGamePassed, 1600);
    } else {
      _setStatus('Look for the small steady point of light beside the mask.', false);
    }
  });

  hint.textContent = message();
  requestAnimationFrame(draw);
}

// ──────────────────────────────────────────────────────────
// CHARIS — a picture at every wavelength, and so a spectrum
// 1. Slide through the wavelengths. Speckles of starlight slide
//    outward as the wavelength grows; the planet stays where it
//    is. Click the planet.
// 2. Visit every wavelength: CHARIS measures the planet's
//    brightness in each one, building up its spectrum. The dips
//    are gases in the planet's atmosphere.
// ──────────────────────────────────────────────────────────
function _game_charis() {
  _setTeaches('CHARIS takes a picture at many infrared wavelengths at once. Speckles of starlight sit further out at longer wavelengths, but a planet stays in the same place — and its brightness in each picture adds up to a spectrum that shows what its atmosphere is made of.');

  const W = 360, H = 222, CX = 104, CY = 112;
  // Wavelength (µm) and the planet's brightness there (simplified: dips where gases absorb)
  const SLICES = [[1.15, .62], [1.33, .88], [1.50, .40], [1.68, .78], [1.86, .42], [2.04, .84], [2.22, .46], [2.40, .58]];
  const DIPS = { 2: 'water', 4: 'water', 6: 'methane' };
  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="${W}" height="${H}" style="display:block;margin:auto;cursor:crosshair"></canvas>
    <div class="mg-row" style="width:min(360px,100%);margin:8px auto 0">
      <span class="mg-label" style="min-width:0">Wavelength</span>
      <input id="charis-wl" class="mg-slider" type="range" min="0" max="${SLICES.length - 1}" value="0">
    </div>
    <div id="charis-hint" style="text-align:center;margin-top:4px;font-size:13px;color:var(--muted);min-height:2.6em">Slide through the wavelengths. The speckles slide in and out — click the one dot that stays in place: the planet.</div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');
  const slider = document.getElementById('charis-wl');
  const hint   = document.getElementById('charis-hint');

  const PL = [CX + Math.cos(-0.6) * 62, CY + Math.sin(-0.6) * 62];
  const speckles = []; for (let i = 0; i < 10; i++) speckles.push([19 + Math.random() * 24, i / 10 * Math.PI * 2 + Math.random() * .4]);
  const measured = new Array(SLICES.length).fill(false);
  let stage = 'find', done = false;
  const idx = () => +slider.value;
  const speckleAt = (s, i) => { const r = s[0] * SLICES[i][0] / SLICES[0][0]; return [CX + Math.cos(s[1]) * r, CY + Math.sin(s[1]) * r]; };

  function dot(x, y, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
    g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(.45, `rgba(255,235,215,${a * .5})`); g.addColorStop(1, 'rgba(255,230,210,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
  }

  function draw() {
    const i = idx();
    ctx.fillStyle = '#040810'; ctx.fillRect(0, 0, W, H);

    // ── The picture at this wavelength ──
    ctx.fillStyle = '#000'; ctx.fillRect(4, 12, 200, 200);
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.strokeRect(4.5, 12.5, 199, 199);
    ctx.save(); ctx.beginPath(); ctx.rect(4, 12, 200, 200); ctx.clip();
    speckles.forEach(s => { const p = speckleAt(s, i); dot(p[0], p[1], .8); });
    dot(PL[0], PL[1], .35 + .65 * SLICES[i][1]);
    ctx.restore();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(CX, CY, 12, 0, Math.PI * 2); ctx.fill();         // masked star
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke();
    if (stage !== 'find') {
      ctx.strokeStyle = '#5fe07a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(PL[0], PL[1], 11, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#5fe07a'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('planet', PL[0], PL[1] - 15);
    }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`${SLICES[i][0].toFixed(2)} µm`, 10, 27);

    // ── The planet's spectrum, filled in as wavelengths are visited ──
    const GX = 222, GY = 40, GW = 130, GH = 130, n = SLICES.length;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('The planet\'s spectrum', GX, 26);
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(GX + .5, GY); ctx.lineTo(GX + .5, GY + GH + .5); ctx.lineTo(GX + GW, GY + GH + .5); ctx.stroke();
    const px = k => GX + 10 + k * (GW - 20) / (n - 1), py = k => GY + GH - SLICES[k][1] * (GH - 14);
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(px(i) - 6, GY, 12, GH);                     // current wavelength
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath();
    let pen = false;
    for (let k = 0; k < n; k++) { if (!measured[k]) { pen = false; continue; } pen ? ctx.lineTo(px(k), py(k)) : ctx.moveTo(px(k), py(k)); pen = true; }
    ctx.stroke();
    for (let k = 0; k < n; k++) if (measured[k]) { ctx.fillStyle = '#ffb060'; ctx.beginPath(); ctx.arc(px(k), py(k), 3.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('1.15 µm', px(0) + 6, GY + GH + 12); ctx.fillText('2.40 µm', px(n - 1) - 6, GY + GH + 12);
    ctx.save(); ctx.translate(GX - 6, GY + GH / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('brightness', 0, 0); ctx.restore();
    if (done) {
      ctx.fillStyle = '#5fe07a'; ctx.font = 'bold 8px sans-serif';
      Object.keys(DIPS).forEach(k => ctx.fillText(DIPS[k], px(+k), py(+k) + 13));
    } else if (stage === 'measure') {
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '9px sans-serif';
      ctx.fillText(`${measured.filter(Boolean).length} of ${n} wavelengths measured`, GX + GW / 2, GY + GH + 28);
    }
  }

  function visit() {
    if (stage === 'measure') {
      measured[idx()] = true;
      if (measured.every(Boolean)) {
        stage = 'done'; done = true; slider.disabled = true;
        hint.textContent = 'The dips are colours swallowed by gases in the planet\'s atmosphere — here water vapour and methane.';
        _setStatus('✓ Spectrum complete — the planet\'s atmosphere can be read from it.', true);
        setTimeout(_miniGamePassed, 2400);
      }
    }
    draw();
  }
  slider.addEventListener('input', visit);
  canvas.addEventListener('click', e => {
    if (stage !== 'find') return;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
    if (Math.hypot(x - PL[0], y - PL[1]) < 13) {
      stage = 'measure'; canvas.style.cursor = 'default';
      hint.textContent = 'Found it. Now visit every wavelength — CHARIS measures the planet\'s brightness in each one.';
      _setStatus('Planet found. Now build its spectrum.', false);
      visit();
    } else if (speckles.some(s => { const p = speckleAt(s, idx()); return Math.hypot(x - p[0], y - p[1]) < 13; })) {
      _setStatus('That dot slides outward as the wavelength grows — it is a speckle of starlight, not a planet.', false);
    }
  });

  draw();
}

// ──────────────────────────────────────────────────────────
// VAMPIRES — subtract two pictures to remove the star
// Camera A and camera B photograph the same star through
// polarizing filters turned 90° apart.
//   • The star's own light is the same in both pictures.
//   • Light bounced off the dust ring is polarized, so the ring
//     is bright in different places in A and in B.
// Drag the slider to subtract B from A: whatever is the same
// (the star) disappears, whatever differs (the dust) is left.
// ──────────────────────────────────────────────────────────
function _game_vampires() {
  _setTeaches('A dust ring is hidden in the glare of its star. VAMPIRES takes two pictures at once through polarizing filters turned 90° apart. The star looks the same in both. The dust does not. Take one picture away from the other and the star cancels itself out.');

  const W = 360, H = 250, P = 112, R = 34, BINS = 36;
  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="${W}" height="${H}" style="display:block;margin:auto"></canvas>
    <div class="mg-row" style="width:min(360px,100%);margin:8px auto 0">
      <span class="mg-label" style="min-width:0">Subtract B from A</span>
      <input id="vamp-sub" class="mg-slider" type="range" min="0" max="100" value="0">
    </div>
    <div id="vamp-hint" style="text-align:center;margin-top:4px;font-size:13px;color:var(--muted);min-height:2.6em">Look closely: the star is identical in A and B, but the faint ring is brighter left-and-right in A and top-and-bottom in B. Drag the slider to subtract.</div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');
  const slider = document.getElementById('vamp-sub');
  const hint   = document.getElementById('vamp-hint');
  let done = false, fill = 0;                               // fill: 0→1, the second (45°) pair completing the ring
  const AX = 30, BX = 218, TY = 22, RX = 124, RY = 132;     // panel positions (result panel is larger)
  const RS = 112;

  // +1 where the ring is bright only in A (left/right), −1 where only in B (top/bottom)
  const pol = i => Math.cos(2 * (i / BINS * Math.PI * 2));
  function ring(cx, cy, i, style) {
    ctx.beginPath(); ctx.arc(cx, cy, R, (i - .55) / BINS * Math.PI * 2, (i + .55) / BINS * Math.PI * 2);
    ctx.strokeStyle = style; ctx.lineWidth = 9; ctx.stroke();
  }
  function glare(cx, cy, a) {
    if (a <= 0) return;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 54);
    g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(.3, `rgba(255,255,255,${.9 * a})`); g.addColorStop(.75, `rgba(255,250,235,${.5 * a})`); g.addColorStop(1, 'rgba(255,250,235,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 54, 0, Math.PI * 2); ctx.fill();
  }
  function frame(x, y, title) {
    ctx.fillStyle = '#000'; ctx.fillRect(x, y, P, P);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, P - 1, P - 1);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(title, x + P / 2, y - 6);
  }
  function camera(x, sign, title) {
    frame(x, TY, title);
    const cx = x + P / 2, cy = TY + P / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(x, TY, P, P); ctx.clip();
    for (let i = 0; i < BINS; i++) ring(cx, cy, i, `rgba(255,205,140,${.5 + .5 * sign * pol(i)})`);
    glare(cx, cy, .8);                                      // the star swamps the ring but does not quite hide it
    ctx.restore();
  }

  function draw() {
    if (document.getElementById('mg-canvas') !== canvas) return;
    const s = slider.value / 100;
    ctx.fillStyle = '#040810'; ctx.fillRect(0, 0, W, H);

    camera(AX, 1, 'Camera A');
    camera(BX, -1, 'Camera B');
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('−', W / 2, TY + P / 2 + 7);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '9px sans-serif';
    ctx.fillText('same star', W / 2, TY + P / 2 + 26); ctx.fillText('different ring', W / 2, TY + P / 2 + 38);

    // Result: A − B
    frame(RX, RY, '');
    const cx = RX + RS / 2, cy = RY + RS / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(RX, RY, RS, RS); ctx.clip();
    for (let i = 0; i < BINS; i++) {
      const p = pol(i), base = .5 + .5 * p;                 // what camera A alone shows
      // sliding from "A" to "A − B": parts equal in both fade, differing parts stay
      const a = base * (1 - s) + Math.abs(p) * s;
      ring(cx, cy, i, `rgba(255,205,140,${Math.max(a, fill * .9)})`);
    }
    glare(cx, cy, .8 * (1 - s));
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(s < 1 ? 'Result: A − B' : 'Result: only the dust', RX + RS + 8, RY + 16);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '9px sans-serif';
    ctx.fillText(`Star left: ${Math.round((1 - s) * 100)}%`, RX + RS + 8, RY + 34);
    if (s >= 1) {
      ctx.fillText('Repeating with the', RX + RS + 8, RY + 56);
      ctx.fillText('filters turned 45°', RX + RS + 8, RY + 68);
      ctx.fillText('fills in the gaps.', RX + RS + 8, RY + 80);
    }
    ctx.textAlign = 'right';
    ctx.fillText('the star is the', RX - 8, RY + 34); ctx.fillText('same in A and B,', RX - 8, RY + 46); ctx.fillText('so it cancels', RX - 8, RY + 58);

    if (done && fill < 1) { fill = Math.min(1, fill + .012); requestAnimationFrame(draw); }
  }

  slider.addEventListener('input', () => {
    if (!done && +slider.value >= 100) {
      done = true; slider.disabled = true;
      hint.textContent = 'The star is gone: it was the same in both pictures. What is left is light that was polarized — light bounced off dust.';
      _setStatus('✓ Star removed — the dust ring is revealed!', true);
      requestAnimationFrame(draw);
      setTimeout(_miniGamePassed, 2600);
    }
    draw();
  });

  draw();
}

// ──────────────────────────────────────────────────────────
// PREVIEW: open mini-games directly, without finding a target.
//   index.html?mg=fmos          → just the FMOS game
//   index.html?mg=hsc,ciao,ao3k → several in a row
//   index.html?mg=all           → every instrument's game
// Handy for trying out instruments that no target uses yet.
// ──────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  let ids = (new URLSearchParams(location.search).get('mg') || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (!ids.length) return;
  if (ids[0] === 'all') ids = Object.keys(UH_INSTRUMENTS);
  setTimeout(() => startMiniGameQueue(ids, () => console.log('[UH] mini-game preview finished')), 0);
});
