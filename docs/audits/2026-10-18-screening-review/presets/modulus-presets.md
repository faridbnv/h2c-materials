# Modulus presets: Lightweight structure and High-stiffness fixture

> **Historical record** (2026-10-18): written for the screening review on release 9ca94d31fc5d. Figures may have changed since; re-run [census.mjs](../census.mjs).

> **In short.** Both presets ask for a stiffness that few products publish in a comparable form, so most of each answer
> comes from predictions, and that is where it goes wrong. A material becomes an "estimated candidate" when any one
> product's predicted centre meets the limit: half of those centres sit closer to the limit than the prediction's own
> uncertainty, more than half of the estimated materials rest on a single product, and in thirteen cases (ABS, PLA Silk,
> PLA-CF among them) every product that was actually measured fails the requirement. A prediction is mostly the product's
> own unusable value (no test direction, or a moulded bar) pulled about 30 % toward its material, which carries some over
> the line (Fillamentum CPE CF112 publishes 2.2 GPa and is predicted 2.53 against 2.5), and the model takes values with
> no stated direction at face value though they run about 20 % above printed ones. At the other end, 44 of High-stiffness
> fixture's 94 "Insufficient evidence" materials are ones the model already places wholly below 5 GPa (TPU classes,
> PP, PEBA), because no product prediction may rule anything out, while the one material it does rule out, PA612, has no
> product to buy. Two data problems decide answers outright: carbon-fibre PETG densities lighter than plain PETG keep
> PETG-CF in the lightweight list, and BASF's PET-CF, tested at normal lab humidity, is shown as estimated, not supported.

## Scope and method

Presets as [census.mjs](../census.mjs) runs them ([lightweight-structure.json](../scenarios/lightweight-structure.json),
[high-stiffness-fixture.json](../scenarios/high-stiffness-fixture.json)): Include uncertain, estimates on, comparable
values, as printed, dry. Every product's answer was re-run through `runSelection` with each grade's prediction
(`grades[].estimate`) and own value (`grades[].states[0].values`) attached, and decisions were traced with
`npm run trace -- --scenario <file> --product <GradeID> --requirement tensileModulusXY`. Values were read on the cached
sheet text (`documents_fts`) where it exists. Random picks: the preset's "Insufficient evidence" material IDs sorted,
mulberry32 seeded 20261018, first two distinct draws (Lightweight M129, M156; High-stiffness M110, M152). "Coin flip"
means the centre lies within half the plausible (95 %) range's width of the limit, as the brief defines it.

## Lightweight structure (density ≤ 1,250 kg/m³, tensile modulus XY ≥ 2.5 GPa)

Supported 15, estimated 18, insufficient 64, screened 0, fail 55. The 18 estimated materials rest on 39 estimated
products and 40 estimated requirements: 30 centres are coin flips, 31 plausible ranges contain the limit, and 14 of the
18 materials have no estimated product that is not a coin flip. 11 rest on one estimated product (10 of them coin
flips). In 9 the row's median fails the requirement the group heading says is met; in 7 every comparable value fails.

| Material | Group | Verdict | Why | Evidence |
|---|---|---|---|---|
| M008 PLA Silk | estimated | misleading | 9 of 33 products, centres 2.50 to 2.68 (G008-28 exactly 2.50), plausible 1.7 to 3.9: unstated-direction 2.58 to 2.76 GPa and SUNLU's printed XY flexural 2.6 to 2.75. All 11 comparable values 1.15 to 2.40 fail | V002898, V009595, V008649, V004347, V008628; V001915, V005347 |
| M027 ABS | estimated | wrong | 1 of 55: purefil's resin sheet (MFR, ISO 294-4 mould shrinkage) prints "Tensile modulus (ASTM D790) 2700 MPa", a flexural standard, read as an unstated tensile value → centre 2.59. 13 measured products 1.6 to 2.38 all fail; row 2.2 (1.77 to 2.38) | V005563 (R-FABRU-PUREFIL-3-…-ABS-purefil p. 1); V003191, V008054 |
| M090 CPE-CF | estimated | wrong | Fillamentum CPE CF112's own sheet: 2.2 GPa (ISO 527). The centre, 2.53, is pulled up by colorFabb XT-CF20's 5.15 (a 20 % CF grade) | V001680 (S-CPECF p. 1); V010336 |
| M051 PA6-GF | estimated | wrong | Extrudr DURAPRO PA6 GF's resin sheet: 2.4 GPa moulded, 1.21 g/cm³. Predicted printed part 2.76 GPa, stiffer than its own moulded bar, and 1,220 kg/m³: two coin flips taken as met at once | V004302, V004299 (R-EXTRUDR-durapro-pa6-gf-TDS-en) |
| M024 PETG-CF | estimated | wrong | Every PETG-CF that passes ≤ 1,250 does so on a density no higher than neat PETG's (1,220 to 1,300), which carbon fibre can only raise; two are below it, and CarbonFil's 1.19 comes from a superseded sheet (F-M6). Its 9.495 GPa no-direction value becomes 7.12 (5.73 to 8.85) | V009831, V009835, V015320, V010607 |
| M159 TPU 85A class | insufficient | wrong | 16 silent products predicted 0.0016 to 0.67 GPa (plausible), two measured at 0.0068 and 0.025. Cannot be screened (F-M5) | V000826, V005837 |
| M129 TPU-CF (random) | insufficient | correct by the rule | Spectrum S-Flex Carbon's sheet prints 2.2 GPa (accepted, owner ruling R042), so its prediction (1.08 to 2.94) straddles; the other two are predicted 0.02 to 0.31 | V004078; accepted-findings.csv row V004078 |
| M156 PA6/66-CF (random) | insufficient | correct by the rule, misleading | One product, eSUN ePA CF: density 1,240 passes, modulus predicted 3.97 to 7.1 (wholly above 2.5); held only by an unpublished chamber temperature, in the same collapsed group as TPUs at 0.03 GPa | V010359, V010363, V011525 |

## High-stiffness fixture (tensile modulus XY ≥ 5 GPa; HDT ≥ 90 °C reported only)

Supported 5, estimated 9, insufficient 94, screened 1, fail 43. 27 estimated products and requirements: 16 coin flips, 13
plausible ranges contain 5 GPa. 3 materials rest on one estimated product. In 6 of 9 the row's median is below 5 GPa.
Of the 94 insufficient, 52 have a measured failing product, 45 of them with every comparable value below 5 GPa, and in 44
every unresolved product's own prediction lies wholly below 5 GPa.

| Material | Group | Verdict | Why | Evidence |
|---|---|---|---|---|
| M018 PLA-CF | estimated | wrong | Six printed values 1.1 to 4.95 GPa all fail. The four candidates: a silent product whose sibling-based centre (5.05) is above every printed value; Spectrum's 12.5 and Extrudr's 5.6 GPa with no direction; iSANMATE's resin sheet (ISO 3167 bars, 25 GPa, 0.6 % elongation) predicted as a 15.1 GPa printed part | V003304, V005465, V003097, V012068, V009912 (I-PLA-PLA-CF-TDS p. 1) |
| M053 PA12-CF | estimated | misleading | 1 of 15: SUNLU's printed XY flexural 5.8 and 6.0 GPa → centre 5.47 (plausible 3.87 to 7.72). Row median 3.3 GPa | V004500, V008194 |
| M050 PA6-CF | estimated | correct | Four printed values 3.8 to 4.7 fail, but SUNLU prints a 9.66 GPa XY flexural modulus and Polymaker's CF20 8.6 GPa annealed: a dry PA6-CF at 5 GPa is a fair thing to verify | V004526, V008616, V005128, V011373 |
| M067 PET-CF | estimated | wrong (too low) | BASF Ultrafuse PET CF15 prints 6,178 MPa XY on printed bars "conditioned in standard climate (23 °C, 50 % RH 72 h)": for PET the test climate, not a moisture state. Shown as "No qualifying measurement. Estimated 6.17 to 6.18 GPa"; with it, PET-CF is supported (F-M7) | V007692, V011546 |
| M058 PA612 | screened | correct, inconsistent | No product at all (only DuPont's resin G058-R1, 2.4 GPa moulded); the material estimate 0.92 to 4.51 GPa screens it. The only screen in the preset, while 44 materials whose every open product is predicted below 5 GPa stay listed | V002044 |
| M159 TPU 85A class | insufficient | wrong | As in Lightweight structure: 0.0016 to 0.67 GPa against 5 | V000826, V005837 |
| M110 PCTG-GF (random) | insufficient | correct | Silent products 1.36 to 8.05 GPa (sibling-based, poor precision), Fiberlogy's 3.4 GPa no-direction → 2.2 to 5.12: open, not a candidate | V010861 |
| M152 PLA-NF (random) | insufficient | correct by the rule, misleading | Nanovia PLA Flax fails at 2.83; Extrudr FLAX's 3.8 GPa (moulded, per Extrudr's information sheet, OPEN-PROBLEMS §15) → 2.39 to 4.49, wholly below 5, yet kept | V010286, V012037 |

## Findings

### F-M1. The estimated-candidate test reads only the centre, and half the centres are coin flips

**Evidence.** Across the six presets 43 material entries are "Estimated candidates to verify", on 104 products and 105
estimated requirements: 53 centres lie within half the plausible width of the limit, 47 plausible ranges and 37 likely
(80 %) ranges contain it. Lightweight structure carries 30 of its 40. FormFutura Silk Gloss PLA (G008-28) is a
candidate on a centre of exactly 2.50 GPa. Extrudr DURAPRO PA6 GF (G051-05) needs two coin flips at once (density 1,220
against 1,250, plausible 1,150 to 1,300; modulus 2.76 against 2.5, plausible 1.82 to 4.17): the joint chance is near
one half at best, and the rule takes each as met.
**Root cause.** Engine rule: `estimatedCandidate` compares the centre as a point
([constraints.js](../../../../app/js/engine/constraints.js) lines 615 to 618); the plausible range decides only screening
(line 159). The heading says "Predicted centres meet the missing numerical requirements"
([table.js](../../../../app/js/ui/table.js) line 559), which a reader takes as "likely meets".
**Reach.** 53 of 105 requirements, 43 entries (one-liner A). **Severity.** Misleading.

### F-M2. A product's prediction is its own unusable value pooled with its material, and the pooling crosses the limit

**Evidence.** Of the 105 estimated requirements, 75 rest on the product's own value of the same test with no direction
or on a moulded bar, 20 on its related values (flexural, Z, wet), 10 on siblings alone, none on the family. A grade's
prediction is the model's estimate at the grade's row, with its own observations weighted about 0.7 (`ownShare`) and the
material's latent the rest ([grades.js](../../../../build/src/estimate/grades.js) lines 114 to 131). Over all 316
grade modulus predictions anchored on an own no-direction or moulded value (313 of them products), centre/anchor has a
median of 0.99 (no net drift),
but 193 of 252 move toward their material's median and 27 by more than 20 % (CarbonFil 9.495 → 7.12 GPa). The pooling
crosses the limit: in Lightweight structure 9 products whose own value fails 2.5 GPa get a centre that meets it, 5 of
them estimated candidates, and two decide their material (G090-01 CPE-CF 2.2 → 2.53; G051-05 PA6-GF moulded 2.4 →
2.76). 12 of 54 products with an own moulded modulus are predicted stiffer as printed parts than their moulded bar
(G050-05 Extrudr PA6-CF: moulded 1.1 GPa, another Extrudr sheet 6 GPa, centre 5.28, an estimated candidate at 5 GPa).
**Root cause.** Estimate model: a shrinkage estimate, right for a material's typical value, is read by the engine as
the product's own expected value. **Reach.** 9 crossings in Lightweight structure (2 materials), 1 in High-stiffness, 6
in Outdoor structural part; 12 of 54 above the moulded bar (one-liners D, E). **Severity.** Wrong answer (CPE-CF,
PA6-GF).

### F-M3. Values with no stated direction enter the model at par, so stiffness predictions run high

**Evidence.** "tensile unk" converts at offset 0 ("Direction not stated; may be a moulded bar",
[estimate-model.json](../../../../build/mappings/estimate-model.json) lines 190 to 194) while "tensile moulded" takes
−0.15; the build refines an unknown-direction offset downward only, from 24 within-product pairs
([conversions.js](../../../../build/src/estimate/conversions.js) lines 51 to 52), and it stayed at 0. Across the 62
materials whose products publish both, the median as-published modulus sits above the median comparable one in 42, by
21 % at the median (strength 16 %, elongation 25 %): D84's premise, that such values "read like moulded bars and flatter
a printed part". Silent products' sibling-based predictions sit above their material's comparable median in 49 of 65
(median ratio 1.16, above every comparable value in 16); density (0.99) and strength (1.01) show no such drift. PLA-CF's
silent G018-02 is predicted 5.05 GPa, above all six printed values. Resin sheets read as unstated tensile values add to
it: purefil's "Tensile modulus (ASTM D790)" carries ABS into the estimated group (makers' bar types: OPEN-PROBLEMS §15).
**Root cause.** Estimate model: the conversion is learned within products that print both, which repeat one number;
across products, a sheet silent on direction is mostly a moulded or resin sheet. **Reach.** 313 of 691 product modulus
predictions are anchored on an own no-direction or moulded value; 75 of 105 estimated requirements (one-liners D, F).
Elongation predictions sit at 1.33 times their anchor (359 of 432 move by more than 20 %): a pointer for the
Flexible-component review. **Severity.** Wrong answer (PLA-CF at 5 GPa, ABS at 2.5 GPa).

### F-M4. One product makes the material a candidate, and the row contradicts it

**Evidence.** 24 of the 43 estimated entries rest on a single estimated product (22 of them in materials with two or
more), 16 of those 24 on a coin flip. In 20 of 43 the row's median fails the requirement the group says is met; in 13
every comparable product value fails it (Lightweight: PLA Silk, Marble, Sparkle, Galaxy, Glow, ABS, PVB; High-stiffness:
PLA-CF; Flexible component: PETG, PC, PCTG, CPE, PVB). ABS reads 2.2 GPa (1.77 to 2.38) under "Predicted centres meet the
missing numerical requirements", with "13 products fail at least one requirement; 42 remain unresolved": the one product
that put it there is not named.
**Root cause.** Engine roll-up and presentation: the material takes the first estimated product's reasons
([constraints.js](../../../../app/js/engine/constraints.js) line 692; D100, D137), the row shows every product's median and
range, and the row line counts products only ([table.js](../../../../app/js/ui/table.js) lines 251 to 253).
**Reach.** 24, 20 and 13 of 43 entries (one-liners A, C). **Severity.** Misleading; a wrong answer where F-M2 or F-M3
also holds (ABS, CPE-CF, PA6-GF).

### F-M5. "Insufficient evidence" is mostly materials the tool's own records place below the limit (OPEN-PROBLEMS §35, still open)

**Evidence.** High-stiffness fixture: of 92 insufficient materials with products, 44 have every unresolved product's
plausible range wholly below 5 GPa (six TPU materials, plausible tops 0.46 to 1.42 GPa, PP, PEBA, OBC, PETG-GF, PA12, PCTG, and §35's
ASA-GF, whose iSANMATE top is now 4.88); 56 counting products whose only modulus is an annealed one that fails. §35's
pattern, a measured failing product with every comparable value failing, holds for 45 of 94 (51 of 86 unresolved on
2026-10-07). Lightweight structure: 14 of 61, and 22 of 64. In each modulus preset 46 products in 29 materials are
unresolved on an annealed-only modulus with no prediction at all, 41 of them below 5 GPa (Bambu Lab PLA Silk+: 2.13 GPa
"annealed and dried at 55 °C for 8 h", below PLA's glass transition). Material estimates still screen: PA612, with no
product, is the only material screened in High-stiffness fixture.
**Root cause.** Engine rule and estimate model: a product prediction screens only with a certified class, and none is
(modulus: 25 calibration cases for the product's own values, 0 for siblings, 194 needed;
[product-screening.js](../../../../build/src/estimate/product-screening.js) lines 146 to 156, read at
[constraints.js](../../../../app/js/engine/constraints.js) line 159), while D59's material estimates keep screening. A
grade whose headline is an annealed comparable value gets no prediction for the as-printed state
([grades.js](../../../../build/src/estimate/grades.js) line 140), contrary to D137's "every catalogued product".
**Reach.** Every unresolved product predicted to fail: 13, 0, 14, 0, 44, 38 entries over the six presets (109;
one-liner B); with the annealed-only failures 148. **Severity.** Misleading: collapsed but counted, and High-stiffness
fixture counts 94 open materials against 14 shown as candidates.

### F-M6. Fibre-filled densities below their matrix decide the lightweight question; a superseded sheet holds CarbonFil

**Evidence.** 11 carbon- or glass-filled products publish a density below their neat polymer's minimum
(`polymers.csv`): fibre can only raise it. OPEN-PROBLEMS §17's query covers unfilled products only. Two keep PETG-CF in
the lightweight list: FormFutura CarbonFil 1.19 g/cc (V009831) and Recreus PET-G CF 1.1 g/cm³ (V015320), against neat
PETG at 1,220 to 1,300. CarbonFil's records come from its 2021 sheet (20 % fibre, 1.19, 9,495 MPa, 92 MPa); a revision
updated 2024-08-23 is cached under the same source (S-PET-TDS-CarbonFil, document 7b525961687e2d89: 15 % fibre, specific
gravity 1.32, flexural modulus 4,250 MPa, no tensile modulus) and is not registered; §34.3 names seven such later
copies, not this one. **Root cause.** Source data, and a plausibility rule that stops at unfilled grades.
**Reach.** 11 products, 8 materials (one-liner G); PETG-CF's group in Lightweight structure. **Severity.** Wrong answer.

### F-M7. A test-climate value counts as another state for a polymer water barely changes

**Evidence.** BASF Ultrafuse PET CF15 (V007692, 6,178 MPa XY, printed bars, "conditioned in standard climate (23 °C, 50 %
RH 72h)") and Raise3D Industrial PET CF (V011546, 5,731 MPa) are "No qualifying measurement" for a dry question, so
PET-CF is an estimated candidate, not supported; BASF's prediction is its own value at a width of 0.01 GPa. Raise3D
Hyper Speed PET CF publishes 5.0 GPa the same way and its centre, 4.91, puts it in "insufficient".
**Root cause.** Engine (D99) against estimate model: the state rule is per headline ("Changes with moisture",
`headline_definitions.csv`), the model's per polymer (water uptake "Not applicable" for PET, PLA and ASA, so it pools the
value as dry with full weight). **Reach.** 6 products for modulus; 13 modulus predictions narrower than 2 % (one-liner
H). **Severity.** Misleading.

## Root causes

| ID | Layer | Statement | Reach | Severity |
|---|---|---|---|---|
| F-M1 | Engine rule | An estimated candidate needs only its centre to meet the limit (constraints.js 615 to 618) | 53 of 105 estimated requirements are coin flips; 43 entries | Misleading |
| F-M2 | Estimate model | A product's prediction pools its own unusable value with its material (ownShare ≈ 0.7), and the engine reads it as the product's own | 9 crossings in Lightweight (2 materials decided); 12 of 54 predicted above their own moulded bar | Wrong answer |
| F-M3 | Estimate model | "tensile unk" converts at par though such values run about 21 % above printed ones; resin sheets read as unstated | 313 of 691 modulus predictions; silent predictions 1.16 × the comparable median | Wrong answer |
| F-M4 | Engine roll-up, presentation | One estimated product carries its material; the row shows a median that fails and does not name the product | 24 of 43 single-product; 20 median fails; 13 every comparable value fails | Misleading |
| F-M5 | Engine rule, estimate model | No product prediction may screen; annealed-only products get none; material estimates still screen | 109 entries wholly predicted to fail (44 in High-stiffness); 46 annealed-only products per modulus preset | Misleading |
| F-M6 | Source data, lint | Fibre-filled densities below the matrix pass; a later CarbonFil revision sits unregistered | 11 products, 8 materials; PETG-CF in Lightweight | Wrong answer |
| F-M7 | Engine (D99) against estimate model | Standard-climate conditioning is another state even where water does not matter | 6 products; PET-CF in High-stiffness | Misleading |

Direction, one line each. F-M1: test the plausible (or likely) range, not the centre, and count joint requirements.
F-M2: let a product's own published value bound or anchor its prediction instead of being averaged away. F-M3: give
"tensile unk" a moulded-like haircut learned across products (needs a decision and a back-test row, D58). F-M4: name the
deciding product on the row and show its prediction, not the material median. F-M5: certify or relax product
exclusion consistently with material screening, and predict annealed-only products. F-M6: extend §17's query to filled
grades and register the later CarbonFil revision as a new source. F-M7: make the moisture state follow the polymer's
water uptake.

## Reproduce

`F` is the file `node docs/audits/2026-10-18-screening-review/census.mjs --full <F>` writes; run from the repository
root against the built `dist/db.json`.

```bash
# A: estimated requirements, coin flips, single-product materials (105, 53, 47; 24, 16)
node -e 'const f=require(process.argv[1]);let n=0,c=0,s=0,m1=0,m1c=0,mats=0;for(const t of Object.values(f))for(const m of Object.values(t)){if(m.group!=="estimated")continue;mats++;const ps=m.products.filter(p=>p.group==="estimated");let near=false;for(const p of ps)for(const r of p.results)if(r.estimated&&r.prediction){const v=+r.criterion.split(" ").pop(),{lo,hi}=r.prediction.plausible;n++;if(Math.abs(r.prediction.centre-v)<(hi-lo)/2){c++;near=true}if(lo<=v&&v<=hi)s++}if(ps.length===1){m1++;if(near)m1c++}}console.log({mats,n,c,s,m1,m1c})' $F
# B: insufficient materials whose every unresolved product is predicted wholly to fail, per preset
node -e 'const f=require(process.argv[1]);const o={};for(const [tn,t] of Object.entries(f)){let n=0,a=0;for(const m of Object.values(t)){if(m.group!=="insufficient"||!m.products.length)continue;n++;if(m.products.filter(p=>p.verdict==="UNKNOWN").every(p=>p.results.some(r=>{if(!r.prediction)return false;const [,op,v]=r.criterion.split(" ");const {lo,hi}=r.prediction.plausible;return op.startsWith(">")?hi<+v:lo>+v})))a++}o[tn]=a+"/"+n}console.log(o)' $F
# C: estimated materials whose row contradicts the requirement (13 every comparable value fails; 20 median fails)
node -e 'const f=require(process.argv[1]),db=require("./dist/db.json"),M=new Map(db.materials.map(m=>[m.id,m]));let all=0,med=0;for(const t of Object.values(f))for(const [id,m] of Object.entries(t)){if(m.group!=="estimated")continue;let a=false,d=false;for(const p of m.products.filter(p=>p.group==="estimated"))for(const r of p.results.filter(r=>r.estimated)){const [k,op,v]=r.criterion.split(" ");const s=M.get(id).summary?.[k];if(!s?.n)continue;const ok=x=>op.startsWith(">")?x>=+v:x<=+v;if(!ok(s.max)&&!ok(s.min))a=true;if(!ok(s.median))d=true}if(a)all++;if(d)med++}console.log({all,med})' $F
# D: what the estimated requirements rest on (75 own not comparable, 20 own related, 10 siblings)
node -e 'const f=require(process.argv[1]),db=require("./dist/db.json"),G=new Map(db.grades.map(g=>[g.id,g]));const c={};for(const t of Object.values(f))for(const m of Object.values(t)){if(m.group!=="estimated")continue;for(const p of m.products.filter(p=>p.group==="estimated"))for(const r of p.results.filter(r=>r.estimated)){const k=r.criterion.split(" ")[0],e=G.get(p.gradeId).estimate?.[k];const a=!e?"material":e.strength!=="this-grade"?e.strength:(e.evidence||[]).some(x=>/ (unk|moulded)$/.test(x.kind)&&!/^(flexural|hardness)/.test(x.kind))?"own not comparable":"own related";c[a]=(c[a]??0)+1}}console.log(c)' $F
# E: own no-direction or moulded modulus fails the limit, centre meets it, per preset
node -e 'const f=require(process.argv[1]),db=require("./dist/db.json"),G=new Map(db.grades.map(g=>[g.id,g]));for(const [tn,t] of Object.entries(f)){const up=[];for(const m of Object.values(t))for(const p of m.products)for(const r of p.results.filter(r=>r.estimated&&r.prediction)){const [k,,v]=r.criterion.split(" ");if(k!=="tensileModulusXY")continue;const ev=(G.get(p.gradeId).estimate[k].evidence||[]).filter(x=>/^tensile (unk|moulded)$/.test(x.kind));if(!ev.length)continue;const a=Math.exp(ev.reduce((s,x)=>s+Math.log(x.converted),0)/ev.length);if(a<+v&&r.prediction.centre>=+v)up.push(p.gradeId+"("+p.group+")")}if(up.length)console.log(tn,up.length,up.join(" "))}' $F
# F: centre against its own no-direction or moulded anchor (316; median 0.99; 27 beyond 20 %; 193 of 252 toward the material)
node -e 'const db=require("./dist/db.json");const r=[];let tow=0,n=0;for(const g of db.grades){const e=g.estimate?.tensileModulusXY;if(!e||g.retired)continue;const ev=(e.evidence||[]).filter(x=>/^tensile (unk|moulded)$/.test(x.kind));if(!ev.length)continue;const a=Math.exp(ev.reduce((s,x)=>s+Math.log(x.converted),0)/ev.length);r.push(e.centre/a);const md=db.materials.find(m=>m.id===g.materialId).summary?.tensileModulusXY?.median;if(md){n++;if((e.centre-a)*(md-a)>0)tow++}}r.sort((x,y)=>x-y);console.log(r.length,r[r.length>>1],r.filter(x=>Math.abs(Math.log(x))>Math.log(1.2)).length,tow+"/"+n)'
# G: fibre- or glass-filled products lighter than their neat polymer (11)
npm run sql --silent -- "select p.gradeid, p.product, m.materialid, p.value, y.neat_density_min_kg_m3 from products_compiled p join materials m on m.materialid = p.materialid join polymers y on y.polymerid = m.estimate_identity where p.headline_key = 'density' and (m.modifier_filler like '%arbon%' or m.modifier_filler like '%lass%') and coalesce(p.variant, '') = '' and p.gradeid not like '%-R%' and p.value < y.neat_density_min_kg_m3"
# H: modulus predictions narrower than 2 % (13)
node -e 'const db=require("./dist/db.json");console.log(db.grades.filter(g=>!g.retired&&g.estimate?.tensileModulusXY?.plausible&&g.estimate.tensileModulusXY.plausible.hi/g.estimate.tensileModulusXY.plausible.lo<1.02).map(g=>g.id).join(" "))'
```

The as-published against comparable medians (62 materials, 42 higher, ratio 1.21) and the silent-product drift (49 of
65, ratio 1.16) come from the products' first-state values and `materials[].summary` in `dist/db.json`, grouped by
material; the material summary counts annealed values too, so the drift against as-printed values is if anything larger.
