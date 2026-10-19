# Stage 4 proposals, reviewed

> **Historical record** (2026-10-19): the executor's decisions on the research intake's reading proposals. Written by
> `ingest/review-r1.mjs`; m454 applies this folder.

- 73 values to add, 68 profiles to add, 19 cells of held profiles to set.
- 34 readings left held: settings no table column takes (print speed, fan, infill, spool weight), a twin's
  profile already proposed, readings already recorded from another sheet, a unit the page does not print, labels with
  no property, and page notes that change no record.

| Decision | Row | What | Why |
|---|---|---|---|
| value set | r1-resolved.csv#142 | G166-02 Density 1,18 g/cm³ | Eumakers prints 1,18 g/cm³ on its filament data sheet and 1,07 g/cc on its polymer data sheet for the same product; both are recorded as printed. |
| value set | r1-resolved.csv#143 | G166-02 Impact strength 80 Kj/m² | Its method, ISO 179/2-1eU, is a Charpy test of an unnotched bar struck edgewise (the sheet heads the column ASTM and prints ISO numbers). |
| value set | r1-resolved.csv#147 | G166-02 HDT 160° C | The row is labelled HDT/A, ISO 75 method A (1.80 MPa). |
| value set | r1-resolved.csv#187 | G166-02 Density 1,07 g/cc | Eumakers prints 1,18 g/cm³ on its filament data sheet and 1,07 g/cc on its polymer data sheet for the same product; both are recorded as printed. |
| value set | r1-resolved.csv#193 | G166-02 Flexural strength 125,0 MPa | cells: Locator |
| value set | r1-resolved.csv#194 | G166-02 Flexural modulus 3131 MPa | cells: Locator |
| value set | r1-resolved.csv#196 | G166-02 Flexural strength 110,3 MPa | A flat bar the sheet heads "xy - normal" beside its "xy - parallel" bar, with one infill angle (45°) for both: kept apart from the XY value, as a 45/45 bar beside an XY one is (D91). |
| value set | r1-resolved.csv#197 | G166-02 Flexural modulus 2820 MPa | A flat bar the sheet heads "xy - normal" beside its "xy - parallel" bar, with one infill angle (45°) for both: kept apart from the XY value, as a 45/45 bar beside an XY one is (D91). |
| value set | r1-resolved.csv#199 | G166-02 Izod impact strength 53,60 kJ/m² | cells: Locator |
| value set | r1-resolved.csv#200 | G166-02 Izod impact strength 52,80 kJ/m² | cells: Locator |
| value kept | r1-resolved.csv#17 | G059-02 HDT 99.6 °C °C | The Annealed column; the footnote on p. 3 gives the schedule (100 ℃, 8 hours), as the other annealed rows of this sheet read it. Held by the pipeline because its quote did not match the text layer; two readers read it from the image and the text layer prints it. |
| value kept | r1-resolved.csv#18 | G059-02 HDT 135.7 °C °C | The Unannealed column at 0.45 MPa. The reconciler compared it with the held 1.80 MPa row (V009352), a value at the other load; it is a new value. |
| value kept | r1-resolved.csv#19 | G059-02 HDT 138.2 °C °C | The Annealed column at 0.45 MPa; the footnote on p. 3 gives the schedule. |
| value kept | r1-resolved.csv#98 | G028-07 Fibre content 10 % | Section 3.2 of the scanned safety data sheet, the column of mass fractions in per cent; read in its optical text, and by two readers from the image. |
| value kept | r1-resolved.csv#107 | G165-06 Density 1.01 g/cm3 | The page prints the unit as "gcm-3", the same unit written as a power. The sheet's comment, "Resin Manufacturer data", says whose figure it is, not the specimen's form. |
| value kept | r1-resolved.csv#125 | G166-03 Density 1.24 g/cm3 | The page prints the unit as "gcm-3", the same unit written as a power. The sheet's comment, "Resin Manufacturer data", says whose figure it is, not the specimen's form. |
| value kept | r1-resolved.csv#113 | G165-06 Izod impact strength 124 J/m | The page prints the unit as "Jm-1", the same unit written as a power. |
| value kept | r1-resolved.csv#131 | G166-03 Izod impact strength 154 J/m | The page prints the unit as "Jm-1", the same unit written as a power. |
| value kept | r1-resolved.csv#111 | G165-06 Flexural modulus 520 kpsi | kpsi is ksi, a thousand psi. |
| value kept | r1-resolved.csv#112 | G165-06 Flexural strength 16.0 kpsi | kpsi is ksi, a thousand psi. |
| value kept | r1-resolved.csv#129 | G166-03 Flexural modulus 619 kpsi | kpsi is ksi, a thousand psi. |
| value kept | r1-resolved.csv#130 | G166-03 Flexural strength 19.1 kpsi | kpsi is ksi, a thousand psi. |
| value kept | r1-resolved.csv#110 | G165-06 Elongation at break 12 % | A plain "Tensile Elongation" is read as elongation at break, as on the 29 other sheets that print the label. |
| value kept | r1-resolved.csv#128 | G166-03 Elongation at break 7 % | A plain "Tensile Elongation" is read as elongation at break, as on the 29 other sheets that print the label. |
| profile cell added | r1-resolved.csv#121 r1-resolved.csv#122 r1-resolved.csv#123 r1-resolved.csv#179 r1-resolved.csv#180 | G165-06 Drying "Recommended drying temperature: 75 °C; For Nylon Carbon Fiber, dry six to twelve hours at 75° C (165° F)" | The page's drying sentence gives the hours in words beside the temperature. |
| profile cell added | r1-resolved.csv#139 r1-resolved.csv#140 r1-resolved.csv#141 r1-resolved.csv#181 r1-resolved.csv#182 | G166-03 Drying "Recommended drying temperature: 75 °C; For Nylon Glass, dry six to twelve hours at 75° C (165° F)" | The page's drying sentence gives the hours in words beside the temperature. |
| profile cell added | r1-resolved.csv#174 r1-resolved.csv#177 r1-resolved.csv#178 | G015-04 Nozzle °C "185 - 215 °C"; Bed °C "50 - 60 °C" | The nozzle and bed windows on the same page, which the pipeline held because the reader typed no number: the parsers read 185–215 °C and 50–60 °C, as the page prints them. |
| profile cell added | r1-resolved.csv#209 r1-resolved.csv#210 | G166-02 Abrasion / clogging "We recommend using stainless brass or resistant copper alloy nozzles." | The store page's nozzle advice: a harder alloy than plain brass, not a hardened nozzle (D168). |
| profile added | r1-resolved.csv#72 | G075-09 on R-RAISE3D-INTAKE-20261019-0ea774a63185: Do not print PVA+ in an enclosed chamber with a chamber temperature of above 50°C, as this may cause clogging. | A ceiling on the chamber, read as one: at most 50 °C (the pipeline held it while the parser read a 50 °C minimum). |
| profile added | r1-resolved.csv#69 | G102-04 on R-FORMFUTURA-INTAKE-20261019-a19de46bc4d5: +4 hours at max.110°C | Four hours or more at up to 110 °C: the plus before the hours opens them (the reader typed no hours). |
| profile added | NEW-bc21a85e0853 drying | G053-15 on R-MATTERHACKERS-INTAKE-20261019-bc21a85e0853: You can dry it out by baking it in an oven at 180°F for 4-6 hours. | A schedule printed in Fahrenheit alone, read as 82 °C (D168). |
| profile added | NEW-315a2e8f1fb9 hardened_nozzle Carbon fiber | G165-06 on R-FILAMATRIX-INTAKE-20261019-315a2e8f1fb9: Carbon fiber is abrasive and can quickly wear a brass nozzle, so a hardened nozzle is highly recommended. | Filamatrix's article on its nylons, for its carbon-fibre grade. |
| profile added | NEW-315a2e8f1fb9 hardened_nozzle glass fiber | G166-03 on R-FILAMATRIX-INTAKE-20261019-315a2e8f1fb9: A hardened nozzle is highly recommended because glass fiber is abrasive. | Filamatrix's article on its nylons, for its glass-fibre grade. |
| held profile cell | P1629 | Nozzle °C "245±10 °C" | a tolerance window, a bound or a nozzle metal the triage set aside to type by hand |
| held profile cell | P1630 | Nozzle °C "240±10 °C" | a tolerance window, a bound or a nozzle metal the triage set aside to type by hand |
| held profile cell | P1777 | Nozzle °C "215±10 °C" | a tolerance window, a bound or a nozzle metal the triage set aside to type by hand |
| held profile cell | P1777 | Bed °C ">60˚C" | a tolerance window, a bound or a nozzle metal the triage set aside to type by hand |
| held profile cell | P0986 | Nozzle material "A standard 0.4mm brass nozzle works well." | a tolerance window, a bound or a nozzle metal the triage set aside to type by hand |
