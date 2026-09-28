# Documentation

Start with [GOALS.md](GOALS.md): what the tool is for, the method it follows, and the rules every change is held to.
Then [HOW-IT-WORKS.md](HOW-IT-WORKS.md) if you use the tool and want to know where its numbers come from,
[ARCHITECTURE.md](ARCHITECTURE.md) if you are going to change code, or [DATA-MODEL.md](DATA-MODEL.md) if you are
going to question a number.

| Document | Answers |
|---|---|
| [GOALS.md](GOALS.md) | What is this for, who is it for, what is decided next, and how is a change judged? |
| [HOW-IT-WORKS.md](HOW-IT-WORKS.md) | For an engineer: how a data sheet becomes a number on the screen, what each kind of number means, how far to trust it, and what the tool is not |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How is this put together, how do the data tables become an HTML file, and where does my change go? |
| [../AGENTS.md](../AGENTS.md) | How do I change data safely? |
| [IMPORTING.md](IMPORTING.md) | How does a batch of manufacturers' data sheets enter the database? (paused; the procedure for when it runs) |
| [WALKTHROUGH-ADD-A-MATERIAL.md](WALKTHROUGH-ADD-A-MATERIAL.md) | How do a material's records fit together? (a historical example: a new sheet today travels the import pipeline) |
| [DATA-MODEL.md](DATA-MODEL.md) | What is this number, and how much should I trust it? |
| [INTERFACE.md](INTERFACE.md) | Why does the screen behave this way? |
| [DECISIONS.md](DECISIONS.md) | Why was it done like that, and what breaks if I change it? |
| [DATA-DICTIONARY.md](DATA-DICTIONARY.md) | What does this column mean, what may it hold, and where does it point? (generated) |
| [RULES.md](RULES.md) | What does this error or warning code mean, and how do I fix it? (generated) |
| [OPEN-PROBLEMS.md](OPEN-PROBLEMS.md) | What is known to be wrong or missing right now, and what would fix each? |
| [audits/](audits/) | Where did this fail its users or its evidence, and what happened to each finding? |
| [background/](background/) | What was this built from? |

## Three routes

- **An engineer choosing a material and a product:** [HOW-IT-WORKS.md](HOW-IT-WORKS.md), then the page. Set what the part
  must do (or start from a template), say whether you can anneal and whether the part lives humid, read the passing
  products first, choose the one to print, and take its decision brief (Save / share).
- **A maintainer correcting one value of a registered source:** [AGENTS.md](../AGENTS.md), "Correct a published value":
  re-read the hash-checked page, write a guarded migration (m212 is a short one), then `npm run verify:fast`,
  `npm run snapshot` and `npm run build:diff`, and `npm run trace -- <MeasurementID>` to see what it decides
  (`npm run trace -- --scenario <saved file> --product <GradeID>` for one product's decision).
- **An authorized import of a new document:** [IMPORTING.md](IMPORTING.md). Imports are paused except within the owner's
  exceptions ([GOALS.md](GOALS.md)); a document never enters by hand.

## Tracing why something is the way it is

Three places, in the order to try them.

1. **The source comment.** Most traps here produce plausible-looking wrong answers rather than
   errors, so the reason usually sits directly above the code.
2. **[DECISIONS.md](DECISIONS.md).** Numbered, with an index at the head saying which still hold, each saying what
   would break if it were reversed, and a table of bugs worth remembering, with what pins each one now.
3. **[audits/](audits/).** Each audit pass in its own dated folder: the report as it was delivered, and the outcome
   of every finding. The [version 2.1 review](audits/2026-09-27-v2.1-review/REVIEW.md) holds the plan built
   on `v2` and merged to `main`; what is decided from it is in [GOALS.md](GOALS.md), and what was done, and what waits
   on people, in its [response](audits/2026-09-27-v2.1-review/RESPONSE.md). The latest work is
   [source backup and targeted gap closure](audits/2026-09-28-gap-closing/RESPONSE.md): every frozen target has an
   outcome, and unresolved facts and additional state variants have explicit follow-ups.

Where the interface is the way it is because a first-time user hit it, the audit says so. Where it
is the way it is because of what the data can and cannot support, DECISIONS says so. If neither
does, the git history for that file will.

## Working on it

**The build must stay deterministic and must keep failing loudly.** If a change makes a validation
error into a warning, the build will happily ship a database that has drifted.

**Comments explain why, not what.** The source is dense with explanations of failures that already
happened, because most of the traps here produce plausible-looking wrong answers rather than errors.
A comment saying a parser cannot accept a leading minus is worth more than the regex it sits above.

**A bug in a parser gets a test with the failure in the comment.** See `test/normalize.test.js`.
Those tests read oddly without the context, which is exactly why the context is in them.

**If you weaken a rule in the list in the README, say so in DECISIONS.md.** Those rules are
what the tool asserts about its own trustworthiness.

**Names live in one place.** `data/tables/headline_definitions.csv` for properties, `app/js/ui/labels.js` for
criteria and verdicts, `schema/vocab/environment-categories.csv` for environment categories. A second way to name
something does not look wrong where you write it; it looks wrong three screens away, to a reader who now doubts the
number beside it.

The [systematic data audit](audits/2026-09-13-systematic-data/REPORT.md) includes every filament and family, all source/record locators and reproducible validation. Its rule that peer observations are context, not exclusion bounds, is D40, since superseded by D42 and then D43.

The [transfer verification](audits/2026-09-14-transfer-verification/REPORT.md) proves the workbook reached the tables cell by cell, records every source correction since (m10 to m18), and explains the screening back-test (D48) and the checks `npm run verify` now runs.

The [filtering, estimates and data audit](audits/2026-09-15-filtering-estimates-data/REPORT.md) tested those fixes with thousands of random scenarios in the rendered page, a physics oracle, a pipeline review and source re-reads; its [response](audits/2026-09-15-filtering-estimates-data/RESPONSE.md) lists every fix by commit (m19 to m26, D54 to D57) and what remains open.

The [architecture review](audits/2026-09-15-architecture-review/REPORT.md) judged the whole pipeline after that audit and its
[response](audits/2026-09-15-architecture-review/RESPONSE.md) records what changed (the estimate stage, screening ends, records
out of configuration, typed conditions, the verification tiers; D58 to D60), what was deferred and why, and what is open.

The [re-center review](audits/2026-09-25-re-center/REPORT.md) set the plan now followed (phases 0 to 6), and its
[response](audits/2026-09-25-re-center/RESPONSE.md) records each phase by commit. It also records the intake of the
external research package of 2026-09-26 (m200 to m211, batch b37, D88 amended), whose findings are accounted for one
by one in [archive/research-2026-09-26/](../archive/research-2026-09-26/).
