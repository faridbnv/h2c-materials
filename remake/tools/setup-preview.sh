#!/usr/bin/env bash
# setup-preview.sh -- the owner runs this ONCE, in their own terminal, to make the preview site work (WP-03).
#
#   remake/tools/setup-preview.sh            set everything up (safe to run again: it only fixes what is missing)
#   remake/tools/setup-preview.sh --rotate   also make a NEW deploy key and replace the old one
#   remake/tools/setup-preview.sh --check    change nothing, only print the final check
#
# What it does, in plain words:
#   1. makes the public repository faridbnv/h2c-material-temp-page if it is not there (a temporary home for the preview);
#   2. puts a README and an empty .nojekyll file in it, and turns on GitHub Pages from its main branch;
#   3. makes a one-purpose SSH key, gives the PUBLIC half to the preview repository as a deploy key with write access,
#      and stores the PRIVATE half as a secret named PREVIEW_DEPLOY_KEY inside the environment `preview` of
#      faridbnv/h2c-materials, which only the branch remake/v3 may use;
#   4. sets the repository variables PREVIEW_ENABLED=true, PREVIEW_REPO and PREVIEW_BASE_URL (the workflow reads them);
#   5. destroys the temporary copy of the key and prints a check of everything.
# It needs the GitHub command line (gh), logged in as you with permission to administer both repositories.
# Overrides (environment variables): PREVIEW_REPO, SOURCE_REPO, PREVIEW_ENV, PREVIEW_BRANCH.
set -euo pipefail

PREVIEW_REPO="${PREVIEW_REPO:-faridbnv/h2c-material-temp-page}"
SOURCE_REPO="${SOURCE_REPO:-faridbnv/h2c-materials}"
PREVIEW_ENV="${PREVIEW_ENV:-preview}"
PREVIEW_BRANCH="${PREVIEW_BRANCH:-remake/v3}"
PAGES_BRANCH="main"
KEY_TITLE="h2c-materials preview deploy (CI)"
SECRET_NAME="PREVIEW_DEPLOY_KEY"

MODE="setup"
for a in "$@"; do
  case "$a" in
    --rotate) MODE="rotate" ;;
    --check) MODE="check" ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "unknown option: $a (use --rotate, --check or --help)" >&2; exit 2 ;;
  esac
done

step() { printf '\n== %s\n' "$*"; }
say() { printf '   %s\n' "$*"; }
fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

command -v gh >/dev/null || fail "gh (GitHub CLI) is not installed"
command -v ssh-keygen >/dev/null || fail "ssh-keygen is not installed"
gh auth status >/dev/null 2>&1 || fail "gh is not logged in. Run: gh auth login"

TMP=""
cleanup() {
  if [ -n "$TMP" ] && [ -d "$TMP" ]; then
    for f in "$TMP"/*; do
      [ -e "$f" ] || continue
      if command -v shred >/dev/null 2>&1; then shred -u "$f" 2>/dev/null || rm -f "$f"
      else rm -P "$f" 2>/dev/null || rm -f "$f"; fi
    done
    rmdir "$TMP" 2>/dev/null || true
  fi
}
trap cleanup EXIT

repo_exists() { gh api "repos/$PREVIEW_REPO" >/dev/null 2>&1; }
key_ids() { gh api "repos/$PREVIEW_REPO/keys" --jq ".[] | select(.title==\"$KEY_TITLE\") | .id"; }
key_id() { key_ids 2>/dev/null | head -n1 || true; }
# A failing gh call is an error here, never "the secret is missing" (that would trigger a needless rotation).
env_secret_exists() { local out; out=$(gh secret list --env "$PREVIEW_ENV" --repo "$SOURCE_REPO") || fail "could not list the secrets of environment $PREVIEW_ENV"; printf '%s\n' "$out" | awk '{print $1}' | grep -qx "$SECRET_NAME"; }
# put_file PATH CONTENT MESSAGE: create a file on the Pages branch unless it is there already.
put_file() {
  if gh api "repos/$PREVIEW_REPO/contents/$1?ref=$PAGES_BRANCH" >/dev/null 2>&1; then say "$1 already there"; return; fi
  local b64; b64=$(printf '%s' "$2" | base64 | tr -d '\n')
  gh api -X PUT "repos/$PREVIEW_REPO/contents/$1" -f message="$3" -f content="$b64" -f branch="$PAGES_BRANCH" >/dev/null
  say "$1 created"
}

if [ "$MODE" != "check" ]; then
  step "1/6 The preview repository $PREVIEW_REPO (public)"
  if repo_exists; then say "already exists"; else
    gh repo create "$PREVIEW_REPO" --public --description "Temporary preview of the Filament Atlas remake. Safe to delete." >/dev/null
    say "created"
  fi
  [ "$(gh api "repos/$PREVIEW_REPO" --jq .private)" = "false" ] || fail "$PREVIEW_REPO is private; the plan needs it public (Q2-01). Make it public or delete it and run again."

  step "2/6 README, .nojekyll and GitHub Pages from the $PAGES_BRANCH branch"
  put_file "README.md" "# Preview of the Filament Atlas remake

This repository is a temporary home for a preview. CI in faridbnv/h2c-materials writes to it; do not edit it by hand.
It is not the live tool (https://pdynamics.ca/h2c-materials/) and will be deleted when the remake is decided.
" "Start the preview repository"
  put_file ".nojekyll" "
" "Tell Pages not to run Jekyll"
  if gh api "repos/$PREVIEW_REPO/pages" >/dev/null 2>&1; then
    gh api -X PUT "repos/$PREVIEW_REPO/pages" -f "source[branch]=$PAGES_BRANCH" -f "source[path]=/" >/dev/null 2>&1 || true
    say "Pages already on"
  else
    gh api -X POST "repos/$PREVIEW_REPO/pages" -f "source[branch]=$PAGES_BRANCH" -f "source[path]=/" >/dev/null
    say "Pages turned on"
  fi

  step "3/6 The environment '$PREVIEW_ENV' on $SOURCE_REPO, limited to the branch $PREVIEW_BRANCH"
  # The PUT replaces reviewers and wait timers, so it is made only when the environment is not already branch-limited.
  custom=$(gh api "repos/$SOURCE_REPO/environments/$PREVIEW_ENV" --jq '.deployment_branch_policy.custom_branch_policies' 2>/dev/null || true)
  if [ "$custom" = "true" ]; then say "environment already limited to named branches; its other settings are left alone"; else
    printf '{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}' \
      | gh api -X PUT "repos/$SOURCE_REPO/environments/$PREVIEW_ENV" --input - >/dev/null
    say "environment created or limited to named branches"
  fi
  have=0
  while IFS=$'\t' read -r id name; do
    [ -n "$id" ] || continue
    if [ "$name" = "$PREVIEW_BRANCH" ]; then have=1; else
      gh api -X DELETE "repos/$SOURCE_REPO/environments/$PREVIEW_ENV/deployment-branch-policies/$id" >/dev/null
      say "removed the extra branch rule '$name'"
    fi
  done < <(gh api "repos/$SOURCE_REPO/environments/$PREVIEW_ENV/deployment-branch-policies" --jq '.branch_policies[] | "\(.id)\t\(.name)"')
  if [ "$have" = 1 ]; then say "branch rule $PREVIEW_BRANCH already there"; else
    gh api -X POST "repos/$SOURCE_REPO/environments/$PREVIEW_ENV/deployment-branch-policies" -f name="$PREVIEW_BRANCH" -f type=branch >/dev/null
    say "branch rule $PREVIEW_BRANCH added"
  fi

  step "4/6 The deploy key and the secret $SECRET_NAME"
  existing=$(key_id || true)
  if [ "$MODE" != "rotate" ] && [ -n "$existing" ] && env_secret_exists; then
    say "deploy key and secret are both in place; leaving them (use --rotate to replace)"
  else
    # Order matters: store the private half first, then register the public half, then retire the old keys. A failure in
    # the middle leaves the old pair working, never a secret that matches no key.
    old_ids=$(key_ids 2>/dev/null || true)
    TMP=$(mktemp -d)
    ssh-keygen -q -t ed25519 -N "" -C "$KEY_TITLE" -f "$TMP/key"
    gh secret set "$SECRET_NAME" --env "$PREVIEW_ENV" --repo "$SOURCE_REPO" < "$TMP/key"
    say "private half stored as secret $SECRET_NAME of environment $PREVIEW_ENV"
    new_id=$(gh api -X POST "repos/$PREVIEW_REPO/keys" -f title="$KEY_TITLE" -f key="$(cat "$TMP/key.pub")" -F read_only=false --jq .id)
    say "public half added to $PREVIEW_REPO as a deploy key WITH write access"
    for oid in $old_ids; do
      [ "$oid" = "$new_id" ] || { gh api -X DELETE "repos/$PREVIEW_REPO/keys/$oid" >/dev/null; say "removed the old deploy key $oid"; }
    done
    cleanup; TMP=""
    say "temporary key destroyed"
  fi

  step "5/6 Repository variables the workflow reads"
  pages_url=$(gh api "repos/$PREVIEW_REPO/pages" --jq .html_url 2>/dev/null || true)
  pages_url="${pages_url%/}/"
  [ "$pages_url" != "/" ] || pages_url="https://pdynamics.ca/h2c-material-temp-page/"
  gh variable set PREVIEW_REPO --body "$PREVIEW_REPO" --repo "$SOURCE_REPO"
  gh variable set PREVIEW_BASE_URL --body "$pages_url" --repo "$SOURCE_REPO"
  gh variable set PREVIEW_ENABLED --body true --repo "$SOURCE_REPO"
  say "PREVIEW_REPO=$PREVIEW_REPO  PREVIEW_BASE_URL=$pages_url  PREVIEW_ENABLED=true"
fi

step "6/6 Final check"
bad=0
ok() { printf '   ok    %s\n' "$*"; }
no() { printf '   FAIL  %s\n' "$*"; bad=1; }
if repo_exists; then
  [ "$(gh api "repos/$PREVIEW_REPO" --jq .private)" = "false" ] && ok "$PREVIEW_REPO exists and is public" || no "$PREVIEW_REPO is private"
  src=$(gh api "repos/$PREVIEW_REPO/pages" --jq '.source.branch + " " + .source.path' 2>/dev/null || true)
  [ "$src" = "$PAGES_BRANCH /" ] && ok "Pages serves $PAGES_BRANCH /" || no "Pages is not set to $PAGES_BRANCH / (got '${src:-off}')"
  kid=$(key_id || true)
  if [ -n "$kid" ]; then
    ro=$(gh api "repos/$PREVIEW_REPO/keys/$kid" --jq .read_only)
    [ "$ro" = "false" ] && ok "deploy key present with write access" || no "deploy key is read-only"
  else no "no deploy key titled '$KEY_TITLE'"; fi
else no "$PREVIEW_REPO does not exist"; fi
env_secret_exists && ok "secret $SECRET_NAME is in environment $PREVIEW_ENV" || no "secret $SECRET_NAME missing from environment $PREVIEW_ENV"
if gh secret list --repo "$SOURCE_REPO" 2>/dev/null | awk '{print $1}' | grep -qx "$SECRET_NAME"; then
  no "$SECRET_NAME is ALSO a repository-wide secret; pull_request jobs could read it. Delete it: gh secret delete $SECRET_NAME --repo $SOURCE_REPO"
else ok "$SECRET_NAME is not a repository-wide secret"; fi
pol=$(gh api "repos/$SOURCE_REPO/environments/$PREVIEW_ENV/deployment-branch-policies" --jq '[.branch_policies[].name] | join(",")' 2>/dev/null || true)
[ "$pol" = "$PREVIEW_BRANCH" ] && ok "environment $PREVIEW_ENV is limited to $PREVIEW_BRANCH" || no "environment branch rules are '${pol:-none}', expected only $PREVIEW_BRANCH"
en=$(gh variable get PREVIEW_ENABLED --repo "$SOURCE_REPO" 2>/dev/null || true)
[ "$en" = "true" ] && ok "PREVIEW_ENABLED=true" || no "PREVIEW_ENABLED is '${en:-unset}'"

echo
if [ "$bad" = 0 ]; then
  echo "Setup is complete. Two things are still yours:"
  echo "  1. Branch protection on $PREVIEW_BRANCH: require pull requests, add the required checks  next-verify  old-paths  tier-gate"
  echo "     (and review-section), forbid direct and force pushes, and apply the rules to administrators too. The deploy key is only"
  echo "     as safe as that rule: anyone who can push straight to $PREVIEW_BRANCH can change the workflow and read the key."
  echo "  2. After the first push to $PREVIEW_BRANCH, open $(gh variable get PREVIEW_BASE_URL --repo "$SOURCE_REPO") once. Pages shows 404 until the first deploy."
else
  echo "Some checks failed (FAIL lines above). Fix the cause and run this script again; it only repairs what is missing."
  exit 1
fi
