# Batch b23: five twins whose primaries b22 applied

Applied 2026-09-21 by `m95-batch-b23`: 10 records from 5 documents — a grade and a source each, under R053, with
the values recorded once. Three SUNLU colour packs of one PLA, one Spectrum Silk Rainbow, one FormFutura ReForm
rTPU. One more document was another language edition of a sheet the batch already shaped, and is `duplicate-of`.

A twin can only be shaped once the sheet that carries its values is applied; b22 applied these five sheets'
primaries, so `--twins` shaped them. Nothing else was in the batch.

## What the same commit did to the queue

This batch is small and the commit around it is not: it is phase A of the completion plan, which consolidates the
queue before the reader rule, the owner's day and the optical read.

- **`registered` is a terminal status.** A document whose maker already has an active grade for the product is
  recorded, and `--holds` now says so with the status rather than a hold. Eighty-six documents leave the queue.
- **A page the reader found nothing on says what it holds.** `no-values` was one word for four things: a
  brochure (terminal, `not-a-data-sheet`), a header over an image (`needs-ocr`), a sheet in a language the
  lexicon has no labels for, and a layout with labels and values the reader cannot pair. Each is named on its row.
- **The decisions pack is retired.** It asked nine questions and every one is answered (R074 to R083); what
  still waits on the owner is listed in BLOCKERS.md, and the register stops asking the owner what the owner has
  answered — nineteen support products, three polymer rows and three blends were listed as the owner's and are
  the pipeline's.
- **`ingest:inventory --status` no longer rewrites the ledger on the way to printing it.** It did, and a rebuild
  treated a pipeline-set `registered` as the workbook's to overwrite: seventy-seven documents went back into the
  queue they had just left. The status report is read-only now, and a `registered` the pipeline set stays.

**622 documents open, down from 714**; 988 of 1,936 applied.
