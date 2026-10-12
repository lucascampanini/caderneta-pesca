/* ===== Desenhos: peixes, montagens e nós (SVG gerado) ===== */

let _uid = 0;
const uid = (p) => p + (++_uid);

function hexToRgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function rng(seed) {
  let h = 2166136261;
  for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return function () { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
}
const f1 = (n) => Math.round(n * 10) / 10;
const P = (pt) => f1(pt[0]) + ',' + f1(pt[1]);

/* ---------- Peixe ---------- */
function fishSVG(sp, opts) {
  opts = opts || {};
  const d = sp.d, W = 420, HH = 214, cy = 107;
  const sn = d.snout || 0, L = d.L, tl = d.tl;
  const x0 = (W - (sn + L + tl)) / 2 + 4;
  const xs = x0, xh = x0 + sn, xp = x0 + sn + L;
  const xT = xh + L * d.tm, xB = xh + L * Math.min(d.tm + 0.06, 0.6);
  const sy = cy + (d.sy || 0);
  const ht = d.ht, hb = d.hb, hp = d.hp;

  // contorno: topo em 2 curvas, base em 2 curvas
  let tc1, tc2, bc2;
  if (d.head === 'flat') { tc1 = [xs + (xT - xs) * 0.22, sy - ht * 0.5]; tc2 = [xT - (xT - xs) * 0.38, cy - ht]; bc2 = [xs + (xB - xs) * 0.1, sy + hb * 0.55]; }
  else if (d.head === 'blunt') { tc1 = [xs + 1, sy - ht * 0.8]; tc2 = [xT - (xT - xs) * 0.55, cy - ht]; bc2 = [xs + 2, sy + hb * 0.62]; }
  else if (d.head === 'duck') { tc1 = [xs + sn * 0.95, sy - 4]; tc2 = [xT - (xT - xh) * 0.55, cy - ht]; bc2 = [xs + sn * 0.95, sy + 4]; }
  else { tc1 = [xs + (xT - xs) * 0.2, sy - ht * 0.38]; tc2 = [xT - (xT - xs) * 0.45, cy - ht]; bc2 = [xs + (xB - xs) * 0.2, sy + hb * 0.32]; }
  const S = [xs, sy], T = [xT, cy - ht], Pt = [xp, cy - hp], Pb = [xp, cy + hp], B = [xB, cy + hb];
  const segs = {
    t1: [S, tc1, tc2, T],
    t2: [T, [xT + (xp - xT) * 0.42, cy - ht], [xp - (xp - xT) * 0.3, cy - hp], Pt],
    b1: [Pb, [xp - (xp - xB) * 0.3, cy + hp], [xB + (xp - xB) * 0.42, cy + hb], B],
    b2: [B, [xB - (xB - xs) * 0.42, cy + hb], bc2, S]
  };
  const bodyPath = 'M' + P(S) + ' C' + P(tc1) + ' ' + P(tc2) + ' ' + P(T) + ' C' + P(segs.t2[1]) + ' ' + P(segs.t2[2]) + ' ' + P(Pt) +
    ' L' + P(Pb) + ' C' + P(segs.b1[1]) + ' ' + P(segs.b1[2]) + ' ' + P(B) + ' C' + P(segs.b2[1]) + ' ' + P(segs.b2[2]) + ' ' + P(S) + 'Z';

  const sample = (seg) => { const a = []; for (let i = 0; i <= 40; i++) a.push(bez(seg[0], seg[1], seg[2], seg[3], i / 40)); return a; };
  const top = sample(segs.t1).concat(sample(segs.t2));
  const bot = sample(segs.b2).reverse().concat(sample(segs.b1).reverse());
  const interp = (arr, x) => {
    if (x <= arr[0][0]) return arr[0][1];
    for (let i = 1; i < arr.length; i++) if (arr[i][0] >= x) { const [a, ya] = arr[i - 1], [b, yb] = arr[i]; return b === a ? yb : ya + (yb - ya) * (x - a) / (b - a); }
    return arr[arr.length - 1][1];
  };
  const topY = (x) => interp(top, x), botY = (x) => interp(bot, x);

  const id = uid('f'), R = rng(sp.id);
  const out = [];
  const stroke = 'stroke="rgba(18,22,20,.55)" stroke-width="1.3" stroke-linejoin="round"';
  const finFill = d.fin, finStroke = 'stroke="rgba(18,22,20,.45)" stroke-width="1"';

  out.push('<defs>');
  out.push(`<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(d.back, '#000000', 0.12)}"/><stop offset=".42" stop-color="${d.back}"/><stop offset=".62" stop-color="${mix(d.back, d.belly, 0.75)}"/><stop offset="1" stop-color="${d.belly}"/></linearGradient>`);
  out.push(`<clipPath id="${id}c"><path d="${bodyPath}"/></clipPath>`);
  out.push(`<pattern id="${id}s" width="10" height="9" patternUnits="userSpaceOnUse"><path d="M0,4.5 A5,5 0 0 0 10,4.5 M-5,9 A5,5 0 0 0 5,9 M5,9 A5,5 0 0 0 15,9" fill="none" stroke="rgba(0,0,0,.16)" stroke-width=".8"/></pattern>`);
  out.push('</defs>');

  // nadadeira caudal
  const tc = d.tailColor || finFill, th = d.th;
  let tail;
  if (d.tail === 'forked') tail = `M${f1(xp - 3)},${f1(cy - hp)} C${f1(xp + tl * .35)},${f1(cy - hp - th * .25)} ${f1(xp + tl * .7)},${f1(cy - th * .9)} ${f1(xp + tl)},${f1(cy - th)} C${f1(xp + tl * .8)},${f1(cy - th * .55)} ${f1(xp + tl * .55)},${f1(cy - th * .2)} ${f1(xp + tl * .45)},${cy} C${f1(xp + tl * .55)},${f1(cy + th * .2)} ${f1(xp + tl * .8)},${f1(cy + th * .55)} ${f1(xp + tl)},${f1(cy + th)} C${f1(xp + tl * .7)},${f1(cy + th * .9)} ${f1(xp + tl * .35)},${f1(cy + hp + th * .25)} ${f1(xp - 3)},${f1(cy + hp)}Z`;
  else if (d.tail === 'rounded') tail = `M${f1(xp - 3)},${f1(cy - hp)} C${f1(xp + tl * .3)},${f1(cy - hp - th * .35)} ${f1(xp + tl * .95)},${f1(cy - th * .95)} ${f1(xp + tl)},${cy} C${f1(xp + tl * .95)},${f1(cy + th * .95)} ${f1(xp + tl * .3)},${f1(cy + hp + th * .35)} ${f1(xp - 3)},${f1(cy + hp)}Z`;
  else if (d.tail === 'pointed') tail = `M${f1(xp - 3)},${f1(cy - hp)} C${f1(xp + tl * .4)},${f1(cy - th)} ${f1(xp + tl * .8)},${f1(cy - th * .45)} ${f1(xp + tl)},${cy} C${f1(xp + tl * .8)},${f1(cy + th * .45)} ${f1(xp + tl * .4)},${f1(cy + th)} ${f1(xp - 3)},${f1(cy + hp)}Z`;
  else tail = `M${f1(xp - 3)},${f1(cy - hp)} C${f1(xp + tl * .3)},${f1(cy - hp)} ${f1(xp + tl * .8)},${f1(cy - th)} ${f1(xp + tl)},${f1(cy - th)} C${f1(xp + tl * .92)},${f1(cy - th * .4)} ${f1(xp + tl * .92)},${f1(cy + th * .4)} ${f1(xp + tl)},${f1(cy + th)} C${f1(xp + tl * .8)},${f1(cy + th)} ${f1(xp + tl * .3)},${f1(cy + hp)} ${f1(xp - 3)},${f1(cy + hp)}Z`;
  out.push(`<clipPath id="${id}t"><path d="${tail}"/></clipPath>`);
  out.push(`<path d="${tail}" fill="${tc}" ${finStroke}/>`);
  // raios da cauda
  let rays = '';
  for (let i = -4; i <= 4; i++) rays += `M${f1(xp + 2)},${f1(cy + i * hp * 0.2)} L${f1(xp + tl)},${f1(cy + i * th * 0.24)} `;
  out.push(`<path d="${rays}" stroke="rgba(0,0,0,.18)" stroke-width=".8" fill="none" clip-path="url(#${id}t)"/>`);
  if (d.tailBand) {
    if (sp.id === 'piranha') out.push(`<rect x="${f1(xp + tl * .62)}" y="${cy - th - 4}" width="${f1(tl * .25)}" height="${th * 2 + 8}" fill="${d.tailBand}" opacity=".85" clip-path="url(#${id}t)"/>`);
    else out.push(`<path d="M${f1(xp - 4)},${cy - 4} L${f1(xp + tl * .5)},${cy - 3.5} L${f1(xp + tl * .5)},${cy + 3.5} L${f1(xp - 4)},${cy + 4}Z" fill="${d.tailBand}" clip-path="url(#${id}t)"/>`);
  }
  if ((d.pattern || []).some(p => p.t === 'tailbars')) {
    for (let i = 1; i <= 4; i++) out.push(`<path d="M${f1(xp + tl * i * 0.22)},${cy - th - 2} q4,${th} 0,${th * 2 + 4}" stroke="rgba(0,0,0,.35)" stroke-width="2.5" fill="none" clip-path="url(#${id}t)"/>`);
  }

  // dorsal
  if (d.dorsal) {
    const x1 = xh + L * d.dorsal.x, x2 = x1 + L * d.dorsal.w, h = d.dorsal.h, w = x2 - x1;
    const b1 = topY(x1) + 4, b2 = topY(x2) + 4;
    let p;
    if (d.dorsal.spiny) {
      const spinyEnd = x1 + w * (d.dorsal.split ? 0.38 : 0.62);
      const n = Math.max(5, Math.round((spinyEnd - x1) / 9));
      const step = (spinyEnd - x1) / n;
      p = `M${f1(x1)},${f1(b1)}`;
      for (let i = 0; i < n; i++) {
        const x = x1 + step * i, prof = 0.65 + 0.35 * Math.sin(Math.PI * (i + 0.5) / n * 0.9);
        p += ` L${f1(x + step * 0.45)},${f1(topY(x) - h * prof)} L${f1(x + step)},${f1(topY(x + step) - h * prof * 0.6)}`;
      }
      const vy = d.dorsal.split ? topY(spinyEnd) - h * 0.15 : topY(spinyEnd) - h * 0.55;
      p += ` L${f1(spinyEnd + 3)},${f1(vy)} C${f1(spinyEnd + w * 0.1)},${f1(topY(spinyEnd) - h * 1.05)} ${f1(x2 - w * 0.12)},${f1(topY(x2) - h * 1.1)} ${f1(x2)},${f1(b2)}Z`;
    } else {
      p = `M${f1(x1)},${f1(b1)} C${f1(x1 + w * .05)},${f1(b1 - h * 1.1)} ${f1(x1 + w * .4)},${f1(b1 - h * 1.05)} ${f1(x1 + w * .55)},${f1(b1 - h * .85)} C${f1(x1 + w * .75)},${f1(b1 - h * .55)} ${f1(x2 - w * .1)},${f1(b2 - h * .2)} ${f1(x2)},${f1(b2)}Z`;
    }
    out.push(`<path d="${p}" fill="${finFill}" ${finStroke}/>`);
  }
  if (d.adipose) {
    const x1 = xh + L * d.adipose.x, w = L * d.adipose.w, h = d.adipose.h, b = topY(x1 + w / 2) + 3;
    out.push(`<path d="M${f1(x1)},${f1(topY(x1) + 3)} C${f1(x1 + w * .15)},${f1(b - h * 1.25)} ${f1(x1 + w * .8)},${f1(b - h * 1.2)} ${f1(x1 + w)},${f1(topY(x1 + w) + 3)}Z" fill="${mix(d.back, finFill, .4)}" ${finStroke}/>`);
  }
  if (d.anal) {
    const x1 = xh + L * d.anal.x, x2 = x1 + L * d.anal.w, h = d.anal.h, w = x2 - x1, b1 = botY(x1) - 4, b2 = botY(x2) - 4;
    out.push(`<path d="M${f1(x1)},${f1(b1)} C${f1(x1 + w * .08)},${f1(b1 + h * 1.05)} ${f1(x1 + w * .45)},${f1(b1 + h * 1.05)} ${f1(x1 + w * .6)},${f1(b1 + h * .85)} C${f1(x1 + w * .8)},${f1(b1 + h * .55)} ${f1(x2 - w * .08)},${f1(b2 + h * .2)} ${f1(x2)},${f1(b2)}Z" fill="${finFill}" ${finStroke}/>`);
  }
  if (d.pelvic) {
    const x = xh + L * d.pelvic.x, h = d.pelvic.h, b = botY(x) - 3;
    out.push(`<path d="M${f1(x - 6)},${f1(b)} C${f1(x)},${f1(b + h)} ${f1(x + 16)},${f1(b + h * .95)} ${f1(x + 22)},${f1(b + h * .8)} L${f1(x + 14)},${f1(botY(x + 14) - 3)}Z" fill="${finFill}" ${finStroke}/>`);
  }

  // barbilhões do lado de trás
  if (d.barbels) {
    const bl = d.barbels.len, sw = d.barbels.flat ? 3.4 : 1.6, col = d.barbels.flat ? mix(d.belly, '#555555', .35) : '#3a3a36';
    out.push(`<path d="M${f1(xs + 9)},${f1(sy + 1)} C${f1(xs - 6)},${f1(sy + 14)} ${f1(xs + bl * .25)},${f1(sy + 30)} ${f1(xs + bl * .9)},${f1(sy + 28)}" stroke="${col}" stroke-width="${sw}" fill="none" stroke-linecap="round" opacity=".55"/>`);
  }

  // corpo
  out.push(`<path d="${bodyPath}" fill="url(#${id}g)"/>`);
  // padrões
  const g = [];
  const xl = xh + L * 0.12;
  (d.pattern || []).forEach(pt => {
    if (pt.t === 'spots') {
      for (let i = 0; i < pt.n; i++) {
        const x = xl + R() * (xp - xl), yt = topY(x), yb = botY(x);
        const y = yt + 3 + R() * (yb - yt) * (pt.area || 0.7);
        const r = pt.r[0] + R() * (pt.r[1] - pt.r[0]);
        g.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${pt.c}" opacity=".85"/>`);
      }
    } else if (pt.t === 'bars') {
      const a = pt.from !== undefined ? pt.from : 0.14, b = pt.to !== undefined ? pt.to : 0.98;
      for (let i = 0; i < pt.n; i++) {
        const x = xh + L * (a + (b - a) * (pt.n === 1 ? 0.5 : i / (pt.n - 1)));
        const yt = topY(x) - 2, yb = topY(x) + (botY(x) - topY(x)) * 0.78, wob = pt.wobble || 2;
        const dx = (R() - .5) * wob * 2;
        g.push(`<path d="M${f1(x)},${f1(yt)} C${f1(x + dx + wob)},${f1(yt + (yb - yt) * .35)} ${f1(x - wob + dx)},${f1(yt + (yb - yt) * .65)} ${f1(x + dx * .5)},${f1(yb)}" stroke="${pt.c}" stroke-width="${pt.w}" stroke-linecap="round" fill="none" opacity="${pt.soft ? .5 : .85}"/>`);
      }
    } else if (pt.t === 'blotch') {
      for (let i = 0; i < pt.n; i++) {
        const x = xl + (pt.row ? (i + .5) / pt.n : R()) * (xp - xl), yt = topY(x), yb = botY(x);
        const y = pt.row ? cy - 2 + (R() - .5) * 8 : yt + 4 + R() * (yb - yt) * (pt.area || .7);
        g.push(`<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(5 + R() * 9)}" ry="${f1(4 + R() * 6)}" transform="rotate(${Math.round(R() * 60 - 30)} ${f1(x)} ${f1(y)})" fill="${pt.c}" opacity=".55"/>`);
      }
    } else if (pt.t === 'dashrows') {
      for (let r = 0; r < 7; r++) {
        for (let x = xh + L * 0.18 + (r % 2) * 4; x < xp - 4; x += 8) {
          const yt = topY(x), yb = botY(x), y = yt + (yb - yt) * (0.12 + r * 0.095);
          g.push(`<path d="M${f1(x)},${f1(y)} l3.5,-.8" stroke="${pt.c}" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>`);
        }
      }
    } else if (pt.t === 'band') {
      g.push(`<path d="M${f1(xs + 2)},${f1(sy)} C${f1(xh + L * .3)},${cy - 2} ${f1(xh + L * .7)},${cy} ${f1(xp + 2)},${cy}" stroke="${pt.c}" stroke-width="${pt.w}" fill="none" opacity=".85"/>`);
    } else if (pt.t === 'spots3') {
      [0.4, 0.6, 0.8].forEach((fx, i) => g.push(`<ellipse cx="${f1(xh + L * fx)}" cy="${f1(cy - 2)}" rx="${7 - i}" ry="${8 - i}" fill="${pt.c}" opacity=".82"/>`));
    } else if (pt.t === 'speckle') {
      for (let i = 0; i < pt.n; i++) {
        const x = xl + R() * (xp - xl), yt = topY(x), yb = botY(x), y = yt + 3 + R() * (yb - yt) * 0.6;
        g.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(.8 + R() * 1.1)}" fill="${pt.c}" opacity=".7"/>`);
      }
    } else if (pt.t === 'belly') {
      g.push(`<linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pt.c}" stop-opacity="0"/><stop offset=".5" stop-color="${pt.c}" stop-opacity=".75"/><stop offset="1" stop-color="${pt.c}" stop-opacity=".9"/></linearGradient>`);
      g.push(`<rect x="${f1(xs)}" y="${cy}" width="${f1(xp - xs)}" height="${hb + 10}" fill="url(#${id}b)"/>`);
    } else if (pt.t === 'ocellus') {
      g.push(`<circle cx="${f1(xp - 8)}" cy="${f1(cy - 3)}" r="9" fill="#1d1d14" stroke="#f2c443" stroke-width="2.5"/>`);
    } else if (pt.t === 'pedband') {
      g.push(`<path d="M${f1(xp - L * .14)},${cy} L${f1(xp + 2)},${cy}" stroke="${pt.c}" stroke-width="6" fill="none" opacity=".85"/>`);
    }
  });
  if (d.scales) g.push(`<rect x="${f1(xh + L * .14)}" y="${cy - ht - 4}" width="${f1(L)}" height="${ht + hb + 8}" fill="url(#${id}s)"/>`);
  if (d.lateral) g.push(`<path d="M${f1(xh + L * .17)},${f1(cy - ht * .22)} C${f1(xh + L * .45)},${f1(cy - ht * .28)} ${f1(xh + L * .75)},${f1(cy - 2)} ${f1(xp)},${cy}" stroke="rgba(0,0,0,.28)" stroke-width="1" stroke-dasharray="3 2" fill="none"/>`);
  // opérculo
  const xg = xh + L * (d.head === 'flat' ? 0.18 : 0.15);
  g.push(`<path d="M${f1(xg - 2)},${f1(topY(xg) + 6)} Q${f1(xg + 10)},${cy} ${f1(xg - 2)},${f1(botY(xg) - 5)}" stroke="rgba(0,0,0,.32)" stroke-width="1.4" fill="none"/>`);
  out.push(`<g clip-path="url(#${id}c)">${g.join('')}</g>`);
  out.push(`<path d="${bodyPath}" fill="none" ${stroke}/>`);

  // peitoral
  if (d.pectoral) {
    const big = d.pectoral === 'big' ? 1.5 : 1;
    const px = xg + 6, py = cy + hb * 0.3;
    out.push(`<path d="M${f1(px)},${f1(py)} C${f1(px + 10 * big)},${f1(py + 3)} ${f1(px + 32 * big)},${f1(py + 13 * big)} ${f1(px + 40 * big)},${f1(py + 20 * big)} C${f1(px + 27 * big)},${f1(py + 19 * big)} ${f1(px + 9)},${f1(py + 12)} ${f1(px)},${f1(py + 6)}Z" fill="${finFill}" ${finStroke} opacity=".92"/>`);
  }
  // boca
  const m = d.mouth;
  if (m === 'wide') out.push(`<path d="M${f1(xs + 2)},${f1(sy + 2)} Q${f1(xs + 16)},${f1(sy + 7)} ${f1(xs + 30)},${f1(sy + 5)}" stroke="rgba(20,20,20,.7)" stroke-width="1.6" fill="none"/>`);
  else if (m === 'big' || m === 'teeth') {
    out.push(`<path d="M${f1(xs)},${f1(sy)} Q${f1(xs + 14)},${f1(sy + 7)} ${f1(xs + 28)},${f1(sy + 3)}" stroke="rgba(20,20,20,.7)" stroke-width="1.6" fill="none"/>`);
    if (m === 'teeth') for (let i = 0; i < 4; i++) out.push(`<path d="M${f1(xs + 5 + i * 5)},${f1(sy + 3)} l1.5,3 l1.5,-3" fill="#f4f1e6" stroke="rgba(0,0,0,.4)" stroke-width=".5"/>`);
  } else if (m === 'jaw') {
    out.push(`<path d="M${f1(xs - 3)},${f1(sy + 4)} Q${f1(xs + 10)},${f1(sy + 10)} ${f1(xs + 22)},${f1(sy + 2)}" stroke="rgba(20,20,20,.75)" stroke-width="1.8" fill="none"/>`);
    for (let i = 0; i < 4; i++) out.push(`<path d="M${f1(xs - 1 + i * 5)},${f1(sy + 4 + i * .6)} l1.8,-4 l1.8,4" fill="#f7f4ea" stroke="rgba(0,0,0,.45)" stroke-width=".5"/>`);
  } else if (m === 'up') {
    out.push(`<path d="M${f1(xs - 2)},${f1(sy - 2)} Q${f1(xs + 12)},${f1(sy + 4)} ${f1(xs + 26)},${f1(sy + 1)}" stroke="rgba(20,20,20,.7)" stroke-width="1.6" fill="none"/>`);
    out.push(`<path d="M${f1(xs + 4)},${f1(sy + 1)} l1.5,-6 l1.5,6 M${f1(xs + 12)},${f1(sy + 3)} l1.5,-5 l1.5,5" fill="#f7f4ea" stroke="rgba(0,0,0,.45)" stroke-width=".6"/>`);
  } else if (m === 'under') out.push(`<ellipse cx="${f1(xs + 5)}" cy="${f1(sy + 4)}" rx="5" ry="3" fill="rgba(60,40,40,.55)"/>`);
  else out.push(`<path d="M${f1(xs + 1)},${f1(sy + 1)} q6,3 12,1" stroke="rgba(20,20,20,.7)" stroke-width="1.5" fill="none"/>`);

  // olho
  const ex = xh + d.eye.x, ey = cy - d.eye.y, er = d.eye.r;
  out.push(`<circle cx="${f1(ex)}" cy="${f1(ey)}" r="${er}" fill="${d.eye.iris || '#e9d58f'}" stroke="rgba(0,0,0,.6)" stroke-width="1"/><circle cx="${f1(ex + .3)}" cy="${f1(ey)}" r="${f1(er * .58)}" fill="#111"/><circle cx="${f1(ex - er * .25)}" cy="${f1(ey - er * .3)}" r="${f1(Math.max(.8, er * .2))}" fill="#fff"/>`);

  // barbilhões da frente
  if (d.barbels) {
    const bl = d.barbels.len, sw = d.barbels.flat ? 3.8 : 1.8, col = d.barbels.flat ? mix(d.belly, '#444444', .45) : '#2c2c29';
    out.push(`<path d="M${f1(xs + 7)},${f1(sy + 2)} C${f1(xs - 12)},${f1(sy + 18)} ${f1(xs + bl * .2)},${f1(sy + 42)} ${f1(xs + bl)},${f1(sy + 46)}" stroke="${col}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`);
    if (d.barbels.n >= 3) {
      out.push(`<path d="M${f1(xs + 14)},${f1(sy + 8)} C${f1(xs + 8)},${f1(sy + 20)} ${f1(xs + 18)},${f1(sy + 30)} ${f1(xs + 18 + bl * .22)},${f1(sy + 34)}" stroke="${col}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`);
      out.push(`<path d="M${f1(xs + 20)},${f1(sy + 9)} C${f1(xs + 18)},${f1(sy + 19)} ${f1(xs + 26)},${f1(sy + 26)} ${f1(xs + 28 + bl * .18)},${f1(sy + 28)}" stroke="${col}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".8"/>`);
    }
  }
  const label = opts.label === false ? '' : ` role="img" aria-label="Ilustração: ${sp.nome}"`;
  const yMin = Math.min(cy - ht - (d.dorsal ? d.dorsal.h * 1.12 : 0), cy - th) - 6;
  const yMax = Math.max(cy + hb + (d.anal ? d.anal.h : 0), cy + hb + (d.pelvic ? d.pelvic.h : 0), cy + th, d.barbels ? sy + 48 : 0) + 6;
  const xMin = xs - (d.barbels ? 16 : 6), xMax = xp + tl + 6;
  return `<svg viewBox="${f1(xMin)} ${f1(yMin)} ${f1(xMax - xMin)} ${f1(yMax - yMin)}" class="fish"${label}>${out.join('')}</svg>`;
}

/* ---------- Montagem (diagrama vertical) ---------- */
function wrapTxt(s, n) {
  const words = String(s).split(' '), lines = [];
  let cur = '';
  words.forEach(w => { if ((cur + ' ' + w).trim().length > n && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
  if (cur) lines.push(cur);
  return lines;
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function lureSVG(art, x, y, col) {
  col = col || '#d8a531';
  const dark = mix(col, '#000000', .45), tre = (tx, ty) => `<path d="M${tx},${ty} v6 m-4,0 q0,5 4,5 q4,0 4,-5" class="r-metal" fill="none"/>`;
  const eye = (ex, ey) => `<circle cx="${ex}" cy="${ey}" r="2.2" fill="#fff" stroke="#111" stroke-width=".6"/><circle cx="${ex}" cy="${ey}" r="1.1" fill="#111"/>`;
  switch (art) {
    case 'zara': return `<g><path d="M${x},${y} m0,4 c-9,0 -9,52 0,58 c9,-6 9,-58 0,-58z" fill="${col}" stroke="${dark}" stroke-width="1.2"/><path d="M${x},${y + 4} c-9,0 -9,20 0,22 z" fill="${dark}" opacity=".35"/>${eye(x + 3, y + 12)}${tre(x, y + 26)}${tre(x, y + 60)}</g>`;
    case 'helice': return `<g><path d="M${x},${y + 8} c-8,0 -8,44 0,46 c8,-2 8,-46 0,-46z" fill="${col}" stroke="${dark}" stroke-width="1.2"/><path d="M${x - 9},${y + 6} l18,4 M${x - 9},${y + 58} l18,-4" class="r-metal" stroke-width="2.4"/>${eye(x + 3, y + 16)}${tre(x, y + 32)}${tre(x, y + 58)}</g>`;
    case 'popper': return `<g><path d="M${x - 8},${y + 4} h16 l-4,48 c-2,6 -6,6 -8,0z" fill="${col}" stroke="${dark}" stroke-width="1.2"/><ellipse cx="${x}" cy="${y + 5}" rx="8" ry="3" fill="${dark}"/>${eye(x + 4, y + 13)}${tre(x, y + 28)}${tre(x, y + 54)}</g>`;
    case 'sapo': return `<g><path d="M${x},${y + 4} c-11,0 -13,22 -8,32 c3,6 13,6 16,0 c5,-10 3,-32 -8,-32z" fill="${col}" stroke="${dark}" stroke-width="1.2"/><path d="M${x - 6},${y + 36} c-6,8 -10,14 -14,22 M${x + 6},${y + 36} c6,8 10,14 14,22" stroke="${col}" stroke-width="4" stroke-linecap="round"/>${eye(x - 4, y + 10)}${eye(x + 4, y + 10)}<path d="M${x - 4},${y + 34} q4,8 8,0" class="r-metal" fill="none"/></g>`;
    case 'crank': return `<g><path d="M${x - 6},${y + 6} l12,0 l4,-8 l-20,0z" fill="rgba(200,220,230,.6)" stroke="${dark}" stroke-width="1"/><path d="M${x},${y + 6} c-13,2 -13,40 0,44 c13,-4 13,-42 0,-44z" fill="${col}" stroke="${dark}" stroke-width="1.2"/>${eye(x + 4, y + 14)}${tre(x, y + 30)}${tre(x, y + 50)}</g>`;
    case 'jig': return `<g><circle cx="${x}" cy="${y + 10}" r="7" fill="${dark}" stroke="#111" stroke-width=".8"/>${eye(x + 2, y + 9)}<path d="M${x - 6},${y + 16} c-4,14 -6,30 -2,42 M${x - 3},${y + 16} c-2,14 -2,30 0,44 M${x},${y + 17} c0,14 1,30 3,43 M${x + 3},${y + 16} c3,14 5,30 4,42 M${x + 6},${y + 16} c4,14 7,28 7,40" stroke="${col}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M${x},${y + 16} v30 q0,8 8,8 q6,0 6,-8" class="r-metal" fill="none"/></g>`;
    case 'shad': return `<g><circle cx="${x}" cy="${y + 9}" r="6" fill="${dark}"/><path d="M${x - 6},${y + 12} c-2,16 0,30 2,40 c2,4 6,4 8,0 c2,-10 4,-24 2,-40z" fill="${col}" stroke="${dark}" stroke-width="1"/><path d="M${x},${y + 52} l-8,10 h16z" fill="${col}" stroke="${dark}" stroke-width="1"/>${eye(x + 2, y + 9)}<path d="M${x},${y + 14} v22 q0,6 5,6" class="r-metal" fill="none"/></g>`;
    case 'colher': return `<g><path d="M${x},${y + 6} c-12,6 -12,40 0,48 c12,-8 12,-42 0,-48z" fill="#c9d0d4" stroke="#6c7a80" stroke-width="1.2"/><path d="M${x},${y + 10} c-6,6 -6,32 0,38" stroke="${col}" stroke-width="4" fill="none" opacity=".7"/>${tre(x, y + 54)}</g>`;
    case 'spinner': return `<g><path d="M${x},${y} v52" class="r-metal"/><ellipse cx="${x + 8}" cy="${y + 16}" rx="7" ry="12" transform="rotate(25 ${x + 8} ${y + 16})" fill="#c9d0d4" stroke="#6c7a80"/><rect x="${x - 3}" y="${y + 26}" width="6" height="16" rx="3" fill="${col}" stroke="${dark}"/>${tre(x, y + 52)}</g>`;
    default: return `<g><path d="M${x},${y + 4} c-11,4 -11,44 0,50 c11,-6 11,-46 0,-50z" fill="${col}" stroke="${dark}" stroke-width="1.2"/><path d="M${x - 5},${y + 4} l10,0 l3,-7 l-16,0z" fill="rgba(200,220,230,.6)" stroke="${dark}" stroke-width=".8"/>${eye(x + 3, y + 14)}${tre(x, y + 28)}${tre(x, y + 54)}</g>`;
  }
}
function naturalSVG(ic, x, y) {
  switch (ic) {
    case 'tuvira': return `<path d="M${x + 14},${y + 2} c-10,4 -18,14 -10,24 c8,10 -4,18 -10,26 c-4,6 2,12 6,10" stroke="#7a5a3a" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="${x + 14}" cy="${y + 2}" r="1.5" fill="#111"/>`;
    case 'minhoca': return `<path d="M${x + 6},${y} c-12,8 10,14 -2,24 c-12,10 10,16 -2,26" stroke="#c97a7a" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    case 'fruta': return `<circle cx="${x + 4}" cy="${y + 14}" r="12" fill="#5b2d6e" stroke="#2e1438"/><path d="M${x + 4},${y + 2} v-6" stroke="#4a6b2a" stroke-width="2"/><circle cx="${x}" cy="${y + 10}" r="3" fill="#fff" opacity=".25"/>`;
    case 'massa': return `<path d="M${x - 8},${y + 10} c0,-10 18,-12 20,0 c2,12 -4,16 -10,16 c-8,0 -10,-6 -10,-16z" fill="#e5cf9a" stroke="#a7884a"/>`;
    case 'posta': return `<rect x="${x - 10}" y="${y}" width="22" height="28" rx="5" fill="#e8a7a0" stroke="#9a5a54"/><path d="M${x - 10},${y + 6} h22" stroke="#7c8790" stroke-width="5"/>`;
    case 'peixe': return `<path d="M${x + 2},${y} c-8,4 -8,30 0,36 c8,-6 8,-32 0,-36z" fill="#b9c4c8" stroke="#6c7a80"/><path d="M${x + 2},${y + 36} l-6,10 h12z" fill="#b9c4c8" stroke="#6c7a80"/><circle cx="${x + 3}" cy="${y + 7}" r="1.6" fill="#111"/>`;
    case 'caranguejo': return `<ellipse cx="${x + 2}" cy="${y + 14}" rx="13" ry="10" fill="#b5653a" stroke="#6d371c"/><path d="M${x - 11},${y + 10} l-8,-6 M${x - 11},${y + 16} l-9,2 M${x + 15},${y + 10} l8,-6 M${x + 15},${y + 16} l9,2" stroke="#6d371c" stroke-width="2"/>`;
    case 'milho': return `<circle cx="${x}" cy="${y + 6}" r="5" fill="#f2c94c" stroke="#b08a1e"/><circle cx="${x + 6}" cy="${y + 15}" r="5" fill="#f2c94c" stroke="#b08a1e"/><circle cx="${x}" cy="${y + 24}" r="5" fill="#f2c94c" stroke="#b08a1e"/>`;
    case 'coracao': return `<path d="M${x - 8},${y + 4} c4,-6 18,-6 20,4 c2,12 -8,20 -10,22 c-4,-4 -14,-12 -10,-26z" fill="#8c1f2a" stroke="#4d0f16"/>`;
    default: return '';
  }
}
function hookSVG(model, x, y) {
  if (model === 'circular') return `<path d="M${x},${y} v18 c0,22 26,22 26,4 c0,-10 -10,-12 -14,-6" class="r-metal" fill="none" stroke-width="2.6" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="3" class="r-metal" fill="none"/>`;
  if (model === 'maruseigo') return `<path d="M${x},${y} v12 c0,20 22,20 22,2 v-6" class="r-metal" fill="none" stroke-width="2.6" stroke-linecap="round"/><path d="M${x + 22},${y + 8} l-4,4" class="r-metal" stroke-width="2"/><circle cx="${x}" cy="${y}" r="3" class="r-metal" fill="none"/>`;
  if (model === 'haste') return `<path d="M${x},${y} v32 c0,18 20,18 20,2 v-6" class="r-metal" fill="none" stroke-width="2.6" stroke-linecap="round"/><path d="M${x + 20},${y + 28} l-4,4" class="r-metal" stroke-width="2"/><circle cx="${x}" cy="${y}" r="3" class="r-metal" fill="none"/>`;
  return `<path d="M${x},${y} v20 c0,20 24,20 24,2 v-6" class="r-metal" fill="none" stroke-width="2.6" stroke-linecap="round"/><path d="M${x + 24},${y + 16} l-4,4" class="r-metal" stroke-width="2"/><circle cx="${x}" cy="${y}" r="3" class="r-metal" fill="none"/>`;
}

function rigPartes(rigId, spec, isca, variante) {
  const vara = spec.vara, reel = spec.reel;
  const varaSub = fmtN(vara.comp[0]) + '–' + fmtN(vara.comp[1]) + ' m · ' + vara.lb[0] + '–' + vara.lb[1] + ' lb · ' + (vara.acao === 'rapida' ? 'ação rápida' : 'ação moderada');
  const parts = [{ k: 'vara', t: 'Vara e ' + (variante === 'molinete' ? 'molinete' : 'carretilha'), s: varaSub + ' · ' + reel.txt }];
  const linha = { k: 'linha', t: 'Linha principal', s: spec.linha.txt, tipo: spec.linha.tipo };
  const lider = spec.lider.tipo === 'aco' ? { k: 'aco', t: 'Empate de aço', s: spec.lider.txt } : { k: 'lider', t: 'Líder', s: spec.lider.txt };
  const no = (id) => { const n = NOS.find(x => x.id === id); return { k: 'no', t: 'Nó ' + n.nome, s: n.uso, no: id }; };
  const ch = spec.chumbada;
  const chumb = ch ? { k: ch.tipo === 'chata' ? 'chata' : ch.tipo === 'chumbinho' ? 'chumbinho' : 'oliva', t: ch.tipo === 'chumbinho' ? 'Chumbinho' : 'Chumbada ' + (ch.tipo === 'chata' ? 'chata' : 'oliva'), s: ch.txtAjustado || ch.txt } : null;
  const anz = spec.anzol ? { k: 'anzol', t: 'Anzol', s: spec.anzol.txt, modelo: spec.anzol.modelo } : null;
  const iscaP = { k: 'isca', t: 'Isca', s: isca.nome, isca };
  const out = [];
  switch (rigId) {
    case 'art-lider': out.push(parts[0], linha, no(spec.nos[0]), lider, no(spec.nos[1] || 'loop'), iscaP); break;
    case 'art-aco': out.push(parts[0], linha, no('fg'), lider, iscaP); break;
    case 'fundo-corrida': case 'fundo-pesado':
      out.push(parts[0], linha, chumb, { k: 'micanga', t: 'Miçanga', s: 'Protege o nó do girador' }, { k: 'girador', t: 'Girador com rolamento', s: 'Evita torção da linha' }, lider, no('palomar'), anz, iscaP); break;
    case 'fruta': out.push(parts[0], linha, Object.assign({}, chumb, { s: chumb.s + ' · tire na fruta batida' }), { k: 'girador', t: 'Girador', s: 'Separa linha e líder' }, lider, no('palomar'), anz, iscaP); break;
    case 'boia': out.push(parts[0], linha, { k: 'boia', t: 'Boia', s: 'Isca a um palmo do fundo' }, chumb, { k: 'girador', t: 'Girador pequeno', s: 'nº 8–10' }, lider, no('palomar'), anz, iscaP); break;
    case 'piranha': out.push(parts[0], linha, chumb, { k: 'girador', t: 'Girador', s: 'Antes do empate' }, lider, anz, iscaP); break;
    case 'viva': out.push(parts[0], linha, no('fg'), lider, chumb && Object.assign({}, chumb, { s: chumb.s }), { k: 'girador', t: 'Girador', s: 'Deixa a isca viva girar' }, anz, iscaP); break;
    case 'viva-aco': out.push(parts[0], linha, chumb, { k: 'girador', t: 'Girador', s: 'Antes do empate' }, lider, anz, iscaP); break;
    default: out.push(parts[0], linha, iscaP);
  }
  return out.filter(Boolean);
}

function rigSVG(rigId, spec, isca, variante, corIsca) {
  const parts = rigPartes(rigId, spec, isca, variante);
  const H = { vara: 64, linha: 56, no: 22, lider: 48, aco: 44, oliva: 40, chata: 30, chumbinho: 18, micanga: 14, girador: 30, boia: 58, anzol: 50, isca: 66 };
  const cx = 52, lx = 118;
  let y = 8;
  const g = [], labels = [];
  const lineCls = (k) => ['lider', 'no', 'anzol', 'boia', 'chumbinho', 'girador'].includes(k) ? 'r-l2' : (k === 'aco' ? 'r-metal' : 'r-l1');
  parts.forEach((p, i) => {
    const lines = wrapTxt(p.s, 34).slice(0, 3);
    const H0 = H[p.k] || 40;
    const h = Math.max(H0, 24 + lines.length * 13);
    const off = p.k === 'vara' || p.k === 'isca' ? 0 : Math.round((h - H0) / 2);
    const mid = y + h / 2;
    // trechos de linha que preenchem o espaço extra
    if (off > 0) {
      const c = lineCls(p.k);
      g.push(`<path d="M${cx},${y} V${y + off} M${cx},${y + off + H0} V${y + h}" class="${c}" stroke-width="2.2"/>`);
    }
    const Y = y + off, ym = Y + H0 / 2;
    switch (p.k) {
      case 'vara': g.push(`<path d="M4,${Y} L${cx},${Y + H0 - 10}" class="r-rod" stroke-width="5" stroke-linecap="round"/><circle cx="${cx}" cy="${Y + H0 - 8}" r="4" class="r-metal" fill="none" stroke-width="2"/><path d="M${cx},${Y + H0 - 4} V${y + h}" class="r-l1" stroke-width="2.2"/>`); break;
      case 'linha': g.push(`<path d="M${cx},${Y} V${Y + H0}" class="${p.tipo === 'multi' ? 'r-l1' : 'r-l2'}" stroke-width="2.2"/>`); break;
      case 'no': g.push(`<path d="M${cx},${Y} V${Y + H0}" class="r-l2" stroke-width="2.2"/><rect x="${cx - 5}" y="${Y + 6}" width="10" height="10" rx="3" class="r-knot"/>`); break;
      case 'lider': g.push(`<path d="M${cx},${Y} V${Y + H0}" class="r-l2" stroke-width="2.4"/>`); break;
      case 'aco': g.push(`<path d="M${cx},${Y} V${Y + H0 - 10}" class="r-metal" stroke-width="2"/><path d="M${cx},${Y + H0 - 10} q-5,4 0,10 q5,-4 0,-10" class="r-metal" fill="none" stroke-width="1.6"/>`); break;
      case 'oliva': g.push(`<path d="M${cx},${Y} V${Y + H0}" class="r-l1" stroke-width="2.2"/><ellipse cx="${cx}" cy="${ym}" rx="8" ry="15" class="r-lead"/>`); break;
      case 'chata': g.push(`<path d="M${cx},${Y} V${Y + H0}" class="r-l1" stroke-width="2.2"/><rect x="${cx - 12}" y="${ym - 8}" width="24" height="16" rx="5" class="r-lead"/>`); break;
      case 'chumbinho': g.push(`<path d="M${cx},${Y} V${Y + H0}" class="r-l2" stroke-width="2"/><circle cx="${cx}" cy="${ym}" r="5" class="r-lead"/>`); break;
      case 'micanga': g.push(`<path d="M${cx},${Y} V${Y + H0}" class="r-l1" stroke-width="2.2"/><circle cx="${cx}" cy="${ym}" r="4.5" class="r-bead"/>`); break;
      case 'girador': g.push(`<circle cx="${cx}" cy="${Y + 5}" r="4" class="r-metal" fill="none" stroke-width="2"/><rect x="${cx - 4}" y="${Y + 10}" width="8" height="10" rx="3" class="r-metalf"/><circle cx="${cx}" cy="${Y + 25}" r="4" class="r-metal" fill="none" stroke-width="2"/>`); break;
      case 'boia': g.push(`<path d="M${cx},${Y} V${Y + H0}" class="r-l2" stroke-width="2"/><path d="M${cx},${Y + 2} v8" class="r-ink" stroke-width="2"/><path d="M${cx - 11},${Y + 26} c0,-14 22,-14 22,0z" class="r-float"/><path d="M${cx - 11},${Y + 26} c0,18 22,18 22,0z" class="r-floatb"/>`); break;
      case 'anzol': g.push(`<path d="M${cx},${Y} V${Y + 6}" class="r-l2" stroke-width="2.2"/>` + hookSVG(p.modelo, cx, Y + 8)); break;
      case 'isca': g.push(`<path d="M${cx},${Y} V${Y + 6}" class="${rigId.startsWith('art') ? 'r-metal' : 'r-l2'}" stroke-width="2"/>` + (p.isca.tipo === 'artificial' ? lureSVG(p.isca.art, cx, Y + 4, corIsca) : naturalSVG(p.isca.ic, cx + (p.isca.ic === 'tuvira' ? -4 : 6), Y + 2))); break;
    }
    const ty = mid - (lines.length * 13) / 2 + 2;
    labels.push(`<path d="M${cx + 16},${f1(mid)} H${lx - 6}" class="r-lead-line"/>` +
      `<text x="${lx}" y="${f1(ty)}" class="r-t">${esc(p.t)}</text>` +
      lines.map((l, j) => `<text x="${lx}" y="${f1(ty + 14 + j * 13)}" class="r-s">${esc(l)}</text>`).join(''));
    y += h;
  });
  const total = y + 10;
  return `<svg viewBox="0 0 360 ${total}" class="rig" role="img" aria-label="Diagrama da montagem">${g.join('')}${labels.join('')}</svg>`;
}

/* ---------- Nós (3 passos cada) ---------- */
function knotStep(id, step) {
  const ringBack = `<path d="M4,55 H26" class="k-metal" stroke-width="4" stroke-linecap="round"/><circle cx="36" cy="55" r="9" class="k-metal" fill="none" stroke-width="3.5"/>`;
  const ringFront = `<path d="M36,46 A9,9 0 0 1 36,64" class="k-metal" fill="none" stroke-width="3.5"/>`;
  const ln = (d, c) => `<path d="${d}" class="${c || 'k-a'}" fill="none"/>`;
  const dbl = (d) => `<path d="${d}" class="k-dbl-o" fill="none"/><path d="${d}" class="k-dbl-i" fill="none"/>`;
  const dot = (x, y, c) => `<circle cx="${x}" cy="${y}" r="3" class="${c || 'k-dot'}"/>`;
  const coil = (x1, x2, y, n, ry, c) => { let s = ''; for (let i = 0; i < n; i++) { const x = x1 + (x2 - x1) * (n === 1 ? 0 : i / (n - 1)); s += `<ellipse cx="${f1(x)}" cy="${y}" rx="3" ry="${ry}" transform="rotate(14 ${f1(x)} ${y})" class="${c || 'k-a'}" fill="none"/>`; } return s; };
  const arrow = (d) => `<path d="${d}" class="k-arrow" fill="none" marker-end="url(#kh)"/>`;
  const blob = (x1, x2, y, c) => `<rect x="${x1}" y="${y - 6}" width="${x2 - x1}" height="12" rx="5" class="${c || 'k-blob'}"/>`;
  let s = '';
  const K = id + step;
  switch (K) {
    case 'palomar1': s = ringBack + ln('M250,50 L24,50 C12,50 12,60 24,60 L250,60') + ringFront + arrow('M150,36 L70,36'); break;
    case 'palomar2': s = ringBack + dbl('M250,54 L150,54 C118,54 108,24 132,22 C156,20 158,58 126,62 L46,58') + ringFront + dbl('M30,56 C20,58 14,74 26,90 C38,104 66,100 72,86') + arrow('M80,96 C120,104 30,110 14,80'); break;
    case 'palomar3': s = ringBack + ringFront + blob(46, 66, 55) + ln('M66,55 L250,55') + ln('M60,60 L74,70', 'k-b') + dot(74, 70); break;
    case 'clinch1': s = ringBack + ln('M250,58 L30,58') + ringFront + ln('M30,52 C40,46 58,46 70,52', 'k-b') + coil(74, 150, 56, 7, 9, 'k-b') + ln('M152,50 C160,40 170,36 182,34', 'k-b') + dot(182, 34); break;
    case 'clinch2': s = ringBack + ln('M250,58 L30,58') + ringFront + ln('M30,52 C40,46 58,46 70,52', 'k-b') + coil(74, 150, 56, 7, 9, 'k-b') + ln('M152,50 C160,22 70,20 50,54', 'k-b') + dot(50, 54) + arrow('M54,66 C80,90 140,90 160,70'); break;
    case 'clinch3': s = ringBack + ringFront + coil(48, 76, 55, 6, 7, 'k-b') + ln('M78,55 L250,55') + ln('M48,49 L56,40', 'k-b') + dot(56, 40); break;
    case 'uni1': s = ringBack + ln('M250,60 L22,60 C12,60 12,50 22,50 L160,50 C200,50 205,18 175,16 C142,14 132,40 128,58', 'k-b') + ln('M250,60 L40,60') + ringFront + dot(128, 58); break;
    case 'uni2': s = ringBack + ln('M250,60 L22,60 C12,60 12,50 22,50 L160,50 C200,50 205,18 175,16 C150,14 152,40 150,52', 'k-b') + ln('M250,60 L40,60') + coil(84, 148, 55, 6, 11, 'k-b') + ringFront + ln('M82,56 L66,62', 'k-b') + dot(66, 62); break;
    case 'uni3': s = ringBack + ringFront + coil(46, 72, 55, 6, 7, 'k-b') + ln('M74,55 L250,55') + ln('M46,49 L40,38', 'k-b') + dot(40, 38); break;
    case 'fg1': {
      let z = 'M0,50 L84,50'; for (let i = 0; i < 12; i++) { const x = 84 + i * 10; z += ` L${x + 5},${i % 2 ? 46 : 64} L${x + 10},${i % 2 ? 64 : 46}`; }
      let over = ''; for (let i = 0; i < 12; i += 2) over += `<path d="M${84 + i * 10 + 2},56 h6" class="k-c" />`;
      s = ln('M60,56 L258,56', 'k-c') + ln(z) + over + arrow('M120,90 L200,90') + dot(258, 56, 'k-dot2'); break;
    }
    case 'fg2': {
      let z = 'M0,50 L84,50'; for (let i = 0; i < 12; i++) { const x = 84 + i * 10; z += ` L${x + 5},${i % 2 ? 50 : 62} L${x + 10},${i % 2 ? 62 : 50}`; }
      s = ln('M60,56 L258,56', 'k-c') + ln(z) + `<ellipse cx="216" cy="56" rx="5" ry="10" class="k-a" fill="none"/><ellipse cx="228" cy="56" rx="5" ry="10" class="k-a" fill="none"/>` + ln('M232,50 L246,36') + dot(246, 36); break;
    }
    case 'fg3': s = ln('M0,55 L96,55') + `<path d="M96,51 L196,53 L196,57 L96,59 Z" class="k-blob"/>` + ln('M196,55 L258,55', 'k-c') + ln('M92,52 L84,44') + dot(84, 44); break;
    case 'albright1': s = ln('M250,44 L92,44 C68,44 68,66 92,66 L250,66', 'k-c') + ln('M0,55 L196,55 C206,55 210,46 202,40') + dot(202, 40) + arrow('M190,26 L110,26'); break;
    case 'albright2': s = ln('M250,44 L92,44 C68,44 68,66 92,66 L250,66', 'k-c') + ln('M0,55 L196,55') + coil(108, 192, 55, 11, 15) + ln('M106,56 C90,56 74,58 60,66') + dot(60, 66); break;
    case 'albright3': s = ln('M0,55 L94,55') + `<path d="M94,51 L156,50 L156,60 L94,59 Z" class="k-blob"/>` + ln('M156,55 L258,55', 'k-c') + ln('M152,61 L160,70', 'k-c') + dot(160, 70, 'k-dot2') + ln('M96,52 L88,44') + dot(88, 44); break;
    case 'loop1': s = ringBack + ln('M250,55 L160,55 C138,55 128,30 146,28 C164,26 168,58 150,62 L30,58') + ringFront + ln('M30,52 C46,40 110,44 142,48', 'k-b') + dot(142, 48) + arrow('M100,24 L150,24'); break;
    case 'loop2': s = ringBack + ln('M250,55 L160,55 C138,55 128,30 146,28 C164,26 168,58 150,62 L30,58') + ringFront + ln('M30,52 C46,40 110,44 158,50', 'k-b') + coil(166, 204, 55, 4, 9, 'k-b') + ln('M206,48 L214,40', 'k-b') + dot(214, 40); break;
    case 'loop3': s = ringBack + ringFront + ln('M44,51 C58,38 86,40 98,51') + ln('M44,59 C58,72 86,70 98,59') + blob(98, 120, 55) + ln('M120,55 L250,55') + ln('M114,49 L122,40', 'k-b') + dot(122, 40); break;
  }
  return `<svg viewBox="0 0 260 112" class="knot" role="img" aria-label="Passo ${step}"><defs><marker id="kh" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="k-arrowhead"/></marker></defs>${s}</svg>`;
}
