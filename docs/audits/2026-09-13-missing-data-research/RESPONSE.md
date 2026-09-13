# Implementing the 13 September missing-data research

How each finding in [REPORT.md](REPORT.md) reached the workbook and the selector, and what re-reading
its sources turned up.

The research proposed changes and deliberately made none. Nothing it cited was entered on its
say-so: every value was re-read from the source on 2026-09-13, and every source file that could be
fetched had its SHA-256 recorded. Where a source could not be retrieved, nothing from it was entered.
Re-reading found the report wrong in four places and silent on the largest gap of all. Both are below.

The workbook edit is [apply-workbook-changes.py](apply-workbook-changes.py). It changes named
cells and appends rows, touches no other part of the file, and refuses to run on any workbook but the
one it was written against. Its 276 changes are listed cell by cell in [changelog.csv](changelog.csv).
The workbook's SHA-256 moves from `9018c6368a1e8c2184ce74407ded8cd12d237cf6bd90bf74e67d8deaab3a0acf` to
`31a1e17d394ad3552a035e80994decae2d4301d6b19a4ce2c7c9f8b0352dbe52`.

Verification: `npm run build` reports zero errors and the same four standing warnings. 96 tests pass,
13 of them new, each pinning one decision below. The Printing columns, the material drawer and the
filter rail were checked in headless Chrome with no console errors.

## What changed, in numbers

| | Before | After |
|---|---:|---:|
| Density headlines | 89 | 94 |
| Stiffness headlines | 70 | 74 |
| Strength headlines | 52 | 57 |
| Stretch headlines | 72 | 75 |
| Heat-resistance headlines | 66 | 69 |
| Headlines verified against their citation | 349 | 369 |
| Materials with no property measurement at all | 11 | 5 |
| Chamber gate: within | 49 | 69 |
| Chamber gate: partial window (new) | 0 | 4 |
| Chamber gate: exceeds | 5 | 4 |
| Chamber gate: unknown | 45 | 23 |

Of the 96 in-scope materials, 55 now publish a chamber temperature, 20 say in words that no heated
chamber is needed, 3 recommend one without a temperature, 1 lists no setpoint, and 17 publish
nothing. 20 carry an estimated band.

## The largest gap was not in the report

The report recovered three chamber windows from Bambu data sheets. Re-reading them showed why they
were missing: in every Bambu data sheet the "Chamber Temperature" row is the first row after the page
break in the settings table, and not one was transcribed. The files re-fetched on 2026-09-13 are
byte-identical to the ones in the source register, so these are omissions from documents already
cited, not new evidence. Fourteen profiles were affected:

| Chamber | Profiles |
|---|---|
| 25–45 °C | PLA Basic, PLA Matte, PLA Metal, PLA Marble, PLA Sparkle, PLA Galaxy |
| 35–50 °C | PETG Basic, PETG HF, PETG-CF |
| 45–60 °C | PC FR, PAHT-CF, Support for PA/PET |
| 50–80 °C | PPA-CF |
| 60–90 °C | PPS-CF |

Every PDF source behind a profile with no chamber value was checked the same way. Three more
statements were recovered: PolySonic PLA's "Closure Chamber: No needed", BASF TPC 45D's "-" (used by
both TPE and TPC/TPEE), and Spectrum PPS AM230's "active heated (60-80°C)", which had been filed only
under Enclosure.

## Where the sources contradict the report

| The report says | The source says | What was recorded |
|---|---|---|
| The accessible Bambu PPA-CF TDS publishes no chamber range; estimate 80–120 °C | TDS V1.0, hash-matched, p. 2: 50–80 °C | 50–80 °C, a partial window. The band is not used for PPA-CF |
| Fiberon PET-GF15: chamber recommended for stable dimensions | TDS V1.0: chamber room temperature. The product page returned HTTP 403 | Room temperature, plus a Conflict coverage row naming the unverified page claim |
| eSUN PLA-Lite HDT at 0.45 MPa, 53 °C | The page gives 53 °C with no standard and no load | A headline carrying the load-not-stated caveat, like 24 others |
| PET-GF15 mechanical values as printed XY data | A note under the mechanical table: all specimens annealed at 120 °C for 16 h | Recorded with that post-processing on every row |

Two smaller ones. The CoPE TDS V5.4 the report cites returned HTTP 404, so its density of 1.296 g/cm³
and elongation of 10.5% were not entered; the Panchroma TDS V2.1 gives density 1.30 and the same
modulus and strength, and those were. The nGen URL returned 401; the current colorFabb TDS v2.0 was
used, and it names Eastman Amphora HT3300 where the grade row says AM3300, which is now an open
identity conflict.

The estimated bands were tested by the same evidence. Where a band met a real value for one of its
members, it twice sat almost entirely beside it: Support for PA/PET publishes 45–60 °C against a band of
20–45, and PPA-CF 50–80 against 80–120. That is why no band decides anything (D34).

## Findings, one by one

### 1. Heated chamber

| Finding | In the tool |
|---|---|
| PC FR 45–60 °C | Recovered from its own TDS. Chamber gate within |
| PAHT-CF 45–60 °C | Recovered from its own TDS. Within |
| PPS-CF 60–90 °C, partly reachable | Recovered from its own TDS. The new partial verdict (D32): INDETERMINATE against a chamber requirement, "Partly" in the drawer |
| Categorical states kept apart from numbers | "Not required", "recommended" and "no setpoint" are distinct compiled states, shown in words in the Printing columns and the drawer, and never become a temperature |
| PLA Silk: enclosure not needed | New Panchroma Silk PLA profile P0162. Within |
| ABS-ESD, PC-CF, PVDF: chamber recommended | Already recorded as "Recommended". The gate reason now says so instead of "no numeric requirement" |
| TPC/TPEE: "-" is not 0 °C | No setpoint. Unknown, with that reason |
| CPE, CPE-CF: not needed | New Fillamentum printing-guide profiles P0165, P0166. Within |
| PET-GF15: recommended | Contradicted by its TDS; see above |
| Bambu filament guide: enclosure required or optional | Not used. It is family-level, an enclosure is not a heated chamber, and the fourteen TDS windows above answer the same question for the Bambu grades with numbers |
| Estimated bands for the 43 gaps | [build/mappings/chamber-estimates.json](../../../build/mappings/chamber-estimates.json). 22 are superseded by evidence and listed in the validation report; 20 are shown, marked †, and change no verdict (D34) |
| PVDF: no defensible band | Recorded under `noBand`; none shown |
| PPA family: exact evidence required before a hard fail | Holds for PPA and PPA-GF, whose IPCON data sheets were re-read and publish no chamber temperature |

A source that says an enclosure is not necessary has now also said no heated chamber is needed, which
clears the chamber question for five Spectrum profiles (D33). One recommending an enclosure has said
nothing about 65 °C and stays unknown.

### 2. Properties

| Finding | In the tool |
|---|---|
| eSUN PLA-Lite | Grade G004-01, profile P0161, 13 measurements. Headlines: density 1,230 kg/m³, strength 53.05 MPa, stretch 3.89%, heat 53 °C (load not stated). The 3,114.92 MPa flexural modulus stays flexural |
| Panchroma Silk PLA | Grade G008-01, profile P0162, 6 measurements. Headlines: density, stiffness 2.403 GPa, strength 41.1 MPa. Vicat 64.7 °C stays Vicat |
| Panchroma CoPE | Grade G091-02, profile P0163, 6 measurements. Headlines: density 1,300 kg/m³, stiffness 2.515 GPa, strength 51.6 MPa |
| Fiberon PET-GF15, as a separate grade | Grade G068-02, profile P0164, 22 measurements, now the representative grade. Headlines: density, stiffness 4.14 GPa, strength 59.9 MPa, stretch 4%, heat 81.6 °C as printed. The annealed 133.7 °C is its own measurement. Flashforge PET-GF is unchanged |
| CPE HG100: orientation not established | 9 measurements. Density 1,250 kg/m³ and HDT 80 °C at 0.455 MPa are headlines; tensile values are related evidence. The TDS labels 90 °C a glass transition under ASTM D1525, the Vicat method, and a note says so |
| nGen: printed XY actual, density and HDT supplier data | 11 measurements. Printed XY stiffness 1.7 GPa, strength 54 MPa, stretch 11% are headlines. Density 1.2 and HDT 71 °C are raw-material values, shown as related evidence that says why |
| eSUN PEBA90A | Already on record from its TDS (G045-01). Not re-entered from the web page |
| BASF TPC 45D density, Tg, melting point | Already on record. Only its chamber "-" was new |
| Vicat, Tg and melting point are not HDT | Unchanged rule (D9), now pinned for PLA Silk and CoPE |

### 3. Identity

| Finding | In the tool |
|---|---|
| CoPE duplicated CPE HG100 | G091-02 is the CoPE identity and representative grade. G091-01 is kept as an audit trail and says it is superseded |
| PET-GF needs grade separation | G068-02 added beside G068-01; the representative-grade change is written into the identity note |
| PA66, PA66-CF, PA612, PA612-GF are not products | A coverage row each: no defensible exact grade; the Stratasys and Fiberon candidates are different formulations |
| POM unresolved | A coverage row: bed 120–150 °C, no chamber, mechanical or HDT values, and no chamber inferred from the bed |

PLA Lite and PLA Silk now carry third-party technical grade samples. They are not the original
products those entries were opened for, and the grade rationale, identity note and Method row each
say so, so the addition is explicit rather than a silent substitution.

## What the build needed

- **Row counts.** `build/src/extract.js` moves to 144 grades, 167 profiles, 1,966 properties, 235
  sources, 1,146 coverage rows and 44 method rows.
- **A partial chamber verdict** in `normalize/process.js`, and in the gate precedence in
  `compile.js`: within, partial, exceeds-recommended, exceeds, unknown.
- **"No setpoint"** as its own process state, and **enclosure wording** parsed into not-needed,
  recommended or unknown.
- **Chamber guidance** per material (`print.chamberGuidance`), the strongest statement in words across
  its profiles.
- **Chamber bands** from `build/mappings/chamber-estimates.json` via `build/src/chamber-estimates.js`,
  checked by name against the snapshot; an unknown name stops the build.
- **Related evidence** says "raw-material supplier value" where that is why a value is not a headline.
- **The validation report** gains a partial-window column and a Chamber evidence section.
- **The interface** reads gate verdict words from one table in `app/js/ui/labels.js`; three screens
  each had their own copy.
