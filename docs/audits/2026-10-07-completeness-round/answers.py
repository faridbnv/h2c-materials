#!/usr/bin/env python3
"""The answers the round moved: each template's verdict per material, and its products' counts, against the baseline
snapshot frozen before anything changed (baseline/snapshot/templates.csv).

  python3 docs/audits/2026-10-07-completeness-round/answers.py
"""
import csv, os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../..'))
def load(p):
    rows = list(csv.reader(open(p, newline='', encoding='utf-8')))
    head, body = rows[0], rows[1:]
    return head, {(r[0], r[1], r[2]): r for r in body}
head, before = load(os.path.join(HERE, 'baseline/snapshot/templates.csv'))
_, after = load(os.path.join(ROOT, 'build/snapshot/templates.csv'))
v = head.index('Verdict') if 'Verdict' in head else 4
verdicts, counts = [], 0
for k in sorted(set(before) | set(after)):
    b, a = before.get(k), after.get(k)
    if not b or not a: verdicts.append((k, b and b[v], a and a[v])); continue
    if b[v] != a[v]: verdicts.append((k, b[v], a[v]))
    elif b != a: counts += 1
print(f'{len(verdicts)} material verdict(s) moved; {counts} row(s) where only product counts or the typical product moved')
for k, b, a in verdicts: print(f'  {k[0]} | {k[1]} | {k[2]} {k[3] if len(k) > 3 else ""}: {b} -> {a}')
