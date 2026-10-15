# Operating the tool

> **In short.** For a person keeping the tool running without an agent: what it is, the five commands, and the three jobs that come up most, step by step: correct a value, add a data sheet, publish. Each step names the section of [AGENTS.md](../AGENTS.md) or [IMPORTING.md](IMPORTING.md) that holds the full rules; this page is the short way in.

## What it is

One HTML page, the selector, built from the CSV tables in `data/tables/` by `npm run build`. Every number in it comes
from a table row that names its source document and page. GitHub checks every push to `main` and publishes the page to
GitHub Pages (pdynamics.ca/h2c-materials). Nothing is typed into the page, and nothing in `dist/` is edited by hand.

Once per clone:

```bash
npm ci --prefix build && npm ci   # the build's dependencies, and the import tools'
npm run doctor                    # what this checkout can run, and what each missing piece needs
npm run hooks                     # the data check before every commit
```

The private evidence store (`H2C_SOURCE_BACKUP`) holds the makers' documents and the rounds' working files. The tool
builds and publishes without it; re-reading a source page or rerunning an old round needs it.

## The five commands

| Command | When | What it tells you |
|---|---|---|
| `npm run verify:fast` | while you work, about a minute | format, schema, lint, the build and the tests |
| `npm run verify` | before a commit, about eight minutes; needs Chrome | everything, including the page driven in a browser |
| `npm run build` | to open the page | writes `dist/H2C_Material_Selector_<date>_<release>.html` |
| `npm run build:diff` | after any change | what it did to the compiled database, against the last commit; a change meant to move nothing says `0 difference(s)` |
| `npm run trace -- <ID>` | to see where a number comes from | a material, product or measurement back to its source and page |

## Correct a published value

The full rules: AGENTS.md, "Correct a published value" and "The one rule".

1. Find the row and its source: `npm run trace -- V000123` names the document and page.
2. Open the document at that page and read the value again. Nothing enters from memory or a summary.
3. Write a migration in `scripts/migrate/` from its README's template: one guarded `t.set` per cell, naming the value it
   replaces, and a comment saying what the page prints.
4. Run it: `node scripts/migrate/m<number>-<what-it-does>.mjs`.
5. Run `npm run verify:fast` and `npm run build:diff`. Only the value you meant to change should move.
6. Run `npm run snapshot` and read `git diff build/snapshot`: it shows which answers the change moved.
7. Commit the migration, the table, `data/manifest.json` and the snapshot together.

## Add a data sheet

A document never enters by hand; it travels the import pipeline. The full rules: IMPORTING.md.

1. Fetch and read it: `npm run ingest:fetch -- --provider "<maker>"` (or `--stage <file> --doc <key>` for a copy you
   saved), then `npm run ingest:extract -- --provider "<maker>"`.
2. Propose a batch: `npm run ingest:batch -- --holds`, then `npm run ingest:batch -- --batch b<NN> --propose --ready`.
3. Check every proposed row against its page, and accept or reject it under your name:
   `npm run ingest:review -- --batch b<NN> --doc <key> --accept m01 --by "<your name>"`.
4. Write `scripts/migrate/m<number>-batch-b<NN>.mjs`, which calls `applyBatch` (`archive/migrations/m406-batch-b45-quality-round.mjs`
   is a recent one), and rehearse it with `npm run ingest:apply -- --batch b<NN> --dry-run`.
5. Run the migration, then `npm run ingest:batch -- --batch b<NN> --finish` and `npm run verify`.
6. Commit. When the round closes, `npm run packets -- --export ingest-2026-09-18` puts the batch's proposals in the store.

## Publish

1. Work on a branch: `git checkout -b <what-it-does>`.
2. Before merging, run `npm run verify`: every step must pass. Then `npm run round:close` (below).
3. Merge into `main` and push: `git checkout main && git merge --ff-only <branch> && git push origin main`.
4. Watch the two workflows: `gh run list --branch main`. **Verify** runs the data and interface checks; **Publish to
   Pages** builds the page and deploys it only after Verify passed.
5. Check the live page is the one you pushed: `https://pdynamics.ca/h2c-materials/manifest.json` must name your commit,
   and its `release` must match the page's top bar.

If Verify fails on CI but passed locally, CI is Linux with Node 24: run the failing step under `npx -y node@24`. Never
weaken a check to make it pass; AGENTS.md says why.

## Closing a round

A round of work leaves migrations and working files behind. `npm run round:close` lists what is still open, and runs
the generated-document checks:

- `npm run round:close -- --archive` moves the round's migrations to `archive/migrations/`;
- `npm run packets -- --export <round folder> --remove` moves its working files to the private store and leaves
  `PACKETS.md` and `PACKETS.csv` in the round folder;
- a round folder keeps its reports, its scripts and the frozen lists other checks read.

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
