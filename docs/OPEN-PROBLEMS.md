# Open problems

What is known to be wrong or missing in this database, as of the 2026-09-16 snapshot. It is here so that nobody
has to rediscover it, and so that a reader can tell a gap that is being worked on from one nobody has noticed.

Everything below is derived from the data, not remembered. Each item gives the command that re-derives its figure,
so a stale number here is findable rather than believable. Run `npm run db:sqlite` first for the SQL ones.

Two things this page is not. It is not the check list: every rule the build enforces is in [RULES.md](RULES.md),
generated. It is not the audit history: what each review found and what happened to it is in [audits/](audits/).

---

## 1. Transcription damage: 133 measurements carry the wrong text in `Standard / load`

**The most serious item here.** 133 rows, across 56 sources and 56 materials, hold a fragment of the neighbouring
column instead of the test standard:

```
Modulus · Strength · Elongation · Deflection · Temperature · Transition Temperature · (X-Y)
ter Absorption Rate 25 °C, 55% RH · te 25 °C, 55% RH · ate 25 °C, 55% RH · ption 25 °C, 55% RH
rated Water Absorption Rate 25 °C, 55% RH · tion Rate 25 °C, 55% RH, room air
DSC, · ISO · ISO 179, · ASTM · N/A · Prusa Polymers
```

Most are Bambu Lab data sheets, whose properties table is `Subjects | Testing Methods | Data`. The original
extraction took the tail of the Subject and the head of the Testing Method, so "Glass Transition Temperature |
DSC, 10 °C/min" became "Transition Temperature". The **values are not affected** — those come from the Data
column and reconcile against their raw text on every build — only the standard they were tested to.

Since m49 the typed `Standards` column reads these as naming no standard, which is true of the text as it stands,
so nothing downstream infers a standard from them. No headline or estimate depends on the field.

**The fix** is to re-read each source and correct the raw text (D35), matching each measurement to its sheet row by
the Data cell, which identifies the row beyond doubt. The sources are cached under `.cache/sources/` and
hash-matched, so no new retrieval is needed. It was deliberately not done during the 2026-09-17 model freeze:
every one of those rows has an obvious-looking answer, and a standard nobody read off a sheet is exactly what this
database exists not to hold.

```bash
npm run sql --silent -- "select sourceid, count(*) n, group_concat(distinct standard_load) from measurements
  where standards = 'Not published' and standard_load in ('Modulus','Strength','Elongation','Deflection',
  'Temperature','Transition Temperature','(X-Y)','DSC,','ISO','ISO 179,','ASTM','N/A','Prusa Polymers')
  group by 1 order by n desc"
```

A further **18 rows** say only `Method A` or `Method B`, which are ISO 75's methods (A is 1.80 MPa, B is 0.45 MPa).
The load is typed correctly in `Test load MPa`; only the standard is unnamed. Same fix, smaller.

---

## 2. Ten published values that physics rules out

Kept, flagged, and backing nothing: no headline, estimate, conversion, implied bound or plot point (D55). Each is
what the source really prints, with the reason in its Notes.

| Measurement | Material | What is wrong |
|---|---|---|
| V000008 | PLA | 80 °C at 0.45 MPa for a PLA the sheet never says was annealed or nucleated; as printed it deflects at 50 to 65 °C |
| V000682, V000683 | PC | 0.45 MPa deflects at 112 °C and 1.8 MPa at 117 °C on the same sheet; a lighter load cannot deflect a bar at a lower temperature |
| V000765, V000766 | TPU | as above, on the iSANMATE sheet |
| V000775, V000776 | TPU for AMS | a modulus its own hardness and elongation contradict |
| V000970, V001013, V001206 | PA12-CF, PA12-GF, PA-ESD | a glass transition of 158 °C for a PA12, whose glass transition is 40 to 55 °C; a template value left in three sheets |
| V001159, V000508, V000729 | PA6-CF, PETG-GF, PC-CF | 113 %, 98 % and "> 100 %" elongation on short-fibre compounds, which cannot draw past a few per cent. Each reads as the neat resin's elongation printed on a filled product's sheet (m52) |

These need the manufacturer to be asked, not more reading. Ten more (`MEAS-PHYSICS-STRAIN`) are accepted with a
reason: brittle bars whose strain at break sits 10 to 60 % below stress over modulus, systematically across three
manufacturers, which reads as a difference in how modulus was measured rather than a transcription error.

```bash
npm run sql --silent -- "select measurementid, materialid, property, normalized_value, notes from measurements
  where data_status like '%implausible%'"
```

Two more are a pair a sheet orders the wrong way round, both transcribed correctly. The Bambu PC and PC FR sheets
print a glass transition of 145 °C and a Vicat of 119 and 114 °C, and a needle cannot sink into a polycarbonate
26 °C below the temperature at which it goes rubbery (V000679, V000700). Which of the two is wrong cannot be
settled from the sheet; it is the same PC sheet as the heat-deflection pair above. Accepted with that reason under
`MEAS-PHYSICS-ORDER`.

## 3. Four values that cannot be read at all

Quarantined: kept with the reason, never a number (D31).

- **V000420** PETG hardness, and **V002188 / V002189** ABS-ESD heat deflection: unresolved unit or layout.
- **V001540** PCTG notched Izod prints "93 C KJ/m2", verified verbatim in the current sheet. 93 kJ/m² is not
  credible for a notched PCTG bar (5 to 10 is typical). The source needs correcting, not the transcription.

## 4. Six conflicts nobody has been able to resolve

`coverage.csv`, status `Conflict` or `Quarantined`. Each names what is needed:

| Row | Material | Blocked on |
|---|---|---|
| C00003 | PLA-GF | The iSANMATE sheet's glass-fibre heading contradicts its carbon-fibre description; the source is robots-disallowed and cannot be re-read. Needs a composition declaration, or ash / TGA on purchased filament. |
| C01106 | PCTG | See V001540 above. |
| C01108 | PLA-CF | A third impact row repeats the XY label and states no notch. Notch recorded as Not published; nothing inferred. |
| C01110 | ABS | A retailer listing (CA0069) for PLA Pure was attached to ABS. Quarantined and excluded from pricing. |
| C01136 | PET-GF | A product page recommends a chamber; the data sheet says room temperature. The page returned HTTP 403 and could not be verified. |
| C01137 | nGen / Amphora | The grade row names Eastman AM3300; the colorFabb sheet v2.0 names HT3300. |

```bash
npm run sql --silent -- "select coverageid, materialid, domain, finding from coverage where status in ('Conflict','Quarantined')"
```

## 5. Materials with nothing, or with no grade to stand for them

- **PA66-CF (M056)** and **PA612-GF (M060)** have no measurement of any kind. Their estimates are family-only and
  say so. No filament data sheet with published properties was found in the sampled manufacturers.
- **PA66 (M055), PA66-CF (M056), PA612 (M058), PA612-GF (M060)** have no representative grade, so nothing can be
  a headline for them even where a study or resin reference publishes a number.

Both are evidence gaps, not defects. Only a manufacturer publishing a sheet fixes them.

## 6. What the estimate model cannot narrow

These are reviewed per record in `data/review/accepted-findings.csv`, each with its reason:

| Code | Rows | What it means |
|---|---|---|
| `EST-OUTLIER` | 5 | A measured headline far outside what every other observation predicts. All five re-read and confirmed: PVDF's density, TPU's elongation, PE's elongation, PPA-CF's and PPS's heat deflection. The manufacturers genuinely disagree. |
| `HDT-LOAD-UNSTATED` | 7 | The source names the test but not the load. Flagged, and screens no heat requirement until re-read. Five are the high-temperature 3DXTECH sheets (PEEK, PEKK, PEI / ULTEM, PSU, PPSU); the others are PLA Lite and PP. |
| `EST-FAMILY-ORDER` | 1 | PLA-CF is estimated below unfilled PLA, because the two sheets are different products and no conversion makes them comparable. |
| `MEAS-PHYSICS-STRAIN` | 10 | See item 2. |
| `MEAS-PHYSICS-Z-ABOVE-XY` | 2 | Polymaker prints a Z stiffness 15 to 26 % above XY. Unusual at 100 % infill but not impossible; whether the sheet swapped its labels cannot be settled from the table. |

Estimates that are merely wide because the evidence is thin are `EST-THIN`, informational, and need no reviewer:
more data narrows them, a review does not (D73).

## 7. Structural limits, accepted knowingly

- **The `Post-processing / application` coverage domain cannot be derived.** Its Gap rows distinguish grade-specific
  evidence from family notes a material owns, and no rule over evidence domains expresses that: six materials say
  Gap there truthfully, beside records of their own. Its 53 templated rows stay stored where the other seven
  domains' were derived (D74).
- **A list column loses its missing state in SQLite.** `Standards` and `Units` are TEXT and hold `Not published`
  inline, where a number column gets a `_state` sibling and a NULL. Harmless today, because no vocabulary value
  collides with a missing-state word, but it is an inconsistency in the query layer (D75).
- **`reference.csv` holds three misspelled names**: `Standstone`, `Slilicon`, `Polywood` (for sandstone, silicon,
  plywood). `Name` is the table's primary key and `reference_envelopes.csv` points at it, so correcting them is a
  key rename through the removal ledger (D72), not an edit.
- **`offset` in `dist/reference.json` is dead.** Nothing reads it; it stays because `schema/reference.schema.json`
  still requires it. It goes when that contract does (D67).

## 8. Sources that cannot be reached

- **Two are recorded `not-retrieved`**: a Polymaker CoPE sheet (HTTP 404) and the Fiberon PET-GF15 page (HTTP 403),
  both on 2026-09-13. Nothing was entered from either, and nothing may cite them. The second is what C01136 above
  is blocked on.
- **Four have no public URL and are `read-only`** (`LOCAL-CANON`, `LOCAL-CREEP`, `LOCAL-FATIGUE`, `LOCAL-XLSM`):
  local references on the owner's machine. Two are cited, for the creep and fatigue principles; nothing selectable
  depends on reaching any of them, and `SOURCE-LOCAL-PATH` is accepted for each with that reason.
- **Four sources serve a revision that differs from the copy that was read.** They are recorded `retrieved` with
  the difference in their Access note, because the served file is what was read.

```bash
npm run sql --silent -- "select sourceid, access_state, access_note from sources where access_state <> 'retrieved'"
```

---

## 9. Fifteen print setups carry a neighbouring column's sentence

The same transcription damage as item 1, in `profiles.csv` rather than `measurements.csv`. A data sheet prints its
storage paragraph or its marketing column beside the printing table, extraction interleaves the two by line, and
the setting cell kept what followed it:

```
Nozzle °C = 230-260°C STORAGE AND SHELF LIFE
Bed °C    = 60-80°C Filament should be stored in a dr y room at room
Nozzle °C = 250-300 °C Printing speed Up to 300mm/s
Bed °C    = 40-50 °C Drying temp. and time 100 °C/10H PolySupport(TM) for PA
Nozzle material = Ye s
```

**The windows are not affected.** `parseTemperature` reads the range at the head of the cell and stops, so
`Nozzle min °C`, `Nozzle max °C` and every state and requirement beside them are right, and nothing downstream
reads the raw text. What is wrong is the text a reader is shown, and what is lost is the data sitting inside it:
the Fiberon and Polymaker sheets state a print speed, a drying schedule and a support pairing in those cells,
which belong in `profile_notes.csv`, `Drying` and `Support pairing`.

Five `profile_notes` rows carry the same damage (`P0092`, `P0111`, `P0114` and both notes of `P0120`).

**The fix** is a re-read of each source (D35), which `scripts/ingest/propose.mjs` now does correctly: it reads a
setting by its own label, takes the value from the label's own cell, and stops where the next column begins. Ten
of the fifteen are Spectrum sheets and are corrected by that maker's import batch; the other five are Polymaker
and Fiberon sheets, and wait for theirs, because moving their print speed and drying schedule into the columns
that own them is the same re-read.

```bash
npm run sql --silent -- "select profileid, sourceid, substr(nozzle_c,1,44), substr(bed_c,1,40) from profiles
  where nozzle_c like '%stored%' or nozzle_c like '%STORAGE%' or nozzle_c like '%Printing speed%'
     or nozzle_c like '%shelf%' or bed_c like '%stored%' or bed_c like '%Drying temp%' or bed_c like '%shelf%'
     or bed_c like '%Recommended storage%' or nozzle_c like '%is ca.%' or bed_c like '%is ca.%'
     or nozzle_material in ('Ye s','recommended No') or nozzle_c like '%- standard speed%'
     or nozzle_c like '%is a professional%' or bed_c like '%filament for 3D%' order by 2"
```

---

## Coverage, in one number

294 coverage rows record a gap, 93 a comparability limitation, 31 a reviewed limitation, 13 a partial resolution.
Those are not defects; they are the database saying what it does not know. The headline gaps:

| Headline | Measured on |
|---|---|
| Density | 92 of 103 materials |
| Elongation, XY | 75 |
| Stiffness, XY | 74 |
| Heat deflection at 0.45 MPa | 68 |
| Strength, XY | 59 |

The rest are estimated, and every estimate says how far to trust it.
