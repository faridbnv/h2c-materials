# Open problems

> **In short.** Everything known to be wrong or missing, so nobody rediscovers it. Sections 1 to 29 are standing issues found by earlier rounds; sections 30 to 32 are what the three most recent rounds (the reader round, gap round 2 and check round 3, all 2026-10-04 and 2026-10-05) left. Each item gives the query that counts it again. The largest gaps are values makers rarely publish (heated-chamber temperature, drying, strength and heat resistance for several hundred products), source documents that contradict themselves, and checks that need a person rather than an AI.

What is known to be wrong or missing in this database, reconciled on 2026-10-05. What it holds is counted in
[build/snapshot/counts.md](../build/snapshot/counts.md). It is here so that nobody has to rediscover it, and so that
a reader can tell a gap that is being worked on from one nobody has noticed.

The current campaign inventory is [STATUS.md](audits/2026-09-30-coverage-expansion/STATUS.md),
with every remaining target and its stopping rule retained in the repository. Dated audit findings below
remain historical where explicitly labelled; their SQL queries reproduce the current records.

Everything below is derived from the data, not remembered. Each item gives the command that re-derives its figure,
so a stale number here is findable rather than believable. `npm run sql` rewrites its file first when it is not of the
tables, and refuses while `dist/db.json` is older than them: `npm run sql -- --build` builds first.

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

## 2. Published values that physics rules out

Kept, flagged, and backing nothing: no headline, estimate, conversion, implied bound or plot point (D55). Each is
what the source really prints, with the reason in its Notes. The query below lists them (80 on 2026-09-27; m182
retired V007586, recorded again from 3DJake's copy of a Spectrum sheet, and V003073 stays). The research package of
2026-09-26 fetched the current revision behind each: 74 still print the flagged value, 7 could not be retrieved, and for
two the maker's own page says otherwise. Extrudr's FLEX MEDIUM MATT page prints 420 % and 34 MPa (V004124, V004123), and
eSUN's Silk Rainbow page labels V007105's 11.1 MPa a Z value. Each is a conflict for its maker (§4), and the flags stand
(m208; archive/research-2026-09-26/disposition.csv).

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
above the sheet's own Vicat, a yield equal to the break); their reasons are in their rows. Fifteen more were flagged
as they entered: fourteen with batches b09 to b33 (a PLA's glass transition of 160 °C, a PLA's flexural modulus of
3.8 MPa, heat deflections of a carbon-fibre TPU), and a Raise3D polycarbonate "decomposing" at 129 °C, which m135's
new windows raised (D82).

These need the manufacturer to be asked, not more reading. They are the values the database refuses to use. A
larger set — 210 physics findings on 2026-09-28 — is accepted with a reason apiece and stays in use, because in each
the reason says the rule, not the number, is what does not fit: 152 `MEAS-PHYSICS-WINDOW`, 31 `MEAS-PHYSICS-STRAIN`
(brittle bars whose strain at break sits 10 to 60 % below stress over modulus, systematically across several
manufacturers, which reads as a difference in how modulus was measured rather than a transcription error), 22
`MEAS-PHYSICS-ORDER` (21 acceptances; one row pairs twice) and 5 `MEAS-PHYSICS-Z-ABOVE-XY`. Each is a candidate for
the list above if a re-read finds the sheet really does print what cannot be. `npm run data:lint -- --all` lists
them, and §6 gives the command that counts the acceptances by code.

Where a shared reason was a rule, the rule now carries it and the acceptances are gone (re-center phase 5, part 4):
a hardness whose scale the sheet does not publish is judged against both Shore scales (m160, W0079), a Vicat taken
under the heavy load is not ordered against the glass transition, and Spectrum's metal-filled PLAs declare their load
(m161, R095). Most window findings are on PLA, the flexible elastomers and the copolyesters, and on tensile modulus,
Izod and elongation at break. **The strain findings are the largest group left with one reason**: ten brittle printed
bars, eight of them Z, whose strain at break sits below stress over modulus on Bambu Lab's, IPCON's and others'
sheets. The reason is a modulus basis the sheets do not state, so no column carries it and the check cannot tell it
from a wrong value; it stays per record.

```bash
npm run sql --silent -- "select measurementid, materialid, property, normalized_value, notes from measurements
  where data_status like '%implausible%'"
```

Among the `MEAS-PHYSICS-ORDER` pairs is one a sheet orders the wrong way round, both rows transcribed correctly.
The Bambu PC and PC FR sheets print a glass transition of 145 °C and a Vicat of 119 and 114 °C, and a needle cannot sink into a polycarbonate
26 °C below the temperature at which it goes rubbery (V000679, V000700). Which of the two is wrong cannot be
settled from the sheet; it is the same PC sheet as the heat-deflection pair above. Accepted with that reason.

## 3. Values that cannot be read, or are another quantity

Quarantined (Data status "Unresolved unit / layout"): kept with the reason, never a number (D31). Four cannot be read
at all:

- **V000420** PETG hardness, and **V002188 / V002189** ABS-ESD heat deflection: unresolved unit or layout.
- **V001540** PCTG notched Izod prints "93 C KJ/m2", verified verbatim in the current sheet. 93 kJ/m² is not
  credible for a notched PCTG bar (5 to 10 is typical). The source needs correcting, not the transcription.

The rest are what their line prints under another name, found by the sweep (m127) and the close-call re-read (m156):
a processing block's melt temperature filed as a melting point, a ball-pressure pass at 125 °C filed as a Vicat, a
stress at 300 % filed as an elongation. Each row's Notes say what its line is.

```bash
npm run sql --silent -- "select measurementid, materialid, property, raw_value from measurements
  where data_status = 'Unresolved unit / layout'"
```

## 4. Unresolved recorded conflicts

`coverage.csv`, status `Conflict` or `Quarantined`. Each names what is needed:

| Row | Material | Blocked on |
|---|---|---|
| C01409 | PLA-GF | The iSANMATE sheet's glass-fibre heading contradicts its carbon-fibre description. iSANMATE's own Formnext announcement sides with glass fibre (m208), but no composition declaration states the filler. Needs one, or ash / TGA on purchased filament. |
| C01106 | PCTG | See V001540 above. |
| C01108 | PLA-CF | A third impact row repeats the XY label and states no notch. Notch recorded as Not published; nothing inferred. |
| C01411 | nGen / Amphora | colorFabb's nGen page and its printing guide name Eastman AM3300; its sheet v2.0 names HT3300 (re-read by m208). colorFabb to settle. |
| C01412 | PLA Silk | eSUN's Silk Rainbow page labels the sheet's moulded-bar figures Z and XY (m208). eSUN to say how the bars were made. |
| C01413 | TPU harder than 95A | Extrudr's FLEX MEDIUM MATT page prints 420 % and 34 MPa where the sheet prints the flagged 6.9 % and 470 N/mm² (m208). |
| C01414 | PAHT-CE | LEHVOSS's compound sheet prints 5,5 GPa and 1,40 g/cm³, the 3D4Makers filament sheet 6 GPa and 1,49 (m208). |
| C01540 | PPE/PS blend, Insublend | The own SDS prohibits food/drinking-fluid contact in §1.2 but says approved for food contact in §7.2, in both languages. Both statements remain; maker clarification and certificate/test scope needed (§23). |

Each was read again from its page images in the reader round (2026-10-04, D125): every one stands as its sources print
it, so none could be corrected from the page, and each still waits on what its row names.

C01110 (ABS: a PLA Pure listing, CA0069, filed under ABS) is resolved: the listing is filed under PLA Pure (G001-183)
since m233, once the price pass gave that grade listings of its own. C01136 (Fiberon PET-GF15's chamber) is resolved:
Polymaker's wiki prints room temperature and recommends an enclosure "for best results" (C01410, m208).

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
- **Three in-scope materials have no product**, so nothing can be their value even where a study grade or a resin
  reference publishes a number: PA66-CF (M056), PA612 (M058), PA612-GF (M060). Their values are estimates, and say so.
  The family entries (PA, CoPA, PA-CF, PA-GF and the rest) own no product by design (D44). **PA66 (M055)** has two
  since m223 (D106), both filed by the owner's ruling on the best evidence and marked inferred: Yousu Nylon, whose own
  safety data sheet names PA66 while its melting point (224 °C) is a PA6's, and Spectrum ThermaTech PA, which only
  retailers call PA6/6. Its values are theirs now; a maker's document naming either polyamide settles it.

Both are evidence gaps, not defects. Only a manufacturer publishing a sheet fixes them.

- **The families' maker-undisclosed homes, PLA blend, TPS and TPV are not estimated** (D87, D106), so a headline none
  of their products publishes comparably shows Not published and is judged unknown: Nylon-CF and Nylon-GF (one product
  each, Onyx GF's values all conditioned), TPS, TPV (one product), and the others for some headlines. The build lists them (HEADLINE-UNESTIMATED, info).
  More products, not a model, fill them.

## 6. What the estimate model cannot narrow

These are reviewed per record in `data/review/accepted-findings.csv`, each with its reason:

| Code | Rows | What it means |
|---|---|---|
| `MEAS-PHYSICS-WINDOW` | 204 | See item 2. Ten since 2026-10-02 are BASF's ISO 180 Izod values printed in J/m (m298), shown and never compared (D94). |
| `IMPACT-UNIT-STANDARD` | 46 | A sheet that prints an impact unit beside a standard that reports another (kJ/m² beside ASTM D256; BASF's J/m beside ISO 180); kept as printed, compared only in its own unit. |
| `MEAS-PHYSICS-STRAIN` | 32 | See item 2. |
| `MEAS-PHYSICS-ORDER` | 31 | See item 2. |
| `GRADE-VALUES-TWIN` | 31 | Two products whose sheets print one table, accepted as the separate products they are (R166 and its like). |
| `MEAS-CROSS-SOURCE-TWIN` | 19 | Two sources publishing the same numbers. Five are two revisions of one Polymaker sheet each, republished without remeasuring; since m174 each pair sits on one grade, so no product counts twice. The sixth is FormFutura's HDglass and ReForm rPET, one table printed for two PETG products (R053, §15). | Check round 3 added five (D131): four Bambu Lab sheets and their V3.0 revisions, which print one table, and Kingroon's TPU sheet, which reprints Bambu Lab TPU 90A's.
| `EST-OUTLIER` | 7 | Seven reviewed material/headline findings: ABS-GF, PAHT-CF and PA6 heat deflection at 0.45 MPa, the density of ASA Aero, PA6-GS and PLA-EC, and PBAT's XY modulus (6 MPa, a rubbery polyester). Each acceptance names the original value and why the model differs. Findings near the threshold come and go when the model is refit: PA6-CE's density left the list and PBAT's modulus returned when m368 moved FiberFlex Aero (2026-10-05). |
| `MEAS-PHYSICS-Z-ABOVE-XY` | 8 | Polymaker prints a Z stiffness 15 to 26 % above XY (two rows), and three sheets a Z strength or impact above their own X-Y one. Unusual at 100 % infill but not impossible; whether a sheet swapped its labels cannot be settled from the table. Three more, accepted on 2026-10-05, are where the sheet itself prints a Z value above XY: Fillamentum OBC 905's Izod impact twice, and a ZX bar a sheet advertises as its highest Z strength. |
| `EST-FAMILY-ORDER` | 5 | A reinforced material below its unfilled sibling: ASA-AF's one modulus is an injection-moulded bar; ABS-AF's two sheets state no direction; PA12-AF has no heat deflection of its own; PBT-GF's own 175 °C heat deflection is below PBT's 180 °C; Nylon-CF's (M165) modulus once b43 added Markforged's Onyx and Stratasys Nylon-CF10. The per-record reasons preserve the sheets' values and conditions. |
| `SOURCE-LOCAL-PATH` | 4 | See item 8. |
| `TEXT-FULLWIDTH` | 4 | Full-width punctuation a sheet prints inside Chinese text, kept as printed. |
| `NO-MEASUREMENTS` | 2 | See item 5. |
| `COVERAGE-SUPERSEDED` | 2 | "Evidence recorded" rows each a separate re-filing (C01184, C01185). Several Resolved rows in one domain are a log of closed events and no longer a finding (phase 5, part 4). |
| `HEADLINE-FAMILY-UNLISTED` | 1 | Heat deflection does not name Flexible Elastomers, on purpose (D56). |
| `MEAS-LOCATOR-DIRECTION` | 5 | PC-Max's page 2 figures show flat bars with Z through the thickness; the locator names that axis as figure context, not a Z-loaded result, and XY is supported (V011803 to V011807, 2026-10-03). |
| `MEAS-PHYSICS-HDT-LOADS` | 2 | Heat deflection at the lighter load below the heavier: Prusament rPLA's 1 °C inversion is within ISO 75 repeatability (V013711); the lint paired two different columns of one sheet (V014653). |
| `CONTEXT-ROW-CONTRADICTS-PAGE` | 1 | SUNLU PCL's bars were printed at 260 °C, far above its recommended 75-85 °C: a printed bar off the product's recipe (D95), a narrower form of the page's printed specimen (V010184, m365). |
| `GRADE-KEY-PRODUCTS` | 2 | Spectrum's PLA Premium sheet prints one table for five products already keyed together; the table is recorded on the key's carrier grade (R053) and the others read it. Spectrum ASA-X CF10 prints FormFutura ApolloX CF10's table, which also prints two Charpy values Spectrum's does not (check round 3). |

Each acceptance has its reason and the date it was accepted. The rows were counted on 2026-10-05 after check round 3, 406 in all, and
the command below counts them again. `npm run audit:data` refuses stale acceptances in the data; this documentation
table must also be refreshed when the accepted rows change.

```bash
cut -d, -f1 data/review/accepted-findings.csv | tail -n +2 | sort | uniq -c | sort -rn
```

Estimates that are merely wide because the evidence is thin are `EST-THIN`, informational, and need no reviewer:
more data narrows them, a review does not (D73).

## 7. Structural limits, accepted knowingly

- **The `Post-processing / application` coverage domain cannot be derived.** Its Gap rows distinguish grade-specific
  evidence from family notes a material owns, and no rule over evidence domains expresses that: some materials say
  Gap there truthfully, beside records of their own. Its rows stay stored where the other seven domains' were
  derived (D74). The current in-scope marks and unfinished campaign assessments are generated in
  [STATUS.md](audits/2026-09-30-coverage-expansion/STATUS.md). The query below counts raw rows across the entire
  catalogue, including superseded and out-of-scope findings; it therefore differs from the 136-cell UI.
- **A list column loses its missing state in SQLite.** `Standards` and `Units` are TEXT and hold `Not published`
  inline, where a number column gets a `_state` sibling and a NULL. Harmless today, because no vocabulary value
  collides with a missing-state word, but it is an inconsistency in the query layer (D75).

```bash
npm run sql --silent -- "select status, count(*) from coverage where domain = 'Post-processing / application' group by 1"
```

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

On 2026-09-27, 26 sources are in one of the first three states, and every other source
([counts.md](../build/snapshot/counts.md) has the total) was fetched, hashed and read; the query below lists the 26.
Beside them, and not in `sources.csv` at all, the import ledger holds 33 documents behind a login (`gated`,
INTAMSYS) and 15 `unreachable` after a Wayback retry (`docs/audits/2026-09-18-v2-import/STATUS.md`).

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
register is `docs/audits/2026-09-18-v2-import/second-read/findings.csv` (R165). Most findings are resolved, by the
migrations that later corrected their rows (m104 to m132, and since then m155, m192 and m196) or by the row's later
state; the rest are deferred to V2.1 with the reason in their Resolution: conditions and standards the sheet states
that the reader could not pair (QIDI's bilingual columns, per-line notches and loads on documents the sweep did not
reach). None is open without a disposition. Refreshed on 2026-09-28 after m218/m219: 88 are resolved and 57 remain
deferred with their written reasons. A migration that corrects a deferred row moves it to resolved the next time
the register is rewritten; a deferral does not mean the underlying missing fact is known.

```bash
npm run ingest:second-read -- --open  # rewrites the register from the data and lists what is open; commit the change
```

---

## 11. What the sweep found and is not yet fixed

The sweep (PLAN-REMAINING 2.3) read the 200 values furthest from their material's others against their sheets:
`docs/audits/2026-09-18-v2-import/sweep/sweep-200.csv`, each verdict with the line quoted, and m126 to m133 fixed
each class it named across the whole table (the record: `sweep/README.md`). Still open:

- **Stresses at a stated elongation have their own property since m297** (D122, 2026-10-02): "Tensile stress at 100 %
  elongation" and its siblings, which no headline reads. QIDI PEBA 95A's 9.17 MPa at 100 % (V008146) was its comparable XY
  strength until then. Nanovia Flex V0's "Resistance at 100% elongation 7 MPa" and "at 300% elongation 10 MPa" and its
  "Tensile resistance 27 MPa", to "VDE282 part 10", are recorded (m298); the standards vocabulary does not hold VDE 0282,
  so their Standards say Not published beside the sheet's words.

- **Nobufil's printed column is transcribed since m298** (2026-10-02): every two-value row of the twelve sheets m225 did
  not reach, read per column on the page (FDM H a printed bar whose direction no sheet states, Injection a moulded one).
  None of the sheets says what H is. Two Injection cells print "n. B." and "no break" and stay unrecorded; ABSx ESD's
  surface resistivity ("10^7 - 10^9 Ω") stands under Injection and is recorded as "do not assume printed".
- **BASF's extended sheets are read per column since m298** (PET CF15, PAHT CF15, ASA): each value in the direction its
  column names, the impact tables in full, dry or conditioned as each heading's footnote says. Left: BVOH's Extended TDS
  prints the same values as the BVOH sheet the database holds, with the specimen printer, conditioning and test speeds;
  they are recorded once, under the other sheet, which states no conditioning. BASF prints its ISO 180 Izod values in
  J/m (5.7 J/m on PET CF15): recorded as printed, never compared (D94), accepted with that reason.
- **The values beyond |z| 3 the 200 did not reach** stay in `v_measurement_z` (405 of the 530 the query lists on
  2026-09-27; the rest are the sweep's own); EST-GRADE-OUTLIER raises the worst of them at grade level.

```sql
select * from v_measurement_z where abs(z) > 3 order by abs(z) desc;
```

---

## 12. Print recipes the sheets state and the database does not hold

Found by re-center lane 2 (m136, 2026-09-25), which filled what the products' own cached sheets state and the parsers
read: the record is `docs/audits/2026-09-25-re-center/RESPONSE.md`, "Lane 2". Still open:

- **Two products state a recipe part only in words** (three before 2026-10-02): SUNLU PP ("Requires a PP build plate for
  optimal enclosed-chamber printing results", which asks for nothing) and QIDI ASA-Aero ("please place the enclosed printer
  in a ventilated environment", about ventilation as much as an enclosure). 3DXTECH's 3DXSTAT ESD-PLA has a profile of its
  maker's page now (P1365, m299): 215-250C, 40-70C, "Heated Chamber | Not required", "no enclosure required", dried at
  65C for 4 hours. Query: products whose `knowHow.recipe.chamber` or `.drying` is `collected` while `print.chamber.state`
  and `print.enclosure`, or `print.drying`, are unknown.

- **Twenty-nine products with no value of their own have no twin to read.** D89 lets a product whose sheet prints a
  same-material sibling's table (R053) read that sibling's values and recipe; the twins now do
  ([counts.md](../build/snapshot/counts.md) counts them). The others are reprints of another material's table (R166
  and its like) or products whose sibling holds nothing: no formulation key spans two materials, so they read nothing.
  Since m172 read their sheets' printing rows, 5 of them had no profile of their own, and m204 gave ReForm rTPU 90A
  and 85A and Python Flex 90A theirs from their sheets (the research package of 2026-09-26). Query: active products with
  no measurement and no same-key sibling.
- **The guide's enclosure is the H2C's chamber, and some makers ask for more** (D90, m165). The owner ruled that for
  the eleven types Bambu Lab's guide asks an enclosure for (nine when m165 made the reading), a silent product's
  chamber is within the H2C, labelled as the guide's: 123 products read it when m165 made the reading, and 105 on 2026-09-27. Products of those types that state
  a chamber above 65 °C on their own sheets keep that reading (16 when D90 counted them, 21 on 2026-09-27), Bambu
  Lab's own PPA-CF (50 to 80 °C) and PPS-CF (60 to 90 °C) sheets among them, which the owner named as the reason to
  revisit. Since D93 (m190, 2026-09-27) a maker's own "enclosure needed" or "recommended" with no temperature reads
  as the guide's tick does: 28 products' own sheets and one twin's (Kratos PC, whose own sheet says "Enclosure
  recommended for large(r) prints" and holds no profile of its own). None of those types is unknown with an
  enclosure asked for since m193 merged PolyMax PC's two revisions: the 2018 sheet's "70 – 80 (recommended)" now
  speaks for it beside the V5.5 sheet's unread "Not needed (70°C-100°C)" (below). Query: products of those eleven
  materials whose `print.chamber.verdict` is `exceeds`, `partial` or `exceeds-recommended`, and those unknown with
  `print.enclosure` recommended.
- **What the guide prints and the tables do not use.** Since m209 the build reads the revision Bambu Lab's guide page
  links (B-GUIDE, eighteen types; D88 amended), checked on the page in headless Chrome. ASA-CF and PC FR are mapped to
  it, and the 15-column copy's rows are kept and read by no material. TPU for AMS is not mapped: its material (M040) is
  an alias, and the TPU classes are not one Bambu product. The guide's drying fills a silent product's drying, labelled as the guide's (D127); its
  annealing row, AMS compatibility, adhesion, desiccant, speed and fan rows are not recorded. Its TPU nozzle rows
  ("Hardened Steel / Stainless Steel") settle no hardened-nozzle question.
- **A PolyTerra PLA+ sheet** (S-POLYCN-PolyTerra-PLA-Plus-EN-V5-1) is cited by a PolyTerra PLA profile (P0316).
- **What the finishing reads (m170 to m173) left** (RESPONSE.md, "Phase 6, lane 2, finished"):
  - *Rows the rules did not reach with confidence.* iSANMATE's two-column tables, and purefil's where the text layer
    garbles the label ("Hea5ng bed temperature" with no value on its line), are read since the reader round (D125): the
    reading-order view keeps a column's label with its value, and the ligature view puts purefil's "ti" back (m351).
    Left: Siraya Tech's "An enclosure is crucial …";
    Siraya Tech Rebound PEBA's "0.4mm brass nozzle works well". Since the profile root-cause sweep (D120) the reader
    reads purefil's value two lines under its label, LEHVOSS's "print bed temperature: > 50 °C" (six profiles) and
    Fabru's "Needs a warm room, or closed pressure" (P1245, P1257).
  - *Sentences on a sheet that name another product,* left out: eSUN's PETG-ESD and TPU-64D sheets print "we highly
    recommend printing ABS-CF material within a closed chamber printer", and the reader leaves out a clause that names
    "<type> material" its sheet's title does not (D120). The eStars-PLA sheet's Luminous PLA nozzle advice is now held
    (P0621): eStars-PLA is itself a luminous PLA ("gorgeous luminous star appearance effect"), so the advice is its own.
  - *One cell recorded unread:* PolyMax PC's "Closure chamber | Not needed (70°C-100°C)", beside a note that recommends an
    enclosure and a heated chamber for large parts (P0276, Parse review).
  - *The specimen blocks on the other sheets, and what still waits.* D63 puts a sheet's specimen printing conditions in
    its measurements' Specimen / print parameters. m192 wrote them on 310 of the 332 measurements of the 50 sheets whose
    profiles m170 left with no value (3DXTECH's "Printed Specimen Conditions", Raise3D's "All testing specimens were
    printed under the following conditions", Polymaker PC-PBT's "How to make specimens"); the other 22 are density, DSC,
    melt flow, water uptake or moisture, not measured on the bar the block describes, and one 6 GPa modulus Raise3D's PET
    CF prose claims. The 122 other sheets m170 read a specimen block on (their profiles kept a recommended row) held
    1,390 measurements Not published there on 2026-09-27, 1,016 of them bars or printed specimens. m300 (2026-10-02)
    wrote Polymaker's and Fiberon's letter-spaced blocks, and Eryone's and SUNLU's notes, on 626 bar rows (below; §18).
    m358 (2026-10-05) wrote the blocks of 96 further sheets (Flashforge, eSUN, the older Polymaker sheets, Raise3D
    Premium, AzureFilm, 3DJake and SIDDAMENT): 252 page statements and 480 values' print parameters. m365 added 240 page
    statements for sentences that state the bars' printing in one line (548 values) and 165 values' conditioning
    sentences. What still waits is the heat-deflection bars the blocks do not name, and the sheets whose Locator names no
    page, which no page_context row reaches. On 2026-10-05, 1,404 bar or printed-specimen rows on 251 sheets whose
    page_context rows state a printed specimen still hold Not published print parameters (query below); a sheet that
    prints no block leaves them so, and m192's CSV and check take the rest sheet by sheet. Five excluded
    high-temperature materials (PEKK-ESD, PEI-GF, PEI-ESD, TPI, PEEK-GF) now publish no nozzle window at all; their
    exclusion is their H2C status.
  - *Polymaker's newer sheets set "How to make specimens" letter by letter* ("H O W T O M A K E S P E C I M E N S"),
    which m128's reader did not match. Since m300 (2026-10-02) a page_context row per sheet and scope the block names says
    the bars were printed (34 sheets; 90 rows beside the three PLA Pro already had), and its conditions are each bar row's
    print parameters. The blocks name
    no heat-deflection bar, so a sheet's heat deflection stays "do not assume printed"; Fiberon PANCHROMA's and PETGF15's
    rows name no page in their Locator, so no page_context row reaches them.
  - *The specimens' nozzle diameter* is still the profile's on Flashforge's, AzureFilm's and SIDDAMENT's sheets ("0.4mm"
    where the recommended row prints "φ0.4/0.6mm (φ0.4mm recommended)"). It decides no gate; the Printing tab shows it.
  - *A part-drying schedule that may be another sheet's:* Flashforge's PET-GF and TPU 64D and SIDDAMENT's PET CF all say
    to dry the printed model at 120-130°C for 6-8 hours, a schedule that would soften a TPU part; recorded as printed
    (m173).
- **No alias carries a chamber band since m303** (2026-10-02): the five rows left through the removal ledger, and the
  build refuses a band on a family entry or an alias as it does on an excluded material (CHAMBER-BAND).
- **Eight heated-chamber recommendations with no setpoint** (2026-10-06, the withdrawn round's E4 holds,
  [OUTCOMES.md](audits/2026-10-06-published-evidence/OUTCOMES.md)): six CarbonX products (CF PC/ABS, CF PA12, CF HTN,
  CF ABS, CF PC, CF ezPC) recommend a heated chamber in words only; Raise3D Hyper Core ABS CF15 gives coupon settings
  and no chamber; BASF Ultrafuse PC GF30 prints a dash. None says whether 65 °C will do, so each stays unknown.

```bash
npm run sql --silent -- "select profileid, drying from profiles where drying_state = 'stated' and drying_c_state = 'Not published' and drying_hours_state = 'Not published'"
npm run sql --silent -- "select profileid, sourceid, nozzle_diameter from profiles where nozzle_diameter = '0.4mm'"
npm run sql --silent -- "select count(*), count(distinct sourceid) from measurements where specimen_print_parameters = 'Not published' and data_status not like 'Retired%' and specimen_type in ('Printed specimen', 'Not published (do not assume printed)') and sourceid in (select sourceid from page_context where specimen_type like 'Printed%')"
```

---

## 13. Makers' know-how: what the reading left, and where it may be wrong

Found by re-center lane 3 (m140, 2026-09-25), which recorded 4,502 statements in the makers' words on 888 products
from 1,262 documents read: the record is `docs/audits/2026-09-25-re-center/RESPONSE.md`, "Lane 3". Every statement
was chosen by an agent and none by a person; a sample of 50 was read against the page. Still open:

- **The makers' sites were searched for most of them, not all.** The research package of 2026-09-26 searched the
  makers' sites for the 198 products left "sheet silent", saving each page it read. m206 recorded 157 statements from
  151 of those pages, and dated 153 site searches (Scope `maker site`).
  - **Moved:** products with a maker's statement went from 881 to 1,039, and sheet-silent products from 198 to 45.
  - **The 45 left:** its handoffs ask the owner about 31 (a renamed product line, a 60D sheet on a 90A product, pages
    that name another product) and the maker about 14. They are in `archive/research-2026-09-26/owner-handoffs.csv`.
  - **One product is "searched, nothing published" for general know-how** (3DJake's ASA, G031-37). b39's chamber
    searches initially labelled six more this way even though their captured pages contained maker claims; m222
    records those six exact paragraphs as record-tier know-how, without numeric/environmental decisions. The chamber-specific outcomes on
    63 products (60 maker searches and three access/identity limits) are in
    `docs/audits/2026-09-28-gap-closing/C-SITE-OUTCOMES.csv`; qualitative heating advice without a setpoint remains
    unresolved. Re-derive the general counts with `npm run audit:know-how`.
  - **41 products have no document read** (state no-document-read; 44 before b39, 31 on 2026-10-02, and 41 on
    2026-10-05 by the worklist, with 47 sheet-silent). Most came in with batches b34, b35, b37 and b43 after lane 3
    had read; b43's 12 new products read no know-how.
  - **Where the lists are:** `docs/audits/2026-09-25-re-center/KNOW-HOW-WORKLIST.md` (`npm run audit:know-how`), and
    `archive/research-2026-09-26/disposition.csv` for what became of each research finding.
- **"Fabru" and "Fabru / purefil" held some products twice**; since m302 (D123) each such product is one grade, its
  language editions' records on it. Fabru's POM (G087-01, G087-04) is not confirmed: G087-01's sheet has no cached text.

- **The Panchroma TDS that covers Silk PLA and CoPE** was left out whole by lane 3. The makers' pages gave both
  products a statement (m206). The Raise3D sheet that was PA12 CF+ is that product's own now: G059-03, under PA612-CF
  (m205), with its statements.
- **Some statements are several bullets or table cells run together**, because the text was rebuilt from the page
  without its bullet marks: Prusa's ABS feature list, Ensinger's target industries. Readable, not clean.
- **Template sentences.** A maker's sentence with only the product's name changed, printed on at least four materials
  and half the maker's range, was dropped: Raise3D's brass-nozzle abrasion sentence (11 rows) and Nanovia's
  air-extraction sentence (19 rows). Narrower templates were kept or dropped by each reader's judgement (Polymaker's and
  QIDI's dry-box sentences kept, SIDDAMENT's support and oven sentences dropped).
- **That original know-how pass excluded** non-English text, retailer witnesses and makers' safety data sheets.
  Later bounded campaigns reread selected originals in those lanes, including Insublend's SDS, without claiming
  the rest of that population was reviewed. A wear statement does not establish a typed hardened-nozzle
  requirement; unresolved product-specific gate questions remain in the current worklist (§27).

```bash
npm run sql --silent -- "select topic, count(*) from evidence where domain = 'Makers'' know-how' group by 1 order by 2 desc"
npm run sql --silent -- "select evidenceid, gradeid, finding from evidence where domain = 'Makers'' know-how' and finding like '%CF+%'"
```

## 14. The held sheets: what did not enter, and what the homes leave open

Batch b34 (m143, D87) took the 74 sheets deferred for their identity; 44 entered, 6 were registered to products the
database holds, 2 are not data sheets, and 22 were deferred again with the gap named in the ledger. The owner answered
the three identity questions they left the same day, and batch b35 (m144, m145) took two of those sheets in. Batch
b37 (m207, the owner's leave of 2026-09-27) took two more whose makers' pages the research package of 2026-09-26
found: Fillamentum Timberfill (PLA Wood, R203) and NinjaTek Eel (TPU-EC, R204). Batch b43 (m362, gap round 2) took ten of the
thirteen sheets that waited on a reader gap, read page by page. 8 remain deferred.

- **Five name neither a polymer nor a family**, so no home reaches them:
  - colorFabb's 2015 "20% milled carbon fibres";
  - igus iglidur A350;
  - Nuterials JECTO;
  - FormFutura SKULPT;
  - Multi3D Electrifi.

  A maker document naming the polymer or the family frees each. Electrifi's safety data sheet names one, "biodegradable
  polyester" (staged as a witness; the ledger note says so), but no material or home holds a polyester filament. The
  owner's word on a polyester home frees it.
- **Three wait**, of the thirteen that waited on a reader gap. Batch b43 (m362) read the other ten page by page and
  admitted them (§31): Antero 800NA, Nylon-CF10, Essentium PA and PA-CF, 3D4Makers PI Z2, Smartfil FLEX 77A,
  Flashforge FABRIAL-R, BigRep HI-TEMP, Markforged's Composites (Onyx, Onyx FR, Nylon White) and QIDI S-White. The three
  that stay are Stratasys' Composite Molding Material (ST-130), which names no base polymer; Diran 410MF07, "a
  nylon-based ... mineral-filled 7%", which waits on the owner for its home; and FKuR's Fibrolon trial-grade sheet, which
  names no filament. Markforged's Onyx ESD, the fourth column of the Composites table, did not enter either (§31).
- **Batch b36 deferred one sheet on a reader gap**, and m198 entered it by the owner's leave (decision 7 of 2026-09-26):
  LEHVOSS's printed-specimen sheet for LUVOCOM 3F PAHT 9825 NT is a second source of G147-01, checked line by line on
  its hash-checked page. PAHT (M147) has its comparable stiffness now, 3.1 GPa: it passes Lightweight structure and
  fails High-stiffness fixture. Left on the sheet, in the record tier: the thermal expansion it prints as 0.5 × 10⁻⁵/K,
  a tenth of an unfilled polyamide's, which wants LEHVOSS's word before it is a number here; the 200 h service
  temperature and the insulation resistance, which the registry has no property for; and its processing window (265
  to 290 °C, bed ≥ 50 °C, drying 110 °C for 6 to 8 h), which differs from the moulded sheet's (270 to 290 °C) that
  G147-01's profile holds. The reader gap itself (a condition cell and two headings) is not closed; a second sheet of
  this layout would need the same kind of migration, or the reader.
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
- **purefil's GreenTEC (d299af0d689965eb) is answered and not imported.** R179 names GreenTEC (PLA blend since m223);
  the sheet was held before b34 and is not among the 74 the owner freed, so it waits for imports to resume.
- **A TPU rated only in prose, or not at all, needs a ruling.** The reader files a TPU by the rating in its name or its
  sheet's Shore hardness row (hardness-classes.csv); Copper3D's MD Flex says "TPU98A" in a sentence, and R197 pins it.
  Since m223 a TPU that states no rating has no class to go to ("TPU, hardness not stated" is a family entry, D106):
  six of the eight it held printed their rating in their sheets' prose, and R206 to R213 pin all eight. A new one waits
  for its maker's rating.
- **Eleven products' makers disclose no polymer anywhere the search of 2026-09-28 reached** (m223, D106): colorFabb PA
  Neat, PA Blue Metal Detectable and PA-CF Low Warp, Nanovia PA Food Industry, MakerBot Specialty Nylon, CreatBot Ultra
  PA, Markforged Onyx GF, and Nanovia TPE 22D, Flex VX, Flex B4C and ISTROFLEX. They stay in the maker-undisclosed
  homes; the leads for each (retailers' PA6/PA12 for colorFabb, against its own 235 °C melting point; Nanovia's
  laurolactam and MXDA monomers; ISTROFLEX's "modified polyester alloy") and what would settle it are in
  `docs/audits/2026-09-28-polymer-names/README.md`. ISTROFLEX, like Multi3D Electrifi, waits on the owner's word on a
  biodegradable-polyester home.
- **SUNLU TPU (G039-51) is SUNLU TPU 95A (G039-19)** on SUNLU's own 2024-06 sheet ("Product Name:TPU", Shore 95) and
  the 95A product page, and is merged into it (m302); its 2024 values are a re-test, not a second formulation. The
  3DJake copy prints no hardness, so the identity rests on SUNLU's own documents.

- **Heat deflection names its families** (hdt045 Applies to, D87). A new family of rigid polymers must be added there,
  or heat deflection will not apply to it. `data:lint` now names every family with candidate materials that the list
  leaves out (HEADLINE-FAMILY-UNLISTED); Flexible Elastomers is accepted with its reason, so a new family fails verify
  until someone decides.
- **The two profiles that left printed settings unread are typed** (m204): Spectrum ThermaTech PA's nozzle (P1163,
  "standard speed 250-280°C") and 3DXTECH WearX's enclosure (P1169, "Recommended"). m172 had typed WearX's and BigRep
  HI-TEMP CF's beds.

```bash
npm run sql --silent -- "select m.materialid, m.original_name, count(g.gradeid) from materials m join grades g on g.materialid = m.materialid where m.materialid between 'M164' and 'M175' and g.status = 'active' group by 1, 2"
```

## 15. Values that decide, published without their direction or load, that no cached sheet settles

Lane 4 re-read the 251 product values behind the 124 answers that change when as-published values are admitted
(BLOCKING-GAPS, D84), on their 199 cached sheets (m155, 2026-09-25). 24 sheets state how their bars were made or
tested, and 18 answers moved; the other 175 sheets print a standard ("ISO 527") and nothing about the bar. The
targeted fetches of 2026-09-26 (batch b36, m180) settled two makers from their own documents: Extrudr's Additional
Information Sheet says every value on its sheets is from an injection moulded bar (17 values), and QIDI's Filament
Guide labels the figures its sheets print bare (PETG-GF's heat deflection at 0.45 MPa). After them **98 answers still
changed** when as-published values were admitted, on **199 values of 165 sheets**: Fiberlogy 34, Spectrum 31,
FormFutura 25, purefil 25, Nanovia 15, Fillamentum 14, 3DJake 11, SIDDAMENT 6, 3DXTECH 4, iSANMATE 4, and 30 among
thirteen others. None of those makers publishes, on its site or in a newer revision, how its bars were made:
Spectrum's download page serves the very sheets the database holds, FormFutura's newer layout says no more,
Fiberlogy's FAQ and Fillamentum's print guides say nothing of it, SIDDAMENT's product pages print "HDT (typical)" with
no load, 3DXTECH no longer lists 3DXSTAT ESD PA12, and iSANMATE's library refuses fetching tools (R084). What is left
is an answer from each maker (a short question: printed or moulded, the build orientation, the heat deflection load),
or the owner's word that a silent sheet stays as published. BLOCKING-GAPS lists the answers;
[the lane 4 responses](audits/2026-09-25-re-center/RESPONSE.md), "Phase 6, lane 4: the values that decide, re-read"
and "... targeted fetches (batch b36)", list the makers. The owner's rulings of 2026-09-26 (D91, m167, m168) settled
more of them. BLOCKING-GAPS gives the current count: 92 on 2026-09-27, before the research intake, 94 after it, and
70 on 2026-09-28, after the gap closing and m223.
m200 to m203 added comparable values that settle some answers and admit more as-published ones.

The research package of 2026-09-26 searched every maker's site and archive again, value by value, for the 217 values
it was given:
- It found a stated load for one more of them: Spectrum's Product Portfolio 2024 prints PA6 Low Warp's "HDT B". m202
  applied it with three more Spectrum rows the same table settles.
- It confirmed what m180 had found for Extrudr and QIDI.
- For the rest it wrote the maker's question row by row, 255 vendor handoffs in all. That is
  `archive/research-2026-09-26/owner-handoffs.csv`, the list to send.

- **Some sheets look like resin data and do not say so.** purefil prints ISO 294-4 mould shrinkage, Spectrum's PA6
  sheets "Linear mould shrinkage", Fiberlogy "gathered from standard reference materials and/or supplier test data",
  and 3D-Fuel's Pro PCTG "measurements from injection molded and 3D printed parts" without saying which. None is a
  statement about a row, so none was recorded.
- **Onyx GF's XY bars were on its sheet all along** (m200): batch b34 read one column of Markforged's two-page table,
  the XZ one. Both pages say "Onyx GF specimens were printed ... on an FX10". The dry XY values now decide, and Nylon-GF,
  maker-undisclosed polyamide passes Lightweight structure.
- **Nanovia's 0° and 90° rasters are a direction the vocabulary has no value for.** Its pages state each tensile tab's
  raster and not the bar's build orientation. The ±45° tab is each product's XY value (D91, m168); the 0° rows stay
  "Stated, not a usable direction" and the 90° tabs are in the record tier only. Six pages print a 0° tab alone (PC,
  PC-ABS, PC-ABS Rail, PC-CF, PC-PTFE, PP-CF), so those products still have no XY value. Nanovia's article
  "Mechanical data on 3D printed test specimens at 3 different angles" (read 2026-09-26, not imported) says no more
  than the pages: its bars were printed "Along the tension stress", "Successively at 45° and – 45°, close to 3D
  printing standards" and "Perpendicular to the tension stress", to ISO 527-2/1A, drawn in plan. Three Nanovia pages were left: PETG repeats the 0° sentence under all three tabs, PA Food Industry states
  "ISO 3167 A test specimens" (a shape, not how it was made), and Flex prints no sentence.
- **Nanovia's "Ultimate strength" is read on the ±45° tab only.** m199 added the ±45° tab's ultimate strength as the
  XY tensile strength of the twelve products whose ±45° modulus m168 recorded (16 to 77 MPa). The 0° and 90° tabs'
  strengths stay in the record tier (`source_facts`), as their other rows do, and the six pages that print a 0° tab
  alone (above) still give their products no XY value.
- **A ±45° bar beside the sheet's own XY bar stays apart** (D91). Essentium's PPS-CF prints XY, 45/45 and ZX columns;
  its 45/45 tensile, flexural and Izod rows keep Direction 45/45, and its 45/45 bar reaches 71 % of the XY strength and
  61 % of the XY stiffness: it is the one sheet held that labels both an XY and a ±45° bar. The ruling named tensile
  values; a flexural or impact bar labelled only by its raster, of which the database holds none today, is not decided.
- **Values a cached sheet prints and nobody read, behind a "not published" blocker.** colorFabb's Lightweight PET and
  Lightweight PET FLEX sheets print their mechanical table in two columns, unfoamed and foamed; the owner ruled the
  foamed one the product's (D95), and m197 recorded both columns of all six rows, the unfoamed one as "Printed off the
  product's recipe". PET-LW (M141) now fails the three stiffness templates rather than being unknown. colorFabb's
  LW-PLA and LW-PLA-HT sheets print the same two columns, and m298 recorded both as m197 did (2026-10-02). The PETs'
  foamed 260 °C nozzle row is a profile of its own since m291 (P1356, P1358). FormFutura's ApolloX Kevlar prints "Elastic tensile modulus 2200 MPa ISO 527-1", a label the lexicon
  lacks; with no direction it would be as published and settle nothing. The four graphene sheets' specific gravity was
  the same kind of gap and m181 recorded it.
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
npm run sql --silent -- "select sourceid, raw_value, locator from measurements where sourceid like 'R-NANOVIA-%' and property like 'Tensile strength%' and locator like '%Ultimate%strength (+45%'"
```

---

## 16. What re-reading seventy sheets' heads found

m149 re-read the head of every source whose title was page furniture ("supported by", "TM", "TECHNICAL", "Page: 1",
"Version: 3.0") and wrote the title each prints; SOURCE-TITLE-NOT-TITLE now catches that class. m174 fixed the two
product identities it found (Anycubic PLA+ has its own grade; ELEGOO's PLA is named Not published, since its sheet prints
no name), and m193 three that eSUN's and Polymaker's sheets settle (G027-22 is ABS+, as both its sheets print; eSUN PLA+
and PolyMax PC each sit on one grade). Still open:

- **ELEGOO's PLA has no name on record.** G001-129's sheet prints only ELEGOO's logo over a table of typical values, and
  the retailer's page that linked it (3djake.com/elegoo/pla-sea-green) is not cached. The name waits for a cached page
  that prints it.
- **The Buddy3D cards name no maker.** The four "Product card" sheets 3DJake files under Prusa (G001-108, G020-46,
  G027-33, G030-08) carry only the Buddy3D logo; m174 named each product as its card does and kept the Manufacturer as
  the retailer lists it. Re-read on 2026-09-27: no cached page names a maker.
- **Other revisions of one sheet may still sit on two grades.** m174 and m193 merged seven pairs found by reading
  (m193: eSUN PLA+, whose 2021 Version 4.0 and 2026 Version 1.0 sheets print the same product, since eSUN's 2024
  template restarts every sheet at 1.0; and Polymaker's PolyMax PC, 2018 Version 4.1 and V5.5). No rule finds them:
  GRADE-PRODUCT-DUPLICATE compares names, and a revision often carries the maker's name before the product's. m302
  (2026-10-02) merged 29 more, PolyLite ABS V5.3 into Polymaker ABS (G027-09) among them, each confirmed on both sheets;
  more may wait where the names differ by more than a revision.
- **3D-Fuel's Pro PCTG is named "Pro PCTG" since m299** (G088-04); its one profile (P1279) publishes no setting, so its
  print gates are unknown although its know-how quotes a chamber (§12).
- **A title that is only the kind of document is not flagged**: "Technical Data Sheet" on some forty sources, a few
  "Technical Specifications" and "TECHNICAL DATA SHEET", and Polymaker's slogan "Innovators in 3D printing"; the query
  lists them. Some sheets print exactly that as their heading, so a rule would not be precise; the product name beside
  it is what a re-read adds.

```bash
npm run sql --silent -- "select sourceid, title from sources where lower(title) in ('technical data sheet', 'technical specifications', 'technical data sheet tm tm', 'innovators in 3d printing')"
```

---

## 17. What the tests found when they became rules

Phase 5, part 4 rewrote the tests that named records as rules over every record. These would-be rules do not hold
today, so they are recorded here rather than asserted (RESPONSE.md, phase 5, part 4):

- **Unfilled products publish a density outside their polymer's neat range and declare no Variant**, which R078 asks
  for where a density is beyond the neat polymer; the query lists them (20 on 2026-09-27, 19 on 2026-10-02): Spectrum
  PET-G MATT and eSUN PETG-Matte 1,350 (neat PETG to 1,300), Polymaker ASA 1,130 (neat ASA to 1,110), SUNLU PVA 1,010 and
  PolyDissolve S1 1,370 (neat PVA 1,180 to 1,340), Recreus RECIFLEX 1,000, and the rest. PolyLite ABS left the list when
  its V5.3 sheet's 1,120 joined Polymaker ABS's grade (m302), whose value is V6.0's 1,040. Some neat
  ranges are narrow (ABS, ASA), so each needs its sheet re-read before it is declared, not a bulk Variant.
- **A heat deflection estimate reaches past its polymer's melting point** at the upper end, with its centre below it:
  PA612-GF (plausible to 220 °C, melting 218). PCL's was the other; it now shows its product's own 57 °C.
- **A study grade carries product values**: G052-R1 (Stratasys, PA12) has a density and a heat deflection of its own.
  It is in no material's list and backs nothing, so nothing reads them.

```bash
npm run sql --silent -- "select p.gradeid, p.manufacturer, p.product, p.value, y.neat_density_min_kg_m3, y.neat_density_max_kg_m3 from products_compiled p join materials m on m.materialid = p.materialid join polymers y on y.polymerid = m.estimate_identity where p.headline_key = 'density' and m.modifier_filler = 'Unfilled / unspecified' and coalesce(p.variant, '') = '' and p.gradeid not like '%-R%' and (p.value > y.neat_density_max_kg_m3 or p.value < y.neat_density_min_kg_m3)"
```

## 18. What the three new selectable properties leave out

The layer strength, the notched impact strength and the glass transition (D92, m175, m176) take only what their rows
say. What stays out is recorded and shown, under each headline's comparison note in the drawer. Counts are active
procurement products, of 2026-09-26 where a line gives no other date; the query below gives the current ones:

- **65 products publish a Charpy value with no notch stated** and no notched one (75 before m196). m196 re-read the
  heading of every Charpy row with no notch (164) on its cached page and set the notch on the 17 whose page states it:
  12 notched (Bambu Lab's "(notched)" under the second value of its X-Y cell, BASF's extended sheets, QIDI's 缺口冲击强度,
  Fillamentum's "notched", a 1eA method) and 5 unnotched ("unnotched", an eU method); six products gained a notched
  value, four of them comparable. The rest print "Impact strength" or "Charpy impact strength" with ISO 179 or GB/T
  1043 and nothing more (Bambu Lab's Z values and the first value of each X-Y pair, Raise3D, SIRAYA, eryone, CreatBot,
  IPCON, PROGRAFEN, Braskem, Spectrum, and Polymaker's plain "(X-Y)" rows beside a separate "(X-Y) notched" one), and
  stay as they are. colorFabb's Economy PLA prints "Impact Strength (Ch-N 23ºC)": Ch-N is commonly Charpy notched, but
  no colorFabb page spells it out, so it is left for a reader who can confirm it. BASF's three extended sheets print a
  full impact table (Charpy and Izod, notched and unnotched, dry and conditioned, in XY, XZ and ZX) of which the import
  kept one number each; m298 (2026-10-02) recorded every cell of it in its column.
- **Notched Izod is its own filter now** (D94, m195), because many products publish a notched Izod value and no
  notched Charpy one (izod_only in the query, 160 on 2026-09-27): 116 products have a notched Izod value in kJ/m², 45
  of them comparable, and 26 materials a spread. Still without a notched impact value of either test: **47 products
  whose only notched impact value is Izod in J/m** (ASTM D256, energy per metre of notch, which needs the bar's
  thickness no sheet here prints), and **13 whose only notched Izod in kJ/m² names ASTM D256**: their makers converted
  a J/m value with a thickness they do not give, which the owner ruled out (D94). Both are shown, never compared.
  Three notched Charpy rows cite a tensile or film standard (ASTM D882 twice, ISO 527 once) and still count, since the
  Charpy row names no standard; a re-read of those sheets would say whether the citation is a slip.
- **Products that publish their across-layer tensile strength only under an XZ or ZX label** (xz_zx_only: 33 on
  2026-09-27, 38 before m191, which made Z the tensile rows of six whose sheets show or say the bar stood upright:
  BASF's "ZX | Upright" columns, Essentium's drawing, two Eryone sentences naming the "X-Z" value the "Z-axis tensile
  strength"). Since m301 (2026-10-02) the owner's ruling makes the other Eryone "X-Z" sheets of that template Z too
  (D123; 27 sheets, 8.7 to 47 MPa). Left, because nothing on the page says how the bar stood: SUNLU's two "(Z-X)" sheets
  (their drawings show only flat bars), Flashforge HS PLA's
  "(X-Z)", iSANMATE PEI 9085's "ZX Orientation", Prusament PVB's "Vertical xz" (49 MPa beside a horizontal 50 MPa, and
  a separate interlayer adhesion of 9 MPa, so not across the layers), Markforged Onyx GF's XZ (73.7 MPa, above its
  XY), Stratasys ABS-M30i's XZ ("on side long edge") and LEHVOSS's LUVOCOM 3F PAHT 9825 NT's "100% infill - ZX"
  (m198). The Direction vocabulary gives ISO/ASTM 52921's meanings now (XZ on its edge, ZX upright).
- **Eryone's and SUNLU's test bars' printing conditions are on their rows since m300** ("All splines are printed under
  the following conditions: …" on 30 Eryone sheets, 测试样条 on 7 SUNLU sheets), with a page_context row saying the bars
  were printed. Eryone's heat deflection sits in another table of the page and stays as it was.
- **Nine notched Charpy rows cite the unnotched method** (ISO 179/1eU): Spectrum's PA6 Low Warp and PA12-CF15 sheets,
  FormFutura's STYX and ApolloX Kevlar, and Nanovia's two PLAs. m196 re-read each: every page labels the row notched,
  and all but Nanovia PLA VX print an unnotched row beside it several times higher, so the label stands and the method
  is the sheet's slip; each row says so in its notes. The mirror case was wrong and is corrected: Nanovia PLA XRS's
  "Charpy full 12 kJ/m² ISO 179-1eA" had been recorded notched from its method; it is unnotched, by its own word. None
  states a direction, so all nine are counted apart and decide only when asked.
- **Four glass transition rows cite a Vicat or heat deflection standard** (ASTM D1525, ISO 75), as their sheets print
  it; one of them (Raise3D Premium PC Transparent) names DSC in the same line. They stand as published.
- **Products whose only glass transition is a resin supplier's value** (Specimen type Raw material value, which is
  not the product's): tg_resin_only in the query, 14 on 2026-09-27.
- **Eight impact rows whose label and standard contradict each other** (2026-10-06, the withdrawn round's E3 holds,
  [OUTCOMES.md](audits/2026-10-06-published-evidence/OUTCOMES.md)): six Anycubic sheets (PLA High Speed, PLA+, PLA
  Metal, PETG, ABS, ASA) label their X-Y value Izod while citing ISO 179 and draw both a notched and an unnotched bar;
  colorFabb PETG Economy's moulded Izod of 107 J/m also cites ISO 179; Fishy Filaments' Porthcurno prints a Charpy of
  5 kJ/m² to ISO 180. Their words and numbers are held as printed; none is compared, and none is settled by relabelling.

```bash
npm run sql --silent -- "with pv as (select m.* from measurements m join grades g on g.gradeid = m.gradeid where g.status = 'active' and g.role = 'procurement' and m.data_status in ('Published value', 'Published value (transcription corrected)')) select (select count(distinct gradeid) from pv where property = 'Charpy strength' and notch = 'Not published' and gradeid not in (select gradeid from pv where property = 'Charpy strength' and notch = 'Notched')) charpy_notch_unstated, (select count(distinct gradeid) from pv where property = 'Izod impact strength' and notch = 'Notched' and gradeid not in (select gradeid from pv where property = 'Charpy strength' and notch = 'Notched')) izod_only, (select count(distinct gradeid) from pv where property like 'Tensile%strength%' and direction in ('XZ', 'ZX', 'Vertical XZ (source label)') and gradeid not in (select gradeid from pv where property like 'Tensile%strength%' and direction = 'Z')) xz_zx_only, (select count(*) from pv where property = 'Charpy strength' and notch = 'Notched' and standard_load like '%1eU%') notched_1eu, (select count(*) from pv where property = 'Glass transition temperature' and standards in ('ASTM D1525', 'ISO 75')) tg_other_standard, (select count(distinct gradeid) from pv where property = 'Glass transition temperature' and specimen_type = 'Raw material value' and gradeid not in (select gradeid from pv where property = 'Glass transition temperature' and specimen_type <> 'Raw material value')) tg_resin_only"
```

## 19. What version 2.1 leaves open

The version 2.1 changes (D96 to D105; [the response](audits/2026-09-27-v2.1-review/RESPONSE.md)) make several answers
narrower and more honest, and leave these, each with where it is counted:

- **Nobody has reviewed the acceptance portfolio's answers.** Its twelve questions were answered by an agent from the
  tables and the hash-checked sheets ([ACCEPTANCE.md](audits/2026-09-27-v2.1-review/ACCEPTANCE.md) lists what a person
  should check), and one of them rests on a reading recorded as one: Fiberon PET-GF15's annealed heat deflections are on
  the 120 °C, 16 h schedule its sheet states for the product (m215, V001932, V001933).
- **An environment requirement is a category, not an exposure.** A product is judged on its own records (D98), and a
  limit in words keeps a positive rating from passing, but the page is not told which acid, alkali or solvent the part
  meets, at what concentration or for how long; a verdict names the records and the exposures they state. Asking for an
  agent waits for a team that needs it.
- **Annealed values whose schedule the sheet does not state never decide.** A state reached by an annealing nobody can
  repeat settles nothing (D99); the query counts them (90 after the 2026-09-28 gap-closing re-reads).
- **The conditioned service state is thinly published.** Asked humid, a product is judged on conditioned values only, and
  few sheets print any (154 published values after the 2026-09-28 gap-closing re-reads): most products are unknown there, which is the true answer.
- **Some products still lack the print requirements the H2C must be judged by.** Every template now asks printability (D101), so Strict
  answers shrank when version 2.1 introduced those gates; after gap closure Outdoor passes six materials. `npm run audit:scenario-gaps` lists
  the products one fact from an answer, most of them print recipes ([SCENARIO-GAPS.md](audits/2026-09-27-v2.1-review/SCENARIO-GAPS.md)).
- **Include uncertain is wider** (D100): a material with measured failures and unmeasured products is unresolved, and the
  table's "0 of N" says so. Whether a team wants a view of "every tested product fails" apart is for the team trial.
- **Eleven recorded rows do not bind to their evidence line** (D97): ten were corrected against their page since, one
  prints its value against its label ([WITNESS-BINDING.md](audits/2026-09-27-v2.1-review/WITNESS-BINDING.md), `npm run audit:witness`).
- **On a phone the first candidate is below the fold.** The header is compact on a laptop (four rows at 1,024 × 768);
  on a 390 × 844 phone the first row starts near 955 px, and "Read the candidates" is the route.
- **Not executed:** the team's task trial (GOALS C7), a person's source spot-check (C3), screen-reader and other-browser
  checks, and a print on the H2C. The page and the engine are checked against each other and against the portfolio; none
  of that is a person using it.
- **95 registered sources have no hash-verified original here, and 12 record no digest** (2026-10-05, after check
  round 3 fetched the lost ones again: 1,894 of 2,002 registered originals verify, §32). 85 of the 95 are pages that
  changed since they were read; their later copies are kept beside the store, read by checks and not registered. The
  formerly mismatched R-KIMYA-PEBA-S-TDS remains a mismatch; no wrong bytes are accepted. Original recovery or a
  separately reviewed revision is still needed; never overwrite the recorded digest to make a cache match.
- **The full-text index is partial**: the refreshed local SQLite of release 784aaac91d99 indexes 1626 of 1840
  retrieved source rows; 214 lack text, as re-derived by the query below. Cached bytes and indexed text are different
  populations. The source/index receipt in the campaign's documentation reconciliation records this dated checkout.
  Fresh clones/CI without private originals legitimately have a smaller index; restore verified originals and their
  derivatives before source rereads. The existing test's partial-cache limitation remains: a fixture-created
  .cache/text is not a complete source library. Never query an old SQLite directly after a data change; npm run sql
  rebuilds it when its inputs/release are stale.
- **What F14 and F13 left** (D104, D105): `audit:sources` has its own unbounded fetch; the reader was not split
  into adapters; and a traced decision does not report its rank. The source bundle now preserves the cached text's
  reader/version metadata and hashes its derived files; it does not package executable OCR/parser environments.
- **The frozen research worklist is dry/as-printed.** Additional S01/S03/S04 annealed and S05 conditioned policies
  occur in acceptance expectations, but were not separate questions in that worklist. The owner asked to finish
  the frozen targets and record these variants for follow-up. `scripts/audit/gap-state-followup.mjs` writes the
  four policy variants and their 1,538 current one-fact gaps in
  `docs/audits/2026-09-28-gap-closing/STATE-VARIANTS-FOLLOWUP.csv`. This is a queue, not completed source research;
  re-run it after a build when the data changes. Acceptance tests already cover the named expectation examples.
- **Cold fast-check timing is within budget again, measured 2026-10-02.** After the gap-closing data changed the cached
  test builds, `verify:fast` had taken 106.7 s against the 90 s goal (VERIFY-C.txt in the gap-closing audit). On the
  owner's machine, with no competing build work, after the open-problems pass: 29.6 s with the build cache, and 68.2 s
  with it off (`H2C_NO_BUILD_CACHE=1`), the build and tests 64.0 s of it. CI starts with an empty cache; it is a slower
  machine, and its timing is its own.

```bash
npm run sql --silent -- "select count(*) annealed_no_schedule from measurements where data_status in ('Published value','Published value (transcription corrected)') and post_processing_state = 'annealed' and (anneal_c_state is not null or anneal_h_state is not null)"
npm run sql --silent -- "select count(*) conditioned from measurements where data_status in ('Published value','Published value (transcription corrected)') and moisture_state = 'conditioned'"
npm run sql --silent -- "select count(*) not_indexed from v_sources_without_text"
```

---

## 20. What the Ashby makeover leaves open

The decision workspace (D107, reworked by D108 to D112; [the record](audits/2026-09-29-ashby-makeover/README.md)) draws, ranks
and counts exact product states. It leaves these, each with where it is counted:

- **No engineer has run the trial.** The owner walked each version of the lens from D107 on, and D108 to D112 answered what they found; the plan's
  formative trial (five participants, the tasks in the record's ACCEPTANCE.md) is its release gate and has not been run; nor have screen-reader, other-browser or physical touch checks. The
  keyboard path from the line to an exact product is checked by `npm run ui:check` in headless Chrome only.
- **Its source readings are an agent's.** The Fiberon PET-GF15 heat deflections and the Ultrafuse PAHT CF15 dried and
  conditioned tables behind `test/acceptance/ashby-workspace.json` were re-read on the cached documents by digest, by an
  agent; a person should check them as ACCEPTANCE.md asks for the version 2.1 portfolio.
- **One state per product.** A product is drawn in the state its answer is in; the other states the scenario permits are
  not offered beside it as alternatives, so an annealed alternative with a better index is not shown unless it is the
  answer. The plan left this for a later slice.
- **One requirement per property.** The rail holds each property's one requirement, and the chart's requirement lines
  open it there (D108); a two-sided interval, or a box drawn on the chart, needs a scenario and engine decision first.
- **The spread inside a material's box is the sheets'.** Since D108 a box is the middle half of the material's own
  products, variants apart, and PLA's is 1230–1250 kg/m³ by 1.5–2.8 GPa; its whiskers still reach 0.43 and 4.2 GPa.
  Printed bars' stiffness depends on how they were printed and pulled: PLA's lowest values are printed bars to GB/T 1040
  at 50 mm/min (Eryone), to ISO 527 with no print settings stated (Flashforge, near 1 GPa) and a toughened grade to ASTM
  D638 (Spectrum PLA Tough, 0.43 GPa, 100 % infill), beside solid PLA's usual 3 to 4 GPa. The engine compares them as
  "comparable" (printed, stated direction, dry or unstated); telling a sheet's method apart from its material is a data
  and rules question, not the chart's. The second query lists a material's products by stiffness with their standards.
- **Cost reaches 214 products.** The cost goal uses each product's own CAD/kg price, converted from USD or EUR where the
  product has no Canadian listing (D113); since the price pass 214 products and 101 materials have one, and the rest are
  listed as unpriced (§22). The first query counts the products with a listing, by currency.
- **Estimated context is not offered under Confirmed only.** The plan allowed it there as a display layer; it was left
  out so that Confirmed only stays measured evidence alone everywhere on the page (D107). Under Include uncertain it is
  drawn only while estimates are on, and never for a conditioned question.
- **Relative performance is against the first-ranked material only.** The list gives each material's median M as a
  multiple of the first's; a reference the reader names, and display-unit conversion (the page has canonical units only),
  are not built.
- **Strict test pairs now need one document.** A modulus and a strength of one product from two of its sheets no longer
  make a strict pair (297 strict pairs where 352 matched by direction alone, over scope only, modulus against strength);
  some of those were comparable in fact. The mixed view keeps them, naming the two documents.
- **The largest test-pair view redraws a little slower.** Toggling a scale on the mixed test pairs over scope only (3,951
  marks) took a median 456 ms against 430 ms before, measured on the owner's laptop by the record's `tools/perf.mjs`; the
  decision views measured 34 to 115 ms. Neither leaks: one resize listener set, one plot, the heap steady over 40 redraws.
- **Cold verify:fast was over budget then** (§19); it is within it again (68.2 s, 2026-10-02).

```bash
npm run sql --silent -- "select count(distinct gradeid) products_with_a_listing, currency from prices where quarantined = 0 group by currency"
npm run sql --silent -- "select gradeid, normalized_value, standard_load, specimen_type from measurements where materialid = 'M001' and property = 'Tensile modulus' and direction = 'XY' order by normalized_value limit 8"
node docs/audits/2026-09-29-ashby-makeover/tools/probe.mjs
```

## 21. What the gap-fill tranche leaves open

The tranche of 2026-09-29 (GOALS; [the record](audits/2026-09-29-gap-fill-implementation/README.md)) took 45 of the
research package's 51 technical findings, and one fact found on re-reading. What it did not take, and what it found:

- **One finding is held, as the research held it** (two until 2026-10-02, when m298 recorded Nanovia Flex V0's "Tensile
  resistance 27 MPa VDE282 part 10" and its two stresses at a stated elongation, §11). Extrudr FLEX HARD CF's drying
  (G129-02) disagrees with itself: its page's
  FAQ says "drying for 6 hours at 60°C", the settings table under it "Drying time 12 h", and Extrudr's catalogue 6 h. A
  question for Extrudr; nothing is averaged.
- **Spectrum GreenyHT's identity is contested** (G001-134, a PLA blend since m223, D106). m223 filed it from Spectrum's
  category page; Spectrum's current shop data calls it "Bio-Based Copolyester (PLA-Free)" (the research's
  GF-PL001-0027, saved as `products.json`). Its SKU does not match the variant, so neither reading settles it. It stays
  a PLA blend until the owner or Spectrum says otherwise.
- **Prices were not admitted by the tranche.** Its eight usable offers were all foreign, and the currency contract they
  needed was not built. The price pass of the same day built it (D113) and took prices from saved shop pages instead of
  the research's notes; what it leaves is §22. The tranche's PRICES.csv stays as its record.
- **Extrudr's product pages print newer tables than its sheets.** The pages b39 registered for DuraPro ABS CF and
  DuraPro PC/PBT CF (and the FLEX Medium Matt page) print property tables that differ from the sheets the database holds
  (DuraPro ABS CF's tensile modulus: 4000 MPa on the page, 2850 MPa on its sheet). They were read for chamber words and
  drying only. Whether a page is a newer formulation or a newer test wants Extrudr's word before either is recorded.
- **The estimate model recalibrated.** No rule changed, but the rows it learns from did, so 129 estimated headline
  cells of 50 materials, and 762 products' estimates, moved (`build/snapshot/headlines.csv`). Two moved a screen in Explore with estimates: PA6 (M049) is now
  screened from Flexible component (its elongation's plausible top 65.1 % against 100 %), and PET (M066) from Warm
  environment (the top of its heat deflection's screening range 79.9 °C against 80 °C, from 80.1). Neither is a verdict.
- **Reviews are agents'.** The research's review was by another AI model; the re-read here is Claude's (an agent). No
  person has spot-checked these values, and no H2C print test stands behind a recipe.

```bash
npm run sql --silent -- "select sourceid, url from sources where sourceid like 'R-EXTRUDR-PRINT-%' or sourceid = 'D-EXTRUDR-FLEX-MEDIUM-MATT-PAGE'"
```

---

## Coverage, in one number

Most coverage rows record a gap, a comparability limitation, a reviewed limitation or a partial resolution (the query
below counts them). Those are not defects; they are the database saying what it does not know. How many material values come
from products and how many are estimated is generated in `build/snapshot/counts.md`, and each material's headline,
with its products, in `build/snapshot/headlines.csv`; every estimate says how far to trust it. (A table of headline
gaps against "153 candidate materials" stood here and went stale with m141 and b34.)

```bash
npm run sql --silent -- "select status, count(*) from coverage group by 1 order by 2 desc"
```

## 22. What the price pass leaves open

The price pass of 2026-09-30 (GOALS; [the record](audits/2026-09-30-price-pass/README.md)) priced 101 of the 136
materials in scope, 30 of them converted from USD or EUR, and 214 products. What it leaves:

- **35 materials have no price**, each with its reason in the record's [OUTCOMES.csv](audits/2026-09-30-price-pass/OUTCOMES.csv).
  Three have no procurement product (M056, M058, M060). Seven are 3DXTECH products its catalogue no longer lists
  (3DXSTAT ESD-PA12, ESD-TPC, ESD-PVDF, ESD-PPS, 3DXMAX PC/ASA, CarbonX PC/ABS, Hyperlite PP): whether they are
  discontinued is 3DXTECH's to say. Fabru (purefil), Fillamentum, and the shops selling LEHVOSS and 3D4Makers print VAT
  without its rate or no VAT basis at all, so their prices cannot be taken before tax; a page or a written quote that
  states it would admit them. PC-PTFE and TPU-EC were out of stock everywhere found. The rest were not found in a
  bounded search.
- **The prices are a snapshot of two days.** 104 listings were read on 2026-09-10 and 253 on 2026-09-30; none is
  refreshed, and no routine refreshes them (GOALS: with the team layer). The exchange rates are the Bank of Canada's for
  2026-09-29, frozen; a later batch adds a later rate, which then applies to every foreign listing.
- **An Amazon.ca price is the maker's Amazon price**, which can sit well above its own shop's (Siraya Tech's Fibreheart
  PPA-GF: 105.93 CAD there, 45.59 USD in its US shop that does not ship to Canada). The owner accepted Amazon.ca as the
  last Canadian option; five materials rest on it.
- **A sale is read where the page marks it.** Shopify's compare-at price, schema.org's strike-through price, Amazon's
  List Price and 3DJake's replaced price are read; a shop that shows a discount only in a picture would be recorded at
  its sale price as regular.
- **A mass from the description or a diameter from the data sheet is a reviewer's reading.** Where a listing's title
  prints no net mass the review took its description's (marked in the row's Notes), and four listings that name no
  diameter rest on their product's own sheet printing 1.75 mm and no other. PolyMide CoPA's listings were recorded
  under G057-03, which holds both of its grades' records since m302.
- **The reviews are an agent's.** No person has spot-checked a listing against its page.

```bash
npm run sql --silent -- "select currency, count(*) listings, count(distinct gradeid) products from prices where quarantined = 0 group by currency"
node docs/audits/2026-09-30-price-pass/outcomes.mjs
```

## 23. Insublend's source contradictions remain after its identity correction

The exact Insublend SDS admitted by m248 names mPPE and a PPE/PS/elastomer mixture.
Migration m249 moved G081-06 from HIPS (M081) to existing PPE-PS (M130), preserving its
GradeID and all owned records. The merged 65–90% composition is an aggregate, not an
individual PPO percentage. No formulation or value transfers to another PPE-PS product.
Q04265 is now recorded under the correct material's UV category by m251; unrelated HIPS
products retain their own polymer context. The earlier ownership and UV-admission hold is resolved.

The SDS's sections 1.2 and 7.2 contradict each other on food contact in both languages.
Q05379/Q05380 and the scoped Conflict finding retain both claims; maker clarification and
an applicable certificate are needed, and no food or medical suitability follows. The own
product chemical table is headed 20 °C yet includes boiling water; actual exposure temperature
cannot be inferred. Its Tributyl phosphate result cell reads “Phosphate”, which is not a
rating. This page clause remains held for source clarification. Duration, specimen and
quantitative retention are absent throughout that chemical table.

The own-page elongation row cites ISO 178; volume and surface resistivity print ambiguous
“10.10^15 Ohms”. No corrected test label, exponent or volume-resistivity unit is inferred.
Tensile modulus V007544 remains physically implausible as already flagged by m127, and
continues to back no product value or estimate. Newly found official datasheets are separate
revision leads, not permission to overwrite the registered page's digest or raw words. The separate originals were admitted by m259 without a chronology claim: legacy sheet Q05413 states a 100–140 °C bed in its Applications paragraph but 130–150 °C in its table; Q05418 recommends moisture-triggered drying at 60 °C for four hours or longer, against the page/profile's 80 °C for four hours. Neither an intersection nor a guessed scalar resolves these. Q05416 preserves Kerosene “Moderate” against the other originals' “Weak”; Q05417 preserves Tributyl Phosphate “Poor” against the bilingual sheet's “Weak” and the page's non-rating cell. Missing exposure methods and unknown formulation/revision continuity require maker clarification or testing; no category-level pass follows.

```bash
npm run sql --silent -- "select gradeid, materialid, product_name, composition_filler from grades where gradeid = 'G081-06'"
npm run sql --silent -- "select evidenceid, gradeid, domain, topic, finding from evidence where evidenceid in ('Q04265','Q05379','Q05380','Q05413','Q05416','Q05417','Q05418')"
```

## 24. Siraya TPU-GF guide conflicts and a bounded drying schedule

The witnessed own-product guide R-SIRAYA-COVERAGE-20260930-c2563ad36bc5 prints
220–250 °C in Specifications and 240–270 °C in Printing Recommendations. It excludes
AMS2 in Specifications, then names AMS/AMS Lite/AMS2 in the usage heading and says
“While compatible” in its wear warning. Q05370–Q05374 preserve these statements and
their disagreement; neither recency nor an intersection establishes the intended recipe
or a particular AMS2 Pro/AMS HT verdict. Vendor clarification is needed.

Q05364 records “Dry at 50-60°C for 6+ hours before printing.” Current scalar profile
columns cannot carry both the temperature range and a lower-bound duration faithfully.
No narrowed scalar temperature/time or profile was invented; the raw schedule remains
available in maker guidance. Resolving this requires a faithful data contract or a maker
clarification, not a guessed setting. The reported RC-bumper observations do not qualify
robotic payloads, and the guide's sanding advice is not a verified safety assessment.

```sh
npm run sql --silent -- "select evidenceid, topic, finding, exposure_conditions from evidence where gradeid = 'G151-01' and evidenceid in ('Q05364','Q05370','Q05371','Q05372','Q05373','Q05374')"
```


## 25. SUNLU, Siraya Air and CreatBot source limits retained by the eighth coverage tranche

SUNLU PCL's English original states specimen preparation at260°C/150mm/s against its75–85°C product recipe. V010184 remains800% but is off-recipe and cannot back a product headline or bound. The separate bilingual original records V011541800% at80°C/45mm/s with100% infill and90° raster; no formulation continuity or revision priority is inferred. V011542 records the bilingual flow method150℃/2.16kg, separate from the English260°C flow method. Their acetone/generic-ketone and ether/ester wording remains scope-dependent, with the ether/ester row held for clarification. SUNLU TPU90A's Japanese page prints ambiguous hardness80 and elongation10±5 versus the linked TDS90A±2 and≥1000%; Q05429–Q05430 retain the conflict without replacing numeric measurements. Maker clarification of the intended table/specimen is needed.

The Waltek report served by SUNLU identifies a TPU90A sample, not a general printed-product certificate. Q05428 preserves its sample-only disclaimer. Positive antibacterial activities4.9/4.8 remain in the digest-verified original, full-text pages and external atomic holds pending a faithful non-filterable sample-test data topic and source-field review. Manufacturer, lot, specimen form and print recipe are unstated; the controlling Chinese report was not retrieved and the customer spool photograph is explicitly untested. No99.9% conversion or medical, skin or protective qualification follows.

Siraya TPU Air's TDS and own manual disagree over a dedicated filament dryer versus a convection oven for drying wet filament. Q05432 retains the manual70–80°C/4–6h advice and its explicit dryer exclusion beside the earlier TDS guidance; storage upon opening remains a different question. No reconciled scalar schedule is invented. Its four240/250/260/270°C foaming states couple density, hardness, heat and strength;24 literal table values remain held pending a faithful coupled product-state contract. Flattening them would permit favourable values from different print temperatures to be combined. Its own0.4–0.8mm nozzle-diameter range remains a follow-up to the existing profile parsing limitation; endpoints must not be mistaken for an exhaustive supported-size list. The unsupported hardening/fibre-abrasion requirement on P0977 is corrected to Not published, without a source approval of brass.

CreatBot UltraPA's own table and FAQ disagree on nozzle/bed and drying windows; no intersected or reconciled window is applied. The table/PDF Charpy9.74 ISO179 row names no notch, while the page calls9.74 notched impact strength. Its FAQ's generic nylon Tg approximately70°C is not an exact-product measured Tg and its table has no Tg row. V011543 faithfully records saturated water absorption2.595% at25℃，55%RH; duration, standardized method, specimen form and immersion are unstated. It does not establish hydrolysis resistance or the moisture state of mechanical test specimens. Vendor clarification or testing remains necessary for the conflicting processing and notch claims.

```sh
npm run sql --silent -- "select measurementid, gradeid, property, specimen_type, test_temperature, standard_load from measurements where measurementid in ('V010184','V011541','V011542','V011543')"
npm run sql --silent -- "select evidenceid, gradeid, finding, exposure_conditions from evidence where evidenceid in ('Q05428','Q05429','Q05430','Q05432')"
```

## 26. colorFabb, LEHVOSS and Prografen source limits in the tenth coverage tranche

The registered colorFabb Print Support original is reused for four pre-print drying schedules. Its duplicate tables disagree on speed/volumetric flow and contain malformed PA-CF bed and nGen Flex speed cells; mechanical form, direction, conditioning, standards and the combined HDT/Vicat load are missing. Q05452–Q05455 retain ordered headers/units and these limitations. No unconditioned measurement or guessed print window is admitted. Two own support routes returned403 once; search excerpts remain leads. Old nGenFLEX Amphora and newer Neostar resin descriptions have no established formulation continuity. Q05484's121C steam claim and Q05485'sFDA footer are not obtained certificates, a validated sterilization cycle or printed-part contact tests.

LUVOCOM PAHT9825's exact2019 FFF guide provides250–280C nozzle, bed<80C, non-heated chamber compatibility, standard brass and conditional wet-filament hot-dry-air80C for at least12h. Its raw bounds and conditions stay visible in the Printing tab. The existing270–290C nozzle source remains separately recorded and selected by the existing rule; no source recency/intersection decides the disagreement. The guide's100C/50%-retention introduction and older120C/UL746B context cannot be reconciled as an identical tested service limit. Compound pellet drying remains a different operation.

Spectrum PA6CS20FRV0's own product-page nozzle/speed/cooling/enclosure guidance differs from its TDS; Q05471 preserves the new source but its replacement profile stays held. Existing P0184 stores raw bed "> 80°C" with its upper end open (typed 80 to Not published since the error-class sweep), as the maker prints it. KK50056BKFR railway producer context is scoped to its resin grade; the separately printed V-0@0.4mm statement is not a complete printed-product railway certificate.9936BK/L is distinct from9936BK, so adjacent food/magnetic claims do not transfer.

Prografen's exact Strong/Light pages add recipes and bounded uses. Their semi-transparent application bullet conflicts with the portfolio's shared Deep black color (and Light's own black TDS); Q05460/Q05483 keep that conflict. The portfolio explicitly states February2024 Spectrum acquisition and names Strong5%/Light0.5%EFG, but the existing grade manufacturer3DJake is held for a separate guarded identity correction; no value or historical price moves in this tranche. New ownership does not settle the older AGP2023XY specimen/revision-custody question. Shared UV and generic chemical statements remain narrative without test conditions or a selection pass.

```sh
npm run sql --silent -- "select profileid, gradeid, nozzle_c, bed_c, drying from profiles where profileid in ('P0184','P1321','P1322','P1323')"
npm run sql --silent -- "select evidenceid, gradeid, topic, finding, exposure_conditions from evidence where evidenceid in ('Q05452','Q05460','Q05471','Q05483','Q05484','Q05485')"
```

## 27. The coverage-expansion campaign remains incomplete

The current [generated campaign status](audits/2026-09-30-coverage-expansion/STATUS.md) and
[remaining targets](audits/2026-09-30-coverage-expansion/remaining-targets.csv) distinguish material assessments
from joined product research. All 136 in-scope Application assessments are complete, with original-source judgments or documented gaps.
A filled mark can still be a limitation or gap; it does not close an exact-product research pass. Each assigned product pass includes
applications/finishing, all frozen environmental categories, print/drying/treatment/moisture gaps, missing
properties/comparison conditions, prior price outcomes and source/identity conflicts.

Legacy 3DXTECH ESD-TPC 90A must not inherit current ESD-TPU90A/60D claims. PC/ASA, ESD-PVDF, ESD-PPS and CarbonX
PC/ABS retain their prior exact-identity/vendor handoffs. A new bounded environmental-question search found
shared official support/download/article leads; those are provisional, not source admissions or completed
product passes. Frozen-targets.json retains prior reviewed route outcomes so they need not be repeated.

Scope/condition clarifications, positive Waltek sample activities, Siraya coupled foaming states, conflicting
recipes/colour/certification claims, unknown service exposures and missing source originals retain the release
conditions in §§19 and 23–26 and the per-tranche packets. Physical tests, vendor clarification and human source/
team checks remain separate from catalogue research. The original all-catalogue finish criteria are not met. The owner narrowed this run on 2026-10-02 to
material assessment followed by 100 additional priority products; the generated status counts those separately.

The first priority batch retains these exact-source handoffs:

- Nanovia PA Rail (G049-08): maker report R-NANOVIA-PRIORITY-20261002-a570add2d2c7 is explicitly raw-material
  testing, with R33 on p.1 versus R23 on p.2, and different smoke-test method labels. Its SDS
  R-NANOVIA-PRIORITY-20261002-b7299118da3a says both "Flammable material" (§9.2) and "Stable. NON-FLAMMABLE."
  (§10.2). Numerical qualification results remain held; neither contradiction establishes printed-part approval.
- Nanovia PA6's electrical exponent notation and PETG ESD's resistivity type remain ambiguous. No numeric electrical
  result is inferred. PLA XRS's existing impact method/notch disagreement remains a maker question.
- Own SDS food-contact statements are resin/filament claims without printed-part qualification. PA Food Industry
  retains its published approval claim and processing restrictions, but the linked SDS returned404.

```sh
npm run sql -- "select gradeid, topic, finding, exposure_conditions, sourceid, locator from evidence where gradeid = 'G049-08'"
```

```sh
npm run build
npm run audit:coverage-status -- --check
```

## 28. What the error-class sweep leaves open

The sweep of 2026-10-01 ([record](audits/2026-10-01-error-classes/README.md)) removed the data audit's nine error
classes and left each guard at zero unreviewed findings (D115, D116, D119). What it found and did not settle:

- **One product, two grades: merged since m302** (D123, 2026-10-02). 29 products held on a grade per sheet revision or
  language are one grade each, their records moved there: PolyLite PC and its Transparent sheet, PolyMax PC-FR V5.1 and
  V5.5, PolyLite ASA V5.3 and Polymaker ASA V6.0, PolyLite ABS V5.3 and Polymaker ABS, nGen and nGen Amphora AM3300,
  3DXSTAT ESD-Ultem Rev 3.0 and 3.1, Extrudr PLA NX2 and NX2 MATT; purefil's PLA, ASA, HDPE GF20, ABS GF10, SAN, PETG,
  PA12 CF15, ASA CF10, PBT and PLA Silk in two languages; PolyFlex TPU90, TPU95 and TPU95-HF, PolyMax PETG, PolyLite
  PLA-CF and LW-PLA, CosPLA Version B and PolyMide CoPA in two revisions; colorFabb LW-PLA and LW-ASA; SUNLU's Marble PLA
  and SUNLU TPU beside TPU 95A. Not merged: FILAFLEX Foamy's two
  sheets (two non-foamed materials, 95A and 85A), SIDDAMENT's "ASA Carbon Fiber" and "ASA CF" (two tables), and
  Polymaker PLA Pro V6.0 beside PolyLite PLA Pro V5.6, which are two products (D130: PLA Pro is the new formula that
  replaces PolyLite PLA Pro). purefil's POM (G087-01, G087-04) was one product and is one grade since m368.
- **Filing questions the twins raised.** FiberFlex Aero (G134-01) is filed under TPC / TPEE since m368 as an inferred
  filing (D130): its table is FiberFlex 40D's "for the unfoamed material", 40D's safety data sheet names a copolyester
  elastomer, and its own safety data sheet names no polymer; CPE-LW is an alias of TPC / TPEE. Spectrum's PA6 CS20 FR V0 and pa6 neat bk print LEHVOSS LUVOCOM 3F PAHT tables value for
  value and sit under PA6-CE and PA6, as Spectrum's own documents name them, while the LUVOCOM grades sit under PAHT-CE.
  33 twin acceptances (GRADE-VALUES-TWIN, §6) stand, R166's among them.
- **The import's fibre sentence is gone since m296** (D121): 174 profiles say what their sheets say, the rule is in
  `method.csv`, and the page says it as the rule. Braskem's PP-CF prints "Nozzle Size (Material) ≥0.6 (Hardened Nozzle)",
  which its profile now holds (m299).
- **The values never transcribed that this list named are recorded since m298** (D123). Stratasys PA6/66-GF30-FR's
  Tables 4 and 5 are recorded since the reader round (m342, 30 values on pp. 6 and 7); its XY heat deflection at 264 psi
  prints 35 °C beside 161 °C at 66 psi and 153 °C XZ, recorded as printed. Left, seen while reading: Polymaker PolyFlex TPU95 still has an untranscribed ISO 37 table; TPU90 already held V5.1 strength/elongation, and m314–m315 now add fixed-strain stress and the coherent V5.5 table; Eryone's light-weight PLA prints
  MPa as the unit of its X-Y elongation; Raise3D's Hyper Core PPA CF25 (G070-08) carries Industrial PET CF V4.0's source as
  its formulation key, which no other grade shares and reads nothing, but which may say its sheet reprints that table
  (R166). `npm run audit:sources` finds such values.
- **Guard precision.** `audit:context` keeps 63 accepted findings on measurements, where it matched a neighbouring line,
  or a statement that does not speak for the rows it flagged, or a standard printed without its letter, and 36 on print
  profiles, each a reading the profile is right to differ from (a test bar's single temperature under a heading the
  reader does not know, a neighbouring column, purefil's mislabelled bed row, a brass-wear caution, a decimal comma);
  123 acceptances in all (`data/review/context-witness-accepted.csv`), 8 of them unrecorded profiles from the reader
  round's guard. IMPACT-UNIT-STANDARD keeps 46, each a sheet that prints kJ/m² beside ASTM D256 or J/m beside ISO 180 (BASF, m298). PARSE-REVIEW-STALE checks print profiles and measurements alike.
- **What the independent review left open.** Since D128 a statement can name the table it heads (m356); a statement
  recorded for the page still reaches every table of its scope. The migrations' quote check proves a quote is on the cached
  sheet, not that it applies to the rows it is used for. `audit:context` needs the text cache, so CI skips it and only a
  contributor's `verify` runs it. The 147 reviews m274 scoped were scoped to the columns that differed, not re-read.
- **Print profiles, after the root-cause sweep of 2026-10-02** ([record](audits/2026-10-02-profile-root-causes/README.md),
  D120). The causes were found by marking every line where an error could hide and reading only those, and each was
  fixed in the import's reader, which the guard runs on every profile. Four fresh draws of 40 after it found 4, 4, 2
  and 2 profiles wrong in a deciding field (12 of 160, 7.5 %; the five draws before it found 31 of 190, 16 %), each a
  layout family the reader then learned and the guard swept (m295). The last two draws found 2 of 40 each (5 %); the
  target, under 3 %, was not yet shown. **The next draw of 40 (v12, 2026-10-02, on the tables the sweep left) found 1
  profile wrong in a deciding field** (Recreus's "Small parts Room temperature (no heating); Large parts 50–55 °C" read
  as a bed the filament requires; a second, blind reader of the same 40 found none): 2.5 %, under the target. Its
  family is fixed on 18 profiles (m299). Its other findings were nozzle sizes and notes, which decide nothing. Left open:
  - 56 profile notes (34 layer heights, 12 wall counts, 10 speeds) were taken from a test-bar block before the reader
    learned to drop it; the v12 draw found five such notes (four test-bar settings and a "Cooling: From 90" that is an
    annealing cool-down). A note cannot be retired, and a removal is refused (D72): the owner decides whether notes get
    a way to retire.
  - purefil's PA6 GF10 sheet prints its bed twice, "Heizbett Temperatur 120-140 °C" and "Heated bed temperature 80°C" in
    the slot where every other purefil sheet prints its drying temperature, and no drying row at all; the profile holds
    the first, which is above the H2C's 120 °C and turns G051-08's bed gate to exceeds. The sheet's own words call both
    rows bed, so only the maker can settle it. The page image (read 2026-10-04) shows the same: the second "Heated bed
    temperature 80°C" stands where purefil's template prints its drying temperature, above "Drying time 4-8h".
  - "Enclosed-frame (rec.), open-frame" stays a reviewer's reading. (P0445's "75℃-85, 6h" reads 85 °C for 6 h since
    m299, and Recreus PET-G's garbled bed row, P1239, holds the rendered page's 40-70°C.)
  - Braskem's PP-CF prints a recommended bed (80 °C with its PP adhesive) and an alternate one (20-40 °C with a spray);
    the profile holds the first as required. A bed per substrate would be a profile per row (D120's shape).
  - Nozzle sizes a sheet lists ("0.2, 0.4, 0.6, 0.8 mm") are held as their first on some profiles, and a minimum
    ("Nozzle ≥ 0.2 mm") is not held on others; the nozzle size decides nothing today.
  - The detectors that found the causes are in the repository now: `npm run audit:profile-marks` (needs the text cache,
    not in `verify`) marks every line of a profile's cached sheet where an error could hide, grouped by template, into
    `build/reports/profile-marks/marks.csv`. The guard keeps each cause out; a layout neither has seen is still found
    by reading the marks, not by a gate: the marks are leads (1,937 on 753 sheets on 2026-10-02, with the full local text
    cache; fewer where it is partial), most of them a sheet's own
    storage, property or test lines.

```sh
npm run data:lint && npm run audit:context
npm run sql -- "select gradeid, product_name, shared_formulation_key from grades where status = 'active' and shared_formulation_key in (select shared_formulation_key from grades where status = 'active' group by shared_formulation_key having count(*) > 1) order by shared_formulation_key"
```

## 29. What the open-problems pass leaves open

The pass of 2026-10-02 ([record](audits/2026-10-02-open-problems-pass/README.md); D121 to D123) fixed what an agent could
on its own. What it could not, by who settles it:

- **The owner.**
  - A way to retire a profile note (§28).
  - The maker questions (§15 and `docs/audits/2026-10-05-gap-round-2/MAKER-QUESTIONS.md`): the owner decided on
    2026-10-05 not to send them; they stay as a record of what only a maker could settle.
  - The coverage campaign (§27): the owner authorized completing material assessment and 100–150 priority products on
    2026-10-02. All 136 material assessments are complete; 100 additional product targets are frozen in STATUS.md.
    The remaining full-catalogue targets are outside this narrowed run.
  - FiberFlex Aero's filing, PLA Pro beside PolyLite PLA Pro and purefil's POM were left to Claude to judge on
    2026-10-05 and are settled (D130, m368).
- **The makers.** purefil PA6 GF10's two bed rows (§28); the source contradictions of §§23 to 26; the conditions of §15.
- **People.** The decisive-value spot-check (C3) and the team trial (C7). Every review in this pass was an AI's.
- **Leads the readers saw**, recorded in §28: Stratasys PA6/66-GF30-FR's 35 °C heat deflection at 264 psi; PolyFlex TPU95's remaining ISO 37 table (TPU90 recovered in m314–m315); Raise3D Hyper Core PPA CF25's key; Eryone
  light-weight PLA's elongation printed in MPa; Braskem PP-CF's two beds; BVOH's Extended TDS conditions.

```sh
npm run data:lint && npm run audit:context && npm run audit:coverage-status -- --check
```

### Priority Polymaker product pass: unresolved source limits (2026-10-02)

The signed [batch report](audits/2026-09-30-coverage-expansion/priority-02-report.md) and
[204 question outcomes](audits/2026-09-30-coverage-expansion/priority-02-outcomes-packet.json) name the source,
product and release condition. These are bounded findings, not evidence that no test exists.

- PC-Max source `S-POLYCN-Polymaker-PC-Max-TDS-v1-0` prints newly-opened filament moisture ≤0.1%.
  Its condition/specimen is corrected; the inclusive operator remains held because the current vocabulary only
  supports <, > and =. A justified schema/engine extension is needed before changing its numeric bound.
  Its25.1±1.9kJ/m² impact value names ASTM D256 alongside ISO179; the method remains unresolved.
  Filament softening127–130°C is not an HDT or Vicat test.
- TPU90 V5.6 prints a TPU90 heading, PC-ABS Black PD02001 footer and MPa as elongation unit. Its new numeric
  rows remain held; five generic chemical ratings are record-only with attribution caveats. The coherent own
  V5.5 ISO37 table is independently admitted. The filename says V5.4 while its internal heading says V5.5.
- The TPU90 skin-safe ISO10993 badge has no retrieved report, contact duration, endpoints or specimen identity.
  No printed-part certification follows. TPU90/TPU95-HF summary drying50°C6h conflicts with detailed70°C8h;
  PolyMax PETG65°C4h vs65°C6h, legacy ESD70°C8h vs65°C6h and ASA70°C6h vs70°C7h also remain source-specific.
- Fiberon PETG-ESD's wear/conductivity claim and its1–2year abrasion/environment warning lack a wear protocol
  or lifetime model. Finished-part ESD validation remains necessary. The legacy product's discontinuation
  notice does not prove replacement equivalence. TPU95-HF400% stress remains original/full-text context
  pending a useful property definition. Generic resistance classes retain missing agents and conditions.

ABS V5.6 p.1's PolyBox/PolyDryer sentence explicitly names HT-PLA-GF. Q02150 retains the raw sentence
as an attribution problem with a scope warning (m316), not ABS moisture guidance. Source correction or
maker clarification is required; the campaign does not invent the intended sentence.

### Priority Polymaker and Bambu passes: retained source limits (2026-10-03)

These limits concern the thirty products in priority03–05; the signed per-product outcomes record every
question and original digest. They are not catalogue-wide absence claims.

- Polymaker PC/nylon maker pages disagree with their own TDS/PIS on chamber recommendations, drying,
  annealing and specimen preparation. PolyLite PC drying is75°C/12h on the page,75°C/6h on the TDS and
 80°C/8h on the PIS. CoPA page80°C/10h differs from TDS100°C/8h and older PIS80°C/12h. Preserve each
  source-specific schedule; maker clarification must identify the intended revision and use.
- PA6-CF20, PA6-GF25 and PA12-CF10 pages repeat2.57% uptake where their own tested TDS values are5.30%,
  4.57% and2.92%. PA612-CF15's2.57% agrees. Repeated FAQ prose does not supersede the test table.
- Bambu ASA Aero's TDS prints specimens at225°C, below its240–280°C recommended nozzle window. m325
  marks twenty already-printed records as off-recipe and corrects two uncertainty-as-central transcriptions.
  Foam state remains unstated. Separate user annealing prose names Bambu ASA; its applicability to ASA Aero
  requires maker clarification. Density and melt-flow forms remain explicitly unstated.
- Bambu PA6-GF page80–130°C/5–12h differs from its TDS80–130°C/6–12h. PAHT-CF and TPU95A-HF pages
  include copied wood-fibre wording; this is an attribution problem, not evidence of wood composition.
- The PC FR CTI report establishes its named128×12.9×3.3mm sample's UL94-2023 V-0 result, with room/aged
  protocols. Sample identity is client-supplied; manufacturing form, print settings and colour are unstated.
  The report limits purposes to research/education/internal quality/product development and related uses.
  No universal printed-product approval follows. The PETG Basic GREENGUARD2904 badge lacks its underlying
  retrieved certificate. PPA-CF's227°C prolonged-use and underwater marketing lacks service load/duration.
- Eighteen historical Bambu same-URL page originals remain within the known missing-custody inventory.
  New witnessed revisions are separate sources; neither recency nor a matching URL proves equivalence.
  Current maker claims and source-specific test records remain distinct.

Reproduce these holds from the reviewed priority03–05 outcome packets and their SourceID/SHA/locator
bases. Resolve them only with a source correction, exact revision/specimen identification or an appropriate
product test; narrative claims, resin references and laboratory sample results do not establish suitability.

### Priority Fiberlogy, Fillamentum, Extrudr and eSUN passes: retained source limits (2026-10-04)

These are bounded source findings for priority06–09; the per-product outcome packets retain exact digests and
locators. New admissions passed full verification and are committed in `5397478`; the selected100-product run
is complete, with its completion count generated by STATUS.md.

- Fiberlogy PP publishes HDT load1.8MPa on its TDS and0.45MPa on its page. FiberFlex Aero repeats
  CPE Antibac/Flex40D boilerplate. Neither discrepancy establishes the intended identity or test conditions.
  PA12CF table enclosure-not-required and prose enclosed/heated recommendation both remain visible.
- Fillamentum Porthcurno drying is a strict >5h minimum at80°C, typed as a 5 h lower bound, open (P1376; m355, D127).
  CPE guide75°C/min5h remains beside older3h/4h schedules. TPU chemical ratings are general25°C groups;
  exposure duration/concentration/specimen are absent. BAD is narrative under the existing reducer, while
  mixed solvent ratings remain INDETERMINATE and oil/grease GOOD remains a scoped category positive.
  Water BAD does not establish hydrolysis. The12–16HOUR helpdesk badge is not a test duration.
- Extrudr reinforced-product pages use a generic0.4mm recipe heading beside specific ≥0.5mm ASA-GF or
  ≥0.6mm ABS-CF/PA6-CF nozzle advice. These different contexts remain visible, with hardened-nozzle guidance.
  PETG optional60°C/0–6h drying is recorded as optional since m355 (P1678; D127), not as a fabricated unconditional
  drying requirement.
  Reinforced food exclusions and resin FDA wording do not certify printed parts.
- eSUN ABS+ notice published2026-06-15 describes a2025 formulation change, with89°C/33MPa claims beside
  the current page table73°C/40.12MPaXY/14.94MPaZ. Its current observed download still serves the registered
  Nov2021V4.0 injection-moulded sheet. Maker clarification must bind formulation/batch/specimen/revision;
  no old measurement is overwritten. PETG-ESD surface-resistance units Ω/m and Ω remain unresolved.
  TPU64D old80°C/4–8h, current55°C/>4h and generic conditional60°C/>8h recommendations stay distinct.
  Its <60°C water-environment wording has no duration/method/specimen and is not a hydrolysis qualification.

Review is AI-only. Vendor clarification or exact-product testing remains necessary where public evidence
cannot resolve these questions. Automatic approval review initially rejected cloud export; the owner then explicitly approved the exact
existing private OneDrive destination and payload. The reproduced export contains2469 originals and2875
derivatives, with124 historically absent inventory entries and no new original missing.

## 30. What the reader round (m338 to m354) leaves open

The round (D125, D126) closed 853 of its 3,351 frozen targets; `docs/audits/2026-10-04-reader-round/after/PROGRESS.md`
counts what is left by field, and `node docs/audits/2026-10-04-reader-round/targets.mjs --after` re-derives it.

- **The round's error rate is measured, not yet under target.** Two blind draws of 40 of its records each found 2 wrong
  and 2 partly wrong (5 %), above the 3 % C9 sets; each family a draw named was read in full and fixed (m354,
  `blind-draw/`). Gap round 2's draws measure the records since (§31).
- **28 products had no nozzle or bed** at the round's end (`docs/audits/2026-10-04-reader-round/STILL-MISSING.csv`);
  gap round 2's sheets and makers' pages (b43, b44) closed 12 of the 28 nozzle gaps and 10 of the 25 bed gaps, and §31
  counts what is left. Raise3D's nine
  sheets print only the conditions the test bars were printed at (m170, m345), and its ideaMaker presets are a slicer's,
  not guidance. Stratasys (2), Markforged (1) and UltiMaker (1) sell printer-controlled materials whose pages print no
  settings. 3DXTECH's Triton3D model materials (G029-11, G030-11, G094-12, G116-02) have pages that name another product
  line; iSANMATE's PLA-GF and HDPE-GF have no product page, and its PCL page is a 3D-pen filament; SUNLU's PCL sheet
  prints "/" for the bed and a selling point for the nozzle. Each is in the b42 packet's NotAdmitted list with its
  reason. The makers are the next source.
- **The chamber stays the largest gap**: 267 products and 31 materials state no chamber, because makers rarely print
  one. Where a maker's page says "Heated Chamber: Recommended" with no temperature (PPA-CF, ASA-CF), the gate reads
  unknown (D33, D93), which moved four template answers from pass to unknown. The owner decided on 2026-10-05 to keep it
  unknown (GOALS, "Decided on 2026-10-05"): a recommendation with no temperature cannot be checked against the H2C's
  65 °C chamber, so such a product waits for its maker to print one.
- **Readings held, not applied.** 13,909 readings stay in `proposals/final/held.csv`, each with its reason: 5,313 name a
  property or setting no table column holds (the record tier's candidates for `properties.csv`), 1,752 would change a
  row the readers did not tie to a held one, 1,459 are already held on another product of the same formulation, 1,213
  state no number. Of the 1,843 second reads not run, gap round 2 ran the 57 whose reading would decide something;
  each was a mis-pairing, and nothing was applied (§31). The rest stay held. The 59 corrections the proposals offered
  were all mis-pairings when read again (`proposals/corrections/moved-out/`), and none was applied.
- **Pages that contradict themselves.** iSANMATE's PLA Wood page prints the bed as 35-60 ℃ in its parameter table and
  45-60℃ in a second block; Polymaker's PolyMide CoPA page says "Enclosure Recommended" in its specifications and "does
  not require an enclosure" under its printing requirements; its PolyLite PC page prints "Drying 100°C for 8h" and a tip
  naming a 75°C / 6h cycle. The profiles hold the specification grid, and the context guard accepts the other line with
  that reason (`data/review/context-witness-accepted.csv`). 3DXTECH's CarbonX HTN-CF page prints 106 MPa and HDT 200 °C
  in its benefits list and 87 MPa and 240 °C in its description; Siraya Tech's PEBA 85A table prints "Tensile stress at
  100%" three times (6.7, 7.6, 8.5 MPa) with nothing to tell them apart; UltiMaker's Precision ASA sheet prints its
  tensile modulus as 2,167 MPa on p. 1 and 2,100 MPa on p. 2. Each row holds what its line prints; the maker is the
  source that can settle them.
- **A foamed filament's density is a range of prints.** Bambu Lab's ASA Aero page prints "Prints Density 0.46 ~ 0.97
  g/cm³" across its foaming settings and colorFabb's LW-ASA 0.40-1,07; the material's density spread follows them and
  sits far from what the model expects of a solid print (EST-OUTLIER, accepted with that reason).
- **Garbled text layers.** Bambu PLA Pure's text layer prints digits as other digits ("55 - 69°C" for 35 - 65 °C) and
  BigRep PRO HT's prints "3onditions"; their settings were read from the page image (m353). The quality flags list 187
  such pages in 138 documents (`text-quality/pages.csv`); only pages tied to a gap were read. Gap round 2 compared every
  held number of 76 such documents with an optical reading of its page (§31).
- **What the reading-order view finds alone.** 23 print settings and 35 values only the block view reads are listed in
  `reader-recall/candidates.csv`; gap round 2's verifiers read each on its page (m359), and the ones a page prints for a
  product the database holds were added.
- **Thin materials.** 18 materials had two sources or fewer at the round's end, and 17 after gap round 2 (b44 gave one
  a data sheet); b41 searched ten makers' sites for them.
- **Twin sheets.** Pairs of documents that print the same numbers (language editions of an Extrudr sheet; Raise3D's
  Premium PETG and PC beside Polymaker's PolyLite sheets) are accepted as MEAS-CROSS-SOURCE-TWIN with a reason, not
  retired, as the owner confirmed on 2026-10-05: whether a maker's sheet is a rebranded copy of another's is not shown
  by either document, and each product keeps its own sheet's values until a maker says so. Re-derive with `npm
  run data:lint -- --all`.
- **A conditioned density takes no headline.** `products.js` (assess) excludes every value measured after moisture
  conditioning from a headline that does not change with moisture, density included. No product is held out by it now:
  Markforged's Onyx GF sheet conditions its specimens at 52 % RH "unless otherwise noted", which m342 first read as heading
  the whole page, and m354 narrowed to the mechanical tests it heads. The owner kept the rule on 2026-10-05: a conditioned
  density stands in for no headline, and a sheet that prints only that leaves its product's density unpublished.
- **Unscheduled annealing.** A page that marks a value "annealed" without a schedule (Spectrum's 2024 portfolio table,
  V012362) is a state, `annealed:x:x`, that no scenario can ask for; it is listed beside the scheduled one in a trace.

## 31. What gap round 2 (m355 to m368) leaves open

The round (D127, D128, D129; `docs/audits/2026-10-05-gap-round-2/`) worked the reader round's causes by priority. Its
progress against the 2,518 targets it froze is `after/PROGRESS.md`; `node docs/audits/2026-10-04-reader-round/targets.mjs
--after --frozen docs/audits/2026-10-05-gap-round-2/TARGETS.csv --out docs/audits/2026-10-05-gap-round-2/after`
re-derives it.

- **The error rate.** The first blind draw of 40 of the round's records (seed 20261007) found 6 wrong, 4 of them
  deciding, and a probe of 22 moved print answers found 7 of 30 moved cells wrong; each family was looked for over every
  source and fixed (m365, D129). The second draw (seed 20261008, `blind-draw/verdicts-20261008.csv`) found
  none of 40 wrong (0 %, under C9's 3 %); its one reported error was a row that inherits its page's printed specimen by
  design (D116). Eight of its records hold less than their page prints, each a cell another profile of the same product
  answers (below). Its sample leans on the families m365 swept, since they are most of what the round changed.
- **No product's mechanical or thermal headline gap closed.** The round's 296 new values (b43) went to new products,
  and m359's corrections to held ones; a product with no tensile modulus, strength, elongation or heat deflection still
  has none (442, 215, 283 and 452 frozen targets, unchanged). Four material cells closed, one each. The rest wait on
  documents that print them.
- **What is left of the print recipe.** 20 products have no nozzle and 20 no bed (16 and 15 of the frozen list, and
  the new products of b43 that print none); chamber stays the largest gap (284), and drying 179 after the dry-box
  answers left the Drying cell (D129). §30's chamber ruling stands. After check round 3 the counts are 35, 33, 313 and 204
  (`build/snapshot/print.csv`); the seven products made Variants in that round, which now read no printer guide, are
  among them (§32).
- **Second reads.** Of the 1,792 second-read tasks still outstanding (`reconcile/final-3/summary.md`), the 57 whose reading
  would decide something were run (`readings/second/w4-01.csv`); each was a mis-pairing and nothing was applied. Check
  round 3 closed all 1,792 by joining them to what decides (§32): 1,764 name nothing an answer reads, and the 28 that
  could were read on their pages and 21 values added.
- **Copies and densities.** Worked in check round 3 (§32): nine products held twice are one grade each, records of six
  sheets filed under the wrong product moved, and of the 19 densities six are Variants and thirteen are genuine or
  wait on their maker.
- **Digits a text layer may misprint.** `digits/compare.py` lists 1,230 numbers on 76 documents (Bambu Lab's sheets and
  the documents the quality flags name) that the text layer prints and the optical reading does not find
  (`digits/suspects.csv`). Most are the optical reading's own misses; none was read on its page in this round, nor in
  check round 3, whose independent image reading could not run (§32).
- **The guide's drying is the type's, not the product's.** Where a product states its own drying beside a guide row,
  the guide's window contains the maker's in 150 of 357 profiles, overlaps it in 43 and misses it in 164 (ABS and ASA
  most: the guide's 80 °C above makers' 50 to 60 °C), and the guide calls drying optional where the maker requires it in
  201 (`guide-drying-backcheck.md`). It is always shown as the guide's.
- **Pages that say two things about drying.** Polymaker's product pages print a schedule in their print settings, their
  specifications and their tips, not always alike. Since m367 (D130) each product reads its page whole and shows the
  other statements in a "Drying" note; what is left is the maker's own inconsistency, which only Polymaker can settle.
- **Bars printed at 20 % infill.** Three 3DJake sheets (ABS-P, PLA, ASA) print their test bars at "Infill: 20 %"; since
  m366 (D130) those 16 values say so ("Printed specimen at partial infill") and never stand for the product. A sheet that
  states another partial infill would need the same label; the import does not yet read infill on its own.
- **Statements the readers left.** The Bambu TPU for AMS and Kingroon PETG sheets say their specimens "were annealed and
  dried at 70 °C for 12 h" (65 °C, 8 h) and Kingroon's TPU sheet "dried at 70 °C for 12 hours"; Stratasys's PA6/66-GF30-FR
  sheet conditions its bars "per the respective ASTM standard". These are moisture and treatment states a reviewer must
  type, and are not recorded on the rows that lack them. Spectrum's 2024 portfolio table prints a bed column its twelve
  profiles do not hold, and its Polish sheets answer the closed chamber and the hardened nozzle "niewymagane"; the
  profiles leave both unknown. Check round 3 typed them (§32): Bambu TPU for AMS's rows and the other Bambu sheets'
  (m370, m376), Stratasys's conditioning as a page statement (m370), the Polish answers (m375); Kingroon's rows that lack
  the sentence are its density, melt-flow and DSC rows, which the specimen sentence does not speak for.
- **Partial rows of multi-product tables.** Spectrum's 2024 portfolio (47 profiles) and 3DJake's catalogue
  (R-COVERAGE-20261001-28aad1fe7597, 55) hold only some of their row's columns: no nozzle on 73, no bed on 81, no drying
  on all 102; QIDI's filament guide rows hold "Required" or "Optional" and not the schedule beside it. The second draw's
  eight such records were each answered by another profile of the product, so none decided; whether every one is, the
  products' print gates in `build/snapshot/print.csv` say. Check round 3 read every partial row (§32): QIDI's schedules
  are held (m375); the catalogue is Spectrum's 2025 portfolio, and the portfolio rows' nozzle, bed and chamber were read
  and not applied, because every product they belong to has its own sheet's answer; their "Dry box recommended" is a
  dry-box answer, not drying (D129).
- **PolySonic PLA Pro and Polymaker PLA Pro.** Polymaker's own store calls Polymaker PLA Pro (G001-30) "Formerly
  PolySonic PLA Pro ... Same great formula, new name", but the database holds both (G001-20 and G001-30) and their two
  current sheets print different values (melt flow 15.5 and 13.4, elongation 23.4 and 16.6 %). They stay two grades
  until a Polymaker document of record says which sheet is the product's; the store page is not a registered source.
  (eSUN's eSilk-PLA, which this list named, is eSUN PLA-Silk since m368.)
- **Held sheets not admitted (b43).** Stratasys ST-130 names no base polymer; Diran 410MF07 waits on the owner for its
  home (§14); FKuR's Fibrolon sheet names no filament; Markforged's Onyx ESD names no additive its filing accepts. b44's
  `NotAdmitted` list gives each product page's reason.
- **Bambu Lab's drawn V-notch.** Nine Bambu Lab sheets draw a V-notch beside impact values whose Z results sit above their
  notched X-Y ones, which a notched Z bar cannot do; the drawing does not settle the notch and the values keep theirs
  (m359).
- **Questions only a maker can answer.** 125 questions to 36 makers, 52 of them changing a selection or print answer,
  are in `MAKER-QUESTIONS.md`. The owner decided on 2026-10-05 not to send them; they are the record of what only a
  maker could settle.
- **The context audit is a local check.** `audit:context` reads the makers' extracted text, which stays on this machine
  (the owner's decision of 2026-10-05) and is backed up with the documents (`npm run data:sources -- --export
  "$H2C_SOURCE_BACKUP" --derived`). In CI it prints "audit:context SKIPPED" and a GitHub Actions warning, and passes, so
  it must pass in a checkout that holds the cache before every push.

## 32. What check round 3 (m369 to m382) leaves open

The round (D131; `docs/audits/2026-10-05-check-round-3/`) checked what the tool's answers rest on: it froze the 9,667
records that decide (`TARGETS.csv`), confirmed most by code against their page's own text, read on the page image what
code could not confirm and could change an answer, and swept every kind of error it found. What it leaves:

- **No image-based reading of digits.** Mistral's OCR was to read the deciding pages as a second, independent reading
  of every number; its account's billing was off, so no page was read. A text layer that prints the wrong digits (Bambu
  PLA Pure's "55 - 69" for 35-65) is caught only by a reader looking at the image, and readers looked only at the 540
  records the code queued and the round's samples. The 1,230 digit suspects of `digits/suspects.csv` (§31) stay
  unread. `ocr/ocr-mistral.mjs` and `ocr/compare.mjs --source mistral` run the check whenever the account allows.
- **Documents fetched again.** 123 registered sources had lost their bytes (`missing-bytes.csv`). The owner had them
  fetched again on 2026-10-05 (`refetch/refetched.csv`): 32 returned the same bytes and are back in the store; 85 pages
  have changed since and are kept as later copies (`.cache/later-copies/`, backed up), not registered, so the records
  still cite the lost originals; 6 Bambu Lab shop pages would not load (none decides anything). Of the 134 deciding
  records the 30 deciding sources back, 133 hold on their page; 3DXTECH's 3DXSTAT ESD-PETG page (XP-3dxstat-esd-petg-1)
  now prints "Extruder Temp 260-280C" where P0134 holds 230-260 °C, which the lost original may have printed. Registering
  a later copy as a new revision is an import: open since 2026-10-05, and not done in this round.
- **What the comparison could not confirm and nobody read.** Of the records the text comparison did not confirm, every
  one that can change an answer was read (320). 621 more change only a print state the page shows, and 1,688 change
  nothing (975 of them values); a sample of 80 of each was read, with 3 changes in each and none a number, and the other
  2,149 stay unread. `ocr/compare.csv` lists each with its outcome; `read/queue.py` re-derives the tiers.
- **Products that read no printer guide.** A Variant reads none of the guide's answers (D129). Six products became
  Variants for a density above their polymer's range (m374), so the guide no longer answers their nozzle, chamber,
  enclosure, abrasion or drying where their own sheet is silent: AzureFilm ABS Prime and ASA Prime show five gates
  unknown, Spectrum PET-G MATT its drying, eSUN PETG-Matte three. Whether a Variant whose load is cosmetic should read the
  guide's temperatures but not its abrasion answer is a rule for the owner.
- **Densities left as published.** Of §17's 19, six are Variants; the rest are genuine or wait on their maker: Polymaker
  ASA's 1.13 (three sheets), the three PC/ABS sheets at 1.07-1.08, the two OBC sheets at 0.905 (Dow's own resin value),
  SUNLU PC's 1.15, PolyDissolve S1's 1.37, BASF HiPS's printed-part density, two ranges (SUNLU PVA, RECIFLEX) the query
  read by their lower end, Spectrum PET-G HT100 (a high-temperature copolyester filed as PETG, as its maker names it)
  and SIDDAMENT PA, whose strength and heat deflection look reinforced.
- **Copies kept as two products.** Pairs whose sheets print one table and that stay two products (§30's ruling):
  Fiberlogy ABS and ABS PLUS (the 2026 ABS sheet reprints PLUS's table, and G027-53 holds both the old and the new),
  CPE ANTIBAC and CPE HT, eSUN's Luminous PLA family, Silk Magic and Silk Mystic, AzureFilm PLA and SILK, Spectrum ASA 275
  and FlameGuard ASA 275 (a flame-retardant package sharing the key), eSUN PLA+HS and "PLA+HS Silver" (its sheet is the
  2022 ePLA-HS: needs the maker). SUNLU PLA+ and PLA+2.0 print one table; the PLA+ sheet's values are on PLA+2.0's grade
  since m372, and SUNLU PLA+ as its own product is not held.
- **Statements read on part of a page.** The sweep fixed what the readers found (m376 to m378). Raise3D's, Fiberon's and
  Polymaker's sheets with an asterisked "*All specimens were annealed ..." footnote leave 3 to 8 rows each untyped
  (`sweep/queue.csv` shows how they were found): most are melt flow, density or DSC rows the footnote does not speak
  for, but nobody read each one. Two FormFutura rows headed "HDT" print the Vicat standard ISO 306 and no load (V007731,
  V009791); nothing on the page says which is meant, and they still stand as heat deflection.
- **A Spectrum portfolio is a summary.** The 2024 and 2025 portfolio rows' nozzle, bed and chamber were read and checked
  and not applied, because every product they belong to has its own sheet's answer; where the two differ, the sheet is
  the product's own statement. Their "Dry box recommended" stays out of Drying (D129).
- **What the sealed sample found that decides nothing.** Of its 98 readable records, 13 had a cell wrong that no answer
  reads: test bars' print settings the sheet states once and the row does not hold (V008122, V010722, V004462; V001290
  holds the page's recommended settings instead), a plate or nozzle size left out or cut short (P0465, P0551, P1286,
  P0007), a specimen the sheet's "How to make specimens" block makes printed (V006464), a test temperature of 21.5 °C left
  unstated (V006933), two standards written with the method's number run into a unit (V003158, V004083; m382 swept the
  pattern on 134 rows), and Bambu Lab's density typed annealed with its bars (V007555; every Bambu sheet's density is typed
  so, and density does not change with annealing). Two records could not be read: their documents are lost (P0154 on
  XP-thermax-psu-1, a later copy now held; P0163 on R-POLYMAKER-WIKI-PANCHROMA-COPE). 15 % of records carry some wrong
  cell (95 % interval 9 to 24 %); 2 % carried one that decides (0.2 to 7 %), and both kinds are fixed.
- **Heat deflection under an annealing footnote.** Polymaker's and Fiberon's heat deflection and Vicat rows keep the
  sheet's "*All specimens were annealed ..." (m378): its words cover every bar. A reader who reads the footnote by
  where it stands would say otherwise; the sheets do not settle it, and the annealed reading is the cautious one (a
  value measured annealed decides only for the annealed product).
- **The negation check is an audit, not a rule.** `scripts/audit/table-detectors.mjs` lists 35 typed print or state cells
  whose words carry a negation or a condition; after this round each is a reading the words support (Fillamentum's
  drying scale, "Not mandatory, but it is recommended", a guide's "not" in its schedule note). It is not a lint rule,
  because a rule would need 35 acceptances; it is run by hand after an import.

```sh
node scripts/audit/table-detectors.mjs && node scripts/audit/duplicates.mjs && node scripts/audit/leverage.mjs
python3 docs/audits/2026-10-05-check-round-3/read/queue.py
```
