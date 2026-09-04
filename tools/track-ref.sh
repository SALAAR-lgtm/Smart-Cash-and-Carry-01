#!/usr/bin/env bash
# Refresh .git/packed-refs so the remote-tracking ref matches the real remote.
# Also repairs that file when it is corrupt.
#
# WHY THIS EXISTS
# ---------------
# The git build on this PC cannot create a subdirectory inside .git/refs/.
# Any *nested* ref (refs/remotes/<remote>/<branch>) therefore fails to write:
# git reports success (exit 0) but no file appears, and it deletes the
# directory it should have written into.
#
# Consequence: after a push, `git status` keeps saying "ahead of origin/master
# by N commits" because the tracking ref is frozen at whatever it was when we
# last wrote it by hand.
#
# Workaround: remote-tracking refs live in .git/packed-refs instead. Git reads
# that file happily (it is the normal format - a fresh clone uses it), and it
# needs no subdirectories. This script rewrites that line from the real remote.
#
# IT IS ALSO THE REPAIR TOOL
# --------------------------
# On 4 Sep 2026 .git/packed-refs was found zero-filled (114 NUL bytes). When
# that happens *every* git command dies with:
#     fatal: unterminated line in .git/packed-refs
# including this script - which is why the corruption check below runs BEFORE
# we call git for anything.
#
# USAGE
#   bash tools/track-ref.sh                 # refresh origin/master
#   bash tools/track-ref.sh origin main     # refresh another remote/branch
#   git sync                                # = git fetch + this script
#
# Set up the alias once with:
#   git config alias.sync '!git fetch && bash tools/track-ref.sh'

set -uo pipefail

# Always run from the repo root, whatever directory the caller is in.
cd "$(dirname "$0")/.." || exit 1

remote=${1:-origin}
branch=${2:-master}
ref="refs/remotes/${remote}/${branch}"
packed=".git/packed-refs"

# --- 1. Repair a corrupt packed-refs before touching git -------------------
# A zero-filled or truncated file kills every git command, so we cannot use
# git to detect it. Compare the file against itself with NULs stripped:
# identical means no NULs were present, so the file is clean text.
if [ -f "$packed" ]; then
  if ! LC_ALL=C tr -d '\000' < "$packed" | cmp -s - "$packed"; then
    mv "$packed" "$packed.corrupt"
    echo "track-ref: corrupt packed-refs moved aside to .git/packed-refs.corrupt"
  fi
fi

# --- 2. Ask the remote what it really has ----------------------------------
# ls-remote talks to the network, not the local ref store, so it keeps working
# when the local refs are a mess.
sha=$(git ls-remote "$remote" "refs/heads/${branch}" 2>/dev/null | awk '{print $1}')
if [ -z "$sha" ]; then
  echo "track-ref: could not resolve ${remote}/${branch} on the remote" >&2
  echo "           (no network? wrong remote? check: git remote -v)" >&2
  exit 1
fi

# --- 3. Rewrite the file ---------------------------------------------------
# Keep every other packed ref, drop only the one we are replacing.
others=""
if [ -f "$packed" ]; then
  others=$(grep -v '^#' "$packed" | grep -v "^[0-9a-f]\{40\} ${ref}\$" || true)
fi

# Header line first, then refs sorted by name - the layout git expects.
# No temp file: this sandbox blocks temp-file cleanup, which would fail the run.
{
  echo '# pack-refs with: peeled fully-peeled sorted '
  printf '%s\n%s\n' "$others" "${sha} ${ref}" | grep -v '^[[:space:]]*$' | sort -k2
} > "$packed"

# --- 4. Verify the write actually landed -----------------------------------
# The file was once found zero-filled after a write that reported success, so
# trust nothing: read it back and confirm the line is really there.
if ! grep -q "^${sha} ${ref}\$" "$packed"; then
  echo "track-ref: write did not stick - .git/packed-refs is wrong" >&2
  echo "           re-run this script; if it repeats, check the disk on E:" >&2
  exit 1
fi

echo "track-ref: ${ref} -> ${sha}"
