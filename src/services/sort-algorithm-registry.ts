import type { AlgorithmKey } from "../types/comparator";
// @ts-ignore
import bubbleSort from "../../algorithms/bubbleSort";
// @ts-ignore
import heapSort from "../../algorithms/heapSort";
// @ts-ignore
import insertionSort from "../../algorithms/inserctionSort";
// @ts-ignore
import mergeSort from "../../algorithms/mergeSort";
// @ts-ignore
import quickSort from "../../algorithms/quickSort";

export interface SortStep {
  values: number[];
  activeIndexes: number[];
  comparisons: number;
  swaps: number;
  variables: Record<string, unknown>;
  pivotIndex: number | null;
  sortedPartition?: { start: number; end: number };
  heapifyRegion?: { start: number; end: number } | null;
  gapIndex?: number | null;
  merging?: { start: number; end: number };
  divisionDepth?: number;
  partitionIndex?: number | null;
}

export interface SortRunOptions {
  recordSteps?: boolean;
  signal?: AbortSignal;
  yieldEveryOps?: number;
}

export interface SortRunResult {
  steps: SortStep[];
  finalArray: number[];
  comparisons: number;
  swaps: number;
  peakAuxBytes: number;
  aborted: boolean;
}

export interface SortAlgorithm {
  key: AlgorithmKey;
  run: (input: number[], options?: SortRunOptions) => SortRunResult;
}

type RawSortFn = (
  input: number[],
  options?: SortRunOptions,
) => SortRunResult;

export const sortAlgorithmRegistry: Record<AlgorithmKey, SortAlgorithm> = {
  bubble: { key: "bubble", run: bubbleSort as RawSortFn },
  heap: { key: "heap", run: heapSort as RawSortFn },
  insertion: { key: "insertion", run: insertionSort as RawSortFn },
  merge: { key: "merge", run: mergeSort as RawSortFn },
  quick: { key: "quick", run: quickSort as RawSortFn },
};
