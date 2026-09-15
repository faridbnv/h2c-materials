# Filtering, estimates and data: an independent audit of the verification round (2026-09-15)

**Branch:** `data/csv-source`, baseline `ef26807` (the end of the 2026-09-14 transfer verification).
**Raised by:** the tool's owner.
**Questions:** the last version resolved issues of data cleanliness and accuracy, of estimates and engineering
judgement, and of filtering, rulings and leaks. Test those claims, with a few thousand random filters checked in the
app's output under every setting (table and plot, Strict and Explore, with and without estimates). Is the app's
judgement physically and engineeringly reliable? Review the logic, the pipeline and the data mappings, document it,
and fix what remains.

## Summary

- **The claimed fixes hold where they were tested.** Over 3,000 random scenarios the rendered page agreed with the
  selection engine on every table row, verdict, count, chip, plot point, estimate envelope, Pareto front and shared
  link, in all four Strict/Explore/estimates settings (26,198 readings, 3.35 million checks). The structural
  invariants and the leak sweep of D48 still pass, and every re-read value matched its source.
- **What they had not tested was the physics and the labels under the numbers.** The engine did what its rules said,
  but some rules, and some labels the rules read, were wrong:
  - 18 Z results coded as unknown taught the estimate model that "direction unknown" sits far below XY. It inflated
    estimates 1.35 to 1.6 times: PA6 strength was estimated at 88 MPa against its sheet's 78.
  - Annealed and as-printed values of one grade were averaged as repeats: PET-GF15's 81.6 and 133.7 °C became one
    precise 107.65 °C.
  - PPA's heat headline was the annealed 131 °C; its as-printed 103 °C had never been transcribed.
  - Oriented-film strengths (ASTM D882) counted as lower bounds on printed strength, so PLA stayed a candidate for
    140 MPa.
  - Published values that physics rules out decided requirements. TPU for AMS's 1.19 GPa modulus on a 68D elastomer
    passed Strict for rigid-part stiffness; PC's HDT at 0.45 MPa sat below its HDT at 1.8 MPa.
  - The model treated PET, PPA and BVOH as crystallised bars, though they print amorphous, and estimated heat
    deflection for TPU, which cannot hold an ISO 75 bar.
- **Interface defects sat around a sound core.** The table rounded values across a threshold (50.99 shown "51" while
  passing "< 51"). Scenario assumptions read as "Published" and joined the Pareto front. Chart redraws leaked 569 MB
  over 800 renders. A link pasted into an open tab did nothing.
- **55 findings in four workstreams**, one row each in [findings.csv](findings.csv): 44 fixed, 2 partly fixed,
  1 resolved by re-reading, 4 open and 4 notes. The owner ruled on each change of policy, and the fixes are in
  [RESPONSE.md](RESPONSE.md).

## 1. Method

Four independent workstreams ran against the baseline build, each writing only to its own folder here. The lead
reproduced each finding, then fixed defects one commit at a time on a separate worktree, with `npm run verify` green at every commit.
Changes of engineering policy went to the owner first.

| Workstream | Question | Evidence | Findings |
|---|---|---|---|
| A. Rendered-app fuzz | Does what a reader sees agree with the engine, in every setting? | [ui-fuzz/](ui-fuzz/): headless Chrome over CDP; seeded scenarios with every requirement kind and operator, thresholds at the evidence itself, assumptions, searches, templates; 8 invariants | A-01 to A-08 |
| B. Physics oracle | Are data, estimates and screens physically reliable? | [physics/](physics/): envelopes for printed parts of 41 identities (an oracle only, never data), 2,240 selections at envelope edges, ~20 PDFs re-read | B-01 to B-20 |
| C. Pipeline review | Do the mappers, headline selection, rules and contract do what they claim? | [pipeline/](pipeline/): every raw wording through its mapper ([mapper-table.csv](pipeline/mapper-table.csv)), repro scripts | C-01 to C-17 |
| D. Sources | The five open items of 2026-09-14, and every flagged value re-read | [sources/](sources/): hash-checked PDFs, [rereads.csv](sources/rereads.csv), [open-items.md](sources/open-items.md) | D-01 to D-10 |

A finding's class is *defect* (fixed directly), *policy* (the owner decides), *suspect* (a source to re-read) or *note*.

## 2. Did the previous round's fixes hold?

| Claim (2026-09-14) | Tested by | Result |
|---|---|---|
| Structural invariants of the engine hold | A: 3,000 scenarios through the page; `test/screening.test.js` | Hold. The page and the engine never disagreed |
| No material stays a candidate its defended range wholly fails (D48) | Leak sweep in tests; B's independent envelope sweep | Holds against the defended range. But the range itself was wrong where its bounds were (film values, value + SD) and where the model's physics was (§3.2) |
| Conditioned nylon converts to dry; one-sided bounds limit; variants do not pull their family (D53) | B, C | Partly. One wet offset served every polymer (PA6 is ~2x, PA12 ~1x); annealing was not a state at all |
| m10 to m18 transcribed the sheets | D re-read 60+ rows; B ~20 PDFs | Every value matches. Labels did not: directions (18 Z, 14 others), specimen and annealing coding on 11 Bambu sheets, PPA and HT-PLA-GF states |
| Uncertified screening classes wait for data | D-09 | Confirmed: this-material HDT is 2 cases short; candidate public sheets are listed |

## 3. Findings

### 3.1 Interface (A)

- **A-01, rounding across a threshold.** `fmtNumber` rounds for display, while the engine decides on the exact value.
  This produced 300 contradictions in 174,159 checks, such as PC's price of 50.99 shown as "51" and passing "price < 51".
- **A-02, A-03, assumptions.** An assumption was labelled "Published" and drawn as a measured point that could sit on
  the Pareto front. A `*` assumption overrode "not applicable": TPU for AMS passed a 100 °C heat requirement in
  Strict. An assumption without a unit read "undefined".
- **A-04, memory.** Every chart redraw left a Plotly plot and a window resize listener alive: 1,408 listeners and a
  569 MB heap after 800 renders.
- **A-05, A-06, links.** Links that the rail cannot produce loaded silently. Two requirements on one property showed
  as one control, and editing it dropped both. An unknown property made every material "not published", and an empty
  list failed every material.
- **A-07.** Without a `hashchange` listener, a new link pasted into an open tab changed nothing.
- **A-08.** Apart from these, there was no disagreement anywhere between the page and the engine.

### 3.2 Screening and bounds (B, C)

- **C-02, B-01, film bounds.** Implied bounds excluded moulded values but not an ASTM D882 film (110 and 145 MPa) or a
  filament strand. PLA was never screened for 70 to 140 MPa, though its printed range is 47 to 68.
- **B-02, other non-printed bounds.** Bounds also came from unstated specimens, often moulded on filament sheets
  (Spectrum PA12-CF 125 MPa, where printed PA12-CF is 70 to 90), and from value + SD (30 ± 23 % read as "at least 53 %").
- **B-16.** Estimates ranged below values the material's own data prove: 58 plausible ranges, for example PA12's heat
  deflection from 57 °C against its own 84.3 °C at 1.8 MPa.
- **C-04, ± bands.** A published ± band was a hard interval. "35 ± 4 MPa" never passed 33 MPa, and 128 of 362 headlines
  decided nothing near their own value.

### 3.3 Estimate physics (B, C)

- **C-01, B-07, annealing.** Annealing was not a state. The PET-GF, PLA-GF and PPS-GF pairs were averaged as repeats
  and flagged as conflicts, and they fed the load-gap calibration.
- **B-07, crystallisation.** PET, PPA, BVOH and PVA were converted as crystallised bars. PET's heat deflection
  estimate reached 132 °C against its own Vicat of 65.9 °C; BVOH's reached 158 °C against its Vicat of 90.
- **B-03, B-04, C-03, direction.** The unknown-direction conversions were learned from 18 mis-coded Z rows (offsets
  +0.31 to +0.46 against documented 0 to 0.1). Source-label directions also merged into XY, which the Method forbids.
- **B-08, elastomer heat deflection.** TPU's heat deflection was estimated (70 to 85 °C, allowed to screen) from a
  sheet value that physics rules out. ISO 75 ends at 0.2 % outer-fibre strain, which needs about 225 MPa; this TPU
  is 26 MPa.
- **B-13, density.** Density had no mixing structure: PA12 was estimated at 1040 to 1180 kg/m³ against its own 1010.
- **B-14, moisture.** One conditioned-to-dry offset served every polymer.
- **B-17, hardness.** One hardness offset served both the Shore A and Shore D relations, and yield converted to an
  elastomer's ultimate strength.
- **Found while fixing.** A material's only evidence was down-weighted as a conflict: PP's own 0.39 GPa gave way to
  filled and variant PP, giving 1.5 to 4.5 GPa.

### 3.4 Data labels and values (B, C, D)

Every row changed here was re-read against its hash-matched source.

- **Directions:** 18 rows printed "Z" were coded unknown (IPCON PPA, PPA GF and PPS GF, B-03). A further 14 rows had
  the wrong direction, on Flashforge's X-Y sheet and on sheets that print none (C-07, D-08).
- **Bambu sheets:** 11 print their specimen printing conditions and annealing sentence but were coded "not published"
  (B-06). Among them, PET-CF's 205 °C headline is an annealed value.
- **Annealing states:** PPA's 131 °C and 133 °C are the "(annealed)" values, and the as-printed 103 °C and 106 °C were
  never entered (B-05). HT-PLA-GF's as-printed block was unlabelled (D-02).
- **Values never transcribed:** iSANMATE PLA-GF's tensile strength of 46 to 56 MPa (D-05).
- **Kimya PEBA-S:** the recorded URL is gone and no hash was ever recorded, although the 2026-09-14 report said one
  was. A live copy of the same edition matches all 13 values (D-07).
- **Implausible but faithful values:** PC's HDT pair (112 °C at 0.45 MPa, 117 °C at 1.8 MPa); TPU for AMS's 1190 and
  600 MPa moduli; three PA12 sheets with a template Tg of 158 °C; an 80 °C HDT for a PLA not stated to be crystallised
  (B-09, B-10).
- **Compounds speaking for their polymer:**
  - HyperLite PP (0.75–0.81 g/cm³, 13 %) was PP's headline (D-10).
  - Spectrum "PA6 Neat" (1.25 g/cm³) set PA6's (B-11).
  - PC-GF's headlines came from a sheet stating no specimen, with 9.5 % elongation where BASF's printed value is 2.4 % (B-18).
- **One test, two names:** "Izod strength" and "Izod impact strength" (C-17, D-06).

### 3.5 Pipeline and tooling (C)

- **C-05, headline guard.** The headline check did not refuse moulded, film, conditioned or annealed selections. It
  is latent: nothing violated it.
- **C-08, load parser.** A text naming both loads resolved to 0.45 MPa, and psi and kgf/cm² were not read. Also
  latent.
- **C-10, unreviewed findings.** Outliers, imprecise estimates, family-order breaks and unstated loads were summed
  into warnings, so a new one never failed `verify`.
- **C-12, reconciliation.** Upper bounds and uncertainties were never reconciled with their conversion factor.
- **C-06.** The direction "45/45" had no mapping.
- **C-14.** `related.intervals` was written and never read, with a comment promising a veto the engine no longer makes.
- **Found while fixing.** The no-deletion guard refused the AGENTS.md recipe "replace the old value row", because a
  headline row has no key. A 14-view interface probe could not catch the chart race that the fuzz caught in 187 of
  200 scenarios.

## 4. Owner rulings (2026-09-15)

| Question | Ruling |
|---|---|
| Physics corrections to the estimate model (crystallisation and heat caps, moisture per polymer, Shore A/D, density mixing, direction sign, no elastomer heat deflection) | Implement all, and anything else that makes the tool more reliable for engineering decisions |
| Screening vetoes and ranges | Tighten both: vetoes only from printed values at the published value; proven bounds trim estimates |
| Measured mean ± band | Judge the mean; the band is a caveat |
| Implausible published values and identities | Record and flag implausible outliers, and exclude or down-weight them by the most reliable route; split HyperLite PP; prefer printed dry headlines; mark compounds |

## 5. What remains open

- **B-19, thin identities.** Where a polymer has little of its own data, screens rest on family-driven ranges. PP's
  elongation estimate (14 to 118 %) excludes its own 460 %, which states no direction or specimen and so bounds
  nothing. Only more data fixes this.
- **D-09, uncertified classes.** This-material heat deflection needs 2 more held cases to certify. Public sheets for
  ABS, ASA, PC, PC FR, PET-CF, PETG-CF and PAHT-CF would add them ([open-items.md](sources/open-items.md), §3).
- **B-12, density basis.** Whether a density is filament, printed part or resin is not recorded. The estimate bounds
  allow 5 % porosity instead.
- **C-09, calibration.** Model hyperparameters are fitted with the hidden headline present, so calibration is mildly
  optimistic. The effect is small; it is documented, not refitted.
- **Out of scope:** PEEK, PEKK, PEI, PSU and PPSU still carry unstated heat loads (accepted per record with that
  reason).
- **Oracle limits:** B's envelopes were written from handbook knowledge and can be narrower than a real product. PP-CF
  prints 78 MPa at break, above its 20 to 75 MPa envelope. The checker also counts values it does not know are
  flagged, and matches "anneal" in notes that deny it ([physics-findings-after.csv](physics/physics-findings-after.csv)).

## 6. How to reproduce

```bash
npm run build && npm run verify                               # includes the fuzz: 2,000 scenarios, 0 violations
npm run ui:fuzz -- --n 3000 --seed 1                          # the audit's run
node docs/audits/2026-09-15-filtering-estimates-data/physics/physics-check.mjs    # the physics oracle
node docs/audits/2026-09-15-filtering-estimates-data/pipeline/repro/engine-veto.mjs
npm run trace -- V002224                                      # PPA's as-printed heat deflection, back to its page
```
