# What is left of the plan

The plan the owner approved is in the session record; this is the part of it that has not been done, with what
each step now knows that the plan could not. Rewritten 2026-09-19, after batches b01 to b09.

## Where the import stands

| | Documents |
|---|---:|
| Applied: their values are in the database | 500 |
| Read and waiting for a batch | 554 |
| One sheet under another name, or another language's edition | 347 |
| Not yet fetched, or behind a login | 468 |
| A safety sheet, a dead link, no numbers on the page, out of scope | 67 |

Nine batches have landed: Bambu re-read, 3DXTECH, Polymaker, Spectrum, iSANMATE, the held PPE/PS blend, Extrudr,
SUNLU, and b09's five libraries read together (Eryone, Flashforge, colorFabb, Fabru / purefil, Fiberlogy). The
database holds 143 materials, 494 grades, 6,009 measurements and 665 sources, against the 103, 179, 2,645 and 300
it held when the plan was written.

Nothing in the corpus is now unreadable for want of a text layer: `npm run ingest:ocr` reads a scan on a copy,
caches it under the document's own digest as an optical reading, and `ingest:apply` refuses a row from one that
nobody has checked against the page image. Fiberlogy's whole library came in that way.

## 1. What b09 held, and the twelve before it

Seventy-three documents of the five libraries did not enter. Thirty of them are Fiberlogy scans and the other
optically read sheets: a value read from a picture waits for somebody to read it against the page image, which is
`ingest:review --visual` and nothing else. The rest are identities nobody has settled — colorFabb's four sheets
titled for the resin instead of the product, the PHA products, purefil's TPV and its GreenTEC rebrands,
Flashforge's Fabrial, Fiberlogy's FiberSilk, FiberSatin, FiberWood and FiberFlex — each needing a ruling, not a
guess. `batches/b09/README.md` names them.

Four SUNLU products and eight Extrudr products wait beside them for the same reason: a polymer nobody names, a
finish material that does not exist yet, or a sheet that reprints another product's table.

## 2. What each new maker's batch costs

Every library so far has needed the reader taught something, and each thing it learned was a rule rather than a
special case: a unit printed before its value, a value printed above its label, a designation whose digits are not
a value, a table printed beside another table, a bracket that lost its opening, a label the lexicon cannot read in
full. Parity on Spectrum, 3DXTECH and Polymaker is the gate that says none of it broke what was already right:
113 of 113, 213 of 214 and 223 of 239 through all nine batches.

Wave B's next makers have been measured against the same gate, and three of them are not ready:

| Maker | Parity | What it still misses |
|---|---|---|
| Spectrum | 656 of 656 | — |
| 3DXTECH | 472 of 473 | an Izod row whose label the sheet misspells |
| Polymaker / Fiberon | 770 of 810 | one shared table covering several products |
| eSUN | 21 of 23 | a bound with no unit on its line, and a value whose unit is bracketed behind it |
| Fillamentum | 22 of 23 | one endpoint its Test Condition column sets on a baseline of its own |
| BASF Forward AM | 26 of 57 | three build orientations in three value columns, under a header row that names them |

The page beside the table is off: a gutter is a band few of the page's lines cross while enough have text on
both sides of it, and a piece of a line that reads as a sentence where another piece states what a table states
is the page beside the table, not the row. A label a table merges across two rows is shared with both, which is
the mirror of the merged method-and-unit cell (`shareMergedCells`); a label standing above its rows in their own
column is a block heading and is left alone, which is what Spectrum's deflection block is. Between them those
took Fillamentum from 11 of 23 to 22, past the gate, and moved no other maker. Its 24 proposals exist: 16 of them
name a material this database already holds, and 8 are identities nobody has settled.

What is left is two named things:

- **The condition column on its own baseline.** A row that names its endpoint in its condition column is that
  endpoint's row, which is four of the five Fillamentum was missing. The fifth is the same statement set one
  point lower than its own row — "36 MPa ASTM D638" with "at break" beside it on a baseline of its own — and
  reads as a tensile strength of no stated endpoint, which is a third property and not one the sheet publishes.
- **The polymer base a sheet states in words.** Fillamentum's newer sheets carry a Chemical properties table
  whose first row is the answer to the question the identity queue keeps asking: "Polymer base polylactic acid
  and polyhydroxy butyrate compound", "Polymer base polyamide 12", "Polymer base Polyamide 6 + carbon fibres",
  "Polymer base polyolefin". The reader keeps the row; the lexicon knows the abbreviations and not the words, so
  four of the eight b10 documents are queued for a ruling that their own sheet answers. `polymer-aliases.csv`
  matches a token at a time, so "polyamide 12" needs the adjacent-token join the classifier already has for the
  fillers. It is worth more than the four: every maker that prints a composition row is in the same position,
  and an identity read from the sheet is one the owner does not have to settle.
- **A table with a value column per build orientation.** BASF prints "Tensile strength ISO 527 36.1 MPa / 5.3 ksi
  - 11.2 MPa / 1.6 ksi" under a header row naming X-Y, X-Z and Z-X, each value twice, metric and imperial. The
  reader takes the first and the sheet's other two orientations go unread. This is the last of
  `docs/OPEN-PROBLEMS.md` §1 and §9 as well, where a neighbouring column's cell is what 96 measurements and 15
  print setups carry instead of their own.

Two things are still missing from the reader, and both cost values on every maker:

- **A property the database does not carry.** Flammability class, decomposition temperature, volume resistivity,
  permittivity, moulding shrinkage, tear strength, abrasion loss, compression set, Poisson's ratio: 162 rows on
  SUNLU's sheets alone, and the reader names each one. `properties.csv` rows and the units beside them are a data
  decision, and the plan's Phase 1.9 is where they belong.
- **A polymer with no row.** PHA, TPS, SEBS and PA11 are still missing. PBT, COC, SAN, LCP, PVC and PBAT were
  written for b09, and PCL and the PPE/PS blend before it, each from a producer's reference that was fetched and
  hashed.

## 3. What is not fetched

404 documents, plus 64 behind a login. 3DJake's are Wave D and most are copies of sheets that arrive with their
makers. The gated ones need the owner's credentials: FormFutura's SharePoint (64) above all, with INTAMSYS's
request form (33) beside it. Twenty-three fetched web pages carry no numbers at all, because their tables are
drawn by a script the capture did not run; those are a fetch problem to reopen, not sheets without data.

## 4. Wave D: the retailers

737 rows, most of them copies. Fetch and dedupe first, then the ~120 documents of brands that reach the market
only through a retailer. Last, so every twin has a manufacturer's sheet to point at.

## 5. The estimate stage at scale

This is now the nearest thing to a deadline in the programme. The estimate stage is 40 s on today's data where
the core compile and validate together are 74 ms, and it is cubic in observations: `npm run scale`, which builds
twice the data, read about 10 s yesterday and reads 100 s today, because the corpus grew 2.3× in a day. Its budget
was raised from 90 s to 150 s with every measurement recorded beside it in `test/scale.check.js`, and the check
gained a second assertion holding the core build at 2× to 5 s so a real compile regression still fails it.

One cost there was not the mathematics and is gone: the kernel's covariance looked its columns up by name, which
is n²/2 string hashes per fit and hundreds of fits per headline. That is 40.5 s down to 33.4 s at 1× and 111 s to
100 s at 2×, bit for bit the same fit. What is left profiles at 52% Cholesky, which only the block solve reaches.

The cap that keeps the spread search affordable is `fitting.spreadSampleMax` (D77), and it is already doing its
work. The plan's trigger for the exact block solve is a headline above 4,000 observations or the estimate stage
above five minutes; the largest headline holds 733 observations and the stage 40 s, and two or three more batches
of this size reach it. Building it before Wave C is cheaper than building it during.

Beside it, the distributable: `dist/db.json` is 11.3 MB and the one-file page that embeds it gzipped is 5.2 MB,
against the plan's 15 MB threshold for taking measurements out of the page payload. At this rate that arrives
around three times today's data, so it is a Wave C decision.

What the batches have already taught the model, each in its own place: a support product with no measurements is
not characterised and one with them is read like any other material; a conditioned bar beside its own dry one is
another state, not a repeat; a limit a material's own grades publish is a floor for its shown range (D78); and
whether a declared variant moves its family is measured against an ordinary sibling.

## 6. What the pipeline still does not do

- **Evidence rows.** `propose` reads properties, print settings and certification claims, but proposes no
  `evidence.csv` rows for chemical, safety or certification statements.
- **`material_links.csv` citations** for a new material.
- **A sheet that covers several products.** One document is one proposal and one product, so a shared table reads
  as one of the products it lists. Eleven SUNLU sheets and several Polymaker family sheets wait on this; the
  owner's ruling R053 says what they become: a grade each, citing its own sheet, with the values recorded once.
- **Corrections to a document already registered.** A proposal for a registered document produces new rows, not
  corrections. m62 did that work by hand for 84 rows after the reader improved; `edits[]` through
  `scripts/migrate/source-edits.mjs` is what would make it a part of the pipeline.
- **The second read at every batch.** b01 and b02 were read a second time by a different reviewer, which found the
  source collision m55 repairs. b03 to b09 were not.
