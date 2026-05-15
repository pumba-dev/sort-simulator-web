import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ComparisonHistoryService,
  type StorageLike,
} from "../../src/services/comparison-history-service";
import {
  COMPARISON_HISTORY_KEY,
  type BenchmarkEnvironment,
  type BenchmarkReport,
  type CompareJob,
  type ComparisonResultRow,
} from "../../src/types/comparator";

const PENDING_CONFIG_KEY = "sorting-simulator-pending-config";

const createMemoryStorage = (): StorageLike & {
  dump(): Map<string, string>;
} => {
  const data = new Map<string, string>();
  return {
    getItem(key) {
      return data.has(key) ? (data.get(key) as string) : null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
    dump() {
      return data;
    },
  };
};

const baseJob = (overrides: Partial<CompareJob> = {}): CompareJob => ({
  algorithms: ["bubble"],
  scenarios: ["aleatorio"],
  sizes: [50],
  replications: 3,
  timeoutMs: 60000,
  seed: 42,
  removeOutliers: true,
  ...overrides,
});

const baseRow = (
  overrides: Partial<ComparisonResultRow> = {},
): ComparisonResultRow => ({
  id: "bubble-aleatorio-50",
  algorithm: "bubble",
  scenario: "aleatorio",
  size: 50,
  averageTimeMs: 1.2,
  averageComparisons: 100,
  averageMemoryKb: 1,
  averageSwaps: 30,
  timeoutCount: 0,
  ...overrides,
});

const baseEnvironment = (): BenchmarkEnvironment => ({
  os: "Linux",
  browser: "Chrome",
  browserVersion: "120",
  engine: "Blink",
  mobile: false,
  baselineScore: 100,
});

const baseReport = (
  overrides: Partial<BenchmarkReport> = {},
): BenchmarkReport => ({
  config: baseJob(),
  executedAt: "2026-01-01T00:00:00.000Z",
  cells: [],
  rows: [baseRow()],
  elapsedMs: 1234,
  ...overrides,
});

describe("ComparisonHistoryService — constructor", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to null storages when window is undefined (node env)", () => {
    const service = new ComparisonHistoryService();
    expect(service.loadHistory()).toEqual([]);
    expect(service.consumePendingConfig()).toBeNull();
    service.clearHistory();
    service.setPendingConfig(baseJob());
    service.saveEntry(baseJob(), [baseRow()]);
  });

  it("resolves window.localStorage and window.sessionStorage when window is defined", () => {
    const local = createMemoryStorage();
    const session = createMemoryStorage();
    vi.stubGlobal("window", { localStorage: local, sessionStorage: session });

    const service = new ComparisonHistoryService();
    const config = baseJob({ seed: 13 });
    service.setPendingConfig(config);

    expect(JSON.parse(session.getItem(PENDING_CONFIG_KEY) as string)).toEqual(
      config,
    );

    service.saveEntry(baseJob(), [baseRow()]);
    expect(local.getItem(COMPARISON_HISTORY_KEY)).not.toBeNull();
  });

  it("accepts injected storages and custom historyLimit", () => {
    const local = createMemoryStorage();
    const session = createMemoryStorage();
    const service = new ComparisonHistoryService({
      localStorage: local,
      sessionStorage: session,
      historyLimit: 2,
    });

    service.saveEntry(baseJob(), [baseRow()]);
    service.saveEntry(baseJob(), [baseRow()]);
    service.saveEntry(baseJob(), [baseRow()]);

    expect(service.loadHistory()).toHaveLength(2);
  });

  it("honors explicit null storages over defaults", () => {
    const service = new ComparisonHistoryService({
      localStorage: null,
      sessionStorage: null,
    });
    expect(service.loadHistory()).toEqual([]);
    expect(service.consumePendingConfig()).toBeNull();
  });
});

describe("ComparisonHistoryService.loadHistory", () => {
  it("returns [] when localStorage missing", () => {
    const service = new ComparisonHistoryService({ localStorage: null });
    expect(service.loadHistory()).toEqual([]);
  });

  it("returns [] when key is absent (getItem returns null)", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({ localStorage: local });
    expect(service.loadHistory()).toEqual([]);
  });

  it("returns [] when stored JSON is malformed", () => {
    const local = createMemoryStorage();
    local.setItem(COMPARISON_HISTORY_KEY, "not-json");
    const service = new ComparisonHistoryService({ localStorage: local });
    expect(service.loadHistory()).toEqual([]);
  });

  it("returns [] when stored value is not an array", () => {
    const local = createMemoryStorage();
    local.setItem(COMPARISON_HISTORY_KEY, JSON.stringify({ foo: 1 }));
    const service = new ComparisonHistoryService({ localStorage: local });
    expect(service.loadHistory()).toEqual([]);
  });

  it("returns the parsed array when valid", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({ localStorage: local });
    service.saveEntry(baseJob(), [baseRow()]);
    const history = service.loadHistory();
    expect(history).toHaveLength(1);
    expect(history[0].config).toEqual(baseJob());
  });
});

describe("ComparisonHistoryService.saveEntry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-13T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores entry with id from Date.now and ISO executedAt", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({ localStorage: local });

    const entry = service.saveEntry(baseJob(), [baseRow()]);

    expect(entry.id).toBe(`${Date.parse("2026-05-13T10:00:00.000Z")}`);
    expect(entry.executedAt).toBe("2026-05-13T10:00:00.000Z");
    expect(entry.elapsedMs).toBeUndefined();
    expect(entry.report).toBeUndefined();
    expect(entry.environment).toBeUndefined();

    const persisted = JSON.parse(
      local.getItem(COMPARISON_HISTORY_KEY) as string,
    );
    expect(persisted).toHaveLength(1);
    expect(persisted[0].id).toBe(entry.id);
  });

  it("copies elapsedMs and report when report is provided", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({ localStorage: local });

    const report = baseReport({ elapsedMs: 9999 });
    const entry = service.saveEntry(
      baseJob(),
      [baseRow()],
      baseEnvironment(),
      report,
    );

    expect(entry.elapsedMs).toBe(9999);
    expect(entry.report).toBe(report);
    expect(entry.environment).toEqual(baseEnvironment());
  });

  it("prepends new entries and enforces historyLimit", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({
      localStorage: local,
      historyLimit: 2,
    });

    vi.setSystemTime(new Date("2026-05-13T10:00:00.000Z"));
    service.saveEntry(baseJob({ seed: 1 }), [baseRow()]);
    vi.setSystemTime(new Date("2026-05-13T10:00:01.000Z"));
    service.saveEntry(baseJob({ seed: 2 }), [baseRow()]);
    vi.setSystemTime(new Date("2026-05-13T10:00:02.000Z"));
    service.saveEntry(baseJob({ seed: 3 }), [baseRow()]);

    const history = service.loadHistory();
    expect(history).toHaveLength(2);
    expect(history[0].config.seed).toBe(3);
    expect(history[1].config.seed).toBe(2);
  });

  it("returns entry even when localStorage is null (no persistence)", () => {
    const service = new ComparisonHistoryService({ localStorage: null });
    const entry = service.saveEntry(baseJob(), [baseRow()]);
    expect(entry.id).toBeTruthy();
    expect(service.loadHistory()).toEqual([]);
  });

  it("uses default historyLimit of 20 when not provided", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({ localStorage: local });

    for (let i = 0; i < 27; i += 1) {
      vi.setSystemTime(new Date(2026, 0, 1, 0, 0, i));
      service.saveEntry(baseJob({ seed: i }), [baseRow()]);
    }

    expect(service.loadHistory()).toHaveLength(20);
  });

  it("marks new entries with source 'manual' and favorite false", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({ localStorage: local });

    const entry = service.saveEntry(baseJob(), [baseRow()]);

    expect(entry.source).toBe("manual");
    expect(entry.favorite).toBe(false);
  });
});

describe("ComparisonHistoryService.deleteEntry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes the entry with the matching id", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({ localStorage: local });

    vi.setSystemTime(new Date("2026-05-13T10:00:00.000Z"));
    const a = service.saveEntry(baseJob({ seed: 1 }), [baseRow()]);
    vi.setSystemTime(new Date("2026-05-13T10:00:01.000Z"));
    const b = service.saveEntry(baseJob({ seed: 2 }), [baseRow()]);

    service.deleteEntry(a.id);

    const remaining = service.loadHistory();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(b.id);
  });

  it("is a no-op when id is unknown", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({ localStorage: local });
    service.saveEntry(baseJob(), [baseRow()]);

    const before = local.getItem(COMPARISON_HISTORY_KEY);
    service.deleteEntry("nonexistent");
    const after = local.getItem(COMPARISON_HISTORY_KEY);

    expect(after).toBe(before);
    expect(service.loadHistory()).toHaveLength(1);
  });

  it("is a no-op when localStorage is null", () => {
    const service = new ComparisonHistoryService({ localStorage: null });
    expect(() => service.deleteEntry("any")).not.toThrow();
  });
});

describe("ComparisonHistoryService.toggleFavorite", () => {
  it("toggles favorite flag and returns updated entry", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({ localStorage: local });
    const entry = service.saveEntry(baseJob(), [baseRow()]);

    const first = service.toggleFavorite(entry.id);
    expect(first?.favorite).toBe(true);

    const second = service.toggleFavorite(entry.id);
    expect(second?.favorite).toBe(false);
  });

  it("returns null when id is unknown", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({ localStorage: local });
    expect(service.toggleFavorite("nope")).toBeNull();
  });

  it("persists the new favorite flag", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({ localStorage: local });
    const entry = service.saveEntry(baseJob(), [baseRow()]);

    service.toggleFavorite(entry.id);

    const persisted = JSON.parse(
      local.getItem(COMPARISON_HISTORY_KEY) as string,
    );
    expect(persisted[0].favorite).toBe(true);
  });
});

describe("ComparisonHistoryService.importEntry", () => {
  it("creates entry with source 'imported' and preserves report.executedAt", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({ localStorage: local });

    const report = baseReport({
      executedAt: "2025-09-10T12:34:56.000Z",
      elapsedMs: 4242,
      environment: baseEnvironment(),
    });

    const entry = service.importEntry(report);

    expect(entry.source).toBe("imported");
    expect(entry.executedAt).toBe("2025-09-10T12:34:56.000Z");
    expect(entry.config).toEqual(report.config);
    expect(entry.rows).toEqual(report.rows);
    expect(entry.environment).toEqual(baseEnvironment());
    expect(entry.elapsedMs).toBe(4242);
    expect(entry.favorite).toBe(false);
  });

  it("generates unique ids for back-to-back imports", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({ localStorage: local });

    const a = service.importEntry(baseReport());
    const b = service.importEntry(baseReport());

    expect(a.id).not.toBe(b.id);
  });
});

describe("ComparisonHistoryService — favorites + ordering", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns favorites first, then non-favorites by executedAt desc", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({ localStorage: local });

    vi.setSystemTime(new Date("2026-05-13T10:00:00.000Z"));
    const a = service.saveEntry(baseJob({ seed: 1 }), [baseRow()]);
    vi.setSystemTime(new Date("2026-05-13T10:00:01.000Z"));
    service.saveEntry(baseJob({ seed: 2 }), [baseRow()]);
    vi.setSystemTime(new Date("2026-05-13T10:00:02.000Z"));
    service.saveEntry(baseJob({ seed: 3 }), [baseRow()]);

    service.toggleFavorite(a.id);

    const order = service.loadHistory().map((e) => e.config.seed);
    expect(order).toEqual([1, 3, 2]);
  });

  it("prioritizes imported entries over manual ones", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({ localStorage: local });

    vi.setSystemTime(new Date("2026-05-13T10:00:00.000Z"));
    service.saveEntry(baseJob({ seed: 1 }), [baseRow()]);
    vi.setSystemTime(new Date("2026-05-13T10:00:01.000Z"));
    service.saveEntry(baseJob({ seed: 2 }), [baseRow()]);

    service.importEntry(
      baseReport({
        executedAt: "2020-01-01T00:00:00.000Z",
        config: baseJob({ seed: 99 }),
      }),
    );

    const order = service.loadHistory().map((e) => e.config.seed);
    expect(order).toEqual([99, 2, 1]);
  });

  it("within imported entries, favorites come first then by date desc", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({ localStorage: local });

    const oldImport = service.importEntry(
      baseReport({
        executedAt: "2025-01-01T00:00:00.000Z",
        config: baseJob({ seed: 10 }),
      }),
    );
    service.importEntry(
      baseReport({
        executedAt: "2025-06-01T00:00:00.000Z",
        config: baseJob({ seed: 20 }),
      }),
    );
    service.importEntry(
      baseReport({
        executedAt: "2025-12-01T00:00:00.000Z",
        config: baseJob({ seed: 30 }),
      }),
    );

    service.toggleFavorite(oldImport.id);

    const order = service.loadHistory().map((e) => e.config.seed);
    expect(order).toEqual([10, 30, 20]);
  });

  it("orders imported (favorites, then by date) before manual (favorites, then by date)", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({ localStorage: local });

    vi.setSystemTime(new Date("2026-05-13T10:00:00.000Z"));
    const manualFav = service.saveEntry(baseJob({ seed: 1 }), [baseRow()]);
    vi.setSystemTime(new Date("2026-05-13T10:00:01.000Z"));
    service.saveEntry(baseJob({ seed: 2 }), [baseRow()]);
    service.toggleFavorite(manualFav.id);

    const importedFav = service.importEntry(
      baseReport({
        executedAt: "2025-01-01T00:00:00.000Z",
        config: baseJob({ seed: 100 }),
      }),
    );
    service.importEntry(
      baseReport({
        executedAt: "2025-06-01T00:00:00.000Z",
        config: baseJob({ seed: 200 }),
      }),
    );
    service.toggleFavorite(importedFav.id);

    const order = service.loadHistory().map((e) => e.config.seed);
    expect(order).toEqual([100, 200, 1, 2]);
  });

  it("evicts oldest non-favorite first when limit is exceeded", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({
      localStorage: local,
      historyLimit: 3,
    });

    vi.setSystemTime(new Date("2026-05-13T10:00:00.000Z"));
    const fav = service.saveEntry(baseJob({ seed: 100 }), [baseRow()]);
    service.toggleFavorite(fav.id);

    vi.setSystemTime(new Date("2026-05-13T10:00:01.000Z"));
    service.saveEntry(baseJob({ seed: 1 }), [baseRow()]);
    vi.setSystemTime(new Date("2026-05-13T10:00:02.000Z"));
    service.saveEntry(baseJob({ seed: 2 }), [baseRow()]);
    vi.setSystemTime(new Date("2026-05-13T10:00:03.000Z"));
    service.saveEntry(baseJob({ seed: 3 }), [baseRow()]);

    const seeds = service.loadHistory().map((e) => e.config.seed);
    expect(seeds).toEqual([100, 3, 2]);
  });

  it("evicts oldest favorite when all entries are favorite and limit exceeded", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({
      localStorage: local,
      historyLimit: 2,
    });

    vi.setSystemTime(new Date("2026-05-13T10:00:00.000Z"));
    const a = service.saveEntry(baseJob({ seed: 1 }), [baseRow()]);
    service.toggleFavorite(a.id);
    vi.setSystemTime(new Date("2026-05-13T10:00:01.000Z"));
    const b = service.saveEntry(baseJob({ seed: 2 }), [baseRow()]);
    service.toggleFavorite(b.id);
    vi.setSystemTime(new Date("2026-05-13T10:00:02.000Z"));
    const c = service.saveEntry(baseJob({ seed: 3 }), [baseRow()]);
    service.toggleFavorite(c.id);

    const seeds = service.loadHistory().map((e) => e.config.seed);
    expect(seeds).toEqual([3, 2]);
  });
});

describe("ComparisonHistoryService — quota-aware persistence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("evicts the oldest non-favorite when setItem throws QuotaExceededError", () => {
    const memory = createMemoryStorage();
    let failOnce = true;
    const local: StorageLike = {
      getItem: (key) => memory.getItem(key),
      removeItem: (key) => memory.removeItem(key),
      setItem(key, value) {
        if (failOnce) {
          failOnce = false;
          const error = new Error("quota") as Error & { name: string };
          error.name = "QuotaExceededError";
          throw error;
        }
        memory.setItem(key, value);
      },
    };
    const service = new ComparisonHistoryService({ localStorage: local });

    vi.setSystemTime(new Date("2026-05-13T10:00:00.000Z"));
    memory.setItem(
      COMPARISON_HISTORY_KEY,
      JSON.stringify([
        {
          id: "old-non-fav",
          executedAt: "2026-05-13T09:00:00.000Z",
          config: baseJob({ seed: 1 }),
          rows: [baseRow()],
          favorite: false,
          source: "manual",
        },
        {
          id: "old-fav",
          executedAt: "2026-05-13T08:00:00.000Z",
          config: baseJob({ seed: 2 }),
          rows: [baseRow()],
          favorite: true,
          source: "manual",
        },
      ]),
    );

    vi.setSystemTime(new Date("2026-05-13T10:00:00.000Z"));
    service.saveEntry(baseJob({ seed: 99 }), [baseRow()]);

    const seeds = service.loadHistory().map((e) => e.config.seed);
    expect(seeds).toEqual([2, 99]);
  });

  it("rethrows non-quota errors", () => {
    const local: StorageLike = {
      getItem: () => null,
      removeItem: () => {},
      setItem() {
        throw new Error("disk full");
      },
    };
    const service = new ComparisonHistoryService({ localStorage: local });
    expect(() => service.saveEntry(baseJob(), [baseRow()])).toThrow(
      "disk full",
    );
  });

  it("rethrows non-object errors (string thrown)", () => {
    const local: StorageLike = {
      getItem: () => null,
      removeItem: () => {},
      setItem() {
        throw "raw string error";
      },
    };
    const service = new ComparisonHistoryService({ localStorage: local });
    expect(() => service.saveEntry(baseJob(), [baseRow()])).toThrow();
  });

  it("rethrows when storage is null/undefined error", () => {
    const local: StorageLike = {
      getItem: () => null,
      removeItem: () => {},
      setItem() {
        throw null;
      },
    };
    const service = new ComparisonHistoryService({ localStorage: local });
    expect(() => service.saveEntry(baseJob(), [baseRow()])).toThrow();
  });

  it("recognizes NS_ERROR_DOM_QUOTA_REACHED and evicts", () => {
    const memory = createMemoryStorage();
    let failOnce = true;
    const local: StorageLike = {
      getItem: (key) => memory.getItem(key),
      removeItem: (key) => memory.removeItem(key),
      setItem(key, value) {
        if (failOnce) {
          failOnce = false;
          const error = new Error("quota") as Error & { name: string };
          error.name = "NS_ERROR_DOM_QUOTA_REACHED";
          throw error;
        }
        memory.setItem(key, value);
      },
    };
    const service = new ComparisonHistoryService({ localStorage: local });

    vi.setSystemTime(new Date("2026-05-13T10:00:00.000Z"));
    memory.setItem(
      COMPARISON_HISTORY_KEY,
      JSON.stringify([
        {
          id: "old",
          executedAt: "2026-05-13T09:00:00.000Z",
          config: baseJob({ seed: 1 }),
          rows: [baseRow()],
          favorite: false,
          source: "manual",
        },
      ]),
    );

    service.saveEntry(baseJob({ seed: 99 }), [baseRow()]);
    const seeds = service.loadHistory().map((e) => e.config.seed);
    expect(seeds).toEqual([99]);
  });

  it("recognizes quota error by code 22 and evicts", () => {
    const memory = createMemoryStorage();
    let failOnce = true;
    const local: StorageLike = {
      getItem: (key) => memory.getItem(key),
      removeItem: (key) => memory.removeItem(key),
      setItem(key, value) {
        if (failOnce) {
          failOnce = false;
          const error = Object.assign(new Error("quota"), { code: 22 });
          throw error;
        }
        memory.setItem(key, value);
      },
    };
    const service = new ComparisonHistoryService({ localStorage: local });
    service.saveEntry(baseJob({ seed: 1 }), [baseRow()]);
    service.saveEntry(baseJob({ seed: 2 }), [baseRow()]);
    expect(service.loadHistory().length).toBeGreaterThan(0);
  });

  it("recognizes quota error by code 1014 and evicts", () => {
    const memory = createMemoryStorage();
    let failOnce = true;
    const local: StorageLike = {
      getItem: (key) => memory.getItem(key),
      removeItem: (key) => memory.removeItem(key),
      setItem(key, value) {
        if (failOnce) {
          failOnce = false;
          const error = Object.assign(new Error("quota"), { code: 1014 });
          throw error;
        }
        memory.setItem(key, value);
      },
    };
    const service = new ComparisonHistoryService({ localStorage: local });
    service.saveEntry(baseJob({ seed: 1 }), [baseRow()]);
    service.saveEntry(baseJob({ seed: 2 }), [baseRow()]);
    expect(service.loadHistory().length).toBeGreaterThan(0);
  });

  it("falls back to evicting oldest favorite when only favorites remain and quota persists", () => {
    const memory = createMemoryStorage();
    let failCount = 2;
    const local: StorageLike = {
      getItem: (key) => memory.getItem(key),
      removeItem: (key) => memory.removeItem(key),
      setItem(key, value) {
        if (failCount > 0) {
          failCount -= 1;
          const error = new Error("quota") as Error & { name: string };
          error.name = "QuotaExceededError";
          throw error;
        }
        memory.setItem(key, value);
      },
    };
    const service = new ComparisonHistoryService({ localStorage: local });

    memory.setItem(
      COMPARISON_HISTORY_KEY,
      JSON.stringify([
        {
          id: "old-fav",
          executedAt: "2026-05-13T08:00:00.000Z",
          config: baseJob({ seed: 7 }),
          rows: [baseRow()],
          favorite: true,
          source: "manual",
        },
      ]),
    );

    vi.setSystemTime(new Date("2026-05-13T10:00:00.000Z"));
    service.saveEntry(baseJob({ seed: 99 }), [baseRow()]);

    // First quota: evicts new non-fav (only non-fav). Second quota: evictOne first call
    // returns entries unchanged (all favorites now) → fallback drops oldest favorite.
    expect(service.loadHistory()).toEqual([]);
  });

  it("rethrows when quota error persists and history becomes empty", () => {
    const memory = createMemoryStorage();
    const local: StorageLike = {
      getItem: (key) => memory.getItem(key),
      removeItem: (key) => memory.removeItem(key),
      setItem() {
        const error = new Error("quota") as Error & { name: string };
        error.name = "QuotaExceededError";
        throw error;
      },
    };
    const service = new ComparisonHistoryService({ localStorage: local });
    expect(() => service.saveEntry(baseJob(), [baseRow()])).toThrow("quota");
  });

  it("gives up silently when quota retries exhaust without emptying history", () => {
    const memory = createMemoryStorage();
    const local: StorageLike = {
      getItem: (key) => memory.getItem(key),
      removeItem: (key) => memory.removeItem(key),
      setItem() {
        const error = new Error("quota") as Error & { name: string };
        error.name = "QuotaExceededError";
        throw error;
      },
    };
    const seedEntries = Array.from({ length: 60 }, (_, i) => ({
      id: `legacy-${i}`,
      executedAt: new Date(2020, 0, 1, 0, 0, i).toISOString(),
      config: baseJob({ seed: i }),
      rows: [baseRow()],
      favorite: false,
      source: "manual" as const,
    }));
    memory.setItem(COMPARISON_HISTORY_KEY, JSON.stringify(seedEntries));

    const service = new ComparisonHistoryService({
      localStorage: local,
      historyLimit: 100,
    });
    vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"));
    expect(() =>
      service.saveEntry(baseJob({ seed: 999 }), [baseRow()]),
    ).not.toThrow();
  });

  it("treats unparsable executedAt as never-oldest when picking eviction target", () => {
    const memory = createMemoryStorage();
    let failOnce = true;
    const local: StorageLike = {
      getItem: (key) => memory.getItem(key),
      removeItem: (key) => memory.removeItem(key),
      setItem(key, value) {
        if (failOnce) {
          failOnce = false;
          const error = new Error("quota") as Error & { name: string };
          error.name = "QuotaExceededError";
          throw error;
        }
        memory.setItem(key, value);
      },
    };
    memory.setItem(
      COMPARISON_HISTORY_KEY,
      JSON.stringify([
        {
          id: "valid-non-fav",
          executedAt: "2026-05-13T09:00:00.000Z",
          config: baseJob({ seed: 1 }),
          rows: [baseRow()],
          favorite: false,
          source: "manual",
        },
        {
          id: "garbled-non-fav",
          executedAt: "not-a-date",
          config: baseJob({ seed: 2 }),
          rows: [baseRow()],
          favorite: false,
          source: "manual",
        },
      ]),
    );
    const service = new ComparisonHistoryService({ localStorage: local });
    vi.setSystemTime(new Date("2026-05-13T10:00:00.000Z"));
    service.saveEntry(baseJob({ seed: 99 }), [baseRow()]);

    // valid-non-fav has oldest parseable timestamp; garbled becomes +Infinity (never chosen).
    const remainingIds = service
      .loadHistory()
      .map((e) => e.id)
      .sort();
    expect(remainingIds).not.toContain("valid-non-fav");
    expect(remainingIds).toContain("garbled-non-fav");
  });

  it("handles equal executedAt timestamps when picking oldest", () => {
    const memory = createMemoryStorage();
    let failOnce = true;
    const local: StorageLike = {
      getItem: (key) => memory.getItem(key),
      removeItem: (key) => memory.removeItem(key),
      setItem(key, value) {
        if (failOnce) {
          failOnce = false;
          const error = new Error("quota") as Error & { name: string };
          error.name = "QuotaExceededError";
          throw error;
        }
        memory.setItem(key, value);
      },
    };
    memory.setItem(
      COMPARISON_HISTORY_KEY,
      JSON.stringify([
        {
          id: "twin-a",
          executedAt: "2026-05-13T09:00:00.000Z",
          config: baseJob({ seed: 1 }),
          rows: [baseRow()],
          favorite: false,
          source: "manual",
        },
        {
          id: "twin-b",
          executedAt: "2026-05-13T09:00:00.000Z",
          config: baseJob({ seed: 2 }),
          rows: [baseRow()],
          favorite: false,
          source: "manual",
        },
      ]),
    );
    const service = new ComparisonHistoryService({ localStorage: local });
    vi.setSystemTime(new Date("2026-05-13T10:00:00.000Z"));
    service.saveEntry(baseJob({ seed: 99 }), [baseRow()]);

    expect(service.loadHistory()).toHaveLength(2);
  });
});

describe("ComparisonHistoryService — legacy entry normalization", () => {
  it("backfills source='manual' and favorite=false for legacy entries", () => {
    const local = createMemoryStorage();
    local.setItem(
      COMPARISON_HISTORY_KEY,
      JSON.stringify([
        {
          id: "legacy",
          executedAt: "2025-01-01T00:00:00.000Z",
          config: baseJob(),
          rows: [baseRow()],
        },
      ]),
    );
    const service = new ComparisonHistoryService({ localStorage: local });

    const [entry] = service.loadHistory();
    expect(entry.source).toBe("manual");
    expect(entry.favorite).toBe(false);
  });
});

describe("ComparisonHistoryService.clearHistory", () => {
  it("removes the history key when no favorites exist", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({ localStorage: local });
    service.saveEntry(baseJob(), [baseRow()]);
    expect(local.getItem(COMPARISON_HISTORY_KEY)).not.toBeNull();

    service.clearHistory();
    expect(local.getItem(COMPARISON_HISTORY_KEY)).toBeNull();
  });

  it("preserves favorited entries and removes the rest", () => {
    vi.useFakeTimers();
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({ localStorage: local });

    vi.setSystemTime(new Date("2026-05-13T10:00:00.000Z"));
    const fav = service.saveEntry(baseJob({ seed: 1 }), [baseRow()]);
    vi.setSystemTime(new Date("2026-05-13T10:00:01.000Z"));
    service.saveEntry(baseJob({ seed: 2 }), [baseRow()]);
    vi.setSystemTime(new Date("2026-05-13T10:00:02.000Z"));
    service.saveEntry(baseJob({ seed: 3 }), [baseRow()]);
    service.toggleFavorite(fav.id);

    service.clearHistory();

    const remaining = service.loadHistory();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(fav.id);
    expect(remaining[0].favorite).toBe(true);
    vi.useRealTimers();
  });

  it("is a no-op when localStorage is null", () => {
    const service = new ComparisonHistoryService({ localStorage: null });
    expect(() => service.clearHistory()).not.toThrow();
  });
});

describe("ComparisonHistoryService.setPendingConfig", () => {
  it("writes the config JSON to sessionStorage", () => {
    const session = createMemoryStorage();
    const service = new ComparisonHistoryService({ sessionStorage: session });
    const config = baseJob({ seed: 7 });

    service.setPendingConfig(config);

    expect(JSON.parse(session.getItem(PENDING_CONFIG_KEY) as string)).toEqual(
      config,
    );
  });

  it("is a no-op when sessionStorage is null", () => {
    const service = new ComparisonHistoryService({ sessionStorage: null });
    expect(() => service.setPendingConfig(baseJob())).not.toThrow();
  });
});

describe("ComparisonHistoryService.consumePendingConfig", () => {
  it("returns null when sessionStorage is null", () => {
    const service = new ComparisonHistoryService({ sessionStorage: null });
    expect(service.consumePendingConfig()).toBeNull();
  });

  it("returns null and clears the key when no pending config is stored", () => {
    const session = createMemoryStorage();
    const removeSpy = vi.spyOn(session, "removeItem");
    const service = new ComparisonHistoryService({ sessionStorage: session });

    expect(service.consumePendingConfig()).toBeNull();
    expect(removeSpy).toHaveBeenCalledWith(PENDING_CONFIG_KEY);
  });

  it("returns null and clears the key when stored JSON is malformed", () => {
    const session = createMemoryStorage();
    session.setItem(PENDING_CONFIG_KEY, "not-json");
    const removeSpy = vi.spyOn(session, "removeItem");
    const service = new ComparisonHistoryService({ sessionStorage: session });

    expect(service.consumePendingConfig()).toBeNull();
    expect(removeSpy).toHaveBeenCalledWith(PENDING_CONFIG_KEY);
  });

  it("preserves numeric seed and boolean removeOutliers", () => {
    const session = createMemoryStorage();
    const service = new ComparisonHistoryService({ sessionStorage: session });
    const config = baseJob({ seed: 99, removeOutliers: false });
    session.setItem(PENDING_CONFIG_KEY, JSON.stringify(config));

    const consumed = service.consumePendingConfig();

    expect(consumed).toEqual(config);
    expect(session.getItem(PENDING_CONFIG_KEY)).toBeNull();
  });

  it("defaults seed to 42 when missing", () => {
    const session = createMemoryStorage();
    const service = new ComparisonHistoryService({ sessionStorage: session });
    const { seed: _seed, ...partial } = baseJob();
    session.setItem(PENDING_CONFIG_KEY, JSON.stringify(partial));

    const consumed = service.consumePendingConfig();
    expect(consumed?.seed).toBe(42);
  });

  it("defaults seed to 42 when not a number", () => {
    const session = createMemoryStorage();
    const service = new ComparisonHistoryService({ sessionStorage: session });
    session.setItem(
      PENDING_CONFIG_KEY,
      JSON.stringify({ ...baseJob(), seed: "abc" }),
    );

    const consumed = service.consumePendingConfig();
    expect(consumed?.seed).toBe(42);
  });

  it("defaults removeOutliers to true when missing", () => {
    const session = createMemoryStorage();
    const service = new ComparisonHistoryService({ sessionStorage: session });
    const { removeOutliers: _r, ...partial } = baseJob();
    session.setItem(PENDING_CONFIG_KEY, JSON.stringify(partial));

    const consumed = service.consumePendingConfig();
    expect(consumed?.removeOutliers).toBe(true);
  });

  it("defaults removeOutliers to true when not a boolean", () => {
    const session = createMemoryStorage();
    const service = new ComparisonHistoryService({ sessionStorage: session });
    session.setItem(
      PENDING_CONFIG_KEY,
      JSON.stringify({ ...baseJob(), removeOutliers: "yes" }),
    );

    const consumed = service.consumePendingConfig();
    expect(consumed?.removeOutliers).toBe(true);
  });
});
