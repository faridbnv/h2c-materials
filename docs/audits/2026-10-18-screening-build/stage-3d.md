# Stage 3d: what the round's review and second trial corrected

> **Historical record** (2026-10-18): stage 3d of the screening build, on branch `screening-build/stage-3d` from main ef96fe00 (release f399a642f5d3), with main 89a1862d (after stage 4) merged in before its comparison. It describes the tool as it was then. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** An independent review of stages 0 to 3c ([REVIEW.md](REVIEW.md)) and a second first-time user
> ([FIRST-TIME-USER-2.md](FIRST-TIME-USER-2.md)) found four rules that gave answers the evidence does not support, and
> page words that pointed a reader the wrong way. This stage corrects the four rules and the words. No pass was created.
> Three material passes went away, each resting on a crystallised PLA or PET bar read as a floor. Soft TPS, TPV and a
> maker-undisclosed TPE now fail the stiffness presets on the rubber limit. PLA now reads "Unlikely to meet" for an
> 80 °C part, and leaves "One check away" for a 5 GPa fixture. The rule changes are decision D166 in
> [DECISIONS](../../DECISIONS.md).

## What was wrong, and what changed?

Each finding has its code from the review (R01 to R16) or the trial, and the fix it got. The four rule corrections come
first.

### A crystallised bar was read as a floor (R01)

- **What was wrong.** Since stage 3b, a PLA or PET heat value from a moulded bar, or one its sheet does not describe, is
  only a ceiling: such a bar may have crystallised, and a print has not. But the same bar's value at 1.8 MPa still served
  as a floor for the value at 0.45 MPa. So PLA passed "HDT at least 70 °C" on MatterHackers Tough PLA's undescribed
  75 °C at 1.8 MPa, and Raise3D Industrial PET GF passed the warm-environment preset on 99 °C at 1.8 MPa.
- **What changed.** A value the evidence ledger itself demotes now gives only its upper end, whichever row reads it. The
  1.8 MPa floor takes nothing from such a bar.
- **What moved.** PLA no longer passes 65 to 75 °C on that bar and its two twins. PET and PLA blend-CF lose their pass
  at 60 °C. PLA Silk keeps one there, on a Bambu Lab value stage 4 reads as printed. Raise3D's PET GF no longer passes
  80 °C. Three accepted findings no longer occur and were
  removed: Prusament rPLA's broken pair and two "sheets disagree" states, each a 1 to 2 °C inversion between an
  undescribed bar's two loads.

### The top of a wide band was called "on the line" (R02, and the trial's PLA at 5 GPa)

- **What was wrong.** Spectrum PLA Tough publishes only a flexural modulus, 2.49 GPa. The ledger puts its tensile
  modulus between 1.15 and 4.81 GPa, the envelope of every product that prints both. The page then added the test's 10 %
  scatter to the top end and said PLA was "one check away" from 5 GPa. An engineer would not call PLA one test bar from
  5 GPa.
- **What changed.** "On the line" now applies only to a point: a value or a mean the maker publishes, or a ledger value
  that counts as the asked one (a PET modulus at lab humidity, which counts as dry). A band, a floor or a ceiling from
  another record is compared with the limit as it is: its ends already cover the measured pairs. So is a value that is
  only a ceiling for the printed part. A physics limit of a kind of plastic keeps the scatter, as decision D154 says.
- **What moved.** PLA, PLA Silk and PC leave "One check away" for the High-stiffness fixture. PC-CF stays there, on
  3DXTECH's unstated chamber. POM and PPE-PS now fail 5 GPa when as-published values are admitted. A ceiling just short
  of a minimum now fails: PLA-CE at 60 °C, PLA blend-CF at 120 °C.

### A ceiling held plain PLA in "Not enough data" (the trial)

- **What was wrong.** For the 80 °C warm-environment part, PLA Silk and PLA-CF read "Unlikely to meet", but plain PLA
  read "Not enough data". Two PLA products print 90 and 110 °C on undescribed bars. Those values are only ceilings, yet
  they kept PLA out of "Unlikely to meet".
- **What changed.** Only these hold a material open against a product measured to miss: a pass, a value measured the
  way asked that is on the line or a range across the limit, a ledger value on the line, or records that disagree. A
  value only a ceiling can only fail a minimum, so it holds nothing open.
- **What moved.** PLA, PET and the PLA blends go to "Unlikely to meet" in Warm environment. ABS, PC, PLA and the PLA
  blends do so in the outdoor bracket, where a band end no longer holds them.

### Soft materials sat in structural lists (the trial)

- **What was wrong.** TPS, TPV and a maker-undisclosed TPE read "Not enough data" for a stiff jig or a drone arm. The
  rubber limit (an unfilled rubber is never stiffer than 0.5 GPa) reached only the kinds whose polymer row says
  "elastomer", and these three have no polymer row.
- **What changed.** The limit now names its kinds by base polymer: TPU, TPE, PEBA, TPC, OBC, TPS and TPV, unfilled. Their
  products publish 0.011 to 0.15 GPa, so nothing they publish contradicts it. FormFutura Crystal Flex is a Shore 63D
  styrenic at 1.8 GPa in bending, not a rubber, and stays out. The plasticised PVC ("Polyvinylchlorid weich 94A") is
  filed under PVC, which no record calls an elastomer, so it is left for the owner (OPEN-PROBLEMS §38.9).
- **What moved.** TPS and TPV fail the outdoor bracket, the stiffness fixture and the lightweight structure; the TPE fails
  the lightweight structure. The outdoor bracket now hides 7 materials, not 9.

### The page's words (R03 to R07, R16, and the trial)

| Finding | What the page said | What it says now |
|---|---|---|
| R03 | A starred related value is "used by no filter" | It decides only through a conversion row of the evidence ledger, which the answer names |
| R04 | An undescribed bar's HDT counts as a printed bar's | The same, "except for PLA and PET, where it can only show a fail" |
| R05 | A nylon passed the outdoor bracket on dry stiffness, unmarked | Its row reads "judged dry; humid air lowers its stiffness and heat deflection" |
| R06 | PEBA: "the other 9 have no value measured that way" | "1 of 10; 8 more fail on a limit of their kind of plastic; the other one has no value measured that way" |
| R07 | "One check away" waits on one question | "One question to the maker or one test print settles it: its print settings, or a value on the line" |
| R16 | "between 1.14678 and 4.81149 GPa" | "between 1.15 and 4.81 GPa" |
| Trial | SCREENED, "Hidden as unlikely", "screened out", "1 screened" | "hidden" everywhere: the HIDDEN chip, the Hidden group, "1 hidden" |
| Trial | A hidden row gave no reason | "does not apply: HDT is a rigid-bar test", "resin data: PLA not resistant to acetone" |
| Trial | A FAIL row never said what failed | "fails: bed temperature, needs up to 180 °C (the H2C reaches 120 °C)" |
| Trial | UNKNOWN "could not be checked for missing data" | "UNKNOWN 104: 2 one check away, 14 not enough data, 85 unlikely to meet, 3 hidden" |
| Trial | "(V002691)", "(D155)", "counted and exported" | The record in words, no decision code, "folded, still counted and in the download" |
| Trial | "0 UNKNOWN materials are hidden as unlikely: ." | No sentence when nothing is hidden |
| Trial | "Ordered by how close the estimate is" with estimates off | Says nothing of estimates when they are off |

The related value the review named, Spectrum PA6 CS20 FR V0's 90 °C (the PA6-CE material), is a fair source for the
1.8 MPa floor. It is an ISO 75 "HDT A" value, which is the 1.8 MPa load. Its sheet does not describe the bar, and for a
nylon that is accepted as a printed bar's, because a nylon crystallises as it prints. The demotion leaves nylons alone.

The record IDs left the sentences but not the tool. The trace, both exports (as "[records V…]" after a ledger reason)
and the drawer's source link still carry them.

### The stale documents (R09 to R15)

- HOW-IT-WORKS: the section on D137's candidate groups and "Confirmed only" is now the six groups of D155. A chamber no
  source states is read from its kind of plastic where the makers agree. The no-substitution rule now says a requirement
  may read another property through a conversion row. "On the line" and "a thin margin" are explained.
- DATA-MODEL: the same qualifier on cross-property fallback; the related value's row; the ledger's on-the-line rule.
- DECISIONS: D149 and D150 no longer say their numbers are provisional; D152 to D155 say "Amended by D166".
- conversions.csv: CV08's Basis said 1.91 where its factor is 1.93 (text only).
- GOALS C9: the chamber read from the kind of plastic joins the order of printer evidence.
- The sweep of the living documents for the review's stale phrases changed README (rule 3, the kinds of number, the
  estimate's hide, the groups), HOW-IT-WORKS (the related value, the estimate's hide, the hidden chip and the diagram),
  DATA-MODEL (the related value, an estimate's and resin data's hide, the ledger), INTERFACE (the line under the
  heading, the count, the HIDDEN chip, the groups, the vocabulary table, resin data's hide) and OPEN-PROBLEMS (§35, §38.6,
  §38.9). The other hits were history: decision bodies and audit records that describe the tool as it was, which stay.

## What moved in the presets?

Each cell counts materials with "Include" and "Use estimates and resin data" on, before (main 89a1862d, after stage 4)
and after this stage, each side on its own code.

| Preset | One check away | Not enough data | Unlikely to meet | Meets / hidden / fail |
|---|---|---|---|---|
| Outdoor structural part | 7 → 7 | 26 → 23 | 49 → 52 | 11 / 9 / 50 → 11 / 7 / 52 |
| Indoor prototype | 29 → 29 | 3 → 3 | 0 → 0 | 96 / 0 / 24, unchanged |
| Lightweight structure | 17 → 17 | 30 → 28 | 29 → 28 | 19 / 0 / 57 → 19 / 0 / 60 |
| Warm environment | 26 → 26 | 24 → 21 | 18 → 21 | 42 / 16 / 26, unchanged |
| High-stiffness fixture | 10 → 7 | 22 → 20 | 62 → 65 | 10 / 0 / 48 → 10 / 0 / 50 |
| Flexible component | 2 → 2 | 13 → 13 | 86 → 86 | 5 / 3 / 43, unchanged |

Across the comparison's 138 cases (six presets in three modes, and 120 single-requirement sweeps), 59 material verdicts
moved and 40 listings changed. Measured against main before stage 4 (ef96fe00), on this branch before the merge, the
same rules moved 61 verdicts; the two left are PLA Silk's pass at 60 °C, which stage 4 now carries on a printed value. No material and no product gained a pass. The full list is in
[stage-3d-diff.md](stage-3d-diff.md).

- **Passes lost** (PASS to UNKNOWN): PET and PLA blend-CF at "HDT at least 60 °C", each on a demoted bar's 1.8 MPa
  floor.
- **New failures** (UNKNOWN to FAIL): TPS, TPV and the TPE on the rubber limit; POM and PPE-PS at 5 GPa as published,
  on a band's top end; PLA-CE at 60 °C and PLA blend-CF at 120 °C, on a ceiling just short of the limit.
- **Groups only**: PLA, PET, ABS, PC, PETG, PLA Silk and the PLA blends move from "Not enough data" or "One check away"
  to "Unlikely to meet" in the cases above.

## What is left open?

- **PAHT-CF's density estimate** sits below its polymer (1,020 to 1,170 kg/m³ for a 15 % carbon-fibre nylon). Stage 4
  checks measured densities against their fibre content but bounds no estimate, so it is still the estimate stage's to
  fix (the review's R08).
- **The estimate stage still floors a PLA heat estimate on a demoted bar.** MatterHackers Tough PLA is estimated 75 to
  77.6 °C, floored at its undescribed bar's 75 °C at 1.8 MPa. No answer rests on it, since an estimate never passes, but
  the fix belongs to the frozen estimate stage.
- **PAHT-CF is held open by one product's missing density.** That is by design: a material passes only on a product that
  meets every requirement itself.
- **The plasticised PVC** is not recorded as a rubber; the owner decides whether it becomes a material of its own.

All four are in [OPEN-PROBLEMS §38.9](../../OPEN-PROBLEMS.md).

## How was it checked?

- Hand-built tests for each rule: a demoted bar floors nothing and is no pair, a band end and a ceiling are compared as
  they are while an equality and a class limit keep the scatter, a ceiling and a bound hold nothing open and are counted
  apart. Three more over the compiled database: no undescribed PLA bar passes 70 °C, PLA is unlikely to meet at 80 °C,
  and no band holds PLA, PLA Silk or PC one check from 5 GPa. UI tests for the group words, the hidden and failing rows'
  phrases and the nylon tag.
- `ui:fuzz` now reads the line under the heading by group, each hidden row's reason, each failing row's phrase and the
  HIDDEN chip. `ui:probe` checks the fold's words, the rows' phrases and that no old name or decision code shows.
- On the branch with main 89a1862d (stage 4) merged in: tests 762 of 762; `ui:fuzz` on 300 scenarios, seed 23, 922,146
  checks and no violation (925,842 and none before the merge, after a fix to its own reading of the line under the
  heading); `ui:check` with no layout failure; `pages:check` 16 of 16; `verify:fast` every step passing in 96.3 s on a
  heavily loaded machine, over the 90 s budget (68.3 s before the merge, the tests' share growing with stage 4's).
- No estimate moved: the 2,751 material and product estimates and the estimate model are identical to main's after
  stage 4, and before the merge `build:diff` against ef96fe00 listed only the ledger's bounds, its counts and the two
  rows' words.

## Evidence and where to check

- The demotion: `build/src/evidence-ledger.js` (`demotion`, `contribution`, `rowContributions`, `measurePairs`).
- On the line and what holds a material open: `app/js/engine/constraints.js` (`evaluateNumeric`'s margin,
  `ledgerResult`, `holdsOpen`, `measuredMiss`, `materialGroup`, `openOne`).
- The ledger's words and numbers: `app/js/engine/ledger.js` (`fig`, `contributionWords`, `knownNote`).
- The rubber limit: `data/tables/class_limits.csv` CL01.
- The page: `app/js/ui/labels.js` (`hiddenWhy`, `failWhy`, `unknownGroups`, `SCREEN_PREFIX`), `app/js/ui/table.js`
  (`unknownMark`, `failMark`, `humidMark`, the group notes, `recordIds`), `app/js/main.js` (the chips and the count),
  `app/js/ui/start.js` (the line under the heading), `app/js/ui/templates.js` (the notes), `app/js/ui/format.js`
  (`relatedNote`).
- The records named: MatterHackers Tough PLA V008746 (G001-115) and its twins G001-16 and G001-55; Raise3D Industrial
  PET GF V013951 (G068-04); Spectrum PLA Tough V002691 (G001-04); Spectrum PA6 CS20 FR V0 V002738 (G104-01); the
  removed acceptances `CV01 V013711 V013712`, `G001-77 as-printed hdt045`, `G158-01 as-printed hdt045`.
- The comparison: `node decision-census.mjs --root . --db dist/db.json --out s3d.json`, then `--diff` against the census
  of main 89a1862d (stage 4's last census, release b11fb2f8f0a1), written to [stage-3d-diff.md](stage-3d-diff.md).
