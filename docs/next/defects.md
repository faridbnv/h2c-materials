# Defects found during the remake

> **In short.** Defects in the old code that the remake's checks expose. Under the owner's ruling Q2-19
> ([rulings.csv](rulings.csv), R-Q2-19) a conversion step keeps the old behaviour, and each defect here is fixed later
> in its own tested change. A fix that touches science (verdicts, evidence eligibility, ranking) needs the owner's
> review. Each entry says where it is, what the evidence is, whether real data reaches it, and what the new code does
> until it is fixed.

## WP-07: the shared core and its copies (2026-10-21)

The copies-agree tests (`tests/domain/*.test.mjs`) compare each shared rule with every old copy, on every relevant value
of a real build of the current data. **On real data, every old copy agrees with every other and with the shared core.**
The entries below are disagreements only on values the current data never holds. They are latent: no answer moves today.

### WP07-D1. Two forms of the 0.45 MPa load test disagree at 0.44 and 0.46 MPa

- **Where.** `build/src/products.js:318` (`assess`) refuses a heat deflection value for the 0.45 MPa headline when
  `Math.abs(load - 0.45) > 0.01`; `app/js/ui/material-facts.js:532` (`refusedBy`) does the same with the literal `0.01`.
  The estimate stage reads a load as the 0.45 MPa test when `load >= 0.44 && load <= 0.46`
  (`build/src/estimate/observations.js:113`).
- **Evidence.** In floating point `0.46 - 0.45` is `0.010000000000000009` and `0.45 - 0.44` is
  `0.010000000000000009`, both above `0.01`. So a value stated at exactly 0.44 or 0.46 MPa is refused as the headline's
  value, and the estimate stage still learns from it as a 0.45 MPa value. `tests/domain/tolerances.test.mjs` pins this.
- **Real data.** Not reached. The stated loads are 0.45 (742 values), 1.8 (412) and 0.455 (1); the two forms agree on all.
- **Kept.** The shared core keeps both forms as they are: `offLoad` (the decision path, `assess`) and
  `inEstimateLowLoadBand` (the estimate stage). Fixing it means choosing one edge rule for both; that is a science
  question for the owner.

### WP07-D2. A gate verdict outside the six words is read differently by different copies

- **Where.** A word that is not one of the six verdicts (for example a typo):
  `app/js/engine/constraints.js:585` answers `GATE_STATUS[v] ?? UNKNOWN`; `app/js/ui/labels.js` `gateVerdict` falls back
  to `unknown` only when `GATE_VERDICT[v]` is falsy; `app/js/ui/material-facts.js:731` counts any word that is neither
  within nor `unknown` as `over`; `app/js/ui/print-spread.js:22` `OUTSIDE` and `build/src/chamber-need.js:40` `ABOVE`
  do not count it as outside.
- **Evidence.** For a word such as `'a typo'` the first two answer UNKNOWN, `printCounts` counts it as over the H2C's
  limits, and the print spread does not. For a word that names an `Object.prototype` member (`'toString'`,
  `'constructor'`), `GATE_STATUS[v] ?? UNKNOWN` returns a function rather than a status, and so does the chip's
  `state` in `gateVerdict`.
- **Real data.** Not reached. The compiled database's contract (`schema/db.schema.json`) allows only the six words, and
  the real build holds exactly the six (`tests/domain/gate-verdict.test.mjs`).
- **Kept.** The shared core reads any other word as `unknown` everywhere (`gateRow`, `gateStatus`). That matches the old
  decision path (`constraints.js:585`) on every string the schema allows. No caller uses the shared core yet; when one
  does, a word outside the six should be refused at the boundary, not read.

### Noted, not a defect

- `build/src/validate.js:300-302` lists the six verdicts in its report table in the order within, within-low-end, edge,
  exceeds, exceeds-recommended, unknown: `exceeds` comes before `exceeds-recommended`, unlike the precedence. It is the
  column order of a validation report. It decides nothing.
