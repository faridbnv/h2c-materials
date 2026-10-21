#!/usr/bin/env bash
# A second copy of the private source store, and proof that it matches (pack 02 section 10; owner ruling OQ-13 A).
#
#   remake/tools/custody-copy.sh DEST            copy $H2C_SOURCE_BACKUP into DEST, then compare SHA-256 manifests
#   remake/tools/custody-copy.sh --verify-only DEST     skip the copy; only compare what is there
#
# The OWNER runs this, in their own terminal, with DEST a folder on a different disk, for example an encrypted external
# drive: create the folder there first (DEST must already exist, so a drive that is not plugged in is an error and never a new
# folder on the boot disk). An agent does not run it.
#
# What it does, in order:
#   1. checks it can: $H2C_SOURCE_BACKUP is a readable, non-empty folder; DEST exists, is not inside the store and does not
#      contain it; DEST is on a different volume (set H2C_CUSTODY_ALLOW_SAME_VOLUME=1 to copy within one volume anyway: that
#      guards against deleting a file, not against losing the disk);
#   2. copies with rsync -a --ignore-existing: it adds what DEST lacks and touches nothing that is already there;
#   3. writes a SHA-256 manifest of every file (and every link) of both folders, and compares them.
# It NEVER deletes or overwrites anything, in the store or in DEST: there is no rm, mv or --delete in this file, and a file
# that differs in DEST is reported, not replaced (you decide which copy is the good one). Manifests are kept in
# ${H2C_CUSTODY_MANIFESTS:-$HOME/.h2c-custody}/<timestamp>/ (outside both folders), with result.txt.
#
# It cannot tell whether DEST is encrypted. On macOS it prints what diskutil says about the volume; confirm it yourself.
#
# Result, the last line printed, and the exit code (tri-state, as everywhere in this repository):
#   custody-copy: ok            exit 0   every file of the store is in DEST with the same SHA-256
#   custody-copy: FAIL: ...     exit 1   a file is missing or differs in DEST (the first ones are listed), or rsync failed
#   custody-copy: not-run: ...  exit 2   a check in step 1 failed; nothing was copied
# Files only the copy holds are reported and kept; they do not fail the result.
set -u

die_not_run() { echo "custody-copy: not-run: $1"; exit 2; }

VERIFY_ONLY=0
if [ "${1:-}" = "--verify-only" ]; then VERIFY_ONLY=1; shift; fi
if [ "$#" -ne 1 ] || [ "${1#-}" != "$1" ]; then
  echo "usage: custody-copy.sh [--verify-only] DEST    (DEST: an existing folder on another disk)"
  die_not_run "usage"
fi
DEST_ARG="$1"

[ -n "${H2C_SOURCE_BACKUP:-}" ] || die_not_run 'H2C_SOURCE_BACKUP is not set'
[ -d "$H2C_SOURCE_BACKUP" ] || die_not_run "H2C_SOURCE_BACKUP is not a folder: $H2C_SOURCE_BACKUP"
[ -r "$H2C_SOURCE_BACKUP" ] || die_not_run "H2C_SOURCE_BACKUP is not readable: $H2C_SOURCE_BACKUP"
[ -d "$DEST_ARG" ] || die_not_run "DEST is not an existing folder (is the drive plugged in and unlocked? create the folder first): $DEST_ARG"
[ -w "$DEST_ARG" ] || die_not_run "DEST is not writable: $DEST_ARG"

SRC="$(cd "$H2C_SOURCE_BACKUP" && pwd -P)" || die_not_run "cannot enter H2C_SOURCE_BACKUP"
DST="$(cd "$DEST_ARG" && pwd -P)" || die_not_run "cannot enter DEST"
[ -n "$(ls -A "$SRC" 2>/dev/null)" ] || die_not_run "H2C_SOURCE_BACKUP is empty: $SRC"
case "$DST/" in "$SRC"/*) die_not_run "DEST is inside the store: $DST" ;; esac
case "$SRC/" in "$DST"/*) die_not_run "DEST contains the store: $DST" ;; esac

device() { if [ "$(uname)" = "Darwin" ]; then stat -f %d "$1"; else stat -c %d "$1"; fi; }
if [ "$(device "$SRC")" = "$(device "$DST")" ] && [ "${H2C_CUSTODY_ALLOW_SAME_VOLUME:-}" != "1" ]; then
  die_not_run "DEST is on the same volume as the store, so it is not a second disk (H2C_CUSTODY_ALLOW_SAME_VOLUME=1 copies anyway)"
fi

if ! command -v sha256sum >/dev/null 2>&1 && ! command -v shasum >/dev/null 2>&1; then die_not_run "neither sha256sum nor shasum is installed"; fi
[ "$VERIFY_ONLY" = "1" ] || command -v rsync >/dev/null 2>&1 || die_not_run "rsync is not installed"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${H2C_CUSTODY_MANIFESTS:-$HOME/.h2c-custody}/$STAMP"
mkdir -p "$OUT" || die_not_run "cannot create the manifest folder $OUT"

echo "custody-copy: store  $SRC"
echo "custody-copy: copy   $DST"
echo "custody-copy: manifests in $OUT"
if [ "$(uname)" = "Darwin" ] && command -v diskutil >/dev/null 2>&1; then
  echo "custody-copy: what diskutil says about the volume holding DEST (confirm it is encrypted yourself):"
  diskutil info "$DST" 2>/dev/null | grep -E 'Volume Name|File System Personality|Encrypted|FileVault|Protocol|Removable Media' | sed 's/^ */    /'
fi

if [ "$VERIFY_ONLY" = "0" ]; then
  echo "custody-copy: copying (adds what is missing, changes nothing that exists)..."
  # -a keeps times, modes and links; --ignore-existing skips any file DEST already has, whatever its content. No --delete.
  rsync -a --ignore-existing "$SRC"/ "$DST"/
  RSYNC_STATUS=$?
  if [ "$RSYNC_STATUS" -ne 0 ]; then
    echo "custody-copy: rsync exited $RSYNC_STATUS" > "$OUT/result.txt"
    echo "custody-copy: FAIL: rsync exited $RSYNC_STATUS (see its messages above); the copy is incomplete or unchecked"
    exit 1
  fi
fi

# One line per file: "<sha256>  ./relative/path"; one per link: "link  ./relative/path -> target". Sorted by path. Any file that
# cannot be read or hashed fails the whole manifest (pipefail): a file left out of the store's manifest would pass unchecked.
manifest() (
  set -o pipefail
  cd "$1" || exit 1
  find . -type f -print0 | LC_ALL=C sort -z \
    | xargs -0 -n 64 sh -c 'if command -v sha256sum >/dev/null 2>&1; then sha256sum "$@"; else shasum -a 256 "$@"; fi' sh || exit 1
  find . -type l | LC_ALL=C sort | while IFS= read -r l; do printf 'link  %s -> %s\n' "$l" "$(readlink "$l")"; done
)

echo "custody-copy: hashing the store..."
manifest "$SRC" > "$OUT/store.sha256" || { echo "custody-copy: FAIL: could not hash the store"; exit 1; }
echo "custody-copy: hashing the copy..."
manifest "$DST" > "$OUT/copy.sha256" || { echo "custody-copy: FAIL: could not hash the copy"; exit 1; }

# Compare by path: what the copy lacks, what differs, what only the copy has. Lines are "<hash>  <path>" or "link  <path> -> <target>".
awk -v out="$OUT/result.txt" -v first="$OUT/store.sha256" '
  function off(line) { return substr(line, 1, 1) == "\\" ? 1 : 0 }
  function key(line) { return line ~ /^link  / ? "L" substr(line, 7) : "F" substr(line, 67 + off(line)) }
  function val(line) { return line ~ /^link  / ? line : substr(line, 1 + off(line), 64) }
  FILENAME == first { s[key($0)] = val($0); ns++; next }
  { c[key($0)] = val($0); nc++ }
  END {
    if (ns == 0) { print "the manifest of the store holds no file or link: nothing was compared" > out; exit 1 }
    for (k in s) {
      if (!(k in c)) { missing++; if (missing <= 20) print "  missing in the copy: " substr(k, 2) > out }
      else if (c[k] != s[k]) { differs++; if (differs <= 20) print "  differs in the copy: " substr(k, 2) > out }
    }
    for (k in c) if (!(k in s)) extra++
    printf "files and links in the store: %d\nfiles and links in the copy:  %d\nmissing in the copy: %d\ndiffering in the copy: %d\nonly in the copy (kept): %d\n", ns + 0, nc + 0, missing + 0, differs + 0, extra + 0 > out
    exit (missing + differs > 0)
  }' "$OUT/store.sha256" "$OUT/copy.sha256"
COMPARE=$?
cat "$OUT/result.txt"
if [ "$COMPARE" -eq 0 ]; then
  echo "custody-copy: ok"
  exit 0
fi
echo "custody-copy: FAIL: the copy does not match the store (listed above, at most 20 each); nothing was deleted or overwritten. Manifests: $OUT"
exit 1
