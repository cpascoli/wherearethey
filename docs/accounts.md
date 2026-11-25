# Accounts and alerts: specification

22 November 2026, revised the same day after review. **Status: approved by the owner with these revisions. Step 1 is built in the working tree (22 November) and tested locally; nothing is deployed, and the owner's setup (section 11) and the gates on production (section 15) are still to do.** Companion to [the roadmap](roadmap.md) (0.3, 1.2, 2.7).

**25 November: step 1b (the weekly digest) and an owner's admin page are built in the working tree and tested locally; not deployed. They are section 18, which also lists the owner's setup for them.**

Step 1 is specified in full. Later steps are outlined, so that step 1 doesn't get in their way; each gets its own spec.

How to read the claims about services:
- **Checked**: read in the vendor's documentation or seen on our site or Netlify account on 22 November (links at the end).
- **To prove**: assumed. It has a test under "Tests and launch gates" and must pass before launch.

## 1. Decisions

1. **One account, created by the email sign-up.** There is no separate mailing list to migrate.
2. **An account is not consent to email.** Each kind of email is its own subscription, with a record of when and to what wording the person agreed.
3. **No passwords.** An emailed code first; passkeys, Google and Apple in step 2. Facebook and Reddit are not planned.
4. **The archive stays static and open.** Nothing needs an account to read. If every account service is down, the archive works.
5. **The content and the members never mix.** `content/` stays the source of truth for the archive. Member data is never in git, the build, a page's HTML or a deploy preview. What members write is never a source.
6. **Collect the least.** An email address and what the person asked for. No names, photos, IP addresses or user agents on accounts. Nothing that identifies an account goes to Google Analytics or the traffic counter. Links in an email carry one `utm_source`, the same for every reader, so Analytics can tell that a visit came from an alert, never whose.
7. **A person sends every broadcast.** Scripts and the admin page make drafts; the owner presses Send, or picks the time it goes (section 18).

## 2. Steps

| Step | What ships | Condition to start |
|---|---|---|
| **1** | Email-code sign-up and sign-in, the PURSUE release alert, unsubscribe, delete account | This spec approved |
| 1b | The weekly digest as a second topic, offered to members and in the sign-up's confirmation, never switched on for them | Step 1 live; the first digest drafted (roadmap 1.1) |
| 2 | Passkeys (offered after sign-in), Google, then Apple | Step 1 stable through one release alert |
| 3 | Bookmarks and Follow, private to the member | Step 1 stable |
| 4 | Email alerts for followed files; hearing alerts | A per-file change list in the build |
| 5 | Private "suggest a source or correction" | A review queue the owner has time for |
| 6 | Public comments | **A separate decision** (section 14) |

## 3. Step 1: scope

**Goal:** live by **3 December 2026**. Our estimate for Release 9, from the gaps so far, is 4 December to 1 January, most likely around 18 December. It is not an official schedule.

**The promise:** "An email usually within a day of each PURSUE release, with the files that matter." "Usually", because one person sends it and the date isn't known in advance.

**In:** the sign-up block, code sign-in, `/account`, one topic (`pursue`), the draft script for the alert, unsubscribe, deletion, the privacy text.

**Out:** other topics, follows, bookmarks, OAuth, passkeys, profiles, display names, any member-written text, an admin UI. (The digest topic and an admin page for the owner came with step 1b: section 18.)

**Measures:** confirmed subscribers; share of codes sent that are verified; delivery, bounce and complaint rates of the first alert; visits arriving from it; unsubscribes.

## 4. Screens

### 4.1 The sign-up block

One component, never a pop-up (UX review 5.4), in three places (the owner's choice on 22 November, after seeing it at the foot of every file: a PURSUE prompt doesn't belong on a file that has nothing to do with PURSUE):
1. the PURSUE explainer, under the release table;
2. the foot of each PURSUE release's page, after the next step;
3. the home page, after the first block.

Not on other files, and not on Latest. A prompt on every file waits for step 4, where it is about that file ("follow this case").

```
┌──────────────────────────────────────────────┐
│ Get the next PURSUE release by email         │
│ Usually within a day of each release, the    │
│ files that matter.                           │
│ [ you@example.com            ] [ Alert me ]  │
│ Creates your free account (16+). Unsubscribe │
│ in one click. Privacy                        │
└──────────────────────────────────────────────┘
                       ↓ in place
┌──────────────────────────────────────────────┐
│ Enter the 8-digit code sent to y…@example.com│
│ [ 1234 5678 ]                  [ Confirm ]   │
│ Use the latest email · Send again in 0:60    │
│ Change address                               │
└──────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────┐
│ ✓ You'll hear from us when Release 9 is out. │
│ Manage your account                          │
└──────────────────────────────────────────────┘
```

- Fields are at least 16 px (no zoom on iOS). Use `type="email"`, `autocomplete="email"`, and for the code `inputmode="numeric" autocomplete="one-time-code"`.
- The pending step is kept in `sessionStorage` for 10 minutes, because readers in an in-app browser leave it to fetch the code.
- Signed in and subscribed: the block is one quiet line; on the home page it is nothing at all (the owner's choice: the state of an alert is on `/account`), except the confirmation right after subscribing there. Signed in and not subscribed: one button, no code.
- The release number comes from `pursueStats`, never typed by hand.
- The block is drawn below the fold and must not become a page's largest paint. It adds no history entry.
- Errors are said in place and announced (`aria-live`): wrong code, expired, too many tries, "email is busy, try again later". If the address is suppressed, the sign-in succeeds and the block says alerts can't be delivered to it, as `/account` does.
- From step 1b the confirmation offers the digest with one button. It is never switched on by the sign-up itself.

### 4.2 `/account`

A standalone page, like `/privacy`: no Analytics, no third-party script or font, its script in its own file.

- **Signed out:** "Sign in or create an account": email, then code. No alert is switched on from here unless its box, unticked by default, is ticked.
- **Signed in:** the masked address; a switch for "PURSUE releases"; Sign out; Sign out everywhere; Delete account.
- **Delete:** asks for a fresh code, says what is deleted and what remains (section 9), then signs out.
- **Suppressed address** (bounce or complaint): says alerts can't be delivered and gives the contact address. It never clears a suppression by itself. If Resend also refuses to send sign-in codes to a suppressed address (**to prove**), that member can't sign in at all: the sign-in form then gives the contact address, and the owner deletes the account on request.

The entry point (the owner's choice, 23 November) is the button in the top-right corner of the header, in place of the settings cog: a person icon, or the account's initial once signed in. It opens one dialog, "Account & settings" (a dialog in the middle on desktop; on phones a sheet that comes up from the bottom and is dragged down to close, as on an iPhone), with the account forms and, below them, the settings, which need no sign-in and stay in the browser, never in the account. The forms are the same code as this page (`account.js`, mounted in the dialog), so there they run under the app's looser policy: accepted, since the sign-up block already takes the address and the code in the app, the session cookie can't be read by a script, and deletion needs a fresh code. Links to `/account` inside the app open the dialog; the page stays for links from emails and the privacy page. A reader who left for the mail app in the middle of signing in finds the dialog open again on the code step.

### 4.3 The emails

| Email | Sent through | Content |
|---|---|---|
| Code | Resend, transactional | Subject "Your Where Are They code" (the code is not in the subject), the code, "expires in 10 minutes", "ignore this if it wasn't you". No links, no tracking. |
| Release alert | Resend Broadcast, topic `pursue` | What was released, three to five files with one sourced line each, the release's page, why you get this, unsubscribe (links carry `utm_source=alert`, the same for everyone), the sender's identity and postal address (section 13). |

From `alerts@wherearethey.info`, Reply-To `wherearetheyinfo@proton.me`. Open and click tracking are off. There is no welcome email.

## 5. Architecture

```
static pages ──fetch──► /api/*  Netlify Function (us-east-2)
/account     ──fetch──►   │  our routes, limits, origin check
                          ├──► Better Auth (library, not exposed directly)
                          ├──► Neon Postgres (us-east-2): the source of truth
                          └──► Resend: codes; contacts as a mirror
Resend ──signed webhook──► /api/hooks/resend
owner's Mac: npm run alert ──► reconcile, then a Broadcast DRAFT ──► owner sends
```

- **Better Auth**, pinned to an exact version, with the email OTP plugin. Only our routes are public; they call it server-side. Its catch-all handler is not mounted, so endpoints we don't use don't exist. In step 1 it gives us the codes and the sessions; we replace its limiter, its routes and its deletion flow. It earns its place in step 2 (passkeys, Google, Apple), and the two things we need from it now were tried on 22 November with version 1.7.27 and its in-memory adapter: the cookie comes out as `Path=/api; HttpOnly; Secure; SameSite=Lax` with no `Domain` (`advanced.defaultCookieAttributes`), and sessions are stored with no IP or user agent (a `databaseHooks.session.create.before` hook). The code is stored hashed, and after three wrong tries it is dead, the right one included. Still to see on Postgres.
- **Neon**, not Netlify Database: the latter copies production data into each deploy preview. There is one Neon project, production. **The API is off outside production**: previews and branch deploys have no database and no keys, every route answers `404` there, and the block isn't shown.
- **Handlers are plain functions** (`Request` in, `Response` out) in `api/`, wrapped by one Netlify Function. `npm run dev` mounts the same handlers at `/api/*` with PGlite (Postgres in the Node process) and a fake Resend that prints the code in the terminal. The tests call the handlers directly, on PGlite too. No Docker, no cloud database for development.
- **A scheduled function, once a day**, purges expired codes, sessions, limit counters and webhook ids (section 9) and retries failed contact syncs and deletions (**to prove**: that our plan runs scheduled functions; otherwise the purge runs at the start of `/api/code`, at most once an hour).
- **Resend in a team of its own**, so that other projects don't share its quota, contacts, suppression list or keys.
- **Pages never vary by member.** The browser keeps a non-identifying `wat:member` flag and calls `/api/me` after first paint only when it is set. This also protects the plan's 125,000 function calls a month.
- `geo.js` excludes `/api/*` and `/account`, so the traffic counter can't tie its visitor code to having an account.
- **Two switches.** `ACCOUNTS_ENABLED` turns the API on (production only). `SIGNUP_SHOWN` shows the block and the Account links to everyone; while it is off they show only in a browser where the owner has set a local flag. So the launch gates are run on production, with the real origin, cookie and mail, before any reader sees the form. Either switch off leaves the archive as it is.

## 6. Data

Better Auth creates `user`, `session`, `account` and `verification`. Its schema is generated and committed as a migration. `user.name` is always empty and `user.image` null; `session.ipAddress` and `session.userAgent` are always null.

Our tables:

```sql
create table subscription (
  user_id         text not null references "user"(id) on delete cascade,
  topic           text not null check (topic in ('pursue')),   -- a migration adds each topic (1b: 'digest')
  status          text not null check (status in ('on','off')),
  changed_at      timestamptz not null default now(),
  changed_by      text not null check (changed_by in ('member','email_link','owner')),
  primary key (user_id, topic)
);

create table consent_event (          -- append-only; the proof of consent
  id              bigint generated always as identity primary key,
  user_id         text not null references "user"(id) on delete cascade,
  topic           text not null,
  granted         boolean not null,
  wording_version text not null,      -- the exact wording lives in git under this version
  placement       text not null check (placement in ('pursue','file','latest','home','account','email','owner')),
  at              timestamptz not null default now()
);

create table mail_contact (           -- the mirror in Resend
  user_id           text primary key references "user"(id) on delete cascade,
  resend_contact_id text unique,
  synced_at         timestamptz,      -- null: needs a sync
  suppressed_at     timestamptz,      -- the address, not a topic: no alert of any kind is sent
  suppressed_reason text check (suppressed_reason in ('bounce','complaint','manual'))
);

create table contact_deletion (       -- survives the user until Resend confirms
  resend_contact_id text primary key,
  requested_at      timestamptz not null default now()
);

create table limit_counter (          -- key = HMAC of kind + value, never the raw IP or address
  key             text not null,
  window_start    timestamptz not null,
  n               integer not null,
  primary key (key, window_start)
);

create table webhook_event (
  id              text primary key,   -- svix-id
  received_at     timestamptz not null default now()
);
```

`placement` is the kind of place, never the file. Which file someone signed up from says what they read.

A suppression belongs to the address, so it is on `mail_contact` and leaves the member's choices in `subscription` as they were.

The runtime database role can read and write rows and cannot change the schema; on `consent_event` it can only insert and read (rows go with the account through the cascade, which runs as the table's owner). Migrations are run by the owner with another role. Deleting an account deletes its consent events: erasure comes before keeping proof.

## 7. Endpoints

JSON only, `Cache-Control: no-store`, bodies up to 4 KB (the webhook 64 KB). Every write except the webhook requires `Origin: https://wherearethey.info` exactly.

| Endpoint | Body | Does | Returns |
|---|---|---|---|
| `POST /api/code` | `email` | Checks limits, sends a sign-in code | `202`, the same for new and known addresses |
| `POST /api/session` | `email, code, subscribe?, placement?, wording?` | Verifies; creates the account if new; only then, if `subscribe`, records consent and syncs the contact | `200` and the cookie; `400` invalid or expired; `429` |
| `GET /api/me` | none | Reads the session | `{ signedIn, maskedEmail, topics }`, never the full address or the id |
| `PUT /api/subscriptions/pursue` | `on, placement, wording` | Changes it, appends a consent event, syncs | `200`; `409` if suppressed |
| `DELETE /api/session` | `everywhere?` | Revokes this session or all | `204` |
| `POST /api/account/code` | none | Sends a code to the session's own address | `202` |
| `DELETE /api/account` | `code` | Verifies the fresh code; deletes the account; queues and attempts the contact's deletion | `204` |
| `POST /api/hooks/resend` | signed event | Verifies over the raw body, ignores repeats, applies it | `204`; `400` bad signature |

`placement` and `wording` are checked against the lists the server knows; anything else is `400`. Addresses are trimmed and lower-cased, nothing more.

## 8. Rules

**Codes.** Eight digits, 10 minutes, three attempts, stored hashed, a new one replaces the last. Eight and not six: at the limits below, someone guessing at one address every day for a year has about a 1 in 9,000 chance, against about 1 in 90 with six.

**Limits.**

| What | Limit |
|---|---|
| Codes to one address | 1 a minute, 5 an hour, 10 a day |
| Codes from one IP | 10 an hour, 30 a day |
| Verifications from one IP | 30 an hour |
| All codes | alert the owner at 60 a day; stop at 95 on Resend's free plan (100 a day) |
| `/api/*` from one IP | 60 a minute, by Netlify's rule (the free plan allows two rules) |

The IP is `context.ip`, never a header the client can set. Our counters replace Better Auth's limiter, which doesn't apply to server-side calls.

**Sessions.** 90 days, rolling, checked in the database (no cookie cache). `HttpOnly; Secure; SameSite=Lax; Path=/api`, no `Domain`. The narrow path keeps the cookie off page loads, the edge functions and the proxy to R2.

**Subscriptions.**
- The Resend topic's default is **opt-out**, so a contact gets it only when subscribed. Resend can't change this default later.
- Postgres is the truth for consent. Unsubscribes, bounces and complaints from Resend always win over an older "on".
- A sync never turns a subscription on again. Only the member does, by an explicit action: on our pages, or on Resend's own preferences page (the topic is public), which reaches us as `contact.topics.updated` and is recorded as a consent event with the wording `resend-preferences`.
- A suppression is set by a permanent bounce, a complaint or `suppression.added`, and cleared only by `suppression.removed`, which is the owner removing it at Resend.
- A refused request for a code counts toward the limits like any other.
- Signing in never changes a subscription.

**Sending an alert.** `npm run alert -- pursue 9`:
1. stops unless the release's page is live;
2. reconciles with Resend: pulls unsubscribes first, retries failed syncs and deletions, and stops if it would remove more than 5% of contacts or the database looks empty;
3. writes the draft from the release's event and highlights, with quotes only from those files;
4. creates the Broadcast with `send: false`, prints the recipient count, and refuses to create a second draft for the same release.

The owner sends a test to themself, reads it, then sends from Resend.

## 9. What is kept

| Data | Where | Until |
|---|---|---|
| Email, account id, created date | Neon | The account is deleted |
| Subscriptions, consent events | Neon | The account is deleted |
| Sessions | Neon | 90 days without use, sign-out or deletion |
| Codes | Neon, hashed, beside the address they were sent to (a typed address that is never confirmed included) | Expiry; purged within a day |
| Limit counters | Neon, HMAC only | 2 days |
| Webhook ids | Neon | 30 days |
| Contact and topic | Resend | The account is deleted |
| Delivery logs, suppression entries | Resend | Resend's retention; a suppression remains so we don't mail that address again |
| Database history | Neon free plan | Up to 6 hours |
| Backups | Encrypted `pg_dump` on the owner's Mac, outside the repo and any synced folder | 30 days |

The purges are the daily scheduled function's (section 5). Backups are `npm run backup`: run by a weekly job on the Mac (launchd) and by the migration script before it changes anything; it also deletes dumps older than 30 days. After restoring a backup, deletions made since it was taken must be applied again before anything is sent. Export on request is by email in step 1.

## 10. Threat model

What we protect, in order: **who is a member** (some may be military, cleared or public figures, for whom interest in this subject is sensitive), the ability to send as wherearethey.info, the sessions, the archive's integrity and uptime.

| # | Threat | Response | Left over |
|---|---|---|---|
| T1 | Finding out whether someone is a member | Same response and email flow for new and known addresses; sending happens after the response (`waitUntil`); no public profiles or counts per file | Someone who can read the inbox |
| T2 | Guessing a code | Section 8 | About 1 in 9,000 a year for a targeted address. Someone who asks for codes to a member's address can use up its 10 a day and replace a code in use: a nuisance to one member, who can still write to us |
| T3 | Using the form to bomb an inbox, or exhaust the 100 codes a day | Per-address and per-IP limits, the breaker, the kill switch; Resend Pro if it happens | Distributed abuse can pause sign-in. The archive is unaffected |
| T4 | Bots filling the list | No contact and no consent until a code is verified | Bots with real inboxes |
| T5 | Subscribing someone else | Needs their code | None known |
| T6 | Cross-site requests | Exact Origin check, JSON only, SameSite, no CORS | A hostile subdomain is same-site; host nothing untrusted on one |
| T7 | Script injection on our origin. **Today:** the CSP allows inline scripts and any jsDelivr package, and the app builds HTML with `innerHTML` | No member text in step 1; HttpOnly; `/api/me` gives only a masked address; deletion needs a fresh code; `/account` has a strict CSP | Injected script could read a masked address, change a subscription or read what is typed. The CSP must be tightened before step 5 |
| T8 | **The R2 proxy. Checked:** `/pagefind-mod/*` serves the bucket from our origin, the app imports JavaScript from it, and the proxied response has no CSP. Whoever can write to the bucket can run script as the site | **Before launch: remove the proxy.** A redirect can't filter by content type, so proxying "only the index" would still serve an HTML file put under that path from our origin. Ship Pagefind's loader with the site, versioned like our other scripts, and have it fetch the index and its WebAssembly from the bucket's own address (`basePath`; the bucket must allow it by CORS, and **checked** on 22 November: it sends no such header yet). Delete the `/pagefind-mod/*` redirect; narrow the rclone token. The search page also put the index's excerpts and links into the page as HTML: it now keeps their text and `<mark>`s only, and links only to our pages or `https`. **Done in the working tree on 22 November** (`tests/mod-search.test.mjs`); it must not be deployed before the bucket's CORS rule is set, or the MoD search stops | Altered search results or a broken search. The WebAssembly comes from the bucket but can't touch the page |
| T9 | Third-party scripts in the app (Analytics, YouTube, X) share the page with the form | No account data in the DOM beyond the field; Analytics' automatic collection of user-provided data confirmed off; `/account` loads none | A compromised vendor could read what is typed into the block |
| T10 | Secrets read during a build. **Checked:** our plan has no variable scopes, so builds see Functions' secrets | Values set for the Production context only and marked secret; untrusted deploys stay on "require approval" (it is); lockfile and `npm ci`; dependency updates reviewed | Code merged to main runs with the secrets, the Latest bot's PRs included: read the diff outside `content/` and `sources/` before merging |
| T11 | Real data in previews | No database and no keys outside production; the API answers `404` unless `context.deploy.context` is production | None known |
| T12 | Forged or replayed webhooks | Signature over the raw body, timestamp tolerance, `svix-id` once | None known |
| T13 | A stolen Resend key. Contacts need a `full_access` key, which can also send and export the list | Two keys: send-only (domain-restricted) for codes, full access for contacts; never logged; rotation written down | The full key is powerful |
| T14 | A mistaken or repeated broadcast | Draft only; the count shown; one draft per release; a test first | Human error |
| T15 | Spoofed mail from the domain. **Checked:** no DKIM record at `resend._domainkey` and no DMARC record today | SPF, DKIM, DMARC at `p=none`, then `quarantine` after two clean weeks | Look-alike domains |
| T16 | Personal data in logs | Log route, status and a request id only; never bodies, addresses, codes or provider error bodies | The host's own request logs |
| T17 | Owner's accounts taken over (Netlify, Neon, Resend, GitHub, DNS, Proton) | Two-factor on all six | One-person dependency |
| T19 | The owner's account taken over, or a script on our origin using the owner's session. The admin routes can send to every member | The routes answer 404 to everyone else; they return counts, never an address; a send needs a fresh emailed code and the version of the draft that was reviewed; the email is written on the server from structured text, with links to our own pages only; three sends a day at most; `/admin` has a strict CSP | Someone who reads the owner's inbox can sign in and send. Two-factor on the mailbox (T17) |
| T18 | A legal demand for the member list | Hold little; delete for real; don't promise anonymity | Email addresses can identify people |

## 11. Your setup checklist

Never paste a key or connection string into a chat or commit one. Enter them in Netlify's UI yourself.

**Before the build, by 25 November**
- [ ] Two-factor on Netlify, Neon, Resend, GitHub, DNS and Proton.
- [ ] Netlify → Billing: check this month's build minutes and what happens past 300 (section 12). Don't switch to a credit plan without doing the sums there.
- [ ] Neon: one project, `wherearethey-prod`, AWS us-east-2. None for previews: the API is off there.
- [ ] Resend: a team for this site; add `wherearethey.info`; tracking off.
- [ ] DNS (Netlify): the records Resend shows, and `_dmarc` TXT `v=DMARC1; p=none`.
- [ ] Resend: segment "Members"; topic "PURSUE releases", **default opt-out**, public.
- [ ] Decide the open questions (section 13).

**Before launch, by 1 December**
- [ ] Resend: the two keys; the webhook to `https://wherearethey.info/api/hooks/resend` for `email.bounced`, `email.complained`, `suppression.added`, `suppression.removed`, `contact.updated`, `contact.deleted`, `contact.topics.updated`.
- [ ] Netlify variables, Production context only, marked secret: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `LIMIT_HMAC_KEY`, `RESEND_SEND_KEY`, `RESEND_CONTACTS_KEY`, `RESEND_WEBHOOK_SECRET`. Not secret: `RESEND_TOPIC_PURSUE` and `RESEND_SEGMENT` (the ids of the topic and of the "Members" segment), `ACCOUNTS_ENABLED`, and `SIGNUP_SHOWN` (off until the gates pass; it is read by the build, so changing it needs a deploy).
- [ ] Neon: two roles. The owner role runs migrations and backups from the Mac; a second role with no rights of its own is the one in the function's `DATABASE_URL` (use the pooled address). `npm run accounts:migrate` creates the tables and gives that role its rights (`ACCOUNTS_RUNTIME_ROLE` = its name).
- [ ] On the Mac, in the Keychain (`security add-generic-password -a "$USER" -s <name> -w`): `wherearethey-migrate` (the owner role's connection string), `wherearethey-resend` (the full-access key, for `npm run alert`) and `wherearethey-backup` (a passphrase for backups). In the shell profile: `ACCOUNTS_BACKUP_DIR` (outside the repo and any synced folder), `ACCOUNTS_RUNTIME_ROLE`, `RESEND_TOPIC_PURSUE`, `RESEND_SEGMENT` (and `ALERT_ADDRESS` only if a postal address is ever used; section 13). Install the weekly job for `npm run accounts:backup`; it needs `pg_dump` (`brew install libpq`).
- [ ] To see the block before launch, in your own browser's console on the site: `localStorage.setItem('wat:signup', 'true')`.
- [ ] R2 → the bucket → Settings → CORS policy: allow `GET` and `HEAD` from any origin (the bucket is public already, so this opens nothing; it also keeps the search working on previews). **Do this before the next push**: the T8 fix reads the search index from the bucket directly.
- [ ] Accept the processing agreements of Neon, Resend and Netlify.
- [ ] Analytics admin: user-provided data collection off.
- [ ] Send yourself a code and a test broadcast on Gmail, iCloud and Proton.

## 12. Cost and limits

| Service | Checked 22 November | What it means |
|---|---|---|
| Resend, transactional | Free: 3,000 a month, 100 a day. Pro: $20 for 50,000 | Enough for codes. Pro before step 4, or on a spike |
| Resend, broadcasts | Free to 1,000 contacts. Then $40 a month to 5,000 | Free to twice April's target of 500 |
| Neon | Free: 1 GB, 100 compute-hours, sleeps after 5 minutes, 6 hours of history | Enough. The first request after sleep is slower |
| Netlify (legacy Starter) | 300 build minutes, 125,000 function calls, 100 GB a month; no variable scopes | See below |
| Apple (step 2) | Developer Program, about $99 a year | Not needed for step 1 |

**Build minutes are already tight.** Netlify's deploy records for 1–22 November add up to about 346 minutes of deploy time: 214 production, 64 previews, 68 branch deploys. That may not equal billed minutes or the billing cycle, so check Billing. This work will add deploys: test locally (the dev server runs the whole API) and push in batches. A site built on the Mac and uploaded with the Netlify CLI uses no build minutes; keep that for a month that runs out, since such a deploy doesn't come from a reviewed commit.

## 13. Open questions for the owner

1. **Postal address in the alerts.** *Decided on 23 November: none. The owner has no fixed address; the alerts carry his name and the contact address. To revisit before any email asks for support or sells anything, when a mailbox address would be needed.* CAN-SPAM requires one in commercial email (a registered PO box or private mailbox qualifies). An alert alone may not be commercial; a request for support may make it so. Recommended: get a mailbox address and don't use a home address.
2. **Where the controller is established.** *Decided on 23 November: the privacy text names Carlo Pascoli; advice on a representative is still to take, as recommended below.* The privacy text must name who is responsible. Outside the EU and UK, GDPR Article 27 and its UK equivalent may require a representative, and the local law applies too. Not researched here; take advice. Advice won't arrive by 25 November, so decide whether it holds the launch. Recommended: it doesn't. Step 1 ships with the text naming the person responsible and the contact address, and advice is taken before step 3 or 500 members, whichever is first.
3. **Minimum age.** 16 is proposed. *Decided on 23 November: 16.*

None of this is legal advice.

## 14. Later steps: what step 1 must allow

- **Passkeys:** relying-party id `wherearethey.info`, so they don't work on preview addresses. Offered after sign-in, since a passkey doesn't verify an email address. The code stays as recovery.
- **Google and Apple:** link only on a provider-verified address; don't copy name or photo. Google refuses sign-in in many in-app browsers, so the code stays first there. Apple's relay needs the sending domain registered, and its addresses won't match an existing account: link from `/account`.
- **Follows and bookmarks:** keyed by the entry's id, never its path; private; no counts shown while they are small.
- **File alerts:** from a diff of facts, moments and links. `lastmod.json` won't do, as it changes when the wording or the rendering does. One email a day at most per member.
- **Suggestions:** private, plain text, never rendered as HTML, never published without the normal sourcing rule.
- **Comments:** the roadmap's reason against them stands (moderation). Before a decision: who moderates and in how many hours a week, pseudonyms, reporting and appeals, a policy on allegations about living people, the duties under the UK Online Safety Act and the EU Digital Services Act, a CSP without inline scripts, and a clear visual wall between comments and the sourced record.

## 15. Tests and launch gates

**Automated (`npm test`, with a throwaway database and a fake Resend)**
- A new and a known address get identical responses.
- No account, consent or contact before verification; signing in alone subscribes to nothing.
- Wrong, expired, replaced and fourth-attempt codes fail; every limit returns 429.
- A wrong or missing Origin fails on every write.
- The cookie has exactly the attributes in section 8 (tried on 22 November, section 5).
- Session rows have no IP or user agent (tried the same day).
- An unsubscribe survives a sign-in and a reconcile; a repeated webhook does nothing.
- Deletion removes every row and retries the contact.
- An unknown `placement` or `wording` is refused; the runtime role can't update or delete a consent event.
- A bounce or complaint marks the address, leaves the member's choices, and turning a topic on returns `409`.
- The daily purge removes what section 9 says and nothing else.
- Outside production every route answers `404`.
- The block works at 390 px, survives a reload at the code step, adds no history entry and isn't the largest paint.
- The existing tests still pass.

**By hand, before launch** (on production, with `SIGNUP_SHOWN` off)
- The Reddit and X in-app browsers on an iPhone, and Safari: leave for Mail, return, finish.
- SPF, DKIM and DMARC pass in a received message.
- A broadcast carries `List-Unsubscribe` and `List-Unsubscribe-Post`, and one click updates Postgres. **Passed on 22 November** with the first test broadcast (Release 8, to the owner only): SPF, DKIM and DMARC pass, both headers are present, and the unsubscribe reached Postgres through the webhook within seconds. It also showed that Resend's unsubscribe page marks the whole contact "unsubscribed", so switching an alert back on now clears that mark.
- A contact without the topic doesn't receive a topic broadcast. **Passed on 23 November** with a second test broadcast and two members: one with the alert on, one who had switched it on and off again (a contact in the segment, opted out of the topic). Only the first received it. A member who never asked for an alert is not a contact at Resend at all.
- Whether a suppressed address still gets a sign-in code (**to prove**; if not, the sign-in form gives the contact address).
- The scheduled function runs (**to prove**).
- A preview answers `404` on `/api/*` and has no secrets in its environment.
- T8 is closed: `/pagefind-mod/` on our origin is a 404, an HTML file put in the bucket can't be opened from our origin, and the MoD search works on `/mod-files` and in the top search (Pagefind loading its index from another origin passes locally; to see on production once CORS is set).
- The privacy page is updated in the same deploy as the form.

## 16. Build order

| By | Work |
|---|---|
| 25 Nov | Owner's setup; T8 fixed; Better Auth's two points proved (or dropped for step 1) |
| 28 Nov | Migrations, API, webhook, the daily purge, tests, the dev server's `/api` |
| 30 Nov | Block, `/account`, privacy text, alert and backup scripts |
| 2 Dec | API on in production with the block hidden; gates passed there |
| 3 Dec | `SIGNUP_SHOWN` on: live |

If it slips, cut the home placement before cutting a gate. If Release 9 comes first, launch afterwards; don't rush it out on the day.

## 17. Privacy text to publish at launch

Published on 23 November 2026 in `site/privacy.html`, with the launch.

> **Accounts and email alerts.** You don't need an account to read the archive. If you create one, we store your email address, when you created it, the alerts you chose and when you chose them. We use them to sign you in and to send what you asked for, nothing else: the account because you asked for it, each alert because you agreed to it, and you can withdraw that at any time. We don't ask your name, don't store your IP address with your account, and don't send anything that identifies your account to Google Analytics; links in our emails are marked as coming from an alert, the same for every reader. To limit abuse we keep a scrambled code of your IP and email address for up to two days. An address that is typed in and never confirmed is deleted within a day. Signing in sets one cookie, needed to keep you signed in. Neon (database), Resend (email) and Netlify (hosting) process this data for us, mainly in the United States. Unsubscribe from any alert in one click. Delete your account at /account; copies in backups expire within 30 days, and our email provider keeps a record of addresses that bounced or reported spam so they aren't mailed again. You can ask for a copy of your data, a correction or its deletion by writing to wherearetheyinfo@proton.me, and if you are in the EU or the UK you can complain to your data protection authority.

It also names who is responsible for the data: Carlo Pascoli.

The first paragraph's "no accounts, no ads and no newsletter" becomes "no ads", and the table gains Neon and Resend.

## 18. Step 1b: the weekly digest, and the owner's admin page

Built on 25 November 2026 at the owner's request: the digest, and a page to run it from any device instead of the command line.

**The digest for members.** A second topic, `digest` (migration `002_digest.sql`). It exists for members only once `RESEND_TOPIC_DIGEST` is set: until then `/api/me` doesn't list it, the switch isn't drawn and the route refuses it. `/account` and the dialog show one switch per topic. The sign-up block offers it once, in the confirmation right after subscribing ("Want the weekly digest too, about one email a week?"), with one button; signing up never switches it on. The promise is "about one email a week", since a person sends it. Wording version `2026-12-b`. Links carry `utm_source=digest`, the same for every reader.

**Who the owner is.** The one address in `ADMIN_EMAIL` (Netlify, Production context; not in the repository, which is public). That account signs in like any other. `/api/me` adds `admin: true` for it alone, and `/account` then shows a link to `/admin`. With the variable unset there is no admin.

**`/admin`** (`site/admin.html`, `site/assets/admin.js`, `admin.css`): a standalone page like `/account`, under its own policy (no inline script, nothing from another site; inline styles allowed for the email preview, which sits in a sandboxed frame that can run nothing). The page holds no data: everything comes from `/api/admin/*`.

- **Figures:** accounts, new in 7 and 30 days, each alert's count and how many of those can be reached, members with no alert, switched off in 30 days, suppressed addresses, sign-ins in use, codes sent today, choices not yet at Resend, sign-ups per day, and where alerts were switched on by kind of place. Counts only: no address, id or list of members is ever returned. Readers and referrers stay in Analytics and `npm run traffic`.
- **Compose:** a proposal made in the browser from `/latest.json` (written by the build: the last three weeks of Latest, with up to three moments per video): this week, newly filed, coming up, one moment. The owner edits everything: subject, opening, sections, items (title, link, line), the moment, closing.
- **Save:** drafts are rows in `broadcast_draft`, as structured text (`api/digest.mjs`), never HTML. Each save raises the version; an older copy can't overwrite a newer one.
- **Review:** the email as the server wrote it from the saved draft, HTML and plain text, and "Send me a test", which goes to the owner's own address only.
- **Send:** now, or at a date and time (Resend's `scheduled_at`, up to 30 days ahead). It needs a fresh emailed code and the version reviewed. Before it, members' choices that haven't reached Resend are pushed, and the send stops if any remain. A scheduled digest can be taken back (the broadcast is deleted at Resend) and becomes a draft again.

| Endpoint | Does |
|---|---|
| `GET /api/admin/stats` | The figures |
| `GET /api/admin/digests`, `POST` | List; create a draft |
| `GET`, `PUT`, `DELETE /api/admin/digests/:id` | Read with the rendered email; save (`version`); delete a draft |
| `POST /api/admin/digests/:id/test` | The email to the owner alone (10 an hour) |
| `POST /api/admin/code` | A code to confirm a send |
| `POST /api/admin/digests/:id/send` | `code, version, at?`: send or schedule (3 a day) |
| `POST /api/admin/digests/:id/cancel` | Take a scheduled one back |

All answer `404` unless the session is the owner's.

**Not in it:** the PURSUE release alert (still `npm run alert`, which reads the content files), delivery figures (Resend's API gives none; they are on its dashboard), a support request in the digest (it would need a postal address first: section 13), and reader statistics.

**Owner's setup, in this order**
- [ ] Resend: a topic "Weekly digest", **default opt-out**, public.
- [ ] `npm run accounts:migrate` (backs up, applies `002_digest.sql`, grants the function's role the new table). Before the deploy: the new code reads the table only on the admin routes, so the order is safe either way, but the digest switch fails until it has run.
- [ ] Netlify, Production context: `ADMIN_EMAIL` (your sign-in address, marked secret) and `RESEND_TOPIC_DIGEST` (the topic's id). Set `RESEND_TOPIC_DIGEST` last: it is what shows the digest to members.
- [ ] Deploy, sign in, open `/admin`, compose a draft, send yourself a test, then schedule one to yourself and take it back.

## References

- Better Auth: [email OTP](https://better-auth.com/docs/plugins/email-otp), [rate limits](https://better-auth.com/docs/concepts/rate-limit), [options](https://better-auth.com/docs/reference/options), [passkeys](https://better-auth.com/docs/plugins/passkey)
- Netlify: [variables](https://docs.netlify.com/build/environment-variables/overview/), [secrets](https://docs.netlify.com/build/environment-variables/secrets-controller/), [untrusted deploys](https://docs.netlify.com/deploy/deploy-overview/), [rate limiting](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/), [Database](https://docs.netlify.com/build/data-and-storage/netlify-database/)
- Neon: [plans](https://neon.com/docs/introduction/plans.md)
- Resend: [pricing](https://resend.com/pricing.md), [topics](https://resend.com/docs/dashboard/topics/introduction.md), [broadcasts API](https://resend.com/docs/api-reference/broadcasts/create-broadcast.md), [webhooks](https://resend.com/docs/webhooks/event-types.md), [DPA](https://resend.com/legal/dpa)
- Apple: [private email relay](https://developer.apple.com/help/account/capabilities/configure-private-email-relay-service/)
- FTC: [CAN-SPAM guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)
