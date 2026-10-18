# Flexible component and Indoor prototype

> **Historical record** (2026-10-18): written for the screening review on release 9ca94d31fc5d. Figures may have changed since; re-run [census.mjs](../census.mjs).

> **In short.** Both presets sort materials the way the rules say, but three rules turn engineering sense upside down.
> In Flexible component, five rigid plastics (PETG, PC, PCTG, CPE, PETG-PTFE) are offered as "Estimated candidates" only
> because a sheet's resin value, whose test bar the sheet does not name, is used as a hard floor for the printed part's
> stretch, while the same materials' printed bars break at 4 to 90 %. Meanwhile PEBA, TPC and the hardest TPUs have
> products with measured printed stretch of several hundred per cent that are held back only because their sheets print
> no chamber line, and in Indoor prototype all 39 "Insufficient evidence" materials are there for a print temperature
> alone, PLA/PHA and a foaming TPU (both printed with the part-cooling fan on) among them. Three materials nobody sells (PA66-CF,
> PA612, PA612-GF) are listed or screened on a family guess, and they are the only materials the estimates switch
> screens on a number in any of the six presets. Two hidden FAILs (LCP, PPS-ESD) read a bed window of 120 to 150 °C as
> "requires 150 °C".

## Method

Every figure comes from `$F`, written by `node docs/audits/2026-10-18-screening-review/census.mjs --full $F` from the
repository root on 9ca94d31fc5d; one product's decision from `npm run trace -- --scenario <file> --product <GradeID>
[--requirement chamber|bed|elongationXY]` with [flexible-component.json](../scenarios/flexible-component.json) and
[indoor-prototype.json](../scenarios/indoor-prototype.json); the sheets' words from `npm run sql` over `documents_fts`.
Random draws: the preset's Insufficient-evidence IDs sorted, mulberry32 seeded 20261018, the first two distinct draws
(Flexible: M106, M144; Indoor: M137, M150):

```bash
node -e 'const d=require(process.argv[1])[process.argv[2]],ids=Object.keys(d).filter(i=>d[i].group==="insufficient").sort();let a=20261018;const r=()=>{a|=0;a=a+0x6d2b79f5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};const p=[];while(p.length<2){const i=ids[Math.floor(r()*ids.length)];if(!p.includes(i))p.push(i)}console.log(p)' $F "Flexible component"
```

## Flexible component

Elongation at break (XY) at least 100 %, plus scope, build material and the three print gates. Status bar: PASS 8,
UNKNOWN 102 (screened 2), FAIL 42. Listed: supported 8, estimated 10, insufficient 90; held out: screened 2, fail 42.

| Material | Group | Verdict | Why | Evidence |
|---|---|---|---|---|
| M020 PETG | estimated | wrong | All 8 estimated products are floored by their own unstated-specimen value (120 to 280 %); the 26 PETG products with a printed XY value publish 4.1 to 90 %, and 23 fail | G020-06: V002708 160 % "ASTM D638", specimen and direction unstated, beside a tensile strength by D 882 (a film test), S-SPECTRUM-en-tds-the-filament-petg-lite p. 1; estimate 163 to 241 % (plausibly 160 to 300), precision "good", ownShare 0.7 |
| M035 PC | estimated | wrong | Yousu PC's 150 % is a resin sheet's (melt flow rate, notched Izod 900 J/m, HDT annealed and unannealed; yield at 6 %); PC's 12 printed XY values are 3.2 to 25 % | G035-25: V013304, V013303; R-YOUSU-YOUSUPCTDS-535a p. 1 |
| M045 PEBA | estimated | wrong group | Six products pass on their own printed XY values (up to 1,110 %); each is held only by a chamber its sheet does not mention. The row shows a seventh product's estimate | G045-07: V008145 1,106.8 % printed XY; P0762 (R-QIDI-PEBA-95A: fan 50 to 100 %, no chamber line); row answered by G045-02 |
| M170 TPS | insufficient | wrong | BASF TPS 90A passes on a printed 280 % and is held by a "-" in its chamber row; three others publish 150 to 650 % unstated and, unlike PETG, get no estimate (TPS has no estimate identity, [§5](../../../OPEN-PROBLEMS.md)) | G170-02: V011341, P1193; G167-02 V011132; G170-01 V014408 (chamber 60 to 80 °C, partial) |
| M057 PA6/66 | supported | right by the rule, misleading | A ductile nylon copolymer: printed XY 100 % and a tensile modulus of 1,980 MPa on the same sheet | G057-02: V001047; X-AMIDEX-PA6-Copolymer-v1-0 p. 1 |
| M056 PA66-CF | screened | right direction, wrong basis | No product, no measurement: a family-only estimate, 1.38 to 12.5 % ("poor"), screens it, the one kind of numeric screen still allowed | `materials.csv` M056; OPEN-PROBLEMS §5 |
| M106 ABS-AF (random) | insufficient | right by the rule, misleading | Every product prints at most 6 %; plausible ranges end at 13.7 to 33 %; none may screen (D137) | G106-01 V002756 6 %; G106-02, G106-03 (FAIL, chamber 90 °C) |
| M144 PCTG-CF (random) | insufficient | right by the rule, misleading | Every product prints 5 to 9 %; plausible ranges end at 14.9 to 17.8 % | V007709, V011531, V010703 |

**Is elongation at break at least 100 % a sound test of "flexible"?** No, and the data say so. Of the 18 materials
listed above the collapsed group, 7 have a tensile modulus XY of 1.5 GPa or more (PA6/66 2.34, PVB 2.20, PC 2.11, PCTG
1.76, PETG 1.68, CPE 1.68, PETG-PTFE an estimated 1.55); the elastomers sit at 0.005 to 0.09 GPa. Elongation at break
measures ductility: a gasket or strap needs a low modulus or hardness, and a phone case about Shore 90 to 95A. The
template's own `notChecked` says so (`app/js/ui/templates.js`:90), but the list does not. The data hold the better test:
the tensile modulus XY headline exists and is estimated, and Shore hardness is published on 80 products (Shore A) and
91 (Shore D), though it is no headline. See F-F5.

## Indoor prototype

Scope, build material and the three print gates decide; price is reported. Status bar: PASS 87, UNKNOWN 39 (screened
0), FAIL 26. Listed: supported 87, estimated 0, insufficient 39. Estimated is empty by construction: the preset has no
required number, and a print gate is never estimated, so every unresolved material is "Insufficient evidence".

| Material | Group | Verdict | Why | Evidence |
|---|---|---|---|---|
| M145 PLA-PHA | insufficient | wrong | Its one product is held by "No temperature published" for the chamber; the sheet gives bed 50 to 60 °C, fan 0 to 100 % and "performs well on both heated and non-heated build": an open-printer PLA | G145-01, P0927; R-COLORFABB-colorFabb-PLA-PHA-Printing-Filament-TDS p. 1 |
| M029 ABS-CF | insufficient | right by the rule (owner, 2026-10-05), misleading | 11 products: 6 silent on the chamber, 2 "recommended" with no temperature, 2 partial (50 to 70, 60 to 80 °C), 1 FAIL (90 °C). ABS has a guide row that reads an enclosure as the H2C's chamber (D90); ABS-CF has none | G029-01 P1289, P1636; G029-02; G029-08; G029-05 P0740 |
| M056 PA66-CF (and M058, M060) | insufficient | misleading | No product, so "No print profile recorded" on all three gates: nothing to buy, print or verify | `materials.csv` rows; F-F6 |
| M137 COC (random) | insufficient | right by the rule, wrong word | Both products state a 60 to 80 °C chamber; the H2C's 65 °C lies inside the maker's window. Nothing is missing: the printer reaches the bottom of it | G137-01 P1459, G137-03 P1453 |
| M150 TPU-LW (random) | insufficient | wrong | Four foaming TPUs, each held only by a silent chamber; Siraya prints bed 30 to 45 °C and fan 100 %. The guide's TPU row is mapped only to M161 | G039-69 P0977 (D-SIRAYA-siraya-tech-flex-tpu-air-tds p. 1), G150-01 to G150-03 |
| M139 LCP (hidden FAIL) | fail | wrong | Bed "120-150 °C" is read by its upper end, "Requires up to 150 °C"; the H2C's 120 °C is the window's own bottom. PPS-ESD (M124, 120 to 160 °C) fails the same way | G139-01 P1467 (R-FABRU-PUREFIL-4706-…-LCP-purefil); G124-01 P1400 |
| M140 PBT (hidden FAIL) | fail | right | Bed 160 to 200 °C in all three language copies, wholly above 120 °C | G140-01 P1447, P1458, P1468 |

The other 23 FAILs are right: 6 support materials fail Build material, 17 high-temperature or sintering materials fail
scope (PEEK, PEKK, PEI, PSU, PPSU and their fills).

## Findings

### F-F1. A value whose specimen is not stated floors the printed part's prediction

**Evidence.** PETG G020-06's prediction carries `impliedBounds` V002708 (160 %), `strength: this-grade`, precision
"good", ownShare 0.7, plausible low end exactly 160 %. The sheets behind PC (Yousu), CPE (Fillamentum CPE HG100: melt
flow index, notched Izod "no break", 50 mm/min) and PCTG (Spectrum: notched Izod, Rockwell R) are resin data; PETG Lite's
tensile strength is by ASTM D 882, a thin-sheet test. The model itself knows a moulded break strain overstates a printed
XY one: its conversions put "break moulded" at −0.534 on the ln scale (XY ≈ 0.59 × moulded, 15 pairs) and "break unk"
at 0 (25 pairs). Coded as moulded, V002708 would convert to about 94 % and floor nothing. The mirror: TPS, SBC, TPV and
the undisclosed TPEs publish 150 to 650 % unstated and get no estimate at all, so the rigid plastics are offered and the
elastomers are not.

**Root cause.** Estimate model, by an owner decision. D126 ("the owner chose that a bar whose specimen is not stated
bounds as a printed one does", [DECISIONS](../../../DECISIONS.md)) admits `not-stated` among `BOUNDING_FORMS`
([lower-bounds.js](../../../../build/src/lower-bounds.js):13, used at :28); an unstated-direction break bounds the XY
headline ([bounds.js](../../../../build/src/estimate/bounds.js):34-36) and floors the grade's range (:64). D126 was
argued for strength orders within one test (yield ≤ ultimate); for elongation across specimen routes the premise fails,
because a moulded bar stretches several times further than a printed one. The estimated group then needs only the
centre to meet the limit ([constraints.js](../../../../app/js/engine/constraints.js):615), and a floor at or above it
guarantees that.

**Reach.** Flexible: 7 of 10 estimated materials rest wholly on such floors (PETG 8/8 products, PC 1/1, PCTG 5/5, CPE
3/3, PETG-PTFE 1/1, and the elastomers TPC 4/4 and TPU harder than 95A 6/6, where the floor is harmless); PVB is lifted
to a centre of 105 % by its 88 % floor. Across the database 356 elongation predictions carry an own unstated floor, 275
sit at it, and 67 floors lie above every printed XY value of their material (n ≥ 2). Tensile strength: 383, 367 and 104
(no preset asks for it today). Related, not the same: [§36.2](../../../OPEN-PROBLEMS.md) (PA12, PCTG-GF).

```bash
node -e 'const db=require("./dist/db.json"),M=new Map(db.measurements.map(m=>[m.id,m]));let a=0,b=0,c=0;for(const g of db.grades){const e=g.estimate?.elongationXY;const f=(e?.impliedBounds??[]).filter(x=>M.get(x.measurementId).specimenForm==="not-stated");if(!f.length)continue;a++;const lo=Math.max(...f.map(x=>x.lo));if(Math.abs(e.plausible.lo-lo)/Math.max(1,lo)<.03)b++;const v=db.grades.filter(h=>h.materialId===g.materialId&&h.headline?.elongationXY?.level==="comparable").map(h=>h.headline.elongationXY.value);if(v.length>1&&lo>Math.max(...v))c++}console.log(a,b,c)'
node -e 'const db=require("./dist/db.json"),d=require(process.argv[1])["Flexible component"],M=new Map(db.measurements.map(m=>[m.id,m])),G=new Map(db.grades.map(g=>[g.id,g]));for(const[id,m]of Object.entries(d)){if(m.group!=="estimated")continue;const e=m.products.filter(p=>p.group==="estimated"),f=e.filter(p=>(G.get(p.gradeId).estimate?.elongationXY?.impliedBounds??[]).some(b=>b.lo>=100&&M.get(b.measurementId).specimenForm==="not-stated"));console.log(id,m.name,f.length+"/"+e.length)}' $F
```

**Severity.** Wrong answer: five rigid materials are shown above the collapsed list as candidates for a flexible part.

### F-F2. A chamber the sheet does not mention is unknown, and only 17 of 152 materials have a guide to fill it

**Evidence.** QIDI PEBA 95A (G045-07) passes elongation on a printed 1,106.8 % and the nozzle and bed, and is UNKNOWN
only on the chamber; its sheet prints fan 50 to 100 % and no chamber line. PLA/PHA, Siraya TPU Air, colorFabb nGen and
nGen FLEX, three TPS products, PVC, SAN, PE and twenty more are held the same way. The database even holds a
researched chamber band of 20 to 50 °C for PEBA, TPC and nGen (`chamber_bands.csv`), which D34 says decides nothing.

**Root cause.** Build rules and engine rule. A silent axis reads `No temperature published`
([process.js](../../../../build/src/normalize/process.js):249-250); the fallback to Bambu Lab's guide (D88, D90) runs
only for the 17 materials mapped in `print_guide_materials.csv` ([products.js](../../../../build/src/products.js):368),
and a product with a Variant reads none (D129). `unknown` and `partial` map to UNKNOWN and INDETERMINATE
([constraints.js](../../../../app/js/engine/constraints.js):30-36), and an unresolved gate is never "estimated", so it
also keeps a product out of Estimated candidates (:615).

**Reach.** 314 products have an unknown chamber or no profile (unchanged since [§30.3](../../../OPEN-PROBLEMS.md),
2026-10-07); 130 of them are PLA, elastomer, PETG or copolyester products, types an engineer prints open. In the six
presets, 102 distinct products in 50 materials are unresolved by a print gate alone, and 88 material-preset pairs would
pass if those gates read within: Outdoor 8, Indoor 36, Lightweight 11, Warm 16, High-stiffness 8, Flexible 9 (PEBA, TPC,
TPU harder than 95A, PET, PE, TPC-ESD, nGen FLEX, TPU-LW, TPS). By kind (products): silent 62, partial 16, "recommended"
without a temperature 15, no profile 7, "-" 2; every one concerns the chamber, and the 7 with no profile and 2 more
(G114-01 TPC-ESD, G165-04 Nylon-CF) are silent on nozzle and bed too. Estimates on never help: gates have no estimate,
and 46 products (31 material-preset pairs) whose every number is estimated to pass stay "insufficient" for a gate.

```bash
node -e 'const d=require(process.argv[1]),G=/^(Nozzle|Bed|Chamber) temp/,O=/^(priceCADkg|hdt045 >= 90)/;for(const[p,ms]of Object.entries(d)){let n=0,m=0;for(const x of Object.values(ms)){if(x.verdict!=="UNKNOWN")continue;const g=x.products.filter(q=>{const o=q.results.filter(r=>!O.test(r.criterion)&&r.status!=="PASS");return q.verdict==="UNKNOWN"&&o.length&&o.every(r=>G.test(r.criterion))});n+=g.length;m+=g.length>0}console.log(p,n,m)}' $F
node -e 'const d=require(process.argv[1]),G=/^(Nozzle|Bed|Chamber) temp/,O=/^(priceCADkg|hdt045 >= 90)/,ok=(c,x)=>{const[,op,v]=c.split(" ");return op[0]===">"?x>=+v:x<=+v};let P=0,Mt=0;for(const ms of Object.values(d))for(const x of Object.values(ms)){if(x.group!=="insufficient")continue;const n=x.products.filter(q=>{const o=q.results.filter(r=>!O.test(r.criterion)&&r.status!=="PASS"),g=o.filter(r=>G.test(r.criterion)),k=o.filter(r=>!G.test(r.criterion));return q.verdict==="UNKNOWN"&&g.length&&k.length&&k.every(r=>r.estimated&&!r.screened&&Number.isFinite(r.prediction?.centre)&&ok(r.criterion,r.prediction.centre))}).length;P+=n;Mt+=n>0}console.log(P,Mt)' $F
```

**Severity.** Wrong answer. The owner kept "recommended, no temperature" unknown on 2026-10-05 (§30.3); silence for a
type that is printed open (PLA, TPU, PEBA, TPC, copolyesters) has not been decided as such, and it is the larger part.

### F-F3. The material row speaks for an estimated product while a measured one is held by a gate

**Evidence.** PEBA's row is answered by G045-02 Spectrum ("No qualifying measurement. Estimated 492 to 1,090 %") though
six siblings publish printed values that pass. **Root cause.** Engine rule: the representing product is the first
passing, else the first *estimated*, else the first unresolved one
([constraints.js](../../../../app/js/engine/constraints.js):692), so an estimate outranks a measured pass blocked by a
print gate. **Reach.** 12 material-preset pairs: Flexible PEBA, TPC, TPU harder than 95A; PA12-CF and PPA-CF in three
presets each; PLA Wood (Lightweight); ASA-CF and PPS-CF (High-stiffness).

```bash
node -e 'const d=require(process.argv[1]),G=/^(Nozzle|Bed|Chamber) temp/,O=/^(priceCADkg|hdt045 >= 90)/;const o=[];for(const[p,ms]of Object.entries(d))for(const[i,x]of Object.entries(ms))if(x.group==="estimated"&&x.products.some(q=>{const r=q.results.filter(r=>!O.test(r.criterion)&&r.status!=="PASS");return q.verdict==="UNKNOWN"&&r.length&&r.every(r=>G.test(r.criterion))}))o.push(p.split(" ")[0]+":"+i);console.log(o.length,o.join(" "))' $F
```

**Severity.** Misleading: the reader is told nothing is measured.

### F-F4. "Insufficient evidence" names three different things, and as-published values only ever lift

**Evidence.** COC's two products state 60 to 80 °C; ABS-CF's state 50 to 70 and 60 to 80 °C or "recommended"; ABS-AF
and PCTG-CF products print 5 to 9 % against a 100 % limit. All are "Insufficient evidence". **Root cause.** Wording
([table.js](../../../../app/js/ui/table.js):251, :560) over an engine rule: partial windows and "recommended" are
INDETERMINATE or UNKNOWN by design (D32, D33), and product predictions may not screen (D137,
[§35](../../../OPEN-PROBLEMS.md)). With F-F1 the effect is one-sided: an unstated 160 % can lift PETG into Estimated
candidates, an unstated 6 % can never take ABS-AF out. **Reach.** Gate side: 31 gate-only products in 20 materials are
partial or "recommended". Numeric side (known, §35, sized now): 109 material-preset pairs are "insufficient" though every
unresolved product's plausible range wholly fails: Outdoor 13, Lightweight 14, High-stiffness 44, Flexible 38 of 90.

```bash
node -e 'const d=require(process.argv[1]),G=/^(Nozzle|Bed|Chamber) temp/,O=/^(priceCADkg|hdt045 >= 90)/,f=(c,pl)=>{const[,op,v]=c.split(" ");return op[0]===">"?pl.hi<+v:pl.lo>+v};for(const[p,ms]of Object.entries(d)){const ins=Object.values(ms).filter(m=>m.group==="insufficient"&&m.products.length);console.log(p,ins.filter(m=>{const u=m.products.filter(q=>q.verdict==="UNKNOWN");return u.length&&u.every(q=>q.results.some(r=>!O.test(r.criterion)&&!G.test(r.criterion)&&r.prediction?.plausible&&f(r.criterion,r.prediction.plausible)))}).length)}' $F
```

**Severity.** Misleading.

### F-F5. The Flexible template tests ductility, not flexibility

**Evidence.** The table above: 7 of 18 listed materials are rigid (1.5 to 2.3 GPa); PA6/66 is *supported* on a printed
100 % beside its own 1,980 MPa modulus. **Root cause.** Template definition
([templates.js](../../../../app/js/ui/templates.js):88-94): one requirement, elongation XY ≥ 100 %. **Reach.** Flexible
only; 7 materials shown, and PET (colorFabb PET Flex Max, 418 %) and PE would join them once F-F2 is resolved.

```bash
node -e 'const db=require("./dist/db.json"),d=require(process.argv[1])["Flexible component"],M=new Map(db.materials.map(m=>[m.id,m]));for(const[i,x]of Object.entries(d))if(x.group==="supported"||x.group==="estimated"){const h=M.get(i).headline.tensileModulusXY;console.log(i,x.name,x.group,h?.known?h.value:"est "+h?.estimate?.centre)}' $F
```

**Severity.** Misleading (the template's own caveat names it; the list does not show it).

### F-F6. Materials with no product are judged, listed and screened on a family guess

**Evidence.** PA66-CF, PA612 and PA612-GF have no grade (`materials.csv`: "page access failed; no numbers imported",
"TDS not located"). They take the material path ([constraints.js](../../../../app/js/engine/constraints.js):682), read
"No print profile recorded" on every gate, and carry family-only estimates with `canScreen: true` (material back-test,
D48/D59), while every product prediction has `canScreen: false` (D137, 194 calibration groups needed). **Root cause.**
Source data (in-scope material rows kept with no product; nothing is deleted and no family-entry route applied) plus an
engine rule that certifies the weakest evidence and not the stronger. **Reach.** 3 materials × 6 presets: 3 screened
(PA66-CF, PA612-GF in Flexible; PA612 in High-stiffness), 15 insufficient. They are the only numeric screens in all six
presets; every other screen (30) is an elastomer's not-applicable HDT. Known as an evidence gap ([§5](../../../OPEN-PROBLEMS.md)),
not as a screening question.

```bash
node -e 'const d=require(process.argv[1]);for(const[p,ms]of Object.entries(d)){const s=Object.entries(ms).filter(([,m])=>m.group==="screened");console.log(p,s.map(([i,m])=>i+(m.products.length?"":"(no products)")).join(" "))}' $F
```

**Severity.** Misleading: a reader is offered, or told a guess removed, a material no one sells.

### F-F7. A nozzle or bed window is read by its top, even when the printer reaches its bottom

**Evidence.** LCP's sheet prints bed 120 to 150 °C, Spectrum PC 275's 90 to 130 °C (G035-03, P0203), ABS G027-37's 100
to 130 °C; each reads "Requires up to …; the H2C reaches only 120 °C" and fails. **Root cause.** Build rule D32: the
partial window exists for the chamber only ([process.js](../../../../build/src/normalize/process.js):269); D32's premise
("the bottom of a window sits at the hardware's rated maximum") holds for PEKK and PSU, not for a 90 to 130 °C PC bed.
**Reach.** 34 products in 19 materials (12 in scope); in 17 the window starts strictly below the limit. Material verdicts
flipped: LCP (M139) and PPS-ESD (M124), FAIL in all six presets; elsewhere a sibling hides it (D100).

```bash
node -e 'const db=require("./dist/db.json"),L={nozzle:350,bed:120},g=new Set,m=new Set;for(const x of db.grades){if(x.retired||/-R\d+$/.test(x.id))continue;for(const a of["nozzle","bed"]){const v=x.print?.[a];if(v?.verdict==="exceeds"&&v.min!=null&&v.min<=L[a]){g.add(x.id);m.add(x.materialId)}}}console.log(g.size,m.size)'
```

**Severity.** Wrong answer for 2 materials; "Requires up to 130 °C" for a 90 to 130 °C window is misleading wording.

## Root causes

| ID | Layer | Statement | Reach | Severity | Direction |
|---|---|---|---|---|---|
| F-F1 | Estimate model (D126) | An unstated-specimen elongation floors the printed XY prediction at face value, so resin values lift rigid products into Estimated candidates | Flexible 7 of 10 estimated materials (5 rigid); 356 / 275 / 67 elongation predictions db-wide | Wrong answer | Treat an unstated specimen as a possible moulded bar for elongation: no floor, or the moulded conversion |
| F-F2 | Build rule + engine rule | A silent chamber is unknown; the guide fills it for 17 of 152 materials; gate unknowns are never estimated | 102 products, 50 materials, 88 material-preset pairs; Indoor 36 of 39; 46 products kept from Estimated | Wrong answer | Decide what silence means per type (printed open or not), as D90 did for the enclosure types |
| F-F3 | Engine rule | The row is answered by an estimated product before a measured one held by a gate | 12 material-preset pairs | Misleading | Prefer the product whose only gap is a gate, and say so |
| F-F4 | Wording over D32/D33/D137 | "Insufficient evidence" covers partial windows, missing temperatures and estimates that wholly fail | 20 materials on gates; 109 pairs on numbers (§35) | Misleading | Name the three cases apart |
| F-F5 | Template | Elongation at break ≥ 100 % passes ductile rigid plastics | 7 of 18 listed in Flexible | Misleading | Add a stiffness or hardness ceiling the data already hold |
| F-F6 | Source data + engine rule | Productless materials are judged on family estimates that may screen while product predictions may not | 3 materials, 18 rows; the only 3 numeric screens | Misleading | Make them family entries, or hold them out of candidate lists |
| F-F7 | Build rule (D32) | Nozzle and bed windows are read by their top even when the H2C reaches their bottom | 34 products, 19 materials; LCP and PPS-ESD FAIL | Wrong answer (2) | Extend `partial` to windows that start inside the printer's range |
