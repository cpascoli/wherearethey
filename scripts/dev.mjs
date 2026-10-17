#!/usr/bin/env node
// Local server: builds, serves site/ (plus /media and /library), rebuilds and live-reloads on changes.
//   npm run dev            → http://localhost:4321
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';
import { build } from './build.mjs';

const PORT = +(process.env.PORT || 4321);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.vtt': 'text/vtt',
};
const clients = new Set();

function resolve(urlPath) {
  const p = decodeURIComponent(urlPath.split('?')[0]);
  for (const prefix of ['/media/', '/library/']) {
    if (p.startsWith(prefix)) return path.join(ROOT, p);
  }
  return path.join(ROOT, 'site', p === '/' ? 'index.html' : p);
}

const server = http.createServer((req, res) => {
  if (req.url === '/__events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  const file = resolve(req.url);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const size = fs.statSync(file).size;
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
  if (range) { // needed for seeking in local video files
    const start = range[1] ? +range[1] : 0;
    const end = range[2] ? +range[2] : size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
    fs.createReadStream(file, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  }
});

function rebuild(reason) {
  try {
    const { errors } = build({ quiet: false });
    if (!errors.length) for (const c of clients) c.write('data: reload\n\n');
  } catch (e) {
    console.error(`build failed (${reason}):`, e.message);
  }
}

rebuild('start');
let timer;
for (const dir of ['content', 'site/assets', 'site/index.html', 'media']) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) continue;
  fs.watch(full, { recursive: true }, (_, f) => {
    if (String(f).endsWith('.mp4') || String(f).startsWith('.')) return;
    clearTimeout(timer);
    timer = setTimeout(() => { console.log(`changed: ${dir}/${f ?? ''}`); rebuild(f); }, 250);
  });
}
server.listen(PORT, () => console.log(`\n  Where Are They → http://localhost:${PORT}\n`));
