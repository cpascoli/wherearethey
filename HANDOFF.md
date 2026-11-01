---
runtime: claude-local
updated: 2026-11-01T04:01:35Z
session_id: 1b53c348-8471-4860-80b9-183d056a10eb
---
# Handoff: Where Are They — file the strong cases from the missing MoD UFO releases

- **Branch:** `task/archive-continuation` (base: `main` at `12bfa0f`; this branch adds a refreshed `content/lastmod.json` and this file, nothing merged yet)
- **Repo:** `cpascoli/wherearethey` (live at https://wherearethey.info, Netlify deploys `main`)
- **Updated:** 2026-11-01 09:55 +07 by claude (cloud session; it could not download PDFs, so the filing moves to the laptop)
- **Status:** research done, filing not started
- **Triage report (read first):** https://claude.ai/artifact/KSzYs6vvDgWYy4Y9e4xkwZ ("Missing MoD UFO files: 2010 releases triage")

## Goal
Three National Archives MoD UFO releases are missing from the archive: **March 2009**, **February 2010**, **August 2010**
(about 48 files). The user does NOT want them bulk-filed as graph content. File only the strong cases (unresolved, with
pilots / controllers / military / police witnesses, instrument data, or many independent witnesses), with counter-evidence
as usual, and strengthen existing pages. The user approved the shortlist in the report's Recommendation section.
Read `CLAUDE.md` first (sourcing rule, entry format, outcome statuses, quote verification).

## Current state
- Nothing filed yet. No files from these releases are in `library/docs/mod-ufo/` or `content/document/`.
- Filed releases (`content/document/doc-mod-ufo-files-*.md`): May 2008, Oct 2008, Aug 2009, Mar 2011, Aug 2011, Jul 2012, Jun 2013.
- The Black Vault (our usual mirror) does not host the 2010 releases; get the PDFs from The National Archives (Discovery,
  digital copies are free downloads) or another mirror. Discovery pages block scripted fetches; use Chrome.

## File lists (from the Archives' research guides; verify against Discovery)
- **March 2009:** DEFE 24/1938; DEFE 31/176, 177, 178, 179, 180, 181 (DI55, Nov 1987–Apr 1993). Highlights guide:
  https://cdn.nationalarchives.gov.uk/documents/mar-2009-highlights-guide.pdf (gives page numbers per case).
- **February 2010 (24 files, >6,000 pages, 1994–2000):** reports DEFE 24/1977, 1988, 1989, 1990, 2007, 2008, 2009, 2010;
  PQs 1971; correspondence 1966–1969, 1979–1981, 1994; persistent correspondents 2000, 2002, 2003, 2016, 2017, 2029
  (the guide also lists 2091, which we already have under Aug 2011).
- **August 2010 (18 files):** DEFE 24/1973, 1978, 1982, 1983, 1991, 1992, 1993, 1995, 1996, 1998, 2001, 2004, 2012, 2013,
  2014, 2015, 2042, 2045 (list from the release's own PDF names; the 2013 guide omits 1991 and 2004).

## Next steps
1. Download only the files that back the shortlist below into `library/docs/mod-ufo/` (`npm run add:doc` or Chrome),
   OCR with `node scripts/ocr.mjs`. Each gets its own `content/document/` entry WITHOUT `search: optin` (CLAUDE.md:
   "files that back a case get their own document").
2. New incidents, strongest first (find the pages, verify every quote word for word against our `.txt`):
   1. BA 5061 near-miss on the Manchester approach, 6 Jan 1995 (Capt Roger Wills, F/O Mark Stuart; no radar return;
      CAA called the object "unassessable") — Feb 2010, report file not yet identified (try 1977/1988).
   2. Heathrow tower: two controllers, black inverted-boomerang object, 17 Dec 1992 — DEFE 31/181 p128.
   3. Britannia Airways 737 near-miss with a Mach 3 object off Elba, 1 May 1992 — DEFE 31/181 p353.
   4. Prestwick ATC radar track >1,000 knots, Feb 1999 — Feb 2010, likely DEFE 24/2009 or 2010.
   5. Howden Moor, Peak District, 24 Mar 1997: booms, 15-hour police/mountain-rescue search, BGS sensor — counter-evidence:
      27 May 1998 RAF P&SS report (six Tornado GR1As from RAF Marham; booms unexplained). File location unconfirmed
      (Aug 2010 per press; David Clarke says 2011 — check `/mod-files` search for "Howden" first, it may already be in a 2011 file).
   6. RAF Cranwell "possible missile", 11 Sep 1991, RAF pilot + student, police, radar check — DEFE 31/180 p149.
   7. Louth, Lincolnshire, three-light triangle, numerous witnesses, 9 Dec 1992 — DEFE 31/181 pp281–282.
   8. Only if the pages hold up: helicopter crew encounter 21 Feb 1988 (DEFE 31/176 p257); Belfast Airport Dec 1989
      (DEFE 24/1938 pp2–9; DEFE 31/179 pp209–217). Maybe: black triangle near Michael Howard's home, Kent, 8 Mar 1997.
3. Strengthen existing pages:
   - `inc-rendlesham-1980`: DEFE 24/1995 (Penniston + Halt interview transcripts), 24/2042 (2002 Ombudsman ruling),
     24/1983 (MoD position statement, as counter-evidence).
   - `inc-calvine-1990`: add DEFE 31/179 and 31/180 as local sources (already cited by reference).
   - `inc-tornado-north-sea-1990`: DI55's Soviet rocket-body explanation (DEFE 31/180 pp180–182) — decide `outcome` per the rules.
   - Cosford 1993 (search `content/incident` for cosford): DI55's Cosmos re-entry finding (DEFE 31/181 pp46–72) if missing.
4. Open choice, asked in a comment on the report and not yet answered: also add the full three releases to the
   `/mod-files` search page (release documents with `search: optin`, ~48 files, OCR, then the user's `r2:push` + `r2:index`)?
   That adds nothing to the graph. Ask before doing it.
5. `npm run check`, commit on this branch; merge to `main` and push only when the user says "push".

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
- WebFetch on Discovery catalogue pages returns empty; beta.nationalarchives.gov.uk is robots-blocked. Use Chrome on the laptop.

## Open questions for the user
- Full releases on the MoD search page too, or shortlist only? (comment on the report)
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
