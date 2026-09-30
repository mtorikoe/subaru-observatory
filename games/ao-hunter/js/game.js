/* ============================================================
   game.js — layout, stage control, instructions, rewards
   ============================================================ */

// ── INSTRUCTION STEPS ──────────────────────────────────────
const INSTRUCTIONS = [
  { step:0, text:'Choose a star from the field' },
  { step:1, text:'The star looks blurry! Choose instruments below to build your telescope.' },
  { step:2, text:'Good — now click Observe to run the telescope.' },
  { step:3, text:'Observing… please wait.' },
  { step:4, text:'A faint companion is visible! Click it to confirm your discovery.' },
  { step:5, text:'Wonderful! Discovery confirmed. Collect your new instrument.' },
];

function updateInstructions(step) {
  const el = document.getElementById('instruction-bar');
  if (!el) return;
  const msg = INSTRUCTIONS[step] || INSTRUCTIONS[0];
  el.textContent = msg.text;
}

// ── LAYOUT TOGGLE ──────────────────────────────────────────
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
    svWrap.style.flex = '2';
  }
}

// ── OBSERVE ────────────────────────────────────────────────
function triggerObservation() {
  if (!G.selectedStar)              { updateInstructions(0); return; }
  if (G.selectedInstruments.length===0) { updateInstructions(1); return; }
  if (G.observationRunning)         return;
  if (_svObserved)                  return;   // already observed this star — pick a new one

  updateInstructions(3);
  animateObservationSteps(() => {
    const result = evaluateObservation();
    G.observationComplete = true;
    // Reveal the star view at the calculated clarity
    revealStarView(result.clarity);
    showResultBanner(result);

    if (!result.success) {
      updateInstructions(1);
      return;
    }

    if (!result.discovered) {
      // Clean image but no companion — no reward, let player try another star
      updateInstructions(2);
      return;
    }

    // Companion visible — player must click it to confirm
    // (revealStarView already set _svCompanionClickable and called updateInstructions(4))
  });
}

// ── The companion-click confirmation is handled in starview.js
// which calls showRewardScreen() directly after confirmation ──

document.getElementById('observe-btn')?.addEventListener('click', triggerObservation);

// ── RESULT BANNER ──────────────────────────────────────────
function showResultBanner(result) {
  const banner = document.getElementById('result-banner');
  if (!banner) return;
  banner.textContent = result.message;
  banner.className   = 'result-banner ' + (result.success ? 'success' : 'miss');
  banner.style.display = 'block';
  if (!result.success) setTimeout(() => { banner.style.display='none'; }, 4000);
}

// ── REWARD SCREEN ──────────────────────────────────────────
function showRewardScreen(newInstrId, result) {
  const overlay = document.getElementById('reward-overlay');
  if (!overlay) return;
  const instr     = INSTRUMENTS[newInstrId];
  const stageMsg  = (G.stage===2 || newInstrId==='hsc')
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
      ` : '<div class="reward-result">You have unlocked all instruments — master astronomer!</div>'}
      <button class="reward-btn" onclick="closeReward()">Continue observing →</button>
    </div>
  `;
  overlay.style.display = 'flex';
  updateInstructions(5);

  // Draw instrument picture in reward card
  if (instr) {
    requestAnimationFrame(() => {
      const rc = document.getElementById('reward-instr-canvas');
      if (rc) drawInstrumentPicture(rc, newInstrId, false);
    });
  }
}

function closeReward() {
  document.getElementById('reward-overlay').style.display = 'none';
  document.getElementById('result-banner').style.display  = 'none';
  G.observationComplete    = false;
  G.selectedStar           = null;
  G.starFieldExpanded      = true;
  G.selectedInstruments    = [];
  G.observationRunning     = false;
  resetStarView();
  renderLayout();
  renderInstrumentPallet();
  renderInstrumentCarousel();
  renderConstructionView();
  renderStarView();
  updateInstructions(0);
  if (G.stage===2) generateGaiaField();
  else generateField();
}

// ── STAGE SWITCH ───────────────────────────────────────────
function checkStageSwitch() {
  const stageLabel = document.getElementById('stage-label');
  if (!stageLabel) return;
  stageLabel.textContent = G.stage===2 ? 'Stage 2' : 'Stage 1';
  if (G.stage===2) {
    generateGaiaField();
    const pmBtn = document.getElementById('pm-btn');
    if (pmBtn) pmBtn.style.display = 'inline-block';
  }
}

// ── PM ANIMATION ───────────────────────────────────────────
document.getElementById('pm-btn')?.addEventListener('click', () => {
  G.pmPlaying = !G.pmPlaying;
  const pmBtn = document.getElementById('pm-btn');
  if (pmBtn) pmBtn.textContent = G.pmPlaying ? 'Stop proper motion' : 'Show proper motion';
});

// ── DEMO CODE ──────────────────────────────────────────────
(function(){
  const inp = document.getElementById('demo-code-input');
  if (!inp) return;
  inp.addEventListener('keydown', e => {
    if (e.key==='Enter' && inp.value.trim()==='science-night-demo') {
      activateDemoMode();
      inp.value=''; inp.blur();
      checkStageSwitch();
      renderInstrumentCarousel();
      renderInstrumentPallet();
      renderConstructionView();
      alert('Demo mode activated. Advanced instruments unlocked.');
    }
  });
})();

// ── INIT ───────────────────────────────────────────────────
function init() {
  if (sessionStorage.getItem('ao_demo')==='1') {
    sessionStorage.removeItem('ao_demo');
    activateDemoMode();
  } else {
    loadProgress();
  }
  checkStageSwitch();
  renderLayout();
  if (G.stage===2) generateGaiaField();
  else generateField();
  renderInstrumentCarousel();
  renderInstrumentPallet();
  renderConstructionView();
  updateInstructions(0);
  renderStarfield();
}
document.addEventListener('DOMContentLoaded', init);
window.addEventListener('resize', () => {
  renderLayout();
  if (G.stage===2) generateGaiaField();
  else generateField();
  renderConstructionView();
  renderStarView();
  renderInstrumentCarousel();
});