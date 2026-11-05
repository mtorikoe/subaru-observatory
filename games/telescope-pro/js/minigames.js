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
// Each mini-game renders into #mg-game-area inside this overlay
function _showMiniGameOverlay(instrId) {
  const instr = UH_INSTRUMENTS[instrId];
  if (!instr) { _runNextMiniGame(); return; } // skip unknown instrument

  // Remove any existing overlay first
  _closeMiniGameOverlay();

  const html = `
    <div class="mg-overlay" id="mg-overlay">
      <div class="mg-box">
        <div class="mg-header">
          <div class="mg-title">
            <span class="mg-instr-dot" style="background:${instr.color}"></span>
            ${instr.name}
          </div>
          <button class="mg-close" onclick="quitObservation()" title="Quit observation">✕</button>
        </div>
        <div class="mg-teaches" id="mg-teaches"></div>
        <div class="mg-game-area" id="mg-game-area"></div>
        <div class="mg-status" id="mg-status"></div>
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
function _miniGamePassed() {
  _closeMiniGameOverlay();
  // Brief pause before next game so it doesn't feel instant
  setTimeout(_runNextMiniGame, 300);
}

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
    case 'pfs':         return _game_pfs();
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
// HSC
// A big circle field. A gun at bottom shoots moons.
// Power gauge oscillates. Click at the right power so the
// moon lands inside the field. Fill 9 moons to win.
// ──────────────────────────────────────────────────────────
function _game_hsc() {
  _setTeaches('HSC\'s field holds 9 full Moons across. Launch each Moon into the field at just the right power!');

  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="360" height="320" style="display:block;margin:auto;cursor:pointer"></canvas>
    <div style="text-align:center;margin-top:6px;font-size:13px;color:var(--muted)">Click the cannon when the power gauge hits the green zone</div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');

  const fieldCx = 180, fieldCy = 125, fieldR = 110; // big circle
  const moonR   = 18;                                // each moon
  const gunX    = 180, gunY = 285;                  // gun position
  const goal    = 9;                                 // moons needed

  // Real Moon photo (shared with Suprime-Cam game)
  const moonImg = new Image();
  let moonReady = false;
  moonImg.onload  = () => { moonReady = true; };
  moonImg.onerror = () => { moonReady = false; };
  moonImg.src = '/assets/minigame/moon.png';

  function drawMoon(x, y, r) {
    if (moonReady && moonImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.clip();
      ctx.drawImage(moonImg, x - r, y - r, r*2, r*2);
      ctx.restore();
      // limb shading
      const limb = ctx.createRadialGradient(x, y, r*0.6, x, y, r);
      limb.addColorStop(0, 'rgba(0,0,0,0)');
      limb.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
      ctx.fillStyle = limb; ctx.fill();
    } else {
      const g = ctx.createRadialGradient(x-r*0.25, y-r*0.25, 2, x, y, r);
      g.addColorStop(0,'#d8d0c0'); g.addColorStop(1,'#888070');
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
      ctx.fillStyle = g; ctx.fill();
    }
  }

  let power      = 0;    // 0–1, oscillates
  let powerDir   = 1;
  let powerSpeed = 0.012;
  let moons      = [];   // {x,y} landed moons
  let flying     = null; // {x,y,vy} in-flight moon
  let animId;

  function goodPower(p) { return p > 0.35 && p < 0.65; }

  function draw() {
    ctx.clearRect(0, 0, 360, 320);
    ctx.fillStyle = '#040810';
    ctx.fillRect(0, 0, 360, 320);

    // Stars
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.1+((i*73)%10)*0.05})`;
      ctx.fillRect((i*137)%360,(i*97)%200,1,1);
    }

    // Field circle
    ctx.beginPath();
    ctx.arc(fieldCx, fieldCy, fieldR, 0, Math.PI*2);
    ctx.strokeStyle = '#7ecfed';
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.fillStyle   = 'rgba(126,207,237,0.07)';
    ctx.fill();

    // Label
    ctx.fillStyle = 'rgba(126,207,237,0.6)';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HSC Field', fieldCx, fieldCy - fieldR - 6);

    // Landed moons
    moons.forEach(m => drawMoon(m.x, m.y, moonR));

    // Flying moon
    if (flying) drawMoon(flying.x, flying.y, moonR);

    // Gun (triangle pointing up)
    ctx.fillStyle = '#7ecfed';
    ctx.beginPath();
    ctx.moveTo(gunX, gunY - 20);
    ctx.lineTo(gunX - 12, gunY + 8);
    ctx.lineTo(gunX + 12, gunY + 8);
    ctx.closePath(); ctx.fill();

    // Power gauge (bar on right)
    const gaugeX = 328, gaugeY = 220, gaugeH = 100;
    ctx.fillStyle = '#1a2530';
    ctx.fillRect(gaugeX - 10, gaugeY - gaugeH, 20, gaugeH);
    // fill
    const fillH   = gaugeH * power;
    const isGreen = goodPower(power);
    ctx.fillStyle = isGreen ? '#44ee44' : '#e07030';
    ctx.fillRect(gaugeX - 10, gaugeY - fillH, 20, fillH);
    // green target zone marker
    ctx.strokeStyle = '#44ee44';
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(gaugeX - 10, gaugeY - gaugeH*0.65, 20, gaugeH*0.30);

    ctx.fillStyle   = 'rgba(255,255,255,0.5)';
    ctx.font        = '10px sans-serif';
    ctx.textAlign   = 'center';
    ctx.fillText('PWR', gaugeX, gaugeY + 14);

    // Counter
    ctx.fillStyle = '#fff';
    ctx.font      = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${moons.length} / ${goal}`, 12, 22);
  }

  // Find a non-overlapping spot in the field for a new moon
  function _findSpot() {
    for (let attempt = 0; attempt < 200; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = Math.random() * (fieldR - moonR - 4);
      const nx    = fieldCx + Math.cos(angle) * dist;
      const ny    = fieldCy + Math.sin(angle) * dist;
      const ok    = moons.every(m => Math.hypot(m.x-nx, m.y-ny) > moonR * 2.1);
      if (ok) return {x: nx, y: ny};
    }
    return null;
  }

  function shoot() {
    if (flying || !goodPower(power)) {
      _setStatus('Power off — wait for the green zone!', false);
      return;
    }
    flying = { x: gunX, y: gunY - 20, vy: -4.5 };
  }

  function tick() {
    // Oscillate power
    power += powerDir * powerSpeed;
    if (power >= 1) { power = 1; powerDir = -1; }
    if (power <= 0) { power = 0; powerDir =  1; }

    // Move flying moon
    if (flying) {
      flying.y += flying.vy;
      flying.vy += 0.08; // slight gravity

      // Check if landed in field
      const dist = Math.hypot(flying.x - fieldCx, flying.y - fieldCy);
      if (dist + moonR < fieldR && flying.vy > 0) {
        // Find a spot to place it
        const spot = _findSpot();
        if (spot) {
          moons.push(spot);
        } else {
          moons.push({x: flying.x, y: flying.y}); // fallback
        }
        flying = null;
        _setStatus(`${moons.length} / ${goal} moons placed`, moons.length === goal);
        if (moons.length >= goal) {
          cancelAnimationFrame(animId);
          setTimeout(_miniGamePassed, 800);
          return;
        }
      } else if (flying.y > 320) {
        // Missed
        flying = null;
        _setStatus('Missed! Adjust the power.', false);
      }
    }

    draw();
    animId = requestAnimationFrame(tick);
  }

  canvas.addEventListener('click', shoot);
  animId = requestAnimationFrame(tick);
}

// ──────────────────────────────────────────────────────────
// AO (36 / 188 / 3K)
// Wavy lines come in from left.
// Player drags a vertical slider until wavefronts straighten.
// AO36: needs ~60% correction. AO188: ~85%. AO3K: ~97%.
// ──────────────────────────────────────────────────────────
function _game_ao(instrId, actuators, teachText) {
  _setTeaches(teachText);

  // How straight the waves need to be before passing (0–1)
  const target = instrId === 'ao36' ? 0.60 : instrId === 'ao188' ? 0.82 : 0.95;

  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="360" height="280" style="display:block;margin:auto;cursor:ns-resize"></canvas>
    <div style="text-align:center;margin-top:6px;font-size:13px;color:var(--muted)">Drag the slider up to straighten the wavefront</div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');

  let correction = 0; // 0 = no correction, 1 = perfect
  let dragging   = false;
  let startY     = 0;
  let startCorr  = 0;
  let passed     = false;
  let animId;

  // Slider position (right side)
  const sliderX = 330, sliderMinY = 30, sliderMaxY = 240;

  function corrToSliderY(c) {
    return sliderMaxY - c * (sliderMaxY - sliderMinY);
  }

  function draw() {
    ctx.clearRect(0, 0, 360, 280);
    ctx.fillStyle = '#040810';
    ctx.fillRect(0, 0, 360, 280);

    const numWaves = 10;
    const waveH    = 240 / numWaves;
    const amplitude = 18 * (1 - correction); // shrinks toward 0 as correction rises

    // Draw wavefronts
    for (let i = 0; i < numWaves; i++) {
      const baseY  = 20 + i * waveH + waveH / 2;
      const hue    = 180 + i * 8; // blue-ish range
      ctx.beginPath();
      for (let x = 0; x <= 290; x += 2) {
        // Wavy for uncorrected part, progressively straightening
        const phase   = (x / 290) * Math.PI * 2;
        const waviness= amplitude * Math.sin(phase + i * 0.9);
        const y       = baseY + waviness;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsl(${hue},70%,65%)`;
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }

    // Quality bar (bottom)
    const barW = 290 * correction;
    ctx.fillStyle = `hsl(${120 * correction},70%,45%)`;
    ctx.fillRect(0, 262, barW, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(barW, 262, 290 - barW, 10);
    // Target line
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(290 * target, 258);
    ctx.lineTo(290 * target, 275);
    ctx.stroke();

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font      = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(correction*100)}%`, 145, 258);

    // Slider track
    ctx.fillStyle = '#1a2530';
    ctx.fillRect(sliderX - 5, sliderMinY, 10, sliderMaxY - sliderMinY);

    // Slider knob
    const knobY = corrToSliderY(correction);
    ctx.fillStyle = '#7ecfed';
    ctx.beginPath();
    ctx.arc(sliderX, knobY, 10, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Actuator count label
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font      = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${actuators}`, sliderX, sliderMaxY + 18);
    ctx.fillText('act.', sliderX, sliderMaxY + 30);
  }

  function pointerY(e) {
    const r = canvas.getBoundingClientRect();
    return (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
  }

  canvas.addEventListener('mousedown',  e => { dragging=true; startY=pointerY(e); startCorr=correction; });
  canvas.addEventListener('touchstart', e => { e.preventDefault(); dragging=true; startY=pointerY(e); startCorr=correction; }, {passive:false});

  window.addEventListener('mousemove',  e => {
    if (!dragging) return;
    const dy   = startY - pointerY(e); // drag up = more correction
    const span = sliderMaxY - sliderMinY;
    correction = Math.min(1, Math.max(0, startCorr + dy / span));
  });
  window.addEventListener('touchmove',  e => {
    if (!dragging) return;
    e.preventDefault();
    const dy   = startY - pointerY(e);
    const span = sliderMaxY - sliderMinY;
    correction = Math.min(1, Math.max(0, startCorr + dy / span));
  }, {passive:false});

  window.addEventListener('mouseup',  () => { dragging = false; });
  window.addEventListener('touchend', () => { dragging = false; });

  function tick() {
    if (!passed && correction >= target) {
      passed = true;
      _setStatus(`✓ Wavefront corrected to ${Math.round(correction*100)}%!`, true);
      cancelAnimationFrame(animId);
      draw();
      setTimeout(_miniGamePassed, 900);
      return;
    }
    if (!passed) {
      _setStatus(`Correction: ${Math.round(correction*100)}% — need ${Math.round(target*100)}%`, false);
    }
    draw();
    animId = requestAnimationFrame(tick);
  }

  animId = requestAnimationFrame(tick);
}

// ──────────────────────────────────────────────────────────
// IRCS — Spectral resolution slider
// Drag slider right to spread spectrum into finer lines.
// A hidden pair of close lines must become distinguishable.
// ──────────────────────────────────────────────────────────
function _game_ircs() {
  _setTeaches('IRCS spreads starlight into wavelengths. Increase resolution until the hidden pair of spectral lines separates.');

  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="360" height="260" style="display:block;margin:auto;cursor:ew-resize"></canvas>
    <div style="text-align:center;margin-top:6px;font-size:13px;color:var(--muted)">Drag slider right to increase spectral resolution</div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');

  let resolution = 0; // 0–1
  let dragging   = false;
  let startX     = 0, startRes = 0;
  let passed     = false;
  let animId;

  const sliderY   = 220, sliderMinX = 30, sliderMaxX = 330;

  function draw() {
    ctx.clearRect(0,0,360,260);
    ctx.fillStyle = '#040810';
    ctx.fillRect(0,0,360,260);

    // Spectrum bar (rainbow gradient)
    const specW = 300, specH = 60;
    const specX = 30, specY = 60;
    const rg = ctx.createLinearGradient(specX,0,specX+specW,0);
    ['#ff2200','#ff7700','#ffee00','#44ff00','#00aaff','#5500ff'].forEach((c,i) => rg.addColorStop(i/5, c));
    ctx.fillStyle = rg;
    ctx.fillRect(specX, specY, specW, specH);

    // Draw spectral lines on top — lines become narrower (more separated) as resolution increases
    // Hidden pair at positions 0.52 and 0.56
    const lineWidth = Math.max(1, 18 * (1 - resolution));
    const lines = [0.15, 0.30, 0.52, 0.56, 0.70, 0.88];
    lines.forEach((pos, i) => {
      const lx    = specX + pos * specW;
      const alpha = i === 2 || i === 3
        ? Math.min(1, resolution * 2.5)   // close pair only visible at higher res
        : 1;
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      ctx.fillRect(lx - lineWidth/2, specY, lineWidth, specH);
    });

    // "Resolved!" label when pair is visible
    if (resolution > 0.5) {
      const sep = (0.56 - 0.52) * specW - lineWidth;
      if (sep > 2) {
        ctx.fillStyle = '#44ee44';
        ctx.font      = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Pair resolved!', specX + 0.54 * specW, specY - 8);
      }
    }

    // Resolution label
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Resolution: R = ${Math.round(resolution * 1000 + 100)}`, 180, specY + specH + 18);

    // Slider track
    ctx.fillStyle = '#1a2530';
    ctx.fillRect(sliderMinX, sliderY - 5, sliderMaxX - sliderMinX, 10);
    // Knob
    const knobX = sliderMinX + resolution * (sliderMaxX - sliderMinX);
    ctx.fillStyle = '#7ecfed';
    ctx.beginPath();
    ctx.arc(knobX, sliderY, 11, 0, Math.PI*2);
    ctx.fill();
  }

  canvas.addEventListener('mousedown',  e => { const r=canvas.getBoundingClientRect(); dragging=true; startX=e.clientX-r.left; startRes=resolution; });
  window.addEventListener('mousemove',  e => {
    if (!dragging) return;
    const r   = canvas.getBoundingClientRect();
    const dx  = (e.clientX - r.left) - startX;
    const span= sliderMaxX - sliderMinX;
    resolution= Math.min(1, Math.max(0, startRes + dx/span));
  });
  window.addEventListener('mouseup', () => { dragging=false; });

  canvas.addEventListener('touchstart', e => { e.preventDefault(); const r=canvas.getBoundingClientRect(); dragging=true; startX=e.touches[0].clientX-r.left; startRes=resolution; }, {passive:false});
  window.addEventListener('touchmove',  e => {
    if (!dragging) return; e.preventDefault();
    const r  = canvas.getBoundingClientRect();
    const dx = (e.touches[0].clientX - r.left) - startX;
    resolution= Math.min(1, Math.max(0, startRes + dx/(sliderMaxX-sliderMinX)));
  }, {passive:false});
  window.addEventListener('touchend', () => { dragging=false; });

  function tick() {
    if (!passed && resolution > 0.72) {
      const sep = (0.56-0.52)*300 - Math.max(1, 18*(1-resolution));
      if (sep > 4) {
        passed = true;
        _setStatus('✓ Spectral lines resolved — pair identified!', true);
        cancelAnimationFrame(animId);
        draw();
        setTimeout(_miniGamePassed, 1000);
        return;
      }
    }
    if (!passed) {
      _setStatus(resolution < 0.5 ? 'Increase resolution to find the hidden lines.' :
                  'Almost there — keep going!', false);
    }
    draw();
    animId = requestAnimationFrame(tick);
  }

  animId = requestAnimationFrame(tick);
}

// ──────────────────────────────────────────────────────────
// HDS — Click the spectral line dots
// Horizontal strips with tiny dots. Click 3 to pass.
// ──────────────────────────────────────────────────────────
function _game_hds() {
  _setTeaches('HDS measures chemical elements in starlight. Click the absorption line markers to identify elements!');

  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="360" height="260" style="display:block;margin:auto;cursor:pointer"></canvas>
    <div style="text-align:center;margin-top:6px;font-size:13px;color:var(--muted)">Click all 3 spectral line markers</div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');

  const need    = 3;
  const elements= ['Ca II K', 'Hα', 'Na I D'];
  const strips  = 7;
  const stripH  = 220 / strips;
  const dotR    = 6;

  // Place one real dot per element in a random strip, rest are dummies
  const dots = [];
  const usedStrips = new Set();

  // Dots to find (one per element)
  elements.forEach((el, ei) => {
    let si;
    do { si = Math.floor(Math.random() * strips); } while (usedStrips.has(si));
    usedStrips.add(si);
    const x = 50 + Math.random() * 260;
    const y = 20 + si * stripH + stripH / 2;
    dots.push({ x, y, label: el, found: false, real: true });
  });

  // Extra dummy dots (noise)
  for (let i = 0; i < 8; i++) {
    const si = Math.floor(Math.random() * strips);
    dots.push({
      x: 50 + Math.random() * 260,
      y: 20 + si * stripH + stripH / 2,
      label: null, found: false, real: false,
    });
  }

  let found = 0;

  function draw() {
    ctx.clearRect(0,0,360,260);
    ctx.fillStyle = '#040810';
    ctx.fillRect(0,0,360,260);

    // Spectrum strips
    for (let i = 0; i < strips; i++) {
      const y  = 20 + i * stripH;
      const rg = ctx.createLinearGradient(30,0,330,0);
      ['#ff2200','#ff7700','#ffee00','#44ff00','#00aaff','#5500ff'].forEach((c,j) => rg.addColorStop(j/5,c));
      ctx.fillStyle = rg;
      ctx.fillRect(30, y, 300, stripH - 2);
      // Dark line across each strip (spectral pattern)
      for (let j = 0; j < 6; j++) {
        ctx.fillStyle='rgba(0,0,0,0.5)';
        ctx.fillRect(30 + (j * 60 + 25), y, 3, stripH-2);
      }
    }

    // Dots
    dots.forEach(d => {
      if (d.found) {
        ctx.fillStyle = '#44ee44';
        ctx.beginPath(); ctx.arc(d.x, d.y, dotR+2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font='bold 9px sans-serif'; ctx.textAlign='center';
        ctx.fillText(d.label || '?', d.x, d.y - dotR - 3);
      } else {
        ctx.fillStyle = d.real ? 'rgba(255,200,0,0.9)' : 'rgba(255,255,255,0.3)';
        ctx.beginPath(); ctx.arc(d.x, d.y, dotR, 0, Math.PI*2); ctx.fill();
      }
    });

    ctx.fillStyle='#fff'; ctx.font='bold 13px sans-serif'; ctx.textAlign='left';
    ctx.fillText(`${found} / ${need}`, 10, 15);
  }

  canvas.addEventListener('click', e => {
    const r  = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    dots.forEach(d => {
      if (!d.found && Math.hypot(mx-d.x, my-d.y) < dotR + 5) {
        if (d.real) {
          d.found = true;
          found++;
          _setStatus(`Found ${d.label}! (${found}/${need})`, found===need);
          draw();
          if (found >= need) setTimeout(_miniGamePassed, 800);
        } else {
          _setStatus('Not an element line — look for the highlighted ones!', false);
        }
      }
    });
  });

  draw();
}

// ──────────────────────────────────────────────────────────
// IRD — Radial velocity wobble
// Star with orbiting exoplanet on left.
// Wobble graph on right. Click 3 wobble peaks to confirm.
// ──────────────────────────────────────────────────────────
function _game_ird() {
  _setTeaches('IRD detects planets by measuring the tiny wobble they cause in a star. Click the wobble peaks to confirm the exoplanet!');

  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="360" height="260" style="display:block;margin:auto;cursor:pointer"></canvas>
    <div style="text-align:center;margin-top:6px;font-size:13px;color:var(--muted)">Click the red wobble peaks on the velocity graph</div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');

  let t        = 0;
  let found    = 0;
  const need   = 3;
  let animId;

  // Pre-compute peak x positions (in graph space)
  const graphX = 170, graphY = 50, graphW = 170, graphH = 160;
  const period = graphW / 2.5; // px per period
  const peaks  = []; // {x, y, clicked}
  for (let i = 0; i < 4; i++) {
    peaks.push({ x: graphX + 20 + i * period, y: graphY + graphH/2 - 50, clicked: false });
  }

  function draw() {
    ctx.clearRect(0,0,360,260);
    ctx.fillStyle = '#040810';
    ctx.fillRect(0,0,360,260);

    // ── Star system (left half) ──
    const starX = 80, starY = 130, starR = 22;
    const orbitR = 55;
    const pAngle = t * 0.025;
    const planetX = starX + Math.cos(pAngle) * orbitR;
    const planetY = starY + Math.sin(pAngle) * orbitR * 0.4; // elliptical

    // Orbit path
    ctx.beginPath();
    ctx.ellipse(starX, starY, orbitR, orbitR*0.4, 0, 0, Math.PI*2);
    ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1; ctx.stroke();

    // Star glow
    const sg = ctx.createRadialGradient(starX,starY,2,starX,starY,starR+8);
    sg.addColorStop(0,'#fffde0'); sg.addColorStop(0.5,'#f0c040'); sg.addColorStop(1,'rgba(240,192,64,0)');
    ctx.beginPath(); ctx.arc(starX,starY,starR+8,0,Math.PI*2);
    ctx.fillStyle=sg; ctx.fill();
    // Star
    ctx.beginPath(); ctx.arc(starX,starY,starR,0,Math.PI*2);
    ctx.fillStyle='#f0c040'; ctx.fill();
    // Planet
    ctx.beginPath(); ctx.arc(planetX, planetY, 6, 0, Math.PI*2);
    ctx.fillStyle='#4080e0'; ctx.fill();

    // "Exoplanet" label
    ctx.fillStyle='rgba(64,128,224,0.8)'; ctx.font='9px sans-serif'; ctx.textAlign='center';
    ctx.fillText('exoplanet', planetX, planetY - 10);

    // ── Velocity graph (right half) ──
    // Frame
    ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1;
    ctx.strokeRect(graphX, graphY, graphW, graphH);

    // Axes
    ctx.strokeStyle='rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.moveTo(graphX, graphY+graphH/2); ctx.lineTo(graphX+graphW, graphY+graphH/2); ctx.stroke();

    // Velocity curve (sine)
    ctx.beginPath();
    for (let px = 0; px <= graphW; px++) {
      const vy = graphY + graphH/2 - Math.sin((px/graphW)*Math.PI*5) * 50;
      px===0 ? ctx.moveTo(graphX+px, vy) : ctx.lineTo(graphX+px, vy);
    }
    ctx.strokeStyle='#7ecfed'; ctx.lineWidth=2; ctx.stroke();

    // Peak markers (clickable)
    peaks.forEach(p => {
      if (p.clicked) {
        ctx.fillStyle='#44ee44';
        ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI*2); ctx.fill();
      } else {
        ctx.fillStyle='rgba(220,80,80,0.9)';
        ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI*2); ctx.fill();
      }
    });

    // Labels
    ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font='9px sans-serif'; ctx.textAlign='left';
    ctx.fillText('RV (m/s)', graphX+2, graphY+10);
    ctx.fillText('Time →', graphX+graphW-50, graphY+graphH/2+12);

    ctx.fillStyle='#fff'; ctx.font='bold 13px sans-serif'; ctx.textAlign='left';
    ctx.fillText(`${found}/${need} peaks`, 8, 15);

    t++;
    animId = requestAnimationFrame(draw);
  }

  canvas.addEventListener('click', e => {
    const r  = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    peaks.forEach(p => {
      if (!p.clicked && Math.hypot(mx-p.x, my-p.y) < 14) {
        p.clicked = true;
        found++;
        _setStatus(`${found}/${need} peaks confirmed`, found===need);
        if (found>=need) {
          cancelAnimationFrame(animId);
          setTimeout(_miniGamePassed, 700);
        }
      }
    });
  });

  animId = requestAnimationFrame(draw);
}

// ──────────────────────────────────────────────────────────
// FMOS — Untangle 3 optical fibers by swapping ends
// ──────────────────────────────────────────────────────────
function _game_fmos() {
  _setTeaches('FMOS routes starlight through optical fibres to separate spectra. Untangle the fibres by swapping their ends!');

  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="360" height="260" style="display:block;margin:auto;cursor:pointer"></canvas>
    <div style="text-align:center;margin-top:6px;font-size:13px;color:var(--muted)">Click two bottom connectors to swap — match the colors</div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');

  const colors   = ['#e05050','#50c850','#5090f0'];
  const topX     = [80, 180, 280];
  const topY     = 40;
  const botX     = [80, 180, 280]; // shuffle target
  const botY     = 220;
  const connR    = 14;

  // bottom[i] = which color is at that bottom slot
  let bottom = [1, 2, 0]; // shuffled
  let selected = null;    // index of selected bottom connector

  function isSolved() {
    return bottom[0]===0 && bottom[1]===1 && bottom[2]===2;
  }

  function draw() {
    ctx.clearRect(0,0,360,260);
    ctx.fillStyle='#040810'; ctx.fillRect(0,0,360,260);

    // Draw fibres from each top to the bottom slot that holds its color's end
    // But the fibre from top i goes to the bottom slot that currently has color i
    colors.forEach((col, i) => {
      const bSlot = bottom.indexOf(i); // which bottom slot holds color i
      const tx = topX[i], ty = topY;
      const bx = botX[bSlot], by = botY;

      // Bezier curve
      ctx.beginPath();
      ctx.moveTo(tx, ty + connR);
      ctx.bezierCurveTo(tx, ty + 100, bx, by - 100, bx, by - connR);
      ctx.strokeStyle = col;
      ctx.lineWidth   = 3;
      ctx.stroke();
    });

    // Top connectors (fixed)
    colors.forEach((col, i) => {
      ctx.beginPath(); ctx.arc(topX[i], topY, connR, 0, Math.PI*2);
      ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.fillStyle='#fff'; ctx.font='9px sans-serif'; ctx.textAlign='center';
      ctx.fillText('IN', topX[i], topY + 4);
    });

    // Bottom connectors (swappable)
    bottom.forEach((colorIdx, i) => {
      const col = colors[colorIdx];
      const isSel = selected === i;
      ctx.beginPath(); ctx.arc(botX[i], botY, connR, 0, Math.PI*2);
      ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = isSel ? '#fff' : '#444';
      ctx.lineWidth   = isSel ? 3 : 1.5;
      ctx.stroke();
      ctx.fillStyle='#fff'; ctx.font='9px sans-serif'; ctx.textAlign='center';
      ctx.fillText('OUT', botX[i], botY + 4);
    });

    // Check labels
    if (isSolved()) {
      ctx.fillStyle='#44ee44'; ctx.font='bold 16px sans-serif'; ctx.textAlign='center';
      ctx.fillText('✓ Fibres aligned!', 180, 145);
    }
  }

  canvas.addEventListener('click', e => {
    const r  = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;

    // Check bottom connectors
    for (let i = 0; i < 3; i++) {
      if (Math.hypot(mx - botX[i], my - botY) < connR + 6) {
        if (selected === null) {
          selected = i;
        } else if (selected !== i) {
          // Swap
          const tmp      = bottom[selected];
          bottom[selected] = bottom[i];
          bottom[i]       = tmp;
          selected        = null;
          draw();
          if (isSolved()) {
            _setStatus('✓ Optical fibres untangled!', true);
            setTimeout(_miniGamePassed, 900);
          } else {
            _setStatus('Keep swapping to match the colors.', false);
          }
          return;
        } else {
          selected = null;
        }
        draw();
        return;
      }
    }
  });

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
// MOIRCS — 3-picture quiz: spot the MOIRCS wide-field image
// ──────────────────────────────────────────────────────────
function _game_moircs() {
  _setTeaches('MOIRCS has a 4′×7′ near-infrared field — wider than typical cameras. Find the image that shows the most galaxies at once!');

  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <div style="display:flex;gap:10px;justify-content:center;align-items:flex-end;padding:16px 0" id="moircs-cards">
    </div>
    <div style="text-align:center;font-size:13px;color:var(--muted)">Which image was taken by MOIRCS?</div>`;

  // Build 3 canvas cards: one with many galaxies (MOIRCS), two with fewer
  const cards = [
    { label:'Camera A', galaxies:12, correct: false },
    { label:'MOIRCS',   galaxies:28, correct: true  },
    { label:'Camera B', galaxies:4,  correct: false },
  ];
  // Shuffle
  cards.sort(() => Math.random() - 0.5);
  const correctIdx = cards.findIndex(c => c.correct);

  const container = document.getElementById('moircs-cards');
  cards.forEach((card, i) => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'text-align:center;cursor:pointer';
    const canvas  = document.createElement('canvas');
    canvas.width  = 100;
    canvas.height = 90;
    canvas.style.border = '2px solid #2a3a4a';
    canvas.style.borderRadius = '4px';
    canvas.dataset.idx = i;

    // Draw the scene
    const ctx = canvas.getContext('2d');
    ctx.fillStyle='#040810'; ctx.fillRect(0,0,100,90);
    // Random stars
    for (let s = 0; s < 20; s++) {
      ctx.fillStyle='rgba(255,255,255,0.4)';
      ctx.fillRect(Math.random()*100, Math.random()*90, 1, 1);
    }
    // Galaxies (small ellipses)
    for (let g = 0; g < card.galaxies; g++) {
      const gx = 5 + Math.random()*90, gy = 5 + Math.random()*80;
      const rx = 3 + Math.random()*4,  ry = 2 + Math.random()*2;
      const angle = Math.random()*Math.PI;
      ctx.save();
      ctx.translate(gx,gy); ctx.rotate(angle);
      ctx.beginPath(); ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);
      ctx.fillStyle=`rgba(200,160,100,${0.5+Math.random()*0.4})`; ctx.fill();
      ctx.restore();
    }

    const lbl = document.createElement('div');
    lbl.textContent = card.label;
    lbl.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px';

    wrapper.appendChild(canvas);
    wrapper.appendChild(lbl);
    container.appendChild(wrapper);

    wrapper.addEventListener('click', () => {
      if (card.correct) {
        canvas.style.border = '3px solid #44ee44';
        _setStatus('✓ Correct! MOIRCS captures the most galaxies in one shot.', true);
        setTimeout(_miniGamePassed, 800);
      } else {
        canvas.style.border = '3px solid #e05050';
        _setStatus('Not quite — look for the image with the most galaxies.', false);
      }
    });
  });
}

// ──────────────────────────────────────────────────────────
// FOCAS — Hold button to accumulate light until galaxy appears
// ──────────────────────────────────────────────────────────
function _game_focas() {
  _setTeaches('FOCAS captures faint objects by accumulating light over time. Hold the button — release too early and the galaxy stays hidden!');

  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="360" height="220" style="display:block;margin:auto"></canvas>
    <div style="text-align:center;margin-top:8px">
      <button id="focas-btn" class="mg-btn" style="font-size:16px;padding:10px 32px">Hold to expose</button>
    </div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');
  const btn    = document.getElementById('focas-btn');

  let exposure = 0; // 0–1
  let holding  = false;
  let animId;

  function draw() {
    ctx.clearRect(0,0,360,220);
    ctx.fillStyle='#040810'; ctx.fillRect(0,0,360,220);

    // Stars
    for (let i=0;i<40;i++) {
      const a=Math.min(1, exposure*2 + 0.05);
      ctx.fillStyle=`rgba(255,255,255,${a*(0.3+((i*73)%10)*0.05)})`;
      ctx.fillRect((i*137)%360,(i*97)%220,1,1);
    }

    // Faint galaxy (appears as exposure increases past 0.5)
    if (exposure > 0.3) {
      const alpha = Math.min(1, (exposure - 0.3) / 0.5);
      const gx = 180, gy = 100, grx = 60, gry = 30;
      const g = ctx.createRadialGradient(gx,gy,2,gx,gy,grx);
      g.addColorStop(0, `rgba(200,160,100,${alpha*0.9})`);
      g.addColorStop(0.5, `rgba(150,100,60,${alpha*0.4})`);
      g.addColorStop(1, `rgba(100,60,20,0)`);
      ctx.save();
      ctx.scale(1, gry/grx);
      ctx.beginPath(); ctx.arc(gx, gy*(grx/gry), grx, 0, Math.PI*2);
      ctx.fillStyle = g; ctx.fill();
      ctx.restore();
    }

    // Exposure bar
    ctx.fillStyle='#1a2530'; ctx.fillRect(10, 200, 340, 12);
    ctx.fillStyle = exposure >= 0.8 ? '#44ee44' : '#7ecfed';
    ctx.fillRect(10, 200, 340*exposure, 12);
    ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font='9px sans-serif'; ctx.textAlign='center';
    ctx.fillText(`Exposure: ${Math.round(exposure*100)}%`, 180, 198);
  }

  function tick() {
    if (holding && exposure < 1) {
      exposure = Math.min(1, exposure + 0.008);
    } else if (!holding && exposure > 0 && exposure < 0.8) {
      exposure = Math.max(0, exposure - 0.012); // fade if released too early
    }

    if (exposure >= 0.8) {
      _setStatus('✓ Galaxy captured! Exposure complete.', true);
      cancelAnimationFrame(animId);
      draw();
      setTimeout(_miniGamePassed, 1000);
      return;
    }
    draw();
    animId = requestAnimationFrame(tick);
  }

  btn.addEventListener('mousedown',  () => { holding = true; });
  btn.addEventListener('touchstart', e => { e.preventDefault(); holding = true; }, {passive:false});
  window.addEventListener('mouseup',  () => { holding = false; });
  window.addEventListener('touchend', () => { holding = false; });

  animId = requestAnimationFrame(tick);
}

// ──────────────────────────────────────────────────────────
// COMICS — Toggle to mid-IR view to reveal warm dust
// ──────────────────────────────────────────────────────────
function _game_comics() {
  _setTeaches('COMICS sees thermal emission from warm dust invisible to optical cameras. Toggle to mid-infrared view to find the hidden dust!');

  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="360" height="220" style="display:block;margin:auto"></canvas>
    <div style="text-align:center;margin-top:8px">
      <button id="ir-toggle" class="mg-btn">Switch to Mid-IR View</button>
    </div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');
  const btn    = document.getElementById('ir-toggle');
  let ir       = false;
  let clicked  = false;

  function draw() {
    ctx.clearRect(0,0,360,220);
    ctx.fillStyle = ir ? '#1a0a00' : '#040810';
    ctx.fillRect(0,0,360,220);

    // Stars (always)
    for (let i=0;i<40;i++) {
      ctx.fillStyle=`rgba(255,255,255,${0.2+((i*73)%10)*0.05})`;
      ctx.fillRect((i*137)%360,(i*97)%220,1,1);
    }

    if (!ir) {
      // Optical: dark disk — just a dark region, no glow
      ctx.beginPath(); ctx.arc(180,100,55,0,Math.PI*2);
      ctx.fillStyle='#040810'; ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='11px sans-serif'; ctx.textAlign='center';
      ctx.fillText('No dust visible (optical)', 180, 180);
    } else {
      // Mid-IR: glowing dust ring around young star
      const g = ctx.createRadialGradient(180,100,15,180,100,70);
      g.addColorStop(0,'rgba(255,100,0,0)');
      g.addColorStop(0.4,'rgba(255,100,0,0.8)');
      g.addColorStop(0.7,'rgba(200,60,0,0.4)');
      g.addColorStop(1,'rgba(200,60,0,0)');
      ctx.beginPath(); ctx.arc(180,100,70,0,Math.PI*2);
      ctx.fillStyle=g; ctx.fill();
      // Central star
      ctx.beginPath(); ctx.arc(180,100,10,0,Math.PI*2);
      ctx.fillStyle='#fffde0'; ctx.fill();
      ctx.fillStyle='rgba(255,200,0,0.6)'; ctx.font='11px sans-serif'; ctx.textAlign='center';
      ctx.fillText('Warm dust ring revealed!', 180, 180);
    }

    ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='10px sans-serif'; ctx.textAlign='left';
    ctx.fillText(ir ? 'MID-IR VIEW' : 'OPTICAL VIEW', 10, 15);
  }

  btn.addEventListener('click', () => {
    ir = !ir;
    btn.textContent = ir ? 'Switch to Optical View' : 'Switch to Mid-IR View';
    draw();
    if (ir && !clicked) {
      clicked = true;
      _setStatus('✓ Warm dust detected in mid-infrared!', true);
      setTimeout(_miniGamePassed, 1200);
    }
  });

  draw();
}

// ──────────────────────────────────────────────────────────
// CIAO — Move mask over star to reveal planet
// ──────────────────────────────────────────────────────────
function _game_ciao() {
  _setTeaches('CIAO uses a coronagraph to block starlight. Move the mask over the star to reveal the hidden planet!');

  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="360" height="260" style="display:block;margin:auto;cursor:move"></canvas>
    <div style="text-align:center;margin-top:6px;font-size:13px;color:var(--muted)">Drag the circular mask onto the star</div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');

  const starX = 180, starY = 120, starR = 24;
  const planetX = starX + 70, planetY = starY - 30, planetR = 7;
  let maskX = 60, maskY = 200, maskR = 30;
  let dragging = false, dragDX = 0, dragDY = 0;
  let passed   = false;
  let animId;

  function draw() {
    ctx.clearRect(0,0,360,260);
    ctx.fillStyle='#040810'; ctx.fillRect(0,0,360,260);
    for (let i=0;i<50;i++) {
      ctx.fillStyle=`rgba(255,255,255,${0.1+((i*73)%10)*0.05})`;
      ctx.fillRect((i*137)%360,(i*97)%260,1,1);
    }

    // Check mask alignment
    const dist   = Math.hypot(maskX - starX, maskY - starY);
    const masked = dist < 10;

    if (!masked) {
      // Star blaze
      const sg = ctx.createRadialGradient(starX,starY,2,starX,starY,starR+40);
      sg.addColorStop(0,'rgba(255,255,180,0.9)');
      sg.addColorStop(0.3,'rgba(255,220,100,0.5)');
      sg.addColorStop(1,'rgba(255,220,100,0)');
      ctx.beginPath(); ctx.arc(starX,starY,starR+40,0,Math.PI*2);
      ctx.fillStyle=sg; ctx.fill();
      ctx.beginPath(); ctx.arc(starX,starY,starR,0,Math.PI*2);
      ctx.fillStyle='#fffde0'; ctx.fill();
      // Planet invisible in glare
    } else {
      // Star hidden under mask — only outer halo visible
      ctx.beginPath(); ctx.arc(starX,starY,starR,0,Math.PI*2);
      ctx.fillStyle='rgba(255,250,200,0.1)'; ctx.fill();
      // Planet visible!
      const pg = ctx.createRadialGradient(planetX,planetY,1,planetX,planetY,planetR);
      pg.addColorStop(0,'#80c0ff'); pg.addColorStop(1,'#2050a0');
      ctx.beginPath(); ctx.arc(planetX,planetY,planetR,0,Math.PI*2);
      ctx.fillStyle=pg; ctx.fill();
      ctx.fillStyle='#44ee44'; ctx.font='10px sans-serif'; ctx.textAlign='center';
      ctx.fillText('Planet!', planetX, planetY - planetR - 4);
    }

    // Mask circle (draggable)
    ctx.beginPath(); ctx.arc(maskX,maskY,maskR,0,Math.PI*2);
    ctx.fillStyle='rgba(26,37,48,0.92)'; ctx.fill();
    ctx.strokeStyle='#7ecfed'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='9px sans-serif'; ctx.textAlign='center';
    ctx.fillText('mask', maskX, maskY+4);

    animId = requestAnimationFrame(draw);
  }

  function pointerPos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.touches ? e.touches[0].clientX : e.clientX) - r.left,
      y: (e.touches ? e.touches[0].clientY : e.clientY) - r.top,
    };
  }

  canvas.addEventListener('mousedown',  e => { const p=pointerPos(e); if(Math.hypot(p.x-maskX,p.y-maskY)<maskR+8){dragging=true;dragDX=p.x-maskX;dragDY=p.y-maskY;} });
  canvas.addEventListener('touchstart', e => { e.preventDefault(); const p=pointerPos(e); if(Math.hypot(p.x-maskX,p.y-maskY)<maskR+8){dragging=true;dragDX=p.x-maskX;dragDY=p.y-maskY;} },{passive:false});
  window.addEventListener('mousemove',  e => { if(!dragging)return; const p=pointerPos(e); maskX=p.x-dragDX; maskY=p.y-dragDY; });
  window.addEventListener('touchmove',  e => { if(!dragging)return; e.preventDefault(); const p=pointerPos(e); maskX=p.x-dragDX; maskY=p.y-dragDY; },{passive:false});
  window.addEventListener('mouseup',  () => {
    if (!dragging) return; dragging=false;
    const dist = Math.hypot(maskX-starX,maskY-starY);
    if (dist < 10 && !passed) { passed=true; _setStatus('✓ Star masked — planet revealed!',true); cancelAnimationFrame(animId); draw(); setTimeout(_miniGamePassed,900); }
  });
  window.addEventListener('touchend', () => {
    if (!dragging) return; dragging=false;
    const dist = Math.hypot(maskX-starX,maskY-starY);
    if (dist < 10 && !passed) { passed=true; _setStatus('✓ Star masked — planet revealed!',true); cancelAnimationFrame(animId); draw(); setTimeout(_miniGamePassed,900); }
  });

  animId = requestAnimationFrame(draw);
}

// ──────────────────────────────────────────────────────────
// HiCIAO — Suppress star, click the faint companion
// ──────────────────────────────────────────────────────────
function _game_hiciao() {
  _setTeaches('HiCIAO achieves contrast ratios of 10⁻⁶ — click the faint companion once starlight is suppressed!');

  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="360" height="260" style="display:block;margin:auto;cursor:crosshair"></canvas>
    <div style="text-align:center;margin-top:6px;font-size:13px;color:var(--muted)">Click the faint point that remains after suppression</div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');

  const starX = 180, starY = 130;
  let suppression = 0; // 0–1
  let animId;
  let done = false;

  // Plant the companion at a fixed offset
  const compX = starX + 55, compY = starY - 40, compR = 5;

  // Auto-increase suppression slowly to let player see the companion emerge
  function tick() {
    suppression = Math.min(1, suppression + 0.004);
    draw();
    if (!done) animId = requestAnimationFrame(tick);
  }

  function draw() {
    ctx.clearRect(0,0,360,260);
    ctx.fillStyle='#040810'; ctx.fillRect(0,0,360,260);
    for (let i=0;i<60;i++) {
      ctx.fillStyle=`rgba(255,255,255,${0.1+((i*73)%10)*0.05})`;
      ctx.fillRect((i*137)%360,(i*97)%260,1,1);
    }

    // Speckle halo (shrinks with suppression)
    const haloR = 80 * (1 - suppression * 0.85);
    if (haloR > 5) {
      const hg = ctx.createRadialGradient(starX,starY,0,starX,starY,haloR);
      hg.addColorStop(0,'rgba(255,220,100,0.7)');
      hg.addColorStop(0.5,'rgba(255,220,100,0.2)');
      hg.addColorStop(1,'rgba(255,220,100,0)');
      ctx.beginPath(); ctx.arc(starX,starY,haloR,0,Math.PI*2);
      ctx.fillStyle=hg; ctx.fill();
    }

    // Central star (dimmed)
    ctx.beginPath(); ctx.arc(starX,starY,10,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,255,180,${1-suppression*0.7})`; ctx.fill();

    // Companion (visible only after some suppression)
    const compAlpha = Math.max(0, (suppression - 0.4) / 0.6);
    if (compAlpha > 0) {
      ctx.beginPath(); ctx.arc(compX,compY,compR,0,Math.PI*2);
      ctx.fillStyle=`rgba(100,160,255,${compAlpha})`; ctx.fill();
    }

    // Suppression meter
    ctx.fillStyle='#1a2530'; ctx.fillRect(10,245,340,8);
    ctx.fillStyle='#44ee44'; ctx.fillRect(10,245,340*suppression,8);
  }

  canvas.addEventListener('click', e => {
    const r  = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    if (suppression < 0.5) {
      _setStatus('Wait for suppression to increase first!', false);
      return;
    }
    if (Math.hypot(mx-compX, my-compY) < compR + 12) {
      done = true;
      cancelAnimationFrame(animId);
      _setStatus('✓ Faint companion identified!', true);
      setTimeout(_miniGamePassed, 800);
    } else {
      _setStatus('Nothing there — look for the faint blue point.', false);
    }
  });

  animId = requestAnimationFrame(tick);
}

// ──────────────────────────────────────────────────────────
// SCExAO — Adjust two sliders until speckles disappear
// ──────────────────────────────────────────────────────────
function _game_scexao() {
  _setTeaches('SCExAO suppresses stellar speckles in a "dark hole." Adjust both controls until the speckles vanish from the target zone!');

  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="360" height="240" style="display:block;margin:auto"></canvas>
    <div style="display:flex;gap:24px;justify-content:center;margin-top:8px">
      <div><label style="color:var(--muted);font-size:12px">Phase</label><br>
        <input type="range" id="ctrl1" min="0" max="100" value="20" style="width:120px"></div>
      <div><label style="color:var(--muted);font-size:12px">Amplitude</label><br>
        <input type="range" id="ctrl2" min="0" max="100" value="20" style="width:120px"></div>
    </div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');
  const ctrl1  = document.getElementById('ctrl1');
  const ctrl2  = document.getElementById('ctrl2');

  // Target: ctrl1 ~65, ctrl2 ~70 (±15 tolerance)
  const t1 = 65, t2 = 70, tol = 15;

  const darkZoneX = 160, darkZoneY = 60, darkZoneW = 100, darkZoneH = 100;
  let animId;
  let passed = false;

  // Pre-generate speckle seed positions
  const speckles = Array.from({length:30},(_,i)=>({
    ox: (i*137)%180 - 90,
    oy: (i*97)%180 - 90,
  }));

  function draw() {
    const v1 = parseInt(ctrl1.value);
    const v2 = parseInt(ctrl2.value);
    const err = Math.sqrt((v1-t1)**2 + (v2-t2)**2);
    const suppression = Math.max(0, 1 - err / 60);

    ctx.clearRect(0,0,360,240);
    ctx.fillStyle='#040810'; ctx.fillRect(0,0,360,240);

    // Star (center of image)
    ctx.beginPath(); ctx.arc(130,120,10,0,Math.PI*2);
    ctx.fillStyle='#fffde0'; ctx.fill();

    // Speckles around star — shrink in dark zone as suppression rises
    speckles.forEach((sp,i) => {
      const sx = 130 + sp.ox;
      const sy = 120 + sp.oy;
      // Check if in dark zone
      const inZone = sx > darkZoneX && sx < darkZoneX+darkZoneW &&
                     sy > darkZoneY && sy < darkZoneY+darkZoneH;
      const alpha = inZone ? Math.max(0.05, 1-suppression) : 1;
      const r     = 3 + ((i*31)%4);
      const sg = ctx.createRadialGradient(sx,sy,0,sx,sy,r);
      sg.addColorStop(0,`rgba(255,220,100,${alpha*0.8})`);
      sg.addColorStop(1,'rgba(255,220,100,0)');
      ctx.beginPath(); ctx.arc(sx,sy,r,0,Math.PI*2);
      ctx.fillStyle=sg; ctx.fill();
    });

    // Dark zone border
    ctx.strokeStyle = suppression > 0.85 ? '#44ee44' : 'rgba(126,207,237,0.4)';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([4,3]);
    ctx.strokeRect(darkZoneX, darkZoneY, darkZoneW, darkZoneH);
    ctx.setLineDash([]);
    ctx.fillStyle='rgba(126,207,237,0.3)'; ctx.font='9px sans-serif'; ctx.textAlign='center';
    ctx.fillText('Dark zone', darkZoneX+darkZoneW/2, darkZoneY-5);

    // Planet hint (appears in dark zone at high suppression)
    if (suppression > 0.7) {
      const pa = (suppression - 0.7) / 0.3;
      ctx.beginPath(); ctx.arc(darkZoneX+70, darkZoneY+60, 5, 0, Math.PI*2);
      ctx.fillStyle=`rgba(80,180,255,${pa})`; ctx.fill();
      if (pa > 0.8) {
        ctx.fillStyle=`rgba(80,180,255,${pa})`; ctx.font='9px sans-serif'; ctx.textAlign='center';
        ctx.fillText('Planet', darkZoneX+70, darkZoneY+50);
      }
    }

    // Suppression bar
    ctx.fillStyle='#1a2530'; ctx.fillRect(10,225,340,8);
    ctx.fillStyle = suppression > 0.85 ? '#44ee44' : '#7ecfed';
    ctx.fillRect(10,225,340*suppression,8);

    if (!passed && suppression > 0.85) {
      passed = true;
      cancelAnimationFrame(animId);
      _setStatus('✓ Dark hole created — planet visible!', true);
      setTimeout(_miniGamePassed, 1000);
      return;
    }
    _setStatus(`Speckle suppression: ${Math.round(suppression*100)}%`, false);
    animId = requestAnimationFrame(draw);
  }

  ctrl1.addEventListener('input', () => { cancelAnimationFrame(animId); animId=requestAnimationFrame(draw); });
  ctrl2.addEventListener('input', () => { cancelAnimationFrame(animId); animId=requestAnimationFrame(draw); });

  animId = requestAnimationFrame(draw);
}

// ──────────────────────────────────────────────────────────
// CHARIS — Swipe through wavelength layers of a data cube
// ──────────────────────────────────────────────────────────
function _game_charis() {
  _setTeaches('CHARIS records a 3D data cube: an image at every wavelength. Swipe through the layers to explore how the planet looks at different colors!');

  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="360" height="220" style="display:block;margin:auto;cursor:ew-resize"></canvas>
    <div style="text-align:center;margin-top:6px;font-size:13px;color:var(--muted)">Drag left/right to scan through wavelength layers (visit all 6)</div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');

  const layers = [
    { label:'J (1.2µm)', hue:220 },
    { label:'H (1.6µm)', hue:180 },
    { label:'K1(2.0µm)', hue:140 },
    { label:'K2(2.2µm)', hue:60  },
    { label:'K3(2.4µm)', hue:30  },
    { label:'K4(2.5µm)', hue:0   },
  ];

  let layerIdx = 0;
  let dragStartX = null, startIdx = 0;
  let visited   = new Set([0]);
  let passed    = false;

  function draw() {
    const lyr = layers[layerIdx];
    ctx.clearRect(0,0,360,220);
    ctx.fillStyle = `hsl(${lyr.hue},20%,4%)`;
    ctx.fillRect(0,0,360,220);

    // Stars
    for (let i=0;i<30;i++) {
      ctx.fillStyle=`rgba(255,255,255,0.3)`;
      ctx.fillRect((i*137)%360,(i*97)%200,1,1);
    }

    // "Planet" — color shifts with wavelength
    const pg = ctx.createRadialGradient(180,100,2,180,100,30);
    pg.addColorStop(0,`hsl(${lyr.hue},80%,70%)`);
    pg.addColorStop(1,`hsl(${lyr.hue},50%,10%)`);
    ctx.beginPath(); ctx.arc(180,100,30,0,Math.PI*2);
    ctx.fillStyle=pg; ctx.fill();

    // Label
    ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font='bold 12px sans-serif'; ctx.textAlign='center';
    ctx.fillText(lyr.label, 180, 155);

    // Layer indicator
    layers.forEach((l,i) => {
      const lx = 20 + i * 55;
      ctx.fillStyle = i===layerIdx ? `hsl(${l.hue},70%,60%)` :
                      visited.has(i) ? 'rgba(255,255,255,0.3)' : '#1a2530';
      ctx.fillRect(lx, 190, 46, 10);
    });

    const left = layers.length - visited.size;
    if (!passed) {
      _setStatus(left > 0 ? `${left} layer${left>1?'s':''} not yet visited` : 'All layers visited!', left===0);
    }
  }

  canvas.addEventListener('mousedown',  e => { const r=canvas.getBoundingClientRect(); dragStartX=e.clientX-r.left; startIdx=layerIdx; });
  canvas.addEventListener('touchstart', e => { e.preventDefault(); const r=canvas.getBoundingClientRect(); dragStartX=e.touches[0].clientX-r.left; startIdx=layerIdx; },{passive:false});
  window.addEventListener('mousemove',  e => {
    if(dragStartX===null)return;
    const r=canvas.getBoundingClientRect();
    const dx=(e.clientX-r.left)-dragStartX;
    const idx=Math.min(layers.length-1, Math.max(0, startIdx - Math.round(dx/50)));
    if(idx!==layerIdx){layerIdx=idx; visited.add(idx); draw();}
  });
  window.addEventListener('touchmove',  e => {
    if(dragStartX===null)return; e.preventDefault();
    const r=canvas.getBoundingClientRect();
    const dx=(e.touches[0].clientX-r.left)-dragStartX;
    const idx=Math.min(layers.length-1,Math.max(0,startIdx-Math.round(dx/50)));
    if(idx!==layerIdx){layerIdx=idx; visited.add(idx); draw();}
  },{passive:false});
  window.addEventListener('mouseup',  () => {
    dragStartX=null;
    if(visited.size>=layers.length && !passed){passed=true;_setStatus('✓ Full wavelength cube explored!',true);setTimeout(_miniGamePassed,800);}
  });
  window.addEventListener('touchend', () => {
    dragStartX=null;
    if(visited.size>=layers.length && !passed){passed=true;_setStatus('✓ Full wavelength cube explored!',true);setTimeout(_miniGamePassed,800);}
  });

  draw();
}

// ──────────────────────────────────────────────────────────
// VAMPIRES — Rotate polarizer until dust ring brightens
// ──────────────────────────────────────────────────────────
function _game_vampires() {
  _setTeaches('VAMPIRES uses polarimetry to reveal scattered light from dust rings. Rotate the polarizer until the ring becomes bright!');

  const area = document.getElementById('mg-game-area');
  area.innerHTML = `
    <canvas id="mg-canvas" width="360" height="240" style="display:block;margin:auto;cursor:ew-resize"></canvas>
    <div style="text-align:center;margin-top:6px;font-size:13px;color:var(--muted)">Drag left/right to rotate the polarizer angle</div>`;

  const canvas = document.getElementById('mg-canvas');
  const ctx    = canvas.getContext('2d');

  let angle      = 0;  // degrees
  let dragStartX = null, startAngle = 0;
  let passed     = false;
  let animId;
  // Optimal angle: ~65° (scattered light is polarized at a specific angle)
  const optimal  = 65;

  function ringBrightness() {
    const diff = Math.abs(((angle - optimal) % 180 + 180) % 180);
    return Math.max(0, 1 - diff / 50);
  }

  function draw() {
    const bright = ringBrightness();
    ctx.clearRect(0,0,360,240);
    ctx.fillStyle='#040810'; ctx.fillRect(0,0,360,240);
    for(let i=0;i<40;i++){ctx.fillStyle=`rgba(255,255,255,${0.1+((i*73)%10)*0.05})`;ctx.fillRect((i*137)%360,(i*97)%240,1,1);}

    // Dust ring
    const rg = ctx.createRadialGradient(180,110,25,180,110,70);
    rg.addColorStop(0,'rgba(200,160,100,0)');
    rg.addColorStop(0.5,`rgba(200,160,100,${bright*0.9})`);
    rg.addColorStop(1,'rgba(200,160,100,0)');
    ctx.beginPath(); ctx.arc(180,110,70,0,Math.PI*2);
    ctx.fillStyle=rg; ctx.fill();

    // Central star
    ctx.beginPath(); ctx.arc(180,110,12,0,Math.PI*2); ctx.fillStyle='#fffde0'; ctx.fill();

    // Polarizer dial
    const dialX=295, dialY=110, dialR=35;
    ctx.beginPath(); ctx.arc(dialX,dialY,dialR,0,Math.PI*2);
    ctx.strokeStyle='#7ecfed'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='rgba(26,37,48,0.8)'; ctx.fill();
    // Pointer
    const rad = angle * Math.PI/180;
    ctx.beginPath();
    ctx.moveTo(dialX,dialY);
    ctx.lineTo(dialX + Math.cos(rad)*dialR*0.9, dialY + Math.sin(rad)*dialR*0.9);
    ctx.strokeStyle='#ff8040'; ctx.lineWidth=3; ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font='9px sans-serif'; ctx.textAlign='center';
    ctx.fillText(`${Math.round(angle % 360)}°`, dialX, dialY+dialR+14);
    ctx.fillText('Polarizer', dialX, dialY-dialR-5);

    // Brightness meter
    ctx.fillStyle='#1a2530'; ctx.fillRect(10,225,220,8);
    ctx.fillStyle=bright>0.85?'#44ee44':'#ff8040';
    ctx.fillRect(10,225,220*bright,8);
    ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font='9px sans-serif'; ctx.textAlign='left';
    ctx.fillText(`Signal: ${Math.round(bright*100)}%`, 10,220);

    if (!passed && bright > 0.85) {
      passed=true; cancelAnimationFrame(animId);
      _setStatus('✓ Polarized dust ring detected!',true);
      setTimeout(_miniGamePassed,1000);
      return;
    }
    animId = requestAnimationFrame(draw);
  }

  canvas.addEventListener('mousedown',  e => { const r=canvas.getBoundingClientRect(); dragStartX=e.clientX-r.left; startAngle=angle; });
  canvas.addEventListener('touchstart', e => { e.preventDefault(); const r=canvas.getBoundingClientRect(); dragStartX=e.touches[0].clientX-r.left; startAngle=angle; },{passive:false});
  window.addEventListener('mousemove',  e => { if(dragStartX===null)return; const r=canvas.getBoundingClientRect(); angle=startAngle+(e.clientX-r.left-dragStartX)*1.5; });
  window.addEventListener('touchmove',  e => { if(dragStartX===null)return; e.preventDefault(); const r=canvas.getBoundingClientRect(); angle=startAngle+(e.touches[0].clientX-r.left-dragStartX)*1.5; },{passive:false});
  window.addEventListener('mouseup',  ()=>{ dragStartX=null; });
  window.addEventListener('touchend', ()=>{ dragStartX=null; });

  animId = requestAnimationFrame(draw);
}