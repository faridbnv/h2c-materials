#!/usr/bin/env bash
# save-legacy.sh -- the OWNER runs this, in their own terminal, once before the cutover (WP-35; pack 07 section 13.1).
#
#   remake/tools/save-legacy.sh                   build main's last old site, compare it with the live site, pack it, print what to do next
#   remake/tools/save-legacy.sh --store live      store the live bytes even when a difference is unexplained (you have read legacy-diff.md)
#   remake/tools/save-legacy.sh --out DIR         where the files go (default ./legacy-final)
#
# Fixture mode, for tests and for a dry run with no network and no build:
#   --main-commit SHA --site-from DIR --live-from DIR
#       DIR for --site-from is the rebuilt site; DIR for --live-from stands in for the live site.
#
# What it does, in plain words:
#   1. builds the old site from main's tip, exactly as pages.yml assembles it (npm run build in a separate worktree of main);
#   2. fetches every file of that site from https://pdynamics.ca/h2c-materials/ and compares the bytes; each difference is listed in
#      legacy-diff.md with what explains it, or the word UNEXPLAINED. If the rebuilt site and the live bytes differ, the live bytes are
#      what is stored (pack 07 section 13.1);
#   3. packs the site as legacy-site-<oldId>.zip, writes legacy-manifest.json (every file, bytes and sha256) and legacy-final.json;
#   4. checks the zip the way a restore does (digest, manifest, every file, the legacy smoke profile on a local copy);
#   5. prints the exact gh command that creates the GitHub Release h2c-legacy-final. IT NEVER CREATES THE RELEASE ITSELF: agents may
#      not create releases, and neither does this script. You run the printed command.
# Exit codes: 0 done; 4 a difference is unexplained and you did not pass --store live; 1 anything else went wrong.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/../.." && pwd)"
LIVE_URL="https://pdynamics.ca/h2c-materials/"
LIVE_REPO="faridbnv/h2c-materials"
OUT="./legacy-final"
STORE=""
MAIN_COMMIT=""
SITE_FROM=""
LIVE_FROM=""

while [ $# -gt 0 ]; do
  case "$1" in
    --out) OUT="${2:?--out needs a folder}"; shift 2 ;;
    --store) STORE="${2:?--store needs live}"; [ "$STORE" = "live" ] || { echo "--store takes only: live" >&2; exit 2; }; shift 2 ;;
    --main-commit) MAIN_COMMIT="${2:?--main-commit needs a SHA}"; shift 2 ;;
    --site-from) SITE_FROM="${2:?--site-from needs a folder}"; shift 2 ;;
    --live-from) LIVE_FROM="${2:?--live-from needs a folder}"; shift 2 ;;
    -h|--help) sed -n '2,28p' "$0"; exit 0 ;;
    *) echo "unknown option: $1 (see --help)" >&2; exit 2 ;;
  esac
done

say() { printf '== %s\n' "$*"; }
fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
for tool in node zip unzip git; do command -v "$tool" >/dev/null || fail "$tool is not installed"; done
sha256_of() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }

mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"
WORK="$OUT/work"
rm -rf "$WORK"
mkdir -p "$WORK"
LEGACY_TOOL="$REPO_ROOT/remake/tools/legacy-site.mjs"
BASELINE="$(ls "$REPO_ROOT"/remake/baseline/*.json 2>/dev/null | grep -v main-allowed | tail -n 1 || true)"

REBUILT="$WORK/rebuilt"
if [ -n "$SITE_FROM" ]; then
  [ -n "$MAIN_COMMIT" ] || fail "--site-from needs --main-commit"
  say "Fixture mode: the rebuilt site is $SITE_FROM"
  cp -R "$SITE_FROM" "$REBUILT"
else
  [ -n "$MAIN_COMMIT" ] || MAIN_COMMIT="$(git -C "$REPO_ROOT" ls-remote origin refs/heads/main | cut -f1)"
  [[ "$MAIN_COMMIT" =~ ^[0-9a-f]{40}$ ]] || fail "could not read main's tip from origin"
  say "Building the old site from main $MAIN_COMMIT"
  git -C "$REPO_ROOT" fetch --quiet origin main
  git -C "$REPO_ROOT" cat-file -e "$MAIN_COMMIT^{commit}" || fail "main's commit $MAIN_COMMIT is not in this checkout after the fetch"
  git -C "$REPO_ROOT" worktree add --detach "$WORK/main" "$MAIN_COMMIT" >/dev/null
  trap 'git -C "$REPO_ROOT" worktree remove --force "$WORK/main" >/dev/null 2>&1 || true' EXIT
  ( cd "$WORK/main"
    npm ci --prefix build
    npm ci
    rm -rf .cache/build
    npm run build )
  # pages.yml's "Assemble the site" step, without .nojekyll (Pages reads it and does not serve it).
  mkdir -p "$REBUILT"
  stamped=( "$WORK"/main/dist/H2C_Material_Selector_*.html )
  [ "${#stamped[@]}" -eq 1 ] || fail "expected one release-stamped selector page in dist/, found ${#stamped[@]}"
  cp "${stamped[0]}" "$REBUILT/index.html"
  cp "${stamped[0]}" "$REBUILT/"
  cp "$WORK/main/build/reports/validation-report.md" "$REBUILT/validation-report.md"
  cp "$WORK/main/dist/manifest.json" "$REBUILT/manifest.json"
  cp -R "$WORK/main/dist/materials" "$REBUILT/materials"
fi

say "Listing the rebuilt site"
node "$LEGACY_TOOL" manifest --site "$REBUILT" --main-commit "$MAIN_COMMIT" --out "$WORK/rebuilt-manifest.json"

say "Comparing it with the live site"
LIVE_DIR="$WORK/live"
crawl_args=( crawl --manifest "$WORK/rebuilt-manifest.json" --out "$LIVE_DIR" --report "$OUT/legacy-diff.md" )
[ -z "$BASELINE" ] || crawl_args+=( --baseline "$BASELINE" )
if [ -n "$LIVE_FROM" ]; then crawl_args+=( --from-dir "$LIVE_FROM" ); else crawl_args+=( --base "$LIVE_URL" ); fi
rc=0
node "$LEGACY_TOOL" "${crawl_args[@]}" || rc=$?
case "$rc" in
  0) SOURCE="rebuilt"; STORE_DIR="$REBUILT"; say "No difference: the rebuilt site is what the live site serves" ;;
  3) SOURCE="live"; STORE_DIR="$LIVE_DIR"; say "Differences, every one explained (see legacy-diff.md): the live bytes are stored" ;;
  4) if [ "$STORE" = "live" ]; then SOURCE="live"; STORE_DIR="$LIVE_DIR"; say "A difference is UNEXPLAINED; you passed --store live, so the live bytes are stored"
     else
       echo "A difference between the rebuilt site and the live site is UNEXPLAINED. Read $OUT/legacy-diff.md." >&2
       echo "If you accept that the live bytes are the old site, run this again with: --store live" >&2
       exit 4
     fi ;;
  *) fail "the comparison with the live site failed (exit $rc)" ;;
esac

say "Packing the old site"
node "$LEGACY_TOOL" manifest --site "$STORE_DIR" --main-commit "$MAIN_COMMIT" --out "$OUT/legacy-manifest.json"
OLD_ID="$(node -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).oldReleaseId)" "$OUT/legacy-manifest.json")"
ZIP="$OUT/legacy-site-$OLD_ID.zip"
rm -f "$ZIP"
node "$LEGACY_TOOL" pack --site "$STORE_DIR" --zip "$ZIP"
ZIP_DIGEST="sha256:$(sha256_of "$ZIP")"
MANIFEST_DIGEST="sha256:$(sha256_of "$OUT/legacy-manifest.json")"
FILES="$(node -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).fileCount)" "$OUT/legacy-manifest.json")"

say "Checking the zip the way a restore does"
node -e "
const [asset, digest, file] = process.argv.slice(1);
require('fs').writeFileSync(file, JSON.stringify({ schema: 1, request: { id: 'save-legacy-check', hold: 'legacy-final', tag: 'h2c-legacy-final', asset, digest, reason: 'the check save-legacy.sh runs on the zip it made' } }));
" "legacy-site-$OLD_ID.zip" "$ZIP_DIGEST" "$WORK/check-control.json"
node "$REPO_ROOT/remake/tools/restore.mjs" check --zip "$ZIP" --manifest "$OUT/legacy-manifest.json" --control "$WORK/check-control.json"

node -e "
const [out, asset, digest, manifestDigest, mainCommit, oldReleaseId, files, source] = process.argv.slice(1);
require('fs').writeFileSync(out, JSON.stringify({ schema: 1, asset, digest, manifestDigest, mainCommit, oldReleaseId, fileCount: Number(files), storedFrom: source, diffReport: 'legacy-diff.md', release: 'h2c-legacy-final', savedAt: new Date().toISOString() }, null, 2) + '\n');
" "$OUT/legacy-final.json" "legacy-site-$OLD_ID.zip" "$ZIP_DIGEST" "$MANIFEST_DIGEST" "$MAIN_COMMIT" "$OLD_ID" "$FILES" "$SOURCE"
rm -rf "$WORK"

cat <<DONE

The old site is saved in $OUT:
  legacy-site-$OLD_ID.zip     $FILES files, stored from the $SOURCE bytes
  legacy-manifest.json        every file with its size and sha256
  legacy-diff.md              the comparison with the live site, with every difference explained
  legacy-final.json           the record the candidate receipt reads
  zip digest                  $ZIP_DIGEST

NEXT, in your own terminal (this script has NOT created anything on GitHub):

  1. Create the GitHub Release (you are the only one who may):

     gh release create h2c-legacy-final "$ZIP" "$OUT/legacy-manifest.json" "$OUT/legacy-diff.md" --repo $LIVE_REPO --target $MAIN_COMMIT --title "Filament Atlas, the old site as it was served" --notes "The whole old site (legacy-site-$OLD_ID.zip, built from main $MAIN_COMMIT), its manifest and the comparison with the live site. Kept for rollback; never edit or delete this release."

  2. Keep a second copy outside GitHub, in your private store:

     cp "$ZIP" "$OUT/legacy-manifest.json" "$OUT/legacy-final.json" <your private store folder>

  3. Give the record to the branch (an agent can commit it for you):

     cp "$OUT/legacy-final.json" remake/legacy/legacy-final.json

  4. For the rehearsal, a restore request names this zip. The file remake/control/restore.json would hold:

     {"schema":1,"request":{"id":"rehearsal-1","hold":"legacy-final","tag":"h2c-legacy-final","asset":"legacy-site-$OLD_ID.zip","digest":"$ZIP_DIGEST","reason":"rollback rehearsal on the preview"}}

DONE
