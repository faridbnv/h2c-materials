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
| [UX-AUDIT.md](UX-AUDIT.md) | Where does this fail a 3D printer owner who has never seen it? |
| [background/](background/) | What was this built from? |

## Working on it

**The build must stay deterministic and must keep failing loudly.** If a change makes a validation
error into a warning, the build will happily ship a database that has drifted.

**Comments explain why, not what.** The source is dense with explanations of failures that already
happened, because most of the traps here produce plausible-looking wrong answers rather than errors.
A comment saying a parser cannot accept a leading minus is worth more than the regex it sits above.

**A bug in a parser gets a test with the failure in the comment.** See `test/normalize.test.js`.
Those tests read oddly without the context, which is exactly why the context is in them.

**If you weaken a rule in the list in the README, say so in DECISIONS.md.** Those rules are what the
tool asserts about its own trustworthiness.
