# What the owner's rulings track T1 moved

> **Generated** (2026-10-20) by `node docs/audits/2026-10-20-owner-rulings/evidence/summarise-diff.mjs <baseline> <t2-t5> <after>`: it describes the data as it was that day; run it again for the current state.

T1's own share: from release b574a5b47e55 (the round branch with tracks T2 to T5 merged) to 8d4eca5403c9 (the same with T1 merged on it), over the decision census's 138 cases. A material only one side has (a new material, or one that left the dataset) is not counted here. Every case in full: [DECISION-DIFF-T1-on-merged.md](DECISION-DIFF-T1-on-merged.md).

## The six templates

| Case | PASS | UNKNOWN | FAIL | Material verdicts moved | Product answers moved |
|---|---:|---:|---:|---:|---:|
| Outdoor structural part / leave out | 11 → 10 | 89 → 92 | 52 → 50 | 3 | 88 |
| Outdoor structural part / include | 11 → 10 | 89 → 92 | 52 → 50 | 3 | 88 |
| Outdoor structural part / include + estimates | 11 → 10 | 89 → 92 | 52 → 50 | 3 | 107 |
| Indoor prototype / leave out | 99 → 99 | 32 → 32 | 21 → 21 | 0 | 0 |
| Indoor prototype / include | 99 → 99 | 32 → 32 | 21 → 21 | 0 | 0 |
| Indoor prototype / include + estimates | 99 → 99 | 32 → 32 | 21 → 21 | 0 | 0 |
| Lightweight structure / leave out | 19 → 19 | 73 → 73 | 60 → 60 | 0 | 9 |
| Lightweight structure / include | 19 → 19 | 73 → 73 | 60 → 60 | 0 | 9 |
| Lightweight structure / include + estimates | 19 → 19 | 73 → 73 | 60 → 60 | 0 | 20 |
| Warm environment / leave out | 43 → 30 | 86 → 99 | 23 → 23 | 13 | 188 |
| Warm environment / include | 43 → 30 | 86 → 99 | 23 → 23 | 13 | 188 |
| Warm environment / include + estimates | 43 → 30 | 86 → 99 | 23 → 23 | 13 | 192 |
| High-stiffness fixture / leave out | 10 → 11 | 95 → 94 | 47 → 47 | 1 | 17 |
| High-stiffness fixture / include | 10 → 11 | 95 → 94 | 47 → 47 | 1 | 17 |
| High-stiffness fixture / include + estimates | 10 → 11 | 95 → 94 | 47 → 47 | 1 | 27 |
| Flexible component / leave out | 5 → 5 | 106 → 106 | 41 → 41 | 0 | 33 |
| Flexible component / include | 5 → 5 | 106 → 106 | 41 → 41 | 0 | 33 |
| Flexible component / include + estimates | 5 → 5 | 106 → 106 | 41 → 41 | 0 | 35 |

## The single-requirement sweeps (120 cases)

| Property | Cases | Material verdicts moved | to PASS | to FAIL | to UNKNOWN | Product answers moved |
|---|---:|---:|---:|---:|---:|---:|
| density (audit lens admitting set-apart values) | 12 | 0 | 0 | 0 | 0 | 12 |
| density | 12 | 0 | 0 | 0 | 0 | 12 |
| elongationXY (audit lens admitting set-apart values) | 12 | 0 | 0 | 0 | 0 | 52 |
| elongationXY | 12 | 18 | 18 | 0 | 0 | 271 |
| hdt045 (audit lens admitting set-apart values) | 12 | 30 | 0 | 0 | 30 | 213 |
| hdt045 | 12 | 104 | 0 | 0 | 104 | 1216 |
| tensileModulusXY (audit lens admitting set-apart values) | 12 | 0 | 0 | 0 | 0 | 55 |
| tensileModulusXY | 12 | 8 | 8 | 0 | 0 | 164 |
| tensileStrengthXY (audit lens admitting set-apart values) | 12 | 0 | 0 | 0 | 0 | 42 |
| tensileStrengthXY | 12 | 6 | 6 | 0 | 0 | 235 |

## Every material verdict that moved in a template case

- **Outdoor structural part / leave out**: PPS-GF PASS → UNKNOWN; ABS-AF FAIL → UNKNOWN; PCTG-GF FAIL → UNKNOWN
- **Outdoor structural part / include**: PPS-GF PASS → UNKNOWN; ABS-AF FAIL → UNKNOWN; PCTG-GF FAIL → UNKNOWN
- **Outdoor structural part / include + estimates**: PPS-GF PASS → UNKNOWN; ABS-AF FAIL → UNKNOWN; PCTG-GF FAIL → UNKNOWN
- **Warm environment / leave out**: PETG PASS → UNKNOWN; ASA Aero PASS → UNKNOWN; PA6 PASS → UNKNOWN; PA12-GF PASS → UNKNOWN; PPA PASS → UNKNOWN; PPS-GF PASS → UNKNOWN; PP PASS → UNKNOWN; CPE PASS → UNKNOWN; PA6-CE PASS → UNKNOWN; ABS-AF PASS → UNKNOWN; COC PASS → UNKNOWN; PE-GF PASS → UNKNOWN; PLA-PHB PASS → UNKNOWN
- **Warm environment / include**: PETG PASS → UNKNOWN; ASA Aero PASS → UNKNOWN; PA6 PASS → UNKNOWN; PA12-GF PASS → UNKNOWN; PPA PASS → UNKNOWN; PPS-GF PASS → UNKNOWN; PP PASS → UNKNOWN; CPE PASS → UNKNOWN; PA6-CE PASS → UNKNOWN; ABS-AF PASS → UNKNOWN; COC PASS → UNKNOWN; PE-GF PASS → UNKNOWN; PLA-PHB PASS → UNKNOWN
- **Warm environment / include + estimates**: PETG PASS → UNKNOWN; ASA Aero PASS → UNKNOWN; PA6 PASS → UNKNOWN; PA12-GF PASS → UNKNOWN; PPA PASS → UNKNOWN; PPS-GF PASS → UNKNOWN; PP PASS → UNKNOWN; CPE PASS → UNKNOWN; PA6-CE PASS → UNKNOWN; ABS-AF PASS → UNKNOWN; COC PASS → UNKNOWN; PE-GF PASS → UNKNOWN; PLA-PHB PASS → UNKNOWN
- **High-stiffness fixture / leave out**: PLA-CF UNKNOWN → PASS
- **High-stiffness fixture / include**: PLA-CF UNKNOWN → PASS
- **High-stiffness fixture / include + estimates**: PLA-CF UNKNOWN → PASS

## The whole round so far, against its baseline

From release 7d8f8980c40d (the round's baseline) to 8d4eca5403c9: every track merged. The full list is [DECISION-DIFF.md](DECISION-DIFF.md); T2 to T5's own is [their diff](../after/DECISION-DIFF-t2-t5.md).

| Case | PASS | UNKNOWN | FAIL | Material verdicts moved | Product answers moved |
|---|---:|---:|---:|---:|---:|
| Outdoor structural part / leave out | 11 → 10 | 89 → 92 | 52 → 50 | 3 | 86 |
| Outdoor structural part / include | 11 → 10 | 89 → 92 | 52 → 50 | 3 | 86 |
| Outdoor structural part / include + estimates | 11 → 10 | 89 → 92 | 52 → 50 | 3 | 112 |
| Indoor prototype / leave out | 98 → 99 | 30 → 32 | 24 → 21 | 0 | 4 |
| Indoor prototype / include | 98 → 99 | 30 → 32 | 24 → 21 | 0 | 4 |
| Indoor prototype / include + estimates | 98 → 99 | 30 → 32 | 24 → 21 | 0 | 4 |
| Lightweight structure / leave out | 19 → 19 | 73 → 73 | 60 → 60 | 1 | 8 |
| Lightweight structure / include | 19 → 19 | 73 → 73 | 60 → 60 | 1 | 8 |
| Lightweight structure / include + estimates | 19 → 19 | 73 → 73 | 60 → 60 | 1 | 20 |
| Warm environment / leave out | 43 → 30 | 83 → 99 | 26 → 23 | 13 | 188 |
| Warm environment / include | 43 → 30 | 83 → 99 | 26 → 23 | 13 | 188 |
| Warm environment / include + estimates | 43 → 30 | 83 → 99 | 26 → 23 | 13 | 193 |
| High-stiffness fixture / leave out | 10 → 11 | 93 → 94 | 49 → 47 | 1 | 16 |
| High-stiffness fixture / include | 10 → 11 | 93 → 94 | 49 → 47 | 1 | 16 |
| High-stiffness fixture / include + estimates | 10 → 11 | 93 → 94 | 49 → 47 | 1 | 27 |
| Flexible component / leave out | 5 → 5 | 104 → 106 | 43 → 41 | 0 | 32 |
| Flexible component / include | 5 → 5 | 104 → 106 | 43 → 41 | 0 | 32 |
| Flexible component / include + estimates | 5 → 5 | 104 → 106 | 43 → 41 | 0 | 36 |
