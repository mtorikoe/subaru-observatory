/* ============================================================
   game.js — Universe Hunting core game flow
   ============================================================ */

// ── Tab switching (Instruments / Collection in lower row) ──
let _activeTab = 'instruments'; // 'instruments' | 'collection'

function switchTab(tab) {
  _activeTab = tab;
  document.querySelectorAll('.uh-tab').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  document.getElementById('tab-instruments').style.display = tab === 'instruments' ? '' : 'none';
  document.getElementById('tab-collection').style.display  = tab === 'collection'  ? '' : 'none';
  if (tab === 'collection') renderCollectionPanel();
}

// ── Layout re-render ───────────────────────────────────────
function renderLayout() {
  renderStarView();
}

// ── Button states ──────────────────────────────────────────
function setButtonStates() {
  const btn = document.getElementById('observe-btn');
  if (!btn) return;
  const canObs = G.selectedTarget
    && G.selectedInstruments.length > 0
    && !G.observationRunning
    && !G.observationComplete;
  btn.disabled = !canObs;
}

// ── Instruction bar ────────────────────────────────────────
const _INSTRUCTION_STEPS = [
  'Choose a target object !',                                             // 0
  'Choose instruments for this observation.',                             // 1
  'Press <b>Observe</b> when ready !',                                   // 2
  'Observing — watch the instruments work ...',                          // 3
  'Observation complete. Check the result !',                            // 4
];

function updateInstructions(step, customHint) {
  // Instruction bar removed — no-op; callers kept as-is
}

// ── Observe button clicked ─────────────────────────────────
function triggerObservation() {
  if (!G.selectedTarget || G.selectedInstruments.length === 0 || G.observationRunning) return;

  G.observationRunning  = true;
  G.observationComplete = false;
  setButtonStates();
  updateInstructions(3);

  // Run each instrument's mini-game in sequence; observation completes only when all pass
  startMiniGameQueue(G.selectedInstruments.slice(), () => {
    // All mini-games passed — evaluate result
    const result = evaluateObservation();
    G.observationRunning  = false;
    G.observationComplete = true;

    revealStarView(result.clarity);

    if (result.success) {
      // Add to collection
      if (!G.revealedTargets.includes(G.selectedTarget.id)) {
        G.revealedTargets.push(G.selectedTarget.id);
        G.score += result.perfect ? 100 : result.good ? 70 : 40;
        updateScoreDisplay();
      }
      showRewardOverlay(result);
    } else {
      showFailOverlay(result);
    }

    setButtonStates();
    updateInstructions(4);
  });  // end startMiniGameQueue
}

// ── Score display ──────────────────────────────────────────
function updateScoreDisplay() {
  const el = document.getElementById('score-display');
  if (el) el.textContent = `Score: ${G.score}  |  Revealed: ${G.revealedTargets.length}`;
}

// ── Reward overlay (success) ───────────────────────────────
function showRewardOverlay(result) {
  const target = G.selectedTarget;
  const stars  = Math.round(result.clarity * 5);

  // Build star row
  let starHtml = '<div class="reward-clarity-row">';
  for (let i=1;i<=5;i++) starHtml += `<span class="reward-star ${i<=stars?'lit':'dim'}">★</span>`;
  starHtml += '</div>';

  // Image element — show real photo if available
  const imgSrc  = target.img;
  const imgHtml = imgSrc
    ? `<img class="reward-image" src="${imgSrc}" alt="${target.name}" onerror="this.style.display='none';document.getElementById('reward-img-placeholder').style.display='flex'">
       <div class="reward-image-placeholder" id="reward-img-placeholder" style="display:none">
         Place image at: ${imgSrc}
       </div>`
    : `<div class="reward-image-placeholder">No image yet — add file to: ${target.img || 'assets/star-pic/'}</div>`;

  const sourceHtml = target.url
    ? `<div class="reward-source">Source: <a href="${target.url}" target="_blank" rel="noopener">${target.url.replace(/^https?:\/\//,'')}</a></div>`
    : '';

  const box = `
    <div class="reward-overlay" id="reward-overlay" onclick="_overlayBgClick(event)">
      <div class="reward-box" onclick="event.stopPropagation()">
        <div class="reward-title">Image Acquired</div>
        <div class="reward-subtitle">${target.name}</div>
        ${starHtml}
        ${imgHtml}
        <div class="reward-msg">${result.message}</div>
        ${sourceHtml}
        <div class="reward-btns">
          <button class="reward-btn" onclick="closeRewardAndNext()">Next Target</button>
          <button class="reward-btn primary" onclick="closeReward()">Done</button>
        </div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', box);
}

function _overlayBgClick(e) {
  if (e.target.classList.contains('reward-overlay')) closeReward();
}

function closeReward() {
  _removeOverlay('#reward-overlay');
  // Return to target selection state
  G.selectedTarget      = null;
  G.observationComplete = false;
  G.selectedInstruments = [];
  renderTargetPanel();
  renderInstrumentCarousel();
  renderConstructionView();
  renderStarView();
  setButtonStates();
  updateInstructions(0);
}

function closeRewardAndNext() {
  _removeOverlay('#reward-overlay');
  // Keep instruments but clear target
  G.selectedTarget      = null;
  G.observationComplete = false;
  renderTargetPanel();
  renderStarView();
  setButtonStates();
  updateInstructions(0);
}

// ── Fail overlay ───────────────────────────────────────────
function showFailOverlay(result) {
  const target = G.selectedTarget;

  const missingNames = result.missing.map(id => UH_INSTRUMENTS[id]?.name || id).join(', ');

  const box = `
    <div class="reward-overlay" id="fail-overlay" onclick="_failBgClick(event)">
      <div class="reward-box" onclick="event.stopPropagation()">
        <div class="reward-title" style="color:var(--warn)">⚠ Observation Incomplete</div>
        <div class="reward-subtitle">${target.name}</div>
        <div class="reward-msg">
          ${result.message}
          ${missingNames ? `<br><br>Still needed: <b>${missingNames}</b>` : ''}
        </div>
        <div class="reward-btns">
          <button class="reward-btn primary" onclick="closeFailOverlay()">Adjust &amp; Retry</button>
        </div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', box);
}

function _failBgClick(e) {
  if (e.target.classList.contains('reward-overlay')) closeFailOverlay();
}

function closeFailOverlay() {
  _removeOverlay('#fail-overlay');
  // Return to same target, keep instruments — allow user to adjust
  G.observationComplete = false;
  resetStarView();
  renderInstrumentCarousel();
  renderConstructionView();
  renderStarView();
  setButtonStates();
  updateInstructions(G.selectedInstruments.length > 0 ? 2 : 1);
}

function _removeOverlay(selector) {
  const el = document.querySelector(selector);
  if (el) el.remove();
}

// ── Collection panel ───────────────────────────────────────
// Shows EVERY target: unlocked (observed) ones display the image and are
// clickable; locked ones show a 🔒 placeholder with the target name, telling
// the player what's still out there to find.
function renderCollectionPanel() {
  const panel = document.getElementById('collection-panel');
  if (!panel) return;

  const total    = TARGETS.length;
  const revealed = G.revealedTargets.length;

  let html = `<div class="coll-title">Collection
                <span class="coll-progress">${revealed} / ${total}</span>
              </div>`;

  // Group by category so the player can find things fast
  CATEGORIES.forEach(cat => {
    const catTargets = TARGETS.filter(t => t.category === cat.id);
    if (catTargets.length === 0) return;
    const revealedInCat = catTargets.filter(t => G.revealedTargets.includes(t.id)).length;

    html += `<div class="coll-section-head">${cat.label} — ${revealedInCat}/${catTargets.length}</div>`;
    html += '<div class="coll-grid">';

    // Within each category: revealed cards first, then locked ones
    const sorted = catTargets.slice().sort((a, b) => {
      const aR = G.revealedTargets.includes(a.id) ? 0 : 1;
      const bR = G.revealedTargets.includes(b.id) ? 0 : 1;
      return aR - bR;
    });

    sorted.forEach(t => {
      const unlocked = G.revealedTargets.includes(t.id);
      if (unlocked) {
        const imgTag = t.img
          ? `<img src="${t.img}" alt="${t.name}" loading="lazy"
                  onerror="this.outerHTML='<div class=\\'coll-card-placeholder\\'></div>'">`
          : `<div class="coll-card-placeholder"></div>`;
        html += `
          <div class="coll-card" title="${t.name} — click for details"
               onclick="openTargetDetails('${t.id}')">
            ${imgTag}
            <div class="coll-card-name">${t.name}</div>
          </div>`;
      } else {
        html += `
          <div class="coll-card locked" title="Not yet observed — complete an observation of ${t.name} to unlock">
            <div class="coll-card-placeholder"></div>
            <div class="coll-card-name">${t.name}</div>
          </div>`;
      }
    });

    html += '</div>';
  });

  panel.innerHTML = html;
}

function openTargetDetails(id) {
  const t = TARGETS.find(t => t.id === id);
  if (!t) return;
  // Reuse the reward-overlay style, but as a details-only view (no next-target buttons)
  const imgHtml = t.img
    ? `<img class="reward-image" src="${t.img}" alt="${t.name}"
            onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'reward-image-placeholder',textContent:'No image yet'}))">`
    : `<div class="reward-image-placeholder">No image yet</div>`;
  const srcHtml = t.url
    ? `<div class="reward-source">Source:
         <a href="${t.url}" target="_blank" rel="noopener">${t.url.replace(/^https?:\/\//,'')}</a>
       </div>`
    : '';
  const catLabel = (CATEGORIES.find(c => c.id === t.category) || {}).label || t.category;
  const instrList = (t.instruments || []).map(i => UH_INSTRUMENTS[i]?.name || i).join(', ');

  const box = `
    <div class="reward-overlay" id="details-overlay" onclick="_detailsBgClick(event)">
      <div class="reward-box" onclick="event.stopPropagation()">
        <button class="details-close" onclick="closeTargetDetails()" title="Close">✕</button>
        <div class="reward-title" style="color:var(--accent)">${t.name}</div>
        <div class="reward-subtitle">${catLabel}</div>
        ${imgHtml}
        <div class="reward-msg">${t.description || ''}</div>
        <div class="details-meta">
          <div><b>Observed with:</b> ${instrList || '—'}</div>
          <div><b>Secondary mirror:</b> ${t.secondaryMirror || '—'}</div>
        </div>
        ${srcHtml}
        <div class="reward-btns">
          <button class="reward-btn primary" onclick="closeTargetDetails()">Close</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', box);
}

function _detailsBgClick(e) {
  if (e.target.classList.contains('reward-overlay')) closeTargetDetails();
}

function closeTargetDetails() {
  const el = document.getElementById('details-overlay');
  if (el) el.remove();
}

// ── Init ───────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  renderTargetPanel();
  renderInstrumentCarousel();
  renderConstructionView();
  renderStarView();
  setButtonStates();
  updateInstructions(0);
  switchTab('instruments');

  // Observe button
  const observeBtn = document.getElementById('observe-btn');
  if (observeBtn) observeBtn.addEventListener('click', () => {
    if (!observeBtn.disabled) triggerObservation();
  });

  // Resize
  window.addEventListener('resize', () => {
    renderStarView();
  });
});