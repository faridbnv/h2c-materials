# Stage 4 review: the estimate model reopened (independent; statistician and materials engineer)

> **Historical record** (2026-10-18): an independent review of the screening build's stage 4 (the estimate model reopened), on main 89a1862d (release b11fb2f8f0a1), checked again on dd16db5a. Stage 4b corrected what it found ([stage-4b.md](stage-4b.md), decision D167); for where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

Reviewed 89a1862d (stage 4 merged). I made my own build (`.cache/screening-build/s4-review`, release b11fb2f8f0a1, the
same as stage-4-diff.md's "after") and compared it with the stage-3c build at ef96fe00 (release f399a642f5d3). I ran the
decision census and the engine (`runSelection`) myself. Main has since moved to dd16db5a (stage 3d, D166). I rebuilt it,
and S01, S02, S03 and S05 reproduce there unchanged: the estimate code is the same in both commits.

Counts: wrong answer 3, overstated evidence 5, misleading 3, stale doc 6, cosmetic 2.

## Wrong answer

**S01. An annealed-only product's "as printed" estimate still rests on its annealed values.**
C29(b) now estimates a product that publishes only annealed values as printed. Its annealed values still reach that
estimate by two paths:
- `lower-bounds.js:33` drops an annealed value only when the product also publishes the as-printed one. So an annealed
  HDT at 1.8 MPa floors the as-printed HDT at 0.45 MPa. (`ownCeilingsOf`, line 57, drops every annealed value. The two
  rules disagree.)
- `observations.js:152-155` re-labels only the headline's own kind as annealed. An annealed HDT at 1.8 MPa on a
  crystalline matrix enters the fit as an ordinary "HDT 1.8 semi-filled" value and converts up by 27 °C.
- In my build, 28 heat, 38 strength and 30 elongation estimates carry an annealed floor; 4, 5 and 4 of them sit on it.
- Bambu Lab PET-CF (G067-01): the as-printed estimate is 182 to 182 °C, precision "good", from floor V001269 (annealed
  80 °C, 12 h).
- Polymaker PET-CF17 (G067-02): 105 to 107 °C, from V002421 (annealed 120 °C, 10 h). Raise3D Hyper Speed PET CF
  (G067-07): 110 to 113 °C, from V013891.
- The data's own as-printed against annealed pairs say otherwise: Raise3D Industrial PET CF (G067-05) 87 against
  175 °C; Polymaker PET-GF15 (G068-02) 81.6 against 133.7 °C; Siraya PPA-CF (G070-02) 84.5 against 192 °C.
- D158 itself classes PET as glassy as printed, so these numbers contradict the model's own physics.
- Answers: Outdoor structural part (HDT ≥ 100 °C) marks 22 products "likely" on a heat estimate, and 12 of them rest on
  their own annealed values. G067-02, G067-07 and Raise3D PPA-CF25 (G070-08, 129 to 168 °C) are very probably wrong
  as printed. G067-01 is unsupported. Warm environment marks 30 of 82 "likely" products on such evidence.
- The calibration cannot see this: an annealed-only product has no as-printed value to hide.
- Fix: as-printed estimates take no floor or related observation from an annealed measurement (treat them as
  annealed kinds, or drop them). Back-test on the 9 products that publish both states.

**S02. C28's ceiling takes the lowest own value, even one the fit calls a conflict, and errs unsafe for a maximum.**
- `ownCeilingsOf` caps at 1.16 times the smallest moulded or undescribed modulus. It ignores the product's other
  values and the fit's own conflict flag.
- Extrudr DURAPRO PA6 CF (G050-05) prints 1.1 GPa moulded (flagged as a conflict), 6 GPa tensile and 5.75 GPa
  flexural. Its estimate went from 5.28 (3.63 to 7.66) to 1.23 (1.12 to 1.28) GPa. stage-4-diff-7 moved it to "unlikely
  to meet" in High-stiffness (≥ 5 GPa), Lightweight and Outdoor, against its own 6 GPa.
- Fillamentum Nylon CF15 Carbon (G053-14) went from 3.31 to 0.562 (0.516 to 0.58) GPa, on its own 0.5 GPa value,
  which the fit also flags as a conflict.
- Maximum requirements: Flexible component asks tensile modulus ≤ 0.1 GPa (D156). Extrudr FLEX HARD (G039-16, 58D)
  is capped at 0.046 GPa by a moulded 0.04, though its sheet also prints 0.4 GPa tensile and 0.38 GPa flexural. FLEX
  MEDIUM (G039-17) is the same case, with 0.12 and 0.11 GPa. Both are now marked "likely" for Flexible.
- D160's "direction safe" argument holds only for a minimum. Its back-test (27 cases, 4 crossing) cannot see these
  products, since they have no XY value to hide.
- Fix: no ceiling from a value the fit flags as a conflict, or one another own stiffness exceeds by more than about
  1.5 times. No ceiling feeds the "likely" mark against a maximum. List the 7 products (my scratch script finds G001-135,
  G096-03 and G137-03 besides these four).

**S03. A product's own heat value set aside as a conflict, while its product estimate is shown and marked "likely".**
- Yousu Modified ABS (G027-26) prints HDT 65 °C (GB/T 1634.2, load not stated). Its estimate is 92.6 to 108 °C, with
  the own value down-weighted as a conflict, and it is marked "likely" for Warm environment (≥ 80 °C).
- At either load the sheet says it misses 80 °C: at 1.8 MPa, a glassy ABS adds about 5 °C (CV01 learned +5.06).
- In all, 13 of the 466 new heat estimates exclude the product's own (load-unstated) value from their 95 % range,
  for example G014-17 (87 against 43.8 to 66.6) and G037-07 (144 against 116 to 137).
- The conflict rule predates stage 4. C29 is what puts these product estimates on screen and behind the mark.
- Fix: in a product's own estimate, its own value (at any load) is a floor and is never down-weighted. For a glassy
  matrix, value + CV01's band is a ceiling too.

## Overstated evidence

**S04. D158 says the 55 °C treatment "changes nothing". It crystallises nothing, but it does age the glass.**
- Ageing near Tg raises PLA's modulus and yield stress a little and lowers its elongation. Bambu Lab's own sheets
  recommend "50 to 60 °C … 6 to 12 hours" as annealing for printed models.
- Two products' own Tg sit below the 55 °C treatment: PLA Galaxy 52 °C and PLA Wood 54 °C (V000266, V000246). So the
  stated reason, "at or below its glass transition", is false for them.
- Four of the moved PASS verdicts are within 1 % of their limit, in the direction ageing inflates: PLA Metal modulus
  2.01 against 2 GPa; PLA Glow 2.03 against 2 GPa; PLA Wood HDT 60 against 60 °C; PLA Metal 62 against 60 °C.
- The threshold works only at its knife-edge: written as "below" instead of "at or below", nothing moves.
- The physics supports a higher threshold: the cited page says crystallisation needs 80 to 130 °C.
- Fix: base the threshold on 80 °C (crystallisation onset) and reword the reason as "no crystallisation; slight
  ageing". Show the four knife-edge verdicts in SPOT-CHECK, or judge them "on the line".

**S05. Two rules answer one question: is a treatment below the glass transition an anneal?**
- The core reads polymers.csv's threshold (PLA only, 55 °C). The estimate (`observations.js:154`) reads each
  material's own Tg, for every polymer.
- For an amorphous polymer, the core says the treatment is an anneal (D158: "relieves stress and is one"). The
  estimate uses the same value as the as-printed one.
- Since C29(b), 8 annealed-only glassy products show zero-width heat estimates equal to their annealed value,
  precision "good". Examples: Bambu PETG HF (G022-01) 69 (68.9 to 69.1) °C; Bambu ABS-GF (G028-01) 99 (98.9 to 99.1) °C.
  None existed at ef96fe00.
- Annealed values used as the as-printed kind: 24 heat, 14 stiffness, 36 strength and 11 elongation estimates.
- PC FR (G036-01, 112 to 114 °C) is marked "likely" for Warm on this basis. The answer is right, the precision is not.
- This breaks D157's "one relation, one place". ARCHITECTURE's sentence ("a treatment at or below its glass
  transition being no annealing") describes neither rule exactly.
- Fix: both stages read one rule from polymers.csv. A sub-Tg annealed value of an amorphous polymer enters with a
  spread of a few °C (the code comment's own "a few degrees").

**S06. C36's accepted density miss: its own control contradicts the explanation given.**
- The density "PLA filled" stratum missed the design's 85 % rule: 12 of 15 within the 95 % range (80 %). The
  explanation blames PET's three fills changing column.
- The back-test's own control contradicts that: keying the column on the polymer (PLA's fills move, PET's stay) "showed
  the same miss". The cause is a grid jump in density's spreads (filler-by-matrix 0.20 → 0.02, a material's own
  deviation 0.048 → 0.096), whatever moves.
- Statistically, 12 of 15 against a 95 % claim has p ≈ 0.04, and 9 of 15 against 80 % has p ≈ 0.06. The stratum was
  already weak before (10/15, 13/15).
- Impact is small, and I agree the miss is acceptable. Only 9 filled-PLA products carry a density estimate; their
  ranges straddle 1250 kg/m³, and none decides a group.
- But D158 says "every headline holds", stage-4.md says "a little less often", and OPEN-PROBLEMS has no entry.
- Fix: say "a grid jump of density's spreads" and record the stratum in OPEN-PROBLEMS.

**S07. Marginal results are reported as passes, with no case margins.**
- C26, grade rule: 73 of 80 = 91.2 %, two cases from failing the 90 % floor.
- C29, crystalline filled: 48 of 52 = 92.3 %.
- C28: a share of 0.46 on 4 crossings. The rule needs 20, so the cap is a default, not a finding.
- D165 says stiffness and stretch "chances hold", but no bin between 0.4 and 0.6 had 20 cases for either. Stiffness
  bins cover 0.0 to 0.3 and 0.7 to 0.9; stretch only 0.0 and 0.9. Strength has no `reliabilityLimits`, so it was
  never tested.
- Fix: give each pass its case margin. D165 says the 50 % region is untested.

**S08. D163 row 3a (glassy HDT ≤ Tg + 15 °C) passes partly by construction.**
- `class-limits-lomo.mjs:32-33` reads only comparable values, which excludes values flagged physically implausible.
- 13 glassy HDT values are so flagged, many by PR12, which is the same Tg + 15 °C rule (D149): G001-01 80, G001-18 80,
  G018-04 91, G001-98 80, G001-99 80, G001-178 89, G152-02 80, G113-02 89 and 95, G024-18 93, G035-01 117 and 112 °C.
- Fix: rerun with the flagged values included, or state that the pass is conditional on PR12.

## Misleading

**S09. Do PET's fills crystallise in the print? D158 and D163 disagree.**
- D158 puts PET-CF and PET-GF in the glassy column with the glassy product spread (4 °C). D163 calls Flashforge
  PET-GF's 140.5 °C over Tg "as printed, a crystallised bar".
- PET-fill products themselves span 74 to 200 °C, with treatment not stated.
- Shipped PET-fill heat ranges are about ±8 °C: Spectrum PET CF15 81 to 96 °C; SIDDAMENT PET CF 77 to 94 °C, which is
  "unlikely" for Outdoor.
- Fix: PET becomes "prints amorphous unless fibre-filled", as PPA is, or report a PET-fill stratum before trusting the
  narrow ranges.

**S10. The census never records the "likely" mark.**
- `decision-census.mjs` stores verdict and group only. So none of stage 4's diffs shows a "likely" mark appearing or
  going: not S01's PET-CF, not S02's FLEX HARD and MEDIUM.
- "No verdict changed; 210 product answers moved" is therefore incomplete.
- Fix: add `likely` to each product's and material's census string.

**S11. The annealed heat offset (−77 °C) rests on 3 pairs from one maker.**
- The pairs are Siraya Tech PPA-CF, PPA-CF Core and PPA-GF (+101 to +108 °C). The offset is applied to every
  crystalline filled matrix: PA6, PA12, PAHT and PPS.
- A hot-printed PA or PPS part is already crystalline, so annealing adds far less to it.
- D162 reads as if the offset were broadly learned.
- Fix: say so in D162 and OPEN-PROBLEMS, and widen the spread or limit the offset by matrix.

## Stale doc

- **S12.** D157 to D165 still say "Number provisional until the stage merges", and so does stage-4.md line 25. Stage 4
  merged, and stage 3d took D166 after them (dd16db5a). Fix: remove the sentences.
- **S13.** D58's Status lists D157, D158, D159, D161 and D162, but not D160 (C28 changed `grades.js`, `bounds.js` and
  `floors.js`). Fix: add D160.
- **S14.** stage-4.md §1 and D158 say all 361 values were treated at 55 °C. The 60 values of PLA Tough+ (G006-01)
  and PLA Translucent (G007-01) were treated at 50 °C; backtests §1 has this right. Fix: "50 or 55 °C".
- **S15.** OPEN-PROBLEMS has no entry for S06's stratum, S01 or S11. Fix: add them under estimates.
- **S16.** D161's plain words say "78 and 92 %". The merged build gives 77.5 and 91.2 % on 80 hidden values. Fix:
  quote the merged numbers.
- **S17.** ARCHITECTURE's stage-4 sentence on sub-glass-transition treatment (see S05). Fix: describe the one rule
  that results.

## Cosmetic

- **S18.** D163 calls Flashforge PET-GF's value "as printed", but its sheet does not state the treatment (G068-01:
  not-stated).
- **S19.** The grade calibration refits no conversions (D81), so C27's cross-product contrast still includes the hidden
  product; the effect is negligible, one product in one of 53 medians. The design also asked for a one-material unit
  test of the contrast hold-out, and no test in `test/` covers `acrossProducts`.

## What is sound

- **4a is truly zero-difference.** The test fixture equals the configuration at 3ff53cba, the commit before 4a, block
  for block; only the wet block's `_comment` moved into the rows. CONVERSION-DRIFT is an error and checks the 9 rows
  that have a band, one-sided for floors and ceilings. The other 45 rows have no band and are not checked, as D157 says.
- **C29's numbers reproduce exactly from my build.**
  - Grade: 423 hidden, 79.9 / 94.8 %, scales 1.33 / 1.60.
  - By matrix: glassy 346 (79.2 / 94.8 %), crystalline filled 52 (84.6 / 92.3 %), crystalline unfilled 25 (80 / 100 %).
  - Folds 97.2, 93.2, 92.9, 94.4 and 93.8 %; median plausible width 22 °C; precision 396 good, 49 fair, 21 poor.
  - Material: 72 hidden, 80.6 / 95.8 %, width 13.4 °C.
- **C29's hold-out is honest.** It hides by formulation, so twins are hidden together, and it refits the per-matrix
  spreads per fold. The hidden products have their own related heat values about as often (76 %) as the shipped ones
  (72 %).
- **C26 reproduces.** Grade rule 77.5 / 91.2 %, material rule 82.5 / 93.8 % (80 hidden), the old rule 68.8 / 81.3 %.
- **The heat estimates make physical sense by polymer.** Median centres: PLA 55 °C, PETG 72, ABS 92, ASA 94, PC 125.
  PA6 (171, likely width 44) and PP (77, width 54) are wide, as a crystallising matrix should be.
- **None of the spot-checked "likely" marks for PLA, PETG or ABS in Warm or Outdoor is wrong**, apart from S03 (one
  ABS) and S05 (a precision problem, not a wrong answer).
- **The PLA threshold is data, not a code branch**, and only PLA has one. It touches only Bambu Lab's 361 values; no
  PLA treatment lies between 55 and 90 °C, and 56 PLA anneals of unstated temperature stay annealed. It is unit-tested.
  All 14 verdicts against main are those 15 products, as stated.
- **The PLA products whose own HDT (80 to 91 °C) earlier rounds flagged implausible** (m24, m104, m439) are now
  consistently "unlikely" as printed.
- **C28 is scoped as stated.** Strength is uncapped; only 298 stiffness estimates carry a ceiling, and none sits above
  it. C27's offsets and measures match the back-test.
- **The five crystallising variants keep their guide reading**, and D164's eight densities are as listed.
