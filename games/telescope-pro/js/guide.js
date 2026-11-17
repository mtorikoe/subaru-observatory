/* ============================================================
   guide.js — step-by-step guide to Universe Hunting

   Opened with the "Guide" button in the header. Two parts:

   1. GUIDE_STEPS — a short tour. Each step puts a spotlight on one
      part of the screen and explains it in a sentence or two
      (written for elementary / middle-school players).

   2. PRACTICE_STEPS — offered at the end of the tour: the player
      really plays one observation, of the Andromeda Galaxy, with
      the guide pointing at what to press next. The guide moves on
      by itself when the player has done each thing.

   To change wording or order, edit the two lists below.
   A step can have:
     title   : heading of the card
     text    : explanation (HTML allowed) — keep it short
     target  : what to spotlight — a CSS selector, or a function
               returning the element (omit for a card in the middle)
     prepare : function run before the step is shown, to bring that
               part on screen (open the target menu on a phone,
               unfold the telescope, switch tab …)
     done    : practice only — function returning true once the
               player has done the step; the guide then moves on.
               While waiting, the player can click inside the
               spotlight (and only there).
     hidden  : practice only — the guide steps out of the way while
               waiting (used during the mini game)
     back    : practice only — function returning true if the player
               undid the previous step (e.g. quit the mini game)
   ============================================================ */

const GUIDE_STEPS = [
  {
    title: 'How to play',
    text: `Tonight you are an astronomer at the Subaru Telescope!
      <ol>
        <li>Pick a <b>target</b> in the sky.</li>
        <li>Choose the right <b>instruments</b>.</li>
        <li>Press <b>Observe</b> and win the <b>mini games</b>.</li>
        <li>Get <b>points</b> and a real space photo!</li>
      </ol>`,
  },
  {
    title: 'Star field',
    target: '.uh-starfield-area',
    text: `This is the night sky. <b>Drag</b> to look around and <b>scroll</b> to zoom. Click a marked spot to choose it.`,
  },
  {
    title: 'Target object',
    target: '#target-panel',
    prepare: g => g.targetMenu(true),
    text: `All the things you can look at: galaxies, planets and more. Open a group and pick one. A ✓ means you already found it.`,
  },
  {
    title: 'Mirror',
    target: '.tp-mirror-row',
    prepare: g => g.targetMenu(true),
    text: `The telescope uses a different mirror for different jobs. Don't worry — when you pick a target, the right mirror is chosen for you.`,
  },
  {
    title: 'Instruments',
    target: '.carousel-wrap',
    prepare: g => { g.targetMenu(false); g.tab('instruments'); },
    text: `These are the telescope's cameras and tools. Click a card to add it. Click it again to take it off.`,
  },
  {
    title: 'Assembled telescope',
    target: '.construction-wrap',
    prepare: g => { g.targetMenu(false); g.tab('instruments'); g.telescope(true); },
    text: `This picture shows where your instruments sit on the telescope: on top, on the sides or underneath.`,
  },
  {
    title: 'Mini games',
    target: '#observe-btn',
    prepare: g => { g.targetMenu(false); g.tab('instruments'); },
    text: `Ready? Press <b>Observe</b>. You get one mini game for each instrument. Win them all to take the photo!`,
  },
  {
    title: 'Collection',
    target: '.uh-tab[data-tab="collection"]',
    prepare: g => { g.targetMenu(false); g.tab('collection'); },
    text: `Every photo you take is saved in <b>My Collection</b>. Can you fill it up?`,
  },
  {
    title: 'Points',
    target: '#score-display',
    prepare: g => { g.targetMenu(false); g.tab('instruments'); },
    text: `The better your choice of instruments, the more points: up to <b>100</b> for each new object.
      <br><br>Want to try one together? Let's find the <b>Andromeda Galaxy</b>!`,
  },
];

// ── Practice: one real observation of the Andromeda Galaxy ──
const _byText = (selector, text) => () =>
  [...document.querySelectorAll(selector)].find(e => e.textContent.includes(text)) || null;
const _andromedaChosen = () => !!(G.selectedTarget && G.selectedTarget.id === 'andromeda');
const _practiceState = { sawResult: false };   // shared flag for the "hidden" observe step

const PRACTICE_STEPS = [
  {
    title: 'Open the galaxies',
    target: _byText('.tp-category', 'Galaxy'),
    prepare: g => g.targetMenu(true),
    done: () => G.selectedCategory === 'galaxy' || _andromedaChosen(),
    text: `Andromeda is a galaxy. Click <b>Galaxy</b> to open the list.`,
  },
  {
    title: 'Pick Andromeda',
    target: _byText('.tp-target', 'Andromeda'),
    prepare: g => { g.targetMenu(true); g.openCategory('galaxy'); },
    done: _andromedaChosen,
    text: `Click <b>Andromeda Galaxy</b>. Watch the sky turn to it!`,
  },
  {
    title: 'Add the camera',
    target: '#ic-hsc',
    prepare: g => { g.targetMenu(false); g.tab('instruments'); },
    done: () => G.selectedInstruments.includes('hsc'),
    text: `Andromeda is huge, so it needs a very wide camera. Click <b>Hyper Suprime-Cam</b>.`,
  },
  {
    title: 'Look at the telescope',
    target: '.construction-wrap',
    prepare: g => { g.tab('instruments'); g.telescope(true); },
    text: `See it? The camera now sits at the very <b>top</b> of the telescope.`,
  },
  {
    title: 'Observe!',
    target: '#observe-btn',
    prepare: g => g.tab('instruments'),
    done: () => G.observationRunning || !!document.getElementById('mg-overlay'),
    text: `Everything is ready. Press <b>Observe</b>. A mini game will open — win it, read the note, then press <b>Finish</b>.`,
  },
  {
    // The mini game and the result window are on screen: stay out of the way.
    // Note: closing the result window resets G.observationComplete back to
    // false, so we can't wait on that flag. Instead we remember that the result
    // window appeared, then advance once it (and the mini game) are gone.
    hidden: true,
    prepare: () => { _practiceState.sawResult = false; },
    done: () => {
      if (G.observationRunning || document.getElementById('mg-overlay')) return false;
      if (document.querySelector('.reward-overlay')) { _practiceState.sawResult = true; return false; }  // result window still open
      return _practiceState.sawResult || G.revealedTargets.includes('andromeda');
    },
    // Went back only if the player quit the mini game before any result appeared
    back: () => !_practiceState.sawResult && !G.observationRunning && !G.observationComplete
                && !document.getElementById('mg-overlay') && !G.revealedTargets.includes('andromeda'),
  },
  {
    title: 'You did it!',
    prepare: g => g.tab('collection'),
    target: '#collection-panel',
    text: `You photographed the <b>Andromeda Galaxy</b>! It is now in your collection. Now choose any target you like — good luck, astronomer!`,
  },
];

const UHGuide = (function () {
  let steps = GUIDE_STEPS, mode = 'tour', idx = -1, els = null, saved = null, timer = null;

  // Small helpers the steps use to bring a part of the screen into view
  const helpers = {
    targetMenu(open) {                       // only matters on a phone, where the list is a slide-in menu
      if (typeof setTargetMenu === 'function' && typeof UH_PHONE !== 'undefined' && UH_PHONE.matches) setTargetMenu(open);
    },
    tab(name)        { if (typeof switchTab === 'function') switchTab(name); },
    telescope(shown) { if (typeof setTelescopePanel === 'function') setTelescopePanel(!shown, false); },
    openCategory(id) {                       // make sure a target group is expanded (not toggled)
      try {
        if (typeof G !== 'undefined' && G.selectedCategory !== id && typeof toggleCategory === 'function') toggleCategory(id);
      } catch (e) {}
    },
  };

  function build() {
    const wrap = document.createElement('div');
    wrap.id = 'uh-guide';
    wrap.innerHTML = `
      <div class="guide-blocker"></div>
      <div class="guide-spot"></div>
      <div class="guide-card" role="dialog" aria-labelledby="guide-title">
        <div class="guide-step" id="guide-count"></div>
        <div class="guide-title" id="guide-title"></div>
        <div class="guide-text" id="guide-text"></div>
        <div class="guide-btns">
          <button type="button" class="guide-btn" id="guide-skip">Close</button>
          <span style="flex:1"></span>
          <button type="button" class="guide-btn" id="guide-back">Back</button>
          <button type="button" class="guide-btn primary" id="guide-next">Next</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    els = {
      wrap, blocker: wrap.querySelector('.guide-blocker'), spot: wrap.querySelector('.guide-spot'), card: wrap.querySelector('.guide-card'),
      count: wrap.querySelector('#guide-count'), title: wrap.querySelector('#guide-title'), text: wrap.querySelector('#guide-text'),
      back: wrap.querySelector('#guide-back'), next: wrap.querySelector('#guide-next'),
    };
    wrap.querySelector('#guide-skip').onclick = close;
    els.back.onclick = () => show(idx - 1);
    els.next.onclick = onNext;
  }

  function onNext() {
    if (idx + 1 < steps.length) show(idx + 1);
    else if (mode === 'tour') startPractice();
    else close();
  }

  const elementOf = step => !step.target ? null : typeof step.target === 'function' ? step.target() : document.querySelector(step.target);

  // Put the spotlight on the step's part and the card next to it
  function place() {
    if (!els || idx < 0) return;
    const step = steps[idx];
    if (step.hidden) return;
    const vw = window.innerWidth, vh = window.innerHeight, GAP = 12;
    const el = elementOf(step);
    const r  = el ? el.getBoundingClientRect() : null;
    const visible = r && r.width > 2 && r.height > 2 && r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;

    const card = els.card;
    const cw = card.offsetWidth, ch = card.offsetHeight;
    let x, y;

    // On an interactive practice step (one the player must do, so it has no Next
    // button) the blocker stops intercepting clicks, so the real game control is
    // reachable. On every other step the blocker blocks and the player uses Next.
    els.blocker.style.pointerEvents = step.done ? 'none' : 'auto';

    if (!visible) {
      els.spot.style.display = 'none';
      els.wrap.classList.add('no-spot');
      x = (vw - cw) / 2; y = (vh - ch) / 2;
    } else {
      els.wrap.classList.remove('no-spot');
      const pad = 4;
      const sx = Math.max(2, r.left - pad), sy = Math.max(2, r.top - pad);
      const sw = Math.min(vw - 2, r.right + pad) - sx, sh = Math.min(vh - 2, r.bottom + pad) - sy;
      Object.assign(els.spot.style, { display: 'block', left: sx + 'px', top: sy + 'px', width: sw + 'px', height: sh + 'px' });

      const cx = sx + sw / 2 - cw / 2, cy = sy + sh / 2 - ch / 2;
      if (vh - (sy + sh) >= ch + GAP)      { x = cx; y = sy + sh + GAP; }       // below
      else if (sy >= ch + GAP)             { x = cx; y = sy - ch - GAP; }       // above
      else if (vw - (sx + sw) >= cw + GAP) { x = sx + sw + GAP; y = cy; }       // to the right
      else if (sx >= cw + GAP)             { x = sx - cw - GAP; y = cy; }       // to the left
      else                                 { x = cx; y = sy + sh - ch - GAP; }  // inside, along its lower edge
    }
    card.style.left = Math.max(8, Math.min(vw - cw - 8, x)) + 'px';
    card.style.top  = Math.max(8, Math.min(vh - ch - 8, y)) + 'px';
  }

  function show(i) {
    if (!els || i < 0 || i >= steps.length) return;
    idx = i;
    const step = steps[i];
    try { if (step.prepare) step.prepare(helpers); } catch (e) {}

    els.wrap.style.display = step.hidden ? 'none' : '';
    if (!step.hidden) {
      const shown = steps.filter(s => !s.hidden), n = shown.indexOf(step) + 1;
      els.count.textContent = `${mode === 'tour' ? 'Guide' : 'Practice'} · ${n} of ${shown.length}`;
      els.title.textContent = step.title;
      els.text.innerHTML    = step.text;
      const lastStep = i + 1 >= steps.length;
      // Practice steps the player must do themselves have no Next button
      els.next.style.display    = step.done ? 'none' : '';
      els.next.textContent      = !lastStep ? 'Next' : mode === 'tour' ? 'Try it with Andromeda' : 'Finish';
      els.back.style.display    = mode === 'tour' ? '' : 'none';
      els.back.style.visibility = i === 0 ? 'hidden' : 'visible';
      place();
      setTimeout(place, 300);          // again once menus / panels have finished moving
      if (!step.done) els.next.focus();
    }
  }

  // Practice: watch what the player does and move on when a step is done
  function watch() {
    if (!els || mode !== 'practice' || idx < 0) return;
    const step = steps[idx];
    try {
      if (step.back && step.back())      { show(idx - 1); return; }
      if (step.done && step.done())      { show(idx + 1); return; }
    } catch (e) {}
    place();                            // lists are redrawn as the player clicks; keep the spotlight on the right row
  }

  function startPractice() {
    if (typeof G === 'undefined' || G.observationRunning) { close(); return; }
    // Start from a clean table: nothing selected
    try {
      if (G.selectedTarget) selectTarget(G.selectedTarget.id);       // clicking the chosen target again deselects it
      G.selectedInstruments = [];
      G.selectedCategory = null;
      renderTargetPanel(); renderInstrumentCarousel(); renderConstructionView(); setButtonStates(); renderStarView();
    } catch (e) {}
    mode = 'practice'; steps = PRACTICE_STEPS;
    clearInterval(timer); timer = setInterval(watch, 250);
    show(0);
  }

  function open() {
    if (els) return;
    // Remember how the screen was set up, to put it back afterwards
    const tabEl = document.getElementById('tab-instruments');
    saved = {
      menu:      document.body.classList.contains('targets-open'),
      collapsed: !!(tabEl && tabEl.classList.contains('telescope-collapsed')),
    };
    mode = 'tour'; steps = GUIDE_STEPS;
    build();
    show(0);
  }

  function close() {
    if (!els) return;
    const wasPractice = mode === 'practice';
    clearInterval(timer); timer = null;
    els.wrap.remove(); els = null; idx = -1;
    mode = 'tour'; steps = GUIDE_STEPS;
    if (!wasPractice) {                 // after practice the player carries on from where they are
      helpers.tab('instruments');
      if (saved) {
        if (typeof setTelescopePanel === 'function') setTelescopePanel(saved.collapsed, false);
        if (typeof setTargetMenu === 'function' && typeof UH_PHONE !== 'undefined' && UH_PHONE.matches) setTargetMenu(saved.menu);
      }
    }
    saved = null;
  }

  window.addEventListener('resize', place);
  document.addEventListener('keydown', e => {
    if (!els || els.wrap.style.display === 'none') return;
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (mode !== 'tour') return;
    if (e.key === 'ArrowRight' && idx + 1 < steps.length) els.next.click();
    else if (e.key === 'ArrowLeft' && idx > 0) els.back.click();
  }, true);

  return { open, close };
})();
