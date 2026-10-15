# Architecture and maintainability review, 2026-10-14

> **Historical record** (2026-10-14): written for one review. It describes the tool, its code and its records as they were on 2026-10-14 (commit `17808341`); numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **Corrected on 2026-10-15**, while planning the round that carries these recommendations out
> ([2026-10-15 maintainability round](../2026-10-15-maintainability-round/README.md)). Two figures below were wrong.
> Only 4 decisions are superseded or withdrawn (D10, D40, D42, D132); of the 24 the index does not mark "In force",
> 16 are amended but still in force and 3 (D1, D8, D11) are partly superseded, so they stay in DECISIONS.md. And the
> tree after the moves will be about 1,700 tracked files and 60 MB, not "under 1,000 and 40 MB": the archived
> migrations stay tracked, and the audit tooling and the files living scripts read stay where they are.

**Asked by:** the owner. **Question:** with the repository in good shape, look at the architecture at a high level:
the data and its pipeline, the tool's code and the page, the interface, the tests and how changes are checked. Then
judge scaling and usability: to make this a human-readable, easy-to-maintain repository, should the architecture be
kept and modified, or is it becoming something no person can maintain, or needlessly huge? The one hard constraint is
that the live tool stays on GitHub Pages, and the practical goals in [GOALS.md](../../GOALS.md) hold.
**Reviewer:** Claude (an agent), reading the repository, running its checks, and driving the built page in a browser.
No person has reviewed this judgement yet.

## In short

**Keep the architecture. Cut the weight around it.** The design itself is small, sound and well suited to the
constraint: CSV tables under a schema, one deterministic build, one self-contained HTML page, and a Pages workflow that
only builds and copies. The code that makes the product is about 22,000 lines in 90 files with five runtime
dependencies, and a person who reads [ARCHITECTURE.md](../../ARCHITECTURE.md) can find where any change goes. A rewrite
would throw away the part that makes the tool trustworthy (every number traced, every rule checked, every change
diffed) and gain nothing the constraint asks for.

**What makes the repository look huge is its record, not its code.** Of 6,316 tracked files, about 430 are the
product, its tests and its living tools. The other 5,900 are history: 2,136 files of audit packets under `docs/audits`
(159 MB, 1.16 million lines of CSV and JSON), 3,230 files of 2026-09-18 import proposals under `archive` (82 MB), and 424
one-off migration scripts (37,000 lines) that have run and will never run again. Three living documents have become
diaries: the decisions file is 4,600 lines, the open-problems file 1,600 lines in 35 sections organised by round, and
GOALS carries 500 lines of dated owner decisions after its 150 lines of goals.

**Where the architecture itself costs more than it decides.** The estimate stage is a quarter of the build's code and
90 % of its time, and it changes 32 of 673 candidate answers across the six templates (5 %), never a PASS. The import
reader (`scripts/ingest/propose.mjs`, 3,600 lines and 535 regular expressions) grows with every data sheet layout; the
project has already moved to having a model read page images and the code check the quotes, which is the path that
scales. Neither should be deleted; both should stop growing.

**Five moves, in order.** (1) Move history out of the working tree: migrations to `archive/`, audit packets and the
import proposals to the evidence store that already backs up the source documents, keeping the Markdown reports and the
thirty files the living scripts still read. (2) Give a person one short entry: the five commands and three recipes,
with [AGENTS.md](../../../AGENTS.md) kept as the full rule book. (3) Make the decisions index the document and move
superseded decisions to an appendix; organise open problems by subject with generated counts; move the dated log out of
GOALS. (4) Freeze the estimate stage and the regex reader as they are, and measure the estimate stage's share of answers
at every round. (5) Write down the thresholds at which the single-file design must change (page size, build time, table
size) and the first change at each, so growth is planned rather than discovered.

**What the Pages constraint needs.** Nothing more than it has: the page is one 8 MB file built in CI from the tables;
Pages allows 100 MB per file and the site serves from the root. The design holds to roughly three times today's data
before the page or the build need splitting (section 7).

---

## 1. What was looked at, and how

Every number below was measured on 2026-10-14 against commit `17808341` with the commands in section 10, except where a
date says otherwise. The built page was driven in headless Chrome to take the screenshots in `screens/`; `npm run
verify:fast` and `npm run verify` were run on the owner's machine (Apple M4, Node 26.9).

| Area | Files | Lines | Size | What it is |
|---|---:|---:|---:|---|
| `data/tables` | 31 | 40,500 | 20 MB | The source of truth: 31 CSV tables, about 360 columns |
| `schema` | 86 | 6,900 | 0.5 MB | 31 table schemas, 50 vocabularies, the compiled-output contract |
| `build/src` | 58 | 9,170 | 0.7 MB | The build: check, load, normalise, compile, estimate, validate, bundle |
| `app` | 29 | 12,800 | 0.9 MB | The page: engine 2,100, interface 7,900, state 1,100, CSS 1,600 |
| `test` | 94 | 15,600 | 1.2 MB | 85 test files, 898 test cases; 23 files need a built database |
| `scripts` (living) | 105 | 23,500 | 2 MB | Data tools, import pipeline (12,300), audits, verification, trace, SQL |
| `scripts/migrate` | 424 | 37,300 | 4.4 MB | 370 one-off migrations (median 48 lines) and their data files |
| `docs` top level | 13 | 12,700 | 1 MB | The living documents, two of them generated |
| `docs/audits` | 2,136 | 1,190,000 | 159 MB | 42 dated rounds: 204 Markdown files (30,300 lines) and 1,932 packet files |
| `archive` | 3,230 | | 82 MB | 3,188 JSON import proposals of 2026-09-18, the workbook conversion, one research package |
| `.git` | | | 111 MB | 565 commits in four weeks (2026-09-11 to 2026-10-08), 525 co-authored by an agent |

The working tree the owner keeps also holds 4.1 GB of cached source documents and text under `.cache` and 209 MB of
staged maker archives, both ignored by git and both needed by the checks that compare values with their pages.

The same question was asked on 2026-09-15 ([architecture review](../2026-09-15-architecture-review/REPORT.md)). Its
answer, "the skeleton is right, the burden has four sources", still describes the code: three of its four burdens were
removed (estimates became a stage, records moved from code to tables, verification got a fast tier). The fourth,
"documentation carried state", has come back in a new form, as volume, and a fifth has joined it: the process record
now lives in the working tree beside the product.

## 2. The data and its pipeline

**The tables.** Thirty-one CSV tables, every column declared in a JSON schema with its type, its allowed missing states
and its references to other tables, checked in about a second before anything is compiled. Raw text from the sheet
sits beside a typed column the build reads, and a parser checks that the two agree (D49, D115). The 15,418 measurement
rows carry 35 columns; 39 % of their cells are an explicit missing state ("Not published", "Not applicable"), and the
1,915 print profiles carry 43 columns with 41 % missing states. Nothing derivable is stored; a material's headline, its
price median and its coverage are computed. IDs are never reused and records are never deleted, only retired, with a
ledger for the few the build now derives.

*Judgement.* This is the right shape for a reviewed, diffable database of a few tens of thousands of rows, and it meets
the "every number traced" goal directly: each measurement names its source document, page and locator, and the source
row carries the document's SHA-256. It is not human-readable row by row, and it does not need to be: the read-only
Excel export and the generated SQLite file are the reading views, and the build is the integrity check. The wide,
sparse rows (nozzle, bed and chamber each take five columns of a profile) are the cost of typed-beside-raw, and the
2026-09-15 review already judged that cost worth paying. No change recommended to the tables.

**Migrations.** A correction against a re-read source is a script that names the value it replaces; a re-run is a
no-op and a run after the data moved stops. There are 370 of them, m10 to m413, written at up to 41 a day. They are
correct by construction and they are history: none will run again, and the data they changed has moved on. They sit in
`scripts/migrate` beside the living tools, are listed in the module map, and make `scripts` two and a half times its
living size. Four files among them are imported by living code and tests and must stay reachable: the helpers
`source-edits.mjs`, `read-proposals-apply.mjs` and `coverage-clause.mjs`, and migration m290, whose profile-settings
reader the import's `read-proposals.mjs` reuses.

*Judgement.* Keep the mechanism; move the history. A migration's value after it has run is the same as a commit's:
provenance. The data changelog (`npm run data:diff`), the commit message and the round's report already carry that.

**The import pipeline.** Twelve thousand lines in 34 scripts: fetch and fingerprint a document, extract its text page
by page, propose rows from the text, review, batch, apply through a migration that checks every number on its page.
The reader at its centre, `propose.mjs`, is 3,578 lines with 535 regular expressions, one per layout or wording some
maker's sheet uses. Since the reader round (D125) a second path exists: a model reads the page image, and
`read-reconcile` and `read-proposals` check each reading against the cached text in four views and write proposals a
migration applies quote by quote.

*Judgement.* The regex reader was the right first tool and has reached the shape every hand-written document reader
reaches: each new sheet adds a rule, and a rule added for one maker can misread another (the check round found exactly
that, "words in the wrong column"). The model-read path with code as the checker is the one that scales with the number
of makers, and the repository already has its guards (the context audit compares every value with its page). The
reader should stop growing and become what it already half is: the guard that checks what a model read.

## 3. The build and the page

**The build.** `build/src/index.js` runs the stages in order and refuses a database that does not validate: schema
gate, load, normalise (free text to typed values), compile (each product's value chosen by rule from its own
measurements, each material the spread of its products), estimate (an overlay on the complete core), validate, contract
check against a JSON schema, bundle. The result is cached by a hash of everything it reads, which is what keeps the
fast check inside its budget. A release is a digest of its content and travels with every saved scenario.

| Build stage | Lines | Time, cold (2026-09-28 bench) | Time at twice the data (2026-10-08 scale check) |
|---|---:|---:|---:|
| Check, load, compile, validate, bundle | about 6,100 | 1.5 s | 1.5 s without estimates |
| Estimate stage (`estimate/` and its configuration) | about 2,450 plus 521 lines of JSON | 14.0 s of 15.5 s | 84.8 s of a 150 s budget |

The estimate stage fits one Gaussian model per headline over every observation, converts each to the headline's
semantics, back-tests which evidence may screen a material out, floors and bounds every range by physics and by the
product's own measurements, calibrates at grade level, and since D137 certifies product-level exclusions on an
independent split. It is the source of at least fifteen of the 137 decisions and of the only "over-built" mark on the
scorecard (C12). What it decides, from the committed snapshot of the six templates: of 673 candidate rows under
"Include uncertain", estimates screen out 32 (5 %), and they never make anything pass; 138 of the 846 material headline
cells are estimates, the rest come from products.

**The page.** Plain ES modules, no framework, inlined by esbuild into one file with the gzipped database (36 MB raw,
3.3 MB embedded) and the plotting library (4.3 of the page's 8.2 MB). The engine (2,100 lines) is pure and never
imports the interface, which is why the engine and the rendered page can be compared over thousands of random
scenarios. The interface's largest modules are the material drawer (1,768 lines, 81 functions), the Ashby decision views
(973) and the chart (871); `main.js` (1,116) is the one place that holds state. Every property, filter, axis, column and
export header comes from the registry the build compiles from `headline_definitions.csv`, so a new selectable property
is a row, not code.

**Where the layers know the same thing.** A new gate verdict is added in three places (the build's precedence list,
the engine's switch, the interface's words); a product's decision states are built by `build/src/products.js` and read
back by `app/js/engine/products.js`; the page keeps code for scenarios saved under version 1 and for databases built
before product states existed. These are documented and small, and the fuzz would catch a drift between them, but each
is a place a newcomer has to learn twice.

*Judgement.* The build and the page are the healthiest part of the repository: small, documented stage by stage, with
one module per concern and the reasons written above the code. The estimate stage is the one component whose cost (a
quarter of the build's code, 90 % of its time, the largest share of the decision log) is out of proportion to what it
decides, and the owner has twice chosen to keep screening (2026-09-15, D137). The honest recommendation is not to
remove it but to freeze it (D58 already requires a decision and a back-test row for any new physics rule), to keep its
share of answers in the round report, and to keep it off the critical path as the data grows (section 7).

**The Pages constraint.** Met exactly: `verify.yml` runs the data and interface checks side by side on each push,
`pages.yml` rebuilds the page from the tables on the commit that passed, keeps it as a GitHub release, and deploys one
HTML file, the validation report and the manifest. No server, no database at run time, no secrets. The page works from
disk with the network off. Nothing in the recommendations below touches this.

## 4. The interface

Screenshots of the built page on 2026-10-14 are in `screens/` (laptop 1400 px and phone 390 px, dark theme):

- [`01-default-laptop.png`](screens/01-default-laptop.png): the opening panel, the four-step line, six templates, the
  honest count line ("147 have a density, 101 a modulus, 108 a price").
- [`02-outdoor-strict.png`](screens/02-outdoor-strict.png): the Outdoor structural part template under Confirmed
  only: 7 of 152 materials, the requirement pills, "Allow annealing: 4 more pass", the table with passing range,
  all-products median and count in each cell.
- [`05-drawer-products.png`](screens/05-drawer-products.png): the drawer's Products tab: the passing product first,
  its print settings each with a verdict chip, its values, a Choose button.
- [`08-ashby.png`](screens/08-ashby.png): the Ashby lens: goal, the question as asked, Draw and Also rows, axes with
  linear or log, the passing products listed by material.
- [`09-explain.png`](screens/09-explain.png): Why excluded: each requirement ranked by what it costs, with "removing it
  would bring back N".
- [`12-phone-outdoor.png`](screens/12-phone-outdoor.png): the same template on a phone.

*What works.* The page is coherent and written for an engineer: a template is a starting point and says what it does
not check; the drawer answers "does it pass, on which product, and why" before anything else; every number has a
source button; the H2C print gates show as chips with the product's own settings beside them; absence is shown as a
count, never as zero. The Why excluded view is the clearest explanation of a filter result the reviewer has seen in a
selection tool. The phone layout stacks without breaking. The interface check records what a reader sees on three
screen sizes and fails on an element off screen or a table cell too narrow, so this does not regress silently.

*What is heavy.* Three separate controls govern what is shown (the Confirmed only / Include uncertain switch and the
estimate switch at the top, the PASS / UNKNOWN / FAIL / SCREENED chips at the bottom), and a newcomer has to learn all
three before the counts make sense. The table packs three lines into each cell. The Ashby lens has eight controls
above the chart and is an expert's view. The Printing tab prints a guide cell verbatim ("Smooth PEI Plate(90 - 100 °C)
Textured PEI Plate(90 - 100 °C)"), which is the source's words by design but reads as raw data on screen. None of these
is an architectural problem; each is a copy or layout decision the owner has been making round by round (D108 to
D112, D124), and the team trial that would settle them (scorecard C7) has not been run.

*Judgement.* Keep. The interface code is large for a page with no framework but it is organised by lens and by
concern, the words live in one module, and the engine is testable without it. The one structural option worth
noting for later is the plotting library: 4.3 of 8.2 MB for one lens, where the parallel-coordinates lens is already
hand-drawn SVG. It matters only if page size ever matters.

## 5. Tests, and how a change is checked

Nine layers, from cheapest to most expensive, and every one runs before a push:

1. The schema gate (a second): columns, types, missing states, vocabularies, references, canonical form, manifest.
2. Lint findings with codes, fixed or accepted with a reason; the physics findings among them.
3. Parser checks: the typed columns against the raw text (PARSE-MISMATCH) and a review naming only the columns it
   explains.
4. Build validation: over a hundred coded rules, errors stop the build, warnings are per-record and reviewed.
5. Unit tests of the normalisers, each failure that shipped pinned with its wording in the comment; engine tests;
   an acceptance portfolio of twelve questions whose answers were written from the sources before the code;
   seven metamorphic relations (a change that cannot make an answer better must not).
6. The committed snapshot: every headline, gate, template answer and warning as CSV, and the rendered text of 75
   interface views; a change commits its diff as its downstream effect.
7. Three hundred random scenarios through the built page compared with the engine in Node (2,000 weekly on a new
   seed).
8. The context audit: each value's own line, page statement and print setting compared with its cached sheet.
9. Blind draws by a reader that did not write the records, measured per round (the latest: 1 of 20 cells wrong, none
   deciding).

| Measured on 2026-10-14 | |
|---|---:|
| `npm run verify:fast` | 92.4 s, over its 90 s budget by 2.4 s ("build and tests" 79.0 s, campaign status check 7.8 s) |
| Tests run in it | 581 pass, 0 fail, 73.6 s |
| `npm run verify` (every step, run after the fast tier) | 490 s (8 min 10 s), all 18 steps passed; the fast tier's steps took 82.2 s on this second, warm run |
| Test cases in `test/` | 898 across 85 files |

*What is strong.* The guards are what let agents do 525 of 565 commits without a person checking each: a wrong value
is caught by its page, a wrong rule by the acceptance questions, a drift between page and engine by the fuzz, a changed
answer by the snapshot diff. `npm run trace`, `npm run sql`, `npm run build:diff` and `npm run doctor` are the debugging
tools a maintainer actually needs, and they exist.

*What costs.* The snapshot design means every data change rewrites the interface text files, so those are the most
changed files in the history after the manifest (each of the six Include-uncertain template views changed 110 to 119
times in four weeks); a reviewer reads large diffs to find the one line that matters. Twenty-three test files need a full build, and
`database.test.js` (1,117 lines) pins individual records, so a legitimate data change can fail a test that is not about
the change; the 2026-09-15 review chose to keep those pins. The fast tier has crept to its budget as checks were added
to it (the campaign status check alone is 8 % of it and describes a historical campaign).

*Judgement.* Keep every layer; the verification is the architecture's second half. Two adjustments: move the
campaign status check out of the fast tier (it belongs with the generated documents in `verify`), and let the
interface snapshots record what a reader can compare (counts, verdict sets, the first rows) rather than the whole
table's text, so the diff a data change produces is the size of the change.

## 6. The documents and the records

| Document | Lines | What it has become |
|---|---:|---|
| `docs/DECISIONS.md` | 4,607 | 137 decisions, 113 in force, each with "what breaks if reversed"; a 156-line index |
| `docs/OPEN-PROBLEMS.md` | 1,643 | 35 sections, 2 marked closed, the last six titled "what round X leaves open" |
| `docs/GOALS.md` | 671 | 150 lines of goal, method, scorecard and rules, then 500 lines of dated owner decisions |
| `docs/INTERFACE.md`, `DATA-MODEL.md`, `ARCHITECTURE.md`, `HOW-IT-WORKS.md` | 3,270 | Current, dense, cross-referenced; reconciled against the data on 2026-10-07 |
| `AGENTS.md` | 317 | The rule book for changing data; the first thing a newcomer is told to read |
| `docs/DATA-DICTIONARY.md`, `docs/RULES.md` | 1,880 | Generated and checked; the right way to keep a count current |

How they grew, with the code, over the project's four weeks:

| Date | Source lines (build, app, living scripts) | DECISIONS | OPEN-PROBLEMS | GOALS |
|---|---:|---:|---:|---:|
| 2026-09-11 | 3,820 | 0 | 0 | 0 |
| 2026-09-20 | 21,900 | 1,815 | 258 | 0 |
| 2026-09-28 | 31,300 | 3,188 | 785 | 243 |
| 2026-10-08 | 43,900 | 4,607 | 1,643 | 671 |

The audit folders hold 204 Markdown reports (30,300 lines, readable, each marked historical) and 1,932 packet files:
proposals, held readings, reconciliation outputs, render dumps of up to 9 MB each. Four rounds account for 120 MB of
the 159 (coverage expansion 42 MB, gap round 2 29 MB, the reader round 26 MB, gap closing 23 MB). About thirty of those
files and folders are still read by living scripts and tests (the campaign status, the acceptance questions, the reading schema,
the know-how worklist, the retired hand picks, two verdict files the README's status block counts from); the rest
are evidence of what an agent read on a given day.

*Judgement.* This is where "huge" lives, and it is the one place the question's worry is justified. The living
documents are accurate (the 2026-10-07 reconcile re-derived about 570 claims) but no person can hold 4,600 lines of
decisions or 35 sections of open problems in mind, and the per-round sections mean the same problem is described in
three places as rounds pass. The packets are provenance, which the project rightly values, but provenance belongs in
an evidence store with a digest in the report, not in the tree a maintainer clones, searches and reads. The project's
own rule, "nothing is deleted", is a rule about data records; it has been applied by habit to code and to packets.

## 7. Scaling: where the design holds, and what changes first

The owner's working rule 7 says to re-check decisions when the data triples. These are the thresholds, with the first
change at each; every one keeps the Pages deployment and the single page.

| What grows | Today | Holds to about | First change when it does not |
|---|---|---|---|
| The page | 8.2 MB (database 3.3 MB embedded, plotting 4.3 MB) | 3× the data (about 15 MB; Pages allows 100 MB per file) | Ship the measurements as a second static file beside the page, fetched when a drawer opens; the page stays offline-capable from disk when both files are present. Then replace the plotting library for the one lens that uses it |
| The database in the browser | 36 MB parsed, 18 MB of it measurements | 3× (a parse of 100 MB takes seconds and about 1 GB of memory on a laptop) | The same split; drop the repeated long strings (print parameters appear on every row) in favour of a reference |
| The estimate stage | 14 s at 1×, 85 s at 2× | 2.5× under its 150 s budget; CI builds it cold on every push | Cache the stage's result in CI keyed by the hash of its inputs (the tables, the model's code and configuration); the local cache already does this. Nothing changes in the result |
| `verify:fast` | 92 s | At the budget now | Section 5's two adjustments; then move the import tests' fixtures out of the build path |
| The tables | 15,400 measurements, 1,180 products | Tens of thousands of rows; the gate is one second | Nothing: CSV under a schema scales further than a person's ability to review it |
| The results table | 152 materials, 1,105 products | 400 materials | Virtualise the rows |
| Adding a data sheet | The import pipeline, a batch at a time | Bounded by reading, not by code | The model-read path (section 2) |

## 8. Keep or restructure: the judgement

**Keep the architecture.** The three layers are the simplest design that meets the brief: a reviewed text database, a
build that refuses a wrong one, a page that cannot drift from it, deployed by copying a file. The parts that are large
are large because the problem is (a thousand products' data sheets in a hundred layouts, physics across polymer
families), not because the design is wrong, and the parts that were wrong on 2026-09-15 were fixed. A rewrite would
have to rebuild the traceability, the checks and the decision record before it reached today's trust, and the result
would be the same three layers.

**What is not human-maintainable is the surface, not the structure.** A person opening the repository meets 6,316
files, 70 npm scripts, 137 decisions, 35 open-problem sections and a 317-line rule book before they find a 9,000-line
build and a 13,000-line page; about 430 of those files are the product, its tests and its living tools. The repository has been shaped by and for agents (93 % of commits), and agents are good
at holding all of that; a person is not. The remedy is to move the record out of the way and write one short entry for
people, not to change what the agents work on.

**One structural risk to name.** The project cannot today be operated without an agent: a round reads hundreds of
pages, writes migrations with guards, and reconciles the documents. The checks make that safe, and the owner has
decided it. But the owner should know that the bus factor is the owner plus an agent, and that the mitigation is the
same as the remedy above: a person must be able to do the three common things (fix a value, add a sheet, publish)
from a two-page guide, with the full rule book behind it.

## 9. Recommendations, in order

Each names what it costs, what it changes and how to check it. None changes a verdict, a number on the page, or the
Pages workflow; each should show `0 difference(s)` in `npm run build:diff`.

1. **Move history out of the working tree.** Migrations m10 to m413 and their data files to `archive/migrations/`,
   keeping the four files living code imports in `scripts/migrate/` (or moving them to `scripts/lib/`) and updating
   the four import paths. The 1,900 packet files under `docs/audits` and the 3,188 proposals under `archive` to the
   evidence store that already holds the source documents (`npm run data:sources -- --export`), each round's report
   keeping a digest and a path. The thirty files living scripts read stay where they are, or move with the scripts
   that read them. *Target:* under 1,000 tracked files and under 40 MB, with the git history untouched. *Check:*
   `npm run verify` green, `npm run docs:history -- --check` green, every link in `docs/audits/README.md` resolving.
2. **One entry for a person.** A two-page `docs/OPERATING.md` (or the README's quick start trimmed to it): what the tool
   is, the five commands, and the three recipes (correct a value, add a sheet, publish), each pointing at the AGENTS.md
   section it summarises. AGENTS.md stays the rule book. *Check:* a person who has not seen the repository fixes one
   value from the guide alone.
3. **Make the living documents readable.** DECISIONS: the index is the document; the bodies of the 24 superseded,
   amended or withdrawn decisions move to `docs/DECISIONS-ARCHIVE.md`, and a new decision is capped at a screen. GOALS:
   keep the goal, method, scorecard and working rules; the 500 lines of dated decisions become `docs/GOALS-LOG.md`.
   OPEN-PROBLEMS: reorganise by subject (values makers do not publish, source conflicts, model limits, what needs a
   person), one generated table of counts at the top, and no more "what round X leaves open" sections: a round folds
   what it leaves into the subject it belongs to. *Check:* the decisions index and the status block are already
   generated and checked; add the counts table to that.
4. **Freeze the two components that grow with data.** The estimate stage: no new conversion kinds or physics rules
   (D58 already asks a decision and a back-test row of each; this makes "none this round" a round-close check), and its
   share of answers (today 32 of 673) in every round's report. The regex reader: no new layout rules; a sheet the reader cannot read goes through the model-read path with
   the reader as the guard, and IMPORTING.md says so. *Check:* `git diff --stat` of `build/src/estimate/` and
   `scripts/ingest/propose.mjs` at each round's close.
5. **Write the scale thresholds down** (section 7) in ARCHITECTURE.md under Scale, with the first change at each, and
   add the CI cache for the estimate stage when the scale check first exceeds 100 s at 2×. *Check:* the scale check's
   `build/reports/scale.json` each week.
6. **Bring `verify:fast` back under budget.** Move the campaign status check to `verify`; record interface snapshots as
   counts, verdict sets and first rows. *Check:* `npm run verify:fast -- --enforce-budget` on the owner's machine.
7. **Small debts.** The gate verdict's words into a vocabulary CSV the build and the page both read, as environment
   categories already are. The version-1 scenario and pre-state database paths in the page can go once the kept
   releases older than D107 are known to hold no saved scenarios anyone needs. The plotting library only if page size
   becomes a reason.
8. **A rule for rounds.** A round archives as much as it adds: its packets go to the evidence store at its close, its
   open problems go into subjects, and `npm run docs:history` and the reconcile of living-document claims run before
   the push, as the 2026-10-07 reconcile did.

## 10. Limits of this review, and how each number was derived

One reviewer, an agent, in one day; no team trial; no profiling of the page beyond the scale check's record; the
judgement of the interface is from use, not from a user. The previous review's deferred items (sentinels with reasons,
a vocabulary for 249 spellings of a test standard, archived duplicate rows) were not re-examined.

```bash
git ls-files | wc -l; git ls-files | awk -F/ '{print $1}' | sort | uniq -c        # tracked files by area
git ls-files -z | xargs -0 du -k | awk -F'\t' '{split($2,a,"/"); s[a[1]]+=$1} END {for (k in s) print s[k], k}'
git ls-files docs/audits | sed 's/.*\.//' | sort | uniq -c                            # packets by extension
for d in docs/audits/*/; do du -sm "$d"; done | sort -rn | head                        # the four heavy rounds
git ls-files build/src app scripts test | xargs wc -l                                  # code by area
ls scripts/migrate/m*.mjs | wc -l                                                      # migrations
grep -c '^| D[0-9]* |' docs/DECISIONS.md; grep -c '^## ' docs/OPEN-PROBLEMS.md         # decisions, open-problem sections
git log --oneline | wc -l; git log --format='%b' | grep -c Co-Authored-By              # commits, agent co-authored
for rev in cfa4e607 cec3e07b c659b84f 17808341; do git show $rev:docs/DECISIONS.md | wc -l; done   # growth
node -e '…dist/db.json…'                                                               # database keys by size (section 3)
cat build/reports/bench.json build/reports/scale.json                                  # build timings, 1× and 2×
npm run verify:fast; npm run verify                                                    # timings in section 5
# estimates' share of answers: build/snapshot/templates.csv, rows whose Mode is "Explore with estimates" and
# whose Candidate is "screened", against rows whose Mode is "Explore"
grep -rn "docs/audits/" scripts/data scripts/lib scripts/audit scripts/ingest scripts/*.mjs build/src test app   # the thirty living reads
```
