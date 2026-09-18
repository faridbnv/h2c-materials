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

- **1,936 documents** in the ledger; 144 already in the register.
- **1,215 of 1,936 products** find the material they belong to from the name alone; 149 name a combination that does
  not exist yet (25 distinct); 572 ask a question, most of them names that do not say what the polymer is, which
  the sheet itself answers.
- **223 documents fetched** (3D-Fuel, Spectrum). Of Spectrum's 214, **112 are a sheet already read**: 3DJake's
  copies, and Spectrum's own library serving one PDF under several links. 38 of those print the same numbers under
  a different product name and are queued as `twin-check` rather than consolidated.
- **88% parity** on the twelve Spectrum sheets the database already holds: 100 of 113 recorded values, five sheets
  exact. The residue is named in [census/spectrum-parity.txt](census/spectrum-parity.txt).

## What is still to do

The batches themselves. No document has been applied yet: the proposer is at 88% on one maker, and the rule is
parity first, then that maker's unread sheets. The order, the counts and what "done" means per batch are in the
plan.

Open questions for the owner are in [rulings/pending.csv](rulings/pending.csv). The three that block work are the
manufacturer merges (they move the estimate model's test-house covariate), whether an Izod result recorded as
"Impact strength" should be re-filed, and the variant classes the census will surface.
