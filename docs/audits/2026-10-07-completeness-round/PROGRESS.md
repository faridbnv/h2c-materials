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
