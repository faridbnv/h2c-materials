# Where the database is thin, and what would change that

**Date:** 2026-09-17 · **Scope:** the tables as read before the first batch of work · **Data status:** a reading, not a change

> The first batch has since landed. `hdt045` this-material now holds 23 back-test cases and certifies, and
> `tensileStrengthXY` 19 of 22; the counts below are the ones that prompted the work, not today's. Re-run
> [`ledgers/gap-census.mjs`](ledgers/gap-census.mjs) for the current figures and read [RESPONSE.md](RESPONSE.md)
> for what moved.

Every count below is written by [`ledgers/gap-census.mjs`](ledgers/gap-census.mjs) into
[`ledgers/gap-census.csv`](ledgers/gap-census.csv), or read from `build/snapshot/`. Re-run it and the report can be
checked line by line; when the data moves, the numbers move with it.

## The result in one line

Across the six application templates the build decides 291 material verdicts and leaves **298 UNKNOWN**. The tool
cannot answer half of what it offers to answer, and the reason is not one missing column.

## 1. The gap that is cheapest to close is not a missing cell

An estimate may screen a material out only where the build's own back-test has shown the class can (D48, D59). Each
end of a screening range is a distribution-free tolerance limit, and setting one at all takes **22 honest cases** at
`maxWrongRate 0.1` and `confidence 0.9` (`build/src/estimate/screening.js`, `minimumCases`). Today:

| Class | Cases | Certified |
|---|---|---|
| `density` this-material | 29 | yes |
| `elongationXY` this-material | 24 | yes |
| `tensileModulusXY` this-material | 23 | yes |
| **`hdt045` this-material** | **18** | **no** |
| **`tensileStrengthXY` this-material** | **12** | **no** |

Nine of the 34 ends in `build/snapshot/screening.csv` cannot screen.

A case is not a new material. It is a **second formulation of a material whose headline is already measured**,
publishing a related kind — for strength any tensile endpoint or a flexural strength in any direction; for heat
deflection an HDT at any load, a Vicat, a Tg on an amorphous matrix or a Tm on a filled semicrystalline one
(`build/src/estimate/observations.js`, `kindOf`). [`ledgers/certification-cases.mjs`](ledgers/certification-cases.mjs)
reproduces the back-test's own membership and refuses to write its CSV if the counts disagree with the snapshot.

**Of the 42 materials with a measured strength headline and no second formulation, and the 41 in the same position
for heat deflection, all but three are single-product entries.** The exceptions matter: **M068 PET-GF** already holds
a second grade (Flashforge, G068-01) that publishes neither an HDT nor a strength, so re-reading one page would add a
case in both classes with no new grade and no new source. **M019 PLA-GF** holds a second grade whose sheet has no
thermal row at all.

## 2. Eight data sheets were fetched, read and never imported

`docs/audits/2026-09-15-filtering-estimates-data/sources/open-items.md` §3 lists ten candidate documents with their
URLs, SHA-256 prefixes and quoted values, fetched on 2026-09-15 and left out of the data. Eight are still worth
importing; [`ledgers/import-backlog.csv`](ledgers/import-backlog.csv) says what each is worth against today's tables.
Together they take heat deflection to **26 cases** — enough to certify — and strength to **20**, two short. Two are
held back on purpose: Polymaker PolyMax PC is an alternative to PolyLite PC rather than a second grade beside it and
its 14.8 °C load gap would be a bracket miss, and Stratasys FDM Nylon-CF10 cannot be filed until its "blended nylon"
identity is ruled between M050 and M053.

Nothing needs to be found. It needs fetching, hashing and re-reading.

## 3. The topics a data sheet never covers

Seven properties are registered and almost never published. The count is materials with any value at all, of 103:

| Property | Materials |
|---|---|
| Coefficient of thermal expansion | 1 |
| Compression strength | 1 |
| Interlayer adhesion strength | 1 |
| Moisture content | 1 |
| Continuous service temperature | 3 |
| Fatigue life | 4 |
| Thermal conductivity | 8 |

`docs/background/gaps-and-conflicts.md` §6 reached the same list in September and called it right: *"structural gaps
that no amount of document recovery will close"*. Its remedy stands — screen by application first, cut to ten or
twenty candidates, commission testing only on the survivors.

The same hole runs through the printing profiles. Of 172, **0** state a volumetric limit, **0** a stringing
behaviour, **0** a difficulty rating, **1** a warping note, **1** a layer-adhesion note, **6** a failure mode —
against 136 that state a nozzle temperature. The schema is ready for the field a reader actually chooses on; no
source in the register publishes it.

## 4. What is recorded is often not comparable

Of 2,193 live measurements, **1,456** do not state a moisture condition, **1,287** no post-processing, **727** no
specimen form, **286** no direction, **2,089** no test temperature. **85 of 103 materials** carry a coverage row
saying so.

That row is hand-written workbook prose. No build check reads it, and repairing the records will not change it. What
a repair does change is one thing: an implied lower bound comes only from a printed specimen (D55,
`build/src/compile.js`), and a bound vetoes a screen and lifts an estimate's floor.
[`ledgers/comparability-targets.mjs`](ledgers/comparability-targets.mjs) finds **54 rows across 21 materials** that
pass every other bound filter and fail only on specimen form — and marks **28 of them as already ruled on** by m20,
m33/D63, the 2026-09-15 re-reads or the owner's D-07. That leaves **26 rows on 12 sources**. The repair pass is a
day's work on a dozen documents, not a sweep of 727 rows.

## 5. The register is one kind of document from five publishers

280 sources, 70 publishers, 268 with a recorded digest and only two failed fetches: the provenance is in good order.
The concentration is not.

- **2,061 of 2,193** measurement rows come from a manufacturer TDS; **42** from peer-reviewed research; **26** from a
  resin supplier sheet.
- **846** rows are published by Bambu Lab alone; the top five publishers account for 1,692.
- **245 of 280** sources carry no publication date, so the currency of most of the corpus is unknown.
- **0 of 280** are safety data sheets, although `data/tables/method.csv` [Evidence / Priority] ranks
  "Manufacturer TDS/SDS for exact grades" second among admissible evidence.

That last line is the cheapest unclaimed evidence in the project. An SDS publishes what a TDS does not: the
ingredient disclosure with its CAS numbers, the filler and its loading, thermal decomposition and stability, and the
handling statements. C00003 — the register's only open composition conflict, glass fibre in one heading and carbon
fibre in the description of the same iSANMATE sheet — asks in its own words for *"a composition declaration from
iSANMATE"*. That document is an SDS. [`ledgers/sds-targets.csv`](ledgers/sds-targets.csv) ranks all 143 active
procurement grades; 15 are priority 1 to 3.

## 6. Where the materials are thinnest

Seven materials have no measurement at all — **M044 TPE, M047 PA, M056 PA66-CF, M060 PA612-GF, M061 CoPA,
M062 PA-CF, M063 PA-GF** — and six of the seven are nylons. Three of them are an officially listed family, printable
today and invisible to the selector. 25 materials have no evidence record, 56 no price row, and **60 of 94**
materials with a procurement grade rest on a single manufacturer.

The nylons are not a retrieval problem any more. The 2026-09-13 estimate-evidence work recorded that searches for a
printed PA66, PA66-CF, unfilled PA612 or PA612-GF filament data sheet found none, and M056 and M060 carry an accepted
`NO-MEASUREMENTS` finding saying so. What is left for them is a written manufacturer request, or buying the filament
and testing it.

## 7. What this suggests

Three different problems wear the same word.

1. **Targeting.** The screening classes are twelve named documents from certification, and eight of them are already
   fetched. This is the cheapest work in the project and it changes what the tool can decide.
2. **Re-reading.** Comparability is 26 rows on 12 documents the register already holds. No new source at all.
3. **Source class.** The Tier 3 properties, the printability fields and the long-term mechanical behaviour are
   absent because the one kind of document the register admits does not print them. Closing them means either the
   owner's own test campaign, already the roadmap's stage 5, or admitting a source class below a first-party
   document — which is a vocabulary row and a decision, not a search.

The safety data sheets sit across the first two: they need no new policy, they are published by the same firms whose
sheets are already on file, and they answer the one conflict the register has been unable to close.

## What was done about it

Nothing was fetched from this session: its environment denies outbound access to every manufacturer host, and
`.cache/sources/` is gitignored, so no source could be re-read, and under D35 nothing may be entered without one.
The owner then supplied the seven data sheets of the first batch directly. They were cached, hashed against the
digests the 2026-09-15 workstream recorded, and re-read page by page. What that changed, what it found that the
earlier reading had missed, and what is still waiting on source access are in [RESPONSE.md](RESPONSE.md).
