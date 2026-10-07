# Progress (quality round 2026-10-07)

> **Historical record** (2026-10-07): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

## R0, frozen before reading (2026-10-07)

| Item | What | Frozen | To read |
|---|---|---|---|
| 1 | product values that repeat a moulded bar's number, plus m393's 20 re-checked | 41 + 20 pairs (TARGETS-1) | 61 copy-pair tasks |
| 2 | digit suspects and garbled pages | 908 suspect records + 126 deciding records on garbled pages (TARGETS-2) | 563: 64 that can turn an answer, 293 product values or targets, a seeded 80 of the rest, 126 garbled-page records |
| 3 | 85 later copies | 85 sources (check round 3 refetch) | code comparison first |
| 4 | values beyond z 3 the 200 sweep did not reach | 538 (TARGETS-4) | 276: 196 that decide, a seeded 80 of the rest |
| 5 | two documents of one maker on two products, unjudged | 40 pairs (TARGETS-5) | 40 |
| 6 | the named records | 32 held back for unit/layout, 3 Charpy standards, SUNLU PLA+ sheet, TPU95 ISO 37, Eryone XY elongation, G070-08 key | 38 |
| 7 | orientation stated once for a page | 20 documents state it (colorFabb's "specimens have been printed in XY plane" on 17 sheets, Spectrum PLA Tough, filament2print PEEK) | gate passes |
| 8 | impact readings held in the impact round | 263 + 593 | after the main wave |
| 9 | thin materials | 17 | web |
| 10 | unpriced materials | 35 | web |
| 11 | toughness sentences on products with an impact value and no mark | 274 sentences (TARGETS-11) | judged by Opus |
| 12 | purefil GreenTEC | 1 sheet | web + image |
| 13 | PA612-GF heat deflection estimate | already held under 218 °C (D126): plausible 74–218 | closed |
| 14 | unreachable sources | 2 + 15 | web |

The reading queue: 978 tasks on 387 documents in 22 chunks (read/chunk-NN.csv), each document read once.

## The run, in order (2026-10-07)

| Step | What | Commit |
|---|---|---|
| Reading wave | 22 Sonnet chunks read the 978 tasks; `judge.py` sorted the verdicts into `decisions/` | — |
| Part 1 | m394–m398: page orientation (D135), SUNLU PLA+ and a lone key, moulded copies held once, cells the readers found wrong; `verify:fast` passed | 0c1904b7 |
| Item 8 | `read8/`: the impact round's held columns read again, reconciled, a blind second read, proposed, curated (`read8/curate.py`) | — |
| read9 | six sheets' tables found held in part, read whole and read again blind | — |
| Part 2 | m399–m403; two pipeline fixes (notch by method, notch in pairing) and one lint fix; `verify:fast` passed | 58fec31a |
| Imports | b45 (five documents, `ingest/`) and p05 (eight prices, `web/review-p05.mjs`); `audit:context` clean | aa5b92d1 |
| Closing check | blind draw of 40 changed records and two missed-claim draws (`blind-draw/`); m407 (units, stray-digit standards, a misfiled page) and m408 (25 claims) | part 4 |

Answers moved against `baseline/` (`answers.py`): PETG-GF leaves "Lightweight structure", CoPE leaves "Flexible
component", nGen / Amphora enters "Warm environment" as unknown (each in Explore and Explore with estimates).
