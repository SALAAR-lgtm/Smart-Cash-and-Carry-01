#!/usr/bin/env bash
# Refresh .git/packed-refs so the remote-tracking ref matches the real remote.
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
# first wrote it by hand.
#
# Workaround: remote-tracking refs live in .git/packed-refs instead. Git reads
# that file happily (it is the normal format - a fresh clone uses it), and it
# needs no subdirectories. This script rewrites that line from the real remote.
#
# USAGE
#   bash tools/track-ref.sh                 # refresh origin/master
#   bash tools/track-ref.sh origin main     # refresh another remote/branch
#   git sync                                # = git fetch + this script
#
# Set up the alias once with:
#   git config alias.sync '!git fetch && bash tools/track-ref.sh'

set -euo pipefail

remote=${1:-origin}
branch=${2:-master}
ref="refs/remotes/${remote}/${branch}"

sha=$(git ls-remote "$remote" "refs/heads/${branch}" | awk '{print $1}')
if [ -z "$sha" ]; then
  echo "track-ref: could not resolve ${remote}/${branch} on the remote" >&2
  exit 1
fi

packed="$(git rev-parse --git-dir)/packed-refs"

# Every other packed ref, minus the one we are about to replace.
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

echo "track-ref: ${ref} -> ${sha}"
