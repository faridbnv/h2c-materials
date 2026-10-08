# Completeness round, progress

> **Historical record** (2026-10-07): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

The owner asked on 2026-10-07 for open-problem items 10, 1, 2 and 5 together, then 12, then 4 (the plan is in this
folder's README once the round closes). This file logs each phase as it ends.

## Phase 0: setup and freeze (2026-10-07)

- Branch `completeness-round-2026-10-07` from main at 1427e2de. The uncommitted regeneration of
  `docs/audits/2026-09-27-v2.1-review/SCENARIO-GAPS.md` (its historical note dropped by `npm run audit:scenario-gaps`)
  was restored from HEAD.
- `baseline/snapshot/` is `build/snapshot/` before anything changed; `answers.py` compares against it.
- `verify:fast`, warm, nothing changed: 41.8 s (build and tests 34.9 s), `baseline/verify-fast-warm.txt`.
- Detectors (`baseline/detectors/`): reader recall over 1,904 cached sheets (2,729 value and 3,929 setting items no row
  holds, `recall/`), duplicates (130 source pairs, 257 grade pairs, 11 split sources), the source manifest (2,016
  registered: 1,907 with their bytes, 96 without, 1 mismatch, 12 with no digest; 8 with bytes and no text), the text
  quality flags (151 documents with a broken page) and the leverage census.
- `targets.mjs` froze:
  - **TARGETS-1** (item 1): 2,703 leads after dropping lines a live row already holds, numbers held as retired or
    unresolved rows, and lines with no value (TBD, N/A, no break). By tier: T1 404 (each fills an empty headline of the
    document's own product), T2 828 (a seeded 80 read), T3 1,471 (a seeded 80 read). Only makers' data sheets, and a
    product page only where it is its products' only document. 311 documents to read (`read/DOCS.csv`), in 20
    batches of the packet `c1`.
  - **TARGETS-2** (item 2): of the 130 source pairs, none is left unread across two products: 38 were read in the
    quality round, 31 share a key, 19 are accepted, 5 were judged in check round 3, and 37 are one product's two
    documents on its own grade, which stay (§30's ruling). Left: 7 sources whose rows sit on more than one product and
    15 grade pairs (`read/tasks-2.csv`, 11 reading tasks; six pairs are distinct by a name token the detector strips:
    FR, V0, Copper and Bronze).
  - **TARGETS-5** (item 5): 112 registered sources without text (91 bytes absent, 12 no digest, 1 mismatch, 8 price
    pages whose text was never extracted), 31 of them behind rows; and 167 flagged pages of documents behind rows (128
    with an optical reading, 39 without).

## Phase 1: item 10, the wrong facts (commit 0f553706)

OPEN-PROBLEMS §3, §7, §14, §18, §22, §28, §29 and §31 corrected against their queries; the README's price sentence is
derived from the listings' access dates; the quality round's draw is written where the README reads it.

## Phase 2: item 5, text for held sources (commit 5428ccfa)

The p05 price pages had their text read, and `ingest:prices` now reads a page's text as it keeps it. The backup restore
brought back none of the 96 sources without bytes; the 22 deciding profiles among them were compared with their later
copies in the quality round. Every flagged page of every cached document was read optically (290 pages) and 428 optical
pages are now indexed in `documents_fts` (`view = 'ocr'`); 10 flagged pages give no text.

## Phase 3: item 2, held twice (commit 4a92a58d)

No source pair across two products is left unread. Of the 37 pairs on one product's own grade, 26 are copies (one is
two 3DJake copies of one sheet) and 11 revisions (`decisions/same-grade-pairs.csv`). m409 retired 198 copy rows and filed
two products on the maker's own sheet; PCTG+CF10's XY strength is now Fiberlogy's own yield strength (70 MPa). The item 2
reader's 11 tasks: the seven split sources hold their rows on the right product or a keyed twin (R053), the nine "same
name, different values" pairs are distinct products, and two filings are wrong (fixed in m410).

## Phase 4: item 1, values the held sheets print (commit 4fb9e344)

311 sheets read (20 batches), 5,876 readings, 510 read again blind. 351 values, 21 page statements and 20 profile cells
enter (m410); 102 product values now come from them. No held value changes (`decisions/values-set-review.md`). T2 and
T3 moved 4 product values in 160 leads and are not widened. Answers moved: PC-ESD and PET-GF fail questions they were
unknown in, each on a value read on its page (TriStat ESD-PC's modulus, Raise3D Industrial PET GF's density).
`verify:fast` 71.2 s.

## Phase 5: recount and D136 draft

OPEN-PROBLEMS §6 (397 acceptances), §19 (sources and the index), §22 and GOALS C16 (108 of 135 materials priced)
recounted; D136 drafted; this README started.

## Phase 6: item 12, tooling debt (commits 37489ff0 to 1a6da242)

Trace rank (6g), `standards_state` (6f), the bounded `audit:sources` fetch (6e), revision duplicates by name (6b),
partial infill (6c, and m411 labels ten AzureFilm rows m366 missed), LEHVOSS's layout (6d, parity census: three sheets
move, each toward the held rows), and verify:fast (6a): 78 s after a data change, 45 s warm.

## Phase 7: item 4, makers' statements (commit 8292010e, then the close)

208 documents read in full by twelve readers (3,344 readings); 2,704 statements, 208 reads and six claims enter (m412).
No product is left with no document read.

## Close

The blind draws (`blind-draw/RESULT.md`) found two cells, then one, partly wrong and deciding nothing; the families
were swept (the curation holds print-setting rows and a guide's general text; m413). m412 was rerun on the tables as they
were before it, so its rows are the final curation's. Full `npm run verify` before the push.
