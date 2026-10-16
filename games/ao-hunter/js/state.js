/* ============================================================
   state.js — game state, localStorage progress, stage control
   ============================================================ */

const STORAGE_KEY = 'ao_hunter_progress';

const SCORE = {
  noCompanion: 10,
  discovery: { browndwarf: 300, planet: 500, disk: 300 },
  clarity: [ { min:1.0, pts:100 }, { min:0.7, pts:70 }, { min:0.5, pts:50 } ],  // highest first
};

const G = {
  stage: 1,
  demoMode: false,
  unlockedInstruments: [...STARTING_INSTRUMENTS],
  selectedInstruments: [],   // current pallet selection (ordered)
  successCount: 0,
  // current field
  fieldStars: [],            // generated + named stars placed this round
  selectedStar: null,        // star object player clicked
  starFieldExpanded: true,   // true when no star chosen yet
  observationRunning: false,
  observationComplete: false,
  score: 0,
  stats: { observations: 0, discoveries: 0, bestClarity: 0 },
  lastResult: null,
};

// ── PERSISTENCE ────────────────────────────────────────────
function saveProgress() {
  if (G.demoMode) return;   // never save demo mode
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      stage: G.stage,
      unlockedInstruments: G.unlockedInstruments,
      successCount: G.successCount,
      score: G.score,
      stats: G.stats,
    }));
  } catch(e) { /* localStorage may be unavailable */ }
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    G.stage = p.stage || 1;
    G.unlockedInstruments = p.unlockedInstruments || [...STARTING_INSTRUMENTS];
    G.successCount = p.successCount || 0;
    G.score = p.score || 0;                                                   // ← loadProgress の中
    G.stats = Object.assign({ observations:0, discoveries:0, bestClarity:0 }, p.stats);
  } catch(e) { /* ignore corrupt data */ }
}

function resetProgress() {
  try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
  G.stage = 1;
  G.unlockedInstruments = [...STARTING_INSTRUMENTS];
  G.successCount = 0;
  G.selectedInstruments = [];
  G.selectedStar = null;
  G.starFieldExpanded = true;
  G.observationComplete = false;
  G.score = 0;
  G.stats = { observations:0, discoveries:0, bestClarity:0 };
}

function activateDemoMode() {
  G.demoMode = true;
  G.stage = 2;
  G.unlockedInstruments = [...DEMO_INSTRUMENTS];
  G.selectedInstruments = [];
  G.selectedStar = null;
  G.starFieldExpanded = true;
  G.observationComplete = false;
}

// ── INSTRUMENT SELECTION ───────────────────────────────────
function toggleInstrument(id) {
  const instr = INSTRUMENTS[id];
  if (!instr) return;
  if (!G.unlockedInstruments.includes(id)) return;

  const idx = G.selectedInstruments.indexOf(id);
  if (idx !== -1) {
    // Deselect
    G.selectedInstruments.splice(idx, 1);
  } else {
    // Select — remove any existing selection from same group
    const group = instr.group;
    const groupMembers = INSTRUMENT_GROUPS[group] || [];
    G.selectedInstruments = G.selectedInstruments.filter(
      sel => !groupMembers.includes(sel)
    );
    G.selectedInstruments.push(id);
    // Re-sort to fixed pallet order
    G.selectedInstruments.sort(
      (a,b) => PALLET_ORDER.indexOf(a) - PALLET_ORDER.indexOf(b)
    );
  }
  renderInstrumentPallet();
  renderConstructionView();
  renderInstrumentCarousel();
  onInstrumentsChanged();
}

// ── UNLOCK NEXT INSTRUMENT ─────────────────────────────────
function unlockNextInstrument() {
  const nextId = UNLOCK_SEQUENCE[G.successCount - 1];
  if (!nextId) return null;
  if (!G.unlockedInstruments.includes(nextId)) {
    G.unlockedInstruments.push(nextId);
  }
  // Unlock Stage 2 when HSC is awarded
  if (nextId === 'hsc') G.stage = 2;
  saveProgress();
  return nextId;
}

// ── OBSERVATION SCORING ────────────────────────────────────
function evaluateObservation() {
  if (!G.selectedStar) return { success:false, clarity:0, message:'No star selected.' };
  const star = G.selectedStar;
  const sel  = G.selectedInstruments;

  const hasPrime = sel.some(id => INSTRUMENT_GROUPS['prime'].includes(id));        // hasWide を置き換え
  const hasAO    = sel.some(id => INSTRUMENT_GROUPS['ao'].includes(id));
  const hasCoro  = sel.some(id => INSTRUMENT_GROUPS['coronagraph'].includes(id));
  const hasSpec  = sel.some(id => INSTRUMENT_GROUPS['spectrograph'].includes(id));
  const hasCass  = sel.some(id => INSTRUMENT_GROUPS['cass'].includes(id));         // hasSurvey を置き換え
  const hasIFS   = sel.some(id => INSTRUMENT_GROUPS['ifs'].includes(id));
  const hasVis   = sel.some(id => INSTRUMENT_GROUPS['visible'].includes(id));

  // Blue star: near-zero planet/disk probability (unless it's a known Herbig Ae)
  const spectral = getSpectralEntry(star.colorIndex ?? star.bprp ?? 0);
  const isBlue   = spectral && spectral.type.includes('O/B');
  const isHerbig = star.blueStarPenalty === false;  // named override
  if (isBlue && !isHerbig) {
    return {
      success: false, clarity: 0.4,
      message: `${star.name || 'This star'} is a hot ${spectral.type}-type star. Hot blue stars rarely form planetary systems. Try a yellow, orange, or red star.`,
    };
  }

  // Minimum requirement: wide-field + AO + coronagraph
  if (!hasPrime) return { success:false, clarity:0.15, message:'Place an instrument at the Prime Focus (Suprime-Cam, HSC or FMOS).' };
  if (!hasAO)   return { success:false, clarity:0.30, message:'Add an adaptive optics system (AO36, AO188, or AO3K) to correct atmospheric blurring.' };
  if (!hasCoro) return { success:false, clarity:0.35, message:'Add a coronagraph (CIAO, HiCIAO, or SCExAO) to block the star\'s direct light.' };

  // Calculate clarity from selected instruments
  let clarity = 0;
  sel.forEach(id => { clarity += (INSTRUMENTS[id]?.blurReduction || 0); });
  clarity = Math.min(1.0, clarity);

  // Bonus clarity modifiers
  if (hasSpec)   clarity = Math.min(1.0, clarity + 0.05);
  if (hasCass)   clarity = Math.min(1.0, clarity + 0.05);
  if (hasIFS)    clarity = Math.min(1.0, clarity + 0.08);
  if (hasVis)    clarity = Math.min(1.0, clarity + 0.06);

  // Discovery
  const hasCompanion = star.companion || star.planetVisible;
  const discoveryMsg = !hasCompanion
    ? 'Clean image obtained — no companion detected around this star.'
    : clarity > 0.7
    ? (star.companion === 'disk'
        ? 'Wonderful imaging! A protoplanetary disk is visible around this star!'
        : 'Wonderful imaging! A companion has been directly imaged!')
    : 'Looks nicer! Improve your instrument combination for an even clearer image.';

  return {
    success: clarity > 0.6 && (hasCompanion ? true : true),
    clarity,
    message: discoveryMsg,
    discovered: hasCompanion && clarity > 0.6,
  };
}

function getSpectralEntry(bprp) {
  return STAR_COLOR_TABLE.find(e => bprp >= e.bprMin && bprp < e.bprMax)
      || STAR_COLOR_TABLE[STAR_COLOR_TABLE.length - 1];
}

function addScore(pts) {
  if (!pts) return;
  G.score += pts;
  saveProgress();
  updateScoreboard(pts);
}

// Called once per Observe, after evaluateObservation()
function recordObservation(result) {
  G.stats.observations++;
  G.stats.bestClarity = Math.max(G.stats.bestClarity, result.clarity);
  G.lastResult = result;
  const tier = SCORE.clarity.find(t => result.clarity >= t.min - 0.001);
  addScore(tier ? tier.pts : 0);
}

// Called when the player clicks the companion
function recordDiscovery(star) {
  G.stats.discoveries++;
  const pts = SCORE.discovery[star.companion] ?? SCORE.discovery.disk;
  addScore(pts);
  return pts;
}

// Called when the player clicks "No exoplanet visible"
function recordNoCompanion() {
  const star = G.selectedStar;
  const hasComp = star && (star.companion || star.planetVisible);
  const pts = (G.lastResult && G.lastResult.success && !hasComp) ? SCORE.noCompanion : 0;
  addScore(pts);
  return pts;
}