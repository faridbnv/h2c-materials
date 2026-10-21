// The release a page was built for, and the stale-shell guard (pack 02 section 6.2).
//
// Pages caches every file for ten minutes, so a browser can hold an old page that points at data a newer deploy replaced, or a
// new page next to old cached data. The page names its release inline (a meta tag in the HTML it came in). Every data part
// names its release too. The page computes only from parts that name the same release as the page; otherwise it refuses and
// offers a reload. A part that is gone (a 404) is the same case: the page is older than the data on the server.

export const RELEASE_PATTERN = /^[0-9a-f]{12}$/;

/** The page and a data part are not of one release, or the part is gone: the page in this tab is not the current one. */
export class StaleShellError extends Error {
  readonly embedded: string;
  readonly found: string | null;
  readonly part: string;
  constructor(embedded: string, found: string | null, part: string) {
    super(found === null ? `${part} is not published for release ${embedded}` : `${part} is release ${found}, this page is release ${embedded}`);
    this.name = 'StaleShellError';
    this.embedded = embedded;
    this.found = found;
    this.part = part;
  }
}

/** The release a page names inline (`<meta name="h2c-release">`). A page that names none, or names garbage, cannot compute. */
export function embeddedRelease(doc: Pick<Document, 'querySelector'>): string {
  const content = doc.querySelector('meta[name="h2c-release"]')?.getAttribute('content') ?? '';
  if (!RELEASE_PATTERN.test(content)) throw new Error(`this page names no valid release (found "${content}")`);
  return content;
}

/** Refuse a part that is not of the page's release. */
export function assertSameRelease(embedded: string, part: string, found: string): void {
  if (found !== embedded) throw new StaleShellError(embedded, found, part);
}
