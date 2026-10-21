// The base side of a preview, in a worker thread: it receives a SideJob and posts the SideAnswers.
import { parentPort, workerData } from 'node:worker_threads';
import { answerSide } from './side.ts';
import type { SideJob } from './side.ts';

const job: SideJob = workerData;
parentPort?.postMessage(await answerSide(job));
