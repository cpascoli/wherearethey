#!/usr/bin/env bash
# Sync heavy library files (PDFs, images, video) with Cloudflare R2 via rclone.
#
#   npm run r2:push     upload new/changed files to R2 (never deletes anything remotely)
#   npm run r2:pull     download everything from R2 into library/ (e.g. on a new machine)
#   npm run r2:check    compare local and remote without transferring
#
# One-time setup: an rclone remote named "r2" (override with R2_REMOTE) and a bucket
# named "wherearethey" (override with R2_BUCKET). See README → "Heavy files (R2)".
set -euo pipefail
cd "$(dirname "$0")/.."
REMOTE="${R2_REMOTE:-r2}"
BUCKET="${R2_BUCKET:-wherearethey}"
FILTERS=(--filter "- .incoming/**" --filter "+ *.pdf" --filter "+ *.png" --filter "+ *.jpg" --filter "+ *.jpeg" --filter "+ *.gif" --filter "+ *.mp4" --filter "- *")

if ! rclone listremotes | grep -qx "${REMOTE}:"; then
  echo "No rclone remote called '${REMOTE}'. Run the one-time setup in README.md (Heavy files → R2)." >&2
  exit 1
fi

case "${1:-}" in
  push)  rclone copy library "${REMOTE}:${BUCKET}/library" "${FILTERS[@]}" --progress --transfers 8 --s3-no-check-bucket ;;
  pull)  rclone copy "${REMOTE}:${BUCKET}/library" library "${FILTERS[@]}" --progress --transfers 8 ;;
  check) rclone check library "${REMOTE}:${BUCKET}/library" "${FILTERS[@]}" --size-only --one-way ;;
  *) echo "usage: scripts/r2.sh push|pull|check" >&2; exit 1 ;;
esac
