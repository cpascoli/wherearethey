// Share cards: a 1200×630 image for every file page that has no picture of its own (portrait, image, cover or video
// thumbnail), used as its og:image. Name, type, the key line (credentials, date and place), what the page holds, and the
// file's own neighbourhood drawn as in the graph. Rendered with resvg from SVG, with the site's fonts bundled in
// scripts/fonts (IBM Plex, SIL Open Font License), so a card looks the same on Netlify as locally. Cards are cached in
// .cache/cards by a hash of their SVG; only new or changed cards are rendered.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { ROOT } from './lib.mjs';

const W = 1200, H = 630;
const FONTS = ['IBMPlexSans-SemiBold.ttf', 'IBMPlexSans-Regular.ttf', 'IBMPlexMono-Medium.ttf'].map(f => path.join(ROOT, 'scripts', 'fonts', f));
const CACHE = path.join(ROOT, '.cache', 'cards');
const V = 1; // bump to re-render every card after a design change

// graph colours and shapes, as TYPES in app.js
export const TYPE_STYLE = {
  person: ['#E0A458', 'ellipse'], incident: ['#4FB286', 'star'], hearing: ['#E5636B', 'diamond'], program: ['#4EA8DE', 'hexagon'],
  organization: ['#8E7DDB', 'round-rectangle'], document: ['#B49A78', 'rectangle'], film: ['#E07B53', 'rectangle'], book: ['#9CB86B', 'rectangle'],
  record: ['#8FB3C9', 'rectangle'], video: ['#D978B0', 'round-rectangle'], event: ['#38B2AC', 'diamond'], concept: ['#BDB55C', 'octagon'],
  place: ['#A98467', 'pentagon'], source: ['#8C9AAB', 'round-rectangle'], news: ['#F2C14E', 'rectangle'], claim: ['#F07167', 'rectangle'],
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// approximate advance widths (em) for IBM Plex Sans; good enough to wrap and to keep text inside its box
const NARROW = new Set('iljtfr.,:;\'’!|()[] ı'), WIDE = new Set('mwMW@%');
const width = (s, size) => [...s].reduce((a, c) => a + (NARROW.has(c) ? 0.3 : WIDE.has(c) ? 0.86 : /[A-Z0-9]/.test(c) ? 0.64 : 0.54), 0) * size;
function wrap(text, size, max, lines) {
  const words = String(text).split(/\s+/).filter(Boolean), out = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (width(next, size) <= max || !cur) cur = next;
    else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  if (out.length > lines) { out.length = lines; let last = out[lines - 1]; while (width(last + '…', size) > max && last.includes(' ')) last = last.replace(/\s+\S*$/, ''); out[lines - 1] = last.replace(/[,;:.\s]+$/, '') + '…'; }
  return out.map(l => (width(l, size) > max ? clipTo(l, size, max) : l));
}
const monoFit = (parts, size, max) => parts.reduce((acc, p) => { const next = acc ? `${acc} · ${p}` : p; return next.length * 0.6 * size <= max ? next : acc; }, '');
const clipTo = (s, size, max) => { if (width(s, size) <= max) return s; while (s.length > 1 && width(s + '…', size) > max) s = s.slice(0, -1); return s.trimEnd() + '…'; };

function shape(kind, x, y, r, fill, stroke = 'none') {
  const poly = (n, rot = -Math.PI / 2, rr = () => r) => `<polygon points="${Array.from({ length: n }, (_, i) => { const a = rot + (i * 2 * Math.PI) / n; return `${(x + rr(i) * Math.cos(a)).toFixed(1)},${(y + rr(i) * Math.sin(a)).toFixed(1)}`; }).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
  switch (kind) {
    case 'star': return poly(10, -Math.PI / 2, i => (i % 2 ? r * 0.45 : r * 1.05));
    case 'diamond': return poly(4, -Math.PI / 2, () => r * 1.1);
    case 'hexagon': return poly(6, 0);
    case 'octagon': return poly(8, Math.PI / 8);
    case 'pentagon': return poly(5);
    case 'rectangle': return `<rect x="${x - r * 0.9}" y="${y - r * 0.9}" width="${r * 1.8}" height="${r * 1.8}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
    case 'round-rectangle': return `<rect x="${x - r * 0.9}" y="${y - r * 0.9}" width="${r * 1.8}" height="${r * 1.8}" rx="${r * 0.35}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
    default: return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
  }
}

// c: { type, label, name, line, holds: [parts], neighbours: [{ name, type }] }
export function cardSvg(c) {
  const [color, kind] = TYPE_STYLE[c.type] || ['#8C9AAB', 'ellipse'];
  const L = 72, ns = c.neighbours.slice(0, 8), TEXT_W = ns.length ? 640 : 1000;
  const nameSize = [68, 58, 50, 44].find(s => wrap(c.name, s, TEXT_W, 9).length <= (s >= 58 ? 2 : 3)) || 44;
  const nameLines = wrap(c.name, nameSize, TEXT_W, 3);
  const lineH = nameSize * 1.12;
  let y = 196;
  const out = [];
  out.push(`<rect width="${W}" height="${H}" fill="#0b0f14"/>`);
  // faint grid, as on the default card
  for (let gx = 0; gx <= W; gx += 40) out.push(`<line x1="${gx}" y1="0" x2="${gx}" y2="${H}" stroke="#ffffff" stroke-opacity="0.025"/>`);
  for (let gy = 0; gy <= H; gy += 40) out.push(`<line x1="0" y1="${gy}" x2="${W}" y2="${gy}" stroke="#ffffff" stroke-opacity="0.025"/>`);
  // brand
  out.push(`<circle cx="${L + 14}" cy="78" r="13" fill="none" stroke="#5aa9f0" stroke-width="3" stroke-dasharray="5 4"/><circle cx="${L + 14}" cy="78" r="6" fill="#5aa9f0"/>`);
  out.push(`<text x="${L + 40}" y="87" font-family="IBM Plex Mono" font-weight="500" font-size="24" letter-spacing="5" fill="#e6edf3">WHERE ARE THEY</text>`);
  // type pill
  const pill = c.label.toUpperCase(), pw = pill.length * 0.6 * 18 + pill.length * 2 + 28; // mono advance + letter-spacing
  out.push(`<rect x="${L}" y="128" width="${pw.toFixed(0)}" height="34" rx="4" fill="${color}" fill-opacity="0.18"/><text x="${L + 14}" y="151" font-family="IBM Plex Mono" font-weight="500" font-size="18" letter-spacing="2" fill="${color}">${esc(pill)}</text>`);
  // name
  for (const l of nameLines) { y += lineH; out.push(`<text x="${L}" y="${y.toFixed(0)}" font-family="IBM Plex Sans" font-weight="600" font-size="${nameSize}" fill="#f0f3f6">${esc(l)}</text>`); }
  // key line
  if (c.line) { y += 22; for (const l of wrap(c.line, 27, TEXT_W, nameLines.length > 2 ? 1 : 2)) { y += 36; out.push(`<text x="${L}" y="${y.toFixed(0)}" font-family="IBM Plex Sans" font-size="27" fill="#a9b4c0">${esc(l)}</text>`); } }
  // what the page holds, and the address
  const holds = monoFit(c.holds || [], 22, TEXT_W);
  if (holds) out.push(`<text x="${L}" y="530" font-family="IBM Plex Mono" font-weight="500" font-size="22" fill="#5fd3b8">${esc(holds)}</text>`);
  out.push(`<text x="${L}" y="574" font-family="IBM Plex Mono" font-weight="500" font-size="21" fill="#6e7b88">wherearethey.info</text>`);
  // the file's neighbourhood: the file in the middle, its best-connected neighbours around it
  if (!ns.length) return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${out.join('')}</svg>`;
  const cx = 962, cy = 318, RX = 200, RY = 150;
  const pts = ns.map((n, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / ns.length + (ns.length % 2 ? 0 : Math.PI / ns.length); return { ...n, x: cx + RX * Math.cos(a), y: cy + RY * Math.sin(a) }; });
  for (const p of pts) out.push(`<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="#8b98a5" stroke-opacity="0.35" stroke-width="2"/>`);
  for (const p of pts) {
    const [nc, nk] = TYPE_STYLE[p.type] || ['#8C9AAB', 'ellipse'];
    out.push(shape(nk, p.x, p.y, 15, nc));
    const lines = wrap(p.name, 15, 138, 2), below = p.y >= cy - 5;
    const tx = Math.min(1185 - Math.max(...lines.map(l => width(l, 15))) / 2, Math.max(735 + Math.max(...lines.map(l => width(l, 15))) / 2, p.x));
    lines.forEach((l, i) => out.push(`<text x="${tx.toFixed(1)}" y="${(below ? p.y + 36 + i * 18 : p.y - 26 - (lines.length - 1 - i) * 18).toFixed(1)}" text-anchor="middle" font-family="IBM Plex Sans" font-size="15" fill="#c9d1d9">${esc(l)}</text>`));
  }
  out.push(shape(kind, cx, cy, ns.length ? 34 : 46, color, '#0b0f14'));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${out.join('')}</svg>`;
}

// jobs: [{ file: 'cards/person/x.png', card }] → writes each into site/, from the cache when unchanged
export function writeCards(site, jobs) {
  fs.mkdirSync(CACHE, { recursive: true });
  let rendered = 0;
  for (const j of jobs) {
    const svg = cardSvg(j.card);
    const key = crypto.createHash('sha1').update(`${V}|${svg}`).digest('hex').slice(0, 16);
    const cached = path.join(CACHE, `${key}.png`);
    if (!fs.existsSync(cached)) {
      const png = new Resvg(svg, { font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'IBM Plex Sans' } }).render().asPng();
      fs.writeFileSync(cached, png);
      rendered++;
    }
    const out = path.join(site, j.file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.copyFileSync(cached, out);
  }
  return rendered;
}
