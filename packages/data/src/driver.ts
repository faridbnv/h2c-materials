// The one file in the repository that imports `node:sqlite` (WP-08; ADR-05). Everything else opens a database through
// `open()` and holds a `Db`. A test (tests/remake/sqlite-driver.test.mjs) greps for any other importer and fails.
//
// Why a wrapper: `node:sqlite` is a release candidate (stability 1.2), and its classes were renamed in Node 26.11
// (`DatabaseSync` became `Database`, the old name stays as an alias). This file picks whichever class the running Node
// exports, so the rest of the code never names either. It adds the three things the built-in API lacks: a transaction
// helper that rolls back on every error path, a refusal of nested transactions, and a check on every connection that
// foreign keys are really on. No ORM and no query builder: callers write SQL and bind values.
import * as sqlite from 'node:sqlite';
import type { DatabaseSync, SQLInputValue, SQLOutputValue, StatementSync } from 'node:sqlite';

/** A value that can be bound to a statement parameter. */
export type Param = SQLInputValue;
/** One result row, by column name. */
export type Row = Record<string, SQLOutputValue>;

type DatabaseClass = typeof DatabaseSync;

const isDatabaseClass = (candidate: unknown): candidate is DatabaseClass =>
  typeof candidate === 'function'
  && ['prepare', 'exec', 'createSession', 'serialize'].every((method) => method in candidate.prototype);

/**
 * The Database class a `node:sqlite` namespace offers: `Database` (Node 26.11 and later) when it has one, else `DatabaseSync`.
 * Takes the namespace as an argument so the tests can show both shapes, and a namespace with neither, without a second Node.
 */
export function pickDatabaseClass(namespace: object): { readonly ctor: DatabaseClass; readonly name: 'Database' | 'DatabaseSync' } {
  const renamed: unknown = Reflect.get(namespace, 'Database');
  if (isDatabaseClass(renamed)) return { ctor: renamed, name: 'Database' };
  const original: unknown = Reflect.get(namespace, 'DatabaseSync');
  if (isDatabaseClass(original)) return { ctor: original, name: 'DatabaseSync' };
  throw new Error(`node:sqlite on Node ${process.version} exports neither Database nor DatabaseSync with the methods this wrapper needs`);
}

const { ctor: DatabaseCtor, name: driverClassName } = pickDatabaseClass(sqlite);
export { driverClassName };

/** What this process runs on, recorded in the base stamp and the measurement files. */
export interface DriverInfo {
  readonly node: string;
  readonly sqlite: string;
  /** Which class name the running Node exports: `Database` from Node 26.11, `DatabaseSync` before. */
  readonly className: 'Database' | 'DatabaseSync';
}

export type ConstraintKind = 'foreign-key' | 'check' | 'unique' | 'primary-key' | 'not-null' | 'strict-type';

/** SQLite extended result codes of the constraint failures the data layer tells apart. */
const CONSTRAINT_CODES = new Map<number, ConstraintKind>([
  [787, 'foreign-key'], [275, 'check'], [2067, 'unique'], [1555, 'primary-key'], [1299, 'not-null'], [3091, 'strict-type'],
]);

/** Which constraint a thrown SQLite error is, or null when it is not a constraint failure. */
export function constraintKind(error: unknown): ConstraintKind | null {
  if (typeof error !== 'object' || error === null || !('errcode' in error) || typeof error.errcode !== 'number') return null;
  return CONSTRAINT_CODES.get(error.errcode) ?? null;
}

export class NestedTransactionError extends Error {
  constructor() {
    super('transaction() was called inside a transaction; nested transactions are refused (there are no savepoints in this layer)');
    this.name = 'NestedTransactionError';
  }
}

export class ForeignKeysOffError extends Error {
  constructor(path: string) {
    super(`foreign key enforcement is off on the connection to ${path}; the data layer refuses to run without it`);
    this.name = 'ForeignKeysOffError';
  }
}

export interface OpenOptions {
  readonly readOnly?: boolean;
  /** Milliseconds to wait for a lock. */
  readonly timeoutMs?: number;
  /** Default true. `false` only for a test that needs to insert a dangling reference on purpose. */
  readonly foreignKeys?: boolean;
}

export interface RunResult {
  readonly changes: number | bigint;
  readonly lastInsertRowid: number | bigint;
}

/** A prepared statement. Values are always bound parameters; SQL text is the caller's own constant, never user input. */
export class Statement {
  readonly #raw: StatementSync;
  constructor(raw: StatementSync) { this.#raw = raw; }
  get sql(): string { return this.#raw.sourceSQL; }
  run(...params: Param[]): RunResult { return this.#raw.run(...params); }
  get(...params: Param[]): Row | undefined { return this.#raw.get(...params); }
  all(...params: Param[]): Row[] { return this.#raw.all(...params); }
  iterate(...params: Param[]): Iterable<Row> { return this.#raw.iterate(...params); }
}

/** Changes made on the connection since the session was created, as a binary changeset (tables need a PRIMARY KEY). */
export interface ChangeSession {
  changeset(): Uint8Array;
  patchset(): Uint8Array;
  close(): void;
}

export interface SessionOptions {
  /** Track one table only; default is every table. */
  readonly table?: string;
}

/** What `applyChangeset` does with a conflict. */
export const CHANGESET_CONFLICT = {
  omit: sqlite.constants.SQLITE_CHANGESET_OMIT,
  replace: sqlite.constants.SQLITE_CHANGESET_REPLACE,
  abort: sqlite.constants.SQLITE_CHANGESET_ABORT,
} as const;

export interface ApplyOptions {
  readonly onConflict?: (conflictType: number) => number;
  readonly filter?: (table: string) => boolean;
}

export interface BackupOptions {
  /** Pages copied per step; a small number lets writes interleave with the copy. */
  readonly rate?: number;
  readonly progress?: (info: { totalPages: number; remainingPages: number }) => void;
}

export interface TransactionOptions {
  /** `immediate` (default) takes the write lock at BEGIN, so a writer fails at once, not half-way. */
  readonly mode?: 'immediate' | 'deferred';
}

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === 'object' && value !== null && 'then' in value && typeof value.then === 'function';

export class Db implements Disposable {
  readonly #raw: DatabaseSync;
  readonly path: string;

  constructor(raw: DatabaseSync, path: string) {
    this.#raw = raw;
    this.path = path;
  }

  get isOpen(): boolean { return this.#raw.isOpen; }
  get inTransaction(): boolean { return this.#raw.isTransaction; }

  exec(sql: string): void { this.#raw.exec(sql); }

  prepare(sql: string): Statement { return new Statement(this.#raw.prepare(sql)); }

  /** First column of the first row of `PRAGMA <name>`; `name` is a constant of the caller (letters and underscores only). */
  pragma(name: string): SQLOutputValue | undefined {
    if (!/^[a-z_]+$/.test(name)) throw new Error(`pragma name ${JSON.stringify(name)} is not a plain name`);
    const row = this.#raw.prepare(`PRAGMA ${name}`).get();
    return row === undefined ? undefined : Object.values(row)[0];
  }

  sqliteVersion(): string {
    const version = this.#raw.prepare('SELECT sqlite_version() AS v').get()?.v;
    if (typeof version !== 'string') throw new Error('SELECT sqlite_version() did not return text');
    return version;
  }

  info(): DriverInfo { return { node: process.version, sqlite: this.sqliteVersion(), className: driverClassName }; }

  /**
   * Run `fn` in one transaction: BEGIN, then COMMIT when `fn` returns, ROLLBACK when it throws (the original error is
   * rethrown). Refused inside another transaction. `fn` must be synchronous: a returned promise is a bug (the commit would
   * come before the work), so it rolls back and throws. A COMMIT that fails (a deferred foreign key) rolls back too. If the
   * rollback itself fails the error says so, with both causes, because the state is then unknown. A body that goes on after
   * SQLite ended the transaction under it is an error too.
   */
  transaction<T>(fn: (db: this) => T, options: TransactionOptions = {}): T {
    if (this.#raw.isTransaction) throw new NestedTransactionError();
    this.#raw.exec(options.mode === 'deferred' ? 'BEGIN' : 'BEGIN IMMEDIATE');
    let result: T;
    try {
      result = fn(this);
      if (isThenable(result)) throw new TypeError('transaction(fn): fn returned a promise; a transaction body must be synchronous');
      // SQLite ends a transaction itself on some errors (ON CONFLICT ROLLBACK, disk full). A body that caught such an error
      // and went on would have its later statements autocommitted outside the transaction; that is a failure, not a success.
      if (!this.#raw.isTransaction) throw new Error('the transaction was ended by SQLite inside fn (a ROLLBACK conflict or an I/O error that fn caught); its later writes were not part of it');
      this.#raw.exec('COMMIT');
    } catch (error) {
      this.#rollbackAfter(error);
      throw error;
    }
    return result;
  }

  #rollbackAfter(cause: unknown): void {
    if (!this.#raw.isTransaction) return; // SQLite already ended it (an I/O or disk-full error)
    try {
      this.#raw.exec('ROLLBACK');
    } catch (rollbackError) {
      throw new AggregateError([cause, rollbackError], 'ROLLBACK failed after an error; the transaction state is unknown');
    }
  }

  /** Online backup of this database to a file, consistent even while this connection writes. Resolves to the page count. */
  backup(destination: string, options: BackupOptions = {}): Promise<number> {
    return sqlite.backup(this.#raw, destination, {
      ...(options.rate === undefined ? {} : { rate: options.rate }),
      ...(options.progress === undefined ? {} : { progress: options.progress }),
    });
  }

  session(options: SessionOptions = {}): ChangeSession {
    return this.#raw.createSession(options.table === undefined ? {} : { table: options.table });
  }

  /** Apply a changeset. Returns false when a conflict handler aborted it (the database is then unchanged). */
  applyChangeset(changeset: Uint8Array, options: ApplyOptions = {}): boolean {
    return this.#raw.applyChangeset(changeset, {
      ...(options.onConflict === undefined ? {} : { onConflict: options.onConflict }),
      ...(options.filter === undefined ? {} : { filter: options.filter }),
    });
  }

  /** The whole database as bytes (a consistent snapshot). */
  serialize(): Uint8Array { return this.#raw.serialize(); }

  close(): void { if (this.#raw.isOpen) this.#raw.close(); }

  [Symbol.dispose](): void { this.close(); }
}

/** Open (or create) a database. `:memory:` by default. Foreign keys are on and verified; defensive mode is on. */
export function open(path: string = ':memory:', options: OpenOptions = {}): Db {
  const foreignKeys = options.foreignKeys ?? true;
  const raw = new DatabaseCtor(path, {
    readOnly: options.readOnly ?? false,
    timeout: options.timeoutMs ?? 5000,
    enableForeignKeyConstraints: foreignKeys,
    defensive: true,
    allowExtension: false,
  });
  const db = new Db(raw, path);
  try {
    if (foreignKeys && db.pragma('foreign_keys') !== 1) throw new ForeignKeysOffError(path);
  } catch (error) {
    db.close();
    throw error;
  }
  return db;
}
