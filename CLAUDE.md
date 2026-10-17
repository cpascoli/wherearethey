# Where Are They — UAP / NHI case archive

A knowledge map of UAP/NHI testimony, programs, hearings, incidents, official records and video evidence.
Plain files in `content/` are the source of truth; `scripts/build.mjs` compiles them into `site/data/` for the browser app in `site/`.

## The sourcing rule (most important)
Only facts and testimony from **credible, on-record people**: current/former government officials, members of Congress and staff,
military personnel, pilots, radar/sensor operators, intelligence officers, academics, astronauts, aerospace-industry insiders.
- Every person needs `credentials` (category + role). Categories: `congress government intelligence military aviator sensor-operator academia astronaut aerospace` (credible), `journalist`, `policy-expert` (reporter tier — relays or analyses, not a witness), `civilian disputed unknown` (outside criteria → hidden by default).
- Incidents count as credible only when linked to a credible person or a documented fact (computed in the build).
- Never upgrade a status without a source. Prefer the counter-evidence too (e.g. Kirkpatrick, AARO resolutions) — balance is part of credibility.

## Entry format — `content/<type>/<id>.md`
Types: person, incident, hearing, program, organization, document, record (PURSUE, generated), video, event, concept, place, source.
The id is the filename. Frontmatter (YAML) + optional Markdown body (bio/summary).
```yaml
name: David Fravor
aka: [Fravor]                  # used for search AND transcript name-matching
match: [Fraver]                # extra transcript spellings (auto-captions misspell names)
credentials: [{ category: aviator, role: "Commander, U.S. Navy (ret.)" }]
date: 2004-11-14               # YYYY | YYYY-MM | YYYY-MM-DD ; `end:` for ranges
place: { name: "…", lat: 31.5, lng: -117.8 }
tags: [aviator, navy]
rel:                           # [label, target-id] — read as “this —label→ target”
  - [ witness, inc-nimitz-2004 ]
facts:
  - text: "…"
    status: documented | claimed | unverified
    by: david-fravor           # who said it
    source: v-2023-07-26-hearing-a@34:29   # entity id, entity@timestamp (videos), or URL
links: [{ label: "…", url: "…" }]
files: [library/…pdf]          # local copies
```
Videos add `youtube:` and curated `moments:` (`t`, `text`, `speaker`, `refs`). Use `npm run find -- "phrase" [video-id]` to get exact timestamps.
Bios: 2–3 short factual paragraphs, then an italic `*Sources: …*` line. Verify Wikipedia links point to the right person (many names redirect to topic pages).

## Commands
- `npm run dev` — build + serve http://localhost:4321 with rebuild/live-reload on changes
- `npm run check` — validate (dangling ids, bad statuses, missing files)
- `npm run fetch -- <youtube url|id> [--download]` — metadata + transcript into `media/<id>/`, creates a stub `content/video/` entry. YouTube rate-limits (HTTP 429): fetch in small batches.
- `npm run import:pursue [-- --download "regex"]` — refresh the war.gov/UFO PURSUE catalog into `content/record/` (drives local Chrome; importer-owned fields refresh, user notes below the marker are kept)
- `npm run add:doc -- <url> <id>` — download a document into `library/docs/` (falls back to Chrome when sites block scripts), extract text, OCR scans; then write `content/document/<id>.md` with `files:` and facts citing `source: library/docs/<id>.pdf`
- `node scripts/ocr.mjs <pdf>` — OCR a scanned PDF into a sibling `.txt`
- Documents: verify every supplied link by reading the downloaded text before filing (links from lists are often wrong). Record provenance (who released it, when, record ID). Mark compilations and mirrors as secondary sources and trace their claims to primary documents.
- Original seed notes: `notes/original-notes.md`. Raw PURSUE catalog snapshot: `sources/pursue/`.
