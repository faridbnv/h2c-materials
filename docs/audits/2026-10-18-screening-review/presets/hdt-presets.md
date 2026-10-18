# Outdoor structural part and Warm environment

> **Historical record** (2026-10-18): written for the screening review on release 9ca94d31fc5d. Figures may have changed since; re-run [census.mjs](../census.mjs).

> **In short.** In both heat questions a few materials are offered on heat-deflection figures that are not what a printed
> part does. PLA is an "Estimated candidate" for a 100 °C outdoor part only because colorFabb PLA HP's 135 °C is an
> injection-moulded figure (its earlier sheet says so), and PLA-CF, PLA-NF and PBAT are "Supported" at 80 °C on sheets
> whose own glass transition, maximum-use temperature or 6 MPa stiffness contradict them. "Let estimates rule out
> materials" removes only elastomers, for which heat deflection does not apply, and three materials nobody sells: no
> product estimate may screen, and heat deflection has no product estimates at all, so the switch never touches a heat
> question's Insufficient list. That list is largely materials physics and their own measured products already rule out
> (19 of 68 in Warm environment, PLA variants at 50 to 62 °C among them; 181 such listings across the six presets, the
> known §35 problem at the same size). The rules also ignore evidence that settles a case: a printed bar's 80 °C at 1.8
> MPa (LUVOCOM PAHT) is reported as "Not published" although it proves at least 80 °C at 0.45 MPa.

## Method

Every figure comes from `$F`, written by `node docs/audits/2026-10-18-screening-review/census.mjs --full $F` on
9ca94d31fc5d (dist/db.json and dist/h2c.sqlite of that release, not rebuilt). One product's decision:
`npm run trace -- --scenario <file> --product <GradeID>` with [outdoor-structural-part.json](../scenarios/outdoor-structural-part.json)
and [warm-environment.json](../scenarios/warm-environment.json); the sheets' words from `npm run sql` over `documents_fts`.
Random draws as in [flexible-and-indoor.md](flexible-and-indoor.md): the preset's Insufficient-evidence IDs sorted,
mulberry32 seeded 20261018, the first two distinct draws (Outdoor: M105, M138; Warm: M116, M144).

## Outdoor structural part

HDT at 0.45 MPa ≥ 100 °C, tensile modulus XY ≥ 3 GPa, density ≤ 1500 kg/m³ (all required), price ≤ 100 CAD/kg
(reported), scope, build material and three print gates. Status bar: PASS 7, UNKNOWN 101 (screened 14), FAIL 44. Listed:
supported 7, estimated 6, insufficient 81; held out: screened 14 (all elastomers, HDT not applicable), fail 44. Of the
81 insufficient, 43 have a required property on which every comparable product value fails (F-H4), and 13 are held
only by product predictions that wholly fail but may not screen (F-H3). The 7 supported (ASA-CF, PA6-CF, PA6-GF, PET-CF,
PPA-GF, PP-CF, PP-GF) are sound engineering picks, judged dry; UV is declared unchecked by the template.

| Material | Group | Verdict | Why | Evidence |
|---|---|---|---|---|
| M001 PLA | estimated | wrong | The one product that makes it a candidate is colorFabb PLA HP: 135 °C read as a printed bar because the table is headed "3D Printed". The row carries "*Optimal temperature resistance is obtained after annealing the sample", and the same product's earlier sheet prints "HDT 134*" with "*only injection molded data available". Without it PLA is Insufficient (F-H1) | G001-58: V005853 (R-COLORFABB-TDS-E-ColorFabb-PLA-HP-7a500b p. 1), V005792 Raw material value (…-5210c3 p. 1); density estimate 1,190 to 1,300 |
| M028 ABS-GF | estimated | right by the rule, at the limit | purefil ABS GF10 passes at exactly 100 °C, with no specimen stated (a maker §15 lists as unsettled); ABS-GF's other products print 82 to 100 | G028-11: V013101 (R-FABRU-3491… p. 1); modulus V005707 as published |
| M020 PETG | insufficient | right by D100, misleading | 45 of 73 products publish a comparable HDT, all below 100 (highest 94, Spectrum PET-G HT100). PETG prints amorphous, and this database's 37 PETG sheets put HDT 4 °C below their own Tg on average. 28 silent products keep it listed | G020-08: V012391; F-H4 one-liner |
| M082 PP | insufficient | misleading | 6 of 12 fail HDT ≥ 100 (51 to 85 °C). Every product's modulus prediction lies wholly below 3 GPa (plausible tops 0.95 to 1.67 GPa); none may screen (canScreen false) | G082-10 V012179, G082-06 V005642; G082-02 prediction 0.30 to 0.97 GPa |
| M036 PC FR | insufficient | misleading | Bambu PC FR publishes its modulus only annealed: 1.67 GPa after 80 °C for 12 h. Annealing PC 65 °C below its Tg does not lower stiffness, so the printed part cannot reach 3 GPa; the other product fails | G036-01: V000706 (B-pc-fr-TDS); G035-08 FAIL |
| M161 TPU 95A class | screened | right | Heat deflection is not applicable to an elastomer (D56) | census reason, 19 products |
| M105 ASA-EC (random) | insufficient | right by the rule | One product: HDT not published; modulus estimate 1.83 to 4.52 GPa straddles 3. ASA's printed HDTs (82 to 103) make 100 unlikely, but nothing here shows it | G105-01 |
| M138 PE-GF (random) | insufficient | right by the rule | purefil HDPE GF20 fails at 85 °C (specimen unstated); iSANMATE HDPE GF has no profile and no values, and holds the material alone | G138-02: V008436; G138-03 |

## Warm environment

HDT at 0.45 MPa ≥ 80 °C (required), scope, build material and three print gates. Status bar: PASS 39, UNKNOWN 84
(screened 16), FAIL 29. Listed: supported 39, estimated 0, insufficient 68; held out: screened 16 (all elastomers,
HDT not applicable), fail 29. No product anywhere carries an HDT estimate, so "estimated" is structurally empty here
(F-H3). Of the 68 insufficient, 19 have every comparable HDT below 80 °C, ten of them at 62 °C or less (F-H4). Of the
118 passing products, 66 pass on an HDT whose specimen the sheet does not state, and 13 of the 39 supported materials
rest on such values alone (PETG on one portfolio row at exactly 80 °C, PP on two products at exactly 80 °C).

| Material | Group | Verdict | Why | Evidence |
|---|---|---|---|---|
| M133 PBAT | supported | wrong | Flashforge "Flexible" (PBAT) passes on 90 °C at 0.455 MPa, printed; the same sheet prints a modulus of 6 to 7 MPa and 400 to 600 % elongation. By the tool's own D56 basis a bar under about 225 MPa has no meaningful HDT, but HDT "applies" because PBAT's polymer row is semicrystalline (F-H2) | G133-01: V005369, V005367 (D-FLASH-PBAT-TDS-EN p. 1) |
| M018 PLA-CF | supported | wrong | One of 19 products passes: 3DXTECH CarbonX CF-PLA, 91 °C on a printed bar from a 23 °C bed, beside Tg 60 °C on the same sheet. The eight other comparable values are 54 to 65 °C (F-H1) | G018-04: V003309 (X-ECOMAX-CarbonX-CF-PLA-TDS-v3 p. 1) |
| M152 PLA-NF | supported | wrong | Nanovia PLA Flax prints "HDT B 80 – 90 °C (E2092)" beside "Tg 55 – 60 °C" and "Max temperature 55 °C"; the record takes 80 and passes. Extrudr FLAX prints 55 (F-H1) | G152-02: V010287, V012276 (R-NANOVIA-PLA-Flax p. 1) |
| M001 PLA | supported | right by the rule, misleading | 7 of 195 products pass. Volcano PLA 150C (110 °C, "without annealing") would carry it alone by D83; five of the other six are doubtful (purefil PLA+ 90 °C, specimen unstated, is the sixth): PLA HP's moulded 135, 3DXTECH Tough PLA 80 and SimuBone 89 (Tg 55 on their sheets, 23 °C bed), Nanovia PLA EF 3D850 and PLA VX 80 to 90 (Tg 55 to 60, "Max temperature 55 °C"). The row shows PLA's all-product median | V007602, V005853, V003212, V010211, V007474, V007533 |
| M008 PLA Silk | insufficient | right by D100, misleading | 16 of 33 products publish a comparable HDT, all 50 to 62 °C; the other 17 are silent or published only annealed (Bambu PLA Silk+ 60 °C after 55 °C for 8 h, which bounds the printed part below 80) (F-H4, F-H5) | G008-10 V005669; G009-01 V000149 |
| M147 PAHT | insufficient | wrong group, wrong reason | LUVOCOM 3F PAHT 9825 NT prints HDT A (1.8 MPa) 80 °C on a printed bar. A lighter load cannot deflect the bar sooner, so HDT at 0.45 MPa ≥ 80 and the product passes. The page says "Not published in the sampled sources" (F-H5) | G147-01: V011437 (R-COLORFABB-TDS-LUVOCOM-3F-Filaments-9825-NT p. 1) |
| M116 PC-ESD (random) | insufficient | right by the rule | Both products pass HDT (135, 141 °C); held by a chamber "recommended with no temperature" and by a product with no print profile (a gate question, not heat) | G116-01 V003156, G116-02 V015103 |
| M144 PCTG-CF (random) | insufficient | right by D100, misleading | Two of three print 78 and 76 °C (specimen unstated); Nobufil publishes no HDT and holds the material | G144-01 V007712, G144-03 V010932 |

The 16 screened are TPU classes, TPE, TPS, TPV, TPC, PEBA, OBC and their filled or conductive variants: right by D56.
One is arguable: Spectrum S-Flex Carbon's moulded bar is 2.2 GPa with HDT 134 °C at 0.45 MPa (V004078, V004080), yet
TPU-CF is screened by family (F-H2).

## Findings

### F-H1. Moulded, annealed or Tg-inconsistent heat deflections are read as the printed part's

**Evidence.** colorFabb PLA HP (G001-58) decides PLA's Outdoor group on V005853, recorded "Printed specimen" from the
"Typical Properties – 3D Printed" heading, although its row's asterisk points to annealing and the earlier sheet of the
same product says the 134 °C is injection-moulded (V005792 is correctly a Raw material value). In Warm environment,
six PLA-family products pass on an HDT 25 to 34 °C above the glass transition their own sheet prints: 3DXTECH
SimuBone 89/55 (V010211), CarbonX CF-PLA 91/60 (V003309), ECOMAX Tough PLA 80/55 (V003212), all printed on a 23 °C bed;
Nanovia PLA EF 3D850, PLA VX and PLA Flax 80–90/55–60 (V007474, V007533, V010287), whose sheets also print "Max
temperature 55 °C" and, for 3D850, "pieces in direct sunlight should be avoided". The database itself says this cannot
be an as-printed amorphous bar: over 97 PLA sheets with both values, HDT at 0.45 MPa sits 2 °C below Tg on average
(PETG 4, ABS 12, PC 8 below); these six are the only PLA pairs more than 16 °C above. Decides three groups: M001
Outdoor (estimated), M018 and M152 Warm (supported); M001 Warm keeps Supported through Volcano PLA 150C and purefil
PLA+.

**Root cause.** Source data and build rules. (1) The comparability rule admits an unstated specimen and unstated
post-processing as the printed part's ([products.js:16-18](../../../../build/src/products.js)); a heading-level
"3D Printed" outranks a row footnote. (2) No physical relation ties HDT to Tg for a polymer that prints amorphous:
[physical_relations.csv](../../../../data/tables/physical_relations.csv) relates HDT only to HDT (PR08) and to the melt
for semicrystalline polymers (PR11), and PLA is "amorphous" ([polymers.csv:2](../../../../data/tables/polymers.csv)).
(3) The HDT window for amorphous polymers ([plausibility_windows.csv:57](../../../../data/tables/plausibility_windows.csv),
W0056) spans 30 to 180 °C for PC and PLA alike, and its stated basis, "glass transition plus 20 °C at 0.45 MPa", is the
opposite of what its own data show. Known in part: PLA HP's "unexplained asterisk" is in
[OPEN-PROBLEMS §37.18](../../../OPEN-PROBLEMS.md); that it is moulded and decides a group, and the Tg-inconsistent
PLA values, are new. Admitting unstated specimens is the owner's policy (D84, §15): 794 of 1,323 HDT rows state none.

**Reach.** 7 PLA-family products above their own Tg by more than 15 °C; the 6 at 25 °C or more all pass Warm
environment; 3 material groups decided (M001 Outdoor, M018 and M152 Warm). One-liner:
`npm run sql -- "with tg as (select gradeid,sourceid,min(normalized_value) tg from measurements where property='Glass transition temperature' and data_status not like '%implausible%' group by 1,2) select p.gradeid,p.value,tg.tg from products_compiled p join measurements m on m.measurementid=p.measurementid join tg on tg.gradeid=p.gradeid and tg.sourceid=m.sourceid join materials mt on mt.materialid=p.materialid join polymers pol on pol.polymerid=mt.estimate_identity where p.headline_key='hdt045' and p.level='comparable' and pol.morphology='amorphous' and m.post_processing_state<>'annealed' and p.value>tg.tg+15"`

**Severity.** Wrong answer (three materials shown as candidates that should not be).

### F-H2. Whether heat deflection applies follows the polymer's class, not the product's stiffness

**Evidence.** PBAT passes Warm environment on a 6 MPa product (above). nGen FLEX prints a 150 MPa modulus (V005859)
and sits in Insufficient rather than screened; Crystal Flex (SBC) and purefil PVC-P 94A likewise. Conversely TPU-CF is
screened although the one sheet with a stiffness prints a 2.2 GPa moulded bar (a datum §37.3 already questions).

**Root cause.** Template definition: hdt045's Applies to lists morphologies and families
([headline_definitions.csv:15](../../../../data/tables/headline_definitions.csv)); compile marks a material not
applicable from its polymer row ([compile.js:245-246](../../../../build/src/compile.js)) and the engine screens on it
([constraints.js:132-137](../../../../app/js/engine/constraints.js)). PBAT's row says semicrystalline
([polymers.csv:44](../../../../data/tables/polymers.csv)); D56's own reason (a bar under about 225 MPa) is a product
property the rule never reads.

**Reach.** 1 wrong answer (M133 in Warm environment; any heat question at 90 °C or less); misleading listings in
Warm (M135's PVC-P, M143, M174) and Outdoor (M135, M174); 1 arguable screen (M129). The one-liner returns PBAT and
purefil COC flex (60 °C, which fails anyway):
`npm run sql -- "select a.gradeid,a.value modulus,b.value hdt045 from products_compiled a join products_compiled b on b.gradeid=a.gradeid and b.headline_key='hdt045' where a.headline_key='tensileModulusXY' and a.value<0.225"`

**Severity.** Wrong answer (one), misleading (three).

### F-H3. "Let estimates rule out materials" screens only elastomers and materials nobody sells

**Evidence.** Screens per preset, by kind (material level; polymer screens need an environment requirement, which no
preset has):

| Preset | Screened | Not applicable | Material estimate (no product) | Product estimate | Polymer |
|---|---:|---:|---:|---:|---:|
| Outdoor structural part | 14 | 14 | 0 | 0 | 0 |
| Indoor prototype | 0 | 0 | 0 | 0 | 0 |
| Lightweight structure | 0 | 0 | 0 | 0 | 0 |
| Warm environment | 16 | 16 | 0 | 0 | 0 |
| High-stiffness fixture | 1 | 0 | 1 (M058) | 0 | 0 |
| Flexible component | 2 | 0 | 2 (M056, M060) | 0 | 0 |

Across the presets there are 2,858 product predictions on required properties; none may screen, 1,393 lie wholly on
the failing side, and 109 Insufficient listings are held only by such predictions (Outdoor 13, Lightweight 14,
High-stiffness 44, Flexible 38; Warm 0, because HDT has none).

**Root cause.** Estimate model and engine. (1) D137 product exclusions are uncertified: with no class at 194
calibration groups, `screenRange` is null and `canScreen` false
([product-screening.js:150-155](../../../../build/src/estimate/product-screening.js)). (2) HDT's grade calibration
reaches its clamp, so no product receives an HDT prediction at all
([estimate/index.js:105-113](../../../../build/src/estimate/index.js)); a silent product in a heat question is plain
"Not published" and cannot even be an estimated candidate ([constraints.js:614-617](../../../../app/js/engine/constraints.js)).
(3) A material estimate exists only where no product publishes ([estimate/index.js:118](../../../../build/src/estimate/index.js))
and reaches products only in pre-v2 snapshots ([products.js:169-175](../../../../app/js/engine/products.js)), so it
decides only for a material with no product (M056, M058, M060; see F-F6 in [flexible-and-indoor.md](flexible-and-indoor.md)).
(4) D137 screens a material only when every unresolved product is screened ([constraints.js:690-691](../../../../app/js/engine/constraints.js)).
The limits are recorded in [§35](../../../OPEN-PROBLEMS.md); what they leave the switch doing is not.

**Reach.** 33 material screens in six presets: 30 not applicable, 3 product-less. One-liner:
`node -e 'const d=require(process.argv[1]);for(const[p,ms]of Object.entries(d)){const k={};for(const m of Object.values(ms)){if(m.group!=="screened")continue;const t=!m.products.length?"no-product estimate":m.products.every(x=>!x.screened||x.results.some(r=>r.reason.startsWith("Not applicable")))?"not applicable":"other";k[t]=(k[t]||0)+1}console.log(p,JSON.stringify(k))}' $F`

**Severity.** Misleading: the switch's name promises screening it cannot do in any heat question.

### F-H4. Materials whose every measured product fails stay in Insufficient (§35, still open)

**Evidence.** PLA Silk, PETG, PP and PCTG-CF above. In Warm environment 19 of 68 insufficient materials have every
comparable HDT below 80 °C; ten of them (PLA Sparkle, Glow, Galaxy, Marble, Metal, Wood, Aero, Silk, PLA-ESD, PCL) top
out at 51 to 62 °C. The 2026-10-07 audit counted 51 such materials for the 5 GPa question; it is 47 of 94 now.

**Root cause.** Engine rule D100 ([constraints.js:681-691](../../../../app/js/engine/constraints.js)): a material fails
only when every product fails, and a sibling's failure never bounds a silent product
([2026-10-07 audit](../../2026-10-07-uncertain-logic/README.md), [§35](../../../OPEN-PROBLEMS.md)). For heat there is not
even an uncertified prediction to show (F-H3).

**Reach.** 181 of 436 Insufficient listings: Outdoor 43 of 81, Indoor 0 of 39, Lightweight 23 of 64, Warm 19 of 68,
High-stiffness 47 of 94, Flexible 49 of 90. One-liner (required numeric properties only):
`node -e 'const d=require(process.argv[1]),rep={"High-stiffness fixture":"hdt045"};for(const[p,ms]of Object.entries(d)){let ins=0,hit=0;for(const m of Object.values(ms)){if(m.group!=="insufficient")continue;ins++;const req=[...new Set(m.products.flatMap(x=>x.results.filter(r=>r.status==="FAIL"&&/^(hdt045|tensileModulusXY|density|elongationXY) /.test(r.criterion)&&!r.criterion.startsWith(rep[p]||"~")).map(r=>r.criterion)))];if(req.some(q=>m.products.every(x=>x.results.some(r=>r.criterion===q))))hit++}console.log(p,hit,"of",ins)}' $F`

**Severity.** Misleading.

### F-H5. Evidence that bounds a value one way is not used, and is reported as absent

**Evidence.** (1) A printed HDT at 1.8 MPa: LUVOCOM PAHT 80 °C (V011437) proves HDT at 0.45 MPa ≥ 80, yet the
product is UNKNOWN with "Not published in the sampled sources". (2) An annealed value below a "≥" limit: Bambu PC FR's
1.67 GPa (V000706), PLA Silk+'s 60 °C (V000149). Heat treatment below the melt raises crystallinity and relaxes the
glass; it does not lower HDT or modulus, so the as-printed part fails too.

**Root cause.** Engine rules D48 ("A bound never passes", [DECISIONS](../../../DECISIONS.md) D48) and D99: the 1.8 MPa
lower bound serves only as a veto on estimate screens ([constraints.js:155-159](../../../../app/js/engine/constraints.js)),
and an annealed value is "elsewhere" whatever its direction, because "Changes with annealing" is one flag per headline
([headline_definitions.csv:15](../../../../data/tables/headline_definitions.csv)). The reason text does not mention a
published 1.8 MPa value. For HDT the bound is the test's physics on the same product, not an inference.

**Reach.** 51 products (28 materials) hold an as-printed or unstated HDT at 1.8 MPa ≥ 80 °C with no comparable
0.45 MPa value; in Warm environment 24 of them have nothing else unresolved, and 3 materials would be Supported (M104 PA6-CE, M113 ASA-AF, whose
copy is disputed in accepted-findings, M147 PAHT). Annealed values below a required "≥" limit (HDT, modulus): 141
product results (Outdoor 56, Lightweight 21, Warm 23, High-stiffness 41), deciding 6 listings (M036, M106 Outdoor; M036
Lightweight; M036, M065, M074 High-stiffness). One-liners:
`npm run sql -- "select count(*),count(distinct p.materialid) from products_compiled p join measurements m on m.measurementid=p.measurementid where p.headline_key='hdt18' and p.value>=80 and m.post_processing_state<>'annealed' and m.moisture_state<>'conditioned' and not exists (select 1 from products_compiled q join measurements mq on mq.measurementid=q.measurementid where q.gradeid=p.gradeid and q.headline_key='hdt045' and q.level='comparable' and mq.post_processing_state<>'annealed')"`
`node -e 'const d=require(process.argv[1]),rep={"High-stiffness fixture":"hdt045"};for(const[p,ms]of Object.entries(d)){let n=0;const mv=[];for(const[id,m]of Object.entries(ms)){const hit=r=>{const[q,op,v]=r.criterion.split(" ");const a=r.reason.match(/^Published only after annealing.*?\(([\d.]+) /);return a&&/^(hdt045|tensileModulusXY)$/.test(q)&&q!==rep[p]&&op[0]===">"&&+a[1]<+v};for(const x of m.products)n+=x.results.filter(hit).length;const u=m.products.filter(x=>x.verdict==="UNKNOWN");if(m.group==="insufficient"&&u.length&&u.every(x=>x.results.some(hit)))mv.push(id)}console.log(p,n,mv.join(" "))}' $F`

**Severity.** Misleading (materials listed lower than their evidence warrants; one reason untrue).

### F-H6. One number typed at two loads across a maker's two documents

**Evidence.** Fiberlogy PP: its data sheet prints 51 °C "@ 1.8 MPa" (V009228), its product page 51 °C "@ 0.45 MPa"
(V012179), and the 0.45 reading fails G082-10 in both presets; 51 °C is a typical PP figure at 1.8 MPa. colorFabb PA Blue
Metal Detectable prints "Heat Deflection temperature (amorphous) 60" above "Heat Deflection Temperature (A) 90"; the
record reads "(A)" as ISO 75 method A (V011126), while the pairing with "amorphous" and the other sheet's HDT-B 90
(V011255) suggest a crystallised bar at 0.45 MPa. S-Flex Carbon's "HDT A - 134 °C" is known (§37.3).

**Root cause.** Transcription, and a lint that compares loads within one source only (PR08 "grade;source",
[physical_relations.csv:9](../../../../data/tables/physical_relations.csv)).

**Reach.** 6 grades with one value at 1.8 MPa on one source and 0.45 MPa on another (G001-77, G020-25, G031-13, G082-10,
G129-01, G164-02); one product verdict (G082-10), no group. Latent: if F-H5's bound were adopted, G164-02's "(A)" would
wrongly pass M164. One-liner:
`npm run sql -- "select a.gradeid,a.measurementid,b.measurementid from measurements a join measurements b on a.gradeid=b.gradeid and a.sourceid<>b.sourceid and a.normalized_value=b.normalized_value where a.property='HDT' and b.property='HDT' and a.test_load_mpa=1.8 and b.test_load_mpa=0.45 and a.data_status like 'Published value%' and b.data_status like 'Published value%' and a.data_status not like '%implausible%'"`

**Severity.** Cosmetic now (latent wrong answer).

## Root causes

| ID | Layer | Statement | Reach | Severity |
|---|---|---|---|---|
| R-H1 | Source data / build rules | A moulded, annealed or Tg-inconsistent HDT enters as the printed part's: unstated specimen and treatment are admitted, a heading outranks a row footnote, and no HDT–Tg relation exists for polymers that print amorphous (W0056's basis says the opposite of the data). Direction: read the footnote, add the relation | 7 products; 3 groups (M001 Outdoor, M018 and M152 Warm) | Wrong answer |
| R-H2 | Template definition | HDT applicability is keyed on the polymer's class, not the product's stiffness. Direction: let a product's own modulus or Shore A make HDT not applicable | M133 wrong; M135, M143, M174 misleading; M129 arguable | Wrong answer |
| R-H3 | Estimate model + engine | "Let estimates rule out materials" can screen only not-applicable and product-less materials: product exclusions uncertified (D137), HDT predictions not shipped, material estimates unused where a product exists. Direction: say so on the switch, or certify a class | 33 screens: 30 NA, 3 product-less; 0 of 2,858 predictions; 109 listings held only by them | Misleading |
| R-H4 | Engine rule (D100) | A material whose every measured product fails stays Insufficient while one product is silent (§35) | 181 of 436 Insufficient listings (Warm 19, Outdoor 43) | Misleading |
| R-H5 | Engine rule (D48, D99) | Physical one-way bounds (HDT at 1.8 MPa ≥ limit; an annealed HDT or modulus below a "≥" limit) never decide, and the reason calls the value unpublished | Warm 51 products, 3 materials; 141 annealed results, 6 listings | Misleading |
| R-H6 | Transcription / lint | One number typed at two loads across two documents; the load lint compares within one source | 6 grades, 1 product verdict | Cosmetic (latent) |
