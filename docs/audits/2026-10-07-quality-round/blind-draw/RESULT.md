# The closing check (quality round 2026-10-07)

> **Historical record** (2026-10-07): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

A fresh Claude Sonnet reader, with no access to the tables, read what each drawn record's page prints
(`PROMPT.md`, seed 20261009); Claude Opus compared each reading with the record (`judgement.csv`).

## 40 changed records

Drawn from the records the round changed against commit c2243bbb (`draw.csv`): 10 retirements, 15 changed cells, 10
added values, 3 print profiles, 1 page statement of orientation and 1 toughened claim.

- **40 of 40 hold; 0 decide wrongly.** Every retired copy prints the number of the record that stays (the copy's page
  says nothing of the bar, or is a second edition or language); every changed cell and added value is what its row
  prints, flags included (an amorphous ABS's ISO 294 "melting temperature", Stratasys's 93.9 MPa PC yield).
- **One reading looked on the wrong page, by the draw's design.** The orientation row's Page is 1, the page its
  statement speaks for; the statement ("The specimens have been printed in XY plane …") is printed in the Notes of page 2,
  as its Locator says. Checked on the cached sheet.
- **One family found beside a drawn record.** Raise3D's melt flow row is right; its sibling, the melt volume row, still
  held the footnote mark in its standard cell ("1 ISO 1133") and no test temperature. The same shape stood on 54 more
  standard cells (a unit's superscript, a footnote mark, a part number moved in front); none decided anything, and
  m407 swept them, each checked on its page.

The pass rule (no deciding error, at most 1 of 40 wrong) is met.

## Missed toughened claims

- **First draw** (`negative.csv`, 20 unmarked products with any impact value): 4 of 20 carried a statement the rule
  admits (Flashforge PLA and HS PLA, Siraya Tech ABS-GF, eSUN ePA-CF). The round's first search had read only products
  with a notched impact headline value. Over the rule's 1 in 20, so the search was widened once (`widened-sentences.csv`,
  160 sentences on 114 products) and 25 products were marked (m408).
- **Second draw** (`negative-2.csv`, seed 20261010, 20 more): 1 of 20 missed (AzureFilm ABS, "specially designed for
  applications that require ultra high impact toughness"), within the rule's 1 in 20. Its wording, swept, found two
  more (Extrudr PCTG, Fiberon PET-GF15); all three are marked (m408). The measured miss rate after the widening is about
  one product in twenty (95 % interval roughly 0 to 25 %).
