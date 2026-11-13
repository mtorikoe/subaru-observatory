/* ============================================================
   quiz-visuals.js — small pictures for the two-choice quizzes

   Every quiz answer is drawn as a 120×120 SVG tile.  A choice in
   quiz-data.js names one of the drawers below plus one argument:

       ['moons', 9, 'About 9 full Moons']
         │       │   └ caption under the picture
         │       └ argument for the drawer
         └ drawer name (a key of QV.draw)

   Drawers:
     moons(n)      field of view holding n full Moons (1 or 9)
     band(w)       wavelength bar, w = 'visible' | 'nir' | 'mir'
     star(k)       'sharp' | 'blurry' | 'twin' | 'blob'
     corona(k)     'glare' | 'masked' | 'disk'
     dots(n)       n optical fibres in the field
     grid(n)       deformable mirror with n actuators
     target(k)     'galaxy' | 'galaxies' | 'planet' | 'nebula' | 'disk' | 'dust'
                   | 'redstar' | 'bluestar' | 'sun' | 'faint' | 'bright'
     scope(f)      telescope with focus f = 'prime' | 'cass' | 'nasmyth'
     output(k)     'image' | 'spectrum' | 'many' | 'cube' | 'fine' | 'coarse'
                   | 'comb' | 'lenslets'
     doppler(k)    'shift' | 'dip'
     pol(k)        'polarized' | 'random'
     wave(k)       'flat' | 'wavy'
     laser(k)      'orange' | 'green' | 'none'
     mask(k)       'holes' | 'open'
     slits(n)      slit mask with n slits
     field(k)      'wide' | 'narrow'
     text(s)       big text, 'BIG|small line' (use for numbers)
   ============================================================ */

const QV = (function () {

  // Shared gradients — injected once per page by QV.installDefs()
  const DEFS = `
  <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <radialGradient id="qv-white"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <radialGradient id="qv-yellow"><stop offset="0" stop-color="#fff8d0"/><stop offset=".3" stop-color="#f0c060" stop-opacity=".8"/><stop offset="1" stop-color="#f0c060" stop-opacity="0"/></radialGradient>
    <radialGradient id="qv-red"><stop offset="0" stop-color="#ffb090"/><stop offset=".3" stop-color="#e04030" stop-opacity=".8"/><stop offset="1" stop-color="#e04030" stop-opacity="0"/></radialGradient>
    <radialGradient id="qv-blue"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#70a8ff" stop-opacity=".8"/><stop offset="1" stop-color="#70a8ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="qv-orange"><stop offset="0" stop-color="#ffe0a0"/><stop offset=".4" stop-color="#f08030" stop-opacity=".7"/><stop offset="1" stop-color="#f08030" stop-opacity="0"/></radialGradient>
    <radialGradient id="qv-pink"><stop offset="0" stop-color="#ff90c0" stop-opacity=".9"/><stop offset="1" stop-color="#ff90c0" stop-opacity="0"/></radialGradient>
    <linearGradient id="qv-rainbow"><stop offset="0" stop-color="#7040d0"/><stop offset=".2" stop-color="#3070f0"/><stop offset=".4" stop-color="#30c060"/><stop offset=".6" stop-color="#f0e040"/><stop offset=".8" stop-color="#f08030"/><stop offset="1" stop-color="#e03030"/></linearGradient>
    <linearGradient id="qv-nir"><stop offset="0" stop-color="#c02828"/><stop offset="1" stop-color="#701818"/></linearGradient>
    <linearGradient id="qv-mir"><stop offset="0" stop-color="#601414"/><stop offset="1" stop-color="#2c0a0a"/></linearGradient>
  </defs></svg>`;

  // Deterministic pseudo-random numbers so a picture looks the same every time
  function rng(seed) { let s = seed; return () => (s = (s * 16807 + 11) % 2147483647) / 2147483647; }

  function sky(seed, n) {
    const r = rng(seed || 7); let o = '';
    for (let i = 0; i < (n == null ? 22 : n); i++)
      o += `<circle cx="${(r() * 120).toFixed(1)}" cy="${(r() * 120).toFixed(1)}" r="${(r() * .6 + .3).toFixed(2)}" fill="#fff" opacity="${(r() * .5 + .2).toFixed(2)}"/>`;
    return o;
  }
  function svg(inner, noSky) {
    return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img">` +
           `<rect width="120" height="120" fill="#040810"/>${noSky ? '' : sky()}${inner}</svg>`;
  }
  const glow = (x, y, r, c, o) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#qv-${c})" opacity="${o == null ? 1 : o}"/>`;
  const label = (x, y, s, size, fill) =>
    `<text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="${size || 8}" fill="${fill || '#a8c8e8'}">${s}</text>`;

  function moon(x, y, r) {
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#d0c8b8"/>` +
           `<circle cx="${x - r * .3}" cy="${y - r * .25}" r="${r * .22}" fill="#a8a090"/>` +
           `<circle cx="${x + r * .35}" cy="${y + r * .2}" r="${r * .16}" fill="#a8a090"/>` +
           `<circle cx="${x - r * .05}" cy="${y + r * .5}" r="${r * .12}" fill="#a8a090"/>`;
  }
  function spiral(x, y, s, rot) {
    return `<g transform="translate(${x} ${y}) rotate(${rot || -25}) scale(${s})">` +
      `<ellipse rx="34" ry="14" fill="url(#qv-blue)" opacity=".55"/>` +
      `<path d="M-4 0 C-14 -12,-30 -6,-32 4" fill="none" stroke="#a8c8ff" stroke-width="2.2" opacity=".8"/>` +
      `<path d="M4 0 C14 12,30 6,32 -4" fill="none" stroke="#a8c8ff" stroke-width="2.2" opacity=".8"/>` +
      `<circle r="7" fill="url(#qv-yellow)"/></g>`;
  }
  // Dark absorption lines at fractional positions across a strip
  function lines(x, y, w, h, pos, sw, col) {
    return pos.map(p => `<rect x="${(x + w * p - sw / 2).toFixed(2)}" y="${y}" width="${sw}" height="${h}" fill="${col || '#040810'}"/>`).join('');
  }
  const strip = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#qv-rainbow)"/>`;

  const draw = {

    moons(n) {
      const mr = 9;
      if (n <= 1)
        return svg(`<circle cx="60" cy="60" r="15" fill="#0a1830" stroke="#7ecfed" stroke-width="1.5" stroke-dasharray="3 2"/>` + moon(60, 60, mr));
      let m = '';
      for (let i = 0; i < 9; i++) m += moon(36 + (i % 3) * 24, 36 + Math.floor(i / 3) * 24, mr);
      return svg(`<circle cx="60" cy="60" r="46" fill="#0a1830" stroke="#7ecfed" stroke-width="1.5" stroke-dasharray="3 2"/>` + m);
    },

    band(w) {
      const seg = { visible: [10, 32], nir: [42, 34], mir: [76, 34] }[w] || [10, 32];
      return svg(
        `<rect x="10" y="48" width="32" height="24" fill="url(#qv-rainbow)"/>` +
        `<rect x="42" y="48" width="34" height="24" fill="url(#qv-nir)"/>` +
        `<rect x="76" y="48" width="34" height="24" fill="url(#qv-mir)"/>` +
        `<rect x="${seg[0] - 2}" y="44" width="${seg[1] + 4}" height="32" fill="none" stroke="#fff" stroke-width="2.5" rx="3"/>` +
        `<path d="M${seg[0] + seg[1] / 2 - 5} 30 l5 9 l5 -9z" fill="#fff"/>` +
        label(26, 88, 'visible', 7.5, w === 'visible' ? '#fff' : '#6a8aa8') +
        label(59, 88, 'near-IR', 7.5, w === 'nir' ? '#fff' : '#6a8aa8') +
        label(93, 88, 'mid-IR', 7.5, w === 'mir' ? '#fff' : '#6a8aa8') +
        label(60, 106, 'shorter ←  wavelength  → longer', 6, '#5a8aaa'), true);
    },

    star(k) {
      if (k === 'blurry') return svg(glow(60, 60, 40, 'white', .55) + glow(52, 66, 26, 'white', .4) + glow(70, 54, 24, 'white', .4));
      if (k === 'twin')   return svg(glow(46, 60, 12, 'white') + `<circle cx="46" cy="60" r="3" fill="#fff"/>` +
                                     glow(74, 60, 12, 'white') + `<circle cx="74" cy="60" r="3" fill="#fff"/>`);
      if (k === 'blob')   return svg(`<ellipse cx="60" cy="60" rx="42" ry="30" fill="url(#qv-white)" opacity=".6"/>`);
      return svg(glow(60, 60, 14, 'white') + `<circle cx="60" cy="60" r="4" fill="#fff"/>` +
                 `<circle cx="60" cy="60" r="17" fill="none" stroke="#fff" stroke-width=".8" opacity=".35"/>`);
    },

    corona(k) {
      if (k === 'glare') {
        let rays = '';
        for (let i = 0; i < 8; i++) rays += `<line x1="60" y1="60" x2="${60 + 58 * Math.cos(i * Math.PI / 4)}" y2="${60 + 58 * Math.sin(i * Math.PI / 4)}" stroke="#fff" stroke-width="1.2" opacity=".5"/>`;
        return svg(glow(60, 60, 58, 'white') + rays + `<circle cx="60" cy="60" r="16" fill="#fff"/>`);
      }
      const maskC = glow(60, 60, 30, 'white', .22) + `<circle cx="60" cy="60" r="12" fill="#000" stroke="#445" stroke-width="1.5"/>`;
      if (k === 'disk')
        return svg(`<ellipse cx="60" cy="60" rx="40" ry="17" transform="rotate(-20 60 60)" fill="none" stroke="#f0a050" stroke-width="7" opacity=".75"/>` + maskC);
      return svg(maskC + glow(88, 42, 9, 'orange') + `<circle cx="88" cy="42" r="3" fill="#ffd9a0"/>`);
    },

    dots(n) {
      const shown = Math.min(n, 400), r = shown > 100 ? 1.2 : shown > 10 ? 2.6 : 5;
      let d = '';
      for (let i = 0; i < shown; i++) {
        const rr = shown === 1 ? 0 : 44 * Math.sqrt((i + .5) / shown), th = i * 2.39996;
        d += `<circle cx="${(60 + rr * Math.cos(th)).toFixed(1)}" cy="${(56 + rr * Math.sin(th)).toFixed(1)}" r="${r}" fill="#f0c060"/>`;
      }
      return svg(`<circle cx="60" cy="56" r="48" fill="#0a1830" stroke="#7ecfed" stroke-width="1.2"/>` + d +
                 label(60, 116, n + (n === 1 ? ' fibre' : ' fibres'), 9, '#fff'), true);
    },

    grid(n) {
      const k = Math.max(3, Math.round(Math.sqrt(n * 4 / Math.PI))), R = 44, stepPx = 2 * R / k, r = Math.max(.35, stepPx * .32);
      let d = '';
      for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) {
        const x = -R + stepPx * (i + .5), y = -R + stepPx * (j + .5);
        if (x * x + y * y <= R * R) d += `<circle cx="${(60 + x).toFixed(1)}" cy="${(54 + y).toFixed(1)}" r="${r.toFixed(2)}" fill="#7ecfed"/>`;
      }
      return svg(`<circle cx="60" cy="54" r="47" fill="#14263c" stroke="#8aa" stroke-width="1.5"/>` + d +
                 label(60, 116, n.toLocaleString('en-US') + ' actuators', 9, '#fff'), true);
    },

    target(k) {
      switch (k) {
        case 'galaxy':   return svg(spiral(60, 60, 1.25));
        case 'galaxies': {
          const r = rng(31); let g = '';
          for (let i = 0; i < 11; i++) g += spiral(14 + r() * 92, 14 + r() * 92, .22 + r() * .16, r() * 180);
          return svg(g);
        }
        case 'planet':   return svg(glow(48, 62, 26, 'yellow') + `<circle cx="48" cy="62" r="7" fill="#fff8d0"/>` +
                                    `<circle cx="88" cy="44" r="4.5" fill="#7ecfed"/>` +
                                    `<ellipse cx="48" cy="62" rx="44" ry="20" transform="rotate(-24 48 62)" fill="none" stroke="#fff" stroke-width=".6" stroke-dasharray="2 3" opacity=".5"/>`);
        case 'nebula':   return svg(glow(48, 54, 36, 'pink', .8) + glow(74, 68, 32, 'blue', .45) + glow(60, 44, 22, 'orange', .45) +
                                    `<circle cx="52" cy="58" r="1.6" fill="#fff"/><circle cx="70" cy="50" r="1.3" fill="#fff"/><circle cx="62" cy="72" r="1.4" fill="#fff"/>`);
        case 'disk':     return svg(`<ellipse cx="60" cy="60" rx="44" ry="18" transform="rotate(-20 60 60)" fill="none" stroke="#f0a050" stroke-width="9" opacity=".7"/>` +
                                    `<ellipse cx="60" cy="60" rx="44" ry="18" transform="rotate(-20 60 60)" fill="none" stroke="#040810" stroke-width="2"/>` +
                                    glow(60, 60, 14, 'yellow') + `<circle cx="60" cy="60" r="4" fill="#fff8d0"/>`);
        case 'dust':     return svg(glow(50, 58, 40, 'red', .75) + glow(76, 66, 30, 'orange', .6) + glow(60, 42, 22, 'red', .5));
        case 'redstar':  return svg(glow(60, 60, 20, 'red') + `<circle cx="60" cy="60" r="6" fill="#ff9070"/>`);
        case 'bluestar': return svg(glow(60, 60, 34, 'blue') + `<circle cx="60" cy="60" r="11" fill="#e8f0ff"/>`);
        case 'sun':      return svg(glow(60, 60, 30, 'yellow') + `<circle cx="60" cy="60" r="9" fill="#fff8d0"/>`);
        case 'faint':    return svg(`<ellipse cx="60" cy="60" rx="20" ry="9" transform="rotate(-25 60 60)" fill="#a8c8ff" opacity=".16"/>`, false);
        default: { // 'bright'
          return svg(glow(60, 60, 50, 'white') +
            `<path d="M60 6 L63 57 L114 60 L63 63 L60 114 L57 63 L6 60 L57 57z" fill="#fff" opacity=".85"/><circle cx="60" cy="60" r="9" fill="#fff"/>`);
        }
      }
    },

    scope(f) {
      const pts = { prime: [60, 20], cass: [60, 108], nasmyth: [106, 66] };
      const names = { prime: 'Prime focus', cass: 'Cassegrain focus', nasmyth: 'Nasmyth focus' };
      const sel = pts[f] || pts.prime;
      let rays;
      if (f === 'cass')         rays = `M30 8 L30 88 L56 30 L60 108 M90 8 L90 88 L64 30 L60 108`;
      else if (f === 'nasmyth') rays = `M30 8 L30 88 L56 30 L60 66 L106 66 M90 8 L90 88 L64 30 L60 66`;
      else                      rays = `M30 8 L30 88 L60 20 M90 8 L90 88 L60 20`;
      let dots = '';
      for (const k in pts) if (k !== f) dots += `<circle cx="${pts[k][0]}" cy="${pts[k][1]}" r="3" fill="#4a607a"/>`;
      const ly = f === 'prime' ? 12 : f === 'cass' ? 119 : 82;
      const lx = f === 'nasmyth' ? 88 : 60;
      return svg(
        `<path d="M24 86 Q60 100 96 86 L96 92 Q60 106 24 92z" fill="#8aa0b8"/>` +                       /* primary mirror */
        `<path d="M24 86 L24 24 M96 86 L96 24" stroke="#56708c" stroke-width="2" fill="none"/>` +      /* tube */
        `<rect x="54" y="27" width="12" height="4" fill="#8aa0b8"/>` +                                  /* secondary */
        (f === 'nasmyth' ? `<path d="M56 70 L64 62" stroke="#8aa0b8" stroke-width="3"/><path d="M96 74 L116 74" stroke="#56708c" stroke-width="2"/>` : '') +
        `<path d="${rays}" stroke="#f0e080" stroke-width="1" fill="none" opacity=".8"/>` + dots +
        glow(sel[0], sel[1], 11, 'yellow') + `<circle cx="${sel[0]}" cy="${sel[1]}" r="3.5" fill="#fff"/>` +
        label(lx, ly, names[f] || '', 7.5, '#fff'), true);
    },

    output(k) {
      switch (k) {
        case 'image':    return svg(`<rect x="14" y="20" width="92" height="80" fill="#060c18" stroke="#c8d8e8" stroke-width="2.5"/>` + spiral(60, 60, .95) +
                                    `<circle cx="28" cy="34" r="1.2" fill="#fff"/><circle cx="92" cy="84" r="1.4" fill="#fff"/><circle cx="88" cy="32" r="1" fill="#fff"/>`, true);
        case 'spectrum': return svg(strip(10, 44, 100, 32) + lines(10, 44, 100, 32, [.14, .31, .38, .62, .83], 2), true);
        case 'many': {
          const r = rng(5); let o = '';
          for (let i = 0; i < 7; i++) o += strip(10, 12 + i * 14, 100, 9) + lines(10, 12 + i * 14, 100, 9, [r(), r(), r()], 1.6);
          return svg(o, true);
        }
        case 'cube': {
          const cols = ['#e04040', '#f0a030', '#40c060', '#4080f0']; let o = '';
          cols.forEach((c, i) => {
            const x = 18 + i * 10, y = 46 - i * 10;
            o += `<rect x="${x}" y="${y}" width="54" height="54" fill="#060c18" stroke="${c}" stroke-width="2.5"/>` +
                 `<circle cx="${x + 27}" cy="${y + 27}" r="5" fill="#000"/><circle cx="${x + 40}" cy="${y + 16}" r="3" fill="${c}"/>`;
          });
          return svg(o, true);
        }
        case 'fine':     return svg(strip(10, 44, 100, 32) +
                                    lines(10, 44, 100, 32, [.06, .12, .19, .27, .33, .41, .52, .56, .64, .71, .79, .86, .93], .9), true);
        case 'coarse':   return svg(`<g opacity=".9">` + strip(10, 44, 100, 32) + `</g>` +
                                    `<rect x="20" y="44" width="9" height="32" fill="#040810" opacity=".6"/>` +
                                    `<rect x="60" y="44" width="12" height="32" fill="#040810" opacity=".6"/>` +
                                    `<rect x="92" y="44" width="8" height="32" fill="#040810" opacity=".6"/>`, true);
        case 'comb': {
          let o = `<rect x="10" y="44" width="100" height="32" fill="#12060a"/>`;
          for (let i = 0; i < 17; i++) o += `<rect x="${12.5 + i * 6}" y="44" width="1.6" height="32" fill="#ff8a60"/>`;
          return svg(o, true);
        }
        default: { // 'lenslets'
          let o = '';
          for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++)
            o += `<rect x="${14 + i * 16}" y="${18 + j * 16}" width="11" height="3.2" fill="url(#qv-rainbow)"/>`;
          return svg(o, true);
        }
      }
    },

    doppler(k) {
      if (k === 'dip')
        return svg(glow(60, 34, 22, 'yellow') + `<circle cx="60" cy="34" r="10" fill="#fff8d0"/><circle cx="56" cy="36" r="3" fill="#040810"/>` +
                   `<path d="M10 78 L44 78 Q50 78 52 92 L68 92 Q70 78 76 78 L110 78" fill="none" stroke="#7ecfed" stroke-width="2.5"/>` +
                   label(60, 112, 'brightness over time', 7), true);
      const p = [.2, .45, .52, .8];
      return svg(strip(10, 26, 100, 22) + lines(10, 26, 100, 22, p, 2) +
                 strip(10, 72, 100, 22) + lines(10, 72, 100, 22, p.map(x => x + .07), 2) +
                 `<path d="M34 54 L52 54 M52 54 l-5 -4 M52 54 l-5 4" stroke="#fff" stroke-width="1.8" fill="none"/>` +
                 label(78, 57, 'lines shift', 7.5, '#fff'), true);
    },

    pol(k) {
      const r = rng(9); let o = '';
      for (let i = 0; i < 9; i++) {
        const x = 26 + (i % 3) * 34, y = 26 + Math.floor(i / 3) * 34;
        const a = k === 'polarized' ? -35 : r() * 180;
        o += `<g transform="translate(${x} ${y}) rotate(${a.toFixed(0)})"><path d="M-13 0 L13 0 M-13 0 l5 -4 M-13 0 l5 4 M13 0 l-5 -4 M13 0 l-5 4" stroke="#7ecfed" stroke-width="2" fill="none"/></g>`;
      }
      return svg(o, true);
    },

    wave(k) {
      let o = '';
      for (let i = 0; i < 5; i++) {
        const y = 24 + i * 18;
        o += k === 'flat'
          ? `<path d="M12 ${y} L108 ${y}" stroke="#7ecfed" stroke-width="2.5" fill="none"/>`
          : `<path d="M12 ${y} q8 ${-9 - i} 16 0 t16 ${3 - i} t16 ${i - 2} t16 0 t16 ${i} t16 0" stroke="#f0a050" stroke-width="2.5" fill="none"/>`;
      }
      return svg(o, true);
    },

    laser(k) {
      const dome = `<path d="M40 112 L40 98 A20 20 0 0 1 80 98 L80 112z" fill="#c8d4e0"/><rect x="56" y="80" width="8" height="20" fill="#040810"/>`;
      if (k === 'none') return svg(glow(60, 26, 22, 'white', .35) + dome);
      const c = k === 'green' ? '#40e060' : '#ffa030';
      return svg(`<line x1="60" y1="84" x2="60" y2="24" stroke="${c}" stroke-width="2.5"/>` +
                 `<circle cx="60" cy="22" r="12" fill="${c}" opacity=".3"/><circle cx="60" cy="22" r="4" fill="${c}"/>` + dome);
    },

    mask(k) {
      if (k === 'open') return svg(`<circle cx="60" cy="60" r="44" fill="#e8f2ff"/><circle cx="60" cy="60" r="9" fill="#040810"/>`, true);
      const h = [[60, 28], [34, 44], [86, 46], [46, 74], [78, 80], [60, 54], [30, 70]];
      return svg(`<circle cx="60" cy="60" r="44" fill="#3a4658" stroke="#8aa" stroke-width="1.5"/>` +
                 h.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="#e8f2ff"/>`).join(''), true);
    },

    slits(n) {
      const plate = `<rect x="12" y="16" width="96" height="88" rx="4" fill="#3a4658" stroke="#8aa" stroke-width="1.5"/>`;
      if (n <= 1) return svg(plate + `<rect x="58.5" y="26" width="3" height="68" fill="#e8f2ff"/>`, true);
      const r = rng(17); let o = '';
      for (let i = 0; i < n; i++) o += `<rect x="${(20 + r() * 78).toFixed(1)}" y="${(22 + i * (76 / n)).toFixed(1)}" width="2.4" height="${Math.max(4, 60 / n).toFixed(1)}" fill="#e8f2ff"/>`;
      return svg(plate + o, true);
    },

    field(k) {
      if (k === 'narrow')
        return svg(sky(3, 60) + `<rect width="120" height="120" fill="#040810" opacity=".55"/>` +
                   `<rect x="50" y="50" width="20" height="20" fill="#0a1830" stroke="#7ecfed" stroke-width="1.8"/>` +
                   glow(60, 60, 7, 'white') + `<circle cx="60" cy="60" r="2" fill="#fff"/>`, true);
      return svg(sky(3, 60) + `<rect x="8" y="16" width="104" height="88" fill="none" stroke="#7ecfed" stroke-width="1.8"/>` +
                 spiral(40, 44, .3, 20) + spiral(84, 74, .36, -40) + spiral(70, 36, .2, 70), true);
    },

    text(s) {
      const parts = String(s).split('|'), big = parts[0], small = parts[1] || '';
      const size = big.length > 9 ? 15 : big.length > 6 ? 20 : big.length > 4 ? 26 : 34;
      return svg(`<text x="60" y="${small ? 62 : 70}" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="${size}" fill="#f0c060">${big}</text>` +
                 (small ? label(60, 84, small, 9, '#a8c8e8') : ''));
    },
  };

  return {
    draw,
    /** SVG markup for a choice written as [drawer, argument, caption] */
    render(choice) {
      const fn = draw[choice[0]];
      return fn ? fn(choice[1]) : draw.text('?');
    },
    installDefs() {
      if (!document.getElementById('qv-white')) document.body.insertAdjacentHTML('afterbegin', DEFS);
    },
  };
})();
