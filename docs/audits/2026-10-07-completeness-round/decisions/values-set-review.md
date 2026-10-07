# The 28 proposed corrections of held values (c1), read against the page

> **Historical record** (2026-10-07): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

`ingest:read-proposals` made 28 held values ready to correct (`read/proposals/values-set.csv`, 123 cells): each time,
the c1 reader and a blind second reader read a number on the page that differs from the held row, and the reconciler
paired the two. Claude Opus read each held row's line and its neighbours in the cached text (and, where the text layer
is garbled, the page image). In every case the page prints both numbers, and the held row is the right cell; the reading
was of the neighbouring one:

| Held row | Held | Read | Why the held row stands |
|---|---|---|---|
| V007020 (3D-Fuel PETG) | 67 °C | 62 °C | 67 °C is the deflection at 0.455 MPa, the row's load; 62 °C is the 1.82 MPa row |
| V012461 (3D-Fuel Workday ABS) | 8 kg·cm/cm | 20 | 8 is the notched Izod at -30 °C, the row's temperature; 20 is the 23 °C row |
| V007459 (3D-Fuel Workday ABS) | 86 °C | 90 °C | 86 °C is at 18.6 kg; 90 °C at 4.6 kg |
| V005755 (varioShore PEBA 45D) | 89,1 MPa | 94,0 | the sheet prints a printed table (94,0 / 24,0) and an injection-moulded one (89,1); the held row is the moulded one |
| V012894 / V004285 (Extrudr DuraPro PC FR V0, de / en) | 106 / 98 °C | 98 / 106 | each holds its own load (0.45 / 1.8 MPa); the reading crossed them |
| V014749 (ApolloX CF10) | 8 ft.lb/in2 | 8 ft.lb/in² | the same value; the superscript is a typography difference |
| V013305 (YOUSU PC) | 900 | 19 | the sheet stacks two numbers in one merged cell; which is the notched Izod is not settled by a second reading of the same cell |
| V014493, V014496, V014499, V014508, V014511, V014514 (Markforged Onyx) | 2.4, 40, 37, 3.0, 145, 330 | 4.2, 52, 50, 3.7, 138, 44 | Onyx is the sheet's first column; the readings are the Onyx ESD and Nylon columns |
| V013557, V013558, V013572, V013573, V013665, V013678, V013679, V013705, V013716 (Prusament sheets) | each column's value | the other column's | each sheet prints a Horizontal and a Vertical xz column; every held row is its own column's |
| V011511 (Recreus PET-G) | 68,0 °C at 0.45 MPa | 62,0 °C | 62,0 is the 1.82 MPa row |
| V005777, V005778, V005776 (varioShore TPU 95A) | 59 MPa, 490 %, 40 kJ/m² | 24, 465, 20 | the held rows are the injection-moulded table and the unfoamed column; the readings are the foamed columns |
| V002975 (Spectrum LW-PLA UltraFoam) | 1,24 g/cm³ | 0,37 | 1,24 is the filament's density; 0,37 is "Density (foamed)", a printed part's |

No held value changes. The same pattern (a mismatch that is the neighbouring cell) is what the reader round found in
all 57 of its deciding mismatches (OPEN-PROBLEMS §31).
