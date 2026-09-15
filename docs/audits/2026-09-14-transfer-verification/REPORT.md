# Transfer verification, data cleanliness, estimates and screening (2026-09-14 to 2026-09-15)

Branch `data/csv-source`, commits `38d6f75` onward (listed in the appendix). Pushed to the branch; not merged into `main`. The owner asked for four things:
proof that the workbook reached the tables correctly; clean data; estimates and the other features working, with
fixes; and a pipeline that stays robust, reviewable and debuggable as entries double on the same criteria.

## Summary

- **The transfer is proven cell by cell.** All 99,538 workbook cells were compared with their home in the tables or
  the build: 0 unexplained differences, and the one value display rounding had cut (`V000731`) restored.
- **The sources, not the workbook, held most of the errors.** Re-reading every cited PDF (hashes checked) found
  wrong test conditions on five two-table data sheets, un-notched impacts filed as notched, moulded values filed as
  printed, a PHA title on a PP sheet, and 173 published values that had never been transcribed. All are corrected,
  each against its page, in guarded migrations m10 to m17.
- **Three estimate-model defects are fixed.** Conditioned (wet) nylon values were read as dry; a one-sided bound
  ("> 16.5 MPa") counted as an exact value; and a lightweight or filled product pulled its whole polymer family.
- **Screening is now measured, not ruled.** Every build back-tests which evidence may screen a material out
  (D48). Of the 2,055 leaks the filtering audit counted, none remains against the range the rule defends; 107
  materials stay in because their own measurement bounds the headline and meets the requirement, which is correct.
- **The pipeline checks more, and shows its effects.** `npm run verify` now also runs the data lint (reasoned
  baseline), the generated rule catalogue and data dictionary, a committed review snapshot of every headline,
  gate, template result and warning, and an interface check in headless Chrome. 196 tests pass.

## 1. The transfer

`npm run migration:ledger` reads the retired workbook from git with native cell values and compares every cell with
the CSV cell or the derivation that replaced it (`ledger.csv`, `ledger-summary.json`).

| Class | Cells |
|---|---|
| Equal | 87,178 |
| Display padding removed, dates, booleans and numbers made canonical (m01) | 5,985 |
| Formula caches as the build read them (139 were stale in Excel and kept as read) | 3,003 |
| Derived columns reproduced by calculation (headlines, prices, lists, guidance) | 2,040 |
| Text cleanup of extraction artefacts (m07: ligatures, full-width punctuation, run-together words) | 427 |
| Floating-point noise in a formula result | 74 |
| Edited or added after the conversion (the source corrections below; `npm run data:diff -- 0a61cee`) | 835 |
| **Unexplained** | **0** |
| **Precision lost** | **0** (the one found, `V000731` 2.353596, restored) |

The workbook had no hidden sheets, comments, merged cells or data outside the named columns. The Materials title
notes (A2 to A4, "96 relevant entries") were stale and are not carried.

## 2. What re-reading the sources found

Every source cited by measurements that is a PDF (131 documents; Kimya PEBA-S now returns 404) was fetched again,
its SHA-256 checked against `sources.csv`, and its text compared with the tables (`npm run audit:sources`). A
second pass lists every property a document names that the source has no row of, because values printed unit-first
or without a unit escape a number search. Doubtful layouts were checked on the rendered page.

| Migration | Sources | What was wrong | Fixed |
|---|---|---|---|
| m10 | PolyMide PA6-GF, CoPA, PA12-CF; PolySonic PLA; HT-PLA-GF | Two tables per sheet (dry and conditioned, water-immersed, annealed, two print speeds) given one set of conditions; the lint's "duplicate" V001184/V001196 was the dry and conditioned result | 287 cells; 2 values added |
| m11 | 3DXTECH HyperLite PP; Spectrum HDPE; iSANMATE PP | HyperLite is a lightweight grade (0.81 g/cc, "specialty additive ... ultra low density"); Spectrum HDPE's 1.1 g/cm³ and 3.5 GPa exceed unfilled polyethylene; iSANMATE's density, strength and impact were missing and its title named a PHA product | `Variant` column; 4 values added |
| m12 | PolyMax PETG-ESD; PolyMide CoPA | Directions the sheets print | 2 rows |
| m13 | Fiberon PA612-CF15, PA612-ESD, PPS-GF20, PET-GF15 | Un-notched Charpy filed as notched (18 rows); a pasted section heading in every preparation note; thermal tables, melt index and water absorption missing | 22 values added; PA612-ESD's HDT headline is now measured (157 °C) |
| m14 | 11 Spectrum sheets | HDT at both loads missing on five sheets; PA6 and PPS moduli missing; injection-moulded values filed as printed; eU (un-notched) rows unlabelled; the HDT load parser missed 1.81, 1.820 and ISO 75-2's method letters | 25 values added |
| m15 | 40 Bambu Lab sheets | The notched impact printed after "; " never transcribed; PLA Tough Upgrade's recorded Z impact is the Silver colour's; no melt index transcribed | 48 values added |
| m16, m17 | Polymaker, eSUN, iSANMATE, IPCON, Flashforge, 3DXTECH, Fillamentum, Prusament | Water absorption, low-temperature impacts, hardness and melt flow missing; iSANMATE CF-ABS had one of its eight values; PETG's strain at strength filed as break; a self-contradictory HDT pair (ESD-ABS, quarantined); Flashforge's swapped bending labels | 72 values added, 8 cells corrected |

Checked and left as published: 3DXTECH PC-ABS elongation 75 % and EcoMax PLA HDT 80 °C (both what the sheets
say; the model reports them as outliers), and Eryone's and Flashforge's "X-Z" results, which are about half the
X-Y values and so are not read as on-edge bars.

The remaining completeness findings are descriptive text ("low environmental impact"), N/A cells, and the two
resin guides that are referenced in part by design.

## 3. Cleanliness

- **Extraction artefacts** removed from text columns (m07), with every parsed value proven unchanged.
- **Typed columns** hold the values the build decides on (process windows, drying, enclosure, HDT load; m08); the
  parsers now check them, so a parser change that would move a value fails the build (PARSE-MISMATCH).
- **Mappings keyed by ID** (family entries, chamber bands, environment topics; m09) and checked at the gate.
- **Every check has a stable code** (`docs/RULES.md`), and every property name the code relies on is checked
  against the registry.
- **The data lint runs in verify.** 95 findings at the start: 44 near-duplicate spellings were all raw source
  text (raw columns keep the source's spelling; typed columns are checked), 13 uncited sources now carry a Citation
  role, 13 redundant coverage findings are Superseded, 2 spacing errors were fixed, and 23 remain accepted with a
  reason per record (`data/review/accepted-findings.csv`).

## 4. Estimates

| Defect | Effect | Fix |
|---|---|---|
| A value was read as wet only if its moisture label contained "wet" | 84 "Conditioned: 70% RH" rows, nylons among them, were treated as dry | Each moisture wording declares its State; an undeclared wording stops the build. Dry PA6 modulus 1.83 → 2.03 GPa, PA66 1.98 → 2.22 GPa |
| A one-sided bound was an exact point | PEBA strength 16.4-16.6 MPa from "> 16.5" | A bound enters at its value with a documented half-width, never calibrates a conversion, and limits its own material's estimate (OBC elongation plausible from 711 %, above its "> 700 %") |
| A variant product pulled its family | PP density an outlier at 810; PE's filled HDPE lifted the polyolefin prior | Declared grade variants get their own covariate with a loose documented spread |
| Impossible HDT ranges | BVOH and PE plausible ranges below 0 °C | A 45 °C soft floor and the physical limits, published where they move a range |

Calibration holds for every headline (likely range 79-81 %, plausible 94-96 %). Still flagged for a look: 14 wide
estimates (mostly elastomers: TPC/TPEE, OBC, PEBA; PE and POM heat deflection), PLA-CF modulus below PLA's, and
four outliers (OBC density against its elastomer group, PPA-CF modulus, PC-ABS elongation, PET-GF's as-printed HDT).
All are in `build/snapshot/warnings.csv`.

## 5. Screening (D48)

Which evidence may screen a material out is back-tested every build: each measured headline is hidden as far as a
class requires and predicted with the production ranges. A class is certified when, over at least 20 held cases,
neither side misses significantly more than the 2.5 % a 95 % range allows (exact binomial test).

| Headline | This grade | This material | Family |
|---|---|---|---|
| Density | not enough cases (0) | certified (24) | certified (84) |
| Stiffness | certified (65) | certified (21) | certified (68) |
| Strength | certified (52) | not enough cases (10) | certified (53) |
| Elongation | certified (51) | certified (24) | certified (69) |
| Heat deflection | certified (53) | not enough cases (18) | certified (61) |

An uncertified class screens only where the certified family-only range fails too. The unstated-load HDT bracket
failed its back-test as one Gaussian (4 of 54 values above its top) and is certified per matrix: amorphous (38
pairs) screens, the semicrystalline classes do not yet. A screen is vetoed only by a measurement that bounds the
headline from below (yield or break under ultimate strength, yield strain under break strain, HDT at 1.8 MPa under
0.45 MPa). `test/screening.test.js` keeps the leak sweep and the structural invariants permanent.

## 6. Pipeline

| Addition | Command | What it guards |
|---|---|---|
| Transfer ledger | `npm run migration:ledger` | The conversion, cell by cell |
| Source completeness | `npm run audit:sources` | Published values missing from the tables |
| Data lint with baseline | `npm run data:lint` (in verify) | Quality the schema cannot express |
| Rule catalogue, data dictionary | `npm run docs:rules`, `docs:dictionary` (checked in verify) | Codes and columns documented |
| Review snapshot | `npm run snapshot` (checked in verify) | Every change's effect on headlines, estimates, gates, templates and warnings, in the diff |
| Interface views | `npm run ui:check` (in verify with Chrome; required in CI) | What a reader sees; shared links reproduce views |
| Scaffolding | `npm run data:new`, `data:retire` | Complete rows; retirements with every dependent listed |
| Guarded source corrections | `scripts/migrate/source-edits.mjs` | Re-runnable batches that stop if the data moved |

At twice today's entries the gate takes about 0.3 s and compile with validation about 10 s (`test/scale.test.js`).

## Open items

1. **Heat deflection after annealing.** A grade's as-printed and annealed HDT values are averaged as repeats
   (PET-GF 81.6 and 133.7 °C, HT-PLA-GF); the model's conflict check down-weights them, but a declared post-processing
   state would model them properly.
2. **Two names for one property.** "Izod strength" (21 rows) and "Izod impact strength" (13 rows) are the same test.
   Merging them removes a registry row, which the no-deletion guard refuses; it needs a "replaced by" record.
3. **Uncertified screening classes.** This-material strength (10 cases) and heat deflection (18), and the
   semicrystalline HDT brackets, screen only with the family model's agreement until more data certifies them.
4. **HyperLite PP** stays PP's representative grade, declared a variant. Whether a lightweight PP deserves its own
   material, as PLA Aero and ASA Aero have, is a scope decision for the owner.
5. **Kimya PEBA-S** (R-KIMYA-PEBA-S-TDS) no longer downloads (HTTP 404); its recorded hash is the only copy.

## Appendix: migrations

Each is a script under `scripts/migrate/`, re-runnable, and each changed the data only through `table-io.mjs` with
expected-value guards. m01 to m06 are the conversion (`npm run migration:verify` replays them); m07 to m09 were
proven to leave the compiled database unchanged apart from listed display strings; m10 onwards are corrections
against re-read sources, reviewable with `npm run data:diff -- 0a61cee`.

| Migration | Commit | What it does |
|---|---|---|
| m01 types | conversion | Numbers, dates and booleans written canonically |
| m02 headlines | conversion | Headline values become selections in `headlines.csv` |
| m03 prices | conversion | Price medians and per-kg prices calculated, not stored |
| m04 grade roles | conversion | Grade Role and Status |
| m05 material links | conversion | A material's citations as rows |
| m06 registry | conversion | `properties.csv` and `headline_definitions.csv` |
| m07 text cleanup | `29c7d13` | Extraction artefacts out of text; 427 cells, every parsed value unchanged |
| m08 typed columns | `3c587bb` | Typed process windows, drying, enclosure, hardened nozzle, test load (D49) |
| m09 mappings | `f9f97ff` | Family entries, chamber bands and environment topics keyed by ID (D51) |
| m10 source conditions | `3130bef` | Two-table data sheets' conditions; conditioned values convert to dry |
| m11 grade variants | `ee02db8` | Variant column; HyperLite PP and Spectrum HDPE; iSANMATE PP's missing values |
| m12 directions | `2b17bb5` | Two printed directions |
| m13 Fiberon | `a9cd982` | Un-notched impacts, preparation notes, 22 values |
| m14 Spectrum | `2d865d1` | 25 values, moulded specimens, notch states, HDT load spellings |
| m15 Bambu Lab | `f441be7` | Notched impacts, a Silver-only value, 40 melt indices |
| m16 other sources | `495fd09` | 68 values, 8 corrections; one quarantined HDT pair |
| m17 iSANMATE ASA-GF | `8ade8fb` | Four values left out of m16 |
| m18 review classes | `57574de` | Citation role, Superseded coverage, two spacing fixes |

Other commits of the round: `38d6f75` transfer ledger; `999474c` rule codes; `f6b3f24` name references;
`0a61cee` physical limits and estimate flags; `db4c35b` source-completeness audit; `ecf7d7d` screening back-test
(D48); `f77c3bb` data:new, data:retire and interface fixes; `68df025` data dictionary and review snapshot;
`4b00f90` interface check; `a4ce100` documentation.
