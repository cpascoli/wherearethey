// Offline copy of every video in the archive, sorted into the Videos page's categories.
// node scripts/backup-videos.mjs [/Volumes/USB/WhereAreThey-videos] [--dry]
// Reads site/data/kb.js (run the build first). ≤720p, ≤480p for footage before 2005; audio-only entries stay audio.
// Sources, in order: our local copy in media/, DVIDS's MP4 (content/dvids.json), the entry's `stream:` URL, YouTube, its `url:`.
// Files already on the drive are skipped, so it can be stopped and re-run; failures are listed in _failed.txt.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const DEST = args.find(a => !a.startsWith('--')) || '/Volumes/USB/WhereAreThey-videos';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');

// A drive under /Volumes that has been unplugged leaves no mount point: writing there would
// silently create the folder on the internal disk. Check the drive is still mounted before each step.
const VOL = DEST.match(/^\/Volumes\/[^/]+/)?.[0];
const mounted = () => {
  if (!VOL) return true;
  try { return fs.statSync(VOL).dev !== fs.statSync('/Volumes').dev; } catch { return false; }
};
const needDrive = () => {
  if (mounted()) return;
  console.error(`\n${VOL} is not mounted (drive unplugged?): stopping. Plug it in and run the script again to resume.`);
  process.exit(2);
};
needDrive();

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'site/data/kb.js'), 'utf8'), ctx);
const KB = ctx.window.KB;
const byId = new Map(KB.entities.map(e => [e.id, e]));
const adj = new Map(KB.entities.map(e => [e.id, []]));
for (const x of KB.edges) {
  adj.get(x.s)?.push({ ...x, other: x.t, dir: 'out' });
  adj.get(x.t)?.push({ ...x, other: x.s, dir: 'in' });
}
const dvids = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/dvids.json'), 'utf8'));

// keep in sync with vidKind / CONGRESS_EVENTS / NEWS in site/assets/app.js
const CONGRESS_EVENTS = new Set(['ev-capitol-uap-press-conference-2026']);
const NEWS = /\b(CBS|CNN|NBC|ABC|BBC|CTV|FOX ?\d*|NewsNation|7NEWS|Sky News|i24NEWS|CBC|KLAS|8 News|PBS|60 Minutes)\b/i;
const y0 = v => (v.date ? parseInt(String(v.date).slice(0, 4), 10) : null);
function vidKind(v) {
  const rels = adj.get(v.id).filter(x => x.dir === 'out');
  if (rels.some(x => x.label === 'trailer of')) return 'trailer';
  if (rels.some(x => x.label === 'recording of' && byId.get(x.other)?.type === 'record')) return 'archive';
  const rec = rels.filter(x => ['recording of', 'records'].includes(x.label) && ['hearing', 'event'].includes(byId.get(x.other)?.type)).map(x => x.other);
  if (v.series === 'h-2013-citizen-hearing' || rec.includes('h-2013-citizen-hearing')) return 'citizen';
  if (rec.some(id => byId.get(id).type === 'hearing' || CONGRESS_EVENTS.has(id)) || /hearing|testimony before|subcommittee|committee/i.test(v.name)) return 'congress';
  if (rec.length) return 'conference';
  if ((y0(v) && y0(v) < 2005) || /^navair-/.test(v.media || '')) return 'archive';
  if (NEWS.test(v.channel || '') || NEWS.test(v.name)) return (v.duration || 0) < 1200 ? 'news' : 'interview';
  return 'interview';
}
const FOLDER = {
  congress: '1 Congress hearings', citizen: '2 Citizen Hearing (2013)', conference: '3 Conferences & press events',
  interview: '4 Interviews & podcasts', news: '5 News', archive: '6 Archive & official footage', trailer: '7 Trailers',
};

// frontmatter fields the KB may not carry
const front = v => {
  const t = fs.readFileSync(path.join(ROOT, v.file), 'utf8').split(/^---$/m)[1] || '';
  const get = k => t.match(new RegExp(`^${k}:\\s*["']?([^"'#\\n]+?)["']?\\s*(#.*)?$`, 'm'))?.[1].trim();
  return { youtube: get('youtube'), media: get('media'), url: get('url'), stream: get('stream') };
};
const clean = s => s.replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 150).trim();

const run = (cmd, a) => spawnSync(cmd, a, { stdio: 'inherit' }).status === 0;
const ytdlp = (url, out, h) => run('yt-dlp', [
  '-f', `bv*[height<=${h}][ext=mp4]+ba[ext=m4a]/bv*[height<=${h}]+ba/b[height<=${h}]/b`,
  '--merge-output-format', 'mp4', '--no-playlist', '-N', '4', // 4 fragments at once: YouTube throttles each stream (~1.8 MiB/s, ~0.36 after a block); a run with 4 hit a "confirm you're not a bot" block after ~280 videos
 '--no-warnings', '--progress', '--newline',
  '--sleep-requests', '1', '--sleep-interval', '4', '--max-sleep-interval', '12', '--retries', '10', '--fragment-retries', '10',
  '-o', out, url]);
const curl = (url, out) => run('curl', ['-fL', '--retry', '5', '-o', out, url]);

const videos = KB.entities.filter(e => e.type === 'video').sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
const failed = [], manifest = [['category', 'date', 'title', 'file', 'source', 'site page'].join('\t')];
let done = 0, skipped = 0;
for (const [i, v] of videos.entries()) {
  const f = front(v), kind = vidKind(v), old = y0(v) && y0(v) < 2005;
  const localV = f.media && path.join(ROOT, 'media', f.media, 'video.mp4');
  const localA = f.media && path.join(ROOT, 'media', f.media, 'audio.mp3');
  const audioOnly = /\.mp3$/.test(f.stream || '');
  const ext = audioOnly ? 'mp3' : 'mp4';
  const dir = path.join(DEST, FOLDER[kind]);
  const out = path.join(dir, clean(`${v.date || 'undated'} – ${v.name}`) + '.' + ext);
  const dv = f.media?.startsWith('dvids-') && dvids[f.media.slice(6)]?.mp4;
  const source = f.youtube ? `https://www.youtube.com/watch?v=${f.youtube}` : f.url || f.stream || '';
  manifest.push([FOLDER[kind], v.date || '', v.name, path.relative(DEST, out), source, `https://wherearethey.info${v.path}`].join('\t'));
  needDrive();
  if (fs.existsSync(out)) { skipped++; continue; }
  console.log(`\n[${i + 1}/${videos.length}] ${FOLDER[kind]} · ${v.name}`);
  if (DRY) continue;
  // when the connection drops, wait for it instead of failing the rest of the list
  for (let n = 0; spawnSync('curl', ['-sfI', '-m', '15', '-o', '/dev/null', 'https://www.youtube.com']).status !== 0; n++) {
    if (n % 10 === 0) console.log('… offline, waiting for the connection');
    spawnSync('sleep', ['30']);
  }
  fs.mkdirSync(dir, { recursive: true });
  const tmp = out + '.part.' + ext;
  let ok = false;
  if (audioOnly && localA && fs.existsSync(localA)) ok = run('cp', [localA, tmp]);
  else if (!audioOnly && localV && fs.existsSync(localV)) ok = run('cp', [localV, tmp]);
  if (!ok && dv) ok = curl(dv, tmp);
  if (!ok && /^https?:/.test(f.stream || '')) ok = curl(f.stream, tmp);
  if (!ok && f.youtube) ok = ytdlp(`https://www.youtube.com/watch?v=${f.youtube}`, tmp, old ? 480 : 720);
  if (!ok && f.url && !/github\.com|navair\.navy\.mil/.test(f.url)) ok = ytdlp(f.url, tmp, old ? 480 : 720);
  needDrive(); // a download that failed because the drive went away is not a failure of the video
  if (ok && fs.existsSync(tmp)) { fs.renameSync(tmp, out); done++; }
  else { failed.push(`${v.id}\t${v.name}\t${source}`); console.warn(`! failed: ${v.id}`); }
}
if (!DRY) {
  needDrive();
  fs.writeFileSync(path.join(DEST, '_index.tsv'), manifest.join('\n') + '\n');
  fs.writeFileSync(path.join(DEST, '_failed.txt'), failed.join('\n') + (failed.length ? '\n' : ''));
}
const counts = {};
for (const v of videos) counts[FOLDER[vidKind(v)]] = (counts[FOLDER[vidKind(v)]] || 0) + 1;
console.log('\n', counts, `\ndownloaded ${done}, already there ${skipped}, failed ${failed.length}`);
