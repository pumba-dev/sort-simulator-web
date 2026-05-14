import type { AlgorithmKey } from "../types/comparator";
import type { SortAlgorithm } from "../services/sort-algorithm-registry";
import type { SortRunOptions, SortRunResult } from "../types/sort-types";

const ALGORITHM_KEYS: AlgorithmKey[] = [
  "bubble",
  "heap",
  "insertion",
  "merge",
  "quick",
  "tim",
];

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

const buildAbortedResult = (input: number[]): SortRunResult => ({
  steps: [],
  finalArray: [...input],
  comparisons: 0,
  swaps: 0,
  peakAuxBytes: input.length * 8,
  aborted: true,
});

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
