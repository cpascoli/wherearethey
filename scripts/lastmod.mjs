// When each indexable page last changed, for the sitemap's <lastmod>. A page's date moves only when what it
// shows changes (a hash of its title, description and content), so generator changes count as well as content
// edits. Frozen in content/lastmod.json (commit it, like added.json); the first time a page is seen its date comes
// from the git history of its source file. Netlify builds read the file but never write it.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ROOT } from './lib.mjs';

const LOCK = path.join(ROOT, 'content', 'lastmod.json');

// date of the last commit touching each file: one git call (newest first, so the first sighting wins)
function gitLastChanged() {
  const out = new Map();
  try {
    const log = execFileSync('git', ['log', '--format=@%cs', '--name-only', '--', 'content', 'site/about.html', 'site/privacy.html'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
    let date = null;
    for (const line of log.split('\n')) {
      if (line.startsWith('@')) date = line.slice(1);
      else if (line.trim() && date && !out.has(line.trim())) out.set(line.trim(), date);
    }
  } catch { /* not a git checkout */ }
  return out;
}

// the committed lock (HEAD): a page whose content changes and then changes back gets its committed date back
function committedLock() {
  try { return JSON.parse(execFileSync('git', ['show', 'HEAD:content/lastmod.json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 })); }
  catch { return {}; }
}

// pages: [{ path, title, description, body, file? }] → Map(path → YYYY-MM-DD)
export function pageDates(pages, { save = !process.env.NETLIFY } = {}) {
  const lock = fs.existsSync(LOCK) ? JSON.parse(fs.readFileSync(LOCK, 'utf8')) : {};
  const today = new Date().toISOString().slice(0, 10);
  let git = null, head = null, changed = false;
  const dates = new Map();
  for (const p of pages) {
    const h = crypto.createHash('sha1').update(`${p.title}\n${p.description}\n${p.body || ''}`).digest('hex').slice(0, 12);
    const cur = lock[p.path];
    if (!cur) {
      git ||= gitLastChanged();
      lock[p.path] = { d: (p.file && git.get(p.file)) || today, h };
      changed = true;
    } else if (cur.h !== h && save) {
      head ||= committedLock();
      lock[p.path] = { d: head[p.path]?.h === h ? head[p.path].d : today, h };
      changed = true;
    } else if (save && cur.d === today) {
      // unchanged since the last build, but dated today: if it matches the committed version, restore that date
      head ||= committedLock();
      if (head[p.path]?.h === h && head[p.path].d !== cur.d) { lock[p.path] = { ...head[p.path] }; changed = true; }
    }
    dates.set(p.path, lock[p.path].d);
  }
  if (changed && save) {
    const sorted = Object.fromEntries(Object.entries(lock).sort());
    fs.writeFileSync(LOCK, '{\n' + Object.entries(sorted).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(',\n') + '\n}\n');
  }
  return dates;
}
