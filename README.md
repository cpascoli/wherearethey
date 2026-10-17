# Where Are They — UAP · NHI case archive

A navigable knowledge map of on-record testimony, government programs, hearings, incidents, official records and video evidence on UAP / non-human intelligence.

**Principle:** only facts and testimony from people with an official role who are on the record (government, Congress, military, pilots, sensor operators, intelligence, academia). Every claim carries a status (documented · on record · unverified) and, ideally, a source down to the second of video.

## Run it

```bash
npm install
npm run dev        # → http://localhost:4321  (rebuilds and reloads as you edit)
```

Needs Node 20+, plus `yt-dlp` (videos) and Google Chrome (PURSUE importer) for the data tools.

## Views

| View | What it’s for |
|---|---|
| **Graph** | The whole network. Hover to see a file’s neighbourhood, click to open its dossier. |
| **Timeline** | Everything dated, 1947 → today, grouped by decade. |
| **World** | Incidents, hearings and records on a map. |
| **Videos** | Player with synced transcript, chapters, curated moments, and search across every transcript. |
| **Index** | Every file, grouped by type. |
| **Claims** | A ledger of every claim, filterable by status — what is documented vs. what still needs a source. |

The filters (official sources only, types, years, themes) apply across all views. Each dossier shows **Mentioned together** (names that recur within the same minute of video), **Possible connections** (shared links not yet recorded) and **Trace a connection** (shortest path between any two files).

## Adding things

- **A note, person, incident…** — add a Markdown file in `content/<type>/`. See `CLAUDE.md` for the format, or ask Claude to file it.
- **A YouTube video** — `npm run fetch -- https://youtube.com/watch?v=…` (add `--download` to keep the video file). Then add `rel:` and timestamped `moments:` to the generated `content/video/…md`.
- **Find a quote’s timestamp** — `npm run find -- "non-human biologics"`.
- **New PURSUE releases** — `npm run import:pursue`; add `-- --download "AAWSAP|Blue Book"` to keep PDFs locally (with extracted text).
- **Documents you find** — drop them in `library/` and reference them from an entry’s `files:`.
- **Raw notes** — drop them in `inbox/` and ask Claude to file them.

## Heavy files (Cloudflare R2)

PDFs, images and videos (≈2 GB) are **not** in git. Their extracted text is, so everything stays searchable. The binaries live in a Cloudflare R2 bucket.

**One-time setup**
1. Cloudflare dashboard → **R2** → *Create bucket* → name it `wherearethey`.
2. R2 → *Manage R2 API Tokens* → *Create API token* with **Object Read & Write** on that bucket. Note the *Access Key ID*, *Secret Access Key* and your *Account ID*.
3. In your own terminal (so the keys never leave your machine):
   ```bash
   rclone config create r2 s3 provider=Cloudflare \
     access_key_id=YOUR_ACCESS_KEY_ID secret_access_key=YOUR_SECRET_ACCESS_KEY \
     endpoint=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com acl=private
   ```

**Day to day**
- `npm run r2:push`: upload new or changed files (never deletes anything in R2)
- `npm run r2:pull`: restore all files into `library/` (new machine, fresh clone)
- `npm run r2:check`: list what's missing from R2
