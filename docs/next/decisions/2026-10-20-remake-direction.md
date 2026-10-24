# 2026-10-20 — Remake direction: Pages-only hosting, SQLite working database, TypeScript and Vue

**Status.** Accepted by the owner on 2026-10-20 (OQ-01, OQ-04, OQ-20, OQ-21, Q2-06, Q2-09; quoted in [GOALS-NEXT](../GOALS-NEXT.md)). This is the first decision record named by date and topic (OQ-18 A). It follows D178. Only `remake/v3` holds it; `main`'s `docs/DECISIONS.md` is frozen.

## Context

Filament Atlas ships as one self-contained HTML page. It embeds the gzipped database, Plotly and its fonts, so it opens from disk with no network (D16; `docs/background/architecture-brief.md` guardrail 10). The page is 8.99 MB raw and 4.59 MB gzipped. Plotly is 47.7% of it and the embedded data 43.9% (measured 2026-10-20 on a throwaway clone at 5eabafad). The material pages are already separate static files. The owner has retired the offline requirement. The public site must still run on GitHub Pages.

## Decision

1. **Hosting.** GitHub Pages is the only fixed hosting constraint. This decision supersedes, from cutover:
   - D16 (the database embedded in one page);
   - the offline clauses of D96 (release pages downloaded and opened from disk), D113 ("no live call, the page is offline"), D142 (data-URI fonts, classic scripts, the materials zip) and D145 (the `?from=` handoff between separate documents);
   - guardrail 10 of the architecture brief.

   It keeps D113's frozen exchange-rate and price rules unchanged. Until cutover the live tool keeps all of these on `main`.
2. **Data.** SQLite is the working database. It holds STRICT tables, foreign keys, transactions, drafts, views, an audit log and one write service. Committed CSV snapshots stay in Git as the reviewable record that a clean rebuild starts from. A release reconstructs SQLite fresh from committed inputs, so there is never a second master.
3. **Code.** The new code is TypeScript (TypeScript 6 checker; erasable syntax run by Node 26). The public site and the local editor use Vue 3 with Vite. The owner chose Vue without a trial (Q2-06 C). The engine is ported behind old-versus-new parity. Science and decision behaviour do not change.
4. **Process.** The remake is built on `remake/v3`. A separate public repository, `faridbnv/h2c-material-temp-page`, receives built preview files only. `main` is frozen until the owner approves a cutover candidate.

## Consequences

- During the remake, the old paths (`data/`, `schema/`, `app/`, `build/`, `scripts/`, `test/`, `archive/`) are the frozen comparison baseline. They are not edited on this branch.
- Every structural step proves parity. Ruling OQ-09 (d), counting a reprint once, lands after parity as its own transition (Q2-11 A).
- Old releases stay as GitHub Releases. After cutover, each release keeps a whole-site zip instead of a single HTML file (OQ-04 A).

## Revisit

If GitHub Pages stops being the host, or if a concrete offline use case is raised.
