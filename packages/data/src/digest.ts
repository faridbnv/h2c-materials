// Identifiers, digests and canonical JSON for the write service (WP-10). Pure: no database, no files.
//
// A branded ID is made by a guard that narrows a checked string (packages/domain/src/core/ids.ts does the same); nothing here
// casts. Digests are lowercase hex SHA-256.
import { createHash, randomBytes } from 'node:crypto';
import type { ChangeRecordId, ChangeSetId, OpId, Sha256, SourceId } from '@atlas/domain/contracts';
import { TABLE_NAMES } from './generated/columns.ts';
import type { TableName } from './generated/columns.ts';
import { csvText } from './csv.ts';
import type { Db } from './driver.ts';
import { countRows, exportTable, storageOf } from './storage.ts';

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
/** 26 characters of Crockford base32 whose first is 0 to 7 (48 bits of time fit 10 characters). */
const ULID = '[0-7][0-9A-HJKMNP-TV-Z]{25}';
const OP_ID = new RegExp(`^${ULID}$`);
const CHANGE_RECORD_ID = new RegExp(`^CR-${ULID}$`);

export const isSourceId = (s: string): s is SourceId => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(s);
export const isSha256 = (s: string): s is Sha256 => /^[0-9a-f]{64}$/.test(s);
/** A ULID (02 section 9.1). */
export const isOpId = (s: string): s is OpId => OP_ID.test(s);
/** `CR-<opId>`: a command makes one record, so its record ID follows from its opId and replays to the same ID. */
export const isChangeRecordId = (s: string): s is ChangeRecordId => CHANGE_RECORD_ID.test(s);
/** Date, topic, four hex of a hash, no counter: '2026-11-04-pla-basic-density-7f3a'. */
export const isChangeSetId = (s: string): s is ChangeSetId => /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{4}$/.test(s);

/** A hex string that is already a SHA-256 digest, as the branded type; throws when it is not 64 lowercase hex characters. */
export function toSha256(hex: string): Sha256 {
  if (!isSha256(hex)) throw new Error(`${JSON.stringify(hex)} is not a SHA-256 digest (64 lowercase hex characters)`);
  return hex;
}

export function sha256Of(bytes: Uint8Array | string): Sha256 {
  return toSha256(createHash('sha256').update(bytes).digest('hex'));
}

/** A new operation ID: 48 bits of time then 80 random bits, in Crockford base32 (a ULID). */
export function newOpId(now: Date = new Date()): OpId {
  let time = now.getTime();
  let head = '';
  for (let i = 0; i < 10; i++) { head = CROCKFORD.charAt(time % 32) + head; time = Math.floor(time / 32); }
  const tail = [...randomBytes(16)].map((byte) => CROCKFORD.charAt(byte % 32)).join('');
  const id = head + tail;
  if (!isOpId(id)) throw new Error(`internal: ${id} is not a ULID (the clock is outside the ULID range)`);
  return id;
}

export function changeRecordIdOf(opId: OpId): ChangeRecordId {
  const id = `CR-${opId}`;
  if (!isChangeRecordId(id)) throw new Error(`internal: ${id} is not a change record ID`);
  return id;
}

export type Json = string | number | boolean | null | readonly Json[] | { readonly [key: string]: Json };

/** Plain code-unit order, not the locale's, so the same keys sort the same on every machine. */
const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : Number(a > b));

/** JSON with object keys sorted at every level, so the same content always has the same bytes (and the same digest). */
export function canonicalJson(value: Json): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value).sort(([a], [b]) => byCodeUnit(a, b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** The canonical CSV record line of one row: what the file holds for it, no line feed. */
function recordLine(table: TableName, cells: readonly (string | null)[]): string {
  const text = csvText(storageOf(table).header, [cells]);
  return text.slice(text.indexOf('\n') + 1, -1);
}

/** The hash an `expect.rowHash` is compared with: SHA-256 of the row's canonical CSV record line. */
export const rowHash = (table: TableName, cells: readonly (string | null)[]): Sha256 => sha256Of(recordLine(table, cells));

export interface TableDigest { readonly rows: number; readonly sha256: Sha256 }

/**
 * The snapshot digest (04 section 3, mechanism 1): SHA-256 over one line per table, `<table> TAB <rows> TAB <sha256> LF`,
 * in the schema's table order. Built from the manifest's own row counts and digests, so the digest of a rebuilt database
 * equals the digest of the committed manifest exactly when every table exports to the committed bytes.
 */
export function snapshotDigestOf(digests: ReadonlyMap<TableName, TableDigest>): Sha256 {
  const lines = TABLE_NAMES.map((table) => {
    const digest = digests.get(table);
    if (!digest) throw new Error(`the snapshot digest needs every table; ${table} is missing`);
    return `${table}\t${digest.rows}\t${digest.sha256}\n`;
  });
  return sha256Of(lines.join(''));
}

/**
 * The canonical export of every table of a database: its row count and the SHA-256 of its CSV text. The text of the tables in
 * `keep` is returned too (the changed tables an export writes), so it is built once.
 */
export function tableDigests(db: Db, keep: ReadonlySet<TableName> = new Set()): { readonly digests: Map<TableName, TableDigest>; readonly texts: Map<TableName, string> } {
  const digests = new Map<TableName, TableDigest>();
  const texts = new Map<TableName, string>();
  for (const table of TABLE_NAMES) {
    const text = exportTable(db, table);
    digests.set(table, { rows: countRows(db, table), sha256: sha256Of(text) });
    if (keep.has(table)) texts.set(table, text);
  }
  return { digests, texts };
}
