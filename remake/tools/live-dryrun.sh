#!/usr/bin/env bash
# live-dryrun.sh -- the OWNER runs this, in their own terminal, to practise the LIVE deploy path of .github/workflows/next-main.yml in a
# throwaway public GitHub repository, before the real cutover (docs/next/live-dryrun.md). It creates no secret and never writes to
# faridbnv/h2c-materials or faridbnv/h2c-material-temp-page: every command that writes goes through a helper that refuses them.
#
#   remake/tools/live-dryrun.sh <dryrun-repo> <candidate-sha> [--resume] [--no-wait]    phase 1: set up the mirror, then make the cutover merge
#   remake/tools/live-dryrun.sh <dryrun-repo> --restore [--no-wait]                       phase 2: hold, restore the saved old site, clear the hold
#   remake/tools/live-dryrun.sh <dryrun-repo> --revert  [--no-wait]                       phase 3: revert the cutover merge on the mirror's main
#   remake/tools/live-dryrun.sh <dryrun-repo> --cleanup                                   phase 4: PRINTS the command that deletes the mirror
#
# <dryrun-repo> is OWNER/NAME or just NAME (your account), and the name must contain "dryrun" or "dry-run" (for example h2c-materials-dryrun).
# --resume   phase 1 again on a mirror this script already made (it skips what is done)
# --no-wait  do not wait for GitHub's runs between steps (you watch them yourself)
#
# Phase 1, in order: create the mirror; push the frozen main (the old tool) so the OLD workflows publish the OLD site there; enable Pages (build
# type: workflow); set the repository variables; copy the release h2c-legacy-final and check its sha256; you record `npm run wp:attest --
# cutover-approved <sha>` in the clone this script made (it pauses and asks; wp:attest only runs in your own terminal); push the attested
# candidate as the mirror's remake/v3; merge it into main with a merge commit (as the cutover PR will) and push main. That push starts Next main
# on the LIVE path. Then `gh run watch` and, when it is green, the check: node remake/tools/live-dryrun-check.mjs <dryrun-repo>.
set -euo pipefail

SOURCE_REPO="faridbnv/h2c-materials"          # read only: cloned, and its release h2c-legacy-final is downloaded
# The repositories that must never be written to. The script refuses them as the dry-run repository and in every writing command.
PROTECTED_REPOS="faridbnv/h2c-materials faridbnv/h2c-material-temp-page"
SOURCE_URL="${H2C_DRYRUN_SOURCE_URL:-https://github.com/${SOURCE_REPO}.git}"
MIRROR_BASE="${H2C_DRYRUN_MIRROR_BASE:-https://github.com}"
WORK_ROOT="${H2C_DRYRUN_WORK:-$HOME/.h2c-live-dryrun}"
HOLD_VALUE="legacy-final"
RELEASE_TAG="h2c-legacy-final"
WAIT_MINUTES="${H2C_DRYRUN_WAIT_MINUTES:-60}"

REPO=""; CANDIDATE=""; PHASE="setup"; RESUME=0; NOWAIT=0

say() { printf '\n== %s\n' "$*"; }
note() { printf '   %s\n' "$*"; }
watch() { printf '   WATCH: %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
lower() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }

usage() { sed -n '2,22p' "$0"; }

# ---- the guard: a repository this script may write to --------------------------------------------------------------------------------
is_protected() {
  local r p; r="$(lower "$1")"
  for p in $PROTECTED_REPOS; do [ "$r" = "$(lower "$p")" ] && return 0; done
  return 1
}
# Refuses the real repositories, anything that is not OWNER/NAME, and any name that does not say it is a dry run.
assert_dryrun_repo() {
  local r="$1"
  [[ "$r" =~ ^[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9._-]+$ ]] || die "'$r' is not OWNER/NAME"
  if is_protected "$r"; then die "$r is a real repository. This script writes only to a throwaway dry-run repository."; fi
  [[ "${r#*/}" =~ [Dd][Rr][Yy]-?[Rr][Uu][Nn] ]] || die "the name of the dry-run repository must contain 'dryrun' or 'dry-run' (got $r)"
}
# Whether text $1 names repository $2 as a whole (faridbnv/h2c-materials-dryrun is not faridbnv/h2c-materials).
mentions() {
  local pat; pat="$(printf '%s' "$2" | sed 's/[.]/\\./g')"
  printf '%s' "$1" | grep -Eiq "(^|[^A-Za-z0-9._-])${pat}(\\.git)?(\$|[^A-Za-z0-9._-])"
}
# Every gh command that writes goes through here: its arguments must name the dry-run repository and must not mention a protected one.
gh_write() {
  assert_dryrun_repo "$REPO"
  local a p named=0
  for a in "$@"; do
    for p in $PROTECTED_REPOS; do
      if mentions "$a" "$p"; then die "refusing: 'gh $*' mentions $p"; fi
    done
    case "$a" in *"$REPO"*) named=1;; esac
  done
  [ "$named" = 1 ] || die "refusing: 'gh $*' does not name the dry-run repository $REPO"
  printf '   + gh %s\n' "$*"
  gh "$@"
}
# git pushes go to the 'mirror' remote only, and only when that remote is the dry-run repository.
git_push() {
  assert_dryrun_repo "$REPO"
  local url; url="$(git -C "$CLONE" remote get-url mirror 2>/dev/null)" || die "the clone has no 'mirror' remote"
  [ "$url" = "$MIRROR_BASE/$REPO.git" ] || die "the 'mirror' remote is $url, expected $MIRROR_BASE/$REPO.git"
  printf '   + git push mirror %s\n' "$*"
  git -C "$CLONE" push mirror "$@"
}
gh_read() { gh "$@"; }

# ---- small helpers ------------------------------------------------------------------------------------------------------------------------
sha256_of() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }
json_get() { node -e "const v=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));const k=process.argv[2].split('.');let x=v;for(const p of k)x=x?.[p];if(x===undefined||x===null)process.exit(3);console.log(x)" "$1" "$2" || die "$1 has no '$2'"; }
state_get() { local v; [ -f "$STATE" ] || return 1; v="$(grep "^$1=" "$STATE" | tail -n 1 | cut -d= -f2-)" || true; [ -n "$v" ] || return 1; printf '%s' "$v"; }
state_set() { touch "$STATE"; grep -v "^$1=" "$STATE" > "$STATE.tmp" || true; printf '%s=%s\n' "$1" "$2" >> "$STATE.tmp"; mv "$STATE.tmp" "$STATE"; }
state_need() { state_get "$1" || die "no '$1' in $STATE: phase 1 did not finish; run it again with --resume"; }
repo_exists() { gh api "repos/$REPO" --jq .full_name >/dev/null 2>&1; }
pages_url() { local u; u="$(gh api "repos/$REPO/pages" --jq .html_url 2>/dev/null)" || return 1; [ -n "$u" ] || return 1; case "$u" in */) printf '%s' "$u";; *) printf '%s/' "$u";; esac; }
hold_now() { gh variable get DEPLOY_HOLD --repo "$REPO" 2>/dev/null || true; }

need_tools() {
  local t; for t in gh git node; do command -v "$t" >/dev/null 2>&1 || die "$t is not installed"; done
  gh auth status >/dev/null 2>&1 || die "gh is not logged in: run  gh auth login"
  # Pushing a workflow file needs the 'workflow' scope of the token; a warning only, since some logins (ssh, fine-grained) do not show it.
  if gh auth status 2>&1 | grep -qi "token scopes" && ! gh auth status 2>&1 | grep -qi "workflow"; then
    note "WARNING: your gh token shows no 'workflow' scope, and pushing .github/workflows files needs it. If a push is refused, run:  gh auth refresh -s workflow"
  fi
}

# The first run of workflow file $1 on commit $2 on the mirror, as "status conclusion" ("" when there is none yet).
run_state() {
  gh api "repos/$REPO/actions/workflows/$1/runs?head_sha=$2&per_page=5" --jq '.workflow_runs | sort_by(.created_at) | reverse | .[0] | "\(.status) \(.conclusion // "")"' 2>/dev/null | sed 's/^null.*//' || true
}
# Waits until workflow $1 has finished on commit $2 (success), or dies. $3 says what it is.
wait_run() {
  local wf="$1" sha="$2" what="$3" t0 st
  if [ "$NOWAIT" = 1 ]; then note "not waiting for $what (--no-wait)"; return 0; fi
  t0="$(date +%s)"
  note "waiting for $what (up to $WAIT_MINUTES minutes; Ctrl-C is safe, run the same command again with --resume)"
  while :; do
    st="$(run_state "$wf" "$sha")"
    case "$st" in
      "completed success") note "$what: success"; return 0;;
      completed*) die "$what ended '${st#completed }'. Open https://github.com/$REPO/actions and read the red job.";;
    esac
    [ $(( $(date +%s) - t0 )) -lt $(( WAIT_MINUTES * 60 )) ] || die "$what did not finish in $WAIT_MINUTES minutes (last state: '${st:-no run yet}')"
    sleep "${H2C_DRYRUN_POLL_S:-30}"
  done
}
# Waits until $1 (a Pages address) serves manifest.json naming release $2.
wait_served_release() {
  local url="$1" id="$2" t0 got; [ "$NOWAIT" = 1 ] && return 0
  t0="$(date +%s)"
  while :; do
    got="$(curl -fsSL --max-time 30 "${url}manifest.json?cb=$(date +%s)" 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).release||'')}catch{console.log('')}})" || true)"
    [ "$got" = "$id" ] && { note "${url}manifest.json names release $id"; return 0; }
    [ $(( $(date +%s) - t0 )) -lt 600 ] || die "${url}manifest.json still names '${got:-nothing}', not $id, after 10 minutes"
    sleep 15
  done
}

# ---- arguments ----------------------------------------------------------------------------------------------------------------------------
parse_args() {
  [ $# -ge 1 ] || { usage; exit 2; }
  case "$1" in -h|--help) usage; exit 0;; esac
  REPO="$1"; shift
  while [ $# -gt 0 ]; do
    case "$1" in
      --restore|--revert|--cleanup) [ "$PHASE" = "setup" ] || die "one phase at a time"; PHASE="${1#--}";;
      --resume) RESUME=1;;
      --no-wait) NOWAIT=1;;
      -h|--help) usage; exit 0;;
      [0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]*) [[ "$1" =~ ^[0-9a-f]{40}$ ]] || die "the candidate must be a full 40-character commit SHA"; CANDIDATE="$1";;
      *) die "unknown argument '$1' (see --help)";;
    esac
    shift
  done
  case "$REPO" in */*) ;; *) REPO="$(gh api user --jq .login)/$REPO";; esac
  assert_dryrun_repo "$REPO"
  if [ "$PHASE" = "setup" ] && [ -z "$CANDIDATE" ]; then die "phase 1 needs the candidate SHA:  live-dryrun.sh $REPO <40-character candidate sha>"; fi
  WORK="$WORK_ROOT/$(printf '%s' "$REPO" | tr '/' '_')"
  CLONE="$WORK/clone"
  STATE="$WORK/state.env"
}

# ---- phase 1 ------------------------------------------------------------------------------------------------------------------------------
phase_setup() {
  say "Phase 1: the mirror $REPO and the cutover merge"
  note "Nothing here touches $SOURCE_REPO (read only) or faridbnv/h2c-material-temp-page. The mirror is public; no secret is created."
  if repo_exists; then
    [ "$RESUME" = 1 ] || die "$REPO exists already. Use --resume to carry on with it, or choose another name (or delete it: gh repo delete $REPO)."
  else
    [ "$RESUME" = 0 ] || die "--resume, but $REPO does not exist"
  fi
  if [ -d "$CLONE" ]; then
    [ "$RESUME" = 1 ] || die "$CLONE exists already (from an earlier run). Remove it or use --resume."
  fi
  mkdir -p "$WORK"
  if [ "$RESUME" = 1 ] && state_get MERGE_SHA >/dev/null; then
    note "phase 1 is complete already (the cutover merge $(state_get MERGE_SHA) was pushed). Next: $0 $REPO --restore"; return 0
  fi

  say "1/10 Create the public repository"
  if repo_exists; then note "$REPO exists (resuming)"; else gh_write repo create "$REPO" --public --description "Throwaway dry run of the Filament Atlas live deploy path. Safe to delete."; fi

  say "2/10 Clone $SOURCE_REPO (read only) into $CLONE"
  if [ ! -d "$CLONE/.git" ]; then
    if [ -n "${H2C_DRYRUN_SOURCE_URL:-}" ]; then git clone --quiet "$SOURCE_URL" "$CLONE"
    else gh_read repo clone "$SOURCE_REPO" "$CLONE" >/dev/null 2>&1 || git clone --quiet "$SOURCE_URL" "$CLONE"; fi
  fi
  git -C "$CLONE" remote set-url --push origin DISABLED_NO_PUSH_TO_THE_REAL_REPOSITORY
  git -C "$CLONE" fetch --quiet origin '+refs/heads/*:refs/remotes/origin/*'
  if git -C "$CLONE" remote get-url mirror >/dev/null 2>&1; then git -C "$CLONE" remote set-url mirror "$MIRROR_BASE/$REPO.git"; else git -C "$CLONE" remote add mirror "$MIRROR_BASE/$REPO.git"; fi
  git -C "$CLONE" cat-file -e "$CANDIDATE^{commit}" 2>/dev/null || die "the candidate $CANDIDATE is not a commit of $SOURCE_REPO (is it pushed?)"
  tip="$(git -C "$CLONE" rev-parse refs/remotes/origin/remake/v3 2>/dev/null || true)"
  if [ -n "$tip" ] && [ "$tip" != "$CANDIDATE" ]; then
    note "NOTE: the candidate is not the tip of remake/v3 ($tip). The real cutover PR merges the tip, so you are practising on an older commit."
  fi
  LEGACY_JSON="$WORK/legacy-final.json"
  git -C "$CLONE" show "$CANDIDATE:remake/legacy/legacy-final.json" > "$LEGACY_JSON" || die "the candidate has no remake/legacy/legacy-final.json"
  FROZEN_MAIN="$(json_get "$LEGACY_JSON" mainCommit)"; ASSET="$(json_get "$LEGACY_JSON" asset)"; ZIP_DIGEST="$(json_get "$LEGACY_JSON" digest)"
  MANIFEST_DIGEST="$(json_get "$LEGACY_JSON" manifestDigest)"; OLD_ID="$(json_get "$LEGACY_JSON" oldReleaseId)"
  [[ "$FROZEN_MAIN" =~ ^[0-9a-f]{40}$ ]] || die "legacy-final.json has no valid mainCommit"
  git -C "$CLONE" cat-file -e "$FROZEN_MAIN^{commit}" 2>/dev/null || die "the frozen main $FROZEN_MAIN is not in the clone"
  main_tip="$(git -C "$CLONE" rev-parse refs/remotes/origin/main)"
  [ "$main_tip" = "$FROZEN_MAIN" ] || note "NOTE: main of $SOURCE_REPO is at $main_tip, but the saved old site was built from $FROZEN_MAIN. The mirror gets $FROZEN_MAIN (the saved old site's commit)."
  state_set CANDIDATE "$CANDIDATE"; state_set FROZEN_MAIN "$FROZEN_MAIN"; state_set ASSET "$ASSET"; state_set DIGEST "$ZIP_DIGEST"; state_set OLD_ID "$OLD_ID"
  note "candidate $CANDIDATE; frozen main $FROZEN_MAIN; saved old site $ASSET (old release $OLD_ID)"

  say "3/10 Push the frozen main to the mirror's main (the OLD workflows then publish the OLD site there)"
  if [ "$(git -C "$CLONE" ls-remote mirror refs/heads/main | cut -f1)" = "$FROZEN_MAIN" ]; then note "the mirror's main is the frozen main already"
  elif [ -n "$(git -C "$CLONE" ls-remote mirror refs/heads/main | cut -f1)" ]; then die "the mirror's main is not the frozen main; delete the mirror and start again"
  else git_push "$FROZEN_MAIN:refs/heads/main"; fi
  watch "Verify, then Publish to Pages: gh run list --repo $REPO   (about 15 to 20 minutes; this is the old tool's own pipeline)"

  say "4/10 Enable GitHub Pages with the workflow build type, and read the address back"
  if ! gh api "repos/$REPO/pages" >/dev/null 2>&1; then gh_write api -X POST "repos/$REPO/pages" -f build_type=workflow >/dev/null
  else gh_write api -X PUT "repos/$REPO/pages" -f build_type=workflow >/dev/null || true; fi
  URL="$(pages_url)" || die "the Pages API of $REPO gives no address"
  note "the mirror's address is $URL"
  note "(the owner's user site has the custom domain pdynamics.ca, so project sites share that origin: open the mirror in a private window or another browser, not the one that holds your saved scenarios.)"
  state_set URL "$URL"

  say "5/10 Set the repository variables on the mirror"
  gh_write variable set LIVE_BASE_URL --body "$URL" --repo "$REPO"
  # Defence in depth: if any preview job ever ran in the mirror it would point at the mirror, never at the real preview repository.
  gh_write variable set PREVIEW_REPO --body "$REPO" --repo "$REPO"
  gh_write variable set PREVIEW_BASE_URL --body "$URL" --repo "$REPO"
  if [ -n "$(hold_now)" ]; then die "DEPLOY_HOLD is set on the mirror already; clear it first: gh variable delete DEPLOY_HOLD --repo $REPO"; fi

  say "6/10 Copy the release $RELEASE_TAG, and check its sha256 against remake/legacy/legacy-final.json"
  if gh api "repos/$REPO/releases/tags/$RELEASE_TAG" >/dev/null 2>&1; then note "the mirror has the release already"
  else
    SAVED="$WORK/saved"; rm -rf "$SAVED"; mkdir -p "$SAVED"
    gh_read release download "$RELEASE_TAG" --repo "$SOURCE_REPO" --dir "$SAVED"
    [ "sha256:$(sha256_of "$SAVED/$ASSET")" = "$ZIP_DIGEST" ] || die "the downloaded $ASSET does not have the digest legacy-final.json records ($ZIP_DIGEST)"
    [ "sha256:$(sha256_of "$SAVED/legacy-manifest.json")" = "$MANIFEST_DIGEST" ] || die "the downloaded legacy-manifest.json does not have the digest legacy-final.json records ($MANIFEST_DIGEST)"
    note "sha256 of the zip and the manifest match legacy-final.json"
    title="$(gh api "repos/$SOURCE_REPO/releases/tags/$RELEASE_TAG" --jq .name)"; body="$(gh api "repos/$SOURCE_REPO/releases/tags/$RELEASE_TAG" --jq .body)"
    assets=( "$SAVED/$ASSET" "$SAVED/legacy-manifest.json" ); [ ! -f "$SAVED/legacy-diff.md" ] || assets+=( "$SAVED/legacy-diff.md" )
    gh_write release create "$RELEASE_TAG" "${assets[@]}" --repo "$REPO" --target "$FROZEN_MAIN" --title "$title" --notes "$body"
  fi

  say "7/10 YOUR STEP: record the cutover approval for the candidate"
  if ATTESTED="$(state_get ATTESTED)" && git -C "$CLONE" cat-file -e "$ATTESTED^{commit}" 2>/dev/null; then
    git -C "$CLONE" checkout --quiet -B dryrun-cutover "$ATTESTED"
    note "the approval is recorded and committed already: $ATTESTED"
  else
    git -C "$CLONE" checkout --quiet -B dryrun-cutover "$CANDIDATE"
    if ! grep -q "^[^,]*,cutover-approved,$CANDIDATE," "$CLONE/remake/attest.csv"; then
      cat <<MSG
   wp:attest runs only in your own terminal and asks you to type "yes". In ANOTHER terminal window run:

       cd "$CLONE" && npm run wp:attest -- cutover-approved $CANDIDATE

   (It writes one row to remake/attest.csv in this throwaway clone, not in your own checkout.)
MSG
      while ! grep -q "^[^,]*,cutover-approved,$CANDIDATE," "$CLONE/remake/attest.csv"; do
        printf 'ATTEST-WAIT: press Enter here once you have run it (Ctrl-C to stop; run this command again with --resume): '
        read -r _ || die "no input to wait for"
      done
    fi
    [ "$(git -C "$CLONE" diff --name-only | tr '\n' ' ')" = "remake/attest.csv " ] || die "the clone has changes other than remake/attest.csv: $(git -C "$CLONE" status --short | tr '\n' ' ')"
    git -C "$CLONE" add remake/attest.csv
    git -C "$CLONE" commit --quiet -m "Record the cutover approval for $CANDIDATE (live dry run)"
    ATTESTED="$(git -C "$CLONE" rev-parse HEAD)"; state_set ATTESTED "$ATTESTED"
    note "committed the row on top of the candidate: $ATTESTED"
  fi

  say "8/10 Push the attested candidate as the mirror's remake/v3 (Next verify wants origin/remake/v3 to exist)"
  git_push --force "$ATTESTED:refs/heads/remake/v3"
  watch "Next verify runs on that push (about 25 minutes); Next preview says 'not configured' and Next main says there is nothing to do. All expected."

  say "9/10 Wait for the old site to be published on the mirror"
  wait_run pages.yml "$FROZEN_MAIN" "Publish to Pages (the old workflow) on the frozen main"
  wait_served_release "$URL" "$OLD_ID"

  say "10/10 The cutover merge, as the cutover pull request makes it: remake/v3 into main with a merge commit"
  git -C "$CLONE" checkout --quiet -B dryrun-main "$FROZEN_MAIN"
  if ! git -C "$CLONE" merge --no-ff --no-commit dryrun-cutover >/dev/null 2>&1; then
    conflicted="$(git -C "$CLONE" diff --name-only --diff-filter=U | tr '\n' ' ')"
    if [ "$conflicted" = ".github/workflows/next-gate.yml " ]; then
      note "CONFLICT in .github/workflows/next-gate.yml (add/add): main and remake/v3 each added it, with different text. The real cutover pull request will show the same conflict."
      note "Resolved here by taking the remake/v3 copy, which is what the cutover needs. Tell the owner's agents: sync main into remake/v3 BEFORE the candidate is named."
      git -C "$CLONE" checkout --theirs .github/workflows/next-gate.yml
      git -C "$CLONE" add .github/workflows/next-gate.yml
    else
      git -C "$CLONE" merge --abort || true
      die "the cutover merge conflicts in: ${conflicted:-(unknown)}. Stopping: this is a finding for the real cutover too. Nothing was pushed."
    fi
  fi
  # next-main.yml REPLACES the old Verify and Publish to Pages, so the merge commit itself deletes them: otherwise they would run on the
  # cutover push and could publish the old site over the new one.
  git -C "$CLONE" rm -q .github/workflows/pages.yml .github/workflows/verify.yml || { git -C "$CLONE" merge --abort || true; die "the merge has no .github/workflows/pages.yml and verify.yml to delete"; }
  git -C "$CLONE" commit --quiet -m "Merge remake/v3 into main (live dry run of the cutover)" -m "Deletes .github/workflows/pages.yml and verify.yml: .github/workflows/next-main.yml replaces them."
  MERGE_SHA="$(git -C "$CLONE" rev-parse HEAD)"
  [ "$(git -C "$CLONE" rev-list --parents -n 1 HEAD | wc -w | tr -d ' ')" = 3 ] || die "the merge commit does not have two parents"
  git_push "$MERGE_SHA:refs/heads/main"
  state_set MERGE_SHA "$MERGE_SHA"
  cat <<MSG

Phase 1 is pushed. The merge commit is $MERGE_SHA.
Next main now runs on the mirror's main in LIVE mode: plan, verify, build, deploy to GitHub Pages (digest checked), live smoke, keep release h2c-<id>.
About 35 to 60 minutes. The old Verify and Publish to Pages workflows also run on that push (the merge commit deletes them, so none must start).

  gh run watch --repo $REPO              (pick the "Next main" run)
  gh run list --repo $REPO --limit 10

When "next-main result" is green:   remake/tools/live-dryrun.sh $REPO --restore
When red, do not go on: read docs/next/live-dryrun.md, "If something is red".
MSG
}

# ---- phase 2 ------------------------------------------------------------------------------------------------------------------------------
phase_restore() {
  say "Phase 2: hold, restore the saved old site, clear the hold (on $REPO only)"
  [ -f "$STATE" ] || die "no state for $REPO in $WORK: run phase 1 first"
  MERGE_SHA="$(state_need MERGE_SHA)"
  ASSET="$(state_need ASSET)"; ZIP_DIGEST="$(state_need DIGEST)"; URL="$(state_need URL)"; OLD_ID="$(state_need OLD_ID)"
  [ -d "$CLONE/.git" ] || die "the clone $CLONE is gone; run phase 1 with --resume"
  [ -z "$(hold_now)" ] || die "DEPLOY_HOLD is already set on the mirror ('$(hold_now)'). Clear it first: gh variable delete DEPLOY_HOLD --repo $REPO"
  st="$(run_state next-main.yml "$MERGE_SHA")"
  [ "$NOWAIT" = 1 ] || [ "$st" = "completed success" ] || die "Next main on the cutover merge is '${st:-not started}', not completed success. Finish phase 1 first."

  say "1/5 Set DEPLOY_HOLD=$HOLD_VALUE on the mirror"
  gh_write variable set DEPLOY_HOLD --body "$HOLD_VALUE" --repo "$REPO"

  say "2/5 Commit the standing restore request on the mirror's main (no run: [skip ci])"
  git -C "$CLONE" fetch --quiet mirror main
  git -C "$CLONE" checkout --quiet -B dryrun-restore refs/remotes/mirror/main
  node -e "require('fs').writeFileSync(process.argv[1], JSON.stringify({schema:1,request:{id:'dryrun-restore-1',hold:process.argv[2],tag:process.argv[3],asset:process.argv[4],digest:process.argv[5],reason:'live dry run: put the saved old site back'}})+'\n')" "$CLONE/remake/control/restore.json" "$HOLD_VALUE" "$RELEASE_TAG" "$ASSET" "$ZIP_DIGEST"
  git -C "$CLONE" add remake/control/restore.json
  git -C "$CLONE" commit --quiet -m "Standing restore request for the live dry run [skip ci]"
  git_push "HEAD:refs/heads/main"
  note "OPERATING.md says the request is committed at the cutover; the cutover merge itself leaves it empty (a request in the merge would restore at once), so this step does it."

  say "3/5 Start the restore by hand, as OPERATING.md says"
  before="$(gh api "repos/$REPO/actions/workflows/next-main.yml/runs?event=workflow_dispatch&per_page=1" --jq '.workflow_runs[0].id // 0' 2>/dev/null || echo 0)"
  gh_write workflow run next-main.yml --ref main -f mode=live -f restore=true --repo "$REPO"
  watch "gh run watch --repo $REPO   (the plan line must say: restore dryrun-restore-1: the saved site $ASSET under hold $HOLD_VALUE)"
  if [ "$NOWAIT" != 1 ]; then
    t0="$(date +%s)"
    while :; do
      st="$(gh api "repos/$REPO/actions/workflows/next-main.yml/runs?event=workflow_dispatch&per_page=5" --jq '[.workflow_runs[] | select(.id > '"$before"')] | sort_by(.id) | reverse | .[0] | "\(.status) \(.conclusion // "")"' 2>/dev/null | sed 's/^null.*//' || true)"
      case "$st" in
        "completed success") note "the restore run: success"; break;;
        completed*) note "The restore run ended '${st#completed }'. The hold is STILL SET on the mirror; read the run, then clear it: gh variable delete DEPLOY_HOLD --repo $REPO"; die "restore failed";;
      esac
      [ $(( $(date +%s) - t0 )) -lt 2400 ] || die "the restore did not finish in 40 minutes (hold still set on the mirror)"
      sleep "${H2C_DRYRUN_POLL_S:-30}"
    done
    wait_served_release "$URL" "$OLD_ID"
  fi

  say "4/5 Put the request back to empty (no run: [skip ci]), so that the revert in phase 3 is clean"
  git -C "$CLONE" checkout --quiet "$MERGE_SHA" -- remake/control/restore.json
  git -C "$CLONE" diff --cached --quiet || git -C "$CLONE" commit --quiet -m "Clear the restore request after the live dry run [skip ci]"
  git_push "HEAD:refs/heads/main"

  say "5/5 Clear the hold on the mirror"
  gh_write variable delete DEPLOY_HOLD --repo "$REPO"
  cat <<MSG

Phase 2 done. The mirror should serve the OLD site byte for byte (legacy smoke green). Next:
  remake/tools/live-dryrun.sh $REPO --revert
MSG
}

# ---- phase 3 ------------------------------------------------------------------------------------------------------------------------------
phase_revert() {
  say "Phase 3: revert the cutover merge on the mirror's main"
  [ -f "$STATE" ] || die "no state for $REPO in $WORK: run phase 1 first"
  MERGE_SHA="$(state_need MERGE_SHA)"
  URL="$(state_need URL)"; OLD_ID="$(state_need OLD_ID)"
  [ -d "$CLONE/.git" ] || die "the clone $CLONE is gone; run phase 1 with --resume"
  git -C "$CLONE" fetch --quiet mirror main
  git -C "$CLONE" checkout --quiet -B dryrun-revert refs/remotes/mirror/main
  if ! git -C "$CLONE" revert -m 1 --no-edit "$MERGE_SHA" >/dev/null 2>&1; then
    git -C "$CLONE" revert --abort >/dev/null 2>&1 || true
    die "git revert -m 1 $MERGE_SHA conflicts on the mirror's main. Nothing was pushed. (A real revert would need the same hand work.)"
  fi
  REVERT_SHA="$(git -C "$CLONE" rev-parse HEAD)"; state_set REVERT_SHA "$REVERT_SHA"
  git_push "HEAD:refs/heads/main"
  cat <<MSG

Pushed the revert $REVERT_SHA. main no longer holds Next main, so the OLD workflows are what runs:
  Verify (verify.yml), then Publish to Pages (pages.yml) -> republishes the old site at $URL
  There must be NO "Next main" run for this commit.
  gh run list --repo $REPO --limit 10
MSG
  wait_run pages.yml "$REVERT_SHA" "Publish to Pages (the old workflow) on the revert"
  wait_served_release "$URL" "$OLD_ID"
  cat <<MSG

Now the check (reads the mirror, writes remake/rehearsal/live-dryrun-<date>.json):
  node remake/tools/live-dryrun-check.mjs $REPO
Then clean up:
  remake/tools/live-dryrun.sh $REPO --cleanup
MSG
}

# ---- phase 4 ------------------------------------------------------------------------------------------------------------------------------
phase_cleanup() {
  say "Phase 4: clean up (this script deletes nothing)"
  cat <<MSG
   When you have the check's JSON and have read it, delete the mirror yourself:

       gh repo delete $REPO

   (gh asks you to type the name; if it says it needs the delete_repo scope, first run:  gh auth refresh -s delete_repo)
   and the local files:

       rm -rf "$WORK"

   Nothing was ever changed on $SOURCE_REPO or on faridbnv/h2c-material-temp-page.
MSG
}

main() {
  parse_args "$@"
  case "$PHASE" in
    setup) need_tools; phase_setup;;
    restore) need_tools; phase_restore;;
    revert) need_tools; phase_revert;;
    cleanup) phase_cleanup;;
  esac
}
# With H2C_DRYRUN_LIB=1 (the tests source this file) it only defines its functions.
if [ "${H2C_DRYRUN_LIB:-}" != 1 ]; then main "$@"; fi
