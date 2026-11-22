# Where Are They: roadmap

15 November 2026, revised 16 November with the Google Analytics baseline and on 22 November to bring accounts forward ([specification](accounts.md)). Based on [the project review](2026-11-15-project-review.md). The design of the interface changes (home page, file pages, phone layout, where the sign-up goes) is in [the UX review](2026-11-16-ux-review.md). Goals: more visitors, more of them returning, a stickier product, and income that does not cost the archive its credibility.

## Where we start

- **Audience** (Google Analytics, 18 October to 15 November; a floor, since it runs only after consent in Europe): 1,043 users, about 250 new a week and flat, 2.2 views and 37 seconds per user.
- **Returning visitors**: 2–4% of each weekly cohort came back the following week, and the share is falling. Nothing on the site lets a visitor subscribe or follow; the only return paths are RSS and X.
- **Devices**: 69% phones (iOS 47%, Android 23%), 30% desktop, a third of that automated. Design for an iPhone at 390 wide first.
- **Where visitors come from**: ChatGPT about 26% of sessions, Reddit 11%, Google 3%, X 2%; the rest is "direct", about a tenth of it from data centres. The two spikes were PURSUE Release 07 (23 October) and the O'Hare anniversary (7 November).
- **What they read**: video pages first (658 views against 528 for all file pages). The home page loses 60% of its visitors. Book pages get almost none: the most viewed had 8 views.
- **Search**: 20 clicks from Google in the first four weeks, and impressions fell from 200–440 a day to under 10 on 25 October. Cause unknown.
- **Cookieless counter**: data from 13 November only. It reports 9,816 "people" in three days, but the pattern (7,773 on one day, 1.07 pages each, spread evenly over deep video pages) is a crawl, not readers. It cannot yet cross-check Analytics.
- **Income**: none. Book pages already carry "Buy on Amazon" links marked `rel="sponsored"`, but `AMAZON_TAGS` in `app.js` is empty, so they earn nothing.
- **Running costs** (owner's figures, 16 November): hosting is free on Netlify's free plan; AI subscriptions about $200 a month, shared with other projects; the owner's time, unpaid for now as a side project, about two hours a day at $200 for a full day, so about $1,500 a month (60 hours at $25, counting every day of the month). That gives two break-even lines: **cash, about $200 a month**, and **full, about $1,700 a month ($20,000 a year)**. Full-time work on the archive would be about $5,200 a month ($62,000 a year); that is not the plan today. Hosting and email costs will appear with growth but stay small beside the time ([accounts, section 12](accounts.md#12-cost-and-limits); the free plan's 300 build minutes are already tight).
- **Asset**: 1,739 sourced files, 201 hours of searchable testimony, 2,783 timestamped moments, a daily news routine. The content is ahead of the audience.

The plan follows from this. **Build one loop and switch income on as the audience passes set sizes:**

> an event or anniversary → a post on Reddit and X, and a page assistants can cite → a deep page with an email sign-up → the weekly digest → a request for support

Everything that feeds the loop comes first. Everything else waits until the audience justifies it. Monetising ahead of the audience would earn almost nothing and would raise the legal stakes on the content.

## What we measure

Baselines are from Google Analytics for the first four weeks; targets are for the end of April 2027 and are to be revised monthly.

| Goal | Measure | Baseline | Target, end of April | Source |
|---|---|---|---|---|
| Reach | Users per month; sessions from assistants, Reddit and Google | 1,043; 310, 135, 37 | 5,000 | GA, Search Console, `npm run traffic` once trustworthy |
| Return | Share of a weekly cohort back the next week; digest subscribers; open and click rate | 2–4%; 0 | 10%; 500 | GA, the accounts database, Resend |
| Depth | Views per user; engagement time; share of visits that play a video or open a second file | 2.2; 37 s; not exported | 3; 60 s | GA events already sent (`select_content`, `video_start`) |
| Conversion | Share of visitors who sign up; home page bounce | 0; 60% | 2%; 45% | Sign-ups from the accounts database, the rest from GA key events (0.7) |
| Income | Monthly recurring support; affiliate revenue; share of cash costs ($200 a month) covered | 0; 0; 0% | First supporters; cash costs covered by month 12 | Payment provider, Amazon |

## Phase 0: foundations (two weeks)

Nothing later works without these.

| # | Work | Why |
|---|---|---|
| 0.1 | **Diagnose the search drop.** Search Console: Pages report (indexed vs "crawled, not indexed"), URL Inspection with the rendered view on a person, a video and a claim page, and the crawl stats around 24–26 October. | It decides whether the fix is technical (rendering, the loader) or simply patience. Google is 3% of sessions, so this no longer blocks the rest. |
| 0.2 | **Make the traffic counter trustworthy.** Separate crawl-shaped visitors (one load, no assets or data fetched, deep landing page) from readers, for example by counting a visitor as a person only once the app has booted. Make `npm run traffic` fast: it took 25 minutes for three days of records. | Analytics misses visitors who decline or block it; the counter should cross-check it, and today its "people" figure is mostly a crawler. |
| 0.3 | **Email sign-up that creates an account** (decided 22 November; [specification](accounts.md), step 1): one field and an emailed code, with a concrete promise: **an alert within a day of each PURSUE release, with the files that matter**. Built on our own accounts, with Resend for sending; hearing alerts and the weekly digest follow as separate subscriptions on the same account. In the foot of every file and video, on the PURSUE explainer, Latest and the home page. Live by 3 December, with the privacy page updated in the same deploy. | The single largest gap for returning visitors, and the base for follows, bookmarks and contributions. Most ChatGPT and Reddit visitors land on a deep page, so the sign-up must be there. |
| 0.4 | **A proper 404 page**: "not found", search, and the nearest matching files. | Wrong links currently land on the home page with no explanation. |
| 0.5 | **Legal basics**: a copyright and corrections contact on About, a licence file (code and content separately), an affiliate disclosure line. | Needed before any income, and cheap. |
| 0.6 | **CI**: run the full build on every pull request; make dangling references errors. | The daily bot opens pull requests with no automated gate beyond `check:news`. |
| 0.7 | **Fix measurement in Analytics.** Mark support click and sponsored link click as key events (sign-ups are counted in our own database: nothing about accounts goes to Analytics). Pull the landing page by source report to see which pages ChatGPT and Reddit send people to. Find out why 13 November recorded no users. Exclude known data-centre traffic. | Without key events the loop cannot be measured, and the pages assistants cite are where the sign-up matters most. |
| 0.8 | **Answer engines, now** (was 2.5). A plain two-sentence answer at the top of the pages assistants already cite and of the ten program pages, and an `llms.txt` pointing at the claims and key files. Start with `program/pursue`: turn it into the explainer people and assistants ask for (what PURSUE is, a table of the seven releases with dates and file counts, when the next is expected, where the official files are, an FAQ with structured data). UAP Insight's `/pursue` page is the model, and it holds that ground today: our 478 record pages are `noindex`. Decide whether the release pages should list their files in indexed form. Each month, ask the assistants the ten most common questions and note whether they cite the archive. | ChatGPT is the largest identifiable source of readers, about eight times Google. It is also a dependence on one channel, so watch it. |
| 0.9 | **On this day, with Reddit and X** (was 1.5). A daily card from the exact dates on file, on the landing page and as a ready post. Post each anniversary and release where the case is discussed, linking to the exact page or moment; never bulk-post. | Both spikes so far were a release and an anniversary. It costs almost nothing. |
| 0.10 | **A "Support the archive" link** that states the running costs (recorded in "Where we start"): what is paid in cash and that the work is unpaid. Beside it, the independence promise in one line: support never buys a file, a status or a place in the archive. | Covering the cash costs is the first income target (Phase 3, gates 1 and 2). |
| 0.11 | **Be ready for PURSUE Release 9.** Release 8 came on 20 November, before the sign-up was live. Releases have come 14 to 42 days apart (median 28), so Release 9 is likely between 4 December and 1 January, most likely around 18 December (our estimate). Before it: the sign-up live (0.3), key events (0.7). On the day: import the records, file the release with its strongest files and footage, send the alert, post to Reddit and X. Afterwards: record users, sign-ups and sources against Releases 7 and 8. | Releases are the largest traffic days. This will be the first run of the whole loop, and of 2.3. |

## Phase 1: reasons to return (to end of January 2027)

### 1.1 The weekly digest
One email a week, assembled from Latest: the three to five items that mattered, one "moment of the week" with its clip link, what was newly filed, and the next scheduled hearing. Draft it from `content/news/` and `added.json`; a person approves and sends. It is its own subscription on the account: people who signed up for release alerts are asked, never added. Count returning visitors properly by adding a "seen in a previous week" flag to the monthly counter record.

The digest is also the product that income is built on (Phase 3): the support request goes in every issue, and the supporter tier is a paid level of the same list.

### 1.2 Accounts: sign-in, bookmarks and follows
Brought forward from gate 3 on 22 November, in the steps of [the specification](accounts.md), one at a time:

1. the sign-up and release alert (0.3);
2. passkeys, Google, then Apple;
3. bookmarks and "Follow" on a person, case or claim, private to the member;
4. alerts for followed files, and more topics (hearings, the digest).

Step 4 needs a per-file change list from the build ("3 new facts, 1 new video moment"): `lastmod.json` also changes when only wording or rendering does. We don't record which file someone signed up from, as it says what they read.

### 1.3 "What changed" on every page
A short dated change log per file, generated from the same data. It shows the archive is alive and gives a returning visitor something new to read. It also strengthens credibility: corrections become visible.

### 1.4 A calendar of what is coming
Hearings, document releases, book and film dates, as an "upcoming" strip on the landing page and in the digest. Latest already supports upcoming entries up to 60 days ahead. The `.ics` feed is deferred.

### 1.5 On this day
Started in Phase 0 (0.9). Here: put the card in the digest, and label anniversary pins on Latest as such.

### 1.6 Remember the visitor (partly deferred)
The saved reading list becomes bookmarks on the account (1.2). The rest stays deferred until gate 2, and in the browser only, with no account: continue watching, recently opened files, and "new since your last visit" marks on Latest. With 2–4% of visitors returning, there is almost nobody to remember yet.

### 1.7 Deep pages lead with the testimony, and with a next step
Move the counter strip down. Open with the two or three strongest statements and their clips, then positions on claims, then the rest. Video and file pages are where most visitors arrive: each should end with one next step (the case's story, a related video) and the sign-up.

### 1.8 A landing page that keeps people
60% of visitors to the home page leave without a second view. Test what goes first: today's "on this day" card, the latest release, or a video moment that plays in place. Judge by bounce and sign-ups (0.7).

### 1.9 A Congress tracker on the Timeline
A view of the Timeline that shows only what happened in Congress, with its own address (`/timeline?view=congress` or `/congress`): one card per hearing with the date, chamber and committee, whether it was public or closed, the witnesses with their roles, the strongest moments playing in place, and the official record. UAP Insight's `/congress` page is the model; it starts in 2022 and links out. Ours can go further on what is already on file: ten hearings from 1966 to 2025, their recordings, transcripts and curated moments, each witness's file, and the claims each one took a position on. Add what a tracker needs beyond hearings: legislation (the UAP Disclosure Act, the NDAA provisions), closed briefings, letters and press conferences by members, and the next scheduled hearing at the top (shares the upcoming data with 1.4). It is also the natural landing page on a hearing day (2.3) and an answer page for "UAP congressional hearings" (0.8).

## Phase 2: growth (February to April 2027)

### 2.1 Search, guided by what people ask
Do this after 0.1, on whatever it finds.

- **Answer pages.** The queries that reach the site are questions: "what is the legacy program", "is the legacy program real", "aatip meaning". Program and concept pages already draw the most impressions (10 program pages, 846 impressions). Give each a plain two-sentence answer at the top, then the evidence, with FAQ structured data.
- **Fix `/claims`**: 579 impressions, one click. Rewrite its title and description around the question people type.
- **Titles and descriptions** (`seo_title`, `seo_description`) for the 50 pages with the most impressions first.
- **Person pages** draw almost nothing (281 pages, 143 impressions). Add the answer people look for ("who is…", role, what they testified) in the first lines.
- **Book pages**: people search for PDFs. Say plainly where the book can be bought or borrowed and what the page offers instead (summary, glimpses, the author's testimony).
- **Thin pages**: `noindex` or merge files with one fact or none until they are filled. A thinner index of stronger pages usually ranks better.

### 2.2 Things worth sharing
- **Moment cards.** A share image per video moment: the quote, the speaker with credentials, the date, the timestamp link. The card renderer (`cards.mjs`) already exists.
- **Embeds** (deferred to gate 3). A small embeddable block for a moment, a claim's status or a case timeline, with a link back. Journalists and forum posters get a citation in one paste; the archive gets links.
- **"Cite this"** on every fact and file: a formatted citation with the permanent address.

### 2.3 Be first and best on the day
The archive's natural traffic spikes are hearings and releases. Prepare the hearing page beforehand, publish the transcript and the first moments within hours, and post the moment cards as they are cut. The September 2025 and November 2024 hearings show the format; the next one is the test.

### 2.4 Distribution
- Reddit first: it sent six times the sessions X did. Answer specific questions with a link to the exact moment, never bulk-post (started in 0.9).
- X: daily "on this day", moment cards, each new story as a thread. The first-month thread on 17 November is the start.
- A short video per story for YouTube, linking to the trail.
- Outreach to the people on file and to the journalists who cover the subject: a corrected or completed page is a reason for them to link.
- Aggregators: suggest the Latest RSS feed as a source where aggregators accept suggestions (UAP Insight has a form and builds its feed from 21 others). The owner submits.
- Open data: publish the facts, claims and links as a downloadable dataset under a clear licence. Academic and data-journalism links are the most durable kind. UAP Insight already publishes its PURSUE analysis as CSV and JSON under CC BY 4.0; lead with what it lacks: sourced facts, claims with positions, timestamped moments.

### 2.5 Answer engines
Started in Phase 0 (0.8). Here: extend the plain answers to every program, concept, claim and key case page, and add the open dataset to `llms.txt` once it is published.

### 2.6 More guided stories
Seven stories exist. Add one a fortnight (the AARO reports, the UK files, Brazil 1977 and 1996, the nuclear cases, the 1952 Washington flap), each ending with "follow this story" and the next story. Track completions.

### 2.7 Contributions and community
A private "suggest a correction or source" form on every file for signed-in members ([accounts](accounts.md), step 5), reviewed under the normal sourcing rule, and a public page of contributors who ask to be credited. Not a public GitHub issue: that would expose who sent it.

Public comments are the direction, as a separate decision (step 6), not yet taken: moderation cost is high, the subject attracts noise, and they bring legal duties. The conditions are in the specification, section 14.

### 2.8 Languages (deferred)
A third of incidents are from France, Italy, Latin America and Brazil, but 82% of users browse in English; Spanish and Portuguese are about 3% each. Revisit at gate 3: translate the story pages and the cases of one language first and measure before going further.

## Phase 3: income (switched on by audience size, not by date)

### Principles
1. The archive stays free and complete. Nothing sourced goes behind a wall.
2. No display advertising and no sponsors from the subject's own commercial fringe. Both would cost more in trust than they pay.
3. Say who funds it, on the About page.
4. Commercial use weakens the fair-use position on third-party material. Review full transcripts of commercial shows, broadcast stills and book covers **before** income becomes significant, and take advice from a media lawyer. This is not legal advice.

### Sources, in the order to try them

| # | Source | What it takes | Realistic at this size |
|---|---|---|---|
| 1 | **Reader support**: one-off and monthly, via GitHub Sponsors, Ko-fi or Open Collective. A "Support the archive" link in the footer and the digest, with the running costs stated. | A day | Small but immediate; covers hosting first |
| 2 | **Supporter tier of the digest**: a paid level of the same account, marked by hand from the payment link while the list is short. Supporters get things that cost little to give and take nothing from the public archive: a monthly research note, a briefing within 24 hours of each hearing or release, their name on the supporters page, a say in what is filed next. | The digest running, accounts (0.3) and a payment link | The main recurring line. At 2–4% of subscribers paying, 500 subscribers is 10–20 supporters |
| 3 | **Book affiliates**: fill in `AMAZON_TAGS`, add Bookshop.org as the alternative, show the disclosure. | An hour once approved by Amazon | Close to nothing today: the most viewed book page had 8 views in a month. Amazon has closed new accounts that make no sales in their first 180 days (check the current terms), so apply only when book pages have traffic |
| 4 | **Grants**: open-government, public-records and digital-archive funds. Present the archive as a records project (the MoD files, PURSUE, primary documents, the open repository), not as UAP journalism, which few journalism funders will back from a solo site. | Applications; a named legal entity; a track record | Uncertain; perhaps one chance in eight within a year, but can be the largest single amount |
| 5 | **Research tools for professionals**: an API and bulk export with support, saved searches across transcripts and documents with alerts, for journalists, documentary researchers and academics. Paid by organisations, free for individuals. | The backend work in "Technical" below | Later; depends on reputation |
| 6 | **Digest sponsorship**: one clearly marked sponsor per issue (publishers, documentary distributors, relevant conferences). | A subscriber list worth sponsoring | Only above a few thousand subscribers |
| 7 | **Licensing and commissions**: the curated timeline or case research for documentary and news producers. | Contacts made through 2.4 | Occasional |

Not recommended: programmatic ads, paid placement of people or cases, merchandise as a main line, paywalled content.

Before any of this: settle the legal entity, the tax position, and which payment and affiliate programmes are available where the owner is based.

### Gates

Each income line switches on when the audience reaches a size, and each gate names the roadmap work that gets there.

| Gate | Reached when | Switch on | Goal | Work that gets there |
|---|---|---|---|---|
| 1 | Now | Support link with the running costs stated (0.10) | First supporters | Phase 0 |
| 2 | 500 digest subscribers | Supporter tier of the digest; affiliate tags once book pages have traffic | Toward the cash costs ($200 a month); covered at about 1,000–1,500 subscribers | 0.3, 0.8, 0.9, 1.1, 1.7, 1.8, 2.3 |
| 3 | 2,000 subscribers | One marked sponsor per digest issue; grant applications (prepare from January, cycles are slow) | A few hundred dollars a month | 2.1–2.6; the legal review (principle 4) |
| 4 | 10,000 users a month, the legal review done | Research tools, licensing and commissions | Income from organisations: what would pay for more than two hours a day | The backend; outreach (2.4) |

### What to expect

These are assumptions, not measurements: the Analytics baseline of about 1,000 users a month, 1.5–2% of visitors signing up, 2–4% of subscribers paying about $5–6 a month, and the digest running by January 2027. Month 12 is November 2027.

| Scenario | Users a month at month 12 | Visitors over the year | Subscribers at 2% | Income a month, month 6 | Income a month, month 12 | Total over 12 months |
|---|---|---|---|---|---|---|
| Low: growth stays near today's pace | 5,000 | 30,000 | 600 | $0–20 | $50–100 | $300–600 |
| Base: the loop works, one hearing spike | 15,000 | 65,000 | 1,300 | $30–50 | $200–300 | $1,000–1,500 |
| High: a major news cycle, sustained pickup by assistants and Reddit | 40,000 or more | 140,000 | 2,800 | $60–100 | $700–1,000 | $3,000–5,000 |

- Subscribers come from the visitors of the whole year, not from the last month: steady growth from 1,000 a month to the month-12 figure, times the sign-up rate. (The first version of this table overstated subscribers and income in the base and high cases by a factor of two to three; corrected 16 November.)
- **The sign-up rate matters as much as traffic.** At 4% instead of 2%, subscribers and reader income double. That is why the in-context sign-up (0.3) and the deep-page work (1.7, 1.8) come first.
- **10,000 subscribers** needs 500,000–670,000 visitors at 1.5–2%, or about 250,000 at 4%: an average of 20,000–55,000 new visitors a month for a year, against 1,000 today. Allow another 10–20% for people who unsubscribe.
- The high case includes a digest sponsor from 2,000 subscribers.
- A grant ($5,000–25,000, once) is outside these figures.
- In every case the first six months bring in under $500 in total. Year one is about covering costs, not income.
- The base case needs users to grow about fifteen-fold in a year. The flat first four weeks do not yet support that; the sign-up rate and a hearing or release in the window decide it.
- Revise this table each quarter from the measures above.

### Against the break-even lines

- **Cash ($200 a month)** is reached around month 12 in the base case, around month 8–9 in the high case, and not within the year in the low case.
- **Full ($1,700 a month, $20,000 a year)** is not reached within 12 months in any scenario at a 2% sign-up rate. At month 12 the high case brings in about half of it a month and the base case about 15%. Over the whole first year the base case covers 5–8% of the $20,000 and the high case 15–25%. It is a second-year target at best.
- **Reader support can get there, but at more than three times the high case's list.** $1,700 a month is about 280 supporters at $6, which at 3% paying means about 9,500 subscribers (the high case has 2,800), or roughly half a million visitors at 2%. At a 4% sign-up rate the high case comes close to the line by month 12. A digest sponsor or one grant would also close the gap sooner.
- **Full-time work is a different order.** $5,200 a month is about 900 supporters, or about 30,000 subscribers, and would need income from organisations (lines 4, 5 and 7).
- **What this means for the plan.** The first year builds the audience and the list; in the base case the time is mostly unpaid until year two. Decide at the end of April, against the targets, whether the trend justifies the two hours a day. Two hours a day is also the budget the plan has to fit: the digest, the daily posts and the roadmap work compete for it, so the deferred items stay deferred. Start the grant case and the contacts with journalists and producers (2.4) in January, not at gate 3.

## Technical work that the plan depends on

| Work | Unlocks |
|---|---|
| Split `kb.js` into a slim index and per-file detail; load `mentions.js` on demand | Faster first load, better search ranking signals, smaller re-download after each daily deploy |
| Cache name matching per transcript | Seconds instead of minutes for `check` and dev rebuilds |
| Emit a per-file change list at build time | Follow alerts, "what changed", the digest |
| Serve HTML statically; fetch the country from a tiny endpoint; `onError: 'bypass'`; exclude `/cards/*`, `/version.json`, `/feed.xml` | Cacheable pages, resilience on spike days |
| `files.wherearethey.info` on R2 | Files and the MoD search survive real traffic |
| One shared vocabulary module for the build and the app | Fewer hand-synced constants; safer changes |
| A small backend for accounts (brought forward on 22 November, [specification](accounts.md)). API keys still wait for gate 4; the plain files stay the source of truth | The sign-up, follows, alerts and contributions, later the research tools |

## Content work that the plan depends on

- **Balance in the aggregate**: file the main sceptical analysts under a clear tier; rank `/claims` by evidence quality, not by volume of statements.
- **Fill or hide the thin tail**: 90 people with one fact or none, 55 books with none, 38 incidents with two or fewer.
- **Portraits and bios** for the 99 people without them, key people first.
- **Living-person pass**: every relayed allegation about a named person checked for attribution, source and a right of reply where one exists.
- **Non-US key files** on the Explore map: Rendlesham is the only one of 28. Add the Belgian wave and a French or Brazilian case with primary records.

## Comparable sites

Looked at on 16 November 2026. None publishes audience or income figures.

| Site | What it is | Income | What to take from it |
|---|---|---|---|
| UAP Insight (uapinsight.com) | Daily aggregator of 21 feeds with AI summaries and scores; a PURSUE section (search, cases, map, people, open data); a Congress tracker. One person, since May 2026 | Ko-fi tips | The release-alert sign-up (0.3), the PURSUE explainer and FAQ (0.8), the release cadence (0.11), the Congress tracker (1.9), the support wording (0.10), open data (2.4). It links out and has no testimony, video or claims: depth is our difference |
| The Black Vault | FOIA document archive since 1996, over 3 million pages; mirrors and searches PURSUE | Patreon, PayPal, support through X, crowdfunding for specific requests | After decades, reader income was reported in 2020 as about covering hosting. Matches our low and base cases |
| UAP Observatory | Incident catalogue, 118 incidents in 19 countries, CSV export | None yet (waitlist) | "Evidence first" is a common claim; it has to be shown |
| Enigma Labs | Sightings app and a wiki-style library | Investors; plans subscriptions and paid analytics for partners | Paid tools for organisations, not readers |
| UAP newsletters (The Other Topic, UAP Files, UAP Intel) | Substack and Buttondown; some show over 1,000 subscribers; one paid tier for archive and comments | Paid tiers, mostly small | A reliable weekly cadence is rare and would stand out |
| MuckRock, Bellingcat (outside the subject) | Public-records requests; open-source investigations | User fees, grants, donations, paid workshops | Income at scale came from services to organisations (gate 4), with finances published |

## Risks

| Risk | Response |
|---|---|
| Search does not recover | 0.1; Google is 3% of sessions today, and the plan builds email, assistants and Reddit anyway |
| ChatGPT stops citing the archive | It is a quarter of sessions. Monthly citation check (0.8); turn those visitors into subscribers (0.3) so the audience does not depend on it |
| The audience stays near 1,000 a month | Income stays at gate 1. Keep costs low, hold the deferred work back, and review the plan at the end of April against the targets |
| Member data leaks, or accounts take the owner's two hours a day | Hold the least, the threat model and launch gates in [the specification](accounts.md), one step at a time, comments last |
| A takedown or complaint | The contact line and a written policy (0.5); trim full transcripts of commercial shows to excerpts with moments if asked |
| One-person dependency | CI, a contributor guide drawn from `CLAUDE.md`, operations documented off the one Mac |
| Daily bot files something wrong | CI gate, quote check already in place, human merge stays |
| Income changes what gets filed | The principles above, published; funders listed on About |

## The first ten things to do

1. Email sign-up with an account live, with the release-alert promise, before PURSUE Release 9's window opens on 4 December (0.3, 0.11); then the first digest (1.1).
2. Analytics key events, the landing page by source report, and the 13 November gap (0.7).
3. The PURSUE explainer with FAQ, plain answers on the pages assistants cite and the ten program pages, and `llms.txt` (0.8).
4. On this day, posted daily to Reddit and X (0.9).
5. Running costs written down and the support link live (0.10, gate 1).
6. Copyright and corrections contact, licence file (0.5).
7. Search Console diagnosis (0.1) and a new title for `/claims` (2.1).
8. Traffic counter made trustworthy (0.2).
9. 404 page and CI on pull requests (0.4, 0.6).
10. Deep pages lead with testimony and end with a next step; the landing page test (1.7, 1.8).

Next after these: the Congress tracker (1.9), the `kb.js` split, and the next steps of accounts (1.2).
