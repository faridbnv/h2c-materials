// Loading a release's data parts. Nothing is returned unless the whole part loaded, is the shape the page expects, names the
// page's release, and agrees with itself; anything else throws, and the view says so instead of showing part of an answer.
import { DataShapeError, parseMaterial, parseResult } from './model.ts';
import type { MaterialFile, ResultFile } from './model.ts';
import { assertSameRelease, StaleShellError } from './release.ts';
import { sameCounts, tally } from './tally.ts';

/** The part of `fetch` the page uses; a test passes a stand-in. */
export type FetchLike = (url: string) => Promise<{ readonly ok: boolean; readonly status: number; json(): Promise<unknown> }>;

/** The data could not be fetched at all (offline, a failed connection): not a stale page. */
export class NetworkError extends Error {
  constructor(url: string, cause: unknown) {
    super(`could not fetch ${url}`, { cause });
    this.name = 'NetworkError';
  }
}

/** The detail shards a brief, an export or the drawer could not get, so that it must not emit. (Here, beside NetworkError, so a page that never loads shards can still say it.) */
export class DetailsIncomplete extends Error {
  readonly materialId: string;
  constructor(materialId: string, cause: unknown) {
    super(`the detail of ${materialId} could not be loaded, so nothing is emitted`, { cause });
    this.name = 'DetailsIncomplete';
    this.materialId = materialId;
  }
}

/** The address is well formed but this release holds no such material: a mistake in the link, not a stale page. */
export class NoMaterialError extends DataShapeError {
  constructor(materialId: string) {
    super('the address', `names no material in this release (${materialId})`);
    this.name = 'NoMaterialError';
  }
}

/** Where a part of a release lives, relative to the page. */
export const partUrl = (release: string, path: string): string => `data/${release}/${path}`;

/** One part of the page's release, as JSON. A 404 is a stale page, a failed connection or an HTTP error is not, and text that is not JSON is a damaged part. */
export async function fetchPart(fetchFn: FetchLike, embedded: string, path: string, what: string): Promise<unknown> {
  const url = partUrl(embedded, path);
  let response;
  try {
    response = await fetchFn(url);
  } catch (cause) {
    throw new NetworkError(url, cause);
  }
  // 404: the server no longer holds this release's part, so a newer release was published and this page is old.
  if (response.status === 404) throw new StaleShellError(embedded, null, what);
  if (!response.ok) throw new NetworkError(url, new Error(`HTTP ${response.status}`));
  try {
    return await response.json();
  } catch (cause) {
    throw new DataShapeError(what, `is not JSON (${cause instanceof Error ? cause.message : String(cause)})`);
  }
}

export async function loadResult(embedded: string, fetchFn: FetchLike): Promise<ResultFile> {
  const file = parseResult(await fetchPart(fetchFn, embedded, 'result.json', 'the results file'));
  assertSameRelease(embedded, 'the results file', file.release);
  if (!sameCounts(tally(file.materials), file.counts)) throw new DataShapeError('the results file', 'its rows do not add up to its own counts');
  return file;
}

const MATERIAL_ID = /^M\d+$/;
export const isMaterialId = (id: string): boolean => MATERIAL_ID.test(id);

export async function loadMaterial(embedded: string, materialId: string, fetchFn: FetchLike): Promise<MaterialFile> {
  if (!isMaterialId(materialId)) throw new DataShapeError('the address', 'names no material');
  let json;
  try {
    json = await fetchPart(fetchFn, embedded, `material/${materialId}.json`, 'the material file');
  } catch (error) {
    if (!(error instanceof StaleShellError) || error.found !== null) throw error;
    // A 404 is a stale page only if the release is gone. If the same release's results still load, the release is here and the material is not.
    const probed = await loadResult(embedded, fetchFn).then(() => true, () => false);
    if (probed) throw new NoMaterialError(materialId);
    throw error;
  }
  const file = parseMaterial(json);
  assertSameRelease(embedded, 'the material file', file.release);
  if (file.materialId !== materialId) throw new DataShapeError('the material file', `holds ${file.materialId}, not ${materialId}`);
  return file;
}
