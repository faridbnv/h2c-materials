#!/usr/bin/env python3
"""Quality round 2026-10-07, item 8: Claude Opus's review of the values `ingest:read-proposals` made ready from the
re-read impact tables (proposals/values-add.csv). Writes applied/values-add.csv (what m399 applies) and curation.csv (the
decision on every proposal, with its reason). Nothing in data/ changes here.

  python3 docs/audits/2026-10-07-quality-round/read8/curate.py
"""
import csv, os, collections
HERE = os.path.dirname(os.path.abspath(__file__))
rows = list(csv.DictReader(open(os.path.join(HERE, 'proposals/values-add.csv'), newline='', encoding='utf-8')))
HELD = "already held from the product's own sheet (the same number, direction and state, filed as Charpy strength)"

def decide(r):
  s, g, raw, ms = r['SourceID'], r['GradeID'], r['Raw value'], r['Moisture state']
  if s.startswith('R-STRATASYS-mds-fdm-ultem-1010'):
    return 'hold', 'read with the whole ULTEM 1010 tables in read9, which the tables hold only in part'
  if s.startswith('R-STRATASYS-'):
    return 'apply', 'the Izod table (notched and unnotched), one row per printer table and orientation; the page statement gives the printed bar (page_context)'
  if s.startswith('R-QIDI-'):
    return 'hold', 'the three columns are headed by drawings of a bar, not words: which build direction each is cannot be copied from the page'
  if s == 'R-BAMBU-PRIORITY-20261003-0edbf0fe469b':
    return 'skip', 'mis-paired: the page\'s columns are "PA6-CF  Normal PA6-CF  PAHT-CF"; the value is the "Normal PA6-CF" column, another product (PA6-CF\'s column prints 40.3, 57.2 and 15.5)'
  if s == 'R-BAMBU-PRIORITY-20261003-a100c1bb3a92' and raw == '5.7':
    return 'skip', 'mis-paired: the page\'s columns are "PAHT-CF  Normal PA6-CF"; 5.7 is the "Normal PA6-CF" column'
  if s == 'D-IPCON-PRINT-20260928-01990cc2eb5c':
    return 'skip', 'mis-paired: the first column prints IPCON PPA\'s values (XY 32.8, Z 5.4, as its own sheet S-PPA-TDS); IPCON PPA GF\'s column prints Z 4.8, held as V001338'
  if s == 'R-BAMBU-PRIORITY-20261003-6e425b0d7ce7' and g == 'G002-01':
    return 'skip', 'the "PLA Basic" column of PETG Basic\'s page prints 20.6 where PLA Basic\'s own sheet prints 26.6 (V000060): not a gap'
  if s == 'R-BAMBU-PRIORITY-20261003-0419c91c3241' and ms == 'conditioned':
    return 'apply', 'the wet-state row of the product\'s own column on Bambu Lab\'s comparison; its own sheet prints the dry state only'
  if s.startswith('R-FILLAMENTUM-READER-') and g == 'G050-09':
    return 'apply', 'the notched result, which no row held (V006065 holds the unnotched 160)'
  if s.startswith('R-FILLAMENTUM-READER-'):
    return 'skip', 'already held from the same page'
  if s.startswith(('R-BAMBU-', 'S-IPCON-PRINT-')):
    return 'skip', HELD
  raise SystemExit(f'no decision for {s} {g} {raw}')

out = [(r, *decide(r)) for r in rows]
with open(os.path.join(HERE, 'applied/values-add.csv'), 'w', newline='', encoding='utf-8') as f:
  w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader()
  w.writerows(r for r, d, _ in out if d == 'apply')
with open(os.path.join(HERE, 'curation.csv'), 'w', newline='', encoding='utf-8') as f:
  w = csv.writer(f); w.writerow(['SourceID', 'GradeID', 'Raw value', 'Direction', 'Notch', 'Moisture state', 'Locator', 'decision', 'reason'])
  for r, d, why in out: w.writerow([r['SourceID'], r['GradeID'], r['Raw value'], r['Direction'], r['Notch'], r['Moisture state'], r['Locator'], d, why])
print(collections.Counter(d for _, d, _ in out))
