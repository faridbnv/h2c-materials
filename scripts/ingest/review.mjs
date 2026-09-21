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
//   npm run ingest:review -- --doc <key> --set m03,m04 "Direction=XY" --by "farid"
//   npm run ingest:review -- --doc <key> --visual m01,m02 --by "farid"   (a row read from a scan)
//   npm run ingest:review -- --doc <key> --done --by "farid" [--note "..."]
//
// --accept takes only rows the pipeline is confident about: nothing flagged ambiguous, nothing read from an
// optical-character copy, nothing whose identity is unsettled. Those are named, and taken one at a time.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot } from '../data/table-io.mjs';
import { couldBe, windowFor } from './propose.mjs';
import { basisHead } from '../../build/src/lint-rules.js';

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

/**
 * A value the physics windows put outside anything the property reaches, at the window the row's own matrix and
 * fill select. `couldBe` already decides which way a decimal separator was meant; this asks the same question of
 * every row, because a number with no separator to be ambiguous about can be just as wrong.
 *
 * MatterHackers prints "Tensile Modulus 3.6 MPa" and "Flexural Modulus 3.8 MPa" on its PLA sheet, which is its
 * own slip for GPa; read as printed, a PLA would have a modulus a thousandth of a polyethylene's. The value is
 * still what the sheet says and it is transcribed as such — the reviewer decides whether it enters as a
 * published value physics rules out (D55) or not at all, and that decision is exactly what this asks for.
 */
function outsideEverything(row, proposal) {
  if (row.kind !== 'measurement') return null;
  const value = Number(row.row?.['Normalized value']);
  const unit = String(row.row?.['Normalized unit'] ?? '');
  const judged = proposal.window ?? {};
  const of = { matrix: judged.matrix ?? 'any', fill: judged.fill ?? 'any',
    condition: ['Notched', 'Unnotched'].includes(row.row?.Notch) ? row.row.Notch : 'any' };
  const window = windowFor(row.row?.Property, unit, of);
  // A window that always flags is not a bound the value failed: it says the property means nothing for this kind
  // of material at all. An HDT on an elastomer is one (W0059) — a rubber has no deflection temperature to speak
  // of — and telling a reviewer it is "outside anything this property reaches" would send them to check a number
  // that is not the problem.
  if (window?.['Always flag'] === 'TRUE') {
    return `${basisHead(window.Basis) || 'this property is always flagged for this kind of material'}: read the page and say whether the sheet's own value enters as one physics rules out (D55)`;
  }
  if (couldBe(row.row?.Property, unit, value, of)) return null;
  return `${value} ${unit} is outside anything this property reaches for a ${of.matrix} ${of.fill} material: read the page and say whether the sheet prints it so`;
}

/**
 * The unit a row records, where the page prints a longer one. "Notched Izod Impact 7.6J/M2" is joules per square
 * metre and the lexicon knows J/m, so the longest alias it matched dropped the exponent and changed the value by
 * a thousand. Two documents in this corpus print such a unit; a rule in the reader would be built for twenty
 * (the plan's threshold), and until then a reviewer is told rather than the row quietly entering.
 */
function aUnitThePageDoesNotPrint(row) {
  const unit = String(row.row?.['Raw unit'] ?? '').trim();
  const line = String(row.evidence?.text ?? '');
  if (unit.length < 2 || !line) return null;
  const longer = new RegExp(`${unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\u00b2\u00b3\\d])`, 'i').exec(line);
  return longer ? `the page prints "${unit}${longer[1]}" and the row records "${unit}": the exponent is the difference between this value and a thousand of them` : null;
}

/** Why a row cannot be accepted in bulk: it needs a person to look at this one thing. */
export function holdsBack(row, proposal) {
  const reasons = [];
  if (row.read?.ambiguous ?? row.ambiguous) reasons.push(row.read?.ambiguous ?? row.ambiguous);
  if (row.row?.Notes && row.row.Notes !== 'Not applicable') reasons.push(row.row.Notes);
  if (row.evidence?.ocr) reasons.push('read from an optical-character copy: look at the page image');
  if (proposal.identity?.needsRuling) reasons.push(`the material is unsettled: ${proposal.identity.reasons?.[0] ?? ''}`);
  if ((row.confidence ?? 1) < 0.9) reasons.push(`confidence ${row.confidence}`);
  const outside = outsideEverything(row, proposal);
  if (outside) reasons.push(outside);
  const unit = aUnitThePageDoesNotPrint(row);
  if (unit) reasons.push(unit);
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
  // A document is proposed again in every batch that re-reads it, and the older copies stay in their batch
  // folders as the record of what that batch saw. A review names one of them. Without this, "--doc <key>
  // --accept m01" wrote today's decision into ten batches' worth of history, eight of them long applied.
  if (!batch && new Set(found.map((f) => f.path.split('/proposals/')[1].split('/')[0])).size > 1) {
    const where = [...new Set(found.map((f) => f.path.split('/proposals/')[1].split('/')[0]))];
    console.error(`${doc ?? 'that'} is proposed in ${where.length} batches (${where.join(', ')}); name the one you are reviewing with --batch`);
    process.exit(2);
  }

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
    // <row>:<CODE>[:<Field>], or record:<the record as it will be written>:<CODE>:<table>, whose record may
    // itself contain a colon, so the code and the field are taken from the end.
    const parts = String(arg('accept-finding')).split(':');
    let rowId, code, field;
    if (parts[0] === 'record') { field = parts.pop(); code = parts.pop(); rowId = parts.join(':'); }
    else [rowId, code, field] = parts;
    const reason = arg('note');
    if (!by || !reason || !code) { console.error('usage: --accept-finding <row>:<CODE>[:<Field>] --note "<reason>" --by <name>'); process.exit(2); }
    for (const { path, proposal } of found) {
      // A finding may be about a record that is not one of the proposal's rows: two sources that print the same
      // values are a finding about the pair, and the pair is named as it will be written.
      if (!rowId.startsWith('record:') && !rowsOf(proposal).some((r) => String(r.id) === rowId)) continue;
      proposal.acceptances = [...(proposal.acceptances ?? []).filter((a) => !(a.row === rowId && a.code === code)), { row: rowId, code, field: field ?? '', reason, by, date: today() }];
      save(path, proposal);
      console.log(`${proposal.document?.docKey}: ${code} accepted on ${rowId}`);
    }
  } else if (arg('visual')) {
    // A row read from a scan needs a person to look at the page image and say the number is the number. The
    // images are in .cache/pages/<sha>/, one per page, written by ingest:ocr.
    const targets = new Set(String(arg('visual')).split(',').map((x) => x.trim()).filter(Boolean));
    if (!by) { console.error('usage: --visual <row[,row...]> --by <name> [--note "..."]'); process.exit(2); }
    let n = 0;
    for (const { path, proposal } of found) {
      for (const row of rowsOf(proposal)) {
        if (!targets.has(String(row.id))) continue;
        row.of.review = { ...(row.review ?? {}), status: 'accepted', by, date: today(), visual: true, ...(arg('note') ? { note: arg('note') } : {}) };
        n++;
      }
      save(path, proposal);
    }
    console.log(`${n} row(s) read against the page image`);
  } else if (arg('accept')) decide('accepted', arg('accept'), arg('note'));
  else if (arg('reject')) decide('rejected', arg('reject'), arg('note'));
  else if (arg('set')) {
    const targets = new Set(String(arg('set')).split(',').map((s) => s.trim()).filter(Boolean));
    const pair = process.argv[process.argv.indexOf('--set') + 2];
    const [field, ...rest] = String(pair ?? '').split('=');
    if (!by || !pair || !field) { console.error('usage: --set <row[,row...]> "Field=value" --by <name>'); process.exit(2); }
    for (const { path, proposal } of found) {
      for (const row of rowsOf(proposal)) {
        if (!targets.has(String(row.id)) || !row.row) continue;
        const before = row.row[field];
        // A note is what a row says about itself, and a reviewer usually has something to add to it rather than
        // something to put in its place. Every other field is replaced.
        row.row[field] = field === 'Notes' && before && !/^Not (applicable|published)$/.test(before)
          ? `${before}; ${rest.join('=')}`
          : rest.join('=');
        row.of.review = { ...(row.review ?? {}), status: 'accepted', by, date: today(), note: `${field}: ${before} -> ${row.row[field]}` };
        console.log(`${row.id} ${field}: ${before} -> ${row.row[field]}`);
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
