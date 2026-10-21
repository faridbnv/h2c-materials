// A test server for the editor journey (not the editor: `npm run editor` is). It starts the real service with a preview that answers
// from a fixed report, so the journey can see the list of moved answers while WP-11's engine is not on this branch. Test only.
import { parseArgs } from 'node:util';
import { impactFrom } from '../../apps/editor/server/impact.ts';
import { startService } from '../../apps/editor/server/service.ts';

const { values } = parseArgs({ options: { workspace: { type: 'string' }, 'source-store': { type: 'string' } } });
const report = {
  status: 'ready', mode: 'core', moved: 2, estimatesPending: true, byTemplate: { 'everyday-pla': 2 }, listingShifts: 1, materials: ['M001'], seconds: 1.2,
  moves: [
    { case: 'template/everyday-pla', record: 'material:M001', materialId: 'M001', changes: [{ field: 'verdict', before: 'pass', after: 'fail' }] },
    { case: 'census/c-014', record: 'product:M001/G001-01', materialId: 'M001', changes: [{ field: 'best', before: 'G001-01', after: 'none' }] },
  ],
};
const service = await startService({ workspaceDir: values.workspace, sourceStore: values['source-store'], env: {}, backupEveryMs: 0, impact: impactFrom(() => Promise.resolve(report)) });
console.log(JSON.stringify({ ready: true, launchUrl: service.launchUrl }));
process.once('SIGTERM', () => { void service.close().then(() => process.exit(0)); });
