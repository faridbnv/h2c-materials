# Practising the live deploy in a throwaway repository

> **In short.** The live path of `next-main.yml` (deploy to GitHub Pages with the fingerprint checked, the live smoke, the kept release
> `h2c-<id>`, the restore of the saved old site under the hold) has never run, because the preview can only rehearse the dry run
> ([known limitations](known-limitations.md) L-02 and L-03). This kit runs all of it in a copy of the repository that you create and
> delete: a public repo such as `faridbnv/h2c-materials-dryrun`. It takes about two hours, most of it waiting. It costs nothing and creates
> no secret. It never writes to `faridbnv/h2c-materials` or to the preview repository; the script refuses both, in any spelling.

## What you need

- `gh` logged in (`gh auth status`) with the `repo` and `workflow` permissions (pushing workflow files needs the second:
  `gh auth refresh -s workflow`). If a push asks for a password, run `gh auth setup-git` once.
- `git` and `node` on your Mac. The candidate: the full 40-character commit you would name for the cutover (the tip of `remake/v3`, after
  `npm run candidate:check -- <sha>` passes).
- Open the mirror's address in a private window or another browser. Your user site has the domain `pdynamics.ca`, so the mirror is served
  from the same origin as the real tool (`https://pdynamics.ca/<mirror-name>/`) and would share its saved scenarios in your normal browser.

## Your commands, in order

Run them from a checkout of the candidate (the tools are in `remake/tools/`). `REPO` is the mirror's name, for example `faridbnv/h2c-materials-dryrun`
(the name must contain `dryrun`).

| # | Command | What you should see | How long | If it is red |
|---|---|---|---|---|
| 1 | `remake/tools/live-dryrun.sh REPO <candidate-sha>` | Ten steps, each printed. At step 7 it **pauses**: in another terminal run the `npm run wp:attest -- cutover-approved <sha>` line it shows (type `yes`), then press Enter. At step 9 it waits for the **old** site to appear on the mirror. At the end: the merge commit and the `gh run watch` line. | 30 to 40 minutes of waiting, then the live run takes 35 to 60 | See "If something is red". `--resume` carries on after a stop. |
| 2 | `gh run watch --repo REPO` (pick **Next main**) | Jobs: plan, verify (many), build, **deploy the artifact to GitHub Pages**, **smoke on the live address**, **keep the release**, next-main result: all green. The plan line says `mode live, action deploy, deploy true`. | 35 to 60 minutes | The first red job names the problem. Do not go on to 3. |
| 3 | `remake/tools/live-dryrun.sh REPO --restore` | It sets `DEPLOY_HOLD=legacy-final` on the mirror only, commits the standing restore request there, starts `gh workflow run next-main.yml --ref main -f mode=live -f restore=true`, waits, then clears the hold. The plan line says `action restore`; **legacy smoke on the live address** goes green. | About 10 minutes | If the run is red the hold stays set on the mirror (it tells you the command to clear it). |
| 4 | `remake/tools/live-dryrun.sh REPO --revert` | It pushes `git revert -m 1 <merge>` to the mirror's main. The **old** workflows (Verify, then Publish to Pages) run and the old site is back. There must be no Next main run for that commit. | 15 to 25 minutes | Read the failed old run; a revert that cannot be pushed or published is a finding for the real cutover. |
| 5 | `node remake/tools/live-dryrun-check.mjs REPO` | One line per phase (`pass`, `fail` or `missing`) and `live dry run: pass`. It reads the mirror (read only) and writes `remake/rehearsal/live-dryrun-<date>.json`. Run it after step 2 as well: the phases not done yet read `missing`, and the result is `incomplete`, not `pass`. | 1 minute | A `fail` line says what. |
| 6 | `remake/tools/live-dryrun.sh REPO --cleanup`, then the `gh repo delete REPO` line it prints | Nothing is deleted by the script; you run the delete. | 1 minute | |

Every step of the script says what to watch. `--no-wait` makes it stop waiting for GitHub (you then watch the runs yourself).

## What the check judges

Four phases, from the mirror's own runs. `pass` needs all four.

1. **old-site**: Verify and Publish to Pages (the old workflows) ran on the frozen main and published the old site.
2. **live-deploy**: the Next main run on the merge commit took the live path and every job succeeded, including the called `verify`. **One fingerprint**: the digest the build computed, the one the deploy job checked, the one the release job checked and the one in the kept release's `artifact.json` are the same. The live smoke said `smoke: pass`. The release `h2c-<id>` holds `site-<id>.zip`, `release.json`, `artifact.json` and `decision-diff.md`.
3. **restore**: the by-hand live restore ran under the hold, its plan line says `action restore`, the legacy smoke passed on every file of the saved site.
4. **revert**: after `git revert -m 1` brought the old `pages.yml` back, it republished the old site, the address serves the old release, and Next main did not run. No old workflow may have run on the merge commit or later until then.

## How it closes L-02 and L-03

L-02 says the preview cannot prove the live path; L-03 says `next-main.yml` has not run on `main` and the pins of `upload-pages-artifact` and `deploy-pages` were
written without a network check. A `pass` report proves the pins, the permissions, the environment, the digest check, the release and the live restore **as
they run on GitHub Pages in a repository set up like the real one**, and the revert fallback. It does not prove the real repository's own settings
(Pages configuration and domain, branch protection, secrets), the data pause, or the owner's merge click. So the two lines should not be deleted: after a `pass`, ask an
agent to reword them to "exercised in a throwaway mirror on <date> (report `remake/rehearsal/live-dryrun-<date>.json`); the first run on the real repository is still the cutover".
The report belongs with the candidate's receipt.

## For the real cutover PR

**Required step: the cutover merge deletes `.github/workflows/pages.yml` and `.github/workflows/verify.yml` from `main`, in the merge commit itself.**
`next-main.yml` replaces them (its header says so), but nothing else removes them. If they stay, the cutover push starts the old Verify and then the old
Publish to Pages, which builds the **old** site from the merged tree and deploys it in a different concurrency group, so it can overwrite the new site. The
dry-run script makes its merge this way (`git merge --no-ff --no-commit`, then `git rm` of the two files, then one commit), and the check **fails** if any old
Verify or Publish to Pages run starts on the merge commit or on any later commit other than the revert. Because the files are gone, the `--revert` phase
proves the fallback: reverting the merge brings the old `pages.yml` back and it republishes the old site.

Findings 1 to 5, found while building the kit. The kit handles each in the mirror; the real pull request must too.

1. **The cutover merge conflicts.** `remake/v3` into `main` conflicts in `.github/workflows/next-gate.yml`: both branches added it, with different text (main has the first version, remake/v3 the corrected one). The script takes the remake/v3 copy and says so. Sync main into `remake/v3` (keeping the remake/v3 copy of that file) **before** the candidate is named; otherwise the approved commit is not the one that merges.
2. **The old workflows must be deleted by the merge** (the required step above). Kept, they race Next main.
3. **The restore needs a standing request.** `remake/control/restore.json` says `"request": null` at the merge (a request in the merge would restore immediately). The by-hand restore of OPERATING.md does nothing until a request is committed. The kit commits one on the mirror with `[skip ci]`; in the real rollback it is a pull request (OPERATING.md, "If the request file is empty").
4. **`remake/v3` must still exist after the cutover.** The checks need `origin/remake/v3` (the check register reads the frozen inventory from it), so the kit pushes the attested candidate there. If the branch is deleted after the merge, Next main's verify turns red.
5. **The attest row.** `wp:attest` has no check on where it runs except that it is your terminal. In the mirror's clone it writes the row for the practice; **that is not the real approval**. The real `cutover-approved` row is still yours to record on the real branch.

## If something is red

| Where | Likely cause | What to do |
|---|---|---|
| Step 1 "token" or "push refused" | No `workflow` permission, or git has no credentials | `gh auth refresh -s workflow`; `gh auth setup-git`; run the same command with `--resume` |
| Step 1, waiting for the old site | The old Verify failed in the mirror | Open the run; it is the old tool's own pipeline. Re-run it, or carry on with `--resume --no-wait` knowing that phase 1 of the check will then read `fail` or `missing` |
| Next main: **plan** red | The plan refused (no `cutover-approved` row for the commit or an ancestor) | The line says why. Check that `remake/attest.csv` on the mirror's main has the row |
| Next main: **verify** red | A check that depends on the repository name or on the other branches | Open the failed job; it is a finding about the real cutover as well |
| Next main: **deploy the artifact** red | The Pages pins, the permissions or the Pages setup | Read the step. Pages must be set to "GitHub Actions" (the script sets it) |
| **smoke on the live address** red | The address in `LIVE_BASE_URL` is wrong or not yet served | Open the address; `gh variable list --repo REPO` shows what the script set |
| **keep the release** red | Release permission, or a release with that name exists | Read the step |
| Restore plan red | The hold or the request is missing | `gh variable list --repo REPO`; the plan line names the command |
| Check says an old workflow ran after the cutover merge | The merge did not delete `pages.yml` and `verify.yml` | Report it to the owner's agents; do not delete the mirror until they have read the JSON |

Nothing the script does can be undone by anything but deleting the mirror, and nothing it does touches the real repositories.
