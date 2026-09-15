# Response: filtering, estimates and data audit (2026-09-15)

Every fix below is one commit on `data/csv-source` after `ef26807`, each with `npm run verify` green. Data changed
only through guarded, re-runnable migrations against re-read, hash-matched sources (m19 to m22, m24 to m26); each
finding's outcome is in [findings.csv](findings.csv). Decisions D54 to D57 record the reasons.

## Commits

| Commit | What it does | Findings |
|---|---|---|
| `c50a00e` | Post-processing and specimen form become declared states. Annealed values are no longer averaged with as-printed ones, and film or filament values never bound a printed headline. Source-label directions count as unknown. The headline check refuses moulded, film, filament, conditioned and annealed selections. m19 labels HT-PLA-GF's as-printed block | C-01, C-02, C-03, C-05, C-14, B-01, D-01, D-02 |
| `6cc6074` | m20 (333 records, labels only): 18 Z directions, 14 more directions, Bambu and IPCON printed specimens and annealing sentences, PPA's annealed values. m21: PPA's as-printed 103 °C (now its headline) and 106 °C, iSANMATE PLA-GF's tensile strength, Kimya's live source and hash. Lint MEAS-LOCATOR-DIRECTION. Re-pointing a headline is an edit, not a deletion | B-03, B-05, B-06, C-07, D-03, D-04, D-05, D-07, D-08 |
| `7bc880d` | Implied bounds come only from printed specimens at their published value, and they trim the material's own estimate | B-02, B-16 |
| `740216b` | Printing physics in the estimate model: `printsAmorphous`, Vicat caps, water uptake, rule-of-mixtures density, Shore A/D, no elastomer HDT estimate or yield conversions, a cap on unknown-direction offsets | B-04, B-07, B-08, B-13, B-14, B-15, B-17 |
| `2ace029` | "Published value (physically implausible)": m24 flags ten faithful but impossible values, and three headlines become estimates. Lint MEAS-PHYSICS-* | B-09, B-10 |
| `2044c94` | m25: HyperLite PP becomes PP Lightweight, and PP describes iSANMATE PP. m26: PC-GF headlined from BASF's printed data; PA6 Neat declared a compound; identity notes shown in the drawer. A material's only evidence is never down-weighted | D-10, B-11, B-18 |
| `6518292` | A mean ± band judged on its mean, with "close to the limit" (D54). No rounding across a threshold. Assumptions marked and kept off the front. Links validated. `hashchange` handled | C-04, A-01, A-02, A-03, A-05, A-06, A-07 |
| `2ac1cd2` | Per-record build findings reviewed in `audit:data`, 29 accepted with reasons. psi and kgf/cm² loads read; "45/45" mapped; bounds and uncertainties reconciled | C-06, C-08, C-10, C-12 |
| `fd58bb3` | "Replaced by" in the property registry; m22 gives the Izod test one name; V002055's source error noted | C-16, C-17, D-06 |
| `534c9ca` | `npm run ui:fuzz` (2,000 rendered scenarios) is the last step of `verify`. The chart resizes through one listener, which fixes the leak without the purge race the fuzz found | A-04, workstream A |
| docs | D54 to D57; AGENTS.md recipes (flag an implausible value, replace a property, accept a build finding); DATA-MODEL, PIPELINE and INTERFACE; this audit | |
| docs, completed | README (what the code enforces, commands, layout), docs/README, ARCHITECTURE (module and script maps), PIPELINE (stages 2 to 5, validation levels, audit review), DATA-MODEL (counts, headline states, conversions, calibration, estimate coverage, constraint states, known limits), INTERFACE (rail, states, Ashby), D48 and D53 amendments, and this audit's bugs in the shipped-bugs table | |

## What changed for a reader

**Headlines.** 14 changed. The rest of the 612 measured and estimated headlines keep their values; 87 estimate
ranges moved.

| Material | Headline | Before | Now | Why |
|---|---|---|---|---|
| PLA | Heat deflection | 80 °C | est. 52–67 °C | 80 °C needs a crystallised bar the sheet does not state (flagged) |
| PC | Heat deflection | 112 °C | est. 109–141 °C | 112 °C at 0.45 MPa is below the sheet's 117 °C at 1.8 MPa (flagged) |
| TPU for AMS | Stiffness | 1.19 GPa | est. 15–161 MPa | 1.19 GPa contradicts its 68D hardness and 650 % elongation (flagged) |
| TPU | Heat deflection | est. 61–94 °C | not applicable | No ISO 75 bar at 26 MPa |
| PPA | Heat deflection | 131 °C | 103 °C | 131 °C is the annealed value |
| PC-GF | All five | 40 MPa, 9.5 %, 3 estimates | 1176 kg/m³, 2.665 GPa, 36.1 MPa, 2.4 %, 134 °C | BASF's printed, dry data set |
| PP | Density, stiffness, elongation, HDT | HyperLite's 810, 1.65, 13, 94 | iSANMATE's 890; est. 0.8–2.4 GPa; est. 14–118 %; 92 °C (load unstated) | HyperLite is its own material, PP Lightweight |

**Template candidates.**

| Setting | Before | After | Why |
|---|---|---|---|
| Strict | 93 | 96 | Gains PLA Basic and PLA Basic Gradient (means meet the lightweight requirement), PC-GF twice and PA612-CF. Loses PLA and PC (heat values flagged) |
| Explore with estimates | 208 | 199 | Screened: PET, CoPE, TPU and PLA from warm environments; PLA Marble, PLA Wood, PETG-CF, ASA and OBC from the lightweight structure; PC-GF, PA6-GF, PA612 and PET from the outdoor structural part |
| Explore without estimates | | | Keeps what is unknown, as designed: TPU for AMS's stiffness and PP's are now unknown rather than measured |

`build/snapshot/` and `build/snapshot/ui/` in each commit show every row.

**The page.**
- A value close to a requirement's threshold shows the digits that keep it on its own side, or "≈" when a published
  spread contains the threshold.
- "About this entry" explains compounds and replaced products.
- A hand-edited link says what it left out.
- A pasted link applies at once.
- The chart no longer slows the page down: 800 redraws hold 17 MB.

## Verification

| | Before (`ef26807`) | After |
|---|---|---|
| Tests | 196 | 211 |
| `verify` | 36 s | 3 min 44 s (the fuzz takes 176 s) |
| Rendered scenarios in `verify` | 14 fixed views | 14 views + 2,000 random scenarios, 0 violations |
| Page/engine agreement | 3,000 scenarios, 0 disagreements, 7 interface defects | 3,000 (seed 1) + 1,200 (seed 3) + 2,000 (verify), 0 violations |
| Build warnings | 8 aggregated | 5, every record reviewed (29 acceptances with reasons) |
| Lint findings accepted | 23 | 37 (14 new physics and direction findings, each with a reason) |
| Estimate calibration (plausible coverage) | 95.1–96.2 % | 95.3–96.6 % |
| D48 screening certification | unchanged | unchanged (this-grade HDT: 3 above, 0 below of 52) |
| Estimates below a bound their own data prove | 58 | 0 |
| Estimates that may screen | 92 | 97 |

## Not done, and why

- **B-19, D-09.** These need more measured data, not code; the candidate public sheets are listed in
  [open-items.md](sources/open-items.md).
- **B-12, density basis.** A new column would be a schema change with no source-backed values yet. The estimate
  bounds allow porosity instead.
- **C-09, calibration.** Refitting hyperparameters per held-out case would multiply build time for a small effect.
  It is documented instead.
- **D-07, Kimya direction.** Kimya PEBA-S's "Printing Direction XY" is a processing setting, and its tests cite
  ISO 37, which uses die-cut dumbbells, so its rows keep direction and specimen unstated.
- **Tm − 20 °C cap (B-15).** The back-test rejected it: PVDF publishes 158 °C, 12 °C under its melting point.
- **Shared CDP plumbing.** The planned factoring of the Chrome/CDP code shared by the probe and the fuzz is not done.
  Both scripts are self-contained and tested by `verify`.
- **Agents E and F.** Two fixer agents stopped on the account's spend limit before starting; the lead implemented
  their work.

*Since then (2026-09-15, [architecture review](../2026-09-15-architecture-review/RESPONSE.md)):* C-09 is closed, hold-outs
refit spreads and conversions without the material they hide (D59); the shared Chrome plumbing is `scripts/lib/cdp.mjs`.
B-12, B-19 and D-09 still need data.

