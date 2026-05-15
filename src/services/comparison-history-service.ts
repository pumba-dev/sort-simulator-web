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

/**
 * Persists comparison runs and pending comparator configs in browser storage.
 * Storage handles are resolved at construction so tests can inject in-memory stand-ins.
 */
export class ComparisonHistoryService {
  private readonly localStorage: StorageLike | null;
  private readonly sessionStorage: StorageLike | null;
  private readonly historyLimit: number;

  constructor(options: ComparisonHistoryServiceOptions = {}) {
    this.localStorage =
      options.localStorage !== undefined
        ? options.localStorage
        : ComparisonHistoryService.resolveLocalStorage();
    this.sessionStorage =
      options.sessionStorage !== undefined
        ? options.sessionStorage
        : ComparisonHistoryService.resolveSessionStorage();
    this.historyLimit = options.historyLimit ?? DEFAULT_HISTORY_LIMIT;
  }

  /**
   * Reads the full history from local storage and returns it sorted with
   * imported entries first, then favorites, then the most recent. Returns
   * an empty array when storage is unavailable or the payload is corrupt.
   */
  loadHistory(): ComparisonHistoryEntry[] {
    if (!this.localStorage) {
      return [];
    }

    const parsed = ComparisonHistoryService.safeParse<ComparisonHistoryEntry[]>(
      this.localStorage.getItem(COMPARISON_HISTORY_KEY),
    );

    if (!parsed || !Array.isArray(parsed)) {
      return [];
    }

    const normalized = parsed.map(ComparisonHistoryService.normalizeEntry);
    return ComparisonHistoryService.sortEntries(normalized);
  }

  /**
   * Persists a freshly executed comparison run, prepending it to the existing
   * history and returning the newly created entry. The entry is marked as
   * `source: "manual"` and is not favorited by default.
   */
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

  /** Removes the entry with the given id. No-op if the id is not present. */
  deleteEntry(id: string): void {
    const current = this.loadHistory();
    const next = current.filter((entry) => entry.id !== id);
    if (next.length === current.length) {
      return;
    }
    this.persistHistory(next);
  }

  /**
   * Flips the `favorite` flag on the entry with the given id and returns the
   * updated entry. Returns `null` when no matching entry is found.
   */
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

  /**
   * Adds an entry built from an imported BenchmarkReport (e.g. parsed CSV).
   * The new entry is flagged with `source: "imported"` and gets a random id
   * so it never collides with manual runs.
   */
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

  /**
   * Wipes the non-favorite history. Favorited entries are preserved so the
   * user does not lose pinned runs. Removes the storage key entirely when
   * nothing is kept, freeing the quota slot.
   */
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

  /**
   * Stores a CompareJob configuration in session storage so the comparator
   * page can re-hydrate it after a navigation (e.g. "rerun from history").
   */
  setPendingConfig(config: CompareJob): void {
    this.sessionStorage?.setItem(PENDING_CONFIG_KEY, JSON.stringify(config));
  }

  /**
   * Reads and removes the pending CompareJob from session storage, applying
   * default values to optional fields that may be missing on older payloads.
   * Returns `null` when storage is unavailable or empty.
   */
  consumePendingConfig(): CompareJob | null {
    if (!this.sessionStorage) {
      return null;
    }

    const parsed = ComparisonHistoryService.safeParse<CompareJob>(
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
      timeoutEnabled:
        typeof parsed.timeoutEnabled === "boolean"
          ? parsed.timeoutEnabled
          : true,
    };
  }

  /**
   * Writes the history to local storage, sorting, normalizing and trimming
   * it to the configured limit first. When the browser raises a quota
   * exceeded error, evicts the oldest non-favorite entry and retries —
   * up to `MAX_QUOTA_RETRIES` times — before re-throwing.
   */
  private persistHistory(entries: ComparisonHistoryEntry[]): void {
    if (!this.localStorage) {
      return;
    }

    let working = ComparisonHistoryService.sortEntries(
      entries.map(ComparisonHistoryService.normalizeEntry),
    );
    working = ComparisonHistoryService.trimToLimit(working, this.historyLimit);

    for (let attempt = 0; attempt <= MAX_QUOTA_RETRIES; attempt += 1) {
      try {
        this.localStorage.setItem(
          COMPARISON_HISTORY_KEY,
          JSON.stringify(working),
        );
        return;
      } catch (error) {
        if (
          !ComparisonHistoryService.isQuotaExceeded(error) ||
          working.length === 0
        ) {
          throw error;
        }
        working = ComparisonHistoryService.evictOne(working);
      }
    }
  }

  /**
   * Backfills missing `favorite`/`source` fields on legacy entries so the
   * rest of the service can rely on their presence.
   */
  private static normalizeEntry(
    entry: ComparisonHistoryEntry,
  ): ComparisonHistoryEntry {
    return {
      ...entry,
      favorite: entry.favorite === true,
      source: entry.source ?? "manual",
    };
  }

  /**
   * Returns a new array sorted with imported entries first, then favorites,
   * then by `executedAt` descending so the most recent runs surface first.
   */
  private static sortEntries(
    entries: ComparisonHistoryEntry[],
  ): ComparisonHistoryEntry[] {
    return [...entries].sort((a, b) => {
      const sourceDiff =
        Number(b.source === "imported") - Number(a.source === "imported");
      if (sourceDiff !== 0) {
        return sourceDiff;
      }
      const favDiff =
        Number(b.favorite === true) - Number(a.favorite === true);
      if (favDiff !== 0) {
        return favDiff;
      }
      return b.executedAt.localeCompare(a.executedAt);
    });
  }

  /**
   * Trims the list to `limit` entries by evicting the oldest non-favorite
   * first. Favorites are sacrificed only when they already fill the quota,
   * so newer entries still get a chance to be stored.
   */
  private static trimToLimit(
    entries: ComparisonHistoryEntry[],
    limit: number,
  ): ComparisonHistoryEntry[] {
    let working = [...entries];
    while (working.length > limit) {
      const favCount = working.reduce(
        (count, entry) => count + (entry.favorite ? 1 : 0),
        0,
      );
      const preferFavorite = favCount >= limit;
      working = ComparisonHistoryService.dropOldestMatching(working, (entry) =>
        preferFavorite ? entry.favorite === true : entry.favorite !== true,
      );
    }
    return working;
  }

  /**
   * Evicts a single entry: drops the oldest non-favorite when possible,
   * otherwise falls back to dropping the oldest favorite. Used when the
   * storage quota is exceeded mid-write.
   */
  private static evictOne(
    entries: ComparisonHistoryEntry[],
  ): ComparisonHistoryEntry[] {
    const next = ComparisonHistoryService.dropOldestMatching(
      entries,
      (entry) => entry.favorite !== true,
    );
    if (next.length !== entries.length) {
      return next;
    }
    return ComparisonHistoryService.dropOldestMatching(entries, () => true);
  }

  /**
   * Returns a copy of `entries` with the oldest element matching the
   * predicate removed. Entries with unparsable `executedAt` are treated
   * as infinitely new (never selected). Returns the input unchanged when
   * nothing matches.
   */
  private static dropOldestMatching(
    entries: ComparisonHistoryEntry[],
    predicate: (entry: ComparisonHistoryEntry) => boolean,
  ): ComparisonHistoryEntry[] {
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
  }

  /**
   * Detects browser storage quota errors across browsers (DOMException name
   * or legacy numeric code). Returns false for anything else.
   */
  private static isQuotaExceeded(error: unknown): boolean {
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
  }

  /**
   * Parses a JSON string, returning `null` when the input is null/empty or
   * the payload cannot be parsed. Used so corrupted storage never throws.
   */
  private static safeParse<T>(rawValue: string | null): T | null {
    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as T;
    } catch {
      return null;
    }
  }

  /** Returns `window.localStorage` when available, `null` under SSR. */
  private static resolveLocalStorage(): StorageLike | null {
    return typeof window === "undefined" ? null : window.localStorage;
  }

  /** Returns `window.sessionStorage` when available, `null` under SSR. */
  private static resolveSessionStorage(): StorageLike | null {
    return typeof window === "undefined" ? null : window.sessionStorage;
  }
}
