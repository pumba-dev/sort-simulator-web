/** Single snapshot captured during a sorting animation step. */
export interface SortStep {
  /** Current state of the array at this step. */
  values: number[];
  /** Indexes of elements being compared or swapped. */
  activeIndexes: number[];
  /** Running total of comparisons up to this step. */
  comparisons: number;
  /** Running total of swaps/moves up to this step. */
  swaps: number;
  /** Algorithm-specific loop variables for display purposes. */
  variables: Record<string, unknown>;
  /** Index of the current pivot element, or null when not applicable. */
  pivotIndex: number | null;
  /** Contiguous range already in final sorted position (Bubble Sort). */
  sortedPartition?: { start: number; end: number };
  /** Active heap region during heapify operations (Heap Sort). */
  heapifyRegion?: { start: number; end: number } | null;
  /** Index of the gap being filled during insertion (Insertion Sort). */
  gapIndex?: number | null;
  /** Range currently being merged (Merge Sort). */
  merging?: { start: number; end: number };
  /** Recursion depth of the current merge/partition (Merge/Quick Sort). */
  divisionDepth?: number;
  /** Index where the pivot landed after partitioning (Quick Sort). */
  partitionIndex?: number | null;
  /** Fase atual do TimSort: "insertion" (ordenação de runs) ou "merge" (fusão). */
  timPhase?: "insertion" | "merge";
  /** Limites visuais de cada run durante a fase de inserção do TimSort. */
  timRunBoundaries?: { start: number; end: number }[];
}

/** Options forwarded to every sort algorithm's `run` function. */
export interface SortRunOptions {
  /** Whether to collect step snapshots. Disable for pure benchmark runs. Default: true. */
  recordSteps?: boolean;
  /** AbortSignal to cancel a long-running sort mid-execution. */
  signal?: AbortSignal;
  /** How many inner operations to process before checking the abort signal. Default: 50000. */
  yieldEveryOps?: number;
}

/** Value returned by every sort algorithm after execution completes or is aborted. */
export interface SortRunResult {
  /** Ordered list of snapshots for step-by-step visualization (empty when recordSteps=false). */
  steps: SortStep[];
  /** The sorted (or partially sorted, if aborted) array. */
  finalArray: number[];
  /** Total number of element comparisons performed. */
  comparisons: number;
  /** Total number of element swaps or moves performed. */
  swaps: number;
  /** Peak auxiliary memory used in bytes (excludes the input array copy). */
  peakAuxBytes: number;
  /** True when the sort was interrupted by an AbortSignal. */
  aborted: boolean;
}
