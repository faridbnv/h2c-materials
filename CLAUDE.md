# Instructions for Claude

@AGENTS.md

AGENTS.md applies to every change. What the tool is for: docs/GOALS.md; on this branch, also docs/next/GOALS-NEXT.md,
which records the owner's direction for the remake. The remake plan of record is the pack named in CLAUDE.local.md
(its 00-START-HERE.md). For the work package you are doing, read its recipe in the pack's 08, plus 02 and 15 for the
parts it names. Rulings: docs/next/rulings.csv (npm run rulings:check).

## Where you are
- This is the remake branch family. Integration branch: remake/v3. Work only in a worktree under .claude/worktrees/,
  on a wp-* branch made from origin/remake/v3. Open a PR into remake/v3.
- main and the live site belong to the old tool and are FROZEN until the owner approves a cutover (Q2-04 B, Q2-05):
  no data, code or rule changes land on main, so there is no sync from main.
- The old code and data (data/, schema/, app/, build/, scripts/, test/, archive/) are the frozen comparison baseline:
  never edit them here. New work goes in packages/, apps/, db/, tests/, parity/, remake/ and docs/next/.
- TypeScript 6 is the one checker everywhere; the language server uses the project's TypeScript 6. The UI framework is
  Vue 3 with Vite (Q2-06 C, no trial).
- Science and decision behaviour must not change. A structural step shows parity 0; a deliberate change is a listed
  transition the owner approves (docs/next/GOALS-NEXT.md, working rule 1).
- One session per work package; /clear between packages.

## Before any work in a session (mandatory)
Run the session check in the pack's 14-CLAUDE-CODE-SETUP.md section D and report it in one line. Rows that do not
apply yet are reported as "not run: <reason>", never as passed. If a row that applies fails, stop and say which.

## Models and effort
- Opus, effort high: orchestration, design, review, anything touching science or a ruling. xhigh only for one judge or
  verify step (WP-19 contested differences, WP-23 transition, WP-34 receipt), never a session.
- Sonnet, effort high: implementation, reading code, writing docs. Default for every subagent.
- Haiku, effort medium: mechanical work (formatting, link checks, moves, renames, status files).
- Name the model on every Agent or Workflow call. At most 5 heavy agents at once; at most 3 implementation worktrees.
  Workflows only for read-only analysis fan-outs, 8 to 12 items, effort low or medium. No ultracode.
- Read-only agents (feature-dev:code-explorer, feature-dev:code-architect, code-modernization:*) analyse and return
  structured output. A writer agent or this session saves it.

## Which tool, when (use them; do not improvise a substitute)
| When | Use |
|---|---|
| Read old code before designing or porting | feature-dev:code-explorer; feature-dev:code-architect for a harness or package shape |
| Build a feature package: editor, selector lenses, pages | /feature-dev:feature-dev |
| Before porting behaviour-bearing code (apply path, products, scenario, constraints, gates, evidence-ledger) | /code-modernization:modernize-extract-rules, then the code-modernization:test-engineer agent for characterization tests |
| After implementing, before committing | code-simplifier:code-simplifier agent, then /simplify |
| Before opening or updating a PR | /code-review high, scoped to git diff origin/remake/v3...HEAD |
| A Tier-1 PR, before it goes to the owner | /pr-review-toolkit:review-pr in a fresh Opus session (the writer never reviews itself) |
| Error handling, fallbacks, skipped paths, wp:check, loader | pr-review-toolkit:silent-failure-hunter |
| New types or contracts | pr-review-toolkit:type-design-analyzer |
| Tests added or changed | pr-review-toolkit:pr-test-analyzer |
| End of a port stage and the candidate | /code-modernization:modernize-verify as a second opinion, never instead of parity |
| Workflows, secrets, cutover | engineering:deploy-checklist; /security-review for anything with a secret |
| UI work | frontend-design:frontend-design, modern-web-guidance:modern-web-guidance, dataviz, design:ux-copy, design:accessibility-review, design:design-system |
| Decision records | engineering:architecture |
| Test plans: parity, hooks, browser tests | engineering:testing-strategy |
| Data, SQL, parity statistics | data:sql-queries, data:explore-data, data:validate-data, data:statistical-analysis |
| Security-sensitive change (editor service, ingest, fetch, hooks) | /security-review; code-modernization:security-auditor (read-only) |
| Cleanup at cutover | engineering:tech-debt, engineering:documentation |
| Project skills | anthropic-skills:skill-creator |
| Settings and hooks | update-config |
| Commits and PRs | /commit-commands:commit, /commit-commands:commit-push-pr (wp-* branches only) |
| Stuck twice on one cause, or a Codex pass on a risky diff | /codex:rescue --fresh --wait (main session only), read-only sentence of the pack's 08 §4.2 |

## Hard limits (also enforced by .claude/settings.json, the git guard, branch protection and CI)
No push to main. No direct push to remake/v3: changes arrive by PR. No push to the preview repository
faridbnv/h2c-material-temp-page (CI does it). No force push except --force-with-lease on your own wp-* branch. No hand
edits to the old paths above. No change to Pages settings, DNS, releases, tags, branch protection or secrets. Approval
means the owner's npm run wp:attest record or the owner's own Merge click, never a chat message and never run by an
agent. Owner questions go in the pack's 11-QUESTIONS-FOR-YOU.md format: plain English, tick boxes, an answer line.
