// When each entry entered the archive (`added`), distinct from `date` (when the event itself happened).
// Frozen in content/added.json (commit it, like slugs.json): first filled from the git history of each file,
// then today's date for new entries. A frontmatter `added:` overrides both. Netlify builds read the file
// but never write it, so their (possibly shallow) git history can't move dates.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT } from './lib.mjs';

const LOCK = path.join(ROOT, 'content', 'added.json');

// date each content file was first committed: one git call for the whole history
function gitFirstAdded() {
  const out = new Map();
  try {
    const log = execFileSync('git', ['log', '--diff-filter=A', '--format=@%as', '--name-only', '--', 'content'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
    let date = null;
    for (const line of log.split('\n')) {
      if (line.startsWith('@')) date = line.slice(1);
      else if (line.trim() && date) out.set(line.trim(), date); // newest first: the last write is the oldest add
    }
  } catch { /* not a git checkout */ }
  return out;
}

export function assignAdded(entities, raw, { save = !process.env.NETLIFY } = {}) {
  const lock = fs.existsSync(LOCK) ? JSON.parse(fs.readFileSync(LOCK, 'utf8')) : {};
  const today = new Date().toISOString().slice(0, 10);
  const rawById = new Map(raw.map(r => [r.id, r]));
  let git = null, added = 0;
  for (const e of entities) {
    const fm = rawById.get(e.id)?.data?.added;
    if (fm) { e.added = String(fm instanceof Date ? fm.toISOString().slice(0, 10) : fm); continue; }
    if (!lock[e.id]) {
      git ||= gitFirstAdded();
      lock[e.id] = git.get(`content/${e.file}`) || git.get(e.file) || today;
      added++;
    }
    e.added = lock[e.id];
  }
  if (added && save) fs.writeFileSync(LOCK, JSON.stringify(Object.fromEntries(Object.entries(lock).sort()), null, 0).replace(/","/g, '",\n"') + '\n');
}
