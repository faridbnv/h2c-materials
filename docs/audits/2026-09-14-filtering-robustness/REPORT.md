# Filtering robustness

**Date:** 2026-09-14
**Raised by:** the tool's owner, from a shared scenario link
**Questions:** why is PLA Lite a candidate for heat resistance of at least 100 °C? Then, the bigger
one: is the filtering logic robust, or does every combination of filters need checking by hand for
materials that leak through?
**Status:** the reported bug and a second one found beside it are fixed and committed. The robustness
question is answered, and one ruling is **open**; see "Open decision" below.

## 1. The report

The scenario was the "Outdoor structural part" template in Explore ("Keep it, flagged") with Estimates
on. It requires a build material with heat resistance of at least 100 °C, stiffness of at least 3 GPa
and density of at most 1500 kg/m³. PLA Lite appeared among the candidates.

[reproduce-pla-lite.mjs](reproduce-pla-lite.mjs) runs that scenario through the engine and prints why
each kept material is kept. Before the fix it reported, in substance:

```
PLA Lite  hdt045 >= 100: INDETERMINATE — Published 53 °C, but the source states the standard without the load
          tensileModulusXY >= 3: UNKNOWN — Estimated 2.18 to 3.59 GPa (plausibly 2.03 to 3.85); possible
PA66      tensileModulusXY >= 3: UNKNOWN — Estimated 1.52 to 2.57 GPa would fail, but its own
          measurement V002035 could meet it, so it is not screened
```

## 2. The core issue: an unstated test load was read as open-ended

PLA Lite's heat deflection of 53 °C comes from eSUN's product page, which names neither the standard
nor the load. The HDT headline is defined at 0.45 MPa, and the systematic data audit (SD-08) ruled that
a value at an unknown load can neither pass nor fail a heat requirement. The reason is sound: 0.45 MPa is the
lowest standard load, so the 0.45 MPa value is at least the published value.

The ruling stopped there. It treated "at least 53 °C" as unbounded, so "53 °C or anything above" was
never shown to miss 100 °C. The result was INDETERMINATE, and Explore keeps INDETERMINATE materials.

The value is bounded. A source that omits the load measured at 0.45 MPa or at 1.8 MPa. At 0.45 MPa the
value is the value; at 1.8 MPa the 0.45 MPa value is higher by a gap that depends on the polymer's
matrix, and that gap is measured in this database:

| Matrix | Grades publishing both loads | Mean gap, 1.8 → 0.45 MPa | 95% gap |
|---|---:|---:|---:|
| Amorphous (PLA, PETG, ABS, PC …) | 34 | 4.3 °C | about 10 °C |
| Fibre-filled semicrystalline | 9 | 25.5 °C | about 37 °C |
| Unfilled semicrystalline | 2 | 28 °C, mostly the documented prior | about 67 °C |

The gap is each conversion's offset and spread, fitted on every build (meta.estimateModel in `dist/db.json`). So PLA Lite's 53 °C means 53 to 62.7 °C at 0.45 MPa, which cannot meet 100 °C.

### Fix

- `build/src/estimates.js` attaches `hdt045.loadBracket` to every unstated-load heat headline: from the
  value to the value plus the 95% gap of its matrix.
- `app/js/engine/constraints.js` compares a requirement with that bracket. The verdict stays
  INDETERMINATE: a load-stated measurement is the only thing that passes or fails. The bracket's top
  comes from other grades' paired data, which is inference. So, as for an estimate (D43), a requirement
  the whole bracket fails screens the material out only in Explore with Estimates on. The reason reads:
  "Published 53 °C, but the source states the standard without the load, so at 0.45 MPa it is 53 to
  62.7 °C, which cannot meet this requirement. Screened out; the load is not stated". The SCREENED chip
  brings it back.
- Strict leaves the material out as before. Explore with Estimates off keeps it flagged as before.
- The table legend now says an unstated load never passes a heat requirement, and one far above it
  screens the material out with estimates on.

## 3. Found beside it: a resin reference vetoed a screen

PA66's stiffness estimate is 1.52 to 2.57 GPa (plausibly 1.41 to 2.76), which cannot meet 3 GPa. It
was not screened, because of the veto rule: an estimate may not screen a material if one of the
material's own measurements, in any direction or at any endpoint, could meet the requirement.

V002035 is not a PA66 filament. It is the moulded Zytel 101L resin value of 3.1 GPa, recorded
on 2026-09-13 as a resin reference to anchor PA66's estimates (audit 2026-09-13-estimate-evidence). The
estimate already carries it through the documented moulded-to-printed conversion.

**Fix:** in `build/src/compile.js`, a raw-material value no longer enters the related intervals that
the veto reads. It is still listed as related evidence in the drawer.

## 4. Verification of the fixes

- `test/constraints.test.js`: a requirement above the bracket screens the material but never fails
  it; inside the bracket it stays visible; nothing is screened without estimates; it never passes.
- `test/database.test.js`: an in-scope heat headline carries a bracket exactly when its load is
  unstated, and PLA Lite's runs from 53 °C to between 55 and 75 °C. PLA Lite is currently the only such
  in-scope material; the re-read 3DXTECH sheets stated their loads, and no related interval is a raw-material value.
- The reported link, opened in a browser: PLA Lite and PA66 are no longer candidates, and SCREENED
  reads 6 (it was 4).
- Build 0 errors, 131 tests pass, the data audit reports no errors.

## 5. The bigger question: is the filtering robust?

It was checked in bulk, not one combination at a time. The two scripts are in this folder.

### 5.1 Structural invariants: they hold

[invariants.mjs](invariants.mjs) generates 4,000 random scenarios of one to four requirements of
every kind: numeric thresholds on all six headlines, the nozzle, bed, chamber, scope, abrasion,
buyability and drying gates, facets, environment categories and evidence-quality criteria. It runs each
in Strict, in Explore without estimates, and in Explore with estimates, and checks:

- a PASS rests only on evidence, never on an estimate, a heat-load bracket or "not applicable";
- no material is PASS and screened at once, and no FAIL is eligible;
- Strict never shows a material Explore does not, and estimates on never shows one estimates off does not;
- adding a mandatory requirement never adds a material, in any mode;
- tightening a numeric threshold never adds a material;
- a tracked, non-mandatory requirement never removes a material.

Result: **all hold** on the fixed build. The aggregation (four states per requirement, the
verdict describing the evidence, the policy deciding eligibility) is sound. Combining filters does not
produce contradictory results.

### 5.2 Leaks: the real weakness

[leak-sweep.mjs](leak-sweep.mjs) runs every single numeric requirement: five headlines, both
directions, a threshold at every boundary of the evidence and between each pair. For each material
still shown in Explore with Estimates on, it asks whether all the evidence the database holds for that
headline wholly fails the requirement. That evidence is the measured interval, the bracket for an
unstated load, the plausible estimate range, or "not applicable". A material shown despite that is a
leak.

| | Before the fixes (`a7916e3`) | After |
|---|---:|---:|
| Shown (material, requirement) pairs checked | 100,498 | 100,508 |
| Leaks | 2,090 | 2,055 |
| From "estimate may not screen" | 1,264 | 1,266 |
| From "vetoed by a raw related value" | 826 | 789 |

The before column understates the problem. The sweep's evidence range for an unstated-load headline
is the bracket, which did not exist before the fix, so PLA Lite's leak was invisible to it. A sweep
only sees leaks relative to the evidence it can express, which is part of the lesson below.

**The pattern behind every leak.** In Explore, an unsettled result keeps the material unless a
specific rule screens it. Screening exists as separate branches: a failing estimate, "not
applicable", and now the heat-load bracket. Any evidence without its own branch leaks by default. PLA
Lite was exactly that. The 2,055 that remain come from two rules written for the first, crude estimate
models (D42 and earlier), before the calibrated model of D43 existed:

1. **The veto: 789 leaks.** Any measurement of the material, in any direction, at any endpoint, on any
   grade, compared raw, blocks a screen. Examples:
   - PLA stays in "strength at least 75 MPa" because the iSANMATE PLA data sheet's thin-film (ASTM D882)
     value is 110.3 MPa, though printed PLA is estimated plausibly 45–70 MPa.
   - PA12-CF stays in high-strength searches because Spectrum's PA12-CF break value of 125 MPa in an
     unstated direction vetoes.
   
   The D43 estimate already contains those measurements, each converted to the headline (a break strength or flexural value through its conversion; a film value such as
   iSANMATE's is excluded), so the raw veto
   double-counts them without the conversion.
2. **Family-only estimates may not screen: 1,266 leaks.** An estimate with no evidence of the material
   itself, for a polymer measured on fewer than two products, may never screen, however far outside
   its range a requirement lies. Examples:
   - PA66-CF stays in "stiffness at most 2 GPa" although it is estimated plausibly 3.7–7.7 GPa.
   - TPC / TPEE and OBC stay in elongation and stiffness searches far outside their ranges.
   
   This restriction descends from the owner's D42 choice, "own grades and strong peers only".

## 6. Recommendation and open decision

Proposed on 2026-09-14, not implemented:

1. **Drop the raw veto.** The calibrated estimate already weighs each related measurement correctly.
2. **Let family-only estimates screen, conditionally.** First measure their coverage on their own
   terms: hide *all* of a material's evidence (not just its headline, as the current calibration does)
   and predict it from the family model alone. Allow screening only if the plausible range still holds
   about 95%.
3. **One screening rule instead of branches.** Every unsettled numeric result carries a single
   "defensible range" (measured interval, unstated-load bracket, plausible estimate range, or not
   applicable), and a material is screened when that range wholly fails. A new kind of evidence then
   cannot leak for lack of its own branch.
4. **Make the checks permanent.** Turn [invariants.mjs](invariants.mjs) and
   [leak-sweep.mjs](leak-sweep.mjs) into tests: the invariants must hold and the sweep must report zero
   leaks. Any future data or rule change that lets a wrong material through then fails the build.

**Open decision.** Item 2 relaxes the screening restriction the owner chose under D42. The owner was
asked on 2026-09-14 whether to implement all four, or 1, 3 and 4 while keeping family-only estimates
unable to screen. No ruling yet; the owner asked to record the discussion and commit only the fixes
above.

Things to settle alongside it:

- **Gates stay open by design.** Chamber bands and estimated nozzle or bed windows decide nothing (D6,
  D34). A material with an unknown gate, no buy offer, or no environment record is a true unknown, and
  keeping it in Explore is the intended behaviour, not a leak.
- **Joint implausibility is not modelled.** Each requirement is judged alone. A material near the edge
  of two plausible ranges at once is kept, though meeting both may be unlikely. Not proposed for
  change.
- **Out-of-scope materials keep unstated loads without a bracket.** PEEK, PEKK, PEI, PSU and PPSU are
  outside the estimate model; their 3DXTECH data sheets probably state 0.45 MPa as the in-scope
  3DXTECH sheets did, but they were not re-read.

## 7. How to pick this up again

```bash
npm run build
node docs/audits/2026-09-14-filtering-robustness/reproduce-pla-lite.mjs   # the reported scenario
node docs/audits/2026-09-14-filtering-robustness/invariants.mjs           # must print "All structural invariants hold."
node docs/audits/2026-09-14-filtering-robustness/leak-sweep.mjs           # leaks by rule; the target is 0
```

Related decisions: D26 (verdict describes evidence, policy decides eligibility), D42 (the screening
restriction), D43 (the calibrated estimate model), and the systematic data audit's SD-08 (unstated
loads).
