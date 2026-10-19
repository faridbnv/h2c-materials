# The research package of 2026-10-19

> **Historical record** (2026-10-19): kept from an earlier stage of the project. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../README.md) and [OPEN-PROBLEMS](../../docs/OPEN-PROBLEMS.md).

The owner gave an external research agent (Codex) a brief written from OPEN-PROBLEMS: the problems an agent can close by
reading and searching, in four priorities (re-reads of held sheets; print recipes, fibre loads, products and prices the
makers publish; polymer references; identities and sources that cannot be reached). It worked outside the repository
and changed nothing in it. It returned:

- 827 findings, one per target;
- 539 page readings in the repository's reading schema;
- 275 saved documents, each with its SHA-256;
- 47 handoffs: 39 questions for makers and 8 for the owner.

The intake's own agents (Claude Sonnet) then completed the four new products and re-checked the price leads. Claude Opus
triaged everything and built the round; no person reviewed it. The package stays outside the repository, and every
document this repository uses from it was staged by digest into the round's ledger (`ingest:witness --from`).

- **[disposition.csv](disposition.csv)** says, for every finding, what became of it:
  - *applied* (179), by the stage and migration named: corrections (m452), documents and readings (m453, m454), the
    polyolefins chamber row, FormFutura's public links (m456), the two code fixes;
  - *already in the data* (163): the page confirms the held record, or the document is a later copy of a registered
    sheet (compared with its records, never registered);
  - *left* (485), with why: 407 scoped searches that found nothing, questions for the owner or a maker, and readings the
    triage did not apply (a later copy's line the registered sheet does not print, a value judged right).
- **[handoffs.csv](handoffs.csv)** is the package's 47 handoffs as it wrote them. It is the list to send, and it is not
  data.

What the round did, and what it moved, is in [the round's record](../../docs/audits/2026-10-19-research-intake/README.md).
What it left is filed in [OPEN-PROBLEMS](../../docs/OPEN-PROBLEMS.md) (§39 and the dated paragraphs it added to §5, §6,
§11, §12, §14, §22, §31.3, §31.12, §37.1, §37.12, §37.20, §38.2, §38.4 and §38.8).
