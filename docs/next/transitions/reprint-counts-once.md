# The reprint transition: a reprinted table counts once in a material's median

> **In short.** You ruled (OQ-09 A, 2026-10-20, R-OQ09d) that a table one maker reprints from another counts once in a
> material's median. This is that change, measured on today's data. It touches **129 headlines of 24 materials**
> (5448 database and answer differences in all, all listed in
> [`parity/transitions/2026-10-21-reprint-counts-once.json`](../../../parity/transitions/2026-10-21-reprint-counts-once.json)).
> **81 medians of 17 materials move.** No verdict moves for any material that has products on record. The only
> scenario answers that change are for two materials with no product on record, PA612 (M058) and PA612-GF (M060), through a side
> effect on their estimates: **511 of 5,306 questions change in some way, 9 change a group**, and the
> other 502 change only an estimated range in a sentence. **It needs your approval (Tier 1).** Two things need your eye before you approve: see
> "Two points for you" at the end.

**Status: waiting for your approval.** Nothing is merged until you attest it.

## What "a reprinted table" means in the data

I did not invent a rule. The database already says which products print one sheet: products of one material that share a
**Shared formulation key** are twins (D89, R053). The sheet's values are recorded once, and each twin *reads* its sibling's
value wherever its own record is silent (the product page says "data sheet shared with ..."). A product that reprints another
**material's** table shares no key and reads nothing (R166), so it is not affected.

Until now a twin counted as a product of its own in the material's median, so a table printed by two makers was counted twice.
Now the sibling's value counts and the twin's read of it does not. The twin is still a product (it still counts in "products",
still has its own page row, still passes or fails on that table), a value a twin records itself still counts, and only
comparable values of plain (non-variant) products are touched. Price is never read from a twin, so prices do not move.

Today the data has **214 such reads, in 24 materials and 129 headlines**. **106 are between different makers** (the case in your
ruling's words) and **108 are between products of one maker** (for example one maker's colours sharing one sheet). Both are
twins under D89 and are treated alike; see point 1 at the end.

## The worked example

PPS-GF (M074), tensile strength in the print plane: three products, Polymaker 64.1 MPa, IPCON 72 MPa, and QIDI 64.1 MPa, which
reprints Polymaker's table. Today the median of 64.1, 64.1 and 72 is **64.1 MPa**. With the reprint counted once the median of 64.1
and 72 is **68.05 MPa**. This is the figure gap-7 and OPEN-PROBLEMS name as "68.05 → 64.1": it is the **same pair of numbers, in the
opposite direction** to how those notes read. The data today gives 64.1 and the transition gives 68.05. The typical product stays
G074-02.

## What moves

- **129 headlines now count fewer values.** All of them also change the "values counted" figure on the page.
- **81 medians move** (17 materials); the other 48 headlines count one value fewer but the median is the same number.
  The quartiles of 82 headlines move as well.
- **The "typical product" changes in 47 headlines** (it is the product nearest the median); in 47 of them it is a different number.
- **The headline value a table, chart, compare view or export shows for the material is the median**, so those 81 values change on screen.
  They decide nothing: a material that has products is judged product by product, not on its median (D83). That is why no verdict moves for them.
- **5 written summaries** that quote a median change their number (M008 55 not 57, M035 118.5 not 123, M070 223.5 not 220, M073 251.75 not 251, M161 0.0266 not 0.027).
- **Estimates.** The estimate stage learns from each material's typical product, and the typical product moved, so 60 estimates
  of 41 materials move slightly, and 64 numbers in the estimate model's own calibration summary move (cases held out, coverage, signed error). This is a
  side effect of the ruling, not part of it. It is the reason answers change at all.

### Every median that moves

| Material | Headline | Median today | Median after | Change | Values counted (today / after) |
|---|---|---|---|---|---|
| M001 PLA | Tensile modulus (Z) | 1.9836 GPa | 2.0218 GPa | 1.9% | 29 / 28 |
| M001 PLA | Tensile strength (Z) | 30.275 MPa | 30 MPa | -0.9% | 40 / 39 |
| M001 PLA | Elongation at break (XY) | 6.3 % | 7.23 % | 14.8% | 73 / 71 |
| M001 PLA | Elongation at break (Z) | 2.89 % | 2.905 % | 0.5% | 35 / 34 |
| M001 PLA | Flexural modulus (XY) | 2.875 GPa | 2.8809 GPa | 0.2% | 71 / 68 |
| M001 PLA | Notched Charpy impact | 6 kJ/m² | 6.1 kJ/m² | 1.7% | 14 / 13 |
| M001 PLA | Glass transition (Tg) | 58.95 °C | 59 °C | 0.1% | 76 / 70 |
| M008 PLA Silk | Tensile modulus (XY) | 1.83 GPa | 1.8811 GPa | 2.8% | 11 / 8 |
| M008 PLA Silk | Tensile strength (XY) | 49.8 MPa | 46.318 MPa | -7.0% | 20 / 14 |
| M008 PLA Silk | Tensile strength (Z) | 14.73 MPa | 17.36 MPa | 17.9% | 12 / 9 |
| M008 PLA Silk | Elongation at break (Z) | 1.6 % | 1.7 % | 6.2% | 10 / 7 |
| M008 PLA Silk | Flexural modulus (XY) | 2.473 GPa | 2.46 GPa | -0.5% | 17 / 11 |
| M008 PLA Silk | Flexural strength (XY) | 76.17 MPa | 75.17 MPa | -1.3% | 18 / 12 |
| M008 PLA Silk | HDT at 0.45 MPa | 57 °C | 55 °C | -3.5% | 11 / 8 |
| M008 PLA Silk | Glass transition (Tg) | 60.9 °C | 58.95 °C | -3.2% | 18 / 10 |
| M020 PETG | Tensile modulus (XY) | 1.692 GPa | 1.7 GPa | 0.5% | 24 / 23 |
| M020 PETG | Flexural modulus (XY) | 1.925 GPa | 1.95 GPa | 1.3% | 30 / 29 |
| M020 PETG | Shore D hardness | 76 Shore D | 77.5 Shore D | 2.0% | 7 / 6 |
| M027 ABS | Tensile modulus (Z) | 1.9676 GPa | 2.0242 GPa | 2.9% | 9 / 8 |
| M027 ABS | Tensile strength (XY) | 34.47 MPa | 34.94 MPa | 1.4% | 18 / 17 |
| M027 ABS | Tensile strength (Z) | 27.25 MPa | 27 MPa | -0.9% | 12 / 11 |
| M027 ABS | Elongation at break (XY) | 10 % | 8.815 % | -11.9% | 17 / 16 |
| M027 ABS | Elongation at break (Z) | 3.1 % | 2.455 % | -20.8% | 11 / 10 |
| M027 ABS | Flexural modulus (XY) | 2.0525 GPa | 2.07 GPa | 0.9% | 16 / 15 |
| M027 ABS | Flexural modulus (Z) | 2.17 GPa | 2.19 GPa | 0.9% | 5 / 4 |
| M027 ABS | Flexural strength (XY) | 62.5 MPa | 63 MPa | 0.8% | 16 / 15 |
| M027 ABS | Flexural strength (Z) | 41.1 MPa | 41.17 MPa | 0.2% | 5 / 4 |
| M027 ABS | Notched Charpy impact | 20.03 kJ/m² | 19.015 kJ/m² | -5.1% | 7 / 6 |
| M027 ABS | HDT at 1.8 MPa | 85.5 °C | 86 °C | 0.6% | 16 / 15 |
| M033 ASA-CF | Density | 1095 kg/m³ | 1090 kg/m³ | -0.5% | 16 / 15 |
| M033 ASA-CF | HDT at 1.8 MPa | 95.8 °C | 96.55 °C | 0.8% | 5 / 4 |
| M035 PC | HDT at 0.45 MPa | 123 °C | 118.5 °C | -3.7% | 15 / 14 |
| M035 PC | HDT at 1.8 MPa | 121 °C | 119 °C | -1.7% | 11 / 10 |
| M046 TPC / TPEE | Shore D hardness | 37 Shore D | 40 Shore D | 8.1% | 8 / 7 |
| M050 PA6-CF | Density | 1175 kg/m³ | 1170 kg/m³ | -0.4% | 14 / 13 |
| M051 PA6-GF | Density | 1310 kg/m³ | 1289.5 kg/m³ | -1.6% | 9 / 8 |
| M070 PPA-CF | Density | 1220 kg/m³ | 1230 kg/m³ | 0.8% | 8 / 7 |
| M070 PPA-CF | Tensile modulus (XY) | 7.65 GPa | 8.2 GPa | 7.2% | 4 / 3 |
| M070 PPA-CF | Elongation at break (XY) | 3.35 % | 3.2 % | -4.5% | 4 / 3 |
| M070 PPA-CF | Flexural modulus (XY) | 7.1975 GPa | 7.895 GPa | 9.7% | 4 / 3 |
| M070 PPA-CF | Flexural modulus (Z) | 2.52 GPa | 2.88 GPa | 14.3% | 3 / 2 |
| M070 PPA-CF | Flexural strength (XY) | 209 MPa | 208 MPa | -0.5% | 4 / 3 |
| M070 PPA-CF | Flexural strength (Z) | 70 MPa | 66.5 MPa | -5.0% | 3 / 2 |
| M070 PPA-CF | HDT at 0.45 MPa | 220 °C | 223.5 °C | 1.6% | 5 / 4 |
| M073 PPS-CF | Density | 1295 kg/m³ | 1290 kg/m³ | -0.4% | 6 / 5 |
| M073 PPS-CF | Tensile modulus (XY) | 8 GPa | 7.73 GPa | -3.4% | 5 / 4 |
| M073 PPS-CF | Tensile strength (XY) | 87 MPa | 75 MPa | -13.8% | 5 / 4 |
| M073 PPS-CF | Elongation at break (XY) | 2.2 % | 1.8 % | -18.2% | 5 / 4 |
| M073 PPS-CF | Flexural modulus (XY) | 6 GPa | 6.09 GPa | 1.5% | 5 / 4 |
| M073 PPS-CF | Flexural modulus (Z) | 2.33 GPa | 2.46 GPa | 5.6% | 4 / 3 |
| M073 PPS-CF | Flexural strength (XY) | 125 MPa | 111.6 MPa | -10.7% | 5 / 4 |
| M073 PPS-CF | Flexural strength (Z) | 43 MPa | 36 MPa | -16.3% | 4 / 3 |
| M073 PPS-CF | Notched Izod impact | 7 kJ/m² | 5 kJ/m² | -28.6% | 3 / 2 |
| M073 PPS-CF | HDT at 0.45 MPa | 251 °C | 251.75 °C | 0.3% | 5 / 4 |
| M074 PPS-GF | Tensile modulus (XY) | 4.552 GPa | 5.158 GPa | 13.3% | 3 / 2 |
| M074 PPS-GF | Tensile modulus (Z) | 2.5572 GPa | 2.5691 GPa | 0.5% | 3 / 2 |
| M074 PPS-GF | Tensile strength (XY) | 64.1 MPa | 68.05 MPa | 6.2% | 3 / 2 |
| M074 PPS-GF | Tensile strength (Z) | 22.9 MPa | 32.45 MPa | 41.7% | 3 / 2 |
| M074 PPS-GF | Elongation at break (XY) | 2 % | 1.8 % | -10.0% | 3 / 2 |
| M074 PPS-GF | Elongation at break (Z) | 1.1 % | 0.9 % | -18.2% | 3 / 2 |
| M074 PPS-GF | Flexural modulus (XY) | 4.1107 GPa | 4.3204 GPa | 5.1% | 3 / 2 |
| M074 PPS-GF | Flexural modulus (Z) | 2.6057 GPa | 2.4089 GPa | -7.6% | 3 / 2 |
| M074 PPS-GF | Flexural strength (XY) | 102.3 MPa | 107.15 MPa | 4.7% | 3 / 2 |
| M074 PPS-GF | Flexural strength (Z) | 45.7 MPa | 51.85 MPa | 13.5% | 3 / 2 |
| M086 OBC | Tensile strength (Z) | 11 MPa | 10.5 MPa | -4.5% | 3 / 2 |
| M086 OBC | Elongation at break (Z) | 480 % | 265 % | -44.8% | 3 / 2 |
| M086 OBC | Flexural modulus (XY) | 0.244 GPa | 0.272 GPa | 11.5% | 3 / 2 |
| M086 OBC | Flexural modulus (Z) | 0.217 GPa | 0.2085 GPa | -3.9% | 3 / 2 |
| M086 OBC | Flexural strength (XY) | 7.8 MPa | 9.4 MPa | 20.5% | 3 / 2 |
| M086 OBC | Flexural strength (Z) | 6.8 MPa | 7.9 MPa | 16.2% | 3 / 2 |
| M088 PCTG | Notched Izod impact | 93 kJ/m² | 50.5 kJ/m² | -45.7% | 5 / 2 |
| M088 PCTG | Glass transition (Tg) | 84 °C | 84.5 °C | 0.6% | 7 / 4 |
| M099 PEI / ULTEM | Density | 1307.5 kg/m³ | 1275 kg/m³ | -2.5% | 12 / 11 |
| M099 PEI / ULTEM | Tensile strength (XY) | 59 MPa | 56 MPa | -5.1% | 8 / 7 |
| M099 PEI / ULTEM | Flexural strength (XY) | 110 MPa | 104 MPa | -5.5% | 7 / 6 |
| M159 TPU 85A class and softer | Density | 1180 kg/m³ | 1160 kg/m³ | -1.7% | 15 / 13 |
| M161 TPU 95A class | Density | 1210 kg/m³ | 1205 kg/m³ | -0.4% | 25 / 22 |
| M161 TPU 95A class | Tensile modulus (XY) | 0.027 GPa | 0.0266 GPa | -1.5% | 11 / 10 |
| M161 TPU 95A class | Tensile strength (XY) | 29 MPa | 30 MPa | 3.4% | 17 / 16 |
| M161 TPU 95A class | Tensile strength (Z) | 22 MPa | 20.25 MPa | -8.0% | 5 / 4 |
| M161 TPU 95A class | Elongation at break (XY) | 501.3 % | 540.65 % | 7.8% | 13 / 12 |

### Headlines that count fewer values, with the median unchanged (48)

M001 PLA: Density (155 to 145 values); M001 PLA: Tensile modulus (XY) (61 to 59 values); M001 PLA: Tensile strength (XY) (83 to 81 values); M001 PLA: Flexural strength (XY) (76 to 74 values); M008 PLA Silk: Density (29 to 20 values); M008 PLA Silk: Tensile modulus (Z) (8 to 5 values); M008 PLA Silk: Elongation at break (XY) (19 to 13 values); M008 PLA Silk: Notched Izod impact (6 to 3 values); M020 PETG: Density (59 to 55 values); M020 PETG: Tensile strength (XY) (34 to 33 values); M020 PETG: Flexural strength (XY) (31 to 30 values); M020 PETG: Notched Charpy impact (10 to 9 values); M020 PETG: HDT at 0.45 MPa (32 to 30 values); M020 PETG: HDT at 1.8 MPa (14 to 13 values); M020 PETG: Glass transition (Tg) (31 to 30 values); M027 ABS: Density (46 to 43 values); M027 ABS: Tensile modulus (XY) (13 to 12 values); M027 ABS: HDT at 0.45 MPa (18 to 17 values); M027 ABS: Glass transition (Tg) (20 to 19 values); M031 ASA: Density (34 to 33 values); M031 ASA: HDT at 1.8 MPa (14 to 12 values); M035 PC: Density (19 to 18 values); M046 TPC / TPEE: Density (10 to 9 values); M046 TPC / TPEE: Elongation at break (XY) (4 to 3 values); M052 PA12: Density (6 to 5 values); M057 PA6/66: Density (7 to 6 values); M070 PPA-CF: Tensile strength (XY) (4 to 3 values); M070 PPA-CF: Notched Izod impact (2 to 1 values); M074 PPS-GF: Density (3 to 2 values); M074 PPS-GF: Notched Charpy impact (2 to 1 values); M074 PPS-GF: HDT at 0.45 MPa (2 to 1 values); M074 PPS-GF: HDT at 1.8 MPa (2 to 1 values); M074 PPS-GF: Glass transition (Tg) (2 to 1 values); M081 HIPS: Density (10 to 9 values); M086 OBC: Glass transition (Tg) (2 to 1 values); M086 OBC: Shore D hardness (2 to 1 values); M088 PCTG: Density (7 to 5 values); M088 PCTG: HDT at 0.45 MPa (5 to 4 values); M088 PCTG: Shore D hardness (4 to 1 values); M094 PC-ABS: Density (12 to 11 values); M099 PEI / ULTEM: Notched Charpy impact (2 to 1 values); M099 PEI / ULTEM: Glass transition (Tg) (6 to 5 values); M110 PCTG-GF: Density (3 to 2 values); M110 PCTG-GF: HDT at 0.45 MPa (2 to 1 values); M110 PCTG-GF: HDT at 1.8 MPa (2 to 1 values); M113 ASA-AF: Density (3 to 2 values); M159 TPU 85A class and softer: Shore A hardness (14 to 12 values); M161 TPU 95A class: Shore A hardness (15 to 14 values).

## Which scenario answers change

The check asked 5,306 questions (6 starting templates in 5 modes, the 138-case decision census with estimates on and off, and 5,000
seeded random scenarios). Old tool against the new tool built with this change:

| | Questions | Of which changed |
|---|---|---|
| Templates | 10 of 30 | 10 |
| Census | 58 of 276 | 58 |
| Random scenarios | 443 of 5,000 | 443 |
| **All** | **511 of 5,306** | |

- **Only two materials are involved, and neither has a product on record:** PA612 (M058) in 511 questions and PA612-GF (M060) in 271.
  A material with no product is judged on its own estimate, and that estimate moved a little (for example "Estimated 1.08 to 3.66 GPa" becomes "1.08 to 3.67 GPa").
- **502 questions change only the wording and the stored range** of that estimate. Nothing about the verdict.
- **9 questions change an answer.** PA612 (M058) was hidden from the list in them (screened out by its estimate) and becomes
  "not enough data" and listed, so the candidate count rises by one, the "screened" count falls by one, and the list positions of the
  materials below it shift by one. The 9 are random scenarios 0320, 0897, 1474, 2051, 2628, 3205, 3782, 4359, 4936.
- **No other material's verdict, group, best product, likely tag or listing changes.** The 17 materials whose medians moved give identical answers.
- **Links, tie order and saved scenarios are unchanged** (both sides read the same data there).

## What does not change

Every other path of the database is identical to the old build: 1,288,896 values compared, 1515 differ, all of them listed in the transition file.
The material pages are not compared yet (their new renderer is WP-24); they will show the new medians and the banner on the preview names this change.

## Two points for you

1. **Same maker or different makers?** Your ruling says a table "one maker reprints from another". The data's twin rule (D89) also covers one maker's
   products that share a sheet (108 of the 214 reads). I followed the data's rule rather than invent a narrower one. If you want same-maker twins to keep
   counting, say so and the transition is re-measured with only cross-maker reads.
2. **The estimate side effect.** The ruling is about medians, but the estimate stage learns from each material's typical product, and the typical product
   follows the median. That is what moves PA612 and PA612-GF. The alternative is to keep the estimate stage on the old typical product, which would make the
   transition touch medians and nothing else, at the price of an estimate that no longer reads the same number the page shows. I did not choose that; it is
   your call.

**Your answers (2026-10-21).**

- **Point 1:** yes, a shared sheet counts once whoever sells it; same-maker twins are included.
- **Point 2:** accepted; the estimates follow the corrected medians, and PA612 and PA612-GF move as measured.

The transition stands as measured.

Also noted: the release ID (`7c6da496722d`) does not change with this, because it hashes the old build files only (defect WP20-D1). It must be fixed before cutover.

## How it was measured

`npm run parity -- --milestone --surface engine,build` with the new side reading the database the new build wrote (the harness change in this PR),
run against an empty transitions folder. The file's digest (`sha256:6ffeebe29246438fd946f72f55350c61ec5403721dc7d80d16e5ba95bd34922b`) is computed from the sorted list of those 5448
differences, and a normal run passes only when it observes exactly that list: one more or one fewer fails.
