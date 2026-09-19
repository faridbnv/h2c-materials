# What is left of the plan

The plan the owner approved is in the session record; this is the part of it that has not been done, with what
each step now knows that the plan could not.

## 1. Fourteen Spectrum documents wait on a ruling

[rulings/pending.csv](rulings/pending.csv) Q003, Q004 and Q005. Q004 is the one that matters beyond Spectrum:
every maker sells silk, wood, marble, glitter and metal-filled PLA, so whichever way it is ruled decides where
several hundred later documents file. The evidence for it is in the question.

## 2. Wave B: the large PDF libraries

One maker per batch, in this order, each with a parity run against the sheets the database already holds before
any sheet nobody has read:

| Maker | Documents | Already registered |
|---|---:|---:|
| SUNLU | 53 | 0 |
| Flashforge | 41 | 1 |
| colorFabb | 39 | 0 |
| Eryone | 38 | 1 |
| Extrudr | 38 | 0 |
| SIDDAMENT | 32 | 0 |
| Raise3D | 29 | 1 |
| IPCON | 27 | 1 |
| 3D4Makers | 26 | 0 |
| Fillamentum | 25 | 2 |
| Prusament | 20 | 2 |
| Essentium / Nexa3D | 20 | 0 |
| eSUN | 18 | 1 |
| Bambu Lab | 41 | 40 |
| Polymaker / Fiberon | 53 | 24 |
| iSANMATE | 33 | 14 |
| others under 15 | ~90 | some |

Bambu, 3DXTECH, Polymaker and iSANMATE are re-reads as much as imports: their share of the transcription damage in
[../../OPEN-PROBLEMS.md](../../OPEN-PROBLEMS.md) §1 and §9 is corrected by reading their sheets again, which is the
same work as importing the rest of their libraries.

What each of those batches needs that Spectrum did not:

- **A polymer the database has no row for.** PBT, PCL, PHA, TPS, COC, SEBS, SAN, PA11, LCP, PVC and PBAT appear in
  the corpus and have no row in `polymers.csv`. Each needs its group, morphology, how it solidifies in a print,
  water uptake and neat density, from a resin producer's reference that was fetched and hashed.
- **A family for them.** `Specialty / Other`, per the plan.
- **Imperial units.** 3DXTECH publishes in psi and ksi. The conversion table holds them; a °F-only sheet would need
  an affine conversion the schema cannot express, and the census says whether one exists.

## 3. Wave C: what is not a PDF

151 documents behind a viewer (FormFutura 63, Nanovia 37, QIDI 36, Siraya 20, Recreus 16), 57 web pages, 99 scanned
sheets with no text layer (Fiberlogy 32, 3DJake copies 61), 76 dead links and 33 behind a request form. The fetch
adapters and the OCR path are written but only the direct-PDF path has been used. A scanned sheet's rows need
`review.visual` before `ingest:apply` will take them.

## 4. Wave D: the retailers

737 rows, most of them copies of what Waves A to C bring in. Fetch and dedupe first, then the ~120 documents of
brands that reach the market only through a retailer.

## 5. The estimate stage at scale

`test/scale.test.js` builds twice today's data and holds compile and validate inside 90 seconds. It passes today at
about 40 seconds, and the margin is the thing to watch: the spread search is hundreds of fits per headline and a
fit is a dense Cholesky, cubic in what it sees. The cap that keeps it affordable is `fitting.spreadSampleMax` in
`build/mappings/estimate-model.json`, and the fits themselves are now shared between calibration folds whose
hyperparameters land on the same grid point.

The plan's Phase 5 option 2 is the next step when the margin goes: an exact block solve by chemical group with the
shared columns applied through a Woodbury identity, which is 5 to 10 times cheaper again and changes no result.
Its trigger is a headline above 4,000 observations or the estimate stage above five minutes in `npm run build`.
Today: 377 observations on the largest headline, 9 seconds.

## 6. What the pipeline still does not do

- **Evidence rows.** `propose` reads properties, print settings and the sheet's certification claims, but does not
  yet propose `evidence.csv` rows for chemical, safety or certification statements. Spectrum's sheets carry few;
  the makers with medical or food-contact lines carry many.
- **`material_links.csv` citations** for a new material.
- **Corrections to a document already registered.** A proposal for a registered document produces new rows, not
  corrections. The plan's `edits[]`, through `scripts/migrate/source-edits.mjs`, is what turns a re-read into
  corrections that each name the value they replace, and it is what OPEN-PROBLEMS §1 and §9 wait on.
- **The second read at every batch.** The first two batches were read a second time by a different reviewer, which
  found the source collision m55 repairs and five readings the pipeline was losing. The third was not.

Headline selection for a new material is done: a material the database creates carries one `value` row per key
its own measurements support, chosen by the rules the build judges them by.
