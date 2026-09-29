# Importing a batch of data sheets

*Moved out of AGENTS.md on 2026-09-25 (re-center phase 5): imports are paused, and the procedure is read only when
one runs. AGENTS.md keeps the rules every change follows.*

**Paused on 2026-09-25 by the owner.** No new batch until the re-center in `docs/GOALS.md` is built. The owner
lifted it for the 74 sheets deferred for their identity (batch b34, and batch b35 for the three questions b34 left;
D87). The documents already fetched may be mined for the record tier, print recipes and makers' know-how under the
re-center plan (`docs/audits/2026-09-25-re-center/REPORT.md`, phase 6); that is not a batch, and it does not travel
this pipeline. Phase 6 fetched new documents only where one settled a blocking answer, and those did travel it
(batch b36; GOALS, phase 6, decision 4). On 2026-09-27 the owner lifted it for two held sheets whose makers' pages,
found by the research package of 2026-09-26, name the polymer (batch b37: Timberfill and NinjaTek Eel), and the
package's saved pages entered as witnesses from their copies (`ingest:witness --from`). On 2026-09-28 the owner
authorized b38 (the held Recreus PET-G 2023 sheet) and b39 (maker-site witnesses for the frozen chamber targets),
bounded by [GOALS](GOALS.md#decided-on-2026-09-28-for-source-backup-and-targeted-gap-closure). Both batches are
complete; their exact scope and remaining handoffs are in the [gap-closing response](audits/2026-09-28-gap-closing/RESPONSE.md).
The general import pause remains. What follows is the procedure for an authorized batch.

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
npm run ingest:witness -- --from <manifest.csv>             # pages a reader saved, staged from their copies by digest
npm run ingest:fetch -- ... --max-mb 200 --timeout-s 90     # a larger document, or a slower host, for one run
npm run ingest:fetch -- --compact                           # fold a stopped run's journal into the ledger; fetch nothing
npm run data:sources -- --manifest | --export <dir> | --restore <dir>   # the cached source bytes: list, back up, restore
```

A fetch is bounded (30 s to answer, 120 s for the body, 30 s of silence inside it, 64 MB) and tries a timeout, a
reset, a 429 (after its Retry-After) or a 5xx four times; what still fails is `unreachable` or `too-large`, the reason
first in its note. Each document is journalled as it finishes, so a run stopped with Ctrl-C, or killed, resumes without
fetching it again. The live paths are named in `scripts/ingest/context.mjs`, and `H2C_INGEST_ROOT`, `H2C_PROPOSALS`
and `H2C_DOCUMENT_CACHE` move them. `data:sources` never fetches: a restore takes back only bytes that hash to a
registered or ledger digest, and names the digests still missing.

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
npm run ingest:batch -- --reopen-gap "<gap>" --why "..." --by "<name>"   # deferred documents whose cause is settled
npm run ingest:batch -- --settle <key> --as registered --to <SourceID> --why "..." --by "<name>"   # read, not ruled
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
  document still hashes to what was recorded, and every number is printed on the page its Locator names. A decision
  value is also bound to its own row (D97): the number must be one its evidence line prints, whole (a "5" inside "52",
  or the 527 of "ISO 527", is not), and a number the line prints once has one role, so "annealed (4h @ 90°C)" cannot be
  both an anneal and a test temperature. A layout the reader cannot bind enters when a person read the row on the page
  image and says so (`review.visual`). `npm run audit:witness` asks the same of the rows already recorded.
- **A later original at the same URL keeps the earlier source.** Its proposal records `review.retrievalRevision` with `previousSourceID`, `previousSHA256`, `accessed` and `by`; the guard checks those pins and the later access date. A metadata-only earlier entry with no digest also needs `previousDigestNotRecorded`, and remains explicitly missing. Neither its SourceID nor its digest is overwritten.
- **A copy is not a source.** A document is its bytes; the same file from a maker and a retailer is one document.
  Where two sheets print the same numbers under different product names, the ledger queues them rather than
  consolidating: that is a reading of the sheet, not a rule.
- **An identity the rule cannot settle is a ruling**, written once in
  `docs/audits/2026-09-18-v2-import/rulings/rulings.csv` and applied to every sheet that says the same thing.
  "Nylon" names a family, and a family owns no product (D44). A sheet that says only that is searched beyond itself
  first: the maker's safety data sheet, pages, guides and older editions (R205, D106). What they name files it; what no
  document names goes to the family's maker-undisclosed home (R167, D87). An `identity` ruling names a polymer; a
  `material` ruling names the material itself, for a home or a polymer with no row. A TPU is filed by its Shore rating,
  and one that states none waits for its maker's (D106).
- **A batch is a migration.** `scripts/migrate/mNN-batch-<name>.mjs` pins the proposals
  (`archive/ingest-2026-09-18/proposals/<batch>/`) and calls `applyBatch`, so the migration sequence stays the one
  history of how the data got here, and a re-run is a no-op.
- **`--holds` before `--propose`.** A hold reason is what the last `--holds` run wrote, so a document whose
  blocker has changed since is one a named reason misses. `--propose --held any` takes every held document.
- **A review names its batch.** A document is proposed again in every batch that re-reads it, and the older
  copies stay in their folders as the record of what that batch saw; `--doc` without `--batch` writes into all of
  them, and it refuses rather than doing so.
- **A reading of a page nobody else has read is signed.** An optically-read row needs `--visual` and a name, or
  `APPLY-OCR-UNVERIFIED` refuses the batch (D35). A row the page image does not print is rejected, never
  corrected: a reading a person edits is a transcription nobody made from a document nobody read.

## Keep the private source backup current

After every applied batch, re-export to the private store named by `H2C_SOURCE_BACKUP` in the owner's shell profile:

```bash
npm run data:sources -- --export "$H2C_SOURCE_BACKUP" --derived
npm run doctor
```

The variable names the private location; no machine path is stored in the repository. The store includes every
registered and ledger-only document with verified bytes, plus derived text, optical PDFs and reviewed page images,
with separate digests. `--restore` admits derived evidence only beside verified source bytes. A re-export retains
whole files and copies what is new or damaged. `doctor` reports the export's age and present digests the store lacks.
