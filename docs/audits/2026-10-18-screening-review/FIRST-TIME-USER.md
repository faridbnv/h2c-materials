# First-time user: the six templates and the two switches

> **Historical record** (2026-10-18): a first-time user's trial of release 9ca94d31fc5d, done without reading the repository.

> **In short.** I tried the six presets on the landing page as an engineer who had never seen the tool.
>
> - **What worked.** Within a minute I knew this is a filament shortlister for our H2C: you set requirements, it shows
>   what passes, and every number links back to a data sheet. With the default "Leave out", the results were short and
>   mostly made sense.
> - **What confused me.** Switching on "Include" with the estimates switch. The switch named "rule out" did not rule
>   out TPU for a 5 GPa stiffness part. It hid the elastomers on HDT, a property the tool itself says does not apply to
>   them. It put PLA forward for an outdoor bracket, and PC and PETG for a gasket. And "Insufficient evidence" holds
>   materials whose own medians plainly fail, because a material stays "unresolved, not failed" while one product
>   cannot be checked.
> - **Would I trust it?** The PASS list, yes, as a starting shortlist after opening each material's Products tab. The
>   estimated and insufficient sections, no.

## What worked, and what I would trust

The page explains itself well where it sticks to published data.

- **The purpose is clear at once.** The landing text says what the tool is for and that it will not make up numbers.
- **The Leave out results are credible.** The Outdoor PASS list (ASA-CF, PA6-CF, PA6-GF, PET-CF, PP-CF, PP-GF, PPA-GF)
  is what an engineer would expect.
- **The honest caveats help.** "Not checked by this template: UV and weathering" (Outdoor) and "Not checked by this
  template: Recovery, softness and sealing" (Flexible) name what the preset leaves out.
- **The annealing hint helps.** "Allow annealing: 4 more pass" (Outdoor) shows what a change of state would buy.
- **"Why the rest were excluded" is the clearest view on the page.** "removing it would bring back 18 candidates" is
  exactly what an engineer wants to know.
- **The Indoor prototype is the preset I understood best.** It is basically a printability filter.

I would trust the PASS rows in Leave out mode as a shortlist to verify product by product. The drawer's
per-requirement PASS lines, each with a source link, are what earn that. I would turn Include and the estimates off
before sharing a result with the team. In the presets I tried, they added more wrong-looking candidates than useful
ones.

## How I tested

I used headless Chrome at 1400×1000, opened the page from the file, and clicked buttons by their visible text. I read
the visible text and the hover titles. I ran each preset three ways: as it loads (Leave out), with **Include** (the
estimates switch was already on), and with **Include** and the estimates switch turned off. The page came up in its
dark theme.

## First impressions

The landing page was clear. The top bar was not.

The page opens on "Start from a typical part, or set your own requirements in Filters." and below it "A template fills
in the controls, each editable, and decides nothing. All six ask for a build material the H2C prints." Six cards
follow, then "152 materials, 135 within H2C capability · 14,822 measurements, each traceable to its source" and "No
material is ranked on a number nobody measured: a property never published shows as a gap, not a guess." I knew what
it was for and that it would not make up numbers.

The top bar says "Materials that could not be checked [Leave out | Include]". Beside it, the switch **Let estimates rule
out materials** looks **on** but greyed, with "Works only when the materials that could not be checked are included"
under it. I could not tell whether estimates were on or off. When I picked Include, the switch was already on, so
"turn on the option that lets estimates rule out" had nothing to do. I tested it by turning it off instead.

One more surprise: after I had chosen Include, picking a preset set the mode back to **Leave out** without saying so.

## The six presets at a glance

The table shows what each preset listed in each setting. "Hidden" is what the page calls "screened".

| Preset | Leave out: pass / unknown / fail | Include, estimates on: supported / estimated / insufficient / hidden | Include, estimates off: supported / insufficient |
|---|---|---|---|
| Outdoor structural part | 7 / 101 / 44 | 7 / 6 / 81 / 14 | 7 / 101 |
| Indoor prototype | 87 / 39 / 26 | 87 / 0 / 39 / 0 | 87 / 39 |
| Lightweight structure | 15 / 82 / 55 | 15 / 18 / 64 / 0 | 15 / 82 |
| Warm environment | 39 / 84 / 29 | 39 / 0 / 68 / 16 | 39 / 84 |
| High-stiffness fixture | 5 / 104 / 43 | 5 / 9 / 94 / 1 | 5 / 104 |
| Flexible component | 8 / 102 / 42 | 8 / 10 / 90 / 2 | 8 / 102 |

## 1. Outdoor structural part

PLA was offered for a 100 °C outdoor bracket, and the elastomers were hidden for the wrong reason.

**What I did.** The card reads "A bracket that lives outside. HDT at 0.45 MPa at least 100 °C, tensile modulus at least
3 GPa, density at most 1500 kg/m³." The preset also added three chips the card does not mention (H2C limits, H2C
capability, build material) and "Reported, not required: Price at most 100 CAD/kg". I expected glass- or carbon-filled
ASA, PC, PA, PET and PPS, with PLA, PETG and the elastomers all out.

**What I saw.**

- **Leave out:** "7 of the 152 materials meet these requirements", with "101 more could not be checked and are left
  out". The status bar read "PASS 7 · UNKNOWN 101 · FAIL 44". The PASS list was ASA-CF (2 of 17 products), PA6-CF,
  PA6-GF, PET-CF, PP-CF, PP-GF and PPA-GF, a credible list. "Allow annealing: 4 more pass" added PAHT-CF, PA12-CF,
  PET-GF and PPS-CF. I would still want a warning on PA6 for an outdoor part, since the values are judged dry.
- **Include, estimates on:** "101 more could not be checked, listed flagged, except 14 screened out". The sections were
  **Supported candidates (7)**, **Estimated candidates to verify (6)** and **Insufficient evidence (81) — included in
  counts and exports**. The SCREENED 14 chip added a fourth, **Excluded / screened (14)**.
- **Estimates off:** the estimated section disappeared, and its six materials went back into "Insufficient evidence
  (101)".

**What surprised me.**

- **PLA is an "Estimated candidate to verify" for a 100 °C outdoor bracket**
  ([screenshot 1](first-time-user/1-outdoor-pla-estimated-candidate.png)). Its row shows HDT median 55 °C and "0 of 195
  products … 96 products fail at least one requirement; 99 remain unresolved". Only the drawer gave the reason: "Shown
  for its closest product, colorFabb PLA-HP". That product publishes HDT 135 °C and modulus 4.24 GPa but no density
  ("Estimated 1,190 to 1,300 kg/m³ … plausible, but never enough to pass"). So the whole PLA family is promoted because
  one heat-resistant grade has no published density. A density of 1.24 g/cm³ is not in doubt for any PLA.
- **The other five estimated candidates are fair.** ABS-GF, PA12-CF, PA12-GF, PAHT-CF and PPA-CF I would accept as
  things to check.
- **The 14 hidden are the 13 elastomers plus OBC: the right outcome, for an odd reason**
  ([screenshot 2](first-time-user/2-outdoor-tpc-screened-drawer.png)). TPC's "screened" mark says "Screened by an
  estimate: HDT at 0.45 MPa at least 100 °C; HDT at 0.45 MPa at least 100 °C; …" (the same requirement ten times),
  ending "Not a failure; not measured." The drawer for the same material says HDT is "Not applicable: HDT is a rigid-bar
  test … an elastomer has no meaningful HDT". About modulus it says "Estimated 0.0184 to 0.0866 GPa would fail, but only
  25 back-tested cases; 194 are needed to show at 98% confidence that at most 2% of true values lie above an end;
  independent evaluation unavailable without a calibrated bound". The same drawer's key properties show a published
  modulus of 0.048 GPa. So TPC was ruled out on the property that does not apply, not on the one that plainly fails.
- **Two materials I expected out were not hidden.** "Insufficient evidence" included PCL, which has a published HDT of
  57 °C and melts at about 60 °C, and SBC, a styrenic elastomer.
- **The "rule out" switch also promotes.** Switching it **off** took PLA **out** of a highlighted section. Its name
  never says it does that.
- **The reasons are scattered.** I could tell why a material was in its section only for PASS, and only in the drawer.
  For the others the reasons were spread across a hover title, a drawer about one "closest product" and the Products
  tab.

## 2. Indoor prototype

The estimates switch changed nothing here, and this was the preset I would trust most.

**What I did.** The card reads "A shape you want to hold in your hand tomorrow. Any build material; price at most 45
CAD/kg is reported, not required." The only real requirements are the H2C limits, H2C capability and build material.

**What I saw.** Leave out gave 87 passes, "39 more could not be checked and are left out", and FAIL 26. Include gave
"Supported candidates (87)" and "Insufficient evidence (39)". The estimates switch changed nothing: no estimated
section, no SCREENED chip, and the same counts on or off. That is reasonable, since there is no number for an estimate
to judge.

**What surprised me.**

- **Plain failures sit under a "screened" heading.** The 26 failures (PEEK, PEI, PEKK, PSU, PPSU, the sintering
  filaments, PVA, BVOH and the supports) appear under **"Excluded / screened (26)"**. They are plain FAILs, not
  screened.
- **"Insufficient evidence" means something else here.** It means "print settings incomplete" (nGen, PVDF, POM, PC-ESD
  …), not missing properties. The label made me think of mechanical data.
- **The flexible materials pass, fairly.** TPU, TPC, PEBA, PCL and PBAT are all "supported" for a prototype, which is
  fair given "any build material".

## 3. Lightweight structure

The "rule out" switch ruled out nothing here, and promoted PLAs I expect to be less stiff, not more.

**What I did.** The card reads "A drone arm or a moving part. Density at most 1250 kg/m³ and tensile modulus at least
2.5 GPa."

**What I saw.** Leave out gave 15 passes, 82 unknown and 55 failures. The PASS list includes PLA (16 of 195), PETG (1 of
73, whose median modulus is 1.68 GPa), PLA Aero, PA6-CF, PP-CF, PPA and others. With Include and estimates on, the
page showed Supported 15, **Estimated candidates to verify (18)** and Insufficient evidence (64). **Nothing was
hidden**: no SCREENED chip, and "97 shown" both on and off. With estimates off it showed Supported 15 and Insufficient
82.

**What surprised me.**

- **PETG passes on one product.** Product-level passing explains it, but it would surprise a colleague who only reads
  the row.
- **Decorative PLAs are promoted.** The estimated candidates include **PLA Glow, PLA Silk, PLA Marble, PLA Galaxy, PLA
  Sparkle, PLA Wood and ABS**. PLA Glow's published modulus is "2.01 · 1.99–2.03 · 2", and the drawer says "Estimated
  2.64 to 4.11 GPa … Published 3.5 GPa, but its test conditions do not qualify." PLA Silk is 1.83 median, range
  1.15–2.4. From experience I expect silk and glow PLAs to be *less* stiff than plain PLA. Seeing them promoted made me
  doubt the estimates.
- **The elastomers stay listed.** TPU 85A to harder than 95A, TPS, TPC and TPV stay in "Insufficient evidence" against
  a 2.5 GPa modulus requirement, with estimates on and allowed to rule out.
- **The switch only added candidates.** Here the switch named "rule out" ruled out nothing.

## 4. Warm environment

A 6 MPa flexible material passed an HDT requirement, while a 251 °C material was "Insufficient evidence".

**What I did.** The card reads "A part near a motor or in a car. HDT at 0.45 MPa at least 80 °C."

**What I saw.** Leave out gave 39 passes, 84 unknown and 29 failures. With Include and estimates on, the page said "84
more could not be checked, listed flagged, except 16 screened out". That left Supported 39, no estimated section,
Insufficient evidence 68, and 16 hidden. The hidden were every elastomer plus OBC, each "Screened by an estimate: HDT at
0.45 MPa at least 80 °C … Not a failure; not measured.". With estimates off it showed Supported 39 and Insufficient 84
("123 shown").

**What surprised me.**

- **PBAT passes.** Its only product, "Flashforge Flexible", has a published modulus of 0.006 GPa and "Published 90 °C
  (ISO 75)". The tool tells me HDT means nothing below about 225 MPa modulus, and hides TPU on that basis. Yet it
  accepts the HDT of a 6 MPa flexible material as a PASS.
- **Well-documented high-temperature materials are "Insufficient evidence".** PPS-CF (HDT median 251 °C), PPS-GF
  (239 °C), PVDF (158 °C) and PA12 (123 °C) all sit there. The PPS-CF drawer explains it well: "Chamber ≤ 65 °C: Needs
  60–90 °C; the H2C reaches only up to 65 °C, part of that window". So the evidence is plentiful. The open question is
  printability, and the label points me the wrong way.
- **PLA is a supported candidate** ("PASS 7 of 195 products"). That is fine once I open Products, but the row still
  shows a 55 °C median.

## 5. High-stiffness fixture

This was the preset that lost my trust: the switch's own help promises what it did not do.

**What I did.** The card reads "A jig or a fixture. Tensile modulus at least 5 GPa; HDT at least 90 °C is reported, not
required."

**What I saw.** Leave out gave 5 passes (PAHT-CF, PETG-CF 1 of 24, PP-CF, PP-GF, PPA-GF), 104 unknown and 43 failures,
with "Allow annealing: 5 more pass". With Include and estimates on, the page showed:

- Supported 5.
- Estimated 9: ASA-CF, PA12-CF, PA6-CE, PA6-CF, PA6-GF, PET-CF, PLA-CF, PPA-CF and PPS-CF, a sensible list of
  fibre-filled grades to check.
- Insufficient evidence 94.
- **SCREENED 1, which is PA612** ("Screened by an estimate: Tensile modulus (XY) at least 5 GPa").

With estimates off it showed 5 and 104.

**What surprised me** ([screenshot 3](first-time-user/3-stiffness-tpu-not-ruled-out.png)). With "Let estimates rule
out materials" on, the TPUs stayed listed:

- "TPU 95A class": modulus "0.027 · 0.006–0.065 · 9", labelled "Insufficient evidence: 8 products fail at least one
  requirement; 19 remain unresolved".
- "TPU harder than 95A": the estimate is printed in the row, "~0.01–0.41†", labelled "Insufficient evidence".
- "TPU-CF": "~0.02–0.76†", labelled "Insufficient evidence".

The help popup says: "With this on, an estimate excludes a material only when its whole plausible range misses the
requirement." Every range I could see misses 5 GPa by an order of magnitude, and only PA612 went. PLA (median 2.53
GPa) and PETG (1.68 GPa) also sit in "Insufficient evidence", not anywhere that says "very unlikely".

## 6. Flexible component

PC and PETG were offered for a gasket, while the soft materials I would shortlist sat below them.

**What I did.** The card reads "A gasket, a strap or a phone case. Elongation at break at least 100 %." The page adds
"Not checked by this template: Recovery, softness and sealing", which is the right caveat.

**What I saw.** Leave out gave 8 passes, 102 unknown and 42 failures. The PASS list is OBC, PA6/66 (1 of 7), PBAT, PCL,
PP (2 of 12), TPU 85A (1 of 18), TPU 90A (5 of 12) and TPU 95A (10 of 27). With Include and estimates on, the page
showed Supported 8, **Estimated candidates to verify (10)**, Insufficient evidence 90, and SCREENED 2 (PA612-GF and
PA66-CF, by an elongation estimate). With estimates off it showed 8 and 102.

**What surprised me.**

- **A rigid nylon is in the gasket list.** Elongation above 100 % is not the same as flexible: PP and nylon neck. The
  rail even says "Not a measure of toughness or recovery". Even so, a rigid nylon in a gasket list surprised me.
- **PC and PETG are estimated candidates for a gasket**
  ([screenshot 4](first-time-user/4-flexible-pc-estimated-candidate.png)). PC's row reads "Elongation 7 · 3.2–25 · 12"
  and "15 products fail at least one requirement". PETG's median is 8.4 %. The PETG drawer says "Shown for its closest
  product, Spectrum THE FILAMENT PETG Lite … Estimated 163 to 241 % … Published 160 %, but its test conditions do not
  qualify." So one unusual product drags in its whole family.
- **The real candidates sit lower.** TPS, TPV, TPC-ESD, TPU-LW, TPU-CF and the maker-undisclosed TPE, the materials I
  would actually shortlist, sit in "Insufficient evidence", below PC.

## The labels, scored

Most labels scored 2 or 3 out of 5. Only the headline count was clear in every mode.

| Label on the page | What I expected | What it did | Clarity (1–5) |
|---|---|---|---|
| "Materials that could not be checked: Leave out / Include" | Show or hide materials with missing data | Did that, and its hover title is good ("…flagged, with what is missing for each"). But picking a preset resets it to Leave out, and the UNKNOWN chip shows the same rows without it | 3 |
| "Let estimates rule out materials" | Use predicted values to drop materials that obviously miss | Hid elastomers on HDT, which the tool calls not applicable. Left TPU in at 5 GPa. Hid nothing in Lightweight. **Also** created "Estimated candidates to verify". Looks on even while disabled | 2 |
| "Supported candidates" | Published data meets everything | Right, at material level ("2 of 17 products"). But "Supported" is ambiguous beside "Support / Interface" materials and the "Build material (not a support)" chip | 3 |
| "Estimated candidates to verify" | The model predicts these will pass | "Predicted centres meet the missing numerical requirements" is jargon. The choice follows one favourable product while the row shows failing medians (PLA, PC, PETG) | 2 |
| "Insufficient evidence (N) — included in counts and exports" | No data to judge | Lumps clear mismatches (TPU for stiffness), well-documented materials stuck on a chamber window (PPS-CF) and true gaps. "Included in counts" is not what the headline count does | 2 |
| "screened" / "Excluded / screened" | Removed by an estimate | Its own tooltip says "Not a failure; not measured". The same heading holds plain FAILs ("Excluded / screened (26)" in Indoor) | 2 |
| Status bar "Show in table: PASS · UNKNOWN · FAIL · SCREENED" | Counts, and filters for the table | Works as filters. But "UNKNOWN 101" includes the 14 screened, while the header says "94 shown PASS + UNKNOWN" | 3 |
| "N of the 152 materials meet these requirements" | The answer | Clear and stable across modes | 4 |
| "0 of 195 products" / "none judged" | A product-level tally | Its hover explains it well ("None passes, but not every product fails, so the material is unresolved, not failed"), but only on hover | 3 |

## Top confusions, ranked

These are the nine things that confused me most, worst first, each with the page's own words.

1. **"Rule out" does not rule out the obvious.** The help says "an estimate excludes a material only when its whole
   plausible range misses the requirement". Yet for a 5 GPa fixture, "TPU harder than 95A" shows "~0.01–0.41†" and
   stays "Insufficient evidence". Only PA612 is screened.
2. **The same switch promotes materials.** Turning it on creates "Estimated candidates to verify", with "Predicted
   centres meet the missing numerical requirements. Still UNKNOWN; confirm before choosing.". It puts PLA in front of
   me for a 100 °C outdoor bracket, and PC and PETG for a gasket. Nothing in the name or the help popup mentions this.
3. **Screened for a reason the tool says does not apply.** "Screened by an estimate: HDT at 0.45 MPa at least 100 °C;
   HDT at 0.45 MPa at least 100 °C; … Not a failure; not measured." sits beside a drawer that calls an elastomer's HDT
   "Not applicable". It also sits beside a modulus estimate the tool declines to use: "would fail, but only 25
   back-tested cases; 194 are needed…".
4. **A material almost never FAILs.** "None passes, but not every product fails, so the material is unresolved, not
   failed." So PLA (HDT 55 °C) is never a FAIL for 100 °C. The "Insufficient evidence" bucket ends up with 80–100
   materials in every numeric preset, and I cannot scan a list that large.
5. **Two "show unknowns" controls that disagree.** In Leave out mode the UNKNOWN chip lists all of them. Yet the
   subtitle still says "101 more could not be checked and are left out", above "108 shown PASS + UNKNOWN · 7
   candidates, 101 could not be checked" ([screenshot 5](first-time-user/5-leave-out-yet-listed.png)).
6. **The switch's state.** On landing it shows "on" but greyed, with "Works only when the materials that could not be
   checked are included". A preset click also silently returns the mode to Leave out.
7. **Counts that do not reconcile.** "Why excluded" says "HDT … could not check 85 (22 of them excluded by an
   estimate)" and "Tensile modulus … (4 of them excluded by an estimate)", but SCREENED is 14
   ([screenshot 6](first-time-user/6-why-excluded-tab.png)). That tab was otherwise the clearest thing on the page:
   "removing it would bring back 18 candidates" is exactly what an engineer wants.
8. **Physical contradictions in the PASS list.** PBAT at 0.006 GPa passes "HDT at least 80 °C". PPS-CF, at 251 °C, is
   "Insufficient evidence" because of its chamber window.
9. **Small things.** "1 products fail at least one requirement" and "1 products have no complete qualifying evidence"
   (the grammar). PA612, PA612-GF and PA66-CF rows read just "UNKNOWN" with no tally. TPC is described as "A commercial
   variant whose filler is not disclosed. A flexible elastomer."
