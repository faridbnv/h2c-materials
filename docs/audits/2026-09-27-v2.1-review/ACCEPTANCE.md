# Version 2.1 acceptance portfolio

Twelve questions a small engineering team with an H2C would actually ask, each with the answer the source records
support. They are the independent half of the version 2.1 tests ([the plan](V2.1-PLAN.md), phase 0 and section 5):
the rest of the suite compares the page with the engine that drew it, or the database with the compiler that built it,
and both can agree on a wrong rule. These answers were written from `data/tables/*.csv` and, where a record's role was
in question, from the cached, hash-checked sheet it cites, **before** the code that meets them, and nothing in them was
copied from the engine's output.

- Machine form: [`test/acceptance/portfolio.json`](../../../test/acceptance/portfolio.json), run by
  [`test/acceptance.test.js`](../../../test/acceptance.test.js) in `npm test`.
- Invariants that hold whatever the data: [`test/metamorphic.test.js`](../../../test/metamorphic.test.js).
- **Who wrote the answers:** Claude Opus 5.5, an agent, on 2026-09-28. **No person has reviewed them.** The checklist
  at the end is what a reviewer should confirm before the portfolio counts as the team's.

An expectation that the code did not yet meet when it was written carries `"todo"` with the work package that would
meet it; `node:test` reports it without failing. Each work package's commit removes its marks, so the portfolio shows
what each step settled.

## The questions

| Case | Question | What the sources say | Expected answer |
|---|---|---|---|
| S01 | Outdoor bracket: HDT(0.45 MPa) ≥ 100 °C, XY modulus ≥ 3 GPa, density ≤ 1500 kg/m³, printable on the H2C, used as printed | Polymaker FIBERON ASA CF08 (G033-11): 103 °C (V006484), 3.61 GPa (V006485), 1090 kg/m³ (V006477), nozzle 260-280 °C, bed 90-100 °C, chamber room temperature (P0569); nothing stated annealed, and specimen, moisture and treatment not stated. FIBREX PA12 GF30 (G054-01) meets the numbers but asks a chamber up to 120 °C (P0141). Bambu PPA-CF (G070-01) asks 50-80 °C (P0089). Bambu PA6-CF (G050-01) measures everything after 80 °C, 12 h annealing (V000928, V000930) | G033-11 PASS as printed, saying which conditions the policy admitted unstated; G054-01 FAIL on the chamber; G070-01 UNKNOWN (partly reachable); G050-01 UNKNOWN as printed, PASS with annealing permitted and the verdict naming 80 °C, 12 h. The Outdoor template asks the nozzle, bed and chamber |
| S02 | Warm polycarbonate part, through the Warm environment template | Spectrum PC 275 (G035-03) asks a 90-130 °C bed (P0203); FormFutura Kratos PC (G035-21) prints the same sheet (D89) | Both FAIL on the bed; the template asks the bed |
| S03 | PET-GF fixture: XY modulus ≥ 4 GPa, HDT ≥ 80 °C, with and without an oven | Fiberon PET-GF15 (G068-02): as-printed HDT 81.6 °C (V001931); its XY modulus 4.14 GPa (V001934) is of bars "all annealed at 120°C for 16h" (the footnote under the mechanical table); annealed HDT 133.7 °C (V001933), and the sheet's recipe states "Annealing temp. and time 120°C/16H" | As printed UNKNOWN, the reason naming 120 °C, 16 h; with annealing permitted PASS in the annealed state on V001933 and V001934 |
| S04 | PLA Matt that must not soften below 100 °C | Spectrum PLA Matt (G001-06): 116 °C "annealed (4h @ 90°C)" (V002780); no as-printed HDT. The 90 °C is the annealing temperature, not a test temperature (re-read 2026-09-27) | As printed UNKNOWN; annealing permitted PASS naming 90 °C, 4 h. V002780 and V002781 carry no test temperature |
| S05 | Humid fixture: XY modulus ≥ 6 GPa after moisture uptake | BASF Ultrafuse PAHT CF15 (G048-02): dry 8.39 GPa (V002469), conditioned 5.05 GPa (V002495). Nanovia PA-6 CF (G050-12) publishes no conditioned value | Dry PASS; conditioned FAIL on V002495; G050-12 conditioned UNKNOWN, nothing inferred |
| S06 | A part that meets acids | PolyMax PETG-ESD (G026-02): weak acids Good (Q00107), strong acids Fair-Poor (Q00108), p. 2, re-read 2026-09-27. 3DXSTAT ESD PETG (G026-01) has no acid record of its own | G026-02 UNKNOWN (the limiting rating stays in the answer); G026-01 UNKNOWN |
| S07 | ECOMAX PLA: resists water? in stock in Canada? | ECOMAX PLA (G001-01) has no water record and no sampled offer; Bambu PLA Basic (G002-01) has both (Q00007, CA0001); Spectrum FlameGuard PLA's one offer was out of stock (CA0297; PLA Basic Gradient's until the price pass found it in stock at a second shop, CA0263) | G001-01 UNKNOWN on both; G002-01 PASS on both; G001-14 FAIL on stock, G005-01 PASS |
| S08 | PETG for a part that must not soften below 100 °C, Include uncertain | Of PETG's 76 products, the 33 that publish a heat deflection at 0.45 MPa all print 80 °C or less; 43 publish none | PETG UNKNOWN and still explored: 0 pass, some fail, some untested, counted |
| S09 | Warm environment ranked by a light, stiff beam | (a rule, not a record) | The table, the chart's guide and the export give one order from the passing products' own values |
| S10 | A part loaded across its layers; one taking a notched impact | G033-11's Z strength 25 MPa (V006488), XY 43.5 MPa; ECOMAX PLA states XY only; PC 275 states notched Izod in J/m to ASTM D256 (V002883) | Z ≥ 40 MPa FAIL on 25; ECOMAX Z UNKNOWN; PC 275 notched Charpy and notched Izod UNKNOWN |
| S11 | A general prototype, most products with no sampled price | 38 of 1,077 in-scope products have a sampled price (the review's count) | The Indoor prototype's price is tracked, not required; no product's answer rests on a missing price |
| S12 | A decision reopened against a release made the same day | (a rule) | A different release warns even on the same data date; the same release does not; a scenario from before releases says its identity is only a date; a link carries its release |

## What the portfolio showed on the baseline

Run on commit `eb695b8` (the reviewed baseline), before any version 2.1 change: the 11 expectations about behaviour
the tool already had held; 34 of the 35 new expectations failed, which is what makes them counterexamples to the old
rules and not restatements of them. The 35th ("the same release reopened raises no warning") held trivially, because
the baseline warns about nothing on the same date.

The invariants in `test/metamorphic.test.js`: a stricter limit never creates a pass, ranking never changes an answer,
and rewriting record-tier text moves no answer, held on the baseline; "a failing product cannot remove an unresolved
one", "a sibling's positive record cannot confirm a product" and "a product's own contrary record is not hidden by a
sibling's" failed, as the review found.

One answer was wrong as first written, and was corrected before the code that meets it changed: S08 first asked PLA
for 3 GPa, from D84's count (27 PLA products state an XY modulus and none reaches 3 GPa). Four PLA products now state more
(colorFabb PLA-HP, 4.24 GPa, and three others), so PLA passes; the question moved to PETG and 100 °C, whose premise was
re-derived from the tables. A count in a decision's prose is its day's.

## For a person reviewing these answers

Each answer is only as good as its reading. Before the portfolio counts as the team's, a reviewer should confirm,
against the sheet each cites:

1. S03: that Fiberon PET-GF15's annealed HDT rows (V001932, V001933) were annealed on the sheet's own recipe, 120 °C for
   16 h. The sheet prints the schedule in its recipe and under its mechanical table, and "(annealed)" beside the HDT
   rows; that these are one schedule is a reading, recorded as such in the rows' Parse review.
2. S06: that "Fair-Poor" for strong acids should keep a weak-acid "Good" from answering "resists acids", rather than
   the category being split by strength. The engine is not told which acid the part meets; a team that knows it should
   say so, and a later version may ask.
3. S05: that a conditioned value is the right one for "a humid room". Polymaker's own moisture-conditioning page says
   a print keeps absorbing water after it is dried; nothing here quantifies how far.
4. S01 and S04: that an as-printed default is what the team wants when it has an oven. The answer is one switch away,
   and the verdict names the treatment.
5. Every case: that the thresholds are the team's own. They are illustrative, chosen so each case separates the old
   rule from the new one.
