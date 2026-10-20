# Can an undescribed heat deflection count? The advice, and the rule built

> **Historical record** (2026-10-20): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** Yes for heat deflection of a plastic that cannot crystallise, and for nothing else. Such a plastic
> (ABS, ASA, PC, PETG, PCTG and the like) is glassy whether it was moulded or printed, and a glassy bar deflects where its
> stiffness collapses at its glass transition, so how the bar was made moves the result by a few degrees, inside the
> test's own scatter. A plastic that can crystallise (nylon, PP, POM, PBT, PPS, and PLA and PET, which print glassy but
> crystallise in a hot mould or an oven) is the opposite: its moulded bar can read tens of degrees above a print. In
> our own data the undescribed values of the glassy plastics sit where their printed bars do (same material: median
> +0.3 °C at 0.45 MPa, −4.3 °C at 1.8 MPa) and no closer to their glass transition than printed bars do; the
> crystallisable ones scatter by up to 130 °C. Tensile, flexural and impact values stay set apart: a print's voids and
> layers move them whatever the polymer. Built as data (D177, m487): 131 heat deflection values of 88 products now
> count, and Warm environment passes three more materials (PETG, CPE, COC), each on a value physics supports.

## What I recommend, and what was built

| Question | Answer | Why, in one line |
|---|---|---|
| Should an undescribed heat deflection of an amorphous plastic count? | **Yes**, at 0.45 and 1.8 MPa | A glassy bar deflects near its glass transition however it was made. |
| Which plastics? | Those whose polymer **cannot crystallise** (a new polymers.csv column): ABS, ASA, HIPS, SAN, PC, PC-ABS, PETG, PCTG, CPE, nGen, PVB, PVC, COC, PPE-PS, SBC | A polymer, or any phase of a blend, that can crystallise is excluded, so PC-PBT (its PBT) and PLA-PHA are out though the estimate model files them amorphous. |
| With which fillers? | Unfilled, carbon, glass or aramid fibre, ESD and conductive loads, PTFE, graphene, an undisclosed commercial variant; **not foamed** | Fibres raise a glassy bar's heat deflection by a few degrees only; a foamed print is mostly air, and ASA Aero's printed bar reads 15 °C under its undescribed one. |
| And a declared variant? | Only one that prints as its type (a filler for looks) | As D129, D154 and D175 already treat a variant: an undisclosed or lightweight filler is not its type. |
| What still sets a value apart? | Anything on its table that points to moulding or resin data; a physics flag; a copy of a set-apart figure | The owner's ruling: a counter-indication always wins, and D149's physics checks stay. |
| Tensile, flexural, impact? | **No change**: set apart as D172 has them | Voids, weld lines and layer bonds scale these directly; our model learned a printed bar's strength as 0.78 of a moulded one's, its stretch as 0.59. |

## Why a glassy bar does not care how it was made

**What the test measures.** ISO 75 and ASTM D648 load a bar in three-point bending and heat it until it deflects by a
fixed small amount. Takemori showed (General Electric, SPE ANTEC 1978, later in Polymer Engineering and Science) that
the result is the temperature at which the bar's modulus falls to a set value: about 200 MPa at the light load (0.45 MPa)
and about 800 MPa at the heavy one (1.8 MPa). Sepe's account in Plastics Technology (2019) gives the same bands, 190 to
240 MPa and 750 to 960 MPa. Heat deflection is a point on the stiffness-against-temperature curve.

**Glassy plastics.** An amorphous plastic holds about 2 GPa up to its glass transition and then loses two or three
orders of magnitude within some 10 to 20 °C. Both thresholds are crossed on that cliff, so both loads read a few degrees
under the glass transition, and anything that changes the stiffness by a factor (a bar 10 % porous carries the load on
less plastic, a moulded bar's frozen-in stress, the direction of the printed roads) shifts the crossing by a degree or
two at 0.45 MPa and a few degrees at 1.8 MPa, where the crossing sits on the cliff's upper shoulder. Annealing a glassy
bar relaxes its stress and adds a few degrees, which a print and a moulded bar share. Moulded polycarbonate shows it:
SABIC's LEXAN 141R prints 136 °C at 0.45 MPa and 125 °C at 1.8 MPa, unannealed, about 10 to 20 °C under polycarbonate's
145 to 150 °C glass transition.

**Plastics that can crystallise.** Above their glass transition only their crystals carry load, on a plateau that
falls slowly, and the light-load threshold of about 200 MPa lies on that plateau. A small change in crystallinity or
porosity then moves the crossing by tens of degrees: Sepe's unfilled PBT reads 153 °C at 0.45 MPa and 53 °C at 1.8 MPa.
A moulded bar cools in a hot mould and crystallises fully; a print quenches on a cooler bed in thin roads. PLA and PET
print glassy (D158) but crystallise in a hot mould or an oven: a crystallised PLA bar reads about 80 to 110 °C, a
printed one about 55 °C. Fibre makes the gap wider: a vendor's table (RTP Company) lifts PPS's 1.8 MPa value from 275 to 510 °F and
PEEK's from 320 to over 570 °F with 30 % glass, where amorphous PEI and PES gain little.

**Fibre-filled glassy plastics.** Fibres stiffen the glass but not the rubber above the transition enough to reach
200 MPa, so the bar still deflects near the glass transition: a few degrees higher, whatever the fibres' direction. How a
mould or a print aligns them matters to stiffness and strength, not much to this test.

**Blends.** PC-ABS has two glassy phases and behaves as one glassy plastic. PC-PBT has a crystallisable PBT phase, so it
is excluded, as is PLA-PHA. polymers.csv files both "amorphous" for the estimate model, which is why the rule reads a
column of its own (Can crystallise) and not the morphology.

**What the literature does not give.** No paired printed-against-moulded heat deflection data were found, as the
executor's search had found; the physics above is the textbook account of the test (Takemori; Sepe), and the data below
are the check.

## The check in our own data

Heat deflections as printed, dry, at a stated load, not flagged, by how the bar is described (the build after m487;
[empirical.mjs](empirical.mjs) re-derives it). Differences in °C: the undescribed value minus a printed bar's of the same
product, minus the median printed bar of the same material (product by product), and minus the product's own glass
transition where its documents print one; "> +10" counts how many sit more than 10 °C above.

| Load | Undescribed bars of (values) | Same product n | median | range | > +10 | Same material n | median | range | > +10 | Minus own Tg n | median | range | > +10 |
|---|---|---:|---:|---|---:|---:|---:|---|---:|---:|---:|---|---:|
| 0.45 MPa | a plastic that cannot crystallise, counted (41) | 0 | – | – | – | 14 | 0.3 | −12.5 to 27.5 | 2 | 14 | −10.5 | −27 to 11 | 1 |
| 0.45 MPa | the same, its document points to moulding (58) | 7 | −5 | −11 to 4 | 0 | 15 | 0.5 | −13 to 29 | 1 | 31 | −12 | −31 to 5 | 0 |
| 0.45 MPa | printed bars of a plastic that cannot crystallise | | | | | | | | | 84 | −5 | −35 to 12.6 | 1 |
| 0.45 MPa | PLA, PET, PVA, BVOH (print glassy, can crystallise) (68) | 6 | −2.2 | −4 to 0.8 | 0 | 9 | −2 | −21 to 2.1 | 0 | 36 | −5.9 | −11 to 1 | 0 |
| 0.45 MPa | a plastic that crystallises in the print (51) | 3 | 2 | 0 to 2.5 | 0 | 13 | 0 | −130 to 35 | 4 | 12 | 50 | −7 to 117 | 8 |
| 1.8 MPa | a plastic that cannot crystallise, counted (36) | 0 | – | – | – | 10 | −4.3 | −19.7 to 26.2 | 1 | 7 | −21 | −34.5 to −9 | 0 |
| 1.8 MPa | the same, its document points to moulding (47) | 0 | – | – | – | 14 | −3.2 | −15.7 to 23 | 2 | 26 | −20 | −34 to −1 | 0 |
| 1.8 MPa | printed bars of a plastic that cannot crystallise | | | | | | | | | 44 | −6.8 | −26 to 2.2 | 0 |
| 1.8 MPa | a plastic that crystallises in the print (43) | 1 | 0 | 0 | 0 | 6 | −4.1 | −112 to 108 | 3 | 9 | 2.5 | −33 to 90 | 1 |

**How close.** For the glassy plastics the counted values sit on their materials' printed values (median +0.3 °C at
0.45 MPa, −4.3 °C at 1.8 MPa) and below their own glass transition by as much as printed bars do or more (median −10.5
against −5 at 0.45 MPa; −21 against −6.8 at 1.8 MPa). The values a counter-indication keeps apart read the same, which is
the physics: even a moulded glassy bar deflects where a printed one does. The estimate model learned the same from its
own pairs (`meta.estimateModel`): a moulded glassy bar's heat deflection is the printed one's within 1.3 °C (sd 7.6,
8 pairs); a glassy bar's 0.45 MPa value is 5.9 °C under its glass transition (sd 6.3, 193 pairs) and 5.1 °C over its
1.8 MPa value (sd 3.5, 134 pairs). For the plastics that crystallise in the print the same comparison runs from −130 to
+35 °C, and values sit up to 117 °C above the glass transition: no rule could count them.

**Would any group overstate?** The materials whose counted values sit 10 °C or more above their printed median (PC,
PC-CF, CPE, ASA-GF) hold products of another grade of the same polymer, not another kind of bar: Spectrum's PC 275 and
PC CF (139 and 140 °C) are polycarbonate of the kind whose glass transition is near 145 °C (Bambu Lab's and 3DXTECH's
sheets print 145 and 147 °C), beside printed PC products whose glass transition is 113 °C (Polymaker's and Raise3D's),
and the material's printed bars still reach 144 °C; Fillamentum CPE HG100 (80 °C, its own glass transition 90 °C) sits
beside one printed CPE at 70 °C; IPCON ASA GF (98 °C) beside one printed ASA-GF at 88 °C. Against its own glass
transition one counted value sits more than 10 °C above: QIDI's PETG CF at 77 °C beside the 66 °C QIDI's PETG sheets
print, a low reading of that transition (PETG's is near 80 °C); printed bars do the same once.
Three groups would have overstated and are kept out:
- **Foamed.** Bambu Lab's ASA Aero prints 70 °C as a foamed bar and 85 °C undescribed: the Foaming filler is not in the
  rule.
- **Physics rules them out.** Fabru's ASA CF10 at 130 °C: no ASA's glass transition is near it (the sheets of its products
  here print at most 108 °C), and Nanovia's PC CF at 144 and 133 °C beside its own sheet's glass transition of 120 °C. Each
  is flagged physically implausible (m487), as D149 flags a PLA bar above its glass transition.
- **A counter-indication.** 114 heat deflections of these plastics sit beside a mould shrinkage, a "typical" or reference
  table, resin or supplier data (D172's list); they keep a Specimen type of their own and stay apart, though the table
  above shows they read alike, because the figure may be another compound's.

Reading the counted values' pages again found three loads the records had left out (Nanovia's PC V0 and PC CF print
"4.6 kg/cm 2" and "18.6 kg/cm 2", MatterHackers' PETG "66 PS"), now recorded, with the 1.8 MPa line Nanovia's records had
never transcribed (m487).

## Why the mechanical headlines stay as D172 has them

A tensile, flexural or impact bar is loaded in the glass, not at its transition, so every void, weld line and weak
layer bond scales its result directly, and a moulded bar is the dense, fully fused best case. The estimate model's own
pairs put a printed bar's stiffness at 0.87 of a moulded one's, its strength at 0.78 and its stretch at 0.59, and a bar
with no stated orientation or specimen reads about 15 % above a printed flat one (`tensile moulded`, `ultimate moulded`,
`break moulded` and the `unk` kinds). Amorphous or not, an undescribed bar flatters a print there, so the physics does not
support relaxing any of them.

## The rule as built (D177, m487)

- **polymers.csv** gains **Can crystallise**: yes (PLA, PET, the nylons, PP, PE, POM, PBT, PPS, PVDF, PVA, BVOH, PCL, LCP,
  PBAT, PC-PBT, PLA-PHA, PLA-PHB), no (the glassy list above), not known (Support, CoPE: classes whose products differ or
  whose makers do not say), Not applicable for an elastomer.
- **headline_definitions.csv** gains **Undescribed bar counts for**, in the Applies-to grammar. hdt045 and hdt18:
  `Can crystallise: no; Modifier / filler: Unfilled / unspecified | Carbon fibre | Glass fibre | Aramid fibre | ESD
  formulation | Electrically conductive | PTFE | Graphene | Commercial variant / undisclosed`. Every other headline:
  Not applicable.
- **specimen-types.csv** gains **Not published (its document points to moulded or resin bars)**, with a column saying
  so, given to the 1,004 values the readings of 2026-10-20 set apart for a counter-indication (232 of them heat
  deflections): set apart for good, and never counted.
- The build marks each value a headline counts (`markUndescribedCounts`, `m.countsUndescribed`), and assess, the lower
  bounds (CV01 floors 0.45 MPa by the 1.8 MPa value) and the evidence ledger read that one mark, so the product's value,
  its floors and its ceilings agree. A value with no stated load stays as published and floors the 0.45 MPa value only
  (CV63), as a printed bar's does. A copy of a set-apart figure on a lower-ranked document is never counted (D171).
- The drawer, the material pages and the answers say it: "test bar not described; counted, as a plastic that cannot
  crystallise deflects near its glass transition however its bar was made", and a set-apart value's note says a heat
  deflection counts only for such a plastic and only where nothing points to a moulded or resin bar.

## Sources

- M. T. Takemori, "Towards an understanding of the heat distortion temperature of thermoplastics", SPE ANTEC 1978
  (General Electric); also cited as Polymer Engineering and Science 19 (15), 1104-1109 (1979). Read through its
  bibliographic record and the summaries that quote it, not in full.
- M. Sepe, "Heat deflection temperature vs. dynamic mechanical analysis, part 2", Plastics Technology, February 2019.
- SABIC LEXAN 141R data sheet (ISO methods), HDT unannealed at 0.45 and 1.80 MPa, as a distributor serves it.
- RTP Company's table of 30 % glass-filled grades, HDT at 264 psi, as summarised by a web search; not fetched.
- The estimate model's learned conversions, `meta.estimateModel.properties.*.conversions`, in this release's build.

None of these is a source of a recorded value; the decision rests on the physics and on the comparison in our own data
above. Research by Claude Opus 5.5 (the round's materials-science track), with a web search for the literature.
