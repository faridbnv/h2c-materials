# Batch b29: iSANMATE's current sheets

Applied 2026-09-21 by `m112-batch-b29`: 19 documents, 178 records — 1 material (PCL), 18 grades, 19 sources, 130
measurements, 6 print profiles. Of iSANMATE's 38 documents, 33 are applied, 3 are revisions its download page no
longer lists (dated `unreachable`), 1 is the same bytes as another, and 1 waits as a twin.

## How the documents arrived

iSANMATE's library disallows fetching tools (R084). The owner saved the 35 files its TDS download page lists into
`_temp iSANMATE/`, and `ingest:fetch --stage "_temp iSANMATE" --provider iSANMATE` matched them by file name:

| Files | What happened |
|---:|---|
| 17 | staged against their rows |
| 14 | the same bytes as documents already applied; reported, nothing staged |
| 2 | `ASA_TDS.pdf` and `PA12_CF-TDS.pdf` each name two revision rows; staged with `--doc` against the one the page lists (2026/05 and 2024/09), the other dated `unreachable` |
| 1 | `PDS_TDS.pdf`, which the inventory never listed: a row of its own (`--create`) |
| 1 | a browser's second download of `ABS-GF_TDS.pdf` |

`2023/03/CF-PC_TDS.pdf` has no file and is no longer listed: `unreachable`, dated.

## Parity, and why the batch went ahead below the gate

The rule is parity before novelty: a maker's layout is proved on the sheets somebody transcribed before any sheet
nobody has. iSANMATE's 14 transcribed sheets read 58 of 142 values before this batch and **86 of 142 (61 %)** after
it. The gate exists so that a document is not applied half-read, because an applied document is not read again;
so completeness was measured on the 19 new sheets directly, and the reader takes about 150 values from them against
roughly 125 labelled lines that state a number. What the census still misses is layouts the current sheets do not
use: a PEI sheet with three orientation columns (20 of the 56 misses), two-page tables, and values printed after a
bare "ISO", which cannot be told from a standard's own number.

The reader rules that did it, each with a fixture test and the census run before and after (no maker down):

- **A unit column between the label and the method**: "Tensile Strength MPa ASTM D-638 51", "Density g/cm3
  ASTM D-792 1.10-1.13", "Melting point ℃ DSC 180-200"; a Vicat method ("A/120") or a test condition in brackets
  may stand before the unit, and an axis in brackets after the label ("Elastic modulus(XY)") is the row's direction.
- **The same, with the value on the line below**: "Tensile strength MPa" / "ISO 527 43.8" — a label carries its
  unit down with it.
- **A section heading is not a name** ("Product Description"), and **a title line that already is the name, more
  fully** ("iSANMATE PLA CF" over "PLA") is the product; the identity census moved exactly one document for it.
- The unit lexicon knows "KJ/m²" and "g/ 10min"; an axis in square brackets ("Flexural Strength [Z]") is read.

## Identities and decisions

- **PLA CF** joins PLA-CF; its sheet is a LEHVOSS-format sheet of moulded ISO 3167 bars, and its moduli of 25 GPa
  are accepted as a moulded compound's (they back no printed headline, D55).
- **PCL** is a material of its own (R097); its sheet names the resin, "Capa 6500 Polycaprolactone". Its melting row
  held the top of "58.0 to 60.0 °C" and is rejected: a range written with "to" is not yet read (PLAN-REMAINING 1.6).
- **PDS** is a toughened PLA, by its own description ("PLA+ P-3018 ... on the basis of PLA raw material").
- **PLA i5+** prints a flexural modulus of 69 MPa, kept and flagged physically implausible.
- **HDPE Glass Fiber** elongating 35 % is accepted as credible for the most ductile printable matrix.

## What the batch left

iSANMATE's PLA Silk prints the numbers of its PLA Silk Dual Color and waits for the twin step (R053). Applying
FormFutura's own sheets in b28 settled 14 of the 3DJake copies of them as `registered` at this batch's `--holds`.
