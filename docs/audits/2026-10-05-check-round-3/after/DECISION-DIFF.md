# Decision diff: check round 3 against its baseline

> **Historical record** (2026-10-05): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

Against `baseline/` (the snapshot at the round's start, ecf6b99), after m369 to m382. Written by `decision-diff.py`.

## Template answers

- **Material verdicts moved: 0.** No material passes, fails or is unresolved in any template where it did not before.
- **Product counts moved in 140 template rows** (Indoor prototype 36, Warm environment 26, Lightweight structure 22, Flexible component 20, Outdoor structural part 18, High-stiffness fixture 18): the merges (m373) took nine duplicate products out of their materials' counts, rows moved to the product their sheet names (m372, m374), values typed annealed or dry now stand for that state (m370, m376, m378), and seven new Variants (six for their density, one glow-pigmented) count apart (m374). Materials whose counts moved: ABS, ASA, PC, PETG, PETG-ESD, PLA, PLA Silk, PLA Wood, PPA-CF, TPC / TPEE.
- **Estimate-mode candidates moved: 3** (Explore with estimates, where an estimate may screen a material out but never in, D43):
  - Flexible component: PA66 yes → screened (elongationXY >= 100).
  - Flexible component: PC-PBT-CF screened → yes (elongationXY >= 100).
  - High-stiffness fixture: PETG-GR yes → screened (tensileModulusXY >= 5).
  Each follows the estimate model's refit on the corrected observations. The screening ends' back-test counts moved by one or two (`build/snapshot/screening.csv`).

## Print answers

9 products left the list because they merged into another grade (G001-123, G001-94, G001-97, G008-19, G014-10, G020-50, G026-02, G031-27, G070-09). 12 products' print answers moved:

- G001-145 High Speed Matte PLA (M001): Enclosure not-needed → unknown; Abrasive no-special-concern → unknown. A density Variant reads no printer guide (m374, D129), so the gates only the guide answered are unknown.
- G001-188 PLA (M001): Enclosure recommended → not-needed. "Enclosure is not recommended for PLA" was read as recommending one (m371).
- G020-09 PET-G MATT (M020): Drying required → unknown. A density Variant reads no printer guide (m374, D129), so the gates only the guide answered are unknown.
- G020-38 PETG-Matte (M020): Chamber within → unknown; Enclosure not-needed → unknown; Abrasive no-special-concern → unknown. A density Variant reads no printer guide (m374, D129), so the gates only the guide answered are unknown.
- G027-14 ABS-FR (M027): Enclosure recommended → unknown; Abrasive no-special-concern → unknown. A density Variant reads no printer guide (m374, D129), so the gates only the guide answered are unknown.
- G027-21 TOUGH (M001): Enclosure recommended → not-needed. MakerBot Tough is filed under PLA and reads the PLA guide (m374).
- G027-39 ABS Prime (M027): Nozzle within → unknown; Chamber within → unknown; Enclosure recommended → unknown; Abrasive no-special-concern → unknown; Drying optional → unknown. A density Variant reads no printer guide (m374, D129), so the gates only the guide answered are unknown.
- G027-58 EasyFil ABS - Glow in the Dark (M027): Abrasive no-special-concern → unknown. A glow-pigmented Variant reads no printer guide (m374, D129).
- G031-29 ASA Prime (M031): Nozzle within → unknown; Chamber within → unknown; Enclosure recommended → unknown; Abrasive no-special-concern → unknown; Drying optional → unknown. A density Variant reads no printer guide (m374, D129), so the gates only the guide answered are unknown.
- G046-03 Arnitel ID 2045 (M046): Nozzle exceeds → within; Bed exceeds → within. Its nozzle and bed had been read to the °F numbers 473 and 140 as °C; m381 reads 220-245 and 40-60 °C.
- G081-06 Insublend (M130): Drying required → optional. Its drying is conditional ("when the spools has been exposed to moisture", m377).
- G164-06 PA NEAT (M164): Drying required → optional. Its drying is conditional ("If absorbed moisture levels are too high", m382).
