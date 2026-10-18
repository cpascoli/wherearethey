# Where Are They — UAP / NHI case archive

A knowledge map of UAP/NHI testimony, programs, hearings, incidents, official records and video evidence.
Plain files in `content/` are the source of truth; `scripts/build.mjs` compiles them into `site/data/` for the browser app in `site/`.

## The sourcing rule (most important)
Only facts and testimony from **credible, on-record people**: current/former government officials, members of Congress and staff,
military personnel, pilots, radar/sensor operators, intelligence officers, academics, astronauts, aerospace-industry insiders.
- Every person needs `credentials` (category + role). Categories: `congress government intelligence military aviator sensor-operator academia astronaut aerospace law-enforcement` (credible), `journalist`, `policy-expert` (reporter tier — relays or analyses, not a witness), `civilian disputed unknown` (outside criteria → hidden by default).
- Incidents count as credible when linked to a credible person or a documented fact. **Mass-sighting rule:** an incident with `witnesses: <n>` ≥ 50 *and* at least one contemporary `coverage:` entry (outlet + date, from the time of the event) is included with the “Mass sighting” badge. Only cite coverage that actually dates from the event, and never mark Wikipedia-sourced facts as `documented`.
- Never upgrade a status without a source. Prefer the counter-evidence too (e.g. Kirkpatrick, AARO resolutions) — balance is part of credibility.

## Entry format — `content/<type>/<id>.md`
Types: person, incident, hearing, program, organization, document, film, book, record (PURSUE, generated), video, event, concept, place, source.
PURSUE `record`s are not graph nodes and not in the type filter: they appear as an “Official records” list in the dossier of whatever they link to, in the Index (own group), in search and in full-text search. Link a record to the entity it documents (`rel`), and it will surface there.
`document` is for official records and primary documents only; documentaries go in `film/` and books in `book/` (shown on the “Documentaries & books” page, under More). Give them `credits:` (free text), `runtime:` (minutes) or `publisher:`/`isbn:`/`pages:`, link people with `features`/`authored by`/`narrated by`, and attach an official trailer as a video with `[ trailer of, film-… ]`. Their contents are testimony: `claimed` unless an official record backs it; link out, never host.
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
- `npm run dev` — build + serve http://localhost:4321 with rebuild/live-reload on changes (re-imports the build script each time, so build changes need no restart)
- The graph layout is precomputed at build time (`scripts/layout.mjs`, cytoscape + fcose headless) for the default view and the full network, cached in `.cache/layout.json`; keep its options in sync with `layoutGraph()` in `app.js`. PURSUE record summaries ship separately in `site/data/records.js`, loaded on demand.
- Real URLs, no `#/`: every view has a path (`/explore`, `/timeline`, `/world`, `/videos`, `/documentaries`, `/books`, `/a-z`, `/claims`) and every file its own page (`/person/david-fravor`, `/incident/…`, `/video/<title>`; `?t=SECONDS` seeks a video). `scripts/pages.mjs` writes one HTML page per view and per file into `site/` (gitignored): the app shell from `templates/app.html` (edit that, not `site/index.html`) plus a server-rendered article with title, description, canonical, Open Graph, JSON-LD and the full content (facts with sources, links; video pages carry moments and the full transcript), plus `sitemap.xml` and `robots.txt`. The app removes the article on boot. PURSUE records get pages with `noindex` and stay out of the sitemap. Slugs are frozen in `content/slugs.json` (commit it) so renaming an entry never breaks a link; to change one on purpose, edit that file. View paths live in both `VIEW_PATH` (pages.mjs) and app.js. Use absolute paths (`/assets/…`, `/data/…`) in the app — pages live at nested URLs.
- `npm run check` — validate (dangling ids, bad statuses, missing files)
- `npm run fetch -- <youtube url|id> [--download]` — metadata + transcript into `media/<id>/`, creates a stub `content/video/` entry. YouTube rate-limits (HTTP 429): fetch in small batches.
- `npm run import:pursue [-- --download "regex"]` — refresh the war.gov/UFO PURSUE catalog into `content/record/` (drives local Chrome; importer-owned fields refresh, user notes below the marker are kept)
- `npm run add:doc -- <url> <id>` — download a document into `library/docs/` (falls back to Chrome when sites block scripts), extract text, OCR scans; then write `content/document/<id>.md` with `files:` and facts citing `source: library/docs/<id>.pdf`
- Non-YouTube videos (X, news sites): download with `yt-dlp -o media/<id>/video.mp4 <url>` (e.g. id `x-<postid>`), write `media/<id>/meta.json` (title, channel, date, duration, url), transcribe with `node scripts/transcribe.mjs <id> [--translate] [--lang xx]` (Whisper large-v3-turbo, model in ~/.cache/whisper-cpp), and create `content/video/<slug>.md` with `media: <id>` and `url: <post>`. Local copies play only on the dev server; by default the public site embeds or links the original post. Re-hosting a third-party video publicly is the owner's decision, case by case: if approved, make it faststart (`ffmpeg -c copy -movflags +faststart`), add a `thumb.jpg`, upload both to R2 under `media/<id>/` (`rclone copy media/<id> r2:wherearethey/media/<id>`), and set `stream:`/`thumb:` on the video entry.
- `node scripts/ocr.mjs <pdf>` — OCR a scanned PDF into a sibling `.txt`
- Full-text search: every `files:` entry with a sibling `.txt` is split into pages (on form feeds) into `site/data/doctext/<id>.js` and searched alongside video transcripts (Videos / Documents tabs); hits open the PDF at `#page=N`. Keep the `.txt` committed — it is the search index.
- Documents: verify every supplied link by reading the downloaded text before filing (links from lists are often wrong). **Verify every quoted passage word-for-word against the downloaded text** before using it — pasted summaries have repeatedly contained altered or fabricated “exact quotes” (e.g. a misquoted UAPDA legacy-program definition; an invented AARO sentence). Quote only from our own copies. Record provenance (who released it, when, record ID). Mark compilations and mirrors as secondary sources and trace their claims to primary documents.
- Analytics: Google Analytics loads only after consent in the EEA/UK/Switzerland (banner + `site/privacy.html`); elsewhere it runs by default with opt-out via “Cookie settings”. The visitor's country is injected by the Netlify edge function `netlify/edge-functions/geo.js` (replaces `<!--GEO-->` in `index.html`); unknown country → banner. Disabled on localhost.
- Heavy binaries (library PDFs/images, media video) are gitignored and synced to Cloudflare R2 with `npm run r2:push` / `r2:pull` (rclone remote `r2`, bucket `wherearethey`). Commit the `.txt` extractions, never the binaries.
- Original seed notes: `notes/original-notes.md`. Raw PURSUE catalog snapshot: `sources/pursue/`.
