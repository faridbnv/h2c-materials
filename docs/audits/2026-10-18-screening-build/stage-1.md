# Stage 1: words, and "does not apply"

> **Historical record** (2026-10-18): stage 1 of the screening build, on branch `screening-build/stage-1` from main e803f2bb (release 9ca94d31fc5d). It describes the tool as it was then. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** This stage changes what the selector says, and one thing it does. A property that does not apply to
> a material, such as the heat deflection of a rubber-like elastomer, now hides that material whether estimates are on
> or off, and the page calls it "Does not apply" instead of "Screened by an estimate". The switch is renamed "Use
> estimates and resin data", and nothing on the page still says that a material's own estimate can rule out a material
> that has products, because that estimate is never read. No material's answer moved: the only change in what is listed
> is that, with estimates off, the 30 elastomer listings of the two heat presets are now hidden as they already were
> with estimates on. The decision is D148 in [DECISIONS](../../DECISIONS.md).

## What changed for a reader?

The page now says plainly why a material is hidden, and the switch says what it does.

- **"Does not apply" hides with estimates on or off.** Ask for HDT at 0.45 MPa of at least 100 °C with Include on and
  estimates off. TPC used to stay listed, its reason "Not published in the sampled sources; ask the maker". It is now
  hidden, like the other 13 elastomers and OBC, and the SCREENED chip brings it back marked "Does not apply: HDT at
  0.45 MPa at least 100 °C (HDT is a rigid-bar test)". It is still counted as could-not-be-checked, never as failed.
- **Each reason is said once.** TPC's mark had repeated the same HDT requirement ten times, once per product, under
  "Screened by an estimate". It now names the requirement once, under the kind of hide it is.
- **The switch is "Use estimates and resin data".** Its help says it shows estimates where nothing is published, lists
  as estimated candidates the materials whose estimates' middle values meet the limits, and never passes a material.
  With it on, resin data can hide a material whose base polymer it reports attacked by the chemical asked, and a
  material with no product on record is hidden when its own estimate wholly misses. No estimate of a real product hides
  anything in this release. Under Leave out the switch shows unchecked and disabled; the reader's choice is kept.
- **Material estimates say "context only".** A material with products, such as ASA-EC, is judged on each product's own
  values. Its material estimate is shown in its cell and drawer, and now says it hides nothing. Only PA66-CF, PA612 and
  PA612-GF, which have no product on record, are judged on their own estimates, and their words still say so.
- **"Why the rest were excluded" counts what the page hides.** For the Outdoor structural part it said 22 materials were
  hidden on HDT. The page hides 14; the other 8 fail another requirement. It now says "14 hidden because it does not
  apply to them".
- **A preset keeps your mode.** Choosing a preset used to switch Include back to Leave out without a word. It now sets
  the requirements and keeps the mode. Under Leave out with the UNKNOWN chip on, the line above the table says those
  rows are shown but are not candidates.
- **Annealing is offered only where it helps.** Bambu Lab PLA Silk+ publishes HDT only after annealing, at 60 °C. For
  a 100 °C bracket the page offered "Allow annealing to use it". It now says the annealed value also misses, so
  annealing would not help.
- **The preset notes say what is taken on trust.** The two heat presets say an HDT whose test bar the sheet does not
  describe is accepted as a printed bar's. The outdoor preset says the part is judged dry, and that nylons lose
  stiffness in humid air. The flexible preset says it tests stretch, not softness, and points to Shore hardness.

## What moved, and what did not?

Every material's verdict stayed the same in all 138 cases the comparison runs. The moves are all listings and groups.

| What | Moved | Where |
|---|---:|---|
| Material verdicts (PASS, UNKNOWN, FAIL) | 0 | – |
| Materials listed or hidden | 30 | Include with estimates off: Outdoor 14, Warm environment 16 |
| Groups of those materials | 30 | "Insufficient evidence" to hidden, the same 30 |
| Product groups | 219 | The products of those 30 materials |
| Product the row shows | 0 | – |

The 30 are exactly the materials HDT does not apply to: the 13 elastomers and OBC in the outdoor preset, and those plus
TPC-ESD and TPU-GF in the warm one. With estimates on they were hidden before and are hidden now. The full list is in
[stage-1-diff.md](stage-1-diff.md).

What did not move:
- No estimate of the frozen estimate stage moved: the build's own comparison shows only the two rewritten method rows.
- No other preset and none of the 120 single-requirement sweeps moved.
- Leave out is unchanged everywhere, and gives the same answer with the switch on or off.

## How was it checked?

- The decision census, each side on its own code: 0 verdicts, 30 listings, 30 groups, 219 product groups, 0 rows
  shown for another product.
- `npm run build:diff`: 2 differences, both method.csv rules (Missing data, Estimates).
- The snapshot: `templates.csv` moves the same 30 rows from "yes" to "screened"; `screening.csv` gains its "Read for"
  column. One interface view moved: Compare's settings line.
- Tests: 714, of which 712 pass and 2 are skipped; none fails. `verify:fast` took 45.8 s with the build cached (the
  budget is 90 s). `ui:fuzz` on 300 scenarios, seed 11: no violation in 577,876 checks. The fuzz now also reads the
  SCREENED chip with estimates off, where a property that does not apply hides.

## What is left for later stages?

- The groups' names ("Insufficient evidence", "Excluded / screened") and the product that speaks for a row change in
  stage 3c.
- The validation report still says an estimate "may screen one out" in Explore. That sentence is written by the frozen
  estimate stage, so it changes with stage 4.
- `test/screening.test.js` still checks the material-level path, which now applies only to the three materials with no
  product; stage 3c makes it run the page's product path.

## Evidence and where to check

- Engine: `app/js/engine/constraints.js` (`evaluateNumeric`, `elsewhereReason`, `explainExclusions`).
- Words: `app/index.html`, `app/js/ui/labels.js` (`screenedByKind`, `screenedChip`, `estimateTitle`), `main.js`,
  `start.js`, `explain.js`, `table.js`, `detail.js`, `compare.js`, `decision.js`, `templates.js`, `filters.js`.
- Tests: `test/constraints.test.js`, `test/templates.test.js` (the Outdoor count of 14), `test/product-screening.test.js`,
  `test/polymer-environment.test.js`. Fuzz and probe: `scripts/ui-fuzz.mjs`, `scripts/ui-probe.mjs`.
- The comparison: `node decision-census.mjs --root . --db dist/db.json --out after.json`, then `--diff` against the
  stage-0 baseline, written to [stage-1-diff.md](stage-1-diff.md).
