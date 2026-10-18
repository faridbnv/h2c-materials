# First-time user: the six templates and the two switches

> **Historical record** (2026-10-18): a first-time user's trial of release 9ca94d31fc5d, done without reading the repository.

> **In short.** I could tell within a minute that this is a filament shortlister for our H2C: you set requirements, it shows
> what passes, and every number links back to a data sheet. The leave-out results were short and mostly made sense. The
> problems started when I switched on the materials that could not be checked and the estimates. The estimates switch
> left out TPU on a 5 GPa stiffness requirement. It removed the elastomers on HDT, a property the tool itself says does not
> apply to them. It also put PLA, PC and PETG in front of me as "Estimated candidates to verify" for an outdoor bracket
> and a gasket. A material counts as unresolved, not failed, as long as one of its products cannot be checked. So
> "Insufficient evidence" holds materials whose own medians plainly fail. I would use the PASS list, after opening each
> material's Products tab, as a starting shortlist. I would not use the estimated and insufficient sections to make a decision.

How I tested: headless Chrome at 1400×1000, the page opened from the file, and buttons clicked by their visible text. I
read the visible text and the hover titles. Each template was run three ways: as it loads (Leave out), with **Include**
(estimates on, which is how the switch was already set), and with **Include** and the estimates switch turned off. The
page came up in its dark theme.

## First impressions

The page opens on "Start from a typical part, or set your own requirements in Filters." and below it "A template fills
in the controls, each editable, and decides nothing. All six ask for a build material the H2C prints." Six cards follow,
then "152 materials, 135 within H2C capability · 14,822 measurements, each traceable to its source" and "No material is
ranked on a number nobody measured: a property never published shows as a gap, not a guess." That is a good start. I
knew what it was for and that it would not make up numbers.

The top bar was harder to read. It says "Materials that could not be checked [Leave out | Include]" and then shows a
switch, **Let estimates rule out materials**, that looks **on** but greyed, with "Works only when the materials that
could not be checked are included" under it. I could not tell whether estimates were on or off. When I picked Include,
the switch was already on, so the task "turn on the option that lets estimates rule out" had nothing to do. I tested it
by turning it off.

Another small surprise: after I had chosen Include, picking a template set the mode back to **Leave out** without saying so.

## 1. Outdoor structural part

Card: "A bracket that lives outside. HDT at 0.45 MPa at least 100 °C, tensile modulus at least 3 GPa, density at most
1500 kg/m³." The template added three more chips (H2C limits, H2C capability, build material) and also "Reported, not
required: Price at most 100 CAD/kg", which the card had not mentioned.

**What I expected:** glass- or carbon-filled ASA, PC, PA, PET and PPS, with PLA, PETG and the elastomers all out.

**Leave out:** "7 of the 152 materials meet these requirements", with "101 more could not be checked and are left out".
The status bar showed "PASS 7 · UNKNOWN 101 · FAIL 44". The PASS list was ASA-CF (2 of 17 products), PA6-CF, PA6-GF,
PET-CF, PP-CF, PP-GF and PPA-GF. That is a credible list. Two things helped: "Not checked by this template: UV and
weathering", which is honest and matters for an outdoor part, and "Allow annealing: 4 more pass" (PAHT-CF, PA12-CF,
PET-GF, PPS-CF). I would still want a warning on PA6 for an outdoor part, since the values are judged dry.

**Include, estimates on:** "101 more could not be checked, listed flagged, except 14 screened out". The sections were
**Supported candidates (7)**, **Estimated candidates to verify (6)** and **Insufficient evidence (81) — included in counts
and exports**. The SCREENED 14 chip showed a fourth section, **Excluded / screened (14)**.

- **PLA is an "Estimated candidate to verify"** for a 100 °C outdoor bracket ([screenshot 1](first-time-user/1-outdoor-pla-estimated-candidate.png)).
  Its row shows HDT median 55 °C and "0 of 195 products … 96 products fail at least one requirement; 99 remain
  unresolved". I only found the reason in the drawer: "Shown for its closest product, colorFabb PLA-HP", which has HDT
  135 °C and modulus 4.24 GPa published but no density ("Estimated 1,190 to 1,300 kg/m³ … plausible, but never enough to
  pass"). So the whole family "PLA" is promoted because one heat-resistant grade has no published density. A density of
  1.24 g/cm³ is not in doubt for any PLA.
- **ABS-GF, PA12-CF, PA12-GF, PAHT-CF and PPA-CF** are also estimated candidates. Those I would accept as things to check.
- **The 14 screened are the 13 elastomers plus OBC.** That is the right outcome, but the reason given is odd
  ([screenshot 2](first-time-user/2-outdoor-tpc-screened-drawer.png)). TPC's "screened" mark says "Screened by an
  estimate: HDT at 0.45 MPa at least 100 °C; HDT at 0.45 MPa at least 100 °C; …" (the same requirement ten times),
  ending "Not a failure; not measured." The drawer for the same material says HDT is "Not applicable: HDT is a
  rigid-bar test … an elastomer has no meaningful HDT". About modulus it says: "Estimated 0.0184 to 0.0866 GPa would fail,
  but only 25 back-tested cases; 194 are needed to show at 98% confidence that at most 2% of true values lie above an end;
  independent evaluation unavailable without a calibrated bound". Key properties on the same drawer show a published
  modulus of 0.048 GPa. So TPC was ruled out on the property that does not apply, and not on the one that plainly fails.
- **The insufficient-evidence list included PCL**, which has a published HDT of 57 °C and melts at about 60 °C, and SBC, a
  styrenic elastomer. Neither was screened.

**Estimates off:** the estimated section disappeared and its six materials went back into "Insufficient evidence (101)".
Switching **off** the switch called "rule out" took PLA **out** of a highlighted section. So the switch also promotes
materials, which its name never says.

**Could I tell why each material was in its section?** Only for PASS, and in the drawer. For the others the reasons were
spread across a hover title, a drawer about one "closest product" and the Products tab.

## 2. Indoor prototype

Card: "A shape you want to hold in your hand tomorrow. Any build material; price at most 45 CAD/kg is reported, not
required." The only real requirements are the H2C limits, H2C capability and build material.

**Leave out:** 87 pass, "39 more could not be checked and are left out", FAIL 26. **Include** gave "Supported candidates
(87)" and "Insufficient evidence (39)". The estimates switch changed nothing here: no estimated section, no screened
chip, and the same counts on or off. That is reasonable, since there is no number for an estimate to judge.

What I noticed:
- The 26 failures (PEEK, PEI, PEKK, PSU, PPSU, the sintering filaments, PVA, BVOH and the supports) appear under a
  heading **"Excluded / screened (26)"**. These are plain FAILs, not screened, but they share the screened heading.
- "Insufficient evidence" here means "print settings incomplete" (nGen, PVDF, POM, PC-ESD …), not missing properties.
  The label made me think of mechanical data.
- TPU, TPC, PEBA, PCL and PBAT are all "supported" for a prototype. That is fair, given "any build material".

This is the template I understood best and would trust most: it is basically a printability filter.

## 3. Lightweight structure

Card: "A drone arm or a moving part. Density at most 1250 kg/m³ and tensile modulus at least 2.5 GPa."

**Leave out:** 15 pass, 82 unknown, 55 fail. The PASS list includes PLA (16 of 195), PETG (1 of 73, whose median modulus
is 1.68 GPa), PLA Aero, PA6-CF, PP-CF, PPA and others. Product-level passing explains PETG, but that would surprise a
colleague who only reads the row.

**Include, estimates on:** Supported 15, **Estimated candidates to verify (18)**, Insufficient evidence (64). **Nothing
was screened**: no SCREENED chip, and "97 shown" both on and off.
- The estimated candidates include **PLA Glow, PLA Silk, PLA Marble, PLA Galaxy, PLA Sparkle, PLA Wood and ABS**. PLA
  Glow's published modulus is "2.01 · 1.99–2.03 · 2", and the drawer says "Estimated 2.64 to 4.11 GPa … Published 3.5
  GPa, but its test conditions do not qualify." PLA Silk is 1.83 median, range 1.15–2.4. From experience I expect silk and
  glow PLAs to be *less* stiff than plain PLA, so seeing them promoted made me doubt the estimates.
- **TPU 85A to harder than 95A, TPS, TPC and TPV stay in "Insufficient evidence"** against a 2.5 GPa modulus requirement,
  with estimates switched on and allowed to rule out.

**Estimates off:** Supported 15, Insufficient 82. Here the switch named "rule out" ruled out nothing and only added a
list of candidates.

## 4. Warm environment

Card: "A part near a motor or in a car. HDT at 0.45 MPa at least 80 °C."

**Leave out:** 39 pass, 84 unknown, 29 fail. **Include, estimates on:** "84 more could not be checked, listed flagged,
except 16 screened out". That left Supported 39, no estimated section, Insufficient evidence 68 and 16 screened (every
elastomer plus OBC, each "Screened by an estimate: HDT at 0.45 MPa at least 80 °C … Not a failure; not measured.").
**Estimates off:** Supported 39 and Insufficient 84 ("123 shown").

Surprises:
- **PBAT passes.** Its only product, "Flashforge Flexible", has a published modulus of 0.006 GPa and "Published 90 °C (ISO
  75)". The tool tells me HDT means nothing below about 225 MPa modulus and screens TPU on that basis, yet it accepts the
  HDT of a 6 MPa flexible material as a PASS.
- **PPS-CF (HDT median 251 °C), PPS-GF (239 °C), PVDF (158 °C) and PA12 (123 °C) are "Insufficient evidence".** The PPS-CF
  drawer explains it well: "Chamber ≤ 65 °C: Needs 60–90 °C; the H2C reaches only up to 65 °C, part of that window".
  So the evidence is plentiful. The open question is printability, and the label points me the wrong way.
- PLA is a supported candidate ("PASS 7 of 195 products"). That is fine once I open Products, but the row still shows a
  55 °C median.

## 5. High-stiffness fixture

Card: "A jig or a fixture. Tensile modulus at least 5 GPa; HDT at least 90 °C is reported, not required."

**Leave out:** 5 pass (PAHT-CF, PETG-CF 1 of 24, PP-CF, PP-GF, PPA-GF), 104 unknown, 43 fail. "Allow annealing: 5 more
pass". **Include, estimates on:** Supported 5, Estimated 9 (ASA-CF, PA12-CF, PA6-CE, PA6-CF, PA6-GF, PET-CF, PLA-CF,
PPA-CF, PPS-CF, a sensible list of fibre-filled grades to check), Insufficient evidence 94, and **SCREENED 1, which is
PA612** ("Screened by an estimate: Tensile modulus (XY) at least 5 GPa"). **Estimates off:** 5 and 104.

This was the preset that lost my trust ([screenshot 3](first-time-user/3-stiffness-tpu-not-ruled-out.png)). With
"Let estimates rule out materials" on:
- "TPU 95A class": modulus "0.027 · 0.006–0.065 · 9", labelled "Insufficient evidence: 8 products fail at least one
  requirement; 19 remain unresolved".
- "TPU harder than 95A": the estimate is printed in the row, "~0.01–0.41†", labelled "Insufficient evidence".
- "TPU-CF": "~0.02–0.76†", labelled "Insufficient evidence".

The help popup says: "With this on, an estimate excludes a material only when its whole plausible range misses the
requirement." Every range I could see misses 5 GPa by an order of magnitude, and only PA612 went. PLA (median 2.53 GPa)
and PETG (1.68 GPa) also sit in "Insufficient evidence" rather than anywhere that says "very unlikely".

## 6. Flexible component

Card: "A gasket, a strap or a phone case. Elongation at break at least 100 %." The page adds "Not checked by this template:
Recovery, softness and sealing", which is the right caveat.

**Leave out:** 8 pass, 102 unknown, 42 fail. The PASS list is OBC, PA6/66 (1 of 7), PBAT, PCL, PP (2 of 12), TPU 85A
(1 of 18), TPU 90A (5 of 12) and TPU 95A (10 of 27). Elongation above 100 % is not the same as flexible: PP and nylon
neck. The rail even says "Not a measure of toughness or recovery". Even so, a rigid nylon in a gasket list surprised me.

**Include, estimates on:** Supported 8, **Estimated candidates to verify (10)**, Insufficient evidence 90, and SCREENED 2
(PA612-GF and PA66-CF, by an elongation estimate). **Estimates off:** 8 and 102.
- **PC and PETG are estimated candidates for a gasket** ([screenshot 4](first-time-user/4-flexible-pc-estimated-candidate.png)).
  PC's row reads "Elongation 7 · 3.2–25 · 12" and "15 products fail at least one requirement". PETG's median is 8.4 %.
  The PETG drawer: "Shown for its closest product, Spectrum THE FILAMENT PETG Lite … Estimated 163 to 241 % … Published
  160 %, but its test conditions do not qualify." So one unusual product drags in its whole family.
- Meanwhile **TPS, TPV, TPC-ESD, TPU-LW, TPU-CF and the maker-undisclosed TPE**, the materials I would actually shortlist,
  sit in "Insufficient evidence", below PC.

## The labels and switches

| Label on the page | What I thought it meant | What it seemed to do | Clarity (1–5) |
|---|---|---|---|
| "Materials that could not be checked: Leave out / Include" | Show or hide the materials with missing data | Did that, and its hover title is good ("…flagged, with what is missing for each"). Picking a template resets it to Leave out, and the UNKNOWN chip shows the same rows without it | 3 |
| "Let estimates rule out materials" | Use predicted values to drop materials that obviously miss a requirement | Dropped elastomers on HDT (a property the tool calls not applicable), left TPU in on a 5 GPa modulus requirement, ruled out nothing for Lightweight, **and** created the "Estimated candidates to verify" section. Looks on even while it is disabled | 2 |
| "Supported candidates" | Materials whose published data meets everything | Right, at material level ("2 of 17 products"). "Supported" is ambiguous in a tool that also has "Support / Interface" materials and a "Build material (not a support)" chip | 3 |
| "Estimated candidates to verify" | Materials the model predicts will pass | "Predicted centres meet the missing numerical requirements" is jargon, and the choice follows one favourable product while the row shows failing medians (PLA, PC, PETG) | 2 |
| "Insufficient evidence (N) — included in counts and exports" | No data to judge | Lumps clear mismatches (TPU for stiffness), well-documented materials stuck on a chamber window (PPS-CF) and true gaps. "Included in counts" is not what the headline count does | 2 |
| "screened" / "Excluded / screened" | Removed by an estimate | Its own tooltip says "Not a failure; not measured", and the same heading holds plain FAILs ("Excluded / screened (26)" in Indoor) | 2 |
| Status bar "Show in table: PASS · UNKNOWN · FAIL · SCREENED" | Counts, and filters for the table | Works as filters, but "UNKNOWN 101" includes the 14 screened while the header says "94 shown PASS + UNKNOWN" | 3 |
| "N of the 152 materials meet these requirements" | The answer | Clear and stable across modes | 4 |
| "0 of 195 products" / "none judged" | Product-level tally | Its hover explains it well ("None passes, but not every product fails, so the material is unresolved, not failed"), but only on hover | 3 |

## Top confusions, ranked

1. **"Rule out" does not rule out the obvious.** The help says "an estimate excludes a material only when its whole
   plausible range misses the requirement". Yet for a 5 GPa fixture, "TPU harder than 95A" shows "~0.01–0.41†" and stays
   "Insufficient evidence", and only PA612 is screened.
2. **The same switch promotes materials.** Turning it on creates "Estimated candidates to verify", with "Predicted centres
   meet the missing numerical requirements. Still UNKNOWN; confirm before choosing.", and puts PLA in front of me for a
   100 °C outdoor bracket and PC and PETG for a gasket. Nothing in the name or the help popup mentions this.
3. **Screened for a reason the tool says does not apply.** "Screened by an estimate: HDT at 0.45 MPa at least 100 °C; HDT
   at 0.45 MPa at least 100 °C; … Not a failure; not measured." sits beside a drawer that calls an elastomer's HDT "Not
   applicable", and beside a modulus estimate it declines to use: "would fail, but only 25 back-tested cases; 194 are
   needed…".
4. **A material almost never FAILs.** "None passes, but not every product fails, so the material is unresolved, not
   failed." So PLA (HDT 55 °C) is never a FAIL for 100 °C, and the "Insufficient evidence" bucket ends up with 80–100
   materials in every numeric preset. I cannot scan a list that large.
5. **Two "show unknowns" controls that disagree.** In Leave out mode the UNKNOWN chip lists all of them, yet the subtitle
   still says "101 more could not be checked and are left out" above "108 shown PASS + UNKNOWN · 7 candidates, 101 could not
   be checked" ([screenshot 5](first-time-user/5-leave-out-yet-listed.png)).
6. **The switch's state.** On landing it shows "on" but greyed, with "Works only when the materials that could not be
   checked are included". A template click also silently returns the mode to Leave out.
7. **Counts that do not reconcile.** "Why excluded" says "HDT … could not check 85 (22 of them excluded by an estimate)"
   and "Tensile modulus … (4 of them excluded by an estimate)", but SCREENED is 14
   ([screenshot 6](first-time-user/6-why-excluded-tab.png)). That tab was otherwise the clearest thing on the page:
   "removing it would bring back 18 candidates" is exactly what an engineer wants.
8. **Physical contradictions in the PASS list.** PBAT at 0.006 GPa passes "HDT at least 80 °C", while PPS-CF, at 251 °C, is
   "Insufficient evidence" because of its chamber window.
9. **Small things.** "1 products fail at least one requirement" and "1 products have no complete qualifying evidence" (the
   grammar); PA612, PA612-GF and PA66-CF rows that read just "UNKNOWN" with no tally; TPC described as "A commercial
   variant whose filler is not disclosed. A flexible elastomer."

**Would I trust it?** I would trust the PASS rows in Leave out mode as a shortlist to verify product by product. The
drawer's per-requirement PASS lines with a source link are what earn that. I would turn Include and the estimates off
before sharing a result with the team, because in the presets I tried they added more wrong-looking candidates than useful ones.
