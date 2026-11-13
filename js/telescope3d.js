/* ============================================================
   telescope3d.js — rotatable 3-D wireframe of the Subaru Telescope
   (home page, left of the instrument mini games)

   No library: the telescope is a list of 3-D line segments that are
   rotated, projected and stroked on a 2-D canvas.

   Usage
     SubaruTelescope3D.init(canvas, captionElement)
     SubaruTelescope3D.highlight(port)   // 'primary' | 'cassegrain' |
                                         // 'nasmyth-r' | 'nasmyth-l' | null
   The port names are the `port` values of UH_INSTRUMENTS
   (games/telescope-pro/js/data.js).

   Controls: drag = rotate, mouse wheel = zoom.

   Units are roughly metres. y is up. The tube is tilted TILT degrees
   from the zenith about the elevation axis (the x axis at height EL_H).
   ============================================================ */

const SubaruTelescope3D = (function () {

  const BLUE      = '#3d8bff';      // Subaru's structure really is painted blue
  const BLUE_GLOW = '#1e6bff';
  const TILT  = 35 * Math.PI / 180;
  const EL_H  = 8;                   // height of the elevation axis
  const PIVOT = [0, 9, 2.5];         // point the view rotates around

  const PORTS = {
    'primary':    { label: 'Prime focus',      r: 2.3 },
    'cassegrain': { label: 'Cassegrain focus', r: 2.7 },
    'nasmyth-r':  { label: 'Nasmyth focus',    r: 2.6 },
    'nasmyth-l':  { label: 'Nasmyth focus',    r: 2.6 },
  };

  /* ── Model ─────────────────────────────────────────────── */
  const segs = [];                   // [ax,ay,az, bx,by,bz, group]
  let mirror = [], mirrorHole = [];  // filled polygons (world points)

  const cT = Math.cos(TILT), sT = Math.sin(TILT);
  // Tube coordinates (x across, u along the optical axis, w) → world
  const T = (x, u, w) => [x, EL_H + u * cT - w * sT, u * sT + w * cT];
  const W = (x, y, z) => [x, y, z];

  function seg(a, b, g) { segs.push([a[0], a[1], a[2], b[0], b[1], b[2], g || '']); }
  function loop(pts, g) { for (let i = 0; i < pts.length; i++) seg(pts[i], pts[(i + 1) % pts.length], g); }
  // n points on a circle of radius r; `at(a, b)` places the two circle coordinates in 3-D
  function circle(r, n, at, phase) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i + (phase || 0)) / n * Math.PI * 2;
      pts.push(at(r * Math.cos(a), r * Math.sin(a)));
    }
    return pts;
  }
  const tubeRing = (r, u, n, phase) => circle(r, n, (a, b) => T(a, u, b), phase);
  function join(p, q, g) { for (let i = 0; i < p.length; i++) seg(p[i], q[i], g); }
  function zigzag(p, q, g) {         // truss: every point of p to its two neighbours in q
    for (let i = 0; i < p.length; i++) { seg(p[i], q[i], g); seg(p[i], q[(i + p.length - 1) % q.length], g); }
  }
  function box(x0, x1, y0, y1, z0, z1, g) {
    const c = (x, y, z) => W(x, y, z);
    const lo = [c(x0, y0, z0), c(x1, y0, z0), c(x1, y0, z1), c(x0, y0, z1)];
    const hi = [c(x0, y1, z0), c(x1, y1, z0), c(x1, y1, z1), c(x0, y1, z1)];
    loop(lo, g); loop(hi, g); join(lo, hi, g);
  }

  function build() {
    /* Azimuth base */
    const b0 = circle(10, 24, (a, b) => W(a, 0, b)), b1 = circle(10, 24, (a, b) => W(a, -1.2, b));
    const bi = circle(4.2, 24, (a, b) => W(a, 0, b));
    loop(b0); loop(b1); loop(bi);
    for (let i = 0; i < 24; i += 2) { seg(b0[i], b1[i]); seg(b0[i], bi[i]); }

    /* Yoke towers, elevation bearings and Nasmyth platforms — one on each side */
    [1, -1].forEach(s => {
      const g  = s > 0 ? 'nasmyth-r' : 'nasmyth-l';
      const xi = s * 6.6, xo = s * 8.4;
      const level = (y, z) => [W(xi, y, -z), W(xo, y, -z), W(xo, y, z), W(xi, y, z)];
      const l0 = level(0, 3.4), l1 = level(4.4, 2.3), l2 = level(8.9, 1.3);
      loop(l0); loop(l1); loop(l2); join(l0, l1); join(l1, l2);
      seg(l0[0], l1[3]); seg(l0[3], l1[0]); seg(l1[0], l2[3]); seg(l1[3], l2[0]);   // X braces, inner face
      seg(l0[1], l1[2]); seg(l0[2], l1[1]); seg(l1[1], l2[2]); seg(l1[2], l2[1]);   // X braces, outer face
      const be0 = circle(1.15, 12, (a, b) => W(xi, EL_H + a, b)), be1 = circle(1.15, 12, (a, b) => W(xo, EL_H + a, b));
      loop(be0); loop(be1); join(be0, be1);

      // Platform floor
      const x0 = s * 8.4, x1 = s * 14.5, fy = 6.4, fz = 4.6;
      const fl = [W(x0, fy, -fz), W(x1, fy, -fz), W(x1, fy, fz), W(x0, fy, fz)];
      loop(fl);
      for (let k = 1; k < 4; k++) { const z = -fz + k * fz / 2; seg(W(x0, fy, z), W(x1, fy, z)); }
      for (let k = 1; k < 3; k++) { const x = x0 + k * (x1 - x0) / 3; seg(W(x, fy, -fz), W(x, fy, fz)); }
      // Railing on the three open sides
      const rail = [];
      for (let k = 0; k <= 4; k++) rail.push([x0 + k * (x1 - x0) / 4, -fz]);
      for (let k = 1; k <= 6; k++) rail.push([x1, -fz + k * fz / 3]);
      for (let k = 1; k <= 4; k++) rail.push([x1 - k * (x1 - x0) / 4, fz]);
      for (let k = 0; k < rail.length; k++) {
        seg(W(rail[k][0], fy, rail[k][1]), W(rail[k][0], fy + 1.1, rail[k][1]));
        if (k) seg(W(rail[k - 1][0], fy + 1.1, rail[k - 1][1]), W(rail[k][0], fy + 1.1, rail[k][1]));
      }
      // Struts down to the base
      [-1, 1].forEach(q => {
        seg(W(x1, fy, q * fz), W(s * 9.2, 0, q * 3.2));
        seg(W(s * 11.4, fy, q * fz), W(s * 9.2, 0, q * 3.2));
        seg(W(x1, fy, q * fz), W(s * 8.4, 3.2, q * 2.6));
      });
      // Instrument at the Nasmyth focus (lights up with the port)
      box(s * 9.4, s * 12.4, fy, fy + 3.1, -1.7, 1.7, g);
      seg(W(s * 9.4, fy, -1.7), W(s * 12.4, fy + 3.1, -1.7), g);
      seg(W(s * 9.4, fy, 1.7), W(s * 12.4, fy + 3.1, 1.7), g);
    });

    /* ── Tube (everything below is in tube coordinates) ── */
    // Centre section + trunnions out to the bearings
    const c0 = tubeRing(4.8, -0.9, 8), c1 = tubeRing(4.8, 0.9, 8);
    loop(c0); loop(c1); join(c0, c1);
    [1, -1].forEach(s => {
      [[-.7, -.7], [.7, -.7], [.7, .7], [-.7, .7]].forEach(d => seg(T(s * 4.6, d[0], d[1]), T(s * 6.6, d[0], d[1])));
    });

    // Mirror cell, lower truss and the 8.2 m primary mirror
    const m0 = tubeRing(4.5, -3.2, 16), m1 = tubeRing(4.5, -4.4, 16), m2 = tubeRing(2, -4.4, 16);
    loop(m0); loop(m1); loop(m2); join(m0, m1);
    for (let i = 0; i < 16; i += 2) seg(m1[i], m2[i]);
    zigzag(c0, tubeRing(4.5, -3.2, 8, .5));
    mirror     = tubeRing(4.1, -3.0, 32);
    mirrorHole = tubeRing(0.7, -3.0, 16);
    loop(mirror); loop(mirrorHole);

    // Tertiary-mirror tower in the centre
    const t0 = tubeRing(.45, -3.0, 6), t1 = tubeRing(.45, -.2, 6);
    loop(t1); join(t0, t1);

    // Upper truss and top ring
    const r0 = tubeRing(4.6, 13, 16), r1 = tubeRing(4.6, 13.9, 16);
    loop(r0); loop(r1); join(r0, r1);
    zigzag(c1, tubeRing(4.6, 13, 8, .5));

    // Spider vanes + prime-focus unit (lights up with the port)
    const p0 = tubeRing(1, 11.8, 8), p1 = tubeRing(1, 13.45, 8), p2 = tubeRing(1, 14.6, 8);
    loop(p0, 'primary'); loop(p1, 'primary'); loop(p2, 'primary'); join(p0, p1, 'primary'); join(p1, p2, 'primary');
    const sp = tubeRing(4.6, 13.45, 4, .5), hub = tubeRing(1, 13.45, 4, .5);
    join(sp, hub);

    // Cassegrain instrument under the mirror cell (lights up with the port)
    const k0 = tubeRing(1.9, -4.4, 8), k1 = tubeRing(1.9, -5.6, 8), k2 = tubeRing(1.9, -6.8, 8);
    loop(k0, 'cassegrain'); loop(k1, 'cassegrain'); loop(k2, 'cassegrain'); join(k0, k1, 'cassegrain'); join(k1, k2, 'cassegrain');

    PORTS['primary'].at    = T(0, 13.2, 0);
    PORTS['cassegrain'].at = T(0, -5.6, 0);
    PORTS['nasmyth-r'].at  = W(10.9, 7.95, 0);
    PORTS['nasmyth-l'].at  = W(-10.9, 7.95, 0);
  }

  /* ── View state ────────────────────────────────────────── */
  let canvas, ctx, caption, cw = 0, ch = 0;
  let yaw = -0.62, pitch = 0.2, zoom = 1;
  let active = null, autoSpin = true, t0 = 0;

  function project(x, y, z) {
    x -= PIVOT[0]; y -= PIVOT[1]; z -= PIVOT[2];
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp + 52;      // camera 52 m back
    const f = Math.min(cw, ch) * 1.4 * zoom / z2;
    return [cw / 2 + x1 * f, ch * 0.5 - y2 * f, f];
  }

  function polygon(pts) {
    ctx.beginPath();
    pts.forEach((p, i) => { const q = project(p[0], p[1], p[2]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
    ctx.closePath();
  }

  function draw(now) {
    requestAnimationFrame(draw);
    if (!cw || !ch) return;
    if (autoSpin) yaw += 0.0016;

    ctx.clearRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    // Primary mirror: faint glassy disc
    polygon(mirror);
    ctx.fillStyle = 'rgba(90,160,255,.16)'; ctx.fill();

    // Structure — one path for the blue lines, one for the highlighted group
    ctx.beginPath();
    const lit = [];
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (active && s[6] === active) { lit.push(s); continue; }
      const a = project(s[0], s[1], s[2]), b = project(s[3], s[4], s[5]);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.strokeStyle = BLUE; ctx.lineWidth = 1; ctx.globalAlpha = .8;
    ctx.shadowColor = BLUE_GLOW; ctx.shadowBlur = 7;
    ctx.stroke();

    if (active) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#fff'; ctx.shadowColor = '#fff';

      // The instrument at that position, in white
      ctx.beginPath();
      lit.forEach(s => {
        const a = project(s[0], s[1], s[2]), b = project(s[3], s[4], s[5]);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      });
      ctx.globalAlpha = 1; ctx.lineWidth = 2; ctx.shadowBlur = 12;
      ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
  }

  function resize() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = r.width; ch = r.height;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function init(cvs, captionEl) {
    canvas = cvs; ctx = canvas.getContext('2d'); caption = captionEl || null;
    if (!segs.length) build();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) autoSpin = false;
    resize();
    new ResizeObserver(resize).observe(canvas);
    if (caption) caption.textContent = '';

    // Drag = rotate
    let down = false, px = 0, py = 0;
    canvas.addEventListener('pointerdown', e => {
      down = true; px = e.clientX; py = e.clientY; autoSpin = false;
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add('dragging');
    });
    canvas.addEventListener('pointermove', e => {
      if (!down) return;
      yaw   += (e.clientX - px) * 0.008;
      pitch  = Math.max(-0.35, Math.min(1.35, pitch + (e.clientY - py) * 0.006));
      px = e.clientX; py = e.clientY;
    });
    const up = () => { down = false; canvas.classList.remove('dragging'); };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);

    // Wheel = zoom
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      autoSpin = false;
      zoom = Math.max(0.6, Math.min(3, zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
    }, { passive: false });

    t0 = performance.now();
    requestAnimationFrame(draw);
  }

  function highlight(port) {
    const next = PORTS[port] ? port : null;
    if (next === active) return;               // unchanged — keep the pulse running smoothly
    active = next;
    t0 = performance.now();
    if (caption) caption.textContent = active ? PORTS[active].label : '';
  }

  return { init, highlight };
})();
