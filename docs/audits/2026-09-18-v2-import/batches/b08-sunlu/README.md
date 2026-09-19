# Batch b08-sunlu

Thirty-eight SUNLU data sheets. Applied 2026-09-19 by `m65-batch-b08-sunlu`.

## The layout

SUNLU prints the value on the line above the label that names it:

    35±5
    (X-Y) Tensile Strength ISO 527/2 50 mm/min MPa

and the unit's superscript on a line of its own before that, and the exponent of a power the same way
(`6.75×10` under `14`). Every result carries its direction, X-Y or Z-X, so the sheets say more about printed
anisotropy than most: 494 of the 853 rows their tables print are values, and the rest are named omissions —
177 where the sheet prints a dash instead of a number, 162 where the database has no property for the row
(flammability class, decomposition temperature, volume resistivity, permittivity, moulding shrinkage), 19 where
the sheet's own unit for thermal expansion is inconsistent with its own numbers, and one marketing sentence.

The sheets are bilingual and some are Chinese only; the product's name is on a line that labels it, which is
what the reader now reads rather than guessing from position. Before that, every grade would have entered the
database called "ISO".

## What entered

| Table | Records |
|---|---:|
| sources | 38 |
| grades | 38 |
| measurements | 494 |
| profiles | 38 |

No new material. Every product found one that already exists, including the finish variants under R039 (silk,
marble, sparkle, wood, galaxy) and the filled grades (PLA-CF, PETG-CF, PA6-CF, PA6-GF, PA12-CF, ABS-GF).

## What was decided rather than read

- **PP 2.0** publishes a density of 1.01 g/cm³, above the 0.90 to 0.96 a neat polypropylene reaches, with a
  flexural modulus of 500 MPa and an elongation at break of 900 %. Its grade declares Variant "undisclosed dense
  filler" and says why (D57), so its numbers stay its own and do not pull polypropylene.
- **A PEEK notched Izod of 138 kJ/m²**, which no notched PEEK reaches, is recorded as printed and marked
  physically implausible.
- **Twenty-eight hardness rows** whose unit column names both scales ("HA/HD") are recorded in the unit the
  register keeps for exactly that case, and each carries the finding that says a hardness with no scale compares
  with nothing.
- **Fourteen glass transitions above their own Vicat point**: SUNLU measures Vicat under 5 kg, the ISO 306 B
  load, which sits below the A-load point and can sit below the glass transition. Accepted with that reason.

## What is not here

Four products: **PCL** (no row in `polymers.csv` yet), **Easy PA** (its sheet says only "PA"; SUNLU's own store
calls it a PA6/66 copolymer, which settles it for the next batch), **PETG Glow In The Dark** and **TPU Silk**
(a glow or silk variant of a polymer whose finish material does not exist; R039 covers PLA only, and whether the
database creates finish materials for other polymers is the owner's to say). Eleven more sheets are parked as
`twin-check`: SUNLU publishes one table for several PLA products and one for the four Silk PLA+ colour packs.

## What the model learned from it

The batch is the first to give a support material mechanical values of its own, and the first whose polyamides
made three model invariants speak at once. Four changes came out of it, each in its own place:

- A support product with no measurements of its own is not characterised; one whose maker publishes something is
  read like any other material. The rule was always the model's; the test now says it as a rule rather than as a
  list of two names.
- A heat deflection measured on a conditioned bar beside its own dry one is the other state of that bar, not a
  repeat. Siraya's PPA prints 81 °C dry and 61 °C conditioned, and the two were averaging to a 71 °C bar that no
  test gives.
- A limit the material's own grades publish is a floor for its shown range, not a suggestion, which is what the
  model's own words for it always said (D78).
- Whether a declared grade variant moves its family is measured against an ordinary sibling of the same material,
  because removing any one product moves the fit and that movement is not what the invariant is about.
