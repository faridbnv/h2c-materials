// Two library calls the engine reads as type guards (constraints.js, workspace.js), which the library types as plain booleans
// and arrays. `Number.isFinite(x)` is true only for a number, and `list.filter(Boolean)` keeps only what is not null or undefined,
// so a read after either is a read of a number or of a present element. (The false branch of isFinite is not the complement:
// NaN and Infinity are numbers, and the engine never reads a value in that branch.)
interface NumberConstructor {
  isFinite(number: unknown): number is number;
}
interface Array<T> {
  filter(predicate: BooleanConstructor): NonNullable<T>[];
}
interface ReadonlyArray<T> {
  filter(predicate: BooleanConstructor): NonNullable<T>[];
}
