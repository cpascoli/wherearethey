#!/usr/bin/env node
// Transcribe a downloaded video with Whisper (whisper.cpp) into media/<id>/transcript.json.
//
//   node scripts/transcribe.mjs <media-id> [--translate] [--lang pt] [--force]
//
// <media-id> is the folder name under media/ (a YouTube id, or e.g. "x-1797043031121801547").
// --translate  produce an English translation instead of the original language (Whisper's built-in task)
// --lang xx    source language hint (default: auto-detect)
// Model: ~/.cache/whisper-cpp/ggml-large-v3-turbo-q5_0.bin (override with WHISPER_MODEL).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT } from './lib.mjs';

const args = process.argv.slice(2).filter(a => a !== '--');
const translate = args.includes('--translate');
const force = args.includes('--force');
const lang = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : 'auto';
// the media id is whatever isn't one of our options (YouTube ids may themselves start with "-" or "--")
const OPTS = new Set(['--translate', '--force', '--lang']);
const id = args.find((a, i) => !OPTS.has(a) && args[i - 1] !== '--lang');
if (!id) { console.log('usage: node scripts/transcribe.mjs <media-id> [--translate] [--lang xx] [--force]'); process.exit(1); }

const dir = path.join(ROOT, 'media', id);
const video = ['video.mp4', 'video.webm', 'audio.m4a', 'audio.mp3'].map(f => path.join(dir, f)).find(f => fs.existsSync(f));
if (!video) { console.error(`no video/audio file in media/${id}/ — download it first`); process.exit(1); }
const out = path.join(dir, 'transcript.json');
if (fs.existsSync(out) && !force) {
  const cur = JSON.parse(fs.readFileSync(out, 'utf8'));
  if (String(cur.source).startsWith('whisper')) { console.log(`✓ media/${id}: already transcribed with Whisper (use --force)`); process.exit(0); }
}
const model = process.env.WHISPER_MODEL || path.join(os.homedir(), '.cache', 'whisper-cpp', 'ggml-large-v3-turbo-q5_0.bin');
if (translate && /turbo/.test(model)) {
  // large-v3-turbo was trained without the translation task: it silently returns the original language
  console.error('The turbo model cannot translate. Transcribe in the original language (omit --translate), or set WHISPER_MODEL to a full multilingual model (e.g. ggml-large-v3).');
  process.exit(1);
}
if (!fs.existsSync(model)) { console.error(`Whisper model not found: ${model}`); process.exit(1); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wat-whisper-'));
const wav = path.join(tmp, 'audio.wav');
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', video, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
const prefix = path.join(tmp, 'out');
console.log(`→ media/${id}: transcribing${translate ? ' + translating to English' : ''} (${lang})…`);
execFileSync('whisper-cli', ['-m', model, '-f', wav, '-l', lang, ...(translate ? ['-tr'] : []), '-oj', '-of', prefix, '-np'], { stdio: ['ignore', 'ignore', 'inherit'] });
const res = JSON.parse(fs.readFileSync(`${prefix}.json`, 'utf8'));
const segments = (res.transcription || [])
  .map(s => [Math.round((s.offsets?.from || 0) / 100) / 10, String(s.text || '').trim()])
  .filter(([, t]) => t && !/^\[.*\]$/.test(t) && !/^\(?(music( playing)?|applause|silence)\)?\.?$/i.test(t)); // drop non-speech fillers
// Whisper sometimes loops on a phrase (especially over silence): collapse a sentence repeated within a
// segment, then drop segments identical to one of the previous few
const dedupe = t => { const parts = t.split(/(?<=[.!?])\s+/); return parts.filter((p, i) => i < 1 || p !== parts[i - 1]).join(' '); };
for (let i = 0; i < segments.length; i++) segments[i][1] = dedupe(segments[i][1]);
for (let i = segments.length - 1; i > 0; i--) if (segments.slice(Math.max(0, i - 3), i).some(s => s[1] === segments[i][1])) segments.splice(i, 1);
const detected = res.result?.language || lang;
fs.writeFileSync(out, JSON.stringify({ source: translate ? 'whisper-translated' : 'whisper', language: detected, segments }));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`  ${segments.length} segments · language: ${detected}${translate ? ' → English' : ''}`);
