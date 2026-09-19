# Batch b03-3dxtech

Thirty-two 3DXTECH data sheets, the first batch of a maker whose tables are laid out the other way round.
Applied 2026-09-18 by `m56-batch-b03-3dxtech`.

## What entered

| Table | Records |
|---|---:|
| sources | 33 |
| grades | 31 |
| materials | 15 |
| measurements | 251 |
| headlines | 70 |
| profiles | 32 |
| profile_notes | 32 |

The fifteen new materials are the filled and ESD variants of polymers the database already held as unfilled:
PEEK-CF, PEEK-GF, PEKK-CF, PEKK-ESD, PEI-CF, PEI-GF, PEI-ESD, PC-ESD, PVDF-ESD, PPS-ESD, TPU-ESD, TPC-ESD,
PC-ABS-CF, and two blends this maker names on its own sheets, PC-ASA and TPI. Each has a ruling (R017 to R038).

## The gate

The reader began at **4 of 214** recorded values on the 27 sheets of this maker the database already held: 2%.
It now reproduces **213 of 214**. Spectrum stays at 113 of 113.

What the layout taught it:

- **A table may print its unit in a column of its own, before the value.** "Tensile Strength, Break | ISO 527 |
  MPa | 62.8" is every row of every 3DXTECH sheet, and a reader that only knew "number unit" saw none of them.
- **A standard's number is not a value.** With the unit in its own column, "Density ISO 1183 g/cc 1.35" offers
  "1183 g/cc" first.
- **A row the table wrapped continues where its label ended, in another column.** "Glass Transition Temperature"
  at the label's x and "DSC °C 187" at the value column's. Prose never begins with a standard or a unit.
- **A label line with a number in it but no value of its own still heads the rows under it**: "Deflection
  Temperature at 0.45", then "ISO 75 °C 172", then "MPa (66psi)".
- **A sheet that says how its specimens were made is describing printed bars**, and one that says how they were
  laid on the plate has stated the direction: "Printed Specimen Conditions" and "Specimen Orientation: XY Flat".
  Without that, a new material can show no headline in a direction at all.
- The scale of a hardness may be in the unit beside the number ("80 HRM"), a melt temperature may be called
  "Melt Temperature", and an elongation may carry its endpoint in brackets ("Elongation (Yield)").

## What was decided rather than read

- **A filled PEEK is not the unfilled PEEK material.** The name-matching path ignored the filler and filed
  3DXTECH's carbon-fibre PEEK under M097, where a 10 GPa modulus was judged against an unfilled window.
- **Three plausibility windows added** for a fibre-filled high-temperature polymer: 20 to 30 wt% carbon fibre in
  PEEK or PEI reaches 10 to 13 GPa, and its heat deflection approaches the melting point. The windows that existed
  were drawn from a database with no such grade in it.
- **A material with no polymer row is judged as high-temperature only where its family says so.** A PC/ASA and a
  PPE/PS are ordinary printable polymers; judging them against PEEK's windows called their glass transition
  surprisingly low.
- **Eleven findings accepted**, each with what the sheet says: six on the ESD-TPC, whose sheet publishes a hard
  copolyester's numbers under a name that says 90A; the twin ESD Ultem sheets, which publish one data set for two
  products; a break strain below stress over modulus on a carbon-fibre Ultem; and a high-temperature polyamide's
  glass transition of 125 °C.
- **Two values flagged physically implausible**: revision 1.0 of the CarbonX High Temp Nylon sheet prints 265 °C
  as a glass transition, which revision 2.0 corrects to 125 °C with 265 as the melting temperature; and the
  ESD-PVDF sheet prints 158 °C as a glass transition, where PVDF's is about -35 °C and 158 is near its melt.

## What is not here

Five documents. Four name no polymer a material can be filed under (Obsidian and CarbonX Gen3 say only "Nylon",
SimuBone names none at all, WearX says "PA6 Copolymer"): pending question Q006. One, THERMAX PPE/PS, publishes a
heat deflection at 1.8 MPa only, so its 0.45 MPa headline can be neither shown nor estimated until `polymers.csv`
holds a row for the blend: Q007.
