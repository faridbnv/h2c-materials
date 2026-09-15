# Workstream C: pipeline review notes

Baseline `ef26807` on `data/csv-source`, reviewed against the committed `dist/db.json` and
`build/reports/validation-report.md`. I ran no build, verify or snapshot. Every claim below comes from reading
the code and running a read-only script. The scripts are in `repro/` and are run from the repository root,
for example `node docs/audits/2026-09-15-filtering-estimates-data/pipeline/repro/anneal-groups.mjs`.
`repro/mapper.mjs` regenerates `mapper-table.csv`, and `repro/write-findings.mjs` regenerates `findings.csv`.

## 1. Mappers

`mapper-table.csv` lists every distinct raw text in the measurement columns I was asked to cover, with its
row count, the value the build maps it to, and a flag.

- **Moisture** (`normalize/moisture.js`). The mapping comes from the vocabulary, and an undeclared wording
  stops the build. All 12 wordings are declared sensibly. "50% RH" maps to conditioned, and the three storage
  or drying-guidance wordings map to not-stated. No conditioned wording is mapped dry. There is one
  inconsistency: V002155, V002156 and V002159 say "Not published" although their Post-processing says the
  specimens were dried for 48 h (C-15).
- **Direction** (`normalize/direction.js`). Nine spellings are mapped. "45/45" is in the vocabulary but has
  no mapping, so it silently becomes `unknown` (C-06). Compile keeps every source label apart from XY.
  `estimates.js` does not: it treats XZ, "Horizontal (source label)" and "Along flow" as XY, and "Vertical XZ
  (source label)" as Z (C-03). No ambiguous direction reaches an XY headline, because validate.js
  HEADLINE-DIRECTION holds. 19 mechanical rows use "Not applicable" as their direction (C-07).
- **Specimen type** is not normalised. Consumers test prefixes:
  - estimates: `Raw material` becomes the moulded kind, and `Film` is excluded;
  - related evidence: `Printed specimen` sets `printed`;
  - impliedBounds: excludes only `Raw material`.

  Film and Filament rows therefore leak into impliedBounds (C-02). Filament rows also leak into estimates
  (C-16).
- **Post-processing** has no mapper at all, and "annealed" is ignored everywhere (C-01, C-05, C-14). The most
  common wording, used on 492 rows ("All the specimens were annealed and dried at 55–80 °C…"), is Bambu Lab's
  drying boilerplate. No as-printed alternative exists on those sheets, so they are not the problem. The real
  as-printed/annealed pairs are in open item (a).
- **HDT standard and load** (`normalize/thermal.js` and the typed `Test load MPa`). For all 195 HDT rows the
  parser agrees with the typed column, and no non-HDT row carries a load. The data spells the 66 psi and
  264 psi loads with MPa beside them ("ASTM D648 Method B, 264 psi (1.82 MPa)"), so they read correctly. A
  text that gave only psi would read as "load not stated", and one naming both loads resolves to 0.45 (C-08).
  V002188 and V002189 carry the source's inverted ISO 75 method letters; the number wins, and both values
  are Not published.
- **Operator and Data status** (`values.js`). The mapping is complete. `>` and `<` become one-sided
  intervals, retired duplicates are dropped before compile, and quarantined rows carry no number.
- **Notch** passes through unchanged. No headline or estimate uses it.

## 2. Units

`repro/units.mjs` checks every published row for Raw numeric × Conversion factor against Normalized value:
0 mismatches, and every normalised unit is one its property allows. All conversion combinations are
physically correct. They include kgf/cm² to MPa (V000730, V000731), kgf·cm/cm to J/m (V002084) and ppm/K to
µm/m/K. The only approximation is specific gravity ×1000 (V002176), which is about 0.25% high. No psi, ksi
or J/m→kJ/m² conversions exist: J/m stays J/m.

Two gaps:

- The upper bound and uncertainty columns are converted by hand and never reconciled (C-12). All agree today.
- Melt flow, water absorption and notch states are pooled within one property, and no column records their
  conditions (C-13).

## 3. Headline selection

`repro/headlines.mjs` checks all 362 value headlines. Results:

- **Conditioned, moulded, film, filament:** none.
- **Load:** no headline cites a stated load other than 0.45 MPa. Six cite an unstated load (M004, M097,
  M098, M099, M100, M102), and all six carry `loadStated:false` and a load bracket.
- **Direction:** every directional headline cites an XY measurement.
- **Strength endpoint:** every tensileStrengthXY headline cites "Tensile strength (endpoint unspecified)",
  and none has a yield or break value from the same grade and source beside it. On these sheets
  "unspecified" is the only ultimate strength published.
- **Annealing:** 133 headlines mention annealing. 119 of them are the Bambu boilerplate. The rest are
  Polymaker and Fiberon sheets on which every row was annealed (PA6/66, PA612-CF, PA612-ESD, and
  the PET-GF mechanical headlines), so no as-printed alternative exists for those.
- **The two grades that publish both states** headline the as-printed HDT: PLA-GF V000350 and PET-GF
  V001931. That choice is correct and pinned by `test/database.test.js:449`.
- **Outliers against the same grade's other values:**
  - PLA-GF and PET-GF HDT: as-printed against annealed, correct choice.
  - PA6/66 V001023, V001025, V001027 against conditioned V001035, V001037, V001039: dry against 70% RH,
    correct choice.
  - PA612-CF V001059 and PA612-ESD V001242 elongation against the wet values: correct choice.

No selected headline is wrong today. The checks that would keep it that way are missing from the build
(C-05).

## 4. Rules and documentation

- **Parity:** every code in `docs/RULES.md` is raised in `build/src` or `scripts`, and `issue()` throws on an
  unknown code. Compile and typed-values bypass `issue()` (C-11).
- **The 8 current warnings**, judged:

| Warning | Judgement |
|---|---|
| IMPACT-UNITS | Correct and informational. |
| HDT-LOAD-UNSTATED | Correct. Should be per-record accepted findings, so a seventh cannot slip in (C-10). |
| EST-SUMMARY | A summary, not a warning. |
| EST-OUTLIER | PET-GF 81.6 against about 114 is caused by C-01. OBC V001683 (905 kg/m³ is normal for an olefin block copolymer), PPA-CF V001310 and PC-ABS V001550 should be accepted with a reason or re-read. |
| EST-WIDE | 14 estimates. Acceptable with reasons. |
| EST-FAMILY-ORDER | PLA-CF 2.79 against PLA 2.865: different makers, accept. |
| FAMILY-ENTRIES | Informational. |
| NO-MEASUREMENTS | PA66-CF and PA612-GF. Informational. |

- **Errors by design:** HDT-LOAD-WRONG, HEADLINE-DIRECTION and QUARANTINE-NUMERIC are already errors.

## 5. Contract with the app

- **Read and written with the same meaning:** `loadBracket`, `canScreen`, `screenRange`, `plausible`,
  `impliedBounds` and `vetoedBy` (engine output). No field is read but never written.
- **Written but never read:** `related.intervals`, which carries a stale comment, plus `screenBasis`,
  `bounds[].side` and `.sd`, `measurementConditions` and `directionText` (C-14).
- **Divergent semantics:** an interval of kind `uncertainty` means three different things (C-04). The engine
  uses it as hard bounds, so a published 35 ± 4 MPa cannot pass ≥ 33. The estimate model uses it as noise.
  impliedBounds uses it as a lower bound at value + uncertainty.
- **Worst engine effect found:** film-specimen strengths veto the estimate screen, so PLA stays a candidate
  for tensile strength ≥ 140 MPa (C-02, `repro/engine-veto.mjs`).

## 6. Estimate wiring

- **Exclusions:** quarantined rows, retired-duplicate rows (dropped at compile), retired grades and Film
  specimens are excluded. Declared grade variants enter with their own covariate, as designed. Filament
  specimens are not excluded (C-16). Excluded materials and family entries are left out of the pool.
- **Hide set:** each headline is hidden by (material, formulation, kind == HEAD). For current data every
  value headline's own measurement has kind HEAD, so the hide set contains it. Hiding averages all
  same-kind repeats together, which is where C-01 does its damage. No product is filed under two materials
  with different formulation keys.
- **Leakage:** hyperparameters, conversion offsets, the between-product spread and conflict flags are
  fitted with the hidden headline in the data. This is a small optimism, not a hide-set bug (C-09).
- **Determinism:** no randomness, clock or unordered iteration.

## 7. Open items

### (a) Grades with both as-printed and annealed HDT (`repro/anneal-groups.mjs`)

| Grade | Load | As printed | Annealed | Headline | Estimate observation (kind) |
|---|---|---|---|---|---|
| G019-01 PLA-GF (Polymaker HT-PLA-GF) | 0.45 | V000350 75.5 | V000353 114.7 | V000350 | 95.1 (HDT 0.45), the mean of both |
| G019-01 | 1.8 | V000349 59.7 | V000352 84 | n/a | 71.85 (HDT 1.8), the mean of both |
| G068-02 PET-GF (Fiberon PETG-GF15) | 0.45 | V001931 81.6 | V001933 133.7 | V001931 | 107.65, the mean of both |
| G068-02 | 1.8 | V001930 71.8 | V001932 87.3 | n/a | 79.55, the mean of both |
| G074-02 PPS-GF (two annealing temperatures) | 0.45 | n/a | V002071 236.3 (130 °C), V002072 248.9 (230 °C) | none (hdt045 not headlined) | 242.6 |
| G074-02 | 1.8 | n/a | V001392 125.8 (130 °C), V002073 219.6 (230 °C) | n/a | 172.7 |

The annealed Vicat and mechanical rows of G019-01 are averaged the same way, with small differences.

- **Compile:** handles these correctly. The as-printed value is the headline, and the annealed one is
  related evidence, but that is only because the owner chose it; no rule enforces it.
- **Estimates:** treat the rows as repeats (`estimates.js:264`). This produces the PET-GF EST-OUTLIER and the
  PLA-GF, PET-GF and PPS-GF conflict entries, and skews the 0.45/1.8 MPa conversion pairs and the
  unstated-load bracket back-test.
- **Minimal fix (C-01):** declare a post-processing state in the vocabulary, add it to `kindOf` and the
  grouping key, and for hdt045 exclude annealed rows or convert them with a documented offset.

### (b) Izod strength against Izod impact strength

**"Izod strength", 21 rows:** V000418, V000419 (qualitative), V000762, V000763 (Not published), V001486 J/m,
V001529, V001540 (quarantined), V001576, V001673 J/m, V001729–V001734 J/m (PEI 9085, notched and unnotched
× XY/XZ/ZX), V001745, V002055 (qualitative; cites ISO 179), V002084 J/m, V002167 (qualitative), V002207,
V002208.

**"Izod impact strength", 13 rows:** V001856–V001861 (BASF PC-GF30, notched and unnotched × XY/XZ/ZX),
V001877–V001879 (Essentium PPS-CF), V001911 and V001912 (eSUN PLA-Lite), V001953 (qualitative, J/m) and
V001963 J/m (moulded).

Both names are one ISO 180 / ASTM D256 test. No code depends on either name: `property-references.js` does
not list them, and `validate.js:203` matches `/Izod/` for both.

**What blocks the merge:**

1. Renaming the `Property` cell on the 21 measurements is an Edited change and passes
   `scripts/data/diff.mjs`.
2. Deleting the `Izod strength` row in `properties.csv` (primaryKey `Property`) is a Removed record. That
   fails `.githooks/pre-commit:11` and CI `.github/workflows/verify.yml:35`, both of which run
   `diff.mjs --fail-on-removed`.
3. Keeping the row instead leaves an empty property in `db.registry.properties` and in the Mechanical drawer
   tab.
4. `test/registry-ui.test.js:37-42` compares the drawer's properties with `test/fixtures/legacy-constants.json`
   (whose DETAIL_MECHANICAL includes "Izod strength"). Hiding that property would fail line 39 and change
   the "gained" list on line 42.

**Proposed minimal schema: a replaced-property record**

- In `schema/tables/properties.schema.json`, add two columns:
  - `Status`: required, vocabulary `property-status` = `active | replaced`.
  - `Replaced by`: a reference to `properties.Property`. It is required when Status is replaced, and "Not
    applicable" otherwise.
- `registry.js` leaves replaced properties out of `db.registry.properties`, so nothing shows an empty
  property.
- New error PROPERTY-REPLACED-IN-USE: an active measurement (not a retired duplicate) cites a replaced
  property.
- New error PROPERTY-REPLACEMENT-INVALID: `Replaced by` is itself replaced, has a different Domain, or its
  Units do not include every unit of the replaced property.
- Migration `m18`: rename the 21 measurement rows through `source-edits.mjs` with `expect: 'Izod strength'`,
  set the property row to `replaced` / `Izod impact strength`, and update the legacy fixture expectation in
  the same commit. The record stays, so the no-deletion guard is satisfied and the audit trail says where the
  name went.

## Measurements that need a source re-read

| Rows | Reason |
|---|---|
| V002203, V002204, V002207 | Locator says X-Y; Direction is "Not applicable". |
| The other 16 mechanical rows with Direction "Not applicable" (C-07) | Direction probably Not published. |
| V002155, V002156, V002159 | Moisture state. |
| V000894, V000920, V002078 | Dry under a 50% RH heading. |
| V002055 | Izod or Charpy. |
| V001700 | Filament specimen. |
| V001683, V001310, V001550 | EST-OUTLIER headlines. |
