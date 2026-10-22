# Transition: dt1-float-tie (DT-1)

> **In short.** The estimate stage now decides "is this held-out grade inside its range?" with the tolerance helper the rest of
> the stage uses, instead of a bare `<=`. It moves 12 audit numbers (`plausibleCoverage` of the grade calibration of density,
> elongationXY, tensileModulusXY and tensileStrengthXY) and nothing a visitor reads as an answer. Kind `determinism`.

**Ruling.** OQ-06 A: fix the float tie only if it moves nothing that matters. Applied by the owner's answer R1 A (pack 16,
2026-10-22) as its own registered change. The Codex review the ruling asked for is dropped (R2 B); the Opus session reviewed it.

**What changed.** Three comparisons against a z-scaled bound, the ones gap-1 named (defects.md WP21-D1):
- `packages/build/src/estimate/grades.ts` `within` (old `grades.js:51`): `!exceeds(|y - mu|, z * sd)`.
- `grades.ts` `inRange` (old `grades.js:157-173`): `!exceeds(lo, y) && !exceeds(y, hi)`.
- `packages/build/src/estimate/directions.ts` `held` (old `directions.js:47`): `!exceeds(|err|, z * sd)`.

`calibration.ts` already used the same form. `tests/remake/estimate-float-ties.test.mjs` bans a bare comparison against a
z-scaled bound anywhere in the estimate stage. The P-erase pairs for `grades` and `directions` are removed: they are no longer
label-only conversions.

**Measured** (milestone corpus, 5,306 cases; linux-x64, Node 26.12.0, the release host; 2026-10-22). Old build against the new
build with an empty transitions folder: 4,914 differences = the 4,902 of reprint-counts-once, all present and unchanged, plus
these 12, all under `meta.estimateModel.properties.<key>.gradeCalibration`:

| Headline | overall | amorphous matrix | one fold |
|---|---|---|---|
| density | 0.95 → 0.951 | 0.948 → 0.95 | fold 0: 0.903 → 0.907 |
| elongationXY | 0.95 → 0.953 | 0.946 → 0.95 | fold 0: 0.955 → 0.964 |
| tensileModulusXY | 0.947 → 0.95 | 0.945 → 0.95 | fold 3: 0.927 → 0.945 |
| tensileStrengthXY | 0.938 → 0.941 | 0.954 → 0.958 | fold 0: 0.933 → 0.943 |

No engine difference beyond reprint-counts-once: no verdict, group, Best, likely, listing order or estimate moves.

**Host note.** The M2 measurement on the owner's Mac saw 6 of these leaves (density and elongation). The 6 tensile leaves are the
ones gap-1 found differing between a Mac and CI: on linux-x64 a grade sits one unit in the last place beyond its range's end,
which the tolerance now counts as within. Releases build only on the CI host, where this list holds; a Mac run of P-build may
report the tensile 6 as "missing" (`npm run parity:host` shows the host gap).
