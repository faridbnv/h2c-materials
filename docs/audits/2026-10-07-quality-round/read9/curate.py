#!/usr/bin/env python3
"""Quality round 2026-10-07: Claude Opus's review of the values `ingest:read-proposals` made ready from the mechanical
tables six registered sheets print and the tables held only in part (read9/PROMPT.md). Writes applied/values-add.csv (what
m401 applies) and curation.csv (the decision on every proposal, with its reason). Nothing in data/ changes here.

  python3 docs/audits/2026-10-07-quality-round/read9/curate.py
"""
import csv, os, collections
HERE = os.path.dirname(os.path.abspath(__file__))
rows = list(csv.DictReader(open(os.path.join(HERE, 'proposals/values-add.csv'), newline='', encoding='utf-8')))

def decide(r):
  std = r['Standard / load']
  if 'column=drawing' in std:
    return 'hold', 'the impact columns are headed by drawings of a bar, not words: which build direction each is cannot be copied from the page'
  if 'UV Exposure' in std:
    return 'hold', 'the UV-exposure table compares bars before and after exposure in a column the reading names "PC": which product and orientation each column is needs the page read for that table alone'
  return 'apply', 'a cell of the sheet\'s own mechanical table, its printer, tip and orientation in Standard / load'

out = [(r, *decide(r)) for r in rows]
with open(os.path.join(HERE, 'applied/values-add.csv'), 'w', newline='', encoding='utf-8') as f:
  w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader()
  w.writerows(r for r, d, _ in out if d == 'apply')
with open(os.path.join(HERE, 'curation.csv'), 'w', newline='', encoding='utf-8') as f:
  w = csv.writer(f); w.writerow(['SourceID', 'GradeID', 'Property', 'Raw value', 'Direction', 'Locator', 'decision', 'reason'])
  for r, d, why in out: w.writerow([r['SourceID'], r['GradeID'], r['Property'], r['Raw value'], r['Direction'], r['Locator'], d, why])
print(collections.Counter(d for _, d, _ in out))
