import type { AlgorithmKey } from "../types/comparator";

export type LearningAlgorithmMetadata = {
  key: AlgorithmKey;
  titleKey: string;
  conceptKey: string;
  strategyKey: string;
  bestCase: string;
  averageCase: string;
  worstCase: string;
  pseudocodeKey: string;
  pseudoTipsKey: string;
};

export const learningAlgorithms: LearningAlgorithmMetadata[] = [
  {
    key: "insertion",
    titleKey: "common.algorithms.insertion",
    conceptKey: "learning.algorithmDetails.insertion.concept",
    strategyKey: "learning.algorithmDetails.insertion.strategy",
    bestCase: "O(n)",
    averageCase: "O(n^2)",
    worstCase: "O(n^2)",
    pseudocodeKey: "learning.pseudocode.insertion",
    pseudoTipsKey: "learning.pseudoTips.insertion",
  },
  {
    key: "bubble",
    titleKey: "common.algorithms.bubble",
    conceptKey: "learning.algorithmDetails.bubble.concept",
    strategyKey: "learning.algorithmDetails.bubble.strategy",
    bestCase: "O(n)",
    averageCase: "O(n^2)",
    worstCase: "O(n^2)",
    pseudocodeKey: "learning.pseudocode.bubble",
    pseudoTipsKey: "learning.pseudoTips.bubble",
  },
  {
    key: "merge",
    titleKey: "common.algorithms.merge",
    conceptKey: "learning.algorithmDetails.merge.concept",
    strategyKey: "learning.algorithmDetails.merge.strategy",
    bestCase: "O(n log n)",
    averageCase: "O(n log n)",
    worstCase: "O(n log n)",
    pseudocodeKey: "learning.pseudocode.merge",
    pseudoTipsKey: "learning.pseudoTips.merge",
  },
  {
    key: "heap",
    titleKey: "common.algorithms.heap",
    conceptKey: "learning.algorithmDetails.heap.concept",
    strategyKey: "learning.algorithmDetails.heap.strategy",
    bestCase: "O(n log n)",
    averageCase: "O(n log n)",
    worstCase: "O(n log n)",
    pseudocodeKey: "learning.pseudocode.heap",
    pseudoTipsKey: "learning.pseudoTips.heap",
  },
  {
    key: "quick",
    titleKey: "common.algorithms.quick",
    conceptKey: "learning.algorithmDetails.quick.concept",
    strategyKey: "learning.algorithmDetails.quick.strategy",
    bestCase: "O(n log n)",
    averageCase: "O(n log n)",
    worstCase: "O(n^2)",
    pseudocodeKey: "learning.pseudocode.quick",
    pseudoTipsKey: "learning.pseudoTips.quick",
  },
];

export const learningByKey: Record<AlgorithmKey, LearningAlgorithmMetadata> =
  learningAlgorithms.reduce(
    (accumulator, item) => {
      accumulator[item.key] = item;
      return accumulator;
    },
    {} as Record<AlgorithmKey, LearningAlgorithmMetadata>,
  );
