# library/

Documents referenced by entries via `files:` (e.g. `library/docs/doc-wilson-davis-notes.pdf`).

- **In git:** the extracted/OCR'd text of every document (`*.txt`), so documents stay searchable.
- **Not in git:** the PDFs and images themselves (≈2 GB). They are stored in Cloudflare R2 and can be
  re-created with the import tools:
  - `npm run import:pursue -- --download "AAWSAP"` → `library/pursue/`
  - `npm run add:doc -- <url> <id>` → `library/docs/` (source URLs are in each entry's `links:`)
