# Readings CSV schema (reader round, 2026-10-04)

One CSV per reader per batch, UTF-8, comma separated, RFC 4180 quoting, a header row with exactly these 26 columns in
this order. An empty cell is empty: never write "N/A", "-" or 0 for a value you did not see. Every row is one thing
printed on one page (or one held row checked against that page).

```
source_id, page, kind, field, grade_id, product, label, raw, number_lo, number_hi, unit, operator, direction, specimen,
moisture, post_processing, standard, test_conditions, table_heading, quote, held_id, verdict, held_value, confidence,
reader, note
```

The reconciler (`npm run ingest:read-reconcile`) reads it; it never trusts a row. It checks each number and the quote
against the page's text layer (`text`), the reading-order blocks (`block`) and the OCR sidecar (`ocr`); a row it cannot
find in any is `visual-only` and gets an independent second read.

## Columns

| column | meaning |
|---|---|
| `source_id` | The SourceID of the document (the folder name in the packet). Required. |
| `page` | The page of the PDF (1 = first page of the file, the number in `p-N.png`), not the number printed on the page. HTML documents: 1. Required except for `none`. |
| `kind` | `setting` (a print setting), `value` (a measured or published property), `context` (a heading or footnote stating conditions for a table), `identity` (what the product is: polymer, filler, grade, colour, diameter), or `none` (the page holds nothing of these kinds; one row per such page, so we know it was read). |
| `field` | For `setting`: `nozzle`, `bed`, `chamber`, `enclosure`, `drying`, `hardened_nozzle`, `nozzle_diameter`, `print_speed`, `fan`, `plate`, `other`. For `value`: the property name exactly as in `data/tables/properties.csv` where one is the same test, else `unmapped:<label as printed>`. For `context`: the scope it speaks for: `all`, `tensile`, `flexural`, `impact`, `thermal`, `physical`. For `identity`: `polymer`, `filler`, `grade`, `colour`, `diameter`, `other`. |
| `grade_id` | The GradeID from the packet's products list when the row is about one of them. Empty when the sheet is about one product and you cannot tell which GradeID it is. |
| `product` | The product or column heading as the sheet prints it ("PLA-CF", "Nylon 12 CF (dry)"). Required on multi-product sheets; copy the sheet's words. |
| `label` | The row label as printed ("Young's Modulus (X-Y)", "Bed Temperature"). |
| `raw` | The value cell as printed, with its unit and ± ("2790 ± 120 MPa", "210 - 240 °C", "Required"). For a setting without a number, the words. |
| `number_lo` | The number as printed, dot decimal, no unit: the value, or the low end of a range ("210"). Not converted, not rounded, not the mean of anything. Empty when the cell has no number. |
| `number_hi` | The high end of a range ("240"). Empty for a single value. A "± 120" is not a range: leave it in `raw`. |
| `unit` | The unit printed with the value, as printed ("MPa", "°C", "g/cm³", "psi", "kJ/m²"). For a drying row: the temperature's unit. Empty if none printed. Never convert. |
| `operator` | `=` (default; may be left empty), `>` or `<` when the sheet prints a bound ("> 500 %"). |
| `direction` | Build direction the column or row states, in the sheet's words ("XY", "Z", "X-Y", "flat", "upright", "ZX"). Empty if the sheet says none. |
| `specimen` | What the specimen was where the sheet says: "printed", "injection moulded", "filament", "film". Empty if not said. |
| `moisture` | The sheet's words about the moisture state of the test ("Dry", "conditioned 23 °C 50 % RH", "dried 80 °C 4 h"). Empty if not said. |
| `post_processing` | The sheet's words about annealing or other treatment ("as printed", "annealed 100 °C 16 h"). Empty if not said. |
| `standard` | The standard or method printed for this row ("ISO 527-2", "ASTM D638 Type I"). |
| `test_conditions` | Other conditions printed for this row, `key=value` pairs separated by `;` ("load=1.8 MPa; temp=23 °C; rate=50 mm/min"). For a drying row put the hours here as `hours=4-6`. |
| `table_heading` | The heading of the table or section the row sits in, as printed ("Mechanical Properties (Dry state)"). |
| `quote` | The verbatim text of the row as printed, contiguous. If the row's pieces are not contiguous on the page (a label at the left, a value at the right), join the pieces with ` | `. A footnote or heading that states the condition for the row may be added as another piece after ` | `. Copy exactly: no paraphrase, no fixing of typos. |
| `held_id` | The MeasurementID or ProfileID from `held.json` that this row confirms, contradicts or concerns. Empty for a row with no held counterpart. |
| `verdict` | `new` (nothing held for it), `confirms` (the held row is right), `mismatch` (the held row differs from the page: put the page's value in `raw` and the numbers), `not-on-page` (a held row whose value or label you cannot find on this page). |
| `held_value` | For `confirms`, `mismatch` and `not-on-page`: the held row's value as `held.json` shows it ("1.22 g/cm³"). |
| `confidence` | `high` (clearly legible, unambiguous), `medium` (legible but the column or condition is ambiguous), `low` (blurred, faint or contradicted by the text layer). |
| `reader` | Your agent name or run id. |
| `note` | Anything the next person must know: "value is in a rotated table", "two columns share this heading", "page shows a graph only". Empty if nothing. |

## What the reconciler does with a row

| class | meaning |
|---|---|
| `confirms` | A held row with the same property or setting, grade and compatible conditions has the same number at the coarser of the two precisions. |
| `mismatch` | A held row at the same property, page and conditions (or the one you named in `held_id`) has a different number. Or a setting the profile publishes differently. |
| `new` | No held row. Settings go to `new-settings.csv`, values to `new-values.csv`. |
| `context` / `context-held` | A `context` row: the held measurements on that page and scope that would inherit it, and whether `page_context.csv` already holds it. |
| `unmapped` | A `value` whose field starts `unmapped:`. |
| `not-on-page` | A held row the reader could not find; the reconciler looks for the held value on the page itself and turns the row into `confirms` (`reader-missed-held-row`) if it is there. |

A `value` row goes to `unmapped.csv` (record tier) rather than a table property when its property is not in
`properties.csv`, its unit is not one that property is recorded in, or it prints a power of ten (`>10^3 - 10^7 Ohm/sq`);
`invalid.csv` holds broken rows only (bad kind, unknown source, bad page, wrong column count). A product written twice
(same source, page, kind, field, grade or product, numbers, direction, moisture, post-processing) is read once; the rest
are listed in `duplicates.csv`.

A row needs a **second read** when it is `visual-only`, a `mismatch`, or a `new` decision field (nozzle, bed, chamber,
enclosure, drying, hardened_nozzle; tensile strength, tensile modulus, elongation at break, density, HDT, glass
transition, Charpy, Izod). The importer's own sheet reader (`readSheet`, layout on) is an independent second reader: where it reads the same field
and numbers on the same page (a setting; drying may omit its hours), or the same property and number on the same page (a
value), the row is `agreed-reader` and gets no task. Otherwise it is `agreed` when an independent reading of the same source, page, field and product gives
the same numbers (conditions that disagree outright make it `disagrees`).

## Worked examples

A setting (a print setting row, a multi-column sheet):

```csv
B-pla-cf-TDS,1,setting,nozzle,G018-01,PLA-CF,Nozzle Temperature,210 - 240 °C,210,240,°C,,,,,,,,• Specifications / Printing,Nozzle Temperature 210 - 240 °C,P0018,confirms,210 - 240 °C,high,reader-07,
```

A drying setting, hours in `test_conditions`:

```csv
B-pla-cf-TDS,1,setting,drying,G018-01,PLA-CF,Blast Drying Oven,"55 °C, 8 h",55,,°C,,,,,,,hours=8,Drying Settings before Printing,"Blast Drying Oven: 55 °C, 8 h",P0018,confirms,"55 °C, 8 h",high,reader-07,
```

A value with its conditions (direction in the label, standard in its own column, a footnote naming the specimen):

```csv
B-pla-cf-TDS,2,value,Tensile strength (endpoint unspecified),G018-01,PLA-CF,Tensile Strength (X-Y),38 ± 4 MPa,38,,MPa,=,XY,,,,"ISO 527, GB/T 1040",,Mechanical Properties,"Tensile Strength (X-Y) ISO 527, GB/T 1040 38 ± 4 MPa",V000333,confirms,38 ± 4 MPa,high,reader-07,
```

A context heading (it states conditions for every tensile row beneath it; no number, no held id):

```csv
B-petg-cf-TDS,2,context,tensile,,,Mechanical Properties (Dry state),,,,,,,printed,dry,,"ISO 527; GB/T 1040",,Mechanical Properties (Dry state),Mechanical Properties (Dry state),,new,,high,reader-07,heading above the tensile rows
```

A held row that is wrong on the page (`mismatch` carries the page's value):

```csv
X-ACME-TDS,3,value,Elongation at break,G099-01,ACME PA12,Elongation at break,"> 50 %",50,,%,>,XY,,,,ISO 527,,Mechanical,Elongation at break ISO 527 > 50 %,V009001,mismatch,12 %,high,reader-07,held row has 12 %
```
