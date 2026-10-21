// npm run parity:corpus: rebuild parity/corpus/v0.json from the templates and the current db (only the random edges read it).
import { buildCorpus, CORPUS_PATH, writeCorpus } from './corpus.ts';
import { readDb } from './old-adapter.ts';

const corpus = await buildCorpus(readDb());
writeCorpus(corpus);
console.log(`corpus ${corpus.corpus}: ${JSON.stringify(corpus.counts)} written to ${CORPUS_PATH}`);
