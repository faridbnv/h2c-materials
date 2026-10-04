// GOALS steps 2/5: restore the constructor's registered editorial H2C source reference.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {openTables,projectRoot} from '../data/table-io.mjs';
import {applyPriorityProfilePacket} from './priority-profile-packet.mjs';
const p=JSON.parse(readFileSync(join(projectRoot,'docs/audits/2026-09-30-coverage-expansion/priority-06-h2c-reference-packet.json'))),t=openTables();
const expected=p.ExistingConstructorH2CSource,actual=t.get('sources',expected.SourceID);
if(!actual||Object.entries(expected).some(([k,v])=>actual[k]!==v))throw Error('m329: editorial H2C source moved');
applyPriorityProfilePacket('priority-06-h2c-reference','3831811c28271a7edfeac856f34d273babb264578cbb9691024222f3d6aa52f1','m329-priority-06-h2c-reference');
