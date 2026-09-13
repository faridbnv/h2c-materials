# Documentation

Start with [ARCHITECTURE.md](ARCHITECTURE.md) if you are going to change code, or
[DATA-MODEL.md](DATA-MODEL.md) if you are going to question a number.

| Document | Answers |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | How is this put together? Where does my change go? |
| [PIPELINE.md](PIPELINE.md) | How does the workbook become an HTML file? |
| [DATA-MODEL.md](DATA-MODEL.md) | What is this number, and how much should I trust it? |
| [INTERFACE.md](INTERFACE.md) | Why does the screen behave this way? |
| [DECISIONS.md](DECISIONS.md) | Why was it done like that, and what breaks if I change it? |
| [UX-AUDIT.md](UX-AUDIT.md) | Where did this fail a 3D printer owner who had never seen it, and what happened to each finding? |
| [background/](background/) | What was this built from? |

## Tracing why something is the way it is

Three places, in the order to try them.

1. **The source comment.** Most traps here produce plausible-looking wrong answers rather than
   errors, so the reason usually sits directly above the code.
2. **[DECISIONS.md](DECISIONS.md).** Numbered D1 to D29, each saying what would break if it were
   reversed, followed by a table of bugs that shipped and what pins each one now.
3. **[UX-AUDIT.md](UX-AUDIT.md).** 35 findings against a first-time user, each carrying its outcome,
   and a closing part recording what the audit itself got wrong.

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

**If you weaken a rule in the list in the README, say so in DECISIONS.md.** Those fourteen rules are
what the tool asserts about its own trustworthiness.

**Names live in one place.** `app/js/ui/labels.js` for properties and criteria,
`build/mappings/environment-topics.json` for environment categories. A second way to name something
does not look wrong where you write it; it looks wrong three screens away, to a reader who now
doubts the number beside it.
