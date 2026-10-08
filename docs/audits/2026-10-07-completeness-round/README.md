# Completeness round, 2026-10-07

> **Historical record** (2026-10-07): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

> **In short.** The owner asked for four open problems together (stale facts in the docs, values the held sheets print
> that the tables lacked, products and sheets counted twice, sources without full text), then the tooling debt, then
> the makers' statements nobody had read. Claude Sonnet agents read the pages; Claude Opus judged each reading and wrote
> the migrations m409 to m413 (D136). 351 values, 21 page statements and 2,704 makers' statements entered; 198 rows
> repeated by copies of a maker's own sheet are held once; no held number was found misread. Two materials' answers
> moved, each on a value read on its page. What is still open is in OPEN-PROBLEMS §34.

## The items and what became of each

| # | Item | Outcome | Where |
|---|---|---|---|
| 10 | Stale lines in OPEN-PROBLEMS and GOALS | Corrected against their queries; the README's price sentence is derived from the listings | part 1, part 5 |
| 5 | Held sources without full text | Price pages read as they are kept; 428 scanned or garbled pages indexed from their optical reading; the backup restored none of the 96 lost originals | part 2 |
| 2 | Products and sheets counted twice | No source pair across two products left unread; 26 copies on one product's grade hold their rows once (198 rows); two filings fixed | m409, m410 |
| 1 | Values the held sheets print and the tables lack | 311 sheets read cell by cell: 351 values, 21 page statements, 20 profile cells; no held value changes | m410, m413 |
| 12 | Tooling debt | Partial infill and LEHVOSS's layout read by the import, revision duplicates found by name, bounded fetch for `audit:sources`, `standards_state`, rank in the trace, verify:fast 78 s after a change | parts 6a to 6g, m411 |
| 4 | Products whose documents were never read for makers' words | 208 documents read in full: 2,704 statements, every product with a document read, six toughened claims | m412 |

## The answers that moved

PC-ESD fails the outdoor, lightweight and stiffness questions it was unknown in, now that TriStat ESD-PC's own modulus
(2,010 MPa, read on the page image) is held, and PET-GF fails the lightweight question now that Raise3D Industrial PET
GF's density (1.38 g/cm³) is held (`python3 answers.py`).

## Files

- `targets.mjs`, `TARGETS-1.csv`, `TARGETS-2.csv`, `TARGETS-5.csv`: what was frozen before anything was read.
- `baseline/`: the snapshot and the detectors' output before anything changed; `answers.py` compares against it.
- `read/`: item 1's reading (`DOCS.csv`, `PROMPT-c1.md`, the reconcile and proposals runs, `second/` for the blind
  second reads, `curate.py` and `curation.csv`, `applied/`), item 2's reading (`tasks-2.csv`, `verdicts-2.csv`) and the
  optical-reading document lists.
- `decisions/`: the verdict on each same-grade source pair (`same-grade-pairs.csv`), m409's data changelog, and the
  review of the 28 proposed corrections of held values (`values-set-review.md`).
- `knowhow/`: item 4's documents, reader prompt, readings, `curate.mjs`, `curation.csv`, the claims and their blind check.
- `tooling/reader-parity.mjs`: what the import's reader reads from every cached registered document, for before and
  after a reader change.
- `blind-draw/`: the closing check.

## The closing check

A fresh Claude Sonnet reader with no access to the tables read 40 changed records on their pages: 38 hold, and two are
partly wrong in a cell that decides nothing (a print-settings row entered as a statement; a page statement typed beyond
its words); both families are swept (the curation, m413). Twenty of the curation's holds were right. A second draw of
20 after the sweep found one more of the same weight (a general "What is PLA" bullet as a product's statement), and a
draw of 20 unmarked products found no missed toughened claim. [blind-draw/RESULT.md](blind-draw/RESULT.md) has the detail.

