# What is left of the plan

The plan the owner approved is in the session record; this is the part of it that has not been done, with what each
step now knows that the plan could not. Rewritten 2026-09-20, after batch b12 and the repair that gave the queue a
reason per document.

**Every figure about the corpus is in [STATUS.md](STATUS.md), which is generated.** Nothing here repeats a count,
because a count written twice is a count that goes stale in one of the two places. What is here is what has to be
decided or built.

## 1. What holds each document, and what frees it

`npm run ingest:batch -- --holds` asks every proposal why it is waiting and writes the answer into the ledger, so
the queue is a query rather than a memory. There are seven reasons, and no eighth: a hold nobody can act on is
worse than no hold at all.

| Reason | What frees it |
|---|---|
| `ruling` | the owner answers; `rulings/pending.csv` and the ledger's own rows are the questions |
| `twin` | R053 applied by the pipeline: a grade each, citing its own sheet, the values recorded once |
| `no-values` | the reader learning the layout, or the document being what it looks like — a brochure |
| `ocr-visual` | `ingest:review --visual`, a person against the page image; nothing else may pass it (D35) |
| `reader:name-not-a-name` | the reader learning that a section heading is not a product name |
| `reader:condition-table` | a value column per condition, as there is now one per build orientation |
| `registered` | nothing: the product is already in the database under another document |

## 2. The reader, measured

`npm run ingest:propose -- --compare --all` reads every sheet somebody transcribed by hand before this programme
and compares, maker by maker, in one run. The table it writes is in [STATUS.md](STATUS.md) and the census is
`census/parity.csv`, with the values each maker still misses beside it.

That run had never been made as a set. Made once, on 2026-09-20, it found **twelve makers below the 95% gate**,
four of them badly:

| Maker | Reproduced | What it is |
|---|---|---|
| Stratasys | 2 of 16 | a table per layer height, each with a value column per orientation |
| Essentium / Nexa3D | 4 of 27 | a value column per build orientation, headed 45/45 and ZX |
| Prusa Research | 13 of 34 | one sheet, two tables, and a second column this reader does not separate |
| iSANMATE | 58 of 142 | 84 values on fourteen sheets, the largest single gap after Bambu |
| Bambu Lab | 592 of 739 | 147 values; the `Subjects \| Testing Methods \| Data` table of OPEN-PROBLEMS §1 |

Parity before novelty is the rule, and it was kept per maker as each batch was run. What was not done was to run
it over every maker at once, so a maker whose sheets nobody was proposing that week stopped being checked. It is
one command now, and it is what `--finish` runs before a batch commits.

About 380 values in all. They are the reader's to-do list, in the order the census prints them.

Two gaps cost values on every maker and are data decisions, not reader ones:

- **A property the database does not carry.** Flammability class, decomposition temperature, volume resistivity,
  permittivity, moulding shrinkage, tear strength, abrasion loss, compression set, Poisson's ratio. The reader
  names each one it cannot file.
- **A polymer with no row.** PHA, TPS, SEBS and PA11. PBT, COC, SAN, LCP, PVC and PBAT were written for b09, and
  PCL and the PPE/PS blend before it, each from a producer's reference that was fetched and hashed.

And two are known, small and named: a Fillamentum statement set one point lower than its own row, and a BASF Shore
hardness stated in prose and in no table. One row of one sheet each.

## 3. What is not fetched

The counts are in [STATUS.md](STATUS.md). What matters about them:

- **3DJake's** are Wave D and most are copies of sheets that arrive with their makers; they are fetched and deduped
  before anything is proposed, not after.
- **The gated ones need the owner's credentials**: FormFutura's SharePoint above all, with INTAMSYS's request form
  beside it.
- **The unreadable ones carry no numbers** because their tables are drawn by a script the capture did not run.
  That is a fetch problem — the capture has to wait for the page to finish — and not a sheet without data.

## 4. Wave D: the retailers

Most of it is copies. Fetch and dedupe first, then the documents of brands that reach the market only through a
retailer. Last, so every twin has a manufacturer's sheet to point at.

## 5. The estimate stage at scale — **this now blocks the programme**

`npm run scale` fails. It builds twice today's data and reads **150.5 s against its 150 s budget**; a second run of
the same thing read 149.2 s. A check the measurement straddles by a third of a per cent is not measuring anything,
and what it is there to say is that the exact block solve has to be built.

The trend, each figure measured and recorded beside the budget in `test/scale.check.js`:

| | measurements | compile + validate at 2x |
|---|---:|---:|
| 2026-09-18 | 2,645 | about 10 s |
| 2026-09-19 | 6,009 | 111 s |
| 2026-09-19 | the same data | 100 s — the kernel's covariance stopped looking a column up by name |
| 2026-09-20 | 7,461 | 177 s — b11 and b12 |
| 2026-09-20 | the same data | 149 s — the Cholesky takes two columns of a row at a time |

Both of those speedups are exact: each was checked by building with and without it and comparing a digest over
every material's headline block, which did not move. The budget was raised once, on 2026-09-19, from 90 s to 150 s
with the measurement written beside it. **It has not been raised again**, because raising a budget the second time
it is breached is how a check stops being one.

There is no third optimisation of that size left in the dense path: after both, the stage is still 50% Cholesky and
12% its inverse, and those are the number of dense fits and their size. What removes them is D77's option 2, and
nothing else:

- Partition each headline's kernel by chemical group. The columns that live inside one group are `g:`, `p:`, the
  material's own deviation and the product's own deviation — a material belongs to one group, and a formulation to
  one material — so those form a block-diagonal matrix, one block per group.
- The columns that span groups are few: the global mean, the fill classes, fill by morphology, the declared variant
  classes, the test houses and the two melting-point covariates. Fifty or sixty columns against fifteen hundred
  observations.
- K is then a block-diagonal matrix plus a low-rank term, and a Woodbury solve costs the sum of the blocks' cubes
  rather than the whole matrix's, plus a term in the rank. With nineteen families that is two orders of magnitude
  on the part that dominates.

It is an exact reformulation, not an approximation, but it rewrites `fitModel`, `posterior` and the hide-downdate in
`predict`, and an error in it would move every estimate quietly. It needs a run of its own and a back-test that
shows the estimates it gives are the estimates the dense solve gives.

Until it is built, every batch after b12 makes `npm run scale` worse.

## 6. What the pipeline still does not do

- **Corrections to a document already registered.** A proposal for a registered document produces new rows, not
  corrections. This is what OPEN-PROBLEMS §1 and §9 wait on, and not the reader: the reader would read those 96
  measurements and 15 print setups correctly today. m62 did that work by hand for 84 rows; `edits[]` through
  `scripts/migrate/source-edits.mjs` is what would make it part of the pipeline. It is also the only way the Bambu
  parity gap above is closed, because those 41 sheets are all registered.
- **A sheet that covers several products.** One document is one proposal and one product, so a shared table reads as
  one of the products it lists. R053 says what they become: a grade each, citing its own sheet, values recorded once.
- **Evidence rows.** `propose` reads properties, print settings and certification claims, but proposes no
  `evidence.csv` rows for chemical, safety or certification statements.
- **`material_links.csv` citations** for a new material.
- **The second read at every batch.** b01 and b02 were read a second time by a different reviewer, which found the
  source collision m55 repairs. b03 to b12 were not.

## 7. How a batch is run

The steps were retyped from memory every session until 2026-09-20, which is how the same three mistakes were made
three times: a `verify` spent on a generated document nobody had regenerated, a document re-proposed because nothing
recorded why it was held, and parity re-run after every lexicon row instead of once. They are a program now,
`scripts/ingest/batch.mjs`, and the rules it keeps are these:

- **One propose run over everything the batch holds**, selected by its hold reason, not one run per maker.
- **Review by exception**: accept every row the reviewer's own rule allows, read only what it holds back.
- **Twins before review**, so a copy never produces rows for somebody to read.
- **Parity once**, over every registered maker, before the batch commits — `--compare --all`.
- **One full `verify` per batch**, after `--finish` has regenerated the dictionary, the rules and the snapshot.
- **A reader rule is built when it frees about twenty documents or a whole maker.** Below that the documents are
  held with the gap named, and the count goes in §2.
- **Nothing is fixed one row at a time.** A wrong value found in the data is counted across the table with SQL
  first — the resistivity misreading was nine rows, three of them older than the programme — and corrected in one
  migration through `correct()`, with a window or a lint so the class cannot re-enter.
