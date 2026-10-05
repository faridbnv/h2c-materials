# Preserve context printed between HTML table rows

> **Historical record** (2026-09-30): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

The HTML reader now keeps standalone captions and leaf paragraphs/spans inside a table, in source order beside its rows. Inline cell text is recorded once. This restores the Nanovia preparation sentences omitted by the former reader; the original bytes and the canonical ±45°/D91 direction records were already correct and remain unchanged.

Five focused fixtures cover ordinary tables, numeric bounds, outside-table context, malformed tbody spans and captions without duplicate inline text. All 460 registered HTML derivatives were refreshed from hash-verified originals. Independent AI review re-read the three affected Nanovia originals and confirmed each preparation sentence appears exactly once.

Full verification passed: 488 unit tests, 208 import tests, context audit 76 accepted/0 new/0 stale, 69 browser views and 300 rendered scenarios (2596 readings). Compiled difference: zero. Source backup: 2409 originals and 2815 derivatives; 124 historical inventory absences remain, with no newly cited missing original. [Verification receipt](priority-01-table-span-verification.json) and [independent review](priority-01-table-span-review.json).

The completion ledger also closes the verified first twelve priority product passes at their existing data commit 41429e5. All 136 material assessments are complete; selected product completion is 12/100, leaving 88.
