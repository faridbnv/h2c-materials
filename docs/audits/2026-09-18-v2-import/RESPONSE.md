# What has been done

Updated as the work lands. The plan is the one the owner approved on 2026-09-18; the rulings behind it are in
[rulings/rulings.csv](rulings/rulings.csv).

## The database was hardened first, before any of the corpus reached it

Eight changes, each its own commit, each proved to move no data (`npm run build:diff`: 0 differences) unless it says
otherwise. They are not tidying: each one is a thing that would have broken, silently, somewhere in the first few
hundred documents.

| | What it was | What it is |
|---|---|---|
| Grade sequence | Two digits, so 99 grades per material | Two digits to 99 and three from 100. PLA and PETG reach 43 makers |
| Manufacturer | Free text, 30 spellings | A vocabulary with an Aliases column. A maker the vocabulary does not know is refused by name |
| Near-duplicate spellings | Stopped checking a column above 60 distinct values | No cap; it looks where one spelling is intended |
| Copies | Nothing saw a retailer's copy of a maker's sheet | `MEAS-CROSS-SOURCE-TWIN`, `SOURCE-SHA-DUPLICATE`, `GRADE-PRODUCT-DUPLICATE`, `FORMULATION-KEY-SPANS-MATERIALS`, `GRADE-KEY-PRODUCTS` |
| Reading a PDF | Two readers, both re-extracting every run | One reader, cached by digest, that reads a table as columns. The audit went from 2.6 s to 0.3 s |
| Units | Five conversions, compared literally; 32 rows unchecked in silence | A table, spelling-insensitive, with the imperial and metric-technical units. Five rows unchecked, and an unknown pair now says so |
| Chamber bands | Attached by a material's name | Attached by its MaterialID |
| Estimate spreads | A search over every observation, cubic, 3.9 s of a 4.0 s build | A search over at most 400, with every measured headline kept (D77). The stage's time is printed each build |

The wider unit check found one defect immediately: Spectrum PC CF's notched Izod read 686.5 J/m where its own raw
value and factor give 686.4655. Corrected in m50.

## The pipeline

```
ingest:inventory  the research workbooks -> ledger.csv, 1,936 documents, reconciled with the register
ingest:fetch      the bytes, by digest, two at a time per host
ingest:extract    the text, cached by digest; and which documents are the same sheet twice
ingest:classify   what a product is: base polymer, filler, variant class, and the material it belongs to
ingest:propose    a sheet -> candidate rows, with the page and line each came from
ingest:apply      the only way anything reaches data/tables, and it exists to refuse
```

What it has established so far, on real documents:

- **1,936 documents** in the ledger; 144 were already in the register when it was built.
- **226 Spectrum documents fetched and read.** 84 are a sheet already read, by the numbers they print; 10 are a
  non-English edition of one; 40 print the same numbers under a different product name and are queued as
  `twin-check` rather than consolidated, because that is a reading of the sheet and not a rule.
- **100% parity** on the twelve Spectrum sheets the database already held: 113 of 113 recorded values, on
  property, value, unit, direction, load and notch. It was 22% when the reader was written.
- **Two batches applied**, 63 documents: 490 measurements, 61 grades, 62 sources, 65 print profiles, 230 print
  notes and ten new materials. Each row names the page and line it was read from and who accepted it.

## Accuracy: what a scientific review of the whole corpus found

Two reviews were run over everything, and every claim was checked against the code or re-read from the source
before anything changed. Both found real defects.

**Values.** Ten rows in the database hold a number outside what their polymer can do. Five the database already
flags. Five did not, and re-reading their sheets (hash-checked, page by page) confirmed all five:

| Row | What it is |
|---|---|
| V001161 | The iSANMATE PA6 CF sheet prints "ISO 180-A 4 5": the standard is ISO 180-A and the value is 45 kJ/m², its digits split. The row carried 180, the standard's number. Corrected in m52, and the property became the Izod its own standard names |
| V001157 | The same sheet prints "Vicat Softening Point A/120 ASTM D-648 140": A/120 is the condition and 140 °C the value. The row carried the heating rate. Corrected |
| V001159, V000508, V000729 | 113 %, 98 % and "> 100 %" elongation on short-fibre compounds, which cannot draw. The sheets really print them, so they are kept and flagged (D55). The last was a ">" bound, asserting that a carbon-filled polycarbonate stretches at least 100 % |

`data/tables/plausibility_windows.csv` now holds 79 windows so the next such value is refused as it is read, and
`MEAS-PHYSICS-ORDER` checks the relations physics fixes between two values of one sheet, which is what catches a
value that landed under the wrong property. That check found the Bambu PC sheet printing a Vicat 26 °C below its
own glass transition; both values are transcribed correctly, so it is the sheet.

**Identities.** Thirteen systematic defects in the classifier, several giving a confident wrong answer rather than
a question: PES read as polyethylene, PC ABS as ABS, PA6/66 as PA6, PET G as PET, a blend as one of its polymers, a
support product as the material it supports, and any of the 723 documents that name no maker taking Bambu's SKU
rows. Nine existing materials were unreachable, so an import would have duplicated them. All fixed, each pinned by
a test. Across the corpus: 1,227 products find their material, 115 name a combination that does not exist, 594 ask
a question.

## What is still to do

**Spectrum is done except for fourteen documents**, which are questions rather than work:
[rulings/pending.csv](rulings/pending.csv) Q003 (S-Flex Carbon, whose numbers rule out its own product line's
chemistry), Q004 (nine particle-filled PLA variants, which need the owner to say whether they join the materials
named after Bambu's products or get class materials beside them) and Q005 (four sheets that name no polymer).

**The other makers.** The plan's waves B to D: about 455 documents of large PDF libraries, then the scanned, web
and viewer sheets, then the retailers. The pipeline and the gate are the same; what each maker adds is a layout,
and the parity run says when the reader is ready for it.

**The estimate stage at scale.** `test/scale.test.js` builds twice today's data and holds the compile and validate
inside 90 seconds. With the two batches in, that run takes about four minutes: the spread search is hundreds of
fits and a fit is a dense Cholesky, cubic in what it sees. The production build is 9 seconds and nothing a reader
sees is affected. The fix is the plan's Phase 5 option 2, an exact block-and-low-rank solve, and it is recorded in
[../../OPEN-PROBLEMS.md](../../OPEN-PROBLEMS.md).

Open questions for the owner are in [rulings/pending.csv](rulings/pending.csv). The rulings the agent made rather
than the owner, and which the owner can overturn, are R005 to R016 in [rulings/rulings.csv](rulings/rulings.csv):
ten new materials for filler combinations the database had no row for, and that Spectrum's S-Flex line is a TPU.
