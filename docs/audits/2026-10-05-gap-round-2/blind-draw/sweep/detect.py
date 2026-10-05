#!/usr/bin/env python3
"""Gap round 2, phase 7: the families the blind draw of seed 20261007 named, looked for over every registered source.

Writes candidates.csv beside this file; nothing here changes data. Families:

  hardened      a profile whose sheet prints "hardened" (or a steel, wear-resistant or abrasion-resistant nozzle) on its
                nozzle-diameter or nozzle line while the profile's Hardened nozzle is Not published (P0732)
  drying-need   a profile typed as requiring drying whose sheet says drying is not needed or optional, or whose drying
                time starts at zero (P1893)
  bars-printed  a measurement with no print parameters whose sheet says how its samples were printed in one sentence
                ("Samples were printed with 0.010 in. layer height", V014276)
  conditioned   a mechanical measurement whose sheet's specimen block says "All specimens were conditioned at room
                temperature for 24h prior to testing" while its Moisture condition is Not published (V003664)

    python3 docs/audits/2026-10-05-gap-round-2/blind-draw/sweep/detect.py
"""
import csv, json, os, re, collections
from pathlib import Path

HERE = Path(__file__).parent
os.chdir(HERE.parents[4])
rows = lambda t: list(csv.DictReader(open(f'data/tables/{t}.csv')))
S = {s['SourceID']: s for s in rows('sources')}
G = {g['GradeID']: g for g in rows('grades')}
P = [p for p in rows('profiles') if not p['Profile'].startswith('Retired')]
M = [m for m in rows('measurements') if m['Data status'].startswith('Published')]
cache = {}
def pages(sid):
    sha = S.get(sid, {}).get('SHA256', '')
    if sha not in cache:
        f = Path(f'.cache/text/{sha}.json')
        cache[sha] = [(p.get('page'), [l['text'] for l in p['lines']]) for p in json.load(open(f))['pages']] if sha and f.exists() else []
    return cache[sha]
out = []
def add(family, table, rid, sid, page, held, line, hint=''):
    g = G.get(rid_grade.get(rid, ''), {})
    out.append({'family': family, 'table': table, 'record': rid, 'SourceID': sid, 'SHA256': S.get(sid, {}).get('SHA256', ''), 'page': page,
                'grade': f"{g.get('Manufacturer', '')} {g.get('Product name', '')}".strip(), 'held': held, 'line': line[:220], 'hint': hint})
rid_grade = {p['ProfileID']: p['GradeID'] for p in P} | {m['MeasurementID']: m['GradeID'] for m in M}

HARD = re.compile(r'hardened|wear[- ]resistant|abrasion[- ]resistant|steel nozzle|ruby|tungsten', re.I)
for p in P:
    if p['Hardened nozzle'] not in ('Not published', ''): continue
    for pg, L in pages(p['SourceID']):
        for k, x in enumerate(L):
            ctx = ' '.join(L[max(0, k - 1):k + 2])
            if re.search(r'nozzle|düse|buse|喷嘴', ctx, re.I) and HARD.search(x):
                add('hardened', 'profiles', p['ProfileID'], p['SourceID'], pg, f"Nozzle diameter {p['Nozzle diameter']}; Abrasion {p['Abrasion / clogging'][:60]}", x); break
        else: continue
        break

NOT = re.compile(r'not\s+(?:be\s+)?(?:necessary|needed|required)|no\s+(?:pre-?\s*)?drying|(?:do|does)\s+not\s+(?:recommend|require|need)\s+(?:any\s+)?(?:pre-?\s*)?dry|optional|only\s+if|if\s+(?:wet|damp|moist)|in\s+case', re.I)
ZERO = re.compile(r'\b0\s*[-–~]\s*\d+(?:[.,]\d+)?\s*(?:h|hours?|hrs)\b', re.I)
for p in P:
    if p['Drying need'] != 'required': continue
    hit = None
    if ZERO.search(p['Drying']): hit = (None, p['Drying'], 'drying time starts at zero')
    for pg, L in pages(p['SourceID']):
        if hit: break
        for k, x in enumerate(L):
            ctx = ' '.join(L[max(0, k - 1):k + 2])
            if re.search(r'dry|trock|sech|干燥|烘', ctx, re.I) and NOT.search(x) and re.search(r'dry|trock|sech|干燥|烘', x, re.I):
                hit = (pg, x, 'the sheet says drying is not needed or optional'); break
    if hit: add('drying-need', 'profiles', p['ProfileID'], p['SourceID'], hit[0], f"{p['Drying']} (need {p['Drying need']})", hit[1], hit[2])

ONE = re.compile(r'(?:samples|specimens|parts|bars)\s+(?:were|are)\s+(?:printed|built|produced)\s+(?:with|on|at|using)', re.I)
by_src = collections.defaultdict(list)
for m in M:
    if m['Specimen / print parameters'] == 'Not published' and m['Specimen type'] in ('Printed specimen', 'Not published'): by_src[m['SourceID']].append(m)
for sid, ms in by_src.items():
    for pg, L in pages(sid):
        x = next((l for l in L if ONE.search(l)), None)
        if x:
            for m in ms: add('bars-printed', 'measurements', m['MeasurementID'], sid, pg, f"{m['Property']} = {m['Raw value']}; {m['Locator'][:60]}", x)
            break

COND = re.compile(r'All specimens were conditioned at room temperature for 24 ?h prior to testing', re.I)
MECH = re.compile(r'tensile|elongation|flexural|bending|impact|charpy|izod|modulus|yield|strain|stress|hardness', re.I)
for sid in sorted({m['SourceID'] for m in M}):
    hit = next(((pg, x) for pg, L in pages(sid) for x in L if COND.search(x)), None)
    if not hit: continue
    for m in M:
        if m['SourceID'] == sid and m['Moisture condition'] == 'Not published' and m['Specimen type'] in ('Printed specimen', 'Not published') and MECH.search(m['Property']):
            add('conditioned', 'measurements', m['MeasurementID'], sid, hit[0], f"{m['Property']}; {m['Locator'][:60]}", hit[1])

with open(HERE / 'candidates.csv', 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=['family', 'table', 'record', 'SourceID', 'SHA256', 'page', 'grade', 'held', 'line', 'hint'], lineterminator='\n')
    w.writeheader(); w.writerows(out)
print(len(out), 'candidates:', dict(collections.Counter(r['family'] for r in out)), 'on', len({r['SourceID'] for r in out}), 'sources')
