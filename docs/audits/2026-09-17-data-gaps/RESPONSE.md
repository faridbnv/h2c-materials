# Acting on the 2026-09-17 gap reading

[REPORT.md](REPORT.md) finds three different problems: a targeting problem (the screening classes are a dozen named
documents from certification), a re-reading problem (comparability is 26 rows on 12 documents already on file), and a
source-class problem (the properties no data sheet prints). This is what was done about the first two, and what is
waiting on source access.

## What is blocked, and why

Every step needs a source fetched, hashed and re-read: under D35 nothing enters from a report, a summary or an
earlier audit's reading, however carefully it was taken. This session could not fetch any of them. Its environment's
egress policy answers 403 to every manufacturer host — `polymaker.com`, `cdn.polymaker.com.cn`, `forward-am.com`,
`store.bblcdn.com`, `ca.store.bambulab.com`, `3dxtech.com`, `help.prusa3d.com`, `spectrumfilaments.com`,
`isanmate.com`, `flashforge.com`, `stratasys.com`, `pmc.ncbi.nlm.nih.gov`, `web.archive.org` — and `.cache/sources/`
is gitignored, so the 131 hashed PDFs of earlier rounds are not in this checkout either.

The owner's ruling was to prepare the work and leave the fetching until access exists. So everything below is either
**done** (a ledger, a scaffold, a target list: no value enters the tables) or **deferred** with enough detail that it
is filling in a form rather than starting again.

To unblock it: locally there is nothing to do, the cache is already there. In a remote session, allow those hosts in
the environment's network policy (https://code.claude.com/docs/en/claude-code-on-the-web), then `npm run
audit:sources` rebuilds `.cache/sources/` and hash-checks every cited PDF.

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

### B0 — the certification backlog (m38, written)

Fetch the eight sheets, confirm each digest against the prefix in `ledgers/import-backlog.csv` with
`docs/audits/2026-09-15-filtering-estimates-data/sources/extract-text.mjs`, then fill the skeleton from the pages
themselves. Expected afterwards: `hdt045` this-material reaches 26 cases and certifies if no more than the allowed
misses appear; `tensileStrengthXY` reaches 20 and still cannot screen. Two bracket misses are expected and are
evidence, not a reason to leave a sheet out: Fiberon PET-CF17's 42.5 °C gap and Ultrafuse PAHT CF15's 53 °C dry gap
both sit above the semi-filled limit.

One question the sheet must answer: whether the PAHT CF15 bars on p. 3 and p. 4 are printed. Until it says so the
specimen stays unstated, which still gives the back-test its case but bounds nothing.

### B1 — the last strength cases (m39)

Two more after B0. `ledgers/strength-targets.csv` ranks the 42 candidates by status and by how many template verdicts
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

This change moves no data. `npm run build:diff` reports `0 difference(s)`, `npm run verify` passes unchanged, the
ledger scripts re-run to identical CSVs, and `node scripts/migrate/m38-certification-backlog.mjs` exits 1 with its
named refusal.

Each deferred batch ends with `npm run verify`, then `npm run snapshot` and a reading of `git diff build/snapshot` —
the `Screens` column of `screening.csv` and the verdicts in `templates.csv` are the movement to look for — with
`npm run build:diff` naming only the intended paths and `npm run data:diff` in the commit message.

## Questions for the owner

1. **PolyMax PC.** Take it as well as PolyLite PC for M035, or leave it? It is a second Polymaker sheet for one
   material, and its 14.8 °C load gap would be a miss against the amorphous bracket.
2. **A recycled-fibre variant.** Fiberon PETG-rCF08 is recycled carbon fibre and `schema/vocab/grade-variants.csv`
   has no value for it. Add one, or say it in `Composition / filler` and leave `Variant` not applicable?
3. **The SDS source class.** What should it be called, and should `Decomposition temperature` join
   `properties.csv` as a thermal property? Adding it needs no code, and it would also give a home to the TGA values
   already listed as untranscribed in `docs/audits/2026-09-14-transfer-verification/source-completeness.csv`.
4. **The 2026-09-15 re-read verdicts.** May they be applied after a digest check alone, or does each want a fresh
   page read? D35 can be read either way, and it decides how much of B3 is already done.
