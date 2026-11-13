/* ============================================================
   state.js — Universe Hunting game state (session only)
   ============================================================ */

const G = {
  selectedTarget:      null,   // TARGETS entry the player chose
  selectedCategory:    null,   // category id currently expanded
  selectedInstruments: [],     // instrument ids currently in pallet (ordered)
  secondaryMirror:     'large',// 'prime' | 'large' | 'small'
                               //   prime = no secondary mirror (prime-focus camera at top)
                               //   large = optical secondary mirror
                               //   small = IR secondary mirror
  observationRunning:  false,
  observationComplete: false,
  revealedTargets:     [],     // ids of successfully observed targets (this session)
  score:               0,
};

// ── INSTRUMENT MUTEX GROUPS ────────────────────────────────
// Only one instrument from each group can be installed at a time.
const INSTRUMENT_GROUPS = {
  prime: ['suprime-cam', 'hsc', 'fmos' /*, 'pfs' */],  // primary-focus cameras — only one fits
  ao:    ['ao36', 'ao188', 'ao3k'],              // AO generations — newer supersedes older
  coro:  ['ciao', 'hiciao'],                     // coronagraphs — one at a time
};

function _groupOf(id) {
  for (const key in INSTRUMENT_GROUPS) {
    if (INSTRUMENT_GROUPS[key].includes(id)) return INSTRUMENT_GROUPS[key];
  }
  return null;
}

// ── TARGET-DRIVEN INSTRUMENT AVAILABILITY ──────────────────
// For a target, the allowed instruments are its REQUIRED set plus any
// member of the same mutex group (so the player can swap AO versions,
// coronagraph versions, or primary-focus cameras).
function allowedForTarget(target) {
  if (!target) return Object.keys(UH_INSTRUMENTS);  // no target → everything is on offer
  const allowed = new Set(target.instruments || []);
  (target.instruments || []).forEach(id => {
    const g = _groupOf(id);
    if (g) g.forEach(m => allowed.add(m));
  });
  return Array.from(allowed);
}

// ── INSTRUMENT SELECTION ───────────────────────────────────
// Returns error string if incompatible, null if ok
function canSelectInstrument(id) {
  const instr = UH_INSTRUMENTS[id];
  if (!instr) return 'Unknown instrument.';

  // Target-availability filter — the strongest restriction
  if (G.selectedTarget) {
    const allowed = allowedForTarget(G.selectedTarget);
    if (!allowed.includes(id)) {
      return `${instr.name} isn't used for this target. Choose from the compatible instruments.`;
    }
  }

  // Primary-focus = whole-telescope exclusivity
  // When a primary camera is installed, the secondary mirror is REMOVED,
  // so no other focal station is available. Only one primary at a time.
  const isPrimary        = INSTRUMENT_GROUPS.prime.includes(id);
  const hasOtherPrimary  = G.selectedInstruments.some(i => INSTRUMENT_GROUPS.prime.includes(i) && i !== id);
  const hasNonPrimary    = G.selectedInstruments.some(i => !INSTRUMENT_GROUPS.prime.includes(i));
  if (isPrimary && hasOtherPrimary)
    return `Only one primary-focus camera can sit at the top of the tube.`;
  if (isPrimary && hasNonPrimary)
    return `${instr.name} occupies the prime focus — remove other instruments first.`;
  if (!isPrimary && hasOtherPrimary)
    return `A primary-focus camera is installed — remove it to add other instruments.`;

  // AO / coronagraph mutex
  if (INSTRUMENT_GROUPS.ao.includes(id)
      && G.selectedInstruments.some(i => INSTRUMENT_GROUPS.ao.includes(i) && i !== id)) {
    return `Only one adaptive optics system at a time (AO36 → AO188 → AO3K are generations of the same system).`;
  }
  if (INSTRUMENT_GROUPS.coro.includes(id)
      && G.selectedInstruments.some(i => INSTRUMENT_GROUPS.coro.includes(i) && i !== id)) {
    return `Only one coronagraph at a time (HiCIAO is the successor to CIAO).`;
  }

  // Secondary-mirror check — three states: 'prime', 'large', 'small'.
  // Prime-focus cameras require the 'prime' state (no secondary mirror).
  // Optical Cass/Nasmyth instruments require 'large'.
  // IR Cass/Nasmyth instruments require 'small'.
  const needsPrime = isPrimary;
  const needsSmall = SMALL_SECONDARY_INSTRUMENTS.includes(id);
  const needsLarge = LARGE_SECONDARY_INSTRUMENTS.includes(id);
  if (needsPrime && G.secondaryMirror !== 'prime')
    return `${instr.name} sits at the prime focus — switch the mirror selector to Prime Focus first.`;
  if (needsSmall && G.secondaryMirror !== 'small')
    return `${instr.name} needs the small IR secondary mirror — switch the mirror selector to Small (IR).`;
  if (needsLarge && G.secondaryMirror !== 'large')
    return `${instr.name} needs the large optical secondary mirror — switch the mirror selector to Large (Optical).`;

  return null;
}

function toggleInstrument(id) {
  const idx = G.selectedInstruments.indexOf(id);
  if (idx >= 0) {
    G.selectedInstruments.splice(idx, 1);
    return null;
  }
  const err = canSelectInstrument(id);
  if (err) return err;
  G.selectedInstruments.push(id);
  return null;
}

// ── OBSERVATION EVALUATION ────────────────────────────────
function evaluateObservation() {
  if (!G.selectedTarget) return { clarity:0, success:false, message:'No target selected.' };

  const required = G.selectedTarget.instruments;
  const chosen   = G.selectedInstruments;

  const matched = required.filter(id => chosen.includes(id));
  const missing = required.filter(id => !chosen.includes(id));
  const extra   = chosen.filter(id => !required.includes(id));

  // Count a swap (e.g. AO188 → AO3K) as a near-match, not a miss
  const swappedIn = missing.filter(reqId => {
    const g = _groupOf(reqId);
    return g && chosen.some(c => g.includes(c));
  });
  const trulyMissing = missing.filter(m => !swappedIn.includes(m));

  const perfect = trulyMissing.length === 0 && swappedIn.length === 0 && extra.length === 0;
  const good    = trulyMissing.length === 0;      // all requirements covered, possibly via swap or with extras
  const partial = matched.length > 0;

  let clarity, message;
  if (perfect) {
    clarity = 1.0;
    message = 'Perfect observation! The real Subaru image is unlocked.';
  } else if (good) {
    // Swapped instruments pay a small clarity cost (older AO is less sharp, etc.)
    const swapCost  = swappedIn.length * 0.10;
    const extraCost = extra.length * 0.03;
    clarity = Math.max(0.60, 0.95 - swapCost - extraCost);
    message = swappedIn.length > 0
      ? `Great — ${swappedIn.length === 1 ? 'a close substitute was' : 'close substitutes were'} used instead of the planned instrument.`
      : 'Great — all required instruments chosen. Extras scatter a bit of light.';
  } else if (partial) {
    clarity = 0.30 + 0.30 * (matched.length / required.length);
    message = `Partially correct — ${trulyMissing.map(id => UH_INSTRUMENTS[id]?.name || id).join(', ')} still needed.`;
  } else {
    clarity = 0.10;
    message = 'Wrong instrument combination — check what this kind of target needs.';
  }

  return {
    clarity, perfect, good, partial,
    success: clarity >= 0.50,
    matched, missing: trulyMissing, extra, message,
  };
}