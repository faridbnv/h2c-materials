# Screening review: what happens to materials that could not be checked, 2026-10-18

> **Historical record** (2026-10-18): a review of release 9ca94d31fc5d. It describes the tool as it was then; for where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** You asked how the selector handles materials it could not check: the "Include" choice, the switch
> "Let estimates rule out materials", and the groups a material lands in. Three engineer reviewers, a first-time user,
> a census of the six presets and two outside experts looked at it. The core rule is sound: a material passes when one
> of its products passes, and fails only when every product fails. The sorting of the unchecked materials is not: it
> puts PLA forward for a 100 °C outdoor bracket and PETG for a gasket, and buries good leads. Both experts would let
> physics and one-sided evidence settle more cases, and sort the rest by the one check that would settle each. Ten
> decisions are yours, listed first below, each with a recommendation and what it would change.

## What you need to decide

These ten decisions need your yes or no, the most consequential first. Each names the changes it unlocks (C numbers,
detailed in [RECOMMENDATIONS.md](RECOMMENDATIONS.md)). Counts are rough, re-derived from the census of release
9ca94d31fc5d. "A listing" below means one material in one preset's results.

**At a glance.** Answer each with yes or no (or pick an option). The sections below give the options, the reasoning and
what happens if you say no.

| # | The question | Recommended answer | What you would see if yes |
|---|---|---|---|
| 1 | Sort the "could not be checked" materials by what would settle each? | Yes: "One check away", "Not enough data", and a collapsed "Unlikely to meet" | No pass or fail changes. Good leads such as PEBA move up. PETG for the 100 °C bracket moves down. |
| 2 | When a maker states no chamber temperature, or the H2C covers only part of a window, decide by the kind of plastic? | Yes, and partial windows pass with a flag | About 48 more passes. Indoor prototype grows from 87 to about 106 materials. |
| 3 | May a plastic's physics settle a requirement nobody measured? | Yes for plain physics now, database-derived limits after a back-test | TPU fails a 5 GPa stiffness requirement instead of sitting in a list. |
| 4 | May a value measured another way decide, in its one safe direction? | Yes, each relation written down as data | BASF's PET-CF passes 5 GPa. An HDT at 1.8 MPa can prove the 0.45 MPa requirement. |
| 5 | Is a value just under the limit a fail, or "on the line"? | On the line | PLA-CF (4.95 GPa against 5) becomes "one check away" instead of a fail. |
| 6 | How much should an estimate need before it puts a material forward? | The range shown on the page must meet the limit, and it only orders the list | PC and PETG stop being offered for a gasket. Of 43 estimated candidates, 19 keep a "likely" tag. |
| 7 | Rename "Let estimates rule out materials"? | Yes, to "Use estimates and resin data" | Words only: the page stops promising exclusions it never makes. |
| 8 | Should the Flexible component preset ask for softness? | Yes, tensile modulus at most 0.1 GPa | Rigid plastics that stretch (PETG, PC, nylon) leave the gasket list. |
| 9 | Remove the three materials nobody sells from the results? | Yes | PA66-CF, PA612 and PA612-GF stop appearing on a family guess. |
| 10 | Warn that nylons are judged dry in the outdoor preset? | Yes, a warning now | PA6-CF still passes, with a humidity warning. |

**Before any of these:** five data corrections need no decision (C11 to C15, in [RECOMMENDATIONS.md](RECOMMENDATIONS.md)).
Do them first. They change three answers outright, and decision 3 depends on one of them.

### 1. Should the "could not be checked" list be sorted by what would settle each material?

**Options.** Keep today's three groups (supported, estimated candidates, a collapsed "Insufficient evidence"), or sort
the unchecked materials into four groups by the action that settles them.

**Recommendation: yes, four groups.** After "Meets every requirement" the page would show:
"One check away" (a single question to the maker or one test print settles it), "Not enough data" (ordered by
estimates, with a "likely" tag), and a collapsed "Unlikely to meet" with its count.

**If yes.** Across the six presets, about 128 listings move to "One check away", 87 to "Not enough data" and 249 to
"Unlikely to meet". PEBA, whose six measured products stretch up to 1,110 % and wait only on a chamber line, moves up
to "One check away". PETG for the 100 °C bracket, whose 45 measured products all stay below 100 °C, moves down to
"Unlikely". No material passes or fails differently, and every listing is still counted and exported.

**Take it with decision 5.** Without the "on the line" rule, PLA-CF and PA6-CF sink to "Unlikely", although one
product of each sits just under 5 GPa (4.95 and 4.68 GPa). PET-CF sinks too unless decision 4 counts its lab-humidity
value. **If no,** the collapsed list keeps mixing four situations, half of them materials whose evidence already misses.

*Unlocks C18, C19, C05, C06, C25. Verdicts V02, V20, V21, V27.*

### 2. What should the printer check do when a sheet is silent on the chamber, or the H2C reaches only part of a window?

**Options.** Keep it unknown (today). Or decide by what other makers of the same kind of plastic ask for, and pass a
window the H2C covers in part.

**Recommendation: yes, decide by the plastic's kind.** A silent chamber passes where at most 1 in 10 makers of that
polymer family who state a chamber ask above 65 °C. That covers PLA, PETG, TPU and other elastomers, and nylons.
Polycarbonate stays unknown: about a third of its makers who state a chamber ask above 65 °C. A window the H2C
covers by at least 5 °C passes, flagged "at the low end of the maker's window". A window whose bottom is exactly the
H2C's limit is "on the line". Your ruling of 5 October stays: a chamber "recommended" with no temperature remains unknown.

**If yes.** About 48 more listings pass across the six presets. The Indoor prototype goes from 87 materials to about
106. PEBA, TPC and the hardest TPUs pass the gasket preset. PPS-CF (HDT 251 °C) passes Warm environment. LCP and
PPS-ESD, hidden as failures today, become "on the line": the H2C's 120 °C bed is the bottom of their window.

**If no,** these stay unresolved, and decision 1 still shows them as "One check away".

*Unlocks C34, C21, C17. Verdicts V10 (reversed by the experts), V11. Amends the rules on partial windows (D32) and
silent chambers (D33).*

### 3. May the physics of a kind of plastic settle a requirement nobody measured?

**Options.** No (today, the only such rule is that HDT does not apply to an elastomer). Yes for rules that are
physics with a recorded source. Or yes, also for limits read off this database, after a back-test.

**Recommendation: yes for physics now, database limits after a back-test.** Start with two rules. A rubber
(unfilled TPU, TPE, PEBA, OBC) is never stiffer than about 0.5 GPa. An unfilled plastic's density lies in its neat
polymer's range, so a PLA with no density published still meets "at most 1,500 kg/m³". Later, after a back-test: a
glassy plastic does not stretch 100 % when printed, and an unfilled rigid plastic stays under about 4.3 GPa printed.

**If yes.** The TPU classes and OBC fail any stiffness requirement above 0.5 GPa instead of sitting in a list. That
moves 5 materials in Lightweight structure and 5 in High-stiffness fixture. With the database limits too, about 18 more
unfilled materials fail at 5 GPa and about 40 glassy materials fail the gasket preset.

**Caution.** The density rule would make PLA pass the outdoor bracket on colorFabb PLA-HP's 135 °C, which is a moulded
figure. That record must be corrected first (C11).

**If no,** these materials stay listed, under "Unlikely to meet" if decision 1 is yes.

*Unlocks C32, C36, C37, C40. Verdicts V26, V30. Amends the rule that a requirement nobody measured stays unknown (D26).*

### 4. May a value measured another way decide, in the one direction that is safe?

**Options.** No (today, such a value is set aside or taken at face value). Or yes, relation by relation, each a data
row with the band the database measures.

**Recommendation: yes.** Both experts measured these on products that publish both values:

- An HDT at 1.8 MPa is a floor for the HDT at 0.45 MPa on the same bar. LUVOCOM PAHT's printed 80 °C at 1.8 MPa then
  meets "HDT at 0.45 MPa at least 80 °C".
- An annealed HDT is a ceiling for the as-printed part. Bambu Lab PLA Silk+'s 60 °C after annealing then fails 100 °C.
- A value tested at normal lab humidity counts as dry for a plastic that takes up little water. BASF PET CF15's
  6.18 GPa then meets 5 GPa.
- A flexural modulus bounds the tensile one between 0.70 and 1.59 times. An upright bar's stiffness is a floor for the
  flat one.
- For PLA and PET, an HDT from a moulded or unstated bar is a ceiling, never a pass.

**If yes.** Warm environment gains up to 3 materials (PA6-CE, PAHT, and ASA-AF once its record is settled). PET-CF meets
the 5 GPa fixture. Up to six listings fail on annealed values, PC FR among them. About 40 products fail 5 GPa on their
flexural value. Warm environment loses about 8 passes that rested on an unstated PLA or PET bar, and three materials
lose their pass (PLA-NF, PLA-PHB, PLA blend).

**If no,** these stay "One check away" or "Not enough data".

*Unlocks C31, C22, C23, C24, C35. Verdicts V12, V13, V17, V19, V25. Amends "a bound never passes" (D48), the rule on
values in another state (D99) and the admission of unstated bars (D84).*

### 5. Is a value just under the limit a fail?

**Options.** Yes (today). Or "on the line": a value measured the right way that falls short by less than test
scatter is unresolved, not a fail. A value that meets the limit still passes, tagged "thin margin".

**Recommendation: on the line**, with test scatter of 10 % for stiffness and strength, 5 °C for HDT, 20 % for
elongation and 2 % for density.

**If yes.** About 177 product answers move from fail to "on the line", 89 of them in Lightweight structure. About 10
listings move from a hidden failure back onto the list. PLA-CF at 5 GPa becomes "One check away": 3DXTECH CarbonX
CF-PLA publishes 4.95 GPa on a printed bar, so one test bar or one email settles it.

**If no.** CarbonX's 4.95 GPa stays a fail, and with decision 1 PLA-CF goes to "Unlikely to meet".

*Unlocks C33. Verdict V24. Amends the rule that a mean decides at face value (D54).*

### 6. How much evidence should an estimate need to put a material forward?

**Options.** The estimate's middle value meets the limit (today). Or the range the page shows (80 %) meets the limit
and no measured product contradicts it. Later, the statistician's "a chance of at least 50 %", built from other
makers' printed values.

**Recommendation: the range shown on the page, used only to order and tag "likely" inside "Not enough data".** Also
decide whether to reopen the frozen estimate model for four fixes, each with a back-test (C26 to C29).

**If yes.** PC and PETG stop being offered for a gasket on a resin sheet's stretch. ABS stops being offered for the
lightweight part on a flexural value read as tensile. Of today's 43 estimated candidates, 19 would keep the tag.

**If no.** Half of the estimated candidates stay coin flips: 53 of the 105 estimates behind them sit within half
their own uncertainty of the limit.

*Unlocks C19, C26, C27, C28, C29. Verdicts V04, V05, V14, V15, V16, V28, V35.*

### 7. Should the switch be renamed, and "does not apply" stop being reported as an estimate?

**Options.** Rename "Let estimates rule out materials" to "Use estimates and resin data", keep it, or remove it. This
decision also covers the smaller wording changes (C03 to C09).

**Recommendation: rename it, and keep one switch.** "Does not apply" should hide a material whether or not estimates
are on. A preset should keep the reader's Include choice.

**If yes.** The page stops promising exclusions that never happen. TPC's chip reads "Does not apply: HDT is a
rigid-bar test" once, not "Screened by an estimate" ten times. With estimates off, the 30 elastomer hides in the two
heat presets still apply.

**If no,** first-time users keep reading the switch as broken (it "left TPU in on a 5 GPa requirement").

*Unlocks C02, C03, C04, C06, C07, C08, C09, C20. Verdicts V03, V18, V23.*

### 8. Should the Flexible component preset ask for softness?

**Options.** Keep "elongation at break at least 100 %" alone. Or add a stiffness ceiling: 0.1 GPa (the materials
scientist) or 0.3 GPa (this review's first pass). Later, Shore hardness of at most 95A.

**Recommendation: add "tensile modulus at most 0.1 GPa".** A gasket, strap or phone case needs a soft material. A
Shore 95A TPU is about 0.04 GPa.

**If yes.** PA6/66 (1.98 GPa) and PP leave the gasket list. PETG, PC, PCTG and CPE fail on their own measured
stiffness. The elastomers stay. **If no,** rigid plastics that stretch keep appearing as gasket candidates.

*Unlocks C30, C38. Verdict V07.*

### 9. Should the three materials with no product to buy leave the lists?

**Recommendation: yes.** PA66-CF, PA612 and PA612-GF would become family entries. They stay in the database. They
leave 18 listings (3 hidden, 15 under "Insufficient evidence"). If no, they keep appearing on a family guess, and they
are the only materials an estimate hides today.

*Unlocks C16. Verdict V05.*

### 10. Should the outdoor preset warn that nylons are judged dry?

**Recommendation: a warning now, a humid-air judgement later.** Outdoors a nylon takes up water. In products that
publish both, humid air cut stiffness to between 0.27 and 1.0 of the dry value. If yes, PA6-CF stays a pass with
that warning. Judging nylons in humid air instead would turn most nylon products unresolved, because few publish a
humid value.

*Unlocks C39. Verdict V31.*

**Not decisions, just work.** Recording the open problems (C01), the preset notes (C10) and five data corrections
(C11 to C15) need no ruling. Do them first: the corrections change three answers outright, and decision 3 depends on
one of them.

## How the review was done

Five kinds of evidence went into this review, all on release 9ca94d31fc5d, with nothing rebuilt or changed.

1. A census ran the six presets as the page runs them, with Include on, and recorded every product's answer.
2. A reconstruction of the logic traced a material from the switch to its row, in the code.
3. Three engineer reviewers judged the doubtful materials of two presets each, plus two drawn at random.
4. A first-time engineer used only the page, without reading the repository.
5. Two outside experts, a statistician and a materials scientist, saw only the raw data, not the rules or this
   review. Each proposed how pass, fail and "can't tell" should work and answered ten test cases.

Claude Opus 5.5 (agent) wrote this combination as product manager. The reviewers and experts were Claude agents too.

| File | What it holds |
|---|---|
| [RECOMMENDATIONS.md](RECOMMENDATIONS.md) | Every change (C01 to C40), verdict (V01 to V37) and finding (F01 to F29), as cards |
| [LOGIC.md](LOGIC.md) | How the page sorts a material today, with twelve problems found in the code |
| [CENSUS.md](CENSUS.md) | Where every material lands in each preset, and why |
| [census.mjs](census.mjs) | The script that writes the census and the scenario files |
| [scenarios/](scenarios/) | The six presets as saved scenarios, for tracing one product's decision |
| [presets/hdt-presets.md](presets/hdt-presets.md) | The two heat presets: Outdoor structural part and Warm environment |
| [presets/modulus-presets.md](presets/modulus-presets.md) | The two stiffness presets: Lightweight structure and High-stiffness fixture |
| [presets/flexible-and-indoor.md](presets/flexible-and-indoor.md) | Flexible component and Indoor prototype |
| [FIRST-TIME-USER.md](FIRST-TIME-USER.md) | A first-time engineer's trial of the page, label by label |
| [first-time-user/](first-time-user/) | Six screenshots from that trial |
| [experts/STATISTICIAN.md](experts/STATISTICIAN.md) | An engineering statistician's proposal, from the data alone |
| [experts/MATERIALS-SCIENTIST.md](experts/MATERIALS-SCIENTIST.md) | A materials scientist's proposal, from the data alone |

## What does the tool do today?

The tool judges each product on its own data, then sums up the material. A material passes when one product passes,
and fails only when every product fails. Everything in between is "could not be checked". [LOGIC.md](LOGIC.md) gives
the detail.

With Include on, an unchecked material lands in one of three places:

- **Estimated candidate to verify**, when one product's only gaps are estimated numbers whose middle value (a 50/50
  guess) meets the limit. PLA-CF is here for the 5 GPa fixture, on one silent product estimated at 5.05 GPa.
- **Insufficient evidence**, a collapsed list holding every other unchecked material.
- **Hidden as unlikely** (the page says "screened"), when inference rules out every unchecked product.

Today the tool hides a material 33 times across the six presets. Thirty of those are elastomers, whose heat
deflection does not apply, counted once in each heat preset. The other three are materials with no product, hidden on
a family estimate. No estimate of a real product can hide anything: the proof the rules require (194 back-tested cases
per kind of evidence) does not exist yet.

## What is wrong?

Eight themes cover the 29 findings. Each is detailed, with its evidence, in [RECOMMENDATIONS.md](RECOMMENDATIONS.md).

1. **The switch named "rule out" mostly promotes.** It creates the estimated-candidates list and hides only elastomers
   and materials nobody sells. A first-time user saw TPU harder than 95A stay listed at 0.01 to 0.41 GPa against a
   5 GPa requirement. *(F01, F02, F03)*
2. **"Insufficient evidence" holds four situations.** Of its 436 listings, 234 (about half) already have evidence
   that they miss, 76 meet every number and wait on a printer check, 15 have nothing to buy, and 111 are truly open.
   *(F04, F11)*
3. **An estimate's middle value is enough to put a material forward.** Half of those values are coin flips. FormFutura
   Silk Gloss PLA is a candidate at exactly 2.50 GPa against 2.5 GPa. *(F10, F05)*
4. **One unnamed product speaks for the whole material.** PLA is offered for the 100 °C bracket by colorFabb PLA-HP
   alone, while its row shows a 55 °C median and "96 products fail". *(F05, F12)*
5. **Values not measured the way asked are taken at face value, or thrown away.** PLA-HP's 135 °C comes from a
   moulded bar. A resin sheet's 160 % stretch puts PETG forward for a gasket. LUVOCOM PAHT's 80 °C at 1.8 MPa, which
   proves the requirement, is reported as "not published". *(F15, F20, F21, F22, F24, F25)*
6. **The printer check treats silence as a gap.** 314 products have no usable chamber temperature. PEBA's six measured
   products wait on a chamber line that a soft elastomer does not need. *(F13, F14)*
7. **A few data and rule faults decide answers outright.** PBAT, a 6 MPa filament, passes an 80 °C heat test. BASF
   PET CF15's 6.18 GPa is set aside because it was tested at normal lab humidity. *(F16, F17, F18, F26, F27)*
8. **The words and counts confuse.** "Supported" sounds like a support material. "Why the rest were excluded" counts
   22 hides where the page shows 14. *(F06 to F09, F19, F28, F29)*

## What did the experts say, and how does it change the picture?

The two experts, working blind from the data, agree with each other on most points. Where they agree, they mostly
confirm this review. In several places they go further, and in two they reverse it.

| Case | Tool today | Statistician | Materials scientist | Recommended now |
|---|---|---|---|---|
| A. ASA-GF, stiffness at least 5 GPa | Insufficient evidence | Ruled out as unlikely | Fail | Unlikely to meet, and fail once fibre content is recorded |
| B. PLA, outdoor bracket | Estimated candidate | Can't tell: only on another kind of bar | Can't tell: meets it only annealed | One check away: ask colorFabb how PLA-HP's bar was made |
| C. PETG, elongation at least 100 % | Estimated candidate | Can't tell: on the line (91 %) | Fail | Fail once the preset asks for softness, on the line until then |
| D. PEBA, stretch and printable | Estimated candidate | Pass | Pass | Pass (decision 2) |
| E. TPU 95A, stiffness at least 5 GPa | Insufficient evidence | Fail by class | Fail by class | Fail (decision 3) |
| F. PLA-CF, stiffness at least 5 GPa | Estimated candidate | On the line (4.95 GPa) | On the line | One check away (decision 5) |
| G. PA6-CF, outdoor bracket | Pass | Pass | Pass dry, check humid air | Pass, with a humidity warning |
| H. LCP, printable | Fail, hidden | On the line (bed edge) | Pass at the edge | On the line (decision 2) |
| I. PA612, stiffness at least 5 GPa | Hidden on a family estimate | No answer: nothing to buy | Fail, nothing to buy | Not listed (decision 9) |
| J. PET-CF, stiffness at least 5 GPa | Estimated candidate | Pass | Pass | Pass (decision 4) |

**Where both experts agree with the tool.** Judge every requirement within one product, never across two. Never let a
material's median decide. Estimates may rank, never pass. Exclusion needs proof from back-testing.

**Where both experts agree with each other but not with the tool, or not with this review's first pass:**

- **Physics may decide.** A rubber cannot be stiff, so TPU fails 5 GPa outright. This review had left it "unlikely".
  *(new: decision 3)*
- **Evidence decides in its safe direction.** A floor may pass, a ceiling may fail. *(extends: decision 4)*
- **A near miss is "on the line".** This reverses the first pass for PLA-CF, which had put it with the unlikely ones.
  *(new: decision 5)*
- **Silence about the chamber is not a gap for a plastic that never needs one.** This reverses the first pass, which
  had kept silence unknown. *(reversed: decision 2)*
- **Partial printer windows pass, flagged.** The first pass had left them unresolved. *(extended: decision 2)*
- **Sort the unchecked list by the action that settles it.** This reshapes the first pass's groups into "One check
  away". *(refined: decision 1)*
- **Flexible needs softness.** The scientist's 0.1 GPa replaces this review's 0.3 GPa. *(changed: decision 8)*

**Where the experts disagree.** On PETG's stretch, the statistician says "on the line" and the scientist says "fail".
On LCP's bed, "on the line" against "pass at the edge". This review takes the more cautious side each time. The
statistician would also hide a product when an estimate from two or more other makers gives it under a 5 % chance.
This review does not adopt that: the collapsed "Unlikely to meet" group gives the reader the same benefit without
hiding anything (verdict V35).

## Could a change in the pipeline fix many of these at once?

Yes for evidence, no for the grouping. Rulings remain right for policy, such as how much error an exclusion may
risk. But about half the findings share one gap. A value that is not exactly what was asked is either taken at face
value or set aside, with nothing in between. Each past ruling patched one kind of value: unstated bars (D84), annealed
and humid values (D99), floors from break stresses (D126). A structural change can fix the kind once.

| Change | What it removes | Cost | What it touches | Verdict |
|---|---|---|---|---|
| **An evidence ledger in the build**: every value turned into a floor, a ceiling or a band on the property asked, by data rows | Annealed and 1.8 MPa cases, PET-CF, moulded HDTs, resin-sheet values, and contradictions shown as "sheets disagree" (F09, F15, F17, F24, F25, part of F11) | Large | Product values in the build, the engine's comparison, acceptance tests, page-versus-engine checks | **Yes** (C31) |
| A table of physics limits per kind of plastic | TPU at 5 GPa, glassy plastics for a gasket, missing densities (part of F11, F16) | Medium | Read by the ledger | **Yes** (C32) |
| Fibre content and Shore hardness recorded as numbers | Doubtful fibre claims, CarbonFil's density, softness for gaskets (F26, F28) | Medium (sheets re-read) | Schema and a backfill | **Yes** (C37, C38) |
| Chamber need per kind of plastic | Most silent-chamber cases (F13) | Small | One table, read after the product's own sheet and the printer guide | **Yes** (C34) |
| Family entries for materials with no product | F18 | Small, data only | Three rows | **Yes** (C16) |
| One conversion layer shared with the estimate model | Drift between the build's bands and the model's offsets (F20, F22) | Medium | The estimate stage, frozen since 15 October | **Later**, when the model reopens |
| Grouping done in the build, the page only rendering | Nothing | – | – | **No**: the groups depend on the reader's requirements, set in the page |

The ledger belongs in the build's compile stage, not the frozen estimate stage. Kept in its own field, it leaves the
estimate model's inputs unchanged. It does make more evidence decide, so each new kind of value needs the strict
checks the goals reserve for deciding values, and each relation its own decision diff.
[ARCHITECTURE.md](../../ARCHITECTURE.md) describes the stages it would sit between.

## What this review did not do

- It changed no data, code, test or build.
- It ran the six presets only, with no chemical-resistance requirement and no sweep of annealed or humid states.
- The reviewers sampled. Each data correction needs a re-read of its sheet before any change.
- The first-time user and the experts were agents, not people. Your team's own trial still waits.
- The counts for the ten decisions are simulations over the census output, not builds of the changes.
- No back-test was run. The estimate-model changes are directions, not measurements.

## Words used here

- **Listing**: one material in one preset's results.
- **Middle value**: an estimate's 50/50 guess. **Range shown on the page**: the 80 % range.
- **Measured the way the requirement asks**: a printed bar, pulled in the print plane, dry, as printed.
- **On the line**: short of the limit by less than test scatter.
- **Floor, ceiling**: a value that proves the property is at least, or at most, something.
- **Printer check**: the nozzle, bed and chamber temperatures against the H2C's 350, 120 and 65 °C.
- **Back-test**: hide known values, predict them, count the misses. **Frozen estimate stage**: since 15 October the
  estimate model's code changes only with a decision and a back-test.

## Evidence and where to check

- Every finding's evidence and links: [RECOMMENDATIONS.md](RECOMMENDATIONS.md), section "Findings".
- The census behind the counts: `node docs/audits/2026-10-18-screening-review/census.mjs --full <file>`. Its split of
  "Insufficient evidence" reproduces 234, 76, 15 and 111.
- The decision counts were simulated by the product manager over that output and `dist/db.json`. The rules simulated
  are listed in the last section of [RECOMMENDATIONS.md](RECOMMENDATIONS.md).
- Earlier audits: [2026-10-07](../2026-10-07-uncertain-logic/README.md), [2026-10-08](../2026-10-08-product-screening/README.md).
  The open problem: §35 of [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md). Checked against [GOALS](../../GOALS.md) and
  [DECISIONS](../../DECISIONS.md).
