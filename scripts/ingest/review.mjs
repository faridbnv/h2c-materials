#!/usr/bin/env node
// Reviewing a proposal: what a person reads before a value becomes data.
//
// Nothing here writes to data/tables. It writes decisions into the proposal files, and ingest:apply refuses a
// batch that holds a row nobody decided. That separation is the point: proposing is mechanical and reviewing is
// not, and the record of who read what survives in the batch the commit carries.
//
//   npm run ingest:review -- --batch b01                     what is waiting, by document
//   npm run ingest:review -- --doc <key>                     the rows, each beside the line it was read from
//   npm run ingest:review -- --doc <key> --accept all --by "farid"
//   npm run ingest:review -- --doc <key> --accept m01,m02 --by "farid"
//   npm run ingest:review -- --doc <key> --reject m03 --note "the sheet prints this as a range" --by "farid"
//   npm run ingest:review -- --doc <key> --set m03 "Direction=XY" --by "farid"
//   npm run ingest:review -- --doc <key> --done --by "farid" [--note "..."]
//
// --accept takes only rows the pipeline is confident about: nothing flagged ambiguous, nothing read from an
// optical-character copy, nothing whose identity is unsettled. Those are named, and taken one at a time.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot } from '../data/table-io.mjs';

const AUDIT = join(projectRoot, 'docs/audits/2026-09-18-v2-import');
const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 && !String(process.argv[i + 1] ?? '--').startsWith('--') ? process.argv[i + 1] : null; };
const flag = (name) => process.argv.includes(`--${name}`);
const today = () => new Date().toISOString().slice(0, 10);

const files = (batch) => {
  const dir = join(AUDIT, 'proposals', batch);
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => join(dir, f)) : [];
};

/** Every proposal of a batch, or the one file a document key names. */
export function find({ batch, doc }) {
  const batches = batch ? [batch] : readdirSync(join(AUDIT, 'proposals'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const out = [];
  for (const name of batches) {
    for (const path of files(name)) {
      const proposal = JSON.parse(readFileSync(path, 'utf8'));
      if (doc && proposal.document?.docKey !== doc && !path.endsWith(`${doc}.json`)) continue;
      out.push({ path, batch: name, proposal });
    }
  }
  return out;
}

// A row as the reviewer sees it, with the proposal's own object behind it. Spreading the row into a fresh object
// and writing the decision on that is how "106 row(s) accepted" saved nothing at all: the copy was thrown away.
const view = (kind, id, r) => Object.defineProperty({ kind, id, ...r }, 'of', { value: r, enumerable: false });

export const rowsOf = (p) => [
  ...(p.grades ?? []).map((r) => view('grade', r.key, r)),
  ...(p.measurements ?? []).map((r) => view('measurement', r.id, r)),
  ...(p.profiles ?? []).map((r, i) => view('profile', r.id ?? `p${i + 1}`, r)),
  ...(p.evidence ?? []).map((r, i) => view('evidence', r.id ?? `e${i + 1}`, r)),
];

/** Why a row cannot be accepted in bulk: it needs a person to look at this one thing. */
export function holdsBack(row, proposal) {
  const reasons = [];
  if (row.read?.ambiguous ?? row.ambiguous) reasons.push(row.read?.ambiguous ?? row.ambiguous);
  if (row.row?.Notes && row.row.Notes !== 'Not applicable') reasons.push(row.row.Notes);
  if (row.evidence?.ocr) reasons.push('read from an optical-character copy: look at the page image');
  if (proposal.identity?.needsRuling) reasons.push(`the material is unsettled: ${proposal.identity.reasons?.[0] ?? ''}`);
  if ((row.confidence ?? 1) < 0.9) reasons.push(`confidence ${row.confidence}`);
  return reasons;
}

const save = (path, proposal) => writeFileSync(path, `${JSON.stringify(proposal, null, 2)}\n`);

function show({ path, proposal }) {
  const d = proposal.document ?? {};
  console.log(`\n${d.docKey ?? path}  ${d.provider ?? ''}  ${proposal.identity?.polymer ?? '?'} ${proposal.identity?.modifier ?? ''}`);
  console.log(`  material ${proposal.identity?.materialId ?? 'NEW'} ${proposal.identity?.materialName ?? ''}${proposal.identity?.needsRuling ? `  RULING NEEDED: ${proposal.identity.reasons.join('; ')}` : ''}`);
  console.log(`  document ${(d.sha256 ?? '').slice(0, 12)}  ${d.pages ?? '?'} page(s)  ${d.url ?? ''}`);
  for (const row of rowsOf(proposal)) {
    const status = row.review?.status ?? 'proposed';
    const mark = status === 'accepted' ? '+' : status === 'rejected' ? '-' : ' ';
    const what = row.kind === 'measurement'
      ? `${row.row.Property} ${row.row['Normalized value']} ${row.row['Normalized unit']}`
      : `${row.kind} ${row.row?.['Product name'] ?? row.row?.Topic ?? ''}`;
    console.log(`  ${mark} ${String(row.id).padEnd(5)} ${what.padEnd(52)} ${row.row?.Locator ?? ''}`);
    if (row.evidence?.text) console.log(`          read from: ${row.evidence.text.slice(0, 120)}`);
    for (const r of holdsBack(row, proposal)) console.log(`          holds back: ${r}`);
  }
  const skipped = proposal.skipped ?? [];
  if (skipped.length) {
    console.log(`  ${skipped.length} line(s) not proposed:`);
    const why = new Map();
    for (const s of skipped) why.set(s.reason, (why.get(s.reason) ?? 0) + 1);
    for (const [reason, n] of [...why].sort((a, b) => b[1] - a[1])) console.log(`      ${String(n).padStart(3)}  ${reason}`);
  }
}

if (process.argv[1]?.endsWith('review.mjs')) {
  const batch = arg('batch'), doc = arg('doc'), by = arg('by');
  const found = find({ batch, doc });
  if (!found.length) { console.error('no proposals match'); process.exit(2); }

  const decide = (status, list, note) => {
    if (!by) { console.error('--by <name>: a review records who made it'); process.exit(2); }
    let touched = 0, held = 0;
    for (const { path, proposal } of found) {
      for (const row of rowsOf(proposal)) {
        if (list !== 'all' && !String(list).split(',').includes(String(row.id))) continue;
        const reasons = status === 'accepted' ? holdsBack(row, proposal) : [];
        if (reasons.length && list === 'all') { held++; continue; }
        row.of.review = { status, by, date: today(), ...(note ? { note } : {}), ...(row.review?.visual ? { visual: true } : {}) };
        touched++;
      }
      save(path, proposal);
    }
    console.log(`${touched} row(s) ${status}${held ? `; ${held} held back for a closer look (run without --accept to see why)` : ''}`);
  };

  // A finding the reviewer has read and accepts, recorded against the row it is about. The record it will get is
  // not known until the batch is applied, so the acceptance names the proposal's row and the applier resolves it.
  if (arg('accept-finding')) {
    const [rowId, code, field] = String(arg('accept-finding')).split(':');
    const reason = arg('note');
    if (!by || !reason || !code) { console.error('usage: --accept-finding <row>:<CODE>[:<Field>] --note "<reason>" --by <name>'); process.exit(2); }
    for (const { path, proposal } of found) {
      if (!rowsOf(proposal).some((r) => String(r.id) === rowId)) continue;
      proposal.acceptances = [...(proposal.acceptances ?? []).filter((a) => !(a.row === rowId && a.code === code)), { row: rowId, code, field: field ?? '', reason, by, date: today() }];
      save(path, proposal);
      console.log(`${proposal.document?.docKey}: ${code} accepted on ${rowId}`);
    }
  } else if (arg('accept')) decide('accepted', arg('accept'), arg('note'));
  else if (arg('reject')) decide('rejected', arg('reject'), arg('note'));
  else if (arg('set')) {
    const target = arg('set'), pair = process.argv[process.argv.indexOf('--set') + 2];
    const [field, ...rest] = String(pair ?? '').split('=');
    if (!by || !pair || !field) { console.error('usage: --set <row> "Field=value" --by <name>'); process.exit(2); }
    for (const { path, proposal } of found) {
      for (const row of rowsOf(proposal)) {
        if (String(row.id) !== target || !row.row) continue;
        const before = row.row[field];
        row.row[field] = rest.join('=');
        row.of.review = { ...(row.review ?? {}), status: 'accepted', by, date: today(), note: `${field}: ${before} -> ${row.row[field]}` };
        console.log(`${target} ${field}: ${before} -> ${row.row[field]}`);
      }
      save(path, proposal);
    }
  } else if (flag('done')) {
    if (!by) { console.error('--by <name>: a review records who made it'); process.exit(2); }
    for (const { path, proposal } of found) {
      const undecided = rowsOf(proposal).filter((r) => !['accepted', 'rejected'].includes(r.review?.status));
      if (undecided.length) { console.error(`${proposal.document?.docKey}: ${undecided.length} row(s) still undecided (${undecided.map((r) => r.id).join(', ')})`); process.exitCode = 1; continue; }
      proposal.review = { status: 'reviewed', by, date: today(), ...(arg('note') ? { note: arg('note') } : {}) };
      save(path, proposal);
      console.log(`${proposal.document?.docKey}: reviewed by ${by}`);
    }
  } else if (doc) {
    for (const f of found) show(f);
  } else {
    const byStatus = new Map();
    for (const { proposal } of found) {
      const rows = rowsOf(proposal);
      const status = proposal.review?.status === 'reviewed' ? 'reviewed'
        : rows.every((r) => ['accepted', 'rejected'].includes(r.review?.status)) ? 'rows decided, document not signed off'
        : 'waiting';
      if (!byStatus.has(status)) byStatus.set(status, []);
      byStatus.get(status).push(proposal);
    }
    console.log(`${found.length} proposal(s), ${found.reduce((a, f) => a + rowsOf(f.proposal).length, 0)} row(s)`);
    for (const [status, list] of byStatus) console.log(`  ${String(list.length).padStart(4)}  ${status}`);
    const waiting = byStatus.get('waiting') ?? [];
    for (const p of waiting.slice(0, 15)) console.log(`        ${p.document?.docKey}  ${p.document?.provider}  ${(p.measurements ?? []).length} value(s)${p.identity?.needsRuling ? '  RULING NEEDED' : ''}`);
  }
}
