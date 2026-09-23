/* ============================================================
   state.js — master game state
   ============================================================ */
const G = {
  // ── Observatory state ──
  enclosureOpen:   false,
  enclosureAngle:  0,      // 0=closed 1=fully open
  telesAzimuth:    180,    // degrees
  telesElevation:  45,
  targetStar:      null,   // STARS entry
  centered:        false,
  // ── Instrument state ──
  adaptiveLoopClosed: false,
  ao3kDone:        false,
  pyramidWFSOn:    false,
  scexaoDMDone:    false,
  scexaoCoroDone:  false,
  scexaoLyotDone:  false,
  charisPrismDone: false,
  charisReconDone: false,
  vampireSplit:    false,
  vampireHAlpha:   false,
  vampireContinuum:false,
  cameraNDR:       false,
  // ── Environment ──
  humidity:        45,
  temperature:     3,
  humiditySpike:   false,
  humidityTimer:   null,
  gameOver:        false,
  // ── Score ──
  score:           0,
  scoreLog:        [],
  // ── Step order tracking ──
  stepOrder: [],           // records commands in sequence
  // ── Phase ──
  phase: 'idle',
  // 'idle'|'open'|'targeting'|'centered'|'loop-closed'|'observing'|'complete'
};

function addScore(key, label) {
  const pts = SCORING[key] || 0;
  if (pts === 0) return;
  G.score += pts;
  G.scoreLog.push({ label, pts, total: G.score });
  updateScoreDisplay();
}

function updateScoreDisplay() {
  const el = document.getElementById('score-value');
  if (el) el.textContent = G.score;
}

function resetGame() {
  G.enclosureOpen = false; G.enclosureAngle = 0;
  G.telesAzimuth = 180;    G.telesElevation = 45;
  G.targetStar = null;     G.centered = false;
  G.adaptiveLoopClosed = false; G.ao3kDone = false;
  G.pyramidWFSOn = false;  G.scexaoDMDone = false;
  G.scexaoCoroDone = false; G.scexaoLyotDone = false;
  G.charisPrismDone = false; G.charisReconDone = false;
  G.vampireSplit = false;  G.vampireHAlpha = false;
  G.vampireContinuum = false; G.cameraNDR = false;
  G.gameOver = false;
  G.score = 0; G.scoreLog = [];
  G.stepOrder = [];
  G.phase = 'idle';
  if (G.humidityTimer) clearTimeout(G.humidityTimer);
  G.humiditySpike = false;
  updateScoreDisplay();
}