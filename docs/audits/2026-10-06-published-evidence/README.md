# Published impact evidence, 6 October 2026 (withdrawn)

> **Historical record** (2026-10-06): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

**In short.** Another AI agent ran a bounded round on 24 products' impact values and makers' toughness claims and pushed
it to main (f57dffda, b4fbaf26). A review the same day found it moved no number but put wrong words on the page, and the
owner had it reverted ([D132](../../DECISIONS.md), withdrawn). What it found on the pages is kept:

- **Kept as data:** the later saved Bambu PLA Tough+ product page (source R-BAMBU-PLA-TOUGH-20261005, SHA-256
  79e4ff6a…, admitted through `ingest:witness --from`; [ingest/ledger.csv](ingest/ledger.csv)) and four maker statements
  read on their hashed pages (Q05757–Q05760), filed under Benefits and Good for by m384.
- **Kept as record:** [READINGS.csv](READINGS.csv), the round's 27 readings of held impact values (each confirmed the
  value held), and [OUTCOMES.md](OUTCOMES.md), each assigned product's outcome, including the 8 impact rows whose label
  and standard contradict each other and the 8 chamber setpoints no maker publishes. Both were read by that agent ("Codex
  AI"), not by a person.
- **Not kept:** the code, the drawer text, the topic "Impact and toughness" and the rest of the packet (inventories,
  scenario dumps, the archived database). They are in git history at b4fbaf26.
