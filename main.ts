// THISTLEWADE — a travel poster for a marsh town built on stilts, where the
// lilies grow large enough to moor a boat to. One file, painted pixel by
// pixel: dawn gradient, mist, stilt houses with lantern light, a heron,
// and water full of pads in the foreground.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const PW = 768;
const PH = 1024;
const canvas = new Uint8Array(PW * PH * 3);

let state = 777001;
function next() {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state / 4294967296;
}
function C(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function lerpC(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function paint(x, y, c, a) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= PW || y >= PH) return;
  const i = (y * PW + x) * 3;
  canvas[i] = canvas[i] * (1 - a) + c[0] * a;
  canvas[i + 1] = canvas[i + 1] * (1 - a) + c[1] * a;
  canvas[i + 2] = canvas[i + 2] * (1 - a) + c[2] * a;
}
function fillSky(stops) {
  for (let y = 0; y < PH; y++) {
    let s = 0;
    while (s < stops.length - 2 && y > stops[s + 1][0]) s++;
    const t = Math.min(1, Math.max(0, (y - stops[s][0]) / (stops[s + 1][0] - stops[s][0])));
    const c = lerpC(stops[s][1], stops[s + 1][1], t);
    for (let x = 0; x < PW; x++) {
      const i = (y * PW + x) * 3;
      canvas[i] = c[0]; canvas[i + 1] = c[1]; canvas[i + 2] = c[2];
    }
  }
}
function round(cx, cy, r, c, a) {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    const half = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
    for (let x = Math.floor(cx - half); x <= cx + half; x++) paint(x, y, c, a);
  }
}
function flat(cx, cy, rx, ry, c, a) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
    const t = (y - cy) / ry;
    const half = rx * Math.sqrt(Math.max(0, 1 - t * t));
    for (let x = Math.floor(cx - half); x <= cx + half; x++) paint(x, y, c, a);
  }
}
function soft(cx, cy, rx, ry, c, a) {
  for (let k = 5; k >= 1; k--) flat(cx, cy, (rx * k) / 5, (ry * k) / 5, c, a / 3);
}
function area(pts, c, a) {
  let lo = Infinity, hi = -Infinity;
  for (const p of pts) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }
  for (let y = Math.floor(lo); y <= hi; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      if ((p[1] <= y && q[1] > y) || (q[1] <= y && p[1] > y)) xs.push(p[0] + ((y - p[1]) / (q[1] - p[1])) * (q[0] - p[0]));
    }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2)
      for (let x = Math.floor(xs[i]); x <= xs[i + 1]; x++) paint(x, y, c, a);
  }
}
function line(x0, y0, x1, y1, w, c, a) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.ceil(d / (w * 0.3)));
  for (let i = 0; i <= n; i++) round(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, w / 2, c, a);
}
function block(x, y, w, h, c, a) {
  for (let j = Math.floor(y); j < y + h; j++)
    for (let i = Math.floor(x); i < x + w; i++) paint(i, j, c, a);
}

// Stroke letters on a 4x6 grid, drawn by hand for this poster.
const LETTERS = {
  A: [[[0, 6], [2, 0], [4, 6]], [[1.1, 4.1], [2.9, 4.1]]],
  B: [[[0, 0], [0, 6]], [[0, 0], [2.6, 0], [3.7, 1], [2.6, 2.1], [0, 2.1]], [[0, 2.1], [2.9, 2.1], [3.9, 3.6], [2.9, 6], [0, 6]]],
  C: [[[4, 1.4], [2.7, 0.1], [0.9, 0.7], [0, 3], [0.9, 5.3], [2.7, 5.9], [4, 4.6]]],
  D: [[[0, 0], [0, 6]], [[0, 0], [2.4, 0], [4, 1.9], [4, 4.1], [2.4, 6], [0, 6]]],
  E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3.1, 3]]],
  F: [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3.1, 3]]],
  G: [[[4, 1.4], [2.7, 0.1], [0.9, 0.7], [0, 3], [0.9, 5.3], [2.7, 5.9], [4, 5.9], [4, 3.7], [2.5, 3.7]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  I: [[[2, 0], [2, 6]], [[0.6, 0], [3.4, 0]], [[0.6, 6], [3.4, 6]]],
  J: [[[4, 0], [4, 4.5], [3.1, 5.8], [1.3, 6], [0.3, 4.9]]],
  K: [[[0, 0], [0, 6]], [[4, 0], [0.7, 3.1]], [[1.3, 2.5], [4, 6]]],
  L: [[[0, 0], [0, 6], [4, 6]]],
  M: [[[0, 6], [0, 0], [2, 3.4], [4, 0], [4, 6]]],
  N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
  O: [[[2, 0], [3.6, 0.7], [4, 3], [3.6, 5.3], [2, 6], [0.4, 5.3], [0, 3], [0.4, 0.7], [2, 0]]],
  P: [[[0, 6], [0, 0], [3, 0], [4, 1.1], [3, 2.5], [0, 2.5]]],
  Q: [[[2, 0], [3.6, 0.7], [4, 3], [3.6, 5.3], [2, 6], [0.4, 5.3], [0, 3], [0.4, 0.7], [2, 0]], [[2.7, 4.3], [4.3, 6.3]]],
  R: [[[0, 6], [0, 0], [3, 0], [4, 1.1], [3, 2.5], [0, 2.5]], [[2.1, 2.5], [4, 6]]],
  S: [[[4, 0.9], [2.7, 0], [0.9, 0.6], [0.5, 1.9], [2, 2.9], [3.4, 3.7], [3.6, 5], [2.4, 6], [0.3, 5.3]]],
  T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  U: [[[0, 0], [0, 4.3], [0.8, 5.6], [2, 6], [3.2, 5.6], [4, 4.3], [4, 0]]],
  V: [[[0, 0], [2, 6], [4, 0]]],
  W: [[[0, 0], [0.8, 6], [2, 2.7], [3.2, 6], [4, 0]]],
  X: [[[0, 0], [4, 6]], [[4, 0], [0, 6]]],
  Y: [[[0, 0], [2, 2.8], [4, 0]], [[2, 2.8], [2, 6]]],
  Z: [[[0, 0], [4, 0], [0, 6], [4, 6]]],
  " ": [],
};
function headline(text, cx, y, size, c, a, track) {
  const s = size / 6;
  const w = Math.max(2.4, size * 0.17);
  let x = cx - (text.length * 5 * s + (text.length - 1) * track * s) / 2;
  for (const ch of text.toUpperCase()) {
    for (const st of LETTERS[ch] || [])
      for (let i = 0; i + 1 < st.length; i++)
        line(x + st[i][0] * s, y + st[i][1] * s, x + st[i + 1][0] * s, y + st[i + 1][1] * s, w, c, a);
    x += 5 * s + track * s;
  }
}

// ---- Dawn over the marsh: sky, water, the town between ----
fillSky([
  [0, C("#f7d774")],
  [210, C("#f2b880")],
  [430, C("#c9cf8e")],
  [560, C("#8fae7d")],
  [700, C("#5d8a72")],
  [1024, C("#2e5d4b")],
]);

// The sun, low and pale, half sunk behind the reed line.
soft(560, 470, 150, 150, C("#ffe9a8"), 0.5);
round(560, 470, 62, C("#fff3c4"), 1);

// Far reed beds: two soft dark bands on the horizon.
for (let i = 0; i < 90; i++) {
  const x = next() * PW;
  const h = 26 + next() * 40;
  line(x, 566, x + (next() - 0.5) * 8, 566 - h, 3, C("#4a7355"), 0.75);
}
block(0, 556, PW, 14, C("#4a7355"), 0.55);

// Water sheen under the sun: broken horizontal glints.
for (let i = 0; i < 130; i++) {
  const y = 600 + next() * 380;
  const x = 380 + next() * 360 + (y - 600) * (next() - 0.5) * 0.4;
  const len = 12 + next() * 44 * (1 - (y - 600) / 700);
  line(x, y, x + len, y, 2.4, C("#ffe9a8"), 0.28);
}

// A stilt house: legs in the water, plank walls, a steep thatch roof,
// one warm window and a lantern on a pole by its little dock.
function stiltHouse(cx, baseY, s, wallC, roofC) {
  for (const dx of [-0.42, -0.14, 0.14, 0.42])
    line(cx + dx * s, baseY + s * 0.62, cx + dx * s * 1.1, baseY + s * 1.35, s * 0.07, C("#4c3a28"), 1);
  block(cx - s * 0.5, baseY, s, s * 0.62, wallC, 1);
  area([[cx - s * 0.66, baseY + 2], [cx + s * 0.66, baseY + 2], [cx, baseY - s * 0.72]], roofC, 1);
  block(cx - s * 0.13, baseY + s * 0.2, s * 0.26, s * 0.26, C("#ffca66"), 1);
  line(cx - s * 0.72, baseY + s * 0.5, cx - s * 0.72, baseY - s * 0.3, 3, C("#4c3a28"), 1);
  soft(cx - s * 0.72, baseY - s * 0.38, 13, 13, C("#ffca66"), 0.75);
  round(cx - s * 0.72, baseY - s * 0.38, 4.4, C("#fff3d0"), 1);
  block(cx - s * 0.95, baseY + s * 0.6, s * 1.9, s * 0.07, C("#6b4e30"), 0.9);
}
stiltHouse(150, 560, 92, C("#a8763e"), C("#5d4630"));
stiltHouse(330, 520, 118, C("#b98a4e"), C("#4f3a28"));
stiltHouse(520, 552, 84, C("#9c6c38"), C("#5d4630"));
stiltHouse(664, 528, 100, C("#b08248"), C("#463322"));

// A walkway strung between the houses, with lantern posts along it.
line(196, 596, 640, 580, 5, C("#6b4e30"), 0.95);
for (const lx of [250, 392, 520, 618]) {
  const ly = 592 - (lx - 196) * 0.036;
  line(lx, ly, lx, ly - 34, 3, C("#4c3a28"), 1);
  soft(lx, ly - 40, 14, 14, C("#ffca66"), 0.7);
  round(lx, ly - 40, 4.6, C("#fff3d0"), 1);
  flat(lx, ly + 66, 22, 5, C("#ffca66"), 0.16); // lantern light on the water
}

// The heron, standing in the shallows at left, neck in its question mark.
const HERON = C("#33526b");
line(96, 700, 92, 782, 4, HERON, 1);
line(112, 700, 118, 782, 4, HERON, 1);
flat(104, 676, 34, 17, HERON, 1);
area([[128, 664], [158, 640], [166, 626], [158, 618], [138, 636], [120, 656]], HERON, 1);
line(162, 624, 188, 630, 3.4, C("#e8a33c"), 1);
round(156, 622, 3.2, C("#0e2233"), 1);
area([[84, 668], [58, 690], [86, 690]], HERON, 0.9);

// Mist: three long breaths of it lying across the middle of the marsh.
for (const [my, ma] of [[500, 0.20], [618, 0.26], [716, 0.18]]) {
  for (let i = 0; i < 16; i++) {
    const x = (i / 15) * (PW + 160) - 80 + next() * 40;
    soft(x, my + (next() - 0.5) * 18, 90 + next() * 80, 15, C("#fdf6dd"), ma);
  }
}

// Giant lily pads in the foreground water, one carrying a pink bloom.
function pad(cx, cy, r, c) {
  flat(cx, cy, r, r * 0.30, c, 1);
  flat(cx, cy - r * 0.03, r * 0.94, r * 0.26, lerpC(c, C("#cfe08a"), 0.4), 0.8);
  // the notch every lily pad wears
  area([[cx + r * 0.3, cy - r * 0.05], [cx + r * 1.02, cy - r * 0.2], [cx + r * 1.02, cy + r * 0.16]], C("#2e5d4b"), 0.85);
  for (let v = 0; v < 5; v++) {
    const ang = (v / 5) * Math.PI * 2 + 0.4;
    line(cx, cy, cx + Math.cos(ang) * r * 0.8, cy + Math.sin(ang) * r * 0.2, 1.8, lerpC(c, C("#eef3c0"), 0.5), 0.5);
  }
}
pad(120, 872, 118, C("#4d7d43"));
pad(330, 928, 150, C("#557f45"));
pad(560, 876, 104, C("#47743d"));
pad(700, 952, 128, C("#527c42"));
pad(40, 972, 96, C("#3f6d38"));
// The bloom: layered petals around a gold heart.
const BC = C("#f2a7c3");
for (const [dx, dy, r] of [[-16, 4, 13], [16, 4, 13], [0, -10, 14], [-9, 12, 11], [9, 12, 11]]) {
  flat(330 + dx, 884 + dy, r, r * 1.25, BC, 0.95);
  flat(330 + dx, 884 + dy, r * 0.55, r * 0.7, lerpC(BC, C("#ffffff"), 0.45), 0.8);
}
round(330, 890, 6.4, C("#ffca66"), 1);

// Dragonflies over the pads.
for (let i = 0; i < 6; i++) {
  const dx = 80 + next() * 600, dy = 760 + next() * 120;
  line(dx - 9, dy - 4, dx + 9, dy + 2, 2, C("#274b63"), 0.8);
  flat(dx - 6, dy - 6, 7, 3, C("#dff3ff"), 0.55);
  flat(dx + 6, dy - 6, 7, 3, C("#dff3ff"), 0.55);
}

// The name across the dawn sky, cream on gold-green.
headline("THISTLEWADE", PW / 2 + 3, 66, 62, C("#7a4a21"), 0.5, 0.3);
headline("THISTLEWADE", PW / 2, 62, 62, C("#fff8e2"), 1, 0.3);

// ---- PNG: Up-filtered rows, zlib, out the door ----
const TAB = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  TAB[n] = c >>> 0;
}
function crcOf(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TAB[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function seg2(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crcOf(body));
  return Buffer.concat([len, body, sum]);
}
function toPNG() {
  const stride = PW * 3;
  const raw = Buffer.alloc((stride + 1) * PH);
  for (let y = 0; y < PH; y++) {
    const row = y * (stride + 1);
    raw[row] = 2; // Up filter
    for (let i = 0; i < stride; i++) {
      const up = y > 0 ? canvas[(y - 1) * stride + i] : 0;
      raw[row + 1 + i] = (canvas[y * stride + i] - up) & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(PW, 0);
  ihdr.writeUInt32BE(PH, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    seg2("IHDR", ihdr),
    seg2("IDAT", deflateSync(raw, { level: 9 })),
    seg2("IEND", Buffer.alloc(0)),
  ]);
}
const target = process.env.ENTRY_OUT || "/output/entry.png";
try { mkdirSync(target.slice(0, target.lastIndexOf("/")), { recursive: true }); } catch { /* provided */ }
writeFileSync(target, toPNG());
console.log("THISTLEWADE poster written to", target);
