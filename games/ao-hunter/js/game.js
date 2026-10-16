/* ============================================================
   game.js — layout, instructions, observation flow, rewards
   ============================================================ */

const INSTRUCTIONS = [
  { step:0, text:'Choose a star from the field on the left.' },
  { step:1, text:'The star looks blurry! Add instruments below, then click Observe.' },
  { step:2, text:'Try a different instrument combination and click Observe again.' },
  { step:3, text:'Observing…' },
  { step:4, text:'A faint companion is visible — click it to confirm your discovery!' },
  { step:5, text:'Discovery confirmed! Collect your new instrument.' },
  { step:6, text:'Good call — no companion detected with this telescope setup.' },
  { step:7, text:'Telescope ready — click Observe!' },
  { step:8, text:'Telescope ready. Now choose a star from the field.' },
];

function updateInstructions(step) {
  const el = document.getElementById('instruction-bar');
  if (el) el.textContent = (INSTRUCTIONS[step]||INSTRUCTIONS[0]).text;
}

// Call this whenever the selected instruments change
function onInstrumentsChanged() {
  if (G.observationRunning) return;
  // Changing instruments after an observation starts a fresh attempt on the same star
  if (G.selectedStar && _svObserved) {
    resetStarView();
    document.getElementById('result-banner').style.display = 'none';
  }
  setButtonStates();
  renderStarView();
  const has = G.selectedInstruments.length > 0;
  if (G.selectedStar) updateInstructions(has ? 7 : 1);   // star chosen
  else                updateInstructions(has ? 8 : 0);   // no star yet
}

// ── LAYOUT ────────────────────────────────────────────────
function renderLayout() {
  const sfWrap = document.getElementById('sf-wrap');
  const svWrap = document.getElementById('sv-wrap');
  if (!sfWrap || !svWrap) return;
  if (G.starFieldExpanded) {
    sfWrap.style.flex = '4';
    svWrap.style.display = 'none';
  } else {
    sfWrap.style.flex = '2';
    svWrap.style.display = 'flex';
    svWrap.style.flex    = '2';
  }
  const btns = document.getElementById('sv-buttons');
  if (btns) btns.style.display = G.starFieldExpanded ? 'none' : 'flex';
}

// ── BUTTON STATE ──────────────────────────────────────────
// Observe is enabled whenever: star selected + instruments chosen + not running + not yet observed
// Re-selecting a star resets _svObserved so Observe becomes available again.
function setButtonStates() {
  const obBtn = document.getElementById('observe-btn');
  const npBtn = document.getElementById('no-planet-btn');

  const canObserve = G.selectedStar
    && G.selectedInstruments.length > 0
    && !G.observationRunning
    && !_svObserved;            // once observed, must pick new star or reset

  if (obBtn) {
    obBtn.disabled    = !canObserve;
    obBtn.textContent = G.observationRunning ? 'Observing…' : '▶ Observe';
  }

  // "No planet" button: only after observation completes with no companion prompt
  const showNoPlanet = _svObserved && !_svCompanionClickable && !G.observationRunning;
  if (npBtn) npBtn.style.display = showNoPlanet ? 'block' : 'none';
}

// ── OBSERVE ───────────────────────────────────────────────
function triggerObservation() {
  if (!G.selectedStar)                  { updateInstructions(0); return; }
  if (G.selectedInstruments.length===0) { updateInstructions(1); return; }
  if (G.observationRunning)             return;
  if (_svObserved)                      return;

  updateInstructions(3);
  setButtonStates();

  animateObservationSteps(() => {
    const result = evaluateObservation();
    G.observationComplete = true;
    revealStarView(result.clarity);
    showResultBanner(result);
    setButtonStates();   // update after _svObserved becomes true

    if (!result.success) { updateInstructions(2); return; }
    if (!result.discovered) { updateInstructions(6); return; }
    // companion visible → handled by companion click in starview.js
  });
}

// ── CONFIRM NO PLANET ────────────────────────────────────
function confirmNoPlanet() {
  _stopPulse?.();
  const npBtn = document.getElementById('no-planet-btn');
  if (npBtn) npBtn.style.display='none';
  showNoPlanetOverlay();
}

function showNoPlanetOverlay() {
  const overlay = document.getElementById('reward-overlay');
  if (!overlay) return;
  overlay.innerHTML = `
    <div class="reward-box">
      <div class="reward-title" style="color:var(--accent)">No Exoplanet Detected</div>
      <div class="reward-result">
        Correct — no companion is visible with this telescope configuration.<br>
        Try a different star, or unlock more powerful instruments to look deeper.
      </div>
      <button class="reward-btn" onclick="closeNoPlanetOverlay()">Continue observing →</button>
    </div>
  `;
  overlay.style.display='flex';
  updateInstructions(6);
}

function closeNoPlanetOverlay() {
  document.getElementById('reward-overlay').style.display='none';
  document.getElementById('result-banner').style.display='none';
  // Do NOT reset instruments or star — let player pick a new star freely
  G.observationComplete = false;
  G.observationRunning  = false;
  // Reset star view so player can reselect
  G.selectedStar       = null;
  G.starFieldExpanded  = true;
  resetStarView();
  setButtonStates();
  renderLayout();
  renderStarView();
  updateInstructions(0);
}

// ── RESULT BANNER ─────────────────────────────────────────
function showResultBanner(result) {
  const banner = document.getElementById('result-banner');
  if (!banner) return;
  banner.textContent   = result.message;
  banner.className     = 'result-banner '+(result.success?'success':'miss');
  banner.style.display = 'block';
  if (!result.success) setTimeout(()=>{ banner.style.display='none'; }, 4000);
}

// ── REWARD SCREEN ─────────────────────────────────────────
function showRewardScreen(newInstrId, result) {
  const overlay = document.getElementById('reward-overlay');
  if (!overlay) return;
  const instr    = INSTRUMENTS[newInstrId];
  const stageMsg = (newInstrId==='hsc')
    ? '<div class="stage-unlock">🌟 Stage 2 Unlocked — Gaia Proper Motion Field!</div>' : '';

  overlay.innerHTML = `
    <div class="reward-box">
      <div class="reward-title">✨ Exoplanet Confirmed!</div>
      <div class="reward-result">${result.message}</div>
      ${stageMsg}
      ${instr ? `
        <div class="reward-new">New instrument unlocked:</div>
        <div class="reward-instr" style="border-color:${instr.color};">
          <canvas id="reward-instr-canvas" width="200" height="100"
            style="display:block;margin:0 auto 8px;border-radius:4px;background:#080f1e;"></canvas>
          <div class="reward-iname">${instr.name}</div>
          <div class="reward-iyear">Installed at Subaru Telescope ${instr.year}</div>
          <div class="reward-idesc">${instr.description}</div>
        </div>
      ` : '<div class="reward-result">All instruments unlocked — master astronomer!</div>'}
      <button class="reward-btn" onclick="closeReward()">Continue observing →</button>
    </div>
  `;
  overlay.style.display='flex';
  updateInstructions(5);
  if (instr) requestAnimationFrame(()=>{
    const rc=document.getElementById('reward-instr-canvas');
    if (rc) drawInstrumentPicture(rc, newInstrId, false);
  });
}

function closeReward() {
  document.getElementById('reward-overlay').style.display='none';
  document.getElementById('result-banner').style.display='none';
  G.observationComplete=false; G.selectedStar=null;
  G.starFieldExpanded=true;    // G.selectedInstruments=[];
  G.observationRunning=false;
  resetStarView();
  setButtonStates();
  const npBtn=document.getElementById('no-planet-btn');
  if (npBtn) npBtn.style.display='none';
  renderLayout(); renderInstrumentPallet(); renderInstrumentCarousel();
  renderConstructionView(); renderStarView();
  updateInstructions(0);
  if (G.stage===2) generateGaiaField(); else generateField();
}

// ── STAGE  ────────────────────────────────────────────
function checkStageSwitch() {
  const el=document.getElementById('stage-label');
  if (el) el.textContent=G.stage===2?'Stage 2':'Stage 1';
  if (G.stage===2) {
    generateGaiaField();
  }
}

// ── DEMO ──────────────────────────────────────────────────
(function(){
  const inp=document.getElementById('demo-code-input');
  if (!inp) return;
  inp.addEventListener('keydown',e=>{
    if (e.key==='Enter'&&inp.value.trim()==='science-night-demo') {
      activateDemoMode(); inp.value=''; inp.blur();
      checkStageSwitch(); renderInstrumentCarousel();
      renderInstrumentPallet(); renderConstructionView();
      alert('Demo mode activated.');
    }
  });
})();

// ── INIT ──────────────────────────────────────────────────
function init() {
  if (sessionStorage.getItem('ao_demo')==='1') {
    sessionStorage.removeItem('ao_demo'); activateDemoMode();
  } else { loadProgress(); }
  checkStageSwitch();
  renderLayout();
  if (G.stage===2) generateGaiaField(); else generateField();
  renderInstrumentCarousel(); renderInstrumentPallet();
  renderConstructionView();   setButtonStates();
  updateInstructions(0);      renderStarfield();
}
document.addEventListener('DOMContentLoaded', init);
window.addEventListener('resize',()=>{
  renderLayout(); renderConstructionView();
  renderStarView(); renderInstrumentCarousel();
  if (G.stage===2) generateGaiaField(); else generateField();
});