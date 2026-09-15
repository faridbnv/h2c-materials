# Workstream B: physics and engineering plausibility

Baseline `ef26807` (branch `data/csv-source`), `dist/db.json` as built. Read-only: nothing in `data/`, `build/`,
`app/`, `scripts/`, `test/` or `dist/` was changed.

## Files

| File | What it is |
|---|---|
| `envelopes.json` | The oracle: wide engineering envelopes for printed FDM parts (XY, dry, as printed) per identity and reinforcement, plus modifiers (foaming, lightweight, particle-filled, silk, ESD, dense filler, FR, tough) and specimen adjustments (moulded, Z, conditioned, flexural, 1.8 MPa HDT). Nothing from it enters the data. |
| `physics-check.mjs` | `node docs/audits/2026-09-15-filtering-estimates-data/physics/physics-check.mjs` (about 1.5 s). Reads `dist/db.json`, `data/tables/measurements.csv`, `build/mappings/estimate-model.json` and the envelopes. Prints a tally and writes `physics-findings.csv`. |
| `physics-findings.csv` | Raw machine output: 541 rows, one per check hit (`check, level, severity, material, measurementIds, value, expected, sourceId, locator, detail`). |
| `findings.csv` | 20 root causes (B-01 to B-20), each with evidence, repro and fix. |

## Method

1. **Envelopes.** For each identity in the estimate model (PLA, PETG, PCTG, CPE/CoPE/nGen, PET, ABS, ASA, HIPS, PC,
   PC-ABS, PC-PBT, PA6, PA66, PA6/66, CoPA, PA12, PA612, PAHT, PPA, PP, PE, PPS, PVDF, POM, PVA, BVOH, PVB, TPU, TPE,
   PEBA, TPC, OBC, and the excluded PEEK, PEKK, PEI, PSU, PESU, PPSU), and for CF/GF where the family has them:
   density, tensile modulus, ultimate strength, elongation at break, HDT at 0.45 MPa (as printed, and annealed for
   polymers that crystallise when annealed), Tg, Tm. "PA" is the union of PA6, PA66, PA12 and PA612.
   References: Mark, *Physical Properties of Polymers Handbook* (2007); Brandrup/Immergut, *Polymer Handbook*
   (1999); CAMPUS-type resin data from the named resin families; FDM filament sheet families (Bambu Lab, Polymaker,
   Prusament, BASF Ultrafuse, 3DXTECH, Spectrum, Stratasys); FDM anisotropy literature (Ahn et al. 2002; Popescu et
   al. 2018; Brenken et al. 2018); Gent (1958); Qi, Joyce and Boyce (2003). The ranges come from these sources as I
   know them. I did not fetch them on the web. They are meant to be wide enough that a value outside one is worth a look.
2. **Measurement checks (A).** Each numeric, non-quarantined measurement on an active grade is compared with its
   envelope, moved to its own semantics: specimen (printed / moulded / not stated = union), direction (Z, or
   unstated = union of XY and Z), moisture (conditioned polyamide vs other), annealing (HDT), load (1.8 MPa or unstated
   lowers the floor by the matrix's load gap), flexural vs tensile, break/yield vs ultimate. Checks on the same grade:
   HDT0.45 < HDT1.8 (A2), HDT above Tm or far above Tg (A3), HDT on a matrix too soft to carry the load (A3b), yield or break above
   ultimate, yield strain above break (A4), conditioned above dry (A5), Z above XY (A6), notched >= unnotched (A7),
   flexural/tensile modulus ratio outside 0.5 to 2 (A8), strength/modulus strain and break strain below sigma/E (A9),
   filled density below the unfilled base (A10), filled elongation above the base (A11), impact unit slips (A12),
   raw x factor != normalized (A13), a direction or annealing written in the locator but not coded (A14, A14b, A15).
   A4, A5, A7, A8, A12 and A13 ran over 3, 56, 85, 170, 38 and 1917 candidates and found nothing.
3. **Headline checks (B).** Headline vs envelope (B1); headline from a moulded, not-stated, conditioned or annealed
   specimen, and whether a printed dry as-printed alternative exists (B2); headline vs same-grade values (B3).
4. **Estimate checks (C).** Likely range or centre outside the envelope, and plausible tails beyond it (C1). Wrong ordering
   between a plain unfilled material and its CF/GF siblings: stiffness, density, elongation, and HDT for semicrystalline
   matrices (C2). Elastomer modulus against Gent/Qi hardness, and Shore order (C2b, C2c). Likely width above the
   `precision.fair` threshold (C3). Estimates where physics says not applicable (C4). Ranges below the material's own
   implied bounds (C5). HDT above the material's own Vicat or near Tm (C6). Slow crystallisers converted as crystallised
   bars (C7). Implied bounds that are not lower bounds of a printed, dry, as-printed bar (C8). Screen ranges narrow
   against physics with thin own evidence (C9).
5. **Non-circular leak sweep (D).** For each of density, tensileModulusXY, tensileStrengthXY, elongationXY and hdt045,
   and each operator, thresholds at every material's envelope edges (and +/-2 %). Each threshold runs `runSelection` on
   all non-family, non-excluded materials in Explore with estimates (`unknownPolicy exploration, useEstimates true`)
   and in Strict: 2240 selections. D1: kept in Explore although the envelope wholly fails. Rows with no value or a
   one-sided bound are counted as policy. D2: PASS in Strict although the envelope wholly fails. D3: removed in Explore
   although the envelope wholly meets the requirement. The envelope is independent of the build's back-test, so the
   sweep is not circular.
6. **Re-reading sources.** For the leads that mattered, the cached PDFs in `.cache/sources/` were read with pdfjs
   (read-only helper in the scratchpad; the core is `getDocument` → `getTextContent` → regex). Verified: B-PC-TDS HDT
   117/112, B-pet-cf-TDS HDT 182/205 and its annealing sentence, B-pps-cf-TDS HDT 235/264 "not annealed",
   X-CarbonX-CF-PA12 Tg 158, X-ECOMAX-PLA HDT 80, I-TPU-TDS modulus 26 MPa and HDT 74/49, B-tpu-for-ams 1190 MPa,
   Spectrum HDPE (1.1 g/cm³, 3.5 GPa, 80 HRM), Spectrum PA6 Neat (1.25 g/cm³), Spectrum PA12-CF15 (125 MPa, 8 GPa),
   S-PPA-TDS ("103 °C; 131 °C (annealed)", "Tensile Strength Z"), B-pa6-gf 1.14 g/cm³ and 2850 MPa, S-PCGF-TDS-1 9.5 %,
   PolyMide PA6-GF conditioned Z 2593 > XY 2053, I-PP-TDS 13.9/13.9, and 16 Bambu sheets for their specimen sentence.
   Nearly every flagged value is transcribed faithfully. The physics problem is in the source, in the coded condition
   (direction, annealing, specimen) or in the model.

## Review of `estimate-model.json` and `estimates.js`

Offsets are headline minus related value (log scale, °C for HDT); "fitted" is `meta.estimateModel` after refinement.

| Conversion | Documented | Fitted | Physics verdict |
|---|---|---|---|
| density moulded | -0.02 | (0 pairs) | Right sign: filament/printed density a few % below resin. Printed-part density with porosity can be 3-8 % lower (B-12). |
| modulus flexural XY | 0 | -0.017 (72) | Correct. |
| modulus flexural Z / tensile Z | +0.40 / +0.34 | +0.27 / +0.24 | Right sign. Unfilled Z stiffness is ~0.8-1.0 of XY, fibre-filled much lower; the mean is fine, the spread carries it. |
| modulus tensile / flexural unk | 0 / 0 | **+0.31 / +0.44** | **Wrong sign after fitting.** Learned from Z rows coded unknown (B-03, B-04). |
| modulus tensile moulded | -0.15 | (0) | Right for unfilled; CF prints can exceed moulded (fibre alignment), within sd 0.25. |
| hardness | -0.8 | -0.71, sd 0.885 (5) | Gent and Qi formulas are implemented correctly. A single offset for A and D is unjustified, and the fit includes V000775 (B-09, B-17). |
| strength break XY / yield XY | +0.05 / +0.02 | (0) | Right for rigid thermoplastics. Wrong for strain-hardening elastomers (TPU yield ≪ break) (B-17). |
| strength ultimate Z | +0.48 | +0.38 (56) | Right. |
| strength flexural XY | -0.50 | -0.55 (53) | Right (flexural 1.5-1.8x tensile for printed bars). |
| strength flexural unk / ultimate unk | -0.30 / +0.10 | **-0.06 / +0.44** | **Wrong after fitting** (B-04). |
| strength moulded (ultimate/yield/break) | -0.25/-0.25/-0.20 | | Right (printed 70-85 % of moulded). |
| elongation break Z | +0.9 | +0.62 (51) | Right. |
| elongation break unk | 0 | **+0.46** | Wrong (B-04). |
| elongation break moulded | -1.4 | -1.76 (1) | Right sign and magnitude (printed strain is a fraction of moulded). |
| elongation yield XY/Z/unk | +0.9 | +1.07 (1) | Right as a mean. For brittle PLA/filled grades yield ≈ break; the spread 0.9 covers it. |
| HDT 1.8 semi-filled | +24 | +26.4 (12) | Right. |
| HDT 1.8 semi-unfilled | +30 sd 20 | +30.8 (3) | Right for fast crystallisers. **Wrong for PET/PPS/PPA/BVOH/PVA as printed**, which need the amorphous gap (B-07). Moulded PA6 gaps reach 100 °C+; printed ones are smaller. |
| HDT 1.8 amorphous | +8 | +5.2 (38) | Right (PC 138/128, ABS 98/88, PLA 55/52). |
| HDT 1.8 elastomer | +10 | +13.8 (1) | Unjustified: an elastomer has no HDT (B-08). |
| HDT unstated | +5 sd 15 | | Acceptable. The unstated-load bracket (gap + z·sd per matrix) handles the 1.8 MPa case correctly in direction. |
| Tg amorphous | -3 | -2.8 (40) | Right (HDT0.45 ≈ Tg − 3 to 10). |
| Vicat amorphous / semi-filled / semi-unfilled | -8 / -25 / -45 | -4.3 / -25.8 / -39 | Signs right. For unfilled matrices Vicat should also be a soft upper bound, not only a weak observation (B-07, B-15). |
| Tm semi-filled | -38 | -35.6 (13) | Right for crystallised fibre-filled bars; for slow crystallisers it assumes annealing (B-07). |
| HDT moulded semicrystalline / amorphous | -30 / -3 | (0) | Signs right. |
| wet modulus / strength / elongation | +0.25 / +0.12 / -0.4 | tensile Z wet +0.71 | Signs right. Magnitudes too small for PA6-type polyamides and too large for PA12 or non-hygroscopic polymers (B-14). |
| bounds.hdtAboveMelting (Tm, sd 6) | | | Right as a cap for fibre-filled bars. Too loose for unfilled ones (B-15). |
| bounds.amorphousAboveTg (+10 / +20, sd 8) | | | Right for as-printed amorphous bars. PLA is declared amorphous while PET (the same slow-crystallising behaviour) is semicrystalline, which is inconsistent (B-07). |
| bounds.meltingPointSlope (ref 200, fibre 1, unfilled 0.6) | | | A reasonable mean trend for fast crystallisers. The model learns deviations, and the fixed spread keeps the sign. |
| bounds.hdtFloor 45 sd 5 | | | Reasonable. |
| identities tm | | | PA6 222, PA66 262, PA12 178, PA612 218, PP 165, PE 132, POM 175, PVDF 170, PPS 283, PET 252 are right. PPA 290 is high for Bambu/Polymaker/IPCON PPA, which publish 246-258 °C (own values override it). PAHT 225 is an assumption (undisclosed). PVA 220 and BVOH 190 are plausible but grade-dependent. |
| notApplicable.elastomerHdt | | | The exception "shown where own sources publish one" admits a physically impossible TPU HDT (B-08). |
| impliedBounds | | | The logic is right (ultimate ≥ yield, break; XY ≥ any direction; HDT0.45 ≥ HDT1.8). The evidence filter is not: it admits film, not-stated specimens and interval tops (B-01, B-02). For elongation, conditioned values are not lower bounds of dry ones (none occur today). An annealed HDT1.8 is not a lower bound of an as-printed HDT0.45 (none coded today; PPA's is uncoded, B-05). |
| plausibleValues | | | Right as outer physical limits. |
| screening back-test | | | Sound for classes with measured analogues. It cannot detect physics bias for identities with none (OBC, PE, PA66-CF, elastomer HDT) (B-19). |

**Known overlaps with the lead's fixes (separate worktree).** The film/filament implied-bound fix covers B-01 and the
film part of B-16. The annealed-vs-as-printed averaging fix covers the averaging half of B-07. Still open on
this baseline: bounds from not-stated specimens and interval tops (B-02), the matrix class for slow crystallisers,
the Vicat and Tm caps (B-07, B-15), and uncoded annealing in the data (B-05, B-06).

## Results in numbers (`physics-findings.csv`)

- Measurement level: 31 outside envelope (3 high: the PA12 Tg 158 template value on three 3DXTECH sheets), 1 HDT0.45 < HDT1.8,
  2 HDT on a soft matrix, 1 PLA HDT above Tg, 5 Z > XY, 3 break strain < sigma/E, 15 filled density < base,
  18 Z rows coded unknown, 6 ambiguous X-Z, 1 annealing in notes only.
- Headline level: 17 outside envelope, 9 headlines from a not-stated/annealed specimen while a printed dry value exists,
  96 further headlines on not-stated/conditioned/annealed specimens with no alternative, 11 filled-vs-unfilled ordering inversions in data.
- Estimate level: 7 centres outside envelope, 8 tails, 14 over-wide likely ranges, 1 not-applicable estimate (TPU HDT),
  2 estimate ordering inversions, 2 modulus-vs-Shore contradictions, 7 likely ranges below an own implied bound, 63
  plausible ranges extending below one, 3 HDT estimates above own Vicat + 15, 1 within 15 °C of Tm, 2 slow-crystalliser conversions,
  84 implied bounds that are not printed/dry bounds, 9 narrow screens.
- Sweep: D2 Strict PASS against physics 15, D1 Explore kept against physics 73 (18 medium) plus 5 by policy,
  D3 removed although physics passes 25 (0 by an estimate).

## What I could and could not judge

- Could: internal consistency of each grade's values, envelope plausibility, model conversions' signs and magnitudes,
  the engine's behaviour against an independent oracle, and (for about 20 leads) whether a value matches its cached PDF.
- Could not: whether a manufacturer's claim is true for its product. TPU for AMS 1190 MPa, PPS-CF 264 °C "not
  annealed", ECOMAX PLA HDT 80 °C, PETG Basic 2.78 GPa and the Spectrum HDPE/PA6 compounds are all printed in the source,
  so only the manufacturer can settle them. The envelopes were not checked on the web. Density basis (filament,
  printed part, resin) is rarely stated, so B-12 is a judgement. Impact tests, fatigue, Rockwell and melt flow were
  checked only for unit slips and notch order. Sources without a cached PDF were not re-read.

## Measurements that need a source re-read or a manufacturer query

V000775, V000776 (B-tpu-for-ams-TDS p. 2: 1190/600 MPa vs 68D) · V000765, V000766 (I-TPU-TDS: HDT on a 26 MPa TPU) ·
V000970, V001013, V001206 (3DXTECH PA12 Tg 158 °C) · V000682, V000683, V000678 (B-PC-TDS: HDT inversion, Tm of PC) ·
V000008 (X-ECOMAX-PLA-TDS-v3: HDT 80 °C unannealed) · V001358, V001359 (B-pps-cf-TDS: 235/264 °C "not annealed") ·
V001378 (S-PPSGF-TDS-0: 241 °C, condition not stated) · V001973, V001974, V001975 (R-ERYONE-PETG-GF-TDS X-Z) ·
V002205, V002206, V002208 (ASA-GF X-Z; the locator also notes swapped labels) · V001191, V001192 (PolyMide PA6-GF conditioned Z > XY) ·
V000742 (S-PCGF-TDS-1: 9.5 % for PC-GF) · V001516, V001519, V001520 (Spectrum HDPE) · V000917 (Spectrum PA6 Neat 1.25 g/cm³) ·
V002054 / V001498 (I-PP-TDS 13.9 MPa printed twice) · V000594 (CarbonX ABS-CF HDT 76 °C, below ABS).
Coding fixes already confirmed against the PDFs (no re-read needed): the 18 Z rows of B-03, V001288/V001289 (PPA
annealed) and the Bambu specimen statements of B-06.
