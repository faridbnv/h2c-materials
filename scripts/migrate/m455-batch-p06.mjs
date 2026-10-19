#!/usr/bin/env node
// Price batch p06 (the research intake, stage 6; D113): nine listings from the price leads of the research package of
// 2026-10-19 and the intake's price agent, each page captured live on 2026-10-19 and its offer read. purefil's own shop
// prices SAN, COC tough and flex, HDPE GF20, PBT and TPV before VAT, as each page prints ("Excl. VAT excl. Shipping");
// MatterHackers lists 3DXTECH's 3DXMAX PC/ASA in USD and Multitech 3D its 3DXSTAT ESD-PPS in EUR before VAT, both out of
// stock and so recorded but never sampled; Polymaker's own store sells Panchroma Satin PLA on Amazon.ca, on sale below
// its list price. The review, and the leads not taken with why, is
// docs/audits/2026-10-19-research-intake/prices/review-p06.mjs. A second run writes nothing.
import { applyPriceBatch } from '../../scripts/ingest/prices.mjs';

const migration = 'm455-batch-p06';
const { log } = applyPriceBatch('p06', { migration, date: '2026-10-19' });
console.log(`${migration}: ${log.length} record(s) written`);
