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
ingest:inventory  the research workbooks -> ledger.csv, reconciled with the register
ingest:fetch      the bytes, by digest, two at a time per host; --stage takes what the owner supplies (R084)
ingest:capture    a page whose numbers a script draws, opened in a browser and hashed as what it drew
ingest:harvest    a page that is an index of documents -> a ledger row per document it lists
ingest:extract    the text, cached by digest; and which documents are the same sheet twice
ingest:ocr        a scan -> an optical reading and its page images, for a person to check (D35)
ingest:witness    the maker's product page, for a sheet that names no polymer
ingest:classify   what a product is: base polymer, filler, variant class, and the material it belongs to
ingest:propose    a sheet -> candidate rows, with the page and line each came from
ingest:review     what a person decided about a row, and who they were
ingest:batch      the steps of a batch in the order they must happen, so none is retyped from memory
ingest:apply      the only way anything reaches data/tables, and it exists to refuse
```

And three that ask rather than write, each generating a document nobody edits by hand:

```
ingest:blockers     BLOCKERS.md  every open document, what it needs, who it waits on
ingest:readings     READINGS.md  the identity each held sheet gives its product, for the owner's verdict
ingest:second-read  a seeded sample of what a batch applied, for a reader who did not decide it (R085)
```

What it has established, on real documents (2026-09-21, after twenty-six batches). Every figure here is
re-derivable; [STATUS.md](STATUS.md) regenerates the same counts and is the one to trust when they disagree.

- **2,045 documents** in the ledger — 1,936 from the research workbooks and 109 found since, most of them the 37
  data sheets BASF's product pages turned out to be indexes of. 144 were already in the register when it was built.
- **1,006 applied.** The database has gone from 103 materials, 179 grades, 2,645 measurements and 300 sources to
  **145, 901, 9,468 and 1,174**, with 928 print profiles and 1,874 print notes. Each row names the page and line
  it was read from and who accepted it.
- **Parity is 8,562 of 8,861 values, 96.6%, over 41 makers**, measured on every sheet somebody transcribed by
  hand before this programme and re-measured before and after every change to the reader. It was 22% when the
  reader was written. Eleven makers are below the 95% gate and each carries a named reason: a merged impact cell
  (Bambu), two tables per sheet (Prusa), a staged corpus nobody has fetched (iSANMATE, FormFutura), a marketing
  page with tripled text (Essentium).
- **259 documents are the same sheet again** — another language's edition, a superseded revision, or identical
  bytes on a retailer's CDN — and the ones that print the same numbers under a different product name are queued
  rather than consolidated, because that is a reading of the sheet and not a rule.
- **88 rulings** settle what the rule could not, 45 of them creating a material for a combination the database
  had no row for. Nothing is pending that the owner has not been asked about.
- **What the pipeline refuses is as much of the record as what it writes.** 462 documents are held, every one
  with a reason on its row that says who can free it: 195 wait on a verdict, 122 on a person against a page
  image, 53 on a reader rule, 47 on the sheet they repeat being applied.

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

## The completion programme (2026-09-20 to 21): what it did, and what it found

The plan the owner approved on 2026-09-21 was in three words — **complete** every remaining document to a
terminal state, **consolidate** the moving parts, **guarantee accuracy** — and it ran in phases. What each did:

| Phase | What it built or found |
|---|---|
| **A. Consolidate the queue** | `registered` became terminal, `no-values` was asked per document (a brochure, a scan, a language, a layout), the decisions pack folded into BLOCKERS.md. 622 open from 714. |
| **B. The one reader rule left** | A table's value columns read by position, the caption carried onto each row, a block heading naming its rows' family and standard. Batch b24: 13 documents. |
| **C. A second witness** | `ingest:witness` fetches the maker's own product page for a sheet that names no polymer, hashed like any document. 72 fetched, 5 readings resolved: most maker pages are datasheet indexes. |
| **D. The owner's pack, and what it unblocked** | `ingest:fetch --stage` (R084), `readings.mjs --rulings`, four polymer rows from producers' references (m98), the printing links 34 materials never had (m99), batch b25 (m100). |
| **E. The optical pool** | `ingest:ocr` over every scan, batch b27 proposed: 139 documents, 1,211 rows, all with page images. Read by a separate agent — see [batches/b27/README.md](batches/b27/README.md). |
| **F. Accuracy** | D80's fill classes; OPEN-PROBLEMS §1 and §9 closed (m101, m102); R085's second read sampled and run. |
| **G. The fetch tail** | `ingest:capture` for a page a browser must draw, `ingest:harvest` for a page that is an index. BASF's 16 "unreadable" pages turned out to list 37 data sheets. Batch b26 (m103). |

### What the two independent readers found

Both are recorded where the work is: [batches/b27/README.md](batches/b27/README.md) for the optical review, and
OPEN-PROBLEMS §10 for the second read. In short:

- **The optical review of b27**: 678 rows accepted against the page image, 151 rejected, 87 documents signed off,
  40 left because their product name is the sheet's own furniture (18 FormFutura sheets read as "UTURA", the logo
  in the header). The batch is **not applied**.
- **R085's second read of b03 to b26**: 564 sampled rows, 145 disagreeing. No row failed the first check — every
  sampled value is printed on the document its Locator names, so the wrong-revision collision the b01/b02 read
  found did not recur.

Three classes of what it found were fixed the same day, each counted across the whole table first and fixed in
the reader too, so the class cannot re-enter:

| Migration | What it corrected |
|---|---:|
| m101 | 70 measurements that held a fragment of the neighbouring column instead of their test method |
| m102 | 130 cells of 31 print setups that kept the sentence printed beside them; 20 hardened-nozzle answers the database was not recording |
| m104 | 7 resistivities that were a piece of a power of ten (7 Ω for an ESD filament), 30 heat deflections "tested at 0.45 °C", 61 density methods beginning with the 3 of their own g/cm³ |
| m105 | 481 standards a merged Testing Method cell names, which neither of the two rows it spans was reading |
| m106 | 104 methods a thermal table names, which the reader was leaving with the label |

The corpus went from 1,512 measurements naming no standard to 927, and Polymaker's from 491 of 1,092 to 141.
Parity over all 41 makers was measured before and after every reader change: **no maker down**.

### Five traps in the tooling, each closed with its reason

Worth knowing because each one cost a mistake before it was found:

1. **A hold that is gone releases the document.** `--holds` wrote why a document waits and never said when it had
   stopped waiting; three sat held under rulings that had answered them.
2. **`registered` is terminal by every route.** `--twins` wrote it as a hold while `writeHolds` writes it as a
   status, so two documents were freed again by the next run and proposed a third time.
3. **A product has two names.** AzureFilm's ABS sits in the ledger as 3DJake's "ABS P" and in the tables as
   AzureFilm's "ABS"; the lookup asked by one and the twin phase by the other, and they disagreed.
4. **A review names its batch.** `--doc <key> --accept m01` wrote one decision into ten batches' worth of
   history, eight of them long applied. It now refuses without `--batch`.
5. **`--holds` before `--propose`.** A hold reason is what the last `--holds` run wrote, so `--propose --held
   ruling` misses a document whose blocker has changed since; `--held any` takes every held document.

## What is still to do

[PLAN-REMAINING.md](PLAN-REMAINING.md) is the working list, [BLOCKERS.md](BLOCKERS.md) the queue and
[STATUS.md](STATUS.md) the counts — all three generated, so no figure in them can go stale without the command
that made it saying so. Nothing is repeated here, because a count written twice is a count that will disagree
with itself.

What waits on the owner is three jobs, and BLOCKERS.md opens with the command that turns each into data: the
verdicts on READINGS.md, a ruling per item under `ruling:unsettled`, and the documents nobody can fetch.

The rulings the agent made rather than the owner, and which the owner can overturn, are named in
[rulings/rulings.csv](rulings/rulings.csv) with the reason and the date for each.
