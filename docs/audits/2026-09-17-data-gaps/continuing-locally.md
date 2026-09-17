# Continuing this work on a machine with network access

Written 2026-09-17 to hand the remaining batches over. Everything here is on branch
`claude/kind-bardeen-a25rt7`; nothing is on `main`, so [the live site](https://pdynamics.ca/h2c-materials/)
still shows the database as it was before this work.

Read [RESPONSE.md](RESPONSE.md) for what was done and why. This file is only the how.

## Where things stand

| | |
|---|---|
| Branch | `claude/kind-bardeen-a25rt7`, 3 commits ahead of `main` |
| Batch B0 | **done** (m38): 7 sources, 7 grades, 168 measurements |
| `hdt045` this-material | **23 back-test cases, certified** (was 18; 22 needed) |
| `tensileStrengthXY` this-material | **19 of 22** — three short |
| Batches B1, B2, B3 | not started; each needs sources fetched and re-read |

## Setting up the clone

```bash
git clone <repo> && cd h2c-materials
git checkout claude/kind-bardeen-a25rt7
npm install --prefix build     # the build's dependencies
npm install                    # the root's (pdfjs-dist, used by the re-read tooling)
npm run hooks                  # the pre-commit data gate
npm run verify                 # should pass; ~4 minutes with the browser checks
```

`npm run verify` runs the interface probe and 300 rendered scenarios through headless Chrome. It
finds Chrome at the usual install paths, so on a normal desktop it just works; `CHROME=/path`
overrides it. If it prints "skipped: no Chrome found", the check did not run — CI runs it with
`--require`, so a branch that skips locally can still fail there.

`.cache/sources/` holds the fetched PDFs, keyed by SourceID, and is gitignored. It is empty in a
fresh clone. `npm run audit:sources` refetches every PDF a measurement cites and hash-checks it
against `sources.csv`, which is also how you rebuild the cache. The seven sheets of B0 are owner
-supplied and not on a URL this tooling can reach, so they will report as uncached; that is expected
and harms nothing.

## How a batch is done

Copy `scripts/migrate/m38-certification-backlog.mjs`. It is the worked example for everything below:
sources with `Applicable grades` naming the GradeIDs an assertion then checks, grades with their
formulation key, one measurement row per published value with a page-anchored `Locator`, and a guard.

The guard is the part worth keeping. It checks each file's SHA-256, then re-extracts the PDF's text
and asserts that **every number the migration records appears on the page its Locator names**. A
mistyped value or a wrong page stops the migration instead of entering the data. It caught a
filename mismatch during B0 and would have caught a transcription slip.

```bash
# 1. put the PDFs in .cache/sources/<SourceID>.pdf
# 2. read them, page by page, with the repo's own extractor
node docs/audits/2026-09-15-filtering-estimates-data/sources/extract-text.mjs /tmp/pdftext
# 3. write the migration, then
node scripts/migrate/m39-....mjs
npm run data:fmt && npm run data:check && npm run data:lint
npm run build && npm run snapshot
npm run audit:data            # fails on an unreviewed or stale reviewed finding
npm run verify
npm run ui:check -- --write   # only if a view changed
npm run build:diff            # should name only the paths you meant to move
npm run data:diff             # the record-level changelog; put it in the commit
```

Next free migration id is **m39** (there is no m23).

Two things B0 learned that will recur:

- **Adding data refits the model.** Expect `EST-WIDE` and `EST-OUTLIER` to move: some clear, others
  appear. Each is reviewed per record in `data/review/accepted-findings.csv` — fixed, or accepted
  with a reason — and stale acceptances removed, or `audit:data` fails.
- **A published value the model cannot express is not entered.** B0 left out the BASF sheet's
  conditioned heat-deflection and Vicat values because `kindOf` would average them with their dry
  twins. Write the reason in the migration's header when this happens; do not add a model branch
  (D58).

## Checking progress

```bash
node docs/audits/2026-09-17-data-gaps/ledgers/certification-cases.mjs
```

Prints the back-test cases per class and refuses to write its CSV if its counts disagree with
`build/snapshot/screening.csv`. The five other ledgers beside it recompute the target lists; re-run
them all before starting a batch, and commit the refreshed CSVs.

---

## B1 — the last three strength cases

A case needs a **second formulation** (a different product, so a different `Shared formulation key`)
of a material whose strength headline is already measured, publishing any tensile strength endpoint
or a flexural strength, in any direction. `ledgers/strength-targets.csv` ranks all 35 candidates.

### What to collect

**1. Flashforge PET-GF — a page, already a recorded source (`D-FLASH-PETGF`)**

https://www.flashforge.com/products/pet-gf

G068-01 exists and holds no strength and no HDT row. If the page publishes either, that is a case
with no new grade and no new source: the cheapest item left. Print to PDF or keep the properties
table. It is not a `.pdf` URL, so `audit:sources` will not cache it; save it by hand.

**2 and 3. Two of these four**, which the 2026-09-15 workstream itself judged appropriate for a
second brand (open-items.md section 3, closing paragraph):

| Material | Manufacturers today | Wanted |
|---|---|---|
| ASA-CF (M033) | Bambu Lab | another brand's carbon-fibre ASA |
| PPA-CF (M070) | Bambu Lab | another brand's carbon-fibre PPA |
| PPA-GF (M071) | IPCON | another brand's glass-fibre PPA |
| ABS-GF (M028) | Bambu Lab | another brand's glass-fibre ABS |

Document libraries of publishers already in `sources.csv`, so a find can be recorded in the pattern
the register already uses (these are the shapes of the recorded URLs, not verified links):

- Polymaker — `wiki.polymaker.com`, technical data sheets; the Fiberon line is the filled-fibre range
  (`fiberon.polymaker.com`). Best odds by far: a Polymaker sheet of the B0 layout publishes heat
  deflection at both loads **and** a printed X-Y bending strength, so one sheet is a case in both classes.
- 3DXTECH — `www.3dxtech.com`; CarbonX is carbon fibre, FibreX glass fibre
- Spectrum — `spectrumfilaments.com`
- iSANMATE — `www.isanmate.com` (robots-disallowed to fetch tools; save from a browser)
- BASF Forward AM — `forward-am.com`

**A sheet is useful if it prints any of:** `Tensile strength (X-Y)`, `Bending strength (X-Y)`, or
`Heat deflection temperature` at 1.8 or 0.45 MPa.

**Do not** look for a second brand for the Bambu SKU entries — PLA Basic, PLA Matte, PLA Silk Dual
Color, PETG HF, ASA Aero and the rest. Another brand's plain PLA does not belong under "PLA Basic
Gradient": one product has one home (D44), and those entries name a product, not a material class.

### Also still open from B0

- **Polymaker PolyMax PC V5.3** (`8f62ebe0…`, cached, read): an alternative second PC grade rather
  than a second one beside PolyLite PC, and its 14.8 °C gap between the loads would be a miss
  against the amorphous bracket. Owner question 1.
- **Stratasys FDM Nylon-CF10** (`ccf8e468…`): its base is "a blended nylon"; whether it is M053
  PA12-CF or M050 PA6-CF is an identity ruling (D57) and must be made before it can be filed.

## B2 — the safety data sheets

**Decided by the owner, 2026-09-17: the new source class is `Manufacturer SDS`.** It is *not* yet in
`schema/vocab/source-classes.csv`, because a new vocabulary value belongs in the same commit as the
first data that uses it (AGENTS.md). Add the row, run `npm run docs:dictionary`, and commit both with
the first SDS batch. Nothing in code or tests pins that list.

`ledgers/sds-targets.csv` ranks all 143 active procurement grades and gives each publisher's document
tree. Batch 1 is the 15 at priorities 1 to 3, led by **G019-02 iSANMATE PLA Glass Fiber**: its SDS
section 3 is the "composition declaration from iSANMATE" that coverage row **C00003**, the register's
only open composition conflict, asks for in its own words.

Where each SDS fact goes, with no further schema change:

| Fact | Home |
|---|---|
| Composition, CAS, loading | `grades.Composition / filler`, in the sheet's words, naming the SDS in the cell (m26, m35, m37 are the precedents) |
| UL 94 and certificate claims | `grades.Certification claims` |
| Burning behaviour | `evidence.csv`, Domain `Flammability`, Topic `Flammability`, type `Manufacturer statement` |
| Ventilation, handling, stability | `evidence.csv`, Domain `Safety`, Topic `Processing ventilation` or `Chemical stability` |
| Disposal, food contact, moisture | Domain `Circularity`, `Certification` or `Environmental`, existing topics |
| Resolving C00003 | a new `coverage.csv` row `Composition` / `Resolved`, and C00003 set `Superseded` with a Finding opening "Superseded by C#####" |

Finding an SDS: take the link from the publisher's product page rather than guessing a URL. Bambu's
document CDN uses an opaque hash per file and cannot be constructed from the TDS URL; 3DXTECH and
Spectrum name their files predictably; eSUN keeps them under a folder already called `certification`;
BASF's HubSpot tree has a `/TDS/` folder per product and may have an `/SDS/` sibling.

## B3 — the comparability repair

`ledgers/comparability-targets.csv`, open rows only: **26 rows on 12 sources** whose specimen form is
the single thing standing between them and being an implied lower bound (D55, `compile.js`). Headed by
`S-PET-TDS` (M066, 5 rows), `S-SPECTRUM-…-pctg-cf10` and `S-CPECF` (M090, 7 between them),
`S-SPECTRUM-…-petg-esd` (M026) and `R-FORMFUTURA-STYX-PA6-TDS` (M049). Two are served from a URL that
is not a `.pdf`, so `audit:sources` will not cache them.

Use `correct()` from `scripts/migrate/source-edits.mjs`, one `set` tuple per field with a page-citing
note. Recode a specimen **only together with its direction from the same page**, or the lint load
moves rather than falls. Leave `Parse review` at `Not applicable`: specimen, moisture and direction
are vocabulary columns with no parser. Touching `Post-processing` is different — its wording goes into
`schema/vocab/post-processing.csv` with its State in the same commit, and `Anneal °C` / `Anneal h`
must match what the parser reads.

**Do not reopen** what is settled; the ledger marks each and why: the 34 sources in the 2026-09-15
`rereads.csv`, the 17 sheets m20 corrected, the four iSANMATE sheets m33 established publish no
specimen preparation, and `R-KIMYA-PEBA-S-TDS`, which the owner ruled stays unstated (D-07).

Two findings recorded in 2026-09-15 and never applied belong here once re-confirmed against the file:
V002155, V002156 and V002159 should read `Post-processing: Not published` (the annealing sentence is
under the mechanical table, not beside the water-absorption rows), and the Kimya PEBA-S source record
should move to its 2026/09 URL with digest `66c7b5b1…9ce3` and Access status `Retrieved` — the record
only; its rows stay unstated.

---

## Decisions still open

1. **PolyMax PC** as a second PC grade beside PolyLite PC, or not (B1 above).
2. **A recycled-fibre variant class.** Fiberon PETG-rCF08 is recorded in `Composition / filler` with
   `Variant` not applicable, because inventing a class would give the estimate model a covariate
   nothing has back-tested. Add the class to `schema/vocab/grade-variants.csv`, or leave it in prose?
3. ~~The SDS source class~~ — **decided: `Manufacturer SDS`.**
4. ~~`Decomposition temperature` as a property~~ — **decided 2026-09-17: not added.** Four of the seven
   B0 sheets publish one (PolyLite ABS > 380 °C, PolyLite PC > 360 °C, Fiberon PET-CF17 434.0 °C,
   Fiberon PETG-rCF08 432.6 °C). No registry row covers it, so they stay untranscribed by decision,
   not by oversight, and `npm run audit:sources` will keep listing them. Revisit only if a
   requirement ever needs it.
5. **A conditioned heat deflection.** Teaching `kindOf` a conditioned HDT and Vicat kind would let the
   BASF sheet's conditioned thermal values in. It needs its own decision and a back-test showing it
   helps (D58). Worth doing, or do those values stay out with the reason on record?
6. **The 2026-09-15 re-read verdicts**: may they be applied after a digest check alone, or does each
   want a fresh page read? D35 can be read either way, and it decides how much of B3 is already done.
7. **Merging to `main`.** Nothing here is live. A push to `main` runs `npm run verify` and republishes
   the site from `data/tables` automatically (`.github/workflows/pages.yml`).

## One unrelated defect, found and left alone

`build/reports/validation-report.md` at `main` records the `tensileStrengthXY` calibration coverage as
96%; the build reproducibly emits 94% from the same data (checked over three rebuilds). Nothing in
`verify` freshness-checks that file, so it drifted at some earlier commit. It was deliberately kept out
of this work's commits rather than folded into one silently. A one-line regeneration fixes it.
