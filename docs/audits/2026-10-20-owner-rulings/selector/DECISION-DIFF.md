# Decision diff: 7d8f8980c40d → 933a5e84cbde

> **Historical record** (2026-10-20): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

Across 138 cases: 0 material verdicts moved, 0 listings changed, 0 group changes, 0 rows now shown for another product, 0 product answers moved; the likely tag came or went 0 times (materials and products).

## Outdoor structural part / leave out

Before: pass 11, unknown 89 (hidden 0), fail 52. After: pass 11, unknown 89 (hidden 0), fail 49.

Nothing moved.

## Outdoor structural part / include

Before: pass 11, unknown 89 (hidden 7), fail 52. After: pass 11, unknown 89 (hidden 7), fail 49.

Nothing moved.

## Outdoor structural part / include + estimates

Before: pass 11, unknown 89 (hidden 7), fail 52. After: pass 11, unknown 89 (hidden 7), fail 49.

Nothing moved.

## Indoor prototype / leave out

Before: pass 98, unknown 30 (hidden 0), fail 24. After: pass 98, unknown 30 (hidden 0), fail 21.

Nothing moved.

## Indoor prototype / include

Before: pass 98, unknown 30 (hidden 0), fail 24. After: pass 98, unknown 30 (hidden 0), fail 21.

Nothing moved.

## Indoor prototype / include + estimates

Before: pass 98, unknown 30 (hidden 0), fail 24. After: pass 98, unknown 30 (hidden 0), fail 21.

Nothing moved.

## Lightweight structure / leave out

Before: pass 19, unknown 73 (hidden 0), fail 60. After: pass 19, unknown 73 (hidden 0), fail 57.

Nothing moved.

## Lightweight structure / include

Before: pass 19, unknown 73 (hidden 0), fail 60. After: pass 19, unknown 73 (hidden 0), fail 57.

Nothing moved.

## Lightweight structure / include + estimates

Before: pass 19, unknown 73 (hidden 0), fail 60. After: pass 19, unknown 73 (hidden 0), fail 57.

Nothing moved.

## Warm environment / leave out

Before: pass 43, unknown 83 (hidden 0), fail 26. After: pass 43, unknown 83 (hidden 0), fail 23.

Nothing moved.

## Warm environment / include

Before: pass 43, unknown 83 (hidden 16), fail 26. After: pass 43, unknown 83 (hidden 16), fail 23.

Nothing moved.

## Warm environment / include + estimates

Before: pass 43, unknown 83 (hidden 16), fail 26. After: pass 43, unknown 83 (hidden 16), fail 23.

Nothing moved.

## High-stiffness fixture / leave out

Before: pass 10, unknown 93 (hidden 0), fail 49. After: pass 10, unknown 93 (hidden 0), fail 46.

Nothing moved.

## High-stiffness fixture / include

Before: pass 10, unknown 93 (hidden 0), fail 49. After: pass 10, unknown 93 (hidden 0), fail 46.

Nothing moved.

## High-stiffness fixture / include + estimates

Before: pass 10, unknown 93 (hidden 1), fail 49. After: pass 10, unknown 93 (hidden 1), fail 46.

Nothing moved.

## Flexible component / leave out

Before: pass 5, unknown 104 (hidden 0), fail 43. After: pass 5, unknown 104 (hidden 0), fail 40.

Nothing moved.

## Flexible component / include

Before: pass 5, unknown 104 (hidden 0), fail 43. After: pass 5, unknown 104 (hidden 0), fail 40.

Nothing moved.

## Flexible component / include + estimates

Before: pass 5, unknown 104 (hidden 3), fail 43. After: pass 5, unknown 104 (hidden 3), fail 40.

Nothing moved.


## The three materials that left the dataset

The diff compares the materials both censuses hold, so it does not count the three that left (m468, D174): 316L
stainless steel (M171), silicon carbide (M172) and alumina (M173), the metal and ceramic sintering filaments. Every other
material is in both censuses with the same answers in all 138 cases. In the baseline the three were:

| Cases | Their answer | Gone with them |
|---|---|---|
| the 18 template cases (6 templates, 3 modes) | FAIL on "Within H2C capability", never listed | the 3 a template's FAIL count drops by, in every one |
| 24 of the 120 single-requirement sweeps (no scope gate in them) | PASS, listed: a sintering feedstock's 2,660 to 7,190 kg/m³ meets a density floor | 24 × 3 listed passes that described a green part, not a print |
| 72 sweeps | UNKNOWN, listed | 72 × 3 listed rows |
| 24 sweeps | UNKNOWN, hidden (a property that does not apply: HDT) | nothing on screen |

Counted on 2026-10-20 from `../baseline/census-before.json` and this track's census of release 933a5e84cbde, before the
other tracks merge (not kept: `node docs/audits/2026-10-18-screening-build/decision-census.mjs --root . --db dist/db.json
--out <file>` writes it again from a build of this branch).
