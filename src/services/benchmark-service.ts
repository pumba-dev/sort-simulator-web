import type {
  AlgorithmKey,
  BenchmarkCell,
  BenchmarkReplicationSample,
  BenchmarkReport,
  CompareJob,
  ComparisonResultRow,
  ScenarioType,
} from "../types/comparator";
import {
  sortAlgorithmRegistry,
  type SortAlgorithm,
} from "./sort-algorithm-registry";
import { deriveCellSeed, generateScenarioArray } from "./seeded-prng";

const BYTES_PER_KB = 1024;

// Returns current time in milliseconds using high-resolution timer when available.
const nowMs = (): number => {
  if (typeof performance !== "undefined" && performance.now) {
    return performance.now();
  }
  return Date.now();
};

export interface BenchmarkRunCallbacks {
  onProgress?: (completed: number, total: number) => void;
  signal?: AbortSignal;
}

// Executes benchmark jobs, manages cell iteration, timing, outlier removal, and report assembly.
export class BenchmarkService {
  private registry: Record<AlgorithmKey, SortAlgorithm>;

  // Accepts an optional registry override so unit tests can inject stub algorithms.
  constructor(
    registry: Record<AlgorithmKey, SortAlgorithm> = sortAlgorithmRegistry,
  ) {
    this.registry = registry;
  }

  // Iterates the cartesian product (algorithms × scenarios × sizes), runs each cell,
  // fires onProgress after each cell, and returns the assembled BenchmarkReport.
  async runJob(
    job: CompareJob,
    callbacks: BenchmarkRunCallbacks = {},
  ): Promise<BenchmarkReport> {
    const startMs = Date.now();
    const cells: BenchmarkCell[] = [];
    const total =
      job.algorithms.length * job.scenarios.length * job.sizes.length;
    let completed = 0;

    for (const scenario of job.scenarios) {
      for (const size of job.sizes) {
        for (const algorithm of job.algorithms) {
          if (callbacks.signal?.aborted) {
            const report = this.buildReport(job, cells);
            report.elapsedMs = Date.now() - startMs;
            return report;
          }

          const cell = await this.runCell(
            algorithm,
            scenario,
            size,
            job.replications,
            {
              seed: job.seed,
              timeoutMs: job.timeoutMs,
              removeOutliers: job.removeOutliers,
              parentSignal: callbacks.signal,
            },
          );
          cells.push(cell);

          completed += 1;
          callbacks.onProgress?.(completed, total);
          await yieldMicrotask();
        }
      }
    }

    const report = this.buildReport(job, cells);
    report.elapsedMs = Date.now() - startMs;
    return report;
  }

  // Runs all replications for a single (algorithm, scenario, size) cell.
  // Each replication gets a per-replication timeout AbortController wired to the parent signal.
  // Timed-out replications are counted but excluded from aggregate statistics.
  async runCell(
    algorithm: AlgorithmKey,
    scenario: ScenarioType,
    size: number,
    replications: number,
    options: {
      seed: number;
      timeoutMs: number;
      removeOutliers: boolean;
      parentSignal?: AbortSignal;
    },
  ): Promise<BenchmarkCell> {
    const samples: BenchmarkReplicationSample[] = [];
    let timeoutCount = 0;

    for (let rep = 0; rep < replications; rep += 1) {
      if (options.parentSignal?.aborted) {
        break;
      }
      if (rep > 0) await yieldMicrotask();

      const cellSeed = deriveCellSeed(options.seed, scenario, size, rep);
      const input = generateScenarioArray(size, scenario, cellSeed);

      const controller = new AbortController();
      const cleanup = wireParent(options.parentSignal, controller);
      const deadlineMs = Date.now() + options.timeoutMs;

      let start = 0;
      let end = 0;
      try {
        start = nowMs();
        const runResult = await this.registry[algorithm].run(input, {
          recordSteps: false,
          signal: controller.signal,
          yieldEveryOps: 5000,
          deadlineMs,
        });

        end = nowMs();

        if (runResult.aborted) {
          timeoutCount += 1;
          samples.push({
            durationMs: end - start,
            comparisons: runResult.comparisons,
            swaps: runResult.swaps,
            peakAuxBytes: runResult.peakAuxBytes,
            timedOut: true,
          });
        } else {
          samples.push({
            durationMs: end - start,
            comparisons: runResult.comparisons,
            swaps: runResult.swaps,
            peakAuxBytes: runResult.peakAuxBytes,
            timedOut: false,
          });
        }
      } finally {
        cleanup();
      }
    }

    const validSamples = samples.filter((s) => !s.timedOut);
    const durations = validSamples.map((s) => s.durationMs);

    let removed: number[] = [];
    let keptDurations = durations;
    if (options.removeOutliers) {
      const result = BenchmarkService.removeOutliersIqr(durations);
      keptDurations = result.kept;
      removed = result.removed;
    }

    const averageTimeMs = BenchmarkService.average(keptDurations);
    const averageComparisons = BenchmarkService.average(
      validSamples.map((s) => s.comparisons),
    );
    const averageSwaps = BenchmarkService.average(
      validSamples.map((s) => s.swaps),
    );
    const averageMemoryBytes = BenchmarkService.average(
      validSamples.map((s) => s.peakAuxBytes),
    );

    return {
      algorithm,
      scenario,
      size,
      samples,
      removedOutlierDurations: removed,
      averageTimeMs: round(averageTimeMs, 3),
      averageComparisons: Math.round(averageComparisons),
      averageMemoryKb: round(averageMemoryBytes / BYTES_PER_KB, 2),
      averageSwaps: Math.round(averageSwaps),
      timeoutCount,
    };
  }

  // Computes the arithmetic mean; returns 0 for empty input.
  static average(values: number[]): number {
    if (values.length === 0) return 0;
    let total = 0;
    for (const v of values) total += v;
    return total / values.length;
  }

  // Computes percentile p (0–1) of a pre-sorted array via linear interpolation.
  static percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    const position = (sortedValues.length - 1) * p;
    const baseIndex = Math.floor(position);
    const upperIndex = Math.ceil(position);
    if (baseIndex === upperIndex) return sortedValues[baseIndex];
    const weight = position - baseIndex;
    return (
      sortedValues[baseIndex] * (1 - weight) + sortedValues[upperIndex] * weight
    );
  }

  // Splits values into kept/removed using 1.5×IQR fences (Tukey method).
  // Falls back to returning all values when the array has fewer than 4 elements or all would be removed.
  static removeOutliersIqr(values: number[]): {
    kept: number[];
    removed: number[];
  } {
    if (values.length < 4) {
      return { kept: [...values], removed: [] };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = BenchmarkService.percentile(sorted, 0.25);
    const q3 = BenchmarkService.percentile(sorted, 0.75);
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;
    const kept: number[] = [];
    const removed: number[] = [];
    for (const v of values) {
      if (v >= lower && v <= upper) {
        kept.push(v);
      } else {
        removed.push(v);
      }
    }
    if (kept.length === 0) {
      return { kept: sorted, removed: [] };
    }
    return { kept, removed };
  }

  // Assembles the final BenchmarkReport, mapping each cell to a back-compat ComparisonResultRow
  // so existing table and chart components keep working without modification.
  private buildReport(
    job: CompareJob,
    cells: BenchmarkCell[],
  ): BenchmarkReport {
    const rows: ComparisonResultRow[] = cells.map((cell) => ({
      id: `${cell.algorithm}-${cell.scenario}-${cell.size}`,
      algorithm: cell.algorithm,
      scenario: cell.scenario,
      size: cell.size,
      averageTimeMs: cell.averageTimeMs,
      averageComparisons: cell.averageComparisons,
      averageMemoryKb: cell.averageMemoryKb,
      averageSwaps: cell.averageSwaps,
      timeoutCount: cell.timeoutCount,
    }));

    return {
      config: job,
      executedAt: new Date().toISOString(),
      cells,
      rows,
    };
  }
}

// Yields to the event loop between cells so the main thread remains responsive.
const yieldMicrotask = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

// Propagates cancellation from a parent AbortSignal to a child AbortController.
// Returns a cleanup function that removes the listener when the replication completes.
const wireParent = (
  parent: AbortSignal | undefined,
  child: AbortController,
): (() => void) => {
  if (!parent) return () => {};
  if (parent.aborted) {
    child.abort();
    return () => {};
  }
  const handler = () => child.abort();
  parent.addEventListener("abort", handler, { once: true });
  return () => parent.removeEventListener("abort", handler);
};

// Rounds a number to the specified number of decimal places.
const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};
