#!/usr/bin/env node
// The maker-site search worklist: every material and product whose own documents were read for makers' know-how and
// said nothing (state "sheet silent — maker site not yet searched"), with where to look.
//
//   npm run audit:know-how            writes docs/audits/2026-09-25-re-center/KNOW-HOW-WORKLIST.md
//   npm run audit:know-how -- --check  exits 1 if the file is not what the current data gives
//
// Generated, in the manner of BLOCKERS.md, because a worklist written by hand is a list of the gaps somebody
// remembered. The states are the build's (build/src/know-how.js, db.grades[].knowHow); the order puts first the
// materials the six templates keep as candidates (build/snapshot/templates.csv), because a gap there is one a team
// meets first. A maker's site address is the host its own documents in sources.csv were fetched from, most used
// first, leaving out file hosts and shops; a maker with none has the words "no address held".

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../build/src/csv.js';
import { loadTables, snapshotDate } from '../../build/src/load.js';
import { buildDatabase } from '../../build/src/pipeline.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(root, 'docs/audits/2026-09-25-re-center/KNOW-HOW-WORKLIST.md');
const RECIPE_WORDS = { chamber: 'chamber or enclosure', drying: 'drying', annealing: 'annealing' };
// File hosts: never a maker's own site.
const NOT_A_SITE = /(cdn|cloudfront|amazonaws|googleapis|shopify|hubspot|plentyone|imgix|googleusercontent|dropbox|drive\.google|sharepoint|github|scribd|yumpu)/i;
const MAKERS = readCsv(join(root, 'schema/vocab/manufacturers.csv')).records.map((r) => r.values);

/** The worklist's text, from a compiled database and the templates snapshot's rows. */
export function worklist(db, templates) {
  const gradeById = new Map(db.grades.map((g) => [g.id, g]));
  // Where each maker's products' own documents came from: the product's source, its profiles' and its measurements'.
  const sourceById = new Map(db.sources.map((s) => [s.id, s]));
  const docsOf = new Map();
  for (const x of [...db.grades.map((g) => ({ gradeId: g.id, sourceId: g.sourceId })), ...db.profiles, ...db.measurements]) {
    (docsOf.get(x.gradeId) ?? docsOf.set(x.gradeId, new Set()).get(x.gradeId)).add(x.sourceId);
  }
  const hosts = new Map(), makersOf = new Map();
  for (const g of db.grades.filter((x) => !x.retired)) {
    for (const id of docsOf.get(g.id) ?? []) {
      let host;
      try { host = new URL(sourceById.get(id)?.url).hostname.replace(/^www\./, ''); } catch { continue; }
      if (NOT_A_SITE.test(host)) continue;
      (makersOf.get(host) ?? makersOf.set(host, new Set()).get(host)).add(g.manufacturer);
      const m = hosts.get(g.manufacturer) ?? hosts.set(g.manufacturer, new Map()).get(g.manufacturer);
      m.set(host, (m.get(host) ?? 0) + 1);
    }
  }
  // A host that serves several makers' documents is a shop or a file host, unless it carries the maker's name or one of
  // its aliases (schema/vocab/manufacturers.csv).
  const squash = (x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, '');
  // A maker's names, whole and word by word ("Fabru / purefil" is fabrupurefil, fabru and purefil).
  const namesOf = (maker) => {
    const row = MAKERS.find((r) => r.Value === maker);
    const all = [maker, ...String(row?.Aliases ?? '').split(';')];
    return [...new Set([...all.map(squash), ...all.flatMap((a) => a.split(/[^A-Za-z0-9]+/).map(squash))])].filter((n) => n.length >= 5);
  };
  const own = (maker, host) => makersOf.get(host)?.size === 1 || namesOf(maker).some((n) => squash(host).includes(n));
  for (const [maker, m] of hosts) for (const host of [...m.keys()]) if (!own(maker, host)) m.delete(host);
  const siteOf = (maker) => {
    const m = hosts.get(maker);
    return m?.size ? [...m].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 2).map(([h]) => h).join(', ') : 'no address held';
  };

  // The six templates: in how many does each material stay a candidate, in Strict (a verdict, not an open question).
  const candidateIn = new Map();
  for (const t of templates) if (t.Mode === 'Strict' && t.Candidate === 'yes') (candidateIn.get(t.MaterialID) ?? candidateIn.set(t.MaterialID, new Set()).get(t.MaterialID)).add(t.Template);

  const rows = [];
  for (const m of db.materials) {
    if (m.familyEntry || !m.knowHow) continue;
    const products = m.gradeIds.map((id) => gradeById.get(id)).filter((g) => g && !g.retired && g.knowHow);
    const silent = products.filter((g) => g.knowHow.state === 'sheet-silent');
    const recipeSilent = products.filter((g) => g.knowHow.state !== 'no-document-read' && Object.values(g.knowHow.recipe).some((s) => s === 'sheet-silent'));
    rows.push({ m, products, silent, recipeSilent, templates: [...(candidateIn.get(m.id) ?? [])].sort() });
  }
  const order = (a, b) => b.templates.length - a.templates.length || b.silent.length - a.silent.length || (a.m.name < b.m.name ? -1 : 1);
  const listed = rows.filter((r) => r.silent.length || r.recipeSilent.length).sort(order);

  const k = db.meta.knowHow;
  const byMaker = new Map();
  for (const r of listed) for (const g of r.silent) (byMaker.get(g.manufacturer) ?? byMaker.set(g.manufacturer, []).get(g.manufacturer)).push(g);
  const L = [];
  L.push('# Makers\' know-how: where the sheets are silent, and the makers\' sites to search');
  L.push('');
  L.push('> **Current**: regenerated from the build by `npm run audit:know-how`, and the tests refuse it stale. The rest of this folder is the re-center\'s historical record.');
  L.push('');
  L.push('Generated by `npm run audit:know-how` (`scripts/audit/know-how-worklist.mjs`) from the compiled database and');
  L.push('`build/snapshot/templates.csv`. Do not edit: change the data, and run it again.');
  L.push('');
  L.push('A product\'s know-how state is derived by the build (`build/src/know-how.js`): **collected** (at least one statement');
  L.push('in the maker\'s words), **sheet silent** (its documents were read and say nothing beyond the numbers; the maker\'s');
  L.push('site not yet searched), **searched, nothing published** (dated), or **no document read** (none of its documents is');
  L.push('held or was read). This list is the second state, for the round that searches the makers\' own sites: product pages,');
  L.push('FAQs and printing guides. A search is recorded as a `know_how_reads.csv` row with Scope `maker site` on the page it');
  L.push('fetched (registered in `sources.csv`); a statement it finds goes in `evidence.csv` like any other.');
  L.push('');
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  L.push(`| | Collected | Sheet silent | Searched, nothing published | No document read | All |`);
  L.push(`|---|---:|---:|---:|---:|---:|`);
  L.push(`| Products | ${k.products.collected} | ${k.products['sheet-silent']} | ${k.products['searched-nothing']} | ${k.products['no-document-read']} | ${sum(k.products)} |`);
  L.push(`| Materials | ${k.materials.collected} | ${k.materials['sheet-silent']} | ${k.materials['searched-nothing']} | ${k.materials['no-document-read']} | ${sum(k.materials)} |`);
  L.push('');
  L.push(`${k.statements} statements; ${k.documentsRead} sources read for know-how; ${k.sitesSearched} makers' sites searched.`);
  L.push('A material is collected when any of its products is, so a collected material can still have silent products: they are');
  L.push('listed under it below. The print recipe\'s chamber, drying and annealing have the same states; a product whose');
  L.push('documents were read and give none of one is listed under "Recipe silent".');
  L.push('');

  const section = (title, list) => {
    L.push(`## ${title}`);
    L.push('');
    if (!list.length) { L.push('None.'); L.push(''); return; }
    L.push('| Material | Candidate in | Know-how | Products silent | Recipe silent (chamber / drying / annealing) | Makers to search |');
    L.push('|---|---|---|---:|---|---|');
    for (const r of list) {
      const rc = (part) => r.products.filter((g) => g.knowHow.recipe[part] === 'sheet-silent').length;
      const makers = [...new Set(r.silent.map((g) => g.manufacturer))].sort();
      L.push(`| ${r.m.name} (${r.m.id}) | ${r.templates.length ? r.templates.join('; ') : '—'} | ${r.m.knowHow.state} | ${r.silent.length} of ${r.products.length} | ${rc('chamber')} / ${rc('drying')} / ${rc('annealing')} | ${makers.map((mk) => `${mk} (${siteOf(mk)})`).join('; ') || '—'} |`);
    }
    L.push('');
  };
  section('Materials the six templates keep as candidates', listed.filter((r) => r.templates.length));
  section('Every other material', listed.filter((r) => !r.templates.length));

  L.push('## By maker: the silent products to look up');
  L.push('');
  L.push('| Maker | Site | Products | GradeIDs |');
  L.push('|---|---|---:|---|');
  for (const [maker, list] of [...byMaker].sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1))) {
    L.push(`| ${maker} | ${siteOf(maker)} | ${list.length} | ${list.map((g) => `${g.id} ${g.product}`).sort().join('; ')} |`);
  }
  L.push('');
  return L.join('\n');
}

if (process.argv[1]?.endsWith('know-how-worklist.mjs')) {
  const wb = loadTables(join(root, 'data'));
  const { db } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'audit', estimates: false });
  const templates = readCsv(join(root, 'build/snapshot/templates.csv')).records.map((r) => r.values);
  const text = worklist(db, templates);
  if (process.argv.includes('--check')) {
    let current = '';
    try { current = readFileSync(OUT, 'utf8'); } catch { /* missing */ }
    if (current !== text) { console.error(`${OUT} is stale: npm run audit:know-how`); process.exit(1); }
    console.log('know-how worklist is current');
  } else {
    writeFileSync(OUT, text);
    console.log(`wrote ${OUT}`);
  }
}
