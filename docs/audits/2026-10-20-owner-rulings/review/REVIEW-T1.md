# Review of track T1 (D171, D172; m462 to m467, m480)

> **Historical record** (2026-10-20): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../OPEN-PROBLEMS.md).

> **In short.** Independent review at ce257b58, by Claude Opus 5.5. The rulings are mostly built as the owner worded them,
> and the fine prints are in place. Two things still give wrong answers. First, the second pass decided that melt flow is
> not a counter-indication but never went back to look for indications on those pages, so values on labelled tables
> stayed set apart. Second, PLA-CF's only pass rests on a figure that is not physically plausible. The build is clean
> (0 errors), `ui:check` matches all 114 views and `pages:check` passes 16 of 16.

## Findings

**F1, wrong answer (systematic).** `evidence/classify.mjs` turns every first read of COUNTER:melt-flow into "nothing
indicates" (723 values). The readers' rubric said a counter-indication wins, so they stopped at melt flow and did not
report indications. The second pass checks again for only two things: a row's own "(X-Y)" label, and seven named document
statements. Pages read on cached text where D172's own rules say the value is the filament's, but it is set apart:

- SIDDAMENT V2 PC-GF, V000750 (HDT 125 to 140 °C). Its one table labels the other rows (XY) and (Z). The reader wrote
  "would make the HDT row IMPLIED labels, but … melt flow … counter wins". Through CV63 the value would settle G038-01's
  HDT requirement (≥ 80 °C). Instead the drawer tells the reader "nothing on it says, even implicitly…".
- Filament2Print ASA and PETG (V009509 to V009515, V009692 to V009698). The Mechanical table carries "Layer Adhesion
  (Impact Resistance in X)", and the melt flow sits in a different table.
- Eight SUNLU sheets (High Speed Matte PETG V008446, PA6-GF V008235, PC V008720, PLA Classic V008595, …). One table
  labels every row (X-Y) or (Z-X). The only counter-indications are melt flow and a blank "Mold Shrinkage ISO294 … /".
- PolyTerra PLA V6.0, V003858. The sheet prints "HOW TO MAKE SPECIMENS", but the DOCUMENT pattern
  `^S-POLYCN-TDS-Polymaker-` does not match `S-POLYCN-TDS-PolyTerra-`.
- Fillamentum NonOilen, V009504 (119 °C; PLA-PHB's lost Warm pass). The sheet says "great temperature resistance after
  3D printing, there is no need for annealing!", and no reader weighed that sentence.

The answers moved in this sample are product answers (G038-01, G020-63, G031-34, G001-111, G001-23). PLA-PHB's material
verdict depends on how NonOilen's sentence is read, which is the owner's call. Fix: read the melt-flow and blank-shrinkage
groups again under the final rules, widen the Polymaker pattern, regenerate the classification and rerun m463.

**F2, wrong answer (likely).** PLA-CF's High-stiffness pass (UNKNOWN → PASS) rests only on Spectrum PLA Carbon's
12.5 GPa (V003097). That value was implied from the "(3D printing)" labels on two neighbouring rows, but its own row
carries no such label. Spectrum labels rows one by one, and on PET-G Matt the modulus row is marked "injection
moulding". The figure is 2.5 times the next PLA-CF (4.95 GPa) and beyond what 10 % short carbon fibre in PLA reaches even
moulded (about 7 GPa). It does agree with the sheet's 65 MPa / 0.5 % (σ/ε ≈ 13 GPa), so the sheet itself is probably
wrong. Fix: flag it "Published value (physically implausible)" (m24 pattern), or hold it until Spectrum confirms.
PLA-CF then returns to UNKNOWN.

**F3, wrong reading (no verdict moved).** Prusament PLA High Speed, product page V013530 (HDT 57 °C), decides G001-87's
hdt045. It counts as implied only because "Horizontal" rows sit in the same Details list. The data sheet prints the same
57 °C under "Typical material properties", the table D172 itself names as set apart. A set-apart figure "replaces
nothing" (D171), so the lower-ranked copy of a figure the better document sets apart now decides. Fix: a set-apart figure
on a better document also sets apart the same figure on a lower-ranked one; set V013530 apart.

**F4, misleading (and an owner question).** CV05 still turns set-apart PLA and PET heat values into a FAIL. For 117
products, hdt045 is both `not-described` and `ceilingOnly`; for example, G001-05 Spectrum PLA High Speed fails Warm on
60 °C. Yet `LEVEL_NOTE['not-described']` (app/js/ui/material-words.js:135) says "set apart for good: shown, never used in
deciding". Ruling 3 says "set apart for good". Either ask the owner whether a fail-only use is allowed, or reword the note
for PLA and PET.

**F5, misleading.** app/js/ui/templates.js:43 and :74 (shown on the start panel and in the brief, brief.js:137) still say
"An HDT whose test bar its sheet does not describe is accepted as a printed bar's, except for PLA and PET". This is false
since D172. Reword both.

**F6, rule broken (frozen components).** Three frozen parts changed. headline_definitions.csv: Unstated direction is
"flat if printed" on 7 headlines, and hdt045's Lower bound specimens is "printed". build/src/estimate/grades.js gained the
`echoes` rule. Only the hdt045 floor has a back-test, in the validation report: 80.7 / 94.7 % both ways, where D172 quotes
80.4 / 92.9. Neither the read-flat change nor the echo rule has a back-test row. tensileStrengthXY's Lower bound specimens
is still "printed or not stated", so an undescribed (possibly moulded) yield strength still floors a printed part's
strength. That breaks "one ruling applied the same way everywhere" (D161 settled elongation, m466 settled HDT). Fix: add
back-test rows; switch tensile strength to printed with its own back-test, or record why it stays.

**F7, record.** classification.csv still lists V013950 as `stated`, though m480 set it apart. Rerunning m463 alone would
therefore retype it, so the rerun is not a no-op. The counts are stale: 144 values with 4 stated is now 143 with 3 (D172,
README, OPEN-PROBLEMS §15); m463 says 668 pages where groups.json has 655. The "947 unread" values (968 by my count) have no
list or query in the record. Fix: add V013950 to TAKEN_BACK, regenerate, correct the counts and commit the pre-screen
query.

**F8, misleading (minor).** D171 replaces a foaming product's figure taken at another print setting as if the two
documents disagreed. Siraya Flex TPU Air's 540 kg/m³ (foamed) is replaced by 880 (printed at 240 °C); Rebound PEBA Air's
95A (230 °C) by 81 (240 °C); FILAFLEX 95 Foamy's 70A ("after foaming adjustment") by 90A. Each is shown as "differs a
lot". Fix: put the print setting in the slot, or leave foaming variants out.

**F9, docs (minor).**

- D166's Status lacks "amended by D172".
- D172's "What wins against it: in the same table" is contradicted by the second pass's rule that a row's own label wins
  (SUNLU PP2.0 V004425 decides beside "Moulding Shrinkage ISO 294 … 1.36"). Say which one D172 means.
- "No answer moved to FAIL" holds for material verdicts only: 16 product answers went UNKNOWN → FAIL under
  High-stiffness (G001-06, G020-25, G164-10 and others).
- INTERFACE.md:560 and :564 still say "as published, no stated orientation".
- AGENTS.md and IMPORTING.md give no recipe for Superseded by, so an imported newer edition ranks equal to the old one.
- Two Revision cells hold "www.spectrumfilaments.com Preparation date: …" (m464).
- 150 deciding values are printed only because of their orientation, yet still read "Not published (do not assume
  printed)" in Sources.

## Faithfulness to the owner's words

D172 applies one classification to values that decide directly and to the ledger's floors (with the exception in F6).
Its main lines fit "even an implicit indication … correct for a filament":

- a table the document sets apart (AzureFilm, the Prusament data sheets, Fiberlogy's "supplier test data");
- a footnote scoped to named tests (IPCON's "shrinkage rate and mechanical properties");
- a description's prose figure.

The method, though, leaned stricter than the owner's wording. The reading instructions say "when in doubt … choose NONE",
which inverts "even". F1 then left whole pages unweighed. The borderline cases ran both ways. Anycubic's "All data are
based on printed test samples", printed under its mechanical table, was kept. Siraya PPA-GF's "Other Properties", in the
same Property Data table and under the same Unannealed/Annealed columns as its X-Y rows, was set apart. Nanovia's flexion
rows, placed beside "Test performed … on 3D printed test specimens", were set apart too. Most losses are correct: Spectrum
PET-G HT100 (Tritan), SIDDAMENT PA (170 MPa resin figures) and IPCON PPS-GF. Re-reading F1's pages under "doubt → owner"
would honour the owner's word without letting in moulded bars.

## Checked and found right

- Implied keeps: Stratasys PC (a "Printed" table), Raise3D Hyper Core ABS CF15 ("All testing specimens were printed…",
  which decides ABS-CF's Warm pass), 3DXTECH's Fortus settings, Polymaker's "How to make specimens", SUNLU's "(X-Y)"
  rows, QIDI's guide (XY and Z rows; its quoted tooltip is weak), Siraya's "Tested on X/Y axis", SIDDAMENT's "Test
  Sample Printing Conditions".
- Set-asides that removed a pass: PET-G Matt (injection moulding), ASA Aero (separate table; the data sheet's 85 °C is
  off-recipe), PA6 (SIDDAMENT, Nanovia, WearX), PPS-GF (IPCON, scoped), PPA (Siraya), CPE HG100, COC.
- Unread: SUNLU PETG, Fiberlogy FiberWORKS, 3D4Makers ULTEM 1010, Yousu ABS and Spectrum PA6 CF15 each carry a real
  counter-indication. SUNLU PLA Glow's only one is a blank shrinkage row, harmless here, since nothing indicates printing.
- Editions (Bambu Lab PC V2.0 → V3.0, eSUN ABS+, eSUN PLA-Basic, 3DXSTAT ESD-Ultem Rev 3.0 → 3.1, Spectrum PP) are the
  same products and newer. Replaced figures (Bambu Lab PC, PolyMax PC, nGen CF10, eSUN ABS+) are in the same state. SDS
  and resin sheets rank last.
- Migrations are guarded; nothing is deleted; schema, vocabulary and dictionary moved with the data; the import tools
  write Superseded by; SOURCE-EDITION exists; tests cover `assess` and `markOutranked`.
- Fine prints are in the drawer's product detail and on the pages' product cards, in plain words; none on the drawer's
  first screen.
- Back-references in D83, D84, D126, D153 and D161, and OPEN-PROBLEMS §15, §37.3, §38.6 and §39.4, agree with the build.
