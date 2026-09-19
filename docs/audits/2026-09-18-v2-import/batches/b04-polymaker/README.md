# Batch b04-polymaker

Fifty-one Polymaker data sheets, the maker the database was largely built from. Applied 2026-09-19 by
`m57-batch-b04-polymaker`.

## What entered

| Table | Records |
|---|---:|
| sources | 51 |
| grades | 35 |
| measurements | 632 |
| profiles | 89 |
| profile_notes | 173 |

No new material: every product found one that already exists, which is what a maker whose range the database was
built from should do.

## The gate

The reader began at **77%** on the 13 Polymaker sheets the database already held and finished at **93%**. The
residue is one sheet: a shared data table covering several products at once, which the pipeline reads as one
document and one product. That is the structural gap the plan calls "a sheet naming several products becomes one
proposal per product", and it is not yet built.

What this maker's sheets taught the reader:

- **A unit may be printed in brackets after the value**: "Young's modulus (X-Y) ASTM D638 2636 ± 330 (MPa)".
- **A row may name its own direction**, and then it is the row's whatever the property usually is: "Tensile
  strength (X-Y)" and "Tensile strength (Z)" are two rows of one table.
- **A plus may mean plus-or-minus.** "Tensile strength (X-Y) 43.8 + 0.8 MPa" is a value and its spread; read as
  two numbers it recorded 0.8 MPa as the strength of an ASA. Ninety-three of this batch's findings were that.
- **The sign may be missing entirely**: "Elongation at break (X-Y) 2.77 0.45%".
- **A superscript may be dropped**: "1.25 g/cm" is a density and "2.6 kJ/m" an impact strength.
- **A table may be printed twice**, once as printed and once annealed, with the words above each block.
- **A chart's axis is a number and a unit alone.** "100MPa" on a comparison page was claimed by a bending-strength
  label four pages earlier, on three different products.
- **A sentence about how the test bars were made is not printing guidance**: "All testing specimens were printed
  under the following conditions: nozzle temperature = 205 °C".
- A shore hardness may carry its scale on the number ("95A"), a standard may carry the year it was published
  ("ISO 179-1/1eA:2010"), and an equilibrium water absorption is a water absorption.

## What was decided rather than read

Eleven findings, each read against the page and accepted with what the sheet says: five pairs of sheets that are
two revisions of one product published without remeasuring; two LW PLA densities of 0.9 g/cm³, which is what a
foaming filament weighs; a Z strength above its own X-Y one; a Z elongation whose ratio to stress and modulus does
not close, as a layer-bonded part's does not; and three sheets whose glass transition sits above their own Vicat
softening point.

The build's own reader gained one wording: "Not Needed" in a chamber cell is the same statement as "not required".

## What is not here

Fifteen documents: eight support and soluble products (PolySupport, PolyDissolve, PolyCast, PolySmooth), whose
material is the one they support rather than one of their own, and seven whose sheets name no polymer (PolyWood,
CosPLA). Both belong to the pending questions on identity.
