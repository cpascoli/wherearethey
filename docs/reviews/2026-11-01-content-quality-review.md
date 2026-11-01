# Content quality review — 1 November 2026

**Review date:** 1 November 2026
**Scope:** every graph file in `content/` (1,122: 759 non-video entries and 359 videos; PURSUE records, news and claims are not graph nodes and were left out), ranked by connections (graph degree in the built `kb.js`: explicit links plus generated fact, moment, claim, mention and transcript edges) and reviewed from the most connected down.
**Question asked of each file:** is the summary a clear, sourced account of what the thing is and why it matters, with the counter-evidence; are the facts precise, correctly statused and attributed; and do the video moments tagged to the file cover the facts and claims the file makes (and the other way round: does the file state what its moments say)?

**Method.** Three passes. (1) A script computed, for every file, connections, body length, facts and their statuses, links, and, for videos, transcript and moment density. (2) A cross-check matched each file's facts and claims against the moments tagged to it: facts citing a video timestamp with no moment within 150 s, facts citing a video with no timestamp, claims asserted in facts but on no moment, videos linked to the file with no moment tagged to it, people who speak in moments but have no facts. (3) The 93 files with 20 or more connections (the first two PURSUE release events excluded) were read in full, with their moments, by four reviewers against CLAUDE.md, and graded A–D. Files with 8–19 connections (186) and under 8 (473) carry the scripted flags only; their lists are in sections 4 and 5. Spot checks confirmed the reviewers' findings on the files named in the summary (stale record counts, empty `rel:` keys, timestamps with no moment, the mis-attributed Davis fact, the untagged Lacatski claim, the paraphrased glimpse).

The 25 October review found the three systems (graph, claims ledger, moments) half-wired. Most of what follows is the same problem seen file by file: the moments are now rich, and the files have not caught up with them.

---

## 1. Summary

**The best-connected files are the thinnest where it matters most.** The hub files that every trail passes through were written early as one- or two-paragraph placeholders and have been outgrown by the material linked to them. The FBI (147 connections) has 54 words and two facts; AARO (139), the home of the official counter-evidence, has two facts and no claims tags while 48 moments mention it; the crash-retrieval concept (89) has one fact, a definition, under 53 moments that include Bray's sworn "we have no material", Grusch, Elizondo, Davis, Lacatski and Stratton; PURSUE (67) has no number of records, no critique and no link to the directive that created it. Nimitz (73), the flagship case, has two facts under 55 moments. These eleven need rewriting, not polishing: `fbi`, `aaro`, `cia`, `crash-retrieval`, `nara`, `inc-nimitz-2004`, `pursue`, `uaptf`, `legacy-program`, `bigelow-aerospace`, `boeing`.

**Moments outrun facts almost everywhere.** For 52 of the 93 top files the reviewers found strong, in-criteria statements in the tagged moments that the file does not state: Bray 2022 on Nimitz and Malmstrom, Gillibrand's critique of the Historical Record Report, Clapper on Area 51, Knapp's sworn Lockheed testimony, the Figel and Meiwald recordings on Malmstrom, Hynek's 1966 footage, Pope's Cosford material. The pattern is the same each time: the moment was curated, the person's or case's file was not updated. Section 3 lists the moments per file with timestamps, so each can be turned into a fact with `by:` and `source: video@t`.

**Claims are tagged on facts but not on the moments that make them, and vice versa.** Twenty-five files assert a claim in a fact whose matching moment carries no `claims:` tag (Lacatski's 2011 Capitol statement, the central first-hand assertion of `recovered-non-human-craft`, is untagged on both the fact and four moments). The reverse also occurs: moment-only claims with no fact on the file (Rendlesham injuries and disinformation, Lakenheath, Gaetz's Eglin claim). Claim pages and "positions on claims" miss both.

**Citations that point nowhere.** 18 files have a fact citing a video timestamp with no moment near it (Legacy program's Borland @1:19:11, Wright-Patterson's Moskowitz @22:40, the NRO's four Grusch and Davis citations, Malmstrom's 2001 timestamps, Steven Greer's Hellyer citation), and 8 cite a video without a timestamp. A reader clicking the source lands in the middle of a two-hour recording. Fix by adding the moment or re-pointing the fact.

**Fact hygiene.** The reviewers found bundled facts (two or three statements under one `by:`), editorial facts ("one of the most vocal advocates…"), bibliographic facts marked `claimed`, testimony marked `documented` because it came from a transcript while the same witness's other lines are `claimed`, Wikipedia as the only source on central files (Nimitz, Roosevelt, Roswell, Rendlesham's sceptic paragraph, Blue Book's closing figures), and three facts with wrong sources (Eric Davis's Lockheed fact cited to the Wilson notes; Legacy program's "proponents argue" cited to the Disclosure Act; a glimpse in *New Insights* that is a paraphrase, not the book's words). One link label is wrong (Luna "testified at" the May 2025 briefing she hosted) and one moment is mis-tagged (Wiggins's 2023 USS Jackson tic-tac carries `inc-nimitz-2004`).

**Lower tiers.** Of 186 files with 8–19 connections, 77 carry a flag, mostly thin summaries (organisations and witnesses written in one sentence) and incidents with no documented fact. Of 473 files under 8 connections, 227 carry a flag: 123 thin summaries (74 of them people), 36 incidents with no documented fact (nearly all the Tier B cases added from the MoD files and the four-country reports), 45 people whose facts cite only URLs, 28 files with no Sources line and no links, 31 files with no facts (12 of them people who speak in moments: Kenneth Arnold, the Apollo and Mercury astronauts, Kevin Campbell).

**Videos.** 224 of 359 videos have transcripts; the 135 without are the PURSUE sensor clips and one trailer. 29 long interviews with transcripts carry fewer than four moments an hour, including Jake Barber (184 min, 2 moments), John Blitch (191 min, 2), Joe McMoneagle (374 min, 7), Fravor on Lex Fridman (236 min, 15), Luna on Rogan (149 min, 7), the 1994 Larry King special (124 min, 4); one podcast and one profile have none. Nineteen well-connected videos list a person as featured who never appears as a speaker in a moment (Knapp and Corbell in the WEAPONIZED episodes, Pope, Symington and Choy in the 2007 panel, Friedman in the 1988 special, Burroughs and Penniston in the Citizen Hearing closing session). Hearing and event files have no moments tagged to them at all, so their pages show no highlights; the recordings' moments are tagged to people only.

### What to do first

1. Rewrite the eleven hub files named above, each as 2–3 paragraphs with the counter-evidence, 5–8 facts drawn from the moments listed in section 3, claims tags on the facts, and real links (AARO and Lockheed have none; Nimitz, Rendlesham, Varginha and Malmstrom have an empty `rel:`).
2. Work through section 3's "Moments" lines for the remaining top files, turning the listed moments into facts: Malmstrom, Roswell, Varginha, Rendlesham, Roosevelt, Hynek, Vallée, Clarke, Pope, Stratton, Elizondo, Lacatski, Halt.
3. Fix the 26 broken citations (facts citing a timestamp with no moment, or a video with none) and the three wrong sources; retag the Wiggins moment; fix the Luna label.
4. Tag claims on both sides: the untagged moments listed under each file, and facts for the moment-only claims.
5. Tag 5–8 defining moments to each hearing and event (`refs: [h-…]`) so their pages show highlights: the Citizen Hearing, the 2023, 2024 and 2025 hearings, the 2001 and 2007 press conferences, the 2026 Capitol and Varginha press conferences.
6. Add moments to the thin long interviews in section 6.1 and give the 12 speakers with no facts (section 5) at least the facts their moments contain.
7. Replace the 34 `related to` links (section 7), and check over-broad transcript aliases such as `aka: [Tic Tac]` on Nimitz, which matches the 2023 and 2024 tic-tac cases too.

---

## 2. Snapshot

| Tier | Connections | Graph files (non-video) | With at least one flag |
|---|---|---|---|
| 1 | 20 or more | 100 | 46 |
| 2 | 8 to 19 | 186 | 77 |
| 3 | under 8 | 473 | 227 |

Videos: 359. With transcript: 224. With moments: 351. Without any moment: v-ariel-phenomenon-trailer, v-2018-11-19-bob-lazar-area-51-flying-saucers-trailer-2018-ufo, v-2024-12-20-the-alien-perspective-official-trailer-2025-docum, v-2026-03-18-s4-the-bob-lazar-story-release-trailer-out-now-20, v-jre-fan-we-are-you, v-2013-citizen-hearing-trailer, v-anonymous-interview-trailer, v-tim-leach-war-reporter-profile.


---

## 3. Files with 20 or more connections, read in full

Ordered by connections. Grades: A publish-ready, B minor polish, C needs work, D thin or weak. The seven PURSUE release events (`ev-pursue-release-01…07`, generated from the catalog) were not graded; they are adequate as release notes.

| Grade | Files |
|---|---|
| A (publish-ready) | 16 |
| B (minor polish) | 50 |
| C (needs work) | 21 |
| D (thin or weak) | 6 |

| Conn. | File | Grade |
|---|---|---|
| 393 | `department-of-war` (organization) | B |
| 147 | `fbi` (organization) | D |
| 139 | `aaro` (program) | C |
| 112 | `aawsap` (program) | B |
| 109 | `dia` (organization) | B |
| 108 | `project-blue-book` (program) | B |
| 104 | `inc-centcom-uap-2013-2025` (incident) | B |
| 104 | `cia` (organization) | C |
| 94 | `nasa` (organization) | A |
| 89 | `crash-retrieval` (concept) | C |
| 89 | `david-grusch` (person) | B |
| 80 | `nara` (organization) | C |
| 73 | `inc-nimitz-2004` (incident) | C |
| 71 | `inc-roswell-1947` (incident) | B |
| 67 | `pursue` (program) | C |
| 65 | `uk-mod` (organization) | B |
| 60 | `h-2013-citizen-hearing` (hearing) | B |
| 57 | `george-knapp` (person) | B |
| 56 | `inc-rendlesham-1980` (incident) | B |
| 50 | `area-51` (place) | B |
| 50 | `doc-dirds` (document) | A- |
| 48 | `wright-patterson-afb` (place) | B |
| 48 | `uaptf` (program) | C |
| 47 | `legacy-program` (program) | C |
| 46 | `jay-stratton` (person) | A- |
| 44 | `david-fravor` (person) | A |
| 44 | `aatip` (program) | B |
| 43 | `house-oversight` (organization) | B |
| 42 | `hal-puthoff` (person) | A- |
| 41 | `doc-aaro-historical-record-report-v1` (document) | B |
| 40 | `film-age-of-disclosure` (film) | C |
| 40 | `chris-mellon` (person) | A- |
| 39 | `luis-elizondo` (person) | B+ |
| 37 | `nhi` (concept) | B |
| 37 | `eric-burlison` (person) | B |
| 37 | `steven-greer` (person) | B |
| 35 | `doc-tna-mod-ufo-files-guides` (document) | A |
| 35 | `uk-national-archives` (organization) | C |
| 35 | `skinwalker-ranch` (place) | C |
| 34 | `inc-roosevelt-2015` (incident) | B+ |
| 34 | `uap-disinformation` (concept) | A |
| 33 | `eric-davis` (person) | B |
| 32 | `garry-nolan` (person) | A- |
| 32 | `harry-reid` (person) | B |
| 32 | `lockheed-martin` (organization) | C |
| 32 | `ryan-graves` (person) | B |
| 32 | `bob-salas` (person) | A- |
| 32 | `sean-kirkpatrick` (person) | A- |
| 31 | `anna-paulina-luna` (person) | B+ |
| 31 | `tim-gallaudet` (person) | B |
| 30 | `robert-bigelow` (person) | A |
| 29 | `remote-viewing` (concept) | C |
| 29 | `james-lacatski` (person) | B+ |
| 29 | `inc-east-asia-us-military-uap-2021-2025` (incident) | B |
| 29 | `tim-burchett` (person) | B |
| 29 | `bigelow-aerospace` (organization) | D |
| 29 | `book-skinwalkers-at-the-pentagon` (book) | B+ |
| 29 | `j-allen-hynek` (person) | C |
| 28 | `charles-halt` (person) | B |
| 27 | `ev-npc-2007` (event) | C |
| 27 | `inc-malmstrom-1967` (incident) | C |
| 27 | `nick-pope` (person) | B |
| 27 | `ev-disclosure-project-2001` (event) | C |
| 27 | `stanton-friedman` (person) | B- |
| 26 | `geipan` (organization) | C |
| 26 | `bob-lazar` (person) | B |
| 26 | `leslie-kean` (person) | B |
| 26 | `kona-blue` (program) | B |
| 25 | `inc-us-domestic-uap-1996-2026` (incident) | B+ |
| 25 | `inc-varginha-1996` (incident) | B |
| 25 | `project-sign` (program) | A |
| 24 | `richard-doty` (person) | B+ |
| 23 | `doc-robertson-panel-1953` (document) | B+ |
| 23 | `task-force-declassification` (organization) | C |
| 23 | `david-clarke` (person) | D |
| 23 | `linda-moulton-howe` (person) | C |
| 22 | `book-inside-covert-ufo-program` (book) | A- |
| 22 | `dylan-borland` (person) | B |
| 22 | `jacques-vallee` (person) | D |
| 21 | `boeing` (organization) | D |
| 21 | `edgar-mitchell` (person) | B |
| 21 | `h-2023-07-26` (hearing) | B |
| 20 | `h-2025-09-09` (hearing) | B- |
| 20 | `jon-kosloski` (person) | A- |
| 20 | `stargate` (program) | B- |
| 20 | `nro` (organization) | B |
| 20 | `kirk-mcconnell` (person) | A |
| 20 | `book-covert-ufo-new-insights` (book) | B |
| 20 | `donald-trump` (person) | D |
| 20 | `richard-dolan` (person) | C |
| 20 | `ev-nyt-2017` (event) | B |
| 20 | `jeremy-corbell` (person) | B |
| 20 | `raf-bentwaters-woodbridge` (place) | B |

### department-of-war (organization, 393)
Grade: B
- Summary: lead says what it is and why it matters, Sources line present. Doesn't say when/why "Department of War" (the Sept 2025 executive order giving the secondary title).
- Facts: one fact, stale vs body: fact says 257 of 450 records in releases 01–06, body says 284 of 478 through release 07.
- Do: update the fact to the release-07 count; add a `documented` fact on the 2025 renaming with the EO / Federal Register as source.

### fbi (organization, 147)
Grade: D
- Summary: 54 words, two sentences; no why-it-matters (the FBI's 1947 "flying disc" reporting, Hoover's involvement, the 2020s PURSUE witness submissions that the 5 tagged moments show). Body says the Majestic-12 investigation is "filed here" but nothing links to it. Sources line generic.
- Facts: only 2; the "104 records across releases 01–06" fact is stale (release 07 is out); Hottel fact leaves out the FBI's own Vault note that it was never investigated.
- Moments: all 5 moments (fbi-uap-pr001…pr007: 2020s citizen videos submitted to the FBI) are absent from body and facts.
- Links: `rel:` is empty.
- Do: rewrite to 2–3 paragraphs: 1947 "flying disc" reports and the Roswell telex (link doc-gao-roswell-1995/inc-roswell-1947), Hottel 1950, MJ-12 inquiry, PURSUE submissions; add a fact for the PURSUE-era witness videos citing a record id; make the record-count fact release-agnostic; proper Sources line.

### aaro (program, 139)
Grade: C
- Summary: clear lead, counter-view (Grusch) noted. But it is the hub of the official counter-evidence and the body is two short paragraphs; Tim Phillips (acting director) is in the body but not in facts; no mention of the case resolutions (GoFast 2025) or the ~1,600-report caseload.
- Facts: only 2. Director fact cites a MeriTalk article; cite the DoD announcement. The Historical Record Report finding (quoted in body) is not a fact and carries no `claims:` tag (should be `documented`, `claims: [recovered-non-human-craft]`, `stance: disputes`, `claim_by: aaro`). No fact for the FY2022 NDAA mandate. No fact-level claims at all, while 5 claims are tagged on moments.
- Moments: 48, almost none reflected in facts: Kirkpatrick "no credible evidence" (v-2023-04-19-hearing@857), 650 cases/half anomalous (@1448), Kosloski 1,600 reports (v-2024-11-19-hearing@420), "no verifiable evidence" (@458) and "some very anomalous objects" (@1015); Gallaudet's "influence operation" meeting (v-2024-11-13-hearing-a@4719); Luna "documented liar" (v-2025-09-09-hearing-a@1186); Lacatski's deputy-director/Kona Blue quote (v-2025-11-05…@840); Borland's memorandum-for-record dispute (v-jm-dylan-borland@7083); Puthoff's Oak Ridge analysis via AARO (v-jre-hal-puthoff-2025@5385); Grusch "Arrow ghosted me" (v-2026-08-13…@2969).
- Links: no `rel:` at all; `[ established by, doc-aaro-establishment-memo-2022 ]` and `[ replaced, aoimsg ]` belong here.
- Do: add 5–6 facts with claims tags (NDAA mandate, Historical Report finding, Kirkpatrick 2023 and Kosloski 2024 statements, GoFast resolution, Phillips acting 2023–24); add the critics' side as claimed facts (Gallaudet @4719, Lacatski @840, Borland @7083, Grusch @2969); replace the MeriTalk source; add establishment-memo and AOIMSG links.

### aawsap (program, 112)
Grade: B
- Summary: strong lead and why-it-matters, counter-evidence (AARO) present, Sources line ok. Body says 2009–2012 (AARO) while the authors (Kelleher @264, the book's glimpse) say Sept 2008–Dec 2010 and the NYT "late 2008 through 2011": the discrepancy is not stated.
- Facts: fact 5 is two facts (Grusch via JRE + Elizondo at v-2024-11-13-hearing-a@7050) under one `by: david-grusch` — split. `contractor, bigelow-aerospace` and `run by, dia` lack notes. Rest well sourced.
- Moments: not in facts: Lacatski "completely UFO-related"/statement-of-objectives (…skinwalkers-authors@32), AATIP "a nickname for OSAP" (@134), Vallée's 240,000-case database (sol-forum@4170), Knapp's sworn 2025 confirmation of the Lockheed negotiation (2025-09-09@3008; weaponized-stratton@2391) and Davis on Gaffney (v-jm-eric-davis@1088) — the body calls the transfer "unverified" without citing these; Lacatski's "both classified programs" (part-1@118), "deliberately false documents in government files" (@530), why it ended (@2004, Reid/2010 election vs AARO's "terminated 2012"). `recovered-non-human-bodies` tagged on the D168 fact but on no moment: tag Vallée's "hundreds of reports of creatures" (newsnation-varginha@2065, relayed/context). Linked v-2025-11-11-…-part-2 has no moment tagged here.
- Do: split fact 5; add facts for the Lockheed/Ryder/Gaffney transfer testimony (Knapp, Davis) and for the dating conflict; add Lacatski's 2025 statements (@118, @530, @2004); tag @2065 with recovered-non-human-bodies.

### dia (organization, 109)
Grade: B
- Summary: clear. Names Wilson, Lacatski, Stratton without why Wilson matters (the 1997 "Wilson memo" dispute).
- Facts: one fact; thin for 109 connections.
- Moments: Stratton's DIA-era black triangle over missile silos video (v-2026-10-13-fox-special-report-stratton@239, v-2026-10-16-fox-watters-stratton@115) — a first-hand claim by a former DIA chief of air and space warfare, not in the file. Doty (v-2020-02-21-mystery-wire-doty-part-2@142, DIA repository after Blue Book) could be a `claimed` fact.
- Do: add Stratton's silo-triangle fact (@239); one fact each for the Tehran attaché report (doc-dia-tehran-1976) and the DIRD FOIA release (doc-dia-foia-00159-2018); a clause on why Thomas Wilson is listed.

### project-blue-book (program, 108)
Grade: B
- Summary: "12,618 reports / 701 unidentified" and the 1969 closure statement appear only in the body and are Wikipedia-sourced; no document in the archive carries the numbers.
- Facts: fact 1 cites the generic war.gov/UFO page; Brad Sparks fact is `unverified` from a magazine aside (drop or source it).
- Moments not in facts: Harold Brown "We have not been hiding anything" (v-1966-05-10-cbs…@521 / v-hynek-harold-brown-press@30, stance disputes), Hynek "no proof" (v-hynek-harold-brown-press@18, v-1966-hynek-hearing-day@36), Friedman on Special Report 14 "21.5% unknown vs 3% in the press release" (v-2013-chd-opening@1900), Moultrie 2022 "no official DoD study between Blue Book and AATIP" (v-2022-05-17-hearing@3281), Salas on the operations officer's letter (v-2013-chd-nuclear-tampering-1@1040).
- Links: add `[ reviewed by, doc-robertson-panel-1953 ]`.
- Do: add a sourced fact for the 12,618/701 closure figures (Air Force fact sheet or AARO HRR) and the 1969 closure statement; add the Brown/Hynek 1966 and Moultrie 2022 facts; link the Robertson Panel; remove or source the Sparks fact.

### inc-centcom-uap-2013-2025 (incident, 104)
Grade: B
- Facts: "about 96 … records" — the file lists 89 `documented in` records; verify the count. Missing a fact that several paired mission reports offer conventional identifications (D010 "possible missile"/"possible birds", D014 "probable SU-27/35"): the counter-evidence inside the set.
- Moments: the D107/D108 descriptions (500 mph "white round orbit", six agile spheres at 480 mph; v-pursue-pr133@0, v-pursue-pr135@5) are the strongest content and are not in body or facts.
- Links: the body says the AC-130 Gulf of Oman case "has its own entry" but there is no link to inc-gulf-of-oman-ac130-2021.
- Do: fix the record count; add a fact on the conventional IDs in the paired reports and one on the D107/D108 formations; link the AC-130 incident.

### cia (organization, 104)
Grade: C
- Summary: two short paragraphs, no why-it-matters beyond Robertson; the Stargate funding in the body has no fact or source; the CIA's own 1997 Haines history (doc-cia-haines-1997, U-2 cover stories, inbound link) and Chadwell's December 1952 memo (doc-cia-osi-flying-saucers-1952, inbound) are absent from the body although both are filed. Sources line is vague ("CIA reading room").
- Facts: 2 only. Add the Haines 1997 finding (documented) and the Chadwell memo (documented).
- Moments: Dolan reading Chadwell (chd-history-2@385); Knapp naming Gaffney and "CIA gave contractors the material" (2025-09-09@8424, @8481); Stratton's "comprised of CIA…" (cuomo@332, tagged programs-hidden-from-congress) — the file carries no fact, no counter (AARO 2024 found no such program).
- Do: add Haines 1997 + Chadwell 1952 facts and body paragraph; add the gatekeeper allegations (Knapp sworn, Davis) with AARO's counter; fix Sources line.

### nasa (organization, 94)
Grade: A
- Moments: Michael Gold's two hearing statements are not in the file: study-team members "mocked and even threatened" (v-2024-11-13-hearing-a@3686) and the ASRS recommendation (@3827, @12018). The Apollo 16 "alien starbase" transcription dispute (@1919) is a documented aside (AARO's transcript vs the audio).
- Do: add Gold's two facts; optionally the Apollo 16 transcription note.

### crash-retrieval (concept, 89)
Grade: C
- Summary: two short paragraphs for the hub concept of the archive; names Grusch and AARO only. No Elizondo under oath (2024), Davis (2025), Lacatski's DOPSR-cleared sentence, Stratton (2026), Corso/Lazar as the template, Bray's 2022 "we have no material", Kirkpatrick.
- Facts: one fact (a definition).
- Moments: 53 moments, almost none reflected. Must-have facts: Bray 2022 "we have no material" (v-2022-05-17-hearing@3182, documented, stance disputes), Grusch 2023 (v-2023-07-26-hearing-a@1926, @2967), Elizondo yes/no on crash retrieval (v-2024-11-13-hearing-a@4067, @5064), AAWSAP divest memo (@7050), Lacatski "the wording is correct" (v-2023-10-17-weaponized…@880), Davis "not of this Earth" (v-2025-05-01-hearing-a@3895), Mellon's source saying the program was closed (v-2026-08-28…@2235), Davis "CIA shut down the effort in 1989" (v-jm-eric-davis@1998), Stratton 2026 (v-2026-10-13-fox-special-report-stratton@319). Linked video v-2026-10-20-cuomo-jay-stratton has 7 moments, none tagged to this file.
- Links: missing from either side: luis-elizondo, james-lacatski, scott-bray/h-2022-05-17, lockheed-martin, area-51.
- Do: expand to 3 paragraphs (who says it, Corso → Lazar → Wilson notes → Grusch → Elizondo/Davis/Lacatski/Stratton, and the official answers); add ~8 facts from the moments with claims/stance/basis; tag one moment in the Cuomo–Stratton video; link elizondo, lacatski, lockheed-martin.

### david-grusch (person, 89)
Grade: B
- Summary: strong. One inconsistency: body says he testified "while saying he had not seen them himself", but his 2026 statements (v-2026-06-09…@1236; v-2026-08-13-dr-phil…@1520) say program members exfiltrated video and photos of craft and cadavers for him to see — add that nuance.
- Facts: "He says Jay Stratton introduced him to Eric Davis…" has `by: eric-davis` but is phrased as Grusch's statement — the moment (v-2025-05-01-hearing-a@3749) is Davis's; reword. Magenta 1933 is in the body with no fact (moment v-jre-david-grusch@1002).
- Moments not in facts: under oath, personal knowledge of people harmed/murdered (v-2023-07-26-hearing-a@3193, @7144); "previously 1930's"/"nonhuman" (@4774); IR&D overcharging (@4128); number of recoveries "double digit" (v-jre…@1514) vs "under 100, more than 25" (v-2026-08-13…@2000) — one fact noting both; occupants taken alive (@2276); White House stopped the IG inquiry (@1617); Harry Reid briefing 2021 (v-jre…@1615).
- Do: reconcile "not seen" with the audiovisual-evidence statements; fix the Davis attribution; add facts for @3193/@7144 and the recovery-count statements; add a Magenta fact with the claim tag.

### nara (organization, 80)
Grade: C
- Summary: thin (37 words), one fact, no why-it-matters (what the collection holds, how records reach it, first transfers).
- Facts: the law is FY2024 NDAA secs. 1841–43 — cite the enacted text (doc-uap-disclosure-act-2023 is the proposed act; check which one the fact means).
- Links: inbound only from doc-uap-disclosure-act-2023; add `[ created by, … ]` with note, or the NDAA document if filed.
- Do: expand to 2 paragraphs (what RG 615 is, what has been posted, bulk downloads); add a fact on the first released batches with the NARA URL.

### inc-nimitz-2004 (incident, 73)
Grade: C
- Summary: body is good (lead, sequence, FLIR release, Mick West counter). Missing the official positions: Scott Bray under oath "simply remains unresolved" (2022), AARO has issued no resolution, Kirkpatrick's reported "DARPA experiment" line vs Gallaudet/Fravor, von Rennenkampff's 5–10 % human-tech allowance. Wikipedia in Sources for the flagship case — replace with the DoD statement, hearing transcript and doc-fravor-statement-2023-07-26.
- Facts: only 2 for a 55-moment flagship. Fact 1 is two facts. `rel:` is an empty key. The Spotify "Podcast episode" link has no title.
- Moments not in facts: Bray "remains unresolved" (v-2022-05-17-hearing@4564); Fravor "never investigated", no crew questioned (v-2023-07-26-hearing-a@2152); APG-73 jamming → passive pod (@3274, v-lex-fridman-david-fravor@5490); Fravor dismisses the seized-tapes story (v-lex-fridman-david-fravor@6030) vs Hughes's data-bricks account (v-2019-03-30-pj-hughes-hawkeye-data@68, v-2023-02-13-tim-ventura-pj-hughes@675) — state both; Stratton/AAWSAP made it the first case in 2009 (v-2026-10-21…@899, v-2026-01-09…@591); Day's track pattern (v-2019-10-12…@132); Voorhis's SPY recalibration (@142); Dietrich's size/no control surfaces (v-2025-03-18-avc-alex-dietrich@656); Gallaudet on Kirkpatrick's DARPA line (v-2026-08-28…@5012, v-2024-11-13-hearing-a@4719); Fravor's "two small appendages" (@6290) which von Rennenkampff uses for the human-tech possibility (@5190). Mis-tag: v-2025-09-09-hearing-a@2485 (Wiggins's 2023 USS Jackson tic-tac) carries `refs: [inc-uss-jackson-2023, inc-nimitz-2004]` — drop the Nimitz ref; bare "Tic Tac" in `aka` risks over-matching the 2023 and 2024 "tic tac" cases.
- Do: add 6–8 facts from the moments above with `by:` and video@t, including Bray and the two competing tape stories; add the official/sceptical counter-positions to the body and drop Wikipedia from Sources; remove inc-nimitz-2004 from the Wiggins moment refs; split fact 1; remove or fill the empty `rel:`.

### inc-roswell-1947 (incident, 71)
Grade: B
- Summary: Sources line is GAO + Wikipedia while the facts cite the Air Force reports; "Most historians regard…" is Wikipedia phrasing; body omits the 2026 PURSUE Haut affidavit (fact 4) and the 1980 Marcel interview the archive holds.
- Facts: Brazel fact is `claimed` with a ufology mirror (patrickgross.org) as source for a 1947 newspaper — cite the Roswell Daily Record copy; fact 4 is two-part. No fact for Jesse Marcel's own testimony, none for Haut's 1990 "None whatsoever" vs his 2002 affidavit (the best counter-evidence in the archive), none for the GAO's finding that RAAF outgoing messages for 1946–49 were destroyed.
- Moments: Marcel 1980 (v-1980-speigel…@482, @615), Haut "None whatsoever" (v-1990-07-roswell-reunion-haut…@4388), Randle on Mogul flight 4 cancelled in Crary's diary (v-2013-chd-roswell-1@1947), Randle conceding "no documentation from that time frame" for bodies (@5626), Cavitt contradiction (v-2013-chd-roswell-2@1774), Puthoff on the bismuth sample analysed at Oak Ridge (v-jre-hal-puthoff-2025@5385), Clinton 1995 quote (v-2013-chd-truth-lies-1@1813).
- Do: add facts by jesse-marcel (1980), walter-haut (1990 vs 2002), kevin-randle, with claims roswell-crashed-craft and stances; replace the Wikipedia sentence and fix Sources; mention the 2026 Haut-affidavit release and the Marcel interview in the body; source the Brazel fact to the newspaper.

### pursue (program, 67)
Grade: C
- Summary: no numbers (tranches, records), no critique (Nolan "evidence, not proof", Loeb "not good enough"), nothing on AARO's chain-of-custody caveat, nothing on who runs it politically.
- Facts: missing: ODNI NDA-waiver memo (v-jm-tim-gallaudet@753, claimed by gallaudet); Stephen Miller "leading the Pursue effort" (v-2026-10-26…@958, claimed by burlison); Burlison's office letters becoming tranche files (@1253); Nolan @173/@194 and Loeb @100 as critique; oldest documents 1944–45 (v-2026-08-28…@4154).
- Moments: 12, none reflected in facts.
- Links: the Trump directive is the founding act and donald-trump links to nothing: add `[ ordered by, donald-trump ]`. Link inc-western-us-orbs-2025 and aaro (`works with`).
- Do: add the Trump link and a fact on the directive; add release counts and the AARO chain-of-custody caveat; add Gallaudet's NDA-waiver, Miller, and the Nolan/Loeb critiques; link inc-western-us-orbs-2025.

### uk-mod (organization, 65)
Grade: B
- Summary: clear, accurate. Sources line has no URLs.
- Facts: body's 1951 Flying Saucer Working Party and Condign 2000 have no fact — add (DEFE 44/119; Condign in doc-tna-mod-ufo-files-guides).
- Links: no outbound rel at all though 20+ MoD documents link in; add `[ described in, doc-tna-mod-ufo-files-guides ]`.
- Do: add Working Party 1951 and Condign facts; add links to the guides doc; URLs in Sources.

### h-2013-citizen-hearing (hearing, 60)
Grade: B
- Facts: facts 1, 2, 5 are `claimed` with no `by:` (organiser's page) — give `by: stephen-bassett` or mark `documented`. Fact 4 ($20,000 per ex-member) rests on vijayvaani.com, a weak secondary source — re-source or drop.
- Moments: 0 tagged to the hearing itself, by design, but the hearing's page then shows no highlights: `refs: [h-2013-citizen-hearing]` on the 5–8 strongest witness moments (Callahan, Salas, Penniston, Hellyer, Pope).
- Links: the 14 `links:` session URLs duplicate the video entries — cut to the channel link.

### george-knapp (person, 57)
Grade: B
- Facts: fact 2 (Lazar 1989) duplicates bob-lazar's facts.
- Moments: fact "Lacatski told him the U.S. got inside a craft" carries recovered-non-human-craft but moment v-2025-09-09-hearing-a@6483 is untagged — tag it. Not in facts: Yemen "hellfire bounced off" (@6372), Sokolov's 40 intercepts/two pilots dead (@9541), D'Amato into Area 51 (@7172), Ryder/Gaffney transfer account (v-2026-10-21…@2391), Stratton "OSAP, ATIP and UAPTF" (@899–1028), "240,000 cases" database (v-2026-01-09…@591). Three linked videos with no moment tagged to him.
- Links: no link to jeremy-corbell (co-host, named in body).
- Do: tag @6483; add D'Amato/Area 51 and Ryder–Gaffney facts; tag one moment in each of the three untagged videos; link jeremy-corbell.

### inc-rendlesham-1980 (incident, 56)
Grade: B
- Summary: the sceptic paragraph (fireball, lighthouse timing, rabbit diggings, stars) rests on Wikipedia only; the police letter (DEFE 24/2033) is already a fact — cite it, and cite the 1983 MoD note for the lighthouse. Outcome stays `open` (MoD never adopted an explanation) — say so in body.
- Facts: Penniston fact cites v-2013-chd-rendlesham-1@1:07:10; nearest moment is 1:06:30 (@3990) — align. The DIS radiation assessment ("significantly higher than the average background", v-2013-chd-rendlesham-1@400) and Gen. Gabriel taking items to Ramstein (@495; v-2013-chd-rendlesham-2@61) are missing — claimed by Pope about MoD papers; ideally located in the DEFE file and made documented.
- Moments: claims uap-injuries and government-ufo-disinformation are moment-only: Penniston/Burroughs health effects (@2350, @2580), AFOSI scripted statement (v-2013-chd-rendlesham-2@590), Halt's injections/hypnosis account (v-7news-charles-halt-rendlesham@2180), lost time (@6020), Penniston's overexposed photos (@1174) are not in the file.
- Do: source the sceptic paragraph to DEFE 24/2033 and 24/2042; add DIS radiation and Gabriel/Ramstein facts; add the AFOSI/health-effects testimony as claimed facts with claims tags; fix the Penniston timestamp.

### area-51 (place, 50)
Grade: B
- Moments: James Clapper, former DNI: "there was an active program to track anomalous activities… notably Area 51" (v-2025-11-22-age-of-disclosure-clapper@8) — absent; add as `claimed`, `by: james-clapper`. Puthoff on Lazar's clearance check (v-jre-hal-puthoff-2025@6456, v-2022-02-11…@3340) is the best in-criteria counter to Lazar and is not in the file. Moskowitz is named in the body but no moment/fact backs it.
- Do: add Clapper's statement; add Puthoff's and Nolan's doubts on Lazar; source or drop the Moskowitz sentence.

### doc-dirds (document, 50)
Grade: A-
- "They are the most concrete surviving output of AAWSAP" is an opinion stated as fact — attribute or soften.
- Moments: Puthoff's "commissioned 38 papers" could back a fact `by: hal-puthoff` (v-hal-puthoff-2018-presentation@868).
- Do: soften the opinion line; add Puthoff fact @868.

### wright-patterson-afb (place, 48)
Grade: B
- Summary: "Hangar 18 legend" unsourced; December 2024 drone closure in body has no fact.
- Facts: Moskowitz fact cites v-2023-07-26-hearing-a@22:40 — no moment within 75 s.
- Moments: drones (v-2024-12-17-wcpo…@9/@22, von Rennenkampff "15 to 30 objects on radar per FOIA" v-2026-08-28…@649); French's FTD claims (v-2013-chd-roswell-2@187, @691) and Exon (v-2013-chd-roswell-1@4966) could be one `claimed` fact with the Air Force/GAO counter.
- Do: add a moment at ~22:40 or re-point the fact to doc-transcript-2023-07-26; add the 2024 drone fact; one fact for Exon/French with GAO's "no records" as counter.

### uaptf (program, 48)
Grade: C
- Facts: fact 3 ("Key figures: …") is not a fact; fact 4 is Wikipedia-sourced, no `by`, and bundles three claims — split and attribute Elizondo's part to him; fact 5 ("Wikipedia also lists Brennan McKernan … unconfirmed") is `unverified`, or drop it.
- Moments missing from facts: Bray's sworn account that Norquist set it up building on the Navy's response (v-2022-05-17-hearing@872); Gallaudet "first comprehensive whole-of-government approach" (v-2024-11-13-hearing-a@7629); Stratton "absolutely confident it was not something of ours" (v-2026-10-21…@1960); Kelleher on the abrupt handover and the AAWSAP database (v-2023-10-17…@3447, @3472); Knapp "casually created" after 2017 (@978).
- Links: missing `[ produced, doc-odni-2021-preliminary-assessment ]`. v-2021-05-16-navy-pilots… links `related to, uaptf` — generic.
- Do: rewrite facts 3–5; add Bray and Gallaudet facts; link the ODNI assessment; fix the generic video link.

### legacy-program (program, 47)
Grade: C
- Summary: good framing ("unproven allegation", AARO counter) but only two paragraphs, no Sources line, and no links to any of the people/documents it names.
- Facts: Borland fact cites v-jm-dylan-borland@1:19:11 (4751 s) — no moment within 15 min (nearest 58:30, 1:01:41). "Proponents argue… beyond FOIA" is `claimed` with no `by:` and sourced to the Disclosure Act PDF, which says no such thing — recast and cite Davis (v-2025-05-01-hearing-a@3590). "According to the Admiral Wilson memo… Stratton, Lacatski and Jake Barber have also said" is 2–3 facts, no `by:`, and the memo doesn't source the Stratton/Lacatski/Barber part — split (Stratton: v-2026-10-13-fox-special-report-stratton@348; Lacatski: book-inside-covert-ufo-program). None of the testimony facts carries `claims:` although this is the claim's home: tag Grusch's sworn fact `claims: [recovered-non-human-craft, programs-hidden-from-congress]`, AARO fact `stance: disputes`.
- Moments missing: Mellon's SAP-review "never saw anything" (@2138) and his source saying the program was closed (@2235) — key counter-evidence; Davis "four-star general and three-star admiral located the programs" (@3699) and "CIA shut it down in 1989" (v-jm-eric-davis@1998); Kosloski asking for witnesses on "legacy programs" (2024-11-19@2020); Elizondo's sworn yes (2024-11-13@4067); Stratton Oct 2026 (@332); Kirkpatrick's "There is no legacy program" (Oct 2026, in his file, not here).
- Links: `related to, immaculate-constellation` — that file never mentions "legacy"; specify or drop. Missing rel to david-grusch, eric-davis, jay-stratton, luis-elizondo/book-imminent, thomas-wilson/doc-wilson-memo, doc-aaro-historical-record-report-v1 (`disputed by`), h-2023-07-26.
- Do: fix the three mis-sourced facts and the Borland timestamp; add Sources line + rel to the witnesses and AARO; add Mellon/Davis/Kosloski/Kirkpatrick counter-facts; tag claims on the facts.

### jay-stratton (person, 46)
Grade: A-
- Facts: Hollywood Reporter awards fact is `unverified` — find ODNI/DIA confirmation or drop.
- Moments: fact @5:19 is tagged `recovered-non-human-craft` but the moments at @319 and @348 carry no claims — tag them (and @171/@214 on Watters as `recovered-non-human-bodies`). Not in facts: nuclear-submarine-as-bait operation (@400), "steps have been taken to remove the problem and the people" (@537), the President "still being shielded" (@595), beings at his home (v-2026-10-20-cuomo-jay-stratton@181/@230) and Corbell's clarification that it was personal not official (v-2026-10-21…@676); first briefed Congress 2007 to Reid (@655).
- Do: tag the Fox moments; add 2–3 facts (submarine bait, "removed the people", home sighting + Corbell clarification); resolve the unverified awards fact.

### david-fravor (person, 44)
Grade: A
- Facts: "the incident was never investigated" is `documented` while sibling testimony facts are `claimed` — make consistent. Body's "acknowledged by the Pentagon in 2020" has no fact.
- Moments: Gimbal V-formation on APG-79 (v-lex-fridman…@9923, claim gimbal-gofast-not-conventional tagged on moment but no fact), cube-in-sphere NOTAM (@9991), no-debrief (@10396). v-2025-03-18-avc-alex-dietrich linked but no moment tagged.
- Do: fix the status; add the Gimbal/APG-79 fact; tag one Dietrich-video moment.

### aatip (program, 44)
Grade: B
- Summary: dates `2009–2012` conflict with Puthoff's "began June 2007" (v-hal-puthoff-2018-presentation@278) and Lacatski's nickname-for-OSAP account — note the 2007 start.
- Moments: support for aatip-official-program only on moments: Stratton "it existed, a hundred percent" (v-2026-10-21…@1381), Knapp "working group" (@924), Fravor contacted by Stratton of AATIP in 2009 (v-2023-07-26-hearing-a@2166); counter: Moultrie knows of no official DoD study between Blue Book and AATIP (v-2022-05-17-hearing@3281); Lacatski on the name's origin (v-2021-10-12…@134, v-2023-10-17…@324); Elizondo on medical study of pilots (v-jillian-michaels-elizondo@2031).
- Do: add Stratton/Knapp and Moultrie facts with claims tags; add the name-origin fact; note the 2007 start.

### house-oversight (organization, 43)
Grade: B
- Body omits the Sept 2025 hearing held by its Task Force. Fact is a self-description; add the hearings it held with their ids.
- Do: add a 2025 sentence + fact.

### hal-puthoff (person, 42)
Grade: A-
- Facts: "layered bismuth–magnesium sample… AARO concluded" mixes Puthoff's claim (@5385) with AARO's finding under one `documented` status — split. "More than 10" craft fact has `claims` but no `basis:`.
- Moments not in facts: aerospace executives' "too highly classified to share" (v-jre-hal-puthoff-2025@3611); Gen. Exon "real deal" via Eric Davis (@5833) and Battelle/Nitinol (@8067) — the rel note on Roswell cites these but no fact does; Colares (@6242, v-hal-puthoff-2018-presentation@1501); Lazar clearance check (@6456); "compartmentalization is too strong" (v-2025-03-21…@5901).
- Do: split the Bi–Mg fact; add facts for @3611, Exon/Battelle, Colares, Lazar; add `basis:`.

### doc-aaro-historical-record-report-v1 (document, 41)
Grade: B
- Summary: "criticised by Grusch's supporters and several members of Congress" has no fact or source.
- Facts: fact 3 is two facts.
- Moments: Gillibrand: half the cases unresolved every decade, authors had no access to firsthand reporting (v-2024-11-19-hearing@1130); Mellon's 14,000-word critique and Clapper anecdote (v-2025-04-22-cuomo…@3192, @3265); Gallaudet "influence operation" (v-2024-11-13-hearing-a@4719). None in facts.
- Do: add Gillibrand and Mellon facts; split fact 3; link chris-mellon "critiqued by".

### film-age-of-disclosure (film, 40)
Grade: C
- Summary: one paragraph; no lead stating title/director/date; criticism is one sentence though the Skeptic review is linked.
- Facts: all `claimed` from Wikipedia/Variety with no `by`; release/runtime/credits are bibliographic — source to the distributor. Fact 2 names Rubio but there is no `features, marco-rubio` (id exists).
- Moments: 0 tagged, though 11 clip videos link to the film — tag 2–3 of their strongest moments with `refs: [film-age-of-disclosure]`.
- Do: write a 2–3 paragraph summary; add `features, marco-rubio`; tag a few clip moments; re-source the release facts.

### chris-mellon (person, 40)
Grade: A-
- "supports whistleblowers through the Disclosure Foundation" has no fact (moment @3331 backs it).
- Moments: `recovered-non-human-craft` on the "program closed" fact but moment @2235 untagged — tag it (context/relayed). Missing: Maui tape shown to Sen. Cohen (2021-05-05@108/@153), Clapper's test-range anecdote contradicting AARO's stealth explanation (cuomo@3265), "introduced Grusch to editors" (@1430), "cases they haven't been telling AARO about" (@2991).
- Do: tag @2235; add Disclosure Foundation and Clapper facts.

### luis-elizondo (person, 39)
Grade: B+
- Moments: fact @1:08:09 asserts `uap-injuries` but moment @4089 is untagged — tag it. Not in facts: crash-retrieval yes/no and "One hundred percent" without oversight (v-2024-11-13-hearing-a@4067, @5064); UAP–nuclear sites correlation (@4816); Jillian Michaels: threats, FBI investigation, missing/dead colleagues (@174, @2277), Space Force threat with Grusch (@4851), AATIP doctors and pilots' radiation-like burns (@2031 — uap-injuries), 2004 White House-sponsored meeting (@5753).
- Links: add ev-nyt-2017 if not inbound.
- Do: tag @4089 and add @2031 under uap-injuries; add facts for @4067/@5064 and the threats; link ev-nyt-2017.

### nhi (concept, 37)
Grade: B
- Moments: Kosloski "AARO has not discovered any verifiable evidence of extraterrestrial beings, activity or technology" (v-2024-11-19-hearing@458, documented, stance disputes) belongs here as the official position; Nell "zero doubt" (v-salt-karl-nell-zero-doubt@217); Gallaudet "strong evidence" (v-2024-11-13-hearing-a@6315).
- Links: add `[ assessed by, doc-aaro-historical-record-report-v1 ]`. v-jre-fan-we-are-you linked with no moment — tag or unlink.

### eric-burlison (person, 37)
Grade: B
- Summary: says "employed David Grusch … for a short period"; Burlison later said "18 months" and that Grusch left in September (v-2026-10-26…@1187, @1307).
- Facts: fact 1 ("A lead investigator…") is a characterisation — drop. Fact 2 bundles 2023 (Grusch) and 2024 (Elizondo) with only the 2023 transcript as source — split.
- Moments missing: helicopter "within 10 feet", FBI 302 breaking apart/recombining (v-2026-10-15…@1270, @1311); Stephen Miller/midterms (@958); letters to Lockheed, FFRDCs, agencies (@1253); "receipts" (@1339); Comer full-committee hearing (@2103 — ev-planned-oversight-hearing-2026-11 exists; link). recovered-non-human-craft is on a fact but no moment: tag v-2026-10-15-dr-phil-burlison-lure-ufos@1733.
- Do: split fact 2 and drop fact 1; add the 18-months fact; tag @1733; add @1253 letters and @1339 facts and the Comer hearing link.

### steven-greer (person, 37)
Grade: B
- Facts: fact 2 sources CSETI/Disclosure Project founding dates to the 2001 video @2:50 — split (Wikipedia for the founding). Hellyer fact cites v-hellyer-hannibal-tv-2017@22:37 with no moment (nearest 17:56, 42:21). Atacama fact `claimed` via Wikipedia — ev-ata-genome-2018 exists: cite it, `documented`.
- Moments: the 1997 Wilson/Hughes briefing claim (truth-lies-1@323, @4465) matters for credible files (thomas-wilson, doc-wilson-memo) and is absent.
- Links: add `[ briefed, thomas-wilson, … ]`.
- Do: fix Hellyer timestamp; add Wilson briefing fact + link; cite ev-ata-genome-2018.

### doc-tna-mod-ufo-files-guides (document, 35)
Grade: A
- Nothing required.

### uk-national-archives (organization, 35)
Grade: C
- Summary: one paragraph; none of its content (Clarke, DEFE 24/1948/1, Calvine closures) is in facts or links. Does not mention the releases, the guides or the /mod-files search page.
- Moments: Pope "over 50,000 pages released since 2008" (v-2013-chd-global-1@2525) unused.
- Links: add `[ consultant, david-clarke ]`, `[ holds records of, inc-calvine-1990 ]` with the closure note, a `links:` entry to /mod-files.
- Do: 2–3 paragraphs incl. the release programme and how to search it here; facts for the release series and the Pope moment; links.

### skinwalker-ranch (place, 35)
Grade: C
- Summary: counter-evidence absent: AARO says the paranormal work was outside the contract's statement of work and DIA cancelled for lack of merit.
- Facts: fact 2 ("Bigelow's team documented glowing orbs, shapeshifting creatures…") cites the AARO report but is `claimed` with no `by` — reword to what AARO documents and make it documented.
- Moments, none in facts: Lacatski saw something glowing in the ranch house within an hour (v-2026-01-09…@508); DIA's purpose "what can be weaponized" (@693); "nothing we had heard … was false" (v-2026-04-08…@683); Lacatski calls the guards-vs-aliens story "a fake story" (v-2025-11-11…@1147 — counter-evidence from the pro side); Stratton is "Axelrod" whose family had phenomena after visiting (v-2026-10-21…@735); Gallaudet "about two years of research" (v-jm-tim-gallaudet@3810).
- Links: add `[ visited by, james-lacatski ]`, `[ visited by, jay-stratton ]`.
- Do: add AARO's counter as a documented fact; add Lacatski/Knapp/Stratton facts; fix fact 2's status; add the links.

### inc-roosevelt-2015 (incident, 34)
Grade: B+
- Summary: Sources cite Wikipedia for a central case while the facts already cite AARO/NASA/DoD — swap.
- Moments: Graves's core testimony absent from facts: cube-in-sphere within 50 ft, safety report (v-2023-07-26-hearing-a@1593); stationary in hurricane winds then Mach 1.1–1.2 (@3026); fleet on radar in the Gimbal debrief (@6200, v-navy-gimbal-2015@4); APG-79 upgrade and three-sensor correlation (v-jm-ryan-graves@664, @868); four other unreported near-misses (@1083). Counter side: Kirkpatrick's "balloon reflecting sunlight" for Gimbal vs von Rennenkampff (v-2026-08-28…@4724, @4639); Gallaudet conceding GoFast wasn't fast (v-jm-tim-gallaudet@614); Stratton took the videos to Skunk Works/Phantom Works (v-2026-10-21…@1201).
- Do: add 4–6 Graves facts and the Gimbal counter-positions; replace Wikipedia in Sources.

### uap-disinformation (concept, 34)
Grade: A
- Moments: Lacatski's rejection of the Yankee Blue "decades" story (…lacatski-part-2@1510) is a counter to the WSJ fact — add. The "77-year-old man" moment (chd-truth-embargo@259) is tagged government-ufo-disinformation though "identity unverified" — consider untagging.
- Links: `related to, linda-moulton-howe` → `[ example, linda-moulton-howe, "Doty says he was ordered to show her a document that mixed truth with deception" ]`.

### eric-davis (person, 33)
Grade: B
- Facts: fact 4 ("contractors such as Lockheed hold craft…") cites `doc-wilson-memo` — wrong source: the notes are not Davis saying this; cite the 2025 briefing or NYT. Facts 2 and 3 overlap. Fact 7 cites @1:01:39 (3699); the Grusch briefing moment is @3749 — re-point.
- Moments missing entirely: George H.W. Bush 2003 conversations and Holloman 1964 (v-2025-11-23-eric-davis…@8–49, v-jm-eric-davis@1345/@1417; inc-holloman-1964 exists), Gaffney blocked the AAWSAP transfer (v-jm-eric-davis@1088), Russia recovered a craft (@2240), one general/one admiral "located" programs (@3699).
- Do: fix fact 4 source and the timestamp; add the Bush/Holloman fact (basis relayed) and the Gaffney fact; merge facts 2–3.

### garry-nolan (person, 32)
Grade: A-
- Summary: Sol Foundation co-founder 2023 and UAP Science Advisory Council membership have no fact/source — add or cut.
- Facts: facts 1–2 (injuries) carry no `claims:` while the matching moments (@82, @252) are tagged uap-injuries — tag the facts too.
- Moments: "the CIA came to my office" (v-2021-12-10…@309) — the fact says "the government"; make precise. Ariel School as his most fascinating case (v-lex…@748) — one fact.

### harry-reid (person, 32)
Grade: B
- Facts: fact 1 duplicates fact 2 — drop.
- Moments: Grusch: AAWSAP's "real purpose" a waived SAP to receive material; Lockheed divest killed by CIA (v-jre-david-grusch@1756) — strong, absent; Lacatski: Reid could not fund year 3 because of the 2010 election (v-2025-11-05-weaponized…@2004); Gillibrand on Reid's program (v-2023-04-19-hearing@66).
- Do: drop fact 1; add Grusch @1756 and Lacatski @2004 facts.

### lockheed-martin (organization, 32)
Grade: C
- Facts: the single fact ("Alleged to hold retrieved UAP material. See the Eric Davis and James Ryder entries.") is a pointer, not a fact. The AARO denial should be a documented fact with `claims: [recovered-non-human-craft]`, `stance: disputes`.
- Moments: 13 with claims tags, none in facts: Knapp's on-record confirmation of the BAASS negotiation (v-2025-09-09-hearing-a@3008), "one of them is Lockheed" (@5775), Ryder named as gatekeeper (@8424); Davis on the Skunk Works materials scientist (v-2025-05-01-hearing-a@4504); Elizondo on the blocked transfer (v-2024-11-13-hearing-a@7050); Grusch (v-jre…@1756, v-2026-08-13…@2919); Loeb "I haven't seen any evidence" (v-2026-10-23…@127); Burlison's letters (@1253).
- Links: none outgoing; add `[ named in, doc-wilson-memo ]`, `[ allegedly negotiated with, bigelow-aerospace ]`.
- Do: replace the pointer fact with 5–6 attributed claimed facts + the AARO denial as documented with claims tags; add the Wilson-memo link.

### ryan-graves (person, 32)
Grade: B
- Summary: Sources line's Wikipedia link is the "Pentagon UFO videos" page, not Graves's.
- Facts: W-72 cube-in-sphere is `documented` (transcript) while the same hearing's "0.0 Mach" is `claimed` (video) — pick one convention for sworn testimony. recovered-non-human-craft fact has no moment tagged: tag v-jm-ryan-graves@2300.
- Moments missing: patterns (3–7 objects, only over water, fastest Mach 1.2; v-jm-ryan-graves@1145); half the ready room after the 2017 NYT story (@1403); Vandenberg 2003 red square relayed under oath (v-2023-07-26-hearing-a@3778 — link `[ relayed, inc-vandenberg-2003 ]`); Stratton "first one to get them in the Pentagon" (v-2026-10-21…@1201); Gallaudet saw GoFast on the secret network (v-jm-tim-gallaudet@301); UAPDA review-board disappointment (@3658). Linked videos with no moment tagged to him: v-2026-09-03-asa-kevin-campbell-mq9, v-2026-10-08 Isbell.
- Do: tag @2300; add @1145/@1403 patterns and Vandenberg link; harmonise documented/claimed; fix the Wikipedia link.

### bob-salas (person, 32)
Grade: A-
- Facts: Knapp/Bray fact is two facts with `by: george-knapp` only — split; Bray 2022 needs its own source (h-2022-05-17 transcript). "Air Force was and is lying" fact untagged while moment @2422 carries government-ufo-disinformation.
- Moments missing: Figel recording on Echo (nuclear-tampering-1@482 — key corroboration), Belt, Montana sighting reported by Lt. Col. Chase to Blue Book (jm@487), SAC telex "grave concern" (npc@2716, jm@1706 — FOIA document, documentable), Boeing bench test (jm@2592), Low/Hippler EMP memo (jm@2197).
- Links: `related to, sean-kirkpatrick` — file says nothing about Kirkpatrick; drop.
- Do: split the Knapp/Bray fact; add Figel, Chase/Belt and SAC telex facts; drop the Kirkpatrick link.

### sean-kirkpatrick (person, 32)
Grade: A-
- "Tim Gallaudet called a meeting with AARO's leadership an 'influence operation'" has no fact/source (…disclosure-forum@5012).
- Facts: last fact cites the Paradigm URL — the news item kirkpatrick-answers-stratton-legacy-program exists; cite that id. Von Rennenkampff/Gallaudet fact is two people, `by:` only one — split. Body's "showed an unresolved and a resolved case" has no fact (moments @1132, @1229).
- Do: cite the news id; split the Gimbal/Tic Tac fact; add MQ-9 facts and the Gallaudet source.

### anna-paulina-luna (person, 31)
Grade: B+
- Summary: "A further House Oversight UAP hearing has been flagged for November 2026" is unsourced and will go stale.
- Moments: her 31 March 2026 letter to the Department of War listing clips, discussed by Kevin Campbell (v-2026-09-03-asa-kevin-campbell-mq9@2573) — not in the file at all; Gaetz's "material not made by mankind" (v-jre…@4590) and his hearing account (v-2023-07-26-hearing-a@5997) — tagged on moments but no fact carries the eglin claim; add with `claim_by: matt-gaetz`.
- Links: `[ testified at, h-2025-05-01 ]` is wrong — she hosted the briefing; use `hosted`/`sponsored`. No link to inc-eglin-2023 although the body is about it.
- Do: fix the h-2025-05-01 label; add the 31 March 2026 letter as a fact; link inc-eglin-2023; source or cut the November 2026 sentence.

### tim-gallaudet (person, 31)
Grade: B
- Facts: status inconsistency — "confirmation came in 2015" and "strong evidence nonhuman" are `documented` while other testimony from the same transcript is `claimed`. Fact 8 merges the 2024 "influence operation" with the 2026 Kirkpatrick/DARPA remark but cites only the 2024 hearing — split, second half → v-2026-08-28-disclosure-forum-national-security@5012.
- Moments: Eisenhower 2021 sphere / "range foulers" folder (v-2025-05-01-hearing-a@2847), classified Navy email on objects in 5–7 ocean areas (v-jm-tim-gallaudet@1241/@1514), NDA-waiver memo from ODNI (@753), Point Dume rejection (@2359 — counter-evidence he offers), "greatest issue of our time… hid from you" (v-2024-11-13-hearing-a@8612, claim tagged on moment, no fact).
- Links: `[ related to, chris-mellon ]` generic and Mellon's file does not mention him — say how or drop.
- Do: split fact 8; make statuses consistent; fix/drop the Mellon link; add the Eisenhower-2021 and ocean-email facts.

### robert-bigelow (person, 30)
Grade: A
- Facts: fact 1 cites `aawsap` for "AARO's report states" — cite doc-aaro-historical-record-report-v1. Fact 6 bundles Puthoff's claim and the Vice/Reason report under `by: hal-puthoff` — split. Fact 7 (60 Minutes "absolutely convinced") needs `by: robert-bigelow` and the CBS URL.
- Moments: Knapp's fuller account naming Jim Ryder, Palmdale and Glenn Gaffney (v-2026-10-21…@2391) and Shellenberger's "not verified" (v-jm-shellenberger@1218) could be one fact pair.

### remote-viewing (concept, 29)
Grade: C
- Summary: largely duplicates `stargate`; the second paragraph (why it is in a UAP archive) is one sentence. Sources: Wikipedia + "CIA reading room" with no URL.
- Facts: one fact, `unverified` sourced to Wikipedia, though the same claim is `documented` in stargate.md to a CIA record — use that.
- Moments: Robert Wood's McDonnell-funded remote-viewing project (v-2013-chd-science-technology@495); McMoneagle's protocol (v-srs-joe-mcmoneagle@13354); Puthoff's Bell Labs/PEAR replications (v-jre-hal-puthoff-2025@2705). None used.
- Do: re-source the fact; rewrite around why it is here (Puthoff/Swann/Nolan on consciousness and NHI; the 1995 AIR review as counter); add the Wood and McMoneagle facts.

### james-lacatski (person, 29)
Grade: B+
- Facts: fact 1 (2011 Capitol statement: U.S. holds a craft and accessed its interior) carries no `claims:` — it is the central assertion for `recovered-non-human-craft`; tag it (`basis: first-hand`). The AARO fact is tagged only `recovered-non-human-bodies` — it equally disputes the craft claim.
- Moments: @880 (v-2023-10-17…), @2372, v-2025-11-11…@115, v-2026-04-08…@4396 should carry `recovered-non-human-craft`. Not in facts: AARO's deputy director "Kona Blue was established as the home for all these paranormal UFO crap" (v-2025-11-05…@840); program stopped because of Reid and the 2010 election (@2004); UAPTF had the database (@3341); security scares, database exfiltration attempt (v-2026-04-08…@2568); "levitation of a human being" (@2936); largest UFO database "used by the U.S. military" (v-2021-10-12…@65); AATIP as nickname for OSAP (@134).
- Do: tag fact 1 and the four craft moments; add the @840 and @2004 facts; make the AARO fact dispute the craft claim too.

### inc-east-asia-us-military-uap-2021-2025 (incident, 29)
Grade: B
- Summary: lead "The clearest official evidence of UAP activity around China, Japan and Korea" is an evaluation — soften. "unresolved" is ours; AARO gives no assessment.
- Facts: fact 2 is three facts — split.
- Moments: Campbell's three events (v-2026-09-03…@1262, @1636, @1778) could be one `claimed` fact.
- Links: generic `[ documented in, pursue ]` — the records already link to pursue; drop.

### tim-burchett (person, 29)
Grade: B
- Facts: fact 1 ("One of the most vocal advocates…") is editorial, `claimed` with no `by` — drop. Fact 6 cites v-2025-05-01-hearing-a@4:50; nearest moment is 217 (73 s away) — check.
- Moments: Gaetz's Eglin account with AARO's balloon resolution (v-2023-07-26-hearing-a@5997) is tagged to Burchett but the file's Eglin fact omits the AARO counter-finding — add it; Grusch's "nonhuman" answer to him (@4774).
- Links: missing anna-paulina-luna, matt-gaetz, inc-eglin-2023, jeremy-corbell (named in the body).

### bigelow-aerospace (organization, 29)
Grade: D
- Summary: two short paragraphs that duplicate the Bigelow person file.
- Facts: 2 (Wikipedia; one record). Missing: the $22M BAASS contract (AARO report), Las Vegas buildings modified to store alloys (NYT 2017), Elizondo's blocked-transfer testimony (moment tagged here with recovered-non-human-craft but no fact), Puthoff's open-BAA account (@735), AARO: research outside the statement of work.
- Links: only `founded by`. `[ contractor for, aawsap ]` belongs on the org (BAASS).
- Do: add 4 facts; add the aawsap link; rewrite the body to say what BAASS did 2008–2012 and what AARO concluded.

### book-skinwalkers-at-the-pentagon (book, 29)
Grade: B+
- Facts: Greenwood review sourced to Wikipedia — cite the JSE review itself. DOPSR clearance fact `claimed` via Black Vault — doc-dopsr-22-sb-0151 exists; if it is this review, cite it as `documented`. uap-injuries tagged on the Kelleher fact (@25:03) but moment @1503 untagged — tag it.
- Moments: "books are my disclosure", "99% releasable, government owns the reports" (…part-2@171) not in file. Glimpse 2's "September 2008–December 2010" conflicts with aawsap's 2009–2012 — note it there.
- Links: `related to, kona-blue` → `[ describes, kona-blue, … ]` (part-2@385).

### j-allen-hynek (person, 29)
Grade: C
- Summary: two short paragraphs, Wikipedia + a hearing records line; misses the 1966 Michigan "swamp gas" episode, his "residue" of unexplained cases and his later break with Blue Book — all in the moments.
- Facts: one, `claimed` from cufos.org; no fact cites a video or document.
- Moments: marsh gas (cbs-reports@404), "no proof… we have been visited" (@1872, hynek-harold-brown-press@18), the "residue" (@1915), "in cahoots… a downright falsehood" (@2008), 20 cases of "scientific pay dirt" (1966-hynek-hearing-day@50); Mellon's "told to explain cases away" (2021-05-05@428) as the counter-reading.
- Do: add 5–6 facts from the 1966 footage with timestamps; rewrite the body around the arc sceptic → "residue" → CUFOS; Sources with the videos.

### charles-halt (person, 28)
Grade: B
- Summary: his own 1997 statement to the MoD file ("I never personally saw even a definite shaped craft", DEFE 24/1995) is in the incident file but not here — it belongs on his page.
- Facts: fact 1 ("Halt described investigating…") is a moment, not a fact — drop.
- Moments not in facts: memory altered / more than an hour of lost time (v-charles-halt-on-the-record@71); plaster casts, 1,000 lb estimate (v-7news…@3729); tower operator and comms tech also saw (@1606); bogus landing site (@670); "more than one agency knows a lot more" (v-7news-coulthart…@656).
- Do: add the 1997 DEFE 24/1995 account as a claimed fact (said: 1997); add the lost-time and plaster-cast facts; drop fact 1.

### ev-npc-2007 (event, 27)
Grade: C
- Summary: no why-it-matters (first joint on-record panel of foreign military/aviation officials in the U.S.; Kean's book grew from it) and no outcome (nothing came of the request).
- Facts: 3, all `documented` to v-npc-2007…@0:53/@2:30/@4:22 — the video has no moment at 53 and none tagged to this event; the three facts are housekeeping rather than what was said.
- Moments: the recording has 13 moments, all tagged to the incidents, none to the event — add `refs: [ev-npc-2007]` on the strongest (De Brouwer, Jafari, Callahan).
- Links: `[ related to, cefaa ]` is generic — `[ featured, cefaa, "Capt. Rodrigo Bravo spoke for Chile's CEFAA" ]`. James Fox is in the body but not linked — `[ organized by, james-fox ]`.

### inc-malmstrom-1967 (incident, 27)
Grade: C
- Summary: official counter-evidence well done. But the testimony side is thin: the body never gives the Oscar Flight date (Salas: 24 March; the 2001 moment says 16 March — note the discrepancy), never mentions that Salas told the story as Echo until Meiwald corrected him in 1996 (v-jm-robert-salas@3473, key credibility context), and names no corroborating witnesses although the archive has them.
- Facts: WSJ fact has no `by` (`basis: relayed`, stance disputes would fit). Salas facts cite v-disclosure-project-2001-npc@44:15/@44:49 — nearest moment is 45:16; re-point. The "six to eight (at Echo all ten)" fact is two facts.
- Moments: large gap: Arneson's message through the 28th Air Division comms centre and Boeing told to stop (v-2010-09-28…@577, @697), Jamison sent to restart Oscar after a UFO report over Roy (@797, @1072), Figel 1996 recording (v-2013-chd-nuclear-tampering-1@482), Meiwald recording (v-jm-robert-salas@1514), SAC telex "grave concern" (v-disclosure-project-2001-npc@2716), Kaminski told not to submit his report (@720), DOE: no nuclear tests on 16/24 March (v-jm-robert-salas@2359 — rebuts the WSJ EMP story), Bray 2022 "I have heard stories", not in holdings (v-2022-05-17-hearing@3417), Boeing bench test (v-2013-chd-nuclear-tampering-2@2668).
- Do: add the Oscar date and the Echo→Oscar correction; add facts for Arneson, Jamison, Figel/Meiwald, SAC telex, Bray 2022, DOE check; fix the WSJ fact; re-point the 2001 timestamps.

### nick-pope (person, 27)
Grade: B
- Summary: Cosford, his "turning point", is absent from body and facts despite 14 moments.
- Facts: fact 4 adds "about seven times the expected level" — the cited moment (@400) does not say that; verify or drop. Missing Cosford facts: "no conventional explanation" (v-7news-coulthart…@318), radar tapes impounded (v-sightings-cosford…@359), US "cast iron assurances" (@345), ACAS minute "some evidence" (@426, @760); plus Condign (v-2013-chd-global-1@2304, global-2@2335), 5% unexplained (@2131), press office "little green men" (global-2@1521 — tagged government-ufo-disinformation on the moment only).
- Links: inc-cosford-1993 has no link to Pope in either direction — add `[ investigated, inc-cosford-1993 ]`.
- Do: add Cosford link and 3 facts; verify the "seven times" figure; add a Condign/press-office fact with the disinformation claim tag.

### ev-disclosure-project-2001 (event, 27)
Grade: C
- Summary: 50 words, no lead with date/place, no Sources line.
- Facts: fact 3 is two facts (Greer's demands; "next hearing May 2022" needs h-2022-05-17 as source) and cites @9:30 with no moment (moments at 4:50, 14:26). Fact 2 cites the video without a timestamp. Greer's "350 additional witnesses" and McClendon sponsorship (@170) not stated.
- Do: write a 2-paragraph summary (what, who, demands, no congressional response, critics) + Sources; fix @9:30 / add moment; split fact 3.

### stanton-friedman (person, 27)
Grade: B-
- Facts: all three from Wikipedia though the moments cover two of them: Klass bet → chd-documents-proof@1952; 1968 House — fact says "told a committee", body says "submitted a statement" — reconcile and cite h-1968-07-29.
- Moments: Special Report 14's 21.5% unknowns (chd-opening@1900) and the Bolender memo (@2700) are documentable claims; "at least three crashes" (roswell-1@854) is his position on roswell-crashed-craft — add as `claimed`, `basis: opinion`. v-1988-10-14-ufo-cover-up-live linked, no moment for him.
- Links: add `[ testified at, h-1968-07-29 ]`.

### geipan (organization, 26)
Grade: C
- Summary: 54 words. Doesn't say why GEIPAN matters (the only space-agency UAP office publishing full case files; the A–D classification; number of cases/percent D). No URL in Sources, no `links:`.
- Moments: Trans-en-Provence 1981 (v-2013-chd-global-1@2913, v-nicolai-trans-en-provence-documentary@141, v-2013-chd-global-2@774 quoting CNES) — not mentioned though inc-trans-en-provence-1981 and doc-geipan-trans-en-provence-1981 exist; Courtade on Valensole classed D (v-2025-07-09-ina-valensole-geipan@61, @185) — inc-valensole-1965 and frederic-courtade exist, not mentioned.
- Links: only `investigated, inc-air-france-3532-1994` while ten incidents link in; add `[ led by, frederic-courtade ]`, website link.
- Do: expand to 2–3 paragraphs (mandate, classification, headline cases, Courtade); add facts from the moments; add the website link.

### bob-lazar (person, 26)
Grade: B
- Facts: fact 1 cites v-bob-lazar-1989-knapp without timestamp (→ @278); Wikipedia fact 6 duplicates Knapp's fact 4 — drop; fact 1 carries claims but moment @278 has no claim tag.
- Do: timestamp fact 1 and tag moment @278; drop the Wikipedia fact.

### leslie-kean (person, 26)
Grade: B
- Facts: fact 5 bundles Fravor, Mellon and Puthoff under `by: david-fravor` — split (Puthoff: v-jre-hal-puthoff-2025@5520). Fact 7 (McConnell present when senators were briefed on bodies, @967) should carry `claims: [recovered-non-human-bodies]`, basis relayed. "foreword by John Podesta" unsourced.
- Links: `reported on, aatip` and `reported on, david-grusch` lack notes.

### kona-blue (program, 26)
Grade: B
- Summary: one-sided: Lacatski's on-record version is absent.
- Moments: Lacatski "creator and DIA program manager" of KONA BLUE, "both classified programs" (part-1@118); AARO's deputy "home for all this paranormal UFO crap" (@840); compartment vs program (part-2@385); "everything they released was correct… incomplete" (…disclosure@1020); Puthoff: proposed to DHS after AAWSAP/AATIP (jre-hal-puthoff-2025@4135).
- Do: add 3–4 Lacatski/Puthoff facts (claimed, by:) and a sentence in the body; check the 2011 date against AARO's text.

### inc-us-domestic-uap-1996-2026 (incident, 25)
Grade: B+
- Lake Huron and Coast Guard Tic Tac named in the body but not linked — link if those files exist.

### inc-varginha-1996 (incident, 25)
Grade: B
- Facts: fact 1 (the three women) and fact 4 (Chereze) have no `by` although katia-xavier, liliane-silva, valquiria-silva, armando-fortunato-filho, joao-baptista-janini exist; fact 4 is three facts.
- Moments: Venturelli's living being at the hospital (v-2026-01-20…@7130, v-2026-03-08-sbt…@107–158), de Souza's crash (@2806, @3179), Claussen's C-17 (@7756), the mother's bribe offer (@3927), Fox's "flown out by USAF" (@2640), Fábio Furtado (@3599), the 1997 police inquiry "mistakes and rumours" (v-2026-03-08-sbt…@81). None are facts.
- Do: add `by` to facts 1 and 4 and split 4; add facts by italo-venturelli, carlos-de-souza, fred-claussen with claim varginha-beings-captured; add the 1997 police inquiry line as counter-evidence.

### project-sign (program, 25)
Grade: A
- Facts: the Caldwell disk-rotor investigation in the body has no fact or source — add or cite.
- Links: `[ run by, department-of-war ]` is anachronistic (USAF, 1948); there is no us-air-force entity — consider one or drop the link.

### richard-doty (person, 24)
Grade: B+
- Missing: that he is identified as "Falcon" of the 1988 *UFO Cover-Up? Live!* broadcast (v-1988-10-14…@2137) — central to his record.
- Moments: "briefed in 1979: the Air Force continued a classified UFO investigation after Blue Book; DIA kept a repository" (mystery-wire-part-2@142) — strong, not in file; Manzano/Bennewitz origin (rebelliously-curious@405).
- Do: add the Falcon identification and the post-Blue-Book-investigation claim as facts; mention 1988 in the body.

### doc-robertson-panel-1953 (document, 23)
Grade: B+
- Facts: fact 1 is two facts. Fact 2 ends with "Critics see this as the origin of official stigma" — opinion inside a `documented` fact; move to a separate `claimed` fact `by: chris-mellon` (v-2021-05-05…@367) / karl-nell (v-jm-karl-nell@1253).
- Moments: Thornton Page defending the panel in 1966 (v-1966-05-10-cbs-reports…@2696, speaker mis-set to carl-sagan for the Page part) — fix the speaker. Nell on "monitoring civilian UFO groups" (@1253) — that recommendation is in the report; add as documented.

### task-force-declassification (organization, 23)
Grade: C
- Summary: two short paragraphs; Sources line is just "House Oversight".
- Moments: Luna: the task force grew out of the Eglin visit (v-jre-anna-paulina-luna@90); immunity request to the White House (v-2026-06-09…@174); SCIF-immunity motion for Borland (v-2025-09-09-hearing-a@8676). None in facts.
- Links: add `[ held, h-2025-09-09 ]`, `[ held, h-2025-05-01 ]`, `[ requested, doc-oversight-uap-request-2026-03-31 ]`, `[ grew out of, inc-eglin-2023 ]`.

### david-clarke (person, 23)
Grade: D
- Summary: 42 words, no paragraphs, no why-it-matters, Sources vague.
- Facts: 1, video-sourced, no `by`. Moments give the material: Lakenheath 1956 (v-david-clarke-lakenheath-1956@461, @1451, @2326, @2815 — claim lakenheath-1956-unknown is moment-only), Condign unredacted copy "accidentally destroyed" (@4032), Calvine rediscovery via Craig Lindsay (v-2026-05-07…@223), the 1967 hoax (v-2017-09-04…@410).
- Links: add `[ advised, uk-national-archives ]`.
- Do: write a 2–3 paragraph bio (National Archives role, sceptical method, cases); add 4 facts from the Lakenheath and Condign moments with claims tags; add the National Archives link.

### linda-moulton-howe (person, 23)
Grade: C
- Summary: one paragraph, Wikipedia-led; no why-it-matters (she is the recipient of Doty's planted document and the SOM1-01/"Kewper" material — the archive's clearest case of a journalist targeted by disinformation).
- Facts: the claim tags on her moments (recovered-non-human-craft/bodies via the unnamed military man, truth-lies-2@756) have no counterpart fact — add as `claimed`, `basis: relayed`.
- Moments missing: reading the "Majestic 12 Group, April 1954" manual (chd-documents-proof@745), the Kewper tapes (truth-embargo@1108; the two v-1998-lmh-agent-kewper videos link in with no moment tagged), Schmitt's 1979 letter (@1450), Gersten FOIA suits (@1596).
- Links: `related to, inc-roswell-1947` → covered by `held, sample-bismuth-magnesium`; drop or make specific.
- Do: expand body to 2–3 paragraphs; add 3–4 facts from the moments; fix the Roswell link; Sources line.

### book-inside-covert-ufo-program (book, 22)
Grade: A-
- Facts: fact 1 (bibliographic) is `claimed` with no `by:` — should be `documented`. Fact citing v-2023-10-17…@57:52 for Kelleher: nearest moment is @3341 (Lacatski speaking) — check the timestamp/speaker.
- Moments: 8newsnow fact tagged recovered-non-human-craft; moments @880 and v-2025-11-11…@115 should carry it.
- Links: `related to, skinwalker-ranch` and `related to, crash-retrieval` are generic — `[ describes, skinwalker-ranch ]`, `[ claims about, crash-retrieval, "Lacatski states the U.S. holds a craft and accessed its interior" ]`.

### dylan-borland (person, 22)
Grade: B
- Facts: "100-foot-wide" vs "100 to 150 feet" elsewhere — align; fact 3 (claim recovered-non-human-craft) — tag moments @3272 and v-jm-dylan-borland@3128.
- Moments: "Rubik's Cube" (v-jm-dylan-borland@384), database search finding baiting/take-down briefings (@5852) not in facts.

### jacques-vallee (person, 22)
Grade: D
- Summary: two short paragraphs that restate the two facts; Sources line is one podcast. Nothing on his AAWSAP role or his positions.
- Facts: missing his own statements: designed the AAWSAP database, ~240,000 cases, team of 40 let go (v-2025-03-21…@4170); database held "hundreds of reports of creatures live or dead" (v-2026-01-20…@2065 — tag recovered-non-human-bodies); Trinity 1945 crash with living entities (@3694 — needs the counter-evidence; book-trinity-best-kept-secret exists); invariants (@4055); Battelle/Stanford sample analysis (@5581).
- Links: only `advised, garry-nolan`; 12 books link him inbound. Add `[ designed database for, aawsap ]`.
- Do: add 4–5 facts from the moments, Trinity with counter; add the AAWSAP link; expand the bio and Sources.

### boeing (organization, 21)
Grade: D
- Summary: one paragraph; says contractors are named in "legacy" allegations without saying by whom.
- Facts: one generic AARO fact that doesn't mention Boeing.
- Moments: both moments (v-2013-chd-nuclear-tampering-2@2668, @2901: Boeing EMP bench test on the Minuteman logic coupler; Echo Flight documents say Boeing would work on the problem) are about Malmstrom 1967 and absent; Stratton took Gimbal/GoFast to Phantom Works (v-2026-10-21…@1201) — not here.
- Links: no `rel` at all; add `[ witnesses from, inc-vandenberg-2003 ]`, `[ tested, inc-malmstrom-1967, … ]`, `[ consulted by, jay-stratton, … ]`; explain `aka: McDonnell Douglas` (Robert Wood's employer).
- Do: add rel to Vandenberg, Malmstrom, Stratton, Robert Wood; add the Malmstrom EMP-test facts; write a real body.

### edgar-mitchell (person, 21)
Grade: B
- Facts: fact 1 near-duplicates fact 3 — drop; claim recovered-non-human-craft on fact 3 but moment v-edgar-mitchell@312 untagged.
- Moments: Hellyer's dinner account (v-hellyer-interview-2019@1527) could be a `by: paul-hellyer` fact.
- Do: drop fact 1; tag @312; add Bigelow link with the NIDS note.

### h-2023-07-26 (hearing, 21)
Grade: B
- Facts: only 2, both the hearing page. A hearing file should carry 4–6 anchor facts with timestamps (Grusch @32:06 program; @49:27 40 witnesses/ICIG; @1:59:04 injuries; biologics "non-human"; Graves; Fravor) and the Kirkpatrick/Garcia "no evidence" counter (@974).
- Do: add anchor facts with timestamps and the AARO counter.

### h-2025-09-09 (hearing, 20)
Grade: B-
- Summary: missing why it matters (first hearing of the Task Force; Yemen "Hellfire" MQ-9 video shown publicly; Luna's immunity motion; Knapp on Lazar/D'Amato).
- Facts: 2 housekeeping facts. None for the headline moments.
- Moments: 0 tagged to the hearing; key moments exist tagged to persons: Luna "documented liar" (@1186), immunity motion (@8676), Hellfire replay (@8841), Wiggins (@2485), Knapp on D'Amato (@7172), Knapp on Lacatski (@2930/@6483). Add `refs: [h-2025-09-09]` on the 6–8 defining moments.
- Links: missing `[ testimony on, inc-uss-jackson-2023 ]` and `[ testimony on, inc-yemen-mq9-orb-2024 ]`.
- Do: tag the defining moments; add 3–4 facts (immunity motion, Hellfire replay, Grusch reprisal letter); add the Jackson and Yemen links.

### jon-kosloski (person, 20)
Grade: A-
- Facts: last fact bundles Borland's and Gallaudet's statements under `by: dylan-borland` — split (Gallaudet: v-jm-tim-gallaudet@2581). Fact 1 `documented` to MeriTalk — cite the DoD announcement.
- Moments: Mellon quoting Kosloski "UAP are real" (v-2025-04-22-cuomo…@3732, v-2025-06-04…@171) — add as `claimed`, `basis: relayed`. Mount Etna "170 meters vs 170 kilometres" discrepancy (@976) — add.
- Links: `[ investigated, crash-retrieval ]` is odd — "took testimony on".

### stargate (program, 20)
Grade: B-
- Facts: one fact only. The 1995 review, the program names and the Fort Meade unit are in the body without facts/sources.
- Moments: McMoneagle's Gondola Wish origin (v-srs-joe-mcmoneagle@9961), the Typhoon submarine prediction (@12854, @13172), Legion of Merit (@16522); Puthoff's Semipalatinsk crane (v-jre-hal-puthoff-2025@1035), the Carter crashed-plane case (@1549), silver futures (v-2022-02-11…@3213). None in facts.
- Links: missing the Army (INSCOM) sponsorship; add the 1995 AIR report as a document or URL.
- Do: add facts from McMoneagle and Puthoff moments; source the 1995 AIR review; link the Army sponsorship.

### nro (organization, 20)
Grade: B
- Facts: v-jre-david-grusch@4:15 (255) and v-jm-eric-davis@10:18 (618) have no moment within 75 s; v-2025-09-09-hearing-a@34:45 nearest 2130; v-2025-02-28-rebelliously-curious-doty@19:56 nearest 1247.
- Moments: only one tagged (Valone); none of the Grusch/Davis facts have moments tagged to nro.
- Links: two generic `related to` (h-2023-07-26, ev-grusch-icig-complaint-2022) — make specific or drop.
- Do: fix the two `related to`; add moments at the cited timestamps or re-point; tag Grusch/Davis moments with `refs: [ nro ]`.

### kirk-mcconnell (person, 20)
Grade: A
- Moments: Varginha press conference: "similar reports" of crash retrievals and non-human beings have reached senators and staff (v-2026-01-20-newsnation…@1875, claim recovered-non-human-bodies, basis relayed) — his strongest on-record statement, not in facts.
- Do: add the @1875 fact; link inc-varginha-1996 "commented on".

### book-covert-ufo-new-insights (book, 20)
Grade: B
- Facts: Borland fact cites v-jm-dylan-borland@46:03 — nearest moments are 28:30 and 52:08: add a moment or fix the timestamp. Glimpse 2 ("New Insights describes AAWSAP activity from June 2009 to January 2010") reads as the reviewer's sentence, not the book's words — glimpses must be verbatim; verify or remove.
- Moments not in facts: Knapp on the standout cases (v-2025-11-11…@2580); DIA tells FOIA requesters it has no AAWSAP files, 14-month prepublication review (v-2026-01-09…@869); Lacatski: Kona Blue release "correct … incomplete" (v-2026-04-08…@1020).

### donald-trump (person, 20)
Grade: D
- Summary: the PURSUE directive — the reason he is in the archive — is mentioned but not sourced or linked.
- Facts: 1 fact bundling four statements; split. Add the 19 Feb 2026 directive as a documented fact (war.gov). Missing: Stratton "he's still being shielded from the truth" (v-2026-10-13…@595); "I wasn't much of a believer" (@5); Area 51 "rusting fence" (@50).
- Links: none; add `[ ordered, pursue ]`.

### richard-dolan (person, 20)
Grade: C
- Summary: credentials `journalist` for a historian/author is a stretch; say "author/historian".
- Facts: 1 bibliographic fact. 9 moments carry 4 claims: Chadwell 1952 CIA memo (v-2013-chd-history-2@385), Robertson Panel "debunk" (@5579 — link doc-robertson-panel-1953, documented), Landry quarterly reports (v-2013-chd-opening@870), 1948 "Analysis of Flying Object Incidents" (@938), Los Alamos/Oak Ridge FBI documents (nuclear-tampering-1@3300), FOIA 10,000 pages (@202), breakaway society (truth-embargo@2330).
- Do: add 4–5 facts from the CHD moments (documented where the document is on file); link the Robertson Panel document.

### ev-nyt-2017 (event, 20)
Grade: B
- Facts: "Bigelow… modified buildings" is `by: luis-elizondo` but sourced to Black Vault — source the NYT article; the Blumenthal walk-back has no `by:`. `helped by, chris-mellon` note says "Hal Puthoff says…" although Mellon says it himself (v-2025-05-01-hearing-a@7236, cuomo@605) — cite Mellon.
- Moments: Knapp: the story prompted the briefings that became the UAP Task Force (weaponized-stratton@978); Puthoff's "began June 2007" (@278) contradicts the contracts (2008) — note.

### jeremy-corbell (person, 20)
Grade: B
- "triangular objects later explained as a lens artefact" is stated as fact via Wikipedia — say who explained it (not an official resolution) or mark `claimed`.

### raf-bentwaters-woodbridge (place, 20)
Grade: B
- Lakenheath fact `documented` with `source: inc-lakenheath-1956` — cite the Condon report document directly if filed.
- Links: Halt, Penniston, Burroughs are named in the body but no person links to the place — add `served at` from those person files.
---

## 4. Files with 8–19 connections: scripted flags

186 files, 77 flagged. Not read in full; the flags are from the cross-check script. "Thin summary" is under 60 words of body. The eight MoD release documents (`doc-mod-ufo-files-…`) have no facts by design (they are finding aids); they are listed for completeness.

| Conn. | File | Flags |
|---|---|---|
| 19 | `jim-penniston` (person) | linked videos with no moment tagged to this file: v-2013-chd-closing |
| 19 | `kevin-randle` (person) | claims asserted in facts but no moment tagged with them: recovered-non-human-bodies |
| 19 | `paul-hellyer` (person) | 1 unverified facts |
| 18 | `h-2024-11-13` (hearing) | linked videos with no moment tagged to this file: v-2024-11-13-hearing-a |
| 18 | `odni` (organization) | thin summary (48 words) |
| 17 | `doc-wilson-memo` (document) | 3 unverified facts |
| 17 | `inc-ariel-1994` (incident) | facts cite video timestamps with no moment there: v-nickerson-ariel-phenomenon-podcast@88; incident with no documented fact |
| 16 | `inc-holloman-1964` (incident) | facts cite video timestamps with no moment there: v-2013-chd-opening@1381; claims asserted in facts but no moment tagged with them: recovered-non-human-craft; incident with no documented fact |
| 16 | `edward-ruppelt` (person) | claims asserted in facts but no moment tagged with them: government-ufo-disinformation |
| 16 | `philip-corso` (person) | thin summary (50 words) |
| 16 | `immaculate-constellation` (program) | linked videos with no moment tagged to this file: v-jm-shellenberger; 1 unverified facts |
| 15 | `book-out-of-the-shadows` (book) | linked videos with no moment tagged to this file: v-2026-10-13-fox-special-report-stratton, v-2026-10-16-fox-watters-stratton, v-2026-10-20-cuomo-jay-stratton, v-2026-10-21-weaponized-stratton-first-interview |
| 15 | `ev-capitol-uap-press-conference-2026` (event) | facts cite a video without a timestamp: v-2026-06-09-capitol-uap-press-conference; linked videos with no moment tagged to this file: v-2026-06-09-capitol-uap-press-conference |
| 15 | `ev-ufo-nukes-press-conference-2010` (event) | facts cite a video without a timestamp: v-2010-09-28-disclosure-conference-national-press-club-27-sept; linked videos with no moment tagged to this file: v-2010-09-28-disclosure-conference-national-press-club-27-sept |
| 15 | `h-2025-05-01` (hearing) | facts cite video timestamps with no moment there: v-2025-05-01-hearing-a@2; linked videos with no moment tagged to this file: v-2025-05-01-hearing-a |
| 15 | `inc-langley-2023` (incident) | thin summary (45 words) |
| 15 | `inc-magenta-1933` (incident) | incident with no documented fact |
| 15 | `department-of-state` (organization) | thin summary (40 words) |
| 14 | `james-fox` (person) | thin summary (54 words) |
| 14 | `jared-moskowitz` (person) | claims asserted in facts but no moment tagged with them: programs-hidden-from-congress |
| 14 | `john-burroughs` (person) | linked videos with no moment tagged to this file: v-2013-chd-closing; thin summary (52 words) |
| 14 | `larry-warren` (person) | thin summary (17 words) |
| 13 | `h-2022-05-17` (hearing) | linked videos with no moment tagged to this file: v-2022-05-17-hearing |
| 13 | `icig` (organization) | thin summary (49 words) |
| 12 | `inc-western-us-orbs-2025` (incident) | thin summary (23 words); no Sources line and no links |
| 12 | `department-of-energy` (organization) | thin summary (36 words) |
| 12 | `galileo-project` (organization) | thin summary (37 words) |
| 12 | `local-law-enforcement` (organization) | thin summary (35 words) |
| 12 | `jesse-marcel-jr` (person) | 1 unverified facts; no fact sourced to a video or document (URLs only) |
| 12 | `robert-hastings` (person) | no fact sourced to a video or document (URLs only) |
| 11 | `sample-bismuth-magnesium` (concept) | thin summary (35 words); no Sources line and no links |
| 11 | `doc-mod-ufo-files-2011-03` (document) | no facts |
| 11 | `ev-varginha-press-conference-2026` (event) | facts cite a video without a timestamp: v-2026-01-20-newsnation-varginha-press-conference; linked videos with no moment tagged to this file: v-2026-01-20-newsnation-varginha-press-conference; thin summary (57 words) |
| 11 | `film-the-anonymous-interview` (film) | linked videos with no moment tagged to this file: v-1998-lmh-agent-kewper-1, v-1998-lmh-agent-kewper-2, v-2013-chd-truth-embargo |
| 11 | `inc-pascagoula-1973` (incident) | incident with no documented fact |
| 11 | `department-of-homeland-security` (organization) | thin summary (52 words) |
| 11 | `james-ryder` (person) | 1 facts without a source; 1 unverified facts |
| 11 | `john-mack` (person) | facts cite video timestamps with no moment there: v-nickerson-ariel-phenomenon-podcast@88; thin summary (57 words) |
| 11 | `karl-nell` (person) | claims asserted in facts but no moment tagged with them: government-ufo-disinformation |
| 10 | `doc-mod-ufo-files-2011-08` (document) | no facts |
| 10 | `doc-ruppelt-presentation-1952` (document) | linked videos with no moment tagged to this file: v-1952-03-26-ruppelt-presentation |
| 10 | `film-the-phenomenon` (film) | thin summary (19 words) |
| 10 | `h-2024-11-19` (hearing) | linked videos with no moment tagged to this file: v-2024-11-19-hearing |
| 10 | `inc-bariloche-1995` (incident) | 1 facts without a source; 1 unverified facts |
| 10 | `inc-pacific-uaptf-2019` (incident) | incident without place |
| 10 | `inc-phoenix-lights-1997` (incident) | facts cite video timestamps with no moment there: v-npc-2007-ufo-close-encounters@4684; incident with no documented fact |
| 10 | `inc-westall-1966` (incident) | incident with no documented fact |
| 10 | `glenn-grothman` (person) | thin summary (42 words) |
| 10 | `kevin-day` (person) | linked videos with no moment tagged to this file: v-2019-09-21-nimitz-encounters-gary-voorhis |
| 9 | `doc-mod-ufo-files-2009-08` (document) | no facts |
| 9 | `doc-mod-ufo-files-2013-06` (document) | no facts |
| 9 | `doc-nasa-uap-study-2023` (document) | claims asserted in facts but no moment tagged with them: official-no-nhi-evidence |
| 9 | `h-2023-04-19` (hearing) | linked videos with no moment tagged to this file: v-2023-04-19-hearing |
| 9 | `inc-la-joya-1980` (incident) | linked videos with no moment tagged to this file: v-2025-03-24-tvperu-oscar-santa-maria; incident with no documented fact |
| 9 | `inc-yemen-mq9-orb-2024` (incident) | 1 unverified facts |
| 9 | `oni` (organization) | thin summary (52 words) |
| 9 | `sri-international` (organization) | 1 unverified facts; thin summary (42 words) |
| 9 | `aj-gevaerd` (person) | no fact sourced to a video or document (URLs only) |
| 9 | `carl-sagan` (person) | thin summary (41 words) |
| 9 | `clifford-stone` (person) | claims asserted in facts but no moment tagged with them: recovered-non-human-bodies; thin summary (55 words) |
| 9 | `kenneth-arnold` (person) | speaks in 6 moments but the file has no facts; no facts |
| 9 | `leonard-stringfield` (person) | 1 unverified facts |
| 9 | `mike-rounds` (person) | thin summary (45 words) |
| 9 | `tim-leach` (person) | facts cite a video without a timestamp: v-tim-leach-war-reporter-profile; linked videos with no moment tagged to this file: v-tim-leach-war-reporter-profile |
| 9 | `wilfried-de-brouwer` (person) | thin summary (45 words) |
| 8 | `doc-mod-ufo-files-2008-10` (document) | no facts |
| 8 | `doc-mod-ufo-files-2009-03` (document) | no facts |
| 8 | `doc-mod-ufo-files-2010-08` (document) | no facts |
| 8 | `doc-war-gov-ufo` (document) | no date |
| 8 | `ev-disclosure-forum-2026` (event) | linked videos with no moment tagged to this file: v-2026-08-28-disclosure-forum-national-security |
| 8 | `film-ariel-phenomenon` (film) | linked videos with no moment tagged to this file: v-nickerson-ariel-phenomenon-podcast |
| 8 | `cefaa` (organization) | thin summary (52 words) |
| 8 | `diana-pasulka` (person) | linked videos with no moment tagged to this file: v-jm-karl-nell; thin summary (54 words) |
| 8 | `donald-menzel` (person) | no fact sourced to a video or document (URLs only) |
| 8 | `harrison-schmitt` (person) | linked videos with no moment tagged to this file: v-1972-12-apollo-17-debriefing-light-flash-experiment; speaks in 4 moments but the file has no facts; no facts |
| 8 | `mario-woods` (person) | facts cite video timestamps with no moment there: v-michels-mario-woods-2025@3336 |
| 8 | `thomas-wilson` (person) | 1 unverified facts; thin summary (54 words) |

---

## 5. Files under 8 connections: scripted flags, by category

473 files, 227 flagged. Lists are ids only; each is one step: a paragraph, a fact, a Sources line.

**Thin summaries, people (74).** russell-targ, uyrange-hollanda, andre-carson, anthony-choy, bill-startup, calvin-parker, charles-hickson, james-clapper, ronald-moultrie, frank-kendall, harold-brown, jake-barber, james-comer, jim-lovell, joni-ernst, nathan-twining, cynthia-hind, enrique-kolbeck, fife-symington, gerald-ford, gregory-rogers, james-e-mcdonald, robert-jamison, rodrigo-bravo, ross-coulthart, armindo-viriato, ch-bolender, gary-heseltine, gregory-guillot, hector-quintanilla, jean-claude-ribes, joe-spielberger, randall-nickerson, adam-schiff, anna-brady-estevez, brandon-fugal, chaz-king, frederic-courtade, gadi-schwartz, isaac-ben-israel, j-edward-roush, jack-bushong, jasmine-crockett, jeff-velthouse, joe-mcmoneagle, john-blitch, l-mendel-rivers, patrick-mcdonough, sergio-mota-da-silva, shigeru-ishiba, stephen-bassett, vladimir-stroynetsky, ak-antony, dave-min, fc-durant, ja-ofarrell, jack-northrop, jacob-salatun, jason-turner, javier-lerdo-de-tejada, john-kilburn, john-locken, kei-endo, koos-de-klerk, lothar-neethling, nick-begich, otto-weyland, raja-krishnamoorthi, ryan-weigelt, s-c-pierman, shinjiro-koizumi, summer-lee, tania-vassie, yasukazu-hamada, yoshiharu-asakawa. The ones that matter most for the story: james-clapper (the Area 51 statement), ronald-moultrie and harold-brown (official counter-statements), jake-barber, joe-mcmoneagle, john-blitch and gregory-rogers (each has a long interview on file), frederic-courtade (GEIPAN's head), fife-symington, nathan-twining.

**Thin summaries, incidents (10).** inc-ladakh-2012, inc-ubatuba-1957, inc-allagash-1976, inc-cape-canaveral-1992, inc-whiteman-1975, inc-andrews-2002, inc-neuvelle-les-lure-1989, inc-port-gentil-1952, inc-cangzhou-1998, inc-victoria-1991.

**Thin summaries, other (39).** Organisations: hpsci-cicp, ousd-is, oversight-subcmte-natsec, oversight-subcmte-cyber, cseti, japan-mod, white-house, sasc-etc, senate-intel-committee, cefae, uapdf, itbp. Concepts: ce-5, waived-bigoted-sap. Films: film-moment-of-contact, film-the-program. Documents: doc-geipan-af3532, doc-japan-mod-press-2020-09-15, doc-dod-statement-navy-videos-2020, doc-geipan-orange-1951, doc-holland-police-report-1994, doc-transcript-2024-03-14-sasc-northcom, doc-geipan-trans-en-provence-1981, doc-naa-flying-saucers-2018. Books (14, acceptable where the glimpses carry the page): book-case-mj-12, book-confession-hastings-jacobs, book-halt-perspective-2, book-conspiracy-of-silence, book-crash-when-ufos-fall, book-invasion-washington, book-randle-report, book-roswell-21st-century, book-roswell-ufo-crash-update, book-ufos-area51-informants, book-ufos-national-security-state-2, book-ad-after-disclosure, book-managing-magic, book-ufos-21st-century-mind.

**Incidents with no documented fact (36).** The case rests on testimony alone; check whether an official record on file (MoD DEFE files, Blue Book, GEIPAN, the four-country reports) can back one fact, or say in the body that none exists: inc-upper-heyford-1980, inc-edwards-1957, inc-mainbrace-1952, inc-walton-1975, inc-ellsworth-1977, inc-iran-nuclear-sites-2004, inc-ladakh-2012, inc-warren-1976, inc-wright-patterson-2024, inc-big-sur-1964, inc-edwards-triangle-1990, inc-chilean-navy-2014, inc-mexico-city-radar-1992, inc-ubatuba-1957, inc-allagash-1976, inc-baependi-1979, inc-broad-haven-1977, inc-cape-canaveral-1992, inc-devils-den-1977, inc-meng-zhaoguo-1994, inc-pretoria-road-1965, inc-rokaf-phantoms-1980, inc-salyut-6-1981, inc-sayama-1978, inc-tel-nof-1998, inc-whiteman-1975, inc-andrews-2002, inc-baotou-2010, inc-larson-1975, inc-mayet-1989, inc-medan-1953, inc-rosmead-1972, inc-cangzhou-1998, inc-florence-1954, inc-kofu-1975, inc-victoria-1991. In tier 2 the same flag sits on inc-ariel-1994, inc-holloman-1964, inc-magenta-1933, inc-pascagoula-1973, inc-phoenix-lights-1997, inc-westall-1966, inc-la-joya-1980 (Chilean navy 2014 and Westall at least have official or contemporary records that could be cited).

**No Sources line and no links (28).** legacy-program, ev-disclosure-project-2001, inc-western-us-orbs-2025, sample-bismuth-magnesium, ce-5, doc-mod-flying-saucer-working-party-1951, doc-mod-defe-24-2086, doc-mod-defe-24-1961, doc-mod-defe-24-1972, doc-mod-ufo-sighting-lists-1997-2009, doc-prem-11-855-churchill-1952, inc-britannia-elba-1992, inc-birmingham-police-helicopter-2008, inc-boston-skegness-1996, inc-bromley-2003, inc-heathrow-tower-1992, inc-louth-triangle-1992, inc-lyneham-radar-1994, inc-prestwick-radar-1999, inc-tern-hill-2008, inc-uk-reentry-1978, inc-chorwon-1952, inc-cranwell-missile-1991, inc-ubatuba-1957, inc-allagash-1976, inc-farnborough-1950, inc-tangmere-wartling-1950, inc-cangzhou-1998. The MoD-file cases cite their DEFE document in facts, so the fix is one `*Sources:*` line naming it.

**No facts (31).** People who speak in moments but have no facts (12): kenneth-arnold (6 moments), harrison-schmitt (4), frank-borman, jim-lovell, kevin-campbell, scott-carpenter, wally-schirra, barry-mitchell, frederic-courtade, gus-cottey, maurice-masse, minoru-kihara. Other people with no facts: yuli-platov, robert-powell, emil-j-smith, takanori-tamefuji, yoshio-tsukuda, lee-seung-bae, lim-byeong-seon. Organisation: aeronautica-militare. Documents (finding aids, by design): the ten doc-mod-ufo-files-* release documents and doc-mod-ufo-sighting-lists-1997-2009.

**People whose facts cite only URLs (45; no video or document on file backs any fact).** donald-keyhoe, roberto-pinotti, russell-targ, anthony-choy, delbert-newhouse, haim-eshed, james-comer, cynthia-hind, gerald-ford, ross-coulthart, tom-delonge, gary-heseltine, gregory-guillot, randall-nickerson, ricardo-bermudez, richard-barth, terry-lovelace, brandon-fugal, chaz-king, gadi-schwartz, hideichi-amano, isaac-ben-israel, meng-zhaoguo, russell-yokum, shigeru-ishiba, stephen-bassett, ak-antony, arlindo-gabriel-dos-santos, ed-rhodes, jacob-salatun, jason-turner, javier-lerdo-de-tejada, john-kilburn, john-locken, kei-endo, koos-de-klerk, lothar-neethling, otto-weyland, ryan-weigelt, s-c-pierman, sandra-larson, shinjiro-koizumi, tom-cooper, yasukazu-hamada, yoshiharu-asakawa. Where the person has a video on file (Guillot: the SASC transcript exists; Barth and Coulthart have interviews), re-source to it. In tier 2 the same flag sits on jesse-marcel-jr, robert-hastings, aj-gevaerd, donald-menzel.

**Citations with no moment (tier 3).** inc-warren-1976 → v-2010-09-28…@2719; sasc-etc → v-2024-11-19-hearing@9; fife-symington → v-npc-2007-ufo-close-encounters@4690; gregory-rogers and inc-cape-canaveral-1992 → v-jm-greg-rogers@11; tania-vassie → v-phenom-westall-66@3444; film-s4-bob-lazar-story and film-the-alien-perspective cite their trailers without a timestamp.

**Unverified facts.** 28 files in tier 3 and 12 in tiers 1–2 carry `unverified` facts (doc-wilson-memo has three, richard-doty two). Each should either find a source or be dropped; `unverified` is not a resting state.

---

## 6. Videos

### 6.1 Long interviews with few moments

Videos with a transcript, 20 minutes or longer, under four moments an hour. These are the "more moments" candidates; the first ten are well connected and feature people whose files lean on them. Two videos have no moments at all besides the trailers: `v-jre-fan-we-are-you` (68 min, linked to the NHI concept with nothing to show) and `v-tim-leach-war-reporter-profile` (28 min, cited by Tim Leach's facts without a timestamp).

| Conn. | Video | Length | Moments | Per hour |
|---|---|---|---|---|
| 29 | `v-jm-dylan-borland` | 199 min | 13 | 3.9 |
| 19 | `v-2013-chd-opening` | 98 min | 6 | 3.7 |
| 19 | `v-lex-fridman-david-fravor` | 236 min | 15 | 3.8 |
| 16 | `v-jre-anna-paulina-luna` | 149 min | 7 | 2.8 |
| 15 | `v-1994-larry-king-ufo-cover-up-live` | 124 min | 4 | 1.9 |
| 15 | `v-2025-02-28-rebelliously-curious-doty` | 121 min | 8 | 4.0 |
| 15 | `v-jm-jake-barber` | 184 min | 2 | 0.7 |
| 14 | `v-jm-greg-rogers` | 156 min | 7 | 2.7 |
| 11 | `v-jillian-michaels-elizondo` | 119 min | 5 | 2.5 |
| 11 | `v-michels-john-blitch-2025` | 191 min | 2 | 0.6 |
| 11 | `v-srs-joe-mcmoneagle` | 374 min | 7 | 1.1 |
| 9 | `v-michels-ellsworth-reunion-2026` | 167 min | 11 | 3.9 |
| 7 | `v-hellyer-hannibal-tv-2017` | 83 min | 2 | 1.4 |
| 7 | `v-michels-mario-woods-2025` | 147 min | 1 | 0.4 |
| 7 | `v-polanco-chango-interview` | 61 min | 4 | 3.9 |
| 6 | `v-2020-08-23-unidentified-flying-objects-the-true-story-of-fly` | 90 min | 5 | 3.3 |
| 6 | `v-2024-04-17-hasc-air-force-budget` | 167 min | 2 | 0.7 |
| 6 | `v-7news-spotlight-ufo-phenomenon-2021` | 79 min | 3 | 2.3 |
| 6 | `v-michels-allagash-2026` | 141 min | 4 | 1.7 |
| 5 | `v-betty-hill-1999-interview` | 108 min | 2 | 1.1 |
| 4 | `v-hellyer-interview-2019` | 61 min | 3 | 3.0 |
| 3 | `v-phenom-westall-66` | 72 min | 2 | 1.7 |
| 3 | `v-salt-karl-nell-zero-doubt` | 22 min | 1 | 2.8 |
| 2 | `v-1971-02-apollo-14-debriefing-light-flashes` | 97 min | 4 | 2.5 |
| 2 | `v-1972-05-apollo-16-science-debriefing-flash` | 97 min | 4 | 2.5 |
| 2 | `v-1972-05-apollo-16-science-debriefing-starbase` | 56 min | 2 | 2.2 |
| 2 | `v-1972-12-apollo-17-debriefing-light-flash-experiment` | 53 min | 3 | 3.4 |
| 2 | `v-jre-fan-we-are-you` | 68 min | 0 | 0.0 |
| 1 | `v-tim-leach-war-reporter-profile` | 28 min | 0 | 0.0 |

### 6.2 Wiring issues on well-connected videos

A person listed as `features` who never appears as a moment's speaker, or a file linked `about` that no moment refers to. Either add the moment (the person did speak) or correct the link.

| Conn. | Video | Issue |
|---|---|---|
| 38 | `v-2026-08-28-disclosure-forum-national-security` | linked but never in a moment: features gadi-schwartz; speakers with no moment as speaker: gadi-schwartz |
| 37 | `v-2026-10-21-weaponized-stratton-first-interview` | linked but never in a moment: about book-out-of-the-shadows |
| 30 | `v-2023-10-17-weaponized-lacatski-kelleher` | linked but never in a moment: features george-knapp; features jeremy-corbell; speakers with no moment as speaker: george-knapp, jeremy-corbell |
| 28 | `v-2026-01-20-newsnation-varginha-press-conference` | linked but never in a moment: features eric-burlison; speakers with no moment as speaker: eric-burlison |
| 28 | `v-npc-2007-ufo-close-encounters` | linked but never in a moment: features fife-symington; features nick-pope; features anthony-choy; speakers with no moment as speaker: fife-symington, nick-pope, anthony-choy |
| 23 | `v-2026-04-08-weaponized-lacatski-disclosure` | linked but never in a moment: features jeremy-corbell; speakers with no moment as speaker: jeremy-corbell |
| 21 | `v-2025-11-05-weaponized-lacatski-part-1` | linked but never in a moment: features george-knapp; speakers with no moment as speaker: george-knapp |
| 20 | `v-2025-11-11-weaponized-lacatski-part-2` | linked but never in a moment: about aawsap |
| 20 | `v-jm-karl-nell` | linked but never in a moment: features diana-pasulka; speakers with no moment as speaker: diana-pasulka |
| 18 | `v-2013-chd-truth-embargo` | linked but never in a moment: includes film-the-anonymous-interview |
| 16 | `v-1988-10-14-ufo-cover-up-live` | linked but never in a moment: features stanton-friedman; speakers with no moment as speaker: stanton-friedman |
| 15 | `v-1994-larry-king-ufo-cover-up-live` | linked but never in a moment: about area-51 |
| 12 | `v-2021-12-10-these-are-parts-of-an-alien-ufo-stanford-scientis` | linked but never in a moment: ; speakers with no moment as speaker: hal-puthoff |
| 11 | `v-2013-chd-closing` | linked but never in a moment: features john-burroughs; features jim-penniston; speakers with no moment as speaker: john-burroughs, jim-penniston |
| 10 | `v-2026-10-13-fox-special-report-stratton` | linked but never in a moment: about book-out-of-the-shadows |
| 8 | `v-2019-10-12-nimitz-encounters-kevin-day` | linked but never in a moment: related to gary-voorhis |
| 8 | `v-2021-05-16-navy-pilots-recall-unsettling-2004-uap-sighting` | linked but never in a moment: related to uaptf |
| 8 | `v-2026-09-03-asa-kevin-campbell-mq9` | linked but never in a moment: features ryan-graves; speakers with no moment as speaker: ryan-graves |
| 8 | `v-2026-10-20-cuomo-jay-stratton` | linked but never in a moment: about book-out-of-the-shadows; about crash-retrieval; 4/7 moments without refs |

Across the 278 less-connected videos the script counts 200 with moments lacking a `speaker`, 46 with most moments lacking `refs`, 46 with a linked file no moment refers to, and 21 with a featured person who never speaks in a moment. Moments without a speaker do not reach the person's page; moments without refs do not reach the case's. The Citizen Hearing sessions are the largest block (v-2013-chd-truth-embargo 9 of 13 without speaker; v-1988-10-14-ufo-cover-up-live 11 of 17; v-1990-07-roswell-reunion 8 of 17).

### 6.3 Hearings and events with no moments of their own

h-2013-citizen-hearing (21 session videos, 0 moments tagged to it), h-2023-07-26, h-2024-11-13, h-2024-11-19, h-2025-05-01, h-2025-09-09, h-2022-05-17, h-2023-04-19, ev-disclosure-project-2001, ev-npc-2007, ev-capitol-uap-press-conference-2026, ev-ufo-nukes-press-conference-2010, ev-varginha-press-conference-2026, ev-disclosure-forum-2026, film-age-of-disclosure (11 clip videos), book-out-of-the-shadows (4 Stratton interviews). The recordings' moments are tagged to people and cases only, so these pages show no highlights. Add `refs: [<hearing-id>]` to the 5–8 defining moments of each.

---

## 7. Generic `related to` links (34)

From `npm run check -- --related`. Each should say how, or go. The reviewers proposed replacements for the ones on top files: uap-disinformation → linda-moulton-howe (`example`, Doty's planted document); bob-salas → sean-kirkpatrick (drop); tim-gallaudet → chris-mellon (say how or drop); legacy-program → immaculate-constellation (that file never mentions "legacy"; drop); book-inside-covert-ufo-program → skinwalker-ranch, crash-retrieval (`describes`, `claims about`); book-skinwalkers-at-the-pentagon → kona-blue (`describes`); ev-npc-2007 → cefaa (`featured`, Bravo spoke for CEFAA); nro → h-2023-07-26, ev-grusch-icig-complaint-2022 (`named at` or drop); linda-moulton-howe → inc-roswell-1947 (covered by the sample link); v-2021-05-16-navy-pilots → uaptf, v-2025-03-18-avc-dietrich → david-fravor, v-jre-fan-we-are-you → nhi (tag a moment instead).

The rest: book-in-plain-sight → v-7news-spotlight-ufo-phenomenon-2021; doc-bolender-memo-1969 → dow-uap-d095; doc-cia-haines-1997 → area-51; doc-twining-memo-1947 → dow-uap-d100, 18-100754-general-1946-7-vol-2; doc-ufo-briefing-document-1995 → project-blue-book, project-sign; ev-planned-oversight-hearing-2026-11 → tim-burchett, anna-paulina-luna, eric-burlison; inc-lakenheath-1956 → project-blue-book; inc-medan-1953 → jacob-salatun; nasic → dia; dan-isbell → george-knapp; diana-pasulka → crash-retrieval; dow-uap-d174 → book-skinwalkers-at-the-pentagon; usg-uap-d002 → crash-retrieval; v-2019-09-21-nimitz-encounters-gary-voorhis → kevin-day; v-2019-10-12-nimitz-encounters-kevin-day → gary-voorhis; v-pascagoula-sheriff-tape-1973 → fred-diamond.

One build warning: `film-the-anonymous-interview` uses the label "shown at", which is not in `scripts/relations.mjs`.

---

## 8. Patterns worth a rule

- **A file should state what its moments say.** When a moment is curated for a person or case, the file gets a fact with `by:` and `source: video@t` in the same edit. Section 3 is the backlog.
- **Claims go on the fact and the moment.** A claim tagged on a fact whose source is a video should also sit on the moment at that timestamp, and vice versa; the claim page and the person's positions come from both.
- **A video citation needs a moment.** `source: video@t` with no moment near `t` is a dead link for the reader; the cross-check script (`facts cite video timestamps with no moment there`) should run in `npm run check`.
- **One statement per fact, one speaker per `by:`.** Bundled facts (Knapp and Bray, Fravor and Mellon and Puthoff, Grusch and Elizondo) hide the second speaker from their own page.
- **Sworn testimony has one status.** Decide whether testimony from a hearing transcript is `documented` (the record documents that it was said) or `claimed` (the content is the witness's claim); files currently mix the two for the same witness. The claim rules suggest `claimed` with `basis: first-hand`, reserving `documented` for the fact of the statement when that is the point.
- **Hub files carry the counter-evidence.** AARO, Blue Book, the CIA, the concept pages: the official finding is a `documented` fact with `stance: disputes`, not a sentence in the body.
- **Wikipedia is a last resort on central files.** Nimitz, Roosevelt, Roswell, Rendlesham's sceptic paragraph, Blue Book's closing numbers, The Age of Disclosure, the Citizen Hearing all have primary records on file that the Sources line should name instead.
