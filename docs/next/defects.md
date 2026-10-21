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

## WP-20: the build port onto the SQLite reconstruction (2026-10-21)

The port keeps the old behaviour (R-Q2-19): `db.json` and `reference.json` are byte for byte what the old build writes. The
entries below are what the port exposed; none is fixed here, and none moves an answer today.

### WP20-D1. A release ID does not cover the new build's rules

- **Where.** `build/src/release.js` `RELEASE_INPUTS` digests `build/src` and `build/mappings` as "the rules". The new build's
  rules are `packages/build/src` (and the reconstruction in `packages/data`), which `packages/build/src/release.ts` still
  reads through the same list.
- **Evidence.** The new build's `meta.release.id` is `7c6da496722d`, the old build's, because both digest the same old
  files. A change to a rule in `packages/build/src` therefore leaves the ID as it was.
- **Real data.** Not reached while the old files are in the tree and unchanged. After cutover (when `build/` is deleted) the
  ID would stop covering the rules at all.
- **Kept.** `release.ts` is the old file, label only (P-erase 0). Pack 02 section 11 says the new ID hashes
  `packages/build`, `packages/domain` and `packages/data` by content in a fixed order, the Node and ICU versions included.
  That is a deliberate change of what a release ID means: its own step, with the owner's review.

### WP20-D2. A record's line number is the line it ends on, not the line it starts on

- **Where.** `build/src/csv.js` documents `line` as "the 1-based file line the record starts on" and reads it from
  csv-parse's `info.lines`. `packages/data/src/csv.ts` (the reconstruction's reader) reports the line a record starts on.
- **Evidence.** A table `a,b / 1,"x\ny\nz" / 2,3` gives lines 4 and 5 from the old reader (the first record spans lines 2 to
  4), and 2 and 5 from the reconstruction's. `tests/remake/build-load.test.mjs` pins the old numbers.
- **Real data.** Not reached: no cell of any table holds a line feed, so every record is one line and both readers agree.
- **Kept.** The new loader (`load.ts`) counts as the old one did, so every issue's `where` ("Print setup row 2001") and the
  validation report read as before. A multi-line cell would make a build message and a reconstruction message name different
  lines for one record.

### WP20-D3. `polymer-environment.js` holds a raw NUL byte

- **Where.** `build/src/polymer-environment.js:64`, the separator in the duplicate-row key
  (`[...].join('<NUL>')`, written as the control character itself rather than the escape `'\0'`).
- **Evidence.** `file` calls the file "data", `grep` skips it without a flag (a search for its exports finds none), and git
  treats it as binary, so a change to it shows no diff. The port found it because a search for a missing path read nothing.
- **Real data.** Not an answer: the key only has to differ between rows, and it does.
- **Kept.** `packages/build/src/polymer-environment.ts` carries the byte as it is (P-erase compares it). Writing the escape
  would be a harmless cleanup, in its own change, after cutover.

### WP20-D4. The database depends on the order of the rows in the files

- **Where.** `build/src/gates.js` (`aggregateGate`, first of equals), `build/src/products.js` (a profile or a record chosen
  among equals), `build/src/compile.js` (the lists of IDs it keeps in file order). Known as hazard 1 of
  `research/understand/gap-5.md` section 3.
- **Evidence.** The same tables with the records of `profiles` in the opposite order give a `db.json` with 5,044 values
  different: 1,826 `materials[].profileIds`, 1,202 `grades[].print.profileIds`, 222 `grades[].print.chamber.profileId`, 182
  `grades[].print.nozzle.profileId`, 179 `grades[].print.bed.profileId`, and the rest of the same kind (the new build and the old one
  agree on every one of them). `tests/parity/build-new.test.mjs` does this for `profiles`, `measurements` and `grades` together.
- **Real data.** Reached, by design of the old tool: the chosen profile is the first of equals in file order. Which profile a
  window comes from can change with a row inserted above it; a verdict does not (gap-5, inferred).
- **Kept.** The new build reads every table `ORDER BY _ord` (the row's place in its file) and so keeps the old ties exactly.
  Choosing by a stated rule instead of by position is a change of the rule: its own step, with the owner's review.

### Noted, not a defect

- `build/src/validate.js:300-302` lists the six verdicts in its report table in the order within, within-low-end, edge,
  exceeds, exceeds-recommended, unknown: `exceeds` comes before `exceeds-recommended`, unlike the precedence. It is the
  column order of a validation report. It decides nothing.
- `build/src/products.js:612` carries `// eslint-disable-next-line no-unused-vars` above a line that no longer needs it. The
  port keeps the comment (P-erase compares comments), so `npm run lint` shows one warning for `packages/build`.
