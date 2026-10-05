#!/usr/bin/env python3
"""Gap round 2, phase 3c: the error families the reader round's blind draws named, looked for over every registered source.

Each detector writes candidates only, never data: a candidate is a record a reader must look at on its page. Families:

  test-bar      a profile cell (nozzle, bed, chamber temperature or nozzle size) whose value the sheet prints only under a
                heading about the test specimens or samples, never in a guidance row (m170, m345, m354)
  same-cond     one product's rows from one source with the same recorded conditions and different values: a column read
                into the wrong direction, notch or state, or two tables the rows do not tell apart (m354)
  duplicate     two live rows of one product with the same property, value and conditions from one source
  point-range   a raw value that prints a range or a minimum held as a point (no upper bound, Operator "=")
  far           a value beyond |z| 3 of its material's comparable values (v_measurement_z) that backs a product's headline
  layout-only   a setting or value only the reading-order view finds (reader-recall/candidates.csv), not held

Writes candidates.csv beside this file, one row per record, grouped by source so a reader opens each document once.

    npm run sql -- --build "select 1" && python3 docs/audits/2026-10-05-gap-round-2/detect.py
"""
import csv, json, os, re, subprocess, collections
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).parent
os.chdir(ROOT)
rows = lambda t: list(csv.DictReader(open(f'data/tables/{t}.csv')))
S = {s['SourceID']: s for s in rows('sources')}
G = {g['GradeID']: g for g in rows('grades')}
LIVE = ('Published value', 'Published value (transcription corrected)')
M = [m for m in rows('measurements') if m['Data status'] in LIVE]
P = [p for p in rows('profiles') if not p['Profile'].startswith('Retired')]
out = []

def add(family, table, record, source, page, field, held, hint):
    out.append({'family': family, 'table': table, 'record': record, 'SourceID': source, 'SHA256': S.get(source, {}).get('SHA256', ''),
                'page': page, 'grade': (G.get(held[0], {}).get('Manufacturer', '') + ' ' + G.get(held[0], {}).get('Product name', '')).strip() if isinstance(held, tuple) else '',
                'field': field, 'held': held[1] if isinstance(held, tuple) else held, 'hint': hint})

def text(sha):
    f = Path(f'.cache/text/{sha}.json')
    return json.load(open(f)) if f.exists() else None

# ---------------------------------------------------------------- test-bar settings held as guidance
SPEC = re.compile(r'sample|specimen|test(?:ing)?\s+(?:bar|piece|sample|specimen)|printed under|were printed|have been printed|样条|试样', re.I)
GUIDE = re.compile(r'recommend|suggest|guideline|print(?:ing)?\s+(?:setting|parameter|recommend)|processing|建议|推荐', re.I)
for p in P:
    t = text(S.get(p['SourceID'], {}).get('SHA256', ''))
    if not t: continue
    for col, word in [('Nozzle diameter', r'nozzle|düse|buse|喷嘴'), ('Nozzle °C', r'nozzle|extru|print(?:ing)?\s*temp|喷头|打印温度'), ('Bed °C', r'bed|plate|platform|热床|底板'), ('Chamber °C', r'chamber|enclosure|腔')]:
        v = p[col]
        num = re.search(r'\d+(?:[.,]\d+)?', v or '')
        if v in ('Not published', '', 'Not applicable') or not num: continue
        n = num.group(0)
        hits = []
        for pg in t['pages']:
            L = [l['text'] for l in pg['lines']]
            for k, x in enumerate(L):
                if n in x and re.search(word, x + ' ' + (L[k - 1] if k else ''), re.I):
                    ctx = ' '.join(L[max(0, k - 10):k + 1])
                    hits.append((pg.get('page'), bool(SPEC.search(ctx)), bool(GUIDE.search(' '.join(L[max(0, k - 6):k + 1]))), x[:120]))
        if hits and all(h[1] for h in hits) and not any(h[2] for h in hits):
            add('test-bar', 'profiles', p['ProfileID'], p['SourceID'], hits[0][0], col, (p['GradeID'], v), hits[0][3])

# ---------------------------------------------------------------- same conditions, different values; duplicates
keyf = ('GradeID', 'SourceID', 'Property', 'Standards', 'Direction', 'Specimen type', 'Moisture state', 'Post-processing state', 'Notch', 'Test load MPa', 'Test temperature °C', 'Operator')
groups = collections.defaultdict(list)
for m in M: groups[tuple(m.get(k, '') for k in keyf)].append(m)
for k, v in groups.items():
    vals = collections.Counter(x['Normalized value'] for x in v)
    if len(v) < 2: continue
    pg = lambda x: (re.search(r'p\.\s*(\d+)', x['Locator'] or '') or [None, ''])[1]
    if len(vals) > 1:
        # rows a Locator or Specimen / print parameters already tells apart are a sheet's several tables, not an error
        told = len({(x['Locator'], x.get('Specimen / print parameters', '')) for x in v}) == len(v) and all(x.get('Specimen / print parameters', 'Not published') != 'Not published' for x in v)
        if told: continue
        for x in v: add('same-cond', 'measurements', x['MeasurementID'], x['SourceID'], pg(x), x['Property'], (x['GradeID'], x['Raw value']), f"{len(v)} rows, {len(vals)} values; direction {x['Direction']}; locator {x['Locator'][:90]}")
    for val, n in vals.items():
        if n > 1:
            for x in [y for y in v if y['Normalized value'] == val]:
                add('duplicate', 'measurements', x['MeasurementID'], x['SourceID'], pg(x), x['Property'], (x['GradeID'], x['Raw value']), f"{n} rows hold {val}; locator {x['Locator'][:90]}")

# ---------------------------------------------------------------- a range or a minimum held as a point
RANGE = re.compile(r'\d\s*(?:-|–|~|～|to)\s*\d|≥|≤|\bmin(?:imum|imal)?\b|\bmax(?:imum)?\b|\bup to\b|>\s*\d|<\s*\d|\+\s*$', re.I)
for m in M:
    raw = re.sub(r'/\s*10\s*min|mm\s*/\s*min|min-1|\bmin\.?-1', '', m['Raw value'] or '', flags=re.I)
    if RANGE.search(raw) and m['Operator'] == '=' and m.get('Raw upper bound', 'Not applicable') in ('Not applicable', 'Not published', ''):
        if re.search(r'±', raw) and not re.search(r'\d\s*(?:-|–|~)\s*\d', raw.split('±')[0]): continue
        add('point-range', 'measurements', m['MeasurementID'], m['SourceID'], (re.search(r'p\.\s*(\d+)', m['Locator'] or '') or [None, ''])[1], m['Property'], (m['GradeID'], raw), 'raw prints a range or bound; held as a point')

# ---------------------------------------------------------------- far from the material's comparable values
HEADLINE = ('Tensile strength (endpoint unspecified)', 'Tensile yield strength', 'Tensile break strength', 'Tensile modulus', 'Elongation at break', 'Density', 'HDT', 'Charpy strength', 'Izod impact strength', 'Glass transition temperature', 'Flexural modulus', 'Flexural strength')
# only a value that backs a product's headline decides; the rest stay for a later sweep
backs = {r['Measurement'] for r in csv.DictReader(open('build/snapshot/products.csv'))}
far = subprocess.run(['npm', 'run', '--silent', 'sql', '--', "select measurementid, gradeid, property, value, unit, median, z, sourceid, locator from v_measurement_z where abs(z) > 3"], capture_output=True, text=True).stdout
for line in far.splitlines():
    f = re.split(r'\s{2,}', line.strip())
    if len(f) < 9 or not re.match(r'V\d{6}$', f[0]) or f[2] not in HEADLINE or f[0] not in backs: continue
    add('far', 'measurements', f[0], f[7], (re.search(r'p\.\s*(\d+)', f[8]) or [None, ''])[1], f[2], (f[1], f'{f[3]} {f[4]}'), f'z {f[6]}, material median {f[5]}')

# ---------------------------------------------------------------- what only the reading-order view reads
for c in csv.DictReader(open('docs/audits/2026-10-04-reader-round/reader-recall/candidates.csv')):
    if c.get('via_layout') != 'true': continue
    sid = c['source_id']
    out.append({'family': 'layout-only', 'table': '', 'record': '', 'SourceID': sid, 'SHA256': c['sha'], 'page': c['page'], 'grade': '', 'field': c['field/property'], 'held': c['raw value'], 'hint': c['evidence line'][:140]})

out.sort(key=lambda r: (r['SourceID'], r['family'], r['record']))
with open(HERE / 'candidates.csv', 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(out[0].keys()), lineterminator='\n'); w.writeheader(); w.writerows(out)
c = collections.Counter(r['family'] for r in out)
print(len(out), 'candidates on', len({r['SourceID'] for r in out}), 'sources:', dict(c))
