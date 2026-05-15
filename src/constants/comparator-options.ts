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
