#!/usr/bin/env node
// Migration m27: which measurements bound a headline from below is a fact about the headline, so it moves from the
// estimate model's configuration (build/mappings/estimate-model.json impliedBounds) to the headline registry
// (DECISIONS D58). Compile reads it there: a material's own printed yield or break stress bounds its ultimate
// strength, its strain at yield bounds its strain at break, and its HDT at 1.8 MPa bounds its HDT at 0.45 MPa, with or
// without the estimate stage. The values are copied unchanged; the compiled database gains only the registry fields.
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';

const NA = 'Not applicable';
export const LOWER_BOUNDS = {
  tensileStrengthXY: {
    properties: 'Tensile yield strength; Tensile break strength; Tensile strength (endpoint unspecified)', load: NA, excludes: NA,
    basis: 'The ultimate strength is the maximum stress, so it is at least the yield and break stress; a printed part is strongest in XY, so a value in any direction bounds the XY one.',
  },
  elongationXY: {
    properties: 'Elongation at break; Elongation at yield; Tensile strain at strength', load: NA, excludes: 'conditioned',
    basis: 'A bar breaks after it yields and after it reaches its maximum stress; XY strain at break is at least the strain in any other direction. A conditioned value bounds nothing: absorbed water plasticises a nylon and raises its strain, so it can exceed the dry headline.',
  },
  hdt045: {
    properties: 'HDT', load: '1.8', excludes: NA,
    basis: 'A bar deflects at a lower temperature under a heavier load, so the value at 0.45 MPa is at least the value at 1.8 MPa.',
  },
};

export function migrate(t) {
  const columns = [['Lower bound properties', 'properties'], ['Lower bound load MPa', 'load'], ['Lower bound excludes', 'excludes'], ['Lower bound basis', 'basis']];
  let after = 'Related properties';
  for (const [column, field] of columns) {
    if (!t.header('headline_definitions').includes(column)) t.addColumn('headline_definitions', column, { after, fill: (r) => LOWER_BOUNDS[r.HeadlineKey]?.[field] ?? NA });
    after = column;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record} ${c.field ?? ''}`);
}
