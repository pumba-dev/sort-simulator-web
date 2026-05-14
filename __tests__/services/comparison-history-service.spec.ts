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

const createMemoryStorage = (): StorageLike & { dump(): Map<string, string> } => {
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

const baseRow = (overrides: Partial<ComparisonResultRow> = {}): ComparisonResultRow => ({
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

const baseReport = (overrides: Partial<BenchmarkReport> = {}): BenchmarkReport => ({
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

    const persisted = JSON.parse(local.getItem(COMPARISON_HISTORY_KEY) as string);
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

  it("uses default historyLimit of 10 when not provided", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({ localStorage: local });

    for (let i = 0; i < 12; i += 1) {
      vi.setSystemTime(new Date(2026, 0, 1, 0, 0, i));
      service.saveEntry(baseJob({ seed: i }), [baseRow()]);
    }

    expect(service.loadHistory()).toHaveLength(10);
  });
});

describe("ComparisonHistoryService.clearHistory", () => {
  it("removes the history key from localStorage", () => {
    const local = createMemoryStorage();
    const service = new ComparisonHistoryService({ localStorage: local });
    service.saveEntry(baseJob(), [baseRow()]);
    expect(local.getItem(COMPARISON_HISTORY_KEY)).not.toBeNull();

    service.clearHistory();
    expect(local.getItem(COMPARISON_HISTORY_KEY)).toBeNull();
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
