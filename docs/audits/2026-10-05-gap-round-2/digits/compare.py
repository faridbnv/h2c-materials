#!/usr/bin/env python3
"""Gap round 2, phase 3d: numbers a text layer may print wrong, found by reading the page a second way.

Bambu Lab's PLA Pure and PC sheets print digits in their text layer that the page does not show ("55 - 69" for 35 - 65,
m343, m353). For every held value and profile cell of the documents in bambu-docs.csv and flagged-docs.csv, each number
is looked for on its page in the text layer and in the optical reading (.cache/ocr-text, both page-segmentation modes).
A number the text layer prints and the optical reading does not is a suspect, written to suspects.csv with the optical
line that holds the same label, for a reader to settle on the page image. Nothing here changes data.

    python3 docs/audits/2026-10-05-gap-round-2/digits/compare.py
"""
import csv, json, os, re
from pathlib import Path

HERE = Path(__file__).parent
os.chdir(HERE.parents[3])
docs = {r['sha']: r['SourceID'] for f in ('bambu-docs.csv', 'flagged-docs.csv') for r in csv.DictReader(open(HERE / f))}
by_source = {v: k for k, v in docs.items()}
NUM = re.compile(r'\d+(?:[.,]\d+)?')
norm = lambda n: n.replace(',', '.').rstrip('0').rstrip('.') if '.' in n.replace(',', '.') else n

def numbers(text):
    return {norm(n) for n in NUM.findall(text or '')}

def pages(path, alt=False):
    if not path.exists(): return None
    d = json.load(open(path))
    out = {}
    for p in d['pages']:
        lines = [l['text'] for l in p['lines']]
        if alt: lines += [l['text'] for a in (p.get('alt') or []) for l in (a.get('lines', []) if isinstance(a, dict) else [])]
        out[p.get('page')] = lines
    return out

rows = []
M = [m for m in csv.DictReader(open('data/tables/measurements.csv')) if m['Data status'].startswith('Published') and m['SourceID'] in by_source]
P = [p for p in csv.DictReader(open('data/tables/profiles.csv')) if not p['Profile'].startswith('Retired') and p['SourceID'] in by_source]
items = [('measurements', m['MeasurementID'], m['SourceID'], m['Locator'], m['Property'], m['Raw value']) for m in M]
items += [('profiles', p['ProfileID'], p['SourceID'], p['Locator'], col, p[col]) for p in P for col in ('Nozzle °C', 'Bed °C', 'Chamber °C', 'Drying') if p[col] not in ('Not published', '')]
for table, rid, sid, loc, field, raw in items:
    sha = by_source[sid]
    tx, oc = pages(Path(f'.cache/text/{sha}.json')), pages(Path(f'.cache/ocr-text/{sha}.json'), alt=True)
    if not tx or not oc: continue
    m = re.search(r'p\.\s*(\d+)', loc or '')
    pg = [int(m.group(1))] if m else list(tx)
    for n in numbers(raw):
        if len(n.replace('.', '')) < 2: continue
        in_tx = any(n in numbers(' '.join(tx.get(p, []))) for p in pg)
        # The optical reading reads "±" as "4" or "+" and runs a value into its tolerance ("14.84+4.2" for 14.8 ± 4.2), so a
        # number counts as read when its digits stand anywhere in the page's optical digit stream.
        digits = n.replace('.', '')
        in_oc = any(n in numbers(' '.join(oc.get(p, []))) or digits in re.sub(r'\D', '', ' '.join(oc.get(p, []))) for p in pg)
        if in_tx and not in_oc:
            label = re.split(r'[(:]', field)[0].split()[0] if field else ''
            seen = [l for p in pg for l in oc.get(p, []) if label and label.lower()[:5] in l.lower()][:2]
            rows.append({'table': table, 'record': rid, 'SourceID': sid, 'SHA256': sha, 'page': pg[0] if len(pg) == 1 else '', 'field': field, 'held': raw, 'number': n, 'optical line': ' || '.join(seen)[:200]})
with open(HERE / 'suspects.csv', 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=['table', 'record', 'SourceID', 'SHA256', 'page', 'field', 'held', 'number', 'optical line'], lineterminator='\n')
    w.writeheader(); w.writerows(rows)
print(len(items), 'held items checked;', len(rows), 'numbers the text layer prints and the optical reading does not, on', len({r['SourceID'] for r in rows}), 'sources')
