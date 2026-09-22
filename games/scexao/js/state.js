/* ============================================================
   state.js — shared game state
   Instrument order: AO3K → SCExAO → Coronagraph → Lyot stop
   ============================================================ */
const G = {
  phase: 'attract',
  // 'attract' | 'target' | 'ao3k' | 'scexao' | 'coro' | 'lyot' | 'detect'
  stars: [], selectedIdx: -1,
  companions: {}, planetStarIdx: -1,
  // instrument applied flags
  ao3kApplied:  false,
  scexaoApplied: false,
  coroApplied:  false,
  lyotApplied:  false,
  // 0..1 animation strengths (drive what the render sees)
  ao3kStrength:   0,   // wavefront improvement after AO3K
  scexaoStrength: 0,   // additional improvement after SCExAO
  coroStrength:   0,   // coronagraph mask opacity
  lyotStrength:   0,   // Lyot ring suppression
  // combined wavefront noise level (1 = raw atm, 0 = perfect)
  wfNoise: 1.0,
};

let companionPos = null;   // {x, y, companion} set on star selection
let psf_dirty    = true;   // tells render.js to rebuild the IR pixel map

function resetInstruments() {
  G.ao3kApplied   = false; G.scexaoApplied = false;
  G.coroApplied   = false; G.lyotApplied   = false;
  G.ao3kStrength  = 0;     G.scexaoStrength = 0;
  G.coroStrength  = 0;     G.lyotStrength   = 0;
  G.wfNoise       = 1.0;
  companionPos    = null;
  psf_dirty       = true;
}

function easeOut(t) { return 1 - (1 - t) * (1 - t); }

function animateTo(key, target, duration, onDone) {
  const start = G[key], t0 = Date.now();
  (function step() {
    const t = Math.min(1, (Date.now() - t0) / duration);
    G[key] = start + (target - start) * easeOut(t);
    psf_dirty = true;
    if (t < 1) requestAnimationFrame(step);
    else { G[key] = target; if (onDone) onDone(); }
  })();
}