// The compiled database and the records the pages read are not yet modelled field by field in TypeScript (WP-24 is a
// type-add: no layout change). Where a value is one of those records, or a function takes one, it is `Loose`: the one
// named place that stands for "a record of the compiled database, typed in a later step". The type ratchet counts it
// (remake/types-ratchet.json), so it can only be tightened, never spread.
export type Loose = any;
