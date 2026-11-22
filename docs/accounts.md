# Accounts and alerts: specification

22 November 2026. **Status: for the owner's review. Nothing here is built.** Companion to [the roadmap](roadmap.md) (0.3, 1.2, 2.7).

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
6. **Collect the least.** An email address and what the person asked for. No names, photos, IP addresses or user agents on accounts. Nothing about accounts goes to Google Analytics or the traffic counter.
7. **A person sends every broadcast.** Scripts make drafts; the owner presses Send.

## 2. Steps

| Step | What ships | Condition to start |
|---|---|---|
| **1** | Email-code sign-up and sign-in, the PURSUE release alert, unsubscribe, delete account | This spec approved |
| 2 | Passkeys (offered after sign-in), Google, then Apple | Step 1 stable through one release alert |
| 3 | Bookmarks and Follow, private to the member | Step 1 stable |
| 4 | Email alerts for followed files; more topics (hearings, the weekly digest) | A per-file change list in the build |
| 5 | Private "suggest a source or correction" | A review queue the owner has time for |
| 6 | Public comments | **A separate decision** (section 14) |

## 3. Step 1: scope

**Goal:** live by **3 December 2026**. Our estimate for Release 9, from the gaps so far, is 4 December to 1 January, most likely around 18 December. It is not an official schedule.

**The promise:** "An email within a day of each PURSUE release, with the files that matter."

**In:** the sign-up block, code sign-in, `/account`, one topic (`pursue`), the draft script for the alert, unsubscribe, deletion, the privacy text.

**Out:** other topics, follows, bookmarks, OAuth, passkeys, profiles, display names, any member-written text, an admin UI.

**Measures:** confirmed subscribers; share of codes sent that are verified; delivery, bounce and complaint rates of the first alert; unsubscribes.

## 4. Screens

### 4.1 The sign-up block

One component, never a pop-up (UX review 5.4), in this order of priority:
1. the PURSUE explainer, under the release table;
2. the foot of every file and video, after the next step;
3. Latest, after the fifth item;
4. the home page, after the first block.

```
┌──────────────────────────────────────────────┐
│ Get the next PURSUE release by email         │
│ Within a day of each release, the files that │
│ matter.                                      │
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
- Signed in and subscribed: the block is one quiet line. Signed in and not subscribed: one button, no code.
- The release number comes from `pursueStats`, never typed by hand.
- The block is drawn below the fold and must not become a page's largest paint. It adds no history entry.
- Errors are said in place and announced (`aria-live`): wrong code, expired, too many tries, "email is busy, try again later".

### 4.2 `/account`

A standalone page, like `/privacy`: no Analytics, no third-party script or font, its script in its own file.

- **Signed out:** "Sign in or create an account": email, then code. No alert is switched on from here unless its box, unticked by default, is ticked.
- **Signed in:** the masked address; a switch for "PURSUE releases"; Sign out; Sign out everywhere; Delete account.
- **Delete:** asks for a fresh code, says what is deleted and what remains (section 9), then signs out.
- **Suppressed address** (bounce or complaint): says alerts can't be delivered and gives the contact address. It never clears a suppression by itself.

The entry point is "Account" under Settings (the cog) and in the More menu, below "PURSUE releases", which stays first.

### 4.3 The emails

| Email | Sent through | Content |
|---|---|---|
| Code | Resend, transactional | Subject "Your Where Are They code" (the code is not in the subject), the code, "expires in 10 minutes", "ignore this if it wasn't you". No links, no tracking. |
| Release alert | Resend Broadcast, topic `pursue` | What was released, three to five files with one sourced line each, the release's page, why you get this, unsubscribe, the sender's identity and postal address (section 13). |

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

- **Better Auth**, pinned to an exact version, with the email OTP plugin. Only our routes are public; they call it server-side. Its catch-all handler is not mounted, so endpoints we don't use don't exist.
- **Neon**, not Netlify Database: the latter copies production data into each deploy preview. Previews get a separate Neon *project* with no real data, because a branch would copy it too.
- **Resend in a team of its own**, so that other projects don't share its quota, contacts, suppression list or keys.
- **Pages never vary by member.** The browser keeps a non-identifying `wat:member` flag and calls `/api/me` after first paint only when it is set. This also protects the plan's 125,000 function calls a month.
- `geo.js` excludes `/api/*` and `/account`, so the traffic counter can't tie its visitor code to having an account.
- `ACCOUNTS_ENABLED` switches the API and the block off without removing the archive.

## 6. Data

Better Auth creates `user`, `session`, `account` and `verification`. Its schema is generated and committed as a migration. `user.name` is always empty and `user.image` null; `session.ipAddress` and `session.userAgent` are always null.

Our tables:

```sql
create table subscription (
  user_id         text not null references "user"(id) on delete cascade,
  topic           text not null check (topic in ('pursue')),
  status          text not null check (status in ('on','off','suppressed')),
  changed_at      timestamptz not null default now(),
  changed_by      text not null check (changed_by in ('member','email_link','bounce','complaint','owner')),
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
  synced_at         timestamptz       -- null: needs a sync
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

The runtime database role can read and write rows and cannot change the schema. Migrations are run by the owner with another role.

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
- A sync never turns a subscription on again. Only the member does, by an explicit action.
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
| Codes | Neon, hashed | Expiry; purged within a day |
| Limit counters | Neon, HMAC only | 2 days |
| Webhook ids | Neon | 30 days |
| Contact and topic | Resend | The account is deleted |
| Delivery logs, suppression entries | Resend | Resend's retention; a suppression remains so we don't mail that address again |
| Database history | Neon free plan | Up to 6 hours |
| Backups | Encrypted `pg_dump`, off the repo, before each migration and weekly | 30 days |

After restoring a backup, deletions made since it was taken must be applied again before anything is sent. Export on request is by email in step 1.

## 10. Threat model

What we protect, in order: **who is a member** (some may be military, cleared or public figures, for whom interest in this subject is sensitive), the ability to send as wherearethey.info, the sessions, the archive's integrity and uptime.

| # | Threat | Response | Left over |
|---|---|---|---|
| T1 | Finding out whether someone is a member | Same response and email flow for new and known addresses; sending happens after the response (`waitUntil`); no public profiles or counts per file | Someone who can read the inbox |
| T2 | Guessing a code | Section 8 | About 1 in 9,000 a year for a targeted address |
| T3 | Using the form to bomb an inbox, or exhaust the 100 codes a day | Per-address and per-IP limits, the breaker, the kill switch; Resend Pro if it happens | Distributed abuse can pause sign-in. The archive is unaffected |
| T4 | Bots filling the list | No contact and no consent until a code is verified | Bots with real inboxes |
| T5 | Subscribing someone else | Needs their code | None known |
| T6 | Cross-site requests | Exact Origin check, JSON only, SameSite, no CORS | A hostile subdomain is same-site; host nothing untrusted on one |
| T7 | Script injection on our origin. **Today:** the CSP allows inline scripts and any jsDelivr package, and the app builds HTML with `innerHTML` | No member text in step 1; HttpOnly; `/api/me` gives only a masked address; deletion needs a fresh code; `/account` has a strict CSP | Injected script could read a masked address, change a subscription or read what is typed. The CSP must be tightened before step 5 |
| T8 | **The R2 proxy. Checked:** `/pagefind-mod/*` serves the bucket from our origin, the app imports JavaScript from it, and the proxied response has no CSP. Whoever can write to the bucket can run script as the site | **Before launch:** ship Pagefind's loader and code with the site, proxy only the index data; test that HTML and JS can't be served through the proxy; narrow the rclone token | Altered search data |
| T9 | Third-party scripts in the app (Analytics, YouTube, X) share the page with the form | No account data in the DOM beyond the field; Analytics' automatic collection of user-provided data confirmed off; `/account` loads none | A compromised vendor could read what is typed into the block |
| T10 | Secrets read during a build. **Checked:** our plan has no variable scopes, so builds see Functions' secrets | Values set for the Production context only and marked secret; untrusted deploys stay on "require approval" (it is); lockfile and `npm ci`; dependency updates reviewed | Code merged to main runs with the secrets, the Latest bot's PRs included: read the diff outside `content/` and `sources/` before merging |
| T11 | Real data in previews | A separate empty project and no Resend key; the API refuses to send unless `context.deploy.context` is production | None known |
| T12 | Forged or replayed webhooks | Signature over the raw body, timestamp tolerance, `svix-id` once | None known |
| T13 | A stolen Resend key. Contacts need a `full_access` key, which can also send and export the list | Two keys: send-only (domain-restricted) for codes, full access for contacts; never logged; rotation written down | The full key is powerful |
| T14 | A mistaken or repeated broadcast | Draft only; the count shown; one draft per release; a test first | Human error |
| T15 | Spoofed mail from the domain. **Checked:** no DKIM record at `resend._domainkey` and no DMARC record today | SPF, DKIM, DMARC at `p=none`, then `quarantine` after two clean weeks | Look-alike domains |
| T16 | Personal data in logs | Log route, status and a request id only; never bodies, addresses, codes or provider error bodies | The host's own request logs |
| T17 | Owner's accounts taken over (Netlify, Neon, Resend, GitHub, DNS, Proton) | Two-factor on all six | One-person dependency |
| T18 | A legal demand for the member list | Hold little; delete for real; don't promise anonymity | Email addresses can identify people |

## 11. Your setup checklist

Never paste a key or connection string into a chat or commit one. Enter them in Netlify's UI yourself.

**Before the build, by 25 November**
- [ ] Two-factor on Netlify, Neon, Resend, GitHub, DNS and Proton.
- [ ] Netlify → Billing: check this month's build minutes and what happens past 300 (section 12). Don't switch to a credit plan without doing the sums there.
- [ ] Neon: project `wherearethey-prod` and a separate `wherearethey-preview`, both AWS us-east-2.
- [ ] Resend: a team for this site; add `wherearethey.info`; tracking off.
- [ ] DNS (Netlify): the records Resend shows, and `_dmarc` TXT `v=DMARC1; p=none`.
- [ ] Resend: segment "Members"; topic "PURSUE releases", **default opt-out**, public.
- [ ] Decide the open questions (section 13).

**Before launch, by 1 December**
- [ ] Resend: the two keys; the webhook to `https://wherearethey.info/api/hooks/resend` for `email.bounced`, `email.complained`, `suppression.added`, `contact.updated`, `contact.deleted`, `contact.topics.updated`.
- [ ] Netlify variables, Production context only, marked secret: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `LIMIT_HMAC_KEY`, `RESEND_SEND_KEY`, `RESEND_CONTACTS_KEY`, `RESEND_WEBHOOK_SECRET`. Not secret: `ACCOUNTS_ENABLED`.
- [ ] On the Mac, in the Keychain: the migration connection string and the key for `npm run alert`.
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

**Build minutes are already tight.** Netlify's deploy records for 1–22 November add up to about 346 minutes of deploy time: 214 production, 64 previews, 68 branch deploys. That may not equal billed minutes or the billing cycle, so check Billing. This work will add deploys: test locally and push in batches.

## 13. Open questions for the owner

1. **Postal address in the alerts.** CAN-SPAM requires one in commercial email (a registered PO box or private mailbox qualifies). An alert alone may not be commercial; a request for support may make it so. Recommended: get a mailbox address and don't use a home address.
2. **Where the controller is established.** The privacy text must name who is responsible. Outside the EU and UK, GDPR Article 27 and its UK equivalent may require a representative, and the local law applies too. Not researched here; take advice.
3. **Minimum age.** 16 is proposed.

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
- The cookie has exactly the attributes in section 8 (**to prove**: that Better Auth takes `Path=/api`).
- Session rows have no IP or user agent (**to prove**: through its database hook).
- An unsubscribe survives a sign-in and a reconcile; a repeated webhook does nothing.
- Deletion removes every row and retries the contact.
- The block works at 390 px, survives a reload at the code step, adds no history entry and isn't the largest paint.
- The existing tests still pass.

**By hand, before launch**
- The Reddit and X in-app browsers on an iPhone, and Safari: leave for Mail, return, finish.
- SPF, DKIM and DMARC pass in a received message.
- A broadcast carries `List-Unsubscribe` and `List-Unsubscribe-Post`, and one click updates Postgres (**to prove**: Resend's documentation doesn't state that it adds them).
- A contact without the topic doesn't receive a topic broadcast (**to prove**).
- A preview can neither send nor reach production data.
- T8 is closed.
- The privacy page is updated in the same deploy as the form.

## 16. Build order

| By | Work |
|---|---|
| 25 Nov | Spec approved; owner's setup; T8 fixed |
| 28 Nov | Migrations, API, webhook, tests |
| 30 Nov | Block, `/account`, privacy text, alert script |
| 2 Dec | Gates passed |
| 3 Dec | Live |

If it slips, cut placements (home, then Latest) before cutting a gate. If Release 9 comes first, launch afterwards; don't rush it out on the day.

## 17. Privacy text to publish at launch

Not before: until then "no accounts… no newsletter" is true.

> **Accounts and email alerts.** You don't need an account to read the archive. If you create one, we store your email address, when you created it, the alerts you chose and when you chose them. We use them to sign you in and to send what you asked for, nothing else. We don't ask your name, don't store your IP address with your account, and don't send account information to Google Analytics. To limit abuse we keep a scrambled code of your IP and email address for up to two days. Signing in sets one cookie, needed to keep you signed in. Neon (database), Resend (email) and Netlify (hosting) process this data for us, mainly in the United States. Unsubscribe from any alert in one click. Delete your account at /account; copies in backups expire within 30 days, and our email provider keeps a record of addresses that bounced or reported spam so they aren't mailed again. For a copy of your data or any other request, write to wherearetheyinfo@proton.me.

The first paragraph's "no accounts, no ads and no newsletter" becomes "no ads", and the table gains Neon and Resend.

## References

- Better Auth: [email OTP](https://better-auth.com/docs/plugins/email-otp), [rate limits](https://better-auth.com/docs/concepts/rate-limit), [options](https://better-auth.com/docs/reference/options), [passkeys](https://better-auth.com/docs/plugins/passkey)
- Netlify: [variables](https://docs.netlify.com/build/environment-variables/overview/), [secrets](https://docs.netlify.com/build/environment-variables/secrets-controller/), [untrusted deploys](https://docs.netlify.com/deploy/deploy-overview/), [rate limiting](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/), [Database](https://docs.netlify.com/build/data-and-storage/netlify-database/)
- Neon: [plans](https://neon.com/docs/introduction/plans.md)
- Resend: [pricing](https://resend.com/pricing.md), [topics](https://resend.com/docs/dashboard/topics/introduction.md), [broadcasts API](https://resend.com/docs/api-reference/broadcasts/create-broadcast.md), [webhooks](https://resend.com/docs/webhooks/event-types.md), [DPA](https://resend.com/legal/dpa)
- Apple: [private email relay](https://developer.apple.com/help/account/capabilities/configure-private-email-relay-service/)
- FTC: [CAN-SPAM guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)
