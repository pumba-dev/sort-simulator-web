import type { AlgorithmKey } from "../types/comparator";

/**
 * Static metadata used by the Comparator help modal. Mirrors the shape of
 * `learningAlgorithms` but also covers Tim Sort, which the Learning page omits.
 * String fields hold i18n keys so translations live in the locale files.
 */
export interface ComparatorAlgorithmInfo {
  key: AlgorithmKey;
  titleKey: string;
  conceptKey: string;
  strategyKey: string;
  bestCase: string;
  averageCase: string;
  worstCase: string;
}

export const comparatorAlgorithmInfo: ComparatorAlgorithmInfo[] = [
  {
    key: "insertion",
    titleKey: "common.algorithms.insertion",
    conceptKey: "learning.algorithmDetails.insertion.concept",
    strategyKey: "learning.algorithmDetails.insertion.strategy",
    bestCase: "O(n)",
    averageCase: "O(n²)",
    worstCase: "O(n²)",
  },
  {
    key: "bubble",
    titleKey: "common.algorithms.bubble",
    conceptKey: "learning.algorithmDetails.bubble.concept",
    strategyKey: "learning.algorithmDetails.bubble.strategy",
    bestCase: "O(n)",
    averageCase: "O(n²)",
    worstCase: "O(n²)",
  },
  {
    key: "merge",
    titleKey: "common.algorithms.merge",
    conceptKey: "learning.algorithmDetails.merge.concept",
    strategyKey: "learning.algorithmDetails.merge.strategy",
    bestCase: "O(n log n)",
    averageCase: "O(n log n)",
    worstCase: "O(n log n)",
  },
  {
    key: "heap",
    titleKey: "common.algorithms.heap",
    conceptKey: "learning.algorithmDetails.heap.concept",
    strategyKey: "learning.algorithmDetails.heap.strategy",
    bestCase: "O(n log n)",
    averageCase: "O(n log n)",
    worstCase: "O(n log n)",
  },
  {
    key: "quick",
    titleKey: "common.algorithms.quick",
    conceptKey: "learning.algorithmDetails.quick.concept",
    strategyKey: "learning.algorithmDetails.quick.strategy",
    bestCase: "O(n log n)",
    averageCase: "O(n log n)",
    worstCase: "O(n²)",
  },
  {
    key: "tim",
    titleKey: "common.algorithms.tim",
    conceptKey: "learning.algorithmDetails.tim.concept",
    strategyKey: "learning.algorithmDetails.tim.strategy",
    bestCase: "O(n)",
    averageCase: "O(n log n)",
    worstCase: "O(n log n)",
  },
];
