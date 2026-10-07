#!/usr/bin/env python3
"""Quality round 2026-10-07: the readers' verdicts, joined to the queue and sorted into the classes the migrations
apply, for Opus to decide. Writes decisions/<class>.csv and prints counts. Nothing in data/ changes here.

  python3 docs/audits/2026-10-07-quality-round/judge.py
"""
import csv, glob, os, collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../..'))
rd = lambda p: list(csv.DictReader(open(p, newline='', encoding='utf-8')))
queue = {r['Task']: r for r in rd(os.path.join(HERE, 'read/queue.csv'))}
verdicts = [v for f in sorted(glob.glob(os.path.join(HERE, 'read/verdicts-*.csv'))) for v in rd(f)]
profiles = {r['ProfileID']: r for r in rd(os.path.join(ROOT, 'data/tables/profiles.csv'))}
import json
compiled = {m['id']: m for m in json.load(open(os.path.join(ROOT, 'dist/db.json')))['measurements']}
# A row's cell a page statement already gives the record in the build (page_context.csv, D116) needs no fix.
INHERITED = {'Specimen type': 'specimenType', 'Moisture state': 'moistureState', 'Moisture condition': 'moistureState', 'Post-processing state': 'postProcessingState',
  'Post-processing': 'postProcessingState', 'Standards': 'standards', 'Standard / load': 'standards', 'Test temperature °C': 'testTemperatureC', 'Test temperature': 'testTemperatureC'}
read_tasks = {v['Task'] for v in verdicts}
missing = [t for t in queue if t not in read_tasks]

# A profile from Spectrum's portfolio stays as read: its product's own sheet answers for it (OPEN-PROBLEMS §32).
PORTFOLIO = ('R-SPECTRUM-PORTFOLIO-',)
out = collections.defaultdict(list)
for v in verdicts:
    q = queue.get(v['Task'], {})
    row = {**{k: q.get(k, '') for k in ('Item', 'Kind', 'Tier', 'Table', 'Record', 'PairRecord', 'GradeID', 'SourceID', 'Page', 'Leverage')}, **{k: v.get(k, '') for k in ('Task', 'decision', 'column', 'expect', 'value', 'quote', 'reason', 'cause', 'class', 'confidence', 'reader')}}
    d = v['decision']
    if q.get('Kind') == 'copy-pair': out['A-copy-pairs'].append(row); continue
    if q.get('Kind') == 'source-pair': out['B-source-pairs'].append(row); continue
    if q.get('Kind') in ('identity', 'readings'): out['E-item6-readings'].append(row); continue
    if d == 'keep':
        if v.get('class') in ('variant', 'implausible'): out['D-classes-kept'].append(row)
        continue
    if q.get('Table') == 'profiles' and profiles.get(q.get('Record', ''), {}).get('SourceID', '').startswith(PORTFOLIO):
        out['skip-portfolio'].append(row); continue
    if d == 'fix' and q.get('Table') == 'measurements' and INHERITED.get(v.get('column')) in (compiled.get(q.get('Record'), {}).get('pageContext') or {}):
        out['skip-inherited'].append(row); continue
    if d == 'fix': out['C-fixes'].append(row)
    elif d == 'flag': out['D-flags'].append(row)
    elif d == 'quarantine': out['D-quarantine'].append(row)
    else: out['other'].append(row)

os.makedirs(os.path.join(HERE, 'decisions'), exist_ok=True)
cols = ['Task', 'Item', 'Kind', 'Tier', 'Table', 'Record', 'PairRecord', 'GradeID', 'SourceID', 'Page', 'Leverage', 'decision', 'column', 'expect', 'value', 'quote', 'reason', 'cause', 'class', 'confidence', 'reader']
for k, rows in out.items():
    with open(os.path.join(HERE, f'decisions/{k}.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=cols); w.writeheader(); w.writerows(rows)
print(f'{len(verdicts)} verdict lines on {len(read_tasks)} of {len(queue)} tasks; unread: {len(missing)}')
print({k: len(v) for k, v in out.items()})
print('decisions:', dict(collections.Counter(v['decision'] for v in verdicts)))
