/** Input distribution used when generating the benchmark array. */
export type ScenarioType =
  | "crescente"
  | "decrescente"
  | "aleatorio"
  | "quaseOrdenado"
  | "quaseDecrescente"
  | "gaussiano"
  | "organPipe"
  | "comOutliers";

/** Identifier for every sort algorithm supported by the comparator and learning modules. */
export type AlgorithmKey =
  | "insertion"
  | "bubble"
  | "merge"
  | "heap"
  | "quick"
  | "tim";

/**
 * Snapshot of the execution environment captured once per benchmark run.
 * Attached to the resulting report so historical entries can be compared
 * across different machines, browsers and CPU baselines.
 */
export interface BenchmarkEnvironment {
  /** Operating system label inferred from the User-Agent (e.g. "Windows 10/11"). */
  os: string;
  /** Browser name (e.g. "Chrome", "Firefox"). */
  browser: string;
  /** Browser major version as a string, or empty when unknown. */
  browserVersion: string;
  /** JavaScript engine label (e.g. "V8", "SpiderMonkey"). */
  engine: string;
  /** Logical CPU thread count when navigator.hardwareConcurrency is available. */
  cpuThreads?: number;
  /** Device memory in GB when navigator.deviceMemory is available. */
  memoryGB?: number;
  /** Whether the device appears to be a mobile/touch device. */
  mobile: boolean;
  /** Unmasked GPU renderer string when accessible via WebGL. */
  gpu?: string;
  /** Coarse single-thread JS performance baseline in milliseconds (lower = faster). */
  baselineScore: number;
}

/** Configuration of a single comparator run, persisted with each history entry. */
export interface CompareJob {
  /** Algorithms participating in the comparison. */
  algorithms: AlgorithmKey[];
  /** Input scenarios applied to every algorithm/size pair. */
  scenarios: ScenarioType[];
  /** Input sizes to benchmark. */
  sizes: number[];
  /** Number of replications per (algorithm, scenario, size) cell. */
  replications: number;
  /** Per-replication timeout in milliseconds (ignored when `timeoutEnabled` is false). */
  timeoutMs: number;
  /** When true, replications exceeding `timeoutMs` are aborted and counted as timeouts. */
  timeoutEnabled: boolean;
  /** Base seed used to derive deterministic per-cell PRNG seeds. */
  seed: number;
  /** When true, IQR-based outlier removal is applied to duration samples. */
  removeOutliers: boolean;
  /** When true, the "aleatorio" scenario samples with replacement (allows repeated values). */
  allowDuplicates?: boolean;
}

/** Flat row used by tables and charts; one entry per (algorithm, scenario, size) cell. */
export interface ComparisonResultRow {
  /** Stable id of the row (typically "<algorithm>-<scenario>-<size>"). */
  id: string;
  algorithm: AlgorithmKey;
  scenario: ScenarioType;
  size: number;
  /** Average duration in ms across the kept (non-outlier, non-timed-out) replications. */
  averageTimeMs: number;
  /** Average comparison count across the non-timed-out replications. */
  averageComparisons: number;
  /** Average peak auxiliary memory in KB across the non-timed-out replications. */
  averageMemoryKb: number;
  /** Average swap count across the non-timed-out replications. */
  averageSwaps: number;
  /** Number of replications that hit the timeout for this cell. */
  timeoutCount: number;
}

/** Raw measurements collected from one replication of a benchmark cell. */
export interface BenchmarkReplicationSample {
  durationMs: number;
  comparisons: number;
  swaps: number;
  peakAuxBytes: number;
  /** True when this replication was aborted by the configured timeout. */
  timedOut: boolean;
}

/**
 * Aggregated measurement for a single (algorithm, scenario, size) cell.
 * Holds the raw per-replication samples plus the computed averages used
 * by the comparison table.
 */
export interface BenchmarkCell {
  algorithm: AlgorithmKey;
  scenario: ScenarioType;
  size: number;
  /** Every replication sample, including timed-out ones for full traceability. */
  samples: BenchmarkReplicationSample[];
  /** Durations that were trimmed by IQR outlier removal. */
  removedOutlierDurations: number[];
  averageTimeMs: number;
  averageComparisons: number;
  averageMemoryKb: number;
  averageSwaps: number;
  timeoutCount: number;
}

/** Full benchmark report assembled by BenchmarkService.runJob. */
export interface BenchmarkReport {
  config: CompareJob;
  /** ISO timestamp when the run finished. */
  executedAt: string;
  cells: BenchmarkCell[];
  /** Back-compat flat rows derived from `cells` for legacy table/chart code. */
  rows: ComparisonResultRow[];
  environment?: BenchmarkEnvironment;
  /** Total wall-clock time of the run in milliseconds. */
  elapsedMs?: number;
}

/** Origin of a history entry: produced by a local run or imported from a file. */
export type ComparisonHistoryEntrySource = "manual" | "imported";

/**
 * Persisted history record for a single comparator execution. Combines the
 * input config, the result rows and (for newer entries) the full report and
 * environment data so the run can be fully restored or re-exported.
 */
export interface ComparisonHistoryEntry {
  id: string;
  executedAt: string;
  config: CompareJob;
  rows: ComparisonResultRow[];
  environment?: BenchmarkEnvironment;
  elapsedMs?: number;
  report?: BenchmarkReport;
  /** When true, the entry is pinned and protected against quota eviction. */
  favorite?: boolean;
  source?: ComparisonHistoryEntrySource;
}

/** Command sent from the UI to the comparator worker. */
export type WorkerCommand =
  | {
      type: "start";
      payload: CompareJob;
    }
  | {
      type: "cancel";
    };

/** Message sent from the comparator worker back to the UI. */
export type WorkerMessage =
  | {
      type: "progress";
      completed: number;
      total: number;
    }
  | {
      type: "cell-progress";
      algorithm: AlgorithmKey;
      scenario: ScenarioType;
      size: number;
      /** Current replication number, 1-based. */
      replication: number;
      totalReplications: number;
    }
  | {
      type: "result";
      rows: ComparisonResultRow[];
      report: BenchmarkReport;
    }
  | {
      type: "cancelled";
    }
  | {
      type: "error";
      message: string;
    };

/** localStorage key under which the comparator history is persisted. */
export const COMPARISON_HISTORY_KEY = "sorting-simulator-history";
