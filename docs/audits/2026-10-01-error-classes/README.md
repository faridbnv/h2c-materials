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
| RC3, RC4, RC8 | Page context lost; rows misaligned; print-setting labels unread | page context (D116), `audit:context` | Next |

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
