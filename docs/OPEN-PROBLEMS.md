# Open problems

What is known to be wrong or missing in this database, as of 2026-09-21, after batches b01 to b29 brought
149 materials, 966 grades, 9,981 measurement rows and 1,240 sources in. It is here so that nobody has to
rediscover it, and so that a reader can tell a gap that is being worked on from one nobody has noticed.

Everything below is derived from the data, not remembered. Each item gives the command that re-derives its figure,
so a stale number here is findable rather than believable. Run `npm run db:sqlite` first for the SQL ones.

Two things this page is not. It is not the check list: every rule the build enforces is in [RULES.md](RULES.md),
generated. It is not the audit history: what each review found and what happened to it is in [audits/](audits/).

---

## 1. The test method 20 measurements were published without

**Closed on 2026-09-21 by m101**, which corrected 70 rows across 19 sources. What is left is not damage.

The 74 rows this section counted held a fragment of the neighbouring column instead of the test method: the tail
of a Subject ("Transition Temperature"), the head of a Testing Method ("DSC,", "ISO 179,", "ASTM"), or the
direction that followed it ("(X-Y)"). Bambu Lab's properties table is `Subjects | Testing Methods | Data` and
the original extraction cut it in the wrong place; Polymaker prints a method once between a property's two
direction rows, and the second row kept only its first word. The values were never affected — they come from the
Data cell and reconcile against their raw text on every build. Each of the 70 was re-read from its own cached,
hash-checked source, matched to its sheet row by its property, its direction and its load, and given the method
that row prints (D35).

**Twenty rows were read and deliberately left as they stand, because the fragment is what the sheet prints:**

| Rows | Source | What the sheet prints |
|---:|---|---|
| 10 | Polymaker's PolyLite, PolyMax, PolyMide, PolySonic and Polymaker sheets | `N/A` in the Testing Method column, for thermal conductivity |
| 5 | Prusament PVB | `Prusa Polymers` — Prusa's own measurement, for density, both moisture absorptions, hardness and interlayer adhesion |
| 5 | iSANMATE PLA-GF and PA6-CF | a bare `ISO`, beside four values and nothing more |

A sheet being vague is not transcription damage, and a standard nobody read off a sheet is exactly what this
database exists not to hold. The same applies to the six `Method A` / `Method B` rows this section used to count
separately: Siraya Tech prints "Method A/B" beside a pair of heat deflection temperatures and names no standard,
and the load each row was measured at is typed in `Test load MPa`.

```bash
npm run sql --silent -- "select sourceid, standard_load, count(*) n from measurements
  where standards = 'Not published' and standard_load in ('Modulus','Strength','Elongation','Deflection',
  'Temperature','Transition Temperature','(X-Y)','DSC,','ISO','ISO 179,','ASTM','N/A','Prusa Polymers')
  group by 1, 2 order by n desc"
```

Twenty-five batches of imported sheets have added none of this damage: `scripts/ingest/propose.mjs` reads a
standard by its own designation and writes the sheet's words, and `PARSE-MISMATCH` fails a row whose typed
`Standards` and raw text disagree.

## 2. Forty-one published values that physics rules out

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
| V002818, V002981, V004034, V004255 | PLA-ESD, PLA Aero, PLA Sparkle, PLA | a flexural or tensile modulus of 0.5 to 3.8 MPa on a rigid PLA, three orders of magnitude below what the same sheets' strength and elongation require |
| V003219, V003252 | PPA-CF, PVDF-ESD | a glass transition of 265 °C, and of 158 °C again — the same template value as the PA12 rows above |
| V004123 | TPU | a tensile strength of 470 MPa on an elastomer |
| V004148, V004210, V004270, V004539 | ASA, ABS-CF, ABS, PEEK | notched Izod of 138 to 250 kJ/m², where an unnotched bar of the same polymer breaks well below that |
| V005397, V005398 | PA6-GF | flexural strength of 5,545 and 1,582 MPa, above the modulus printed beside them |

Fifteen more entered with b11 to b22, all of classes the table already names:

| Measurements | Class |
|---|---|
| V006316, V006356, V006409, V008951, V008955, V009320 | a rigid PLA's or ABS's modulus of 1 to 500 MPa, far below what the same sheet's strength requires, as V002818 |
| V008991, V008992, V009135, V009136 | a PETG whose flexural strength of 1,170 MPa stands beside a modulus of 60 MPa, as V005397 |
| V007526, V007837 | a heat deflection at 0.45 MPa below the one at 1.8 MPa on the same sheet, as V000682 |
| V007863, V007866 | an unfilled PA6 pulling at 170 MPa and bending at 245 |
| V006262 | a carbon-fibre PC drawing to 100 %, as V000729 |

Eleven of the fifteen carry only the batch's standard note and not the reason the flag was set; the class above is
the reason, and the sweep in PLAN-REMAINING §2.3 writes it into each row.

These need the manufacturer to be asked, not more reading. They are the values the database refuses to use. A
larger set — 264 physics findings — is accepted with a reason apiece and stays in use, because in each the reason
says the rule, not the number, is what does not fit: 182 `MEAS-PHYSICS-WINDOW`, 30 `MEAS-PHYSICS-STRAIN` (brittle
bars whose strain at break sits 10 to 60 % below stress over modulus, systematically across several manufacturers,
which reads as a difference in how modulus was measured rather than a transcription error), 45
`MEAS-PHYSICS-ORDER` and 7 `MEAS-PHYSICS-Z-ABOVE-XY`. Each is a candidate for the list above if a re-read finds
the sheet really does print what cannot be.

The window findings are not mostly flexible grades, which is what this page used to say. By family they are PLA 59,
flexible elastomers 25, PETG 16, copolyesters 14, polyamides 13; by property tensile modulus 33, hardness 31, Izod
23, elongation 21, density 17. **Thirty are one defect, not thirty**: SUNLU's hardness column names both Shore
scales ("HA/HD"), so a Shore D value is judged as Shore A or the other way round. That is a unit to read off each
sheet, and PLAN-REMAINING §2.3 does it.

```bash
npm run sql --silent -- "select measurementid, materialid, property, normalized_value, notes from measurements
  where data_status like '%implausible%'"
```

Among the `MEAS-PHYSICS-ORDER` pairs is one a sheet orders the wrong way round, both rows transcribed correctly.
The Bambu PC and PC FR sheets print a glass transition of 145 °C and a Vicat of 119 and 114 °C, and a needle cannot sink into a polycarbonate
26 °C below the temperature at which it goes rubbery (V000679, V000700). Which of the two is wrong cannot be
settled from the sheet; it is the same PC sheet as the heat-deflection pair above. Accepted with that reason.

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
  say so. No filament data sheet with published properties was found in the sampled manufacturers. **PA-GF (M063)**
  has none either, and needs none: it is a family entry, and a family owns no product (D44).
- **Nine materials have no representative grade**, so nothing can be a headline for them even where a study or a
  resin reference publishes a number: TPE (M044), PA (M047), PA66 (M055), PA66-CF (M056), PA612 (M058), PA612-GF
  (M060), CoPA (M061), PA-CF (M062), PA-GF (M063). For the family entries among them that is correct.

Both are evidence gaps, not defects. Only a manufacturer publishing a sheet fixes them.

## 6. What the estimate model cannot narrow

These are reviewed per record in `data/review/accepted-findings.csv`, each with its reason:

| Code | Rows | What it means |
|---|---|---|
| `MEAS-PHYSICS-WINDOW` | 182 | See item 2. |
| `MEAS-PHYSICS-ORDER` | 45 | See item 2. |
| `MEAS-PHYSICS-STRAIN` | 30 | See item 2. |
| `HDT-LOAD-UNSTATED` | 10 | The source names the test but not the load. Flagged, and screens no heat requirement until re-read. Five are the high-temperature 3DXTECH sheets (PEEK, PEKK, PEI / ULTEM, PSU, PPSU); two are PLA Lite and PP; three arrived with b09 — Flashforge's PBAT, purefil's LCP and colorFabb's nGen. |
| `COVERAGE-SUPERSEDED` | 9 | A coverage finding a later row replaces. |
| `MEAS-CROSS-SOURCE-TWIN` | 5 | Two sources publishing the same numbers: two revisions of one Polymaker sheet each, republished without remeasuring. |
| `EST-OUTLIER` | 3 | A measured headline far outside what every other observation predicts. PLA Metal's density — Bambu prints 1.25 g/cm³ where Spectrum's copper, brass and bronze grades print 2.28 to 2.36, and they are different products under one name; TPU's elongation; and a Flashforge Flexible sheet whose modulus of 6 to 7 MPa sits beside a strength of 27 to 28 MPa. PLA Aero's density stopped being one when D80 gave the lightweight grades a window of their own. |
| `SOURCE-LOCAL-PATH` | 4 | See item 8. |
| `MEAS-PHYSICS-Z-ABOVE-XY` | 7 | Polymaker prints a Z stiffness 15 to 26 % above XY, and one b09 sheet a Z strength above its own X-Y one. Unusual at 100 % infill but not impossible; whether the sheet swapped its labels cannot be settled from the table. |
| `EST-FAMILY-ORDER` | 2 | PLA-CF is estimated below unfilled PLA, because the two sheets are different products and no conversion makes them comparable; ASA-AF's one modulus is an injection-moulded bar. |
| `MEAS-LOCATOR-DIRECTION` | 2 | HDT is recorded without a direction by convention; the sheet's "XY" names the bar's build orientation, not a test axis. |
| `NO-MEASUREMENTS` | 2 | See item 5. |

301 accepted findings in all, each with its reason and the date it was accepted. `npm run audit:data` fails on one
that no longer occurs, so this list cannot go stale unnoticed.

Estimates that are merely wide because the evidence is thin are `EST-THIN`, informational, and need no reviewer:
more data narrows them, a review does not (D73).

## 7. Structural limits, accepted knowingly

- **The `Post-processing / application` coverage domain cannot be derived.** Its Gap rows distinguish grade-specific
  evidence from family notes a material owns, and no rule over evidence domains expresses that: some materials say
  Gap there truthfully, beside records of their own. Its 103 rows (54 Evidence recorded, 44 Gap, 5 Not applicable)
  stay stored where the other seven domains' were derived (D74).
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
- **Eighteen are `retrieved-copy`**: the bytes were staged by hand because the host serves them through a viewer
  or refuses an automated fetch. The document is still identified by the SHA-256 of what was read.
- **Four have no public URL and are `read-only`** (`LOCAL-CANON`, `LOCAL-CREEP`, `LOCAL-FATIGUE`, `LOCAL-XLSM`):
  local references on the owner's machine. Two are cited, for the creep and fatigue principles; nothing selectable
  depends on reaching any of them, and `SOURCE-LOCAL-PATH` is accepted for each with that reason.
- **Four sources serve a revision that differs from the copy that was read.** They are recorded `retrieved` with
  the difference in their Access note, because the served file is what was read.

24 of 665 sources are in one of those states; the other 641 were fetched, hashed and read. Beside them, and not in
`sources.csv` at all, the import ledger holds 64 documents behind a login or a request form and 404 not yet
fetched (`docs/audits/2026-09-18-v2-import/STATUS.md`).

```bash
npm run sql --silent -- "select sourceid, access_state, access_note from sources where access_state <> 'retrieved'"
```

---

## 9. The column beside the printing table

**Closed on 2026-09-21 by m102**, which corrected 130 cells across 31 profiles.

A data sheet prints its storage paragraph beside its printing table, extraction interleaves the two by line, and
the setting cell kept what followed it: `240-290°C STORAGE AND SHELF LIFE`, `80-100°C Filament should be stored
in a dr y room at room`. The windows were never affected — `parseTemperature` reads the range at the head of the
cell and stops — but the text a reader is shown was nonsense, and two makers' layouts swallowed data that belongs
in a column of its own. Every cell was re-read from its own cached, hash-checked source (D35).

- **Eleven setting cells** that kept a neighbour's sentence now hold what their own cell prints.
- **Five Fiberon sheets** print their printing table two columns wide, and the right-hand column stood in the
  left-hand cells: "Nozzle temperature 280-300 °C Printing speed Up to 300mm/s" is two settings, not one. Their
  drying schedules (100 °C/10H) and the supports Polymaker pairs them with (PolySupport™, PolyDissolve™ S1) are
  now in the columns that own them, and the printing speeds in profile notes. The annealing schedules beside
  them were already on every measurement of those sources, where an annealing belongs.
- **Twenty-six `Nozzle material` cells** read `recommended No`, `recommended Yes` or `Ye s`. Spectrum asks the
  question in the label — "Ruby or hardened nozzle recommended" — and answers it in the cell, which now holds
  the answer. Twenty of those answers are **No**, which the database was not recording at all: their
  `Abrasion / clogging` column said "Not published" while the sheet plainly said a hardened nozzle is not
  needed. `parseAbrasion` now reads an answer where the label asks the question, and six materials — PETG,
  PETG-ESD, ASA, PEBA, PE, PLA-ESD — say "no special concern" instead of "unknown".

```bash
npm run sql --silent -- "select profileid, sourceid, substr(nozzle_c,1,44), substr(bed_c,1,40) from profiles
  where nozzle_c like '%stored%' or nozzle_c like '%STORAGE%' or nozzle_c like '%Printing speed%'
     or nozzle_c like '%shelf%' or bed_c like '%stored%' or bed_c like '%Drying temp%' or bed_c like '%shelf%'
     or bed_c like '%Recommended storage%' or nozzle_c like '%is ca.%' or bed_c like '%is ca.%'
     or nozzle_material in ('Ye s','recommended No') or nozzle_c like '%- standard speed%'
     or nozzle_c like '%is a professional%' or bed_c like '%filament for 3D%' order by 2"
```

---

## 10. What the second read found and nobody has fixed

R085's second read of b03 to b26 — a separate reader against a seeded sample, 564 rows, `ingest:second-read` —
disagreed with **145 of 564 rows (26 %)**. No row failed its first check: every sampled value is printed on the
document its Locator names, so there is no repeat of the wrong-revision collision the b01/b02 read found. What
the rest are is conditions and methods the sheet states and the record does not.

Three classes were fixed the same day, each counted across the whole table and fixed in the reader too: seven
resistivities that were a piece of a power of ten, thirty heat deflections tested at "0.45 °C", sixty-one density
methods beginning with the 3 of their own g/cm³ (m104); 481 standards a merged Testing Method cell names (m105);
104 methods a thermal table names (m106). **117 rows of the sample are still open**, and the verdicts and quoted
notes are in `batches/<batch>/second-read-sample.csv`.

| What | Sample rows | Where |
|---|---:|---|
| A condition the sheet states and the row does not | 84 | notch (22), build direction (18), dry/wet/annealed (15), specimen form (12), melt-flow condition (8), test load (6), other (7) |
| A standard the sheet prints, still unrecorded | 26 | mostly QIDI's bilingual tables, whose columns this reader cannot pair |
| A value that is not what the page prints | 7 | below |

The seven values, each with what the page says:

| Row | What the record holds | What the document prints |
|---|---|---|
| `V004139` | Hardness 85 Shore A, a point | Extrudr prints "Shore 85A - 88A": a range with no upper bound recorded |
| `V006953` | Impact strength 399 kJ/m² | a *tensile* impact strength (ASTM D1822), filed with notched-bar values of 2 to 50 |
| `V006708` | Density 1.05 g/cm³ | the prose above the table says 1.05 is the regular ABS and this grade is 1.037 |
| `V007346` | Mould shrinkage 0.70 % | 3D4Makers prints "0.40 to 0.70 %", and "0.40 to" is stranded in Standard / load |
| `V007775` | Vicat softening temperature 100 °C | Fillamentum prints "Vicat softening temperature **-** ISO 306"; 100 °C is the row below, "Temperature resistance" |
| `V009317` | Decomposition temperature 380, Operator `=` | Raise3D prints "> 380 °C" |
| `V009341` | Elongation at break 3,3 % | AzureFilm prints "Strain at break (Flexural)", so its grade holds two elongations |

Two conventions the reader raised rather than flagged, because they are uniform across a maker and are the
owner's to rule on rather than a per-row error:

- **QIDI's specimen type.** All 149 QIDI rows read "Not published (do not assume printed)" although every QIDI
  sheet prints "Specimens printed under the following conditions: Nozzle size 0.4 mm, Nozzle temp …".
- **Extrudr's specimen type is split across batches.** b07 applied the R-EXTRUDR-AIS ruling (every row "Raw
  material value"); b11 and b18 did not (`V006441 V006212 V008574 V008573 V008568 V008387 V008383 V008559`).
  Nothing in those documents contradicts either reading.

```bash
npm run ingest:second-read -- --batch b12 --tally     # the rate, and what it would reopen
```

**What `--tally` does needs a decision before it is run.** R085 says one disagreement reopens its document, and
the script writes `held: second-read` onto the ledger row. For a document already applied that is a status the
next `--holds` run undoes, because the product has a grade and `registered` is terminal. Reopening a document
whose rows are already in the tables is not the same act as holding one that never entered, and the difference
has not been designed.

---

## 11. What the sweep found and is not yet fixed

The sweep (PLAN-REMAINING 2.3) read the 200 values furthest from their material's others against their sheets:
`docs/audits/2026-09-18-v2-import/sweep/sweep-200.csv`, each verdict with the line quoted. m127 acted on the
values and properties (a wrong cell, 30 endpoints named on their own line, two stresses at conventional deflection,
14 numbers that are not the property, 24 flagged implausible). Still open:

- **Stresses at a stated elongation have no property.** An elastomer sheet's "Tensile stress at 100 % / 200 % /
  300 %" (and FiberFlex Aero's "@ 5 % / 10 % Strain") are filed as tensile strength (endpoint unspecified): 18 rows,
  none a headline. They need a property that carries its elongation, which is a design decision, not a re-read.

```sql
select MeasurementID, Property, "Raw value", Locator from measurements
where Property like 'Tensile%' and (Locator like '%stress at %0\%%' escape '\' or Locator like '%@ %\% Strain%' escape '\');
```

---

## Coverage, in one number

Of 761 coverage rows, 272 record a gap, 93 a comparability limitation, 32 a reviewed limitation and 13 a partial
resolution. Those are not defects; they are the database saying what it does not know. The headline gaps, against
145 materials:

| Headline | Measured on |
|---|---|
| Density | 121 of 145 materials |
| Stiffness, XY | 91 |
| Elongation, XY | 91 |
| Heat deflection at 0.45 MPa | 88 |
| Strength, XY | 77 |

The rest are estimated, and every estimate says how far to trust it.

```bash
npm run sql --silent -- "select status, count(*) from coverage group by 1 order by 2 desc"
```
