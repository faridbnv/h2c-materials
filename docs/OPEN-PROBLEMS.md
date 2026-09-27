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
  say so. No filament data sheet with published properties was found in the sampled manufacturers, nor in lane 4's
  search of 2026-09-26: ABC3D's PA66-CF page prints a density and "Technical Data Sheets: Coming Soon", 3DAMSS's
  PA66-CF20 page a marketing heat deflection at 1.8 MPa, Matter3D's PA66 carbon fibre page is gone, and Polymaker
  makes PA612 with carbon fibre, not glass. **PA-GF (M063)** has none either, and needs none: it is a family entry,
  and a family owns no product (D44).
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

- **Ten products state a recipe part only in words** (recounted on 2026-09-26 by the query below: 11 before m170 to
  m174, 10 after; the 33 this line said was counted before the guide filled parts, D88). Lane 3's statements give 5
  of them a chamber or enclosure need (Siraya Tech Fibreheart PPA, SUNLU PP, 3D-Fuel, two QIDI sheets) and 5 a drying
  schedule (Raise3D's "Dry PA12 CF at 80°C for 12 hours before printing") that their print profiles do not hold. The panel quotes them and the know-how state counts them, but the chamber and drying gates
  read the profiles, so those products stay unknown on them. Query: products whose `knowHow.recipe.chamber` or
  `.drying` is `collected` while `print.chamber.state` and `print.enclosure`, or `print.drying`, are unknown.

- **Twenty-nine products with no value of their own have no twin to read.** D89 lets a product whose sheet prints a
  same-material sibling's table (R053) read that sibling's values and recipe; the 47 such twins now do. The others are
  reprints of another material's table (R166 and its like) or products whose sibling holds nothing: no formulation key
  spans two materials, so they read nothing. Since m172 read their sheets' printing rows, 5 of them have no profile of
  their own. Query: active products with no measurement and no same-key sibling.
- **The guide's enclosure is the H2C's chamber, and some makers ask for more** (D90, m165). The owner ruled that for
  the nine types Bambu Lab's guide asks an enclosure for, a silent product's chamber is within the H2C, labelled as the
  guide's; 123 products read it. Sixteen products of those types state a chamber above 65 °C on their own sheets and
  keep that reading, Bambu Lab's own PPA-CF (50 to 80 °C) and PPS-CF (60 to 90 °C) sheets among them, which the owner
  named as the reason to revisit. Twenty-three whose own sheet, or twin's, asks for an enclosure without a temperature
  stay unknown, because a maker's own statement wins and only the printer maker's guide means its own enclosed
  printers; the owner ruled on 2026-09-26 that those read as the guide does (GOALS). Query: products of those nine materials whose `print.chamber.verdict` is `exceeds`, `partial` or
  `exceeds-recommended`, and those unknown with `print.enclosure` recommended.
- **What the guide prints and the tables do not use.** Its January 2025 revision (B-GUIDE) also heads ASA-CF, PC FR
  and TPU for AMS, which the current revision dropped; only the current revision is read, so those three materials'
  silent products read nothing. The guide's drying line is recorded and fills no recipe, and its annealing row,
  AMS compatibility, adhesion, desiccant, speed and fan rows are not recorded. Its TPU 95A HF nozzle row ("Hardened
  Steel / Stainless Steel") settles no hardened-nozzle question.
- **A PolyTerra PLA+ sheet** (S-POLYCN-PolyTerra-PLA-Plus-EN-V5-1) is cited by a PolyTerra PLA profile (P0316).
- **What the finishing reads (m170 to m173) left** (RESPONSE.md, "Phase 6, lane 2, finished"):
  - *Rows the rules did not reach with confidence.* Fabru / purefil's and iSANMATE's two-column tables, where a value
    cannot be placed beside its label from the text alone ("Hea5ng bed temperature" with no value on its line);
    LEHVOSS's "print bed temperature: > 50 °C" beds; Siraya Tech's "An enclosure is crucial …" and Fabru's "Needs a warm
    room, or closed pressure" (the lane 3 know-how quotes them; no profile reads them); Siraya Tech Rebound PEBA's
    "0.4mm brass nozzle works well".
  - *Sentences on a sheet that name another product,* left out: eSUN's PETG-ESD and TPU-64D sheets print "we highly
    recommend printing ABS-CF material within a closed chamber printer", and the eStars-PLA sheet the Luminous PLA
    nozzle advice.
  - *One cell recorded unread:* PolyMax PC's "Closure chamber | Not needed (70°C-100°C)", beside a note that recommends an
    enclosure and a heated chamber for large parts (P0276, Parse review).
  - *A drying cell that says drying is not needed* ("Not needed", "drying is not necessary", 4 profiles) counts as
    drying stated, with no schedule: the drying states are stated or unknown, and nothing says "not needed".
  - *The specimen blocks m170 took out of the profiles are not yet on the measurements.* D63 puts a sheet's specimen
    printing conditions in its measurements' Specimen / print parameters; 332 measurements of the 50 sheets whose
    profiles lost a specimen value say Not published there (3DXTECH's "Printed Specimen Conditions", Raise3D's "All
    testing specimens were printed under the following conditions", and the like). Five excluded high-temperature
    materials (PEKK-ESD, PEI-GF, PEI-ESD, TPI, PEEK-GF) now publish no nozzle window at all; their exclusion is their H2C
    status.
  - *The specimens' nozzle diameter* is still the profile's on Flashforge's, AzureFilm's and SIDDAMENT's sheets ("0.4mm"
    where the recommended row prints "φ0.4/0.6mm (φ0.4mm recommended)"). It decides no gate; the Printing tab shows it.
  - *A part-drying schedule that may be another sheet's:* Flashforge's PET-GF and TPU 64D and SIDDAMENT's PET CF all say
    to dry the printed model at 120-130°C for 6-8 hours, a schedule that would soften a TPU part; recorded as printed
    (m173).

```bash
npm run sql --silent -- "select profileid, drying from profiles where drying_state = 'stated' and drying_c_state = 'Not published' and drying_hours_state = 'Not published'"
npm run sql --silent -- "select profileid, sourceid, nozzle_diameter from profiles where nozzle_diameter = '0.4mm'"
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
- **Batch b36 deferred one sheet on a reader gap** (lane 4's targeted fetches, 2026-09-26): LEHVOSS's filament data
  sheet for LUVOCOM 3F PAHT 9825 NT, the printed-specimen edition of the injection moulded sheet PAHT (M147) holds
  (url:e0449d7a872e6ec0, SHA-256 ce40603f…). It prints the modulus at 3.1 GPa in XY at three rasters and 2.8 GPa in
  ZX, under two headings ("Printed using Ultimaker S5 Pro and Engineering settings", "... Fast settings"); the reader
  takes its specimen shape ("ISO 3167:2014 Typ A") for a moulded bar and 100 % infill for an elongation, so nothing
  was accepted. It alone would give PAHT a comparable stiffness, the requirement that holds it up in three templates. A reader for the condition cell and the two
  headings frees it, or the owner may allow it to be transcribed by a migration that checks each figure on its page.
- **QIDI S-White is Support for ABS (R202) and did not enter.** QIDI's bilingual layout holds it, as it holds
  QIDI's other sheets: the reader read no profile, so the seven materials the sheet lists as suitable (its Support
  pairing) have no row to go in, and it misread the water absorption (b35). The bilingual reader, or a profile read
  from the page, frees it.
- **SBC (M174) is not estimated**, and Crystal Flex publishes its strength and elongation without a direction, so
  SBC's answers are unknown until a scenario admits values as published (D84) or a resin reference gives it a
  polymers.csv row (R199). The reference the database cites, BASF's "Polystyrene and Styrolux"
  (R-BASF-POLYSTYRENE-STYROLUX), was fetched again from its recorded URL on 2026-09-26 (lane 4, batch b36): it hashes
  to the recorded 0ae31d22…, and its bytes and text are in the cache now. It does not give what a row needs. For
  Styrolux it prints a modulus of 900 to 1,800 MPa, HDT B of 62 to 77 °C and Vicat A/50 of 67 to 90 °C (Tables 3 and
  6), and "a lamellar structure" of polystyrene and polybutadiene phases; it prints no density for S/B/S (only a
  pellet bulk density) and names no morphology class for it ("amorphous structure" is said of Polystyrene). No row
  was written. What frees it: a Styrolux grade data sheet from INEOS Styrolution that prints its density, and the
  owner's word on the class (a stiff amorphous styrenic, as R200 and M174's note argue, or an elastomer like SEBS).
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
tested, and 18 answers moved; the other 175 sheets print a standard ("ISO 527") and nothing about the bar. The
targeted fetches of 2026-09-26 (batch b36, m180) settled two makers from their own documents: Extrudr's Additional
Information Sheet says every value on its sheets is from an injection moulded bar (17 values), and QIDI's Filament
Guide labels the figures its sheets print bare (PETG-GF's heat deflection at 0.45 MPa). **98 answers still change**
when as-published values are admitted, on **199 values of 165 sheets**: Fiberlogy 34, Spectrum 31, FormFutura 25,
purefil 25, Nanovia 15, Fillamentum 14, 3DJake 11, SIDDAMENT 6, 3DXTECH 4, iSANMATE 4, and 30 among thirteen others.
None of those makers publishes, on its site or in a newer revision, how its bars were made: Spectrum's download page
serves the very sheets the database holds, FormFutura's newer layout says no more, Fiberlogy's FAQ and Fillamentum's
print guides say nothing of it, SIDDAMENT's product pages print "HDT (typical)" with no load, 3DXTECH no longer lists
3DXSTAT ESD PA12, and iSANMATE's library refuses fetching tools (R084). What is left is an answer from each maker (a
short question: printed or moulded, the build orientation, the heat deflection load), or the owner's word that a
silent sheet stays as published. BLOCKING-GAPS lists the answers; [the lane 4 responses](audits/2026-09-25-re-center/RESPONSE.md),
"Phase 6, lane 4: the values that decide, re-read" and "... targeted fetches (batch b36)", list the makers. The owner's rulings of 2026-09-26 (D91, m167, m168) settled more of them; BLOCKING-GAPS gives the current
count.

- **Some sheets look like resin data and do not say so.** purefil prints ISO 294-4 mould shrinkage, Spectrum's PA6
  sheets "Linear mould shrinkage", Fiberlogy "gathered from standard reference materials and/or supplier test data",
  and 3D-Fuel's Pro PCTG "measurements from injection molded and 3D printed parts" without saying which. None is a
  statement about a row, so none was recorded.
- **Nanovia's 0° and 90° rasters are a direction the vocabulary has no value for.** Its pages state each tensile tab's
  raster and not the bar's build orientation. The ±45° tab is each product's XY value (D91, m168); the 0° rows stay
  "Stated, not a usable direction" and the 90° tabs are in the record tier only. Six pages print a 0° tab alone (PC,
  PC-ABS, PC-ABS Rail, PC-CF, PC-PTFE, PP-CF), so those products still have no XY value. Nanovia's article
  "Mechanical data on 3D printed test specimens at 3 different angles" (read 2026-09-26, not imported) says no more
  than the pages: its bars were printed "Along the tension stress", "Successively at 45° and – 45°, close to 3D
  printing standards" and "Perpendicular to the tension stress", to ISO 527-2/1A, drawn in plan. Three Nanovia pages were left: PETG repeats the 0° sentence under all three tabs, PA Food Industry states
  "ISO 3167 A test specimens" (a shape, not how it was made), and Flex prints no sentence.
- **Nanovia's "Ultimate strength" was never read.** Each tensile tab prints it (the maximum stress, which the registry
  holds as Tensile strength (endpoint unspecified)), and the reader has no property for the words, so it sits in the
  record tier (`source_facts`) on every page. The ±45° tab's would be the XY tensile strength of the twelve products
  whose ±45° modulus m168 recorded; entering it is a re-read like m168's.
- **A ±45° bar beside the sheet's own XY bar stays apart** (D91). Essentium's PPS-CF prints XY, 45/45 and ZX columns;
  its 45/45 tensile, flexural and Izod rows keep Direction 45/45, and its 45/45 bar reaches 71 % of the XY strength and
  61 % of the XY stiffness: it is the one sheet held that labels both an XY and a ±45° bar. The ruling named tensile
  values; a flexural or impact bar labelled only by its raster, of which the database holds none today, is not decided.
- **Values a cached sheet prints and nobody read, behind a "not published" blocker.** colorFabb's Lightweight PET and
  Lightweight PET FLEX sheets print their modulus in the XY plane in two columns, "Value unfoamed @ 210 °C" and "Value
  foamed @ 260 °C, flow: 60%" (2,290 and 1,290 MPa; 2,520 and 1,500 MPa); the reader reads no row with two value
  columns (source_facts), so PET-LW (M141) is "not published" on stiffness in three templates. Which print condition
  is a lightweight product's value is the owner's question before anyone records it: at 2.5 GPa the FLEX passes
  unfoamed and fails foamed. FormFutura's ApolloX Kevlar prints "Elastic tensile modulus 2200 MPa ISO 527-1", a label
  the lexicon lacks; with no direction it would be as published and settle nothing. The four graphene sheets' specific
  gravity was the same kind of gap and m181 recorded it.
- **Copies registered beside the maker's own sheet hid behind a count.** MEAS-CROSS-SOURCE-TWIN ignores a value more
  than ten sources share, so a copy whose values are common is not seen as a copy until a neighbour moves. m180
  brought nine such copies under it (3DJake's copies and the German and Italian editions of Extrudr's sheets, 3DJake's
  copies of two Spectrum sheets), and m182 retired their 81 repeated rows. One pair is left, accepted: FormFutura's HDglass and ReForm
  rPET print one table for two PETG products (R053), and recording it once under one Shared formulation key is the
  twin lane's (D89). More pairs may be waiting under the same threshold.
- **Two raw cells on MakerBot Tough** hold the metric column ("63.3 MPa") where the test method belongs; the sheet names
  "ASTM D628" (sic) and D790 in a footnote. The values are moulded (m155) and decide nothing.

```bash
npm run audit:gaps   # the answers that still change when as-published values are admitted
npm run sql --silent -- "select direction, count(*) from measurements where sourceid like 'R-NANOVIA-%' and (notes like '%m155%' or notes like '%m168%') group by 1"
npm run sql --silent -- "select sourceid, text from source_facts where sourceid like 'R-NANOVIA-%' and text like 'Ultimate strength %'"
```

---

## 16. What re-reading seventy sheets' heads found

m149 re-read the head of every source whose title was page furniture ("supported by", "TM", "TECHNICAL", "Page: 1",
"Version: 3.0") and wrote the title each prints; SOURCE-TITLE-NOT-TITLE now catches that class. m174 fixed the two
product identities it found (Anycubic PLA+ has its own grade; ELEGOO's PLA is named Not published, since its sheet prints
no name). Still open:

- **ELEGOO's PLA has no name on record.** G001-129's sheet prints only ELEGOO's logo over a table of typical values, and
  the retailer's page that linked it (3djake.com/elegoo/pla-sea-green) is not cached. The name waits for a cached page
  that prints it.
- **eSUN's older sheets print a "+" the grades do not carry.** G027-22 ("ABS") holds two sheets that both print "ABS+"
  (2021 V4.0 and 2025 V1.0). G001-142 ("PLA") is the 2021 V4.0 sheet of "PLA+", which G001-78 names from its 2026 V1.0
  sheet; the version numbering restarts and the descriptions differ, so whether they are one product is not settled
  (the GRADE-PRODUCT-DUPLICATE finding is accepted with that reason).
- **The Buddy3D cards name no maker.** The four "Product card" sheets 3DJake files under Prusa (G001-108, G020-46,
  G027-33, G030-08) carry only the Buddy3D logo; m174 named each product as its card does and kept the Manufacturer as
  the retailer lists it.
- **A title that is only the kind of document is not flagged**: 45 "Technical Data Sheet", 3 "Technical
  Specifications", "TECHNICAL DATA SHEET", "Technical Data Sheet TM TM", and Polymaker's slogan "Innovators in 3D
  printing". Some sheets print exactly that as their heading, so a rule would not be precise; the product name beside
  it is what a re-read adds.

```bash
npm run sql --silent -- "select sourceid, title from sources where lower(title) in ('technical data sheet', 'technical specifications', 'technical data sheet tm tm', 'innovators in 3d printing')"
```

---

## 17. What the tests found when they became rules

Phase 5, part 4 rewrote the tests that named records as rules over every record. These would-be rules do not hold
today, so they are recorded here rather than asserted (RESPONSE.md, phase 5, part 4):

- **Nineteen unfilled products publish a density outside their polymer's neat range and declare no Variant**, which
  R078 asks for where a density is beyond the neat polymer: Polymaker ABS 1,120, from the PolyLite ABS sheets m174
  merged into it (neat ABS to 1,110), Spectrum PET-G MATT and eSUN PETG-Matte 1,350 (neat PETG to 1,300), SUNLU PVA
  1,010 and PolyDissolve S1 1,370 (neat PVA 1,180 to 1,340), Recreus RECIFLEX 1,000, and thirteen more. Some neat ranges are narrow (ABS, ASA), so each needs its sheet re-read
  before it is declared, not a bulk Variant.
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
- **Notched Izod is its own filter now** (D94, m195): 116 products have a notched Izod value in kJ/m², 45 of them
  comparable, and 26 materials a spread. Still without a notched impact value of either test: **47 products whose only
  notched impact value is Izod in J/m** (ASTM D256, energy per metre of notch, which needs the bar's thickness no sheet
  here prints), and **13 whose only notched Izod in kJ/m² names ASTM D256**: their makers converted a J/m value with a
  thickness they do not give, which the owner ruled out (D94). Both are shown, never compared. Three notched Charpy rows
  cite a tensile or film standard (ASTM D882 twice, ISO 527 once) and still count, since the Charpy row names no
  standard; a re-read of those sheets would say whether the citation is a slip.
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
