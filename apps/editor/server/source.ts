// The private source store, read only (02 section 5 and 10). The store keeps what the repository must not: the text of each retrieved
// document page by page (`text/<sha256>.json`) and, for some, page images (`pages/<sha256>/o-<page>.png`). It is found at
// $H2C_SOURCE_BACKUP, or at $H2C_DOCUMENT_CACHE, or in the old tool's `.cache/`. When none holds a `text/` folder the editor says so
// and never shows a page it does not have. Nothing a document says is ever run: it is shown as text and as an image.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Sha256 } from '@atlas/domain/contracts';
import { defaultTextStore } from '@atlas/data/evidence';
import type { PageTextStore } from '@atlas/data/evidence';
import { isSha256 } from '@atlas/data/digest';
import type { SourceAvailability, SourceInfo } from '../shared/api.ts';

type Pages = ReadonlyMap<number, readonly string[]>;

export interface SourceLibrary {
  /** Where the store is, or null when this computer has none. */
  readonly root: string | null;
  /** The write service's page text (the quote check), or null when there is no store. */
  readonly textStore: PageTextStore | null;
  /** The text of a document, page by page; null when the store does not hold it or its entry is damaged. */
  pages(sha256: string): Pages | null;
  /** A page image the store holds, or null. */
  imagePath(sha256: string, page: number): string | null;
  /** What the editor can show of a source row. */
  describe(row: SourceRow): SourceInfo;
}

/** The cells of a `sources` record the editor reads. */
export interface SourceRow {
  readonly sourceId: string;
  readonly title: string | null;
  readonly publisher: string | null;
  readonly revision: string | null;
  readonly accessState: string | null;
  readonly sha256: string | null;
}

export interface SourceLocation {
  readonly explicit?: string;
  readonly env?: NodeJS.ProcessEnv;
  /** The repository root, whose `.cache/` is the last place looked. */
  readonly repoRoot: string;
}

/** The first of the candidate folders that holds a `text/` folder. */
function findStore({ explicit, env = process.env, repoRoot }: SourceLocation): string | null {
  const candidates = [explicit, env.H2C_SOURCE_BACKUP, env.H2C_DOCUMENT_CACHE, join(repoRoot, '.cache')];
  return candidates.find((c): c is string => typeof c === 'string' && c !== '' && existsSync(join(c, 'text'))) ?? null;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** One cached document as text. The entry must name the digest it was made for. */
function parsePages(value: unknown, sha256: string): Pages | null {
  if (!isRecord(value) || !Array.isArray(value.pages)) return null;
  if (typeof value.sha === 'string' && value.sha !== sha256) return null;
  const pages = new Map<number, readonly string[]>();
  const entries: unknown[] = value.pages;
  for (const entry of entries) {
    if (!isRecord(entry) || typeof entry.page !== 'number' || !Array.isArray(entry.lines)) return null;
    const lines: unknown[] = entry.lines;
    pages.set(entry.page, lines.flatMap((line) => (isRecord(line) && typeof line.text === 'string' ? [line.text] : [])));
  }
  return pages;
}

export const SOURCE_NOTES: Readonly<Record<Exclude<SourceAvailability, 'available'>, string>> = {
  'no-store': 'Source not available on this computer. The private source store is not here (set H2C_SOURCE_BACKUP to its folder), so you can read the record but cannot check a quote against the page.',
  'not-in-store': 'Source not available on this computer. The private store does not hold this document, so a quote cannot be checked against its page.',
  'not-retrieved': 'This source was never retrieved, so there is no page to show.',
  'no-digest': 'No digest is recorded for this source, so its page cannot be matched to a stored document.',
  'unknown-source': 'This record names a source that is not in the sources table.',
};

const MAX_CACHED_DOCUMENTS = 6;

/** The stored text of a document, or null when there is no such file or it is damaged. */
function readPages(path: string, sha256: string): Pages | null {
  try { return parsePages(JSON.parse(readFileSync(path, 'utf8')), sha256); } catch { return null; }
}

export function openSourceLibrary(location: SourceLocation): SourceLibrary {
  const root = findStore(location);
  const cache = new Map<string, Pages | null>();
  const library: SourceLibrary = {
    root,
    textStore: root === null ? null : defaultTextStore(location.repoRoot, { H2C_DOCUMENT_CACHE: root }),
    pages(sha256) {
      if (root === null || !isSha256(sha256)) return null;
      if (cache.has(sha256)) return cache.get(sha256) ?? null;
      const pages = readPages(join(root, 'text', `${sha256}.json`), sha256);
      if (cache.size >= MAX_CACHED_DOCUMENTS) cache.delete(cache.keys().next().value ?? '');
      cache.set(sha256, pages);
      return pages;
    },
    imagePath(sha256, page) {
      if (root === null || !isSha256(sha256) || !Number.isInteger(page) || page < 1) return null;
      const path = join(root, 'pages', sha256, `o-${page}.png`);
      return existsSync(path) ? path : null;
    },
    describe(row) {
      const base = { sourceId: row.sourceId, title: row.title, publisher: row.publisher, revision: row.revision, accessState: row.accessState, sha256: row.sha256 };
      const sha = row.sha256;
      const unavailable = (availability: Exclude<SourceAvailability, 'available'>): SourceInfo =>
        ({ ...base, availability, note: SOURCE_NOTES[availability], pageCount: null, imagePages: [] });
      if (row.accessState === 'not-retrieved') return unavailable('not-retrieved');
      if (sha === null || !isSha256(sha)) return unavailable('no-digest');
      if (root === null) return unavailable('no-store');
      const pages = library.pages(sha);
      if (pages === null) return unavailable('not-in-store');
      const numbers = [...pages.keys()].sort((a, b) => a - b);
      return {
        ...base, availability: 'available', pageCount: numbers.length,
        note: 'The words below are the stored text of the document with this digest. Select words to use them as the quote.',
        imagePages: numbers.filter((n) => library.imagePath(sha, n) !== null),
      };
    },
  };
  return library;
}

/** The digest as a typed value, or null when a cell is not one (the write service types it so). */
export const digestOf = (cell: string | null): Sha256 | null => (cell !== null && isSha256(cell) ? cell : null);
