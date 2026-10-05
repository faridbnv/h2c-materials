# Documentation consistency check (gap round 2, phase 8)

You check the repository's documentation against what the data, the code and the generated outputs say now. Work in
/Users/farid/Documents/h2c-materials-branch. READ ONLY: change no file except `{OUT}` and scratch files under
`/private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/8ceac304-b627-4cec-9ff1-5537e29bbfb5/scratchpad/{ID}/`.
No git changes. You may run read-only commands: `npm run sql -- "<select …>"`, `npm run --silent trace -- <id>`, `grep`,
`git log`, `node docs/audits/2026-10-04-reader-round/targets.mjs --after --frozen docs/audits/2026-10-05-gap-round-2/TARGETS.csv --out <scratch dir>`.

The round that just ended is gap round 2 (2026-10-05): decisions D127, D128, D129; migrations m355 to m365; batches b43
and b44; packet `docs/audits/2026-10-05-gap-round-2/`. Ground truth, in this order: `data/tables/*.csv`, the code named,
`build/snapshot/` (counts.md, print.csv, templates.csv), `docs/audits/2026-10-05-gap-round-2/after/PROGRESS.md`,
`docs/audits/2026-09-30-coverage-expansion/STATUS.md`, `data/review/accepted-findings.csv`, `git log`.

Check, and list every place where a document disagrees with the ground truth or with another document:
1. `docs/GOALS.md`: the scorecard rows (C1–C13) and every dated "Decided on" section from 2026-10-04 on; counts and
   claims (products with no nozzle or bed, drying unknowns, blind-draw rates, decisions named).
2. `docs/DECISIONS.md` D125–D129: every count, file path, function name and migration number, against the code and data.
3. `docs/OPEN-PROBLEMS.md`: §6's accepted-findings table against `cut -d, -f1 data/review/accepted-findings.csv | sort |
   uniq -c` (counts and descriptions); §28, §29, §30, §31 and any item this round touched (§12 test-bar blocks, §13
   makers' know-how, §14 held sheets, §15–§17, §10, §11): an item that no longer occurs, a figure that moved, a command
   that no longer runs.
4. `AGENTS.md`, `docs/IMPORTING.md`, `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, `docs/HOW-IT-WORKS.md` (if present):
   statements about drying (need, open hours, guide drying), page statements (`Table`), the hardened-nozzle reading
   (`readAbrasion`), the guide's reach (a Variant reads no guide, D129), the import pause and its authorized batches
   (b43, b44 should be named the way earlier batches are), the CI context-audit skip.
5. `docs/audits/README.md`: an index row for the gap round packet (2026-10-05) like the reader round's; the packet's own
   `README.md` (if present) against its files.
6. Dead links (relative markdown links to files that do not exist) in the files above, and references to retired
   names, stale migration numbers or files that no longer exist.

Write `{OUT}` (CSV) with columns: file, line, kind (count | claim | stale | dead-link | missing | contradiction),
says (the document's words, short), truth (what the ground truth says, with the command or file that shows it),
fix (the smallest edit that makes it right). One row per finding; be specific and verify each before writing it. When
done, reply in at most 100 words: counts per file and kind, and the three most important findings.
