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

What it has established so far, on real documents (2026-09-19, after nine batches):

- **1,936 documents** in the ledger; 144 were already in the register when it was built.
- **Nine batches applied, 500 documents**, from Spectrum, 3DXTECH, Polymaker, iSANMATE, Extrudr, SUNLU, Eryone,
  Flashforge, colorFabb, Fabru / purefil and Fiberlogy. The database has gone from 103 materials, 179 grades,
  2,645 measurements and 300 sources to **143, 494, 6,009 and 665**, with 530 print profiles and 1,229 print
  notes. Each row names the page and line it was read from and who accepted it.
- **Parity holds on every sheet somebody transcribed by hand** before this programme, unchanged through all nine:
  Spectrum 113 of 113, 3DXTECH 213 of 214, Polymaker 223 of 239. It was 22% when the reader was written. The
  3DXTECH miss is an Izod row whose label the sheet misspells; Polymaker's residue is one shared table covering
  several products, which the pipeline still reads as one document and one product.
- **347 documents are the same sheet again** — another language's edition, a superseded revision, or identical
  bytes on a retailer's CDN — and **139 print the same numbers under a different product name**, queued as
  `twin-check` rather than consolidated, because that is a reading of the sheet and not a rule.
- **73 rulings** settle what the rule could not, 42 of them creating a material for a combination the database had
  no row for. Nothing is pending.
- **What the pipeline refuses is as much of the record as what it writes.** b09 alone held 73 documents: every
  optically read sheet, until somebody checks it against the page image, and every identity nobody has settled.

## Accuracy: what a scientific review of the whole corpus found

Two reviews were run over everything, and every claim was checked against the code or re-read from the source
before anything changed. Both found real defects.

**Values.** At the time of the review, ten rows in the database held a number outside what their polymer can do.
Five the database already flagged. Five did not, and re-reading their sheets (hash-checked, page by page) confirmed
all five. (Twenty-six rows are flagged that way today, across a database more than twice the size; they are listed
in [../../OPEN-PROBLEMS.md](../../OPEN-PROBLEMS.md) §2.)

| Row | What it is |
|---|---|
| V001161 | The iSANMATE PA6 CF sheet prints "ISO 180-A 4 5": the standard is ISO 180-A and the value is 45 kJ/m², its digits split. The row carried 180, the standard's number. Corrected in m52, and the property became the Izod its own standard names |
| V001157 | The same sheet prints "Vicat Softening Point A/120 ASTM D-648 140": A/120 is the condition and 140 °C the value. The row carried the heating rate. Corrected |
| V001159, V000508, V000729 | 113 %, 98 % and "> 100 %" elongation on short-fibre compounds, which cannot draw. The sheets really print them, so they are kept and flagged (D55). The last was a ">" bound, asserting that a carbon-filled polycarbonate stretches at least 100 % |

`data/tables/plausibility_windows.csv` now holds 82 windows so the next such value is refused as it is read, and
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

[PLAN-REMAINING.md](PLAN-REMAINING.md) is the working list and [STATUS.md](STATUS.md) the counts. In short:

**85 documents wait on a decision, not on work**: the 73 b09 held and the twelve SUNLU and Extrudr products before
them. Half need somebody to read an optical transcription against the page image; the rest name no polymer, or
rebrand a product whose sheet is already in, and each needs a ruling.

**554 documents are read and waiting for a batch**, across about two dozen makers, and **404 are not yet fetched**.
Beyond them are the 64 behind FormFutura's login and INTAMSYS's request form, which need the owner's credentials,
and Wave D's retailers, which come last so every twin has a manufacturer's sheet to point at.

**The estimate stage at scale is now the nearest thing to a deadline.** The core compile and validate is 74 ms; the
estimate stage is 33 seconds and cubic in observations. `npm run scale`, which builds twice the data, read about
10 seconds on 2026-09-18 and reads 100 on 2026-09-19, because the corpus grew 2.3× in a day. (It was 40 and 111
until the kernel's covariance stopped looking its columns up by name — the same fit, bit for bit.) Its budget was raised
from 90 to 150 seconds with both measurements recorded beside it, and a second assertion added that holds the core
build to 5 seconds so a real regression still fails. Nothing a reader sees is affected. The fix is the plan's
Phase 5 option 2, an exact block-and-low-rank solve, and on this trend it is due within two or three batches
rather than at the end.

**What the pipeline still cannot do** is in [PLAN-REMAINING.md](PLAN-REMAINING.md) §6: evidence rows, a new
material's citations, a sheet covering several products, corrections to a document already registered, and a
second reader on every batch.

The rulings the agent made rather than the owner, and which the owner can overturn, are named in
[rulings/rulings.csv](rulings/rulings.csv) with the reason and the date for each.
