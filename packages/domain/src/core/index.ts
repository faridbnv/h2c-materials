// The shared core (WP-07): one copy of each rule the old code repeats, checked equal to every old copy.
export { tidy } from './tidy.ts';
export { stateId, parseStateId } from './state-id.ts';
export type { Schedule, ParsedState } from './state-id.ts';
export { GATE_PRECEDENCE, GATE_TABLE, GATE_STATUS, isGateVerdict, gateRow, gateStatus, strongestVerdict } from './gate-verdict.ts';
export type { GateRow } from './gate-verdict.ts';
export {
  TEST_TEMPERATURE_TOLERANCE_C, LOAD_TOLERANCE_MPA, ESTIMATE_LOW_LOAD_BAND_MPA, H2C_LOW_END_C,
  offTestTemperature, offLoad, inEstimateLowLoadBand,
} from './tolerances.ts';
export { ID_PATTERNS, isMaterialId, isGradeId, isMeasurementId, isProfileId, isSourceId } from './ids.ts';
export {
  STATUSES, GROUP_ORDER, PRODUCT_SHARES, UNKNOWN_POLICIES, EVIDENCE_LEVELS, SCENARIO_KINDS, CONSTRAINT_KINDS, OPERATORS, LENSES, COLUMN_SETS,
  PLOT_VIEWS, ENGINE_MISSING,
} from './vocab.ts';
