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
- **Kept.** `release.ts` is the old file, label only (P-erase 0). Release identity v2 (`remake/tools/release-id.mjs`, WP-14,
  on `remake/v3` since this branch was cut) hashes by content and records the runtime, and lists `build/src`,
  `build/mappings` and `packages/domain/src` as the rules, but not `packages/build/src` either. Adding it is one line and a
  change of what a release ID means: its own step, with WP-14's tests, and it is due before `build/src` leaves the tree.

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
## WP-18: the engine port, leaves and middle (2026-10-21)

Eight engine modules now have a TypeScript port beside the old file (`packages/engine/src/port/`): `pareto`, `filler`,
`search`, `coverage`, `ledger`, `products`, `indices`, `scenario`. Each is the old module with type labels only (P-erase
proves it), so the typing exposed the places where the old code is looser than its labels can say. The port keeps every one
as it is (ruling Q2-19); none is fixed here.

### WP18-D1. A version 1 file with an unknown chart detail opens with no chart view

- **Where.** `app/js/engine/scenario.js:259-260` (`migrateV1`). The view of a version 1 chart is looked up in a literal by the
  file's `plot.detail` (or the view its `pointLevel` and `comparability` imply): `{ material, products, measured, measured-mixed }[level ?? 'material']`.
- **Evidence.** `validateScenario({ version: 1, lens: 'ashby', plot: { detail: 'bogus' } })` answers `plot.view: undefined`, and the
  warning it speaks then says "test pairs (under More)", because its choice between two names is `legacyView === 'catalogue'`.
  `plot.detail: 'catalogue'` (the new view's own name) does the same. A version 2 file does not: it falls back to `'decision'`
  (`scenario.js:198`). The port needs a cast at this lookup (`scenario.ts`, two casts counted by the ratchet).
- **Real data.** Not reached. The 53 harvested links and files use `detail: 'products'` or no detail; a file with another word
  has to be edited by hand.
- **Kept.** The port returns `undefined` exactly as the old module does (`tests/parity/port.test.mjs` fuzzes it against the
  old module). The fix is one line (fall back to `'decision'` as the version 2 branch does), but it changes what a link opens as,
  so it waits for its own tested change.

### WP18-D2. Two kinds of headline carry a `related` field, and the engine reads both as a list of words

- **Where.** `app/js/engine/products.js:204-206` writes `entry.related` as a list of up to three sentences on a product view's
  headline. The database's own headline (`build/src/compile.js:271`, `relatedEvidence`, `:405-416`) holds `related` as an object
  `{ count, best, grades, unit, items }`. `app/js/engine/constraints.js:196` and `:243` read `h.related?.length` and
  `h.related.join('; ')` on either.
- **Evidence.** On the object `.length` is `undefined`, so the sentence "Published related values: ..." is never said for a
  material judged on its own headline; for a product view it is. `h.related.join` is only guarded by that same `.length`.
  `products.ts` types the product view's headline as an open bag (`HeadlineBag`) because of this; the separate product-view
  headline type that tells the two apart is the port step that follows this label step (WP-18 step 3), and `constraints` is WP-19.
- **Real data.** Not measured here. A material is judged on its own headline only when it has no product on record.
- **Kept.** Both reads and the writer are as they were.

### WP18-D3. `coverage.js` reads `loadStated`, which no headline holds

- **Where.** `app/js/engine/coverage.js:79` (`availability`): `m.headline[key].loadStated === false` counts the headlines "measured at
  an unstated load". The same field is read in `app/js/ui/format.js:368,395`, `table.js:737`, `compare.js:139` and `material-facts.js:532`.
- **Evidence.** No headline shape in `schema/db.schema.json` or in what `build/src/compile.js` writes has the field, so
  `caveats` is always `0`. `coverage.ts` declares the field (`HeadlineBearer`) so the read type-checks, and says so.
- **Real data.** Reached, with no effect: the count is `0` for every headline today.
- **Kept.** The read stays. Deleting it (engine.md section 6 suggests it) would also change the filter rail's label code that
  uses the count, so it is a separate change.

### Noted, not a defect

- `build/src/validate.js:300-302` lists the six verdicts in its report table in the order within, within-low-end, edge,
  exceeds, exceeds-recommended, unknown: `exceeds` comes before `exceeds-recommended`, unlike the precedence. It is the
  column order of a validation report. It decides nothing.
- `build/src/products.js:612` carries `// eslint-disable-next-line no-unused-vars` above a line that no longer needs it. The
  port keeps the comment (P-erase compares comments), so `npm run lint` shows one warning for `packages/build`.
- `app/js/engine/indices.js:38-40` (`priceCaveat`) hands `String.prototype.replace` a number (`.length`) where it wants a string.
  JavaScript coerces it, so the sentence is right; the port marks the two call sites with a cast (`as never`) rather than
  change the call. (WP-18)
- `app/js/engine/products.js:109` (`productsByMaterial`) filters out the products a lookup did not find with
  `.filter((g) => g && !g.retired)`; the type system cannot see that this removes the `undefined`, so the port states it with one cast. (WP-18)
- `app/js/engine/ledger.js:92` (`requirementWords`) looks an operator up in a literal that has three of the four operators the
  scenario allows (`>=` has no entry and reads as no prefix). The index is an open string, so the port casts
  the literal. (WP-18)

## WP-19: constraints, result types, reason codes, constraint IDs (2026-10-21)

`constraints` and `workspace` now have a TypeScript port (`packages/engine/src/port/`), and the engine's answers carry one type
per kind of check, a reason code and a constraint ID. The steps keep every answer (ruling Q2-19); the entries below are what
the typing and the rule-reading exposed. None is fixed here.

### WP19-D1. The build writes why a printer check is open in English only, so the engine still reads one sentence family

- **Where.** `app/js/engine/constraints.js:948-949` (`openOne`) says "no print recipe on record" or "its chamber temperature is not
  stated" by reading the gate's reason with two regular expressions. The reasons are written by the build: `build/src/gates.js:26,53`,
  `build/src/normalize/process.js:232-307`, `build/src/products.js:584` and `build/src/chamber-need.js:100`, and the engine's own
  at `constraints.js:582`. A gate carries a verdict and a `state`, and neither tells "no temperature published" from "no
  requirement published" or from the sentence a missing profile earns (all are `unknown`, state `unknown`).
- **Evidence.** 35 distinct sentence shapes (numbers and quoted words set aside) in the compiled database fall into 17 families
  (`tests/parity/gate-reasons.test.mjs` reads every gate of the build and requires a code for each).
- **Real data.** Reached: the sentence is read for every printer check that is open (about 200 products' chamber, bed or nozzle).
- **Kept.** The regular expressions are gone from the engine's decisions: `gate-reasons.ts` (`packages/engine/src/port/`) is the one
  place that reads the build's English, once, and the result carries a code (`gate.no-print-profile`, `gate.no-temperature-published`,
  ...). The reading is as exact as the old one on the sentences that matter (same anchored prefixes). It is removed when the
  frozen build writes the code itself (WP-20); until then the engine's input is still prose at that one point.

### WP19-D2. `headline.related` is an object on the database's own headlines, and the engine reads it as a list (WP18-D2, measured)

- **Where.** `app/js/engine/constraints.js:196,243`: `h.related?.length` and `h.related.join('; ')`.
- **Evidence.** In the compiled database 326 headlines hold `related` as an object `{ count, best, ... }`, all of them headlines with
  no value. A material is judged on its own headline only when it has no product on record: PA66-CF, PA612 and PA612-GF (M056, M058,
  M060). Eight of their headlines hold such an object, so for them `.length` is `undefined` and the sentence "Published related values:
  ..." is never said, where it is said for a product view (whose `related` is a list of sentences).
- **Real data.** Reached by 8 headlines of 3 materials; the words differ ("Not published in the sampled sources ...") and no verdict moves.
- **Kept.** The typed port declares `related` as a list (the product view's) on the headline it reads; the database's object is not
  declared on that headline, so the mismatch is a documented gap in the type, not a cast. Fixing it means choosing which sentence the
  three materials should say, so it waits for its own change.

### WP19-D3. Eleven rules of `constraints.js` are covered by no test

`docs/next/constraints-rules.md` maps all 222 rules to their covering tests and lists the 11 that none reaches. The new
characterization tests (`tests/parity/constraints-rules.test.mjs`, `constraint-ids.test.mjs`) cover the rest (the filler facet, the two
errors, the closed upper bound, a headline with no interval, the withheld estimate, requirements cloned or repeated). One is reached
only by a direct call: `evaluateTreatment`'s "Used as printed" answer (`constraints.js:452-453`), since the engine adds the treatment
requirement only for a state that has a treatment.

### Noted, not a defect

- The typed port reads `Number.isFinite(x)` as a type guard (`packages/engine/src/port/lib-guards.d.ts`), which the standard allows
  (it is true only for a number) and the library does not say. Its false branch is not the complement (NaN and Infinity are numbers);
  the engine never reads a value in that branch.
- The port still holds some non-null assertions (`x!`) where `noUncheckedIndexedAccess` cannot see that `list[0]` exists after a test of
  `list.length` (`constraints.ts`, `workspace.ts`). They are not counted by the ratchet; the casts are (27, from 31).
