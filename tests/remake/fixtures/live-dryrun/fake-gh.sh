#!/usr/bin/env bash
# A stand-in for gh in tests/remake/live-dryrun.test.mjs. It records every call in $GH_LOG, keeps its little world in $FAKE, and turns
# "gh repo create" into a local bare repository under $MIRRORS. It never reaches a network.
echo "$*" >> "$GH_LOG"
args=("$@")
path=""; method=""; jq=""
for ((i = 0; i < $#; i++)); do
  case "${args[$i]}" in
    repos/*) path="${args[$i]}";;
    -X) method="${args[$((i + 1))]}";;
    --jq) jq="${args[$((i + 1))]}";;
  esac
done
val() { local k="$1" i; for ((i = 0; i < ${#args[@]}; i++)); do if [ "${args[$i]}" = "$k" ]; then echo "${args[$((i + 1))]}"; return; fi; done; }
mkdir -p "$FAKE"
case "$1" in
  auth) echo "  - Token scopes: 'repo', 'workflow'"; exit 0;;
  repo)
    case "$2" in
      create) n="$3"; mkdir -p "$MIRRORS/$(dirname "$n")"; git init -q --bare "$MIRRORS/$n.git"; : > "$FAKE/exists_$(echo "$n" | tr / _)"; exit 0;;
      *) exit 1;;
    esac;;
  variable)
    name=""; for a in "$@"; do case "$a" in DEPLOY_HOLD|LIVE_BASE_URL|PREVIEW_REPO|PREVIEW_BASE_URL) name="$a";; esac; done
    case "$2" in
      set) printf '%s' "$(val --body)" > "$FAKE/var_$name"; exit 0;;
      get) if [ -f "$FAKE/var_$name" ]; then cat "$FAKE/var_$name"; exit 0; fi; exit 1;;
      delete) rm -f "$FAKE/var_$name"; exit 0;;
    esac;;
  release)
    case "$2" in
      download) cp "$FIXTURE_ASSETS"/* "$(val --dir)"/; exit 0;;
      create) : > "$FAKE/release_created"; exit 0;;
    esac;;
  workflow) exit 0;;
  api)
    if [ "$2" = "user" ]; then echo "faridbnv"; exit 0; fi
    case "$path" in
      repos/faridbnv/h2c-materials/releases/tags/h2c-legacy-final) case "$jq" in .name) echo "Filament Atlas, the old site as it was served";; .body) echo "The whole old site, kept for rollback.";; esac; exit 0;;
      repos/tester/h2c-dryrun/releases/tags/h2c-legacy-final) [ -f "$FAKE/release_created" ] && exit 0; exit 1;;
      repos/tester/h2c-dryrun/pages)
        if [ -n "$method" ]; then : > "$FAKE/pages"; exit 0; fi
        if [ -f "$FAKE/pages" ]; then echo "https://example.test/tester/h2c-dryrun/"; exit 0; fi; exit 1;;
      repos/tester/h2c-dryrun) [ -f "$FAKE/exists_tester_h2c-dryrun" ] && { echo "tester/h2c-dryrun"; exit 0; }; exit 1;;
      repos/tester/h2c-dryrun/actions/workflows/*) echo 0; exit 0;;
    esac
    exit 1;;
esac
exit 1
