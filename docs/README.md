# Documentation

Start with [HOW-IT-WORKS.md](HOW-IT-WORKS.md) if you use the tool and want to know where its numbers come from,
[ARCHITECTURE.md](ARCHITECTURE.md) if you are going to change code, or [DATA-MODEL.md](DATA-MODEL.md) if you are
going to question a number.

| Document | Answers |
|---|---|
| [HOW-IT-WORKS.md](HOW-IT-WORKS.md) | For an engineer: how a data sheet becomes a number on the screen, what each kind of number means, how far to trust it, and what the tool is not |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How is this put together? Where does my change go? |
| [PIPELINE.md](PIPELINE.md) | How do the data tables become an HTML file? |
| [../AGENTS.md](../AGENTS.md) | How do I change data safely? |
| [DATA-MODEL.md](DATA-MODEL.md) | What is this number, and how much should I trust it? |
| [INTERFACE.md](INTERFACE.md) | Why does the screen behave this way? |
| [DECISIONS.md](DECISIONS.md) | Why was it done like that, and what breaks if I change it? |
| [DATA-DICTIONARY.md](DATA-DICTIONARY.md) | What does this column mean, what may it hold, and where does it point? (generated) |
| [RULES.md](RULES.md) | What does this error or warning code mean, and how do I fix it? (generated) |
| [audits/](audits/) | Where did this fail its users or its evidence, and what happened to each finding? |
| [background/](background/) | What was this built from? |

## Tracing why something is the way it is

Three places, in the order to try them.

1. **The source comment.** Most traps here produce plausible-looking wrong answers rather than
   errors, so the reason usually sits directly above the code.
2. **[DECISIONS.md](DECISIONS.md).** Numbered D1 to D60, with an index at the head saying which still hold, each
   saying what would break if it were reversed, followed by a table of bugs that shipped and what pins each one now.
3. **[audits/](audits/).** Fifteen audit passes so far, each in its own dated folder: the report as it was
   delivered, and the outcome of every finding. The latest, the [architecture review](audits/2026-09-15-architecture-review/REPORT.md),
   is also where what is done and what is not yet done is kept current.

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

**Names live in one place.** `app/js/ui/labels.js` for properties and criteria,
`schema/vocab/environment-categories.csv` for environment categories. A second way to name something
does not look wrong where you write it; it looks wrong three screens away, to a reader who now
doubts the number beside it.

The [systematic data audit](audits/2026-09-13-systematic-data/REPORT.md) includes every filament and family, all source/record locators and reproducible validation. D40 supersedes the old peer-exclusion rule.

The [transfer verification](audits/2026-09-14-transfer-verification/REPORT.md) proves the workbook reached the tables cell by cell, records every source correction since (m10 to m18), and explains the screening back-test (D48) and the checks `npm run verify` now runs.

The [filtering, estimates and data audit](audits/2026-09-15-filtering-estimates-data/REPORT.md) tested those fixes with thousands of random scenarios in the rendered page, a physics oracle, a pipeline review and source re-reads; its [response](audits/2026-09-15-filtering-estimates-data/RESPONSE.md) lists every fix by commit (m19 to m26, D54 to D57) and what remains open.

The [architecture review](audits/2026-09-15-architecture-review/REPORT.md) judged the whole pipeline after that audit and its
[response](audits/2026-09-15-architecture-review/RESPONSE.md) records what changed (the estimate stage, screening ends, records
out of configuration, typed conditions, the verification tiers; D58 to D60), what was deferred and why, and what is open.
