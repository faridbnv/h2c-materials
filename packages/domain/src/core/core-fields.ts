// What each part of a release carries (WP-25; pack 02 section 9.6). ONE declaration per part: the type of what the engine may read
// (`CoreReadModel`, contracts/engine.ts) is derived from CORE_FIELDS, and the writer, the reader, the development guard and the
// parity check all use the same object, so the list and the type cannot disagree and nobody writes the list twice.
//
// CORE_FIELDS is what the engine reads of the compiled database in EVERY mode (strict, explore, and the part of Explore with
// estimates that does not need the estimates file), including the estimate-stage fields every mode reads (`grades[].estimate[*].
// evidence[].measurementIds`, `estimateWithheld`: products.js reads them without asking the estimates switch, AR-04).
// ESTIMATE_FIELDS is what Explore with estimates on reads of the estimate stage's output, on top; its parts replace the core's.
//
// The lists were first taken from reads (remake/tools/core-reads.mjs traces the engine over the parity corpus and says which reads
// a declaration misses). A list is a statement about the engine, so it changes only with the engine: a field the engine starts to
// read is added here, and `npm run parity -- --surface core --milestone` is 0 again.
import type { Db } from '@atlas/data';
import type { CoreReadModel } from '../contracts/engine.ts';
import type { Spec } from '../contracts/field-spec.ts';

/** The fields of the compiled database every answer reads. */
export const CORE_FIELDS = {
  classLimits: {
    id: true,
    words: true,
  },
  conversions: {
    id: true,
    words: true,
  },
  coverage: {
    domain: true,
    gradeId: true,
    materialId: true,
    status: true,
  },
  evidence: {
    category: true,
    finding: true,
    gradeId: true,
    id: true,
    materialId: true,
    verdict: true,
  },
  grades: {
    buy: {
      accessDate: true,
      anyInStock: true,
      perKg: true,
      priceIds: true,
      retailer: true,
    },
    estimate: {
      '*': {
        evidence: {
          measurementIds: true,
        },
        impliedBounds: true,
        screening: true,
      },
    },
    estimateVersion: true,
    estimateWithheld: {
      '*': {
        ownBand: {
          bands: {
            measurementIds: true,
          },
        },
      },
    },
    id: true,
    manufacturer: true,
    print: {
      bed: {
        reason: true,
        verdict: true,
      },
      chamber: {
        reason: true,
        verdict: true,
      },
      drying: {
        need: true,
      },
      from: {
        bed: {
          origin: true,
        },
        chamber: {
          origin: true,
        },
        drying: {
          label: true,
        },
        hardenedNozzle: {
          label: true,
        },
        nozzle: {
          origin: true,
        },
      },
      hardenedNozzle: true,
      nozzle: {
        reason: true,
        verdict: true,
      },
      nozzleAdvice: {
        kind: true,
        text: true,
      },
      profileIds: true,
    },
    product: true,
    retired: true,
    states: {
      bounds: {
        '*': {
          by: {
            factor: true,
            from: {
              label: true,
            },
            hi: true,
            kind: true,
            level: true,
            limit: true,
            lo: true,
            measurementId: true,
            openHigh: true,
            openLow: true,
            polymer: true,
            rule: true,
            sourceValue: true,
            status: true,
            widened: true,
          },
        },
      },
      id: true,
      moisture: true,
      treatment: {
        hours: true,
        tempC: true,
      },
      values: {
        '*': {
          admitted: true,
          anneal: {
            hours: true,
            tempC: true,
          },
          caveat: true,
          ceilingOnly: true,
          direction: true,
          doubtful: {
            hi: true,
            lo: true,
            measurementId: true,
            rule: true,
          },
          endpoints: true,
          from: {
            label: true,
          },
          interval: {
            hi: true,
            kind: true,
            lo: true,
            openHigh: true,
            openLow: true,
          },
          level: true,
          measurementId: true,
          observations: true,
          priceIds: true,
          standards: true,
          uncertainty: true,
          value: true,
        },
      },
    },
    twins: true,
    variant: true,
  },
  materials: {
    abbreviation: true,
    basePolymer: true,
    bestUses: true,
    buy: true,
    estimateIdentity: true,
    evidenceIds: true,
    excluded: true,
    facets: true,
    family: true,
    familyEntry: true,
    fullName: true,
    gates: true,
    gradeIds: true,
    guidance: true,
    h2cStatus: true,
    headline: {
      '*': {
        impliedBounds: true,
        known: true,
        missing: true,
        notApplicable: {
          reason: true,
        },
        related: {
          length: true,
        },
        unit: true,
      },
    },
    headlineBasis: true,
    id: true,
    identity: true,
    knowHow: true,
    limitations: true,
    modifier: true,
    name: true,
    print: true,
    printingEvidence: true,
    profileIds: true,
    role: true,
    scope: true,
    summary: true,
    variantClass: true,
    written: true,
  },
  measurements: {
    direction: true,
    gradeId: true,
    id: true,
    materialId: true,
    numeric: true,
    property: true,
    sourceId: true,
    specimenType: true,
    unit: true,
    value: true,
  },
  meta: {
    build: true,
    environmentCategories: true,
    release: {
      id: true,
    },
    snapshot: true,
  },
  polymerEvidence: {
    agents: true,
    category: true,
    id: true,
    materialId: true,
    polymerId: true,
    screens: true,
    verdict: true,
  },
  registry: {
    headlines: {
      changesWithAnnealing: true,
      changesWithMoisture: true,
      drawerOnly: true,
      key: true,
      labels: {
        plain: true,
      },
      testScatter: {
        is: true,
        value: true,
      },
      unit: true,
    },
  },
} as const satisfies Spec<Db>;

/** What the estimate stage adds that only Explore with estimates reads, in the shape of the estimates part (grades by ID, materials by ID, meta). */
export const ESTIMATE_FIELDS = {
  grades: {
    estimate: {
      '*': {
        basis: true,
        canScreen: true,
        centre: true,
        evidence: {
          conflict: true,
          converted: true,
          kind: true,
          measurementIds: true,
        },
        hi: true,
        impliedBounds: true,
        kind: true,
        lo: true,
        ownBand: {
          bands: {
            conflict: true,
            hi: true,
            kind: true,
            lo: true,
            measurementIds: true,
          },
          disagree: true,
          hi: true,
          lo: true,
        },
        ownShare: true,
        plausible: {
          hi: true,
          lo: true,
        },
        precision: true,
        screenBasis: true,
        screening: true,
        screenLimit: true,
        screenRange: true,
        sharedWith: true,
        strength: true,
        unit: true,
      },
    },
    estimateVersion: true,
    estimateWithheld: {
      '*': {
        centre: true,
        ownBand: {
          bands: {
            measurementIds: true,
          },
          hi: true,
          lo: true,
        },
      },
    },
  },
  materials: {
    headline: {
      '*': {
        estimate: true,
        notApplicable: {
          reason: true,
        },
      },
    },
  },
} as const satisfies { readonly grades?: Spec<Db['grades']>; readonly materials?: Spec<Db['materials']>; readonly meta?: Spec<Db['meta']> };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** The sections every core holds and their kind; the others (conversions, classLimits, polymerEvidence) are there when their table has rows. */
const SECTIONS = { meta: 'record', registry: 'record', materials: 'list', grades: 'list', measurements: 'list', evidence: 'list', coverage: 'list' } as const;

/**
 * Whether a parsed part is the shape of the core: the sections the engine cannot run without, each of its kind. It cannot check every
 * field (the types do that, from CORE_FIELDS, for the code that reads them); it makes a part that is not a core fail where it is read
 * rather than as a missing field somewhere inside the engine.
 */
export function isCoreReadModel(value: unknown): value is CoreReadModel {
  if (!isRecord(value)) return false;
  return Object.entries(SECTIONS).every(([section, kind]) => (kind === 'list' ? Array.isArray(value[section]) : isRecord(value[section])));
}
