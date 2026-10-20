# What the owner's rulings track T1 moved

> **Generated** (2026-10-20) by `node docs/audits/2026-10-20-owner-rulings/evidence/summarise-diff.mjs <baseline> <t2-t5> <after>`: it describes the data as it was that day; run it again for the current state.

T1's own share: from release b574a5b47e55 (the round branch with tracks T2 to T5 merged) to 5a7ec4ca599d (the same with T1 merged on it), over the decision census's 138 cases. A material only one side has (a new material, or one that left the dataset) is not counted here. The round branch's review fixes for tracks T2 to T5 (m478, m479: PVC-P's enclosure and its own rubber limit) came after that census, so PVC-P's Indoor prototype move is theirs. Every case in full: [DECISION-DIFF-T1-on-merged.md](DECISION-DIFF-T1-on-merged.md).

## The six templates

| Case | PASS | UNKNOWN | FAIL | Material verdicts moved | Product answers moved |
|---|---:|---:|---:|---:|---:|
| Outdoor structural part / leave out | 11 → 10 | 89 → 92 | 52 → 50 | 3 | 81 |
| Outdoor structural part / include | 11 → 10 | 89 → 92 | 52 → 50 | 3 | 81 |
| Outdoor structural part / include + estimates | 11 → 10 | 89 → 92 | 52 → 50 | 3 | 100 |
| Indoor prototype / leave out | 99 → 98 | 32 → 33 | 21 → 21 | 1 | 1 |
| Indoor prototype / include | 99 → 98 | 32 → 33 | 21 → 21 | 1 | 1 |
| Indoor prototype / include + estimates | 99 → 98 | 32 → 33 | 21 → 21 | 1 | 1 |
| Lightweight structure / leave out | 19 → 19 | 73 → 72 | 60 → 61 | 1 | 14 |
| Lightweight structure / include | 19 → 19 | 73 → 72 | 60 → 61 | 1 | 14 |
| Lightweight structure / include + estimates | 19 → 19 | 73 → 72 | 60 → 61 | 1 | 26 |
| Warm environment / leave out | 43 → 31 | 86 → 98 | 23 → 23 | 12 | 175 |
| Warm environment / include | 43 → 31 | 86 → 98 | 23 → 23 | 12 | 175 |
| Warm environment / include + estimates | 43 → 31 | 86 → 98 | 23 → 23 | 12 | 179 |
| High-stiffness fixture / leave out | 10 → 10 | 95 → 95 | 47 → 47 | 0 | 34 |
| High-stiffness fixture / include | 10 → 10 | 95 → 95 | 47 → 47 | 0 | 34 |
| High-stiffness fixture / include + estimates | 10 → 10 | 95 → 95 | 47 → 47 | 0 | 45 |
| Flexible component / leave out | 5 → 5 | 106 → 106 | 41 → 41 | 0 | 52 |
| Flexible component / include | 5 → 5 | 106 → 106 | 41 → 41 | 0 | 52 |
| Flexible component / include + estimates | 5 → 5 | 106 → 106 | 41 → 41 | 0 | 54 |

## The single-requirement sweeps (120 cases)

| Property | Cases | Material verdicts moved | to PASS | to FAIL | to UNKNOWN | Product answers moved |
|---|---:|---:|---:|---:|---:|---:|
| density (audit lens admitting set-apart values) | 12 | 0 | 0 | 0 | 0 | 12 |
| density | 12 | 0 | 0 | 0 | 0 | 12 |
| elongationXY (audit lens admitting set-apart values) | 12 | 0 | 0 | 0 | 0 | 52 |
| elongationXY | 12 | 28 | 28 | 0 | 0 | 365 |
| hdt045 (audit lens admitting set-apart values) | 12 | 32 | 2 | 0 | 30 | 221 |
| hdt045 | 12 | 104 | 8 | 0 | 96 | 1137 |
| tensileModulusXY (audit lens admitting set-apart values) | 12 | 0 | 0 | 0 | 0 | 65 |
| tensileModulusXY | 12 | 6 | 6 | 0 | 0 | 245 |
| tensileStrengthXY (audit lens admitting set-apart values) | 12 | 0 | 0 | 0 | 0 | 42 |
| tensileStrengthXY | 12 | 32 | 30 | 2 | 0 | 816 |

## Every material verdict that moved in a template case

- **Outdoor structural part / leave out**: PPS-GF PASS → UNKNOWN; ABS-AF FAIL → UNKNOWN; PCTG-GF FAIL → UNKNOWN
- **Outdoor structural part / include**: PPS-GF PASS → UNKNOWN; ABS-AF FAIL → UNKNOWN; PCTG-GF FAIL → UNKNOWN
- **Outdoor structural part / include + estimates**: PPS-GF PASS → UNKNOWN; ABS-AF FAIL → UNKNOWN; PCTG-GF FAIL → UNKNOWN
- **Indoor prototype / leave out**: PVC-P PASS → UNKNOWN
- **Indoor prototype / include**: PVC-P PASS → UNKNOWN
- **Indoor prototype / include + estimates**: PVC-P PASS → UNKNOWN
- **Lightweight structure / leave out**: TPU-EC UNKNOWN → FAIL
- **Lightweight structure / include**: TPU-EC UNKNOWN → FAIL
- **Lightweight structure / include + estimates**: TPU-EC UNKNOWN → FAIL
- **Warm environment / leave out**: PETG PASS → UNKNOWN; ASA Aero PASS → UNKNOWN; PA6 PASS → UNKNOWN; PA12-GF PASS → UNKNOWN; PPA PASS → UNKNOWN; PPS-GF PASS → UNKNOWN; PP PASS → UNKNOWN; CPE PASS → UNKNOWN; PA6-CE PASS → UNKNOWN; ABS-AF PASS → UNKNOWN; COC PASS → UNKNOWN; PE-GF PASS → UNKNOWN
- **Warm environment / include**: PETG PASS → UNKNOWN; ASA Aero PASS → UNKNOWN; PA6 PASS → UNKNOWN; PA12-GF PASS → UNKNOWN; PPA PASS → UNKNOWN; PPS-GF PASS → UNKNOWN; PP PASS → UNKNOWN; CPE PASS → UNKNOWN; PA6-CE PASS → UNKNOWN; ABS-AF PASS → UNKNOWN; COC PASS → UNKNOWN; PE-GF PASS → UNKNOWN
- **Warm environment / include + estimates**: PETG PASS → UNKNOWN; ASA Aero PASS → UNKNOWN; PA6 PASS → UNKNOWN; PA12-GF PASS → UNKNOWN; PPA PASS → UNKNOWN; PPS-GF PASS → UNKNOWN; PP PASS → UNKNOWN; CPE PASS → UNKNOWN; PA6-CE PASS → UNKNOWN; ABS-AF PASS → UNKNOWN; COC PASS → UNKNOWN; PE-GF PASS → UNKNOWN

## The whole round so far, against its baseline

From release 7d8f8980c40d (the round's baseline) to 5a7ec4ca599d: every track merged. The full list is [DECISION-DIFF.md](DECISION-DIFF.md); T2 to T5's own is [their diff](../after/DECISION-DIFF-t2-t5.md).

| Case | PASS | UNKNOWN | FAIL | Material verdicts moved | Product answers moved |
|---|---:|---:|---:|---:|---:|
| Outdoor structural part / leave out | 11 → 10 | 89 → 92 | 52 → 50 | 3 | 79 |
| Outdoor structural part / include | 11 → 10 | 89 → 92 | 52 → 50 | 3 | 79 |
| Outdoor structural part / include + estimates | 11 → 10 | 89 → 92 | 52 → 50 | 3 | 105 |
| Indoor prototype / leave out | 98 → 98 | 30 → 33 | 24 → 21 | 0 | 4 |
| Indoor prototype / include | 98 → 98 | 30 → 33 | 24 → 21 | 0 | 4 |
| Indoor prototype / include + estimates | 98 → 98 | 30 → 33 | 24 → 21 | 0 | 4 |
| Lightweight structure / leave out | 19 → 19 | 73 → 72 | 60 → 61 | 2 | 13 |
| Lightweight structure / include | 19 → 19 | 73 → 72 | 60 → 61 | 2 | 13 |
| Lightweight structure / include + estimates | 19 → 19 | 73 → 72 | 60 → 61 | 2 | 24 |
| Warm environment / leave out | 43 → 31 | 83 → 98 | 26 → 23 | 12 | 175 |
| Warm environment / include | 43 → 31 | 83 → 98 | 26 → 23 | 12 | 175 |
| Warm environment / include + estimates | 43 → 31 | 83 → 98 | 26 → 23 | 12 | 180 |
| High-stiffness fixture / leave out | 10 → 10 | 93 → 95 | 49 → 47 | 0 | 33 |
| High-stiffness fixture / include | 10 → 10 | 93 → 95 | 49 → 47 | 0 | 33 |
| High-stiffness fixture / include + estimates | 10 → 10 | 93 → 95 | 49 → 47 | 0 | 45 |
| Flexible component / leave out | 5 → 5 | 104 → 106 | 43 → 41 | 0 | 51 |
| Flexible component / include | 5 → 5 | 104 → 106 | 43 → 41 | 0 | 51 |
| Flexible component / include + estimates | 5 → 5 | 104 → 106 | 43 → 41 | 0 | 55 |
