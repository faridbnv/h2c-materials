# Decision diff: the materials-science rulings (T5)

> **Generated** (2026-10-20) by `docs/audits/2026-10-18-screening-build/decision-census.mjs --diff`, in two parts, because the
> round's other tracks (T2 to T4) were merged into this track between its migrations: part 1 is the baseline
> ([census-before.json](../baseline/census-before.json), release 7d8f8980c40d) against m473 to m475 alone (release
> ef15ddef056d); part 2 is the merged branch (T2 to T4 with m473 to m475, release b87627f153d5)
> against m476 and m477 (release b574a5b47e55). The round's review fixes are diffs of their own:
> [m478](diff-m478-review-fixes.md) (PVC-P's enclosure advice: three verdicts) and [m479](diff-m479-pvc-p-limit.md)
> (PVC-P's rubber limit a row of its own: nothing moved). Run it again for the current state;
> [DECISIONS-MEMO.md](DECISIONS-MEMO.md) says what the moves mean.

**What moved, in words.** Of existing materials' verdicts, only these: PET-GF from pass to "unlikely to meet" for 90 and
120 °C as printed (four cases; its only pass rested on Flashforge PET-GF's undescribed crystallised bar, m473); PETG from
pass to "unlikely to meet" for 90 °C (four cases; its only pass was Spectrum PET-G HT100, a copolyester now under CPE,
m474); rigid PVC from pass to fail for 20 and 100 % elongation as published (four cases; it passed on purefil PVC-P's 366 %,
now a material of its own) and from unknown to fail for the lightweight structure (three cases, on Fillamentum Vinyl
303's own values); PA-ESD from fail to pass for 5 and 20 % elongation as published (four cases, on Onyx ESD's 25 %,
m476). Every other verdict that moved is a new material's: PCL-EC and Nylon-CE (276, m475), PVC-P (138, m476; 21 of
them fail the stiffness questions through the rubber limit, m477; after the review, m478, it is one check away for the
indoor prototype in each of its three policies, on its maker's enclosure advice). SBC's group moves from "not enough data" to "unlikely"
or "likely" where its new estimate decides (m475). The other group, product and likely-tag moves are the estimate model
refitting its shared spreads after the data changed (a few products near a limit, as each round's refit moves them).

## Part 1: the baseline against m473 to m475

Across 138 cases: 284 material verdicts moved, 0 listings changed, 61 group changes, 74 rows now shown for another product, 211 product answers moved; the likely tag came or went 89 times (materials and products).

### Outdoor structural part / leave out

Before: pass 11, unknown 89 (hidden 0), fail 52. After: pass 11, unknown 89 (hidden 0), fail 54.

**Material verdicts (2).** PCL-EC: new material, FAIL; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

**Groups (1).** PET-GF: not-enough-data → unlikely-to-meet.

### Outdoor structural part / include

Before: pass 11, unknown 89 (hidden 7), fail 52. After: pass 11, unknown 89 (hidden 7), fail 54.

**Material verdicts (2).** PCL-EC: new material, FAIL; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

**Groups (1).** PET-GF: not-enough-data → unlikely-to-meet.

### Outdoor structural part / include + estimates

Before: pass 11, unknown 89 (hidden 7), fail 52. After: pass 11, unknown 89 (hidden 7), fail 54.

**Material verdicts (2).** PCL-EC: new material, FAIL; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

**Groups (2).** PET-GF: not-enough-data:likely → unlikely-to-meet; SBC: not-enough-data → unlikely-to-meet.

**Product the row shows (2).** PET-GF: G068-05 → G068-01; PC-ABS: G094-03 → G094-10.

**Product answers (9).** G027-05 (ABS): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G027-58 (ABS): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G067-01 (PET-CF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G068-01 (PET-GF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G068-04 (PET-GF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G068-05 (PET-GF): UNKNOWN:not-enough-data:likely → UNKNOWN:unlikely-to-meet; G094-10 (PC-ABS): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G094-13 (PC-ABS): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

**Likely tag (materials and products) (2).** PET-GF: no longer likely; G068-05 (PET-GF): no longer likely.

### Indoor prototype / leave out

Before: pass 98, unknown 30 (hidden 0), fail 24. After: pass 98, unknown 32 (hidden 0), fail 24.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### Indoor prototype / include

Before: pass 98, unknown 30 (hidden 0), fail 24. After: pass 98, unknown 32 (hidden 0), fail 24.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### Indoor prototype / include + estimates

Before: pass 98, unknown 30 (hidden 0), fail 24. After: pass 98, unknown 32 (hidden 0), fail 24.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### Lightweight structure / leave out

Before: pass 19, unknown 73 (hidden 0), fail 60. After: pass 19, unknown 74 (hidden 0), fail 61.

**Material verdicts (2).** PCL-EC: new material, FAIL; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### Lightweight structure / include

Before: pass 19, unknown 73 (hidden 0), fail 60. After: pass 19, unknown 74 (hidden 0), fail 61.

**Material verdicts (2).** PCL-EC: new material, FAIL; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### Lightweight structure / include + estimates

Before: pass 19, unknown 73 (hidden 0), fail 60. After: pass 19, unknown 74 (hidden 0), fail 61.

**Material verdicts (2).** PCL-EC: new material, FAIL; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Product answers (1).** G034-04 (ASA-GF): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data.

**Likely tag (materials and products) (1).** G034-04 (ASA-GF): no longer likely.

### Warm environment / leave out

Before: pass 43, unknown 83 (hidden 0), fail 26. After: pass 43, unknown 85 (hidden 0), fail 26.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Product the row shows (1).** PET-GF: G068-01 → G068-02.

**Product answers (1).** G068-01 (PET-GF): PASS:meets → UNKNOWN:not-enough-data.

### Warm environment / include

Before: pass 43, unknown 83 (hidden 16), fail 26. After: pass 43, unknown 85 (hidden 16), fail 26.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Product the row shows (1).** PET-GF: G068-01 → G068-02.

**Product answers (1).** G068-01 (PET-GF): PASS:meets → UNKNOWN:not-enough-data.

### Warm environment / include + estimates

Before: pass 43, unknown 83 (hidden 16), fail 26. After: pass 43, unknown 85 (hidden 16), fail 26.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Product the row shows (1).** PET-GF: G068-01 → G068-02.

**Product answers (4).** G020-27 (PETG): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G067-01 (PET-CF): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G068-01 (PET-GF): PASS:meets → UNKNOWN:not-enough-data; G068-05 (PET-GF): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data.

**Likely tag (materials and products) (2).** G067-01 (PET-CF): no longer likely; G068-05 (PET-GF): no longer likely.

### High-stiffness fixture / leave out

Before: pass 10, unknown 93 (hidden 0), fail 49. After: pass 10, unknown 95 (hidden 0), fail 49.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### High-stiffness fixture / include

Before: pass 10, unknown 93 (hidden 0), fail 49. After: pass 10, unknown 95 (hidden 0), fail 49.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### High-stiffness fixture / include + estimates

Before: pass 10, unknown 93 (hidden 1), fail 49. After: pass 10, unknown 95 (hidden 1), fail 49.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Groups (1).** SBC: not-enough-data → unlikely-to-meet.

**Product the row shows (1).** PLA Silk: G008-04 → G008-10.

**Product answers (6).** G001-119 (PLA): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G001-120 (PLA): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G001-125 (PLA): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G008-10 (PLA Silk): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G014-15 (PLA Wood): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### Flexible component / leave out

Before: pass 5, unknown 104 (hidden 0), fail 43. After: pass 5, unknown 105 (hidden 0), fail 44.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

### Flexible component / include

Before: pass 5, unknown 104 (hidden 0), fail 43. After: pass 5, unknown 105 (hidden 0), fail 44.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

### Flexible component / include + estimates

Before: pass 5, unknown 104 (hidden 3), fail 43. After: pass 5, unknown 105 (hidden 3), fail 44.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

**Groups (1).** SBC: not-enough-data → unlikely-to-meet.

**Product the row shows (1).** PA12-CF: G053-14 → G053-02.

**Product answers (2).** G053-14 (PA12-CF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### density >= 900 / comparable / dry / anneal not allowed

Before: pass 146, unknown 4 (hidden 0), fail 2. After: pass 148, unknown 4 (hidden 0), fail 2.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, PASS.

### density >= 900 / comparable / dry / anneal allowed

Before: pass 146, unknown 4 (hidden 0), fail 2. After: pass 148, unknown 4 (hidden 0), fail 2.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, PASS.

### density >= 900 / comparable / conditioned / anneal not allowed

Before: pass 146, unknown 4 (hidden 0), fail 2. After: pass 148, unknown 4 (hidden 0), fail 2.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, PASS.

### density >= 900 / comparable / conditioned / anneal allowed

Before: pass 146, unknown 4 (hidden 0), fail 2. After: pass 148, unknown 4 (hidden 0), fail 2.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, PASS.

### density >= 900 / as-published / dry / anneal not allowed

Before: pass 146, unknown 4 (hidden 0), fail 2. After: pass 148, unknown 4 (hidden 0), fail 2.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, PASS.

### density >= 900 / as-published / dry / anneal allowed

Before: pass 146, unknown 4 (hidden 0), fail 2. After: pass 148, unknown 4 (hidden 0), fail 2.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, PASS.

### density >= 900 / as-published / conditioned / anneal not allowed

Before: pass 146, unknown 4 (hidden 0), fail 2. After: pass 148, unknown 4 (hidden 0), fail 2.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, PASS.

### density >= 900 / as-published / conditioned / anneal allowed

Before: pass 146, unknown 4 (hidden 0), fail 2. After: pass 148, unknown 4 (hidden 0), fail 2.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, PASS.

### density >= 1250 / comparable / dry / anneal not allowed

Before: pass 82, unknown 26 (hidden 1), fail 44. After: pass 83, unknown 26 (hidden 1), fail 45.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

### density >= 1250 / comparable / dry / anneal allowed

Before: pass 82, unknown 26 (hidden 1), fail 44. After: pass 83, unknown 26 (hidden 1), fail 45.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

### density >= 1250 / comparable / conditioned / anneal not allowed

Before: pass 82, unknown 26 (hidden 1), fail 44. After: pass 83, unknown 26 (hidden 1), fail 45.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

### density >= 1250 / comparable / conditioned / anneal allowed

Before: pass 82, unknown 26 (hidden 1), fail 44. After: pass 83, unknown 26 (hidden 1), fail 45.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

### density >= 1250 / as-published / dry / anneal not allowed

Before: pass 82, unknown 26 (hidden 1), fail 44. After: pass 83, unknown 26 (hidden 1), fail 45.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

### density >= 1250 / as-published / dry / anneal allowed

Before: pass 82, unknown 26 (hidden 1), fail 44. After: pass 83, unknown 26 (hidden 1), fail 45.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

### density >= 1250 / as-published / conditioned / anneal not allowed

Before: pass 82, unknown 26 (hidden 1), fail 44. After: pass 83, unknown 26 (hidden 1), fail 45.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

### density >= 1250 / as-published / conditioned / anneal allowed

Before: pass 82, unknown 26 (hidden 1), fail 44. After: pass 83, unknown 26 (hidden 1), fail 45.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

### density >= 1500 / comparable / dry / anneal not allowed

Before: pass 13, unknown 30 (hidden 3), fail 109. After: pass 14, unknown 30 (hidden 3), fail 110.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

### density >= 1500 / comparable / dry / anneal allowed

Before: pass 13, unknown 30 (hidden 3), fail 109. After: pass 14, unknown 30 (hidden 3), fail 110.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

### density >= 1500 / comparable / conditioned / anneal not allowed

Before: pass 13, unknown 30 (hidden 3), fail 109. After: pass 14, unknown 30 (hidden 3), fail 110.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

### density >= 1500 / comparable / conditioned / anneal allowed

Before: pass 13, unknown 30 (hidden 3), fail 109. After: pass 14, unknown 30 (hidden 3), fail 110.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

### density >= 1500 / as-published / dry / anneal not allowed

Before: pass 13, unknown 30 (hidden 3), fail 109. After: pass 14, unknown 30 (hidden 3), fail 110.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

### density >= 1500 / as-published / dry / anneal allowed

Before: pass 13, unknown 30 (hidden 3), fail 109. After: pass 14, unknown 30 (hidden 3), fail 110.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

### density >= 1500 / as-published / conditioned / anneal not allowed

Before: pass 13, unknown 30 (hidden 3), fail 109. After: pass 14, unknown 30 (hidden 3), fail 110.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

### density >= 1500 / as-published / conditioned / anneal allowed

Before: pass 13, unknown 30 (hidden 3), fail 109. After: pass 14, unknown 30 (hidden 3), fail 110.

**Material verdicts (2).** PCL-EC: new material, PASS; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

### tensileModulusXY >= 2 / comparable / dry / anneal not allowed

Before: pass 80, unknown 58 (hidden 4), fail 14. After: pass 80, unknown 60 (hidden 4), fail 14.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Product answers (2).** G020-17 (PETG): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G153-01 (PETG-GR): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data.

**Likely tag (materials and products) (1).** G020-17 (PETG): no longer likely.

### tensileModulusXY >= 2 / comparable / dry / anneal allowed

Before: pass 81, unknown 57 (hidden 4), fail 14. After: pass 81, unknown 59 (hidden 4), fail 14.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Product answers (2).** G020-17 (PETG): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G153-01 (PETG-GR): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data.

**Likely tag (materials and products) (1).** G020-17 (PETG): no longer likely.

### tensileModulusXY >= 2 / comparable / conditioned / anneal not allowed

Before: pass 11, unknown 141 (hidden 4), fail 0. After: pass 11, unknown 143 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileModulusXY >= 2 / comparable / conditioned / anneal allowed

Before: pass 13, unknown 139 (hidden 4), fail 0. After: pass 13, unknown 141 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileModulusXY >= 2 / as-published / dry / anneal not allowed

Before: pass 101, unknown 35 (hidden 4), fail 16. After: pass 101, unknown 37 (hidden 4), fail 16.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileModulusXY >= 2 / as-published / dry / anneal allowed

Before: pass 102, unknown 34 (hidden 4), fail 16. After: pass 102, unknown 36 (hidden 4), fail 16.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileModulusXY >= 2 / as-published / conditioned / anneal not allowed

Before: pass 11, unknown 141 (hidden 4), fail 0. After: pass 11, unknown 143 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileModulusXY >= 2 / as-published / conditioned / anneal allowed

Before: pass 13, unknown 139 (hidden 4), fail 0. After: pass 13, unknown 141 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileModulusXY >= 3 / comparable / dry / anneal not allowed

Before: pass 40, unknown 90 (hidden 4), fail 22. After: pass 40, unknown 92 (hidden 4), fail 22.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Product the row shows (1).** CPE: G089-02 → G020-08.

**Product answers (3).** G001-74 (PLA): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G094-10 (PC-ABS): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G094-13 (PC-ABS): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data.

### tensileModulusXY >= 3 / comparable / dry / anneal allowed

Before: pass 42, unknown 88 (hidden 4), fail 22. After: pass 42, unknown 90 (hidden 4), fail 22.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Product the row shows (1).** CPE: G089-02 → G020-08.

**Product answers (3).** G001-74 (PLA): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G094-10 (PC-ABS): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G094-13 (PC-ABS): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data.

### tensileModulusXY >= 3 / comparable / conditioned / anneal not allowed

Before: pass 8, unknown 144 (hidden 4), fail 0. After: pass 8, unknown 146 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileModulusXY >= 3 / comparable / conditioned / anneal allowed

Before: pass 10, unknown 142 (hidden 4), fail 0. After: pass 10, unknown 144 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileModulusXY >= 3 / as-published / dry / anneal not allowed

Before: pass 67, unknown 54 (hidden 4), fail 31. After: pass 67, unknown 56 (hidden 4), fail 31.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Product the row shows (1).** CPE: G089-01 → G020-08.

**Product answers (2).** G001-74 (PLA): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G094-13 (PC-ABS): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data.

### tensileModulusXY >= 3 / as-published / dry / anneal allowed

Before: pass 69, unknown 53 (hidden 4), fail 30. After: pass 69, unknown 55 (hidden 4), fail 30.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Product the row shows (1).** CPE: G089-01 → G020-08.

**Product answers (2).** G001-74 (PLA): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G094-13 (PC-ABS): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data.

### tensileModulusXY >= 3 / as-published / conditioned / anneal not allowed

Before: pass 8, unknown 144 (hidden 4), fail 0. After: pass 8, unknown 146 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileModulusXY >= 3 / as-published / conditioned / anneal allowed

Before: pass 10, unknown 142 (hidden 4), fail 0. After: pass 10, unknown 144 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileModulusXY >= 5 / comparable / dry / anneal not allowed

Before: pass 22, unknown 102 (hidden 5), fail 28. After: pass 22, unknown 104 (hidden 5), fail 28.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Groups (1).** SBC: not-enough-data → unlikely-to-meet.

**Product the row shows (2).** PLA Silk: G008-04 → G008-10; CPE: G089-02 → G020-08.

**Product answers (6).** G001-119 (PLA): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G001-120 (PLA): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G001-125 (PLA): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G008-10 (PLA Silk): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G014-15 (PLA Wood): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileModulusXY >= 5 / comparable / dry / anneal allowed

Before: pass 24, unknown 100 (hidden 5), fail 28. After: pass 24, unknown 102 (hidden 5), fail 28.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Groups (1).** SBC: not-enough-data → unlikely-to-meet.

**Product the row shows (2).** PLA Silk: G008-04 → G008-10; CPE: G089-02 → G020-08.

**Product answers (6).** G001-119 (PLA): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G001-120 (PLA): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G001-125 (PLA): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G008-10 (PLA Silk): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G014-15 (PLA Wood): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileModulusXY >= 5 / comparable / conditioned / anneal not allowed

Before: pass 4, unknown 148 (hidden 5), fail 0. After: pass 4, unknown 150 (hidden 5), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileModulusXY >= 5 / comparable / conditioned / anneal allowed

Before: pass 5, unknown 147 (hidden 5), fail 0. After: pass 5, unknown 149 (hidden 5), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileModulusXY >= 5 / as-published / dry / anneal not allowed

Before: pass 31, unknown 68 (hidden 5), fail 53. After: pass 31, unknown 70 (hidden 5), fail 53.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Product the row shows (2).** PLA Silk: G008-04 → G008-10; PLA Aero: G017-14 → G017-07.

**Product answers (5).** G001-119 (PLA): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G001-120 (PLA): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G001-125 (PLA): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G008-10 (PLA Silk): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G014-15 (PLA Wood): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data.

### tensileModulusXY >= 5 / as-published / dry / anneal allowed

Before: pass 32, unknown 69 (hidden 5), fail 51. After: pass 32, unknown 71 (hidden 5), fail 51.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Product the row shows (2).** PLA Silk: G008-04 → G008-10; PLA Aero: G017-14 → G017-07.

**Product answers (5).** G001-119 (PLA): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G001-120 (PLA): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G001-125 (PLA): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G008-10 (PLA Silk): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G014-15 (PLA Wood): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data.

### tensileModulusXY >= 5 / as-published / conditioned / anneal not allowed

Before: pass 4, unknown 148 (hidden 5), fail 0. After: pass 4, unknown 150 (hidden 5), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileModulusXY >= 5 / as-published / conditioned / anneal allowed

Before: pass 5, unknown 147 (hidden 5), fail 0. After: pass 5, unknown 149 (hidden 5), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileStrengthXY >= 20 / comparable / dry / anneal not allowed

Before: pass 97, unknown 54 (hidden 4), fail 1. After: pass 98, unknown 55 (hidden 4), fail 1.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, PASS.

**Groups (1).** SBC: not-enough-data → not-enough-data:likely.

**Product answers (1).** G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely.

**Likely tag (materials and products) (2).** SBC: tagged likely; G174-01 (SBC): tagged likely.

### tensileStrengthXY >= 20 / comparable / dry / anneal allowed

Before: pass 98, unknown 53 (hidden 4), fail 1. After: pass 99, unknown 54 (hidden 4), fail 1.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, PASS.

**Groups (1).** SBC: not-enough-data → not-enough-data:likely.

**Product answers (1).** G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely.

**Likely tag (materials and products) (2).** SBC: tagged likely; G174-01 (SBC): tagged likely.

### tensileStrengthXY >= 20 / comparable / conditioned / anneal not allowed

Before: pass 12, unknown 140 (hidden 4), fail 0. After: pass 12, unknown 142 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileStrengthXY >= 20 / comparable / conditioned / anneal allowed

Before: pass 14, unknown 138 (hidden 4), fail 0. After: pass 14, unknown 140 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileStrengthXY >= 20 / as-published / dry / anneal not allowed

Before: pass 130, unknown 19 (hidden 4), fail 3. After: pass 131, unknown 20 (hidden 4), fail 3.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, PASS.

### tensileStrengthXY >= 20 / as-published / dry / anneal allowed

Before: pass 131, unknown 18 (hidden 4), fail 3. After: pass 132, unknown 19 (hidden 4), fail 3.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, PASS.

### tensileStrengthXY >= 20 / as-published / conditioned / anneal not allowed

Before: pass 13, unknown 139 (hidden 4), fail 0. After: pass 13, unknown 141 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileStrengthXY >= 20 / as-published / conditioned / anneal allowed

Before: pass 15, unknown 137 (hidden 4), fail 0. After: pass 15, unknown 139 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileStrengthXY >= 50 / comparable / dry / anneal not allowed

Before: pass 72, unknown 74 (hidden 4), fail 6. After: pass 72, unknown 76 (hidden 4), fail 6.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Groups (1).** SBC: not-enough-data → unlikely-to-meet.

**Product answers (2).** G023-01 (PETG): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileStrengthXY >= 50 / comparable / dry / anneal allowed

Before: pass 73, unknown 73 (hidden 4), fail 6. After: pass 73, unknown 75 (hidden 4), fail 6.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Groups (1).** SBC: not-enough-data → unlikely-to-meet.

**Product answers (2).** G023-01 (PETG): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileStrengthXY >= 50 / comparable / conditioned / anneal not allowed

Before: pass 7, unknown 145 (hidden 4), fail 0. After: pass 7, unknown 147 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileStrengthXY >= 50 / comparable / conditioned / anneal allowed

Before: pass 10, unknown 142 (hidden 4), fail 0. After: pass 10, unknown 144 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileStrengthXY >= 50 / as-published / dry / anneal not allowed

Before: pass 103, unknown 32 (hidden 4), fail 17. After: pass 103, unknown 34 (hidden 4), fail 17.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Product the row shows (1).** CPE: G089-02 → G020-08.

**Product answers (1).** G023-01 (PETG): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data.

### tensileStrengthXY >= 50 / as-published / dry / anneal allowed

Before: pass 104, unknown 32 (hidden 4), fail 16. After: pass 104, unknown 34 (hidden 4), fail 16.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Product the row shows (1).** CPE: G089-02 → G020-08.

**Product answers (1).** G023-01 (PETG): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data.

### tensileStrengthXY >= 50 / as-published / conditioned / anneal not allowed

Before: pass 7, unknown 145 (hidden 4), fail 0. After: pass 7, unknown 147 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileStrengthXY >= 50 / as-published / conditioned / anneal allowed

Before: pass 10, unknown 142 (hidden 4), fail 0. After: pass 10, unknown 144 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileStrengthXY >= 100 / comparable / dry / anneal not allowed

Before: pass 12, unknown 118 (hidden 4), fail 22. After: pass 12, unknown 120 (hidden 4), fail 22.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Groups (2).** TPU-EC: unlikely-to-meet → not-enough-data; SBC: not-enough-data → unlikely-to-meet.

**Product the row shows (4).** PA12: G052-05 → G052-03; CPE: G089-02 → G089-05; TPU-EC: G157-02 → G157-01; TPU harder than 95A: G039-47 → G162-01.

**Product answers (4).** G066-07 (PET): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G157-01 (TPU-EC): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G039-30 (TPU 90A class): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileStrengthXY >= 100 / comparable / dry / anneal allowed

Before: pass 12, unknown 118 (hidden 4), fail 22. After: pass 12, unknown 120 (hidden 4), fail 22.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Groups (2).** TPU-EC: unlikely-to-meet → not-enough-data; SBC: not-enough-data → unlikely-to-meet.

**Product the row shows (4).** PA12: G052-05 → G052-03; CPE: G089-02 → G089-05; TPU-EC: G157-02 → G157-01; TPU harder than 95A: G039-47 → G162-01.

**Product answers (4).** G066-07 (PET): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G157-01 (TPU-EC): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G039-30 (TPU 90A class): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileStrengthXY >= 100 / comparable / conditioned / anneal not allowed

Before: pass 1, unknown 151 (hidden 4), fail 0. After: pass 1, unknown 153 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileStrengthXY >= 100 / comparable / conditioned / anneal allowed

Before: pass 2, unknown 150 (hidden 4), fail 0. After: pass 2, unknown 152 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileStrengthXY >= 100 / as-published / dry / anneal not allowed

Before: pass 17, unknown 71 (hidden 4), fail 64. After: pass 17, unknown 73 (hidden 4), fail 64.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Product answers (1).** G157-01 (TPU-EC): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data.

### tensileStrengthXY >= 100 / as-published / dry / anneal allowed

Before: pass 17, unknown 73 (hidden 4), fail 62. After: pass 17, unknown 75 (hidden 4), fail 62.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Product answers (1).** G157-01 (TPU-EC): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data.

### tensileStrengthXY >= 100 / as-published / conditioned / anneal not allowed

Before: pass 1, unknown 151 (hidden 4), fail 0. After: pass 1, unknown 153 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### tensileStrengthXY >= 100 / as-published / conditioned / anneal allowed

Before: pass 2, unknown 150 (hidden 4), fail 0. After: pass 2, unknown 152 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### elongationXY >= 5 / comparable / dry / anneal not allowed

Before: pass 76, unknown 71 (hidden 4), fail 5. After: pass 76, unknown 73 (hidden 4), fail 5.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Groups (2).** PA66: not-enough-data → not-enough-data:likely; SBC: not-enough-data → not-enough-data:likely.

**Product answers (5).** G033-03 (ASA-CF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G033-18 (ASA-CF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G049-04 (PA6): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely; G164-08 (PA66): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely; G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely.

**Likely tag (materials and products) (5).** G049-04 (PA6): tagged likely; PA66: tagged likely; G164-08 (PA66): tagged likely; SBC: tagged likely; G174-01 (SBC): tagged likely.

### elongationXY >= 5 / comparable / dry / anneal allowed

Before: pass 77, unknown 70 (hidden 4), fail 5. After: pass 77, unknown 72 (hidden 4), fail 5.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Groups (3).** PA66: not-enough-data → not-enough-data:likely; PPA: not-enough-data → not-enough-data:likely; SBC: not-enough-data → not-enough-data:likely.

**Product answers (6).** G033-03 (ASA-CF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G033-18 (ASA-CF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G049-04 (PA6): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely; G164-08 (PA66): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely; G069-02 (PPA): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely; G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely.

**Likely tag (materials and products) (7).** G049-04 (PA6): tagged likely; PA66: tagged likely; G164-08 (PA66): tagged likely; PPA: tagged likely; G069-02 (PPA): tagged likely; SBC: tagged likely; G174-01 (SBC): tagged likely.

### elongationXY >= 5 / comparable / conditioned / anneal not allowed

Before: pass 5, unknown 147 (hidden 4), fail 0. After: pass 5, unknown 149 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### elongationXY >= 5 / comparable / conditioned / anneal allowed

Before: pass 7, unknown 145 (hidden 4), fail 0. After: pass 7, unknown 147 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### elongationXY >= 5 / as-published / dry / anneal not allowed

Before: pass 107, unknown 36 (hidden 4), fail 9. After: pass 107, unknown 38 (hidden 4), fail 9.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Groups (1).** PA66: not-enough-data → not-enough-data:likely.

**Product answers (2).** G049-04 (PA6): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely; G164-08 (PA66): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely.

**Likely tag (materials and products) (3).** G049-04 (PA6): tagged likely; PA66: tagged likely; G164-08 (PA66): tagged likely.

### elongationXY >= 5 / as-published / dry / anneal allowed

Before: pass 108, unknown 35 (hidden 4), fail 9. After: pass 108, unknown 37 (hidden 4), fail 9.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Groups (1).** PA66: not-enough-data → not-enough-data:likely.

**Product answers (2).** G049-04 (PA6): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely; G164-08 (PA66): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely.

**Likely tag (materials and products) (3).** G049-04 (PA6): tagged likely; PA66: tagged likely; G164-08 (PA66): tagged likely.

### elongationXY >= 5 / as-published / conditioned / anneal not allowed

Before: pass 5, unknown 147 (hidden 4), fail 0. After: pass 5, unknown 149 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### elongationXY >= 5 / as-published / conditioned / anneal allowed

Before: pass 7, unknown 145 (hidden 4), fail 0. After: pass 7, unknown 147 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### elongationXY >= 20 / comparable / dry / anneal not allowed

Before: pass 33, unknown 101 (hidden 4), fail 18. After: pass 33, unknown 103 (hidden 4), fail 18.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Groups (1).** SBC: not-enough-data → not-enough-data:likely.

**Product the row shows (2).** PLA-CF: G018-14 → G018-16; TPU-CF: G129-01 → G129-02.

**Product answers (6).** G001-91 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G018-14 (PLA-CF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G018-15 (PLA-CF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G033-01 (ASA-CF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G129-01 (TPU-CF): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely.

**Likely tag (materials and products) (3).** G129-01 (TPU-CF): no longer likely; SBC: tagged likely; G174-01 (SBC): tagged likely.

### elongationXY >= 20 / comparable / dry / anneal allowed

Before: pass 33, unknown 101 (hidden 4), fail 18. After: pass 33, unknown 103 (hidden 4), fail 18.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Groups (1).** SBC: not-enough-data → not-enough-data:likely.

**Product the row shows (2).** PLA-CF: G018-14 → G018-16; TPU-CF: G129-01 → G129-02.

**Product answers (6).** G001-91 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G018-14 (PLA-CF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G018-15 (PLA-CF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G033-01 (ASA-CF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G129-01 (TPU-CF): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely.

**Likely tag (materials and products) (3).** G129-01 (TPU-CF): no longer likely; SBC: tagged likely; G174-01 (SBC): tagged likely.

### elongationXY >= 20 / comparable / conditioned / anneal not allowed

Before: pass 0, unknown 152 (hidden 4), fail 0. After: pass 0, unknown 154 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### elongationXY >= 20 / comparable / conditioned / anneal allowed

Before: pass 1, unknown 151 (hidden 4), fail 0. After: pass 1, unknown 153 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### elongationXY >= 20 / as-published / dry / anneal not allowed

Before: pass 62, unknown 59 (hidden 4), fail 31. After: pass 62, unknown 61 (hidden 4), fail 31.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Product the row shows (1).** TPU-CF: G129-01 → G129-02.

**Product answers (4).** G001-91 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G018-14 (PLA-CF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G018-15 (PLA-CF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G033-01 (ASA-CF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### elongationXY >= 20 / as-published / dry / anneal allowed

Before: pass 62, unknown 60 (hidden 4), fail 30. After: pass 62, unknown 62 (hidden 4), fail 30.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Product the row shows (1).** TPU-CF: G129-01 → G129-02.

**Product answers (4).** G001-91 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G018-14 (PLA-CF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G018-15 (PLA-CF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G033-01 (ASA-CF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### elongationXY >= 20 / as-published / conditioned / anneal not allowed

Before: pass 0, unknown 152 (hidden 4), fail 0. After: pass 0, unknown 154 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### elongationXY >= 20 / as-published / conditioned / anneal allowed

Before: pass 1, unknown 151 (hidden 4), fail 0. After: pass 1, unknown 153 (hidden 4), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### elongationXY >= 100 / comparable / dry / anneal not allowed

Before: pass 19, unknown 113 (hidden 6), fail 20. After: pass 19, unknown 115 (hidden 6), fail 20.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Product the row shows (2).** CPE: G089-02 → G020-08; ABS-AF: G106-01 → G106-02.

**Product answers (1).** G053-14 (PA12-CF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### elongationXY >= 100 / comparable / dry / anneal allowed

Before: pass 19, unknown 113 (hidden 6), fail 20. After: pass 19, unknown 115 (hidden 6), fail 20.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Product the row shows (1).** CPE: G089-02 → G020-08.

**Product answers (1).** G053-14 (PA12-CF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### elongationXY >= 100 / comparable / conditioned / anneal not allowed

Before: pass 0, unknown 152 (hidden 6), fail 0. After: pass 0, unknown 154 (hidden 6), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### elongationXY >= 100 / comparable / conditioned / anneal allowed

Before: pass 1, unknown 151 (hidden 6), fail 0. After: pass 1, unknown 153 (hidden 6), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### elongationXY >= 100 / as-published / dry / anneal not allowed

Before: pass 34, unknown 79 (hidden 6), fail 39. After: pass 34, unknown 81 (hidden 6), fail 39.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Product the row shows (1).** ASA-GF: G034-06 → G034-01.

### elongationXY >= 100 / as-published / dry / anneal allowed

Before: pass 34, unknown 80 (hidden 6), fail 38. After: pass 34, unknown 82 (hidden 6), fail 38.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

**Product the row shows (1).** ASA-GF: G034-06 → G034-01.

### elongationXY >= 100 / as-published / conditioned / anneal not allowed

Before: pass 0, unknown 152 (hidden 6), fail 0. After: pass 0, unknown 154 (hidden 6), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### elongationXY >= 100 / as-published / conditioned / anneal allowed

Before: pass 1, unknown 151 (hidden 6), fail 0. After: pass 1, unknown 153 (hidden 6), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### hdt045 >= 60 / comparable / dry / anneal not allowed

Before: pass 95, unknown 55 (hidden 22), fail 2. After: pass 96, unknown 56 (hidden 22), fail 2.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, PASS.

**Groups (3).** PET-LW: not-enough-data:likely → not-enough-data; nGen FLEX: not-enough-data:likely → not-enough-data; SBC: not-enough-data → not-enough-data:likely.

**Product the row shows (1).** PET-GF: G068-01 → G068-02.

**Product answers (10).** G019-02 (PLA-GF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G049-07 (PA6): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G057-04 (PA6/66): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G057-07 (PA6/66): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G068-01 (PET-GF): PASS:meets → UNKNOWN:not-enough-data:likely; G068-04 (PET-GF): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely; G141-01 (PET-LW): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G141-02 (PET-LW): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G143-01 (nGen FLEX): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely.

**Likely tag (materials and products) (12).** G049-07 (PA6): no longer likely; G057-04 (PA6/66): no longer likely; G057-07 (PA6/66): no longer likely; G068-01 (PET-GF): tagged likely; G068-04 (PET-GF): tagged likely; PET-LW: no longer likely; G141-01 (PET-LW): no longer likely; G141-02 (PET-LW): no longer likely; nGen FLEX: no longer likely; G143-01 (nGen FLEX): no longer likely; SBC: tagged likely; G174-01 (SBC): tagged likely.

### hdt045 >= 60 / comparable / dry / anneal allowed

Before: pass 95, unknown 55 (hidden 22), fail 2. After: pass 96, unknown 56 (hidden 22), fail 2.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, PASS.

**Groups (3).** PET-LW: not-enough-data:likely → not-enough-data; nGen FLEX: not-enough-data:likely → not-enough-data; SBC: not-enough-data → not-enough-data:likely.

**Product the row shows (1).** PET-GF: G068-01 → G068-02.

**Product answers (10).** G019-02 (PLA-GF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G049-07 (PA6): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G057-04 (PA6/66): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G057-07 (PA6/66): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G068-01 (PET-GF): PASS:meets → UNKNOWN:not-enough-data:likely; G068-04 (PET-GF): UNKNOWN:not-enough-data → PASS:meets; G141-01 (PET-LW): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G141-02 (PET-LW): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G143-01 (nGen FLEX): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely.

**Likely tag (materials and products) (11).** G049-07 (PA6): no longer likely; G057-04 (PA6/66): no longer likely; G057-07 (PA6/66): no longer likely; G068-01 (PET-GF): tagged likely; PET-LW: no longer likely; G141-01 (PET-LW): no longer likely; G141-02 (PET-LW): no longer likely; nGen FLEX: no longer likely; G143-01 (nGen FLEX): no longer likely; SBC: tagged likely; G174-01 (SBC): tagged likely.

### hdt045 >= 60 / comparable / conditioned / anneal not allowed

Before: pass 3, unknown 149 (hidden 22), fail 0. After: pass 3, unknown 151 (hidden 22), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### hdt045 >= 60 / comparable / conditioned / anneal allowed

Before: pass 3, unknown 149 (hidden 22), fail 0. After: pass 3, unknown 151 (hidden 22), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### hdt045 >= 60 / as-published / dry / anneal not allowed

Before: pass 98, unknown 52 (hidden 22), fail 2. After: pass 99, unknown 53 (hidden 22), fail 2.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, PASS.

**Groups (3).** PET-LW: not-enough-data:likely → not-enough-data; nGen FLEX: not-enough-data:likely → not-enough-data; SBC: not-enough-data → not-enough-data:likely.

**Product the row shows (1).** PET-GF: G068-01 → G068-02.

**Product answers (9).** G019-02 (PLA-GF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G057-04 (PA6/66): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G057-07 (PA6/66): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G068-01 (PET-GF): PASS:meets → UNKNOWN:not-enough-data:likely; G068-04 (PET-GF): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely; G141-01 (PET-LW): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G141-02 (PET-LW): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G143-01 (nGen FLEX): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely.

**Likely tag (materials and products) (11).** G057-04 (PA6/66): no longer likely; G057-07 (PA6/66): no longer likely; G068-01 (PET-GF): tagged likely; G068-04 (PET-GF): tagged likely; PET-LW: no longer likely; G141-01 (PET-LW): no longer likely; G141-02 (PET-LW): no longer likely; nGen FLEX: no longer likely; G143-01 (nGen FLEX): no longer likely; SBC: tagged likely; G174-01 (SBC): tagged likely.

### hdt045 >= 60 / as-published / dry / anneal allowed

Before: pass 98, unknown 52 (hidden 22), fail 2. After: pass 99, unknown 53 (hidden 22), fail 2.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, PASS.

**Groups (3).** PET-LW: not-enough-data:likely → not-enough-data; nGen FLEX: not-enough-data:likely → not-enough-data; SBC: not-enough-data → not-enough-data:likely.

**Product the row shows (1).** PET-GF: G068-01 → G068-02.

**Product answers (9).** G019-02 (PLA-GF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G057-04 (PA6/66): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G057-07 (PA6/66): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G068-01 (PET-GF): PASS:meets → UNKNOWN:not-enough-data:likely; G068-04 (PET-GF): UNKNOWN:not-enough-data → PASS:meets; G141-01 (PET-LW): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G141-02 (PET-LW): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G143-01 (nGen FLEX): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely.

**Likely tag (materials and products) (10).** G057-04 (PA6/66): no longer likely; G057-07 (PA6/66): no longer likely; G068-01 (PET-GF): tagged likely; PET-LW: no longer likely; G141-01 (PET-LW): no longer likely; G141-02 (PET-LW): no longer likely; nGen FLEX: no longer likely; G143-01 (nGen FLEX): no longer likely; SBC: tagged likely; G174-01 (SBC): tagged likely.

### hdt045 >= 60 / as-published / conditioned / anneal not allowed

Before: pass 3, unknown 149 (hidden 22), fail 0. After: pass 3, unknown 151 (hidden 22), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### hdt045 >= 60 / as-published / conditioned / anneal allowed

Before: pass 3, unknown 149 (hidden 22), fail 0. After: pass 3, unknown 151 (hidden 22), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### hdt045 >= 90 / comparable / dry / anneal not allowed

Before: pass 73, unknown 75 (hidden 22), fail 4. After: pass 72, unknown 78 (hidden 22), fail 4.

**Material verdicts (4).** PETG: PASS → UNKNOWN; PET-GF: PASS → UNKNOWN; PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, PASS.

**Groups (4).** PETG: meets → unlikely-to-meet; PET-GF: meets → unlikely-to-meet; PLA-EC: not-enough-data → unlikely-to-meet; PLA-GR: not-enough-data → unlikely-to-meet.

**Product the row shows (5).** PETG: G020-08 → G020-74; PETG-CF: G024-04 → G024-10; PET-GF: G068-01 → G068-04; PVA: G075-03 → G075-08; CPE: G089-02 → G020-08.

**Product answers (10).** G049-07 (PA6): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G068-01 (PET-GF): PASS:meets → UNKNOWN:unlikely-to-meet; G068-04 (PET-GF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G068-05 (PET-GF): UNKNOWN:not-enough-data:likely → UNKNOWN:unlikely-to-meet; G072-02 (PPS): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely; G090-01 (CPE-CF): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G111-01 (PLA-EC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G111-02 (PLA-EC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G155-01 (PLA-GR): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G155-02 (PLA-GR): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

**Likely tag (materials and products) (3).** G049-07 (PA6): no longer likely; G068-05 (PET-GF): no longer likely; G072-02 (PPS): tagged likely.

### hdt045 >= 90 / comparable / dry / anneal allowed

Before: pass 74, unknown 74 (hidden 22), fail 4. After: pass 74, unknown 76 (hidden 22), fail 4.

**Material verdicts (3).** PETG: PASS → UNKNOWN; PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, PASS.

**Groups (3).** PETG: meets → unlikely-to-meet; PLA-EC: not-enough-data → unlikely-to-meet; PLA-GR: not-enough-data → unlikely-to-meet.

**Product the row shows (5).** PETG: G020-08 → G020-74; PETG-CF: G024-04 → G024-10; PET-GF: G068-01 → G068-02; PVA: G075-03 → G075-08; CPE: G089-02 → G020-08.

**Product answers (9).** G049-07 (PA6): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G068-01 (PET-GF): PASS:meets → UNKNOWN:unlikely-to-meet; G068-04 (PET-GF): UNKNOWN:not-enough-data → PASS:meets; G072-02 (PPS): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely; G090-01 (CPE-CF): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G111-01 (PLA-EC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G111-02 (PLA-EC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G155-01 (PLA-GR): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G155-02 (PLA-GR): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

**Likely tag (materials and products) (2).** G049-07 (PA6): no longer likely; G072-02 (PPS): tagged likely.

### hdt045 >= 90 / comparable / conditioned / anneal not allowed

Before: pass 2, unknown 150 (hidden 22), fail 0. After: pass 2, unknown 152 (hidden 22), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### hdt045 >= 90 / comparable / conditioned / anneal allowed

Before: pass 2, unknown 150 (hidden 22), fail 0. After: pass 2, unknown 152 (hidden 22), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### hdt045 >= 90 / as-published / dry / anneal not allowed

Before: pass 75, unknown 71 (hidden 22), fail 6. After: pass 74, unknown 74 (hidden 22), fail 6.

**Material verdicts (4).** PETG: PASS → UNKNOWN; PET-GF: PASS → UNKNOWN; PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, PASS.

**Groups (4).** PETG: meets → unlikely-to-meet; PET-GF: meets → unlikely-to-meet; PLA-EC: not-enough-data → unlikely-to-meet; PLA-GR: not-enough-data → unlikely-to-meet.

**Product the row shows (4).** PETG: G020-08 → G020-74; PET-GF: G068-01 → G068-04; PVA: G075-03 → G075-08; CPE: G089-02 → G020-08.

**Product answers (9).** G068-01 (PET-GF): PASS:meets → UNKNOWN:unlikely-to-meet; G068-04 (PET-GF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G068-05 (PET-GF): UNKNOWN:not-enough-data:likely → UNKNOWN:unlikely-to-meet; G072-02 (PPS): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely; G090-01 (CPE-CF): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G111-01 (PLA-EC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G111-02 (PLA-EC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G155-01 (PLA-GR): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G155-02 (PLA-GR): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

**Likely tag (materials and products) (2).** G068-05 (PET-GF): no longer likely; G072-02 (PPS): tagged likely.

### hdt045 >= 90 / as-published / dry / anneal allowed

Before: pass 76, unknown 70 (hidden 22), fail 6. After: pass 76, unknown 72 (hidden 22), fail 6.

**Material verdicts (3).** PETG: PASS → UNKNOWN; PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, PASS.

**Groups (3).** PETG: meets → unlikely-to-meet; PLA-EC: not-enough-data → unlikely-to-meet; PLA-GR: not-enough-data → unlikely-to-meet.

**Product the row shows (4).** PETG: G020-08 → G020-74; PET-GF: G068-01 → G068-02; PVA: G075-03 → G075-08; CPE: G089-02 → G020-08.

**Product answers (8).** G068-01 (PET-GF): PASS:meets → UNKNOWN:unlikely-to-meet; G068-04 (PET-GF): UNKNOWN:not-enough-data → PASS:meets; G072-02 (PPS): UNKNOWN:not-enough-data → UNKNOWN:not-enough-data:likely; G090-01 (CPE-CF): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G111-01 (PLA-EC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G111-02 (PLA-EC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G155-01 (PLA-GR): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G155-02 (PLA-GR): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

**Likely tag (materials and products) (1).** G072-02 (PPS): tagged likely.

### hdt045 >= 90 / as-published / conditioned / anneal not allowed

Before: pass 2, unknown 150 (hidden 22), fail 0. After: pass 2, unknown 152 (hidden 22), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### hdt045 >= 90 / as-published / conditioned / anneal allowed

Before: pass 2, unknown 150 (hidden 22), fail 0. After: pass 2, unknown 152 (hidden 22), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### hdt045 >= 120 / comparable / dry / anneal not allowed

Before: pass 48, unknown 94 (hidden 22), fail 10. After: pass 47, unknown 96 (hidden 22), fail 11.

**Material verdicts (3).** PET-GF: PASS → UNKNOWN; PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

**Groups (3).** PET-GF: meets → unlikely-to-meet; PET-LW: not-enough-data → unlikely-to-meet; SBC: not-enough-data → unlikely-to-meet.

**Product the row shows (3).** PETG-CF: G024-04 → G024-10; PET-GF: G068-01 → G068-04; PVA: G075-03 → G075-08.

**Product answers (6).** G049-07 (PA6): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G068-01 (PET-GF): PASS:meets → UNKNOWN:unlikely-to-meet; G068-04 (PET-GF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G141-01 (PET-LW): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G141-02 (PET-LW): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

**Likely tag (materials and products) (1).** G049-07 (PA6): no longer likely.

### hdt045 >= 120 / comparable / dry / anneal allowed

Before: pass 49, unknown 94 (hidden 22), fail 9. After: pass 49, unknown 95 (hidden 22), fail 10.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

**Groups (2).** PET-LW: not-enough-data → unlikely-to-meet; SBC: not-enough-data → unlikely-to-meet.

**Product the row shows (3).** PETG-CF: G024-04 → G024-10; PET-GF: G068-01 → G068-02; PVA: G075-03 → G075-08.

**Product answers (6).** G049-07 (PA6): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data; G068-01 (PET-GF): PASS:meets → UNKNOWN:unlikely-to-meet; G068-04 (PET-GF): UNKNOWN:not-enough-data → PASS:meets; G141-01 (PET-LW): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G141-02 (PET-LW): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

**Likely tag (materials and products) (1).** G049-07 (PA6): no longer likely.

### hdt045 >= 120 / comparable / conditioned / anneal not allowed

Before: pass 2, unknown 150 (hidden 22), fail 0. After: pass 2, unknown 152 (hidden 22), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### hdt045 >= 120 / comparable / conditioned / anneal allowed

Before: pass 2, unknown 150 (hidden 22), fail 0. After: pass 2, unknown 152 (hidden 22), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### hdt045 >= 120 / as-published / dry / anneal not allowed

Before: pass 50, unknown 90 (hidden 22), fail 12. After: pass 49, unknown 92 (hidden 22), fail 13.

**Material verdicts (3).** PET-GF: PASS → UNKNOWN; PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

**Groups (3).** PET-GF: meets → unlikely-to-meet; PET-LW: not-enough-data → unlikely-to-meet; SBC: not-enough-data → unlikely-to-meet.

**Product the row shows (3).** PETG: G020-66 → G020-58; PET-GF: G068-01 → G068-04; PVA: G075-03 → G075-08.

**Product answers (5).** G068-01 (PET-GF): PASS:meets → UNKNOWN:unlikely-to-meet; G068-04 (PET-GF): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G141-01 (PET-LW): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G141-02 (PET-LW): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### hdt045 >= 120 / as-published / dry / anneal allowed

Before: pass 51, unknown 90 (hidden 22), fail 11. After: pass 51, unknown 91 (hidden 22), fail 12.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, FAIL.

**Groups (2).** PET-LW: not-enough-data → unlikely-to-meet; SBC: not-enough-data → unlikely-to-meet.

**Product the row shows (3).** PETG: G020-66 → G020-58; PET-GF: G068-01 → G068-02; PVA: G075-03 → G075-08.

**Product answers (5).** G068-01 (PET-GF): PASS:meets → UNKNOWN:unlikely-to-meet; G068-04 (PET-GF): UNKNOWN:not-enough-data → PASS:meets; G141-01 (PET-LW): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G141-02 (PET-LW): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### hdt045 >= 120 / as-published / conditioned / anneal not allowed

Before: pass 2, unknown 150 (hidden 22), fail 0. After: pass 2, unknown 152 (hidden 22), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

### hdt045 >= 120 / as-published / conditioned / anneal allowed

Before: pass 2, unknown 150 (hidden 22), fail 0. After: pass 2, unknown 152 (hidden 22), fail 0.

**Material verdicts (2).** PCL-EC: new material, UNKNOWN; Nylon-CE, maker-undisclosed polyamide: new material, UNKNOWN.

## Part 2: the merged branch against m476 and m477

Across 138 cases: 149 material verdicts moved, 10 listings changed, 33 group changes, 160 rows now shown for another product, 78 product answers moved; the likely tag came or went 10 times (materials and products).

### Outdoor structural part / leave out

Before: pass 11, unknown 89 (hidden 0), fail 51. After: pass 11, unknown 89 (hidden 0), fail 52.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### Outdoor structural part / include

Before: pass 11, unknown 89 (hidden 7), fail 51. After: pass 11, unknown 89 (hidden 7), fail 52.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### Outdoor structural part / include + estimates

Before: pass 11, unknown 89 (hidden 7), fail 51. After: pass 11, unknown 89 (hidden 7), fail 52.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (2).** PC-ABS: G094-10 → G094-03; PVC: G135-01 → G135-02.

**Product answers (1).** G094-10 (PC-ABS): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### Indoor prototype / leave out

Before: pass 98, unknown 32 (hidden 0), fail 21. After: pass 99, unknown 32 (hidden 0), fail 21.

**Material verdicts (1).** PVC-P: new material, PASS.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### Indoor prototype / include

Before: pass 98, unknown 32 (hidden 0), fail 21. After: pass 99, unknown 32 (hidden 0), fail 21.

**Material verdicts (1).** PVC-P: new material, PASS.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### Indoor prototype / include + estimates

Before: pass 98, unknown 32 (hidden 0), fail 21. After: pass 99, unknown 32 (hidden 0), fail 21.

**Material verdicts (1).** PVC-P: new material, PASS.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### Lightweight structure / leave out

Before: pass 19, unknown 74 (hidden 0), fail 58. After: pass 19, unknown 73 (hidden 0), fail 60.

**Material verdicts (2).** PVC: UNKNOWN → FAIL; PVC-P: new material, FAIL.

**Groups (1).** PVC: not-enough-data → fail.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### Lightweight structure / include

Before: pass 19, unknown 74 (hidden 0), fail 58. After: pass 19, unknown 73 (hidden 0), fail 60.

**Material verdicts (2).** PVC: UNKNOWN → FAIL; PVC-P: new material, FAIL.

**Listed or not (1).** PVC: listed → not listed.

**Groups (1).** PVC: not-enough-data → fail.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### Lightweight structure / include + estimates

Before: pass 19, unknown 74 (hidden 0), fail 58. After: pass 19, unknown 73 (hidden 0), fail 60.

**Material verdicts (2).** PVC: UNKNOWN → FAIL; PVC-P: new material, FAIL.

**Listed or not (1).** PVC: listed → not listed.

**Groups (1).** PVC: not-enough-data → fail.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### Warm environment / leave out

Before: pass 43, unknown 85 (hidden 0), fail 23. After: pass 43, unknown 86 (hidden 0), fail 23.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### Warm environment / include

Before: pass 43, unknown 85 (hidden 16), fail 23. After: pass 43, unknown 86 (hidden 17), fail 23.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### Warm environment / include + estimates

Before: pass 43, unknown 85 (hidden 16), fail 23. After: pass 43, unknown 86 (hidden 17), fail 23.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Groups (1).** PVC: not-enough-data → unlikely-to-meet.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### High-stiffness fixture / leave out

Before: pass 10, unknown 95 (hidden 0), fail 46. After: pass 10, unknown 95 (hidden 0), fail 47.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### High-stiffness fixture / include

Before: pass 10, unknown 95 (hidden 0), fail 46. After: pass 10, unknown 95 (hidden 0), fail 47.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### High-stiffness fixture / include + estimates

Before: pass 10, unknown 95 (hidden 1), fail 46. After: pass 10, unknown 95 (hidden 1), fail 47.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (2).** PLA Silk: G008-10 → G008-04; PVC: G135-01 → G135-02.

**Product answers (5).** G001-119 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G001-120 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G001-125 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G008-10 (PLA Silk): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G014-15 (PLA Wood): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### Flexible component / leave out

Before: pass 5, unknown 105 (hidden 0), fail 41. After: pass 5, unknown 106 (hidden 0), fail 41.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### Flexible component / include

Before: pass 5, unknown 105 (hidden 0), fail 41. After: pass 5, unknown 106 (hidden 0), fail 41.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### Flexible component / include + estimates

Before: pass 5, unknown 105 (hidden 3), fail 41. After: pass 5, unknown 106 (hidden 3), fail 41.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Groups (1).** PVC: not-enough-data → unlikely-to-meet.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 900 / comparable / dry / anneal not allowed

Before: pass 145, unknown 4 (hidden 0), fail 2. After: pass 146, unknown 4 (hidden 0), fail 2.

**Material verdicts (1).** PVC-P: new material, PASS.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 900 / comparable / dry / anneal allowed

Before: pass 145, unknown 4 (hidden 0), fail 2. After: pass 146, unknown 4 (hidden 0), fail 2.

**Material verdicts (1).** PVC-P: new material, PASS.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 900 / comparable / conditioned / anneal not allowed

Before: pass 145, unknown 4 (hidden 0), fail 2. After: pass 146, unknown 4 (hidden 0), fail 2.

**Material verdicts (1).** PVC-P: new material, PASS.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 900 / comparable / conditioned / anneal allowed

Before: pass 145, unknown 4 (hidden 0), fail 2. After: pass 146, unknown 4 (hidden 0), fail 2.

**Material verdicts (1).** PVC-P: new material, PASS.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 900 / as-published / dry / anneal not allowed

Before: pass 145, unknown 4 (hidden 0), fail 2. After: pass 146, unknown 4 (hidden 0), fail 2.

**Material verdicts (1).** PVC-P: new material, PASS.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 900 / as-published / dry / anneal allowed

Before: pass 145, unknown 4 (hidden 0), fail 2. After: pass 146, unknown 4 (hidden 0), fail 2.

**Material verdicts (1).** PVC-P: new material, PASS.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 900 / as-published / conditioned / anneal not allowed

Before: pass 145, unknown 4 (hidden 0), fail 2. After: pass 146, unknown 4 (hidden 0), fail 2.

**Material verdicts (1).** PVC-P: new material, PASS.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 900 / as-published / conditioned / anneal allowed

Before: pass 145, unknown 4 (hidden 0), fail 2. After: pass 146, unknown 4 (hidden 0), fail 2.

**Material verdicts (1).** PVC-P: new material, PASS.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 1250 / comparable / dry / anneal not allowed

Before: pass 80, unknown 26 (hidden 1), fail 45. After: pass 81, unknown 26 (hidden 1), fail 45.

**Material verdicts (1).** PVC-P: new material, PASS.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 1250 / comparable / dry / anneal allowed

Before: pass 80, unknown 26 (hidden 1), fail 45. After: pass 81, unknown 26 (hidden 1), fail 45.

**Material verdicts (1).** PVC-P: new material, PASS.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 1250 / comparable / conditioned / anneal not allowed

Before: pass 80, unknown 26 (hidden 1), fail 45. After: pass 81, unknown 26 (hidden 1), fail 45.

**Material verdicts (1).** PVC-P: new material, PASS.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 1250 / comparable / conditioned / anneal allowed

Before: pass 80, unknown 26 (hidden 1), fail 45. After: pass 81, unknown 26 (hidden 1), fail 45.

**Material verdicts (1).** PVC-P: new material, PASS.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 1250 / as-published / dry / anneal not allowed

Before: pass 80, unknown 26 (hidden 1), fail 45. After: pass 81, unknown 26 (hidden 1), fail 45.

**Material verdicts (1).** PVC-P: new material, PASS.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 1250 / as-published / dry / anneal allowed

Before: pass 80, unknown 26 (hidden 1), fail 45. After: pass 81, unknown 26 (hidden 1), fail 45.

**Material verdicts (1).** PVC-P: new material, PASS.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 1250 / as-published / conditioned / anneal not allowed

Before: pass 80, unknown 26 (hidden 1), fail 45. After: pass 81, unknown 26 (hidden 1), fail 45.

**Material verdicts (1).** PVC-P: new material, PASS.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 1250 / as-published / conditioned / anneal allowed

Before: pass 80, unknown 26 (hidden 1), fail 45. After: pass 81, unknown 26 (hidden 1), fail 45.

**Material verdicts (1).** PVC-P: new material, PASS.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 1500 / comparable / dry / anneal not allowed

Before: pass 11, unknown 30 (hidden 3), fail 110. After: pass 11, unknown 30 (hidden 3), fail 111.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 1500 / comparable / dry / anneal allowed

Before: pass 11, unknown 30 (hidden 3), fail 110. After: pass 11, unknown 30 (hidden 3), fail 111.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 1500 / comparable / conditioned / anneal not allowed

Before: pass 11, unknown 30 (hidden 3), fail 110. After: pass 11, unknown 30 (hidden 3), fail 111.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 1500 / comparable / conditioned / anneal allowed

Before: pass 11, unknown 30 (hidden 3), fail 110. After: pass 11, unknown 30 (hidden 3), fail 111.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 1500 / as-published / dry / anneal not allowed

Before: pass 11, unknown 30 (hidden 3), fail 110. After: pass 11, unknown 30 (hidden 3), fail 111.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 1500 / as-published / dry / anneal allowed

Before: pass 11, unknown 30 (hidden 3), fail 110. After: pass 11, unknown 30 (hidden 3), fail 111.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 1500 / as-published / conditioned / anneal not allowed

Before: pass 11, unknown 30 (hidden 3), fail 110. After: pass 11, unknown 30 (hidden 3), fail 111.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### density >= 1500 / as-published / conditioned / anneal allowed

Before: pass 11, unknown 30 (hidden 3), fail 110. After: pass 11, unknown 30 (hidden 3), fail 111.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileModulusXY >= 2 / comparable / dry / anneal not allowed

Before: pass 80, unknown 57 (hidden 4), fail 14. After: pass 80, unknown 57 (hidden 4), fail 15.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (1).** PVC: G135-01 → G135-02.

**Product answers (1).** G153-01 (PETG-GR): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileModulusXY >= 2 / comparable / dry / anneal allowed

Before: pass 81, unknown 56 (hidden 4), fail 14. After: pass 81, unknown 56 (hidden 4), fail 15.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (1).** PVC: G135-01 → G135-02.

**Product answers (1).** G153-01 (PETG-GR): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileModulusXY >= 2 / comparable / conditioned / anneal not allowed

Before: pass 11, unknown 140 (hidden 4), fail 0. After: pass 11, unknown 141 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileModulusXY >= 2 / comparable / conditioned / anneal allowed

Before: pass 13, unknown 138 (hidden 4), fail 0. After: pass 13, unknown 139 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileModulusXY >= 2 / as-published / dry / anneal not allowed

Before: pass 101, unknown 34 (hidden 4), fail 16. After: pass 101, unknown 34 (hidden 4), fail 17.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileModulusXY >= 2 / as-published / dry / anneal allowed

Before: pass 102, unknown 33 (hidden 4), fail 16. After: pass 102, unknown 33 (hidden 4), fail 17.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileModulusXY >= 2 / as-published / conditioned / anneal not allowed

Before: pass 11, unknown 140 (hidden 4), fail 0. After: pass 11, unknown 141 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileModulusXY >= 2 / as-published / conditioned / anneal allowed

Before: pass 13, unknown 138 (hidden 4), fail 0. After: pass 13, unknown 139 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileModulusXY >= 3 / comparable / dry / anneal not allowed

Before: pass 40, unknown 89 (hidden 4), fail 22. After: pass 40, unknown 89 (hidden 4), fail 23.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (1).** PVC: G135-01 → G135-02.

**Product answers (3).** G001-74 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G027-14 (ABS): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G094-10 (PC-ABS): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileModulusXY >= 3 / comparable / dry / anneal allowed

Before: pass 42, unknown 87 (hidden 4), fail 22. After: pass 42, unknown 87 (hidden 4), fail 23.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (1).** PVC: G135-01 → G135-02.

**Product answers (3).** G001-74 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G027-14 (ABS): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G094-10 (PC-ABS): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileModulusXY >= 3 / comparable / conditioned / anneal not allowed

Before: pass 8, unknown 143 (hidden 4), fail 0. After: pass 8, unknown 144 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileModulusXY >= 3 / comparable / conditioned / anneal allowed

Before: pass 10, unknown 141 (hidden 4), fail 0. After: pass 10, unknown 142 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileModulusXY >= 3 / as-published / dry / anneal not allowed

Before: pass 67, unknown 53 (hidden 4), fail 31. After: pass 67, unknown 53 (hidden 4), fail 32.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (1).** PVC: G135-01 → G135-02.

**Product answers (2).** G001-74 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G027-14 (ABS): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileModulusXY >= 3 / as-published / dry / anneal allowed

Before: pass 69, unknown 52 (hidden 4), fail 30. After: pass 69, unknown 52 (hidden 4), fail 31.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (1).** PVC: G135-01 → G135-02.

**Product answers (2).** G001-74 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G027-14 (ABS): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileModulusXY >= 3 / as-published / conditioned / anneal not allowed

Before: pass 8, unknown 143 (hidden 4), fail 0. After: pass 8, unknown 144 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileModulusXY >= 3 / as-published / conditioned / anneal allowed

Before: pass 10, unknown 141 (hidden 4), fail 0. After: pass 10, unknown 142 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileModulusXY >= 5 / comparable / dry / anneal not allowed

Before: pass 22, unknown 101 (hidden 5), fail 28. After: pass 22, unknown 101 (hidden 5), fail 29.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (2).** PLA Silk: G008-10 → G008-04; PVC: G135-01 → G135-02.

**Product answers (5).** G001-119 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G001-120 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G001-125 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G008-10 (PLA Silk): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G014-15 (PLA Wood): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileModulusXY >= 5 / comparable / dry / anneal allowed

Before: pass 24, unknown 99 (hidden 5), fail 28. After: pass 24, unknown 99 (hidden 5), fail 29.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (2).** PLA Silk: G008-10 → G008-04; PVC: G135-01 → G135-02.

**Product answers (5).** G001-119 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G001-120 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G001-125 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G008-10 (PLA Silk): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G014-15 (PLA Wood): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileModulusXY >= 5 / comparable / conditioned / anneal not allowed

Before: pass 4, unknown 147 (hidden 5), fail 0. After: pass 4, unknown 148 (hidden 5), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileModulusXY >= 5 / comparable / conditioned / anneal allowed

Before: pass 5, unknown 146 (hidden 5), fail 0. After: pass 5, unknown 147 (hidden 5), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileModulusXY >= 5 / as-published / dry / anneal not allowed

Before: pass 31, unknown 67 (hidden 5), fail 53. After: pass 31, unknown 67 (hidden 5), fail 54.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (2).** PLA Silk: G008-10 → G008-04; PVC: G135-01 → G135-02.

**Product answers (5).** G001-119 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G001-120 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G001-125 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G008-10 (PLA Silk): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G014-15 (PLA Wood): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileModulusXY >= 5 / as-published / dry / anneal allowed

Before: pass 32, unknown 68 (hidden 5), fail 51. After: pass 32, unknown 68 (hidden 5), fail 52.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (2).** PLA Silk: G008-10 → G008-04; PVC: G135-01 → G135-02.

**Product answers (5).** G001-119 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G001-120 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G001-125 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G008-10 (PLA Silk): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G014-15 (PLA Wood): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileModulusXY >= 5 / as-published / conditioned / anneal not allowed

Before: pass 4, unknown 147 (hidden 5), fail 0. After: pass 4, unknown 148 (hidden 5), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileModulusXY >= 5 / as-published / conditioned / anneal allowed

Before: pass 5, unknown 146 (hidden 5), fail 0. After: pass 5, unknown 147 (hidden 5), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileStrengthXY >= 20 / comparable / dry / anneal not allowed

Before: pass 98, unknown 52 (hidden 4), fail 1. After: pass 98, unknown 53 (hidden 4), fail 1.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileStrengthXY >= 20 / comparable / dry / anneal allowed

Before: pass 99, unknown 51 (hidden 4), fail 1. After: pass 99, unknown 52 (hidden 4), fail 1.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileStrengthXY >= 20 / comparable / conditioned / anneal not allowed

Before: pass 12, unknown 139 (hidden 4), fail 0. After: pass 12, unknown 140 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileStrengthXY >= 20 / comparable / conditioned / anneal allowed

Before: pass 14, unknown 137 (hidden 4), fail 0. After: pass 14, unknown 138 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileStrengthXY >= 20 / as-published / dry / anneal not allowed

Before: pass 131, unknown 17 (hidden 4), fail 3. After: pass 132, unknown 17 (hidden 4), fail 3.

**Material verdicts (1).** PVC-P: new material, PASS.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileStrengthXY >= 20 / as-published / dry / anneal allowed

Before: pass 132, unknown 16 (hidden 4), fail 3. After: pass 133, unknown 16 (hidden 4), fail 3.

**Material verdicts (1).** PVC-P: new material, PASS.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileStrengthXY >= 20 / as-published / conditioned / anneal not allowed

Before: pass 13, unknown 138 (hidden 4), fail 0. After: pass 13, unknown 139 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileStrengthXY >= 20 / as-published / conditioned / anneal allowed

Before: pass 15, unknown 136 (hidden 4), fail 0. After: pass 15, unknown 137 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileStrengthXY >= 50 / comparable / dry / anneal not allowed

Before: pass 72, unknown 73 (hidden 4), fail 6. After: pass 72, unknown 74 (hidden 4), fail 6.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product answers (3).** G001-160 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G023-01 (PETG): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G027-48 (ABS): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileStrengthXY >= 50 / comparable / dry / anneal allowed

Before: pass 73, unknown 72 (hidden 4), fail 6. After: pass 73, unknown 73 (hidden 4), fail 6.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product answers (3).** G001-160 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G023-01 (PETG): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G027-48 (ABS): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileStrengthXY >= 50 / comparable / conditioned / anneal not allowed

Before: pass 7, unknown 144 (hidden 4), fail 0. After: pass 7, unknown 145 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileStrengthXY >= 50 / comparable / conditioned / anneal allowed

Before: pass 10, unknown 141 (hidden 4), fail 0. After: pass 10, unknown 142 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileStrengthXY >= 50 / as-published / dry / anneal not allowed

Before: pass 103, unknown 31 (hidden 4), fail 17. After: pass 103, unknown 31 (hidden 4), fail 18.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product answers (2).** G001-160 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G023-01 (PETG): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileStrengthXY >= 50 / as-published / dry / anneal allowed

Before: pass 104, unknown 31 (hidden 4), fail 16. After: pass 104, unknown 31 (hidden 4), fail 17.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product answers (2).** G001-160 (PLA): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G023-01 (PETG): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileStrengthXY >= 50 / as-published / conditioned / anneal not allowed

Before: pass 7, unknown 144 (hidden 4), fail 0. After: pass 7, unknown 145 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileStrengthXY >= 50 / as-published / conditioned / anneal allowed

Before: pass 10, unknown 141 (hidden 4), fail 0. After: pass 10, unknown 142 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileStrengthXY >= 100 / comparable / dry / anneal not allowed

Before: pass 12, unknown 117 (hidden 4), fail 22. After: pass 12, unknown 118 (hidden 4), fail 22.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Groups (2).** PVC: unlikely-to-meet → not-enough-data; TPU-EC: not-enough-data → unlikely-to-meet.

**Product the row shows (2).** CPE: G089-02 → G089-05; TPU-EC: G157-01 → G157-02.

**Product answers (4).** G066-07 (PET): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G135-02 (PVC): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G157-01 (TPU-EC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G039-30 (TPU 90A class): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileStrengthXY >= 100 / comparable / dry / anneal allowed

Before: pass 12, unknown 117 (hidden 4), fail 22. After: pass 12, unknown 118 (hidden 4), fail 22.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Groups (2).** PVC: unlikely-to-meet → not-enough-data; TPU-EC: not-enough-data → unlikely-to-meet.

**Product the row shows (2).** CPE: G089-02 → G089-05; TPU-EC: G157-01 → G157-02.

**Product answers (4).** G066-07 (PET): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G135-02 (PVC): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G157-01 (TPU-EC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet; G039-30 (TPU 90A class): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileStrengthXY >= 100 / comparable / conditioned / anneal not allowed

Before: pass 1, unknown 150 (hidden 4), fail 0. After: pass 1, unknown 151 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileStrengthXY >= 100 / comparable / conditioned / anneal allowed

Before: pass 2, unknown 149 (hidden 4), fail 0. After: pass 2, unknown 150 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileStrengthXY >= 100 / as-published / dry / anneal not allowed

Before: pass 17, unknown 70 (hidden 4), fail 64. After: pass 17, unknown 70 (hidden 4), fail 65.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (1).** PVC: G135-01 → G135-02.

**Product answers (1).** G157-01 (TPU-EC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileStrengthXY >= 100 / as-published / dry / anneal allowed

Before: pass 17, unknown 72 (hidden 4), fail 62. After: pass 17, unknown 72 (hidden 4), fail 63.

**Material verdicts (1).** PVC-P: new material, FAIL.

**Product the row shows (1).** PVC: G135-01 → G135-02.

**Product answers (1).** G157-01 (TPU-EC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### tensileStrengthXY >= 100 / as-published / conditioned / anneal not allowed

Before: pass 1, unknown 150 (hidden 4), fail 0. After: pass 1, unknown 151 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### tensileStrengthXY >= 100 / as-published / conditioned / anneal allowed

Before: pass 2, unknown 149 (hidden 4), fail 0. After: pass 2, unknown 150 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### elongationXY >= 5 / comparable / dry / anneal not allowed

Before: pass 76, unknown 70 (hidden 4), fail 5. After: pass 76, unknown 71 (hidden 4), fail 5.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Groups (1).** PA-ESD: not-enough-data → not-enough-data:likely.

**Product the row shows (2).** PA-ESD: G064-01 → G064-03; PVC: G135-01 → G135-02.

**Likely tag (materials and products) (1).** PA-ESD: tagged likely.

### elongationXY >= 5 / comparable / dry / anneal allowed

Before: pass 77, unknown 69 (hidden 4), fail 5. After: pass 77, unknown 70 (hidden 4), fail 5.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Groups (1).** PA-ESD: not-enough-data → not-enough-data:likely.

**Product the row shows (2).** PA-ESD: G064-01 → G064-03; PVC: G135-01 → G135-02.

**Likely tag (materials and products) (1).** PA-ESD: tagged likely.

### elongationXY >= 5 / comparable / conditioned / anneal not allowed

Before: pass 5, unknown 146 (hidden 4), fail 0. After: pass 5, unknown 147 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### elongationXY >= 5 / comparable / conditioned / anneal allowed

Before: pass 7, unknown 144 (hidden 4), fail 0. After: pass 7, unknown 145 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### elongationXY >= 5 / as-published / dry / anneal not allowed

Before: pass 107, unknown 35 (hidden 4), fail 9. After: pass 109, unknown 35 (hidden 4), fail 8.

**Material verdicts (2).** PA-ESD: FAIL → PASS; PVC-P: new material, PASS.

**Listed or not (1).** PA-ESD: not listed → listed.

**Groups (1).** PA-ESD: fail → meets.

**Product the row shows (2).** PA-ESD: G064-01 → G064-03; PVC: G135-01 → G135-02.

### elongationXY >= 5 / as-published / dry / anneal allowed

Before: pass 108, unknown 34 (hidden 4), fail 9. After: pass 110, unknown 34 (hidden 4), fail 8.

**Material verdicts (2).** PA-ESD: FAIL → PASS; PVC-P: new material, PASS.

**Listed or not (1).** PA-ESD: not listed → listed.

**Groups (1).** PA-ESD: fail → meets.

**Product the row shows (2).** PA-ESD: G064-01 → G064-03; PVC: G135-01 → G135-02.

### elongationXY >= 5 / as-published / conditioned / anneal not allowed

Before: pass 5, unknown 146 (hidden 4), fail 0. After: pass 5, unknown 147 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### elongationXY >= 5 / as-published / conditioned / anneal allowed

Before: pass 7, unknown 144 (hidden 4), fail 0. After: pass 7, unknown 145 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### elongationXY >= 20 / comparable / dry / anneal not allowed

Before: pass 33, unknown 100 (hidden 4), fail 18. After: pass 33, unknown 101 (hidden 4), fail 18.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Groups (2).** PA-ESD: unlikely-to-meet → not-enough-data:likely; PVC: not-enough-data:likely → not-enough-data.

**Product the row shows (2).** PA-ESD: G064-01 → G064-03; PVC: G135-01 → G135-02.

**Product answers (1).** G081-03 (HIPS): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data.

**Likely tag (materials and products) (3).** PA-ESD: tagged likely; G081-03 (HIPS): no longer likely; PVC: no longer likely.

### elongationXY >= 20 / comparable / dry / anneal allowed

Before: pass 33, unknown 100 (hidden 4), fail 18. After: pass 33, unknown 101 (hidden 4), fail 18.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Groups (2).** PA-ESD: unlikely-to-meet → not-enough-data:likely; PVC: not-enough-data:likely → not-enough-data.

**Product the row shows (2).** PA-ESD: G064-01 → G064-03; PVC: G135-01 → G135-02.

**Product answers (1).** G081-03 (HIPS): UNKNOWN:not-enough-data:likely → UNKNOWN:not-enough-data.

**Likely tag (materials and products) (3).** PA-ESD: tagged likely; G081-03 (HIPS): no longer likely; PVC: no longer likely.

### elongationXY >= 20 / comparable / conditioned / anneal not allowed

Before: pass 0, unknown 151 (hidden 4), fail 0. After: pass 0, unknown 152 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### elongationXY >= 20 / comparable / conditioned / anneal allowed

Before: pass 1, unknown 150 (hidden 4), fail 0. After: pass 1, unknown 151 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### elongationXY >= 20 / as-published / dry / anneal not allowed

Before: pass 62, unknown 58 (hidden 4), fail 31. After: pass 63, unknown 58 (hidden 4), fail 31.

**Material verdicts (3).** PA-ESD: FAIL → PASS; PVC: PASS → FAIL; PVC-P: new material, PASS.

**Listed or not (2).** PA-ESD: not listed → listed; PVC: listed → not listed.

**Groups (2).** PA-ESD: fail → meets; PVC: meets → fail.

**Product the row shows (2).** PA-ESD: G064-01 → G064-03; PVC: G135-01 → G135-02.

### elongationXY >= 20 / as-published / dry / anneal allowed

Before: pass 62, unknown 59 (hidden 4), fail 30. After: pass 63, unknown 59 (hidden 4), fail 30.

**Material verdicts (3).** PA-ESD: FAIL → PASS; PVC: PASS → FAIL; PVC-P: new material, PASS.

**Listed or not (2).** PA-ESD: not listed → listed; PVC: listed → not listed.

**Groups (2).** PA-ESD: fail → meets; PVC: meets → fail.

**Product the row shows (2).** PA-ESD: G064-01 → G064-03; PVC: G135-01 → G135-02.

### elongationXY >= 20 / as-published / conditioned / anneal not allowed

Before: pass 0, unknown 151 (hidden 4), fail 0. After: pass 0, unknown 152 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### elongationXY >= 20 / as-published / conditioned / anneal allowed

Before: pass 1, unknown 150 (hidden 4), fail 0. After: pass 1, unknown 151 (hidden 4), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### elongationXY >= 100 / comparable / dry / anneal not allowed

Before: pass 19, unknown 112 (hidden 6), fail 20. After: pass 19, unknown 113 (hidden 6), fail 20.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Groups (2).** PA66: unlikely-to-meet → not-enough-data; PVC: not-enough-data:likely → unlikely-to-meet.

**Product the row shows (2).** PA-ESD: G064-01 → G064-03; PVC: G135-01 → G135-02.

**Product answers (3).** G052-02 (PA12): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G164-08 (PA66): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G109-01 (PETG-PTFE): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data.

**Likely tag (materials and products) (1).** PVC: no longer likely.

### elongationXY >= 100 / comparable / dry / anneal allowed

Before: pass 19, unknown 112 (hidden 6), fail 20. After: pass 19, unknown 113 (hidden 6), fail 20.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Groups (2).** PA66: unlikely-to-meet → not-enough-data; PVC: not-enough-data:likely → unlikely-to-meet.

**Product the row shows (2).** PA-ESD: G064-01 → G064-03; PVC: G135-01 → G135-02.

**Product answers (3).** G052-02 (PA12): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G164-08 (PA66): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G109-01 (PETG-PTFE): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data.

**Likely tag (materials and products) (1).** PVC: no longer likely.

### elongationXY >= 100 / comparable / conditioned / anneal not allowed

Before: pass 0, unknown 151 (hidden 6), fail 0. After: pass 0, unknown 152 (hidden 6), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### elongationXY >= 100 / comparable / conditioned / anneal allowed

Before: pass 1, unknown 150 (hidden 6), fail 0. After: pass 1, unknown 151 (hidden 6), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### elongationXY >= 100 / as-published / dry / anneal not allowed

Before: pass 34, unknown 78 (hidden 6), fail 39. After: pass 34, unknown 78 (hidden 6), fail 40.

**Material verdicts (2).** PVC: PASS → FAIL; PVC-P: new material, PASS.

**Listed or not (1).** PVC: listed → not listed.

**Groups (2).** PA66: unlikely-to-meet → not-enough-data; PVC: meets → fail.

**Product the row shows (1).** PVC: G135-01 → G135-02.

**Product answers (2).** G164-08 (PA66): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G109-01 (PETG-PTFE): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data.

### elongationXY >= 100 / as-published / dry / anneal allowed

Before: pass 34, unknown 79 (hidden 6), fail 38. After: pass 34, unknown 79 (hidden 6), fail 39.

**Material verdicts (2).** PVC: PASS → FAIL; PVC-P: new material, PASS.

**Listed or not (1).** PVC: listed → not listed.

**Groups (2).** PA66: unlikely-to-meet → not-enough-data; PVC: meets → fail.

**Product the row shows (1).** PVC: G135-01 → G135-02.

**Product answers (2).** G164-08 (PA66): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data; G109-01 (PETG-PTFE): UNKNOWN:unlikely-to-meet → UNKNOWN:not-enough-data.

### elongationXY >= 100 / as-published / conditioned / anneal not allowed

Before: pass 0, unknown 151 (hidden 6), fail 0. After: pass 0, unknown 152 (hidden 6), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### elongationXY >= 100 / as-published / conditioned / anneal allowed

Before: pass 1, unknown 150 (hidden 6), fail 0. After: pass 1, unknown 151 (hidden 6), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### hdt045 >= 60 / comparable / dry / anneal not allowed

Before: pass 96, unknown 53 (hidden 19), fail 2. After: pass 96, unknown 54 (hidden 20), fail 2.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### hdt045 >= 60 / comparable / dry / anneal allowed

Before: pass 96, unknown 53 (hidden 19), fail 2. After: pass 96, unknown 54 (hidden 20), fail 2.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### hdt045 >= 60 / comparable / conditioned / anneal not allowed

Before: pass 3, unknown 148 (hidden 19), fail 0. After: pass 3, unknown 149 (hidden 20), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### hdt045 >= 60 / comparable / conditioned / anneal allowed

Before: pass 3, unknown 148 (hidden 19), fail 0. After: pass 3, unknown 149 (hidden 20), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### hdt045 >= 60 / as-published / dry / anneal not allowed

Before: pass 99, unknown 50 (hidden 19), fail 2. After: pass 99, unknown 51 (hidden 20), fail 2.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### hdt045 >= 60 / as-published / dry / anneal allowed

Before: pass 99, unknown 50 (hidden 19), fail 2. After: pass 99, unknown 51 (hidden 20), fail 2.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### hdt045 >= 60 / as-published / conditioned / anneal not allowed

Before: pass 3, unknown 148 (hidden 19), fail 0. After: pass 3, unknown 149 (hidden 20), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### hdt045 >= 60 / as-published / conditioned / anneal allowed

Before: pass 3, unknown 148 (hidden 19), fail 0. After: pass 3, unknown 149 (hidden 20), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### hdt045 >= 90 / comparable / dry / anneal not allowed

Before: pass 72, unknown 75 (hidden 19), fail 4. After: pass 72, unknown 76 (hidden 20), fail 4.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Groups (1).** SBC: not-enough-data → unlikely-to-meet.

**Product the row shows (2).** PVA: G075-08 → G075-03; PVC: G135-01 → G135-02.

**Product answers (1).** G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### hdt045 >= 90 / comparable / dry / anneal allowed

Before: pass 74, unknown 73 (hidden 19), fail 4. After: pass 74, unknown 74 (hidden 20), fail 4.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Groups (1).** SBC: not-enough-data → unlikely-to-meet.

**Product the row shows (2).** PVA: G075-08 → G075-03; PVC: G135-01 → G135-02.

**Product answers (1).** G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### hdt045 >= 90 / comparable / conditioned / anneal not allowed

Before: pass 2, unknown 149 (hidden 19), fail 0. After: pass 2, unknown 150 (hidden 20), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### hdt045 >= 90 / comparable / conditioned / anneal allowed

Before: pass 2, unknown 149 (hidden 19), fail 0. After: pass 2, unknown 150 (hidden 20), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### hdt045 >= 90 / as-published / dry / anneal not allowed

Before: pass 74, unknown 71 (hidden 19), fail 6. After: pass 74, unknown 72 (hidden 20), fail 6.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Groups (1).** SBC: not-enough-data → unlikely-to-meet.

**Product the row shows (2).** PVA: G075-08 → G075-03; PVC: G135-01 → G135-02.

**Product answers (1).** G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### hdt045 >= 90 / as-published / dry / anneal allowed

Before: pass 76, unknown 69 (hidden 19), fail 6. After: pass 76, unknown 70 (hidden 20), fail 6.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Groups (1).** SBC: not-enough-data → unlikely-to-meet.

**Product the row shows (2).** PVA: G075-08 → G075-03; PVC: G135-01 → G135-02.

**Product answers (1).** G174-01 (SBC): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### hdt045 >= 90 / as-published / conditioned / anneal not allowed

Before: pass 2, unknown 149 (hidden 19), fail 0. After: pass 2, unknown 150 (hidden 20), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### hdt045 >= 90 / as-published / conditioned / anneal allowed

Before: pass 2, unknown 149 (hidden 19), fail 0. After: pass 2, unknown 150 (hidden 20), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### hdt045 >= 120 / comparable / dry / anneal not allowed

Before: pass 47, unknown 93 (hidden 19), fail 11. After: pass 47, unknown 94 (hidden 20), fail 11.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (2).** PVA: G075-08 → G075-03; PVC: G135-01 → G135-02.

**Product answers (1).** G082-11 (PP): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### hdt045 >= 120 / comparable / dry / anneal allowed

Before: pass 49, unknown 92 (hidden 19), fail 10. After: pass 49, unknown 93 (hidden 20), fail 10.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (2).** PVA: G075-08 → G075-03; PVC: G135-01 → G135-02.

**Product answers (1).** G082-11 (PP): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### hdt045 >= 120 / comparable / conditioned / anneal not allowed

Before: pass 2, unknown 149 (hidden 19), fail 0. After: pass 2, unknown 150 (hidden 20), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### hdt045 >= 120 / comparable / conditioned / anneal allowed

Before: pass 2, unknown 149 (hidden 19), fail 0. After: pass 2, unknown 150 (hidden 20), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### hdt045 >= 120 / as-published / dry / anneal not allowed

Before: pass 49, unknown 89 (hidden 19), fail 13. After: pass 49, unknown 90 (hidden 20), fail 13.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (2).** PVA: G075-08 → G075-03; PVC: G135-01 → G135-02.

**Product answers (1).** G082-11 (PP): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### hdt045 >= 120 / as-published / dry / anneal allowed

Before: pass 51, unknown 88 (hidden 19), fail 12. After: pass 51, unknown 89 (hidden 20), fail 12.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (2).** PVA: G075-08 → G075-03; PVC: G135-01 → G135-02.

**Product answers (1).** G082-11 (PP): UNKNOWN:not-enough-data → UNKNOWN:unlikely-to-meet.

### hdt045 >= 120 / as-published / conditioned / anneal not allowed

Before: pass 2, unknown 149 (hidden 19), fail 0. After: pass 2, unknown 150 (hidden 20), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.

### hdt045 >= 120 / as-published / conditioned / anneal allowed

Before: pass 2, unknown 149 (hidden 19), fail 0. After: pass 2, unknown 150 (hidden 20), fail 0.

**Material verdicts (1).** PVC-P: new material, UNKNOWN.

**Product the row shows (1).** PVC: G135-01 → G135-02.
