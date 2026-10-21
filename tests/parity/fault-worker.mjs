// Not a test file: a worker thread for fault.test.mjs. It replays some of the nine faults against old over the same cases, each
// fault in a temporary copy of the engine, and sends each report back. It does what the test did in its own thread before, so
// the nine replays can use every core the machine has instead of one.
import { parentPort, workerData } from 'node:worker_threads';
import { runParity } from '../../packages/parity/src/compare.ts';
import { copyEngine } from '../../packages/parity/src/engine-copy.ts';
import { faultByName } from '../../packages/parity/src/faults.ts';
import { createOldAdapter, readDb } from '../../packages/parity/src/old-adapter.ts';
import { sharedOld, subset } from './helpers.mjs';

for (const name of workerData.faults) {
  try {
    const fault = faultByName(name);
    const report = await runParity({
      corpusName: 'v0', cases: subset, before: await sharedOld(),
      after: await createOldAdapter({ name: `fault ${fault.name}`, db: readDb(), engineDir: copyEngine(fault.patches) }),
    });
    parentPort.postMessage({ name, report });
  } catch (err) {
    parentPort.postMessage({ name, error: err instanceof Error ? (err.stack ?? err.message) : String(err) });
  }
}
