// The impact preview's own thread. The engine's compile of a changed snapshot takes seconds of solid work; run on the service's thread
// it would hold every other request (the drafts list, the page itself) until it finished. Here it runs apart: the service asks and
// carries on. One session per worker, opened on the first question and kept, so the base answers are computed once.
import { parentPort, workerData } from 'node:worker_threads';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

interface Session {
  warm(): void;
  preview(records: unknown): Promise<unknown>;
  close(): void;
}

const isSession = (value: unknown): value is Session =>
  isRecord(value) && typeof value.warm === 'function' && typeof value.preview === 'function' && typeof value.close === 'function';

if (parentPort === null || !isRecord(workerData) || typeof workerData.root !== 'string' || typeof workerData.specifier !== 'string') {
  throw new Error('impact-worker.ts runs as a worker, given { root, specifier }');
}
const port = parentPort;
const { root, specifier } = workerData;

let session: Promise<Session> | undefined;
const open = (): Promise<Session> => (session ??= import(specifier).then(async (loaded: unknown) => {
  if (!isRecord(loaded) || typeof loaded.openImpactSession !== 'function') throw new Error(`${specifier} has no openImpactSession`);
  const opened: unknown = await loaded.openImpactSession({ root });
  if (!isSession(opened)) throw new Error('the impact module returned no session');
  opened.warm();
  return opened;
}));

port.on('message', (message: unknown) => {
  if (!isRecord(message)) return;
  if (message.close === true) {
    void session?.then((s) => s.close(), () => undefined).finally(() => process.exit(0));
    if (session === undefined) process.exit(0);
    return;
  }
  const { id, records } = message;
  if (typeof id !== 'number') return;
  open()
    .then((s) => s.preview(records))
    .then((report) => port.postMessage({ id, report }))
    .catch((error: unknown) => {
      session = undefined; // a failed session is forgotten, so a retry asks again
      port.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
    });
});
