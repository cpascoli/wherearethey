---
runtime: claude-local
updated: 2026-11-01T05:46:17Z
session_id: 1b53c348-8471-4860-80b9-183d056a10eb
---
# Handoff: Where Are They — file the strong cases from the missing MoD UFO releases

- **Branch:** `task/archive-continuation` (base: `main` at `12bfa0f`; this branch adds a refreshed `content/lastmod.json` and this file, nothing merged yet)
- **Repo:** `cpascoli/wherearethey` (live at https://wherearethey.info, Netlify deploys `main`)
- **Updated:** 2026-11-01 12:40 +07 by claude-local (laptop)
- **Status:** shortlist filed (10 new or extended cases, 12 documents), all committed on this branch; only DEFE 31/176 (optional) left; nothing pushed since the pickup commits
- **Triage report (read first):** https://claude.ai/artifact/KSzYs6vvDgWYy4Y9e4xkwZ ("Missing MoD UFO files: 2010 releases triage")

## Goal
Three National Archives MoD UFO releases are missing from the archive: **March 2009**, **February 2010**, **August 2010**
(about 48 files). The user does NOT want them bulk-filed as graph content. File only the strong cases (unresolved, with
pilots / controllers / military / police witnesses, instrument data, or many independent witnesses), with counter-evidence
as usual, and strengthen existing pages. The user approved the shortlist in the report's Recommendation section.
Read `CLAUDE.md` first (sourcing rule, entry format, outcome statuses, quote verification).

## Current state
- **Filed as incidents** (all with page-cited facts and a case document for the file they come from):
  `inc-howden-moor-1997` (DEFE 24/2018, disputed), `inc-manchester-near-miss-1995` (DEFE 24/1961 pp. 381–382 + Hansard 1996 +
  BUFORA transcription of the airmiss report), `inc-cranwell-missile-1991` (DEFE 31/180 p. 148), `inc-heathrow-tower-1992`
  (DEFE 31/181 p. 127), `inc-louth-triangle-1992` (31/181 pp. 280–281, handwritten), `inc-britannia-elba-1992` (31/181 pp. 351–352).
- **Extended:** `inc-rendlesham-1980` (DEFE 24/1983: the 1996 line; 24/1995: Penniston's and Halt's 1997 accounts, the Nov 1997
  reply; 24/2042: the 1983 note, Trefgarne 1985, a former Under Secretary's letter, the 2002 Ombudsman case), `inc-calvine-1990`
  (31/179 pp. 156–157 brief and press lines; 31/180 p. 55 imagery tasking form), `inc-tornado-north-sea-1990` (31/180 pp. 156, 164,
  178, 181; outcome left open: the 1991 papers only order a Fylingdales check), `inc-cosford-1993` (31/181 pp. 45–59, the PUFORG
  report with the Irish findings), `inc-lightning-xs894-1970` (31/181 pp. 240–245, the full accident report).
- **Documents:** case docs `doc-mod-defe-24-1961`, `-24-1983`, `-24-1995`, `-24-2018`, `-24-2042`, `-31-179`, `-31-180`, `-31-181`;
  release docs `doc-mod-ufo-files-2009-03` (4 of 7 files held), `-2010-02` (24/1988, 24/2007 held), `-2010-08` (24/1983, 24/1995,
  24/2042 held), all `search: optin`; the March 2009 highlights guide added to `doc-tna-mod-ufo-files-guides`.
- **Library:** `library/docs/mod-ufo/defe-{31-179,31-180,31-181,24-1938,24-1983,24-1988,24-1995,24-2007,24-2008,24-2042}.pdf` + `.txt`
  (the Archives' digital copies, downloaded by the user into `tmp/pdfs/defe/` in parts and merged with `pdfunite`; the `.txt` are
  committed, the PDFs need the user's `npm run r2:push`). Also in `tmp/pdfs/defe/` but not merged or used: DEFE 24/1977, 2009, 2010.
  Page numbers in the Archives' PDFs run one lower than the highlights guides' numbers.
- **Decided not to file:** Belfast Airport 1989 (DEFE 24/1938 pp. 5–8, 31/179 pp. 208–213: one civilian witness; the checks are in
  `doc-mod-defe-31-179`'s facts); the Kent triangle of 8 Mar 1997 (not in DEFE 24/1988; its only "Michael Howard" entry is a hoax call).
- **Prestwick 1999** was in DEFE 24/2008 (not 2007): filed as `inc-prestwick-radar-1999`, outcome open (radar replays of three sites did not support the sighting; no explanation offered).
- The user answered the scope question: **shortlist only**, no full releases on the search page.

## Next steps
1. ~~DEFE 24/2008~~ — done: `inc-prestwick-radar-1999` filed (pp. 274–276, 298–301), `doc-mod-defe-24-2008`, file added to the Feb 2010 release doc.
2. If the user downloads **DEFE 31/176** (C10232690): check p. 256 (guide p. 257) for the 21 Feb 1988 helicopter report; file only if a
   location and crew are given; add the file to `doc-mod-ufo-files-2009-03`.
3. The user runs `npm run r2:push` (new PDFs) and, if wanted, `npm run r2:index` for the search page; merge to `main` and push only on "push".
4. Optional polish: `inc-cranwell-missile-1991` is thin (one page, no outcome); `inc-britannia-elba-1992` has no incident date.

## Decisions (and why)
- Shortlist only, no bulk graph entries — user's explicit wish ("only the interesting ones … not explained and resolved").
- Skipped on purpose: single-witness civilian reports (Ebbw Vale "tube of light" 1997, Kingstanding 1997, Wakefield 1995,
  East Grinstead 1995), the Churchill wartime-sighting letter (third-hand hearsay), Bonnybridge (a councillor's request, not
  a sighting), explained cases (Ford Mondeo airship, refuelling exercise, jettisoned fuel, Cosmos re-entry as a standalone case),
  the 4 Jan 1992 North Atlantic captain report (DI55: possibly meteorological), all correspondence/FOI/PQ files.
- Boston/Skegness 1996 is already filed (`inc-boston-skegness-1996`), so not on the shortlist.
- Commit locally, push only on the user's "push"; the user runs `npm run r2:push` / `r2:index` themselves.

## Tried and rejected
- Downloading from the cloud workspace: The Black Vault and nationalarchives.gov.uk are outside its network allowlist (403).
- WebFetch on Discovery catalogue pages returns empty; beta.nationalarchives.gov.uk is robots-blocked.
- On the laptop: curl and headless-Chrome fetches of Discovery return an empty 202 (bot check) and the auto-mode classifier
  blocks further attempts; `npm run add:doc` on `discovery.nationalarchives.gov.uk/download/r/<id>` cannot pass the sign-in.
  Discovery ids found: DEFE 31/179 = C10232693, 31/180 = C10232694, 31/181 = C10232695 (31/176–178 are probably
  C10232690–92; check). Use the Claude-in-Chrome extension in a Chrome where the user is signed in to Discovery, or have the
  user download the PDFs into `library/docs/mod-ufo/` (named `defe-31-181.pdf` etc.) and run `node scripts/ocr.mjs` on each.

## Open questions for the user
- Whether to order DEFE 31/176 (optional; asked; the user downloads from Discovery into `tmp/pdfs/defe/`, which works well:
  Discovery splits big files into `DEFE-xx-yyyy-1_N.pdf` parts).
- (answered: shortlist only)
- DEFE 24 numbers 1932–1937, 1944–1947, 1950, 2011, 2051 appear in no release checked: closed, non-UFO, or missing? One Discovery check.

## Verify
```
npm run check            # expect "0 warnings · 0 errors"
npm run dev              # http://localhost:4321
```
Manual: each new incident page shows its facts with page-cited sources and counter-evidence; Rendlesham shows the new files.

## Files that matter
- `CLAUDE.md` — rules; `content/document/doc-mod-ufo-files-*.md` — release document format; `content/document/doc-mod-defe-24-1931.md` — single-file case document format.
- `content/incident/inc-calvine-1990.md`, `inc-rendlesham-1980.md`, `inc-tornado-north-sea-1990.md`, `inc-boston-skegness-1996.md` — pages to extend / reference.
- `scripts/ocr.mjs`, `scripts/mod-index.mjs`, `site/mod-files.html`.
- Do not commit the user's untracked files: `docs/`, `reports/`, `research_notes/`, `media/3ghztFdMnmw/`, `start.sh`, `sources/web/*`.
