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
- `app/js/engine/indices.js:38-40` (`priceCaveat`) hands `String.prototype.replace` a number (`.length`) where it wants a string.
  JavaScript coerces it, so the sentence is right; the port marks the two call sites with a cast (`as never`) rather than
  change the call. (WP-18)
- `app/js/engine/products.js:109` (`productsByMaterial`) filters out the products a lookup did not find with
  `.filter((g) => g && !g.retired)`; the type system cannot see that this removes the `undefined`, so the port states it with one cast. (WP-18)
- `app/js/engine/ledger.js:92` (`requirementWords`) looks an operator up in a literal that has three of the four operators the
  scenario allows (`>=` has no entry and reads as no prefix). The index is an open string, so the port casts
  the literal. (WP-18)
