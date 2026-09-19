# Second read of the Spectrum import (b01, b02)

A second reviewer's re-read of a seeded random sample of the rows applied by `m53-batch-b01-spectrum`
and `m54-batch-b02-spectrum`, each against the page its Locator names. Read-only: nothing was changed.

- **Seed: 20260918**, mulberry32, groups keyed `batch|property`, each group shuffled, then taken
  round-robin across groups until 60 rows. Re-derivable; the sampler is in the report's method note below.
- **Rows checked: 60** (27 from b01, 33 from b02), spanning 21 properties and 31 documents.
- **Grades whose material is new: 10 checked** (M104–M113 / G104-01…G113-01). The task named 11; the
  data holds ten: `materials.csv` ends at M113 and every one of those materials has exactly one grade.
- **Rows that disagree with the page: 12 of 60.** Three are a wrong document (the values are not on the
  cited sheet at all); nine record a value correctly but drop or mis-read a condition the sheet states.
- Two whole-import checks were also run and are reported at the end: every one of the 488 applied rows
  was checked for `Raw numeric × Conversion factor = Normalized value` (no mismatch, 0/488) and for
  whether the cited document's SHA-256 matches the document the proposal was read from (one mismatch).

Nothing here is fixed. Findings are grouped by cause; each names the sampled MeasurementIDs and, where
the same cause reaches beyond the sample, the full extent.

---

## 1. Nine rows on G082-03 cite a document that does not print them (3 in the sample)

**MeasurementIDs (sampled): V002771, V002772, V002773. Same defect, not sampled: V002766, V002767,
V002768, V002769, V002770, V002774.**
**doc_key cited: `13f9c367399140b0`** (`S-SPECTRUM-en-tds-spectrum-pp`, SHA-256 `13f9c367…`,
`https://spectrumfilaments.com/wp-content/uploads/2022/05/en_tds_spectrum_pp.pdf`)
**doc_key actually read: `42aa71b93b904c2c`** (`…/uploads/2025/11/en_tds_spectrum_pp.pdf`, SHA-256 `42aa71b9…`)

What the rows hold:

| ID | Property | Raw value | Locator |
|----|----------|-----------|---------|
| V002771 | Elongation at yield | `20 %` | `p. 1: Elongation at Yield` |
| V002772 | Elongation at break | `637 %` | `p. 1: Elongation at Break` |
| V002773 | Flexural modulus | `400 Mpa` | `p. 1: Flexural Modulus` |

The cited document (2022 sheet, `13f9c367399140b0`) prints no line with any of those labels or numbers.
Its whole mechanical block is:

```json
"Tensile strength (dry, at 50 mm/min) 17 MPa ISO 527"
"Elongation at max. force (dry, at 50 mm/min) 6,00% ISO 527"
"Elongation at break (dry, at 50 mm/min) 500,00% ISO 527"
"Flexural modulus (dry, at 2 mm/min) 0.95 GPa ISO 178"
"Charpy impact strength, notched (dry) 65 kJ/m2 ISO 179 1eA"
```

The values come from the 2025 sheet, `42aa71b93b904c2c`, which prints:

```json
"Elongation at Yield 20%"
"Elongation at Break 637%"
"Flexural Modulus 400 Mpa"
```

Cause: the proposal `proposals/b02-spectrum/42aa71b93b904c2c.json` proposes a source row with
`"SourceID":"S-SPECTRUM-en-tds-spectrum-pp"` and `"SHA256":"42aa71b93b904c2c…"`, but that SourceID was
already taken by the 2022 sheet. `sources.csv` still carries the 2022 SHA-256 and the 2022 URL for that
ID, so all nine applied rows now point at a document that does not print them. (The same import handled
the parallel case correctly for LW-PLA UltraFoam, where the two revisions got two SourceIDs,
`S-SPECTRUM-EN-TDS-Spectrum-LW-PLA-UltraFoam` and `S-SPECTRUM-en-tds-spectrum-lw-pla-ultrafoam`.)

Two consequences beyond traceability: grade G082-03 now holds two contradictory readings of the same
property from what the data says is one document (density `0.89 g/cm3` vs `0.9 g/cm3`; flexural modulus
`0.95 GPa` vs `400 Mpa`; elongation at break `500,00 %` vs `637 %`; Vicat `135 °C` vs `103 °C`), and the
2025 document is registered nowhere, so `audit:sources` cannot re-read it.

**Confidence: certain.** The cited document's cached text contains neither the labels nor the numbers,
and the proposal file names the other SHA-256 explicitly.

---

## 2. "*injection moulding" footnotes are ignored: no row is "Raw material value" (7 in the sample)

**MeasurementIDs (sampled): V003120, V003124 (ASA Kevlar, `f96ac4bf4e31ba15`); V003056, V003057
(PLA Conductive, `bf38c474a2d2d608`); V002680, V002681, V002683 (PET-G FR V0, `211e4808926d01ad`).**

Each of these rows carries `Specimen type = "Not published (do not assume printed)"`. The sheets say
otherwise. ASA Kevlar prints the starred rows and then the footnote:

```json
"Tensile Elongation at Break* 6,00% ISO 527 (1)"
"VICAT Softening point* 50N 94°C ISO 306"
"*injection moulding"
```

PLA Conductive:

```json
"Tensile strength At yield (5 mm/min)* 31,2 MPa ISO 527 (1)"
"Tensile strength At break (5 mm/min)* 24,6 MPa ISO 527 (1)"
"* at 23°C, injection moulding"
```

PET-G FR V0:

```json
"Tensile Strength at Yield** 40 MPa ISO 527 (1)"
"Tensile Strength at Break** 25 MPa ISO 527 (1)"
"VICAT Softening point**** 70°C ISO 306"
"*injection moulding ***(speed 1 mm/min), injection moulding"
"**(speed 5mm/min), injection moulding ****50 N (heating rate 50°C/h), injection moulding"
```

`schema/vocab/specimen-types.csv` has `Raw material value` (Form `moulded`) for exactly this, and the
repository has already made this correction once by migration: V001348's note reads "the sheet marks
this value '*injection moulding'", and it is `Raw material value`. **Not one of the 488 applied rows uses
`Raw material value`** (426 are "Not published (do not assume printed)", 62 the density variant), while
83 applied rows sit on nine sheets whose text says "injection moulding": `211e4808926d01ad` (petg frv0),
`1fba88b90bf49902` (asa conductive), `30479e7db3a80770` (abs kevlar), `52a4ad4d7a612cf6` (asax cf10),
`8405e74003dd0e72` (petg ptfe), `948680b68ccfc2b1` (petg matt), `bf38c474a2d2d608` (pla conductive),
`c21d545a06458716` (pc ptfe), `f96ac4bf4e31ba15` (asa kevlar). Three of those rows (V002751, V002753,
V002754) even carry "injection moulding" inside their own Locator and are still filed as specimen
unknown.

This is the finding with the most reach: a moulded value read as possibly-printed is a value the build
may treat as the grade's own printed performance.

**Confidence: certain for the seven sampled rows** (the asterisk is on the row and the footnote is on
the page); **high** for the wider 83.

---

## 3. The PLA Pro sheet's "annealed" footnote is dropped (1 in the sample)

**MeasurementID: V003108. doc_key `ea2acdbdfe690892`.**

The row holds `Raw value "40 Mpa"`, `Post-processing "Not published"`, `Post-processing state
"not-stated"`, `Anneal °C "Not applicable"`, `Anneal h "Not applicable"`, `Specimen type "Not published
(do not assume printed)"`, `Direction "Unstated"`, `Specimen / print parameters "Not published"`.

The page carries the asterisk on the table heading and spells the footnote out:

```json
"Mechanical Properties* ASTM Method"
"Tensile Strength 40 Mpa D 638"
"Thermal Properties*"
"* 3D printed at 100% infill and annealed at 110°C/20 min, XY axis"
```

So the sheet states: printed, 100% infill, XY, annealed 110 °C for 20 min. The value is right; the
condition is lost, and an annealed value that the data calls "not-stated" can be selected for a headline
that the rules say an annealed value may not back. The whole starred block is affected
(V003108–V003115), as is Huracan PLA `45c6c6fe967a6d68`, whose `"* annealed"` footnote is dropped from
V002789 even though its Locator keeps the asterisk (`p. 1: Heat Distortion Temperature*`).

**Confidence: certain.** The asterisk, the heading and the footnote are all in the page text.

---

## 4. The "*dry" footnote on the PA6 Low Warp sheets is dropped (5 in the sample)

**MeasurementIDs: V002713, V002715, V002717 (GF30, `305887dac7d7924e`); V002725, V002730 (CF15S,
`32ab1078b68ab34b`).** All five hold `Moisture condition "Not published"` / `Moisture state "not-stated"`.

Both sheets star the mechanical table and footnote it:

```json
"Mechanical properties*"
"Tensile strength (23 ºC, 50 mm/min) 80 MPa EN ISO 527-1"
"Elongation at break (23 ºC, 50 mm/min) >3 % EN ISO 527-1"
"Flexural Strength (23 ºC, 2 mm/min) 125 MPa EN ISO 178"
"*dry"
```

The same reader does record `Moisture state dry` when the word is inside the row's own label (the PP
sheet's "(dry, at 50 mm/min)" rows, V002669/V002671/V002672, are correct), so this is specifically a
footnote-scope miss. Beyond the sample it also hits ecoPET 9021 (`83d552de21a3b9c8`), where
`"Tensile Strength* 55 Mpa ISO 527"` with `"* (dry, @ 50 mm/min)"` leaves V002917 not-stated while its
neighbour V002919, labelled inline, is `dry`.

**Confidence: high.** Values and numbers are right; only the declared state is missing.

---

## 5. "23 ºC" written with U+00BA is not read as a test temperature (5 in the sample)

**MeasurementIDs (sampled): V002712, V002713, V002715, V002717, V002725.** Twelve rows in all:
V002712–V002717 (G051-04) and V002723–V002728 (G050-03).

Each holds `Test temperature "Not published"` while its own `Standard / load` keeps the sheet's text,
for example V002717: `"23 ºC 2 mm/min ISO 178"`, Locator `p. 1: Flexural Strength (23 ºC, 2 mm/min)`.
The page line is:

```json
"Flexural Strength (23 ºC, 2 mm/min) 125 MPa EN ISO 178"
```

The two PA6 Low Warp sheets type the degree sign as U+00BA (masculine ordinal) rather than U+00B0. Every
sheet that uses U+00B0 has its temperature captured (48 rows hold `23°C`). The temperature is printed on
the page and belongs in the row.

**Confidence: high** (the character difference is visible in the cached text, and the miss is complete
and exclusive to the two sheets that use it).

---

## 6. A DSC heating rate recorded as the test temperature (1 in the sample)

**MeasurementID: V002993. doc_key `9b0714c1071e70da`.** The row holds `Test temperature "10°C"`.

```json
"Melting temperature (DSC), 10°C/min 185°C ISO 3146"
```

`10°C/min` is the DSC scan rate, not a test temperature; the sheet states no test temperature for this
row. The value (185 °C) and the standard (ISO 3146) are right. This is the only row of the 488 whose
Test temperature was taken from a per-minute rate.

**Confidence: certain.**

---

## 7. A two-column line read as one value, with no record of which column (1 in the sample)

**MeasurementID: V002839. doc_key `559c536081e1dd49` (LW-PLA UltraFoam).** The row holds
`Raw value "3250 MPa"` → 3.25 GPa, `Specimen / print parameters "Not published"`, Locator
`p. 1: Tensile Modulus`.

The page prints two columns, solid and foamed, under one density header:

```json
"Density"
"0.40 - 1.24 g/cm3"
"@ 210°C; 100% Flow @ 255°C; 60% Flow"
"Tensile Modulus 3250 MPa 920 MPa ISO 527"
"Tensile strain at break 8% 13.97% ISO 527"
```

The proposal's own evidence line for this row is the full `"Tensile Modulus 3250 MPa 920 MPa ISO 527"`;
the reader took the first number and the reviewer accepted it at confidence 1. Nothing in the row says
which print condition the 3250 MPa belongs to, which is what MEAS-CONDITIONS-INDISTINCT is for, and the
foamed column (920 MPa, 13.97 %) is not recorded anywhere. The same proposal skipped two real Charpy
results as "the upper end of a range" when the `-` is in fact the empty foamed column:

```json
"unnotched (at 23°C) - 5.70 kJ/m2 ISO 179-1eU"
"notched (at 23°C) - 4.32 kJ/m2 ISO 179-1eA"
```

**Confidence: high** that the condition is unrecorded (certain from the page); **medium** on which column
3250 MPa is — the layout implies the unfoamed one, but the row should say so rather than leave it open.

---

## 8. "from 200 °C" recorded as an equality (1 in the sample)

**MeasurementID: V003048. doc_key `bd748fc3e51a9e35` (LW-ASA UltraFoam).** The row holds `Raw value
"200 °C"`, `Operator "="`, Locator `p. 1: Melting temperature from`.

```json
"Melting temperature from 200 °C"
```

The sheet gives a bound, not a point; the Locator preserves the word "from" but the Operator does not.
The same reading appears in V002982 (`"Melting temperature from 160 °C"`) and, in the other direction,
V002983 and V003049 (`"Heat deflection temperature of printed parts up to 55 °C"` / `80 °C` recorded as
`=`). The import does use `>` correctly where the sheet prints the symbol (V002715 for `>3 %`), so the
word forms are what it misses.

**Confidence: medium-high.** The number is as printed; the question is whether "from"/"up to" must set
an Operator. The project's own rule — a bound "limits the estimate, never becomes a point" — says it must.

---

## 9. Grade "Composition / filler" left "Not published" where the sheet states the filler (5 grades)

The polymer and the filler that each new material claims are, in every one of the ten cases, what the
sheet says. Checked line by line:

| Material | Claims | The sheet's words |
|---|---|---|
| M104 PA6-CE | PA6 / Ceramic | `"flame-resistant construction material based on"` … `"polyamide 6. The applied ceramic fillers enhance"` |
| M105 ASA-EC | ASA / Electrically conductive | `"The filament is based on a durable ASA polymer"` … `"enriched with carbon nanotubes (CNT), which"` … `"provide very low surface resistivity"` |
| M106 ABS-AF | ABS / Aramid fibre | `"Spectrum ABS Kevlar is a structural composite"` … `"filament based on ABS with the addition of aramid"` … `"fibers, commonly known as Kevlar."` |
| M107 PLA-ESD | PLA / ESD formulation | `"Spectrum PLA ESD is a modern, antistatic 3D print-"` … `"ing filament based on a modified PLA biopolymer"` |
| M108 PA6-GS | PA6 / Glass spheres | `"Filament Spectrum PA6 GK10 is a new, high-temper-"` … `"ature PA6-based construction material"` … `"Filled with hollow glass spheres"` |
| M109 PETG-PTFE | PETG / PTFE | `"As the basis for the material, we used PETG"` … `"properties, supplemented by adding 10% PTFE,"` |
| M110 PCTG-GF | PCTG / Glass fibre | `"Spectrum PCTG GF10 is a glass fibres reinforced ma-"` … `"terial based on high-impact PCTG."` |
| M111 PLA-EC | PLA / Electrically conductive | `"material is based on a PLA polymer modified with"` … `"carbon nanotubes (CNT), which significantly reduce"` |
| M112 PC-PTFE | PC / PTFE | `"Spectrum PC/PTFE is an advanced polycar-"` … `"bonate-based (PC) composite filament with the"` … `"addition of PTFE commonly known as teflon."` |
| M113 ASA-AF | ASA / Aramid fibre | `"composite material based on a combination of ASA"` … `"copolymer and aramid fibres."` and `"• Aramid fibers reinforced (10%)"` |

No false claim. The defect is one level down: **G105-01, G106-01, G109-01, G111-01 and G113-01 all hold
`Composition / filler = "Not published"`** although their sheets print what the filler is and, in three
cases, how much of it there is — `"• Aramid fibers reinforced (10%)"` (ASA Kevlar), `"• 10% PTFE content"`
(PETG/PTFE), `"enriched with carbon nanotubes (CNT)"` (ASA Conductive), `"modified with carbon nanotubes
(CNT)"` (PLA Conductive), `"• material enriched with aramid fibres"` (ABS Kevlar). The same importer did
fill it for G110-01 (`"• 10% glass fibers (p. 1, as the sheet states it)"`), so the omission is
inconsistent rather than principled. `Modifier / filler` itself is fine: "Electrically conductive" is the
vocabulary's own value and the CNT detail is what `Composition / filler` is for.

**Confidence: high** that the sheets state it; **medium** on whether the importer was required to carry it.

---

## 10. Minor, low confidence: an "Izod" label filed as generic "Impact strength"

**MeasurementID: V002931. doc_key `8a231046d75a214d` (PCTG GF10).** The row holds Property
`"Impact strength"`, Notch `Unnotched`, `45 kJ/m²`, Standards `ISO 179`.

```json
"Izod Impact Strenght"
"Unnotched @ 23°C 45kJ/m2 ISO 179-1eU"
```

The sheet's label says Izod; the standard it prints (ISO 179-1eU) is Charpy. The row resolves the
contradiction by using neither name. That is defensible and the value, notch, temperature and standard
are all right, but the choice is undocumented — `Parse review` is "Not applicable" — and a comparable
row on another sheet (V002920, `"Impact strength, dry 28kJ/m2 ISO 179 1eU"`) was filed as
`Charpy strength`. Flagged for consistency, not as a wrong number.

**Confidence: low** — a judgement call, noted so it is a decision rather than an accident.

---

## What was checked and found sound

- **Arithmetic: 0 errors in 488 rows.** `Raw numeric × Conversion factor = Normalized value` holds
  exactly for every applied row, including the awkward ones: V002879 `630 kg/cm2 × 0.0980665 =
  61.781895 MPa`, V002882 `24 000 kg/cm2 × 0.0000980665 = 2.353596 GPa` (with the European decimal
  separator explained in the Raw value), V002773 `400 × 0.001 = 0.4 GPa`. Upper bounds convert with the
  same factor (V002693 `55-60 °C` → 55/60; V003107 `9-15 g/10 min` → 9/15).
- **Numbers and units.** Of the 60 sampled rows, 57 print exactly as the row records them; the three
  exceptions are finding 1, where the number is right but the document is not.
- **Neighbouring-row contamination: none found.** The rows most at risk were read correctly — V002656
  takes the `-40°C` Izod (57 J/m) and not the 23 °C one (126 J/m); V003047 takes the 6.4 mm bar
  (320 J/m) and not the 3.2 mm one (405 J/m); V002730 takes `Notched @ 23°C 4 kJ/m2` and not the
  unnotched 60; V002920 is the impact row, not the flexural row above it. No value was picked up from
  the marketing column that shares the page's lines.
- **Sourcing, all 488 rows.** Every applied row's SourceID resolves to a `sources.csv` row whose SHA-256
  is in the ledger, and for every proposal the source row's SHA-256 matches the table's — with the single
  exception in finding 1.
- **Implausible values are already flagged.** V002818 (`"Flexural Modulus 3.8 MPa D790"` beside
  `"Tensile Modulus 3.5 Gpa D 882"`) and V002981 (`3.6 MPa`) both carry Data status "Published value
  (physically implausible)" with the reasoning in Notes. Transcribed as printed, classified correctly.
- **Bounds from symbols.** `<0.3%` water absorption (V002666, V002855, V003033) and `>3 %` elongation
  (V002715) all carry the operator.
- **HDT load pairs.** Where a sheet prints HDT at two loads, the applied rows keep them apart and carry
  Test load MPa (for example G051-04: `"1.8 MPa 65°C ISO 75 -1/-2"` and `"0.45 MPa 180°C ISO 75 -1/-2"`).

## Method note

The sample was drawn by a throwaway script, not committed: mulberry32 seeded with 20260918; the 488
applied rows grouped by `batch|property`; the group keys sorted then shuffled; each group shuffled; rows
taken round-robin across groups until 60. Document text came from `scripts/lib/pdf-text.mjs`
(`cachedText` + `allLines`) keyed by the SHA-256 in `sources.csv`, so every quotation above is the
cached text of the document the row itself cites, except where finding 1 names the other document.
