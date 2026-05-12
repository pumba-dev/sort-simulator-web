export type ScenarioType = "crescente" | "decrescente" | "aleatorio";
export type AlgorithmKey = "insertion" | "bubble" | "merge" | "heap" | "quick";

export interface BenchmarkEnvironment {
  os: string;
  browser: string;
  browserVersion: string;
  engine: string;
  cpuThreads?: number;
  memoryGB?: number;
  mobile: boolean;
  gpu?: string;
  baselineScore: number;
}

export interface CompareJob {
  algorithms: AlgorithmKey[];
  scenarios: ScenarioType[];
  sizes: number[];
  replications: number;
  timeoutMs: number;
  seed: number;
  removeOutliers: boolean;
}

export interface ComparisonResultRow {
  id: string;
  algorithm: AlgorithmKey;
  scenario: ScenarioType;
  size: number;
  averageTimeMs: number;
  averageComparisons: number;
  averageMemoryKb: number;
  averageSwaps: number;
  timeoutCount: number;
}

export interface BenchmarkReplicationSample {
  durationMs: number;
  comparisons: number;
  swaps: number;
  peakAuxBytes: number;
  timedOut: boolean;
}

export interface BenchmarkCell {
  algorithm: AlgorithmKey;
  scenario: ScenarioType;
  size: number;
  samples: BenchmarkReplicationSample[];
  removedOutlierDurations: number[];
  averageTimeMs: number;
  averageComparisons: number;
  averageMemoryKb: number;
  averageSwaps: number;
  timeoutCount: number;
}

export interface BenchmarkReport {
  config: CompareJob;
  executedAt: string;
  cells: BenchmarkCell[];
  rows: ComparisonResultRow[];
  environment?: BenchmarkEnvironment;
  elapsedMs?: number;
}

export interface ComparisonHistoryEntry {
  id: string;
  executedAt: string;
  config: CompareJob;
  rows: ComparisonResultRow[];
  environment?: BenchmarkEnvironment;
  elapsedMs?: number;
  report?: BenchmarkReport;
}

export type WorkerCommand =
  | {
      type: "start";
      payload: CompareJob;
    }
  | {
      type: "cancel";
    };

export type WorkerMessage =
  | {
      type: "progress";
      completed: number;
      total: number;
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

export const COMPARISON_HISTORY_KEY = "sorting-simulator-history";
