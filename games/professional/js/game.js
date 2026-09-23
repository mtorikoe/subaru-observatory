/* ============================================================
   game.js — tab system, game-over, final result, reset,
              tab highlighting
   ============================================================ */

// ── Tab system ────────────────────────────────────────────
const TABS = ['env','telescope','ao3k','scexao','charis','vampire','first'];

function switchTab(name) {
  TABS.forEach(t => {
    const panel = document.getElementById(`tab-${t}`);
    const btn   = document.getElementById(`tab-btn-${t}`);
    if (!panel || !btn) return;
    const active = (t === name);
    panel.style.display = active ? 'flex' : 'none';
    btn.classList.toggle('tab-active', active);
  });
  // refresh canvases for the newly visible tab
  if (name === 'env')       { renderEnvCharts(); }
  if (name === 'telescope') { updateTelescopeView(); }
  if (name === 'ao3k')      { /* static info */ }
}

function highlightTab(name) {
  TABS.forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    if (!btn) return;
    btn.classList.toggle('tab-hint', t === name);
  });
}

// ── Game over ─────────────────────────────────────────────
function triggerGameOver(reason) {
  G.gameOver = true;
  const overlay = document.getElementById('gameover-overlay');
  const msg     = document.getElementById('gameover-msg');
  if (!overlay || !msg) return;
  if (reason === 'humidity-open') {
    msg.textContent = 'You attempted to open the enclosure with humidity above 70%. The telescope mirrors could be damaged by condensation. Observation aborted.';
  } else if (reason === 'humidity-spike') {
    msg.textContent = 'Humidity spiked above 70% while the enclosure was open. You were not monitoring the environmental conditions. Telescope emergency close initiated.';
  }
  overlay.style.display = 'flex';
}

function triggerReset() {
  resetGame();
  document.getElementById('gameover-overlay').style.display = 'none';
  document.getElementById('result-overlay').style.display   = 'none';
  termHistory = []; cmdHistory = []; cmdHistIdx = -1;
  renderTerminal();
  termSystem('System reset. Ready for new observation.');
  termSystem('────────────────────────────────────────────────');
  termPrint('  Start: subaru-telescope-open');
  updateMiddlePanel(); updateRightPanel();
  initTelescopeTab(); initEnvTab();
  switchTab('env');
}

// ── Final result overlay ──────────────────────────────────
function showFinalResult(perfect) {
  const overlay = document.getElementById('result-overlay');
  if (!overlay) return;
  const star = G.targetStar;
  if (!star) return;

  document.getElementById('result-star-name').textContent = star.display;
  document.getElementById('result-type').textContent = {
    planet:'Exoplanet', browndwarf:'Brown Dwarf Companion',
    multiplanet:'Multi-planet System', disk:'Protoplanetary Disk'
  }[star.type] || 'Companion';
  document.getElementById('result-desc').textContent = star.desc;
  document.getElementById('result-score').textContent = G.score;
  document.getElementById('result-perfect').style.display = perfect ? 'block' : 'none';

  // Final image
  const imgEl = document.getElementById('result-image');
  const credEl = document.getElementById('result-credit');
  if (perfect && star.finalImageUrl) {
    imgEl.src = star.finalImageUrl;
    imgEl.alt = star.finalImageAlt;
    imgEl.style.display = 'block';
    credEl.textContent  = star.finalImageCredit;
  } else {
    // placeholder path for user-supplied image
    imgEl.src = star.localAsset;
    imgEl.alt = star.finalImageAlt;
    imgEl.onerror = () => { imgEl.style.display='none'; };
    imgEl.style.display = 'block';
    credEl.textContent = star.finalImageCredit + ' (replace ' + star.localAsset + ' with actual image)';
  }

  // Score log
  const logEl = document.getElementById('result-log');
  logEl.innerHTML = G.scoreLog.map(e =>
    `<div class="log-row"><span>${e.label}</span><span style="color:var(--gold)">+${e.pts}</span></div>`
  ).join('');

  overlay.style.display = 'flex';
  termSuccess(`Observation complete! Final score: ${G.score}`);
}

// ── Init ──────────────────────────────────────────────────
function init() {
  initTerminal();
  initEnvTab();
  initTelescopeTab();
  switchTab('env');
  updateMiddlePanel();
  updateRightPanel();
  // env tick
  setInterval(tickEnv, 3000);
}

document.addEventListener('DOMContentLoaded', init);

// Keep terminal input focused
document.addEventListener('click', e => {
  const inp = document.getElementById('term-input');
  if (inp && !e.target.closest('#term-input')) inp.focus();
});