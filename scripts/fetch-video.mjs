#!/usr/bin/env node
// Fetch YouTube metadata + transcript (and optionally the video file) into media/<youtubeId>/.
//
//   node scripts/fetch-video.mjs <url|id> [more…] [--download] [--force]
//
// Creates a stub entry in content/video/ for any video that doesn't have one yet.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { ROOT, parseVtt, youtubeId, readEntries, slugify } from './lib.mjs';

const args = process.argv.slice(2);
const download = args.includes('--download');
const force = args.includes('--force');
const noStub = args.includes('--no-stub');
const inputs = args.filter(a => !a.startsWith('--'));
if (!inputs.length) {
  console.log('usage: node scripts/fetch-video.mjs <youtube url|id> [...] [--download] [--force]');
  process.exit(1);
}

const existing = new Map(
  readEntries().filter(e => e.type === 'video' && e.data.youtube).map(e => [e.data.youtube, e.id])
);

for (const [i, input] of inputs.entries()) {
  if (i) await new Promise(r => setTimeout(r, 3000)); // be gentle with YouTube rate limits
  const id = youtubeId(input);
  if (!id) { console.warn(`! could not parse a YouTube id from ${input}`); continue; }
  const dir = path.join(ROOT, 'media', id);
  fs.mkdirSync(dir, { recursive: true });
  const url = `https://www.youtube.com/watch?v=${id}`;

  const metaPath = path.join(dir, 'meta.json');
  const transcriptPath = path.join(dir, 'transcript.json');
  if (force || !fs.existsSync(metaPath) || !fs.existsSync(transcriptPath)) {
    console.log(`→ ${id}: metadata + transcript`);
    try {
      execFileSync('yt-dlp', [
        '--skip-download', '--write-subs', '--write-auto-subs',
        '--sub-langs', 'en,en-orig,en-US,en-GB', '--sub-format', 'vtt',
        '--write-info-json', '--no-warnings', '-q',
        '--sleep-requests', '1', '--sleep-subtitles', '4', '--retries', '5',
        '-o', path.join(dir, 'src.%(ext)s'), url,
      ], { stdio: ['ignore', 'inherit', 'inherit'] });
    } catch {
      console.warn(`! yt-dlp failed for ${id}`);
      continue;
    }
    const infoPath = path.join(dir, 'src.info.json');
    if (fs.existsSync(infoPath)) {
      const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
      const d = info.upload_date || '';
      const meta = {
        youtube: id,
        title: info.title,
        channel: info.channel || info.uploader,
        date: d ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : null,
        duration: info.duration,
        description: info.description || '',
        chapters: (info.chapters || []).map(c => ({ t: Math.round(c.start_time), title: c.title })),
        manualSubs: Object.keys(info.subtitles || {}).some(k => k.startsWith('en')),
      };
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
      fs.unlinkSync(infoPath);
    }
    // Prefer human-made subtitles, then original-language auto captions.
    const vtts = fs.readdirSync(dir).filter(f => f.startsWith('src.') && f.endsWith('.vtt'));
    const pick = ['src.en.vtt', 'src.en-US.vtt', 'src.en-GB.vtt', 'src.en-orig.vtt'].find(f => vtts.includes(f)) || vtts[0];
    if (pick) {
      const raw = fs.readFileSync(path.join(dir, pick), 'utf8');
      const { auto, segments } = parseVtt(raw);
      fs.writeFileSync(transcriptPath, JSON.stringify({ source: auto ? 'youtube-auto' : 'youtube', segments }));
      console.log(`  ${segments.length} transcript segments (${auto ? 'auto captions' : 'subtitles'})`);
    } else {
      console.warn(`  no English transcript available for ${id}`);
    }
    for (const f of vtts) fs.unlinkSync(path.join(dir, f));
  } else {
    console.log(`✓ ${id}: already fetched (use --force to refresh)`);
  }

  if (download) {
    const videoPath = path.join(dir, 'video.mp4');
    if (fs.existsSync(videoPath) && !force) console.log(`✓ ${id}: video already downloaded`);
    else {
      console.log(`→ ${id}: downloading video (≤720p)`);
      try {
        execFileSync('yt-dlp', [
          '-f', 'bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]/b[height<=720]',
          '--merge-output-format', 'mp4', '--no-warnings', '-o', videoPath, url,
        ], { stdio: 'inherit' });
      } catch { console.warn(`! video download failed for ${id}`); }
    }
  }

  if (!noStub && !existing.has(id) && fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const slug = 'v-' + slugify(`${meta.date || ''} ${meta.title || id}`).slice(0, 60).replace(/-+$/, '');
    const file = path.join(ROOT, 'content', 'video', `${slug}.md`);
    const fm = YAML.stringify({ name: meta.title, youtube: id, tags: [], rel: [], moments: [] });
    fs.writeFileSync(file, `---\n${fm}---\n\n`);
    existing.set(id, slug);
    console.log(`  created content/video/${slug}.md — add rel/moments to connect it`);
  }
}
