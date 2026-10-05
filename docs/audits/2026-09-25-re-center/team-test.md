# Team test at real volume

> **Historical record** (2026-09-25): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

Phase 3's gate asks two of the team's engineers to use the tool, unaided, on five tasks. No user test has been run
since the data grew tenfold (the last two audits, 2026-09-11 and 2026-09-12, saw 102 materials and 136 products).
The tasks come from the brief's use cases (`docs/background/architecture-brief.md` §2.2) and the goals
(`docs/GOALS.md`).

**How to run it.**
- About 45 minutes per person.
- Open `dist/H2C_Material_Selector_<date>.html` from a fresh build, on a laptop.
- Say nothing about how the tool works: the point is whether it explains itself. Ask the person to think aloud.
- Write down each place they stop, guess wrong or ask a question, and whether they got the answer.
- Afterwards, record the findings below. Anything that needs a change goes to the plan: the owner decides whether it
  becomes work.

## The five tasks

1. **An outdoor bracket.** "We need a bracket that lives outside, holds shape above 80 °C, and is as light as
   possible for a stiffness of at least 3 GPa. It must print on our H2C without a hardened nozzle. Which materials,
   which products, and how do we print the best one?"
   - Watch for: whether they find Rank by, and read "1 of 4" as products; whether they open the Products tab and find
     the print settings; whether they notice UV is not verified.
2. **Why not PLA?** "A colleague says PLA is stiff enough for 3 GPa. Is that right?"
   - Watch for: whether they read PLA's range and understand that the typical printed product is about 2.3 GPa;
     whether they find the 46 values published without a direction and understand why those do not count.
3. **A specific spool.** "We already have Polymaker spools in stock. Which of them would pass task 1?"
   - Watch for: search by brand; reading the Products tab's pass list.
4. **Where did this number come from?** "Pick any stiffness in the table and show where it was published, under which
   conditions."
   - Watch for: the typical value's popover, the product's measurement, the Sources tab, the page number.
5. **What can't the tool tell us?** "For a part in contact with engine oil at 90 °C, what does the tool know, and what
   would you still need to test?"
   - Watch for: the Environment filters, polymer-level records, "What this database cannot answer".

## Findings

| # | Who | Task | Where they stopped or went wrong | Got the answer? | Suggested change |
|---|---|---|---|---|---|
| | | | | | |

Keep one row per observation. The date and the build's snapshot go at the top when the test is run.
