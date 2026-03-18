import {
  COMPARISON_HISTORY_KEY,
  type CompareJob,
  type ComparisonHistoryEntry,
  type ComparisonResultRow,
} from "../types/comparator";

const COMPARISON_PENDING_CONFIG_KEY = "sorting-simulator-pending-config";
const HISTORY_LIMIT = 10;

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

export const loadComparisonHistory = (): ComparisonHistoryEntry[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const parsed = safeParse<ComparisonHistoryEntry[]>(
    window.localStorage.getItem(COMPARISON_HISTORY_KEY),
  );

  if (!parsed || !Array.isArray(parsed)) {
    return [];
  }

  return parsed;
};

export const saveComparisonHistoryEntry = (
  config: CompareJob,
  rows: ComparisonResultRow[],
): ComparisonHistoryEntry => {
  const entry: ComparisonHistoryEntry = {
    id: `${Date.now()}`,
    executedAt: new Date().toISOString(),
    config,
    rows,
  };

  const nextHistory = [entry, ...loadComparisonHistory()].slice(
    0,
    HISTORY_LIMIT,
  );

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      COMPARISON_HISTORY_KEY,
      JSON.stringify(nextHistory),
    );
  }

  return entry;
};

export const clearComparisonHistory = (): void => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(COMPARISON_HISTORY_KEY);
  }
};

export const setPendingCompareConfig = (config: CompareJob): void => {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(
      COMPARISON_PENDING_CONFIG_KEY,
      JSON.stringify(config),
    );
  }
};

export const consumePendingCompareConfig = (): CompareJob | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const parsed = safeParse<CompareJob>(
    window.sessionStorage.getItem(COMPARISON_PENDING_CONFIG_KEY),
  );

  window.sessionStorage.removeItem(COMPARISON_PENDING_CONFIG_KEY);
  return parsed;
};
