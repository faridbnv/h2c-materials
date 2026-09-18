# Acting on the 2026-09-17 gap reading

[REPORT.md](REPORT.md) finds three different problems: a targeting problem (the screening classes are a dozen named
documents from certification), a re-reading problem (comparability is 26 rows on 12 documents already on file), and a
source-class problem (the properties no data sheet prints). This is what was done about the first two, and what is
waiting on source access.

## What was blocked, and what the owner unblocked

Every step needs a source fetched, hashed and re-read: under D35 nothing enters from a report, a summary or an
earlier audit's reading, however carefully it was taken. This session could fetch none of them. Its environment's
egress policy answers 403 to every manufacturer host - `polymaker.com`, `cdn.polymaker.com.cn`, `forward-am.com`,
`store.bblcdn.com`, `ca.store.bambulab.com`, `3dxtech.com`, `help.prusa3d.com`, `spectrumfilaments.com`,
`isanmate.com`, `flashforge.com`, `stratasys.com`, `pmc.ncbi.nlm.nih.gov`, `web.archive.org` - and `.cache/sources/`
is gitignored, so the hashed PDFs of earlier rounds are not in this checkout either.

**The owner then supplied the seven data sheets of batch B0 directly, on 2026-09-17.** Each was cached under its
SourceID and hashed, and all seven digests matched the prefixes the 2026-09-15 workstream recorded, so they are the
same documents it read. B0 is therefore **done**, from the files rather than from that workstream's reading. B1 to
B3 still need source access.

To unblock the rest: locally there is nothing to do, the cache is already there. In a remote session, allow those
hosts in the environment's network policy (https://code.claude.com/docs/en/claude-code-on-the-web), then `npm run
audit:sources` rebuilds `.cache/sources/` and hash-checks every cited PDF. Or supply the files as the owner did here.

## Done

### The ledgers

Five scripts under [`ledgers/`](ledgers), each writing the CSV beside it. They read the tables and the committed
snapshot, so they stay true as the data moves and can be re-run before any batch starts.

| Script | What it answers |
|---|---|
| [`gap-census.mjs`](ledgers/gap-census.mjs) | every count in REPORT.md, with the file each comes from |
| [`certification-cases.mjs`](ledgers/certification-cases.mjs) | which materials give the back-test a case, per headline and class, and what a second product would have to publish |
| [`import-backlog.mjs`](ledgers/import-backlog.mjs) | the ten candidate sheets of 2026-09-15, what each is worth today, the GradeID it would take |
| [`strength-targets.mjs`](ledgers/strength-targets.mjs) | where the remaining `tensileStrengthXY` cases can come from |
| [`comparability-targets.mjs`](ledgers/comparability-targets.mjs) | the rows a specimen re-read would turn into implied bounds, and the ones already ruled on |
| [`sds-targets.mjs`](ledgers/sds-targets.mjs) | every active procurement grade with no safety data sheet, ranked, with the publisher's document tree |

`certification-cases.mjs` reproduces `backTest`'s own membership rule and exits 1 if its counts disagree with
`build/snapshot/screening.csv`, so the ledger cannot quietly drift from the build.

### The import scaffold

[`scripts/migrate/m38-certification-backlog.mjs`](../../../scripts/migrate/m38-certification-backlog.mjs) is written
and **cannot run**. It holds the seven new grades, their sources with the `Applicable grades` already naming the
GradeIDs the assertion will check, the measurement skeletons with one locator per value, and the coverage
supersessions — with every value reading `<REREAD>` and every digest `<FILL>`. The 2026-09-15 readings sit beside
each row as what a re-read should find, never as the value. Its guard refuses to run until each source is cached and
its digest matches, and says which ones are missing:

```
m38: nothing entered. Under D35 a value enters only from a fetched, hashed source, re-read page by page.
  - the file still holds <FILL> or <REREAD> placeholders
  - S-POLYCN-PolyLite-ABS-TDS-V5-3: not cached at .cache/sources/S-POLYCN-PolyLite-ABS-TDS-V5-3.pdf
  ...
```

## Continuing this on a machine with network access

[continuing-locally.md](continuing-locally.md) is the handoff: how to set the clone up, how a batch is
done with m38 as the worked example, what to collect for each remaining batch and from where, what is
already settled and must not be reopened, and every decision still open. Read that to carry on; the
rest of this file is the record of what has happened.

## The four batches: all landed

Four batches, each a migration of its own. B0 (m38) imported the certification backlog; B1 (m39), B2 (m40) and
B3 (m41) were done on 2026-09-17 on a machine with network access, from source documents the owner supplied and
from `npm run audit:sources` rebuilding `.cache/sources`. Next free migration id is **m42**; there is no m23.

### B0 — the certification backlog: done (m38)

`scripts/migrate/m38-certification-backlog.mjs` added 7 sources, 7 grades and 168 measurements. The guard proved
each file's digest and then, for every row, that the number it records appears on the page its Locator names, read
from the cached PDF itself - so a transcription slip or a wrong page stops the migration rather than entering the
data.

**The result.** `hdt045` this-material went from 18 back-test cases to **23 and now certifies**: the class that
could not screen a heat requirement now can. `tensileStrengthXY` this-material went from 12 to **19**, three short
of 22. Every other class gained too: density 29 to 35, tensile modulus 23 to 30 (and its misses fell from 1 above
and 3 below to 0 and 2), elongation 24 to 31, the amorphous load bracket 39 to 44, the semi-filled bracket 10 to 11.
The number of materials an estimate rules out of a template with a defended reason went from 44 to 48.

Template verdicts did not move from 291 PASS / 298 UNKNOWN, and that is expected: a second manufacturer's grade is
not the representative grade, so it publishes no headline. What it does is let the model defend a screen.

**Three things the re-read found that the 2026-09-15 reading had not recorded:**

1. The BASF sheet prints "Version No.: 4.0" and "Date / Revised: 09.05.2023" although BASF serves it at a URL
   ending `v3.5-1`. The Revision and the SourceID follow the document (D63).
2. That sheet answers its own open question: p. 2 carries a "Used for test specimens" column (DDdrop printer,
   285 °C nozzle, 110 °C bed, >= 0.6 mm nozzle, 45 mm/s), so its bars are printed.
3. Fiberon PET-CF17 states "All specimens were annealed at 120 °C for 10 h", so every value on that sheet is an
   annealed state. The wording, its declared state and the typed schedule are on every row of it.

**One published value deliberately left untranscribed.** The BASF sheet gives heat deflection and Vicat in a dry and
a conditioned state. `kindOf` gives a conditioned value its own conversion kind for the mechanical headlines, but
its HDT and Vicat branches return a literal kind with no moisture in it, so a conditioned row would be averaged
with its dry twin: 145 and 128 °C would become one observation of 136.5 °C describing neither state, and the
conflict check would then inflate its noise and discard this formulation's heat evidence altogether - the defect
C-01 fixed for annealed twins, in the moisture dimension. Teaching the model a conditioned HDT is a new conversion
kind, which needs its own decision and a back-test showing it helps (D58). So the dry thermal rows are in, the
conditioned thermal rows are not, and `npm run audit:sources` will list them. The conditioned **mechanical** rows of
pp. 4-5 are in: those the model does separate. This is the fourth owner question below.

**What the refit moved, reviewed per record.** Adding 168 observations refit the spreads, and four estimates that
were too wide on stiffness are no longer, while four became too wide on strength; one outlier flag moved from PVDF
density to PE elongation. Five stale acceptances were removed and five new findings accepted with their own
reasons in `data/review/accepted-findings.csv`. PE's is worth reading: its 208 % printed elongation is right, and
its only sibling publishes 18 %, so the two formulations genuinely differ tenfold with no peer to settle it.

**A check this exposed.** `test/database.test.js` asserted that PLA-GF and PPS-GF have no `hdt045` conflict at all,
as a proxy for "no annealed value averaged with its as-printed twin". PLA-GF now conflicts for a different and
legitimate reason: with five more amorphous sheets on record, its 15.8 °C gap between the two loads is the widest
of any amorphous filament, and the model down-weights it on purpose. The check now asserts what it means - that
every `hdt045` conflict holds one measurement, so no group mixes two states - fixed in its own commit with that
reason, as AGENTS.md requires, not weakened to make this one pass.

**Still out of B0, unchanged:** Polymaker PolyMax PC (owner question 1), Stratasys FDM Nylon-CF10 (its blended-nylon
identity must be ruled first), Flashforge PET-GF (a web page, not a document to hash - and now the single cheapest
remaining item, since its grade already exists and a case in both classes turns on one page), and the iSANMATE
PLA-GF sheet, whose value is the composition conflict, not a case.

### B1 — the last strength cases: done (m39)

`scripts/migrate/m39-second-formulations.mjs` added 7 sources, 7 grades and 129 measurements from seven technical
data sheets the owner supplied on 2026-09-17. Six were then re-fetched from the publisher's own URL and are
byte-identical to the supplied copies; the seventh, Siraya's PPA-GF sheet, the publisher serves only as a web page,
and the owner's PDF rendering was checked against the live page as well as against the file. The guard proved each
digest and then, for every row, that the number it records appears on the page its Locator names.

**The result.** `tensileStrengthXY` this-material went from 19 back-test cases to **24 and now certifies**. Both
classes this audit opened can now screen. Five materials gained a second formulation: ASA-CF M033 (3DXTECH CarbonX
CF ASA), ABS-GF M028, PPA M069 and PPA-GF M071 (Siraya Tech Fibreheart), and PPA-CF M070, which gained three at
once — Siraya Fibreheart PPA-CF, Siraya PPA-CF Core and Raise3D Industrial PPA CF. Every other class gained too:
density 35 to 40, tensile modulus 30 to 35, elongation 31 to 36, hdt045 23 to 28. Only `density` this-grade is
still short, at 0 of 22, and nothing in this batch could reach it.

**Three rulings, each argued in the migration header and open to revision:**

1. **PPA-CF Core is filed under M070.** Its own Material Specifications table names the base material
   Polyphthalamide and the product is carbon-fibre reinforced; core-shell is a filament construction, not a
   material class (D57).
2. **"Method A/B" with no load.** The ABS-GF and PPA sheets print the method and not the load. Their three sister
   sheets print "Method A @ 1.80 MPa" and "Method B 0.45 MPa" explicitly, and both ISO 75 and ASTM D648 define A as
   the high load and B as the low, so Test load MPa is typed from the method and each of the six rows carries a
   Parse review saying exactly that. Owner's decision, 2026-09-17.
3. **The ABS-GF sheet disagrees with itself.** Its p. 1 summary chart shows a tensile strength of 44 MPa, its p. 2
   Property Data table 46.5 MPa. The table is the detailed statement and carries the standard and the direction, so
   46.5 is recorded and the chart's 44 is in that row's Notes. Owner's decision, 2026-09-17. The four sister
   sheets' charts agree with their tables, so this is a one-off.

**What the refit moved, reviewed per record.** Two outlier flags and three wide estimates appeared, and each was
checked against its own source before it was accepted, not accepted because it was expected:

- **PVDF density.** 1.71 g/cc, re-read from the 3DXTECH sheet. It is right: PVDF is a fluoropolymer, and the model
  predicts about 1.21 g/cc because every other polymer it fits is a hydrocarbon.
- **PPA-CF hdt045.** Bambu Lab publishes 227 °C at 0.45 MPa *unannealed*; the cached sheet was re-read and prints
  196 °C at 1.8 MPa and 227 °C at 0.45 MPa. The three new formulations publish 84.5 °C and 97 °C unannealed and
  188-199 °C annealed. Every transcription is confirmed, so four manufacturers genuinely disagree, and Bambu's
  unannealed value sits above the others' annealed ones. A sheet stating crystallinity or chamber temperature would
  settle it; a model branch would not (D58).
- **PA66, PA66-CF and POM hdt045.** Each is wide for a reason that is in the data: PA66's only 0.45 MPa observation
  is on a moulded DuPont / Celanese reference and it has no procurement grade at all; PA66-CF has no grade and no
  measurement of any kind; POM's only 0.45 MPa value is DuPont's moulded Delrin reference, its three filament
  grades publishing the 1.8 MPa load alone.

**Left out by decision.** The 3DXTECH surface resistance (>10^9 ohm/sq): no `properties.csv` row covers surface
resistivity, and adding one for a single observation would give the estimate model a covariate nothing has
back-tested (D58). Biocompatibility ("Not Tested", "Not certified") is a statement about testing, not a property.

### B2 — the safety data sheets: first batch done (m40)

`scripts/migrate/m40-safety-data-sheets.mjs` added the `Manufacturer SDS` source class, 6 sources, the declared
composition of 6 of the 7 grades m39 filed, and 19 evidence records. Every sheet was fetched from the publisher's
own URL on 2026-09-17, cached and hashed. Fibreheart PPA has no safety data sheet on Siraya's page, so it keeps its
TDS composition.

Siraya serves a later revision of its four sheets than the copies the owner supplied — the product-title wording
differs. The owner's decision, 2026-09-17, is that the currently-served file is the source of record, so the
recorded digests are what siraya.tech serves and `npm run audit:sources` will keep re-verifying them.

**Composition is now declared, with CAS numbers and loadings**, for CarbonX CF ASA (ASA resin > 85 %, carbon fibre
< 15 %), Fibreheart ABS-GF (ABS 78-82 %, glass fibre 18-22 %), Fibreheart PPA-CF (PPA 80-85 %, carbon fibre
15-20 %), Fibreheart PPA-CF Core (PPA 70-80 %, carbon fibre 20-25 %), Fibreheart PPA-GF (PPA 80-85 %, glass fibre
15-20 %) and Raise3D Industrial PPA CF (PPA > 80 %, chopped carbon 10-30 %). Two of these confirm the TDS:
Raise3D's stated 15 wt.% and Siraya's stated 15 % both fall inside the SDS range.

**A source-quality finding, and what was left out because of it.** Sections 5, 7, 10, 12 and 13 of the four Siraya
sheets are word-for-word identical, although the four products are three polymers with two different fibres, and
two of those shared statements are wrong for the products carrying them: 10.4 "Avoid temperatures above 240 ºC"
appears on three sheets whose own TDSs specify a 300-320 °C nozzle, and 5.3 and 10.6 name acetic acid among the
decomposition products of all four, which is the signature of a vinyl-acetate or cellulose-acetate polymer and not
of ABS or a polyphthalamide. So the composition, which differs on every sheet, is recorded together with the
handling, storage and disposal statements, which are generic but true of any filament; the burning chemistry and
the "conditions to avoid" of those four sheets are left out as publisher boilerplate, with that reason on record. A
grade-level record saying a material must stay below its own printing temperature would be read as a design limit,
and it is not one. The 3DXTECH and Raise3D sheets are not templated this way — 3DXTECH names hydrogen cyanide,
which is what an acrylonitrile polymer does produce — so their flammability and stability statements are recorded.

**Not resolved.** C00003, the register's only open composition conflict, asks for a declaration from iSANMATE about
G019-02 PLA Glass Fiber. Its SDS is not among these six, so the conflict stands and the 15-grade batch 1 of
`ledgers/sds-targets.csv` is still to do.

### B3 — the comparability repair: done (m41)

`npm run audit:sources` rebuilt `.cache/sources` on 2026-09-17, reading 145 of 147 documents, so all twelve sources
of the open comparability rows could be re-read page by page rather than taken from an earlier reading (D35). The
two served from a FormFutura download URL that is not a `.pdf` were fetched by hand and both hash-matched their
recorded digests.

**The re-read result: none of the twelve publishes a specimen preparation.** No specimen table, no
print-orientation heading, no moulding statement, no direction label. What several print is a Basic Printing
Recommendations or Print Settings block, which is a printing guide and not a specimen condition (D63, as m33 ruled
for the four iSANMATE sheets). Two of them — 3DXTECH's 3DXSTAT ESD PA12 and THERMAX PES — come from a publisher
whose CarbonX sheets *do* carry a "Printed Specimen Conditions" block, which makes its absence here informative
rather than a gap in the reading.

So no specimen was recoded. The 26 rows stay "Not published (do not assume printed)", which is what the sources
support, and the twelve SourceIDs are in the `RULED` map of `ledgers/comparability-targets.mjs` with that reason, so
the ledger now reports **0 rows on 0 sources to re-read**. Turning these into implied lower bounds needs the
publishers to state a specimen; another read cannot do it.

**The first carried-over finding is applied.** V002155, V002156 and V002159 are the equilibrium water absorption of
three Polymaker PolyMide sheets, and each carried its sheet's annealing sentence as its Post-processing. Re-read
here, all three sheets print the water-absorption value on p. 2, in a physical and chemical property table that
states no specimen treatment at all; the annealing sentence is on p. 4 under the mechanical table. Post-processing
is now `Not published` and the typed schedule `Not applicable`, which is what p. 2 supports.

**The second was already applied, and a new finding takes its place.** `sources.csv` already holds the Kimya PEBA-S
record at its 2026/09 URL with digest `66c7b5b1…9ce3` and Access status `Retrieved`, from an earlier commit on this
branch. But the 2026-09-17 refetch found that URL now serving a **different** file, SHA-256 `f55f2167…`, so
samaro.fr has republished it since 2026-09-15. Re-pointing the record would mean re-reading every value it backs,
and D-07 has already ruled that its rows stay unstated, so m41 does not touch it. **Owner's call, question 8 below.**

### Not proposed

Rewriting the 84 identical Comparability findings. They are terminal prose no check reads, replacing them needs
distinct per-material wording to avoid `COVERAGE-DUPLICATE`, and it changes nothing a reader can select on.

## Verification

The ledgers and the scaffold moved no data: for that commit `npm run build:diff` reported `0 difference(s)`. B0
moves data on purpose, and its effect is in `git diff build/snapshot` - the `Screens` column of `screening.csv` and
the certified `hdt045` this-material row are what to look at. `npm run verify` passes: the schema gate, the lint
with no new finding and no stale acceptance, the generated docs, 238 tests, the data audit, the review snapshot, 59
interface views and 300 fuzz scenarios agreeing with the engine.

**B1, B2 and B3 (m39, m40, m41).** `npm run verify` passes on the three together: canonical format, the schema gate
over 7,000 rows, the lint with 41 findings all accepted and none stale, the generated docs, 238 tests, the data
audit with no unreviewed finding, the review snapshot, 59 interface views and 300 fuzz scenarios agreeing with the
engine. `npm run build:diff` reports 1,043 differences, all in the paths these batches meant to move: the measurement
count, the refit estimate spreads, the screening ends of `hdt045` and `tensileStrengthXY`, and the load brackets. No
template verdict flipped. The record-level changelogs are `m39-changelog.csv` and `m40-m41-changelog.csv` beside
this file; the six grade composition updates of m40 do not appear separately in the second, because those grades did
not exist at HEAD and fold into m39's Added rows.

`build/reports/validation-report.md`, the one unrelated defect `continuing-locally.md` recorded, is regenerated here
and current with the data, so the stale committed figure is gone.

## Questions for the owner

1. **PolyMax PC.** Take it as well as PolyLite PC for M035, or leave it? It is a second Polymaker sheet for one
   material, and its 14.8 °C gap between the two loads would be a miss against the amorphous bracket.
2. **A recycled-fibre variant.** Fiberon PETG-rCF08 is recycled carbon fibre and `schema/vocab/grade-variants.csv`
   has no value for it. It is recorded in `Composition / filler` with `Variant` not applicable, because inventing a
   variant class would give the estimate model a covariate nothing has back-tested. Add the class, or leave it said
   in prose?
3. ~~The SDS source class~~ — **decided 2026-09-17: `Manufacturer SDS`.** It is not yet in
   `schema/vocab/source-classes.csv`: a new vocabulary value belongs in the same commit as the first
   data that uses it (AGENTS.md), so it lands with the first SDS batch, with `npm run docs:dictionary`.
   ~~And `Decomposition temperature` as a property~~ — **decided: not added.** Four of the seven sheets
   publish one (ABS > 380 °C, PC > 360 °C, PET-CF17 434.0 °C, PETG-rCF08 432.6 °C); they stay
   untranscribed by decision, and audit:sources will list them.
4. **A conditioned heat deflection.** The BASF sheet's conditioned HDT and Vicat values are left out, because the
   model would average them with their dry twins (see B0). Teaching it a conditioned HDT kind needs a decision and
   a back-test (D58). Worth doing, or should those values stay out with the reason on record?
5. ~~The 2026-09-15 re-read verdicts~~ — **moot.** B3 re-read all twelve sources page by page from the cached
   documents, so the question of whether a digest check alone would do never had to be answered.
6. ~~The SDS revision to treat as the source of record~~ — **decided 2026-09-17: the currently-served file.** Siraya
   serves a later revision of its four sheets than the copies supplied; the served file is what m40 records, so
   `audit:sources` re-verifies it.
7. ~~HDT printed as "Method A/B" with no load~~ — **decided 2026-09-17: type the load from the method**, with the
   reasoning in each row's Parse review (see B1, ruling 2).
8. **Kimya PEBA-S has moved again.** `sources.csv` records digest `66c7b5b1…9ce3` at the 2026/09 samaro.fr URL, and
   that URL now serves a different file, `f55f2167…`. m41 did not re-point it: doing so means re-reading every value
   it backs, and D-07 already ruled its rows stay unstated. Leave the record at the document that was read, re-point
   it and re-read, or mark the source as no longer retrievable at that URL?
9. **The four Siraya safety data sheets are templated.** Their sections 5, 7, 10, 12 and 13 are identical across
   three polymers, and two of those statements are wrong for the products carrying them (see B2). m40 recorded the
   composition and the generic handling statements and left the burning chemistry and the 240 °C limit out. Is that
   the right line, or should the boilerplate be recorded as published and flagged instead?
10. **Grades coverage rows for M028, M033 and M070.** None of the three has a `Grades` row in `coverage.csv`, so m39
   superseded rows only for M069 and M071. Their manufacturer counts are now 2, 2 and 4. Add the missing rows, or
   leave coverage silent where it has always been silent?
