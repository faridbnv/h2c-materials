# What is left of the plan

The plan the owner approved is in the session record; this is the part of it that has not been done, with what
each step now knows that the plan could not. Rewritten 2026-09-19, after batches b01 to b08.

## Where the import stands

| | Documents |
|---|---:|
| Applied: their values are in the database | 363 |
| Read and waiting for a batch | 274 |
| One sheet under another name, or another language's edition | 311 |
| Fetched but not yet read, or not yet fetched | 976 |
| Dead links, a user guide, a safety sheet | 12 |

Eight batches have landed: Bambu re-read, 3DXTECH, Polymaker, Spectrum, iSANMATE, the held PPE/PS blend, Extrudr
and SUNLU. The database holds 131 materials, 375 grades, 4,801 measurements and 524 sources, against the 103, 179,
2,645 and 300 it held when the plan was written.

Nothing in the corpus is now unreadable for want of a text layer: `npm run ingest:ocr` reads a scan on a copy,
caches it under the document's own digest as an optical reading, and `ingest:apply` refuses a row from one that
nobody has checked against the page image. Fiberlogy's whole library came in that way.

## 1. The five libraries already read and waiting

colorFabb (67), Fabru / purefil (38), Flashforge (37), Eryone (30), Fiberlogy (43, all but ten of them scans).
Their proposals exist; what they need is what every maker's first batch needs — the reader taught that maker's
layout, proved against the three makers whose sheets are transcribed by hand, and then a review.

Four SUNLU products and eight Extrudr products wait beside them: a polymer nobody names, a finish material that
does not exist yet, or a sheet that reprints another product's table.

## 2. What each new maker's batch costs

Every library so far has needed the reader taught something, and each thing it learned was a rule rather than a
special case: a unit printed before its value, a value printed above its label, a designation whose digits are not
a value, a table printed beside another table, a bracket that lost its opening, a label the lexicon cannot read in
full. Parity on Spectrum, 3DXTECH and Polymaker is the gate that says none of it broke what was already right:
100%, 100% and 93% through all eight batches.

Two things are still missing from the reader, and both cost values on every maker:

- **A property the database does not carry.** Flammability class, decomposition temperature, volume resistivity,
  permittivity, moulding shrinkage, tear strength, abrasion loss, compression set, Poisson's ratio: 162 rows on
  SUNLU's sheets alone, and the reader names each one. `properties.csv` rows and the units beside them are a data
  decision, and the plan's Phase 1.9 is where they belong.
- **A polymer with no row.** PBT, PHA, TPS, COC, SEBS, SAN, PA11, LCP, PVC and PBAT are still missing; PCL and the
  PPE/PS blend now have rows, each written from a producer's reference that was fetched and hashed.

## 3. What is not fetched

976 documents. 3DJake's 317 are Wave D, and most are copies of sheets that arrive with their makers. The rest are
the libraries in the table below, being fetched as this is written, and the ones behind a viewer or a request form:
FormFutura's SharePoint (64), Nanovia (73), QIDI (36), Siraya (20), Recreus (16), INTAMSYS's request form (33).

## 4. Wave D: the retailers

737 rows, most of them copies. Fetch and dedupe first, then the ~120 documents of brands that reach the market
only through a retailer. Last, so every twin has a manufacturer's sheet to point at.

## 5. The estimate stage at scale

`npm run scale` builds twice today's data and holds compile and validate inside its budget; the margin is the
thing to watch, because the spread search is hundreds of fits per headline and a fit is cubic in what it sees. The
cap that keeps it affordable is `fitting.spreadSampleMax` (D77). The trigger for the exact block solve is a
headline above 4,000 observations or the estimate stage above five minutes: today the largest headline has about
600 observations and the stage takes 12 seconds.

What the batches have already taught the model, each in its own place: a support product with no measurements is
not characterised and one with them is read like any other material; a conditioned bar beside its own dry one is
another state, not a repeat; a limit a material's own grades publish is a floor for its shown range (D78); and
whether a declared variant moves its family is measured against an ordinary sibling.

## 6. What the pipeline still does not do

- **Evidence rows.** `propose` reads properties, print settings and certification claims, but proposes no
  `evidence.csv` rows for chemical, safety or certification statements.
- **`material_links.csv` citations** for a new material.
- **A sheet that covers several products.** One document is one proposal and one product, so a shared table reads
  as one of the products it lists. Eleven SUNLU sheets and several Polymaker family sheets wait on this; the
  owner's ruling R053 says what they become: a grade each, citing its own sheet, with the values recorded once.
- **Corrections to a document already registered.** A proposal for a registered document produces new rows, not
  corrections. m62 did that work by hand for 84 rows after the reader improved; `edits[]` through
  `scripts/migrate/source-edits.mjs` is what would make it a part of the pipeline.
- **The second read at every batch.** b01 and b02 were read a second time by a different reviewer, which found the
  source collision m55 repairs. b03 to b08 were not.
