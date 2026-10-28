// Renders the Where Are They brand kit: site icons, YouTube and X images.
// node brand/build.mjs  (drives the locally installed Chrome so the IBM Plex wordmark matches the site)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import mark from './mark.mjs';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, 'out');
const SITE = path.join(ROOT, '..', 'site');
const BG = '#090c0f', ACCENT = '#6fcfbf', TEXT = '#d6dfe2', MUTED = '#7a8a92';

const svg = (opts = {}, size = '100%') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}" color="${opts.color || ACCENT}">${mark(opts)}</svg>`;

// a faint field of joined-up points behind the banners (seeded, so every build is the same)
function field(w, h, n, seed, keepOut) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const pts = [];
  while (pts.length < n) {
    const p = [rnd() * w, rnd() * h, rnd()];
    if (keepOut && Math.abs(p[0] - keepOut[0]) < keepOut[2] && Math.abs(p[1] - keepOut[1]) < keepOut[3]) continue;
    pts.push(p);
  }
  const reach = Math.min(w, h) * 0.22;
  let lines = '';
  pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
    const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (d < reach) lines += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke-opacity="${(0.16 * (1 - d / reach)).toFixed(3)}"/>`;
  }));
  const dots = pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(1.2 + p[2] * 2.6).toFixed(1)}" fill-opacity="${(0.15 + p[2] * 0.35).toFixed(2)}"/>`).join('');
  return `<svg class="field" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><g stroke="${ACCENT}" stroke-width="1.2">${lines}</g><g fill="${ACCENT}">${dots}</g></svg>`;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap');
* { margin: 0; box-sizing: border-box; }
html, body { background: transparent; }
.bg { position: relative; overflow: hidden; background: ${BG}; width: 100vw; height: 100vh; }
.bg::before { content: ""; position: absolute; inset: 0;
  background-image: linear-gradient(rgba(120,200,190,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(120,200,190,.04) 1px, transparent 1px);
  background-size: var(--grid, 48px) var(--grid, 48px); }
.glow { position: absolute; border-radius: 50%; background: radial-gradient(circle, rgba(111,207,191,.20), rgba(111,207,191,0) 68%); transform: translate(-50%, -50%); }
.field { position: absolute; inset: 0; }
.abs { position: absolute; transform: translate(-50%, -50%); }
.lockup { position: absolute; display: flex; align-items: center; transform: translate(-50%, -50%); }
.word { font-family: 'IBM Plex Mono', monospace; color: ${TEXT}; display: flex; flex-direction: column; white-space: nowrap; }
.word b { font-weight: 600; letter-spacing: .16em; line-height: 1; }
.word small { color: ${MUTED}; letter-spacing: .22em; font-weight: 500; }
.word i { font-style: normal; color: ${ACCENT}; letter-spacing: .12em; font-weight: 500; }
`;

const page = body => `<!doctype html><meta charset="utf-8"><style>${CSS}</style><body>${body}</body>`;

// square avatar: the mark inside the circle crop both platforms apply
const avatar = s => page(`<div class="bg" style="--grid:${s / 10}px">
  <div class="glow" style="left:50%;top:50%;width:${s * 1.1}px;height:${s * 1.1}px"></div>
  <div class="abs" style="left:50%;top:50%">${svg({}, s * 0.7)}</div></div>`);

// banner: lockup centred on (cx, cy); markPx = mark height
function banner(w, h, { cx, cy, markPx, title, sub, line, seed, keepOut, density = 26000 }) {
  return page(`<div class="bg" style="--grid:${Math.round(h / 12)}px">
  ${field(w, h, Math.round(w * h / density), seed, keepOut)}
  <div class="glow" style="left:${cx - markPx * 1.55}px;top:${cy}px;width:${markPx * 2.6}px;height:${markPx * 2.6}px"></div>
  <div class="lockup" style="left:${cx}px;top:${cy}px;gap:${markPx * 0.32}px">
    ${svg({}, markPx)}
    <div class="word"><b style="font-size:${title}px">WHERE ARE THEY</b>
      <small style="font-size:${sub}px;margin-top:${sub * 0.75}px">UAP · NHI CASE ARCHIVE</small>
      <i style="font-size:${line}px;margin-top:${line * 1.3}px">Connecting the dots on UAP disclosure</i></div>
  </div></div>`);
}

const horizontal = (h, color = TEXT) => page(`<div class="lockup" style="left:50%;top:50%;gap:${h * 0.3}px">
  ${svg({}, h)}<div class="word" style="color:${color}"><b style="font-size:${h * 0.36}px">WHERE ARE THEY</b>
  <small style="font-size:${h * 0.16}px;margin-top:${h * 0.12}px">UAP · NHI CASE ARCHIVE</small></div></div>`);

const plain = (s, opts, pad = 0) => page(`<div class="abs" style="left:50%;top:50%">${svg(opts, s * (1 - pad * 2))}</div>`);
const tile = (s, opts, pad, radius) => page(`<div style="width:${s}px;height:${s}px;background:${BG};border-radius:${radius * s}px;display:grid;place-items:center">${svg(opts, s * (1 - pad * 2))}</div>`);

const JOBS = [
  // YouTube
  ['youtube/profile-800.png', 800, 800, avatar(800)],
  ['youtube/banner-2560x1440.png', 2560, 1440, banner(2560, 1440, { cx: 1280, cy: 720, markPx: 290, title: 92, sub: 30, line: 30, seed: 7, keepOut: [1280, 720, 900, 260] })],
  ['youtube/watermark-150.png', 150, 150, plain(150, { simple: true }, 0.04), true],
  // X
  ['x/profile-400.png', 400, 400, avatar(400)],
  ['x/header-1500x500.png', 1500, 500, banner(1500, 500, { cx: 860, cy: 235, markPx: 170, title: 54, sub: 18, line: 18, seed: 11, keepOut: [860, 235, 520, 150], density: 11000 })],
  // general use
  ['logo/mark-1024.png', 1024, 1024, plain(1024, {}, 0.02), true],
  ['logo/mark-simple-1024.png', 1024, 1024, plain(1024, { simple: true }, 0.02), true],
  ['logo/horizontal-2400x600.png', 2400, 600, horizontal(400), true],
  ['logo/horizontal-on-dark-2400x600.png', 2400, 600, page(`<div class="bg">${horizontal(400).split('<body>')[1]}</div>`)],
  ['logo/share-card-1200x630.png', 1200, 630, banner(1200, 630, { cx: 600, cy: 315, markPx: 170, title: 50, sub: 17, line: 17, seed: 3, keepOut: [600, 315, 420, 150] })],
  // website icons
  ['site/apple-touch-icon.png', 180, 180, tile(180, { simple: true }, 0.14, 0)],
  ['site/icon-192.png', 192, 192, tile(192, { simple: true }, 0.12, 0.22), true],
  ['site/icon-512.png', 512, 512, tile(512, { simple: true }, 0.12, 0.22), true],
  ['site/icon-maskable-512.png', 512, 512, tile(512, { simple: true }, 0.22, 0)],
  ['site/ico-16.png', 16, 16, tile(16, { simple: true }, 0.02, 0.2), true],
  ['site/ico-32.png', 32, 32, tile(32, { simple: true }, 0.04, 0.2), true],
  ['site/ico-48.png', 48, 48, tile(48, { simple: true }, 0.06, 0.2), true],
];

const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const tab = await browser.newPage();
for (const [file, w, h, html, transparent] of JOBS) {
  await tab.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await tab.setContent(html, { waitUntil: 'load', timeout: 90000 });
  await tab.evaluate(() => document.fonts.ready);
  const dest = path.join(OUT, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await tab.screenshot({ path: dest, omitBackground: !!transparent });
  console.log(file);
}
await browser.close();

// vector sources
const vec = (opts, bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" color="${ACCENT}">${bg ? `<rect width="64" height="64" rx="14" fill="${BG}"/>` : ''}${mark(opts)}</svg>\n`;
fs.writeFileSync(path.join(OUT, 'logo/mark.svg'), vec({}));
fs.writeFileSync(path.join(OUT, 'logo/mark-simple.svg'), vec({ simple: true }));
fs.writeFileSync(path.join(OUT, 'site/favicon.svg'), vec({ simple: true }, true));

// favicon.ico (16/32/48) and the copies the site serves from its root
const s = f => path.join(OUT, 'site', f);
execFileSync('magick', [s('ico-16.png'), s('ico-32.png'), s('ico-48.png'), s('favicon.ico')]);
for (const f of ['ico-16.png', 'ico-32.png', 'ico-48.png']) fs.rmSync(s(f));
for (const f of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'])
  fs.copyFileSync(s(f), path.join(SITE, f));
console.log('site icons copied into site/');
