# Where Are They: project review

15 November 2026, four weeks after launch (17 October). Updated 16 November with the Google Analytics exports (sections 6 and 7; the summary and recommendations were reordered to match). Companion document: [roadmap.md](roadmap.md).

## Summary

The archive is unusually well sourced for its subject and the product is polished well beyond what a four-week-old site normally is. The things that most limit it today are not content or design:

1. **The audience is small and almost nobody returns.** Google Analytics counted 1,043 users in the first 29 days, about 250 new users a week and flat. Of each weekly cohort, 2–4% came back the following week, and the share is falling (section 6). There is no way to come back on purpose: no email sign-up, no follow, no alerts; only an RSS feed and the X account. Every retention and income goal in the roadmap depends on fixing this.
2. **Visitors come from ChatGPT and Reddit, not from Google.** ChatGPT sent about 26% of sessions, Reddit 11%, Google 3%. The two traffic spikes were a records release and a case anniversary. The site is not yet built around those entry points: most of these visitors land on a deep page, and the home page loses 60% of the people who reach it.
3. **Google visibility collapsed on 25 October.** Google showed pages 200–440 times a day from 19 to 24 October, then fewer than 10 times a day from 25 October onwards (Search Console export of 13 November: 20 clicks in total). The cause is not established. It is worth diagnosing, but Google is a small share of traffic either way.

Behind those, in order of importance:

3. The first load ships 8.2 MB of script (about 1.3 MB compressed), and every deploy makes returning visitors download about 1 MB again.
4. The archive's balance is real page by page, but the sourcing rule admits proponents more easily than sceptics, so the totals lean one way.
5. Copyright and living-person exposure (full transcripts, stills, covers, relayed allegations) is tolerable for a non-commercial archive and becomes a real constraint once the site earns money.
6. There are no tests or CI, and `npm run check` validates only half of the pipeline.

### How this review was done

- `npm run check` run on the current tree: 1,739 entries, 0 warnings, 0 errors, 2 min 20 s.
- Content measured with scripts over the frontmatter of every file in `content/` (records excluded), plus about 35 files read in full and six quotes checked word for word against `library/docs/*.txt` (all six matched).
- Code read: the build scripts, `templates/app.html`, `netlify/`, `netlify.toml` and the structure of `site/assets/app.js`.
- The live site viewed on desktop (1440 px) and at phone width (390 px) across home, Explore, a person page, Videos, Claims, Latest, Timeline and World.
- Search data from `tmp/search-console/` (export of 13 November, data to 9 November).

- The cookieless traffic counter (`npm run traffic`, November; it holds data from 13 November only and took about 25 minutes to return).
- Google Analytics exports of 16 November in `tmp/google-analytics-report/` (Reports snapshot, User attributes, Generate leads; 18 October to 15 November). Added after the first version of this review.

Not covered: a real phone, a screen reader, and Lighthouse (the 15 November figure of about 68–71 on mobile comes from the project notes, not from this review). Section 7 lists what is still not assessed.

## 1. Content

### What is on file

| Type | Files | Notes |
|---|---|---|
| People | 281 | 226 credible, 29 reporter tier, 26 outside the criteria |
| Incidents | 169 | 119 open, 37 partly explained, 11 explained, 2 hoax |
| Videos | 378 | 2,783 curated moments, 243 transcripts (201 hours) |
| Documents | 145 | plus 478 generated PURSUE records |
| Books and films | 119 | 109 books, 10 films |
| Claims | 28 | 13 disputed, 12 open, 3 supported, 0 refuted |
| Other | 141 | organizations, events, programs, hearings, concepts, news, places, sources |

3,309 facts: 60% `claimed`, 40% `documented`, 8 `unverified`. 858 entries came with the launch import; about 900 were added in the following three weeks and 15 in the last week.

### Strengths

- **The sourcing discipline is real.** All but one fact carries a source. 40% of sources are a video timestamp and 23% a local primary document. The quotes checked hold.
- **The flagship files carry their counter-evidence.** `inc-roswell-1947` sets Cavitt's sworn statement and Haut's 1990 "None whatsoever" beside his 2002 affidavit. `inc-rendlesham-1980` has 14 documented facts including the police and MoD notes. `david-grusch` carries Grothman and AARO as disputing facts.
- **Claims are worded neutrally.** `recovered-non-human-craft` says that almost everyone asserting it was told by others and that the official record contradicts it. The official position has its own claim page.
- **Unauthenticated papers are handled carefully** (the Wilson memo, Immaculate Constellation with the DoD denial).
- **The archive corrects itself.** Four internal reviews in a month, and nearly every specific finding re-checked from them is fixed: AATIP now follows AARO's account, `related to` links went from 528 to 0, no Wikipedia-sourced fact is `documented`.
- **It is no longer US-only.** About two thirds of incidents are outside the United States, many from primary sources (GEIPAN, the MoD files, the Brazilian and Uruguayan records).
- **The prose is sober**: hedged attribution, no sensational wording in the files sampled.

### Weaknesses and risks

**Selection bias built into the sourcing rule.** Credentials admit proponents (Grusch 58 facts, Knapp 39, Puthoff 36, Davis 32) and exclude most working sceptics, who are usually private researchers. Mick West is named in nine files and has none of his own; one person in 281 is tagged `sceptic`. The result shows in the claim totals: `recovered-non-human-craft` has 150 supporting statements and 28 disputing, Roswell 88 to 15, Malmstrom 54 to 6. `/claims` then ranks claims by statement count, which rewards the side that talks most. Each page is balanced; the aggregate is not.

**Statements about living people.** All are attributed, and hearing quotes are fair report, but relayed podcast hearsay is the largest exposure:

- `sean-kirkpatrick` carries Luna's "a documented liar", a fact that bundles two speakers against the one-speaker rule, and his own accusation against Jay Stratton.
- `boeing` and the Lockheed file name companies as holding retrieved technology.
- `skywatcher` gives five facts to a journalist's anonymous-source claims.

**Copyright.** 108 book covers and 145 portrait stills from third-party broadcasts are committed, and every video page publishes its full transcript, including whole commercial podcasts. Some glimpses come from Goodreads, Google Books and review blogs, which stretches the "authorized excerpt" rule. There is no copyright contact or takedown line on the About page, and the public repository has no licence file.

**A thin long tail.**

- 90 people have one fact or none; 99 have no bio and 99 no portrait.
- 38 incidents have two facts or fewer; 35 have no documented fact.
- 55 of 109 books have no facts.
- Three incidents and four people rest on Wikipedia alone.
- `inc-florence-1954` carries the mass-sighting badge on a coverage entry whose own note says the 1954 page "has not yet been retrieved", which breaks the contemporary-coverage rule.
- `inc-bariloche-1995` holds the one fact with no source.

**Weak sources in strong positions.** Six `documented` facts cite patrickgross.org and three roswellproof.com; two claims take their status source from patrickgross. `inc-magenta-1933` leans on the Daily Mail, and its claim has 13 supporting statements and none disputing.

**Status drift.** 142 `documented` facts carry `by:`, so "it was said on the record" and "it is so" blur (one Fravor line is `documented` while his others are `claimed`). `langley-drones-unidentified` is `supported` where the record only says "not identified". 119 of 169 incidents are `open`, many because nobody investigated rather than because an investigation failed.

**Skew.** 210 of 378 videos are from the 2020s. Of the 28 key files that Explore opens on, 27 are American; the exception, Rendlesham, is a U.S. base in England. The most-quoted moment speakers include Barber (50), Hellyer (42) and Doty (41), none of whom is among the archive's strongest witnesses.

## 2. User experience

### What works

- **The first impression is strong.** The landing page states what the archive is in one sentence, offers search and two clear actions, and explains the three status stamps before asking the visitor to trust anything. This is a judgement by eye; the numbers disagree (60% bounce on the home page, section 6).
- **The phone layout is a real design**, not a shrunken desktop: bottom tab bar, stacked person header, filters in a drawer, the map framed on the United States.
- **Video is the best feature.** Synced transcript, curated moments, links that open at the second, and a file beside the player.
- **Stories and "Six threads to pull" give a newcomer a path.** Explore opening on 28 key files instead of the whole network was the right call.
- **Every view and file has a real address**, so anything can be shared or bookmarked.

### What gets in the way

- **Nothing asks the visitor to return.** See the summary. Latest exists but only reaches people who already came back.
- **A wrong address shows the landing page.** `/person/this-does-not-exist` returns HTTP 404 but renders the home hero with no "not found" message and no search suggestion. Anyone guessing an id (`/incident/inc-nimitz-2004`) lands there too.
- **Person pages open on machinery.** Below the bio comes a strip of thirteen counters ("positions on claims 6 · watch 6 videos · mentioned together…") before any testimony. The strongest material (what this person said, with the clip) should come first.
- **Hidden gestures carry too much.** Double-click to follow, right-click or long-press for connections, double-click a facet to isolate it, the R key for reading view. None is discoverable without the hint lines, and touch users have no hover.
- **The archive's vocabulary is a learning cost.** File, dossier, record, moment, claim, statement, position, trail, story, key files. A first-time visitor meets most of these within a minute.
- **Latest is led by a 2004 file.** The pinned card on 15 November is the Nimitz encounter, dated "14 Nov 2004", above the actual news. If this is an anniversary pin, the card should say so.
- **Timeline is behind "More" on phones**, although it is the most natural reading order for a newcomer.
- **Accessibility is partial.** The server-rendered article is semantic, but the app removes it on boot. The graph canvas has no text alternative beyond A–Z, there is little focus management on panel and route changes, several `outline: none` rules, and the menu has no arrow-key handling.

## 3. Architecture and technical choices

### How it works

Markdown files with YAML frontmatter are the source of truth. `scripts/build.mjs` validates them, resolves links, matches names in transcripts and writes `site/data/*.js`. `scripts/pages.mjs` writes one HTML page per view and file (1,753 pages, 1,273 in the sitemap) with a server-rendered article, metadata and JSON-LD. The browser app is a single hand-written script with no framework. Netlify serves it, an edge function injects the visitor's country and counts traffic, and Cloudflare R2 holds the heavy files.

### Decisions worth keeping

| Decision | Why it is right |
|---|---|
| Plain files, frozen `slugs.json`, `added.json`, `lastmod.json` | Portable, diffable, reviewable in pull requests; links never break |
| Real URLs with a full article per file | Shareable and indexable without running the app |
| Content-hash versioning, immutable `/data/*`, `version.json` notice | Every visitor gets a consistent build |
| Build-time Markdown sanitising and word-for-word quote checks on bot news | The right defence where outside text enters |
| On-demand transcripts, document text, records and libraries, with SRI | Keeps the heavy data out of the first load |
| Precomputed graph layout and share cards | Fast first paint, consistent previews |
| Consent-gated analytics and a salted cookieless counter | Honest numbers without tracking |
| `relations.mjs` as one link vocabulary shipped to the app | The model for removing the duplication below |

### Trade-offs accepted, and what they now cost

| Trade-off | Bought | Costs today | Breaks when |
|---|---|---|---|
| All entities in one `kb.js` | Instant navigation, client-side search, no backend | 6.7 MB raw (0.97 MB brotli) parsed before anything is interactive; any edit invalidates it for every returning visitor | Content grows 3–5× |
| No framework, one 3,475-line script | No build step, small code (67 KB brotli) | 141 functions around one mutable state, `innerHTML` templates, untestable | A second contributor joins |
| The dossier written twice (`pages.mjs` and `renderPanel`) | SEO pages without a rendering framework | Nine or more constants and helpers kept in sync by hand; `VIEW_PATH` has already diverged | Continuously |
| Edge function on every HTML response | Country-aware consent, cookieless counting | No HTML is cached anywhere; two or three Blobs calls per page load; no `onError: 'bypass'`, so an edge failure is an error page | A traffic spike or aggressive crawl |
| `r2.dev` public URL | No DNS move needed | Rate-limited and documented by Cloudflare as not for production | Files get real traffic |
| No tests, no CI | Speed in the first month | `check` stops before pages, layout and cards; most problems are warnings that never fail a deploy | The first bad bot pull request |
| Name matching by one large regex | Simple code | It is nearly the whole 2 min 20 s of `check`, runs uncached on every dev rebuild, and grows with names × transcript length | Now, for the editing loop |
| Operations on one Mac | No infrastructure | Chrome, Whisper, rclone and the R2 index all depend on one machine and one person | Any absence |

### Other findings

- **Eager data that need not be.** `mentions.js` (1.1 MB) loads at boot but only feeds dossier and video features. Claim assertions (0.55 MB) duplicate fact and moment text already in `kb.js`, and build-only fields (`file`, `match`, `unmatch`) ship to the browser.
- **Each transcript is published three times**: in the HTML article, in JSON-LD and in `data/transcripts`. Video pages are 31.6 MB of the 79 MB of HTML.
- **The CSP is weaker than it reads.** `script-src` allows `'unsafe-inline'` and all of jsdelivr and cdnjs, so it adds little against injected markup. The real defences are `esc()` (used consistently) and the build sanitiser.
- **Edge function paths.** `/cards/*`, `/version.json`, `/feed.xml` and `/pagefind-mod/*` are not excluded, so every link preview and every open tab's ten-minute poll invokes it.
- **The traffic counter is an unguarded read-modify-write**, so concurrent loads lose counts, and inflation remains open from the security audit.
- **The hero markup is scraped from `app.js` by string position** (`pages.mjs:344`). If the markers move it yields an empty hero without an error.
- **No secrets are in the repository.** Only public identifiers.
- **Bus factor is one.** 582 commits by one author; `CLAUDE.md` is the only architecture document and is essential.

## 4. Search visibility

| Period | Impressions per day | Clicks |
|---|---|---|
| 19–24 October | 206–441 | 16 in six days |
| 25 October–9 November | 0–9 | 3 in sixteen days |

- Only 146 of the 1,273 sitemap pages received any impression.
- Program pages do best: 10 pages, 846 impressions. `legacy-program` alone has 421 and the most query variety ("what is the legacy program", "is the legacy program real").
- `/claims` had 579 impressions and one click (0.17%), which points at its title and description.
- 281 person pages drew 143 impressions between them, 169 incident pages 53.
- Book queries ask for PDFs ("out of the shadows jay stratton pdf"), which the site rightly does not offer.

Possible causes of the 25 October drop, none verified:

1. Google's usual early sampling of a new site ending. Common, but rarely this abrupt.
2. Something that changed on 24–25 October: the boot loader with a progress bar, hashed data URLs, pages marked never cached, and a burst of about 400 new pages in a week (books, researchers, Citizen Hearing sessions).
3. Rendering: if Google's renderer runs the app, the article is removed and replaced by a panel that depends on an 8 MB download. Video pages show only the loader until then.

A live page fetched as Googlebot on 15 November returned 200 with the full article, so the raw HTML is fine. What Google renders and what it has indexed can only be seen in Search Console (Pages report, URL Inspection with "View tested page").

## 5. Traffic counter

The cookieless counter has three days of data (13–15 November):

| Kind | Unique | Page loads |
|---|---|---|
| People | 9,816 | 10,560 |
| Search engines | 642 | 1,015 |
| AI crawlers | 500 | 2,006 |
| Link previews | 514 | 696 |
| Other bots | 4,202 | 13,369 |

**The "people" figure is not people.** 7,773 of them came on one day (14 November), each loaded 1.07 pages, and they landed almost evenly across deep video pages (196, 190, 190, 157, 154…) while the home page got 151. That is the shape of a crawl from rotating addresses with browser-like headers, not of readers. It is the inflation problem left open in the security audit, and it means the counter cannot yet give a baseline. A defensible reading is that real visitors number in the hundreds over these three days at most.

Two smaller points: the report took about 25 minutes for 15,674 records, so it will not scale to a full month; and AI crawlers (Perplexity, ChatGPT, Claude, Amazon, Meta) already load more pages than search engines do, which is a distribution channel in its own right.

## 6. Audience and acquisition (Google Analytics)

From the exports of 16 November, covering 18 October to 15 November (29 days). Analytics runs only after consent in the EEA, UK and Switzerland and is blocked by some browsers, so these figures are a floor for real readers.

| Measure | Value |
|---|---|
| Active users | 1,043 (1,042 new) |
| New users per week | 232, 222, 191, 311 |
| Returned the following week | 10 of 232, 5 of 222, 3 of 191 (4.3%, 2.3%, 1.6%) |
| Views | 2,326, about 2.2 per user |
| Average engagement per user | 37 seconds |
| Home page | 419 views, 322 users, 60% bounce |
| United States | 640 users (61%) |

Sessions by source:

| Source | Sessions | Share |
|---|---|---|
| Direct | 699 | 57% |
| ChatGPT | about 310 | 26% |
| Reddit | about 135 | 11% |
| Google | 37 | 3% |
| X (t.co) | 20 | 2% |
| Facebook | 10 | 1% |

What this says:

- **This is the baseline the roadmap lacked**: about 1,000 users a month, about 250 new a week, 2–4% returning the next week.
- **ChatGPT sends about eight times the traffic Google does.** Section 5 noted that AI crawlers read the site more than search engines; they are already the largest identifiable source of readers. Which pages they cite is not in these exports (the landing page by source report would show it).
- **Spikes follow events.** 23 October (98 new users) matches PURSUE Release 07, and 7 November (90) the anniversary of the O'Hare sighting. The O'Hare incident page (101 views) and its CNN video (66) are the two most viewed content pages.
- **Video pages carry the site**: 658 views against 528 for all file pages. After O'Hare, the most viewed are FLIR1 (60), the Ariel School BBC report (49) and NewsNation on Release 07 (44).
- **Book pages get almost no traffic.** The most viewed, *Out of the Shadows*, had 8 views. Affiliate links cannot earn at this level.
- **The home page does not convert**, and the visit is short: 37 seconds and 2.2 views on average.
- **Some of "Direct" is not people.** Data-centre cities (Ashburn 37, Council Bluffs 26, North Charleston 13, Prineville, Boardman, and probably part of Singapore's 36) account for roughly 100 users, about 10%.
- **13 November recorded no users at all.** No commit of that week explains it. It looks like a gap in tracking and should be checked.
- **Measurement gaps.** No key events are configured, and the exports carry no breakdown by event, so depth (video plays, moment clicks, outbound and sponsored links) cannot be read from them although the app sends those events.
- **Languages.** 82% of users browse in English; a few page titles arrived machine-translated into Japanese, Chinese and Korean. Demand for translations is modest so far.

## 7. What this review does not yet assess

1. **Economics.** Now recorded in the roadmap from the owner's figures: no hosting cost, about $200 a month in AI subscriptions, and about two hours a day of the owner's time at $200 for a full day (about $1,500 a month), so a full break-even of about $20,000 a year. Not assessed: whether the roadmap fits in two hours a day once the digest and the daily posts are running.
2. **Who the readers are.** No segments (enthusiasts, journalists, researchers) and no feedback from readers, including how the Reddit posts were received.
3. **The landscape.** A first pass is in the roadmap ("Comparable sites"): UAP Insight, The Black Vault, UAP Observatory, Enigma Labs, the newsletters. Not assessed: their audience sizes and income, which none of them publishes.
4. **Dependence on one channel.** One assistant supplies a quarter of the traffic; nothing records which pages it cites or how exposed the site is if that changes.
5. **Deep pages as entry points.** Most ChatGPT and Reddit visitors land on a video or file page; the review judged the landing page, not those.
6. **Prerequisites for income.** A legal entity, the tax position, and which payment and affiliate programmes are available where the owner is based.
7. **Pace.** About 900 entries in three weeks, then 15 in the last; what cadence is sustainable for one person.

## 8. Recommendations

In order. The roadmap turns these into a plan.

1. **Add a way to come back**: email sign-up for a weekly digest, fed by Latest, offered on video and file pages as well as the home page.
2. **Build on the channels that work**: find which pages ChatGPT cites and make them convert; post each anniversary and release on Reddit and X; make pages easy for assistants to cite.
3. **Fix measurement**: make the traffic counter trustworthy (separate the crawl described in section 5), explain the 13 November gap, and mark sign-ups and support clicks as key events.
4. **Diagnose the search drop** in Search Console before changing anything else for SEO.
5. **Split `kb.js`** into a slim index plus per-file detail, and load `mentions.js` on demand.
6. **Cache the name matching** per transcript so `check` and dev rebuilds take seconds.
7. **Add CI**: run the full build on every pull request and make dangling references errors.
8. **Address the aggregate balance**: file the main sceptical analysts under a clear tier, and rank `/claims` by something other than volume.
9. **Reduce legal exposure before monetising**: a copyright and corrections contact, a licence, a review of full transcripts of commercial shows, and a pass over relayed allegations about named living people.
10. **Fix the 404 page, the person-page order and the Latest pin label.**
11. **Move R2 to `files.wherearethey.info`** and give the edge function `onError: 'bypass'` and wider exclusions.
12. **Clear the thin tail**: the Florence badge, the Bariloche fact, the Wikipedia-only entries, the weak-host `documented` facts.
