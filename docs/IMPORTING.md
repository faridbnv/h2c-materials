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
On 2026-09-29 the owner asked for the gap-fill research of 2026-09-28 to be finished (GOALS, "the gap-fill tranche"):
batch b40 took nine exact-product pages its research saved, staged from those copies by digest, for one print setting
each; facts the research found on pages already registered were recorded from those pages by a migration, not
imported again. The price pass of 2026-09-30 admitted only its reviewed listings through the price pipeline.
The same day's approved coverage-expansion campaign is a bounded exception for existing-catalogue source gaps;
its isolated c01–c14 batches admitted 90 sources. The owner narrowed the resumed run to material assessment
and 100 additional priority products, now complete; unselected catalogue targets remain outside that run. The [campaign status](audits/2026-09-30-coverage-expansion/STATUS.md)
lists completed and remaining targets, and its [isolated ledger](audits/2026-09-30-coverage-expansion/ingest/ledger.csv)
retains source revisions and pipeline outcomes. On 2026-10-04 the owner opened the reader round (GOALS, "Decided on
2026-10-04, the reader round"): the makers' own pages and guides for materials with two sources or fewer (batch b41) and
for products still missing a nozzle or bed temperature (batch b42) entered through this pipeline, each batch bounded
and complete. Reading the sheets already registered again is not an import and travels a path of its own, described
under "Reading a registered sheet again" below (D123, D125). The general import pause remains outside those exceptions.
What follows is the procedure for an authorized batch.

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
npm run ingest:capture -- --provider "BASF Forward AM / Ultrafuse"   # a page whose numbers a script draws; tabs and accordions are opened first (--no-expand leaves it as drawn)
npm run ingest:harvest -- --provider "BASF Forward AM / Ultrafuse"   # a page that is an index of documents
npm run ingest:extract -- --provider "SUNLU"                # the text, cached by digest, and the twins
npm run ingest:ocr -- --all                                 # a scan: an optical reading, and its page images
npm run ingest:quality                                      # which cached pages are not a reading of the page (empty, glyph, letters, garble, label-no-number)
npm run ingest:ocr-pass -- --sha <sha> --pages 1,3-4        # an optical reading kept beside the text layer, never over it
node scripts/audit/refresh-html-cache.mjs                   # re-read cached web pages from their hash-checked bytes after a reader version bump
npm run ingest:witness                                      # the maker's product page, for a sheet naming no polymer
npm run ingest:witness -- --from <manifest.csv>             # pages a reader saved, staged from their copies by digest
npm run ingest:fetch -- ... --max-mb 200 --timeout-s 90     # a larger document, or a slower host, for one run
npm run ingest:fetch -- --compact                           # fold a stopped run's journal into the ledger; fetch nothing
npm run data:sources -- --manifest | --export <dir> | --restore <dir>   # the cached source bytes: list, back up, restore
```

A fetch is bounded (30 s to answer, 120 s for the body, 30 s of silence inside it, 64 MB) and tries a timeout, a
reset, a 429 (after its Retry-After) or a 5xx four times; what still fails is `unreachable` or `too-large`, the reason
first in its note. Each document is journalled as it finishes, so a run stopped with Ctrl-C, or killed, resumes without
fetching it again. `--refetch` fetches a document again where a digest is recorded; with `--recheck` it reaches an
applied or registered one too, and that document's digest never changes (D35): the same bytes change only the date,
other bytes are stored under their own digest and its note records "new revision <digest> served <date>" for a later
import to register as a source row of its own, and a failed recheck leaves its status and digest and says why in the
note. The live paths are named in `scripts/ingest/context.mjs`, and `H2C_INGEST_ROOT`, `H2C_PROPOSALS`
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
- **A page's statement, a test block and a print setting are read, not lost.** A heading or footnote that speaks for
  a whole table ("Mechanical properties (dry state)", "all specimens were annealed") enters as a `page_context.csv` row
  the page's measurements inherit (D116), never as one guess per row. Settings printed for the test bars ("Print test
  condition", "Printed Specimen Conditions", "How to make specimens") are not guidance (m170) and never fill a profile.
  The setting labels the reader knows are `scripts/ingest/lexicon/setting-labels.csv`; `npm run audit:context` runs
  the same reader over every profile already recorded, so a label it learns is checked on every sheet (D119). Beyond
  its labels (`guidanceBeyondLabels`, D120) it drops every setting under a test-bar heading or in a pellet-processing
  table, until a numbered note or a guidance heading begins; joins a drying row to the hours printed below it; reads a
  value the text layer set apart from its label, and settings run together with slashes; reads a nozzle window per speed
  band, nozzle size or foamed state as a row of its own (a profile each); and reads a drying schedule, an enclosure or a
  nozzle stated only in a sentence, unless the sentence names another product's type.
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

## Reading a registered sheet again (the reader round, D125)

A sheet already in `sources.csv` is hash-checked bytes with a cached text. Reading it again, page by page, adds no
document, so it is not an import (D123); a document the database does not hold still enters only through the pipeline
above. The reader round (2026-10-04) changed what the import's sheet reader sees, added a check on the text itself, and
added a path on which a model reads the page images and the tables take only what the page bears out.

**What the sheet reader sees.** `readSheet` (`scripts/ingest/propose.mjs`) reads a cached sheet in these views. The
cached text (`.cache/text/<sha>.json`) and the evidence binding (D97) are the extractor's, unchanged by any of them.

- **Lines.** The text as the extractor grouped it: spans on one baseline are a line.
- **Reading order** (`scripts/lib/pdf-layout.mjs`). A page's spans are cut into blocks by gaps (an XY-cut: a horizontal
  cut where the page leaves 1.5 line heights of white space, a vertical cut only through a band no cell crosses, with at
  least four lines wholly on each side of it and few lines spanning it), so two columns of text are read one after the
  other and a table whose rows share baselines stays whole. A column's label and its value are neighbours again.
  `readSheet` reads the lines and the blocks and keeps the union: an item only the blocks give carries `viaLayout`. This
  view is on since the reader round (D125); `H2C_READER_LAYOUT=0` turns it off for a run of the import or of
  `audit:context`. `npm run audit:reader-recall` (not part of `verify`; it needs the text cache) reads every cached
  sheet with the view off and on and writes what it adds, per print setting and property, to
  `docs/audits/2026-10-04-reader-round/reader-recall/`.
- **Ligatures put back** (`repairLigatures`, `scripts/lib/pdf-text.mjs`). Some fonts map "ti" and "ft" to digits and W,
  so purefil's sheets read "Prin5ng temperature" and "SoWening" and no label matched. The repaired text is a further
  view made at read time; `spanText` and the cache keep what the file holds, and a number is never touched. The quote
  checks accept it and say which view bore a quote out.
- **Web pages** (`scripts/lib/html-text.mjs`, reader version 5, `html/tables v5`). Besides tables, a page's definition
  lists, its grids of label/value blocks, `colspan` and `rowspan`, and the product data it carries as JSON-LD, Shopify
  product JSON or `__NEXT_DATA__` are read into the same lines and columns. `ingest:capture` opens tabs, accordions and
  `<details>` before it saves a page that a script draws. A spec grid a page runs onto one line ends a setting value where
  the next "Label:" begins (`settingValue`). After a reader version bump, `node scripts/audit/refresh-html-cache.mjs` reads
  the cached web pages again from their hash-checked bytes; it fetches nothing and writes no table.

**A page whose text is not a reading of it.** `npm run ingest:quality` (`scripts/lib/text-quality.mjs`) flags a page
with no text (`empty`), private-use characters (`glyph`), few letters (`letters`), a layer mapped to the wrong characters
(`garble`), or a property label with no number on it or the next two lines (`label-no-number`). A flag asks for a look at
the page image; it never changes data. `npm run ingest:ocr-pass` reads the pages you name optically and writes
`.cache/ocr-text/<sha>.json` beside the text layer, in the same page shape. It never replaces the layer, which
`ingest:ocr` does for a scan, so the two readings can be compared.

**A model reads the page images.** The steps, none of which writes `data/`:

```bash
npm run ingest:read-packet -- --docs docs/audits/2026-10-04-reader-round/DOCS.csv --tier 1 --round r1   # page PNGs, text, the rows the tables hold, per document
# readers write readings CSVs (READER-PROMPT.md, READING-SCHEMA.md in the same folder): every setting, value with its conditions and page statement, and a verdict on each held row
npm run ingest:read-reconcile -- --readings a.csv,b.csv [--second s.csv] --run r1   # each reading against the text, the tables and a second reading
npm run ingest:read-proposals -- --run docs/audits/2026-10-04-reader-round/reconcile/r1   # the files a migration applies, and held.csv
```

- **A reading is a claim until the page bears it out.** The reconciler gives each reading a presence (its numbers and its
  quote found in the text layer, the reading-order view, the optical sidecar or the ligature-repaired view, or
  `visual-only` where none prints them) and a class against the rows the tables hold from the source: `new`, `confirms`,
  `mismatch`, or `context` for a page statement.
- **What decides is read twice.** A new or contradicting print setting the H2C gate reads, a new headline property, a
  mismatch, a `visual-only` row and a page statement that would change what held rows mean need a second, blind reading
  of the same page, or the importer's own reader finding the same thing
  (`docs/audits/2026-10-04-reader-round/second-read-tasks.mjs` draws those tasks). A record-tier reading only an image
  shows is sampled one in ten.
- **A proposal is mapped, typed and gated.** `ingest:read-proposals` maps the reader's words to the vocabularies, types
  profile cells with the parsers, and writes profiles and values to add or set, and page statements. A reading with no
  vocabulary value, no conversion, a quote the cached sheet does not print, or a number the raw text does not begin with
  is held with its reason in `held.csv`. So is a setting printed for the test bars (`specimen-condition-not-guidance`,
  m170), and a twin's values go once to the formulation's carrier (R053, D89).
- **A migration applies them.** `applyProposals` (`scripts/migrate/read-proposals-apply.mjs`) checks every quote on the
  cached, hash-checked sheet and every replaced value before it writes, stops on a row whose gate is not `ready`, and is
  a no-op on a re-run. m342 is the example, m351 (what the ligatures hid) a second.
- **Corrections are decided by cause.** A held row the page seems to contradict is read on the page one row at a time
  and corrected through a migration (m343, m344, m353), never by a count or an automatic rule.

`npm run audit:context` is the guard that tells you where to look next: a product's own sheet that prints a
print-settings block no profile of the product holds is CONTEXT-PROFILE-UNRECORDED (`docs/RULES.md`). It skips a page that
speaks for three formulations or more, such as a maker's comparison table; those were read product by product.

## Capturing a price

A price is a document like a data sheet (D35, D113): the page a shop served, fetched and hashed, and every number, the
currency and the stock state of the row it becomes are read from that page's own offer data. `npm run ingest:prices`
(`scripts/ingest/prices.mjs`) is the route; `ingest:apply` never writes a price.

```bash
npm run ingest:prices -- capture --batch p01 --shop 3dprintingcanada.com   # a Shopify shop: its /meta.json and every catalogue page
npm run ingest:prices -- capture --batch p03 --from pages.csv              # pages (URL, Format: jsonld or amazon), as served or as drawn
npm run ingest:prices -- offers --batch p01 --vendor spectrum --out offers.csv
npm run ingest:prices -- propose --batch p01                               # selected.csv, the reviewed choice, into proposals
npm run ingest:prices -- apply --batch p01 --dry-run
```

- **The page states it, or it does not enter.** A Shopify catalogue page prints each listing's price, compare-at price,
  availability and SKU; the shop's own `/meta.json` states the base currency they are in. A product page's schema.org
  offer states its own currency. An Amazon page is drawn by a browser, since its price is drawn after the page loads,
  and hashed as drawn. `APPLY-PRICE-NOT-IN-OFFER` refuses a list, sale or displayed price, stock or currency the offer
  does not hold; a compare-at price above the price is the list price, and the price shown is then the sale.
- **The listing's own words give the net mass and the diameter** (`APPLY-PRICE-MASS`, `APPLY-PRICE-DIAMETER`): a metric
  mass printed once in its title, or in its description where the reviewer says so, and 1.75 mm, or a reviewer's
  statement that the product is sold only so. A pound figure is not read: it is a shipping weight as often as not.
- **The product and its maker** (`APPLY-PRICE-GRADE`): an active procurement grade of the row's material, and a listing
  that names its maker, by vendor or title; on Amazon.ca the buy box's seller must be the maker's own store.
- **VAT is taken off only at a rate the page prints** (`APPLY-PRICE-VAT`); a price whose rate it does not print is
  recorded and compared nowhere, and a European price is taken as before VAT only where its page says its prices
  exclude it ("excl. VAT", "HT", "zzgl. MwSt.").
- **Sellers** are `archive/ingest-2026-09-18/prices/sellers.csv`: each host's retailer name, source code, market (a
  value of `schema/vocab/markets.csv`, which says whether it is Canadian) and tax basis. A shop at a Canadian address
  priced in USD (ca.polymaker.com) is a USD storefront; a shop that shows a Canadian visitor a converted CAD price is
  recorded in its own currency.
- **A batch is a migration** (`scripts/migrate/mNNN-batch-pNN.mjs` calls `applyPriceBatch`). A material that gains a
  Canadian price closes its derived price gap by itself (D114); a reviewer's stored Canadian-price Gap is superseded in
  the same write, so the rehearsal's core build passes.

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
