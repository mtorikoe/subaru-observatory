/* ============================================================
   game.js — Classification game engine

   Flow (per round):
     • A random object image fills the screen.
     • Three two-choice questions, one at a time:
         Q1  Optical or Infrared?        (band)
         Q2  What kind of object?        (type)   correct + 1 random wrong
         Q3  Which instrument took it?   (instr)  correct + 1 random wrong
     • Get all three right → the picture is awarded to the collection.
   Depends on: catalog.js (CL_*), collection.js (window.SubaruCollection).
   ============================================================ */

(function () {
  'use strict';

  // ── Pools for random wrong answers, built from the catalog ──
  const typeKeys  = Object.keys(CL_TYPES);
  const instrKeys = Object.keys(CL_INSTRUMENTS);

  const el = id => document.getElementById(id);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick    = a => a[Math.random() * a.length | 0];
  const other   = (pool, not) => pick(pool.filter(x => x !== not));

  // ── State ──
  let obj = null;          // current object
  let qIndex = 0;          // 0..2
  let results = [];        // correctness per question
  let questions = [];      // built per round
  let locked = false;      // ignore clicks during feedback

  // Build the three questions for the current object
  function buildQuestions(o) {
    const wrongType  = other(typeKeys, o.type);
    const wrongInstr = other(instrKeys, o.instr);
    return [
      {
        prompt: 'Is this an optical or an infrared image?',
        correct: o.band,
        options: shuffle([o.band, other(CL_BANDS, o.band)]),
        label: v => v,
      },
      {
        prompt: 'What kind of object is this?',
        correct: CL_TYPES[o.type],
        options: shuffle([CL_TYPES[o.type], CL_TYPES[wrongType]]),
        label: v => v,
      },
      {
        prompt: 'Which instrument took this image?',
        correct: CL_INSTRUMENTS[o.instr],
        options: shuffle([CL_INSTRUMENTS[o.instr], CL_INSTRUMENTS[wrongInstr]]),
        label: v => v,
      },
    ];
  }

  // Prefer an object the player has not yet collected
  function nextObject() {
    const have = window.SubaruCollection.get('classification');
    const poolAll = CL_CATALOG;
    const fresh = poolAll.filter(o => !have.includes(o.id));
    const from = fresh.length ? fresh : poolAll;
    // Avoid immediately repeating the same image
    const avoid = obj ? from.filter(o => o.id !== obj.id) : from;
    return pick(avoid.length ? avoid : from);
  }

  // ── Rendering ──
  function startRound() {
    obj = nextObject();
    qIndex = 0;
    results = [];
    questions = buildQuestions(obj);
    locked = false;

    // Background image (with graceful fallback if the file is missing)
    const stage = el('cl-stage');
    stage.classList.remove('is-ready');
    const img = new Image();
    img.onload  = () => { stage.style.backgroundImage = `url("${obj.img}")`; stage.classList.add('is-ready'); };
    img.onerror = () => { stage.style.backgroundImage = 'none'; stage.classList.add('is-ready', 'is-missing'); };
    stage.classList.toggle('is-missing', false);
    img.src = obj.img;

    el('cl-result').classList.remove('show');
    el('cl-quiz').classList.add('show');
    renderQuestion();
  }

  function renderQuestion() {
    const q = questions[qIndex];
    el('cl-step').textContent = `Question ${qIndex + 1} of 3`;
    // progress dots
    el('cl-dots').innerHTML = [0, 1, 2].map(i => {
      let cls = 'cl-dot';
      if (i < results.length) cls += results[i] ? ' good' : ' bad';
      else if (i === qIndex) cls += ' current';
      return `<span class="${cls}"></span>`;
    }).join('');

    el('cl-prompt').textContent = q.prompt;

    const box = el('cl-options');
    box.innerHTML = '';
    q.options.forEach(val => {
      const b = document.createElement('button');
      b.className = 'cl-opt';
      b.type = 'button';
      b.textContent = q.label(val);
      b.onclick = () => answer(val, b);
      box.appendChild(b);
    });
  }

  function answer(val, btn) {
    if (locked) return;
    locked = true;
    const q = questions[qIndex];
    const isRight = val === q.correct;
    results.push(isRight);

    // Reveal correct / wrong on the buttons
    Array.from(el('cl-options').children).forEach(b => {
      b.disabled = true;
      if (b.textContent === q.correct) b.classList.add('correct');
      else if (b === btn) b.classList.add('wrong');
    });

    setTimeout(() => {
      qIndex++;
      locked = false;
      if (qIndex < 3) renderQuestion();
      else finishRound();
    }, 1000);
  }

  function finishRound() {
    const allRight = results.every(Boolean);
    el('cl-quiz').classList.remove('show');

    let awarded = false;
    if (allRight) awarded = window.SubaruCollection.award(obj.id, 'classification');

    const res = el('cl-result');
    res.className = 'cl-result show ' + (allRight ? 'win' : 'lose');
    res.innerHTML = `
      <div class="cl-result-card">
        <div class="cl-result-head">${allRight ? 'Correct — picture collected!' : 'Not quite'}</div>
        <div class="cl-result-name">${obj.name}</div>
        <div class="cl-answers">
          ${answerRow('Image',      results[0], obj.band)}
          ${answerRow('Object',     results[1], CL_TYPES[obj.type])}
          ${answerRow('Instrument', results[2], CL_INSTRUMENTS[obj.instr])}
        </div>
        ${allRight
          ? `<div class="cl-result-note">${awarded ? 'Added to your collection.' : 'Already in your collection.'}</div>`
          : `<div class="cl-result-note">Get all three right to collect the picture.</div>`}
        <div class="cl-result-btns">
          <button class="cl-btn ghost" type="button" onclick="CLGame.openCollection()">My Collection</button>
          <button class="cl-btn primary" type="button" onclick="CLGame.next()">Next picture ›</button>
        </div>
      </div>`;
    updateScore();
  }

  function answerRow(label, right, correctVal) {
    return `<div class="cl-answer-row ${right ? 'good' : 'bad'}">
      <span class="cl-answer-icon">${right ? '✓' : '✕'}</span>
      <span class="cl-answer-label">${label}</span>
      <span class="cl-answer-val">${correctVal}</span>
    </div>`;
  }

  function updateScore() {
    const n = window.SubaruCollection.get('classification').length;
    el('cl-score').textContent = `Collected: ${n} / ${CL_CATALOG.length}`;
  }

  // ── Collection overlay ──
  function openCollection() {
    const have = window.SubaruCollection.get('classification');

    const owned = CL_CATALOG.filter(o => have.includes(o.id));
    const cards = CL_CATALOG.map(o => {
      const got = have.includes(o.id);
      if (got) {
        return `<figure class="cl-coll-card" title="${o.name} — click to expand"
                        onclick="CLGame.openDetails('${o.id}')">
          <div class="cl-coll-img" style="background-image:url('${o.img}')"></div>
          <div class="cl-coll-name">${o.name}</div>
        </figure>`;
      }
      return `<figure class="cl-coll-card locked" title="Not yet collected">
        <div class="cl-coll-img"></div>
        <div class="cl-coll-name">???</div>
      </figure>`;
    }).join('');

    el('cl-collection').innerHTML = `
      <div class="cl-coll-box">
        <button class="cl-coll-close" type="button" onclick="CLGame.closeCollection()" title="Close">✕</button>
        <div class="cl-coll-title">My Collection <span class="cl-coll-count">${owned.length} / ${CL_CATALOG.length}</span></div>
        <div class="cl-coll-grid">${cards}</div>
      </div>`;
    el('cl-collection').classList.add('show');
  }
  function closeCollection() { el('cl-collection').classList.remove('show'); }

  // ── Expanded picture ──
  function fact(label, val) {
    return `<div class="cl-fact"><span class="cl-fact-label">${label}</span><span class="cl-fact-val">${val}</span></div>`;
  }
  function openDetails(id) {
    const o = CL_CATALOG.find(x => x.id === id);
    if (!o || !window.SubaruCollection.has(id, 'classification')) return;
    const d = el('cl-details');
    d.innerHTML = `
      <div class="cl-details-box">
        <button class="cl-details-close" type="button" onclick="CLGame.closeDetails()" title="Close">✕</button>
        <img class="cl-details-img" src="${o.img}" alt="${o.name}">
        <div class="cl-details-body">
          <div class="cl-details-name">${o.name}</div>
          <div class="cl-details-facts">
            ${fact('Image', o.band)}
            ${fact('Object', CL_TYPES[o.type])}
            ${fact('Instrument', CL_INSTRUMENTS[o.instr])}
          </div>
        </div>
      </div>`;
    d.classList.add('show');
  }
  function closeDetails() { el('cl-details').classList.remove('show'); }

  // ── Public API ──
  window.CLGame = {
    next: startRound,
    openCollection,
    closeCollection,
    openDetails,
    closeDetails,
  };

  // ── Boot ──
  document.addEventListener('DOMContentLoaded', () => {
    updateScore();
    startRound();
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      // Close the top-most overlay first
      if (el('cl-details').classList.contains('show')) closeDetails();
      else closeCollection();
    });
  });
})();
