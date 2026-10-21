// Reading records out of the sandbox workspace for the editor: find a product, list its values, read one value with its source.
// Reads only. Every change goes through the write service (editor.ts).
import type { Db } from '@atlas/data/driver';
import { TABLES } from '@atlas/data';
import type { TableName } from '@atlas/data';
import { readRow, storageOf, textExpression } from '@atlas/data/storage';
import type { Cells, MeasurementRow, ProductDetail, ProductHit } from '../shared/api.ts';
import type { SourceRow } from './source.ts';

/** One record as its cells by column name, with its position in the table. */
export interface StoredRecord {
  readonly ord: number;
  readonly cells: Cells;
}

const toCells = (table: TableName, values: readonly (string | null)[]): Cells =>
  Object.fromEntries(storageOf(table).header.map((name, k) => [name, values[k] ?? null]));

/** The record of `table` whose single-column key is `key`, or null. */
export function recordOf(db: Db, table: TableName, key: string): StoredRecord | null {
  const [keyColumn] = TABLES[table].primaryKey;
  if (keyColumn === undefined || TABLES[table].primaryKey.length !== 1) throw new Error(`${table} has no single-column key`);
  const found = db.prepare(`SELECT _ord FROM "${table}" WHERE ${textExpression(table, keyColumn)} = ?`).get(key);
  const ord = found === undefined ? undefined : Number(found._ord);
  if (ord === undefined) return null;
  const values = readRow(db, table, ord);
  return values === null ? null : { ord, cells: toCells(table, values) };
}

/** Every record of a small table, by file order. */
function allRecords(db: Db, table: TableName): Cells[] {
  const { selectSql, header } = storageOf(table);
  return db.prepare(selectSql).all().map((row) => Object.fromEntries(header.map((name, k) => {
    const value = row[`c${k}`];
    return [name, typeof value === 'string' ? value : null];
  })));
}

const text = (cells: Cells, name: string): string => cells[name] ?? '';
const nullable = (cells: Cells, name: string): string | null => cells[name] ?? null;

// ---------------------------------------------------------------- find a product

interface IndexedProduct {
  readonly hit: ProductHit;
  readonly words: readonly string[];
  readonly rank: number;
}

const wordsOf = (...parts: string[]): string[] => parts.join(' ').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w !== '');

export interface ProductIndex {
  search(query: string, limit?: number): ProductHit[];
}

/** An index of products (grades) with their maker, name and material. Word starts match, as the selector's search does. */
export function buildProductIndex(db: Db): ProductIndex {
  const materials = new Map(allRecords(db, 'materials').map((m) => [text(m, 'MaterialID'), m]));
  const products: IndexedProduct[] = allRecords(db, 'grades').map((g) => {
    const material = materials.get(text(g, 'MaterialID')) ?? {};
    const materialName = text(material, 'Full name') || text(material, 'Original name');
    const hit: ProductHit = {
      gradeId: text(g, 'GradeID'), materialId: text(g, 'MaterialID'), manufacturer: text(g, 'Manufacturer'), productName: text(g, 'Product name'),
      materialName, status: text(g, 'Status'),
    };
    const words = wordsOf(hit.gradeId, hit.manufacturer, hit.productName, materialName, text(material, 'Abbreviation'), text(material, 'Family'));
    return { hit, words, rank: hit.status === 'active' ? 0 : 1 };
  });
  return {
    search(query, limit = 40) {
      const wanted = wordsOf(query);
      if (wanted.length === 0) return [];
      return products
        .filter((p) => wanted.every((w) => p.words.some((word) => word.startsWith(w))))
        .sort((a, b) => a.rank - b.rank || a.hit.productName.localeCompare(b.hit.productName) || a.hit.gradeId.localeCompare(b.hit.gradeId))
        .slice(0, limit)
        .map((p) => p.hit);
    },
  };
}

// ---------------------------------------------------------------- a product's record

const DETAIL_LABELS: readonly (readonly [string, string])[] = [
  ['Role', 'Role'], ['Variant', 'Variant'], ['Composition / filler', 'Composition'], ['Diameter', 'Diameter'], ['Availability', 'Availability'],
];

const known = (value: string | null): value is string => value !== null && value !== '' && value !== 'Not published' && value !== 'Not applicable';

function measurementRow(cells: Cells, drafts: ReadonlySet<string>): MeasurementRow {
  const conditions = [
    ['direction', 'Direction'], ['test temp.', 'Test temperature'], ['standard', 'Standard / load'], ['moisture', 'Moisture condition'], ['after', 'Post-processing'],
  ].flatMap(([label, column]) => {
    const value = nullable(cells, column ?? '');
    return known(value) ? [`${label} ${value}`] : [];
  });
  return {
    id: text(cells, 'MeasurementID'), property: text(cells, 'Property'),
    rawValue: nullable(cells, 'Raw value'), rawUnit: nullable(cells, 'Raw unit'),
    normalizedValue: nullable(cells, 'Normalized value'), normalizedUnit: nullable(cells, 'Normalized unit'),
    conditions, dataStatus: nullable(cells, 'Data status'), sourceId: nullable(cells, 'SourceID'), locator: nullable(cells, 'Locator'),
    draft: drafts.has(text(cells, 'MeasurementID')),
  };
}

/** A product with its measurements, in file order. `drafts` holds the IDs of the measurements that have an unexported draft. */
export function productDetail(db: Db, gradeId: string, drafts: ReadonlySet<string>): ProductDetail | null {
  const grade = recordOf(db, 'grades', gradeId);
  if (grade === null) return null;
  const material = recordOf(db, 'materials', text(grade.cells, 'MaterialID'));
  const product: ProductHit = {
    gradeId, materialId: text(grade.cells, 'MaterialID'), manufacturer: text(grade.cells, 'Manufacturer'), productName: text(grade.cells, 'Product name'),
    materialName: material === null ? '' : text(material.cells, 'Full name') || text(material.cells, 'Original name'), status: text(grade.cells, 'Status'),
  };
  const ords = db.prepare(`SELECT _ord FROM "measurements" WHERE ${textExpression('measurements', 'GradeID')} = ? ORDER BY _ord`).all(gradeId);
  const measurements = ords.flatMap((row) => {
    const values = readRow(db, 'measurements', Number(row._ord));
    return values === null ? [] : [measurementRow(toCells('measurements', values), drafts)];
  });
  const details = DETAIL_LABELS.flatMap(([column, label]) => {
    const value = nullable(grade.cells, column ?? '');
    return known(value) ? [{ label: label ?? '', value }] : [];
  });
  return { product, details, measurements };
}

// ---------------------------------------------------------------- sources

export function sourceRowOf(db: Db, sourceId: string | null): SourceRow | null {
  if (sourceId === null) return null;
  const source = recordOf(db, 'sources', sourceId);
  if (source === null) return null;
  const sha = nullable(source.cells, 'SHA256');
  return {
    sourceId, title: nullable(source.cells, 'Title'), publisher: nullable(source.cells, 'Publisher'), revision: nullable(source.cells, 'Revision'),
    accessState: nullable(source.cells, 'Access state'), sha256: sha,
  };
}

/** The page a locator such as "p. 3: Density" names, or null. */
export function pageOfLocator(locator: string | null): number | null {
  const match = locator === null ? null : /\bp(?:p|age)?\.?\s*(\d{1,4})\b/i.exec(locator);
  const page = match?.[1] === undefined ? null : Number(match[1]);
  return page !== null && page >= 1 ? page : null;
}

/** Normalized = raw numeric x factor, when both are plain numbers. */
export function plainFactor(cells: Cells): string | null {
  const factor = nullable(cells, 'Conversion factor');
  return factor !== null && /^-?\d+(\.\d+)?$/.test(factor) ? factor : null;
}
