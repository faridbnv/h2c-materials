# Screening review: the changes, verdicts and findings

> **Historical record** (2026-10-18): the verdicts and changes of the screening review of release 9ca94d31fc5d.

> **In short.** This file holds every recommended change (C01 to C40), every judgement the owner may agree or disagree
> with (V01 to V37) and every finding behind them (F01 to F29), each as a short card. The [README](README.md) says
> what the owner must decide and why. This file is where each piece is spelled out for the people who build it.
> Changes are in execution order: wording first, then data corrections, then rule changes, then the estimate model,
> then the presets. IDs from the first version of the review are kept. Cards marked "amended" or "reversed" changed in
> the second pass, after two outside experts reported.

## Index

The decision number points to the owner's list in the [README](README.md#what-you-need-to-decide).

| ID | Change | Stage | Owner's decision |
|---|---|---|---|
| C01 | Record what this review leaves open | 1 Words | – |
| C02 | Rename the switch to "Use estimates and resin data" | 1 Words | 7 |
| C03 | Stop promising exclusions by material estimates | 1 Words | – |
| C04 | Say "Does not apply", not "Screened by an estimate" | 1 Words | – |
| C05 | Name the product that decides each row | 1 Words | – |
| C06 | Plainer group and heading words | 1 Words | – |
| C07 | Make "Why the rest were excluded" count what the page shows | 1 Words | – |
| C08 | Show the switch's real state and keep the reader's mode | 1 Words | 7 |
| C09 | Do not offer annealing when the annealed value misses too | 1 Words | – |
| C10 | Preset notes on unstated bars and on stretch | 1 Words | – |
| C39 | Outdoor preset: warn that nylons are judged dry | 1 Words | 10 |
| C11 | Correct PLA-HP and the PLA heat values above their own Tg | 2 Data | – |
| C12 | Flag PBAT's heat value and add a stiffness check for HDT | 2 Data | – |
| C13 | Re-read resin and film sheets read as printed bars | 2 Data | – |
| C14 | Correct the carbon-fibre PETG densities | 2 Data | – |
| C15 | Check one HDT typed at two loads across two documents | 2 Data | – |
| C16 | Make the three materials with no product family entries | 2 Data | 9 |
| C17 | Map same-type materials to the printer guide | 2 Data | 2 |
| C36 | Class PLA as a plastic that can crystallise but prints glassy | 2 Data | 3 |
| C37 | Record fibre content as a number | 2 Data | 3 |
| C38 | Make Shore hardness a selectable property | 2 Data | 8 |
| C40 | Flag claims a class limit or fibre content contradicts | 2 Data | 3 |
| C33 | A value just under the limit is "on the line" | 3 Rules | 5 |
| C18 | Sort the unchecked materials by what would settle them | 3 Rules | 1 |
| C19 | Tag "likely" only when the range shown meets the limit | 3 Rules | 6 |
| C20 | "Does not apply" hides with estimates on or off | 3 Rules | 7 |
| C21 | A printer window the H2C partly covers passes, flagged | 3 Rules | 2 |
| C34 | Decide a silent chamber by the plastic's kind | 3 Rules | 2 |
| C31 | Build an evidence ledger: floors, ceilings and bands as data | 3 Rules | 4 |
| C22 | Ledger row: HDT at 1.8 MPa is a floor for HDT at 0.45 MPa | 3 Rules | 4 |
| C23 | Ledger row: lab-humidity values count as dry where water does not matter | 3 Rules | 4 |
| C24 | Ledger row: an annealed HDT is a ceiling for the printed part | 3 Rules | 4 |
| C35 | Ledger row: a moulded or unstated PLA or PET heat value is a ceiling | 3 Rules | 4 |
| C32 | Physics limits per kind of plastic | 3 Rules | 3 |
| C25 | Make the guard test run the page's path | 3 Rules | – |
| C26 | Model: stop resin stretch flooring the printed estimate | 4 Model | 6 |
| C27 | Model: correct values with no stated direction | 4 Model | 6 |
| C28 | Model: let a product's own value anchor its estimate | 4 Model | 6 |
| C29 | Model: estimate annealed-only products and heat deflection | 4 Model | 6 |
| C30 | Flexible preset: add a stiffness ceiling of 0.1 GPa | 5 Presets | 8 |

| ID | Verdict | ID | Verdict |
|---|---|---|---|
| V01 | Keep the pass and fail rules | V20 | Fold estimated candidates into "Not enough data" |
| V02 | Measured misses get their own group | V21 | Groups change presentation only |
| V03 | Rename the switch, keep one | V22 | Include should be shareable |
| V04 | Promotion on the middle value is too weak | V23 | A preset keeps the reader's mode |
| V05 | Do not relax the proof needed to hide on an estimate | V24 | A near miss is "on the line" |
| V06 | Keep exclusion stricter than inclusion | V25 | Evidence decides in its safe direction |
| V07 | Flexible needs softness: 0.1 GPa | V26 | Physics of a class may decide |
| V08 | HDT applicability done as data | V27 | Sort by the action that settles it |
| V09 | Keep TPU-CF hidden | V28 | Estimates rank, never pass or fail |
| V10 | A silent chamber is decided by the plastic's kind (reversed) | V29 | Judge within one product, and medians decide nothing |
| V11 | Partial windows pass, flagged, and an edge is on the line | V30 | Class PLA like PET |
| V12 | HDT at 1.8 MPa may pass a 0.45 MPa minimum | V31 | Warn about nylons outdoors |
| V13 | Annealed HDT is a ceiling now, modulus with an allowance | V32 | Collect fibre content first |
| V14 | Resin stretch must not floor a print | V33 | Test labs differ, so record the method |
| V15 | Values with no direction need a correction | V34 | Better preset proxies, later |
| V16 | A product's own value should anchor its estimate | V35 | Do not hide on a 5 % chance yet |
| V17 | Lab humidity is not a damp state for PET | V36 | Build the evidence ledger |
| V18 | "Does not apply" is a definition | V37 | Do not move grouping to the build |
| V19 | Unstated heat values: keep, except PLA and PET | | |

## How to read a card

Each change card says what changes, why (the findings, with links), an example, the effect on answers, what it
depends on and unblocks, its effort (S, M or L) and whether the owner must decide. Counts marked "simulated" come from
the product manager's simulation over the census output (see the last section). Every data change is a migration that
names the value it replaces, after re-reading the source. Every rule change gets a decision entry and a report of the
answers it moved. The estimate model is frozen, so a stage-4 change also needs a back-test.

## Changes

### Stage 1: words and records (no answer moves)

#### C01. Record what this review leaves open

- **What changes.** OPEN-PROBLEMS gains each open finding under its subject. Under §35 it says that no estimate hides a
  material that has products, what the switch does today, and how the "Insufficient evidence" list splits.
- **Why.** The decision records say new exclusions stopped, not that the older ones stopped too (F02).
- **Effect.** None. Each entry leaves when its change lands.
- **Depends on / unblocks.** First. **Effort.** S. **Owner's call.** No.

#### C02. Rename the switch to "Use estimates and resin data"

- **What changes.** The switch's name and help say what it does: it shows estimates where nothing is published, sorts
  the unchecked materials by them, and never passes one. It hides a material only where a property does not apply,
  where the base resin's data shows it attacked by the chemical asked, or where a material with no product has an
  estimate that wholly misses. In this release no product estimate hides anything.
- **Why.** F01. The first-time user read the switch as broken.
- **Example.** Today the help says "an estimate excludes a material only when its whole plausible range misses", and
  TPU harder than 95A stays listed at 0.01 to 0.41 GPa against 5 GPa.
- **Effect.** None. C16, C18, C19 and C20 each update this text when they land.
- **Depends on / unblocks.** Unblocks C20. **Effort.** S. **Owner's call.** Yes: the name (decision 7).

#### C03. Stop promising exclusions by material estimates

- **What changes.** The drawer's estimate card and group note, the table legend, the export's "can screen" column, the
  build's screening snapshot and two code comments stop saying a material estimate can rule a material out. A dated
  note corrects the decision record's "32 of 673" figure.
- **Why.** F02: 117 estimates marked "may exclude" are never read.
- **Effect.** None. **Depends on / unblocks.** After C01. Unblocks C25. **Effort.** S. **Owner's call.** No.

#### C04. Say "Does not apply", not "Screened by an estimate"

- **What changes.** A property that does not apply is named as such, once per material, in the hidden mark, "Why the
  rest were excluded", the sentence above the list and the export. With estimates off, the reason says the same
  instead of "Not published … ask the maker".
- **Why.** F03. **Example.** TPC's chip repeats "HDT at 0.45 MPa at least 100 °C" ten times under "Screened by an
  estimate".
- **Effect.** Texts only. **Depends on / unblocks.** Unblocks C20. **Effort.** S. **Owner's call.** No.

#### C05. Name the product that decides each row

- **What changes.** The row says which product puts the material in its group, with that product's own numbers.
  "Shown for its closest product" becomes "Shown for one product, X", with why it was chosen. The estimate cell and the
  reason come from one computation.
- **Why.** F05, V29. **Example.** "Estimated candidate on 1 of 195 products: colorFabb PLA-HP, density estimated
  1,190 to 1,300 kg/m³".
- **Effect.** None. **Depends on / unblocks.** Unblocks C18. **Effort.** M. **Owner's call.** No.

#### C06. Plainer group and heading words

- **What changes.** "Supported candidates" becomes "Meets every requirement". "Excluded / screened" splits into "Fail"
  and "Hidden as unlikely". A hidden row no longer says "Insufficient evidence". Plurals agree ("1 product"). The
  counts sentence, the export's group names and old document names ("Include uncertain") are aligned. The reason's
  run-on clause gets its full stop. C18 later renames the remaining groups.
- **Why.** F06. **Effect.** None. **Depends on / unblocks.** Unblocks C18. **Effort.** S. **Owner's call.** No.

#### C07. Make "Why the rest were excluded" count what the page shows

- **What changes.** The panel counts a hide only for a material that the requirement alone holds out. It skips
  materials that fail another requirement, and requirements that are only reported. It counts the material's own hide.
  Today it judges each requirement on one product: the first that passes it, else the first that does not fail it. The
  status bar says "UNKNOWN n (m hidden)".
- **Why.** F07. **Example.** Outdoor's HDT line says 22 hidden. The page hides 14. The other 8 already fail.
- **Effect.** Panel figures only. **Effort.** S. **Owner's call.** No.

#### C08. Show the switch's real state and keep the reader's mode

- **What changes.** Under Leave out the switch shows unchecked and disabled, its stored value kept. Choosing a preset
  keeps the reader's Include choice. Under Leave out with the UNKNOWN chip on, the subtitle says the unknowns are shown.
- **Why.** F08, V23. **Effect.** None. **Effort.** S. **Owner's call.** Yes: keep the mode, or announce the reset
  (decision 7).

#### C09. Do not offer annealing when the annealed value misses too

- **What changes.** "Published only after annealing … (60 °C)" adds "which also misses 100 °C" and drops "Allow
  annealing to use it" where annealing cannot help.
- **Why.** F09. **Example.** Bambu Lab PLA Silk+ for the 100 °C bracket.
- **Effect.** None. **Depends on / unblocks.** Unblocks C24. **Effort.** S. **Owner's call.** No.

#### C10. Preset notes on unstated bars and on stretch

- **What changes.** The two heat presets say that an HDT whose bar the sheet does not describe is accepted. Flexible
  component says it tests stretch, not softness, until C30 changes it.
- **Why.** F28, F29. **Effect.** None (the release ID moves). **Effort.** S. **Owner's call.** No.

#### C39. Outdoor preset: warn that nylons are judged dry *(new)*

- **What changes.** The outdoor preset's "not checked" line says the part is judged dry, and that nylons lose
  stiffness in humid air. Judging moisture-sensitive materials in their humid state is left for a later decision.
- **Why.** V31: both experts raised it. In products that publish both, humid air cut stiffness to 0.27 to 1.0 of the
  dry value. The materials scientist puts PA6-CF's 3.8 to 4.3 GPa at 2.3 to 3 GPa in humid air.
- **Effect.** None now. Judging nylons humid would turn most nylon products unresolved, since few publish a humid value.
- **Effort.** S. **Owner's call.** Yes (decision 10).

### Stage 2: data corrections

#### C11. Correct PLA-HP and the PLA heat values above their own Tg *(amended: seven products)*

- **What changes.** Re-read colorFabb PLA-HP's 135 °C and record it as its sheets say: injection-moulded (the 2022
  sheet) or annealed (the 2024 sheet's footnote). Re-read the seven PLA-family heat values that sit more than 15 °C
  above their own sheet's Tg, and flag those the sheet does not support as a printed bar. Add a physics check: as
  printed, a glassy polymer's HDT at 0.45 MPa sits at most a margin above its Tg, the margin set from the 97 PLA pairs.
  Correct the stated basis of the amorphous HDT plausibility window.
- **Why.** F24. **Example.** 3DXTECH CarbonX CF-PLA publishes 91 °C beside a Tg of 60 °C, on a bar printed on a 23 °C
  bed. The seventh, Polymaker HT PLA GF, publishes 75.5 °C beside 59.8 °C.
- **Effect.** Three answers: PLA leaves the estimated candidates for the outdoor bracket, and PLA-CF and PLA-NF stop
  meeting Warm environment. More if the check finds others.
- **Depends on / unblocks.** Must land before C32's density rule, or PLA passes the outdoor bracket on the moulded
  135 °C. **Effort.** M. **Owner's call.** No: a person settles each flagged value.

#### C12. Flag PBAT's heat value and add a stiffness check for HDT

- **What changes.** Flag Flashforge "Flexible" (PBAT)'s 90 °C HDT as physically implausible beside its own 6 to 7 MPa
  modulus. Add a physics check: an HDT needs a bar of about 225 MPa or stiffer, the reason the rule for elastomers
  already gives. Settle what it finds: nGen FLEX, Crystal Flex, purefil PVC-P 94A.
- **Why.** F16, V08. **Effect.** PBAT stops meeting Warm environment and any heat question at 90 °C or less.
- **Effort.** S. **Owner's call.** No.

#### C13. Re-read resin and film sheets read as printed bars

- **What changes.** Re-read and record as each sheet shows: purefil's ABS "Tensile modulus (ASTM D790)" (a flexural
  standard), Yousu PC's 150 % stretch, Fillamentum CPE HG100, Spectrum PCTG, Spectrum PETG Lite's 160 % (tested beside a
  film-test strength) and iSANMATE PLA CF's 25 GPa resin bar.
- **Why.** F25. Narrows F20 and F22. **Effect.** Once each page is read: likely ABS in Lightweight structure, PC, CPE,
  PCTG and PETG in Flexible component, and PLA-CF in High-stiffness fixture leave the estimated candidates.
- **Depends on / unblocks.** Unblocks C26, C27. **Effort.** M. **Owner's call.** No.

#### C14. Correct the carbon-fibre PETG densities *(amended: does not move PETG-CF by itself)*

- **What changes.** Register CarbonFil's 2024 revision as a new source and record its values (15 % fibre, 1.32).
  Re-read Recreus PET-G CF's 1.1 g/cm³. Extend the density check of OPEN-PROBLEMS §17 to filled products.
- **Why.** F26. **Effect.** It does not move PETG-CF's group by itself. A third product, iSANMATE PETG CF, publishes
  exactly 1,250 kg/m³ and is estimated at 2.90 GPa, which keeps PETG-CF in the lightweight list.
- **Effort.** S. **Owner's call.** No.

#### C15. Check one HDT typed at two loads across two documents

- **What changes.** The check that compares HDT at 1.8 and 0.45 MPa looks across all of one product's documents, not
  only within one. Re-read the six products it names.
- **Why.** F27. **Example.** Fiberlogy PP's 51 °C is "@ 1.8 MPa" on its sheet and "@ 0.45 MPa" on its product page.
- **Effect.** One product's answer, no material's. **Depends on / unblocks.** Unblocks C22. **Effort.** S.
  **Owner's call.** No.

#### C16. Make the three materials with no product family entries

- **What changes.** PA66-CF, PA612 and PA612-GF become family entries, as the data rules already do for a material
  left with no product. Their resin references stay in the database.
- **Why.** F18, V05. Both experts would not list them at all.
- **Effect.** 18 listings leave the lists: 3 hidden today, 15 under "Insufficient evidence".
- **Effort.** S. **Owner's call.** Yes (decision 9): the goals count them as materials with nothing to buy.

#### C17. Map same-type materials to the printer guide

- **What changes.** For each material held by a printer check alone, check whether it is the type a column of Bambu
  Lab's guide heads. Where it is, map it, with a reason naming the neighbours it is not. A declared variant still reads
  no guide.
- **Why.** F13. **Effect.** Part of the printer-check cases move to a pass. C34 covers the rest.
- **Depends on / unblocks.** Before C34. **Effort.** M. **Owner's call.** Part of decision 2.

#### C36. Class PLA as a plastic that can crystallise but prints glassy *(new)*

- **What changes.** The polymer table records PLA like PET: it can crystallise, and prints glassy. Crystallising PLA
  grades become a declared variant.
- **Why.** V30. The materials scientist: "Physically it is a slowly crystallising polymer, like PET." It explains the
  seven PLA heat values above their Tg, and why PLA-HP's moulded 135 °C says little about a print.
- **Effect.** The estimate model refits its heat estimates (its code stays frozen, its output moves). Read the build's
  difference report before adopting.
- **Depends on / unblocks.** Unblocks C35's PLA part and C32's Tg rule. **Effort.** S. **Owner's call.** Yes (decision 3).

#### C37. Record fibre content as a number *(new)*

- **What changes.** Each fibre-filled product gets its fibre content by weight as a typed number, read from its sheet.
- **Why.** V32: the materials scientist's first data priority. It lets the build cap stiffness by fibre content and
  check density by the rule of mixtures.
- **Example.** ASA-GF's densities put its glass at 10 to 16 %, which cannot lift ASA's 2.2 GPa near 5 GPa.
- **Effect.** None by itself. **Depends on / unblocks.** Unblocks C32's fibre rule and C40. **Effort.** M (re-reads).
  **Owner's call.** Part of decision 3.

#### C38. Make Shore hardness a selectable property *(new)*

- **What changes.** Shore hardness, already recorded on about 170 products, becomes a property the rail and presets
  can ask, by the data rules' recipe for a new headline.
- **Why.** F28, F16. A gasket needs softness. Hardness is the measure makers publish.
- **Effect.** None by itself. **Depends on / unblocks.** Unblocks an alternative ceiling for C30. **Effort.** S.
  **Owner's call.** Part of decision 8.

#### C40. Flag claims a class limit or fibre content contradicts *(new)*

- **What changes.** A check flags a product value that breaks its class's physics limit or its own fibre content, for
  a re-read. The row then carries a "doubtful number" tag.
- **Why.** Both experts list such claims. **Example.** Spectrum PLA Carbon claims 12.5 GPa at a stated 10 % fibre,
  about three times what other PLA-CF reach. FormFutura CarbonFil claims 9.5 GPa at 1,190 kg/m³, below plain PETG.
- **Effect.** Answers move only after each re-read. **Depends on / unblocks.** After C32 and C37. **Effort.** S.
  **Owner's call.** Part of decision 3.

### Stage 3: rule changes

#### C33. A value just under the limit is "on the line" *(new)*

- **What changes.** A value measured the way the requirement asks that misses by less than test scatter is
  unresolved, "on the line", not a fail. Test scatter is a column of the property's definition: 10 % for stiffness and
  strength, 5 °C for HDT, 20 % for elongation, 2 % for density. A value that meets the limit still passes, tagged "thin
  margin" when within the scatter.
- **Why.** V24. Both experts: a maker's figure moves by about that much between its own sheets.
- **Example.** 3DXTECH CarbonX CF-PLA publishes 4.95 GPa against 5 GPa: one test bar or one email settles it.
- **Effect (simulated).** About 177 product answers move from fail to on the line: Outdoor 51, Lightweight 89, Warm 29,
  High-stiffness 5, Flexible 3. About 10 listings move from a hidden failure back onto the list.
- **Depends on / unblocks.** Take with C18. **Effort.** S to M. **Owner's call.** Yes (decision 5). Amends the rule that
  a published mean decides at face value (D54).

#### C18. Sort the unchecked materials by what would settle them *(amended)*

- **What changes.** Under Include, after "Meets every requirement", the list shows three groups. **One check away**:
  one product needs a single question or test, because its value is on the line, only a printer check is open, or it
  meets the number only on a value measured another way that no measured product contradicts. **Not enough data**:
  ordered by estimate, tagged "likely" by C19. **Unlikely to meet**, collapsed: on a required number at least one
  product is measured and none passes or is on the line, or every open product's own estimate wholly misses. The row
  says which, for example "every measured product misses HDT 100 °C: 45 of 73, and 28 publish nothing". Verdicts,
  counts and exported rows do not change. The export's group column takes the new names.
- **Why.** F04, F11, F12, F13. V02, V20, V27. Both experts group by the action that settles a material.
- **Example.** PEBA moves to "One check away": six products stretch up to 1,110 % and wait only on a chamber line.
- **Effect (simulated, today's data).** Of the 479 listings of unchecked materials across the six presets: about 128 to
  "One check away", 87 to "Not enough data", 249 to "Unlikely to meet". The other 15 have no product and leave with C16.
- **Depends on / unblocks.** After C05, C06. Take with C33, or PLA-CF and PA6-CF sink to "Unlikely". PET-CF sinks too
  unless C23 lands. Unblocks C25, C30. **Effort.** L. **Owner's call.** Yes (decision 1): the names, and whether the
  last group is collapsed. Amends the grouping of the 2026-10-08 fix (D137).

#### C19. Tag "likely" only when the range shown meets the limit *(amended)*

- **What changes.** Inside "Not enough data", a product is tagged "likely" when, for every open number, the range the
  page shows (80 %) meets the limit, and no required number has every measured product missing. The tag orders the
  group. It is never a pass.
- **Why.** F10, V04, V20, V28. Both experts: estimates rank and lean.
- **Effect (simulated).** Of today's 43 estimated candidates, 19 would keep the tag. Fewer once C18 moves the others
  to "One check away".
- **Depends on / unblocks.** With C18. Revisit after C26 to C29: the statistician's "chance at least 50 %" suffices
  once estimates rest on other makers' printed values. **Effort.** S. **Owner's call.** Yes (decision 6). Amends the
  2026-10-08 fix (D137).

#### C20. "Does not apply" hides with estimates on or off

- **What changes.** A property that does not apply hides the material under Include whatever the estimates switch
  says. It stays UNKNOWN, never FAIL. C02's help drops the clause.
- **Why.** F03, F16, V18. **Effect.** With estimates off, 30 listings (Outdoor 14, Warm 16) move from listed to hidden.
- **Depends on / unblocks.** After C04. **Effort.** S. **Owner's call.** Yes (decision 7). Amends the coupling in D43.

#### C21. A printer window the H2C partly covers passes, flagged *(amended)*

- **What changes.** For nozzle, bed and chamber alike: where the H2C covers at least 5 °C of the maker's window, the
  check passes, flagged "at the low end of the maker's window". Where the H2C reaches only the window's bottom edge,
  it is "on the line".
- **Why.** F14, V11. Both experts: a maker's window says any setting in it works. **Example.** LCP's bed window is 120
  to 150 °C. The H2C's 120 °C is its edge, so LCP is on the line, not failed. PPS-CF's chamber window is 60 to 90 °C.
  The H2C covers 60 to 65 °C, so it passes, flagged.
- **Effect.** LCP and PPS-ESD (bed 120 to 160 °C) leave the hidden failures in all six presets. With C34, about 48 more
  listings pass (simulated).
- **Effort.** S. **Owner's call.** Yes (decision 2). Amends the rule that only the chamber has a partial state (D32).

#### C34. Decide a silent chamber by the plastic's kind *(new, reverses V10)*

- **What changes.** A table gives, per polymer family, what a sheet's silence about the chamber means. A script derives
  it from the makers who do state one, and a person reviews it. The printer check reads it after the product's own
  sheet, its twin's and the printer guide. A chamber "recommended" with no temperature stays unknown (the owner's ruling
  of 5 October).
- **Why.** F13, V10. Both experts. Of the makers who state a chamber, none asks above 65 °C for PLA (42 makers), PETG
  (34), TPU (27) or the nylons. About a third do for polycarbonate.
- **Example.** QIDI PEBA 95A stretches 1,107 % on a printed bar and waits only on a chamber line its sheet never prints.
- **Effect (simulated, with C21).** About 48 more listings pass across the six presets. Indoor prototype goes from 87
  to about 106. PEBA, TPC and the hardest TPUs pass the gasket preset. PPS-CF passes Warm environment.
- **Depends on / unblocks.** After C17. **Effort.** S to M. **Owner's call.** Yes (decision 2). Amends the rule that
  silence is not read as "no chamber needed" (D33).

#### C31. Build an evidence ledger: floors, ceilings and bands as data *(new)*

- **What changes.** The build turns each product's values that are not measured the way a requirement asks into a
  floor, a ceiling or a band on the property asked. Each relation is a data row: what it relates, the band measured on
  products that publish both, and the direction it may decide. The build intersects them per product and state. The
  page compares one range with the limit, as it already does, and names the deciding record. An empty intersection
  shows as "sheets disagree". The ledger lives in its own field, so the frozen estimate model's inputs do not change.
  A release check re-measures each band on same-sheet pairs.
- **Why.** V25, V36. It removes a class of findings, not one: F09, F15, F17, F24, F25 and part of F11. Its first rows
  are C22, C23, C24 and C35. Other rows the experts measured: an upright bar's stiffness is a floor for the flat one.
  A humid nylon value is a floor for the dry one. A flexural modulus bounds the tensile one between 0.70 and 1.59
  times. A moulded or unstated stiffness never passes and fails only with an allowance.
- **Effect (simulated).** About 40 product answers in High-stiffness fixture fail on their flexural value. A handful
  per stiffness preset pass on an upright, humid or flexural value. Each row's own effect is reported as it lands.
- **Depends on / unblocks.** After C15. If the owner declines the ledger, C22 to C24 can be built as three small rules.
  **Effort.** L. **Owner's call.** Yes (decision 4). Amends "a bound never passes" (D48), "another state never
  decides" (D99) and the admission of unstated bars (D84).

#### C22. Ledger row: HDT at 1.8 MPa is a floor for HDT at 0.45 MPa

- **What changes.** A printed HDT at 1.8 MPa at or above the limit meets an "HDT at 0.45 MPa at least" requirement on
  the same product, labelled "meets it at 1.8 MPa, a harsher load".
- **Why.** F15, V12. On the same bar a lighter load cannot deflect it sooner: 268 pairs, one lower by 1 °C.
- **Example.** LUVOCOM PAHT's printed 80 °C at 1.8 MPa, reported today as "Not published".
- **Effect.** In Warm environment 24 products. Up to 3 materials meet it (PA6-CE, PAHT, and ASA-AF once its disputed
  record is settled). Across the database 51 products in 28 materials hold such a value.
- **Depends on / unblocks.** After C15. **Effort.** S. **Owner's call.** Yes (decision 4).

#### C23. Ledger row: lab-humidity values count as dry where water does not matter

- **What changes.** For a polymer whose water uptake is recorded as negligible, a value tested at standard lab
  humidity decides as dry.
- **Why.** F17, V17. Both experts. **Example.** BASF Ultrafuse PET CF15's 6.18 GPa on printed bars "conditioned in
  standard climate (23 °C, 50 % RH 72 h)".
- **Effect.** PET-CF meets the 5 GPa fixture. 6 products for stiffness.
- **Effort.** S. **Owner's call.** Yes (decision 4). Amends the moisture rule (D99).

#### C24. Ledger row: an annealed HDT is a ceiling for the printed part *(amended)*

- **What changes.** An annealed HDT below a minimum fails the as-printed product, labelled. An annealed stiffness
  decides only with an allowance: it fails the printed part only if it misses even after dividing by 0.79.
- **Why.** F09, F15, V13. Annealing raised HDT in every pair the experts found (11 of 11. +39 to +88 °C). For
  stiffness their pair sets disagree: 17 of 17 rose in one, ×0.79 to ×1.12 in the other.
- **Effect.** 141 product results carry an annealed value below a minimum. They decide 6 listings: PC FR in Outdoor,
  Lightweight and High-stiffness, ABS-AF in Outdoor, PA612-ESD and PPS-GF in High-stiffness.
- **Depends on / unblocks.** After C09. **Effort.** S to M. **Owner's call.** Yes (decision 4).

#### C35. Ledger row: a moulded or unstated PLA or PET heat value is a ceiling *(new)*

- **What changes.** For a plastic that prints glassy but can crystallise (PET, and PLA after C36), an HDT from a moulded
  or unstated bar may show a fail, never a pass. For plastics that print glassy and cannot crystallise (ABS, ASA, PC,
  PETG) and those that crystallise while printing (nylons, PP), the current acceptance stays.
- **Why.** V19 (partly reversed). Both experts: a moulded bar of a slow crystalliser cools crystalline in a hot tool,
  and a print does not.
- **Effect (simulated).** In Warm environment about 8 passing products rest on such a value. Three materials lose
  their pass: PLA-NF, PLA-PHB and PLA blend.
- **Depends on / unblocks.** After C36. **Effort.** S. **Owner's call.** Yes (decision 4). Amends the admission of
  unstated bars (D84).

#### C32. Physics limits per kind of plastic *(new)*

- **What changes.** A table of physics limits per kind of plastic, each with its source and the database's own
  measured extreme, read by the ledger. A limit decides only for a product with no value of its own measured the way
  asked. First rows: an unfilled rubber is never stiffer than about 0.5 GPa (Shore 95A is about 0.04 GPa). An unfilled
  plastic's density lies in its neat polymer's range. Later rows, after a back-test: a glassy plastic does not stretch
  100 % printed. An unfilled rigid plastic stays under about 4.3 GPa printed. A glassy plastic's HDT stays within
  Tg + 15 °C. Fibre content caps stiffness.
- **Why.** V26. Both experts. **Example.** TPU 95A class at 5 GPa: twelve products publish 0.006 to 0.065 GPa. The
  other fifteen are Shore 95A by name.
- **Effect (simulated).** With the rubber rule, the TPU classes and OBC fail any stiffness above 0.5 GPa: 5 materials
  move from listed to failed in Lightweight structure and 5 in High-stiffness fixture. With the later rows, about 18
  more unfilled materials fail at 5 GPa and about 40 glassy materials fail the gasket preset.
- **Depends on / unblocks.** After C11 (or PLA passes the outdoor bracket), C31, C36, and C37 for the fibre rule. The
  neat density ranges need a recorded source first. **Effort.** M. **Owner's call.** Yes (decision 3). Amends the rule
  that a requirement nobody measured stays unknown (D26).

#### C25. Make the guard test run the page's path

- **What changes.** The test that guards exclusion runs on products and their estimates, as the page does, and asserts
  the contract after C18 to C20: no material sits in "One check away" or carries "likely" for a requirement its own
  defended range wholly misses. The data-rules sentence naming the test changes with it.
- **Why.** F19. **Effect.** None. **Depends on / unblocks.** After C03, C18, C19, C20. **Effort.** S.
  **Owner's call.** No.

### Stage 4: the estimate model (frozen: a decision and a back-test each)

#### C26. Stop resin stretch flooring the printed estimate

- **What changes.** An elongation from a bar whose kind the sheet does not state no longer sets a floor under a
  product's printed estimate, or does so only through the moulded conversion (a moulded break strain is about 1.7
  times the printed one).
- **Why.** F20, V14. Both experts: a moulded stretch never passes a printed part.
- **Effect.** The floored rigid materials of the gasket preset fall (PETG, PC, PCTG, CPE, PETG-PTFE). Little moves
  after C19. **Depends on / unblocks.** After C13. **Effort.** M. **Owner's call.** Yes (decision 6). Amends the
  owner's own choice that an undescribed bar sets a floor like a printed one (D126).

#### C27. Correct values with no stated direction

- **What changes.** The model learns how far a modulus with no stated direction overstates a printed one across
  products, not within products that repeat one number.
- **Why.** F22, V15. The statistician measured ×1.21 on 27 materials, and ×1.55 to ×1.81 for PETG, PA6-CF and PETG-CF.
- **Effect.** 313 of 691 product stiffness estimates fall. The stiffness presets' estimated groups shrink.
- **Depends on / unblocks.** After C13. Unblocks C28. **Effort.** M. **Owner's call.** Yes (decision 6).

#### C28. Let a product's own value anchor its estimate

- **What changes.** A back-test decides whether an estimate may cross a limit that the product's own published value
  (no direction, or moulded) misses. If not, that value anchors the estimate.
- **Why.** F21, V16. **Example.** Fillamentum CPE CF112 publishes 2.2 GPa and is estimated at 2.53 against 2.5.
- **Effect.** A few: CPE-CF and PA6-GF in Lightweight. **Depends on / unblocks.** After C27. **Effort.** M.
  **Owner's call.** Yes (decision 6).

#### C29. Estimate annealed-only products and heat deflection

- **What changes.** Products whose only stiffness is annealed get an as-printed estimate. HDT's product-level
  calibration limit is lifted if the back-test allows.
- **Why.** F23. **Effect.** Heat presets can gain estimates. 46 products per stiffness preset gain one.
- **Depends on / unblocks.** After C24. **Effort.** L. **Owner's call.** Yes (decision 6).

### Stage 5: presets

#### C30. Flexible preset: add a stiffness ceiling of 0.1 GPa *(amended: 0.1 GPa, not 0.3)*

- **What changes.** Flexible component asks "tensile modulus at most 0.1 GPa" beside "elongation at break at least
  100 %". Once C38 lands, "Shore hardness at most 95A" is an alternative. The "not checked" line becomes "recovery and
  sealing".
- **Why.** F28, V07. The materials scientist: a gasket needs Shore 60 to 95A, a stiffness under about 0.05 GPa.
- **Effect.** PA6/66 (1.98 GPa) and PP leave the gasket list. PETG, PC, PCTG and CPE fail on their own stiffness. The
  elastomers stay. Read the build's difference report before adopting.
- **Depends on / unblocks.** After C18, C19. **Effort.** S. **Owner's call.** Yes: the number (decision 8).

## Verdicts

Each judgement a reviewer, an expert or this review made, with the product manager's stance and the decisions it
touches. "Both experts" means the statistician and the materials scientist, who worked from the data without seeing
the tool's rules.

#### V01. Keep the pass and fail rules

- **Judgement.** A product is pass, fail or unknown on its own data. A material passes when one product passes and
  fails only when every product fails.
- **Held by.** All reviewers. Both experts define the material answer the same way ("at least one product you can buy
  is shown to pass").
- **Stance.** Keep (decisions D26, D83, D100). Fix the listing, not the verdict.

#### V02. Measured misses get their own group

- **Judgement.** A material whose every measured product misses should not sit in "Insufficient evidence".
- **Held by.** The heat and stiffness reviewers, the first-time user, the statistician ("Unlikely", counted apart).
- **Stance.** Agree: a collapsed "Unlikely to meet" group with its count (C18). Still listed: the statistician's rule
  of three says 22 failing PETG products still allow up to 14 % of PETG products to pass.

#### V03. Rename the switch, keep one

- **Judgement.** "Let estimates rule out materials" should be renamed or removed. **Held by.** The first-time user, the
  heat reviewer.
- **Stance.** Rename and keep one switch (C02). Take "does not apply" out of it (C20). Without it a reader could not
  read the list without estimates.

#### V04. Promotion on the middle value is too weak *(updated)*

- **Judgement.** An estimate's middle value is not enough to put a material forward. **Held by.** The stiffness
  reviewer, the first-time user. Both experts (estimates rank only).
- **Stance.** Agree. Estimates now order and tag inside "Not enough data" (C19). Amends the 2026-10-08 fix (D137).

#### V05. Do not relax the proof needed to hide on an estimate *(updated)*

- **Judgement.** Exclusion by product estimates should be proved or relaxed to match material screening. Materials
  with no product should not be hidden on the weakest evidence. **Held by.** The three reviewers, in three directions.
- **Stance.** Keep the owner's error budget for exclusions (D137). Make the materials with no product family entries
  (C16). Let the "Unlikely" group carry what hiding cannot. Physics limits are not estimates and may decide (V26). The statistician's
  5 % rule is recorded under V35.

#### V06. Keep exclusion stricter than inclusion

- **Stance.** A wrong exclusion hides a good option for good. A wrong inclusion costs a check. Both experts set their
  thresholds the same way. Keep it (D43).

#### V07. Flexible needs softness: 0.1 GPa *(updated)*

- **Judgement.** Elongation of at least 100 % is not a test of flexibility. **Held by.** The flexible reviewer, the
  first-time user, the materials scientist.
- **Stance.** Agree. The scientist's 0.1 GPa replaces this review's first 0.3 GPa (C30).

#### V08. HDT applicability done as data

- **Judgement.** HDT should not apply to a product whose own stiffness shows it is rubbery. **Held by.** The heat
  reviewer, the first-time user.
- **Stance.** Agree, through a flagged value and a physics check (C12), not a new branch in code.

#### V09. Keep TPU-CF hidden

- **Judgement.** TPU-CF's hiding is arguable, on one 2.2 GPa moulded bar. **Held by.** The heat reviewer.
- **Stance.** Keep it hidden. A moulded bar does not make a TPU rigid, and that value is already questioned.

#### V10. A silent chamber is decided by the plastic's kind *(reversed)*

- **Judgement.** Silence about the chamber should not hold a product of a plastic that never needs one. **Held by.**
  The flexible reviewer and both experts.
- **Stance.** The first pass said "no new inference, now". Both experts, from the makers' own statements, say silence
  means none is needed for elastomers, PLA and PETG, and the data agree. Adopt it per polymer family (C34). The
  owner's 5 October ruling on "recommended, no temperature" stands. Amends the rule that silence is not read as "no
  chamber needed" (D33).

#### V11. Partial windows pass, flagged, and an edge is on the line *(updated)*

- **Judgement.** A window whose bottom the H2C reaches is not a failure. **Held by.** The flexible reviewer. Both
  experts go further.
- **Stance.** A window the H2C covers by at least 5 °C passes, flagged. A window it reaches only at the edge is "on
  the line": the cautious one of the experts' two answers for LCP (C21). Amends the rule that only the chamber has a
  partial state (D32).

#### V12. HDT at 1.8 MPa may pass a 0.45 MPa minimum

- **Held by.** The heat reviewer and both experts. **Stance.** Agree, as a ledger row, after the cross-document load
  check (C15, C22). Amends "a bound never passes" (D48).

#### V13. Annealed HDT is a ceiling now, modulus with an allowance *(updated)*

- **Held by.** The heat and stiffness reviewers and both experts. **Stance.** The first pass asked for a back-test
  first. Both experts measured HDT: annealing raised it in every pair. Adopt for HDT now. For stiffness only with the
  statistician's allowance, since the two pair sets disagree (C24).

#### V14. Resin stretch must not floor a print

- **Held by.** The flexible reviewer and both experts. **Stance.** Agree. The owner chose the floor in D126, so it is
  the owner's call, with a back-test (C26).

#### V15. Values with no direction need a correction

- **Held by.** The stiffness reviewer. The statistician measured it (×1.21). **Stance.** Agree, with a back-test (C27).

#### V16. A product's own value should anchor its estimate

- **Held by.** The stiffness reviewer. **Stance.** Lower priority: C19 already stops such an estimate from putting a
  material forward (C28).

#### V17. Lab humidity is not a damp state for PET

- **Held by.** The stiffness reviewer and both experts. **Stance.** Agree, by the polymer's water uptake (C23).
  Amends the moisture rule (D99).

#### V18. "Does not apply" is a definition

- **Held by.** The logic reconstruction, the first-time user. **Stance.** Agree: it hides whether or not estimates are
  on, labelled as such, still unknown and never a fail (C04, C20).

#### V19. Unstated heat values: keep, except PLA and PET *(partly reversed)*

- **Judgement.** The first pass kept the owner's acceptance of HDTs whose bar is not described (D84). **Held by.**
  The heat reviewer noted the policy. Both experts limit it.
- **Stance.** Keep it for plastics that print glassy and cannot crystallise, and for those that crystallise while
  printing. For PLA and PET such a value is a ceiling (C35, after C36).

#### V20. Fold estimated candidates into "Not enough data" *(updated)*

- **Stance.** Once values measured another way and measured misses are sorted first, few estimated candidates remain
  (simulated: 1 to 4 across all six presets). Both experts say estimates rank. So the estimate orders and tags "likely"
  inside "Not enough data" (C18, C19).

#### V21. Groups change presentation only

- **Stance.** Verdicts, the status bar's counts and every exported row stay as they are. The count line names each
  group's size (D26, D137).

#### V22. Include should be shareable

- **Judgement.** "I would turn Include and the estimates off before sharing." **Held by.** The first-time user.
- **Stance.** That is the measure of this work: after stage 3, repeat the first-time-user trial.

#### V23. A preset keeps the reader's mode

- **Held by.** The first-time user. **Stance.** Agree: a preset sets requirements, not the evidence policy (C08).

#### V24. A near miss is "on the line" *(new)*

- **Judgement.** A value measured the right way that misses by less than test scatter is not a fail. **Held by.** Both
  experts. The statistician would also refuse a pass inside the band. The scientist passes it, tagged.
- **Stance.** Adopt the scientist's version: a near miss is unresolved, a pass stays a pass, tagged "thin margin"
  (C33). It reverses the first pass's answer for PLA-CF, which had put it with the unlikely ones. Amends the rule that
  a published mean decides at face value (D54).

#### V25. Evidence decides in its safe direction *(new)*

- **Judgement.** A value measured another way may decide only in the direction its measured bias makes safe. **Held
  by.** Both experts, with measured bands.
- **Stance.** Adopt as the principle behind the evidence ledger, one data row per relation (C31). Amends "a bound
  never passes" (D48), the admission of undescribed bars (D84) and the rule on other states (D99).

#### V26. Physics of a class may decide *(new)*

- **Judgement.** A physical limit of a kind of plastic may settle a requirement nobody measured. **Held by.** Both
  experts.
- **Stance.** Adopt for physics with a recorded source now (rubber stiffness, neat density). Adopt the limits read off
  this database (glassy stretch, unfilled stiffness, Tg ceiling) after a back-test (C32). Amends the rule that a
  requirement nobody measured stays unknown (D26).

#### V27. Sort by the action that settles it *(new)*

- **Held by.** Both experts. **Stance.** Adopt, with three groups rather than their six, so the list stays scannable:
  their "on the line", "shown only on another kind of bar" and "printer at its limit" become "One check away" (C18).

#### V28. Estimates rank, never pass or fail *(new)*

- **Held by.** Both experts. **Stance.** The tool already never passes on an estimate (D43). Now estimates only order
  and tag (C19).

#### V29. Judge within one product, and medians decide nothing *(new)*

- **Held by.** Both experts. **Stance.** The tool already does both (D83, D99). The row should still show the deciding
  product, not the median (C05).

#### V30. Class PLA like PET *(new)*

- **Held by.** The materials scientist. The statistician calls PLA "the trap". **Stance.** Agree (C36). It moves the
  estimate model's output, so read the difference report.

#### V31. Warn about nylons outdoors *(new)*

- **Held by.** Both experts. **Stance.** A warning now (C39). Judging nylons humid is a later owner's call.

#### V32. Collect fibre content first *(new)*

- **Held by.** The materials scientist (fibre content first). The statistician (as-printed HDT first). **Stance.**
  Fibre content as a typed number (C37). As-printed HDT is a maker question, which "One check away" lists.

#### V33. Test labs differ, so record the method *(new)*

- **Judgement.** Makers' test labs differ more than their materials: Flashforge's five PLAs average 1.29 GPa,
  colorFabb's six 3.30 GPa. **Held by.** The materials scientist.
- **Stance.** No correction now. Recording whether a maker used an extensometer is a later data task.

#### V34. Better preset proxies, later *(new)*

- **Judgement.** Lightweight structure should rank by stiffness per weight. A loaded warm part needs HDT at 1.8 MPa.
  A fixture should show upright stiffness. **Held by.** The materials scientist.
- **Stance.** Sound, but not now. The flexible preset is the urgent one (C30).

#### V35. Do not hide on a 5 % chance yet *(new)*

- **Judgement.** Hide a product when an estimate from two or more other makers gives it under a 5 % chance. The
  statistician's back-test erred near 5 % with that many makers. **Held by.** The statistician.
- **Stance.** Not adopted. Those are single-requirement rates, not the owner's budget across a whole preset (D137).
  The collapsed "Unlikely" group gives the reader the same benefit without hiding anything.

#### V36. Build the evidence ledger *(new)*

- **Stance.** Yes. It moves a class of rulings into data rows, in the build's compile stage, not the frozen estimate
  stage (C31). See the [README](README.md#could-a-change-in-the-pipeline-fix-many-of-these-at-once).

#### V37. Do not move grouping to the build *(new)*

- **Stance.** No. The groups depend on the reader's requirements, set in the page. The build should precompute the
  evidence, not the answer.

## Findings

Each finding says what happens, with an example, how serious it is (a wrong answer, misleading, or cosmetic) and how
many cases it affects. "First-time user: yes" means the engineer who never read the repository hit it from the page.

### The words on the page

**F01. The switch named "rule out" mostly promotes.** It creates the estimated-candidates list, which disappears when
it is off. It hides a material 33 times across the six presets: 30 times because heat deflection does not apply to an
elastomer (counted in each heat preset), 3 times for a material with no product. No estimate of a real product can
hide anything. *Misleading. First-time user: yes ([screenshot](first-time-user/3-stiffness-tpu-not-ruled-out.png)).*
[LOGIC.md](LOGIC.md), [hdt-presets.md](presets/hdt-presets.md).

**F02. The page promises exclusions by material estimates that stopped.** 117 of 132 material estimates marked "may
exclude" belong to materials with products, and are never read. In 55 cases a material stays listed though its own
estimate wholly misses (ASA-EC and ASA-AF at 5 GPa). *Misleading.* [LOGIC.md](LOGIC.md), problems 1 and 11.

**F03. "Does not apply" is reported as an estimate.** TPC's chip lists "HDT at 0.45 MPa at least 100 °C" ten times
under "Screened by an estimate". With estimates off the same property reads "Not published … ask the maker".
*Misleading. First-time user: yes ([screenshot](first-time-user/2-outdoor-tpc-screened-drawer.png)).*
[LOGIC.md](LOGIC.md), problem 5.

**F04. "Insufficient evidence" holds four situations.** Of its 436 listings, 234 (about half) already have evidence
that they miss, 76 meet every number and wait on a printer check, 15 have nothing to buy, and 111 are truly open. PPS-CF
(HDT 251 °C) sits there for its chamber window. *Misleading. First-time user: yes.*
[CENSUS.md](CENSUS.md), [flexible-and-indoor.md](presets/flexible-and-indoor.md).

**F05. The row does not name the product that decides it.** PLA is an estimated candidate for the outdoor bracket by
colorFabb PLA-HP alone, while its row shows a 55 °C median. In 20 of the 43 estimated rows the median fails the
requirement the heading says is met. PA12-CF's 3.3 GPa median rests on four values, three of them annealed. *Misleading.
First-time user: yes ([screenshot](first-time-user/1-outdoor-pla-estimated-candidate.png)).*
[modulus-presets.md](presets/modulus-presets.md), [LOGIC.md](LOGIC.md).

**F06. Group and heading words mislead.** "Supported" sounds like a support material. "Predicted centres meet…" reads
as "likely meets". "Excluded / screened" holds plain failures. A hidden row says "Insufficient evidence". "1 products
fail". *Cosmetic, misleading together. First-time user: yes.* [FIRST-TIME-USER.md](FIRST-TIME-USER.md).

**F07. Counts that do not reconcile.** "Why the rest were excluded" says Outdoor's HDT hides 22. The page hides 14. The
other 8 already fail another requirement. Lightweight says 4 hidden and hides none. *Misleading. First-time user: yes
([screenshot](first-time-user/6-why-excluded-tab.png)).* [LOGIC.md](LOGIC.md), problem 7.

**F08. The mode and the switch hide their state.** The switch looks on while disabled. A preset silently resets Include
to Leave out. *Cosmetic. First-time user: yes ([screenshot](first-time-user/5-leave-out-yet-listed.png)).*

**F09. An annealing hint that cannot help.** "Allow annealing to use it" is offered for Bambu Lab PLA Silk+'s 60 °C
against 100 °C. 141 product results carry an annealed value below a minimum. *Misleading.*
[hdt-presets.md](presets/hdt-presets.md).

### The rules

**F10. The middle value of an estimate is enough to put a material forward.** 53 of the 105 estimates behind the 43
estimated candidates are coin flips. FormFutura Silk Gloss PLA is a candidate at exactly 2.50 GPa against 2.5.
*Misleading.* [modulus-presets.md](presets/modulus-presets.md).

**F11. Measured misses are not marked.** In 181 of the 436 "Insufficient evidence" listings, at least one product is
measured on a required number and none passes. In 109, every open product's own estimate misses wholly. 56 are both.
PETG's 45 measured heat values all stay below 100 °C. *Misleading. First-time user: yes ("I cannot scan a list that
large").* [hdt-presets.md](presets/hdt-presets.md), [modulus-presets.md](presets/modulus-presets.md).

**F12. An estimated product speaks before a measured one.** PEBA's row quotes one product's estimate, while six
siblings stretch up to 1,110 % on printed bars and wait only on a chamber line. 3DXTECH CarbonX CF PA12 publishes 8 GPa
as printed and waits only on a chamber check. 12 such cases. *Misleading.*
[flexible-and-indoor.md](presets/flexible-and-indoor.md).

**F13. A silent chamber holds a product.** 314 products have no usable chamber temperature. Bambu Lab's guide fills
the gap for only 17 of 152 materials. In the presets, 102 products in 50 materials wait on a printer check alone, and
88 listings would pass if it read within. *Wrong answer where the sheet says it prints open (PLA/PHA), misleading
elsewhere. First-time user: yes.* [flexible-and-indoor.md](presets/flexible-and-indoor.md).

**F14. A window read by its top end.** LCP's bed window is 120 to 150 °C, PPS-ESD's 120 to 160 °C. Both read "requires
up to" and fail, though the H2C's 120 °C is the window's own bottom. 34 products in 19 materials. *Wrong answer (2
materials).* [flexible-and-indoor.md](presets/flexible-and-indoor.md).

**F15. One-sided evidence never decides.** LUVOCOM PAHT's printed 80 °C at 1.8 MPa proves it meets 80 °C at
0.45 MPa, yet reads "Not published". Across the database 51 products in 28 materials hold such a value. In Warm
environment 24 have nothing else open. *Misleading.* [hdt-presets.md](presets/hdt-presets.md).

**F16. Whether HDT applies follows the polymer, not the product.** PBAT is classed semicrystalline, so a 6 MPa
filament passes an 80 °C heat test. The "does not apply" rule also works only with estimates on. *Wrong answer (PBAT).
First-time user: yes.* [hdt-presets.md](presets/hdt-presets.md).

**F17. Lab humidity treated as a damp state.** BASF Ultrafuse PET CF15's 6.18 GPa, tested at 23 °C and 50 % humidity,
is set aside in a dry question. PET barely takes up water. *Misleading.* [modulus-presets.md](presets/modulus-presets.md).

**F18. Materials with no product, judged on a family guess.** PA66-CF, PA612 and PA612-GF are the only materials an
estimate hides, while no real product's estimate may. *Misleading. First-time user: yes.*
[flexible-and-indoor.md](presets/flexible-and-indoor.md).

**F19. The guard test runs a path the page does not.** The test that should keep a material out when its own range
misses builds materials without their products. *Misleading, to maintainers.* [LOGIC.md](LOGIC.md), problem 2.

### The estimate model

**F20. Resin stretch floors the printed estimate.** Each of PETG's 8 estimated products is floored by its own unstated
value (120 to 280 %), while the 26 PETG products with a printed value publish 4.1 to 90 %. *Wrong answer (5 rigid
materials offered for a gasket). First-time user: yes ([screenshot](first-time-user/4-flexible-pc-estimated-candidate.png)).*
[flexible-and-indoor.md](presets/flexible-and-indoor.md).

**F21. A product's estimate blends its own value with its material's.** Fillamentum CPE CF112 publishes 2.2 GPa and is
estimated at 2.53 against 2.5. 12 of 54 products are estimated stiffer printed than their own moulded bar. *Wrong
answer (2).* [modulus-presets.md](presets/modulus-presets.md).

**F22. Values with no stated direction taken at face value.** They run about 21 % above printed values, so estimates
run high. 313 of 691 product stiffness estimates rest on such a value. *Wrong answer. First-time user: yes (silk and
glow PLAs offered as stiff).* [modulus-presets.md](presets/modulus-presets.md).

**F23. No heat estimates for products, none for annealed-only products.** A heat preset can never have an estimated
candidate. 46 products per stiffness preset get no as-printed estimate. *Misleading.*
[hdt-presets.md](presets/hdt-presets.md).

### The data

**F24. Moulded or annealed heat values read as printed.** PLA-HP's 135 °C is moulded or annealed, by its own sheets.
Seven PLA-family products sit more than 15 °C above their own Tg. The six at 25 °C or more all pass Warm environment.
The heat reviewer named four materials offered wrongly: PLA, PLA-CF, PLA-NF and PBAT. *Wrong answer (3 groups from
these values). First-time user: yes.* [hdt-presets.md](presets/hdt-presets.md).

**F25. Resin sheets read as printed bars.** purefil's ABS resin sheet prints a flexural-standard modulus read as
tensile. It alone puts ABS forward at 2.5 GPa against 13 measured products at 1.6 to 2.38. *Wrong answer.*
[modulus-presets.md](presets/modulus-presets.md).

**F26. Carbon-fibre densities below plain PETG.** 11 filled products publish a density below their neat polymer's.
Correcting CarbonFil's and Recreus's does not alone move PETG-CF, because iSANMATE PETG CF publishes exactly 1,250
kg/m³. *Wrong answer, as the reviewer judged.* [modulus-presets.md](presets/modulus-presets.md).

**F27. One HDT typed at two loads.** Fiberlogy PP's 51 °C is at 1.8 MPa on one document and 0.45 MPa on another. 6
products. *Cosmetic now, a wrong answer if C22 lands first.* [hdt-presets.md](presets/hdt-presets.md).

### The presets

**F28. Flexible component tests stretch, not softness.** 7 of the 18 materials listed above the collapsed group have
a stiffness of 1.5 GPa or more. PA6/66 passes at 1.98 GPa. *Misleading. First-time user: yes.*
[flexible-and-indoor.md](presets/flexible-and-indoor.md).

**F29. The heat presets rest on undescribed bars.** In Warm environment 66 of the 118 passing products pass on an HDT
whose bar the sheet does not describe. *Misleading.* [hdt-presets.md](presets/hdt-presets.md).

## Evidence and where to check

- **The census.** `node docs/audits/2026-10-18-screening-review/census.mjs --full <file>` writes every product's answer.
  Its "Insufficient evidence" split gives 234, 76, 15 and 111.
- **The product manager's simulations** read that output and `dist/db.json` of release 9ca94d31fc5d. The scripts were
  not kept. Their rules were:
  - Grouping (C18): a product is "one check away" when its open required results are only printer checks, values on
    the line, or values measured another way that meet the limit. The last kind ranks below "unlikely".
  - "Unlikely": a required number with a measured product and none passing or on the line, or every open product's
    estimate wholly missing.
  - On the line (C33): a published value short of the limit by under 10 % (stiffness), 20 % (elongation), 2 % (density)
    or 5 °C (HDT).
  - Printer (C21, C34): a silent chamber ("No temperature published", no enclosure statement, nozzle within) passes
    where at most 10 % of the polymer family's stating makers ask above 65 °C, with at least 3 stating. A window passes
    when the H2C covers 5 °C of it, and is on the line at the edge.
  - Physics limits (C32): unfilled elastomers at most 0.5 GPa. Unfilled rigid at most 4.3 GPa except LCP. Glassy
    printed elongation under 100 %. Neat density from the polymer table.
  - Evidence rows (C31): printed upright, humid or flexural stiffness against the limit, flexural band 0.70 to 1.59.
- **Record IDs.** PLA-HP: G001-58, V005853, V005792. The seven PLA heat values: V010211, V003309, V003212, V007474,
  V007533, V010287 and G019-01 (Polymaker HT PLA GF). PBAT: V005369. purefil ABS: V005563. PETG Lite: V002708. BASF
  PET CF15: V007692. LUVOCOM PAHT: V011437. CarbonFil: V009831, V009835. Recreus: V015320. iSANMATE PETG CF: G024-22.
  CarbonX CF-PLA: V003304. CarbonX CF PA12: G053-01, V000966. LCP: P1467. PPS-ESD: P1400.
- **Where the rules live.** The engine's numeric rule and grouping: `app/js/engine/constraints.js` (evaluateNumeric,
  evaluateMaterial, evaluateProducts, explainExclusions). Product values: `build/src/products.js`. Floors:
  `build/src/lower-bounds.js` and `data/tables/physical_relations.csv`. Product estimate proof:
  `build/src/estimate/product-screening.js`. The page's words: `app/js/ui/table.js`, `app/js/ui/labels.js`,
  `app/index.html`.
- **The experts' own evidence** is in [experts/STATISTICIAN.md](experts/STATISTICIAN.md) and
  [experts/MATERIALS-SCIENTIST.md](experts/MATERIALS-SCIENTIST.md), each with its queries.
