# Importing a batch of data sheets

*Moved out of AGENTS.md on 2026-09-25 (re-center phase 5): imports are paused, and the procedure is read only when
one runs. AGENTS.md keeps the rules every change follows.*

**Paused on 2026-09-25 by the owner.** No new batch until the re-center in `docs/GOALS.md` is built. The documents
already fetched may be mined for the record tier, print recipes and makers' know-how under the re-center plan
(`docs/audits/2026-09-25-re-center/REPORT.md`, phase 6); that is not a batch, and it does not travel this pipeline.
What follows is how a batch was run, kept for when imports resume.

The public corpus is larger than this database, and `docs/audits/2026-09-18-v2-import/` is the record of bringing it
in. A document never enters by hand: it travels the pipeline, and `ingest:apply` refuses a batch that has not.

**Read these three first; all are generated, and between them they say where everything stands.**

```bash
npm run ingest:inventory -- --status   # STATUS.md: the database, the corpus by status, the parity census
npm run ingest:blockers                # BLOCKERS.md: every open document, what it needs, who it waits on
npm run ingest:readings                # READINGS.md: the identity each held sheet gives its product
```

`docs/audits/2026-09-18-v2-import/PLAN-REMAINING.md` is the one written document: what is decided, what is left,
and the reasoning a count cannot carry. Start there, not here.

**Getting the bytes.** Each step writes the ledger and nothing else; `.cache/sources/by-sha/<sha>` is the document.

```bash
npm run ingest:fetch -- --provider "SUNLU"                  # two at a time per host, by digest
npm run ingest:fetch -- --stage <file|folder> --doc <key>   # a document the owner saved from a browser (R084)
npm run ingest:capture -- --provider "BASF Forward AM / Ultrafuse"   # a page whose numbers a script draws
npm run ingest:harvest -- --provider "BASF Forward AM / Ultrafuse"   # a page that is an index of documents
npm run ingest:extract -- --provider "SUNLU"                # the text, cached by digest, and the twins
npm run ingest:ocr -- --all                                 # a scan: an optical reading, and its page images
npm run ingest:witness                                      # the maker's product page, for a sheet naming no polymer
```

**Running a batch.** `scripts/ingest/batch.mjs` is the program; the steps are in the order they must happen.

```bash
npm run ingest:batch -- --holds                              # why each document waits, written into the ledger
npm run ingest:batch -- --batch bNN --propose --ready        # ... then propose what nothing holds
npm run ingest:batch -- --batch bNN --propose --held ruling  # ... or what a named hold was waiting on (--held any: all)
npm run ingest:batch -- --batch bNN --twins --by "<name>"    # R053: a grade each, the values recorded once
npm run ingest:batch -- --batch bNN --accept --by "<name>"   # every row the reviewer's own rule allows
npm run ingest:review -- --batch bNN --doc <key> --accept m01 --by "<name>" --note "..."   # the rest, one at a time
npm run ingest:batch -- --batch bNN --split                  # aside: optical, twin, held, already registered
npm run ingest:apply -- --batch bNN --dry-run                # then a migration mNN-batch-bNN calls applyBatch
npm run ingest:batch -- --batch bNN --finish                 # generated docs and the snapshot, then verify
```

`npm run ingest:propose -- --compare --all` is the parity census: run it before a batch commits, and before and
after any change to the reader. `npm run ingest:second-read -- --all` draws R085's sample for a reader who did
not decide the rows; `-- --tally` writes the findings register, and `-- --defer --why "..." --by "<name>"` closes
what is still open with a written deferral (R165), never by silence.

The rules that differ from editing a table by hand:

- **Parity before novelty.** A maker's layout is proved on the sheets somebody already transcribed before any sheet
  of theirs that nobody has. Below about 95% the reader is not ready; what it misses is named per row.
- **A proposal is not data.** Every row carries the page and line it was read from, and a review that records who
  accepted it. `ingest:apply` writes nothing unless every row was accepted or rejected by a named reviewer (a person, or an
  agent named as one: every review in the V2 import was an agent's, and a report must say so), every
  document still hashes to what was recorded, and every number is printed on the page its Locator names.
- **A copy is not a source.** A document is its bytes; the same file from a maker and a retailer is one document.
  Where two sheets print the same numbers under different product names, the ledger queues them rather than
  consolidating: that is a reading of the sheet, not a rule.
- **An identity the rule cannot settle is a ruling**, written once in `rulings/rulings.csv` and applied to every
  sheet that says the same thing. "Nylon" names a family, and a family owns no product (D44).
- **A batch is a migration.** `scripts/migrate/mNN-batch-<name>.mjs` pins the proposals and calls `applyBatch`, so
  the migration sequence stays the one history of how the data got here, and a re-run is a no-op.
- **`--holds` before `--propose`.** A hold reason is what the last `--holds` run wrote, so a document whose
  blocker has changed since is one a named reason misses. `--propose --held any` takes every held document.
- **A review names its batch.** A document is proposed again in every batch that re-reads it, and the older
  copies stay in their folders as the record of what that batch saw; `--doc` without `--batch` writes into all of
  them, and it refuses rather than doing so.
- **A reading of a page nobody else has read is signed.** An optically-read row needs `--visual` and a name, or
  `APPLY-OCR-UNVERIFIED` refuses the batch (D35). A row the page image does not print is rejected, never
  corrected: a reading a person edits is a transcription nobody made from a document nobody read.
