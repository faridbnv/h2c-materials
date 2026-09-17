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

## Deferred: no source access

Four batches, each a migration of its own and a section added here when it lands. Next free migration id is m38;
there is no m23.

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

### B1 — the last three strength cases (m39)

Three more after B0. `ledgers/strength-targets.csv` ranks the 42 candidates by status and by how many template verdicts
the material is still UNKNOWN in, and names the publishers this register already holds a grade from for the same
family. The head of the list is **M040 TPU for AMS** (UNKNOWN in six template verdicts, and carrying an accepted
`EST-WIDE` finding for stiffness, so a second TPU formulation pays twice) and **M043 TPU 85A**. Start with **M068
PET-GF** in B0: its second grade exists already, so a page re-read is the whole cost.

### B2 — the safety data sheets (m40, then one migration per publisher)

Batch 1 is the 15 grades at priority 1 to 3 in `ledgers/sds-targets.csv`, led by **G019-02 iSANMATE PLA Glass
Fiber**, whose SDS §3 is what C00003 asks for. Where each fact lands under the current schema:

| Fact | Home |
|---|---|
| Composition, CAS, loading | `grades.Composition / filler`, in the sheet's words, naming the SDS in the cell (m26, m35, m37 are the precedents) |
| UL 94 and certificate claims | `grades.Certification claims` |
| Burning behaviour | `evidence.csv`, Domain `Flammability`, Topic `Flammability`, type `Manufacturer statement` |
| Ventilation, handling, stability | `evidence.csv`, Domain `Safety`, Topic `Processing ventilation` or `Chemical stability` |
| Disposal, food contact, moisture | Domain `Circularity`, `Certification` or `Environmental`, existing topics |
| C00003 | a new `coverage.csv` row `Composition` / `Resolved`, and C00003 set `Superseded` with a Finding opening "Superseded by C#####" |

One schema change is needed and belongs in the same commit as the first data that uses it (AGENTS.md): a value for
safety data sheets in `schema/vocab/source-classes.csv`, then `npm run docs:dictionary`. Nothing pins that list in
code or tests. A cited composition *evidence* domain would be a larger change and is not proposed.

### B3 — the comparability repair (m41)

`ledgers/comparability-targets.csv`, open rows only: 26 rows on 12 sources, headed by `S-PET-TDS` (M066, 5 rows),
`S-SPECTRUM-en-tds-spectrum-pctg-cf10` and `S-CPECF` (M090, 7 between them), `S-SPECTRUM-en-tds-spectrum-petg-esd`
(M026) and `R-FORMFUTURA-STYX-PA6-TDS` (M049). Two of them are served from a URL that is not a `.pdf`, so
`audit:sources` will not cache them and they are fetched by hand.

Use `correct()` from `scripts/migrate/source-edits.mjs`, one `set` tuple per field with a page-citing note. Recode a
specimen **only together with its direction from the same page**, or the lint load moves rather than falls. Leave
`Parse review` at `Not applicable`: specimen, moisture and direction are vocabulary columns with no parser. Touching
`Post-processing` is different — the wording goes into `schema/vocab/post-processing.csv` with its State in the same
commit, and `Anneal °C` / `Anneal h` must match what the parser reads or `PARSE-MISMATCH` stops the build.

Do not reopen what has been settled: the 34 sources in the 2026-09-15 `rereads.csv`, the 17 sheets m20 corrected, the
four iSANMATE sheets m33 established publish no specimen preparation, and `R-KIMYA-PEBA-S-TDS`, which the owner ruled
stays unstated (D-07). The ledger marks each of them and why.

Two findings from 2026-09-15 were recorded and never applied, and belong here once re-confirmed against the file:
V002155, V002156 and V002159 should read `Post-processing: Not published` (the annealing sentence is under the
mechanical table, not beside the water-absorption rows), and the Kimya PEBA-S source record should move to the
2026/09 URL with digest `66c7b5b1…9ce3` and Access status `Retrieved` — the record only; its rows stay unstated.

### Not proposed

Rewriting the 84 identical Comparability findings. They are terminal prose no check reads, replacing them needs
distinct per-material wording to avoid `COVERAGE-DUPLICATE`, and it changes nothing a reader can select on.

## Verification

The ledgers and the scaffold moved no data: for that commit `npm run build:diff` reported `0 difference(s)`. B0
moves data on purpose, and its effect is in `git diff build/snapshot` - the `Screens` column of `screening.csv` and
the certified `hdt045` this-material row are what to look at. `npm run verify` passes: the schema gate, the lint
with no new finding and no stale acceptance, the generated docs, 238 tests, the data audit, the review snapshot, 59
interface views and 300 fuzz scenarios agreeing with the engine.

Each deferred batch ends with `npm run verify`, then `npm run snapshot` and a reading of `git diff build/snapshot` —
the `Screens` column of `screening.csv` and the verdicts in `templates.csv` are the movement to look for — with
`npm run build:diff` naming only the intended paths and `npm run data:diff` in the commit message.

## Questions for the owner

1. **PolyMax PC.** Take it as well as PolyLite PC for M035, or leave it? It is a second Polymaker sheet for one
   material, and its 14.8 °C gap between the two loads would be a miss against the amorphous bracket.
2. **A recycled-fibre variant.** Fiberon PETG-rCF08 is recycled carbon fibre and `schema/vocab/grade-variants.csv`
   has no value for it. It is recorded in `Composition / filler` with `Variant` not applicable, because inventing a
   variant class would give the estimate model a covariate nothing has back-tested. Add the class, or leave it said
   in prose?
3. **The SDS source class.** What should it be called, and should `Decomposition temperature` join
   `properties.csv` as a thermal property? Adding it needs no code, and three of the seven sheets just read publish
   one (ABS > 380 °C, PC > 360 °C, PET-CF17 434.0 °C, PETG-rCF08 432.6 °C), so it would stop being untranscribed.
4. **A conditioned heat deflection.** The BASF sheet's conditioned HDT and Vicat values are left out, because the
   model would average them with their dry twins (see B0). Teaching it a conditioned HDT kind needs a decision and
   a back-test (D58). Worth doing, or should those values stay out with the reason on record?
5. **The 2026-09-15 re-read verdicts.** May they be applied after a digest check alone, or does each want a fresh
   page read? D35 can be read either way, and it decides how much of B3 is already done.
