# Batch b24: a table's columns by position, and the caption that names the table

Applied 2026-09-21 by `m96-batch-b24`: 135 records from 13 documents, out of 70 proposed from the two reader
pools (`reader:several-values`, `reader:condition-table`). This is phase B of the completion plan — the one
reader rule left worth building — and it is three rules, each measured.

## What the reader learned

**A heading cell may name a condition, or a condition in front of an orientation.** `axisColumns` already
split a row by orientation column; now "Unannealed | Annealed" (Siraya Tech), "Method | Molded | X-Y Axis |
Z Axis" and "3D Printed X-Y | 3D Printed Z" (QIDI), "Non-Annealed | Annealed" (Stratasys) are headings too, and
every value under a column takes its condition as plainly as it takes a direction: annealed or as printed into
Post-processing, moulded or printed into Specimen type. Two cells that both say "Annealed" are one condition and
not a heading.

**The caption above a heading is carried onto every row of the table.** Stratasys prints one table per printer
and per layer height — "Table 4: ABS-M30 Black Mechanical Properties - F770 - T14 Standard Head", then "Table 5:
… F900 - T16 Tip" — and without the caption the three tables were one grade's elongation four times over with
nothing on the row saying which table each came from, which MEAS-CONDITIONS-INDISTINCT refused twenty-four times
in b22. The caption goes into Specimen / print parameters, which that check reads. A property that has no
direction but is printed per orientation column (a heat deflection measured flat and on edge) keeps the column
there instead, so the two rows stay two without either taking a direction it cannot have.

**A block heading names its rows' family and standard.** Stratasys heads a block "Flexural Properties: ASTM
D790, Procedure A" and prints "Strain at Break" under it with no other word. Read by its own label that was a
tensile elongation, beside the real one from the tensile block, and a flexural strain of 3.7 % beside a tensile
yield of 4.4 % read as the sheet contradicting itself. The heading is the sheet saying what the rows are, as a
column heading says what direction they are in: "Strain at Break" under it is the flexural elongation at break
(`properties.csv` keeps that row), and a row that names no standard of its own takes the heading's.

"XZ/ZX", a column Stratasys heads with two orientations at once, is recorded with the direction the database
keeps for an orientation it cannot use as a build direction, and the note says what the sheet printed.

**Parity over all forty makers, before and after each of the three: up on two, down on none.** What did not
move was the five makers the plan hoped this would lift. Stratasys, Essentium, Prusa, iSANMATE and Bambu stay
where they were, because the sheets their parity is measured on have gaps of their own — a stacked label, a
merged impact cell, a table per colour — and the census names them.

## What was held after reading

| Document | Why |
|---|---|
| Stratasys TPU 92A | the word that tells two tensile rows apart (Yield, Break) stands on the line above the value: a stacked label the reader does not read |
| Stratasys Colored ULTEM 9085 | one row per property with a value per colour, three products under one caption: a sheet covering several products, not a reader gap |
| Stratasys ABS-CF10 and PC-ESD | named "MATERIAL DATA SHEETMaterial", their own front matter run together; held for the name |
| QIDI PLA Rapido | its one value, a "flexural modulus" of 10 to 20 MPa, is a setting or a range of something else |

Fifty-five of the seventy stay held for what the register says — most for a ruling or an identity that this
batch was not about — and one, a Fiberlogy ASA-AF whose eleven values are Spectrum's ASA Kevlar's, is queued as a
twin across two makers.

## Two findings accepted

A glass-filled polyamide deflecting at 35 °C under 1.8 MPa, printed flat, which is what the sheet prints beside
100 °C in its other tables; and a yield of 4.4 % against a break of 3.3 % that come from two printers' tables of
one sheet, which the order rule compares without reading the caption that keeps them apart.

## The database after this batch

1,001 of 1,936 documents applied.
