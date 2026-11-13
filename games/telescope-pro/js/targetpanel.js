/* ============================================================
   targetpanel.js — top-right target selector (category → object)
   Replaces the "build order" / instrument pallet from AO Hunter
   ============================================================ */

function renderTargetPanel() {
  const panel = document.getElementById('target-panel');
  if (!panel) return;

  let html = '<div class="tp-title">Select Target Object</div>';

  // Mirror selector — three states (Prime / Large / Small).
  // Locked once a target is selected (target dictates the configuration).
  const locked = !!G.selectedTarget;
  const lockHint = locked ? ' title="Locked by selected target — deselect the target to change."' : '';
  const mkBtn = (val, label) => {
    const active = G.secondaryMirror === val ? 'active' : '';
    const disabled = locked ? 'disabled style="opacity:0.55;cursor:not-allowed"' : '';
    const onclick = locked ? '' : `onclick="setSecondaryMirror('${val}')"`;
    return `<button class="tp-mirror-btn ${active}" ${disabled} ${onclick}>${label}</button>`;
  };
  html += `
    <div class="tp-mirror-row"${lockHint}>
      <span class="tp-mirror-label">Mirror:</span>
      ${mkBtn('prime', 'Prime Focus')}
      ${mkBtn('large', 'Large (Optical)')}
      ${mkBtn('small', 'Small (IR)')}
      ${locked ? '<span style="font-size:0.75em;color:var(--muted);margin-left:auto;font-style:italic">target set</span>' : ''}
    </div>`;

  CATEGORIES.forEach(cat => {
    const targets = TARGETS.filter(t => t.category === cat.id);
    const isOpen  = G.selectedCategory === cat.id;
    html += `
      <div class="tp-category ${isOpen?'open':''}"
           onclick="toggleCategory('${cat.id}')">
        <span class="tp-cat-arrow">${isOpen?'▾':'▸'}</span>
        ${cat.label}
        <span class="tp-cat-count">${targets.length}</span>
      </div>`;
    if (isOpen) {
      html += '<div class="tp-targets">';
      targets.forEach(t => {
        const revealed  = G.revealedTargets.includes(t.id);
        const selected  = G.selectedTarget && G.selectedTarget.id === t.id;
        html += `
          <div class="tp-target ${selected?'selected':''} ${revealed?'revealed':''}"
               onclick="selectTarget('${t.id}')">
            <span class="tp-target-name">${t.name}</span>
            ${revealed ? '<span class="tp-target-badge">✓</span>' : ''}
          </div>`;
      });
      html += '</div>';
    }
  });

  panel.innerHTML = html;
}

function toggleCategory(catId) {
  G.selectedCategory = G.selectedCategory === catId ? null : catId;
  renderTargetPanel();
}

function setSecondaryMirror(mode) {
  // mode is 'prime' | 'large' | 'small'
  if (!['prime','large','small'].includes(mode)) return;
  G.secondaryMirror = mode;

  // Drop every currently-selected instrument that doesn't match the new mirror mode
  G.selectedInstruments = G.selectedInstruments.filter(id => {
    const isPrime = PRIMARY_FOCUS_INSTRUMENTS.includes(id);
    const isLarge = LARGE_SECONDARY_INSTRUMENTS.includes(id);
    const isSmall = SMALL_SECONDARY_INSTRUMENTS.includes(id);
    if (mode === 'prime') return isPrime;
    if (mode === 'large') return isLarge;
    if (mode === 'small') return isSmall;
    return true;
  });

  renderTargetPanel();
  renderInstrumentCarousel();
  renderConstructionView();
  updateInstructions(G.selectedTarget ? 1 : 0);
}

function selectTarget(targetId) {
  const target = TARGETS.find(t => t.id === targetId);
  if (!target) return;

  // Clicking the already-selected target DESELECTS it (frees the mirror)
  if (G.selectedTarget && G.selectedTarget.id === targetId) {
    G.selectedTarget      = null;
    G.observationComplete = false;
    G.observationRunning  = false;
    // Keep instruments the player chose; renderCarousel will revalidate
    resetStarView();
    renderTargetPanel();
    renderStarView();
    renderInstrumentCarousel();
    renderConstructionView();
    setButtonStates();
    updateInstructions(0);
    return;
  }

  G.selectedTarget      = target;
  G.observationComplete = false;
  G.observationRunning  = false;

  // Set secondary mirror automatically to match target requirement
  if (target.secondaryMirror) {
    G.secondaryMirror = target.secondaryMirror;
  }

  // Drop any currently-selected instruments that aren't on this target's allowed list
  const allowed = allowedForTarget(target);
  G.selectedInstruments = G.selectedInstruments.filter(id => allowed.includes(id));

  resetStarView();
  renderTargetPanel();
  renderLayout();
  renderStarView();
  if (typeof centerOnTarget === 'function') centerOnTarget(target.id);
  renderInstrumentCarousel();
  renderConstructionView();
  setButtonStates();

  // Give instrument hint based on first missing required instrument
  const firstMissing = target.instruments.find(id => !G.selectedInstruments.includes(id));
  if (firstMissing && target.hints[firstMissing]) {
    updateInstructions(-1, target.hints[firstMissing]);
  } else if (G.selectedInstruments.length > 0) {
    updateInstructions(2);
  } else {
    updateInstructions(1);
  }
}