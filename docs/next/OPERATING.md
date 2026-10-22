# Operating Filament Atlas

> **In short.** How to keep the site running and how to put the old site back if the new one goes wrong, written so that the owner can
> do it alone, with no agent. Every action is one command. The two things that matter most: **set the hold first, then restore**
> ([Rollback](#rollback-the-live-site-is-wrong-now)), and **only you can** set the hold, create a release, or record an approval.

This guide covers `main` after the cutover and, in the same words, the preview during the rehearsal (the rehearsal uses the same
steps against the preview address, `https://pdynamics.ca/h2c-material-temp-page/`). Before the cutover, `main` and the live site are the
old tool's and are not touched.

## Who can do what

| Action | Who | Why |
|---|---|---|
| Set or clear the hold (`DEPLOY_HOLD`) | **You** | It is a repository setting; agents have no right to change settings. |
| Create the GitHub Release that holds the saved old site | **You** (`save-legacy.sh` prints the command) | Agents may not create releases. |
| Record an approval (`wp:attest`: `safari-check`, `bus-factor-rollback`, `retire-approved`, `cutover-approved`) | **You**, in your own terminal | The command refuses to run anywhere else. |
| Merge a pull request into `main` | **You** | Pull requests into `main` and the cutover stay yours. |
| Open and merge pull requests into `remake/v3` | An agent, once every check is green | Ruling R-ATTEST-AGENT (2026-10-22). |

## How the site gets updated (routine)

1. A change (data, or code) arrives as a pull request into `main`. The checks run: they must all be green.
2. You merge it. The workflow **Next main** (`.github/workflows/next-main.yml`) starts on its own:
   **plan** (may this run deploy? it says why in one line), **verify** (all the checks again), **build** (the site is built once and given
   a fingerprint), **deploy** (the very same files, after checking the fingerprint), **smoke** (the live address is asked for its pages),
   **release** (the site is kept as a GitHub Release `h2c-<id>` with `site-<id>.zip`, `release.json`, `artifact.json` and `decision-diff.md`).
3. Open the **Actions** page of the repository. The run called **Next main** must end with the job **next-main result** green. A red job
   names itself; nothing is rolled back by itself (a half-propagated deploy would be undone for nothing).
4. Look at the site: `https://pdynamics.ca/h2c-materials/`. The page loads, a material page opens, a shared link opens.

Weekly (Sundays) the same workflow runs the slow checks (scale, reproducible build, 2,000 random scenarios). A red weekly run is a
reason to look, not an emergency.

## The hold

`DEPLOY_HOLD` is a repository variable. While it has any value, **no run deploys**, except the restore that the value names. Runs still
verify and build, so you can see whether a fix is good. The workflow only ever *reads* the variable.

- Set it: `gh variable set DEPLOY_HOLD --body legacy-final --repo faridbnv/h2c-materials`
- See it: `gh variable list --repo faridbnv/h2c-materials`
- Clear it: `gh variable delete DEPLOY_HOLD --repo faridbnv/h2c-materials`

A held run says so in its summary line: "DEPLOY_HOLD is "legacy-final": verified and built, not deployed".

## Rollback: the live site is wrong now

Use this when the live site is broken or wrong and you do not yet know why. It puts the **old site, exactly as it was served**, back.
It takes about ten minutes. You do not need an agent.

1. **Set the hold** (so that the next push cannot undo the rollback):
   `gh variable set DEPLOY_HOLD --body legacy-final --repo faridbnv/h2c-materials`
2. **Start the restore:**
   `gh workflow run next-main.yml --ref main -f mode=live -f restore=true --repo faridbnv/h2c-materials`
   This uses the standing request in `remake/control/restore.json` (committed at the cutover: it names the saved zip
   `legacy-site-<id>.zip` and its fingerprint). If that file says `"request": null`, see "If the request file is empty" below.
3. **Watch it:** `gh run watch --repo faridbnv/h2c-materials` (pick the **Next main** run). The jobs are **plan**, **restore the saved
   old site on GitHub Pages**, **legacy smoke on the live address**. The plan line must say "restore ...: the saved site ... under hold".
4. **Check:** the legacy smoke job asks the address for every file of the saved site and compares each fingerprint. Green means the live
   address serves the old site byte for byte. For a few minutes some visitors may still see the new page (the browser keeps it for up to
   ten minutes); the page notices that its files are gone and reloads once, and then shows the old site. That is expected.
5. **Decide what next:**
   - *Small and known cause:* fix it forward. Open a pull request that fixes it (or `git revert` of the bad commit), merge it, and **clear the hold** (`gh variable delete DEPLOY_HOLD ...`). The next push deploys the fixed site through the normal path. Clearing the hold alone does not deploy anything.
   - *Unknown cause, or you want the old tool back for good:* leave the hold set. Open a pull request into `main` with `git revert -m 1 <the cutover merge commit>`. Re-merging that branch later needs extra git steps, so decide this on purpose.

**If the request file is empty.** A pull request into `main` that sets `remake/control/restore.json` to the request below also starts the
restore the moment you merge it (the push that changes that file restores). Fill in `asset` and `digest` from `legacy-final.json`
(printed by `save-legacy.sh`; also in `remake/legacy/legacy-final.json`):

```json
{"schema":1,"request":{"id":"restore-1","hold":"legacy-final","tag":"h2c-legacy-final","asset":"legacy-site-<id>.zip","digest":"sha256:<64 hex>","reason":"why"}}
```

**What stops a restore (on purpose).** The plan job refuses (the run turns red and does nothing) if the hold is not set to the value the request
names. The restore job stops, red and before anything is published, if the zip's fingerprint is not the one in the file or any file of the
unpacked zip differs from the saved manifest.

## Rehearsal on the preview (and your bus-factor test)

The rehearsal does the rollback on the preview, never on the live site, and logs every time. It is your test too: **do it using only this page.**
Ask for the plan first: `node remake/tools/rehearse.mjs plan --candidate <the 40-character commit>`.

1. The candidate is on the preview (the newest push to `remake/v3`; the preview's `preview.json` names it).
2. You set the hold (command above).
3. An agent merges a harmless change to `remake/control/rehearsal-ping.json` into `remake/v3`. The run **Next main** verifies and builds and its deploy job is **skipped**. This is the hold test.
4. An agent merges the restore request into `remake/control/restore.json`. The run restores the saved site on the preview.
5. The legacy smoke goes green. From the merge to "old site served" must be under 15 minutes.
6. You clear the hold; an agent merges the request back to `null`; the candidate deploys again and its smoke is green.

To run the whole thing and log it: `node remake/tools/rehearse.mjs run --candidate <sha> --manifest legacy-manifest.json`. It prints each step that is yours,
with the command, and waits for the result to appear. The log goes to `remake/rehearsal/<date>.json`. Afterwards you record
your test: `npm run wp:attest -- bus-factor-rollback`.

## Before the cutover: your commands, in order

| # | Command | What it does |
|---|---|---|
| 1 | `remake/tools/save-legacy.sh` | Builds the old site from `main`, compares it with the live site, packs `legacy-site-<id>.zip`, and **prints** the command that creates the Release `h2c-legacy-final`. It creates nothing itself. |
| 2 | the `gh release create h2c-legacy-final ...` line it printed | Keeps the old site on GitHub. Keep a second copy in your private store. |
| 3 | `npm run candidate:receipt -- <sha>` (an agent can run it) | Makes `remake/candidates/<sha>.json`: every check run on that commit, parity against the old engine, the compatibility report, the artifact fingerprint, budgets, accessibility counts, the saved-site digest, the rehearsal. |
| 4 | `npm run wp:attest -- safari-check <sha8>` | Your 15-minute check in Safari. |
| 5 | `npm run checks:register -- --cutover-ready` | Lists every old check that has no proved successor and no approval from you. For each, `npm run wp:attest -- retire-approved <row id>` records that you agree to retire it. |
| 6 | `npm run candidate:check -- <sha>` | Passes only when the receipt is whole, every field was produced on that commit, `main` is unchanged, every known defect has a disposition, and your rows exist. |
| 7 | `npm run wp:attest -- cutover-approved <sha>` | Your decision. Without this row the live workflow refuses to deploy. |

## Where things are

| What | Where |
|---|---|
| The workflow | `.github/workflows/next-main.yml` (calls the checks of `next-verify.yml`) |
| What a run may do, and why | `remake/tools/cutover.mjs` (`plan`) |
| The restore request | `remake/control/restore.json` |
| Restore, the saved site's manifest and comparison | `remake/tools/restore.mjs`, `legacy-site.mjs`, `legacy-smoke.mjs` |
| The site artifact and its fingerprint | `remake/tools/artifact.mjs` |
| The candidate receipt | `remake/candidates/<sha>.json`, made and judged by `remake/tools/candidate.mjs` |
| Known defects and limitations | `docs/next/defects.md`, `docs/next/known-limitations.md` |
| The preview's key (a secret) | environment `preview` of the repository; `remake/tools/setup-preview.sh --rotate` replaces it |

## What is not automated

- After the cutover, the engine of a commit is not compared with the previous release's engine by a job. The release's `decision-diff.md` says what changed in the data and lists the registered transitions; run `npm run parity` before a change that touches answers.
- The rehearsal cannot prove the live deploy path itself (the preview is deployed by pushing to a repository, the live site by GitHub Pages). The first proof is the cutover deploy; the receipt lists this as a known limitation.
- Nothing rolls back by itself. A red smoke after a deploy is for a person to read.
