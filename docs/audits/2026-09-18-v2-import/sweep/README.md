# The sweep: 200 values read once against their sheets (PLAN-REMAINING 2.3)

`sweep-200.csv` is the worklist: the 200 recorded values furthest from their material's other values measured the
same way (`v_measurement_z`, a robust z-score within material, property, unit, direction, moisture, annealing and
specimen form). A reader who recorded none of them read each one against its cached, hash-checked sheet
(`../BRIEF-sweep.md`) and wrote a verdict and the quoted line into the `Verdict` and `Note` columns.

| Verdict | Rows |
|---|---:|
| real | 98 |
| wrong-condition | 59 |
| implausible | 31 |
| variant | 6 |
| wrong-property | 4 |
| wrong-value | 2 |
| unreadable | 0 |

Nothing was edited a row at a time. Each verdict named a class; the class was counted across the whole table from
each row's own printed line or its sheet's own sentence, and fixed by one migration:

| Migration | Class | Rows |
|---|---|---:|
| m126 | two numbers read as one (colorFabb's "40 20", Polymaker's "13 2"); two flagged | 4 |
| m127 | a wrong cell; 30 tensile endpoints the line names; two stresses at conventional deflection; 14 numbers that are not the property (processing melt temperatures, a ball pressure test, UL 746 indices), quarantined; 24 flagged implausible (D55); window W0111 | 71 |
| m128 | the specimen a sheet states once for its table: printed (Flashforge, Eryone, eSUN, QIDI, iSANMATE, SUNLU, Polymaker), moulded (eSUN's injection spline, Nobufil's Injection column) | 1,107 |
| m129 | the annealing (and moisture) a sheet states for its bars: Bambu Lab, Kingroon, Polymaker and Fiberon per table, Raise3D, Spectrum's footnotes | 213 |
| m130 | Kingroon's ABS sheet prints Bambu Lab's ABS table (R053) | 18 rows, 1 grade |
| m131 | six plain-PLA grades denser than neat PLA (undisclosed dense filler); PET Flex Max (declared softer grade) | 7 grades |
| m132 | notch, load and test temperature a row's own line states; two melt flow conditions; one direction; four water uptakes | 63 |
| m133 | NinjaTek's and Markforged's printed statements; eSUN's foamed Wood | 27 |

Two headlines selected a value the migrations showed they cannot stand for, and became context: PA6/66-CF's heat
deflection (a moulded bar) and LCP's (at 1.8 MPa). No other measured headline moved; the estimates recalibrated, and
each migration's snapshot diff is in its commit.

## Kept as they are

The reader's verdict was not the migration's in these, and why:

- **Low but possible for a printed part** (`implausible` → kept): Flashforge's PC/ABS modulus 0.8-0.95 GPa (V005228)
  and Eryone's ASA 0.94 GPa (V005008). A printed bar can sit at half a moulded one; physics does not rule it out.
- **A crystallised PLA's heat deflection the sheet does not call annealed** (`implausible` → kept): Nanovia's PLA EF
  and VX at 80-90 °C (V007474, V007533) and MatterHackers' PRO PLA at 75-80 °C, 1.8 MPa (V008746). That is a state,
  and the sheets do not state it.
- **NinjaTek's Armadillo** (`variant` → kept): a 75D semi-rigid polyurethane among softer ones, as its name says; no
  variant describes a harder grade, and none is needed.
- **eSUN's ePLA ST and ePLA Matte** (the note's "also a variant"): the sheets call ST tough, not soft, and declare
  nothing about Matte's low density.

## Still open

- **Stresses at a stated elongation** (18 rows) have no property: OPEN-PROBLEMS §11.
- **Nobufil's two-column rows** (FDM H and Injection) were never read: OPEN-PROBLEMS §11.
- **BASF's extended sheets** (V010063's class): the column a value stands in says its print direction, and the
  applied rows record neither the direction nor the printed specimen. It needs the page images read per column.
- **Eleven rows of sheets with a note under each table** whose own line could not be found once kept no annealing
  (listed in m129's output).

The 453 values beyond |z| 3 that the 200 did not reach stay in `v_measurement_z`, and EST-GRADE-OUTLIER keeps
raising the worst of them at grade level.
