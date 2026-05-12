import type { AlgorithmKey, ScenarioType } from "../types/comparator";

export type AlgorithmOption = {
  key: AlgorithmKey;
  labelKey: string;
};

export type ScenarioOption = {
  key: ScenarioType;
  labelKey: string;
};

export const algorithmOptions: AlgorithmOption[] = [
  { key: "insertion", labelKey: "common.algorithms.insertion" },
  { key: "bubble", labelKey: "common.algorithms.bubble" },
  { key: "merge", labelKey: "common.algorithms.merge" },
  { key: "heap", labelKey: "common.algorithms.heap" },
  { key: "quick", labelKey: "common.algorithms.quick" },
];

export const scenarioOptions: ScenarioOption[] = [
  { key: "crescente", labelKey: "common.scenarios.crescente" },
  { key: "decrescente", labelKey: "common.scenarios.decrescente" },
  { key: "aleatorio", labelKey: "common.scenarios.aleatorio" },
];

export const sizeOptions: number[] = [
  10, 100, 1000, 5000, 30000, 50000, 100000, 150000, 200000,
];

export const algorithmLabelKeyByKey: Record<AlgorithmKey, string> =
  algorithmOptions.reduce(
    (accumulator, option) => {
      accumulator[option.key] = option.labelKey;
      return accumulator;
    },
    {} as Record<AlgorithmKey, string>,
  );

export const scenarioLabelKeyByKey: Record<ScenarioType, string> =
  scenarioOptions.reduce(
    (accumulator, option) => {
      accumulator[option.key] = option.labelKey;
      return accumulator;
    },
    {} as Record<ScenarioType, string>,
  );
