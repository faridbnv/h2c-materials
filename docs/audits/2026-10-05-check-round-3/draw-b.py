#!/usr/bin/env python3
"""Check round 3's sealed draw (Draw B): records that decide answers, drawn before the round reads anything.

From TARGETS.csv (targets.mjs), with the seed given: 30 values that are a material's typical value, 30 print-gate cells
of products' own profiles, and 40 other product values, a third each from single-table, x-y-z and multi-product sheets
(as many as there are). The draw is written now and read only at the end of the round, by a reader who has not seen the
round's queue, so its error rate measures what decides, and its misses measure what the round's own checks did not
choose. Each row states the record as the tables hold it at the freeze; the reader says whether its page prints that.

    python3 docs/audits/2026-10-05-check-round-3/draw-b.py 20261005
"""
import csv, random, sys
from pathlib import Path

HERE = Path(__file__).parent
seed = int(sys.argv[1])
T = list(csv.DictReader(open(HERE / 'TARGETS.csv')))
M = {r['MeasurementID']: r for r in csv.DictReader(open('data/tables/measurements.csv'))}
P = {r['ProfileID']: r for r in csv.DictReader(open('data/tables/profiles.csv'))}
S = {r['SourceID']: r for r in csv.DictReader(open('data/tables/sources.csv'))}
G = {r['GradeID']: r for r in csv.DictReader(open('data/tables/grades.csv'))}

def fact(t):
    if t['Kind'] == 'value':
        r = M[t['Record']]
        return (f"{r['Property']} = {r['Raw value']} {r['Raw unit']} (direction {r['Direction']}; specimen {r['Specimen type']}; "
                f"notch {r['Notch']}; standard/load {r['Standard / load']}; test temperature {r['Test temperature']}; "
                f"moisture {r['Moisture condition']}; post-processing {r['Post-processing']}; print parameters {r['Specimen / print parameters']})")
    r = P[t['Record']]
    return f"{t['Field']} = {r[t['Field']]} (profile {r['Profile']})"

random.seed(seed)
pick = []
typical = [t for t in T if t['Kind'] == 'value' and t['Typical'] == 'yes']
pick += [('typical value', t) for t in random.sample(typical, 30)]
gates = [t for t in T if t['Kind'] == 'gate']
pick += [('gate cell', t) for t in random.sample(gates, 30)]
taken = {t['Record'] for _, t in pick}
rest = [t for t in T if t['Kind'] == 'value' and t['Typical'] == 'no' and t['Record'] not in taken]
for kind, n in [('multi-product', 13), ('x-y-z', 13), ('single-table', 14)]:
    pool = [t for t in rest if t['SheetType'] == kind]
    pick += [(f'value, {kind} sheet', t) for t in random.sample(pool, min(n, len(pool)))]

out = HERE / f'draw-b-{seed}.csv'
with open(out, 'w', newline='') as fh:
    w = csv.writer(fh, lineterminator='\n')
    w.writerow(['Draw', 'Stratum', 'TargetID', 'Table', 'Record', 'Product', 'Fact', 'SourceID', 'SHA256', 'Locator', 'GradeID'])
    for i, (stratum, t) in enumerate(pick, 1):
        g = G.get(t['GradeID'], {})
        w.writerow([i, stratum, t['TargetID'], 'measurements' if t['Kind'] == 'value' else 'profiles', t['Record'],
                    f"{g.get('Manufacturer', '')} {g.get('Product', '')}".strip(), fact(t), t['SourceID'], S[t['SourceID']]['SHA256'], t['Locator'], t['GradeID']])
print(len(pick), 'records; wrote', out)
