#!/usr/bin/env bash
# Sync heavy library files (PDFs, images, video, HTML copies of public-domain books) with Cloudflare R2 via rclone,
# plus the media files of the videos we stream ourselves: only the files named by a video entry's `stream:` and
# `thumb:` lines (content/video/*.md). Every other file in media/ stays local.
#
#   npm run r2:push     upload new/changed files to R2 (never deletes anything remotely)
#   npm run r2:pull     download everything from R2 into library/ (e.g. on a new machine)
#   npm run r2:check    compare local and remote without transferring
#   npm run r2:index    rebuild the MoD UFO files search index (scripts/mod-index.mjs) with PDF links to R2 and
#                       sync it to R2 under pagefind-mod/ (Netlify proxies /pagefind-mod/* there; see netlify.toml)
#
# One-time setup: an rclone remote named "r2" (override with R2_REMOTE) and a bucket
# named "wherearethey" (override with R2_BUCKET). See README → "Heavy files (R2)".
set -euo pipefail
cd "$(dirname "$0")/.."
REMOTE="${R2_REMOTE:-r2}"
BUCKET="${R2_BUCKET:-wherearethey}"
FILTERS=(--filter "- .incoming/**" --filter "+ *.pdf" --filter "+ *.png" --filter "+ *.jpg" --filter "+ *.jpeg" --filter "+ *.gif" --filter "+ *.mp4" --filter "+ *.html" --filter "- *")

if ! rclone listremotes | grep -qx "${REMOTE}:"; then
  echo "No rclone remote called '${REMOTE}'. Run the one-time setup in README.md (Heavy files → R2)." >&2
  exit 1
fi

# the self-hosted video files, one path per line (e.g. media/navair-gimbal/video.mp4)
HOSTED="$(mktemp)"; trap 'rm -f "$HOSTED"' EXIT
grep -h -E '^(stream|thumb): *media/' content/video/*.md | sed -E 's/^(stream|thumb): *//; s/[[:space:]]+#.*$//; s/[[:space:]]*$//' | sort -u > "$HOSTED"
missing=0
while IFS= read -r f; do [ -f "$f" ] || { echo "missing locally: $f (named by a video entry's stream:/thumb:)" >&2; missing=1; }; done < "$HOSTED"

case "${1:-}" in
  push)  rclone copy library "${REMOTE}:${BUCKET}/library" "${FILTERS[@]}" --progress --transfers 8 --s3-no-check-bucket
         [ "$missing" = 0 ] || { echo "not pushing media until the missing files above are restored" >&2; exit 1; }
         echo "self-hosted video files: $(wc -l < "$HOSTED" | tr -d ' ')"
         rclone copy . "${REMOTE}:${BUCKET}" --files-from "$HOSTED" --progress --transfers 4 --s3-no-check-bucket ;;
  pull)  rclone copy "${REMOTE}:${BUCKET}/library" library "${FILTERS[@]}" --progress --transfers 8
         rclone copy "${REMOTE}:${BUCKET}" . --files-from "$HOSTED" --progress --transfers 4 ;;
  index) export FILES_BASE="${FILES_BASE:-$(sed -nE 's/^[[:space:]]*FILES_BASE = "([^"]+)".*/\1/p' netlify.toml)}"
         node scripts/mod-index.mjs
         rclone sync site/pagefind-mod "${REMOTE}:${BUCKET}/pagefind-mod" --progress --transfers 32 --fast-list --s3-no-check-bucket ;;
  check) rclone check library "${REMOTE}:${BUCKET}/library" "${FILTERS[@]}" --size-only --one-way
         rclone check . "${REMOTE}:${BUCKET}" --files-from "$HOSTED" --size-only --one-way ;;
  *) echo "usage: scripts/r2.sh push|pull|check|index" >&2; exit 1 ;;
esac
