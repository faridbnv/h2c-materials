# Review of tracks T2 to T5 (the owner's rulings, 2026-10-20)

> **Historical record** (2026-10-20): an independent review of the merge at 952943b4 (T2 to T5, `ab9b94a1..952943b4`),
> read against GOALS-LOG "Decided on 2026-10-20", AGENTS.md and the cached documents. Reviewer: Claude Opus 5.5, review
> only (no tracked file edited).

## Findings, by severity

**F1 · wrong answer · PVC-P (M178, G135-01; profiles P1448, P1469; CN05).** PVC-P is a new PASS for Indoor prototype in
all three modes, because CN05 (Flexible Elastomers, deciding) fills its chamber as "within" ("of the 18 makers of Flexible
Elastomers who state one, none asks above 65 °C"). Its sheet is not silent. p. 1 says: "Wir empfehlen die Verarbeitung von
PVC-P ausschliesslich auf geschlossenen 3D-Druckern mit integriertem Aktivkohlefilter". Both profiles record Enclosure
"Not published". Under D151 and `chamber-need.js` (lines 13–15), an enclosure asked for counts as a statement and is never
filled. T4 applies the same rule to Extrudr XPETG MATT. While PVC-P sat in PVC (PVB / Specialty), no deciding row reached
it. Moving it under Flexible Elastomers let CN05 decide for a polymer whose makers CN05 never counted. OPEN-PROBLEMS §38.9
says the advice is "not yet typed" but does not say that the missing record decides an answer. **Fix:** record the sentence
in P1448's Enclosure, with its state, then re-run the census. PVC-P should then read one check away. Also decide whether
CN05 should name elastomers by Base polymer rather than by Family.

**F2 · rule broken · `npm run verify:fast` fails at 952943b4.** The "decisions doc" step reports that D171 and D172 are in
neither DECISIONS.md nor the archive (T1's numbers, not merged). The run also took 92.2 s, over the 90 s budget (tests
89.2 s). **Fix:** do not push this state to main. Land T1 first, or close the numbering gap.

**F3 · misleading · Spectrum PET-G HT100 (G020-08, V002845–V002853, V012391).** T5 found that HT100's sheet prints Eastman
Tritan's moulded-resin figures line for line (memo §4, D176). The rows still say "Not published (do not assume printed)",
and the Tritan brochure is "fetched, not registered". Since m474, HT100 is the product CPE's row shows for hdt045 ≥ 90 and
for several other cases. It shows a 94/100 °C value that, by T5's own reading, comes from a moulded bar. CPE's verdict does
not move, because G089-02 and G089-05 pass on their own 99–100 °C. The memo leaves the matter to "the round's ruling on
undescribed bars" (T1). That ruling keeps a value wherever anything indicates "even implicitly" that it is the filament's,
and a filament TDS does indicate that. So T1 is likely to keep these values. **Fix:** register the brochure as
corroboration and record the rows as Raw material value, with the evidence. Or name HT100 in T1's list.

**F4 · rule (minor) · CL01 and the polymers.csv row for SBC.** CLASS-LIMIT-SOURCE asks for a cited source that prints the
limit for the kind. CL01's source, the Cambridge Materials Data Book, prints no plasticised PVC: a full-text search of its
cached pages finds no PVC entry. The extension in m477 rests on Gent's relation and the product's own Shore 94A. The physics
is sound (94A is far below 0.5 GPa), so no answer is wrong, but the record has no source for the kind. Separately, SBC's
neat density minimum (1010) rests on R-INEOS-KRESIN-KR03-PAGE, whose Citation role is `corroboration`. **Fix:** register
one flexible-PVC reference (T5 fetched Fainplast's) and cite it in CL01's Basis. Make KR03 `cited`.

**F5 · misleading (docs) · stale claims after the merge.**
- OPEN-PROBLEMS.md:2331 still says the drawer's comparison graphs never see the requirements (`materialContext` does not
  set `scenario`). Commit 32f3e183 fixed that.
- OPEN-PROBLEMS.md:2350 and ARCHITECTURE.md:928 say "149 materials". After T5 the page lists 152, as the README says.
- OPEN-PROBLEMS.md:1650 and 1652 say "491 Not published". The figure is 494 after b49's three grades.
- D127 and D129 (amended by D175) and D154 (extended by D176) have no "Amended by" back-reference. D87 and D110 got theirs.
- `headline_definitions.csv`'s Not applicable reason for hdt045 and hdt18 still says "Sintering filaments are left out
  too". That sentence is shown on every elastomer's HDT. It sits in a frozen table, so change it with the next
  frozen-table change.

**F6 · minor (method) · moves in the estimate model with no back-test.** m470's new Variant gives the 11 re-filed products
a term of their own. That moved 607 product estimates and 16 sweep answers (D175 says so). Only EST-CALIBRATION checks
this; no before/after record exists, and round:close's freeze list does not watch `grade-variants.csv`. In the SBC
back-test, the plausible coverage of the crystalline-filled stiffness stratum falls to 89.3 %. **Fix:** record calibration
before and after in D175's record, and add the vocabulary to the freeze watch.

**F7 · minor (tooling) · the census does not report removed materials.** The census prints "new material" lines but
nothing for a material that leaves. T3's diff reads "0 material verdicts moved" although three materials and their 24
density passes left; only the counts show it. **Fix:** print a "left the dataset" line.

**F8 · minor (consistency) · COSMETIC-FILLERS.md.** SUNLU PLA Classic is re-filed on "High toughness, with matte texture".
3D4Makers Facilan C8 is left out because its look is "one feature among" its function claims. The two cases are close, and
the record does not say where the line falls. Also, Facilan C8's cached sheet says "best surface quality", not matte. No
answer differs, since both are PLAs the guide answers alike.

## Checked and found right

- **T4, the 11 re-filings.** Each quote is checked on its cached sheet by `onSheet`. I spot-read SUNLU PLA Lite and High
  Speed Matte PLA: they share one formulation key and one table. I also read PLA Classic.
- **T4, the 17 left out.** AzureFilm ABS Prime ("zero warp engineering filament … exceptional strength") is sold for a
  printing function and is rightly left out, as is ASA Prime by the same sheet. Facilan C8 and the metal fills are also
  rightly left out. The ruling was applied as worded.
- **T4, BigRep diameters.** On ASA, PLX (both documents) and BVOH, the cached text prints only "Diameter 2.85 mm". The
  warning reaches the drawer's product detail and the card.
- **T5, PET.** Flashforge PET-GF pp. 1–3: 200 °C on printed bars, with oven advice of 120–130 °C. Raise3D PET GF p. 2:
  "All specimens were annealed at 100˚C for 8h". SIDDAMENT: guarded by m473. The physics holds, and BACKTEST §2 rejects the
  alternative on the makers' own as-printed bars.
- **T5, HT100.** The sheet says "co-polyester based", 1.18 g/cm³, and filing it under CPE is right.
- **T5, Electrifi.** The SDS says "biodegradable polyester", melting point about 60 °C, which points to PCL. It is filed as
  inferred (M176, R227) and is not estimated.
- **T5, Diran 410MF07.** The 27 values match pp. 4 and 6 (HDT 90/70 °C, SG 1.16, Table 3). Its home matches M164 to M166.
- **T5, SBC.** The polymers.csv row matches Styrolux 656C (1020 kg/m³, 1800 MPa, Shore D 72) and KR03 (1.01, Shore D 63).
  The back-test holds EST-CALIBRATION.
- **T5, Onyx ESD.** The values in the Composites column match.
- **T3.** Nothing is deleted. Scope Retired, retired grades, CN09 retired and the records kept. MATERIAL-RETIRED-ACTIVE
  guards it.
- **Frozen inputs.** The only frozen change is `polymers.csv`, and it has its back-test.
- **Migrations m468 to m477.** All are guarded (`expect`, sheet quotes) and use moveGrade, so IDs are kept.
- **verify:fast.** Format, schema, lint (379 accepted, 0 new), docs and 784 tests pass, apart from F2.
- **`ui:check`.** 114 views match, with no layout failure.
- **`ui:fuzz -- --n 300`.** All 300 scenarios (2,642 readings) agree with the engine.
- **Interface.** The cold table opens on ABS with no Result column. The drawer's first screen reads as an engineer needs:
  the answer, one line per requirement, six tiles, the H2C rows, and how well documented the material is.
