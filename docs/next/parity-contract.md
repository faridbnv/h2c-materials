# The parity contract (one page, for the owner)

> **In short.** Parity is the check that proves the rebuilt tool gives the same answers as the old one. The old engine and the new engine are fed the same questions on the same current data, and every answer, reason and cited record is compared. If anything differs, the check fails unless that exact difference is written down in advance and you approved it. Nothing here proves the old answers are *right*; it proves the rebuild did not *change* them. This is your ruling OQ-03 made into a check: "the physics of data and material science decision should remain the same but the structure can change."

**Status: waiting for your approval** (answer at the end). Built in WP-05 (a) and completed in WP-05 (b). Run it with `npm run parity -- --noop`. Measured 2026-10-21 on the owner's Mac, Node 26.9: the engine part alone (the full 1,306-question run) takes about 90 to 100 seconds; the whole pull-request run, with the four checks WP-05 (b) adds, is timed in "How long it takes" below.

## What is compared

The harness asks the same set of questions of both engines. Today that set ("corpus v0") has 1,306 questions:

- the 6 starting templates in 5 modes (Strict, Strict with annealing, Explore, Explore with estimates, and Explore with estimates when annealing and humid service are allowed): 30 questions;
- the 138-case decision census, each case with estimates on and off: 276 questions;
- 1,000 random multi-requirement scenarios from a fixed seed (7), so the same 1,000 are asked every time: 1,000 questions.

For each question it compares, **record by record** (a material, a product, or a requirement of a product, each named by its stable ID), at four levels:

| Level | What it holds |
|---|---|
| **Decision** | pass / fail / unknown, listed or not, hidden or not, the group (meets, one check away, not enough data, unlikely, hidden, fail), "likely", the product and state shown as best, the counts of passing / failing / untested products, the order of the list, and the Ashby ranking place |
| **Presentation** | the gap to the limit, "some products fail", "needs verification", the order of products inside a material, the treatment and moisture of the state shown |
| **Evidence** | for every product and requirement: its status, the flags (on the line, thin margin, sheets disagree, ceiling only, estimated, hidden, not applicable) and every record it cites (measurement, ledger rule, evidence, price, context, veto) and what is missing |
| **Wording** | the exact reason sentences, the group reasons, the criterion text |

Numbers are compared exactly (no tolerance); `0` and `-0` count as different, and a missing field is different from an empty one. The pack file 07 section 5.3 files "group", "likely", "best" and "list order" under presentation (T1). Here they are filed under **Decision**, as you asked, which is the stricter reading: a move there is treated as a change to the decision itself.

## What else it checks (added in WP-05 b)

The 1,306 questions are one of five checks. `npm run parity -- --noop` runs all five and prints one line, `RESULT: zero`, when every one is clean. Each can be asked for alone with `--surface <name>`.

| Check (`--surface`) | What it does | How it can fail |
|---|---|---|
| **engine** | The 1,306 questions above, four levels each. | Any field of any record that differs. |
| **ties** | Puts every material's products in a different, seeded order and asks 110 of the questions again. Where products tie, the old engine's rule is "the first one in the list wins", so the answer must follow the order exactly: the harness predicts, from the old engine itself, which product must represent each material, and the other side must agree. A sample with no ties would prove nothing and is reported as "not computable". | The other side picks a different tied product; any other answer differs. |
| **links** | Opens 53 old links and saved scenarios (found in the repo's tests and docs: version 1 and version 2 links, the six landing-page templates in both forms, files that must be refused, a link with the known `x:3` quirk) plus the "back to the selector" link of each built page (82, every one of which must open), with both sides' link readers, and asks the engines the distinct questions they contain. | A link that opens differently, is refused differently, speaks different warnings, or is answered differently; a back-link that does not open; no back-links found at all (not computable). |
| **build** (P-build) | Builds the database again in a temporary copy of the project and compares `db.json` with the one in `dist/` path by path (1.29 million values), the way `npm run build:diff` does, and also compares the order of every list of records and looks for a record listed twice. `--tables-dir <folder>` (with `--surface build,pages`) builds both sides from another folder of tables inside the temporary copy, never touching `data/tables`: it shows that those tables build the same twice and gives the build a tables folder to be tested with; to see what a change did, `npm run build:diff` still does that. The tests change one cell in such a folder and show the comparison naming it. **Since WP-20 the new side is real:** in the default (`--new`) mode the first side is `dist/db.json` (or an old build of the `--tables-dir` tables) and the second is the new build (`packages/build`, TypeScript, reading the clean SQLite reconstruction of the same tables, estimate stage unchanged), run into a temporary folder so nothing in the project is written; `--noop` still compares two old builds. | Any value that differs, or a build that cannot finish (not computable). |
| **pages** (P-pages) | The visible text of all 248 material pages, with each link's target, the labels screen readers read (aria-label, title, alt, placeholder) and the data each page carries for its script, compared page by page. A page that cannot be read to its end is an error, never an empty page. The release number, the build date and the release-stamped selector file name are replaced by placeholders so two releases can be compared. | A dropped section or source line, a changed word or link, a missing page. |
| **core** (core sufficiency, WP-25) | The same questions as **engine**, put to the new engine fed only what the site publishes: the database cut to the declared field list of the `core` part (`CORE_FIELDS`, `packages/domain/src/core/core-fields.ts`), and for a question that uses estimates (exploration with the switch on) the estimates part joined on, cut to `ESTIMATE_FIELDS`. Both lists are the objects the writer and the page use, so what is checked is what ships. Every other field of the database is absent, so an engine that reads one gets `undefined` and its answer moves. The old engine on the whole database is the other side. This is the check that would have caught the Flexible component counting 10 to 11 "not enough data" when a trimmed core lost a field. The historic links also open on the core, in the test suite. `tests/parity/core.test.mjs` keeps the faults: a field dropped from the core or from the estimates part makes the comparison non-zero, and the development guard (a Proxy over the whole database that throws on a field the declaration lacks) names it. | Any field that differs; a field the engine starts to read that the declaration lacks. The fix is to add the field to the declaration, never to the check. |

`--milestone` is the milestone size: 5,000 seeded questions instead of 1,000 (the first 1,000 are the same ones), the whole census, and a larger tie sample (468). Run it with `--noop` to check the harness itself, or with the new side when it exists. `--surface core` is computable since WP-25 and is never part of a default run; with `--milestone` it is the exit check of the data-delivery package (the whole census and the 5,000 replays, zero differences). Measured 2026-10-22 on the release 7c6da496722d database: 5,306 of 5,306 questions compared, 23,268,611 records, 0 differences at all four levels (23 minutes; the old engine on the whole database against the new engine on the cut parts).

None of the new question lists is a file. They are produced by code from seeds kept in `packages/parity/src`, and `tests/parity/` pins their fingerprints, so changing one fails a test instead of quietly changing what is asked. (`parity/corpus/` needs your approval to change, and nothing there was touched.)

## What counts as a difference

Any one field of any one record that is not identical on both sides, a record that appears or disappears, or a case that cannot be answered. One report line names the question, the record, the level, the field, and the value before and after. There is no "small enough to ignore".

## "Not computable"

If one side cannot answer a question (an engine crashes on a case, a field is unreadable) the result is **not computable**. It is its own outcome. It is never counted as zero, never as a pass and never as equal to another not-computable result. The run exits with a failure code and lists every place. `npm run parity -- --placeholder` runs old against a new side that answers nothing, and must report "not computable" for every question, not "zero differences."

## Outcomes

| Outcome | Meaning | Exit |
|---|---|---|
| **zero** | no difference at any level | passes |
| **matches transition** | the differences are exactly the ones listed in an approved transition file | passes |
| **differs** | any other difference, including one extra or one missing | fails |
| **not computable** | some question could not be answered | fails |

### Exit codes of `npm run parity`

Every outcome has its own code, so a script (CI, a hook, a person) never has to read the text to know what happened. The CLI accepts only the flags in its header; an unknown flag, a stray argument, a repeated flag, or a flag used as the value of another flag is a usage error (64) and nothing runs.

| Code | Meaning |
|---|---|
| 0 | zero differences, or exactly the differences a transition file lists |
| 1 | differs (and only that: a crash never exits 1) |
| 2 | not computable: some question could not be answered (`--placeholder` is the self-test of it) |
| 3 | a fault was injected and NOT caught: the harness is blind to it (the self-test failed) |
| 4 | a partial run (`--only`) that shows zero without `--allow-partial` |
| 5 | a fault was injected and caught: the self-test passed. This is the expected exit of `--fault <name>`; it is not "differs" and not a crash. With `--transitions`, the transition decides (0 or 1). `npm run parity:mutate` (all nine faults at once) exits 0 when 9 of 9 are caught and 3 when any is missed |
| 64 | bad usage: unknown flag, stray argument, repeated flag, missing value, a flag used as a value, unknown fault, `--noop` with transitions, a transition from a run that cannot yield one |
| 70 | the tool crashed (an uncaught error: a bug, a missing `dist/db.json`, an unreadable corpus). It is not a verdict; the error is on stderr |

CI runs `npm run parity -- --noop` after `npm run build` and fails on anything but 0. The last line of every run is the one `RESULT:` line, and it agrees with the exit code: a partial run (exit 4) prints `RESULT: partial` and a fault that was not caught (exit 3) prints `RESULT: fault-not-caught`; otherwise it is the outcome word (`zero`, `matches-transition`, `differs`, `not-computable`). A crash includes a module that fails to load: it exits 70, never 1.

### The new side today (WP-11)

`npm run parity -- --new --surface engine,ties` compares the old engine with **the old engine behind the typed wrapper** (`packages/engine`, [contracts.md](contracts.md)): the answer the wrapper gives, as a consumer reads it, against the answer the engine gives. The links and pages surfaces stay "not computable" on the new side until WP-17 and WP-24 wire them (the build surface has been wired since WP-20), so a run of all five exits 2. Zero means the wrapper loses nothing and changes nothing; it is not yet a port. The wrapper runs over its own copy of the engine files and its own typed parse of the database, so nothing is shared with the old side. Measured 2026-10-21: 1,306 questions, 5,663,780 records, no difference at any level; the first-wins ties surface (110 cases, 16,390 materials with the product order shuffled) also zero; about 2.5 minutes. `tests/parity/new-adapter.test.mjs` runs a subset that keeps every group, shows that a fault in the wrapped engine and a fault in the wrapper's own output are both caught, and shows the comparison holds when the wrapper's answer goes through a structured clone (nothing depends on object identity).

### The new side from WP-18: ported modules

From WP-18 the wrapper's engine is a **staged directory** (`packages/engine/src/port/stage.ts`): the old engine files, with the modules named by the port switch (`WIRED` in that file) replaced by their TypeScript port (`packages/engine/src/port/<module>.ts`). A ported module and an old one import each other through re-exports in the staged directory, so each module has one instance whichever side of the switch it is on. Eight modules are switched in: `pareto`, `filler`, `search`, `coverage`, `ledger`, `products`, `indices`, `scenario`. `constraints` and `workspace` are WP-19 and still run as the old files. `ATLAS_ENGINE_PORT=none` runs the new side on the old files only, `ATLAS_ENGINE_PORT=ledger,products` runs a chosen subset, and unset means the committed switch; the parity run prints nothing about it, so a per-module result is a run with the variable set.

A port is first a **label step**: the old file with type labels added and nothing else. `npm run parity:erase` (pairs in `remake/p-erase.json`) strips the labels and requires the text to equal the old file token for token, comments included; parentheses that group nothing, which a cast leaves behind, are ignored. The new side of the harness also opens links and saved files through the wrapper's engine, so `--surface engine,ties,links` runs the historic-link corpus against the ported `scenario`.

`pareto`, `search` and `coverage` are not called by any scenario the engine surface asks, and the decoders of `scenario` are not called by the engine surface at all. `tests/parity/port.test.mjs` compares every export of every ported module with the old module on the real database and on seeded awkward inputs (ties, non-finite numbers, 6,000 edited scenario files), shows the ported module is what runs by planting a fault in a copy of a port and requiring the harness to see it, and runs the link corpus through the ported `scenario`.

### The new side from WP-19: constraints, result types, reason codes and constraint IDs

`constraints` and `workspace` run from their ports too (ten modules in the committed switch). WP-19 is six steps, each its own commit with its parity run, in the order the plan fixes (plain conversion first, then the two design changes, never in the same step):

| Step | What changes | What proves it |
|---|---|---|
| 1. Label | `constraints.js` and `workspace.js` copied with type labels only | P-erase 0 (both pairs in `remake/p-erase.json`); P-engine 0 |
| 2. Result types | The bag of about forty optional fields becomes six types, one per kind of check, told apart by the kind of the `constraint` | P-engine 0; `constraints.ts` leaves the P-erase list (code changed) |
| 3. Reason codes | The engine sets a code beside each sentence at the place that writes it; the two regular expressions on the English of a print gate (`constraints.js:948-949`) are replaced by the code | P-engine 0 in all four tiers, wording among them |
| 4. Constraint IDs | A requirement has an ID (its own, else `c<position>`); the engine puts it on every result and matches by it, never by `===` | P-engine 0; a structured clone of the requirements and of the answer |
| 5. Casts | The six casts WP-18 left are removed (ledger 1, products 1, indices 2, scenario 2) | P-engine 0; the ratchet falls |
| 6. One verdict table | The port reads the gate-verdict table of `packages/domain/src/core`; no other table of the six words exists in new code | P-engine 0; `tests/domain/one-verdict-table.test.mjs` |

The new side adds two fields beside the old answer, `reasonCode` and `constraintId`, and the comparison leaves them out (`ADDED` in `packages/parity/src/new-adapter.ts`), so a zero still means the port changes no answer. Their own tests check them: `tests/parity/engine-wrapper.test.mjs` requires a code on every one of the 1.8 million requirement results of the templates and 120 random scenarios, and requires each code to name the sentence it sits on; `tests/parity/gate-reasons.test.mjs` requires a code for every print-gate sentence of the database.

The old unit tests run against the new engine unedited (`tests/parity/old-tests-on-port.test.mjs`): `node --import tests/parity/redirect-engine.mjs --test test/<file>` sends every import of `app/js/engine/<name>.js` to the staged engine. That is 317 tests in 25 files, `test/metamorphic.test.js` (the nine relations) among them, and a control plants a fault in the port and requires them to fail. `docs/next/constraints-rules.md` maps every rule of `constraints.js` to the test or corpus case that covers it.

### The new side from WP-23: the new build's database, and transitions for P-build

The engine surface's new side now reads the database **the new build wrote** (packages/build), not `dist/db.json`, so a deliberate
change in the build reaches the answers. (Ties and links keep both sides on `dist/db.json`: they test the engine and the link readers,
not the data.) A transition file lists differences of the engine under their corpus case, and differences of P-build under the case
`build` (record = the database path, tier evidence). One file may list both; each check settles only its own part, and a listed case
only needs to exist in the milestone corpus, so a transition measured at milestone size also passes a pull-request run (cases outside
its 1,000 replays are skipped, as in any partial selection). A listed difference that was not seen counts as missing only when every
case could be answered. The first transition is [reprint-counts-once](transitions/reprint-counts-once.md): 5,448 differences.
Write one with `npm run parity -- --milestone --surface engine,build --transitions <empty folder> --emit-transition <file> --id ... --ruling ... --description ...`.

## Transitions: how a deliberate change is allowed

A deliberate change (for example the reprint ruling OQ-09 d) is recorded in `parity/transitions/<date>-<topic>.json`: its kind (science, determinism, display or wording), the ruling that allows it, and the **exact list** of differences (question, record, level, field, before, after) with a fingerprint of the list. The run passes only when what it observes equals that list: one extra difference fails, one missing difference fails, a hand-edited list fails. A transition is never a blanket waiver. A change that moves a decision or evidence needs kind "science" or "determinism" and a cited ruling, and your approval as a Tier 1 change.

A run over only part of the corpus (for quick local checks) says "PARTIAL RUN" and exits with a failure code unless it is asked for explicitly, so a small run is never mistaken for the whole.

## How long it takes

Pull-request mode (`npm run parity -- --noop`, all five checks) must stay under 5 minutes. The second build runs in the background while the engine questions are answered. Timings, with the machine's state:

All on the owner's Mac (10 cores), Node 26.9, 2026-10-21, with other work running on it; "load" is the machine's load average at the time.

| Run | Wall time | Where the time goes |
|---|---|---|
| `npm run parity -- --noop` (pull-request mode, all five checks) | **119 s** (load about 3.5) | engine 97 s, tie-shuffle 16 s, links 2 s, build and pages compared in 2 s; the second build takes about 26 s alone and runs in the background beside the engine questions |
| the same, measured while the machine was heavily loaded by other jobs (load about 10) | 299 s | engine 229 s; the build was not yet overlapped (it ran after the engine, 37 s) |
| `npm run parity -- --noop --milestone` (5,306 questions, 468-case tie sample) | 640 s (10.7 min; load 5 to 7) | engine 536 s, tie-shuffle 95 s |
| `npm run parity:mutate` (control plus nine faults, 240 questions each) | 3.5 min | about 21 s per fault |

So pull-request mode is well inside 5 minutes on a quiet machine and was at the limit on a very busy one. It has not been timed on the CI runner.

## Can the check fail?

Yes, and it is tested. `npm run parity -- --fault <name>` plants one fault in a temporary copy of the engine (never in the real files) and the report must name the moved records. A caught fault exits 5; one the harness misses exits 3. `npm run parity:mutate` (the same as `npm run parity -- --mutate`) plants all nine, one after the other, and must report 9 of 9 caught. Before the nine it runs a control, a copy with nothing planted, which must differ from the engine nowhere (otherwise "caught" would mean nothing), and it checks that the real engine files have the same fingerprint before and after, stopping with a crash if they do not. A fault counts as caught only if the report shows a difference in every level the fault is known to move and every question could still be answered.

| Fault | What is broken |
|---|---|
| gate-verdict | a print gate sitting at the low end of the maker's window answers "on the line" instead of pass |
| gate-precedence | when one requirement fails and another is unresolved, the unresolved one now wins (the verdict precedence is flipped) |
| tie-order | among tied products the last one represents the material, not the first |
| edge-strict | a value exactly on a ">=" limit no longer passes |
| untested-as-zero | products that could not be judged are counted as zero untested |
| drop-cited-ids | a requirement no longer carries the measurement it cites |
| missing-word-zero | the missing-state word "not-published" on an unanswered requirement becomes the number 0 |
| cited-sibling-swap | a requirement cites a sibling measurement with an equal value; no verdict moves |
| reason-wording | one reason sentence is reworded; no verdict moves |

The new checks can fail too, and tests show it: a changed cell in a tables folder is named by P-build and P-pages; a dropped line, a dropped section or a changed link target is named by P-pages; the swapped-tie fault is named by the tie check; a link reader that changes a warning or reads a refused link as empty is named by the links check.

## What parity cannot catch

- It does not prove an old answer is **correct**. If the old tool is wrong, the new tool is wrong in the same way, on purpose. Correctness needs source-checked cases and your review sitting.
- It covers the **questions in the corpus**, not every scenario a person can build. A difference only a question outside the corpus would show goes unseen.
- Both sides run on the same machine and the same Node. A difference that only shows on another computer or browser is not seen here.
- It compares the engine's **answers**, the compiled database and the **text** of the material pages, not what the page draws (colours, layout, charts' shapes, what a click does) or the data conversion. Those are separate checks (P-ui, P-data, later packages). The page text check reads words and link targets, not markup, so a wrong colour or a broken style would pass it.
- Searches and assumptions typed into the page are not in the question list. A link that carries an assumption is opened by both link readers and compared, but the assumption is not applied in the engine replay. Saved-scenario loading and old links are covered by the links check, only as far as the 53 harvested ones and the page back-links go.
- If both sides share the same wrong input data, they will agree.

## Your decision

**Do you approve this as the parity contract?** Why it matters: every later porting step is judged against it. My recommendation: approve. If unanswered: the work stays open and nothing is merged. WP-05 (b) has landed; this is the page to approve.

- [ ] A. Approve as written (recommended)
- [ ] B. Approve, but file group / likely / best / list order under Presentation as the pack says
- [ ] C. Something else

**Your answer / notes:**
>
