# Maintainability round, 2026-10-15

> **Historical record** (2026-10-15): written for one round. It describes the tool and its records as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

**Asked by:** the owner, on 2026-10-15: carry out the eight recommendations of the
[architecture review](../2026-10-14-architecture-maintainability/README.md), keeping the code clean and readable,
everything working and the documents useful; name the risks and their workarounds; Claude Opus as the brain and
Claude Sonnet agents for labour; push at the end.

**The owner's answers before the work began:** packets and the 2026-09-18 import proposals go to the private store
that already holds the source documents (`$H2C_SOURCE_BACKUP`); the two failures of the weekly CI run of 2026-10-11 are
fixed in this round; OPEN-PROBLEMS is reorganised by subject with its section numbers kept as stable IDs.

**What may not change:** no verdict, number or page behaviour. Each commit shows `0 difference(s)` in
`npm run build:diff`, except the two this record names where they happen.

## Baseline

Taken on branch `maintainability-2026-10-15` from `main` at `17808341`, after the review was committed (`f5d8bcaa`).

| | |
|---|---|
| Release | `0cf8d040210f` (data snapshot 2026-09-21) |
| `dist/db.json` | `4896c07df845255379e4fbe26b99b7d43283ca5c1ef4c8a373ae4bca55fb9917` |
| `dist/reference.json` | `4f346e3816e9e3dc22ac2ec0846ea6815b2cfed4f38f483162b3d15e8ccaaf84` |
| Page | `4c73aa14b8f3f4c32333409224ae4909285880df8a88aeede5b19b4c2722210b` |
| Tracked files | 6,323 |
| Tracked bytes | 259.3 MB |

## What was done

### History left the working tree

| | Before | After |
|---|---:|---:|
| Tracked files | 6,323 | 1,879 |
| Tracked bytes | 259.3 MB | 66.3 MB |
| Files in `scripts/migrate/` | 424 | 1 (its README, the template) |
| Non-Markdown files under `docs/audits/` | 1,938 | 600, each kept by a rule |

- **Migrations.** m10 to m413, their 46 data files and the five helpers only they use moved to `archive/migrations/`
  with `npm run round:close -- --archive` (`6580c2e3`). 333 modules had their imports re-pointed two levels up, and
  `checkImports` resolves every import to a file and every braced name to an export. m223 now finds its data files
  beside itself. The four modules living code imported moved first, to `scripts/lib/` (`fa61c6a5`): `source-edits`,
  `read-proposals-apply`, `coverage-clause`, `sweep-shared` and `profile-settings` (the three exports m290 first wrote).
- **Proposals.** The 3,188 files of the 2026-09-18 import (73.4 MB) are in the store under `packets/ingest-2026-09-18/`,
  read back byte for byte, and restored to `.cache/proposals/`, now the pipeline's proposals folder (`75f1f75d`). Where
  they are absent, the SQLite file's `source_facts` is empty and its stamp says `source_facts: unavailable`.
- **Packets.** 33 rounds' working files (4,526 files with the proposals) are in the store, each round's listed in its
  `PACKETS.md` and `PACKETS.csv` with size, SHA-256 and the last commit holding it (`ab4fd75f` to `1e615496`). What stays,
  by the rules in `scripts/data/packets.mjs`: reports, scripts and images; the import pipeline's live state; frozen
  lists, baselines and counted verdicts; the campaign status check's inputs and what its page links; every file a living
  document, table or script names; and `docs/audits/keep-list.csv`. 34 reports' links to a moved packet now lead to their
  round's `PACKETS.md`.
- **Links.** `npm run docs:links` found 37 links in four audit records pointing at files never committed or since
  removed; they keep their words and lose their targets (`dfee62dd`). It runs in `verify`.
- **Living scripts still run.** A Sonnet agent ran every living audit script in a throwaway worktree after the moves:
  each exited 0 and none missed a file. Six regenerated documents differ from the committed copies, at the merge base as
  well: they were stale before this round, and are left as dated records. `audit:reader-recall` ran past ten minutes
  and was stopped without a result.

### The living documents

| Document | Before | After |
|---|---:|---:|
| `docs/DECISIONS.md` | 4,607 lines | 4,540 (D138 added; four decisions archived) |
| `docs/DECISIONS-ARCHIVE.md` | | 109 |
| `docs/GOALS.md` | 671 | 115 |
| `docs/GOALS-LOG.md` | | 581 |
| `docs/OPEN-PROBLEMS.md` | 1,643, by round | 2,070, by subject, counts generated |
| `docs/OPERATING.md` | | 92 |

- **DECISIONS.** Only D10, D40, D42 (superseded in full by D43) and D132 (withdrawn) moved: the review's "24" counted 16
  amended decisions whose rules still hold and three partly superseded ones. The index reads both files; a decision from
  D138 on that runs past a screen is named by the generator.
- **GOALS.** The 30 dated decision sections moved verbatim to GOALS-LOG; the goal, method, scorecard and working rules
  stay. Living citations of a dated decision name the log; comments under `build/` and `app/` keep their wording, since
  they are part of the release digest.
- **OPEN-PROBLEMS.** Three Sonnet readers re-ran every section's query (the counts held, five lines were stale and are
  corrected). Items are filed under four subjects, sections 30 to 34 split into 57 items, 15 closed items set apart, and
  a table says where every section went. It is longer: every item keeps its words, and the structure adds headings.
- **OPERATING.md** is the short way in for a person; the README's quick start points to it.

### The checks

- `verify:fast` lost the coverage campaign's page (`0996187d`), which moved to `verify`.
- The weekly trend job builds the page before the reproducible-build check compares a rebuild with it (`200aca40`); a
  dispatched Verify run takes a fuzz seed.
- `npm run round:close` lists migrations not archived, packets and proposals not in the store, runs the generated
  documents' checks (history marks, decisions index, README status, links, packets, open-problems counts) and prints
  what changed in the frozen estimate stage and text reader since `main`.

### Deviations from the plan, and why

- **The page-read path's working files** go to a folder of the running round (`--out` is required) rather than
  `.cache/readings`: a migration applies proposals from a committed folder, and a round's record should hold them until
  it closes.
- **The gate verdict** got one home per job instead of a vocabulary file: the engine's `GATE_STATUS` says what a
  verdict answers, `labels.js` words it (the decision brief's phrase included), the build ranks it, and a test keeps the
  four with the contract's enum. A CSV in `db.meta` would have added a field and a fallback in each reader.
- **Small rounds** with one to three packets were exported too, so every round folder follows one rule.

### The fuzz case and the weekly check

- **Seed 116.** `node scripts/ui-fuzz.mjs --n 517 --seed 116` reproduced the weekly run's violation (scenario 516, PA66's
  density "Published" under a material-wide assumption). The engine was right: a product's own value decides over an
  assumption. The fuzz's oracle now reads the best product's view in its judged state (`4e49efe8`), and the full 2,000
  scenarios at seed 116 ran with no violation of any invariant.
- **The gate verdict** (`1bcb8af1`) moved the release ID only: `npm run build:diff` showed `release 0cf8d040210f ->
  4b813cc4c0ca` and 0 differences, the snapshot and all 73 interface views matched, and the campaign page was
  regenerated for the new release.

## The closing checks

Run on the owner's machine (Apple M4) on 2026-10-15, before the merge.

| Check | Result |
|---|---|
| `npm run verify -- --enforce-budget` | 18 of 20 steps passed; the campaign page was stale for the new release (regenerated and committed) and the scale budget was over (below) |
| `verify:fast`'s steps | 82.1 s, within the 90 s budget (92.4 s on 2026-10-14) |
| `npm run round:close` | nothing open |
| `npm run build:diff` against `main` | the release ID only |
| Build inputs changed on the branch | none: `git diff main -- build/src build/mappings schema data` is empty |

- **The scale budget** read 179 s against 150 s at twice the data, best of two runs. Nothing the build reads changed on
  the branch; the machine was loaded (load average 11 to 15) while OneDrive synced the 230 MB of packets just exported.
  CI's weekly trend job, run by hand after the push on a clean runner, is the measure that counts.
- **The frozen text reader** changed in one comment line (where it writes its proposals), which `round:close` reported
  as it should.
