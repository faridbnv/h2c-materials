# Batch b37: two held sheets the makers' own pages identify

> **Historical record** (2026-09-18): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../../README.md) and [OPEN-PROBLEMS](../../../../../docs/OPEN-PROBLEMS.md).

Applied 2026-09-27 by `m207-batch-b37`: 2 documents, 2 products, 20 records (15 measurements, 1 profile, 2 sources,
2 grades). Imports are paused (GOALS). On 2026-09-27 the owner lifted the pause for these two sheets alone. The
research package of 2026-09-26 had found the makers' pages that name each sheet's polymer; the pages were staged into
the ledger as witnesses (`ingest:witness --from`).

**Who reviewed.** An agent read every row and is named as the reviewer: `claude-opus-5.5 (agent reviewer)`, in
[review.mjs](review.mjs). Neither sheet is an optical reading.

**How it ran.**
1. The two rulings were written (R203, R204, signed "owner").
2. Eel's ledger row was corrected: it had been listed as "NinjaFlex Edge", and its URL and its page are Eel's.
3. `--reopen` by key, then `--holds`.
4. `ingest:propose --doc` for each sheet.
5. Review, then `--split`.
6. `ingest:apply --dry-run`. It refused twice, and both refusals were fixed before the migration:
   - **Timberfill's title.** The reader had taken a lone "®" for it. The reviewer wrote the heading the page prints.
   - **Eel's two moduli** fell outside the elastomer window. They were accepted with the reason: a Shore 60D TPU.
7. The migration, then `--finish`.

| Sheet | Ruling | Outcome |
|---|---|---|
| Fillamentum Timberfill (0bc016140a8e4346) | R203: PLA Wood (M014). The MAG #3 page: "a blend of biopolymers (mostly PLA) with the addition of 15% natural wood fibers". | Applied as G014-21: density, melt volume rate, tensile strength and modulus, elongation, unnotched Charpy, Shore D 77, melting range, and heat deflection 48 °C at 0.45 MPa ("ISO 75 method B"). Profile: nozzle 150–170 °C, and bed 50–60 °C from the "Hot pad" row, which the reader missed. |
| NinjaTek Eel (0cb49f29e7b9ac7f) | R204: TPU-EC (M157). Eel's page: "Eel™ TPU ... conductive, static dissipative and flexible". A conductive TPU is filed by its load, as Recreus Conductive Filaflex is; D86's hardness classes are for unfilled TPU. | Applied as G157-02. The sheet prints "Dry / COND" columns, and the reader had taken the conditioned column as unstated. Each value is now recorded with the column it stands in: the dry tensile modulus 305 MPa, yield stress 18 MPa and strain at break > 50 %; the conditioned flexural modulus, stress at break and Shore D 60, which the sheet prints only conditioned. |
| Multi3D Electrifi (2688570615b2eb82) | none | Still deferred. Its safety data sheet names "biodegradable polyester", and no material holds a polyester filament. The ledger note says so. |

The record of what the batch changed is [changelog.csv](changelog.csv) and [build-diff.txt](build-diff.txt). Decision
diff: 0 answers moved. PLA Wood and TPU-EC each have one more product, untested in the templates where they are
candidates.
