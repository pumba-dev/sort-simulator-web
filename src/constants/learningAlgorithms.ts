import type { AlgorithmKey } from "../types/comparator";

/**
 * Static metadata used by the Learning module (M1) to render each algorithm's
 * concept, strategy, complexity table and pseudocode. Strings reference i18n
 * keys so translations live in the locale files rather than this constant.
 */

/** All fields needed by the Learning page for a single algorithm. */
export type LearningAlgorithmMetadata = {
  key: AlgorithmKey;
  /** i18n key for the algorithm display name. */
  titleKey: string;
  /** i18n key for the concept/intuition section. */
  conceptKey: string;
  /** i18n key for the strategy/walkthrough section. */
  strategyKey: string;
  /** Big-O of the best case as a display string (e.g. "O(n log n)"). */
  bestCase: string;
  /** Big-O of the average case. */
  averageCase: string;
  /** Big-O of the worst case. */
  worstCase: string;
  /** i18n key for the rendered pseudocode block. */
  pseudocodeKey: string;
  /** i18n key for the per-line pseudocode tooltips/tips. */
  pseudoTipsKey: string;
};

/**
 * Ordered list driving the Learning page navigation. TimSort intentionally
 * omitted here because the learning page exposes only the classic algorithms.
 */
export const learningAlgorithms: LearningAlgorithmMetadata[] = [
  {
    key: "insertion",
    titleKey: "common.algorithms.insertion",
    conceptKey: "learning.algorithmDetails.insertion.concept",
    strategyKey: "learning.algorithmDetails.insertion.strategy",
    bestCase: "O(n)",
    averageCase: "O(n²)",
    worstCase: "O(n²)",
    pseudocodeKey: "learning.pseudocode.insertion",
    pseudoTipsKey: "learning.pseudoTips.insertion",
  },
  {
    key: "bubble",
    titleKey: "common.algorithms.bubble",
    conceptKey: "learning.algorithmDetails.bubble.concept",
    strategyKey: "learning.algorithmDetails.bubble.strategy",
    bestCase: "O(n)",
    averageCase: "O(n²)",
    worstCase: "O(n²)",
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
    worstCase: "O(n²)",
    pseudocodeKey: "learning.pseudocode.quick",
    pseudoTipsKey: "learning.pseudoTips.quick",
  },
];

/** Reverse lookup: AlgorithmKey → metadata. Built from learningAlgorithms. */
export const learningByKey: Record<AlgorithmKey, LearningAlgorithmMetadata> =
  learningAlgorithms.reduce(
    (accumulator, item) => {
      accumulator[item.key] = item;
      return accumulator;
    },
    {} as Record<AlgorithmKey, LearningAlgorithmMetadata>,
  );
