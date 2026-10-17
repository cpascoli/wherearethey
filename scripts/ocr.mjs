#!/usr/bin/env node
// OCR scanned PDFs (no text layer) into a sibling .txt so they become searchable.
//   node scripts/ocr.mjs library/docs/foo.pdf [more.pdf …]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

for (const pdf of process.argv.slice(2)) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-'));
  execFileSync('pdftoppm', ['-r', '200', '-gray', '-png', pdf, path.join(tmp, 'p')]);
  const pages = fs.readdirSync(tmp).filter(f => f.endsWith('.png')).sort();
  const text = pages.map((f, i) => `\n\n[page ${i + 1}]\n` + execFileSync('tesseract', [path.join(tmp, f), '-', '--psm', '3'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString()).join('');
  fs.writeFileSync(pdf.replace(/\.pdf$/i, '.txt'), text);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`✓ ${pdf}: ${pages.length} pages OCR'd, ${text.length.toLocaleString()} chars`);
}
