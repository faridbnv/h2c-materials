# Impact reader prompt (impact round, 2026-10-06)

> **Current** reference for this round: the prompt each page reader is given. The general rules and the CSV columns are
> the reader round's ([READING-SCHEMA.md](../2026-10-04-reader-round/READING-SCHEMA.md)); this prompt narrows the job to
> impact results.

Give a Claude Sonnet reader this text, with `{MANIFEST}` replaced by one batch manifest
(`.cache/readings/imp1/batches/batch-NN.json`) and `{OUTPUT}` by the CSV path the manifest names under `output`.

---

You are reading data sheets for a 3D-printing filament database. In this round you copy down, exactly as printed,
**every impact result** on the documents of one batch, with the conditions it was measured under, and you check the
impact rows the database already holds against the page. You are a reader, not an analyst.

**Batch manifest:** `{MANIFEST}` (JSON). **Write your readings to:** `{OUTPUT}`.
**Schema:** `docs/audits/2026-10-04-reader-round/READING-SCHEMA.md` (read it first: the 26 columns, their order and
their vocabularies).

## What to do, for each document in the manifest

1. Read its `held.json` (rows the database already holds from this document, with IDs, and the products the sheet
   names as GradeID + maker + product name). The impact rows are the measurements whose `Property` is `Charpy strength`,
   `Izod impact strength` or `Impact strength`.
2. Use `text.txt` (lines prefixed `[pN]`) to find the pages that mention an impact test: Charpy, Izod, impact,
   Schlagzähigkeit / Kerbschlag, udarność, resilienza / impatto, resistencia al impacto, résistance au choc, 冲击, 衝撃.
   Open each such page image `p-N.png` with the Read tool and read it whole. Also open any page whose text is empty or
   garbled (doubled letters, "(no text on this page)"). **The image wins** wherever it and the text differ. An HTML
   document has no image: read its `text.txt`.
3. Write one `kind=value` row for **every impact result** printed: each test (Charpy, Izod, unnamed "impact
   strength"), notched and unnotched, each direction or column (XY, Z, XZ, ZX, flat, upright), each moisture state (dry,
   conditioned), each temperature (+23 °C, -30 °C), each product on a multi-product sheet, in whatever unit it is
   printed (kJ/m², J/m, ft·lb/in, J/cm², kg·cm/cm). A cell printed as "no break", "NB" or "N" is a row too: write it in
   `raw`, leave the numbers empty, and say so in `note`.
   - `field`: `Charpy strength` when the row or its standard names Charpy (ISO 179, GB/T 1043); `Izod impact strength`
     when it names Izod (ISO 180, ASTM D256, GB/T 1843); `Impact strength` when the sheet names neither the test nor a
     standard. A different test is `unmapped:<label as printed>`: tensile impact (ISO 8256), falling-weight, Gardner,
     multiaxial or instrumented puncture.
   - The notch: copy the sheet's words into `label`, and add `notch=notched` or `notch=unnotched` to `test_conditions`
     **only where the sheet says it** (in the row, the column heading, or a method code such as 1eA / 1eU / 180/A /
     180/U, which you copy into `standard`). Never assume a notch.
   - Copy the standard, direction, specimen (printed / injection moulded), moisture and treatment words of that row or
     its heading. A temperature goes in `test_conditions` as `temp=23 °C`.
4. Write a `kind=context` row (`field=impact` or `field=all`) for a heading, footnote or sentence that states
   conditions for the impact results ("all specimens annealed at 50 °C for 8 h", "dry state", "printed specimens",
   "tests at 23 °C").
5. For **every held impact row** of the document, add a row with its `held_id` and `verdict` `confirms`, `mismatch`
   (the page's value in `raw` and the numbers) or `not-on-page`, and its `held_value`.
6. A document with no impact result on any page gets one `kind=none` row (page 1) whose `note` says so.
7. Write the CSV with the schema's header, one row per item, and stop: no summary, no analysis, no proposed fixes.

## Rules

- **Copy; never infer, convert or complete.** `number_lo`/`number_hi` are the digits printed, in the unit printed (a
  decimal comma becomes a dot; nothing else changes). Never convert J/m to kJ/m² or Izod to Charpy. If a cell is blank,
  "N/A" or "-", leave the number empty and copy what is printed into `raw`.
- **Conditions belong to the row**, from its own label or column, or from a heading or footnote that covers it (then
  also write that statement as a `context` row). If the sheet states none, leave the column empty.
- **Multi-product sheets:** `product` is the column heading as printed; set `grade_id` only when held.json's products
  make it certain.
- **Quote is evidence:** the verbatim text of the row, pieces joined with ` | `, the covering heading as a last piece.
  A paraphrased or corrected quote is thrown back.
- If you cannot read something, write the row with `confidence=low`, copy what you can, and say what is unreadable in
  `note`. Never guess a digit.
- `reader` is `sonnet-imp1-<batch>`.
- Edit no file except `{OUTPUT}`.

## Example rows

```csv
S-PVB-PCBlend-Prusament-TDS-2022-16-EN,2,value,Charpy strength,G035-15,PC Blend,Impact Strength Charpy Notched,12 ± 1,12,,kJ/m²,=,,printed,,,ISO 179-1,notch=notched,Mechanical properties,Impact Strength Charpy Notched [kJ/m ](5) 12 ± 1 12 ± 1 ISO 179-1,,new,,high,sonnet-imp1-batch-14,"two columns print 12 ± 1; the second column is read in its own row"
R-EXTRUDR-GAP2-20261005-020a6507944e,1,value,Charpy strength,G168-04,GreenTEC,Charpy unnotched impact strength (+23°C),228 kJ/m²,228,,kJ/m²,=,,,,,ISO 179-1eU,notch=unnotched; temp=23 °C,,Charpy unnotched impact strength (+23°C) | ISO 179-1eU | 228 kJ/m²,,new,,high,sonnet-imp1-batch-18,
```
