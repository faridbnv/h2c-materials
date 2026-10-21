// Distinct identifiers (15-TYPESCRIPT-PLAN section 2, addition 3). Types only.
//
// Each ID is its generated row pattern (packages/data, from the schema's `pattern`) plus a brand, so a GradeId cannot
// stand where a MaterialId is wanted, and a plain string cannot stand for either until a guard has checked it
// (packages/domain/src/core/ids.ts). The brand is a type-level tag only: it is erased and costs nothing at run time.

import type {
  GradeId as GradeIdPattern,
  MaterialId as MaterialIdPattern,
  MeasurementId as MeasurementIdPattern,
  ProfileId as ProfileIdPattern,
} from '@atlas/data/rows';

declare const brand: unique symbol;

/** `Base` tagged with `Name`. Two brands never mix, and an untagged `Base` is not a branded one. */
export type Brand<Base, Name extends string> = Base & { readonly [brand]: Name };

/** A material: M001 (schema `^M\d{3}$`). */
export type MaterialId = Brand<MaterialIdPattern, 'MaterialId'>;
/** A grade, the product row: G001-25, or a reference grade G001-R1 (schema `^G\d{3}-(\d{2,3}|R\d+)$`). */
export type GradeId = Brand<GradeIdPattern, 'GradeId'>;
/** A measurement: V000001 (schema `^V\d{6}$`). */
export type MeasurementId = Brand<MeasurementIdPattern, 'MeasurementId'>;
/** A print profile: P0001 (schema `^P\d{4}$`). */
export type ProfileId = Brand<ProfileIdPattern, 'ProfileId'>;
/** A source document: H2C-MANUAL, B-GUIDE (schema `^[A-Za-z0-9][A-Za-z0-9._-]*$`). No prefix, so only the brand keeps it apart. */
export type SourceId = Brand<string, 'SourceId'>;

/**
 * A requirement of a scenario, stable across runs, so a result is matched to its requirement by this ID and not by
 * object identity (15-TYPESCRIPT-PLAN section 2, addition 6). Placeholder: the old engine has no such ID, and how it is
 * derived is decided when constraint IDs land (WP-19, owner question TS-3). No code builds one yet.
 */
export type ConstraintId = Brand<string, 'ConstraintId'>;

/**
 * A product's decision state, as stateId writes it (D99): "as-printed", "conditioned", "annealed:120:16",
 * "annealed:120:16+conditioned"; "x" stands for a part of the schedule the sheet does not state.
 */
export type ScheduleText = `${number}` | 'x';
export type AnnealedStateId = `annealed:${ScheduleText}:${ScheduleText}`;
export type StateId = 'as-printed' | 'conditioned' | AnnealedStateId | `${AnnealedStateId}+conditioned`;

/** A write command's operation ID: a ULID; the same opId twice is applied once (02 section 9.1). */
export type OpId = Brand<string, 'OpId'>;
/** A change record's ID (02 section 9.2). */
export type ChangeRecordId = Brand<string, 'ChangeRecordId'>;
/** A change set's ID: date, topic, short hash, no counter ('2026-11-04-pla-basic-density-7f3a', 02 section 9.2). */
export type ChangeSetId = Brand<string, 'ChangeSetId'>;
/** A proposal's ID (02 section 9.4). */
export type ProposalId = Brand<string, 'ProposalId'>;
/** A release: the short commit hash a deploy is named by ('abcdef123456', 02 section 9.6). */
export type ReleaseId = Brand<string, 'ReleaseId'>;
/** A lowercase hex SHA-256 digest. */
export type Sha256 = Brand<string, 'Sha256'>;
