import {
  COMPARISON_HISTORY_KEY,
  type BenchmarkEnvironment,
  type BenchmarkReport,
  type CompareJob,
  type ComparisonHistoryEntry,
  type ComparisonResultRow,
} from "../types/comparator";

const PENDING_CONFIG_KEY = "sorting-simulator-pending-config";
const DEFAULT_HISTORY_LIMIT = 10;
const DEFAULT_SEED = 42;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ComparisonHistoryServiceOptions {
  localStorage?: StorageLike | null;
  sessionStorage?: StorageLike | null;
  historyLimit?: number;
}

// Persists comparison runs and pending comparator configs in browser storage.
// Storage handles are resolved at construction so tests can inject in-memory stand-ins.
export class ComparisonHistoryService {
  private readonly localStorage: StorageLike | null;
  private readonly sessionStorage: StorageLike | null;
  private readonly historyLimit: number;

  constructor(options: ComparisonHistoryServiceOptions = {}) {
    this.localStorage =
      options.localStorage !== undefined
        ? options.localStorage
        : resolveLocalStorage();
    this.sessionStorage =
      options.sessionStorage !== undefined
        ? options.sessionStorage
        : resolveSessionStorage();
    this.historyLimit = options.historyLimit ?? DEFAULT_HISTORY_LIMIT;
  }

  loadHistory(): ComparisonHistoryEntry[] {
    if (!this.localStorage) {
      return [];
    }

    const parsed = safeParse<ComparisonHistoryEntry[]>(
      this.localStorage.getItem(COMPARISON_HISTORY_KEY),
    );

    if (!parsed || !Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  }

  saveEntry(
    config: CompareJob,
    rows: ComparisonResultRow[],
    environment?: BenchmarkEnvironment,
    report?: BenchmarkReport,
  ): ComparisonHistoryEntry {
    const entry: ComparisonHistoryEntry = {
      id: `${Date.now()}`,
      executedAt: new Date().toISOString(),
      config,
      rows,
      environment,
      elapsedMs: report?.elapsedMs,
      report,
    };

    const nextHistory = [entry, ...this.loadHistory()].slice(
      0,
      this.historyLimit,
    );

    this.localStorage?.setItem(
      COMPARISON_HISTORY_KEY,
      JSON.stringify(nextHistory),
    );

    return entry;
  }

  clearHistory(): void {
    this.localStorage?.removeItem(COMPARISON_HISTORY_KEY);
  }

  setPendingConfig(config: CompareJob): void {
    this.sessionStorage?.setItem(PENDING_CONFIG_KEY, JSON.stringify(config));
  }

  consumePendingConfig(): CompareJob | null {
    if (!this.sessionStorage) {
      return null;
    }

    const parsed = safeParse<CompareJob>(
      this.sessionStorage.getItem(PENDING_CONFIG_KEY),
    );

    this.sessionStorage.removeItem(PENDING_CONFIG_KEY);

    if (!parsed) {
      return null;
    }

    return {
      ...parsed,
      seed: typeof parsed.seed === "number" ? parsed.seed : DEFAULT_SEED,
      removeOutliers:
        typeof parsed.removeOutliers === "boolean" ? parsed.removeOutliers : true,
    };
  }
}

const safeParse = <T>(rawValue: string | null): T | null => {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
};

const resolveLocalStorage = (): StorageLike | null =>
  typeof window === "undefined" ? null : window.localStorage;

const resolveSessionStorage = (): StorageLike | null =>
  typeof window === "undefined" ? null : window.sessionStorage;
