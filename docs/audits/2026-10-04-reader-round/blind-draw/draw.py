#!/usr/bin/env python3
"""A seeded draw of the reader round's records for a blind check on their page images.

Every measurement, profile and page statement the round added or changed (against main before the round, 138ebc9) is a
fact; 16 measurements, 16 profiles and 8 page statements are drawn with the seed given, leaving out any record an earlier
draw already took. Writes sample-<seed>.csv beside this file.

    python3 docs/audits/2026-10-04-reader-round/blind-draw/draw.py 20261006 [sample.csv ...]
"""
import csv, io, random, subprocess, sys
from pathlib import Path

HERE = Path(__file__).parent
BASE = '138ebc9'
seed = int(sys.argv[1]); taken = set()
for f in sys.argv[2:]:
    taken |= {r['Record'] for r in csv.DictReader(open(HERE / f))}

def load(ref, t):
    txt = subprocess.run(['git', 'show', f'{ref}:data/tables/{t}.csv'], capture_output=True, text=True).stdout if ref else open(f'data/tables/{t}.csv').read()
    return list(csv.DictReader(io.StringIO(txt)))

S = {r['SourceID']: r for r in load(None, 'sources')}
facts = []
old = {r['MeasurementID']: r for r in load(BASE, 'measurements')}
for r in load(None, 'measurements'):
    if r['Data status'].startswith(('Retired', 'Unresolved')): continue
    o = old.get(r['MeasurementID'])
    if o is None:
        facts.append(('measurements', r['MeasurementID'], 'added', f"{r['Property']} = {r['Raw value']} (direction {r['Direction']}; specimen {r['Specimen type']}; notch {r['Notch']}; standard/load {r['Standard / load']}; moisture {r['Moisture condition']}; post-processing {r['Post-processing']})", r['SourceID'], r['Locator'], r['GradeID']))
    else:
        cols = [c for c in ['Raw value', 'Direction', 'Specimen type', 'Moisture condition', 'Post-processing', 'Notch', 'Operator', 'Standard / load', 'GradeID', 'Data status'] if r[c] != o[c]]
        if cols: facts.append(('measurements', r['MeasurementID'], 'changed', '; '.join(f'{c}: {o[c]} -> {r[c]}' for c in cols), r['SourceID'], r['Locator'], r['GradeID']))
cols = ['Nozzle °C', 'Bed °C', 'Chamber °C', 'Enclosure', 'Drying', 'Plate', 'Nozzle diameter', 'Abrasion / clogging']
old = {r['ProfileID']: r for r in load(BASE, 'profiles')}
for r in load(None, 'profiles'):
    if r['Profile'].startswith('Retired'): continue
    o = old.get(r['ProfileID'])
    if o is None: facts.append(('profiles', r['ProfileID'], 'added', '; '.join(f'{c}: {r[c]}' for c in cols if r[c] != 'Not published'), r['SourceID'], r['Locator'], r['GradeID']))
    else:
        d = [c for c in cols if r[c] != o[c]]
        if d: facts.append(('profiles', r['ProfileID'], 'changed', '; '.join(f'{c}: {o[c]} -> {r[c]}' for c in d), r['SourceID'], r['Locator'], r['GradeID']))
old = {r['PageContextID'] for r in load(BASE, 'page_context')}
for r in load(None, 'page_context'):
    if r['PageContextID'] in old: continue
    facts.append(('page_context', r['PageContextID'], 'added', f"applies to {r['Applies to']}: \"{r['Statement'][:160]}\" -> specimen {r['Specimen type']}; moisture {r['Moisture state']}; post-processing {r['Post-processing state']}; standard {r['Standard']}", r['SourceID'], f"p. {r['Page']}: {r['Locator']}", ''))
random.seed(seed)
pick = []
for t, n in [('measurements', 16), ('profiles', 16), ('page_context', 8)]:
    pool = [f for f in facts if f[0] == t and f[1] not in taken]
    pick += random.sample(pool, n)
out = HERE / f'sample-{seed}.csv'
with open(out, 'w', newline='') as fh:
    w = csv.writer(fh, lineterminator='\n'); w.writerow(['Draw', 'Table', 'Record', 'Change', 'Fact', 'SourceID', 'SHA256', 'Locator', 'GradeID'])
    for i, f in enumerate(pick, 1): w.writerow([i, f[0], f[1], f[2], f[3], f[4], S[f[4]]['SHA256'], f[5], f[6]])
print(len(facts), 'facts;', 'wrote', out)
