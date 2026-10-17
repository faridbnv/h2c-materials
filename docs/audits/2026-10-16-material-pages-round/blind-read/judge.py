# A record of the material pages round's blind read (2026-10-17): it read the four readers' findings from that session's
# scratch folder (S below), which no longer exists, and wrote judged.csv there; VERDICTS.csv beside it is what it gave.
# It does not run elsewhere.
import csv, re
S='/private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/9fce9350-145b-4738-8aa8-79b23e9dc465/scratchpad/blind'
rows=[]
for k in range(1,5):
    rows+=list(csv.DictReader(open(f'{S}/r{k}.csv',encoding='utf-8')))
RULES=[
 (r'drawer.*drying|drying.*drawer|A drying schedule is published', 'fixed', 'the drawer counts drying advice as the page does (a0a65a71)'),
 (r'most makers', 'fixed', '"the topics the most makers speak to", with counts (a0a65a71)'),
 (r'9 Canadian retailers|seller count|16 sellers', 'fixed', 'the price fold names the material\'s own sellers (a0a65a71)'),
 (r'Draft, not yet reviewed|byline|\(agent\)', 'by design', 'the byline says who wrote the summary and its review status (D142, the owner\'s answer)'),
 (r'Researcher classification|This entry remains|manufacturer-proposed|Manufacturer describes|project wording attributed|Project-written|Project text', 'fixed', 'the project\'s own words typed Selection interpretation and kept off the pages (m435)'),
 (r'X-Z|XZ or ZX|ZX rule|"ZX"|ZX column|ZX Orientation|ZX \(|labelled XZ', 'fixed (words)', 'the values follow D92 and D123 (upright or Eryone\'s template); the caption now says the rule as applied (m435)'),
 (r'not on its basis', 'fixed', 'the first screen says the nearest value\'s condition: "at 0.45 MPa", "load not stated", "a moulded bar" (a0a65a71)'),
 (r'two-definition|Same window|Title: ', 'fixed', 'the figure title names the first screen\'s window (a0a65a71)'),
 (r'guide speaks|guide sentence', 'fixed', 'the guide\'s sentence only where a guide window is drawn (a0a65a71)'),
 (r'–\d+ °C"|single temperatures as a range|"\d+–\d+ °C"', 'fixed', 'a one-temperature window hovers as one value (a0a65a71)'),
 (r'acid resistance|alkali resistance|of 2 makers', 'fixed', 'a maker counts for a verdict only where all its statements give it (a0a65a71)'),
 (r'heavier load|1\.8 MPa.*higher than|higher than HDT at 0.45|0.45 MPa median|cannot give a higher HDT|equal 163', 'fixed (words)', 'the heat section says the two medians rest on different products (a0a65a71); PEEK\'s 1.8 MPa moulded bars left the median (m433)'),
 (r'lowest 62.5|lowest is not above', 'fixed (words)', 'crossing medians said as medians of different products (a0a65a71)'),
 (r'Garbled|garbled|for 1 of them', 'fixed', 'chamber windows that share nothing are each named (a0a65a71)'),
 (r'Polymaker Polymaker', 'fixed', 'the product named once (a0a65a71)'),
 (r'comma', 'fixed', 'names with a comma listed with semicolons (a0a65a71)'),
 (r'uncharved|Unnotched|notch not stated.*60|unnotched', 'fixed', 'the notch the row states is typed (m434); the context audit checks it'),
 (r'say nothing.*enclos|enclos.*say nothing|7 say nothing|understates', 'fixed', 'a stated enclosure is counted as one (2b264110)'),
 (r'struck cold|named alone|on film|Plain words', 'fixed (words)', '"tested below room temperature", "named in the text, the only result of its test", "measured on film" (a0a65a71)'),
 (r'disagree', 'fixed', 'the estimate is compared with the published values in one unit (a0a65a71)'),
 (r'45~50|lower end|lower bound|range collapsed|low end', 'fixed (words)', 'a published range is judged as the interval (D54); the records page now shows it as the range (a0a65a71)'),
 (r'4130|110 °C ISO 75|FX256.*110|Stress at Break.*ZX|Upright', 'fixed', 'the value is recorded (m436)'),
 (r'93 kJ|Izod value of 93|93 Izod', 'fixed', 'flagged physically implausible as its sibling was (m436)'),
 (r'HDT @ 264 psi|35 °C|two clusters', 'fixed', 'the 35 °C XY bar flagged implausible (m436); a no-direction headline takes only a flat bar (1b48811e)'),
 (r'D1822|tensile-impact|Tensile Impact', 'fixed', 'a property of its own, Tensile impact strength (m436)'),
 (r'cut mid-sentence|line wrap|resistant to weak acids, but', 'fixed', 'completed with the sheet\'s next line (m436)'),
 (r'clipped|cut off|cut at|cut to|collides|overlap|off-screen|starts off|is clipped|runs past|not visible', 'fixed', 'figure text placed by its width and hidden on a phone where it does not fit; the probe fails cut or overlapping text (a0a65a71)'),
 (r'2.85', 'open', 'OPEN-PROBLEMS §37.5: a product sold only in 2.85 mm'),
 (r'V2.0|V3.0|revision', 'open', 'OPEN-PROBLEMS §37.3: two documents of one product disagree'),
 (r'P1872|product page.*360|Ultem 1010', 'open', 'OPEN-PROBLEMS §37.3'),
 (r'260~280|260–290|datasheet says 260', 'open', 'OPEN-PROBLEMS §37.3'),
 (r'HDT A - 134|portfolio line|V012429', 'open', 'OPEN-PROBLEMS §37.3'),
 (r'Pitfalls|praise|benefit claim|filed under UV|water uptake and dimensional', 'open', 'OPEN-PROBLEMS §37.6: statements under the wrong topic'),
 (r'Chinese|该材料', 'open', 'OPEN-PROBLEMS §37.9: statements quoted untranslated'),
 (r'foamed|foaming filament|1,100 kg|880', 'open', 'OPEN-PROBLEMS §30.6 and §37.10: a foamed filament\'s density'),
 (r'P0125|P0068|empty profile|holds no setting', 'open', 'OPEN-PROBLEMS §37.11: profiles with no setting'),
 (r'sharepoint|Sign in|403|bot challenge', 'open', 'OPEN-PROBLEMS §37.12: originals behind a sign-in'),
 (r'Dry box recommended No|table-cell fragment', 'open', 'OPEN-PROBLEMS §37.13'),
 (r'same data sheet|identical values|shared data sheet|print the same|copy|twin|rebranded|shared-sheet', 'open', 'OPEN-PROBLEMS §32.6 and §37.4: copies counted as products'),
 (r'138|Within|Needs up to 85|0.035 GPa|43 MPa\*|moulded-bar value|drawer shows the single nearest|nearest moulded', 'open', 'OPEN-PROBLEMS §37.1 and §37.2: the drawer\'s nearest value and printability verdict'),
 (r'About this entry|scripts/migrate', 'open', 'OPEN-PROBLEMS §37.14: the drawer shows an identity note with file and migration names'),
 (r'filler not disclosed|polyacetal copolymer', 'open', 'OPEN-PROBLEMS §37.8: POM\'s filler'),
 (r'estimate.*200|good precision|200–380', 'open', 'OPEN-PROBLEMS §36.2: the frozen estimates against their sheets'),
 (r'PA12 CF\+|PA612', 'checked', 'the filing is right: the sheet says "based on Polyamide 612" (round README)'),
 (r'ISO 3167', 'open', 'OPEN-PROBLEMS §37.15: an ISO 3167 type A bar, moulded or printed, unsettled'),
 (r'Makers.*jigs, fixtures|Makers describe it for jigs', 'fixed', 'the summary says "a maker" (step 5, summaries)'),
 (r'Few products publish strength', 'fixed', 'the summary now says what it means (step 5, summaries)'),
 (r'wood fib', 'open', 'OPEN-PROBLEMS §37.7'),
]
out=[]
from collections import Counter
cnt=Counter()
for r in rows:
    j=('','')
    if r['Verdict']!='pass':
        text=' '.join([r['Where'],r['Found'],r['Expected'],r['Note']])
        PRE=[(r'Polymaker Polymaker', 'fixed', 'the product named once (a0a65a71)'),
             (r'"Within|with "Within"|verdict "Within"|Needs up to 85', 'open', 'OPEN-PROBLEMS §37.2: the drawer\'s printability verdict is the best product\'s'),]
        if r['Check']=='C8': j=('fixed','figure text placed by its width and hidden on a phone where it does not fit; the probe fails cut or overlapping text (a0a65a71)')
        for pat,kind,why in ([] if j[0] else PRE+RULES):
            if re.search(pat,text,re.I): j=(kind,why); break
        if not j[0]: j=('unjudged','')
        cnt[(r['Check'],j[0])]+=1
    out.append({**r,'Judged':j[0],'Outcome':j[1]})
with open(f'{S}/judged.csv','w',newline='',encoding='utf-8') as f:
    w=csv.DictWriter(f, fieldnames=list(rows[0].keys())+['Judged','Outcome'], quoting=csv.QUOTE_ALL); w.writeheader(); w.writerows(out)
print(sorted(cnt.items()))
for r in out:
    if r['Judged']=='unjudged': print('--',r['Reader'],r['MaterialID'],r['Check'],r['Verdict'],'|',r['Found'][:160],'|',r['Note'][:120])

# ---- hand judgements for the rows no pattern caught (by reader, material, check and the start of what was found)
HAND = [
 ('1','M016','C10','"how many of the 16', 'fixed (words)', 'the Products table says it counts the values it holds (5c714a71)'),
 ('1','M032','C4','"Not published by any product: tensile modulus (Z)', 'by design', 'Bambu\'s Z modulus is of its unfoamed bar, printed off the product\'s recipe (D95), not the product\'s value'),
 ('1','M032','C10','Flexural strength: XY 17.5', 'not a fault', 'different products: the page compares a Z share only within one product'),
 ('1','M097','C4','"One maker or publisher speaks', 'fixed', 'its two statements were the project\'s words (m435); the section leaves the page and says so'),
 ('1','M019','C6','"User-supplied reference', 'fixed (part)', 'the principle is a Selection interpretation, off the page (makersOwn); the publisher name stays in Sources (OPEN-PROBLEMS §37.14)'),
 ('1','M019','C10','"6 statements on resistance"', 'fixed', 'the principle is off the environment section (makersOwn, m435)'),
 ('1','M027','C5','"Nearly every product', 'not a fault', 'true of the page, which says where the advice is read'),
 ('1','M164','C10','"85 – 100 °C 1 of the 3', 'not a fault', 'honest; the masthead now says "1 of the 3 counted products (of 7) accepts"'),
 ('1','M037','C4','"No product publishes tensile strength across', 'by design', 'Prusa\'s interlayer adhesion is its own property (D143, OPEN-PROBLEMS §15)'),
 ('2','M089','C10','"Prusa Research | 1 | 0 | 0"', 'not a fault', 'a document the material\'s records cite (a print profile), counted as a publisher'),
 ('2','M054','C5','"a sheet gives a chamber window', 'not a fault', 'an open-ended window "up to 120 °C" is partly above 65 °C'),
 ('2','M149','C4','Only a Nozzle panel is drawn', 'fixed', 'the fold says why a setting has no panel (5c714a71)'),
 ('2','M017','C10','"3.05 kJ/m² | <1–8.2 | 4"', 'fixed', 'the median table keeps the bound\'s sign (5c714a71)'),
 ('2','M050','C10','"170 MPa" strength', 'open', 'OPEN-PROBLEMS §37.15: unflagged values far above the others, no stated orientation'),
 ('3','M102','C3','"both counted products (of 4)', 'fixed', 'the fold says why a setting has no panel (5c714a71)'),
 ('3','M102','C10','"HDT 190 °C at 0.45 MPa', 'fixed (words)', 'the heat section says the medians rest on different products (a0a65a71)'),
 ('3','M144','C4','Only "Not on file for PCTG-CF', 'not a fault', 'the line stands between the sections, named in one line as D142 says'),
 ('3','M144','C10','Fiberlogy PCTG+CF10 and FormFutura', 'open', 'OPEN-PROBLEMS §32.6 and §37.4: copies counted as products'),
 ('4','M098','C2','"Nearest value on file: 5.5', 'fixed', '"1 more value on file, of 2 products in all"; the first screen says "a moulded bar" (a0a65a71, 5c714a71)'),
 ('4','M087','C2','Masthead: "Notched Charpy impact 7', 'fixed', 'the first screen says "test unclear" (a0a65a71)'),
 ('4','M008','C4','A sub-heading "Known gaps"', 'fixed', 'a heading only over a gap shown (5c714a71)'),
 ('4','M110','C4','No Figure 5.1', 'fixed', 'the fold says why a setting has no panel (5c714a71)'),
 ('4','M053','C8','Vicat and Melting labels cut', 'fixed', 'the ladder sets a value near the right end to the left of its tick (a0a65a71)'),
 ('3','M071','C10','"Drying typically 100 °C', 'open', 'OPEN-PROBLEMS §37.16: a drying range is typed at its upper end'),
 ('4','M099','C4','Row "Melting temperature', 'not a fault', 'one value of one product, its median shown elsewhere; a dash for a range of one'),
]
done = 0
for r in out:
    for rd, mid, ck, start, kind, why in HAND:
        if r['Reader'] == rd and r['MaterialID'] == mid and r['Check'] == ck and r['Found'].startswith(start):
            r['Judged'], r['Outcome'] = kind, why; done += 1; break
with open(f'{S}/judged.csv','w',newline='',encoding='utf-8') as f:
    w=csv.DictWriter(f, fieldnames=list(rows[0].keys())+['Judged','Outcome'], quoting=csv.QUOTE_ALL); w.writeheader(); w.writerows(out)
left=[r for r in out if r['Judged']=='unjudged']
print('hand', done, 'left', len(left))
for r in left: print('LEFT', r['Reader'], r['MaterialID'], r['Check'], r['Found'][:60])
c2=Counter(r['Judged'] for r in out if r['Verdict']!='pass'); print(c2)
