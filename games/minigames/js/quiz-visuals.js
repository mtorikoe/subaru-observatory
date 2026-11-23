/* ============================================================
   quiz-visuals.js — pictures for the two-choice quizzes

   Every quiz answer is shown as a 120×120 SVG tile.  A choice in
   quiz-data.js names one of the drawers below plus one argument:

       ['moons', 9, 'About 9 full Moons']
         │       │   └ caption under the picture
         │       └ argument for the drawer
         └ drawer name (a key of QV.draw)

   Where a real picture exists it is used: the Moon photo and the
   Subaru Telescope images in assets/star-pic (see PHOTOS below).
   Stars are drawn with blur / turbulence filters so they look like
   telescope images.

   Colour is used sparingly: sky pictures are dark, diagrams are plain
   ink drawings on a light "paper" tile, and colour appears only where
   it carries the meaning (a spectrum, a star's colour, the laser).

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

  // Path from the page that shows the quiz (games/minigames/) to /assets
  const ASSETS = '../../assets/';

  /* Real pictures.  [file, width, height, cx, cy, size]
     cx, cy = centre of the square crop as a fraction of the picture,
     size   = side of the crop as a fraction of the picture's shorter side.
     The crops avoid the captions printed on some of the originals. */
  const PHOTOS = {
    galaxy:   ['star-pic/galaxy/andromeda.jpg',            880,  646, .50, .50, 1.00],
    galaxies: ['star-pic/cluster/coma-cluster.jpg',       1600, 1600, .78, .78, .42],
    planet:   ['star-pic/exoplanet/2m0437.jpg',            600,  600, .50, .52, .50],
    disk:     ['star-pic/protoplanetary-disk/hr4796.jpg', 2317, 2560, .50, .43, .70],
    gapdisk:  ['star-pic/protoplanetary-disk/pds70.jpg',  1600, 1200, .50, .43, .62],
    nebula:   ['star-pic/nebula/orion.jpg',                374,  529, .50, .50, 1.00],
    dust:     ['star-pic/nebula/ngc2264.jpg',              975,  650, .45, .42, .80],
    field:    ['star-pic/galaxy/ngc4996.jpg',             2858, 2859, .50, .50, .90],
  };

  // Shared gradients and filters — injected once per page by QV.installDefs()
  const DEFS = `
  <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <radialGradient id="qv-white"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <radialGradient id="qv-yellow"><stop offset="0" stop-color="#fff8d0"/><stop offset=".3" stop-color="#f0c060" stop-opacity=".8"/><stop offset="1" stop-color="#f0c060" stop-opacity="0"/></radialGradient>
    <radialGradient id="qv-red"><stop offset="0" stop-color="#ffb090"/><stop offset=".3" stop-color="#e04030" stop-opacity=".8"/><stop offset="1" stop-color="#e04030" stop-opacity="0"/></radialGradient>
    <radialGradient id="qv-blue"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#70a8ff" stop-opacity=".8"/><stop offset="1" stop-color="#70a8ff" stop-opacity="0"/></radialGradient>
    <linearGradient id="qv-rainbow"><stop offset="0" stop-color="#5a30c0"/><stop offset=".18" stop-color="#2c62e8"/><stop offset=".36" stop-color="#22b0b0"/><stop offset=".5" stop-color="#34c450"/><stop offset=".66" stop-color="#e8e040"/><stop offset=".82" stop-color="#f08030"/><stop offset="1" stop-color="#c81e1e"/></linearGradient>
    <linearGradient id="qv-nir"><stop offset="0" stop-color="#c02828"/><stop offset="1" stop-color="#701818"/></linearGradient>
    <linearGradient id="qv-mir"><stop offset="0" stop-color="#601414"/><stop offset="1" stop-color="#2c0a0a"/></linearGradient>
    <!-- a spectrum on a detector is brightest along its middle -->
    <linearGradient id="qv-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".75"/><stop offset=".3" stop-color="#000" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></linearGradient>
    <linearGradient id="qv-spike"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="qv-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="0.7"/></filter>
    <filter id="qv-halo" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5"/></filter>
    <!-- "seeing": the atmosphere breaks a star into a boiling, speckled blob -->
    <filter id="qv-seeing" x="-60%" y="-60%" width="220%" height="220%">
      <feTurbulence type="fractalNoise" baseFrequency=".085" numOctaves="2" seed="4" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="30" xChannelSelector="R" yChannelSelector="G"/>
      <feGaussianBlur stdDeviation="1.5"/>
    </filter>
  </defs></svg>`;

  // Deterministic pseudo-random numbers so a picture looks the same every time
  function rng(seed) { let s = seed; return () => (s = (s * 16807 + 11) % 2147483647) / 2147483647; }
  let uid = 0;

  // Background sky: many faint stars, a few brighter ones, slight colour differences
  function sky(seed, n) {
    const r = rng(seed || 7), tint = ['#ffffff', '#ffffff', '#ffe9c8', '#cfe0ff', '#ffd2b0']; let o = '';
    for (let i = 0; i < (n == null ? 55 : n); i++) {
      const big = r() > .9;
      o += `<circle cx="${(r() * 120).toFixed(1)}" cy="${(r() * 120).toFixed(1)}" r="${(big ? r() * .5 + .6 : r() * .35 + .15).toFixed(2)}" ` +
           `fill="${tint[Math.floor(r() * tint.length)]}" opacity="${(big ? .9 : r() * .5 + .2).toFixed(2)}"/>`;
    }
    return o;
  }
  const INK = '#1b1b1f', GREY = '#8d8a83', PAPER = '#f4f2ec';
  /** One 120×120 tile. mode: undefined = night sky with stars, true = plain dark, 'paper' = light diagram */
  function svg(inner, mode) {
    const bg = mode === 'paper' ? PAPER : '#03050b';
    return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img">` +
           `<rect width="120" height="120" fill="${bg}"/>${mode ? '' : sky()}${inner}</svg>`;
  }
  const paper = inner => svg(inner, 'paper');
  const glow = (x, y, r, c, o) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#qv-${c})" opacity="${o == null ? 1 : o}"/>`;
  const label = (x, y, s, size, fill) =>
    `<text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="${size || 8}" fill="${fill || '#cfcabf'}">${s}</text>`;

  /** A real photo, cropped square and scaled to fill the box (x, y, size). */
  function photo(key, x, y, size, opacity) {
    const p = PHOTOS[key], k = (size == null ? 120 : size) / (Math.min(p[1], p[2]) * p[5]);
    const half = (size == null ? 120 : size) / 2, ox = (x || 0) + half, oy = (y || 0) + half, id = 'qvc' + (++uid);
    return `<clipPath id="${id}"><rect x="${x || 0}" y="${y || 0}" width="${half * 2}" height="${half * 2}"/></clipPath>` +
           `<image href="${ASSETS}${p[0]}" clip-path="url(#${id})" preserveAspectRatio="none" opacity="${opacity == null ? 1 : opacity}" ` +
           `x="${(ox - p[3] * p[1] * k).toFixed(1)}" y="${(oy - p[4] * p[2] * k).toFixed(1)}" width="${(p[1] * k).toFixed(1)}" height="${(p[2] * k).toFixed(1)}"/>`;
  }
  const picture = key => svg(photo(key), true);

  /** The real Moon photo, clipped to a disc. */
  function moon(x, y, r) {
    const id = 'qvc' + (++uid);
    return `<clipPath id="${id}"><circle cx="${x}" cy="${y}" r="${r}"/></clipPath>` +
           `<image href="${ASSETS}minigame/moon.png" clip-path="url(#${id})" x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" preserveAspectRatio="xMidYMid slice"/>`;
  }

  /** A star as a telescope records it: halo, core, faint diffraction ring and spikes. */
  function starImg(x, y, s, col, spikes) {
    const c = col || '#ffffff';
    let o = `<circle cx="${x}" cy="${y}" r="${7 * s}" fill="${c}" opacity=".55" filter="url(#qv-halo)"/>` +
            `<circle cx="${x}" cy="${y}" r="${2.6 * s}" fill="${c}" filter="url(#qv-soft)"/>` +
            `<circle cx="${x}" cy="${y}" r="${1.5 * s}" fill="#fff"/>` +
            `<circle cx="${x}" cy="${y}" r="${5.2 * s}" fill="none" stroke="${c}" stroke-width="${.7 * s}" opacity=".3" filter="url(#qv-soft)"/>`;
    if (spikes) {
      const L = spikes * s;
      o += `<rect x="${x - L}" y="${y - .45 * s}" width="${2 * L}" height="${.9 * s}" fill="url(#qv-spike)" opacity=".8"/>` +
           `<rect x="${x - L}" y="${y - .45 * s}" width="${2 * L}" height="${.9 * s}" fill="url(#qv-spike)" opacity=".8" transform="rotate(90 ${x} ${y})"/>`;
    }
    return o;
  }
  /** The same star through turbulent air: a speckled, smeared blob. */
  function seeing(inner) { return `<g filter="url(#qv-seeing)">${inner}</g>`; }

  // Absorption lines with soft edges and different strengths
  function lines(x, y, w, h, pos, sw, col) {
    return pos.map((p, i) => `<rect x="${(x + w * p - sw / 2).toFixed(2)}" y="${y}" width="${sw}" height="${h}" fill="${col || '#03050b'}" opacity="${[.95, .7, .85, .6][i % 4]}"/>`).join('');
  }
  const strip = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#qv-rainbow)"/>`;
  const shade = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#qv-shade)"/>`;

  const draw = {

    moons(n) {
      const mr = 15;        // one full Moon — same scale in both choices
      // Suprime-Cam: a single Moon that fills its narrow field.
      if (n <= 1)
        return svg(`<circle cx="60" cy="60" r="${mr}" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="3 2"/>` + moon(60, 60, mr));
      // HSC's wider field: one Moon centred, eight in a ring around it, sized
      // so the discs overlap a little and fill the field circle — the same
      // view as the interactive HSC mini game.
      const ring = 30;
      let m = moon(60, 60, mr);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 - Math.PI / 2;
        m += moon(60 + ring * Math.cos(a), 60 + ring * Math.sin(a), mr);
      }
      return svg(`<circle cx="60" cy="60" r="46" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="3 2"/>` + m);
    },

    band(w) {
      const seg = { visible: [10, 32], nir: [42, 34], mir: [76, 34] }[w] || [10, 32];
      return svg(
        `<rect x="10" y="48" width="32" height="24" fill="url(#qv-rainbow)"/>` +
        `<rect x="42" y="48" width="34" height="24" fill="url(#qv-nir)"/>` +
        `<rect x="76" y="48" width="34" height="24" fill="url(#qv-mir)"/>` +
        `<rect x="${seg[0] - 2}" y="44" width="${seg[1] + 4}" height="32" fill="none" stroke="#fff" stroke-width="2.5" rx="3"/>` +
        `<path d="M${seg[0] + seg[1] / 2 - 5} 30 l5 9 l5 -9z" fill="#fff"/>` +
        label(26, 88, 'visible', 7.5, w === 'visible' ? '#fff' : '#8a857c') +
        label(59, 88, 'near-IR', 7.5, w === 'nir' ? '#fff' : '#8a857c') +
        label(93, 88, 'mid-IR', 7.5, w === 'mir' ? '#fff' : '#8a857c') +
        label(60, 106, 'shorter ←  wavelength  → longer', 6, '#8a857c'), true);
    },

    star(k) {
      if (k === 'blurry') return svg(seeing(`<circle cx="60" cy="60" r="20" fill="url(#qv-white)"/><circle cx="52" cy="66" r="10" fill="#fff" opacity=".7"/><circle cx="69" cy="55" r="9" fill="#fff" opacity=".7"/>`));
      if (k === 'twin')   return svg(starImg(47, 60, 1.5, '#fff', 12) + starImg(73, 60, 1.5, '#fff', 12));
      if (k === 'blob')   return svg(seeing(`<circle cx="50" cy="60" r="17" fill="url(#qv-white)"/><circle cx="70" cy="60" r="17" fill="url(#qv-white)"/><circle cx="60" cy="60" r="10" fill="#fff" opacity=".6"/>`));
      return svg(starImg(60, 60, 2, '#fff', 14));
    },

    corona(k) {
      if (k === 'glare')
        return svg(`<circle cx="60" cy="60" r="40" fill="#fff" opacity=".8" filter="url(#qv-halo)"/>` + glow(60, 60, 60, 'white') +
                   starImg(60, 60, 5, '#fff', 12));
      if (k === 'disk') return picture('gapdisk');
      return picture('planet');
    },

    dots(n) {
      const shown = Math.min(n, 400), r = shown > 100 ? 1.1 : shown > 10 ? 2.6 : 4.5;
      let d = '';
      for (let i = 0; i < shown; i++) {
        const rr = shown <= 1 ? 0 : 44 * Math.sqrt((i + .5) / shown), th = i * 2.39996;
        d += `<circle cx="${(60 + rr * Math.cos(th)).toFixed(1)}" cy="${(60 + rr * Math.sin(th)).toFixed(1)}" r="${r}" fill="${INK}"/>`;
      }
      return paper(`<circle cx="60" cy="60" r="50" fill="none" stroke="${INK}" stroke-width="1"/>` + d);
    },

    grid(n) {
      const k = Math.max(3, Math.round(Math.sqrt(n * 4 / Math.PI))), R = 46, stepPx = 2 * R / k, r = Math.max(.35, stepPx * .3);
      let d = '';
      for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) {
        const x = -R + stepPx * (i + .5), y = -R + stepPx * (j + .5);
        if (x * x + y * y <= R * R) d += `<circle cx="${(60 + x).toFixed(1)}" cy="${(60 + y).toFixed(1)}" r="${r.toFixed(2)}" fill="${INK}"/>`;
      }
      return paper(`<circle cx="60" cy="60" r="50" fill="none" stroke="${INK}" stroke-width="1"/>` + d);
    },

    target(k) {
      switch (k) {
        case 'galaxy':   return picture('galaxy');
        case 'galaxies': return picture('galaxies');
        case 'planet':   return picture('planet');
        case 'nebula':   return picture('nebula');
        case 'disk':     return picture('disk');
        case 'dust':     return picture('dust');
        case 'redstar':  return svg(starImg(60, 60, 1.6, '#ff8a66'));
        case 'bluestar': return svg(starImg(60, 60, 3.4, '#9cc0ff', 13));
        case 'sun':      return svg(starImg(60, 60, 2.6, '#ffe7a0', 12));
        case 'faint':    return svg(`<ellipse cx="60" cy="60" rx="16" ry="7" transform="rotate(-25 60 60)" fill="#cfd8ff" opacity=".22" filter="url(#qv-halo)"/>`);
        default:         return svg(`<circle cx="60" cy="60" r="26" fill="#fff" opacity=".7" filter="url(#qv-halo)"/>` + starImg(60, 60, 4.5, '#fff', 12));   // 'bright'
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
        `<path d="M24 86 Q60 100 96 86 L96 92 Q60 106 24 92z" fill="#9db4cc"/>` +                       /* primary mirror */
        `<path d="M24 86 L24 24 M96 86 L96 24" stroke="#3d8bff" stroke-width="2" fill="none"/>` +      /* tube (Subaru blue) */
        `<rect x="54" y="27" width="12" height="4" fill="#9db4cc"/>` +                                  /* secondary */
        (f === 'nasmyth' ? `<path d="M56 70 L64 62" stroke="#9db4cc" stroke-width="3"/><path d="M96 74 L116 74" stroke="#3d8bff" stroke-width="2"/>` : '') +
        `<path d="${rays}" stroke="#f0e080" stroke-width="1" fill="none" opacity=".8"/>` + dots +
        glow(sel[0], sel[1], 11, 'yellow') + `<circle cx="${sel[0]}" cy="${sel[1]}" r="3.5" fill="#fff"/>` +
        label(lx, ly, names[f] || '', 7.5, '#fff'), true);
    },

    output(k) {
      switch (k) {
        case 'image':    return svg(photo('field', 12, 12, 96) + `<rect x="12" y="12" width="96" height="96" fill="none" stroke="#fff" stroke-width="1.5"/>`, true);
        case 'spectrum': return svg(strip(10, 44, 100, 32) + lines(10, 44, 100, 32, [.14, .31, .38, .62, .83], 1.6) + shade(10, 44, 100, 32), true);
        case 'many': {
          const r = rng(5); let o = '';
          for (let i = 0; i < 7; i++) o += strip(10, 12 + i * 14, 100, 9) + lines(10, 12 + i * 14, 100, 9, [r(), r(), r()], 1.4) + shade(10, 12 + i * 14, 100, 9);
          return svg(o, true);
        }
        case 'cube': {
          // The same picture recorded at several wavelengths, stacked
          let o = '';
          for (let i = 0; i < 4; i++) {
            const x = 18 + i * 10, y = 46 - i * 10;
            o += `<rect x="${x}" y="${y}" width="54" height="54" fill="#03050b"/>` + photo('planet', x, y, 54, .55 + i * .15) +
                 `<rect x="${x}" y="${y}" width="54" height="54" fill="none" stroke="#fff" stroke-width="1.2"/>`;
          }
          return svg(o, true);
        }
        case 'fine':     return svg(strip(10, 44, 100, 32) +
                                    lines(10, 44, 100, 32, [.06, .12, .19, .27, .33, .41, .52, .56, .64, .71, .79, .86, .93], .8) + shade(10, 44, 100, 32), true);
        case 'coarse':   return svg(strip(10, 44, 100, 32) +
                                    `<g filter="url(#qv-halo)" opacity=".8"><rect x="20" y="40" width="8" height="40" fill="#03050b"/>` +
                                    `<rect x="60" y="40" width="11" height="40" fill="#03050b"/><rect x="92" y="40" width="7" height="40" fill="#03050b"/></g>` +
                                    shade(10, 44, 100, 32), true);
        case 'comb': {
          let o = `<rect x="10" y="44" width="100" height="32" fill="#0b0b0f"/>`;
          for (let i = 0; i < 17; i++) o += `<rect x="${12.5 + i * 6}" y="44" width="1.4" height="32" fill="#fff" filter="url(#qv-soft)"/>`;
          return svg(o + shade(10, 44, 100, 32), true);
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
        return svg(starImg(60, 34, 3, '#ffe7a0') + `<circle cx="56" cy="35" r="2.2" fill="#03050b"/>` +
                   `<path d="M10 78 L44 78 Q50 78 52 92 L68 92 Q70 78 76 78 L110 78" fill="none" stroke="#fff" stroke-width="2"/>` +
                   label(60, 112, 'brightness over time', 7, '#fff'), true);
      const p = [.2, .45, .52, .8];
      return svg(strip(10, 26, 100, 22) + lines(10, 26, 100, 22, p, 1.6) + shade(10, 26, 100, 22) +
                 strip(10, 72, 100, 22) + lines(10, 72, 100, 22, p.map(x => x + .07), 1.6) + shade(10, 72, 100, 22) +
                 `<path d="M34 54 L52 54 M52 54 l-5 -4 M52 54 l-5 4" stroke="#fff" stroke-width="1.8" fill="none"/>` +
                 label(78, 57, 'lines shift', 7.5, '#fff'), true);
    },

    pol(k) {
      const r = rng(9); let o = '';
      for (let i = 0; i < 9; i++) {
        const x = 26 + (i % 3) * 34, y = 26 + Math.floor(i / 3) * 34;
        const a = k === 'polarized' ? -35 : r() * 180;
        o += `<g transform="translate(${x} ${y}) rotate(${a.toFixed(0)})"><path d="M-13 0 L13 0 M-13 0 l5 -4 M-13 0 l5 4 M13 0 l-5 -4 M13 0 l-5 4" stroke="${INK}" stroke-width="1.6" fill="none"/></g>`;
      }
      return paper(o);
    },

    wave(k) {
      let o = '';
      for (let i = 0; i < 5; i++) {
        const y = 24 + i * 18;
        o += k === 'flat'
          ? `<path d="M12 ${y} L108 ${y}" stroke="${INK}" stroke-width="1.8" fill="none"/>`
          : `<path d="M12 ${y} q8 ${-9 - i} 16 0 t16 ${3 - i} t16 ${i - 2} t16 0 t16 ${i} t16 0" stroke="${INK}" stroke-width="1.8" fill="none"/>`;
      }
      return paper(o);
    },

    laser(k) {
      // Dome silhouette under a real-looking sky
      const dome = `<path d="M38 120 L38 100 A22 22 0 0 1 82 100 L82 120z" fill="#d7d3cb"/><path d="M55 120 L55 82 L65 80 L65 120z" fill="#15161c"/>` +
                   `<rect x="0" y="112" width="120" height="8" fill="#101014"/>`;
      if (k === 'none') return svg(seeing(`<circle cx="60" cy="26" r="13" fill="url(#qv-white)"/>`) + dome);
      const c = k === 'green' ? '#40e060' : '#ffa030';
      return svg(`<line x1="60" y1="84" x2="60" y2="24" stroke="${c}" stroke-width="5" opacity=".35" filter="url(#qv-soft)"/>` +
                 `<line x1="60" y1="84" x2="60" y2="24" stroke="${c}" stroke-width="1.6"/>` + starImg(60, 22, 1.8, c) + dome);
    },

    mask(k) {
      if (k === 'open') return paper(`<circle cx="60" cy="60" r="46" fill="none" stroke="${INK}" stroke-width="1.2"/><circle cx="60" cy="60" r="9" fill="${INK}"/>`);
      const h = [[60, 28], [34, 44], [86, 46], [46, 74], [78, 80], [60, 54], [30, 70]];
      return paper(`<circle cx="60" cy="60" r="46" fill="${INK}"/>` +
                   h.map(q => `<circle cx="${q[0]}" cy="${q[1]}" r="5" fill="${PAPER}"/>`).join(''));
    },

    slits(n) {
      const plate = `<rect x="12" y="16" width="96" height="88" fill="${INK}"/>`;
      if (n <= 1) return paper(plate + `<rect x="58.5" y="26" width="3" height="68" fill="${PAPER}"/>`);
      const r = rng(17); let o = '';
      for (let i = 0; i < n; i++) o += `<rect x="${(20 + r() * 78).toFixed(1)}" y="${(22 + i * (76 / n)).toFixed(1)}" width="2.4" height="${Math.max(4, 60 / n).toFixed(1)}" fill="${PAPER}"/>`;
      return paper(plate + o);
    },

    field(k) {
      // The same real star field; the frame shows how much of it the instrument sees
      if (k === 'narrow')
        return svg(photo('field', 0, 0, 120, .3) +
                   `<rect x="48" y="48" width="24" height="24" fill="#03050b"/>` + photo('field', 48, 48, 24) +
                   `<rect x="48" y="48" width="24" height="24" fill="none" stroke="#fff" stroke-width="1.2"/>`, true);
      return svg(photo('field') + `<rect x="5" y="5" width="110" height="110" fill="none" stroke="#fff" stroke-width="1.2"/>`, true);
    },

    text(s) {
      const parts = String(s).split('|'), big = parts[0], small = parts[1] || '';
      const size = big.length > 9 ? 15 : big.length > 6 ? 20 : big.length > 4 ? 26 : 34;
      return paper(`<text x="60" y="${small ? 62 : 70}" text-anchor="middle" font-family="Times New Roman, Times, serif" font-weight="700" font-size="${size}" fill="${INK}">${big}</text>` +
                   (small ? `<text x="60" y="84" text-anchor="middle" font-family="Times New Roman, Times, serif" font-size="10" fill="${GREY}">${small}</text>` : ''));
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
