# Operating the tool

> **In short.** For a person keeping the tool running without an agent: what it is, the five commands, and the three jobs that come up most, step by step: correct a value, add a data sheet, publish; then how a round of work is closed. Each step names the section of [AGENTS.md](../AGENTS.md) or [IMPORTING.md](IMPORTING.md) that holds the full rules; this page is the short way in.

## What it is

Filament Atlas: one HTML page, the selector, and beside it a page of its own for each well-documented material, all
built from the CSV tables in `data/tables/` by `npm run build`. Every number in them comes from a table row that names
its source document and page. GitHub checks every push to `main` and publishes them to GitHub Pages
(pdynamics.ca/h2c-materials). Nothing is typed into the page, and nothing in `dist/` is edited by hand.

Once per clone, with Node 24 or later, Chrome or Chromium (for `npm run verify`) and the GitHub CLI `gh` (to watch a
publish):

```bash
npm ci --prefix build && npm ci   # the build's dependencies, and the import tools'
npm run doctor                    # what this checkout can run, and what each missing piece needs
npm run hooks                     # the data check before every commit
```

The private evidence store holds the makers' documents and each finished round's working files. Its folder is named by
the environment variable `H2C_SOURCE_BACKUP` (the owner's OneDrive copy). The tool builds, checks and publishes without
it; reading a source page again, importing a sheet or closing a round needs it.

## The five commands

| Command | When | What it tells you |
|---|---|---|
| `npm run verify:fast` | while you work, about a minute | format, schema, lint, the build and the tests |
| `npm run verify` | before a commit, about eight minutes; needs Chrome | everything, including the page driven in a browser |
| `npm run build` | to open the page | writes `dist/H2C_Material_Selector_<date>_<release>.html`, the material pages in `dist/materials/` and `dist/manifest.json` |
| `npm run build:diff` | before you commit a change | what the working tree does to the compiled database, against the last commit; a change meant to move nothing says `0 difference(s)`. It builds without the material pages and removes `dist/materials/`: `npm run build` again before `pages:check` |
| `npm run trace -- <ID>` | to see where a number comes from | a material, product or measurement back to its source and page |

A build rewrites `build/reports/validation-report.md`; commit it with the change it belongs to.

## Correct a published value

The full rules: AGENTS.md, "Correct a published value" (under Recipes) and "The one rule".

1. Find the row and its source: `npm run trace -- V000123` names the document, its page, its URL and its SHA-256. The
   local copy is `.cache/sources/by-sha/<SHA-256>.pdf`; `npm run data:sources -- --restore "$H2C_SOURCE_BACKUP"` brings
   the cache back from the store.
2. Open the document at that page and read the value again. Nothing enters from memory or a summary.
3. Write a migration in `scripts/migrate/`, as its README says: `correct()` from `scripts/lib/source-edits.mjs` changes
   Raw value, Raw numeric and Normalized value together, names the value each replaces, sets Data status "Published value
   (transcription corrected)" and adds a dated note (pass today's date). `archive/migrations/m212-an-anneal-is-not-a-test-temperature.mjs`
   is a short one to copy.
4. Run it: `node scripts/migrate/m<number>-<what-it-does>.mjs`.
5. Run `npm run verify:fast` and `npm run build:diff`. Only the value you meant to change should move.
6. Run `npm run snapshot` and read `git diff build/snapshot`: it shows which answers the change moved.
7. Run `npm run verify`, then commit the migration, the table, `data/manifest.json`, the snapshot and the validation
   report together. The pre-commit hook checks the tables again.

## Add a data sheet

A document never enters by hand; it travels the import pipeline. The full rules: IMPORTING.md.

1. Fetch and read it. A document the import's ledger already lists (`docs/audits/2026-09-18-v2-import/ledger.csv`):
   `npm run ingest:fetch -- --provider "<maker>"`. A new one you saved from a browser:
   `npm run ingest:fetch -- --stage <folder> --provider "<maker>" --recursive --create --root-url <the page's URL>`.
   Then `npm run ingest:extract -- --provider "<maker>"`.
2. Propose a batch under a name no batch has used (the last were b45 and the price batch p05):
   `npm run ingest:batch -- --holds`, then `npm run ingest:batch -- --batch b<NN> --propose --ready`.
3. Check every proposed row against its page. `npm run ingest:review -- --batch b<NN> --doc <key>` lists them; accept or
   reject under your name (`--accept m01,m02 --by "<your name>"`, `--reject m03 --note "<why>" --by "<your name>"`), then
   mark the document reviewed with `--done --by "<your name>"`. Apply refuses a document not marked reviewed.
4. Write `scripts/migrate/m<number>-batch-b<NN>.mjs`, which calls `applyBatch`
   (`archive/migrations/m103-batch-b26.mjs` is the whole pattern in 30 lines), and rehearse it with
   `npm run ingest:apply -- --batch b<NN> --dry-run`.
5. Run the migration, then `npm run ingest:batch -- --batch b<NN> --finish` and `npm run verify`.
6. Before the commit, put the batch's proposals in the store: `npm run packets -- --export ingest-2026-09-18` (it needs
   `H2C_SOURCE_BACKUP`, and it updates `archive/ingest-2026-09-18/PACKETS.md` and `PACKETS.csv`, which the commit
   carries). Then commit.

## Publish

AGENTS.md: commit and push to `main` only when the owner asks.

1. Work on a branch: `git checkout -b <what-it-does>`.
2. Before merging, run `npm run verify` (every step must pass), then `npm run round:close` (below; it must say
   "nothing open").
3. Merge into `main` and push: `git checkout main && git pull --ff-only && git merge --ff-only <branch> && git push origin main`.
   If `main` has moved since you branched, rebase the branch on it and run `npm run verify` again first.
4. Watch the two workflows: `gh run list --branch main`. **Verify** runs the data and interface checks; **Publish to
   Pages** builds the page and deploys it only after Verify passed.
5. Check the live page is the one you pushed: `https://pdynamics.ca/h2c-materials/manifest.json` must name your commit,
   and its `release` must match the page's top bar.

What Publish to Pages puts out: the site serves the selector at its root, its manifest and validation report, and the
material pages beside it at `materials/` (`https://pdynamics.ca/h2c-materials/materials/M020.html`; the index is
`materials/index.html`), so the drawer's Full page links open there. A new release is kept as a GitHub release
`h2c-<release>` with the selector's page, its manifest and `H2C_Material_Pages_<snapshot>_<release>.zip`, the material
pages zipped; its notes say to unzip the zip in the folder that holds the downloaded page, which is what makes the Full
page links open from disk. A release kept before it had its zip gets it on the next build of that release. The zip is
written once for a release and kept: a later change to the pages' design alone (not a new release, D96) changes the
site's pages, not that release's zip.

If Verify fails on CI but passed locally: CI is Linux x64 with the Node version `.nvmrc` names. Run the failing group
there (`node scripts/verify.mjs --group data`, `--group views`, `--group scenarios --shard 2/3` or `--group trend`) under `npx -y node@$(cat .nvmrc)`;
a failure that only CI shows has been a floating-point difference between processors before (an exact comparison where a
tolerance was meant). Never weaken a check to make it pass; AGENTS.md says why.

## Closing a round

A round of work leaves migrations and working files behind, and they leave the working tree when it closes (D138).
`<round>` below is the round's folder name under `docs/audits/`, such as `2026-10-15-maintainability-round`, not a path.

1. `npm run round:close -- --archive` moves the round's migrations to `archive/migrations/` with `git mv` and re-points
   their imports.
2. `npm run packets -- --export <round> --remove` copies the round's working files to the store (`H2C_SOURCE_BACKUP`),
   reads each copy back, writes `PACKETS.md` and `PACKETS.csv` in the round folder and stages the files' removal from
   git. `npm run packets -- --manifest <round>` first shows what would move and why each kept file stays.
3. `npm run packets -- --export ingest-2026-09-18` for any batch's proposals (as in "Add a data sheet").
4. `npm run docs:open-problems` writes the counts at the head of OPEN-PROBLEMS (about twenty seconds).
5. `npm run round:close`: it exits 1 while anything is open and lists what. It also prints what changed since `main` in
   the estimate stage and the import's text reader; both are frozen, and a change there needs a decision and a back-test
   row (D58, D138).
6. Run `npm run verify` and commit.

## What to read when

| You want | Read |
|---|---|
| what the tool is for, and how a change is judged | [GOALS.md](GOALS.md) |
| how a number on the page is made, and how far to trust it | [HOW-IT-WORKS.md](HOW-IT-WORKS.md) |
| what is known to be wrong or missing | [OPEN-PROBLEMS.md](OPEN-PROBLEMS.md) |
| every rule for changing the data | [AGENTS.md](../AGENTS.md) |
| how the code is put together | [ARCHITECTURE.md](ARCHITECTURE.md) |
| why something is the way it is | [DECISIONS.md](DECISIONS.md) |
| what a column or a check code means | [DATA-DICTIONARY.md](DATA-DICTIONARY.md), [RULES.md](RULES.md) |
