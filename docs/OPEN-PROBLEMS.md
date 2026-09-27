# Open problems

What is known to be wrong or missing in this database, as of 2026-09-21, after batches b01 to b33 brought
158 materials, 1,119 grades, 11,096 measurement rows and 1,422 sources in. It is here so that nobody has to
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

## 2. Eighty-one published values that physics rules out

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

Each now carries its reason in Notes, with the numbers its own sheet prints beside it (m134). The sweep (§11) flagged
24 more, of the same classes and a few new ones (a notched impact above the polymer's unnotched, a glass transition
above the sheet's own Vicat, a yield equal to the break); their reasons are in their rows.

These need the manufacturer to be asked, not more reading. They are the values the database refuses to use. A
larger set — 209 physics findings — is accepted with a reason apiece and stays in use, because in each the reason
says the rule, not the number, is what does not fit: 148 `MEAS-PHYSICS-WINDOW`, 31 `MEAS-PHYSICS-STRAIN` (brittle
bars whose strain at break sits 10 to 60 % below stress over modulus, systematically across several manufacturers,
which reads as a difference in how modulus was measured rather than a transcription error), 23
`MEAS-PHYSICS-ORDER` (22 acceptances; one row pairs twice) and 7 `MEAS-PHYSICS-Z-ABOVE-XY`. Each is a candidate for
the list above if a re-read finds the sheet really does print what cannot be.

Where a shared reason was a rule, the rule now carries it and the acceptances are gone (re-center phase 5, part 4):
a hardness whose scale the sheet does not publish is judged against both Shore scales (m160, W0079), a Vicat taken
under the heavy load is not ordered against the glass transition, and Spectrum's metal-filled PLAs declare their load
(m161, R095). By family the window findings are PLA 31, flexible elastomers 28, copolyesters 17, polyamides 13, PETG
9; by property tensile modulus 34, Izod 25, elongation 23, flexural modulus 16, heat deflection 11. **The strain
findings are the largest group left with one reason**: ten brittle printed bars, eight of them Z, whose strain at break
sits below stress over modulus on Bambu Lab's, IPCON's and others' sheets. The reason is a modulus basis the sheets do
not state, so no column carries it and the check cannot tell it from a wrong value; it stays per record.

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

## 5. Materials with nothing, or with no product that publishes

- **PA66-CF (M056)** and **PA612-GF (M060)** have no measurement of any kind. Their estimates are family-only and
  say so. No filament data sheet with published properties was found in the sampled manufacturers. **PA-GF (M063)**
  has none either, and needs none: it is a family entry, and a family owns no product (D44).
- **Four in-scope materials have no product**, so nothing can be their value even where a study grade or a resin
  reference publishes a number: PA66 (M055), PA66-CF (M056), PA612 (M058), PA612-GF (M060). Their values are
  estimates, and say so. The family entries (PA, CoPA, PA-CF, PA-GF and the rest) own no product by design (D44).

Both are evidence gaps, not defects. Only a manufacturer publishing a sheet fixes them.

- **The families' "polymer not stated" homes are not estimated** (D87), so a headline none of their products
  publishes comparably shows Not published and is judged unknown: Nylon-CF and Nylon-GF (one product each, Onyx GF's
  values all conditioned), TPS, and the others for some headlines. The build lists them (HEADLINE-UNESTIMATED, info).
  More products, not a model, fill them.

## 6. What the estimate model cannot narrow

These are reviewed per record in `data/review/accepted-findings.csv`, each with its reason:

| Code | Rows | What it means |
|---|---|---|
| `MEAS-PHYSICS-WINDOW` | 148 | See item 2. Four came with batch b34 (m143): two melt flows near 100 g/10 min printed with no condition (Fillamentum Nylon FX256, Yousu Nylon), a 22 Shore D elastomer named for it (Nanovia TPE 22D) and an unnotched Charpy of 218 kJ/m² (Extrudr GreenTEC). |
| `MEAS-PHYSICS-STRAIN` | 31 | See item 2. |
| `MEAS-PHYSICS-ORDER` | 22 | See item 2. |
| `MEAS-PHYSICS-Z-ABOVE-XY` | 7 | Polymaker prints a Z stiffness 15 to 26 % above XY, and one b09 sheet a Z strength above its own X-Y one. Unusual at 100 % infill but not impossible; whether the sheet swapped its labels cannot be settled from the table. |
| `MEAS-CROSS-SOURCE-TWIN` | 5 | Two sources publishing the same numbers: two revisions of one Polymaker sheet each, republished without remeasuring. Three of the five pairs are cited by two different grades (PolyLite PETG G020-02 and G020-13, PolySonic PLA G001-02 and G001-25, Polymaker ABS G027-09 and PolyLite ABS G027-10), so if the reason is right each is one product counted twice in its material's spread; GRADE-PRODUCT-DUPLICATE does not see it, because the names differ by the maker's prefix or a revision suffix. |
| `EST-FAMILY-ORDER` | 4 | A reinforced material below its unfilled sibling: ASA-AF's one modulus is an injection-moulded bar; ASA-GF's median is of two sheets 0.9 GPa apart; ABS-AF's two sheets state no direction, so it is estimated below the numbers they print; PA12-AF has no heat deflection of its own. PLA-CF and PLA-NF stopped being ones when their values became their products' medians (m137). |
| `SOURCE-LOCAL-PATH` | 4 | See item 8. |
| `EST-OUTLIER` | 3 | A material's typical product far outside what every other observation predicts, each carrying a filler the model has no covariate for: PA6-CE (Spectrum PA6 CS20 FR V0, 1.49 g/cm³ with ceramic fillers and a flame retardant, against 1.17 predicted), PA6-GS (Spectrum PA6 GK10, 1.01 g/cm³ with hollow glass spheres, against 1.33), and PLA-EC, whose two conductive PLAs publish 1.24 and 1.35 against about 1.52. The first two crossed three deviations when m161 took Spectrum's metal-filled PLAs out of the density fit and the scale tightened; PLA Metal stopped being one, because its range is now its plain products' (1.20 to 1.25) and the metal grades are counted apart. |
| `NO-MEASUREMENTS` | 2 | See item 5. |
| `COVERAGE-SUPERSEDED` | 1 | Two "Evidence recorded" rows for PA6-GF's grades, each a separate re-filing (C01184, C01185). Several Resolved rows in one domain are a log of closed events and no longer a finding (phase 5, part 4). |
| `HEADLINE-FAMILY-UNLISTED` | 1 | Heat deflection does not name Flexible Elastomers, on purpose (D56). |

228 accepted findings in all, each with its reason and the date it was accepted. `npm run audit:data` fails on one
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

## 8. Sources that cannot be reached

- **Two are recorded `not-retrieved`**: a Polymaker CoPE sheet (HTTP 404) and the Fiberon PET-GF15 page (HTTP 403),
  both on 2026-09-13. Nothing was entered from either, and nothing may cite them. The second is what C01136 above
  is blocked on.
- **Twenty are `retrieved-copy`**: the bytes were staged by hand because the host serves them through a viewer
  or refuses an automated fetch. The document is still identified by the SHA-256 of what was read.
- **Four have no public URL and are `read-only`** (`LOCAL-CANON`, `LOCAL-CREEP`, `LOCAL-FATIGUE`, `LOCAL-XLSM`):
  local references on the owner's machine. Two are cited, for the creep and fatigue principles; nothing selectable
  depends on reaching any of them, and `SOURCE-LOCAL-PATH` is accepted for each with that reason.
- **Four sources serve a revision that differs from the copy that was read.** They are recorded `retrieved` with
  the difference in their Access note, because the served file is what was read.

On 2026-09-25, 26 of 1,422 sources are in one of the first three states and the other 1,396 were fetched, hashed and
read; the query below re-derives the figure. Beside them, and not in `sources.csv` at all, the import ledger holds 33
documents behind a login (`gated`, INTAMSYS) and 15 `unreachable` after a Wayback retry
(`docs/audits/2026-09-18-v2-import/STATUS.md`).

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

## 10. What the second read found, and where each finding stands

R085's second read of b03 to b26 (564 rows, a separate reader against a seeded sample) disagreed with **145 rows
(26 %)**; none failed its first check, so every sampled value is printed on the document its Locator names. The
register is `docs/audits/2026-09-18-v2-import/second-read/findings.csv` (R165): 76 findings are resolved, by the
class migrations (m104 to m106, m118, m119, m128 to m132) or by the row's later state, and 69 are deferred to V2.1
with the reason in their Resolution: conditions and standards the sheet states that the reader could not pair
(QIDI's bilingual columns, per-line notches and loads on documents the sweep did not reach). None is open.

```bash
npm run ingest:second-read -- --open     # the register, and what is still open (nothing)
```

---

## 11. What the sweep found and is not yet fixed

The sweep (PLAN-REMAINING 2.3) read the 200 values furthest from their material's others against their sheets:
`docs/audits/2026-09-18-v2-import/sweep/sweep-200.csv`, each verdict with the line quoted, and m126 to m133 fixed
each class it named across the whole table (the record: `sweep/README.md`). Still open:

- **Stresses at a stated elongation have no property.** An elastomer sheet's "Tensile stress at 100 % / 200 % /
  300 %" (and FiberFlex Aero's "@ 5 % / 10 % Strain") are filed as tensile strength (endpoint unspecified): 18 rows,
  none a headline. They need a property that carries its elongation, which is a design decision, not a re-read.

```sql
select MeasurementID, Property, "Raw value", Locator from measurements
where Property like 'Tensile%' and (Locator like '%stress at %0\%%' escape '\' or Locator like '%@ %\% Strain%' escape '\');
```

- **Nobufil's printed column was never transcribed.** Thirteen Nobufil sheets (3DJake copies) print one table with
  two value columns, "FDM H" and "Injection". The reader took only the rows with one value, which stand in the
  Injection column (m128 marks them moulded); the tensile, elongation and Izod rows that carry both a printed and a
  moulded value were never read, so the printed values these sheets exist to give are missing. It is a
  several-values layout (a transcription of both columns per row), not a correction.

```bash
grep -l "FDM H" .cache/text/*.json | wc -l     # the sheets; their rows: select * from measurements where SourceID like 'R-3DJAKE-3DJAKE-%'
```

- **BASF's extended sheets print a value per print direction, by column.** The applied rows (V010063's class) record
  neither the direction the column names nor the printed specimen the table describes. It needs each page image read
  per column, not a rule.
- **The values beyond |z| 3 the 200 did not reach** (453) stay in `v_measurement_z`; EST-GRADE-OUTLIER raises the
  worst of them at grade level.

```sql
select * from v_measurement_z where abs(z) > 3 order by abs(z) desc;
```

---

## 12. Print recipes the sheets state and the database does not hold

Found by re-center lane 2 (m136, 2026-09-25), which filled what the products' own cached sheets state and the parsers
read: the record is `docs/audits/2026-09-25-re-center/RESPONSE.md`, "Lane 2". Still open:

- **Thirty-three products state a recipe part only in words.** Lane 3's statements give 26 products a chamber or
  enclosure need (Siraya Tech's "An enclosure is crucial…", Bambu's "No enclosure, or heated chamber needed") and 7 a
  drying schedule (Raise3D's "Dry PA12 CF at 80°C for 12 hours before printing") that their print profiles do not hold.
  The panel quotes them and the know-how state counts them, but the chamber and drying gates read the profiles, so
  those products stay unknown on them. Query: products whose `knowHow.recipe.chamber` or `.drying` is `collected` while
  `print.chamber.state` and `print.enclosure`, or `print.drying`, are unknown.

- **Thirty products with no value of their own have no twin to read.** D89 lets a product whose sheet prints a
  same-material sibling's table (R053) read that sibling's values and recipe; the 47 such twins now do. The others are
  reprints of another material's table (R166 and its like) or products whose sibling holds nothing: no formulation key
  spans two materials, so they read nothing, and 27 of them have no profile of their own either. Their sheets print a
  recipe the import rejected with the values. Query: active products with no measurement and no same-key sibling.
- **The printer maker's guide cannot settle the chamber where it asks for an enclosure** (D88). Bambu Lab's guide ticks
  "Print with Enclosure" for ABS, ABS-GF, ASA, PC, PAHT-CF, PA6-CF, PA6-GF, PPA-CF and PPS-CF and gives no temperature,
  so their silent products stay unknown on the chamber. In Warm environment 24 unknown materials have a product that
  meets everything but the chamber; for PC (11 products) and PPA-CF (6) that product's only word on it is the guide's
  tick. Whether "print with an enclosure", from the maker of the printer, is enough for the H2C's 65 °C chamber is the
  owner's question. Query: products whose `print.from.chamber.origin` is `guide` and `print.chamber.verdict` unknown.
- **What the guide prints and the tables do not use.** Its January 2025 revision (B-GUIDE) also heads ASA-CF, PC FR
  and TPU for AMS, which the current revision dropped; only the current revision is read, so those three materials'
  silent products read nothing. The guide's drying line is recorded and fills no recipe, and its annealing row,
  AMS compatibility, adhesion, desiccant, speed and fan rows are not recorded. Its TPU 95A HF nozzle row ("Hardened
  Steel / Stainless Steel") settles no hardened-nozzle question.
- **Wordings the parsers cannot read**, left out of m136 rather than typed against the parser: Polymaker's "Closure
  chamber | Needed" and "No Needed" (7 products), Eryone's "Sealed printing | Supports open/closed printing" (35
  sheets), "printable on non-heated chamber FFF 3D printers" in prose. `parseEnclosure` would need the words.
- **Thirty-five Polymaker profiles are the "How to make specimens" block**, read as manufacturer guidance: the nozzle
  and bed a test bar was printed at (P0339: "Printing temperature 260°C"), beside the product's real recommended
  profile from the same sheet. They widen nothing today (the recommended profile decides), but they are not guidance.
- **Twenty-six drying cells hold a fragment, not a schedule**, and count as drying stated: "to", "use", "2-4",
  "before Printing", "Diameter accuracy (2.85/1.75 mm):", "X1 Series & P Series & H2 Series Printer".
- **Nine grades are named by a sentence fragment** the import took for the product: "and prevents nozzle jams."
  (G001-82), "colors." (G035-16), "to print as PLA." (G001-76), "Technical Data" (G020-35), and five more.
- **A PolyTerra PLA+ sheet** (S-POLYCN-PolyTerra-PLA-Plus-EN-V5-1) is cited by a PolyTerra PLA profile (P0316).
- **Not yet read:** the hardened-nozzle statements (180 products' sheets), nozzle and bed for products that already had
  a profile, and drying the printed part after printing (16 products), a treatment like annealing.

```bash
npm run sql --silent -- "select profileid, sourceid, locator from profiles where sourceid like 'S-POLYCN-TDS-%' and locator like '%: Printing temperature'"
npm run sql --silent -- "select profileid, drying from profiles where drying_state = 'stated' and drying_c = 'Not published' and drying_hours = 'Not published'"
npm run sql --silent -- "select gradeid, product_name from grades where status = 'active' and (product_name like '%.' or product_name = 'Technical Data')"
```

---

## 13. Makers' know-how: what the reading left, and where it may be wrong

Found by re-center lane 3 (m140, 2026-09-25), which recorded 4,502 statements in the makers' words on 888 products
from 1,262 documents read: the record is `docs/audits/2026-09-25-re-center/RESPONSE.md`, "Lane 3". Every statement
was chosen by an agent and none by a person; a sample of 50 was read against the page. Still open:

- **The makers' sites are not searched.** 198 procurement products and 20 materials are "sheet silent"; the list, with
  the sites the data holds, is `docs/audits/2026-09-25-re-center/KNOW-HOW-WORKLIST.md` (`npm run audit:know-how`).
  Six procurement products have no document read at all (no cached text): eSUN PLA-Lite, 3DXTECH 3DXPRO LG PETG and
  AMIDEX Nylon 12, purefil POM, Kimya PEBA-S, DSM Arnitel ID 2045.
- **A document that covers two products speaks for the one the tables link.** Raise3D's PA12 CF sheet also describes
  PA12 CF+, and three CF+ statements sit on Raise3D Industrial PA12 CF (G053-09). The Panchroma TDS that covers Silk PLA
  and CoPE was left out whole.
- **Some statements are several bullets or table cells run together**, because the text was rebuilt from the page
  without its bullet marks: Prusa's ABS feature list, Ensinger's target industries. Readable, not clean.
- **Template sentences.** A maker's sentence with only the product's name changed, printed on at least four materials
  and half the maker's range, was dropped: Raise3D's brass-nozzle abrasion sentence (11 rows) and Nanovia's
  air-extraction sentence (19 rows). Narrower templates were kept or dropped by each reader's judgement (Polymaker's and
  QIDI's dry-box sentences kept, SIDDAMENT's support and oven sentences dropped).
- **Not read for know-how:** non-English text, retailers' pages fetched as witnesses (3DJake, filament2print,
  shop3d), and the makers' safety data sheets. The nozzle-wear statements now show in the panel, but the typed
  Hardened nozzle column that gates a product (§12) is still unread.

```bash
npm run sql --silent -- "select topic, count(*) from evidence where domain = 'Makers'' know-how' group by 1 order by 2 desc"
npm run sql --silent -- "select count(distinct sourceid) from documents_fts where documents_fts match '\"injection molding spline\"'"
npm run sql --silent -- "select evidenceid, gradeid, finding from evidence where domain = 'Makers'' know-how' and finding like '%CF+%'"
```

## 14. The held sheets: what did not enter, and what the homes leave open

Batch b34 (m143, D87) took the 74 sheets deferred for their identity; 44 entered, 6 were registered to products the
database holds, 2 are not data sheets, and 22 were deferred again with the gap named in the ledger. The owner answered
the three identity questions they left the same day, and batch b35 (m144, m145) took two of those sheets in: 20 remain
deferred.

- **Seven name neither a polymer nor a family**, so no home reaches them: colorFabb's 2015 "20% milled carbon
  fibres", Multi3D Electrifi, igus iglidur A350, Nuterials JECTO, Fillamentum Timberfill, FormFutura SKULPT, NinjaTek
  Eel. A maker document naming the polymer or the family frees each.
- **Thirteen wait on a reader gap**: four Stratasys condition tables (Antero 800NA is PEKK by R192; Diran 410MF07, "a
  nylon-based ... mineral-filled 7%", waits on the owner for its home too), three layouts (Essentium PA and PA-CF,
  3D4Makers PI Z2, which stays TPI by the owner's confirmation of R193), two languages (Smartfil FLEX 77A in Spanish,
  a TPU; Flashforge FABRIAL-R in Japanese), BigRep HI-TEMP's mis-mapped text layer, Markforged's four-product
  Composites table, FKuR's Fibrolon trial-grade sheet, a resin maker's that names no filament, and QIDI S-White.
- **QIDI S-White is Support for ABS (R202) and did not enter.** QIDI's bilingual layout holds it, as it holds
  QIDI's other sheets: the reader read no profile, so the seven materials the sheet lists as suitable (its Support
  pairing) have no row to go in, and it misread the water absorption (b35). The bilingual reader, or a profile read
  from the page, frees it.
- **SBC (M174) is not estimated**, and Crystal Flex publishes its strength and elongation without a direction, so
  SBC's answers are unknown until a scenario admits values as published (D84) or a resin reference gives it a
  polymers.csv row (R199). The reference the database already cites, BASF's "Polystyrene and Styrolux"
  (R-BASF-POLYSTYRENE-STYROLUX, SHA-256 0ae31d22…), is not in this machine's cache: neither its bytes under
  `.cache/sources/by-sha` nor its text, so lane 4 could not re-read its S/B/S density or classification and wrote no
  row (m155). Re-fetching it from its recorded URL, hash-checked, is the first step.
- **purefil's GreenTEC (d299af0d689965eb) is answered and not imported.** R179 names GreenTEC; the sheet was held
  before b34 and is not among the 74 the owner freed, so it waits for imports to resume.
- **A TPU rated only in prose needs a ruling.** The reader files a TPU by the rating in its name or its sheet's Shore
  hardness row (hardness-classes.csv); Copper3D's MD Flex says "TPU98A" in a sentence, and R197 pins it.
- **Heat deflection names its families** (hdt045 Applies to, D87). A new family of rigid polymers must be added there,
  or heat deflection will not apply to it. `data:lint` now names every family with candidate materials that the list
  leaves out (HEADLINE-FAMILY-UNLISTED); Flexible Elastomers is accepted with its reason, so a new family fails verify
  until someone decides.
- **Three profiles leave printed settings unread**, as §12 describes for the class: Spectrum ThermaTech PA's nozzle,
  3DXTECH WearX's bed and enclosure, and BigRep HI-TEMP CF's bed. Their gates stay unknown until lane 2 types them.

```bash
npm run sql --silent -- "select m.materialid, m.original_name, count(g.gradeid) from materials m join grades g on g.materialid = m.materialid where m.materialid between 'M164' and 'M174' and g.status = 'active' group by 1, 2"
```

## 15. Values that decide, published without their direction or load, that no cached sheet settles

Lane 4 re-read the 251 product values behind the 124 answers that change when as-published values are admitted
(BLOCKING-GAPS, D84), on their 199 cached sheets (m155, 2026-09-25). 24 sheets state how their bars were made or
tested, and 18 answers moved; the other 175 sheets print a standard ("ISO 527") and nothing about the bar. 107
answers still change when as-published values are admitted. They wait for a document that states the specimen's
build direction, or that it was moulded, or the heat deflection load: a newer data sheet, a maker's test-method page,
or an answer from the maker. BLOCKING-GAPS lists them; the maker-by-maker list for the targeted fetches is in
[the lane 4 response](audits/2026-09-25-re-center/RESPONSE.md), "Phase 6, lane 4: the values that decide, re-read".

- **Some sheets look like resin data and do not say so.** purefil prints ISO 294-4 mould shrinkage, Spectrum's PA6
  sheets "Linear mould shrinkage", Fiberlogy "gathered from standard reference materials and/or supplier test data",
  and 3D-Fuel's Pro PCTG "measurements from injection molded and 3D printed parts" without saying which. None is a
  statement about a row, so none was recorded.
- **Nanovia's 0° and 90° rasters are a direction the vocabulary has no value for.** Its pages state each tensile tab's
  raster ("3D printed test specimins at 0°, along with the tension stress") and not the bar's build orientation, so
  those rows are "Stated, not a usable direction" and stay as published; its ±45° rows are 45/45 (m33). Nanovia's
  article "Mechanical data on 3D printed test specimens at 3 different angles"
  (nanovia.tech/en/mechanical-data-on-3d-printed-test-specimens-at-3-different-angles/, not fetched) may state it.
  Three Nanovia pages were left: PETG repeats the 0° sentence under all three tabs, PA Food Industry states "ISO 3167
  A test specimens" (a shape, not how it was made), and Flex prints no sentence.
- **Nanovia's "Elongation ultimate strength" is filed as Elongation at break** on 14 rows of 13 products. It reads as the
  strain at the ultimate (maximum) stress, which the registry has as Tensile strain at strength, a lower bound of the
  elongation headline and not its value. For these brittle filled grades the two may coincide; a property ruling
  (R-series) should decide, and a re-filing moves the Flexible component answers of the materials concerned.
- **The ±45° convention decides more than it did.** A value a sheet labels only by its ±45° raster is 45/45 and no
  product value (m33); Nanovia's ABS ESD prints no 0° tab, so its product lost its stiffness and elongation. Many
  makers' "XY" bars are printed at ±45°, so whether a raster-only label should count as XY is a question for the
  owner, not a data fix.
- **Two raw cells on MakerBot Tough** hold the metric column ("63.3 MPa") where the test method belongs; the sheet names
  "ASTM D628" (sic) and D790 in a footnote. The values are moulded (m155) and decide nothing.

```bash
npm run audit:gaps   # the answers that still change when as-published values are admitted
npm run sql --silent -- "select direction, count(*) from measurements where sourceid like 'R-NANOVIA-%' and notes like '%m155%' group by 1"
```

---

## 16. What re-reading seventy sheets' heads found

m149 re-read the head of every source whose title was page furniture ("supported by", "TM", "TECHNICAL", "Page: 1",
"Version: 3.0") and wrote the title each prints; SOURCE-TITLE-NOT-TITLE now catches that class. Reading them found two
product identities that are wrong and one kind of title the lint leaves alone:

- **Anycubic PLA+ is filed as Anycubic PLA.** `R-3DJAKE-3DJAKE-ANYCUBIC-TDS-PLA-V3-0` is the PLA+ sheet ("Product Name:
  Anycubic PLA+"), and its eight values (a density of 1.21 g/cm³ among them) are on G001-116, Anycubic PLA, beside
  the PLA sheets' own. PLA+ is a product of its own: a grade for it and its rows moved there, a product identity
  decision for a migration.
- **ELEGOO's PLA grade is called "S.I."** G001-129's Product name is the "S.I." column heading of a sheet (hosted by
  3DJake) that prints no product name and no title, only a table under ELEGOO's logo. The retailer's product page the
  sheet was linked from names the product; it is not cached, so the name waits for that page.
- **A title that is only the kind of document is not flagged**: 45 "Technical Data Sheet", 3 "Technical
  Specifications", "TECHNICAL DATA SHEET", "Technical Data Sheet TM TM", and Polymaker's slogan "Innovators in 3D
  printing". Some sheets print exactly that as their heading, so a rule would not be precise; the product name beside
  it is what a re-read adds.

```bash
npm run sql --silent -- "select sourceid, title from sources where lower(title) in ('technical data sheet', 'technical specifications', 'technical data sheet tm tm', 'innovators in 3d printing')"

## 17. What the tests found when they became rules

Phase 5, part 4 rewrote the tests that named records as rules over every record. These would-be rules do not hold
today, so they are recorded here rather than asserted (RESPONSE.md, phase 5, part 4):

- **Nineteen unfilled products publish a density outside their polymer's neat range and declare no Variant**, which
  R078 asks for where a density is beyond the neat polymer: PolyLite ABS 1,120 (neat ABS to 1,110), Spectrum PET-G MATT
  and eSUN PETG-Matte 1,350 (neat PETG to 1,300), SUNLU PVA 1,010 and PolyDissolve S1 1,370 (neat PVA 1,180 to 1,340),
  Recreus RECIFLEX 1,000, and thirteen more. Some neat ranges are narrow (ABS, ASA), so each needs its sheet re-read
  before it is declared, not a bulk Variant.
- **Three pairs of sheet revisions sit on two grades each**: PolyLite PETG (G020-02, G020-13), PolySonic PLA (G001-02,
  G001-25), and Polymaker ABS beside PolyLite ABS (G027-09, G027-10). Their `MEAS-CROSS-SOURCE-TWIN` acceptances call
  them one product's sheet republished; if so, each product is counted twice in its material's spread, and
  `GRADE-PRODUCT-DUPLICATE` misses it because the names differ by the maker's prefix or a revision suffix. Merging them
  needs the owner's word that they are one product.
- **Two heat deflection estimates reach past their polymer's melting point** at the upper end, with their centres below
  it: PCL (likely to 62.2 °C, plausible to 66.5, melting 60) and PA612-GF (plausible to 220, melting 218).
- **A study grade carries product values**: G052-R1 (Stratasys, PA12) has a density and a heat deflection of its own.
  It is in no material's list and backs nothing, so nothing reads them.

```bash
npm run sql --silent -- "select p.gradeid, p.manufacturer, p.product, p.value, y.neat_density_min_kg_m3, y.neat_density_max_kg_m3 from products_compiled p join materials m on m.materialid = p.materialid join polymers y on y.polymerid = m.estimate_identity where p.headline_key = 'density' and m.modifier_filler = 'Unfilled / unspecified' and coalesce(p.variant, '') = '' and p.gradeid not like '%-R%' and (p.value > y.neat_density_max_kg_m3 or p.value < y.neat_density_min_kg_m3)"
```

## 18. What the three new selectable properties leave out

The layer strength, the notched impact strength and the glass transition (D92, m175, m176) take only what their rows
say. What stays out is recorded and shown, under each headline's comparison note in the drawer. Counts are active
procurement products, 2026-09-26:

- **75 products publish a Charpy value with no notch stated** and no notched one, most of them Chinese makers' sheets
  under GB/T 1043, which covers both bars. Their sheets may say which in a heading the import did not read. A re-read
  settles each; nothing else should.
- **161 products publish a notched Izod value and no notched Charpy one** (115 of them in kJ/m², 52 in J/m, some in
  both), so they have no notched impact value. An Izod headline beside the Charpy one (ISO 180, kJ/m²: 45 products comparably, 26 materials)
  would give them one; the J/m values need the bar's thickness, which no sheet here prints.
- **38 products publish their across-layer tensile strength only under an XZ or ZX label**, 27 of them Eryone's "X-Z"
  (8.7 to 47 MPa). ISO/ASTM 52921 names a bar by the axis along its length first, which makes ZX an upright bar, and the
  vocabulary's own meanings for the two labels ("Upright in the XZ plane", "Flat, loaded along Z-X") say otherwise.
  Until the owner rules which labels are upright bars, only Z counts.
- **Nine notched Charpy rows cite the unnotched method** (ISO 179/1eU): Spectrum's PA6 Low Warp and PA12-CF15 sheets,
  FormFutura's STYX and ApolloX Kevlar, and Nanovia's two PLAs. Each sheet's label says notched, which is what the row
  keeps; none states a direction, so all nine are counted apart and decide only when asked.
- **Four glass transition rows cite a Vicat or heat deflection standard** (ASTM D1525, ISO 75), as their sheets print
  it; one of them (Raise3D Premium PC Transparent) names DSC in the same line. They stand as published.
- **Eight products' only glass transition is a resin supplier's value** (Specimen type Raw material value), which is
  not the product's.

```bash
npm run sql --silent -- "with pv as (select m.* from measurements m join grades g on g.gradeid = m.gradeid where g.status = 'active' and g.role = 'procurement' and m.data_status in ('Published value', 'Published value (transcription corrected)')) select (select count(distinct gradeid) from pv where property = 'Charpy strength' and notch = 'Not published' and gradeid not in (select gradeid from pv where property = 'Charpy strength' and notch = 'Notched')) charpy_notch_unstated, (select count(distinct gradeid) from pv where property = 'Izod impact strength' and notch = 'Notched' and gradeid not in (select gradeid from pv where property = 'Charpy strength' and notch = 'Notched')) izod_only, (select count(distinct gradeid) from pv where property like 'Tensile%strength%' and direction in ('XZ', 'ZX', 'Vertical XZ (source label)') and gradeid not in (select gradeid from pv where property like 'Tensile%strength%' and direction = 'Z')) xz_zx_only, (select count(*) from pv where property = 'Charpy strength' and notch = 'Notched' and standard_load like '%1eU%') notched_1eu, (select count(*) from pv where property = 'Glass transition temperature' and standards in ('ASTM D1525', 'ISO 75')) tg_other_standard"
```

---

## Coverage, in one number

Of 795 coverage rows, 267 record a gap, 93 a comparability limitation, 41 a reviewed limitation and 13 a partial
resolution. Those are not defects; they are the database saying what it does not know. How many material values come
from products and how many are estimated is generated in `build/snapshot/counts.md`, and each material's headline,
with its products, in `build/snapshot/headlines.csv`; every estimate says how far to trust it. (A table of headline
gaps against "153 candidate materials" stood here and went stale with m141 and b34.)

```bash
npm run sql --silent -- "select status, count(*) from coverage group by 1 order by 2 desc"
```
