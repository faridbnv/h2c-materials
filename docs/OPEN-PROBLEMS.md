# Open problems

What is known to be wrong or missing in this database, reconciled on 2026-10-01. What it holds is counted in
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
| `MEAS-PHYSICS-WINDOW` | 152 | See item 2. |
| `MEAS-PHYSICS-STRAIN` | 31 | See item 2. |
| `MEAS-PHYSICS-ORDER` | 21 | See item 2. |
| `MEAS-CROSS-SOURCE-TWIN` | 6 | Two sources publishing the same numbers. Five are two revisions of one Polymaker sheet each, republished without remeasuring; since m174 each pair sits on one grade, so no product counts twice. The sixth is FormFutura's HDglass and ReForm rPET, one table printed for two PETG products (R053, §15). |
| `MEAS-PHYSICS-Z-ABOVE-XY` | 5 | Polymaker prints a Z stiffness 15 to 26 % above XY (two rows), and three sheets a Z strength or impact above their own X-Y one. Unusual at 100 % infill but not impossible; whether a sheet swapped its labels cannot be settled from the table. |
| `SOURCE-LOCAL-PATH` | 4 | See item 8. |
| `EST-FAMILY-ORDER` | 4 | A reinforced material below its unfilled sibling: ASA-AF's one modulus is an injection-moulded bar; ABS-AF's two sheets state no direction; PA12-AF has no heat deflection of its own; PBT-GF's own 175 °C heat deflection is below PBT's 180 °C. The per-record reasons preserve the sheets' values and conditions. |
| `EST-OUTLIER` | 5 | Five reviewed material/headline findings: PA6 heat deflection, PA6-GS density, PLA-EC density, PBAT XY modulus and nGen-CF XY strength. Making the PBAT and nGen-CF observations comparable in m218/m219 changed the fit; it did not justify replacing their exact published values. Each acceptance names the original value and why the model differs. |
| `NO-MEASUREMENTS` | 2 | See item 5. |
| `GRADE-PRODUCT-DUPLICATE` | 3 | Three pairs whose distinct names the rule reads as one: Anycubic PLA+ beside Anycubic PLA, eSUN PETG+ beside PETG, and Raise3D Industrial PA12 CF+ beside Industrial PA12 CF (m171, m174, m205). The rule's key drops the "+" that tells them apart. |
| `COVERAGE-SUPERSEDED` | 1 | Two "Evidence recorded" rows for PA6-GF's grades, each a separate re-filing (C01184, C01185). Several Resolved rows in one domain are a log of closed events and no longer a finding (phase 5, part 4). |
| `HEADLINE-FAMILY-UNLISTED` | 1 | Heat deflection does not name Flexible Elastomers, on purpose (D56). |

Each acceptance has its reason and the date it was accepted. The rows were counted on 2026-09-28, 235 in all, and
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

- **Stresses at a stated elongation have no property.** An elastomer sheet's "Tensile stress at 100 % / 200 % /
  300 %" (and FiberFlex Aero's "@ 5 % / 10 % Strain") are filed as tensile strength (endpoint unspecified): the first
  query lists them, retired duplicates among them. Where a sheet prints no other strength, one is its product's
  in-plane strength by the rule (the second query): QIDI PEBA 95A's 9.17 MPa stress at 100 % (V008146) states its
  direction, so it is comparable and decides; Fiberlogy FiberFlex Aero's and Siraya Tech Flex TPU 95A's and 85A's
  state none and are counted apart (D84). They need a property that carries its elongation, which is a design
  decision, not a re-read. Nanovia Flex V0's page (R-NANOVIA-Flex) prints three of the kind and none is recorded:
  "Tensile resistance 27 MPa", "Resistance at 100% elongation 7 MPa" and "at 300% elongation 10 MPa", all to "VDE282
  part 10", a cable-insulation test the standards vocabulary does not hold. The gap-fill research held the first
  (GF-RB043-0008) for the same reason, and the tranche of 2026-09-29 kept it held.

```sql
select measurementid, property, raw_value, data_status, locator from measurements
where property like 'Tensile%'
  and (locator like '%stress at %0\%%' escape '\' or locator like '%@ %\% Strain%' escape '\');
select gradeid, product, value, level from products_compiled
where measurementid in (select measurementid from measurements where property like 'Tensile%'
  and (locator like '%stress at %0\%%' escape '\' or locator like '%@ %\% Strain%' escape '\'));
```

- **Nobufil's printed column was never transcribed on twelve of its thirteen sheets.** Thirteen Nobufil sheets
  (3DJake copies) print one table with two value columns, "FDM H" and "Injection". The reader took only the rows with
  one value, which stand in the Injection column (m128 marks them moulded); the tensile, elongation and Izod rows that
  carry both a printed and a moulded value were never read, so the printed values these sheets exist to give are
  missing. It is a several-values layout (a transcription of both columns per row), not a correction. The gap-fill
  tranche (m225, 2026-09-29) transcribed PCTG CF's both columns, read on its page image, and found its one-value HDT
  row under FDM H, not Injection (V008864, corrected); the other twelve sheets' HDT rows stand under Injection, as
  m128 has them. None of them says what H is, so a printed value records "Stated, not a usable direction" and decides
  only as published (D84).

```bash
grep -l "FDM H[^I]" .cache/text/*.json | wc -l     # the sheets ("FDM H" alone also finds FDM HIPS); their rows:
npm run sql --silent -- "select * from measurements where sourceid like 'R-3DJAKE-3DJAKE-%'"
```

- **BASF's extended sheets print a value per print direction, by column.** The applied rows (V010063's class) record
  neither the direction the column names nor the printed specimen the table describes. It needs each page image read
  per column, not a rule.
- **The values beyond |z| 3 the 200 did not reach** stay in `v_measurement_z` (405 of the 530 the query lists on
  2026-09-27; the rest are the sweep's own); EST-GRADE-OUTLIER raises the worst of them at grade level.

```sql
select * from v_measurement_z where abs(z) > 3 order by abs(z) desc;
```

---

## 12. Print recipes the sheets state and the database does not hold

Found by re-center lane 2 (m136, 2026-09-25), which filled what the products' own cached sheets state and the parsers
read: the record is `docs/audits/2026-09-25-re-center/RESPONSE.md`, "Lane 2". Still open:

- **Three products state a recipe part only in words.** The query below recounted them on 2026-09-27:
  - 10 before m204, which typed Siraya Tech Fibreheart PPA's enclosure, 3D-Fuel Pro PCTG's and Raise3D's drying
    schedules from their own sheets;
  - then m205 and m211 gave both Raise3D PA12 sheets their "Dry ... at 80°C for 12 hours".

  The three left have chamber words in their know-how:
  - SUNLU PP;
  - QIDI ASA-Aero;
  - 3DXTECH 3DXSTAT ESD-PLA, whose statement comes from its maker's site (m206), not a sheet.

  The chamber gate reads the profiles, so these products stay unknown on it. Query: products whose
  `knowHow.recipe.chamber` or `.drying` is `collected` while `print.chamber.state` and `print.enclosure`, or
  `print.drying`, are unknown.

- **Twenty-nine products with no value of their own have no twin to read.** D89 lets a product whose sheet prints a
  same-material sibling's table (R053) read that sibling's values and recipe; the twins now do
  ([counts.md](../build/snapshot/counts.md) counts them). The others are reprints of another material's table (R166
  and its like) or products whose sibling holds nothing: no formulation key spans two materials, so they read nothing.
  Since m172 read their sheets' printing rows, 5 of them had no profile of their own, and m204 gave ReForm rTPU 90A
  and 85A and Python Flex 90A theirs from their sheets (the research package of 2026-09-26). Query: active products with
  no measurement and no same-key sibling.
- **The guide's enclosure is the H2C's chamber, and some makers ask for more** (D90, m165). The owner ruled that for
  the nine types Bambu Lab's guide asks an enclosure for, a silent product's chamber is within the H2C, labelled as the
  guide's: 123 products read it when m165 made the reading, and 105 on 2026-09-27. Products of those types that state
  a chamber above 65 °C on their own sheets keep that reading (16 when D90 counted them, 21 on 2026-09-27), Bambu
  Lab's own PPA-CF (50 to 80 °C) and PPS-CF (60 to 90 °C) sheets among them, which the owner named as the reason to
  revisit. Since D93 (m190, 2026-09-27) a maker's own "enclosure needed" or "recommended" with no temperature reads
  as the guide's tick does: 28 products' own sheets and one twin's (Kratos PC, whose own sheet says "Enclosure
  recommended for large(r) prints" and holds no profile of its own). None of those types is unknown with an
  enclosure asked for since m193 merged PolyMax PC's two revisions: the 2018 sheet's "70 – 80 (recommended)" now
  speaks for it beside the V5.5 sheet's unread "Not needed (70°C-100°C)" (below). Query: products of those nine
  materials whose `print.chamber.verdict` is `exceeds`, `partial` or `exceeds-recommended`, and those unknown with
  `print.enclosure` recommended.
- **What the guide prints and the tables do not use.** Since m209 the build reads the revision Bambu Lab's guide page
  links (B-GUIDE, eighteen types; D88 amended), checked on the page in headless Chrome. ASA-CF and PC FR are mapped to
  it, and the 15-column copy's rows are kept and read by no material. TPU for AMS is not mapped: its material (M040) is
  an alias, and the TPU classes are not one Bambu product. The guide's drying line is recorded and fills no recipe, and
  its annealing row, AMS compatibility, adhesion, desiccant, speed and fan rows are not recorded. Its TPU nozzle rows
  ("Hardened Steel / Stainless Steel") settle no hardened-nozzle question.
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
  - *The specimen blocks on the other sheets are not yet on their measurements.* D63 puts a sheet's specimen printing
    conditions in its measurements' Specimen / print parameters. m192 wrote them on 310 of the 332 measurements of the
    50 sheets whose profiles m170 left with no value (3DXTECH's "Printed Specimen Conditions", Raise3D's "All testing
    specimens were printed under the following conditions", Polymaker PC-PBT's "How to make specimens"); the other 22
    are density, DSC, melt flow, water uptake or moisture, not measured on the bar the block describes, and one 6 GPa
    modulus Raise3D's PET CF prose claims. The 122 other sheets m170 read a specimen block on (their profiles kept a
    recommended row) hold 1,390 measurements still Not published there, 1,016 of them bars or printed specimens:
    Polymaker's, Flashforge's, eSUN's, Raise3D Premium's, 3DJake's and Fiberon's blocks. m192's CSV and check take them
    sheet by sheet. Five excluded high-temperature materials (PEKK-ESD, PEI-GF, PEI-ESD, TPI, PEEK-GF) now publish no
    nozzle window at all; their exclusion is their H2C status.
  - *Polymaker's newer sheets set "How to make specimens" letter by letter* ("H O W T O M A K E S P E C I M E N S" in
    their text), which m128's reader did not match, so 376 bar rows on 37 of them say "do not assume printed" although
    the block says the test bars were printed. It decides where a product holds two sheets: the rule prefers a printed
    specimen, so merged PolyMax PC (m193) and m174's merges take the older sheet's values. m192's "bars" reading,
    with this heading, fixes both columns; its decision diff needs its own look.
  - *The specimens' nozzle diameter* is still the profile's on Flashforge's, AzureFilm's and SIDDAMENT's sheets ("0.4mm"
    where the recommended row prints "φ0.4/0.6mm (φ0.4mm recommended)"). It decides no gate; the Printing tab shows it.
  - *A part-drying schedule that may be another sheet's:* Flashforge's PET-GF and TPU 64D and SIDDAMENT's PET CF all say
    to dry the printed model at 120-130°C for 6-8 hours, a schedule that would soften a TPU part; recorded as printed
    (m173).
- **Five aliases still carry a researched chamber band.** PLA Basic, PLA Matte, PLA Lite, PETG Basic and PETG HF became
  aliases of PLA and PETG in m141, and their rows in `chamber_bands.csv` stayed; the build refuses a band only on an
  excluded material, not on a family entry or alias. An alias is never a candidate, so no answer depends on it, and a
  band decides nothing anyway (D34). The rows should leave through the removal ledger, and the build should refuse a
  band on a family entry as it does on an excluded material.

```bash
npm run sql --silent -- "select profileid, drying from profiles where drying_state = 'stated' and drying_c_state = 'Not published' and drying_hours_state = 'Not published'"
npm run sql --silent -- "select profileid, sourceid, nozzle_diameter from profiles where nozzle_diameter = '0.4mm'"
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
  - **No product remains "searched, nothing published" for general know-how.** b39's chamber searches initially
    labelled six products this way even though their captured pages contained maker claims. m222 records those
    six exact paragraphs as record-tier know-how, without numeric/environmental decisions. The chamber-specific outcomes on
    63 products (60 maker searches and three access/identity limits) are in
    `docs/audits/2026-09-28-gap-closing/C-SITE-OUTCOMES.csv`; qualitative heating advice without a setpoint remains
    unresolved. Re-derive the general counts with `npm run audit:know-how`.
  - **38 products have no document read** (state no-document-read), down from 44 after b39. Most came in with
    batches b34, b35 and b37 after lane 3 had read.
  - **Where the lists are:** `docs/audits/2026-09-25-re-center/KNOW-HOW-WORKLIST.md` (`npm run audit:know-how`), and
    `archive/research-2026-09-26/disposition.csv` for what became of each research finding.
- **"Fabru" and "Fabru / purefil" hold some products twice.** The makers' pages (m206) put one statement on both
  grades of five pairs:
  - G001-57 and G001-68;
  - G008-11 and G008-10;
  - G028-08 and G028-11;
  - G136-01 and G136-02;
  - G031-12 and G031-26.

  Some of these are twins (D89) and some are separate grades of one product under two manufacturer names. Not merged
  here.
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
found: Fillamentum Timberfill (PLA Wood, R203) and NinjaTek Eel (TPU-EC, R204). 18 remain deferred.

- **Five name neither a polymer nor a family**, so no home reaches them:
  - colorFabb's 2015 "20% milled carbon fibres";
  - igus iglidur A350;
  - Nuterials JECTO;
  - FormFutura SKULPT;
  - Multi3D Electrifi.

  A maker document naming the polymer or the family frees each. Electrifi's safety data sheet names one, "biodegradable
  polyester" (staged as a witness; the ledger note says so), but no material or home holds a polyester filament. The
  owner's word on a polyester home frees it.
- **Thirteen wait on a reader gap**: four Stratasys condition tables (Antero 800NA is PEKK by R192; Diran 410MF07, "a
  nylon-based ... mineral-filled 7%", waits on the owner for its home too), three layouts (Essentium PA and PA-CF,
  3D4Makers PI Z2, which stays TPI by the owner's confirmation of R193), two languages (Smartfil FLEX 77A in Spanish,
  a TPU; Flashforge FABRIAL-R in Japanese), BigRep HI-TEMP's mis-mapped text layer, Markforged's four-product
  Composites table, FKuR's Fibrolon trial-grade sheet, a resin maker's that names no filament, and QIDI S-White. The
  research package of 2026-09-26 found readable official copies or translations for several of them (Essentium's
  orientation diagrams, the Spanish and Japanese texts, Markforged's column headings; its P1-IDENTITY folder). Each
  still wants a reader or a per-figure migration of its own, as m198 was for LEHVOSS.
- **Batch b36 deferred one sheet on a reader gap**, and m198 entered it by the owner's leave (decision 7 of 2026-09-26):
  LEHVOSS's printed-specimen sheet for LUVOCOM 3F PAHT 9825 NT is a second source of G147-01, checked line by line on
  its hash-checked page. PAHT (M147) has its comparable stiffness now, 3.1 GPa: it passes Lightweight structure and
  fails High-stiffness fixture. Left on the sheet, in the record tier: the thermal expansion it prints as 0.5 × 10⁻⁵/K,
  a tenth of an unfilled polyamide's, which wants LEHVOSS's word before it is a number here; the 200 h service
  temperature and the insulation resistance, which the registry has no property for; and its processing window (265
  to 290 °C, bed ≥ 50 °C, drying 110 °C for 6 to 8 h), which differs from the moulded sheet's (270 to 290 °C) that
  G147-01's profile holds. The reader gap itself (a condition cell and two headings) is not closed; a second sheet of
  this layout would need the same kind of migration, or the reader.
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
- **SUNLU TPU (G039-51) is most likely an earlier sheet of SUNLU TPU 95A (G039-19).** Its figures are SUNLU's 2024
  sheet's; the 95A product's current sheet prints newer ones. Both are in the TPU 95A class as two products since m223;
  merging them is a decision of its own.
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
  product's recipe". PET-LW (M141) now fails the three stiffness templates rather than being unknown. Left: colorFabb's
  LW-PLA and LW-PLA-HT sheets print the same two columns ("Value @ 210˚C; 100%" and "foaming 230%; 60%"), and
  source_facts holds their seven rows; D95 reads them the same way, and a migration like m197 would record them. The
  two PET products' profiles (P0495, P0508) took the unfoamed column's 210 °C as their nozzle window, where the sheet's
  print guideline gives 210 °C unfoamed and 260 °C foamed: the H2C reaches both, so no gate moves, but the recipe should
  read 260 °C. FormFutura's ApolloX Kevlar prints "Elastic tensile modulus 2200 MPa ISO 527-1", a label the lexicon
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
  GRADE-PRODUCT-DUPLICATE compares names, and a revision often carries the maker's name before the product's. One
  candidate: m174 merged PolyLite ABS V5.6 into Polymaker ABS (G027-09), and PolyLite ABS V5.3 is still a grade of its
  own (G027-02), with a density of 1,120 kg/m³ where V6.0 prints 1,040 (§17).
- **3D-Fuel's Pro PCTG is named "3D"** (G088-04): its sheet prints "3D-Fuel Pro PCTG" on page 1, and its Title reads
  "TECHNICAL DATA SHEETTECHNICAL DATA SHEET 3D-Fuel", a heading read twice. The grade holds no profile, so each of its
  print gates is unknown, although its know-how quotes a chamber (§12).
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
  for where a density is beyond the neat polymer; the query lists them (20 on 2026-09-27): PolyLite ABS 1,120 on its
  V5.3 sheet (G027-02, neat ABS to 1,110), Spectrum PET-G MATT and eSUN PETG-Matte 1,350 (neat PETG to 1,300), SUNLU
  PVA 1,010 and PolyDissolve S1 1,370 (neat PVA 1,180 to 1,340), Recreus RECIFLEX 1,000, and the rest. Some neat
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
  kept one number each; the others are in the record tier and wait for a re-read.
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
  strength"). Left, because nothing on the page says how the bar stood: 25 more Eryone "X-Z" sheets of the same
  template (8.7 to 47 MPa), SUNLU's two "(Z-X)" sheets (their drawings show only flat bars), Flashforge HS PLA's
  "(X-Z)", iSANMATE PEI 9085's "ZX Orientation", Prusament PVB's "Vertical xz" (49 MPa beside a horizontal 50 MPa, and
  a separate interlayer adhesion of 9 MPa, so not across the layers), Markforged Onyx GF's XZ (73.7 MPa, above its
  XY), Stratasys ABS-M30i's XZ ("on side long edge") and LEHVOSS's LUVOCOM 3F PAHT 9825 NT's "100% infill - ZX"
  (m198). The
  Direction vocabulary gives ISO/ASTM 52921's meanings now (XZ on its edge, ZX upright). Eryone's own two sentences
  suggest its template's "X-Z" is always the Z-axis bar; applying that to the other 25 is a ruling, not a reading.
- **Eryone's sheets state their test bars' printing conditions** ("Note: All splines are printed under the following
  conditions: printing temperature=210° C, printing speed=80mm/s, base plate 60 ° C, filling=100%, nozzle
  diameter=0.4mm") and their rows' Specimen / print parameters say Not published; so do SUNLU's ("测试样条打印速度 45 mm/s，
  打印温度 255 ℃。填充 100%"). These sheets were not among m170's, so m192 did not reach them (§12).
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
- **124 registered sources have no hash-verified original here, and 12 record no digest.** The formerly mismatched
  R-KIMYA-PEBA-S-TDS remains an absence after the controlled restore; no wrong bytes are accepted. The current
  campaign checkout verifies 1710 of 1846 registered originals. The private backup contains 2397 originals including
  ledger-only documents, and 2800 derivatives; it cannot supply the 124 absent entries. These are the local
  2026-10-01 custody counts, not a cloud-upload confirmation or a claim about every clone. Original recovery or
  a separately reviewed revision is still needed; never overwrite the recorded digest to make a cache match.
- **The full-text index is partial**: the refreshed local SQLite of release 784aaac91d99 indexes 1626 of 1840
  retrieved source rows; 214 lack text, as re-derived by the query below. Cached bytes and indexed text are different
  populations. The source/index receipt in the campaign's documentation reconciliation records this dated checkout.
  Fresh clones/CI without private originals legitimately have a smaller index; restore verified originals and their
  derivatives before source rereads. The existing test's partial-cache limitation remains: a fixture-created
  .cache/text is not a complete source library. Never query an old SQLite directly after a data change; npm run sql
  rebuilds it when its inputs/release are stale.
- **What F14 and F13 left** (D104, D105): `ingest:fetch --refetch --recheck` still overwrites an applied document's
  digest rather than recording a new revision; `audit:sources` has its own unbounded fetch; the reader was not split
  into adapters; and a traced decision does not report its rank. The source bundle now preserves the cached text's
  reader/version metadata and hashes its derived files; it does not package executable OCR/parser environments.
- **The frozen research worklist is dry/as-printed.** Additional S01/S03/S04 annealed and S05 conditioned policies
  occur in acceptance expectations, but were not separate questions in that worklist. The owner asked to finish
  the frozen targets and record these variants for follow-up. `scripts/audit/gap-state-followup.mjs` writes the
  four policy variants and their 1,538 current one-fact gaps in
  `docs/audits/2026-09-28-gap-closing/STATE-VARIANTS-FOLLOWUP.csv`. This is a queue, not completed source research;
  re-run it after a build when the data changes. Acceptance tests already cover the named expectation examples.
- **Cold fast-check timing needs a performance follow-up.** After the gap-closing data changed the cached test
  builds, `verify:fast` took 106.7 s against the 90 s goal (VERIFY-C.txt in the gap-closing audit). Functional checks
  passed. The owner chose to record this for follow-up, rather than investigate performance in this source-research
  run. VERIFY-FAST-C-WARM.txt records the separate isolated warm run with `--enforce-budget`; neither timing is
  represented as the other. Reproduce cold and warm timings with stable inputs and no competing build work.

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
- **Cold verify:fast is still over budget** (§19); this change adds three test files and two probe views.

```bash
npm run sql --silent -- "select count(distinct gradeid) products_with_a_listing, currency from prices where quarantined = 0 group by currency"
npm run sql --silent -- "select gradeid, normalized_value, standard_load, specimen_type from measurements where materialid = 'M001' and property = 'Tensile modulus' and direction = 'XY' order by normalized_value limit 8"
node docs/audits/2026-09-29-ashby-makeover/tools/probe.mjs
```

## 21. What the gap-fill tranche leaves open

The tranche of 2026-09-29 (GOALS; [the record](audits/2026-09-29-gap-fill-implementation/README.md)) took 45 of the
research package's 51 technical findings, and one fact found on re-reading. What it did not take, and what it found:

- **Two findings are held, as the research held them.** Nanovia Flex V0's "Tensile resistance 27 MPa VDE282 part 10"
  (§11) has no faithful property or standard. Extrudr FLEX HARD CF's drying (G129-02) disagrees with itself: its page's
  FAQ says "drying for 6 hours at 60°C", the settings table under it "Drying time 12 h", and Extrudr's catalogue 6 h. A
  question for Extrudr; nothing is averaged.
- **Spectrum GreenyHT's identity is contested** (G001-134, a PLA blend since m223, D106). m223 filed it from Spectrum's
  category page; Spectrum's current shop data calls it "Bio-Based Copolyester (PLA-Free)" (the research's
  GF-PL001-0027, saved as `products.json`). Its SKU does not match the variant, so neither reading settles it. It stays
  a PLA blend until the owner or Spectrum says otherwise.
- **Prices were not admitted by the tranche.** Its eight usable offers were all foreign, and the currency contract they
  needed was not built. The price pass of the same day built it (D113) and took prices from saved shop pages instead of
  the research's notes; what it leaves is §22. The tranche's PRICES.csv stays as its record.
- **A published bound shows as its number.** A lower bound ("> 300 %") is a product's value with an open interval,
  and the build keeps it one (V011516), but the key-number cards and the products table draw it as "300 %*", with the
  not-comparable mark and no "more than". It was so before the tranche: four materials' hints and 46 product values are
  bounds (the first query lists the bound measurements); the tranche adds one of each.
- **Extrudr's product pages print newer tables than its sheets.** The pages b39 registered for DuraPro ABS CF and
  DuraPro PC/PBT CF (and the FLEX Medium Matt page) print property tables that differ from the sheets the database holds
  (DuraPro ABS CF's tensile modulus: 4000 MPa on the page, 2850 MPa on its sheet). They were read for chamber words and
  drying only. Whether a page is a newer formulation or a newer test wants Extrudr's word before either is recorded.
- **The HTML reader drops a table's heading row on Nanovia's pages.** "Test performed at 50mm/min on ISO 3167 A test
  specimens" heads the tensile rows in the bytes of R-NANOVIA-PA-Food-Industry and is not in its cached text, so its
  tensile rows (V011205, V011512, V011513) carry Specimen / print parameters "Not published". The specimen is still
  unstated (an ISO 3167 A bar may be printed or moulded).
- **The estimate model recalibrated.** No rule changed, but the rows it learns from did, so 129 estimated headline
  cells of 50 materials, and 762 products' estimates, moved (`build/snapshot/headlines.csv`). Two moved a screen in Explore with estimates: PA6 (M049) is now
  screened from Flexible component (its elongation's plausible top 65.1 % against 100 %), and PET (M066) from Warm
  environment (the top of its heat deflection's screening range 79.9 °C against 80 °C, from 80.1). Neither is a verdict.
- **Reviews are agents'.** The research's review was by another AI model; the re-read here is Claude's (an agent). No
  person has spot-checked these values, and no H2C print test stands behind a recipe.

```bash
npm run sql --silent -- "select measurementid, gradeid, property, raw_value from measurements where operator = '>' and data_status not like 'Retired%' and materialid in (select materialid from materials where scope != 'Family entry') limit 20"
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
  diameter rest on their product's own sheet printing 1.75 mm and no other. PolyMide CoPA is two grades of one product
  (G057-01, G057-03); its listings are recorded under G057-03 only.
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

Spectrum PA6CS20FRV0's own product-page nozzle/speed/cooling/enclosure guidance differs from its TDS; Q05471 preserves the new source but its replacement profile stays held. Existing P0184 stores raw bed>80C beside typed80/80, a specific unresolved endpoint defect, not authority to narrow the maker's range. KK50056BKFR railway producer context is scoped to its resin grade; the separately printed V-0@0.4mm statement is not a complete printed-product railway certificate.9936BK/L is distinct from9936BK, so adjacent food/magnetic claims do not transfer.

Prografen's exact Strong/Light pages add recipes and bounded uses. Their semi-transparent application bullet conflicts with the portfolio's shared Deep black color (and Light's own black TDS); Q05460/Q05483 keep that conflict. The portfolio explicitly states February2024 Spectrum acquisition and names Strong5%/Light0.5%EFG, but the existing grade manufacturer3DJake is held for a separate guarded identity correction; no value or historical price moves in this tranche. New ownership does not settle the older AGP2023XY specimen/revision-custody question. Shared UV and generic chemical statements remain narrative without test conditions or a selection pass.

```sh
npm run sql --silent -- "select profileid, gradeid, nozzle_c, bed_c, drying from profiles where profileid in ('P0184','P1321','P1322','P1323')"
npm run sql --silent -- "select evidenceid, gradeid, topic, finding, exposure_conditions from evidence where evidenceid in ('Q05452','Q05460','Q05471','Q05483','Q05484','Q05485')"
```

## 27. The coverage-expansion campaign remains incomplete

The current [generated campaign status](audits/2026-09-30-coverage-expansion/STATUS.md) and
[remaining targets](audits/2026-09-30-coverage-expansion/remaining-targets.csv) distinguish material assessments
from joined product research. No blank Application cells remain, but a filled mark can be a documented gap or
reviewed limitation and can still await this campaign's manual assessment. Each assigned product pass includes
applications/finishing, all frozen environmental categories, print/drying/treatment/moisture gaps, missing
properties/comparison conditions, prior price outcomes and source/identity conflicts.

Legacy 3DXTECH ESD-TPC 90A must not inherit current ESD-TPU90A/60D claims. PC/ASA, ESD-PVDF, ESD-PPS and CarbonX
PC/ABS retain their prior exact-identity/vendor handoffs. A new bounded environmental-question search found
shared official support/download/article leads; those are provisional, not source admissions or completed
product passes. Frozen-targets.json retains prior reviewed route outcomes so they need not be repeated.

Scope/condition clarifications, positive Waltek sample activities, Siraya coupled foaming states, conflicting
recipes/colour/certification claims, unknown service exposures and missing source originals retain the release
conditions in §§19 and 23–26 and the per-tranche packets. Physical tests, vendor clarification and human source/
team checks remain separate from catalogue research. The original plan's all-target finish criteria are not met.

```sh
npm run build
npm run audit:coverage-status -- --check
```

## 28. What the error-class sweep leaves open

The sweep of 2026-10-01 ([record](audits/2026-10-01-error-classes/README.md)) removes the data audit's error classes
one mechanism at a time. RC1 and RC2 are removed (D115). Under review, each accepted as "Open in the error-class sweep"
until it is re-read: 54 product pairs that print one table with no formulation key (GRADE-VALUES-TWIN), 30 impact
values whose unit disagrees with their standard (IMPACT-UNIT-STANDARD), one notched-above-unnotched pair and three
flexural pairs (MEAS-PHYSICS-NOTCH, -FLEX-STRAIN), and one filled product filed as unfilled (FILING-FILLER-WORD). Not
under review from `npm run audit:context` (RC3, RC4, RC8, D116): 103 pages whose heading or footnote no
page_context row carries, 36 directions, 72 standards, 3 notches, 4 bound signs and 3 sub-zero test temperatures on
values' own lines, and 143 print settings a profile's own sheet prints and the profile does not hold.

```sh
npm run data:lint
```

