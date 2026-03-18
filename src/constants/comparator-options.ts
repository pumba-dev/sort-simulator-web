import type { AlgorithmKey, ScenarioType } from "../types/comparator";

export type AlgorithmOption = {
  key: AlgorithmKey;
  label: string;
};

export type ScenarioOption = {
  key: ScenarioType;
  label: string;
};

export const algorithmOptions: AlgorithmOption[] = [
  { key: "insertion", label: "Insertion Sort" },
  { key: "bubble", label: "Bubble Sort" },
  { key: "merge", label: "Merge Sort" },
  { key: "heap", label: "Heap Sort" },
  { key: "quick", label: "Quick Sort" },
];

export const scenarioOptions: ScenarioOption[] = [
  { key: "crescente", label: "Crescente" },
  { key: "decrescente", label: "Decrescente" },
  { key: "aleatorio", label: "Aleatorio" },
];

export const sizeOptions: number[] = [
  100, 1000, 5000, 30000, 50000, 100000, 150000, 200000,
];

export const algorithmLabelByKey: Record<AlgorithmKey, string> =
  algorithmOptions.reduce(
    (accumulator, option) => {
      accumulator[option.key] = option.label;
      return accumulator;
    },
    {} as Record<AlgorithmKey, string>,
  );

export const scenarioLabelByKey: Record<ScenarioType, string> =
  scenarioOptions.reduce(
    (accumulator, option) => {
      accumulator[option.key] = option.label;
      return accumulator;
    },
    {} as Record<ScenarioType, string>,
  );
