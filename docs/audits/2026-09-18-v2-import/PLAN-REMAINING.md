# What is left of the plan

The plan the owner approved is in the session record; this is the part of it that has not been done, with what each
step now knows that the plan could not. Rewritten 2026-09-20, after batches b14 to b18, the block solve, and the repair that gave the queue a reason
per document.

**Every figure about the corpus is in [STATUS.md](STATUS.md), which is generated.** Nothing here repeats a count,
because a count written twice is a count that goes stale in one of the two places. What is here is what has to be
decided or built.

## 1. What holds each document, and what frees it

`npm run ingest:batch -- --holds` asks every proposal why it is waiting and writes the answer into the ledger, so
the queue is a query rather than a memory. Every document now has a reason, and **what waits on the owner is a
document of its own**: `npm run ingest:batch -- --decisions` writes [DECISIONS-PENDING.md](DECISIONS-PENDING.md),
grouped by question, with how many documents each answer frees and what the pipeline would do by default.

| Reason | What frees it | Whose |
|---|---|---|
| `ruling` | an answer to one of the nine questions in DECISIONS-PENDING.md | the owner's |
| `twin` | R053 applied by the pipeline: a grade each, citing its own sheet, the values recorded once. **The largest mechanical unblock left and the one nothing in `apply.mjs` can do yet**: the splitter finds the pairs and writes which source each repeats, and what is missing is the write | the pipeline's |
| `no-values` | the reader learning the layout, or the document being what it looks like — a brochure | the pipeline's |
| `ocr-visual` | `ingest:review --visual`, a person against the page image; nothing else may pass it (D35) | a reader's |
| `reader:condition-table` | a table per condition, under headings that repeat (Stratasys) | the pipeline's |
| `reader:several-values` | reading a table's columns by position | the pipeline's |
| `registered` | nothing: the product is already in the database under another document | — |

**The largest single question is Wave D's**: 114 documents are sheets a shop hosts that name no maker of their
own, and whether the shop is the brand or only the shop decides all of them at once.

**`reader:several-values` is a measured decision, not a guess.** Ten QIDI documents and thirteen others head
their tables "Method | Molded | X-Y Axis | Z Axis" and print three results on one line; the reader takes the
first, which is the injection moulded bar, and records it as the product's. Refusing such a row inside the reader
was tried and measured against every maker with hand-transcribed sheets: **it cost 297 values the database
already holds**, because a sheet prints two results on one line for good reasons as often as bad ones. So the
batch holds the document and the reader is unchanged. Reading those columns by position is what frees them.

## 2. The reader, measured

`npm run ingest:propose -- --compare --all` reads every sheet somebody transcribed by hand before this programme
and compares, maker by maker, in one run. The table it writes is in [STATUS.md](STATUS.md) and the census is
`census/parity.csv`, with every value each maker still misses beside it.

That run had never been made as a set. Made once, on 2026-09-20, it found twelve makers below the 95% gate. Two
have moved since:

| Maker | Was | Now | What is left |
|---|---|---|---|
| Bambu Lab | 592 of 739 | **683 of 739** | its impact row is a merged cell with two values stacked around the label |
| IPCON | 56 of 76 | **68 of 76** | |
| Stratasys | 2 of 16 | 2 of 16 | a table per layer height, each with a column per orientation |
| Essentium / Nexa3D | 4 of 27 | 1 of 24 | a value column per build orientation, headed 45/45 and ZX |
| Prusa Research | 13 of 34 | 13 of 34 | one sheet, two tables, and a second column this reader does not separate |
| iSANMATE | 58 of 142 | 58 of 142 | 84 values on fourteen sheets, the largest single gap |

Parity before novelty is the rule, and it was kept per maker as each batch was run. What was not done was to run
it over every maker at once, so a maker whose sheets nobody was proposing that week stopped being checked. It is
one command now and `--finish` runs it before a batch commits.

Two gaps cost values on every maker and are data decisions, not reader ones:

- **A property the database does not carry.** Flammability class, decomposition temperature, moulding shrinkage,
  compression set. The reader names each one it cannot file. Nine of them went in with b12 and b14 — surface and
  volume resistivity, dielectric strength, relative permittivity, tear strength, abrasion loss, CTE and Poisson's
  ratio — and none of them has a plausibility window yet, which is why the resistivity misreadings had to be
  found by a person twice.
- **A polymer with no row.** PHA, TPS, SEBS and PA11.

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

## 5. The estimate stage at scale — built, 2026-09-20

`npm run scale` is green. The exact block solve is in (DECISIONS D79): the kernel is block-diagonal in the chemical
groups plus forty-odd columns that reach across them, and Woodbury solves it for the sum of the blocks' cubes
instead of the whole matrix's.

| | measurements | compile + validate at 2x |
|---|---:|---:|
| 2026-09-18 | 2,645 | about 10 s |
| 2026-09-19 | 6,009 | 111 s |
| 2026-09-19 | the same data | 100 s — the kernel's covariance stopped looking a column up by name |
| 2026-09-20 | 7,461 | 177 s — b11 and b12 |
| 2026-09-20 | the same data | 149 s — the Cholesky takes two columns of a row at a time |
| 2026-09-20 | the same data | 150.5 s on a rerun, and the check failed |
| 2026-09-20 | the same data | **16 s** — the kernel is solved by block |

The budget stayed 150 s throughout. It was raised once, on 2026-09-19, from 90 s with the measurement beside it;
when it was breached a second time it was not raised again, and what was built instead bought a factor of nine
rather than the factor of one and a bit a larger number would have bought.

The estimate stage is 5.7 s where it was 36 s, which is most of what `npm test` spends too: the suite was 6.2
minutes before this and every test that builds the database pays the estimate stage.

No estimate moved and no screen changed. Two hold-out counts in the back-test differ by one, where a true value
sits exactly on its range boundary and a twelfth-digit difference decides which side; D79 names both.

## 5b. Two durable fixes this programme has named and not made

Both were tried, measured and put down with the measurement, so neither is a thing to rediscover.

**A fill class per grade Variant.** A grade that declares an undisclosed dense filler (D57, R078) is judged by
the physics windows as an unfilled polymer, because `fillOf` in `lint-rules.js` reads the material's Modifier
and not the grade's Variant. Every metal-filled grade therefore produces a permanent accepted finding — thirteen
of b20's twenty-four. The obvious fix is wrong: mapping a Variant to the fill class `any` was tried and made two
existing rows worse, because the `any` windows assume a possible fibre load and so have a **higher floor**, not
a wider range. What it needs is its own fill classes (`dense`, `light`) with windows of their own, a DECISIONS
entry saying why the data cannot carry it otherwise, and a back-test row that shows it helps.

**Two high-temperature fibre windows drawn before a 30 wt% grade existed.** W0024 tops tensile strength at
160 MPa and W0080 modulus at 16 GPa, both from observation. Ensinger's TECAFIL PEEK EV CF30 reaches 170 to 200
MPa and 17 to 20 GPa, which is what a thirty per cent short-carbon PEEK does. Four findings accepted; the window
is the thing to widen once a second such grade arrives, which is the evidence it is waiting for.

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
