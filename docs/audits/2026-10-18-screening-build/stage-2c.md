# Stage 2c: where each plastic's own figures come from

> **Historical record** (2026-10-18): stage 2c of the screening build, on branch screening-build/stage-2c, before it merged. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** The tool keeps a short record for each base plastic (PLA, PETG, PC and so on): its density range, its
> melting point and whether it soaks up water. Until now 36 of those 48 records named no document behind them. This
> stage registered 16 documents, nearly all producers' own data sheets, and points 22 of the records at a document that
> prints the plastic's density and, for 18 of them, how much water it absorbs. No number in those records changed, so no
> answer and no estimate moved. The later stages will cite these documents: stage 3b for the rule that a plastic taking
> up very little water counts as dry when tested at room humidity, and stage 4 for PLA's melting point.

## What changed for a reader

Nothing a reader can see in an answer. The plastic records feed the estimate model, which stays frozen until stage 4, so
only two columns changed: the document each record cites, and its "basis" sentence, which now quotes that document.
Example: the PET record still holds a density range of 1,300 to 1,420 kg/m³; its basis now says that Mitsubishi
Chemical Advanced Materials' sheet for Ertalyte PET-P prints 1.39 g/cm³, and that the same sheet prints 0.07 % water
after 24 hours and 0.50 % at saturation.

One small visible change: a material page's last line says when its documents were read. For materials whose plastic
now cites a document fetched today, that range now ends on 18 Oct 2026 (PC-CF's page, for example).

## Which plastics now name a document

22 records gained a document. 15 are new documents, and 7 were already in the database for other reasons.

| Plastic | Document it cites | Density it prints |
|---|---|---|
| PLA | NatureWorks Ingeo 3D850 (already held) | 1.24 |
| PETG | Eastman Eastar copolyester 6763 data sheet (a web page) | 1.27 |
| PET | Mitsubishi Chemical Advanced Materials, Ertalyte PET-P | 1.39 (ISO), 1.41 (ASTM) |
| ABS | INEOS Styrolution Terluran GP-22 | 1.040 |
| ASA | INEOS Styrolution Luran S 778T, black | 1.070 |
| PC | Covestro Makrolon 2405 | 1.200 |
| PC-ABS | Covestro Bayblend T65 XF | 1.130 |
| PC-PBT | SABIC XENOY 6620 (UL Prospector's sheet of SABIC's data) | 1.20 |
| PA6 | BASF Ultramid B27 E | 1.12 to 1.15 |
| PA66 | Celanese Zytel 101L (already held) | 1.140 |
| PA612 | DuPont's Zytel guide, Zytel 151L and 153HSL (already held) | 1.060 |
| PA12 | Evonik VESTAMID L brochure (already held) | 1.01 to 1.03 |
| POM | DuPont Delrin 100P (already held) | 1.42 |
| PPA | Solvay Amodel AT-1002 HS, the unfilled grade (already held) | 1.13 |
| PP | Mitsubishi Chemical Advanced Materials, Proteus Homopolymer PP | 0.91 |
| PE | Mitsubishi Chemical Advanced Materials, Proteus HDPE | 0.96 |
| PPS | Mitsubishi Chemical Advanced Materials, Techtron 1000 PPS | 1.35 |
| PVDF | Arkema KYNAR 710 | 1.77 to 1.79 |
| PVA | Sekisui Selvol E 107 | 1.27 to 1.31 |
| TPU | Cambridge University's Materials Data Book (generic) | 1.12 to 1.24 |
| PEBA | Arkema PEBAX 5533 SP 01 | 1.01 |
| TPC | DuPont's Hytrel guide, eight grades (already held) | 1.11 to 1.22 |

Densities are in g/cm³. Every figure sits inside the record's range; none prints the range's ends, so the ends stay the
handbook values they were. A 16th new document, Eastman's technical information for Eastar 6763, is kept only to show
what Eastar 6763 is: "a clear amorphous polymer" based "on poly(ethylene terephthalate)", which is the PETG record.

Where a document's melting point differs from the record's, the basis says so and the number stays: PET 245 °C beside
252, PA6 220 beside 222, PPS 280 beside 283, PVDF 168 beside 170, PVA 230 beside 220.

## How much water each one takes up

All at 23 °C. "After 24 h" is a bar soaked for a day; "saturated" is soaked until it takes up no more; "at 50 % RH" is
a bar left in ordinary lab air until it stops changing.

| Plastic | After 24 h | Saturated | At 50 % RH |
|---|---|---|---|
| PE | below 0.01 % | below 0.01 % | – |
| PP | below 0.1 % | below 0.1 % | – |
| PPS | 0.01 % | 0.10 % (ISO), 0.03 % (ASTM) | – |
| PVDF | – | 0.03 % | – |
| PC-PBT | 0.080 % | – | – |
| PETG | 0.13 % | – | – |
| PC | – | 0.30 % | 0.12 % |
| PET | 0.07 % | 0.50 % (ISO), 0.9 % (ASTM) | – |
| PC-ABS | – | 0.7 % | 0.2 % |
| ABS | – | 1 % | 0.22 % |
| PEBA | – | 1.2 % | 0.6 % |
| ASA | – | 1.65 % | 0.35 % |
| PA12 | – | 1.4 to 1.5 % | 0.7 to 0.8 % |
| PA612 | – | 3 % | 1.3 % |
| TPC | 0.6 to 5 % | – | – |
| PA6 | – | 8.5 % | 2.2 % |
| PA66 | 1.2 % | 8.5 % | 2.6 % (humidity) |
| POM | – | 1.4 % | 0.3 % |

A dash means the document prints no such figure. Two records already quoted theirs before this stage: PBT 0.5 % at
saturation, and the PPE/PS blend 0.23 %.

**What stage 3b must decide with these.** Its rule counts a value tested at room humidity as dry for a plastic that takes
up 0.5 % or less at saturation. PE, PP, PPS, PVDF and PC are well under it. PET sits on the line, and its two test
methods disagree: 0.50 % to ISO 62 and 0.9 % to ASTM D570, on the same sheet. PETG and PC-PBT print only a 24-hour
figure, which is not a saturation figure. Those three need a decision, not a reading.

## What could not be sourced

14 records still name no document (OPEN-PROBLEMS §38.4):

- **PCTG:** no producer document names the polymer. Eastman's DN011 sheet says only "copolyester".
- **CPE, CoPE, nGen:** copolyester trade names; no sheet of their resins was fetched.
- **HIPS:** only a generic polystyrene range was found.
- **PA6/66, CoPA, PAHT, TPE, OBC, PVB:** no producer sheet that prints a density was fetched. Kuraray's Mowital sheet
  prints only a bulk density; Dow's INFUSE figure for OBC was found only on distributors' pages.
- **PA, Support:** neither names a single polymer.
- **BVOH:** the one figure found, 1.29 g/cm³ for Nichigo G-Polymer on a distributor's page, is above the record's top
  of 1.25. It was not fetched, so the range stays and the conflict is listed (OPEN-PROBLEMS §38.5).

PLA's sheet prints no water figure, so PLA has none.

## How the documents were chosen

A Claude Sonnet agent searched and fetched 28 documents. Claude Opus 5.5 read each one against its saved bytes, page by
page, and looked at the page image wherever a table's columns could be misread. It kept producers' own sheets, and a
copy of one where the source note says whose copy it is (Covestro's sheets as okw.ch and protolabs.com serve them, for
example). It turned down:

- **Three distributors' own sheets** (Plastics International's PET, Laminated Plastics' PPS, Direct Plastics' HDPE).
  Claude Opus fetched the producer's own sheet for each instead, from Mitsubishi Chemical Advanced Materials.
- **UL Prospector's Makrolon 2405 sheet** and **a coloured PP copolymer in a distributor's frame**, replaced by
  Covestro's own Makrolon sheet and Mitsubishi's own homopolymer PP sheet.
- **The PEEK, PEI and PEKK sheets.** There is no PEEK, PEI or PEKK record: those materials are outside the H2C's scope.
- **LyondellBasell's Moplen page.** Its data-sheet link reset the connection, and PP was sourced without it.

Each kept PDF was fetched again from its address and came back byte for byte the same, so the address is confirmed.
Eastman's PETG page differs on every fetch only in a form token its server writes; Eastman publishes no PDF of it.

## Checks run

`data:fmt`, `data:check` (0 issues) and `data:lint` (381 findings, all accepted, no new one and none stale). The
migration re-runs as a no-op. `build:diff`: 61 differences, all the 22 records' document and basis, the 16 new sources
and their count; no estimate moved. The decision check over 138 cases moved nothing
([stage-2c-diff.md](stage-2c-diff.md)). The snapshot moved only the source count and one page's size (the date line
above). `npm test`: 719 tests, all passing; `npm run test:ingest`: 295, all passing (one new, for the polymer staging).
`npm run verify:fast` took 61.5 s on its first run after the change, with a fresh build, and 42.6 s with the build cache
holding this stage's build, within the 90 s budget.

## Evidence and where to check

- The proposal the search agent wrote: `.cache/screening-build/rereads/POLYMER-SOURCES.md` (private cache).
- Import batch b47: [ingest/build-b47.mjs](ingest/build-b47.mjs) checks every quoted line on the cached text and writes
  [ingest/proposals/b47/](PACKETS.md) and [ingest/b47-packet.json](PACKETS.md) (its NotAdmitted
  list gives each turned-down document's digest). The documents were staged by digest from
  [ingest/staged-manifest-b47.csv](ingest/staged-manifest-b47.csv) into this round's ledger,
  [ingest/ledger.csv](PACKETS.md), which now records each as applied.
- Migration `scripts/migrate/m445-batch-b47-polymer-references.mjs`: the 16 sources, and each record's SourceID and
  basis with the lines it quotes, checked on the cached sheet before anything is written.
- Code: `scripts/ingest/witness.mjs` stages a document for a polymer (`for` column `polymer:<PolymerID>`); test
  `test/ingest-witness.test.js`.
- Decision diff: `node docs/audits/2026-10-18-screening-build/decision-census.mjs --diff after-s2b.json after-s2c.json`.

The record-level change list (`npm run data:diff`):

| Table | Records | Change |
|---|---|---|
| sources | 16 | Added: R-ARKEMA-KYNAR-710-TDS, R-ARKEMA-PEBAX-5533-SP01-TDS, R-BASF-ULTRAMID-B27E-PI, R-COVESTRO-BAYBLEND-T65XF-ISO, R-COVESTRO-MAKROLON-2405-ISO, R-CUED-MATERIALS-DATA-BOOK-2003, R-EASTMAN-EASTAR-6763-TDS, R-EASTMAN-EASTAR-6763-MBS80 (corroboration), R-INEOS-LURAN-S778T-TDS, R-INEOS-TERLURAN-GP22-TDS, R-MCAM-ERTALYTE-PET-P-DS, R-MCAM-PROTEUS-HDPE-DS, R-MCAM-PROTEUS-PP-H-DS, R-MCAM-TECHTRON-1000-PPS-DS, R-SABIC-XENOY-6620-DS, R-SEKISUI-SELVOL-E107-TDS |
| polymers | 22 | SourceID (was Not recorded) and Basis: PLA, PETG, PET, ABS, ASA, PC, PC-ABS, PC-PBT, PA6, PA66, PA612, PA12, POM, PPA, PP, PE, PPS, PVDF, PVA, TPU, PEBA, TPC |

## Words used here

- **Plastic record:** a row of polymers.csv, the facts the estimate model knows about a base plastic.
- **Saturated:** the water a bar holds after soaking until it gains no more.
- **Corroborating source:** a document kept to confirm what another one says; no figure is taken from it.
