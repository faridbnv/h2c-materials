import test from 'node:test';
import assert from 'node:assert/strict';
import { printSummary } from '../build/src/compile.js';
import { attachPrintEstimates } from '../build/src/estimate/print.js';
import { printRange } from '../app/js/ui/table.js';

const unknown = () => ({ state: 'unknown', min: null, max: null });
const profile = (bed) => ({ nozzle: unknown(), chamber: unknown(), bed });
// PAHT9825 guide p1, original SHA941cb5b0f2b9208e4db0a9c6c578e0283db7a3a86767f3f44f7de92c28790ffe:
// "Build plate temperature: <80°C" supplies no lower endpoint or 80°C point setpoint.
test('an upper-only published setting retains its missing lower endpoint in the material summary and display', () => {
  const bed = printSummary([profile({state:'range', min:null, max:80})]).bedC;
  assert.deepEqual(bed, {min:null, max:80, profiles:1});
  assert.equal(printRange(bed), 'upper bound 80');
});
test('a union containing an undisclosed lower endpoint cannot replace it with another profile endpoint', () => {
  const bed = printSummary([profile({state:'range', min:null, max:80}), profile({state:'range', min:100, max:120})]).bedC;
  assert.deepEqual(bed, {min:null, max:120, profiles:2});
});
test('an incomplete published window neither becomes a calibration peer nor gets replaced by an estimate', () => {
  const material = (id,bedC,reinforcement='none') => ({id,name:id,estimateIdentity:'PAHT',print:{bedC},facets:{reinforcement:{value:reinforcement}}});
  const bounded=material('upper-only',{min:null,max:80}), closed=material('complete',{min:100,max:120}), missing=material('missing',null);
  attachPrintEstimates([bounded,closed,missing],{identities:{PAHT:{group:'nylon',morphology:'amorphous'}}});
  assert.equal(bounded.print.bedEstimate,undefined);
  assert.equal(missing.print.bedEstimate.lo,100);
  assert.equal(missing.print.bedEstimate.hi,120);
  assert.deepEqual(missing.print.bedEstimate.peers.map(p=>p.materialId),['complete']);
});
test('incomplete windows cannot manufacture a fibre offset', () => {
  const material=(id,bedC,fibre)=>({id,name:id,estimateIdentity:'PAHT',print:{bedC},facets:{reinforcement:{value:fibre?'carbon-fibre':'none'}}});
  const result=attachPrintEstimates([material('upper-only',{min:null,max:80},false),material('filled',{min:100,max:120},true)],{identities:{PAHT:{group:'nylon',morphology:'amorphous'}}});
  assert.equal(result.fibreOffset.bed,0);
});
