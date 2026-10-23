#!/usr/bin/env node
// Safety checks for news items, run by the Latest bot before it opens a pull request (and by hand on any item).
//
//   node scripts/check-news.mjs [files…]        check these content/news/*.md files
//   node scripts/check-news.mjs --changed       check news items added or edited since origin/main (and untracked ones)
//   options: --max-age 4   fail items whose `date` is more than 4 days old (the bot's freshness window)
//
// For each item:
//   • every quoted passage (“…” or "…") in the headline, facts and body appears word for word in the saved text of
//     its source(s): sources/news/<id>.txt (and <id>.2.txt, <id>.3.txt …), each starting with a `Source: <url>` line.
//     Matching ignores case, punctuation and spacing, and a quote split by an ellipsis is checked piece by piece.
//   • it links (`rel`) to at least one existing archive entry, and every link target exists
//   • its url is not already used by another news item, and the url / date / kind fields are present
// Exits non-zero, listing each failure, if any item fails.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, readEntries, splitFrontmatter } from './lib.mjs';

const args = process.argv.slice(2);
const maxAge = args.includes('--max-age') ? Number(args[args.indexOf('--max-age') + 1]) : null;
const NEWS_DIR = path.join(ROOT, 'content', 'news');
const SRC_DIR = path.join(ROOT, 'sources', 'news');

let files = args.filter((a, i) => a.endsWith('.md') && args[i - 1] !== '--max-age');
if (args.includes('--changed')) {
  const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
  let base = 'origin/main';
  try { base = git('merge-base', 'HEAD', 'origin/main')[0]; } catch { /* no remote: compare with HEAD */ base = 'HEAD'; }
  files = [...new Set([...git('diff', '--name-only', '--diff-filter=AM', base, '--', 'content/news'), ...git('ls-files', '--others', '--exclude-standard', 'content/news')])];
}
files = files.map(f => path.resolve(ROOT, f)).filter(f => f.startsWith(NEWS_DIR) && fs.existsSync(f));
if (!files.length) { console.log('check-news: no news items to check'); process.exit(0); }

const entries = readEntries();
const ids = new Set(entries.map(e => e.id));
const urlOwner = new Map(entries.filter(e => e.type === 'news' && e.data.url).map(e => [String(e.data.url), e.id]));

const norm = s => ` ${String(s).normalize('NFKC').toLowerCase().replace(/[’‘`´]/g, "'").replace(/'(?![a-z])|(?<![a-z])'/g, ' ').replace(/[^\p{L}\p{N}'\s]+/gu, ' ').replace(/\s+/g, ' ').trim()} `;
// quoted passages: curly double quotes, or straight double quotes (YAML strings use \" inside, which the parser has already unescaped)
const quotesIn = text => [...String(text).matchAll(/“([^”]+)”|"([^"]+)"/g)].map(m => (m[1] ?? m[2]).trim()).filter(Boolean);

const today = new Date().toISOString().slice(0, 10);
let failed = 0;
for (const file of files) {
  const id = path.basename(file, '.md');
  const { data, body } = splitFrontmatter(fs.readFileSync(file, 'utf8'));
  const problems = [];
  for (const k of ['name', 'date', 'kind', 'url']) if (!data[k]) problems.push(`missing "${k}"`);
  const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date || '');
  if (maxAge != null && date && (Date.parse(today) - Date.parse(date.padEnd(10, '-01').slice(0, 10))) / 864e5 > maxAge) problems.push(`date ${date} is more than ${maxAge} days old`);
  if (date > today) problems.push(`date ${date} is in the future`);
  const rel = (data.rel || []).filter(r => Array.isArray(r) && r[1]);
  if (!rel.length) problems.push('links to nothing in the archive: needs at least one `rel` to an existing entry');
  for (const [, t] of rel) if (!ids.has(t)) problems.push(`rel target "${t}" does not exist`);
  if (data.url && urlOwner.get(String(data.url)) && urlOwner.get(String(data.url)) !== id) problems.push(`url already filed as news item "${urlOwner.get(String(data.url))}"`);

  // the saved source texts
  const srcFiles = fs.existsSync(SRC_DIR) ? fs.readdirSync(SRC_DIR).filter(f => f === `${id}.txt` || new RegExp(`^${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.\\d+\\.txt$`).test(f)) : [];
  const corpus = norm(srcFiles.map(f => fs.readFileSync(path.join(SRC_DIR, f), 'utf8')).join('\n'));
  for (const f of srcFiles) if (!/^Source: \S+/m.test(fs.readFileSync(path.join(SRC_DIR, f), 'utf8').split('\n').slice(0, 3).join('\n'))) problems.push(`sources/news/${f} should start with a "Source: <url>" line`);

  const texts = [data.name, ...(data.facts || []).map(f => f.text), body];
  const quotes = texts.flatMap(quotesIn);
  if (quotes.length && !srcFiles.length) problems.push(`has ${quotes.length} quoted passage(s) but no saved source text (sources/news/${id}.txt)`);
  else for (const q of quotes) {
    const pieces = q.split(/…|\.\.\./).map(norm).filter(p => p.trim());
    const missing = pieces.filter(p => !corpus.includes(p));
    if (missing.length) problems.push(`quote not found word for word in the source text: “${q}”${pieces.length > 1 ? ` (missing: “${missing.map(m => m.trim()).join('” / “')}”)` : ''}`);
  }

  const rels = path.relative(ROOT, file);
  if (problems.length) { failed++; console.log(`✗ ${rels}`); for (const p of problems) console.log(`    ${p}`); }
  else console.log(`✓ ${rels}  (${quotes.length} quote${quotes.length === 1 ? '' : 's'} verified against ${srcFiles.length} source text${srcFiles.length === 1 ? '' : 's'})`);
}
if (failed) { console.log(`\n${failed} of ${files.length} news item(s) failed`); process.exit(1); }
