/* ============================================================
   training.js — content + rendering for Space Training.

   All pictures are reused from elsewhere in the site:
     ../classification/img/*        (Classification backgrounds)
     ../../assets/star-pic/*        (shared object library)
     ../../assets/instruments/*     (instrument photographs)
   Edit the three data blocks below to change the lesson text or
   swap pictures — the markup is generated from them.
   ============================================================ */
(function () {
  'use strict';

  /* ── Lesson 1 : two kinds of light ─────────────────────── */
  const LIGHT = {
    optical: {
      eye: 'You CAN see this',
      title: 'Optical light',
      body: 'Optical light is ordinary light, the colours you already know from a rainbow. An optical photo shows the sky the way you would see it if your eyes were as powerful as a telescope.',
      instruments: ['HSC', 'FOCAS'],
      photos: [
        { src: '../classification/img/m82.jpg', cap: 'Starburst Galaxy M82' },
        { src: '../../assets/star-pic/nebula/orion.jpg', cap: 'The Orion Nebula' },
      ],
    },
    infrared: {
      eye: 'You CANNOT see this',
      title: 'Infrared light',
      body: 'Infrared is a kind of light our eyes cannot see. We feel it as warmth. Telescopes use it to look through clouds of dust and to find things that are cool, faint, or hidden.',
      instruments: ['IRCS', 'MOIRCS', 'HiCIAO + AO188'],
      photos: [
        { src: '../../assets/star-pic/nebula/sh2-209.jpg', cap: 'Star nursery Sh 2-209' },
        { src: '../../assets/star-pic/exoplanet/gj504b.jpg', cap: 'Exoplanet GJ 504 b' },
      ],
    },
  };

  /* ── Lesson 2 : kinds of objects ───────────────────────── */
  const OBJECTS = [
    { name: 'Galaxy', img: '../classification/img/ngc7783.jpg',
      desc: 'A huge family of billions of stars, gas, and dust floating together in space.' },
    { name: 'Star', img: '../classification/img/hatp7.jpg',
      desc: 'A giant ball of hot, glowing gas, just like our Sun but much farther away.' },
    { name: 'Exoplanet', img: '../../assets/star-pic/exoplanet/super-jupiter.jpg',
      desc: 'A planet that circles a different star, far outside our Solar System.' },
    { name: 'Nebula', img: '../../assets/star-pic/nebula/orion.jpg',
      desc: 'A colourful cloud of gas and dust. New stars are often born deep inside.' },
    { name: 'Star Cluster', img: '../../assets/star-pic/cluster/palomar3.jpg',
      desc: 'A big group of stars that were born together and travel as a bunch.' },
    { name: 'Comet', img: '../../assets/star-pic/comet/ison.jpg',
      desc: 'A ball of ice and dust that grows a glowing tail when it comes near the Sun.' },
    { name: 'Planet', img: '../../assets/star-pic/solar-system/mars.jpg',
      desc: 'A world that circles a star. Mars and Jupiter are planets in our Solar System.' },
    { name: 'Protoplanetary Disk', img: '../../assets/star-pic/protoplanetary-disk/pds70.jpg',
      desc: 'A spinning ring of gas and dust around a young star, where baby planets are made.' },
  ];

  /* ── Lesson 3 : the instruments ────────────────────────── */
  const INSTRUMENTS = [
    { name: 'HSC', full: 'Hyper Suprime-Cam', band: 'optical',
      img: '../../assets/instruments/hsc.jpg',
      desc: 'A giant optical camera with a very wide view. In a single shot it can photograph whole galaxies and large patches of sky.',
      eg: { src: '../classification/img/m82.jpg', cap: 'Galaxy M82' } },
    { name: 'FOCAS', full: 'Faint Object Camera & Spectrograph', band: 'optical',
      img: '../../assets/instruments/focus.jpg',
      desc: 'An optical camera that can also split light into a rainbow, so it can study faint objects like comets.',
      eg: { src: '../classification/img/c2013r1.jpg', cap: 'Comet Lovejoy' } },
    { name: 'MOIRCS', full: 'Multi-Object Infrared Camera & Spectrograph', band: 'infrared',
      img: '../../assets/instruments/moircs.jpg',
      desc: 'An infrared camera that sees heat light. It peeks through dust to find hidden stars and distant galaxies.',
      eg: { src: '../../assets/star-pic/nebula/sh2-209.jpg', cap: 'Sh 2-209' } },
    { name: 'IRCS', full: 'Infrared Camera & Spectrograph', band: 'infrared',
      img: '../../assets/instruments/ircs.jpg',
      desc: 'An infrared camera for sharp, close views of planets and bright stars.',
      eg: { src: '../../assets/star-pic/solar-system/mars.jpg', cap: 'Mars' } },
    { name: 'HiCIAO + AO188', full: 'High-Contrast Imager + Adaptive Optics', band: 'infrared',
      img: '../../assets/instruments/hiciao.jpg',
      desc: 'HiCIAO blocks a star’s bright glare, like shading the Sun with your hand, so we can spot faint planets beside it. AO188 first makes the star very sharp.',
      eg: { src: '../../assets/star-pic/exoplanet/gj504b.jpg', cap: 'Exoplanet GJ 504 b' } },
  ];

  /* ── End-of-lesson checks (one question each) ──────────── */
  const QUIZ = {
    light: {
      q: 'Which kind of light can your own eyes see?',
      options: ['Optical', 'Infrared'], answer: 'Optical',
    },
    objects: {
      q: 'Which one is a whole family of billions of stars?',
      options: ['Galaxy', 'Comet', 'Planet'], answer: 'Galaxy',
    },
    instruments: {
      q: 'Which tool blocks a star’s bright glare so we can spot faint planets beside it?',
      options: ['HiCIAO + AO188', 'HSC', 'FOCAS'], answer: 'HiCIAO + AO188',
    },
  };

  /* ── helpers ───────────────────────────────────────────── */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const photo = p => `<figure class="t-photo"><img src="${p.src}" alt="${esc(p.cap)}" loading="lazy"><span>${esc(p.cap)}</span></figure>`;

  function lightCard(key, d) {
    const chips = `<span class="t-chip-label">Taken with</span>` +
      d.instruments.map(i => `<span class="t-chip">${esc(i)}</span>`).join('');
    return `
      <div class="t-light-card ${key}">
        <div class="t-eye">${esc(d.eye)}</div>
        <h3>${esc(d.title)}</h3>
        <p>${esc(d.body)}</p>
        <div class="t-photos">${d.photos.map(photo).join('')}</div>
        <div class="t-chips">${chips}</div>
      </div>`;
  }

  function objectCard(o) {
    return `
      <article class="t-obj">
        <img src="${o.img}" alt="${esc(o.name)}" loading="lazy">
        <div class="t-obj-body">
          <h3>${esc(o.name)}</h3>
          <p>${esc(o.desc)}</p>
        </div>
      </article>`;
  }

  function instrumentRow(it) {
    return `
      <article class="t-inst">
        <div class="t-inst-photo"><img src="${it.img}" alt="${esc(it.full)}" loading="lazy"></div>
        <div class="t-inst-main">
          <h3>${esc(it.name)} <span class="t-inst-full">${esc(it.full)}</span>
            <span class="t-band ${it.band}">${it.band}</span></h3>
          <p>${esc(it.desc)}</p>
        </div>
        <figure class="t-inst-eg">
          <span class="eg-tag">It photographed</span>
          <img src="${it.eg.src}" alt="${esc(it.eg.cap)}" loading="lazy">
          <span>${esc(it.eg.cap)}</span>
        </figure>
      </article>`;
  }

  function mountQuiz(id, data) {
    const host = document.getElementById(id);
    if (!host) return;
    const options = shuffle(data.options.slice());
    host.innerHTML = `
      <div class="t-quiz-eyebrow">Quick check</div>
      <p class="t-quiz-q">${esc(data.q)}</p>
      <div class="t-quiz-opts">${options.map(o => `
        <button type="button" class="t-quiz-opt" data-v="${esc(o)}">
          <span class="t-quiz-text">${esc(o)}</span>
          <span class="t-quiz-mark"></span>
        </button>`).join('')}</div>
      <p class="t-quiz-fb" aria-live="polite"></p>`;

    const fb = host.querySelector('.t-quiz-fb');
    host.querySelectorAll('.t-quiz-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        if (host.classList.contains('answered')) return;
        host.classList.add('answered');
        const right = btn.dataset.v === data.answer;
        host.querySelectorAll('.t-quiz-opt').forEach(b => {
          b.disabled = true;
          if (b.dataset.v === data.answer) {
            b.classList.add('is-correct');
            b.querySelector('.t-quiz-mark').textContent = 'Correct';
          } else if (b === btn) {
            b.classList.add('is-wrong');
            b.querySelector('.t-quiz-mark').textContent = 'Your pick';
          }
        });
        fb.textContent = right ? 'Correct.' : 'Not quite. The answer is ' + data.answer + '.';
        fb.classList.add('show');
      });
    });
  }

  /* ── mount ─────────────────────────────────────────────── */
  document.getElementById('t-light').innerHTML =
    lightCard('optical', LIGHT.optical) + lightCard('infrared', LIGHT.infrared);
  document.getElementById('t-objects').innerHTML = OBJECTS.map(objectCard).join('');
  document.getElementById('t-insts').innerHTML = INSTRUMENTS.map(instrumentRow).join('');

  mountQuiz('t-quiz-light', QUIZ.light);
  mountQuiz('t-quiz-objects', QUIZ.objects);
  mountQuiz('t-quiz-instruments', QUIZ.instruments);
})();
