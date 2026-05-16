import type { AlgorithmKey, ScenarioType } from "../types/comparator";

/**
 * Option lists and i18n label maps used by the comparator form (algorithm,
 * scenario and size selectors). Centralized here so the form, validators and
 * any imported-CSV checks share the same source of truth.
 */

/** Selectable algorithm entry: key plus its i18n label key. */
export type AlgorithmOption = {
  key: AlgorithmKey;
  labelKey: string;
};

/** Selectable scenario entry: key plus its i18n label key. */
export type ScenarioOption = {
  key: ScenarioType;
  labelKey: string;
};

/** Ordered list of algorithms shown in the comparator multi-select. */
export const algorithmOptions: AlgorithmOption[] = [
  { key: "insertion", labelKey: "common.algorithms.insertion" },
  { key: "bubble", labelKey: "common.algorithms.bubble" },
  { key: "merge", labelKey: "common.algorithms.merge" },
  { key: "heap", labelKey: "common.algorithms.heap" },
  { key: "quick", labelKey: "common.algorithms.quick" },
  { key: "tim", labelKey: "common.algorithms.tim" },
];

/** Ordered list of input scenarios available in the comparator. */
export const scenarioOptions: ScenarioOption[] = [
  { key: "crescente", labelKey: "common.scenarios.crescente" },
  { key: "decrescente", labelKey: "common.scenarios.decrescente" },
  { key: "aleatorio", labelKey: "common.scenarios.aleatorio" },
];

/** Preset input sizes offered by the comparator size picker. */
export const sizeOptions: number[] = [
  10, 25, 50, 75, 100, 500, 1000, 2500, 5000, 30000, 50000, 100000, 150000,
  200000,
];

/** Minimum replications required for statistically usable averages. */
export const MIN_REPLICATIONS = 1;

/**
 * Replication ceiling tiered by the largest selected input size.
 * Caps protect the browser heap on heavy jobs: the worst-case live memory per
 * replication scales with the max array size (input clone + sub-worker clone +
 * algorithm aux buffers). Floor of 1 preserves statistical validity; 10+ on
 * the heaviest tier keeps results paper-usable.
 */
export const REPLICATION_CAPS: {
  sizeAtMost: number;
  maxReplications: number;
}[] = [
  { sizeAtMost: 30_000, maxReplications: 40 },
  { sizeAtMost: 100_000, maxReplications: 25 },
  { sizeAtMost: 150_000, maxReplications: 15 },
  { sizeAtMost: Number.POSITIVE_INFINITY, maxReplications: 10 },
];

/**
 * Returns the maximum allowed replications for the heaviest size in the
 * selection. Empty selection returns the most permissive tier so the form
 * defaults stay usable before the user picks sizes.
 */
export const maxReplicationsForSizes = (sizes: number[]): number => {
  if (sizes.length === 0) return REPLICATION_CAPS[0].maxReplications;
  let maxSize = sizes[0];
  for (let i = 1; i < sizes.length; i += 1) {
    if (sizes[i] > maxSize) maxSize = sizes[i];
  }
  for (const tier of REPLICATION_CAPS) {
    if (maxSize <= tier.sizeAtMost) return tier.maxReplications;
  }
  return MIN_REPLICATIONS;
};

/** Reverse lookup: AlgorithmKey → i18n label key. Built from algorithmOptions. */
export const algorithmLabelKeyByKey: Record<AlgorithmKey, string> =
  algorithmOptions.reduce(
    (accumulator, option) => {
      accumulator[option.key] = option.labelKey;
      return accumulator;
    },
    {} as Record<AlgorithmKey, string>,
  );

/** Reverse lookup: ScenarioType → i18n label key. Built from scenarioOptions. */
export const scenarioLabelKeyByKey: Record<ScenarioType, string> =
  scenarioOptions.reduce(
    (accumulator, option) => {
      accumulator[option.key] = option.labelKey;
      return accumulator;
    },
    {} as Record<ScenarioType, string>,
  );
