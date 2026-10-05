# HTML source-reading repair during priority batch 01

> **Historical record** (2026-09-30): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

GOALS steps 2 and 5; C3/C4/C13. Two source-reading defects hid useful published content during the first twelve Nanovia product passes:

- A literal numeric comparison was treated as a tag. The verified original R-NANOVIA-PP-CF (`b9bb98021c7100391fcb6a310d2469943681988ef9d7c3825c54ea1522983aae`) prints water absorption **< 1 % after 24h of submersion**. The old reader dropped the bound value; the repaired reader retains it verbatim.
- Standalone span text outside a table was skipped. R-NANOVIA-PA-Food-Industry (`6489655e4381fcc2fc366d18e2499ade27facd99f9373e17b907865efb4fec98`) prints **Test performed at 50mm/min on ISO 3167 A test specimens** before its tensile table. The reader now preserves that line. It does not declare those specimens printed or moulded.

The reader recognizes actual tag names, preserves standalone spans and avoids duplicating inline spans already represented by a parent paragraph or leaf wrapper. Its version advances to html/tables v3. Targeted regression fixtures retain bounds, context order and single copies of inline text; script/style content stays excluded.

`node scripts/audit/refresh-html-cache.mjs --receipt <private-file>` refreshes only existing cached HTML from inventory originals verified by their registered digest, without fetching or changing tables. This run refreshed 458 registered/ledger HTML derivatives, found zero unavailable originals, kept two current readings and left thirteen out-of-inventory research captures private. Source-context audit remains 76 accepted, zero new/stale findings. Private captures are reread separately if admitted.

This repair changes no canonical fact or source revision. The affected measurements and conditions require their own reviewed guarded operations in the product tranche. OPEN-PROBLEMS §24 retains that pending admission; it no longer claims the repaired reader still drops the line. Verification and compiled-diff receipts will accompany the code commit.
