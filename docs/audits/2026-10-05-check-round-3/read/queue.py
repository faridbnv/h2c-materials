#!/usr/bin/env python3
"""Check round 3's reading queue (2026-10-05): what the code could not confirm, by what it decides.

Inputs: TARGETS.csv (what decides), ocr/compare.csv (the text-layer pairing check, compare.mjs --source text) and
build/reports/leverage/leverage.csv (scripts/audit/leverage.mjs: would a plausible misreading flip an answer).
  tier 1   every target the comparison did not confirm and whose misreading would flip an answer: read in full;
  tier 1b  a sample of 60 targets the comparison confirmed and that would flip an answer: the comparison's precision
           where it matters most;
  tier 2   a sample of 80 unconfirmed targets whose misreading changes only a print state the page shows;
  tier 3   a sample of 80 unconfirmed targets that decide nothing.
A sampled tier is read in full only if its sample finds a deciding error. Records of the sealed draw (draw-b-*.csv) are
not excluded: the queue is chosen by code alone, and the draw measures the round's result. Writes queue.csv and
chunk-NN.csv (one source's items stay in one chunk) beside this file.

    python3 docs/audits/2026-10-05-check-round-3/read/queue.py
"""
import csv, random, re
from pathlib import Path

HERE = Path(__file__).parent
P = HERE.parent
T = {r['TargetID']: r for r in csv.DictReader(open(P / 'TARGETS.csv'))}
C = {r['TargetID']: r for r in csv.DictReader(open(P / 'ocr/compare.csv'))}
L = {r['TargetID']: r for r in csv.DictReader(open('build/reports/leverage/leverage.csv'))}
M = {r['MeasurementID']: r for r in csv.DictReader(open('data/tables/measurements.csv'))}
PR = {r['ProfileID']: r for r in csv.DictReader(open('data/tables/profiles.csv'))}
PG = {r['PrintGuideID']: r for r in csv.DictReader(open('data/tables/print_guide.csv'))}
S = {r['SourceID']: r for r in csv.DictReader(open('data/tables/sources.csv'))}
G = {r['GradeID']: r for r in csv.DictReader(open('data/tables/grades.csv'))}
UNCONFIRMED = {'elsewhere', 'label-not-found', 'absent', 'row-only', 'no-ocr'}

def leverage(tid):
    l = L.get(tid, {})
    if l.get('Leverage') != 'yes': return 'none'
    return 'answer' if l.get('Basis') in ('material', 'product') else 'print'

tiers = {'1': [], '1b': [], '2': [], '3': []}
for tid, t in T.items():
    out, lev = C[tid]['Outcome'], leverage(tid)
    if out in UNCONFIRMED:
        tiers['1' if lev == 'answer' else '2' if lev == 'print' else '3'].append(tid)
    elif out == 'pairing-confirmed' and lev == 'answer':
        tiers['1b'].append(tid)
random.seed(20261005)
pick = [(tid, '1') for tid in tiers['1']]
for tier, n in [('1b', 60), ('2', 80), ('3', 80)]:
    pick += [(tid, tier) for tid in random.sample(sorted(tiers[tier]), min(n, len(tiers[tier])))]

def held(t):
    if t['Kind'] == 'value':
        m = M[t['Record']]
        return (f"{m['Property']} = {m['Raw value']} (direction {m['Direction']}; specimen {m['Specimen type']}; notch {m['Notch']}; "
                f"standard/load {m['Standard / load']}; test temperature {m['Test temperature']}; moisture {m['Moisture condition']} [{m['Moisture state']}]; "
                f"post-processing {m['Post-processing']} [{m['Post-processing state']}])")
    row = PR[t['Record']] if t['Kind'] == 'gate' else PG[t['Record']]
    return f"{t['Field']} = {row[t['Field']]}"

rows = []
for tid, tier in pick:
    t, c = T[tid], C[tid]
    g = G.get(t['GradeID'], {})
    rows.append({'Item': tid, 'Tier': tier, 'Kind': t['Kind'], 'Table': {'value': 'measurements', 'gate': 'profiles', 'guide': 'print_guide'}[t['Kind']],
                 'Record': t['Record'], 'Field': t['Field'], 'GradeID': t['GradeID'], 'Product': f"{g.get('Manufacturer', '')} {g.get('Product name', '')}".strip(),
                 'SourceID': t['SourceID'], 'SHA256': S[t['SourceID']]['SHA256'], 'Page': (re.search(r'p\.\s*(\d+)', t['Locator']) or [None, ''])[1],
                 'Locator': t['Locator'], 'Held': held(t), 'Check': f"{c['Outcome']}: {c['Note']}"[:300], 'Leverage': L.get(tid, {}).get('Why', '')[:200]})
rows.sort(key=lambda r: (r['SourceID'], r['Page'], r['Item']))
fields = list(rows[0].keys())
with open(HERE / 'queue.csv', 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=fields, lineterminator='\n'); w.writeheader(); w.writerows(rows)
chunks, cur, last = [], [], None
for r in rows:
    if len(cur) >= 55 and r['SourceID'] != last: chunks.append(cur); cur = []
    cur.append(r); last = r['SourceID']
if cur: chunks.append(cur)
for i, ch in enumerate(chunks, 1):
    with open(HERE / f'chunk-{i:02d}.csv', 'w', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=fields, lineterminator='\n'); w.writeheader(); w.writerows(ch)
print({k: len(v) for k, v in tiers.items()}, '->', len(rows), 'items in', len(chunks), 'chunks;', len({r['SourceID'] for r in rows}), 'sources')
