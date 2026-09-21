# What is left of the plan

Rewritten 2026-09-21 for the completion plan. Everything that can be counted is generated and lives elsewhere;
what is here is what has to be decided or built, and the reasoning that a count cannot carry.

**Three documents say where the import stands, and all three are generated:**

- [STATUS.md](STATUS.md) — the database, the corpus by status, the parity census (`npm run ingest:inventory --status`)
- [BLOCKERS.md](BLOCKERS.md) — every open document, what it needs, who it waits on, what is uncertain
  (`npm run ingest:blockers`). What waits on the owner is here too: the one-off rulings are listed under
  `ruling:unsettled`, the gated documents under `gated` and `needs-staging`
- [READINGS.md](READINGS.md) — the identity each sheet gives its product, for the owner's verdict
  (`npm run ingest:readings`)

The decisions pack that used to be a fourth document asked nine questions, and every one of them is answered
(R074 to R083 in `rulings/rulings.csv`).

## 1. What frees each kind of held document

`npm run ingest:batch -- --holds` asks every proposal why it is waiting and writes the answer into the ledger, so
the queue is a query rather than a memory. It asks two things before the proposal: whether the maker already has
an active grade for the product (then the document is `registered`, which is terminal), and — for a page the
reader found nothing on — what the page actually holds, so a brochure is `not-a-data-sheet`, a header over an
image is `needs-ocr`, and a sheet in a language the lexicon has no labels for says so.

| Reason | What frees it | Whose |
|---|---|---|
| `ruling` | a verdict in `readings/readings.csv`, or a ruling row for the one-offs BLOCKERS.md lists | the owner's |
| `twin` | the sheet it repeats being applied (then `--twins` shapes it under R053), or a reading of the two sheets where they read as different materials | the pipeline's |
| `reader:several-values`, `reader:condition-table` | one rule: a table's value columns read by position, and the table's caption carried onto each row | the pipeline's |
| `no-values:language` | property labels in that language, as b15's fifteen Chinese ones | the pipeline's |
| `no-values:prose`, `no-values:layout` | a reading of the page; whether a sentence-stated value enters at all is a data question | a reader's |
| `ocr-visual`, `needs-ocr` | a separate agent against the page image, row by row, signed with `--visual` (D35) | an agent's |

**`reader:several-values` is a measured decision, not a guess.** Refusing a row that states several results inside
the reader was tried against every maker with hand-transcribed sheets and **cost 297 values the database already
holds**, because a sheet prints two results on one line for good reasons as often as bad ones. Reading the columns
by position is what frees them, and it is the one reader rule left worth building (completion plan, phase B).

**The maker's product page is a second witness, and a weak one.** For a sheet that names no polymer, `npm run
ingest:witness` fetches the maker's own page for the product, hashed and cached like any document (a ledger row of
kind `product-page`), and `ingest:readings` reads the polymer from a line that names the product and one polymer in
the same clause. Of 72 pages fetched, 33 name the product in their title at all — most are a maker's datasheet index
— and 5 readings resolved (Antero 800NA → PEKK, PLX → PLA, ULTRA PA CF25 → PPA, Obsidian PA6+CF → PA6, ABS Rapido
Metal → ABS). The rest stay `unread`, both witnesses cited, for the owner's verdict.

**A twin is only a twin once its primary is applied.** Of the 50 still held, 7 have nothing recording which sheet
they repeat, and 41 read as a different material from the sheet that carries their values — AzureFilm's one table
for its PLA and its Silk PLA is the shape — which one formulation key cannot span (D12, D44). Those are a reading
of two sheets, not a rule.

## 2. Two durable fixes this programme has named and not made

Both were tried, measured and put down with the measurement, so neither is a thing to rediscover. Both are phase
F of the completion plan; the first is done.

**A fill class per grade Variant — done on 2026-09-21, D80.** A grade that declares an undisclosed dense filler
(D57, R078) was judged by the physics windows as an unfilled polymer, because `fillOf` read the material's
Modifier and not the grade's Variant, and every metal-filled grade produced a permanent accepted finding. The
obvious fix was wrong and the measurement is in D80: `any` has a higher floor, not a wider range. Two fill
classes of its own — `dense` and `light` — with 26 windows drawn from physics and from what these grades
publish; `fillOf` reads the grade's Variant first and `windowFor` in the reader takes the same class, so the row
that is proposed and the row that is judged are weighed against one window. The back-test is that nothing moved:
`build:diff` reports 0 differences in the compiled database, 24 accepted findings stopped occurring and were
removed, and no new finding appeared.

**Two high-temperature fibre windows drawn before a 30 wt% grade existed.** W0024 tops tensile strength at
160 MPa and W0080 modulus at 16 GPa, both from observation. Ensinger's TECAFIL PEEK EV CF30 reaches 170 to 200
MPa and 17 to 20 GPa, which is what a thirty per cent short-carbon PEEK does. Four findings accepted; the window
is the thing to widen once a second such grade arrives, which is the evidence it is waiting for.

## 3. What the pipeline still does not do

- **Corrections to a document already registered.** OPEN-PROBLEMS §1 and §9 were pre-pipeline transcription
  damage and are **closed** (m101, m102, 2026-09-21): 70 measurements now name the method their sheet prints and
  130 cells of 31 print setups hold what their own cell prints. `edits[]` through `source-edits.mjs` was the
  plan's way to close them and it was measured — a re-read corrects 8 of 96 and overwrites good hand
  transcriptions with worse output — so it stays unbuilt, and the rows were closed by hand through `correct()`.
  Twenty rows were read and left: a sheet that prints "N/A", "Prusa Polymers" or a bare "ISO" as its method is
  being vague, which is not transcription damage.
- **Staging a document the owner supplies.** iSANMATE's first 18 entered as `retrieved-copy` by hand; there is no
  `ingest:fetch --stage` yet. Phase D builds it, for FormFutura's and iSANMATE's remaining 87.
- **Evidence rows.** `propose` reads properties, print settings and certification claims, but proposes no
  `evidence.csv` rows for chemical, safety or certification statements.
- **`material_links.csv` citations for a new material.** Phase D adds one link row per new material to
  `writeBatch`.
- **The second read at every batch.** b01 and b02 were read a second time and it found the source collision m55
  repairs; b03 onward were not. R085 says a separate agent reads a seeded sample of each — phase F1.

## 4. How a batch is run

The steps were retyped from memory every session until 2026-09-20, which is how the same three mistakes were made
three times: a `verify` spent on a generated document nobody had regenerated, a document re-proposed because nothing
recorded why it was held, and parity re-run after every lexicon row instead of once. They are a program now,
`scripts/ingest/batch.mjs`, and the rules it keeps are these:

- **One propose run over everything the batch holds**, selected by its hold reason, not one run per maker.
- **Review by exception**: accept every row the reviewer's own rule allows, read only what it holds back — and a
  bulk decision must match **every** reason a row is held for, never one of them.
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
  (PET-GF's outlier, the rejected-values list, the shared-key rule). A check is never weakened to pass.
