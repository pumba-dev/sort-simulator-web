import type { AlgorithmKey } from "../types/comparator";
import type { SortAlgorithm } from "../services/sort-algorithm-registry";
import type { SortRunOptions, SortRunResult } from "../types/sort-types";

/**
 * Builds a registry that runs each sort algorithm inside a dedicated Web Worker
 * (`sort.worker.ts`). Used by the comparator worker so a long or stuck
 * replication can be terminated without affecting the parent or sibling runs.
 * AbortSignals are honored locally and translated into Worker termination
 * because Workers cannot receive AbortSignal directly via postMessage.
 */

/** Ordered list of every algorithm key handled by the registry. */
const ALGORITHM_KEYS: AlgorithmKey[] = [
  "bubble",
  "heap",
  "insertion",
  "merge",
  "quick",
  "tim",
];

/**
 * Returns a `run` function that spawns a fresh sub-worker per call, posts the
 * sort job, and resolves with the result (or rejects on worker error). The
 * AbortSignal is wired locally: on abort, the worker is terminated and an
 * "aborted" SortRunResult is returned so callers see consistent shape.
 */
const makeRun =
  (key: AlgorithmKey) =>
  (input: number[], options: SortRunOptions = {}): Promise<SortRunResult> => {
    const { signal, ...transferableOptions } = options;

    return new Promise<SortRunResult>((resolve, reject) => {
      if (signal?.aborted) {
        resolve(buildAbortedResult(input));
        return;
      }

      const subWorker = new Worker(
        new URL("./sort.worker.ts", import.meta.url),
        { type: "module" },
      );

      let settled = false;

      const onAbort = () => {
        if (settled) return;
        settled = true;
        subWorker.terminate();
        signal?.removeEventListener("abort", onAbort);
        resolve(buildAbortedResult(input));
      };

      subWorker.onmessage = (event: MessageEvent) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener("abort", onAbort);
        subWorker.terminate();

        const data = event.data;
        if (data?.type === "done") {
          resolve(data.result as SortRunResult);
        } else if (data?.type === "error") {
          reject(new Error(data.message));
        } else {
          reject(new Error("sort_worker_unknown_message"));
        }
      };

      subWorker.onerror = (event: ErrorEvent) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener("abort", onAbort);
        subWorker.terminate();
        reject(new Error(event.message || "sort_worker_error"));
      };

      signal?.addEventListener("abort", onAbort);

      subWorker.postMessage({
        algorithm: key,
        input,
        options: transferableOptions,
      });
    });
  };

/**
 * Builds the SortRunResult returned when a run is aborted before completion.
 * Mirrors the contract of a real run so downstream code does not need a
 * separate branch for the aborted case.
 */
const buildAbortedResult = (input: number[]): SortRunResult => ({
  steps: [],
  finalArray: [...input],
  comparisons: 0,
  swaps: 0,
  peakAuxBytes: input.length * 8,
  aborted: true,
});

/**
 * Factory used by `comparator.worker.ts` to wire BenchmarkService against the
 * sub-worker variants instead of the in-process algorithms. Returns a map
 * keyed by AlgorithmKey for O(1) lookup.
 */
export const createSubWorkerRegistry = (): Record<
  AlgorithmKey,
  SortAlgorithm
> => {
  const registry = {} as Record<AlgorithmKey, SortAlgorithm>;
  for (const key of ALGORITHM_KEYS) {
    registry[key] = { key, run: makeRun(key) };
  }
  return registry;
};
