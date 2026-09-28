#!/usr/bin/env node
// GOALS steps 2/5, C6: exact held Recreus PET-G HDT, original p. 1 and optical reading pinned in b38/review.mjs.
import {applyBatch} from '../ingest/apply.mjs';
import {openTables} from '../data/table-io.mjs';
const migration='m220-batch-b38';
console.log(applyBatch('b38',{migration,date:'2026-09-28'}));
const t=openTables(),SourceID='X-RECREUS-PET-G-TDS-2023';
if(!t.rows('know_how_reads').some(r=>r.SourceID===SourceID&&r.Scope==='document')){t.append('know_how_reads',{SourceID,Scope:'document','Read on':'2026-09-28','Read by':migration+': Codex AI agent; original full sheet and optical reading reviewed'});t.save();}
