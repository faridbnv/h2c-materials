// Type tests, checked by `tsc` and never run (as packages/domain/test/contracts.type-test.ts): the shapes the ported engine
// modules read still accept what the compiled database holds. When the database contract moves, this file fails to compile
// before a ported module reads a field that is no longer there.
import type { Db } from '@atlas/data';
import type { Contribution } from '../src/port/ledger.ts';
import type { ProductGrade, ProductState, ProductValue } from '../src/port/products.ts';

type DbGrade = Db['grades'][number];
type DbState = NonNullable<DbGrade['states']>[number];

export const grade = (g: DbGrade): ProductGrade => g;
export const state = (s: DbState): ProductState => s;
export const value = (v: DbState['values'][string]): ProductValue => v;
export const contribution = (c: NonNullable<DbState['bounds']>[string]['by'][number]): Contribution => c;
