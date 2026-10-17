import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CONTENT = path.join(ROOT, 'content');

export const TYPES = ['person', 'program', 'organization', 'hearing', 'incident', 'document', 'film', 'book', 'record', 'video', 'event', 'concept', 'place'];
export const STATUSES = ['documented', 'claimed', 'unverified'];

export function slugify(s) {
  return String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function youtubeId(input) {
  const s = String(input).trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|youtu\.be\/|\/live\/|\/shorts\/|\/embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

// "1:02:03", "62:03", "3723", 3723 → seconds
export function toSeconds(t) {
  if (typeof t === 'number') return t;
  const parts = String(t).trim().split(':').map(Number);
  if (parts.some(Number.isNaN)) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');

// Parse WebVTT into [[startSeconds, text], …]. YouTube auto-captions repeat each line
// in a "rolling" layout; only the line carrying word-timing tags is new text.
export function parseVtt(raw) {
  const auto = /<\d\d:\d\d:\d\d\.\d{3}><c>/.test(raw);
  const segments = [];
  let last = '';
  for (const block of raw.split(/\r?\n\r?\n/)) {
    const lines = block.split(/\r?\n/);
    const ti = lines.findIndex(l => l.includes('-->'));
    if (ti < 0) continue;
    const start = toSeconds(lines[ti].split('-->')[0].trim());
    let body = lines.slice(ti + 1);
    if (auto) {
      const fresh = body.find(l => /<c>/.test(l));
      if (!fresh) continue;
      body = [fresh];
    }
    const text = decode(body.join(' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
    if (!text || text === last) continue;
    last = text;
    segments.push([Math.round(start * 10) / 10, text]);
  }
  return { auto, segments };
}

export function splitFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: src };
  return { data: YAML.parse(m[1]) || {}, body: m[2] };
}

// Every content/<type>/<id>.md file → { id, type, file, data, body }
export function readEntries() {
  const out = [];
  for (const type of fs.readdirSync(CONTENT)) {
    const dir = path.join(CONTENT, type);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.md')) continue;
      const file = path.join(dir, f);
      const { data, body } = splitFrontmatter(fs.readFileSync(file, 'utf8'));
      out.push({ id: f.slice(0, -3), type, file: path.relative(ROOT, file), data, body });
    }
  }
  return out;
}
