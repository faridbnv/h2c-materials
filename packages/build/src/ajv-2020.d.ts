// Ajv's draft 2020-12 class, as Node's ESM loader gives it. `ajv/dist/2020.js` is CommonJS and sets `module.exports` to the
// class itself, so `import Ajv2020 from 'ajv/dist/2020.js'` IS the class at run time (contract.ts, and the old contract.js
// that it is labelled from). Its own declarations put the class under `.default`, which Node's module rules make the wrong
// shape for a default import. This states the shape that runs; nothing else about the module changes.
declare module 'ajv/dist/2020.js' {
  import type { Ajv, Options } from 'ajv/dist/ajv.js';
  export default class Ajv2020 extends Ajv {
    constructor(options?: Options);
  }
}
