import {
  COMPARISON_HISTORY_KEY,
  type BenchmarkEnvironment,
  type BenchmarkReport,
  type CompareJob,
  type ComparisonHistoryEntry,
  type ComparisonResultRow,
} from "../types/comparator";

const PENDING_CONFIG_KEY = "sorting-simulator-pending-config";
const DEFAULT_HISTORY_LIMIT = 20;
const DEFAULT_SEED = 42;
const MAX_QUOTA_RETRIES = 50;

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

    const normalized = parsed.map(normalizeEntry);
    return sortEntries(normalized);
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
      favorite: false,
      source: "manual",
    };

    const nextHistory = [entry, ...this.loadHistory()];
    this.persistHistory(nextHistory);
    return entry;
  }

  deleteEntry(id: string): void {
    const current = this.loadHistory();
    const next = current.filter((entry) => entry.id !== id);
    if (next.length === current.length) {
      return;
    }
    this.persistHistory(next);
  }

  toggleFavorite(id: string): ComparisonHistoryEntry | null {
    const current = this.loadHistory();
    const index = current.findIndex((entry) => entry.id === id);
    if (index === -1) {
      return null;
    }
    const updated: ComparisonHistoryEntry = {
      ...current[index],
      favorite: !current[index].favorite,
    };
    const next = [...current];
    next[index] = updated;
    this.persistHistory(next);
    return updated;
  }

  importEntry(report: BenchmarkReport): ComparisonHistoryEntry {
    const entry: ComparisonHistoryEntry = {
      id: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      executedAt: report.executedAt,
      config: report.config,
      rows: report.rows,
      environment: report.environment,
      elapsedMs: report.elapsedMs,
      report,
      favorite: false,
      source: "imported",
    };

    const nextHistory = [entry, ...this.loadHistory()];
    this.persistHistory(nextHistory);
    return entry;
  }

  clearHistory(): void {
    if (!this.localStorage) {
      return;
    }
    const favorites = this.loadHistory().filter(
      (entry) => entry.favorite === true,
    );
    if (favorites.length === 0) {
      this.localStorage.removeItem(COMPARISON_HISTORY_KEY);
      return;
    }
    this.persistHistory(favorites);
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
        typeof parsed.removeOutliers === "boolean"
          ? parsed.removeOutliers
          : true,
    };
  }

  private persistHistory(entries: ComparisonHistoryEntry[]): void {
    if (!this.localStorage) {
      return;
    }

    let working = sortEntries(entries.map(normalizeEntry));
    working = trimToLimit(working, this.historyLimit);

    for (let attempt = 0; attempt <= MAX_QUOTA_RETRIES; attempt += 1) {
      try {
        this.localStorage.setItem(
          COMPARISON_HISTORY_KEY,
          JSON.stringify(working),
        );
        return;
      } catch (error) {
        if (!isQuotaExceeded(error) || working.length === 0) {
          throw error;
        }
        working = evictOne(working);
      }
    }
  }
}

const normalizeEntry = (
  entry: ComparisonHistoryEntry,
): ComparisonHistoryEntry => ({
  ...entry,
  favorite: entry.favorite === true,
  source: entry.source ?? "manual",
});

const sortEntries = (
  entries: ComparisonHistoryEntry[],
): ComparisonHistoryEntry[] => {
  return [...entries].sort((a, b) => {
    const sourceDiff =
      Number(b.source === "imported") - Number(a.source === "imported");
    if (sourceDiff !== 0) {
      return sourceDiff;
    }
    const favDiff = Number(b.favorite === true) - Number(a.favorite === true);
    if (favDiff !== 0) {
      return favDiff;
    }
    return b.executedAt.localeCompare(a.executedAt);
  });
};

const trimToLimit = (
  entries: ComparisonHistoryEntry[],
  limit: number,
): ComparisonHistoryEntry[] => {
  let working = [...entries];
  while (working.length > limit) {
    const favCount = working.reduce(
      (count, entry) => count + (entry.favorite ? 1 : 0),
      0,
    );
    // Favorites resist eviction unless they fill (or exceed) the limit:
    // then the oldest favorite is sacrificed so newer entries survive.
    const preferFavorite = favCount >= limit;
    working = dropOldestMatching(working, (entry) =>
      preferFavorite ? entry.favorite === true : entry.favorite !== true,
    );
  }
  return working;
};

const evictOne = (
  entries: ComparisonHistoryEntry[],
): ComparisonHistoryEntry[] => {
  const next = dropOldestMatching(entries, (entry) => entry.favorite !== true);
  if (next.length !== entries.length) {
    return next;
  }
  return dropOldestMatching(entries, () => true);
};

const dropOldestMatching = (
  entries: ComparisonHistoryEntry[],
  predicate: (entry: ComparisonHistoryEntry) => boolean,
): ComparisonHistoryEntry[] => {
  let evictIndex = -1;
  let oldestTimestamp = Number.POSITIVE_INFINITY;
  for (let i = 0; i < entries.length; i += 1) {
    if (!predicate(entries[i])) continue;
    const ts = Date.parse(entries[i].executedAt);
    const value = Number.isFinite(ts) ? ts : Number.POSITIVE_INFINITY;
    if (value < oldestTimestamp) {
      oldestTimestamp = value;
      evictIndex = i;
    }
  }
  if (evictIndex === -1) {
    return entries;
  }
  return entries.filter((_, idx) => idx !== evictIndex);
};

const isQuotaExceeded = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }
  const name = (error as { name?: string }).name;
  const code = (error as { code?: number }).code;
  return (
    name === "QuotaExceededError" ||
    name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    code === 22 ||
    code === 1014
  );
};

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
