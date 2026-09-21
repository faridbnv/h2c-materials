# What is left of the plan

Rewritten 2026-09-21. Everything that can be counted is generated and lives elsewhere; what is here is what has
to be decided or built, and the reasoning a count cannot carry.

**Three documents say where the import stands, and all three are generated:**

- [STATUS.md](STATUS.md) — the database, the corpus by status, the parity census (`npm run ingest:inventory -- --status`)
- [BLOCKERS.md](BLOCKERS.md) — every open document, what it needs, who it waits on, what is uncertain
  (`npm run ingest:blockers`). What waits on the owner is there too, with the command that turns each answer
  into data
- [READINGS.md](READINGS.md) — the identity each sheet gives its product, for the owner's verdict
  (`npm run ingest:readings`)

The decisions pack that used to be a fourth document asked nine questions, and every one is answered (R074 to
R088 in `rulings/rulings.csv`).

## 1. What waits on the owner

Three jobs, and BLOCKERS.md opens with the command that turns each into data.

| | Documents | What |
|---|---:|---|
| **Verdicts** | 195 | one word per row of `readings/readings.csv`; then `ingest:readings -- --rulings` writes them to the register and `ingest:batch -- --propose --held ruling` re-reads the sheets under them |
| **Rulings** | 6 | a row in `rulings/rulings.csv` per item under `ruling:unsettled`. Four of the six are one question: copper, magnetite and tungsten are loads no modifier value covers, and one metal value would take them all |
| **Documents nobody can fetch** | 120 | FormFutura 64, INTAMSYS 33, iSANMATE 23. Saved from a browser, `ingest:fetch --stage` hashes them against their rows by the file name their URL carries, and they travel the pipeline as fetched documents do, Access state `retrieved-copy` (R084) |

## 2. What two readers who did not decide these rows found

Both reads are done, both are committed, and what each found is recorded where it belongs.

**The optical review of b27** (`claude-optical`): all 139 proposals opened, 678 rows accepted against the page
image, 151 rejected, 87 documents signed off. **40 documents were left**: 11 whose identity is unsettled, and 29
whose product name is page furniture — 18 FormFutura sheets read as "UTURA", which is the logo in the header, 8
BASF ones named from a logo or a footer, a Fiberlogy sheet that took "TARDE NAME:" into the name. Those 40 need
a name the sheet prints before their rows are worth anything; the batch is not applied.

**The second read of b03 to b26** (`claude-second-read`, R085): 564 rows, 145 disagreeing. Three classes were
fixed the same day and in the reader too (m104, m105, m106 — 698 rows); **117 are still open** and are
OPEN-PROBLEMS §10, with the verdicts and quoted notes in `batches/<batch>/second-read-sample.csv`.

`--tally` has not been run, and what it should do needs deciding first: R085 says one disagreement reopens its
document, and for a document already applied that is a status the next `--holds` run undoes, because the product
has a grade and `registered` is terminal. Reopening a document whose rows are in the tables is not the same act
as holding one that never entered.

## 3. What frees each kind of held document

`npm run ingest:batch -- --holds` asks every proposal why it is waiting and writes the answer into the ledger, so
the queue is a query rather than a memory. It asks two things before the proposal: whether the maker already has
an active grade for the product — by the sheet's own name as well as the catalogue's, because a product has two
names — and, for a page the reader found nothing on, what the page actually holds, so a brochure is
`not-a-data-sheet`, a header over an image is `needs-ocr`, and a sheet in a language the lexicon has no labels for
says so.

| Reason | What frees it | Whose |
|---|---|---|
| `ruling` | a verdict in `readings/readings.csv`, or a ruling row for the one-offs BLOCKERS.md lists | the owner's |
| `ocr-visual` | a person against the page image, row by row, signed with `--visual` (D35) | an agent's |
| `reader:several-values`, `reader:condition-table` | one rule: a table's value columns read by position, and the table's caption carried onto each row | the pipeline's |
| `twin` | the sheet it repeats being applied (then `--twins` shapes it under R053), or a reading of the two sheets where they read as different materials | the pipeline's |
| `no-values:language` | property labels in that language, as b15's fifteen Chinese ones | the pipeline's |
| `no-values:prose`, `no-values:layout` | a reading of the page; whether a sentence-stated value enters at all is a data question | a reader's |

**`reader:several-values` is down to 31 from 53, and the rest is a measured decision.** The hold counts the
results a row states, and it was counting conditions: a published spread ("190 °C ± 10 °C") and a rate or
humidity in the value's own unit ("DSC, 10 °C/min 55 °C"). Twenty-two documents state one value each and are
free. The thirty-one that remain really do print several — Bambu's twelve-product impact row, QIDI's
moulded-and-printed columns — and refusing such a row inside the reader was tried against every maker with
hand-transcribed sheets and **cost 297 values the database already holds**. Reading the columns by position is
what frees them, and it is the one reader rule left worth building.

**The maker's product page is a second witness, and a weak one.** For a sheet that names no polymer, `npm run
ingest:witness` fetches the maker's own page for the product, hashed and cached like any document (a ledger row of
kind `product-page`), and `ingest:readings` reads the polymer from a line that names the product and one polymer in
the same clause. Of 72 pages fetched, 33 name the product in their title at all — most are a maker's datasheet index
— and 5 readings resolved (Antero 800NA → PEKK, PLX → PLA, ULTRA PA CF25 → PPA, Obsidian PA6+CF → PA6, ABS Rapido
Metal → ABS). The rest stay `unread`, both witnesses cited, for the owner's verdict.

**A twin is only a twin once its primary is applied.** Of the 47 still held, some have nothing recording which
sheet they repeat, and the rest read as a different material from the sheet that carries their values —
AzureFilm's one table for its PLA and its Silk PLA is the shape — which one formulation key cannot span (D12,
D44). Those are a reading of two sheets, not a rule.

## 4. The two durable fixes, and the one still waiting for evidence

Each was tried, measured and put down with the measurement, so none is a thing to rediscover.

**A fill class per grade Variant — done on 2026-09-21, D80.** A grade that declares an undisclosed dense filler
(D57, R078) was judged by the physics windows as an unfilled polymer, because `fillOf` read the material's
Modifier and not the grade's Variant, and every metal-filled grade produced a permanent accepted finding. The
obvious fix was wrong and the measurement is in D80: `any` has a higher floor, not a wider range. Two fill
classes of their own — `dense` and `light` — with 26 windows drawn from physics and from what these grades
publish; `fillOf` reads the grade's Variant first and `windowFor` in the reader takes the same class, so the row
that is proposed and the row that is judged are weighed against one window. The back-test is that nothing moved:
`build:diff` reports 0 differences in the compiled database, 24 accepted findings stopped occurring and were
removed, and no new finding appeared.

**Two high-temperature fibre windows drawn before a 30 wt% grade existed.** W0024 tops tensile strength at
160 MPa and W0080 modulus at 16 GPa, both from observation. Ensinger's TECAFIL PEEK EV CF30 reaches 170 to 200
MPa and 17 to 20 GPa, which is what a thirty per cent short-carbon PEEK does. Four findings accepted; the window
is the thing to widen once a second such grade arrives, which is the evidence it is waiting for.

## 5. What the pipeline still does not do

- **Evidence rows.** `propose` reads properties, print settings and certification claims, but proposes no
  `evidence.csv` rows for chemical, safety or certification statements.
- **A captured page's own title.** A page a browser draws begins with navigation where a data sheet begins with
  its title, and MakerBot's PETG article gave its product name as "Refresh". One document is not twenty, and the
  rule that would fix it — prefer a captured page's `<title>` — touches every name the reader reads.
- **Corrections to a document already registered.** OPEN-PROBLEMS §1 and §9 were pre-pipeline transcription
  damage and are **closed** (m101, m102): 70 measurements now name the method their sheet prints and 130 cells of
  31 print setups hold what their own cell prints. `edits[]` through `source-edits.mjs` was the plan's way to
  close them and it was measured — a re-read corrects 8 of 96 and overwrites good hand transcriptions with worse
  output — so it stays unbuilt, and the rows were closed by hand through `correct()`. Twenty rows were read and
  left: a sheet that prints "N/A", "Prusa Polymers" or a bare "ISO" as its method is being vague, which is not
  transcription damage.

## 6. How a batch is run

The steps were retyped from memory every session until 2026-09-20, which is how the same three mistakes were made
three times: a `verify` spent on a generated document nobody had regenerated, a document re-proposed because nothing
recorded why it was held, and parity re-run after every lexicon row instead of once. They are a program now,
`scripts/ingest/batch.mjs`, and the rules it keeps are these:

- **`--holds` first, then propose.** A hold reason is what the last `--holds` run wrote, so a document whose
  blocker has changed since is one a named reason misses; `--propose --held any` takes every held document
  whatever its reason.
- **One propose run over everything the batch holds**, selected by its hold reason, not one run per maker.
- **Review by exception**: accept every row the reviewer's own rule allows, read only what it holds back — and a
  bulk decision must match **every** reason a row is held for, never one of them.
- **A review names its batch.** A document is proposed again in every batch that re-reads it, and the older
  copies stay in their folders as the record of what that batch saw; `--doc` alone writes into all of them.
- **Twins before review**, so a copy never produces rows for somebody to read; `--twins` shapes them under R053.
- **Parity once**, over every registered maker, before the batch commits — `--compare --all` — and before and after
  any change to the reader.
- **One full `verify` per batch**, after `--finish` has regenerated the dictionary, the rules and the snapshot.
- **A reader rule is built when it frees about twenty documents or a whole maker.** Below that the documents are
  held with the gap named on the row.
- **Nothing is fixed one row at a time.** A wrong value found in the data is counted across the table with SQL
  first — the resistivity misreading was nine rows, three of them older than the programme — and corrected in one
  migration through `correct()`, with a window or a lint so the class cannot re-enter.
- **A check that pins the corpus's contents is rewritten to assert the rule**, in its own commit, with the reason
  (PET-GF's outlier, the rejected-values list, the shared-key rule, the scaffold's missing polymer). A check is
  never weakened to pass.

## 7. A blocker nobody has seen before

The policy the completion plan carried, kept here because the plan file is retired and this is the part of it
that outlives the phases. It has held for twenty-six batches.

| What turned up | What to do |
|---|---|
| a data question | a ruling row, and the document held until it is answered |
| a layout the reader cannot read | build the rule if it frees about twenty documents or a whole maker; otherwise name the gap on the row |
| a check breaching its budget | measure, fix the cause, and never raise the budget twice |
| a fetch failure | one retry, then the dated state |
| a wrong value in the tables | count the class with SQL first, correct it in one migration through `correct()`, and add a window or a lint so it cannot re-enter |
| a vocabulary value the data needs | the same commit as the data that cites it |
| anything else | BLOCKERS.md names it, and the batch continues without it |

Two more the work since has earned:

- **A check that pins the corpus's contents is rewritten to assert the rule**, in its own commit, with the
  reason. Four have been: PET-GF's outlier, the rejected-values list, the shared-key rule, and the scaffold's
  missing polymer, which began failing the day a producer's reference gave PA11 its row.
- **A bulk decision must match every reason a row is held for**, never one of them. Nine rows entered a batch
  through a `--decide` that matched one of two reasons; all nine were in documents that were still held.

## 8. Where to pick this up

1. `npm run ingest:inventory -- --status`, `npm run ingest:blockers`, `npm run ingest:readings` — three commands,
   three documents, and the queue is a query rather than a memory.
2. Read §1 above for what waits on the owner and §3 for what frees each held document.
3. The nearest piece of work that needs nobody else: **the 31 documents whose rows really do state several
   results**, which is the one reader rule left worth building (a table's value columns read by position). The
   53 that were held for it are down to 31 because the hold was counting conditions; the rest are Bambu's
   twelve-product impact row and QIDI's moulded-and-printed columns.
4. The nearest piece that needs a reader: **batch b27's 40 documents** whose product name is the sheet's own
   furniture. Their rows are reviewed and signed; what they lack is a name the page prints.
5. Before committing anything: `npm run verify`, and `npm run ingest:propose -- --compare --all` if the reader
   changed. A parity drop that follows a reader fix may be the recorded rows being wrong — that happened three
   times this week, and each time the migration that corrected them brought the census back.
