# Accept the reader round's identical-table findings with the reason each kind has, and drop acceptances that no
# longer occur (lint-after-m343.txt is `npm run data:lint` after m342 and m343).
import csv, re, sys
L=open(sys.argv[1]).read().splitlines()
acc_path='data/review/accepted-findings.csv'
rows=list(csv.DictReader(open(acc_path,newline='')))
hdr=['Code','Table','Record','Field','Reason','Accepted']
stale=set()
for l in L:
    m=re.match(r'STALE ACCEPTANCE\s+(\S+)\s+(\S+)\s+(.+?)(?: \[(.+?)\])?: no longer occurs',l)
    if m: stale.add((m.group(1),m.group(2),m.group(3).strip(),m.group(4) or ''))
rows=[r for r in rows if (r['Code'],r['Table'],r['Record'],r['Field'] or '') not in stale]
def maker(s): return s.strip().split(' ')[0].lower()
have={(r['Code'],r['Table'],r['Record'],r['Field'] or '') for r in rows}
for l in L:
    m=re.match(r'(GRADE-VALUES-TWIN|GRADE-KEY-PRODUCTS)\s+grades\s+(.+?) \[Shared formulation key\]\s+(.*)$',l)
    if m:
        code,rec,msg=m.groups(); rec=rec.strip()
        if code=='GRADE-KEY-PRODUCTS':
            reason="Spectrum's PLA Premium sheet prints one table for products already keyed together; the reader round recorded what it prints on the key's carrier grade (R053), and the other products read it (reader round, 2026-10-04)."
        else:
            pair=re.search(r'\((.+?) / (.+?)\)',msg); a,b=pair.groups() if pair else ('','')
            n=msg.split(' (')[0]
            if 'Kingroon' in a+b and 'Bambu' in a+b:
                reason=f"{a} and {b}: the Kingroon sheet prints Bambu Lab's table value for value ({n}). Each is recorded from its own sheet and sold as its own product; whether one is the other is an identity question for the owner (OPEN-PROBLEMS §30). Reader round, 2026-10-04."
            elif maker(a)==maker(b):
                reason=f"{a} and {b}: one maker's two products whose sheets print one table ({n}), each recorded from its own sheet by the reader round; a candidate for one Shared formulation key (R053), left for a ruling (OPEN-PROBLEMS §30). 2026-10-04."
            else:
                reason=f"{a} and {b}: two makers print the same table ({n}), the usual sign of one resin or OEM supplier; each is recorded from its own sheet and sold as its own product (OPEN-PROBLEMS §30). Reader round, 2026-10-04."
        k=(code,'grades',rec,'Shared formulation key')
        if k not in have: rows.append({'Code':code,'Table':'grades','Record':rec,'Field':'Shared formulation key','Reason':reason,'Accepted':'2026-10-04'}); have.add(k)
    m=re.match(r'MEAS-CROSS-SOURCE-TWIN\s+sources\s+(.+?)\s{2,}(.*)$',l)
    if m:
        rec,msg=m.groups(); k=('MEAS-CROSS-SOURCE-TWIN','sources',rec.strip(),'')
        if k not in have: rows.append({'Code':'MEAS-CROSS-SOURCE-TWIN','Table':'sources','Record':rec.strip(),'Field':'','Reason':f"Two documents print the same numbers under the same conditions ({msg.strip()}): each is a different product's own sheet (siblings of one maker, or one resin supplier's table), read again by the reader round, 2026-10-04; neither is a copy of the other (OPEN-PROBLEMS §30).",'Accepted':'2026-10-04'}); have.add(k)
w=csv.DictWriter(open(acc_path,'w',newline=''),fieldnames=hdr,lineterminator='\n'); w.writeheader(); w.writerows(rows)
print('stale removed',len(stale))
