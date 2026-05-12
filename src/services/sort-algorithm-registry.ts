import type { AlgorithmKey } from "../types/comparator";
import bubbleSort from "../../algorithms/bubbleSort";
import heapSort from "../../algorithms/heapSort";
import insertionSort from "../../algorithms/inserctionSort";
import mergeSort from "../../algorithms/mergeSort";
import quickSort from "../../algorithms/quickSort";

export type {
  SortStep,
  SortRunOptions,
  SortRunResult,
} from "../types/sort-types";
import type { SortRunOptions, SortRunResult } from "../types/sort-types";

/** A single sort algorithm entry stored in the registry. */
export interface SortAlgorithm {
  /** Unique identifier matching the AlgorithmKey union. */
  key: AlgorithmKey;
  /**
   * Execute the algorithm on the given input array.
   * Returns a SortRunResult containing sorted output, step snapshots,
   * comparison/swap counters, peak memory usage, and abort status.
   */
  run: (input: number[], options?: SortRunOptions) => SortRunResult;
}

type RawSortFn = (input: number[], options?: SortRunOptions) => SortRunResult;

/**
 * Central registry mapping every AlgorithmKey to its implementation.
 * Used by the benchmark worker and the visualizer to dispatch sort calls
 * without coupling callers to individual algorithm modules.
 */
export const sortAlgorithmRegistry: Record<AlgorithmKey, SortAlgorithm> = {
  bubble: { key: "bubble", run: bubbleSort as RawSortFn },
  heap: { key: "heap", run: heapSort as RawSortFn },
  insertion: { key: "insertion", run: insertionSort as RawSortFn },
  merge: { key: "merge", run: mergeSort as RawSortFn },
  quick: { key: "quick", run: quickSort as RawSortFn },
};
