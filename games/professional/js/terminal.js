/* ============================================================
   terminal.js — shell-style terminal with history
   ============================================================ */
let termHistory  = [];  // [{type:'input'|'output'|'error'|'success', text}]
let cmdHistory   = [];  // past typed commands for ↑↓ navigation
let cmdHistIdx   = -1;

function termPrint(text, type = 'output') {
  termHistory.push({ type, text });
  renderTerminal();
}
function termSuccess(text) { termPrint(text, 'success'); }
function termError(text)   { termPrint(text, 'error'); }
function termInput(text)   { termHistory.push({ type:'input', text: `subaru> ${text}` }); renderTerminal(); }
function termSystem(text)  { termPrint(text, 'system'); }

function renderTerminal() {
  const out = document.getElementById('term-output');
  if (!out) return;
  out.innerHTML = termHistory.map(e => {
    const cls = {
      input:'term-in', output:'term-out',
      error:'term-err', success:'term-ok', system:'term-sys'
    }[e.type] || 'term-out';
    return `<div class="${cls}">${escHtml(e.text)}</div>`;
  }).join('');
  out.scrollTop = out.scrollHeight;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function handleTermInput(raw) {
  const cmd = raw.trim().toLowerCase();
  if (!cmd) return;
  cmdHistory.unshift(cmd);
  cmdHistIdx = -1;
  termInput(cmd);
  processCommand(cmd);
}

// keyboard handling
function initTerminal() {
  const inp = document.getElementById('term-input');
  if (!inp) return;
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      handleTermInput(inp.value);
      inp.value = '';
    } else if (e.key === 'ArrowUp') {
      cmdHistIdx = Math.min(cmdHistIdx + 1, cmdHistory.length - 1);
      if (cmdHistory[cmdHistIdx]) inp.value = cmdHistory[cmdHistIdx];
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      cmdHistIdx = Math.max(cmdHistIdx - 1, -1);
      inp.value = cmdHistIdx >= 0 ? cmdHistory[cmdHistIdx] : '';
      e.preventDefault();
    }
  });
  termSystem('Subaru Observatory Professional Simulator — v1.0');
  termSystem('Type commands below. Use ↑/↓ to navigate history.');
  termSystem('────────────────────────────────────────────────');
  termSystem('Start: open the telescope enclosure with:');
  termPrint('  subaru-telescope-open');
}

/* ── Command processor ── */
function processCommand(cmd) {
  if (G.gameOver) {
    termError('System offline. Reload to restart.');
    return;
  }

  G.stepOrder.push(cmd);

  // ── CLOSE / RESET ──
  if (cmd === 'subaru-telescope-close') {
    termSuccess('Closing all operations. Resetting system.');
    triggerReset();
    return;
  }

  // ── OPEN ENCLOSURE ──
  if (cmd === 'subaru-telescope-open') {
    if (G.enclosureOpen) { termError('Enclosure already open.'); return; }
    if (G.humidity >= HUMIDITY_CONFIG.dangerThreshold) {
      triggerGameOver('humidity-open');
      return;
    }
    G.enclosureOpen = true;
    G.phase = 'open';
    animateEnclosure(true);
    termSuccess('Enclosure opening… Cylindrical dome rotating.');
    termSuccess('Sky access confirmed. Telescope ready to slew.');
    startHumidityMonitor();
    return;
  }

  // ── REQUIRE OPEN before anything else ──
  if (!G.enclosureOpen) {
    termError('ERROR: Enclosure is closed. Open it first with: subaru-telescope-open');
    termPrint('  Next step: subaru-telescope-open');
    return;
  }

  // ── TARGET A STAR ──
  if (cmd.startsWith('subaru-telescope-target-')) {
    const starCmd = cmd.replace('subaru-telescope-target-', '');
    const star = STARS.find(s => s.cmd === starCmd);
    if (!star) {
      termError(`Unknown target: ${starCmd}`);
      termPrint('Available targets: ' + STARS.map(s => s.cmd).join(', '));
      return;
    }
    if (G.targetStar && G.adaptiveLoopClosed) {
      termError('Adaptive optics loop is closed. Run subaru-telescope-close to reset.');
      return;
    }
    G.targetStar = star;
    G.centered = false;
    G.phase = 'targeting';
    animateTelescope(star);
    termSuccess(`Slewing to ${star.display}…`);
    setTimeout(() => {
      termSuccess(`Target acquired: ${star.display}`);
      termPrint(`  ${star.desc}`);
      termPrint('  Next: subaru-telescope-center-target  (or skip to close-adaptive-opetics-loop)');
    }, 1800);
    return;
  }

  // ── CENTER TARGET ──
  if (cmd === 'subaru-telescope-center-target') {
    if (!G.targetStar) { termError('No target selected. Use subaru-telescope-target-[name] first.'); return; }
    if (G.adaptiveLoopClosed) { termError('Loop already closed. Cannot re-center.'); return; }
    G.centered = true;
    addScore('centerTarget', 'Precise centering');
    termSuccess('Fine centering complete. Target locked on optical axis.');
    termPrint('  Next: close-adaptive-opetics-loop');
    updateTelescopeView();
    return;
  }

  // ── CAMERA NDR ──
  if (cmd === 'subaru-telescope-camera-ndr') {
    G.cameraNDR = true;
    termSuccess('Camera NDR mode enabled — increased light sensitivity.');
    updateMiddlePanel();
    return;
  }

  // ── CLOSE ADAPTIVE LOOP ──
  if (cmd === 'close-adaptive-opetics-loop') {
    if (!G.targetStar) { termError('No target selected. Point telescope first.'); return; }
    if (G.adaptiveLoopClosed) { termError('Loop already closed.'); return; }
    G.adaptiveLoopClosed = true;
    G.phase = 'loop-closed';
    termSuccess('Adaptive optics control loop closed.');
    termSuccess('DM accepting wavefront sensor corrections.');
    termPrint('  Active tab: ao3k — Run: ao3k-perform');
    highlightTab('ao3k');
    updateMiddlePanel();
    return;
  }

  // ── AO3K ──
  if (cmd === 'ao3k-perform') {
    if (!G.adaptiveLoopClosed) {
      termError('ERROR: Adaptive loop not closed. Run: close-adaptive-opetics-loop');
      return;
    }
    if (G.ao3kDone) { termError('AO3K already performed.'); return; }
    G.ao3kDone = true;
    addScore('ao3kPerformed', 'AO3K correction');
    termSuccess('AO3K performing — 188-actuator correction applied.');
    termSuccess('Wavefront error reduced to ~180 nm rms. PALILA camera updated.');
    termPrint('  Next tab: scexao — Run: scexao-pyramid-wave-front-sensor-on (optional bonus)');
    termPrint('            then: scexao-perform-dm');
    updateMiddlePanel();
    highlightTab('scexao');
    return;
  }

  // ── SCEXAO PYRAMID WFS (hidden bonus) ──
  if (cmd === 'scexao-pyramid-wave-front-sensor-on') {
    if (!G.adaptiveLoopClosed) {
      termError('ERROR: Close adaptive loop first.');
      return;
    }
    if (G.pyramidWFSOn) { termError('Pyramid WFS already on.'); return; }
    G.pyramidWFSOn = true;
    addScore('pyramidWFSOn', 'Pyramid WFS activated (bonus)');
    termSuccess('Pyramid wavefront sensor ON — reading turbulence residuals.');
    termSuccess('Extra correction data feeding DM. (+25 pts hidden bonus)');
    updateMiddlePanel();
    return;
  }

  // ── SCEXAO DM ──
  if (cmd === 'scexao-perform-dm') {
    if (!G.adaptiveLoopClosed) { termError('Close adaptive loop first.'); return; }
    if (!G.ao3kDone) {
      termError('WARNING: AO3K not performed. Proceeding without it — image quality reduced.');
    }
    if (G.scexaoDMDone) { termError('SCExAO DM already applied.'); return; }
    G.scexaoDMDone = true;
    termSuccess('SCExAO deformable mirror correction applied.');
    termSuccess('Wavefront error reduced to ~30 nm rms. PALILA image sharper.');
    termPrint('  Next: scexao-perform-coronagraph and scexao-perform-lyot (order flexible)');
    updateMiddlePanel();
    return;
  }

  // ── SCEXAO CORONAGRAPH ──
  if (cmd === 'scexao-perform-coronagraph') {
    if (!G.scexaoDMDone && !cmd.includes('auto')) {
      termError('ERROR: Run scexao-perform-dm before coronagraph.');
      return;
    }
    if (G.scexaoCoroDone) { termError('Coronagraph already applied.'); return; }
    G.scexaoCoroDone = true;
    termSuccess('PIAA coronagraph mask inserted. Stellar PSF core suppressed.');
    updateMiddlePanel();
    checkScexaoComplete();
    return;
  }

  // ── SCEXAO LYOT ──
  if (cmd === 'scexao-perform-lyot') {
    if (!G.scexaoDMDone) {
      termError('ERROR: Run scexao-perform-dm before Lyot stop.');
      return;
    }
    if (G.scexaoLyotDone) { termError('Lyot stop already inserted.'); return; }
    G.scexaoLyotDone = true;
    termSuccess('Lyot stop inserted. Diffracted halo suppressed.');
    updateMiddlePanel();
    checkScexaoComplete();
    return;
  }

  // ── SCEXAO AUTO COMPLETE ──
  if (cmd === 'scexao-auto-complete-perform') {
    if (!G.adaptiveLoopClosed) { termError('Close adaptive loop first.'); return; }
    G.scexaoDMDone = true; G.scexaoCoroDone = true; G.scexaoLyotDone = true;
    termSuccess('SCExAO auto-complete: DM + coronagraph + Lyot applied.');
    termPrint('  (Manual steps skipped — no score bonus for individual steps)');
    updateMiddlePanel();
    checkScexaoComplete();
    return;
  }

  // ── CHARIS PRISM ──
  if (cmd === 'charis-prism-disperse') {
    if (!G.scexaoCoroDone || !G.scexaoLyotDone) {
      termError('ERROR: Complete SCExAO (coronagraph + Lyot) before CHARIS.');
      return;
    }
    if (G.charisPrismDone) { termError('CHARIS prism already dispersed.'); return; }
    G.charisPrismDone = true;
    termSuccess('CHARIS prism dispersing — separating J+H+K spectra (1.15–2.37 µm).');
    termPrint('  Next: charis-reconstruct-raw-image');
    updateCHARIS();
    return;
  }

  // ── CHARIS RECONSTRUCT ──
  if (cmd === 'charis-reconstruct-raw-image') {
    if (!G.charisPrismDone) {
      termError('ERROR: Run charis-prism-disperse first.');
      return;
    }
    if (G.charisReconDone) { termError('Already reconstructed.'); return; }
    G.charisReconDone = true;
    addScore('charisReconstructed', 'CHARIS data cube reconstructed');
    termSuccess('CHARIS data cube reconstructed. Companion spectrum extracted.');
    checkCompletion();
    updateCHARIS();
    return;
  }

  // ── VAMPIRE ──
  if (cmd === 'vampire-split-polarization') {
    G.vampireSplit = true; G.vampireHAlpha = true; G.vampireContinuum = true;
    addScore('vampireSplitPolarization', 'VAMPIRES split polarization');
    termSuccess('VAMPIRES: polarization split across VCAM1 (Hα) and VCAM2 (continuum).');
    updateVAMPIRE(); return;
  }
  if (cmd === 'vampire-h-alpha') {
    G.vampireHAlpha = true;
    termSuccess('VAMPIRES: Hα channel activated on VCAM1.');
    updateVAMPIRE(); return;
  }
  if (cmd === 'vampire-continuum') {
    G.vampireContinuum = true;
    termSuccess('VAMPIRES: continuum channel activated on VCAM2.');
    updateVAMPIRE(); return;
  }

  // ── UNKNOWN ──
  termError(`Unknown command: ${cmd}`);
  termPrint('  Hint — telescope commands: subaru-telescope-open | subaru-telescope-target-[name]');
  termPrint('         subaru-telescope-center-target | subaru-telescope-camera-ndr');
  termPrint('         close-adaptive-opetics-loop | subaru-telescope-close');
  termPrint('  AO3K: ao3k-perform');
  termPrint('  SCExAO: scexao-pyramid-wave-front-sensor-on | scexao-perform-dm');
  termPrint('          scexao-perform-coronagraph | scexao-perform-lyot | scexao-auto-complete-perform');
  termPrint('  CHARIS: charis-prism-disperse | charis-reconstruct-raw-image');
  termPrint('  VAMPIRES: vampire-split-polarization | vampire-h-alpha | vampire-continuum');
}

function checkScexaoComplete() {
  if (G.scexaoCoroDone && G.scexaoLyotDone) {
    if (G.ao3kDone) addScore('scexaoManualFull', 'SCExAO manual steps completed');
    termSuccess('SCExAO imaging ready. Proceed to CHARIS or VAMPIRES.');
    termPrint('  charis-prism-disperse  →  charis-reconstruct-raw-image');
    highlightTab('charis');
  }
}

function checkCompletion() {
  if (G.charisReconDone) {
    // check for perfect run
    const perfect = G.centered && G.ao3kDone && G.pyramidWFSOn &&
      G.scexaoDMDone && G.scexaoCoroDone && G.scexaoLyotDone && G.charisReconDone;
    if (perfect) addScore('perfectRun', 'Perfect observation run');
    setTimeout(() => showFinalResult(perfect), 800);
  }
}