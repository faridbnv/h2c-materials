// A field list that is also a type (WP-25; pack 02 section 9.6): one declaration says which fields of the compiled database a part
// carries, and the type of what the engine may read from it is DERIVED from that declaration, so the two cannot drift. Nobody writes
// the list a second time.
//
//   `true`               the whole value at that place
//   `{ field: spec }`    only these fields (an array's spec is its element's)
//   `{ '*': spec }`      every key of a record whose keys are data (headline keys, property names, categories); named keys may sit
//                        beside it where only some keys differ
//
// `Spec<T>` is what a declaration may say about a T: a field the database does not have is a compile error, so a declaration cannot
// name something that is not there. `Picked<T, S>` is T cut down to S.
import type { JsonValue } from '@atlas/data';

/** What a declaration may say about a value of type T. A JSON leaf, a primitive or null has nothing to select: its spec is `true`. */
export type Spec<T> =
  [JsonValue] extends [T] ? never
  : T extends readonly (infer E)[] ? Spec<E>
  : T extends string | number | boolean | null | undefined ? never
  : T extends object
    ? string extends keyof T
      ? { readonly [key: string]: true | Spec<T[string]> }
      : { readonly [K in keyof T]?: true | Spec<T[K]> }
    : never;

/** The type of T cut down to the fields S names. Optional fields stay optional; a record keyed by data keeps its keys under `'*'`. */
export type Picked<T, S> =
  S extends true ? T
  : T extends null | undefined ? T
  : T extends readonly (infer E)[] ? readonly Picked<E, S>[]
  : T extends object
    ? string extends keyof T
      ? S extends { readonly '*': infer V }
        ? { readonly [key: string]: Picked<T[string], V> }
        : { readonly [K in keyof S]?: Picked<T[string], S[K]> }
      : { readonly [K in keyof T as K extends keyof S ? K : never]: Picked<T[K], S[K & keyof S]> }
    : T;

/** A declaration as the code that cuts a value down to it reads it (no type information; the types above check the declaration). */
export type FieldSpec = true | { readonly [key: string]: FieldSpec };
