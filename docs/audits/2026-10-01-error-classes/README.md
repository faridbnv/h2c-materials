# Removing the data audit's error classes

GOALS steps 2 and 5; C3, C4, C9, C15. The owner's PM trial and data audit of 2026-10-01 (an external package,
`PM-TRIAL-2026-10-01`, kept beside the gap-fill packages) re-read 502 records against their cached sheets. They found
the numbers faithful (97.7% printed on the cited page) and the errors in the context around them, from nine
mechanisms, RC1 to RC9. This sweep removes each mechanism and adds a guard that keeps it removed; the 54 confirmed
records are its regression cases, not its work list.

| Root cause | Mechanism | Guard | Status |
|---|---|---|---|
| RC1 | A Parse review muted every typed check of its row, so m08's windows read from stray numbers survived | PARSE-REVIEW-SCOPE, PARSE-TEXT-BOUNDS (D115) | Removed (m274) |
| RC2 | Open bounds typed as points ("> 80 °C" as 80–80), and open windows dropped from summaries | OPEN-BOUND-WINDOW; parser; summaries keep a missing end (D115) | Removed (m274) |
| RC5 | One table under two products with no formulation key; the cross-source twin check keys on conditions too | GRADE-VALUES-TWIN (lint) | Guard in; 54 pairs under review |
| RC6 | Impossible pairs a sheet prints (notched above unnotched; flexural strength above 8 % of modulus) | MEAS-PHYSICS-NOTCH, MEAS-PHYSICS-FLEX-STRAIN | Guard in; 4 under review |
| RC7 | Impact unit and standard disagree (ASTM D256 printed in kJ/m²) | IMPACT-UNIT-STANDARD | Guard in; 30 under review |
| RC9 | A filler in the product's name its material does not have | FILING-FILLER-WORD | Guard in; 1 under review |
| RC3 | A page's heading or footnote not carried to its rows | `page_context.csv` inherited by compile (D116); CONTEXT-ROW-CONTRADICTS-PAGE; `audit:context` CONTEXT-PAGE-UNRECORDED | Mechanism in; 103 pages under review |
| RC4 | A direction, notch or standard taken from the neighbouring row | `audit:context` CONTEXT-DIRECTION, -NOTCH, -STANDARD | Guard in; 111 under review |
| RC8 | Print settings under labels the import did not read | lexicon ("Print Platform Temp."); `audit:context` CONTEXT-PROFILE-SETTING | Guard in; 143 under review |

Findings of the new lint rules are accepted with the reason "Open in the error-class sweep" until each is re-read;
the stale-acceptance check makes every one of them come back out as it is fixed or given its own reason.

## Phase 1a: RC1 and RC2 (this commit)

- `build/src/typed-values.js`: scoped reviews, PARSE-TEXT-BOUNDS, OPEN-BOUND-WINDOW. `build/src/normalize/process.js`:
  "> 80 °C recommended" is an open bound. `build/src/compile.js`: summaries keep open windows; the table, drawer, CSV
  and chamber notes say "at least".
- m274: nine windows read again from their own words (P0046, P0058, P0070, P0095, P0097, P0102, P0114, P0120,
  P0184); 147 reviews scoped (109 to their columns, 38 "Fields: none.").
- Compiled diff: 94 paths, all print windows, gate reasons and print estimates; no gate verdict, headline or template
  answer moved (`build/snapshot` unchanged, 69 interface views unchanged, 300 rendered scenarios agree).

## Phase 1b: the guards for RC3, RC4 and RC8

- `page_context.csv` (schema, `context-scopes` vocabulary), `build/src/page-context.js` and its use in
  `compile.js` (D116); CONTEXT-ROW-CONTRADICTS-PAGE in `lint-rules.js`; `test/page-context.test.js`.
- `scripts/audit/context-witness.mjs`, `npm run audit:context`, in `verify` after `audit-data`; its baseline is
  `data/review/context-witness-accepted.csv`. 364 findings, each accepted as open in the sweep.
- The importer reads "Print Platform Temp." as the bed (`scripts/ingest/lexicon/setting-labels.csv`).
- Regression cases caught by a guard: 46 of 54. Not guarded, fixed directly: two room-temperature test temperatures
  (they decide nothing), one block standard printed above its rows, one film's MD/TD direction, two enclosure and
  chamber statements, and two rows whose value line the check did not locate.

## The PM trial's findings (D117, D118), committed before Phase 2

- `app/js/ui/table.js`: the share ("PASS · 7 of 200 products"), the passing products' range above all products',
  `variantMark`, `caveatMark`, `typicalStateMark`, `unknownMark`, and "hardened nozzle: N of M" in Needs. The drawer and
  Compare say how many products need a hardened nozzle (`hardenedShare`).
- `app/js/engine/constraints.js`: `h2cStatusOf` judges "Official Bambu product" per product (D118); a numeric pass
  carries the caveat of the value it rests on.
- Names: m275 (headline labels), `labels.js`, `filters.js`, `index.html`, `start.js`, `decision.js`; ranking values with
  units and n (`indices.js`).
- Not built: a scenario warning naming D118 (the release note says answers may differ), a glossary popover (PM-20),
  and the split counts in the empty-result explanation.
