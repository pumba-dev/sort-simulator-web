export type ScenarioType = "crescente" | "decrescente" | "aleatorio";
export type AlgorithmKey = "insertion" | "bubble" | "merge" | "heap" | "quick";

export interface CompareJob {
  algorithms: AlgorithmKey[];
  scenarios: ScenarioType[];
  sizes: number[];
  replications: number;
  timeoutMs: number;
}

export interface ComparisonResultRow {
  id: string;
  algorithm: AlgorithmKey;
  scenario: ScenarioType;
  size: number;
  averageTimeMs: number;
  averageComparisons: number;
  averageMemoryKb: number;
  timeoutCount: number;
}

export interface ComparisonHistoryEntry {
  id: string;
  executedAt: string;
  config: CompareJob;
  rows: ComparisonResultRow[];
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
    }
  | {
      type: "cancelled";
    }
  | {
      type: "error";
      message: string;
    };

export const COMPARISON_HISTORY_KEY = "sorting-simulator-history";
