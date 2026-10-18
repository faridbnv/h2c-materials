# Flexible component and Indoor prototype

> **Historical record** (2026-10-18): written for the screening review on release 9ca94d31fc5d. Figures may have changed since; re-run [census.mjs](../census.mjs).

> **In short.** This file reviews Flexible component (elongation at break of at least 100 %) and Indoor prototype
> (printer check only), where the rules work as written but three of them turn engineering sense upside down. In
> Flexible component, five rigid plastics (PETG, PC, PCTG, CPE, PETG-PTFE) are offered as estimated candidates, because
> a resin sheet's stretch sets a floor under the printed part's estimate. Meanwhile PEBA, TPC and the hardest TPUs, with
> printed stretch of several hundred per cent, wait only on a chamber temperature their sheets do not print. In Indoor
> prototype, all 39 "Insufficient evidence" materials are held by the printer check alone, open-printer PLA/PHA and a
> foaming TPU among them. Three materials nobody sells (PA66-CF, PA612, PA612-GF) are listed or hidden on a family
> guess, and two hidden failures, LCP and PPS-ESD, come from reading a bed window by its top end.

## What the presets ask and what came out

Flexible component turns on one number, and Indoor prototype on none. Every preset also has the same basic checks. The
material must be one the H2C can print at all (scope), and a build material rather than a support. Its nozzle, bed and
chamber temperatures must pass the printer check, against the H2C's 350 °C nozzle, 120 °C bed and 65 °C chamber. Each
preset was run over 152 materials.

**Flexible component.** It requires an elongation at break in the print plane (XY) of at least 100 %. Of the 152
materials, 8 meet it, 10 are estimated candidates, 90 are under "Insufficient evidence", 2 are hidden as unlikely and 42
fail (the status bar reads PASS 8, UNKNOWN 102, FAIL 42).

**Indoor prototype.** It requires no number, and it reports, without requiring, a price of at most 45 CAD/kg. Of the
152 materials, 87 meet every requirement, none is an estimated candidate, 39 are under "Insufficient evidence", none is
hidden and 26 fail (the status bar reads PASS 87, UNKNOWN 39, FAIL 26). The estimated group is empty by construction:
there is no required number to estimate, and a printer check is never estimated.

## The materials we checked

The reviewer judged every material that looked questionable, plus two "Insufficient evidence" materials per preset drawn
at random, and traced each product's decision to its sheet. "Right by the rule" means the tool followed its own rules.
"Misleading" means a reader is led to a wrong conclusion all the same.

### Flexible component (at least 100 %)

| Material | Where the tool put it | Right? | Why, in one line |
|---|---|---|---|
| PETG | Estimated candidate | Wrong | Floored by unstated-bar values of 120 to 280 %, while 23 of 26 printed products fail |
| PC | Estimated candidate | Wrong | One resin sheet's 150 % lifts it, while PC's printed values are 3.2 to 25 % |
| PEBA | Estimated candidate | Wrong group | Six products pass on printed values and wait only on a chamber temperature |
| TPS | Insufficient evidence | Wrong | One product passes on 280 % in XY and waits on a "-" in its chamber row |
| PA6/66 | Supported | Right by the rule, misleading | A ductile nylon at 1,980 MPa, not a flexible material |
| PA66-CF | Hidden as unlikely | Right direction, wrong basis | No product at all, hidden on a family-only guess |
| ABS-AF (random) | Insufficient evidence | Right by the rule, misleading | Its one published value is 6 %, and every estimate misses, yet none may hide it |
| PCTG-CF (random) | Insufficient evidence | Right by the rule, misleading | Every product prints 5 to 9 % |

**PETG is offered for a gasket on resin-sheet floors.** Spectrum THE FILAMENT PETG Lite's sheet prints 160 % "ASTM
D638", with neither bar type nor direction stated, beside a tensile strength by ASTM D 882, a film test. The tool uses
that 160 % as a floor under the printed part's estimate. The estimate comes out at 163 to 241 % (wide range 160 to 300),
with "good" precision. All 8 of PETG's estimated products are floored the same way, by their own unstated values of 120
to 280 %. The 26 PETG products with a printed XY value publish 4.1 to 90 %, and 23 of them fail (F-F1).

**PC is offered on one resin sheet.** Yousu PC's 150 % comes from a resin sheet. It prints melt flow rate, a notched
Izod of 900 J/m, HDT annealed and unannealed, and yield at 6 %. PC's 12 printed XY values are 3.2 to 25 %.

**PEBA is in the wrong group.** Six products pass on their own printed XY values, up to 1,110 %. QIDI PEBA 95A, for one,
prints 1,106.8 % and a fan setting of 50 to 100 %, but no chamber line. Each of the six waits only on that missing
chamber temperature. The row speaks for a seventh product, Spectrum's PEBA, which has only an estimate (F-F3).

**TPS is held back by a dash.** BASF Ultrafuse TPS 90A passes on 280 % measured in XY and is held by a "-" in its
chamber row. Three other products publish 150 to 650 % on unstated bars. Unlike PETG's, they get no estimate at all,
because TPS has no estimate identity (OPEN-PROBLEMS §5). One of them, Fabru's TPS, asks a 60 to 80 °C chamber, which the
H2C reaches only in part.

**PA6/66 passes, but it is not flexible.** 3DXTECH AMIDEX PA6 Copolymer prints 100 % in XY and a tensile modulus of
1,980 MPa on the same sheet. That is a ductile nylon, not a gasket material (F-F5).

**PA66-CF is hidden for the right reason in the wrong way.** It has no product and no measurement. A family-only
estimate of 1.38 to 12.5 %, with "poor" precision, hides it. That is the one kind of hiding on a number still allowed
(F-F6).

**The two random draws.** In ABS-AF, only Spectrum ABS Kevlar publishes a stretch, 6 %, and the other two products
publish none. Every product's wide range ends at 13.7 to 33 %. No product estimate may hide a material (decision D137),
so it stays listed. One product, Nanovia ABS AF, also fails on a 90 °C chamber. In PCTG-CF, every product prints 5 to
9 %, and the wide ranges end at 14.9 to 17.8 %.

### Is "elongation at break of at least 100 %" a sound test of flexible?

No, and the data say so. Of the 18 materials listed above the collapsed group, 7 have a tensile modulus (XY) of 1.5 GPa
or more:

| Material | Tensile modulus (XY) |
|---|---|
| PA6/66 | 2.34 GPa |
| PVB | 2.20 GPa |
| PC | 2.11 GPa |
| PCTG | 1.76 GPa |
| PETG | 1.68 GPa |
| CPE | 1.68 GPa |
| PETG-PTFE | 1.55 GPa (estimated) |

The elastomers sit at 0.005 to 0.09 GPa. Elongation at break measures ductility. A gasket or a strap needs a low modulus
or hardness, and a phone case about Shore 90 to 95A. The preset's own "not checked" line says so, but the list does not.
The data hold a better test. Tensile modulus (XY) is a property the tool already shows and estimates, and Shore hardness
is published for 80 products (Shore A) and 91 (Shore D), though the tool does not filter on it. See F-F5.

### Indoor prototype (printer check only)

| Material | Where the tool put it | Right? | Why, in one line |
|---|---|---|---|
| PLA-PHA | Insufficient evidence | Wrong | Its sheet says it prints on heated and unheated beds, yet it waits on a chamber temperature |
| ABS-CF | Insufficient evidence | Right by the rule (owner, 2026-10-05), misleading | Most products are silent or vague on the chamber, and no guide row covers ABS-CF |
| PA66-CF, PA612, PA612-GF | Insufficient evidence | Misleading | No product, so nothing to buy, print or verify |
| COC (random) | Insufficient evidence | Right by the rule, wrong word | Both products state a 60 to 80 °C chamber, and the H2C reaches 65 °C |
| TPU-LW (random) | Insufficient evidence | Wrong | Four foaming TPUs, each held only by a silent chamber |
| LCP (hidden failure) | Fail | Wrong | A 120 to 150 °C bed is read by its top, though the H2C reaches its bottom |
| PBT (hidden failure) | Fail | Right | Its bed, 160 to 200 °C, is wholly above the H2C's 120 °C |

**PLA/PHA is an open-printer PLA held by the chamber.** colorFabb PLA/PHA is its one product. Its sheet gives a bed of
50 to 60 °C, a fan of 0 to 100 %, and "performs well on both heated and non-heated build". It still reads "No
temperature published" for the chamber.

**ABS-CF waits on chamber statements the owner chose to keep open.** Of its 11 products, 6 are silent on the chamber, 2
say a heated chamber is "recommended" with no temperature, 2 give windows the H2C only partly reaches (50 to 70 and 60
to 80 °C), and 1 fails (90 °C). Plain ABS has a row in Bambu Lab's guide, which the tool reads as asking for the H2C's
chamber (decision D90). ABS-CF has none. The owner kept "recommended, no temperature" as unknown on 2026-10-05.

**PA66-CF, PA612 and PA612-GF cannot be printed or bought.** They have no product, so all three printer checks read "No
print profile recorded". There is nothing to buy, print or verify (F-F6).

**COC's chamber is fine, but the label says otherwise.** Both Fabru COC products state a chamber of 60 to 80 °C. The
H2C's 65 °C lies inside the maker's window, so nothing is missing: the printer reaches its bottom. The rule calls a
partly reached window unresolved, but "Insufficient evidence" is the wrong word for it (F-F4).

**TPU-LW's foaming TPUs are held by silence.** Four foaming TPUs are each held only by a silent chamber. Siraya Tech
Flex TPU Air prints a bed of 30 to 45 °C and a fan of 100 %. Bambu Lab's guide has a TPU row, but it is mapped only to the
TPU 95A class.

**LCP fails on the top of its bed window.** purefil LCP's sheet prints a bed of 120 to 150 °C. The tool reads its top,
"Requires up to 150 °C", and fails it, though the H2C's 120 °C is the window's own bottom. PPS-ESD (3DXTECH 3DXSTAT
ESD-PPS, 120 to 160 °C) fails the same way (F-F7).

**PBT fails rightly.** purefil PBT's bed is 160 to 200 °C in all three language copies of its sheet, wholly above 120 °C.

**The other 23 failures are right.** Six support materials fail as build materials. Seventeen high-temperature or
sintering materials fail the scope check: PEEK, PEKK, PEI, PSU, PPSU and their filled grades.

## What goes wrong, and why

Seven root causes explain the doubtful answers. Two decide answers through the data and its estimates (F-F1, F-F6),
three through the printer check (F-F2, F-F3, F-F7), and two through wording and the preset itself (F-F4, F-F5). The tags
are the reviewer's finding IDs, which the review's README cites.

### A stretch value whose test bar is not stated sets a floor under the printed part's estimate (F-F1)

**What happens.** When a sheet publishes an elongation without saying what bar was tested, the tool treats the bar as
printed. It then uses the value as a floor: the product's estimate may not go below it. The owner chose this in decision
D126, which was argued for orders within one test, such as a yield stress at most the ultimate strength. For elongation
across bar types the premise fails, because a moulded bar stretches several times further than a printed one. An
estimated candidate needs only its middle value to meet the limit, so a floor at or above 100 % guarantees it.

**Example.** PETG Lite's 160 %, above, floors PETG. The sheets behind PC (Yousu), CPE (Fillamentum CPE HG100: melt flow
index, notched Izod "no break", 50 mm/min) and PCTG (Spectrum: notched Izod, Rockwell R) are resin data. PETG Lite's
tensile strength is by ASTM D 882, a thin-sheet test. The model itself knows that a moulded break strain overstates a
printed one:

- Its conversions put a printed XY break strain at about 0.59 times a moulded one (from 15 pairs), and an unstated one
  at par (from 25 pairs).
- Recorded as moulded, PETG Lite's 160 % would convert to about 94 % and floor nothing.

The mirror image: TPS, SBC, TPV and the maker-undisclosed TPEs publish 150 to 650 % on unstated bars and get no
estimate at all. So the rigid plastics are offered and the elastomers are not.

**How many.**

- In Flexible component, 7 of the 10 estimated candidates rest wholly on such floors: PETG (8 of 8 products), PC (1 of
  1), PCTG (5 of 5), CPE (3 of 3), PETG-PTFE (1 of 1), and two elastomers where the floor is harmless, TPC (4 of 4) and
  TPU harder than 95A (6 of 6). PVB is lifted to a middle value of 105 % by its 88 % floor.
- Across the database, 356 elongation estimates carry a floor from their own unstated bar, and 275 sit on it. 67 of the
  floors lie above every printed XY value of their material, where it has two or more.
- For tensile strength the same figures are 383, 367 and 104, though no preset asks for strength today.
- Related, but not the same: OPEN-PROBLEMS §36.2 (PA12, PCTG-GF).

**How serious.** Wrong answer: five rigid materials are shown above the collapsed list as candidates for a flexible
part.

**Direction.** For elongation, treat an unstated bar as possibly moulded: no floor, or the moulded conversion. It amends
the owner's own choice in D126, so it is the owner's call (change C26).

### A chamber the sheet does not mention holds the product, and the printer guide covers only 17 of 152 materials (F-F2)

**What happens.** When a sheet prints no chamber temperature, the tool reads "No temperature published" and the product
stays unresolved. Where a sheet is silent, the tool falls back on Bambu Lab's guide (decisions D88 and D90). It does so
only for the 17 materials mapped to a guide row, and never for a product with a Variant (decision D129). A printer check
is never estimated, so an open one also keeps a product out of the estimated candidates.

**Example.** QIDI PEBA 95A passes elongation on a printed 1,106.8 %, and passes the nozzle and bed checks. It is
unresolved only on the chamber: its sheet prints a fan of 50 to 100 % and no chamber line. colorFabb PLA/PHA, Siraya TPU
Air, colorFabb nGen and nGen FLEX, three TPS products, PVC, SAN, PE and twenty more are held the same way. The database
even holds a researched chamber band of 20 to 50 °C for PEBA, TPC and nGen, which decision D34 says decides nothing.

**How many.**

- 314 products have an unknown chamber or no print profile, unchanged since OPEN-PROBLEMS §30.3 (2026-10-07). 130 of
  them are PLA, elastomer, PETG or copolyester products, types an engineer prints in an open printer.
- In the six presets, 102 distinct products in 50 materials are unresolved by a printer check alone. 88 material-preset
  pairs would pass if those checks read "within": Outdoor 8, Indoor 36, Lightweight 11, Warm 16, High-stiffness 8 and
  Flexible 9 (PEBA, TPC, TPU harder than 95A, PET, PE, TPC-ESD, nGen FLEX, TPU-LW, TPS).
- By kind, the 102 products are: silent 62, a window the H2C only partly reaches 16, "recommended" with no temperature
  15, no profile 7, and a "-" 2. Every one concerns the chamber. The 7 with no profile, and 2 more (3DXTECH 3DXSTAT
  ESD-TPC and Stratasys FDM Nylon-CF10), are silent on nozzle and bed too.
- Turning estimates on never helps, because printer checks have no estimate. 46 products (31 material-preset pairs)
  whose every number is estimated to pass stay under "Insufficient evidence" for a printer check.

**How serious.** Wrong answer. The owner kept "recommended, no temperature" as unknown on 2026-10-05 (OPEN-PROBLEMS
§30.3). Silence for a type that is printed open (PLA, TPU, PEBA, TPC, copolyesters) has not been decided as such, and it
is the larger part.

**Direction.** Decide what silence means per type, printed open or not, as decision D90 did for the types that need an
enclosure. The review starts by mapping more materials to the guide where the type is the guide's (change C17).

### The row speaks for an estimated product while a measured one waits only on the printer check (F-F3)

**What happens.** The product that represents a material is the first that passes, else the first estimated candidate,
else the first unresolved one. So an estimate outranks a measured pass that is blocked only by a printer check.

**Example.** PEBA's row is answered by Spectrum's PEBA: "No qualifying measurement. Estimated 492 to 1,090 %". Six
siblings publish printed values that pass.

**How many.** 12 material-preset pairs: PEBA, TPC and TPU harder than 95A in Flexible component, PA12-CF and PPA-CF in
three presets each, PLA Wood in Lightweight structure, and ASA-CF and PPS-CF in High-stiffness fixture.

**How serious.** Misleading: the reader is told nothing is measured.

**Direction.** Prefer the product whose only gap is a printer check, and say so (change C18 orders the groups this way).

### "Insufficient evidence" names three different things, and unusable values only ever lift (F-F4)

**What happens.** One label covers a chamber window the H2C partly reaches, a missing temperature, and estimates that
miss the limit entirely. A partial window and "recommended" are unresolved by design (decisions D32 and D33). Product
estimates may not hide anything (decision D137, OPEN-PROBLEMS §35). Together with F-F1, the effect is one-sided. An
unstated 160 % can lift PETG into the estimated candidates, but an unstated 6 % can never take ABS-AF out.

**Example.** COC's two products state 60 to 80 °C. ABS-CF's state 50 to 70 and 60 to 80 °C, or "recommended". ABS-AF's
and PCTG-CF's published values are 5 to 9 % against a 100 % limit. All of them read "Insufficient evidence".

**How many.** On the printer side, 31 products in 20 materials, held by a printer check alone, are partial or
"recommended". On the number side (known in OPEN-PROBLEMS §35, sized here), 109 material-preset pairs sit under
"Insufficient evidence" although every unresolved product's wide range misses entirely: Outdoor 13, Lightweight 14,
High-stiffness 44 and Flexible 38 of 90.

**How serious.** Misleading.

**Direction.** Name the three cases apart (change C18).

### The Flexible preset tests ductility, not flexibility (F-F5)

**What happens.** Its one requirement is elongation at break (XY) of at least 100 %, which ductile rigid plastics pass.

**Example.** PA6/66 is supported on a printed 100 % beside its own 1,980 MPa modulus. 7 of the 18 materials listed are
rigid (1.5 to 2.3 GPa), as the table above shows.

**How many.** Flexible component only: 7 materials shown. PET (colorFabb PET Flex Max, 418 %) and PE would join them
once F-F2 is resolved.

**How serious.** Misleading: the preset's own caveat names the problem, and the list does not show it.

**Direction.** Add a stiffness or hardness ceiling the data already hold (change C30).

### Materials with no product are judged, listed and hidden on a family guess (F-F6)

**What happens.** PA66-CF, PA612 and PA612-GF have no product. Their material records say "page access failed; no
numbers imported" and "TDS not located". They are judged on the material itself, and read "No print profile recorded"
on every printer check. Their family-only estimates are allowed to hide them, by the material back-test (decisions D48
and D59). Every product estimate, by contrast, may not hide anything (D137, which needs 194 calibration groups). The
engine thus trusts the weakest evidence and not the stronger.

**Why.** The material rows stay in scope with no product, since nothing is deleted, and no family-entry route was
applied. The engine rule above does the rest.

**How many.** 3 materials in 6 presets, 18 rows: 3 hidden (PA66-CF and PA612-GF in Flexible, PA612 in High-stiffness)
and 15 under "Insufficient evidence". They are the only hidings on a number in all six presets. Every other hiding, 30
in all, is an elastomer's HDT that does not apply. OPEN-PROBLEMS §5 knows them as an evidence gap, not as a screening
question.

**How serious.** Misleading: a reader is offered, or told a guess removed, a material no one sells.

**Direction.** Make them family entries, or keep them out of candidate lists (change C16).

### A nozzle or bed window is read by its top, even when the printer reaches its bottom (F-F7)

**What happens.** For the chamber, the tool has a "partial" state: the printer reaches part of the window, and the
product stays unresolved. Nozzle and bed have no such state (decision D32). So a window that starts inside the H2C's
range but ends above it fails. D32's premise, that "the bottom of a window sits at the hardware's rated maximum", holds
for PEKK and PSU, not for a 90 to 130 °C PC bed.

**Example.** LCP's sheet prints a bed of 120 to 150 °C, Spectrum PC 275's 90 to 130 °C, and MatterHackers ABS's 100 to
130 °C. Each reads "Requires up to …; the H2C reaches only 120 °C" and fails.

**How many.** 34 products in 19 materials, 12 of them in scope. In 17 the window starts strictly below the limit. It
flips two materials' answers: LCP and PPS-ESD fail in all six presets. In the other materials a sibling product decides
the answer (decision D100), so the misreading does not show.

**How serious.** Wrong answer for 2 materials. "Requires up to 130 °C" for a 90 to 130 °C window is misleading wording.

**Direction.** Extend the partial state to nozzle and bed windows that start inside the printer's range (change C21).

## Words used in this file

- **Elongation at break (XY)**: the stretch at break of a bar printed flat, pulled in the print plane.
- **Unstated bar**: a value whose sheet does not say whether the test bar was printed or moulded.
- **Floor**: a lower limit the tool puts under a product's estimate from the product's own published value.
- **Estimate of a product**: the model's value for a product that publishes nothing measured the way the requirement
  asks. **Middle value**: its 50/50 guess (the page's "centre"). **Wide range (95 %)**: the page's "plausible" range.
- **Estimated candidate**: listed as "Estimated candidates to verify". **Insufficient evidence**: every other
  unresolved material, in a collapsed list. **Hidden as unlikely**: the page's "screened", behind the SCREENED chip.
- **Printer check**: the nozzle, bed and chamber temperatures a product needs, against the H2C's. A **partial** window
  is one the H2C reaches only in part.
- **Material-preset pair**: one material in one preset's results.

## Evidence and where to check

### How the figures were produced

Every figure comes from `$F`, written by `node docs/audits/2026-10-18-screening-review/census.mjs --full $F` from the
repository root on 9ca94d31fc5d. One product's decision comes from `npm run trace -- --scenario <file> --product
<GradeID> [--requirement chamber|bed|elongationXY]` with [flexible-component.json](../scenarios/flexible-component.json)
and [indoor-prototype.json](../scenarios/indoor-prototype.json). The sheets' words come from `npm run sql` over
`documents_fts`. Random draws: the preset's Insufficient-evidence IDs sorted, mulberry32 seeded 20261018, the first two
distinct draws (Flexible: M106, M144; Indoor: M137, M150):

```bash
node -e 'const d=require(process.argv[1])[process.argv[2]],ids=Object.keys(d).filter(i=>d[i].group==="insufficient").sort();let a=20261018;const r=()=>{a|=0;a=a+0x6d2b79f5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};const p=[];while(p.length<2){const i=ids[Math.floor(r()*ids.length)];if(!p.includes(i))p.push(i)}console.log(p)' $F "Flexible component"
```

### Flexible component, material by material

- PETG (M020): G020-06 Spectrum THE FILAMENT PETG Lite, V002708 (160 % "ASTM D638", specimen and direction unstated),
  S-SPECTRUM-en-tds-the-filament-petg-lite p. 1. Estimate 163 to 241 % (plausibly 160 to 300), precision "good",
  ownShare 0.7.
- PC (M035): G035-25 Yousu PC, V013304, V013303 (R-YOUSU-YOUSUPCTDS-535a p. 1).
- PEBA (M045): G045-07 QIDI PEBA 95A, V008145 (1,106.8 % printed XY); profile P0762 (R-QIDI-PEBA-95A: fan 50 to 100 %, no
  chamber line). The row is answered by G045-02 Spectrum PEBA.
- TPS (M170): G170-02 BASF Ultrafuse TPS 90A, V011341 (280 %, XY, specimen not stated), profile P1193. The three with
  unstated stretch: G167-02 Fillamentum Flexfill TPE 90A, V011132 (250 %); G170-01 Fabru TPS, V014408 (650 %, chamber 60
  to 80 °C, partial); G167-11 Fillamentum Flexfill TPE 96A (150 %).
- PA6/66 (M057): G057-02 3DXTECH AMIDEX PA6 Copolymer, V001047 (X-AMIDEX-PA6-Copolymer-v1-0 p. 1).
- PA66-CF (M056): its row in `materials.csv`; OPEN-PROBLEMS §5.
- ABS-AF (M106, random): G106-01 Spectrum ABS Kevlar, V002756 (6 %, the material's only published elongation). G106-02
  3D4Makers ABSKevlar publishes none and is silent on the chamber. G106-03 Nanovia ABS AF publishes none and FAILs on a
  90 °C chamber.
- PCTG-CF (M144, random): V007709 (G144-01), V011531 (G144-02), V010703 (G144-03). V010703 is a retired duplicate; the
  live record for G144-03's 5 % is V010929.
- The rigid materials' moduli: the F-F5 one-liner below. The preset's caveat: `notChecked` in
  [templates.js](../../../../app/js/ui/templates.js) (line 90).

### Indoor prototype, material by material

- PLA-PHA (M145): G145-01 colorFabb PLA/PHA, profile P0927 (R-COLORFABB-colorFabb-PLA-PHA-Printing-Filament-TDS p. 1).
- ABS-CF (M029): G029-01 3DXTECH CarbonX CF ABS (profiles P1289, P1636); G029-02 iSANMATE CF ABS; G029-08 Siraya Tech
  Fibreheart ABS CF Core; G029-05 Nanovia ABS CF (P0740).
- PA66-CF, PA612, PA612-GF (M056, M058, M060): their rows in `materials.csv`; F-F6.
- COC (M137, random): G137-01 purefil COC tough (P1459), G137-03 Fabru COC flex (P1453).
- TPU-LW (M150, random): G039-69 Siraya Tech Flex TPU Air, profile P0977 (D-SIRAYA-siraya-tech-flex-tpu-air-tds p. 1);
  G150-01 to G150-03. The guide's TPU row is mapped only to M161.
- LCP (M139): G139-01 purefil LCP, profile P1467 (R-FABRU-PUREFIL-4706-…-LCP-purefil). PPS-ESD (M124): G124-01, P1400.
- PBT (M140): G140-01, profiles P1447, P1458, P1468.

### F-F1: unstated-bar floors

- PETG Lite's prediction carries `impliedBounds` V002708 (160 %), `strength: this-grade`, precision "good", ownShare 0.7,
  plausible low end exactly 160 %. The conversions put "break moulded" at −0.534 on the ln scale (XY ≈ 0.59 × moulded,
  15 pairs) and "break unk" at 0 (25 pairs).
- D126 ("the owner chose that a bar whose specimen is not stated bounds as a printed one does",
  [DECISIONS](../../../DECISIONS.md)) admits `not-stated` among `BOUNDING_FORMS`
  ([lower-bounds.js](../../../../build/src/lower-bounds.js):13, used at :28). An unstated-direction break bounds the XY
  headline ([bounds.js](../../../../build/src/estimate/bounds.js):34-36) and floors the grade's range (:64). The
  estimated group needs only the centre to meet the limit ([constraints.js](../../../../app/js/engine/constraints.js):615).
- Related: [§36.2](../../../OPEN-PROBLEMS.md).
- One-liners (database-wide floors; floored estimated products per material in Flexible):

```bash
node -e 'const db=require("./dist/db.json"),M=new Map(db.measurements.map(m=>[m.id,m]));let a=0,b=0,c=0;for(const g of db.grades){const e=g.estimate?.elongationXY;const f=(e?.impliedBounds??[]).filter(x=>M.get(x.measurementId).specimenForm==="not-stated");if(!f.length)continue;a++;const lo=Math.max(...f.map(x=>x.lo));if(Math.abs(e.plausible.lo-lo)/Math.max(1,lo)<.03)b++;const v=db.grades.filter(h=>h.materialId===g.materialId&&h.headline?.elongationXY?.level==="comparable").map(h=>h.headline.elongationXY.value);if(v.length>1&&lo>Math.max(...v))c++}console.log(a,b,c)'
node -e 'const db=require("./dist/db.json"),d=require(process.argv[1])["Flexible component"],M=new Map(db.measurements.map(m=>[m.id,m])),G=new Map(db.grades.map(g=>[g.id,g]));for(const[id,m]of Object.entries(d)){if(m.group!=="estimated")continue;const e=m.products.filter(p=>p.group==="estimated"),f=e.filter(p=>(G.get(p.gradeId).estimate?.elongationXY?.impliedBounds??[]).some(b=>b.lo>=100&&M.get(b.measurementId).specimenForm==="not-stated"));console.log(id,m.name,f.length+"/"+e.length)}' $F
```

### F-F2: silent chambers

- QIDI PEBA 95A: G045-07. The researched band is in `chamber_bands.csv` (D34).
- A silent axis reads `No temperature published` ([process.js](../../../../build/src/normalize/process.js):249-250). The
  fallback to Bambu Lab's guide (D88, D90) runs only for the 17 materials mapped in `print_guide_materials.csv`
  ([products.js](../../../../build/src/products.js):368). A product with a Variant reads none (D129). `unknown` and
  `partial` map to UNKNOWN and INDETERMINATE ([constraints.js](../../../../app/js/engine/constraints.js):30-36), and an
  unresolved gate is never "estimated" (:615).
- The two products also silent on nozzle and bed: G114-01 (3DXSTAT ESD-TPC), G165-04 (FDM Nylon-CF10). Earlier count:
  [§30.3](../../../OPEN-PROBLEMS.md).
- One-liners (products and materials held by a gate alone, per preset; products whose every number is estimated to pass):

```bash
node -e 'const d=require(process.argv[1]),G=/^(Nozzle|Bed|Chamber) temp/,O=/^(priceCADkg|hdt045 >= 90)/;for(const[p,ms]of Object.entries(d)){let n=0,m=0;for(const x of Object.values(ms)){if(x.verdict!=="UNKNOWN")continue;const g=x.products.filter(q=>{const o=q.results.filter(r=>!O.test(r.criterion)&&r.status!=="PASS");return q.verdict==="UNKNOWN"&&o.length&&o.every(r=>G.test(r.criterion))});n+=g.length;m+=g.length>0}console.log(p,n,m)}' $F
node -e 'const d=require(process.argv[1]),G=/^(Nozzle|Bed|Chamber) temp/,O=/^(priceCADkg|hdt045 >= 90)/,ok=(c,x)=>{const[,op,v]=c.split(" ");return op[0]===">"?x>=+v:x<=+v};let P=0,Mt=0;for(const ms of Object.values(d))for(const x of Object.values(ms)){if(x.group!=="insufficient")continue;const n=x.products.filter(q=>{const o=q.results.filter(r=>!O.test(r.criterion)&&r.status!=="PASS"),g=o.filter(r=>G.test(r.criterion)),k=o.filter(r=>!G.test(r.criterion));return q.verdict==="UNKNOWN"&&g.length&&k.length&&k.every(r=>r.estimated&&!r.screened&&Number.isFinite(r.prediction?.centre)&&ok(r.criterion,r.prediction.centre))}).length;P+=n;Mt+=n>0}console.log(P,Mt)' $F
```

### F-F3: which product represents the material

- PEBA's row: G045-02 Spectrum. Rule: the first passing, else the first *estimated*, else the first unresolved product
  ([constraints.js](../../../../app/js/engine/constraints.js):692).
- One-liner:

```bash
node -e 'const d=require(process.argv[1]),G=/^(Nozzle|Bed|Chamber) temp/,O=/^(priceCADkg|hdt045 >= 90)/;const o=[];for(const[p,ms]of Object.entries(d))for(const[i,x]of Object.entries(ms))if(x.group==="estimated"&&x.products.some(q=>{const r=q.results.filter(r=>!O.test(r.criterion)&&r.status!=="PASS");return q.verdict==="UNKNOWN"&&r.length&&r.every(r=>G.test(r.criterion))}))o.push(p.split(" ")[0]+":"+i);console.log(o.length,o.join(" "))' $F
```

### F-F4: one label, three cases

- Wording: [table.js](../../../../app/js/ui/table.js):251 and :560, over D32, D33 and D137
  ([§35](../../../OPEN-PROBLEMS.md)).
- One-liner (number side, per preset):

```bash
node -e 'const d=require(process.argv[1]),G=/^(Nozzle|Bed|Chamber) temp/,O=/^(priceCADkg|hdt045 >= 90)/,f=(c,pl)=>{const[,op,v]=c.split(" ");return op[0]===">"?pl.hi<+v:pl.lo>+v};for(const[p,ms]of Object.entries(d)){const ins=Object.values(ms).filter(m=>m.group==="insufficient"&&m.products.length);console.log(p,ins.filter(m=>{const u=m.products.filter(q=>q.verdict==="UNKNOWN");return u.length&&u.every(q=>q.results.some(r=>!O.test(r.criterion)&&!G.test(r.criterion)&&r.prediction?.plausible&&f(r.criterion,r.prediction.plausible)))}).length)}' $F
```

### F-F5: ductility, not flexibility

- Template definition: [templates.js](../../../../app/js/ui/templates.js):88-94, one requirement, elongation XY ≥ 100 %.
- One-liner (the modulus of each supported or estimated material):

```bash
node -e 'const db=require("./dist/db.json"),d=require(process.argv[1])["Flexible component"],M=new Map(db.materials.map(m=>[m.id,m]));for(const[i,x]of Object.entries(d))if(x.group==="supported"||x.group==="estimated"){const h=M.get(i).headline.tensileModulusXY;console.log(i,x.name,x.group,h?.known?h.value:"est "+h?.estimate?.centre)}' $F
```

### F-F6: materials with no product

- PA66-CF (M056), PA612 (M058), PA612-GF (M060): their `materials.csv` rows. They take the material path
  ([constraints.js](../../../../app/js/engine/constraints.js):682) and carry family-only estimates with `canScreen: true`
  (material back-test, D48/D59), while every product prediction has `canScreen: false` (D137). Evidence gap:
  [§5](../../../OPEN-PROBLEMS.md).
- One-liner (screened materials per preset):

```bash
node -e 'const d=require(process.argv[1]);for(const[p,ms]of Object.entries(d)){const s=Object.entries(ms).filter(([,m])=>m.group==="screened");console.log(p,s.map(([i,m])=>i+(m.products.length?"":"(no products)")).join(" "))}' $F
```

### F-F7: windows read by their top

- LCP: G139-01, P1467. Spectrum PC 275: G035-03, P0203. MatterHackers ABS: G027-37. PPS-ESD: G124-01.
- Rule D32: the partial window exists for the chamber only
  ([process.js](../../../../build/src/normalize/process.js):269).
- One-liner (products and materials whose nozzle or bed window starts within the H2C's reach and fails):

```bash
node -e 'const db=require("./dist/db.json"),L={nozzle:350,bed:120},g=new Set,m=new Set;for(const x of db.grades){if(x.retired||/-R\d+$/.test(x.id))continue;for(const a of["nozzle","bed"]){const v=x.print?.[a];if(v?.verdict==="exceeds"&&v.min!=null&&v.min<=L[a]){g.add(x.id);m.add(x.materialId)}}}console.log(g.size,m.size)'
```

### The reviewer's root-cause table

| ID | Layer | Reach | Severity |
|---|---|---|---|
| F-F1 | Estimate model (D126) | Flexible 7 of 10 estimated materials (5 rigid); 356 / 275 / 67 elongation predictions database-wide | Wrong answer |
| F-F2 | Build rule and engine rule | 102 products, 50 materials, 88 material-preset pairs; Indoor 36 of 39; 46 products kept from Estimated | Wrong answer |
| F-F3 | Engine rule | 12 material-preset pairs | Misleading |
| F-F4 | Wording over D32, D33, D137 | 20 materials on gates; 109 pairs on numbers (§35) | Misleading |
| F-F5 | Template | 7 of 18 listed in Flexible | Misleading |
| F-F6 | Source data and engine rule | 3 materials, 18 rows; the only 3 numeric screens | Misleading |
| F-F7 | Build rule (D32) | 34 products, 19 materials; LCP and PPS-ESD FAIL | Wrong answer (2) |
