#!/usr/bin/env python3
"""Check round 3: the 1,792 second-read tasks gap round 2 left outstanding, joined to what decides (2026-10-05).

A task (reconcile/final-3/second-read/tasks.csv) names a source, page, product, field and label. It can change an answer
only when its field is a headline's property (headline_definitions.csv, Value properties) or a print gate (nozzle, bed,
chamber, drying, enclosure, hardened nozzle). Every other task would confirm or add a value no answer reads, and is closed
by this join. The rest join the round's reading queue: second-reads.csv beside this file, with the class each falls in.

    python3 docs/audits/2026-10-05-check-round-3/second-reads.py
"""
import csv, collections, re
from pathlib import Path

HERE = Path(__file__).parent
T = list(csv.DictReader(open('docs/audits/2026-10-05-gap-round-2/reconcile/final-3/second-read/tasks.csv')))
K = list(csv.DictReader(open(HERE / 'TARGETS.csv')))
props = {p.strip() for h in csv.DictReader(open('data/tables/headline_definitions.csv')) for p in re.split(r';\s*', h['Value properties']) if p.strip() not in ('', 'Not applicable')}
GATE = {'nozzle': 'Nozzle °C', 'bed': 'Bed °C', 'chamber': 'Chamber °C', 'drying': 'Drying', 'enclosure': 'Enclosure', 'hardened_nozzle': 'Abrasion / clogging'}
deciding = {(k['SourceID'], k['GradeID'], k['Field']) for k in K}
classes, queue = collections.Counter(), []
for t in T:
    field = t['field'] if t['kind'] == 'value' else GATE.get(t['field'])
    if t['kind'] == 'value' and t['field'] not in props: c = 'closed: not a headline property'
    elif t['kind'] == 'setting' and not field: c = 'closed: a setting no gate reads (speed, plate, fan, nozzle size, other)'
    elif (t['source_id'], t['product'], field) in deciding: c = 'queue: the same source, product and field as a deciding record'
    else: c = 'queue: a headline property or gate the product may not yet hold from this source'
    classes[c] += 1
    if c.startswith('queue'): queue.append({**t, 'Class': c})
with open(HERE / 'second-reads.csv', 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=[*T[0].keys(), 'Class'], lineterminator='\n'); w.writeheader(); w.writerows(queue)
for c, n in classes.most_common(): print(f'{n:5d}  {c}')
