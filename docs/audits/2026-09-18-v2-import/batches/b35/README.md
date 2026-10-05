# Batch b35: the owner's answers to what b34 left

> **Historical record** (2026-09-18): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../../README.md) and [OPEN-PROBLEMS](../../../../../docs/OPEN-PROBLEMS.md).

Applied 2026-09-25 by `m145-batch-b35`: 2 documents, 2 products, 15 records (10 measurements, 1 profile, 2 sources,
2 grades). The owner answered the three identity questions batch b34 left in OPEN-PROBLEMS §14, and confirmed a
fourth; each answer is a ruling signed "owner" (R199 to R202, and R193 amended). m144 made the one new material, SBC.

**Who reviewed.** Every row was read by an agent, named as the reviewer: `claude-opus-5.5 (agent reviewer)`, in
[review.mjs](review.mjs). None of the three sheets is an optical reading: the inventory called purefil's TPV sheet a
"Scanned TDS; text not readable", but the PDF carries its own text layer, which the reader read (its "ti" ligature
drawn as "+").

**How it ran.** `--reopen-gap "identity: owner ruling pending"` (the three sheets), `--holds`, the three proposed by key
(`ingest:propose --doc`; `--holds` released the TPV sheet, which nothing held once its ruling existed), review,
`--split` (QIDI S-White aside, for QIDI's bilingual layout), `ingest:apply --dry-run`, the migration, `--holds`, the
deferral, `--finish`.

| Sheet | Ruling | Outcome |
|---|---|---|
| FormFutura Crystal Flex | R199, R200: a new in-scope SBC (M174) under Styrenics, not estimated | applied as G174-01: density, melt flow, moisture absorption, yield strength (the reader called it unspecified; the line says "@ Yield"), elongation at break, flexural strength and modulus, Shore D 63, and its nozzle window. Heat deflection applies to SBC: hdt045 names Styrenics |
| purefil TPV (listed as "TPS 40D", 0d7409be7fc659cf) | R201: TPE, polymer not stated (M167) | applied as G167-13, "Thermoplastic vulcanizate (TPV)": density and tensile modulus; the prose density repeating the table's, and a profile with every cell unread, rejected |
| QIDI S-White | R202: Support for ABS (M079) | not applied, deferred "QIDI bilingual columns": the reader read no profile, so the seven suitable materials the sheet lists (a support's pairing, which the data model holds on its profile) have no row, and it read the water absorption "Method 1 0.4 %" as 1 ± 0.4 %. Density and melting point were read correctly |
| 3D4Makers PI Z2 | R193, confirmed by the owner: TPI (M121) | not proposed; still deferred for its layout |

The record of what the batch changed is [changelog.csv](changelog.csv) and [build-diff.txt](build-diff.txt).
