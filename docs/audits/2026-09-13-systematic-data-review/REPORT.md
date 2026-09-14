# Review of the systematic data audit

**Date:** 2026-09-13
**Reviewed:** commit `54f606a`, "Audit and correct material data mappings and source-to-HTML consistency",
and its report in [../2026-09-13-systematic-data/](../2026-09-13-systematic-data/REPORT.md)
**Question:** were the changes it made valid and correct?

## Verdict

The data corrections and the code fixes are correct. The checks below were made against the
sources and the files, not against the report's own account. Five smaller problems remained, and
one policy change, the estimate model, was defensible in its reasoning but costly in effect.

At the reviewed commit the build had zero errors, 112 tests passed, and the Pages deployment
succeeded.

## Verified

| Claim | How it was checked | Result |
|---|---|---|
| Four decimal-comma values were truncated (SD-01) | Re-read the hash-matched Spectrum data sheets for PETG ESD, PA6 Neat BK and PPS AM230 | Correct: "4,30%", "4,40%" and "1,3 kJ/m2" are printed; the recorded values now match |
| Strain at maximum force was filed as strain at break (SD-02) | The PA6 Neat BK row reads "Elongation at max. force (dry, at 50 mm/min)" | Correct: `Tensile strain at strength` is the right property |
| The workbook edit touched only 25 cells (27 logged edits) | Compared every sheet XML part of the input workbook (`b616ec1`) and the output cell by cell | Exactly those 25 cells in three parts changed; no formula and no cell style changed |
| Tolerances such as "180 ±20°C" were misparsed (SD-04) | Listed every profile temperature containing "±" | The three affected cells are the only ones, and now read 160–200, 205–225 and 70–80 °C |
| Limonene support was mapped to water (SD-05) | Compiled topic and verdict | Now organic-solvent, narrative, with the agent named |
| The retired CoPE mapping stayed active (SD-06) | Compiled grades, profiles and CoPE's lists | G091-01 and P0115 are retired; CoPE's only active grade and profile are its own |
| Open-interval comparisons were wrong at equality (SD-10) | Worked through all eight operator and bound combinations | The new logic is correct; the old one did not pass a strict lower bound equal to the threshold |
| An unstated-load HDT could fail a 0.45 MPa requirement (SD-08) | 0.45 MPa is the lowest standard HDT load, so a value at an unknown load cannot show the 0.45 MPa value is too low | Correct to remove the failure; treating an apparent pass as unresolved too is conservative and acceptable |

## Problems found

| ID | Problem | Effect |
|---|---|---|
| RV-01 | The report says "No deployment performed" and the response "No publication was performed" | False: the commit was pushed and the Pages workflow published it the same day |
| RV-02 | `ruledOutByEstimate` could never be true after the policy change | The top-bar "N ruled out" badge never appeared and the CSV column "Ruled out by estimate" was always empty |
| RV-03 | INTERFACE.md, the table legend and a comment in `format.js` still said an unstated-load heat value "cannot pass a heat requirement outright" | Incomplete: after SD-08 it can neither pass nor fail one |
| RV-04 | D23, D34, the comment in `chamber-estimates.js` and the `~2.8–15.3†` examples in README and DATA-MODEL still described estimates that rule materials out | Stale text beside a changed rule |
| RV-05 | A compiled estimate endpoint was `2.1999999999999997` | Printed as-is in the CSV export |
| RV-06 | Retirement depends on the exact Availability text "Retired mapping; audit trail only", which only the code knew; `npm run audit:data` writes to a folder git does not ignore; about 2.4 MB of generated audit output was committed | A typo in the phrase would silently reactivate a grade; a local run leaves untracked files; the repository grows |

## The estimate policy (SD-07)

The audit found real faults in the first estimate model: display families pooled different polymers
(OBC borrowed polypropylene's elongation; TPU pooled with PEBA), and a sample's minimum and maximum
were treated as a bound on a material nobody measured. Its remedy was to keep three same-polymer,
same-modifier spans and let none of them decide anything.

That removed the faults and also the reason estimates exist. The Estimates toggle, the Ashby
estimated-materials layer, Compare's hatched spans and the CSV estimate columns were left serving three
values, and a PLA could again sit among elastomers in an elongation search. The three surviving spans
also pooled undisclosed PLA variants including wood, metal and glow fills, which the audit itself
cautioned against; that was harmless only because they decided nothing.

The owner of the tool accepted the criticism and rejected the remedy, and asked for a sturdier model.
[RESPONSE.md](RESPONSE.md) records what replaced it.
