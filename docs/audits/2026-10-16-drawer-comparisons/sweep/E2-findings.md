# E2 findings: Heat deflection and glass transition heading, and product-level value checks

> **Historical record** (2026-10-16): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

Inputs: `/private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/72c77321-f3e0-499c-927d-991f68ee2f5d/scratchpad/sweep/text/thermal-read.txt` (122 blocks, all read), `dist/db.json` (read-only; built 2026-10-16 09:46).
Scripts: `.../sweep/parse-heat.mjs`, `keys.mjs`, `ranges.mjs` (Part A mechanical checks, run on the text after I read every block by eye), `.../sweep/value-checks.mjs` (Part B), output in `.../sweep/value-checks.txt`.

## Part A: counts

| | blocks |
|---|---|
| Blocks read | 122 |
| With a graph (rows, table, counted line) | 96 |
| "No graph" sentence | 26 (19 "only one product has a value to draw", 7 "no product has a value to draw") |
| Blocks with no median anywhere | 0 (every graph block has at least one row with a median; 5 blocks have a row of dashes, below) |

Checks that came out clean on all 96 graph blocks: (1) every row's "N products" equals table n plus the "Also drawn" counts; the header "N values" equals the counted line's N; "K drawn + the other M" equals N; the parts after "the other M:" sum to M. All 26 no-graph blocks also add up (1 drawn + the others = values). (4) every mark in the key that is checkable from the text (no stated test load, special formulation, middle half, median) has something carrying it, and no row that has one is missing its mark (the key drops "median" when every row has n = 1, which is consistent). (5) no scale says "log"; every tick list covers every range and "also drawn" interval in its block, and none has more than two tick steps of slack. No "undefined", "NaN", "null", HTML entity, or internal code word in any block; no "1 products" or "2 product" plural error.
Check (3) (graph with fewer than two dots, or a one-value sentence for a row that is also drawn): none. Every graph block has at least two dots, and the only one-value sentences are the "No graph" ones, where nothing is drawn.

## Part A: findings

| MaterialID | check | quoted lines | why |
|---|---|---|---|
| M008 | (6) | "HDT at 0.45 MPa 18 53" / "HDT at 1.8 MPa 3 56" | 1.8 MPa median (56, n=3) above 0.45 MPa median (53). |
| M013 | (6) | "HDT at 0.45 MPa 2 52.9" / "HDT at 1.8 MPa 1 53" | 1.8 MPa median 53 above 0.45 MPa median 52.9 (0.1 °C; one product at 1.8). |
| M037 | (6) | "HDT at 0.45 MPa 6 128" / "HDT at 1.8 MPa 3 129" | 129 above 128. Also the 1.8 range is "106–129" with median 129. |
| M097 | (6) | "HDT at 0.45 MPa 2 144" / "HDT at 1.8 MPa 3 156" | 1.8 MPa median 12 °C above 0.45 MPa median; the 1.8 range 152–162 lies wholly above the 0.45 range 140–147. |
| M102 | (6) | "HDT at 0.45 MPa 1 190" / "Also drawn ... 3 with no stated test load (207)" / "HDT at 1.8 MPa 3 207" | 1.8 MPa median 207 above 0.45 MPa median 190. The three 0.45 MPa products with no stated load are at 207, exactly the 1.8 MPa median, so they look like 1.8 MPa values with the load missing, or a shared sheet. |
| M001, M035, M048, M054 | (6, equal only) | M001 55 / 55; M035 119 / 119; M048 170 / 170; M054 163 / 163 | Equal medians, not above; allowed by physics, listed for completeness. |
| M082 | (2) | "HDT at 1.8 MPa 0 —" / "— —" / "Also drawn ...: 2 special formulations (51–65)"; "Glass transition (Tg) 0 —" | Two rows of dashes ("n 0, no median") beside a row with a median (HDT at 0.45 MPa 3, median 80). The row's "2 products" heading and the dashes read as a contradiction until the Also-drawn line is read. |
| M104 | (2), (5) | "HDT at 0.45 MPa 0 —" / "Also drawn ...: 1 with no stated test load (90)"; "°C ticks: 90" | Dash row beside "HDT at 1.8 MPa 1 90". Scale has a single tick, 90 (check 5): both dots sit at 90 and the axis has no span. |
| M108 | (2), (5) | same as M104: "HDT at 0.45 MPa 0 —", "°C ticks: 90" | Identical case to M104. |
| M130 | (2) | "HDT at 0.45 MPa 0 —" / "Also drawn ...: 2 with no stated test load (114–120)" | Dash row beside "HDT at 1.8 MPa 1 112" and "Glass transition (Tg) 2 134". |
| M164 | (2) | "HDT at 1.8 MPa 0 —" / "Also drawn ...: 1 special formulation (90)" | Dash row beside "HDT at 0.45 MPa 3 79". |
| M001, M008, M020, M027, M031, M033, M035, M050, M051, M070, M073, M088, M094, M099, M102, M110, M113 | (7) | e.g. M008: rows "22 products / 3 products / 18 products" (43) but "Of the 34 results below, 27 are drawn above"; M001: 128+44+82 = 254 products but "228 are drawn above"; M113: "HDT at 1.8 MPa 3 products" but "Of the 4 results below, 1 is drawn above" | The headings count products and the counted line counts results. Where a product has no result of its own (it reads its twin's sheet), the rows show more dots than results: products vs drawn results are M001 254/228, M008 43/27, M020 116/110, M027 76/70, M031 55/49, M033 18/16, M035 40/38, M050 24/22, M051 21/19, M070 17/16, M073 11/10, M088 19/15, M094 17/16, M099 22/19, M102 11/8, M110 7/5, M113 3/1. A new reader cannot square "Select a dot to open its result below" with three dots and one result (M113), or 43 dots and 27 results (M008). In the other 79 graph blocks the two numbers are equal. |
| M113 | (7) | "HDT at 1.8 MPa 3 95" / "— 95" / "°C ticks: 94 96" / "Select a dot to open its result below." / "Of the 4 results below, 1 is drawn above" | Three dots at one value 95 from a single drawn result; the graph shows one position, the table shows n 3. |
| M055, M064, M072, M080, M085, M092, M103, M120, M133, M136, M138, M139, M140, M142, M146, M147, M153, M156 (18 blocks) | (7) | "No graph: only one product has a value to draw, Yousu Nylon's hDT at 0.45 MPa of 75 °C" | "hDT" lower-case h (the first letter of the property name is lower-cased, "HDT" elsewhere). M091 reads "glass transition (Tg)" where lower case is correct. In the plain text the unit also has a space before the comma ("75 °C , with no stated test load"); that may be an extraction artefact. |
| M032, M054 | (7) | "Glass transition (Tg): no product has one, so it has no row; its results are listed below." | Every other block with an empty row (for example M059, M084, M090, M112, M164, M025, M096) says only "so it has no row". The suffix appears twice and nothing in the counted line shows a Tg result among the undrawn ones (M054: "2 more of products already drawn and 1 flagged implausible"). |
| M081, M088, M093, M097 | (7) | M088 "64–64 64"; M093 "70–70 70"; M097 "143–143 143"; M081 "100–100 99–101" | Middle half printed as a range with equal ends ("64–64"), beside a range that is a single number; reads as a typo. |
| most graph blocks (e.g. M011, M019) | (4), unverifiable | key: "compared measured after annealing median" | The key mark "measured after annealing" cannot be checked from the text; the counted lines say annealed values are undrawn ("annealed beside an as-printed value"), so a reader may not see what carries it. Flagging only as something to check on screen. |

Overall counts for Part A: (1) 0 blocks; (2) 5 blocks (M082, M104, M108, M130, M164); (3) 0; (4) 0 text-checkable (1 unverifiable key mark); (5) 2 blocks (M104, M108: single tick), no log scale, no uncovered range; (6) 5 blocks above (M008, M013, M037, M097, M102), 4 equal; (7) 17 blocks with products vs results mismatch, 18 with "hDT", 2 with the "listed below" suffix, 4 with "a–a" middle half.

## Part B: product-level value checks (1,112 non-retired grades of 1,180)

Full output with locators: `/private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/72c77321-f3e0-499c-927d-991f68ee2f5d/scratchpad/sweep/value-checks.txt`.

Counts: check 1 = 1 product; check 2 = 16 pairs; check 3 = 0; check 4 = 0; check 5 = 0.

### Check 1: hdt18 above hdt045 (1 product)

| Grade | Material | hdt18 | hdt045 | Measurements | Levels | Locators |
|---|---|---|---|---|---|---|
| G164-02 colorFabb PA Blue Metal Detectable | M164 Nylon, maker-undisclosed polyamide | 90 | 60 | V011126 / V011123 | comparable / as-published | "p. 1: Heat Deflection Temperature (A) °C" (load 1.8) / "p. 1: Heat Deflection temperature (amorphous) °C" (load null); both from R-COLORFABB-TDS-E-colorFabbPABlueMetalDetectable, printed specimens, post-processing not stated |

The 0.45 MPa figure comes from a sheet column labelled "(amorphous)" with no load recorded (level as-published, not comparable); the 1.8 MPa figure comes from the column labelled "(A)". So the two come from different columns of the sheet, and the inversion probably follows from that rather than from the load; the column meanings were not checked against the PDF. In Part A the M164 block shows "HDT at 1.8 MPa 0 —" with one special formulation at 90, which is likely this product.

### Check 2: Z/XY share outside 0.2-1.5, both comparable, same property and source (16 pairs, 1 tensile strength, 15 elongation, 0 modulus)

| Grade | Material | Property | Z value (id) | XY value (id) | Z/XY | Locators (Z / XY) |
|---|---|---|---|---|---|---|
| G048-02 BASF Forward AM Ultrafuse PAHT CF15 | M048 PAHT-CF | tensile strength | 18.2 (V002466) | 103.2 (V002465) | 0.18 | "p. 4: Tensile strength, print direction ZX Upright" / "... XY Flat" (R-FORWARDAM-PAHT-CF15-TDS-v4-0) |
| G040-01 Bambu Lab TPU for AMS | M162 TPU harder than 95A | elongation | 31 (V000780) | 650 (V000779) | 0.048 | "p. 2: Breaking Elongation Rate (Z)" / "(X-Y)" (B-tpu-for-ams-TDS; both annealed) |
| G093-02 Polymaker PolySmooth | M093 PVB | elongation | 2.8 (V002253) | 14.5 (V002252) | 0.19 | "p. 4: Elongation at break (Z)" / "(X-Y)" (S-POLYCN-PolySmooth-TDS-V5-4) |
| G076-02 BASF Forward AM Ultrafuse BVOH | M076 BVOH | elongation | 0.6 (V002265) | 14.8 (V002264) | 0.041 | "p. 3: Elongation at Break, ZX (upright)" / "XY (flat)" (S-BVOH-ULTRAFUSE-TDS-v1-3) |
| G008-02 eSUN PLA-Silk | M008 PLA Silk | elongation | 1.84 (V002315) | 11.65 (V002314) | 0.16 | "p. 2: Elongation at Break (Z)" / "(X-Y)" (S-ESUN-PLA-Silk-TDS-2025-06-19) |
| G018-05 Polymaker Polylite PLA CF | M018 PLA-CF | elongation | 0.9 (V003425) | 13.2 (V003424) | 0.068 | "p. 1: Elongation at break (Z)" / "(X-Y)" (S-POLYCN-TDS-Polymaker-Polylite-PLA-CF-V6-0-2026-06-09-EN) |
| G001-22 Polymaker PolyLite PLA PRO Army Beige | M001 PLA | elongation | 6.02 (V003596) | 2.45 (V015213) | 2.46 | "p. 5: Elongation at break (Z)" / "(X-Y)" (S-POLYCN-Polylite-PLA-Pro-EN-V5-1-3-6); Z above XY |
| G001-23 Polymaker PolyTerra PLA | M001 PLA | elongation | 0.9 (V003864) | 27.8 (V003863) | 0.032 | "p. 1: Elongation at break (Z)" / "(X-Y)" (S-POLYCN-TDS-PolyTerra-PLA-V6-0-2026-06-08-EN) |
| G057-03 Polymaker PolyMide CoPA | M057 PA6/66 | elongation | 1.3 (V003797) | 12.7 (V003796) | 0.10 | "p. 1: Elongation at break (Z)" / "(X-Y)" (S-POLYCN-TDS-Polymaker-PolyMide-CoPA-V5-5-2026-01-06-EN) |
| G001-25 Polymaker PolySonic PLA | M001 PLA | elongation | 4.2 (V003810) | 21.5 (V003809) | 0.195 | "p. 1: Elongation at break (Z)" / "(X-Y)" (S-POLYCN-TDS-PolySonic-PLA-V6-0-2026-06-08-EN) |
| G027-09 Polymaker ABS | M027 ABS | elongation | 3.1 (V002361) | 17.9 (V002360) | 0.17 | "p. 4: Elongation at break (Z)" / "(X-Y)" (S-POLYCN-PolyLite-ABS-TDS-V5-3) |
| G001-28 Polymaker PolyLite CosPLA Version A | M001 PLA | elongation | 1.1 (V003876) | 13.8 (V003875) | 0.080 | "p. 1: Elongation at break (Z)" / "(X-Y)" (S-POLYCN-TDS-Polymaker-PolyLite-CosPLA-Version-A-V5-5-2025-12-30-EN) |
| G001-30 Polymaker PLA Pro | M001 PLA | elongation | 3.05 (V003927) | 16.57 (V003926) | 0.18 | "p. 1: Elongation at break (Z)" / "(X-Y)" (S-POLYCN-TDS-Polymaker-PLA-Pro-v6-0-2026-01-30-EN) |
| G051-09 Polymaker FIBERON PA6 GF25 | M051 PA6-GF | elongation | 4 (V006467) | 2.4 (V006466) | 1.67 | "p. 1: Elongation at break (Z)" / "(X-Y)" (R-POLYMAKER-FIBERON-TDS-FIBERON-PA6-GF25-V1-1-EN; both annealed) |
| G001-82 Raise3D Premium PLA | M001 PLA | elongation | 6 (V014015) | 2.5 (V014009) | 2.4 | "p. 1: Elongation at break (%, Z)" / "(%, X - Y)" (D-RAISE3D-Raise3D-Premium-PLA-TDS-V6-0-EN); Z above XY |
| G156-01 eSUN ePA CF | M156 PA6/66-CF | elongation | 11.5 (V011522) | 7.42 (V011521) | 1.55 | "p. 1: Elongation at Break (Z) (%)" / "(XY) (%)" (S-ESUN-PRINT-20260928-333834d1b9db); specimen type "Not published (do not assume printed)" |

Reading: 11 of the 16 are the usual weak Z layer bond (Z elongation 3 to 25 percent of XY, where the sheet printed both), which are genuine sheet values and not data errors. The four where Z is above XY (G001-22 at 2.46, G001-82 at 2.4, G051-09 at 1.67, G156-01 at 1.55) are unusual for FDM and worth one look at the page: G001-22's XY value V015213 has an id far out of sequence with its Z partner V003596. They are listed as candidates to look at on the sheet, not confirmed errors; I did not open the PDFs.

### Check 3: tensileModulusZ above 1.3 x XY or tensileStrengthZ above 1.2 x XY, any source: 0 pairs

### Check 4: hdt18 with a load other than 1.8 MPa or direction Z, XZ, ZX: 0 products

### Check 5: tensileModulusZ / elongationZ whose measurement direction is not exactly Z: 0 values
