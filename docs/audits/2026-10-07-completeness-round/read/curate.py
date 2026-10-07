#!/usr/bin/env python3
"""Completeness round 2026-10-07, item 1: Claude Opus's review of what `ingest:read-proposals` made ready from the c1
reading (311 held sheets read on the pages where a value no row holds was found). Writes applied/ (what the migration
applies) and curation.csv (the decision on every proposal, with its reason). Nothing in data/ changes here.

  python3 docs/audits/2026-10-07-completeness-round/read/curate.py

The rules, in the order they are tried (D136):
  values-set     every one is held: each of the 28 "agreed" corrections pairs the reading with the held row of the
                 neighbouring cell (the other load, temperature, column or print direction of the same table), which the
                 page prints too; read against the page, every held number is right (decisions/values-set-review.md).
  values-add     held when
                   - the source already holds the number under the property as a retired or unresolved row (a retired
                     copy or a cell held back for its unit must not come back as new);
                   - the label names one impact test and the standard the other (Izod beside ISO 179, Charpy beside
                     ISO 180 or D256);
                   - the unit is not the property's kind (an elongation in MPa, a strength in % or kJ/m², a Charpy in
                     MPa), or a stiff modulus printed in MPa below 10 (a GPa value under an MPa label);
                   - the uncertainty is larger than the value, the value is zero, or the cell prints a second number in
                     parentheses that is neither a unit conversion nor a standard deviation (Extrudr's "500 (3,5)");
                   - it is on Bambu Lab PLA Pure's p. 4 comparison table (its bending labels are swapped and it prints no
                     unit) or a cell whose standard is another test's (ISO 306 on a bending row);
                   - it repeats another proposal of the same source, property, number and conditions on another page.
                 Everything else is applied: a cell of the product's own sheet, with its column in the Locator.
  profiles-set   applied: a Plate, Bed or Nozzle diameter cell the profile held as Not published that the page prints
                 as a recommendation. Held: a nozzle diameter that is only the nozzle a test or setting was "based on"
                 (a condition, not a recommendation); a dry-box answer (a profile note, not a Drying cell, AGENTS.md);
                 and every change to a cell the profile already holds (the page prints both statements).
  page-context   applied where the statement's own words say how the specimens were made or kept; held where the
                 heading states nothing (3D-Fuel's "measurements from injection molded and 3D printed parts" names
                 both) or where "23 °C/50 % rh" is the test atmosphere, not a conditioning (LUVOCOM).
"""
import csv, os, re, collections
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
P = os.path.join(HERE, 'proposals')
OUT = os.path.join(HERE, 'applied')
os.makedirs(OUT, exist_ok=True)
rows = lambda f: list(csv.DictReader(open(os.path.join(P, f), newline='', encoding='utf-8')))
meas = list(csv.DictReader(open(os.path.join(ROOT, 'data/tables/measurements.csv'), newline='', encoding='utf-8')))

num = lambda s: [float(x.replace(',', '.')) for x in re.findall(r'\d+(?:[.,]\d+)?', str(s or ''))]
FAMILY = lambda p: re.sub(r'^(Tensile (strength \(endpoint unspecified\)|yield strength|break strength))$', 'Tensile strength', p)
held_back = collections.defaultdict(set)
for m in meas:
  if m['Data status'].startswith('Retired') or 'Unresolved' in m['Data status']:
    for n in num(m['Raw numeric']) or num(m['Raw value']):
      held_back[(m['SourceID'], FAMILY(m['Property']))].add(n)

IMPACT_UNIT = re.compile(r'(kJ|J/m|ft|kg)', re.I)
def decide_value(r, seen):
  prop, unit, raw, std = r['Property'], r['Raw unit'], r['Raw value'], r['Standard / load']
  value = num(r['Raw numeric'])
  v = value[0] if value else None
  if v is not None and v in held_back[(r['SourceID'], FAMILY(prop))]:
    return 'hold', 'the source holds this number under this property as a retired or unresolved row: a retired copy or a cell held back for its unit does not come back as new'
  if prop == 'Izod impact strength' and re.search(r'179', std): return 'hold', 'the label names Izod and the standard Charpy (ISO 179)'
  if prop == 'Charpy strength' and re.search(r'ISO 180|D256', std): return 'hold', 'the label names Charpy and the standard Izod (ISO 180 / D256)'
  if re.match(r'(Elongation|Tensile strain|Flexural elongation)', prop) and re.search(r'MPa|GPa|kJ', unit, re.I): return 'hold', f'an elongation printed in {unit}: the sheet misprints the unit'
  if re.search(r'strength$|strength \(', prop) and not prop.startswith(('Charpy', 'Izod', 'Dielectric', 'Impact', 'Tensile strain', 'Elongation')) and re.search(r'%|kJ', unit): return 'hold', f'a strength printed in {unit}: the sheet misprints the unit'
  if prop in ('Charpy strength', 'Izod impact strength', 'Impact strength') and unit and not IMPACT_UNIT.search(unit): return 'hold', f'an impact value printed in {unit}'
  if prop in ('Tensile modulus', 'Flexural modulus') and re.match(r'MPa', unit) and v is not None and v < 10 and r['MaterialID'] not in FLEXIBLE: return 'hold', 'a stiff modulus printed under MPa below 10: a GPa value under an MPa label'
  unc = num(r['Raw uncertainty ±'])
  if v is not None and unc and unc[0] > v: return 'hold', 'the printed uncertainty is larger than the value'
  if v == 0 and not num(r['Raw upper bound']): return 'hold', 'the cell prints zero: not a measured value'
  if re.match(r'^\s*\d+\s*\(\d+,\d+\)', raw): return 'hold', 'the cell prints a second number in parentheses that is neither a unit conversion nor a standard deviation'
  if r['SourceID'] == 'B-PC-PLA-Pure-TDS' and r['Locator'].startswith('p. 4'): return 'hold', 'p. 4 is a comparison table whose bending labels are swapped and which prints no unit'
  if re.search(r'ISO 306', std) and prop.startswith('Flexural'): return 'hold', 'the bending row names the Vicat standard (ISO 306)'
  if prop == 'Density' and re.search(r'\d,\d+\s*-\s*\d', raw + ' ' + r['quote']): return 'hold', 'a density range the sheet prints for foamed and unfoamed material together'
  key = (r['SourceID'], prop, r['Raw numeric'], r['Direction'], r['Notch'], r['Specimen type'], r['Moisture state'], r['Post-processing state'], r['Test load MPa'])
  if key in seen: return 'hold', 'the same cell read again on another page of the sheet (it prints the table twice)'
  seen.add(key)
  return 'apply', "a cell of the sheet's own table, its column and conditions in the Locator and Standard / load"

materials = {r['MaterialID']: r for r in csv.DictReader(open(os.path.join(ROOT, 'data/tables/materials.csv'), newline='', encoding='utf-8'))}
FLEXIBLE = {m for m, r in materials.items() if 'Flexible' in (r.get('Family') or '') or 'Elastomer' in (r.get('Family') or '')}

curation = []
def write(name, header, kept):
  with open(os.path.join(OUT, name), 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=header); w.writeheader(); w.writerows(kept)

va = rows('values-add.csv'); seen = set(); kept = []
for r in va:
  d, why = decide_value(r, seen)
  curation.append(['values-add', r['SourceID'], r['GradeID'], r['Property'], r['Raw value'], r['Locator'], d, why])
  if d == 'apply': kept.append(r)
write('values-add.csv', list(va[0].keys()), kept)

for r in rows('values-set.csv'):
  curation.append(['values-set', r['id'], '', r['column'], f"{r['expect']} -> {r['value']}", '', 'hold', 'the reading paired the held row with the neighbouring cell of the same table; the held number is the right cell (decisions/values-set-review.md)'])

ps = rows('profiles-set.csv'); kept = []
applied_profiles = set()
for r in ps:
  if r['column'] == 'Locator': continue
  if r['cause'] != 'gap-fill': d, why = 'hold', 'the profile holds this cell already; the page prints both statements, and the held one is its table cell or the fuller one'
  elif r['column'] == 'Drying': d, why = 'hold', 'a dry-box answer is a profile note (Storage humidity), not a Drying cell (AGENTS.md)'
  elif r['column'] == 'Nozzle diameter' and re.search(r'based on|print head|nozzle\b', r['note'], re.I) and not re.search(r'at least|to|-\s*\d', r['value']): d, why = 'hold', 'the nozzle a test or a setting was based on, not a recommended nozzle diameter'
  else: d, why = 'apply', 'a cell the profile held as Not published, printed as a recommendation on the page'
  curation.append(['profiles-set', r['id'], r['GradeID'], r['column'], f"{r['expect']} -> {r['value']}", '', d, why])
  if d == 'apply': kept.append(r); applied_profiles.add(r['id'])
for r in ps:
  if r['column'] == 'Locator' and r['id'] in applied_profiles: kept.append(r)
write('profiles-set.csv', list(ps[0].keys()), kept)

pc = rows('page-context-add.csv'); kept = []
HOLD_PC = {
  'R-3D-FUEL-3D-Fuel-Pro-PCTG-TDS-9-2-25': '"measurements from injection molded and 3D printed parts" names both: it does not say which values are which',
  'R-3D4MAKERS-TDS-LUVOCOM-3F-PEEK-9581-Filament': '"23 ºC/50% rh" is the test atmosphere in the conditions column, not a conditioning of the specimens',
  'R-3D4MAKERS-TDS-LUVOCOM-3F-PEKK-50082-Filament': '"23 ºC/50% rh" is the test atmosphere in the conditions column, not a conditioning of the specimens',
  'R-MARKFORGED-Onyx-GF-Material-Datasheet': 'already held, and narrowed in m354 to the mechanical tests it heads ("unless otherwise noted"): the density is not conditioned',
}
for r in pc:
  d, why = ('hold', HOLD_PC[r['SourceID']]) if r['SourceID'] in HOLD_PC else ('apply', "the statement's own words say how the specimens were made or kept")
  curation.append(['page-context', r['SourceID'], '', r['Applies to'], r['Statement'][:120], f"p. {r['Page']}", d, why])
  if d == 'apply': kept.append(r)
write('page-context-add.csv', list(pc[0].keys()), kept)

with open(os.path.join(HERE, 'curation.csv'), 'w', newline='', encoding='utf-8') as f:
  w = csv.writer(f); w.writerow(['file', 'record', 'GradeID', 'field', 'value', 'locator', 'decision', 'reason']); w.writerows(curation)
print(collections.Counter((c[0], c[6]) for c in curation))
print(collections.Counter(c[7][:70] for c in curation if c[6] == 'hold' and c[0] == 'values-add').most_common())
