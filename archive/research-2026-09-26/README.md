# The research package of 2026-09-26

> **Historical record** (2026-09-26): kept from an earlier stage of the project. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../README.md) and [OPEN-PROBLEMS](../../docs/OPEN-PROBLEMS.md).

A research agent (Codex) was given the brief "H2C material database: mechanics-of-materials research brief" against
commit `b55e3eb`. It returned an evidence package with:

- 1,160 findings in 34 assignment folders;
- 1,014 saved documents, each with its SHA-256;
- 391 handoffs.

A second AI agent re-read every finding. No person reviewed them. The package lives outside this repository. Two of
its files are kept here, and every saved page this repository uses was staged into the ledger from the package's copy
(`ingest:witness --from`).

- **[disposition.csv](disposition.csv)** gives, for every finding, what became of it here:
  - *applied*, by the migration named (m200 to m211);
  - *already in the data* before this intake, and by what (m167 to m199 had done much of the same work since `b55e3eb`);
  - *left*, with why: a question for the maker or the owner, a source defect that persists, a document not retrieved,
    or a finding not applied.
- **[owner-handoffs.csv](owner-handoffs.csv)** is the package's 391 handoffs as it wrote them:
  - 255 questions for makers, one per value or product. Fiberlogy, Spectrum, FormFutura and purefil hold most of them:
    printed or moulded, the build orientation, the heat deflection load.
  - 127 questions for the owner.
  - 9 documents it could not retrieve.

  It is the list to send, and it is not data.

What the intake did, and what it moved, is in [RESPONSE.md](../../docs/audits/2026-09-25-re-center/RESPONSE.md),
"The research package of 2026-09-26: what it settled".
