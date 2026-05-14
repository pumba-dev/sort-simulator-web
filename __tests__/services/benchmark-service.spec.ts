import { describe, it, expect, vi } from "vitest";
import { BenchmarkService } from "../../src/services/benchmark-service";
import type { CompareJob } from "../../src/types/comparator";

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

describe("BenchmarkService.removeOutliersIqr", () => {
  it("returns all values when below threshold count", () => {
    const result = BenchmarkService.removeOutliersIqr([1, 2, 3]);
    expect(result.kept).toEqual([1, 2, 3]);
    expect(result.removed).toEqual([]);
  });

  it("removes obvious outliers", () => {
    const values = [10, 11, 12, 13, 14, 100];
    const { kept, removed } = BenchmarkService.removeOutliersIqr(values);
    expect(removed).toContain(100);
    expect(kept.length).toBeLessThan(values.length);
  });

  it("returns sorted fallback when IQR fences exclude all values", () => {
    const r = BenchmarkService.removeOutliersIqr([NaN, NaN, NaN, NaN]);
    expect(r.kept).toHaveLength(4);
    expect(r.removed).toEqual([]);
  });
});

describe("BenchmarkService.percentile", () => {
  it("returns 0 for empty array", () => {
    expect(BenchmarkService.percentile([], 0.5)).toBe(0);
  });

  it("returns exact value when position is integer (baseIndex===upperIndex)", () => {
    expect(BenchmarkService.percentile([10, 20, 30], 0.5)).toBe(20);
  });

  it("interpolates linearly when position is fractional", () => {
    expect(BenchmarkService.percentile([10, 20, 30, 40, 50], 0.3)).toBe(22);
  });
});

describe("BenchmarkService.average", () => {
  it("returns 0 for empty input", () => {
    expect(BenchmarkService.average([])).toBe(0);
  });
  it("computes mean", () => {
    expect(BenchmarkService.average([2, 4, 6])).toBe(4);
  });
});

describe("BenchmarkService.runJob", () => {
  it("produces one row per cartesian cell", async () => {
    const service = new BenchmarkService();
    const job = baseJob({
      algorithms: ["bubble", "insertion"],
      scenarios: ["aleatorio", "crescente"],
      sizes: [30, 60],
    });
    const report = await service.runJob(job);
    expect(report.rows.length).toBe(2 * 2 * 2);
    expect(report.cells.length).toBe(2 * 2 * 2);
  });

  it("emits progress updates", async () => {
    const service = new BenchmarkService();
    const events: Array<{ completed: number; total: number }> = [];
    await service.runJob(baseJob({ sizes: [10, 20] }), {
      onProgress: (completed, total) => events.push({ completed, total }),
    });
    expect(events.length).toBe(2);
    expect(events[events.length - 1].completed).toBe(2);
  });

  it("is reproducible with same seed", async () => {
    const service = new BenchmarkService();
    const first = await service.runJob(baseJob({ sizes: [40] }));
    const second = await service.runJob(baseJob({ sizes: [40] }));
    expect(first.cells[0].averageComparisons).toBe(
      second.cells[0].averageComparisons,
    );
    expect(first.cells[0].averageSwaps).toBe(second.cells[0].averageSwaps);
  });

  it("differs across seeds (swap counts vary with permutation)", async () => {
    const service = new BenchmarkService();
    const reportA = await service.runJob(baseJob({ sizes: [40], seed: 1 }));
    const reportB = await service.runJob(baseJob({ sizes: [40], seed: 2 }));
    expect(reportA.cells[0].averageSwaps).not.toBe(
      reportB.cells[0].averageSwaps,
    );
  });

  it("aborts when signal triggers", async () => {
    const service = new BenchmarkService();
    const controller = new AbortController();
    controller.abort();
    const report = await service.runJob(baseJob(), {
      signal: controller.signal,
    });
    expect(report.cells.length).toBe(0);
  });

  it("respects removeOutliers flag", async () => {
    const service = new BenchmarkService();
    const reportOn = await service.runJob(
      baseJob({ replications: 6, removeOutliers: true }),
    );
    const reportOff = await service.runJob(
      baseJob({ replications: 6, removeOutliers: false }),
    );
    expect(reportOn.cells[0].removedOutlierDurations).toBeDefined();
    expect(reportOff.cells[0].removedOutlierDurations.length).toBe(0);
  });

  it("triggers wireParent pre-aborted path, line 108 break, and runResult.aborted branch", async () => {
    let reads = 0;
    const trickySignal = {
      get aborted() {
        reads += 1;
        return reads > 2;
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as AbortSignal;

    const stubRegistry: any = {
      bubble: {
        key: "bubble",
        run: (input: number[], opts: any) => ({
          finalArray: [...input],
          steps: [],
          comparisons: 0,
          swaps: 0,
          peakAuxBytes: 8 * input.length,
          aborted: opts?.signal?.aborted === true,
        }),
      },
    };

    const service = new BenchmarkService(stubRegistry);
    const report = await service.runJob(
      baseJob({
        algorithms: ["bubble"],
        scenarios: ["aleatorio"],
        sizes: [50],
        replications: 2,
        removeOutliers: false,
      }),
      { signal: trickySignal },
    );

    expect(report.cells).toHaveLength(1);
    expect(report.cells[0].timeoutCount).toBe(1);
    expect(report.cells[0].samples).toHaveLength(1);
    expect(report.cells[0].samples[0].timedOut).toBe(true);
  });

  it("attaches and removes listener when parent signal is not aborted", async () => {
    const controller = new AbortController();
    const service = new BenchmarkService();
    const report = await service.runJob(
      baseJob({ sizes: [10], replications: 1 }),
      { signal: controller.signal },
    );
    expect(report.cells).toHaveLength(1);
  });

  it("fires wireParent handler when parent aborts during sort execution", async () => {
    const parentController = new AbortController();
    const stubRegistry: any = {
      bubble: {
        key: "bubble",
        run: (input: number[]) => {
          parentController.abort();
          return {
            finalArray: [...input],
            steps: [],
            comparisons: 0,
            swaps: 0,
            peakAuxBytes: 8 * input.length,
            aborted: false,
          };
        },
      },
    };
    const service = new BenchmarkService(stubRegistry);
    const report = await service.runJob(
      baseJob({
        algorithms: ["bubble"],
        scenarios: ["aleatorio"],
        sizes: [10],
        replications: 1,
      }),
      { signal: parentController.signal },
    );
    expect(report.cells).toHaveLength(1);
  });

  it("marks samples as timedOut when deadlineMs elapses", async () => {
    const service = new BenchmarkService();
    const report = await service.runJob({
      algorithms: ["bubble"],
      scenarios: ["decrescente"],
      sizes: [2000],
      replications: 1,
      timeoutMs: 1,
      seed: 42,
      removeOutliers: false,
    });
    expect(report.cells[0].timeoutCount).toBe(1);
    expect(report.cells[0].samples[0].timedOut).toBe(true);
  });

  it("falls back to Date.now when global performance is undefined", async () => {
    vi.stubGlobal("performance", undefined);
    try {
      const service = new BenchmarkService();
      const report = await service.runJob(
        baseJob({ sizes: [10], replications: 1 }),
      );
      expect(report.cells[0].averageTimeMs).toBeGreaterThanOrEqual(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
