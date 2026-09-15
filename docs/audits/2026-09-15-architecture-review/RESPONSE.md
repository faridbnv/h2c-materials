# Response: architecture review (2026-09-15)

Every change is one commit on `data/csv-source` after `05dcb6f`, each with `npm run verify` green. Structural changes
show zero differences in `npm run build:diff`; behavioural ones name exactly what moved. Decisions D58 to D60 record
the reasons. The owner ruled that estimate-based screening stays and its weaknesses are resolved, rather than estimates
becoming display-only.

## Commits

| Commit | What it does | Proof |
|---|---|---|
| `ff05d0c` | `verify:fast` (about 30 s) and `verify` (about 1 min, 300 rendered scenarios); 2,000 scenarios nightly and on demand in CI; `npm run build:diff` | 0 differences |
| `cfad563` | The snapshot's warnings sorted by code and record, so moving a rule never reads as a change | same rows |
| `a28a855` | Estimates become a stage of their own, `build/src/estimate/`, one file per concern; `pipeline.js` runs compile, the stage and validation for every caller | 0 differences |
| `d7f953c` | The core database builds and validates without estimates (`--no-estimates`, tested against the contract); implied bounds become `headline_definitions.csv` columns (m27); the model's judgements move from literals in code to named settings | 6 differences, the new registry field |
| `413e7dd` | Screening rebuilt (D59): honest hold-outs, each end a distribution-free tolerance limit, open ends, never against the material's own evidence; a display fix for evidence converted to heat deflection | 788 differences, all estimate ranges and screening fields; 1 template result |
| `e4f5a53` | `polymers.csv`, Variant class and Shore hardness as tables and measurements (m28, m29); a JSON Schema over the model's configuration; EST-MODEL-REFERENCE retired (D60) | polymers, identities, 7 measurements, elastomer stiffness estimates |
| `cd18a5b` | Anneal °C and Anneal h typed columns (m30); `fatigue_tests.csv` (m31); Manufacturer count and Quarantined columns, Original category dropped (m32) | `anneal` and `manufacturerCount` fields only |
| `cc01e35` | One finding shape; reviewed codes from the catalogue; shared Chrome plumbing; the fuzz imports the page's formatter | 0 differences |
| `6fff0bf` | The workbook conversion archived; `npm run data:new-material`; the decision index; counts out of prose; one median and one retirement wording | 0 differences |

## What changed for a reader

- **Screening.** Of 94 estimates, 77 screen on both ends, 13 on one and 4 on neither. Twenty ends no longer screen
  against the material's own evidence: PP is not screened out of a minimum elongation against its own 460 %. One
  template result changed: PA12 stays a flagged candidate for the flexible component's 100 % elongation. PLA Lite is
  still screened out of "at least 100 °C". The drawer says which ends may screen and why.
- **Estimates.** Honest hold-outs widened elongation's plausible ranges by 9 %, heat deflection's likely ranges by 8 %
  and stiffness's by 3 %; calibration still holds (80 to 81 % likely, 95 to 97 % plausible). Elastomer stiffness
  estimates moved 1 to 3 % because the model now reads every published Shore hardness, including four its
  configuration had missed. Evidence converted to a heat-deflection headline no longer omits the melting-point term
  (PA12's own 94.7 °C read "about 108 °C as this headline").
- **Data.** Seven hardness measurements added from re-read sources (three published, four nominal from the product's
  name); TPC / TPEE's Mechanical coverage no longer says Gap; five Grades coverage counts are checked for the first
  time, and hold. `measurements.csv` has 31 columns instead of 37.

| | Before | After |
|---|---|---|
| Full gate | 2 min 50 s | about 1 min |
| Fast tier | none | about 30 s |
| Tests | 211 | 215 |
| Tables | 17 | 19 (`polymers`, `fatigue_tests`) |
| Decisions | D57 | D60 |

## Deferred, with the reason

- **Sentinels with a reason in parentheses** ("Not published (do not assume printed)", 619 cells): splitting them
  changes the drawer's specimen text, so it belongs with the next drawer change.
- **Archiving the 155 retired-duplicate measurement rows**: `nextId` reads the highest ID from the working table and
  the no-deletion guard would trip; both tools need teaching first.
- **A vocabulary for the 249 spellings of "Standard / load"** and a `test_conditions.csv` for the one specimen string
  repeated 463 times: real wins for filtering by test standard and for file size, but no decision depends on them.
- **Pruning the incident tests in `database.test.js`**: each pins an audit finding; the duplication with the
  snapshot was judged cheaper than the risk of losing a pin.
- **A generated read-only SQLite for ad hoc queries**: an optional add-on, not a migration.
- **Scale beyond a few hundred materials**: the Gaussian model is cubic in observations (13 s at twice today's data);
  block it by chemical group, or take the stage off the critical path with a cache keyed by input hash, when the count
  grows.

## Open

- Three measured headlines the honest hold-outs flag as far from their prediction (OBC density 905 kg/m³, PolyFlex
  TPU95 elongation 330 %, THERMAX PPS heat deflection 90 °C) are accepted with physical reasons in
  `data/review/accepted-findings.csv`; their sources were not re-read in this round.
- `polymers.csv` cites no source yet; every row says where its numbers come from in words.
- From the previous audit, still needing data: B-12 (density basis), B-19 (thin identities), D-09 (more measured
  cases for this-material heat deflection).
