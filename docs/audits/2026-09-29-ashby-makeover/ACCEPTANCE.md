# Acceptance of the Ashby makeover

> **Historical record** (2026-09-29): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

The package's acceptance (05-ACCEPTANCE.md, ACCEPTANCE.json) case by case, as built on the branch `Ashby-makeover` and
revised by D108 to D112.
"Passes" names the check that holds it in `npm test`, `npm run ui:check` or the UI fuzz; "not run" says so. Every
hand-worked expectation is written in its test with its arithmetic, and computed there without the production index
function.

## The machine cases (ACCEPTANCE.json)

| Case | What it asks | Status | Held by |
|---|---|---|---|
| T01 | Beam index by hand: A and B at M = 0.002, C at 0.001; A and B at or above 0.002; slope 2; the line at 1200 kg/m³ is 5.76 GPa | Passes | `test/workspace.test.js` T01 |
| T02 | Every index's n and log-log slope; the line through (M ρ)^(1/n), and ρ = P^n / M on swapped axes | Passes | T02 |
| T03 | A dry product asked conditioned: passes its gates, unranked, no modulus; density may stand in, labelled | Passes; a reverted fallback fails it | T03 (mutation-checked) |
| T04 | Fiberon PET-GF15: unresolved without an oven; PASS annealed at 120 °C for 16 h; drawn at 133.7 °C (V001933), not 81.6 (V001931) | Passes; the sheet re-read by an agent, digest checked | `test/workspace-acceptance.test.js` T04; fixture form in `workspace.test.js` |
| T05 | V002469 (dry modulus) with V002491 (conditioned strength) is no strict pair; V002469 with V002465 (both dried) is | Passes; both pages re-read by an agent, digest checked | `workspace-acceptance.test.js` T05; `test/evidence-pairs.test.js` |
| T06 | Two anticorrelated products: the marginal box is (1000–1500) × (1–9); the corner (1000, 9) is no product and ranks nothing | Passes | T06 |
| T07 | PA6-like: density span 1130–1200 kept, likely modulus 1–4, no centre, no rank; sensitivity sqrt(1)/1200 to sqrt(4)/1130 | Passes; unavailable when conditioned | T07; the live PA6 inspector shows 1,130–1,200 kg/m³ over seven products |
| T08 | Cost: 20,000 and 21,000 CAD/m³; M_A = 0.0001, M_B = 0.000142857; B better; a twin's price not read | Passes, with the fixture rate applied before the product is built; the page itself converts no currency | T08 |
| T09 | The H2C beam: 8 PASS materials kept; products and materials counted apart, never "73 of 8" | Passes; the drawn set re-derived from the products' states | `workspace-acceptance.test.js` T09; fuzz I10-count and I10-mislabel |
| T10 | A swept line changes nothing; an applied stage keeps M ≥ cutoff (equality in), re-ranks, saves and reopens, and removing it restores all | The first half passes; the stage was removed at the owner's direction (D108), so a line never keeps or re-ranks, and a saved stage reopens as a line position with a notice | T10 (the line counts its better side, equality in, and moves no rank, verdict or mark); `test/scenario.test.js` (a saved stage); `test/ashby-export.test.js` |
| T11 | Units, off-log values, open ranges, three kinds of spread | Partly: off-log counted and never clamped, open ranges unavailable, the source's ± kept as its own; the page has canonical units only, so "changed display units" does not arise | T11; T07 |
| T12 | Freshness and migration: a changed fixture and release move every consumer; version 1 keeps its question; a goal conflict is said | Passes | T12; `scenario.test.js` (four version 2 tests) |
| T13 | Offline; viewport targets; keyboard and touch; human tasks; repo gates and diffs | Partly, below | |

## The functional and visual gates

- **Geometry, list and export agree** on every confirmed pair, the line's result, material membership, rank and input
  IDs: one model feeds all of them (`workspace.js`); the fuzz's I10 checks the drawn set against the engine on every
  decision-view reading; `ashby-export.test.js` checks the export's rows and header.
- **Counts in their own units**: "N products from K materials" everywhere (D108; "N product states across K materials"
  as first built); the reading note never reads "N of M candidates" in the decision view (I10-mislabel). Material
  typicals keeps "N of M candidates" in its reading note, where both are materials.
- **References and context do not change eligibility or ranking**; a focus or a lasso is a view, reset in one press, and
  never a requirement (it filters no row; the old subset is gone).
- **Menus that do not move** (D108, D109): the axis menus name the property alone, in one order, in every view (fuzz
  I4-axis-static on Material typicals; `ui:check` view 40 lists them); the Draw and Also rows and More keep every item,
  greyed with a reason where it does not apply.
- **Keyboard**: the line (a number box, a slider, ▼ ▲ steps that move it past the next product state) and every mark
  (the result list opens each in the inspector, which takes focus) — checked by `npm run ui:check` (view 41), where a
  container's attribute once made every click redraw the lens (DECISIONS, bugs worth remembering). **Touch**: marks,
  material boxes and estimates open on a tap, and a crowded spot lists the marks near it; not tried on a physical device.
- **Viewport targets** met and now enforced by `ui:check`: at 1440 × 900 with the filters hidden, 808 × 450 px of plotting
  area on screen; at 1024 × 768, 912 × 395 with the results under the chart. With the filters shown at 1440 × 900 the
  plot has 676 × 466; the plan's target is for ordinary controls collapsed.
- **Themes**: the chart reads the page's theme for its ink and grid; the screenshots are in the dark theme the machine
  uses; status is never colour alone (shape and fill carry confirmed, unresolved, failed).
- **Offline**: every capture ran with the network emulated offline and recorded no request beyond the file.
- **Repeated renders**: 40 redraws per run leave one plot and the same three resize listeners; the heap steady (README).
- **Freshness**: T12; no cache is keyed by date: the judged products are kept for as long as the rows object and the
  context's release and judging settings are the same.
- **Version 1 scenarios**: T12 and `scenario.test.js`.

## The task trial (not run)

The plan's five-participant trial is the release gate, and it has not been run. For whoever runs it: the tasks in
05-ACCEPTANCE (build the H2C beam and sweep its line; explain a band against a product; read an estimate and say what would
resolve it; turn to conditioned; the annealed Fiberon fixture; the cost goal; save, reopen and export) are all reachable
in the built page, and `docs/audits/2026-09-27-v2.1-review/reviews/TEAM-TRIAL.md` is the protocol to extend. Record time,
correctness, wrong conclusions, recovery and assistance, and repeat what fails.

## Source readings to review

`test/acceptance/ashby-workspace.json` lists what was read and where. A reviewer should open the two cached documents by
digest and confirm: Fiberon PET-GF15 V1.0 prints 81.6 °C (as printed) and 133.7 °C (annealed) at 0.45 MPa, the
120 °C / 16 h schedule, and that its mechanical table's footnote puts every specimen through that annealing; Ultrafuse
PAHT CF15 v4.0's page 4 is the dried table (8386 MPa, 103.2 MPa, XY flat) and page 5 the conditioned one (62.9 MPa, XY
flat, 23 °C and 50 % RH for 72 h).
