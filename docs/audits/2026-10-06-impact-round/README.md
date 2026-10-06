# Impact round, 6 October 2026

> **Current** (2026-10-06): the impact round's record and what it left. For where things stand overall, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

**In short.** The owner asked for a better way, in the drawer, to compare the two impact tests (notched Charpy and
notched Izod), and for a reader not to take a few toughened products' values for a whole material ([GOALS](../../GOALS.md),
"Decided on 2026-10-06, later"; [D133](../../DECISIONS.md)). The drawer part is code (m385, m386). This packet is the
data part: the impact results the registered sheets print and the tables did not hold, read from the pages.

**What was done**

- **Targets, frozen first.** [targets.mjs](targets.mjs) found 345 registered documents (787 pages) whose cached text
  prints an impact line with a unit or a standard and whose tables held fewer impact rows: 210 with none at all. Tier 1
  (PLA, PETG, ABS, ASA and every toughened candidate) is 142 of them. [DOCS.csv](DOCS.csv), [TARGETS.csv](TARGETS.csv).
- **Read twice.** 23 Claude Sonnet readers read every impact row of the 345 from the page images
  ([IMPACT-READER-PROMPT.md](IMPACT-READER-PROMPT.md); [readings/](readings/)). The reconciler checked each against the
  page's text and the held rows; 446 rows the text did not pair, or that decide, were read again by five blind readers
  ([SECOND-READ-PROMPT.md](SECOND-READ-PROMPT.md); [second-read/](second-read/)): 485 agreed, 20 disagreed and were
  held. 191 held rows were confirmed on their pages. The 52 the reconciler called mismatches were, in every case review
  opened, a reading of another row of the same page (another direction, notch or temperature); no held value changed.
- **Reviewed before it was applied.** Of the 317 new values the proposal tool passed, Claude Opus applied 86 and held
  the rest ([curate.mjs](curate.mjs), [opus-held.csv](opus-held.csv)): all 6 corrections it proposed (26 cells) paired a
  held row with another row of its page (a Z value with the XY one, notched with unnotched, 23 °C with -30 °C); 47 were
  columns of makers' product pages that compare products; 39 are told apart on the page by a column the readings did not
  capture (QIDI, Stratasys); 133 are a resin supplier's guide (DuPont), moulded data. The context audit then held 10
  more: four rows naming ASTM D256 beside ISO 179 (older Polymaker sheets, whose test a held test already refuses to
  guess), a -30 °C row whose minus sign the text lost, and five rows of Polymaker pages that tell the reader to anneal
  and condition after printing without saying which state their bars were in; 2 more one by one. m388 applies the 86
  and one page statement.
- **Errors found on the way** (m387): two rows on another product than their page names (Fiberlogy IMPACT PLA's page,
  a MagicFil Thermo PLA copy), a Hyper PLA-CF sheet filed as Hyper-PLA+ (now a product of its own under PLA-CF),
  colorFabb PLA High Speed PRO's 27.9 notched flagged implausible on one copy only, eleven notched rows printing the
  unnotched method code, and BASF's ISO 180 Izod column headed "J/m".

**What moved.** PLA's notched Charpy is now 18 products (median 8.92, was 13.52 over 16); 7 are sold as toughened
(5.76 to 72.3) and the other 11 give 3.97 to 20.3, median 6.7. ABS's is 6 products (median 19.0). No verdict changed;
the six templates' answers are the same except one Explore-with-estimates screen (PA66 for the flexible component,
whose elongation estimate's plausible top moved from 99.7 % to 103 % when the estimate model was refitted on the
moved Hyper PLA-CF values), and PLA-CF counts one product more.

**Left open** (in [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md) §18): the held readings above, which need their columns read;
the bounded fetch of toughened PLAs the database lacks; the claims round's draw of unmarked products; and SUNLU's
"PLA+" product-information sheet, filed on plain SUNLU PLA, whose identity (PLA+ or PLA+2.0) is not settled.
