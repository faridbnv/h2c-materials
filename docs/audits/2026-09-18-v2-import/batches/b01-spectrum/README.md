# Batch b01-spectrum

Ten Spectrum data sheets, the first batch of the Version 2 import and the first data in this repository that
entered through `scripts/ingest/` rather than by hand. Applied 2026-09-18 by `m53-batch-b01-spectrum`.

## What entered

| Table | Records |
|---|---:|
| sources | 10 |
| grades | 10 |
| measurements | 87 |
| profiles | 11 |
| profile_notes | 41 |
| coverage | 2 added, 2 superseded |

The ten products join seven materials that already existed: PETG (three products), PLA (two), PA6-GF, PA6-CF,
PETG-CF, ASA-CF and PP. No new material, and no headline of an existing material moved.

Every row names the page and line it was read from, and who accepted it. The reviewed proposals are
`../../proposals/b01-spectrum/`, one file per document, keyed by the SHA-256 of the bytes that were read.

## The gate

`npm run ingest:propose -- --provider Spectrum --compare` reproduces **111 of 113** values (98%) that somebody
transcribed by hand from twelve other Spectrum sheets, on property, value, unit, direction, load and notch. The
plan's gate is 95%. The two it misses are both on one sheet that prints its values in kg/cm²: a flexural modulus
written "24.000 kg/cm2", which is ambiguous between twenty-four and twenty-four thousand and is left for a person,
and an Izod strength in kg·cm/cm, a unit the conversion table does not hold.

## What was decided rather than read

- **Two Charpy rows contradict their own standard.** Spectrum's PA6 Low Warp GF30 and CF15S each print a notched
  Charpy and cite ISO 179/1eU, the unnotched designation. The sheet's own word for the row is kept and the
  disagreement is written into the row's Notes, which is what held the row back for a person to read.
- **One physics finding accepted.** The PP sheet publishes "Charpy impact strength, notched (dry) 65 kJ/m2 ISO 179
  1eA". That is above the window an unfilled semicrystalline polymer is expected in (`MEAS-PHYSICS-WINDOW`,
  W0048). A high-rubber PP copolymer reaches it, the value is the sheet's own, and the acceptance says so.
- **Two vocabulary rows**, each added with the first data that uses it: `ASTM E2092` in `schema/vocab/standards.csv`
  (the PLA Tough sheet cites it for its heat deflection) and `Layer height` and `Shell / walls` in
  `schema/vocab/profile-topics.csv` (nine of the ten sheets publish both).

## What it did downstream

`build-diff.txt` holds the whole difference; `changelog.csv` holds the record-level one. The shape of it:

- 87 new measurements, and the estimates of every material that gained observations moved with them.
- Two `EST-OUTLIER` acceptances no longer occur (Braskem FL300PE's elongation, 3DXTECH FLUORX PVDF's density) and
  were removed, as a stale acceptance must be.
- Two template rows changed which materials they screen: PLA Silk is now screened out of a flexible component by
  its narrowed elongation estimate, and PVB is no longer screened out of it.
- PA12's density estimate, 989–1060 kg/m³, is the first range narrow enough beside its own magnitude that three
  significant digits of its larger end moved an end further than the tenth of the width the formatter promises.
  `rangeStep` now lets the width decide there, and the range prints "989–1,060" instead of "980–1,060".

## Running it again

```bash
node scripts/migrate/m53-batch-b01-spectrum.mjs   # prints "0 record(s) written"
```
