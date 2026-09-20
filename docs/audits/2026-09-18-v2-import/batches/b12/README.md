# Batch b12: the new PDF libraries of Wave B

Applied 2026-09-20 by `m81-batch-b12`: 1,311 records from 154 documents, across thirteen makers whose libraries
had never been read — SIDDAMENT, Raise3D, 3D4Makers, Prusament, eSUN, Recreus, Essentium / Nexa3D, BigRep,
NinjaTek, Yousu, 3D-Fuel, UltiMaker and Markforged. The database goes from 528 grades, 6,556 measurement rows
and 730 sources to 643, 7,461 and 848. No material was created.

## What the reader had to learn, and what it caught

Six rules, and two of them were catching a value that was wrong rather than one that was missing.

- **A row repeated in another unit is one measurement.** Stratasys prints "Tensile Modulus … ASTM D638 2,400
  MPa" and then the same label again with "(350,000 psi)" under it. Read as two rows, a grade has two moduli.
  The metric row is kept and the repeat is written down as the repeat it is — with both figures, because on one
  row they **disagree**: 36 MPa is 5,221 psi and the sheet prints 4,650. That is the sheet contradicting itself,
  and it now says so instead of entering as two different tensile strengths.
- **A digit written hard against a word is a footnote mark.** "Heat distortion temperature3 (°C) ISO 75 @0.45
  MPa 251" — read as the value, the 3 gave five SIDDAMENT sheets a heat deflection of 3 °C.
- **A number may be written without its leading zero.** ".13 %" read as 13 % is a hundred times the water
  absorption the sheet prints.
- **A power of ten whose exponent did not survive is refused**, not read as its pieces: Stratasys prints
  "3.9 ×10¹³ Ω·cm" and the text layer keeps "3.9", "10" and "Ω", which is not a resistivity any material has.
- **The thousand below as well as the thousand above.** "Material density 1,320 g/cm3" is 1.32 g/cm³; the rule
  that settles a separator by what the property can be only ever tried multiplying.
- **A column boundary is measured from where the heading before it ends.** Stratasys heads its label column
  "0.25 mm (0.010 in.) Layer Height" and its unit column not at all, and measuring from that heading's start
  swallowed the "%" into the first orientation, leaving the second with a number and no unit.

Four more things a product's name is not: a category or a process ("Material", "FDM", "3D"), a bare Shore
hardness ("70A", which is how Recreus titles its Filaflex sheets), a sentence with a verb in it ("ABS and can
print strong and durable"), and a section heading in French. And a brand line is not the maker's name: adding
Filaflex to Recreus's aliases made the reader strike it from its own products' names, which is why it is not
there.

## What was held, and why

| Held | Documents | Why |
|---|---:|---|
| Stratasys, entire | 24 | a table per layer height, each with a column per orientation |
| No name a reader can use | 28 | SIDDAMENT and Yousu pages that read as "Material Status Mass Production" and "Precautions" |
| Identity unsettled | 87 | |
| The same numbers under another name | 4 | queued rather than registered twice (R053) |

**Stratasys is the one worth explaining.** Its sheets print a table per layer height, each with a value column
per build orientation. The reader reads the orientations now, and it reads the layer height its heading names —
but two tables of one sheet carry the same heading, so their rows are one grade's elongation four times over
with nothing to tell them apart. That is what MEAS-CONDITIONS-INDISTINCT exists to prevent, so the twenty-four
documents wait for the condition-block work rather than enter indistinct.

## What was decided rather than accepted

Six rows are rejected as misreadings, each named:

- a continuous service temperature whose humidity condition ("23 ºC/50% rh") was read as a heat deflection;
- a coefficient of thermal expansion whose range start ("23 ºC to 150 ºC") was read as a Vicat point, twice;
- a heat deflection whose load ("D648 ℃ 1.8MPa, 6.4mm 65") was read as its temperature;
- a sentence about the pressure required to start a print, read as a flexural modulus;
- a foaming filament's lower density bound, which is what the process does and not what the material weighs.

Twenty-three findings are accepted with a reason apiece: high-speed grades whose melt flow is far above a window
drawn from ordinary ones, toughened grades above their impact windows, a hard elastomer above a window drawn
from soft ones, and three strain findings that are systematic across makers.

Five acceptances were removed because they no longer occur, two of them estimate outliers that stopped being
outliers once this batch filled out their families. An acceptance that no longer fires is as misleading as a
missing one.

## Nineteen vocabulary rows

Five makers — 3D-Fuel, 3D4Makers, NinjaTek, Recreus and UltiMaker (MakerBot merged into it in 2022) — and
fourteen standards their sheets cite, from GB/T 1033.1 to ISO 4589, each with the data that cites it.
