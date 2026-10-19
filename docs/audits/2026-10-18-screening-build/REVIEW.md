# Screening build, stages 0 to 3c: independent review

> **Historical record** (2026-10-18): an independent review of the screening build, stages 0 to 3c, on main ef96fe00 (release f399a642f5d3). Stage 3d corrected what it found; for where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

Reviewer: Claude Opus 5.5 (agent), 2026-10-18. Read-only, on main at ef96fe00. The main checkout's `dist/db.json`
(release f399a642f5d3) was used for every query. The estimate stage (`build/src/estimate/`) was not reviewed. Scenario
runs used `runSelection` + `pageContext` (scripts/trace.mjs) over the six templates. Unless a line says otherwise, the
mode is Include with estimates on. Spot traces used `npm run trace -- --scenario … --product …`.

Severity: **wrong answer** (a pass or fail the evidence does not support), **misleading** (a group, a row reason or the
page's words point the reader the wrong way), **stale doc**, **cosmetic**.

## Findings

### Wrong answer

**R01. CV01 takes an HDT at 1.8 MPa from an undescribed bar as a floor for PLA and PET. CV05 says that same bar is only
a ceiling.**
- Where: `data/tables/conversions.csv:2` (CV01: Source specimen "as target", Applies to all) and
  `build/src/evidence-ledger.js:165-172` (`judge` admits a `not-stated` bar for an "as target" row). Compare
  `conversions.csv:6` (CV05 demotes the 0.45 MPa value from that same kind of bar for PLA, PLA blends, PLA-PHA and PET).
- What is wrong: CV05's own reasoning is that a moulded or undescribed bar may have crystallised and a print has not. If
  so, the bar's 1.8 MPa value is just as unsafe as a floor for the printed part. A crystalline PLA bar reaches 65 to
  80 °C at 1.8 MPa, while an amorphous print reaches about 55 to 60 °C at 0.45 MPa. The stage swapped one unsafe pass
  for another: the higher 0.45 MPa figure from a bar can no longer pass, but the lower 1.8 MPa figure from the same bar
  can.
- Evidence, a single requirement "HDT at 0.45 MPa at least X" (my script over dist/db.json):
  - At 65, 70 and 75 °C, **PLA passes only** on Spectrum PLA Pro G001-16, Fiberlogy IMPACT PLA G001-55 and
    MatterHackers Tough PLA G001-115. All three rest on V008746, MatterHackers' "HDT/A 75-80 °C" from an undescribed bar
    (its standard cell reads "HDT/A D3418", a DSC method). Trace for 70 °C: "Meets it on its HDT at 1.8 MPa, a harsher
    load: 75 °C (V008746)… material M001 PLA: PASS (some)".
  - At 60 to 65 °C, PLA Silk passes only on G008-13 (Yousu, 65 °C undescribed), PET only on G066-01 (65.7 °C undescribed)
    and PLA blend-CF only on G169-01 (Extrudr, 75 °C undescribed).
  - At 55 °C, 22 PLA products pass this way. In most of them, the 0.45 MPa value from the same sheet is demoted.
  - In Warm environment (80 °C), Raise3D Industrial PET GF G068-04 passes HDT on V013951 (99 °C at 1.8 MPa, undescribed).
    Its own 120 °C at 0.45 MPa (V013952) is marked `ceilingOnly`. The same pass holds at 90 °C. PET-GF's material verdict
    survives on other products.
  - The two LEDGER-DISAGREE states, G001-77 (floor 60 against ceiling 59) and G158-01 (50 against 48), are artefacts of
    the same rule.
- Before stage 3b, every one of these was unresolved. Stage 3b's report says "Every product whose pass went away has a
  PLA or PET heat value marked as only a ceiling" (stage-3b.md). It does not mention the passes CV01 created on the same
  bars.
- Fix: for the kinds a deciding CV05 row names, CV01 should read only printed bars. One way is a printed-only twin of
  CV01 for those kinds and an exclusion in CV01's Applies to. Another is for `judge` to refuse a moulded or undescribed
  source wherever CV05 decides. Then re-run the census and record the moves in D153.

### Misleading

**R02. The far end of the flexural band counts as "on the line". This puts PLA, PLA Silk and PC "one check away" from a
5 GPa fixture.**
- Where: `app/js/engine/constraints.js:375-377` (`ledgerResult` applies the test scatter to any deciding end) and
  `:935` (`measuredMiss` treats any INDETERMINATE as holding the material open).
- What is wrong: CV08's band, 0.46 to 1.93 times the flexural modulus, is already the envelope of every same-sheet pair
  in the database. Adding a further 10 % of scatter to its upper end counts the uncertainty twice. D152 also says a
  published range keeps its own rule and never goes on the line; a band is a range. D155 says "unlikely to meet" is
  blocked only by a measured value held open, but the code blocks it on a ledger bound too.
- Evidence, High-stiffness fixture:
  - PLA reads "One check away on 1 of 195 products: Spectrum PLA Tough, tensile modulus (XY) bounded at 4.811 GPa by
    another record, on the line". Trace G001-04: "Its flexural modulus: 2.493 GPa (V002691), so between 1.14678 and
    4.81149 GPa: just under 5 GPa … on the line; one test bar or a word with the maker settles it". PLA has 62 failing
    products and none that meets.
  - The same happens to PLA Silk (G008-05, 4.773 GPa), PC (G035-17, 4.542 GPa) and PC-CF (G037-05). PETG goes to "Not
    enough data" instead of "Unlikely" (G020-38, 4.642 GPa). It holds in both Include modes.
  - Outdoor: PA12-CF is held one check away by G053-10 the same way.
- An engineer would not call PLA one test bar from 5 GPa.
- Fix: put on the line only a bound from a factor-1 relation (floor, ceiling, equal, demote). Never use a band end or a
  scaled bound. Make `measuredMiss` and `everyMeasuredMisses` ignore a ledger-bound INDETERMINATE, as D155 says.

**R03. The page says a starred related value is used by no filter. Since D153, the ledger can use it to pass or fail a
requirement.**
- Where: `app/js/ui/format.js:286` ("No filter uses it."), `app/js/ui/table.js:475` (the legend, the same words),
  `README.md:289` ("so it decides nothing"), `docs/DATA-MODEL.md:536` ("May satisfy a requirement? no") and
  `docs/HOW-IT-WORKS.md:356` ("No").
- Evidence: PA6-CE's (M104) HDT cell is related V002738, 90 °C, "measured at 1.8 MPa, not 0.45 MPa". Warm environment
  passes PA6-CE only on that record (CV01). PPE-PS (V004089) and PAHT (V011437) are the same case.
- True statement: a related value from another load, state, bar or property can bound a requirement through a deciding
  row of the evidence ledger, in its one safe direction; the drawer shows whether it decided.
- Fix: change the words to that, in all five places.

**R04. Two preset notes still say an undescribed bar's HDT counts as a printed bar's.**
- Where: `app/js/ui/templates.js:42` (Outdoor) and `:73` (Warm environment): "An HDT whose test bar its sheet does not
  describe is accepted as a printed bar's."
- This is false since D153 for PLA, PLA blends, PLA-PHA and PET (CV05). There such a value is only the most a print
  reaches. Stage 3b moved 27 products' answers on exactly this point.
- Fix: add "except for PLA and PET, which print glassy: there it is only a ceiling (D153)".

**R05. PA6-CF meets the Outdoor structural part on dry stiffness.**
- 5 of 14 products pass, on dry or moisture-unstated values: G050-07 4.02 GPa, G050-08 4.3 GPa, and G050-06 on its
  flexural floor of 5.06 GPa.
- A nylon conditioned at 50 % RH loses roughly 30 to 50 % of its stiffness, so an outdoor bracket is the case where
  that matters. The preset's "not checked" note discloses it, but the pass row does not.
- Fix (owner's call): the row should say "judged dry; humid stiffness not published" for a polyamide pass. Or Outdoor
  could ask the conditioned state, where CV07 then supplies floors.

**R06. "The other N have no value measured that way" hides products that fail on a limit of their kind.**
- Where: `app/js/engine/constraints.js:1055` (`materialGroup`) and the folded note at `table.js:580` ("Not a failure:
  the products that publish nothing are untested").
- Evidence: PEBA in High-stiffness reads "every measured product misses … 1 of 10; the other 9 have no value measured
  that way". 8 of those 9 fail on CL01 ("An unfilled rubber … is never stiffer than 0.5 GPa"). Only G045-09, a variant,
  is open.
- Fix: count the products that fail on another record or on a limit of their kind apart from the untested ones.

**R07. "One check away" says one question, but the code puts several open printer checks there.**
- Where: `table.js:578` ("waits on one question … a printer setting not stated, or a value on the line") and
  `constraints.js:832` (`unresolved.every(isPrinterCheck)`).
- Evidence: LCP in Warm environment is listed with its bed on the line *and* its chamber not stated. "Sheets disagree"
  is in the group too, and the note does not name it.
- Fix: "waits only on print settings its sheets do not state, or on one value on the line or one disagreement".

**R08. A "likely" tag can rest on a physically impossible estimate (hand to stage 4).**
- Outdoor and Lightweight: "Not enough data, likely: BASF Forward AM Ultrafuse PAHT CF15, density estimated 1,030 to
  1,170 kg/m³".
- A 15 % carbon-fibre nylon cannot be lighter than neat PA6 (1,110 to 1,180 in polymers.csv). G048-02 also carries two
  density records of 1,203 kg/m³, which are not its comparable value. The answer happens to be right (at most 1,250), but
  the number shown is not.
- Fix: stage 4's filled-density and fibre checks (C40). Until then, do not tag likely where a product's own non-comparable
  record lies beyond the estimate.

### Stale docs

**R09. docs/HOW-IT-WORKS.md:555 and :557 still describe D137's groups.** They say Include "separates supported
candidates, estimated candidates to verify, and insufficient evidence", and that "an estimated candidate … predicted
centre meets the limit". They also say "Confirmed only keeps its evidence rules".
- True statement (D155): the groups are meets, one check away, not enough data (tagged likely on the 80 % range, never
  on the centre), unlikely to meet (folded), hidden as unlikely, and fail. The mode is "Leave out".

**R10. docs/HOW-IT-WORKS.md:491 says "a part none of them states is unknown, never a pass".**
- True statement (D151): a chamber that no own sheet, twin sheet or guide speaks to is read from `chamber_need.csv`. It
  is within for PLA, PETG, ABS and the flexible elastomers (94 products), labelled with the makers' counts.

**R11. Two docs say no property ever stands in for another.** `docs/HOW-IT-WORKS.md:529` says "No cross-property
substitution… a flexural strength never stands in for a tensile one". `docs/DATA-MODEL.md:560` says "deliberately no
cross-property fallback".
- That is still true for values shown in a column, but a flexural modulus now decides a tensile-modulus requirement
  inside a band (CV08). Add that qualifier.

**R12. docs/DECISIONS.md:4993 (D149) and :5040 (D150) still say "Number provisional until the stage merges".** Both
stages are merged. Drop the clause.

**R13. The CV08 Basis in data/tables/conversions.csv:9 says "between 0.46 and 1.91 times".** The row's Factor high,
its own example (colorFabb PETG Economy, 1.93) and the method row (method.csv:58) all say 1.93.

**R14. docs/GOALS.md:73 (C9) gives the printer evidence as "own evidence, permitted twin, then labelled Bambu guide
(D101)".** It omits the fourth step, the kind of plastic (D151).

**R15. docs/HOW-IT-WORKS.md:361 explains only the `≈` mark.** It should also say what "on the line" and "a thin margin"
mean (D152). README.md:234 and INTERFACE.md:375 already say it.

### Cosmetic

**R16. Ledger reasons print raw arithmetic.** Examples: "between 1.14678 and 4.81149 GPa", "at most 0.012544 GPa" and
"at most 2.1376 GPa" (PC FR, Outdoor). `app/js/engine/ledger.js:47` formats with `toFixed(6)`. Round to the source
value's digits plus one, as `sig()` does for the group reasons.

## Twelve answers an engineer would challenge

| # | Case | Answer now | Verdict | Deciding record |
|---|---|---|---|---|
| 1 | PLA, HDT at least 70 °C (single requirement) | PASS on 3 products | **Wrong** (R01) | V008746, undescribed bar, 1.8 MPa |
| 2 | PLA, Warm environment 80 °C | Not enough data, 0/195 | Right | Open only on G001-56 (90 °C) and G001-101 (110 °C), both ceiling-only |
| 3 | PLA, Outdoor 100 °C | Not enough data, shown by PLA-HP | Right | V005853, 135 °C after annealing, "published only in another state" |
| 4 | PLA (and PC, PLA Silk), High-stiffness 5 GPa | One check away | **Misleading** (R02) | V002691 flexural 2.493 GPa × 1.93 |
| 5 | TPU 95A class, High-stiffness | FAIL | Right | CL01 on 0.5 GPa; own 0.03 to 0.05 GPa |
| 6 | TPC, Flexible component | Meets, 2/12 | Right | G046-02 0.067 GPa, G046-03 0.029 GPa, stretch at least 100 % |
| 7 | PEBA, Flexible component | One check away | Right | Siraya Rebound PEBA 85A, its chamber words unread |
| 8 | PC FR, Outdoor | FAIL | Right | V000706 annealed 1.67 GPa × 1.28 = 2.14 GPa, under 3 |
| 9 | PET-CF, High-stiffness 5 GPa | Meets, 3/8 | Right | CV02: V007692 6.178 GPa, V011546 5.731 GPa, V013877 5.0 GPa (thin margin) |
| 10 | LCP and PPS-ESD, Warm environment | One check away | Right; words loose for LCP (R07) | Bed 120 °C of 120–150 / 120–160 °C (edge) |
| 11 | PA6-CF, Outdoor | Meets, 5/14 | **Misleading** (R05) | Dry values; G050-06 on V008616 × 0.46 |
| 12 | PA6-CE, PPE-PS and PAHT, Warm environment | Pass on a 1.8 MPa floor only | Right (not demoted kinds) | V002738 90 °C, V004089 112 °C, V011437 80 °C (thin margin) |
| 13 | Raise3D PET GF G068-04, Warm environment | HDT PASS | **Wrong** at product level (R01) | V013951 99 °C at 1.8 MPa, undescribed |

## What is sound

- **A comparable value always wins.** The ledger is read only when the product has no known value
  (`constraints.js:140-156`). A doubtful value still decides and says so.
- **A reported row never decides.** `usable()` requires the status "deciding" (`ledger.js:17`). Demotions and doubts
  come only from deciding rows (`evidence-ledger.js:337, 367, 373`).
- **A ceiling-only value never passes a minimum** (`constraints.js:137-138, 210-216`). Checked on PLA in Warm
  environment and Outdoor.
- **The chamber read from the kind of plastic** fills only a truly silent product (`chamber-need.js:116-121`).
  - It skips a twin's or the guide's statement (they set `from.chamber` first), "recommended", "-", any enclosure word,
    unparsed text and variants.
  - The estimate stage's product context excludes a chamber filled this way (`constraints.js:968-969`).
  - Recount from db.json: ABS has 21 own-sheet makers, 2 of them above 65 °C (20 ≤ 21). That qualifies with no room to
    spare, and CHAMBER-NEED-DRIFT would stop the build at the next maker that asks above.
- **Window reading** follows D151 (`process.js:253-305`).
  - The overlap is read before the recommendation.
  - A window open at the bottom keeps its upper-end reading.
  - An "at least" chamber window is read by its overlap; an "at least" nozzle or bed window is within.
  - GATE_STATUS and GATE_PRECEDENCE agree.
- **No product estimate can screen.** 2,043 product estimates, 0 with `canScreen`. Only the three materials with no
  product hide on their own estimate. That matches D148 and OPEN-PROBLEMS §35.
- **CL01 is safe.** It widens to the kind's maximum (0.40, so 0.5 stands), and the test scatter is added before it fails
  anything. In the presets it only fails rubbers against stiffness requirements.
- **Arithmetic is the same on every platform.** `tidy()` rounds to 12 digits in the scatter, contributions, intervals
  and pair checks, with no exp or log. The shortfall division only orders rows.
- **Groups never move a verdict or eligibility.** `eligible` comes from the verdict and the hide only (`:777`, `:1017`).
- **D156 matches the census.** Flexible component meets 5 (TPC, PBAT, TPU 85A, 90A and 95A). PEBA and TPS are one check
  away, 14 not enough data, 85 unlikely and 3 hidden.
- **Nominal values decide nothing** (`products.js:84`).
- **The living docs are mostly current.** README rules 3, 15 and 19, INTERFACE, ARCHITECTURE, DATA-MODEL's ledger
  section, method.csv's chamber and HDT rows, AGENTS' recipes and the Status lines of D5, D26, D32, D33, D43, D48, D54,
  D55, D84, D99, D100, D101 and D137 all state the new rules.
- **OPEN-PROBLEMS §35 matches what is built.** It lacks R01 and R02, which should be added under their subjects if not
  fixed in stage 4.
