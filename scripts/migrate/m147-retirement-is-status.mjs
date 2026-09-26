#!/usr/bin/env node
// Migration m147 (2026-09-25): a grade's retirement is recorded once, in Status (re-center phase 5, "stored copies").
//
// Twenty-one retired grades carried Status "retired" and Availability "Retired mapping; audit trail only", and the check
// GRADE-RETIREMENT-HALF kept the two in step. Availability is "availability as recorded" (its schema): what a listing
// or sheet said about buying the product. Retirement withdraws the grade record, not the product, and every one of the
// twenty-one is a product that lives on under another grade (a duplicate filing, a product re-filed under the material
// it is, or a second revision of one sheet). So each retired grade's Availability goes back to what was recorded for
// it before the retirement phrase overwrote it, and a later retirement leaves Availability alone:
//
// - G047-02, G061-02 and G062-01 read "Current official product listing retrieved", as their active twins G057-02 and
//   G053-01 still do (docs/audits/2026-09-13-duplicate-products/changelog.csv, rows H64, H79, H80);
// - the other eighteen read "Not published": the thirteen 2026-09-13 duplicates and G091-01 by the same changelogs
//   (docs/audits/2026-09-13-systematic-data/changelog.csv for G091-01), G082-01, G129-03 to -06 and G137-02 by
//   data/tables/grades.csv at the commit before each retirement, and G068-03 by the importer, which writes Not
//   published for every grade it registers (it entered and was retired in one commit, m80).
//
// The Method rule on retired mappings said the phrase was the retirement; it now says Status is. Its sibling on family
// entries named the phrase as "the retirement marker" and a mapping file that no longer exists; both are corrected.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m147-retirement-is-status.mjs

import { openTables } from '../data/table-io.mjs';

const migration = 'm147-retirement-is-status';
const t = openTables();
const PHRASE = 'Retired mapping; audit trail only';
const LISTED = 'Current official product listing retrieved';
const NP = 'Not published';

const WAS = {
  'G044-01': NP, 'G044-02': NP, 'G047-01': NP, 'G047-02': LISTED, 'G047-03': NP, 'G061-01': NP, 'G061-02': LISTED,
  'G062-01': LISTED, 'G062-02': NP, 'G062-03': NP, 'G063-01': NP, 'G063-02': NP, 'G064-02': NP, 'G082-01': NP,
  'G091-01': NP, 'G068-03': NP, 'G129-03': NP, 'G129-04': NP, 'G129-05': NP, 'G129-06': NP, 'G137-02': NP,
};

const retired = t.rows('grades').filter((g) => g.Status === 'retired').map((g) => g.GradeID).sort();
if (retired.join() !== Object.keys(WAS).sort().join()) throw new Error(`${migration}: the retired grades are ${retired.join(', ')}, not the twenty-one this was written for; the data moved`);

let n = 0;
for (const [id, was] of Object.entries(WAS)) {
  const g = t.get('grades', id);
  if (g.Availability === was) continue;
  t.set('grades', id, 'Availability', was, { expect: PHRASE });
  n++;
}
const still = t.rows('grades').filter((g) => g.Availability === PHRASE).map((g) => g.GradeID);
if (still.length) throw new Error(`${migration}: ${still.join(', ')} still read "${PHRASE}"`);

const RULES = {
  'Retired mappings': [
    'A grade whose Availability reads exactly "Retired mapping; audit trail only" is kept as an audit record and is inactive: it is not listed in its material\'s GradeIDs, its profiles leave the material\'s print summary and gates, and no active measurement, price, headline or use record may cite it. Any other wording mentioning retirement is rejected by the build, because a near miss would silently leave the grade active.',
    'A grade whose Status is retired is kept as an audit record and is inactive: it is not in its material\'s grade list, its profiles leave the material\'s print summary and gates, and no active measurement, price, headline or use record may cite it. Status is the one place a retirement is recorded; Availability keeps what was recorded about buying the product, which a retirement does not change.',
  ],
  'Family entries': [
    'A canonical name that is a family or an alias (PA, PA-CF, PA-GF, TPE; CoPA for PA6/66) has Scope "Family entry". It owns no product and carries no value; each commercial product is recorded once, under the most specific material it is. A product found under two materials is retired from the less specific one with the retirement marker, and its records are marked "Retired duplicate record" after proving each has an identical twin. Members: build/mappings/family-entries.json.',
    'A canonical name that is a family or an alias (PA, PA-CF, PA-GF, TPE; CoPA for PA6/66) has Scope "Family entry". It owns no product and carries no value; each commercial product is recorded once, under the most specific material it is. A product found under two materials is retired from the less specific one (its grade\'s Status retired), and its records are marked "Retired duplicate record" after proving each has an identical twin. Members: data/tables/family_members.csv.',
  ],
};
for (const [topic, [before, after]] of Object.entries(RULES)) {
  const row = t.get('method', topic);
  if (row['Definition / rule'] === after) continue;
  t.set('method', topic, 'Definition / rule', after, { expect: before });
  n++;
}

if (n) t.save();
console.log(`${migration}: ${n} cell(s) written`);
