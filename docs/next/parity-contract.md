# The parity contract (one page, for the owner)

> **In short.** Parity is the check that proves the rebuilt tool gives the same answers as the old one. The old engine and the new engine are fed the same questions on the same current data, and every answer, reason and cited record is compared. If anything differs, the check fails unless that exact difference is written down in advance and you approved it. Nothing here proves the old answers are *right*; it proves the rebuild did not *change* them. This is your ruling OQ-03 made into a check: "the physics of data and material science decision should remain the same but the structure can change."

**Status: waiting for your approval** (answer at the end). Built in WP-05 (a). Run it with `npm run parity -- --noop`. Measured 2026-10-21 on the owner's Mac, Node 26.9: the full 1,306-question run takes about 90 to 100 seconds.

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
| 5 | a fault was injected and caught: the self-test passed. This is the expected exit of `--fault <name>`; it is not "differs" and not a crash. With `--transitions`, the transition decides (0 or 1) |
| 64 | bad usage: unknown flag, stray argument, repeated flag, missing value, a flag used as a value, unknown fault, `--noop` with transitions, a transition from a run that cannot yield one |
| 70 | the tool crashed (an uncaught error: a bug, a missing `dist/db.json`, an unreadable corpus). It is not a verdict; the error is on stderr |

CI runs `npm run parity -- --noop` after `npm run build` and fails on anything but 0.

### The new side today (WP-11)

`npm run parity` (the same as `npm run parity -- --new`) compares the old engine with **the old engine behind the typed wrapper** (`packages/engine`, [contracts.md](contracts.md)): the answer the wrapper gives, as a consumer reads it, against the answer the engine gives. Zero means the wrapper loses nothing and changes nothing; it is not yet a port. The wrapper runs over its own copy of the engine files and its own typed parse of the database, so nothing is shared with the old side. Measured 2026-10-21: 1,306 questions, 5,663,780 records, no difference at any level, about 3.5 minutes. `tests/parity/new-adapter.test.mjs` runs a subset that keeps every group, shows that a fault in the wrapped engine and a fault in the wrapper's own output are both caught, and shows the comparison holds when the wrapper's answer goes through a structured clone (nothing depends on object identity).

## Transitions: how a deliberate change is allowed

A deliberate change (for example the reprint ruling OQ-09 d) is recorded in `parity/transitions/<date>-<topic>.json`: its kind (science, determinism, display or wording), the ruling that allows it, and the **exact list** of differences (question, record, level, field, before, after) with a fingerprint of the list. The run passes only when what it observes equals that list: one extra difference fails, one missing difference fails, a hand-edited list fails. A transition is never a blanket waiver. A change that moves a decision or evidence needs kind "science" or "determinism" and a cited ruling, and your approval as a Tier 1 change.

A run over only part of the corpus (for quick local checks) says "PARTIAL RUN" and exits with a failure code unless it is asked for explicitly, so a small run is never mistaken for the whole.

## Can the check fail?

Yes, and it is tested. `npm run parity -- --fault <name>` plants one fault in a temporary copy of the engine (never in the real files) and the report must name the moved records. Six faults exist now (a flipped gate verdict, a tie order swap, a limit edge, untested counted as zero, a dropped cited ID, a reworded reason); WP-05 (b) completes the set of nine. A caught fault exits 5; one the harness misses exits 3.

## What parity cannot catch

- It does not prove an old answer is **correct**. If the old tool is wrong, the new tool is wrong in the same way, on purpose. Correctness needs source-checked cases and your review sitting.
- It covers the **questions in the corpus**, not every scenario a person can build. A difference only a question outside the corpus would show goes unseen.
- Both sides run on the same machine and the same Node. A difference that only shows on another computer or browser is not seen here.
- It compares the engine's **answers**, not what the page draws, the material pages, the build output or the data conversion. Those are separate checks (P-ui, P-pages, P-build, P-data, later packages).
- Searches, assumptions typed into the page, and saved-scenario loading are not in corpus v0.
- If both sides share the same wrong input data, they will agree.

## Your decision

**Do you approve this as the parity contract?** Why it matters: every later porting step is judged against it. My recommendation: approve. If unanswered: the work stays open and nothing is merged. Revisit when WP-05 (b) lands.

- [ ] A. Approve as written (recommended)
- [ ] B. Approve, but file group / likely / best / list order under Presentation as the pack says
- [ ] C. Something else

**Your answer / notes:**
>
