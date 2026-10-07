# Quality round, 2026-10-07

> **Historical record** (2026-10-07): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

> **In short.** The owner asked for every open problem that needs no person's test or opinion to be worked through in
> one run (GOALS, "Decided on 2026-10-07, the quality round"). Claude Sonnet agents read the pages and searched the web;
> Claude Opus judged each reading and wrote the migrations m394 to m408 (D134, D135). No published digit was found
> misread. What changed is mostly words and conditions on rows, values held twice, values never transcribed, two
> imports, products their makers sell as toughened, and a page's statement of how its bars were printed. Three
> materials' answers moved (six template rows), each because a product's value changed on its page's word. What is
> still open is in OPEN-PROBLEMS §33.

## The fourteen items and what became of each

| # | Item | Outcome | Migration |
|---|---|---|---|
| 1 | Product values that copy a moulded bar's value | 61 pairs read on both pages: 36 copies retired, naming the record that stays; two of m393's retirements were wrong and are restored | m397 |
| 2 | Digit suspects and garbled pages | 563 records read on the page image: no digit misread; the cells the readers found wrong were words and conditions | m398 |
| 3 | 85 later copies of refetched documents | Every record citing them compared with them (`later/compare.csv`): all hold but one profile (P0134) and a stub; nothing registered | none |
| 4 | Values beyond 3 standard deviations | 276 read: the wrong ones fixed (m398), physics flags set, varioShore filed as a foaming variant | m398, m403 |
| 5 | Two documents on two products | 40 pairs read: The Filament's three TPU sheets are Spectrum's, held once; reprints and twins across materials stay two products | m402 |
| 6 | Named records | SUNLU PLA+ is its own product; a lone wrong key fixed; a 400 % stress added and three misprinted units held unresolved | m396, m398, m407 |
| 7 | A page's statement of print orientation | Built (D135): 28 sheets state it; 25 values of 22 products take their direction from it | m394, m395 |
| 8 | Impact readings held by the impact round | Read again with their columns: 40 values enter; then six sheets' tables the round found held in part (129 values) | m399, m401 |
| 9 | Thin materials | 17 searched: TPC-ESD and PBT-GF gain a second product | m406 |
| 10 | Unpriced materials | Eight priced from pages that print their VAT basis | m405 |
| 11 | Toughened products without the mark | 274 sentences judged: eight products marked; the closing draw found the search too narrow, and the widened one marked 28 more | m400, m408 |
| 12 | purefil GreenTEC | Entered under R179, keyed to Extrudr GreenTEC's sheet (D119) | m406 |
| 13 | PA612-GF heat deflection estimate | Already held at 218 °C (D126); the stale note removed | none |
| 14 | Unreachable sources | 15 retried: ten returned; Panchroma CoPE V5.4 entered from the Internet Archive | m406 |

## Code changes

- `page_context.csv` carries a Direction (D135), inherited by tensile, flexural and impact rows that state none, never by
  a moulded bar; `CONTEXT-ROW-CONTRADICTS-PAGE` checks it.
- The drying parser reads "if the filament has been opened", "after the material is damp" and "if excessive moisture"
  as optional drying; the treatment parser reads "wyżarzone" as annealed and "un-annealing" as as-printed.
- The import's notch reader reads ASTM D4812 as unnotched Izod, and a heading naming both Izod methods as naming no
  notch; the reconciler keeps a notched and an unnotched cell of one orientation apart.
- `GRADE-KEY-PRODUCTS` does not count rows retired as duplicates as a grade's own values.
- `ingest:witness --from` stages a document for a product the catalogue does not hold under its material.

## Files

- `targets.mjs`, `TARGETS-*.csv`: what was frozen per item; `read/`: the reading wave's queue, chunks and verdicts;
  `judge.py` and `decisions/`: the verdicts sorted for judging.
- `read8/`, `read9/`: the held impact columns and the six sheets' tables, read, reconciled, proposed and curated.
- `later/`: the comparison of the later copies. `web/`: the web searches (thin materials, prices, refetches, GreenTEC)
  and the price review `review-p05.mjs`.
- `ingest/`: batch b45 (fetch, staging manifest, reader prompt and readings, builder, proposals and packet).
- `blind-draw/`: the closing check.
- `answers.py`: the template answers against `baseline/`.

## The closing check

A fresh Claude Sonnet reader with no access to the tables read 40 of the round's changed records on their pages: all
40 hold, and the family found beside one of them (stray digits in standard cells) is swept in m407. Two draws of 20
unmarked products measured the toughened-claim search: the first found 4 missed, the search was widened (m408), and the
second found 1. [blind-draw/RESULT.md](blind-draw/RESULT.md) has the detail.
