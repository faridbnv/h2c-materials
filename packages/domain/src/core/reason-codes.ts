// The reason codes (02 section 9.5; 15-TYPESCRIPT-PLAN section 2, addition 5): one name per place that writes a distinct
// reason sentence, seeded from the old code with the file and line each came from (old code at the WP-07 base). The engine
// (WP-19) sets one beside the sentence at the place that writes it; the sentence itself is never touched. The lists are
// here, as values, so the boundary can check a code the engine says is one of them; the types are derived from them.

/** Print gate reasons, written by the build into a gate (build/src/gates.js, build/src/normalize/process.js, products.js, chamber-need.js). */
export const GATE_REASON_CODES = [
  'gate.no-print-profile',                    // gates.js:26,53 'No print profile recorded'; constraints.js:582; engine/products.js:211 '... for this product'; parsed at constraints.js:948
  'gate.no-requirement-published',            // process.js:259 'No requirement published'
  'gate.no-temperature-published',            // process.js:279 'No temperature published'; parsed at constraints.js:949
  'gate.no-chamber-needed',                   // process.js:262-264 'No heated chamber needed' / '... no enclosure is needed ...'
  'gate.enclosure-counts',                    // process.js:268-270 'An enclosure is asked for ...' / 'Its maker asks for an enclosure ...'
  'gate.chamber-dash',                        // process.js:273 'The source prints "-" for the chamber ...'
  'gate.chamber-recommended-no-temperature',  // process.js:276 'A heated chamber is recommended with no temperature ...'
  'gate.within-low-end',                      // process.js:232 "At the low end of the maker's window ..."
  'gate.edge',                                // process.js:236 "The H2C reaches only the bottom of the maker's window ..."
  'gate.recommends-at-least-above',           // process.js:287 'Recommends at least ... but does not require it'
  'gate.requires-at-least-above',             // process.js:288 'Requires at least ...; the H2C reaches only ...'
  'gate.needs-at-least-within',               // process.js:291 'Needs at least ...; the H2C reaches ...'
  'gate.needs-up-to-within',                  // process.js:294 'Needs up to ...; the H2C reaches ...'
  'gate.recommends-up-to-above',              // process.js:301 'Recommends up to ... but does not require it'
  'gate.requires-up-to-above',                // process.js:307 'Requires up to ...; the H2C reaches only ...'
  'gate.enclosure-asked-no-temperature',      // products.js:584 'Asks for an enclosure but gives no chamber temperature, so 65 °C is not shown to be enough'
  'gate.chamber-by-kind',                     // chamber-need.js:100 'No chamber stated; of the N makers of <kind> who state one, ...'
] as const;

/** Reasons the engine writes (app/js/engine/constraints.js unless named). */
export const ENGINE_REASON_CODES = [
  // evaluateNumeric
  'numeric.not-applicable',                   // :150 'Does not apply: ...'
  'numeric.estimate-screened',                // :187 'Not published. Estimated ... which cannot meet this requirement. Hidden; not measured'
  'numeric.estimate-vetoed',                  // :189 '... would fail, but its own ... bounds it from below ...'
  'numeric.estimate-may-still-meet',          // :191 '... would fail, but the range it may screen on ... could still meet it'
  'numeric.estimate-cannot-screen',           // :192 '... would fail, but <screen limit>'
  'numeric.estimate-not-failing',             // :193 '...; plausible|possible, but never ...'
  'numeric.ceiling-only',                     // :219 'Published ... on a bar its sheet does not describe ...'
  'numeric.as-published-not-described',       // :229 'Published ... on a test bar its document does not describe as printed ...'
  'numeric.as-published-load-not-stated',     // :231 'Published ... without the test load ...'
  'numeric.as-published-no-orientation',      // :232 'Published ... without a usable specimen orientation ...'
  'numeric.other-state',                      // :237 elsewhereReason
  'numeric.no-price-in-shops',                // :242 'No price in the sampled shops'
  'numeric.related-values-only',              // :243 'No qualifying measurement. Published related values: ...'
  'numeric.not-published',                    // :243 'Not published in the sampled sources ...'
  'numeric.bound-straddles',                  // :272 'Published <bound> ..., a bound that leaves the threshold on either side ...'
  'numeric.range-straddles',                  // :273 'Reported range ... straddles the threshold'
  'numeric.assumed',                          // :277 'Assumed ... (a scenario assumption, not published)'
  'numeric.published',                        // :278 'Published ...' (with its caveat, margin and doubt clauses)
  'ledger.sheets-disagree',                   // :376 disagreeReason
  'ledger.bound',                             // :398 ledgerReason (verdict pass, line or fail)
  // evaluateTreatment
  'treatment.as-printed',                     // :453 'Used as printed'
  'treatment.schedule-incomplete',            // :455 'Its values in this state come from bars annealed ...'
  'treatment.annealing-allowed',              // :457 'Needs annealing ..., as its sheet states ...'
  // evaluateGate
  'scope.beyond-h2c',                         // :483 'Beyond H2C capability: more heat than the H2C gives'
  'scope.within-h2c',                         // :484 'Within H2C capability'
  'h2c-status.not-own-spool',                 // :497 "... is not Bambu Lab's own spool; its family is ..."
  'h2c-status.recorded',                      // :498 'Recorded status is "..."'
  'nozzle.hardened-available',                // :511 'A hardened nozzle prints abrasive and non-abrasive filament'
  'nozzle.requires-hardened',                 // :516 'A source states it needs an abrasion-resistant nozzle'
  'nozzle.no-special-concern',                // :517 'A source states no special nozzle concern'
  'nozzle.harder-than-brass',                 // :524 'The maker asks for a nozzle harder than brass ...'
  'nozzle.wear-warned',                       // :525 'The maker warns of nozzle wear ...'
  'nozzle.fibre-treated-abrasive',            // :529 'Fibre-filled, and no source states the nozzle it needs ...'
  'nozzle.unfilled-no-requirement',           // :535 'No hardened-nozzle requirement recorded'
  'nozzle.named-filler-check',                // :537 '... for its <filler> filler, so check the product ...'
  'nozzle.undisclosed-filler-check',          // :538 '... The filler is not disclosed, so check the product ...'
  'price.not-listed',                         // :554 'No sampled Canadian retailer listed ...'
  'price.out-of-stock',                       // :560 '... lists it, but no sampled offer ... was in stock ...'
  'price.listed',                             // :565 '<retailer>, about ... CAD/kg, seen ...'
  'drying.stated',                            // :576 the drying statement and its source
  'drying.no-statement',                      // :577 'No drying statement in the sampled sources'
  // evaluateFacet
  'facet.not-recorded',                       // :595, :613 'Facet not recorded'
  'facet.filler-recorded',                    // :600 'Recorded as ...'
  'facet.role',                               // :609 'A support or interface material' / 'A build material'
  'facet.recorded',                           // :619 'Recorded as ...'
  // evaluateEnvironment and evaluatePolymerLevel
  'environment.narrative-only',               // :642 '... records in this snapshot are narrative only ...'
  'environment.no-own-statement',             // :668 "No statement of this product's own. ..."
  'environment.no-statement',                 // :671 'No statement for this product|material'
  'environment.contrary',                     // :688 '<n> statement(s) report ...'
  'environment.mixed-exposures',              // :691 'Mixed across exposures: ...'
  'environment.matching-and-limited',         // :694 '... only limited resistance ...'
  'environment.matching-and-unclear',         // :697 '... give no clear verdict ...'
  'environment.matching',                     // :700 '... This covers the exposures stated ...'
  'environment.limited-only',                 // :703 '<n> statement(s) report only limited resistance'
  'environment.no-verdict',                   // :705 'Statements exist, but none gives a verdict'
  'polymer.basis',                            // :730 the polymer-level basis sentence
  'polymer.screened',                         // :734 '<basis>. Hidden; not tested on this product'
  'polymer.would-screen',                     // :734 '<basis>. It would hide this material with estimates and resin data on'
  // evaluateEvidence
  'evidence.no-criterion',                    // :769 'No evidence criterion set'
  'evidence.checks',                          // :774 the checks' details joined with '; '
  // grouping and indices
  'group.no-product-on-record',               // :1075 'Not enough data: no product on record'
  'index.no-passing-product-publishes',       // engine/indices.js:243 'No product that passes publishes ...'
] as const;

/** Every reason code: the gate's, which a print gate requirement passes through from the build, and the engine's own. */
export const REASON_CODES = [...GATE_REASON_CODES, ...ENGINE_REASON_CODES] as const;
