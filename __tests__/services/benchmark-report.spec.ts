import { beforeAll, describe, expect, it } from "vitest";
import { benchmarkReport } from "../../src/services/benchmark-report";
import type {
  BenchmarkReport,
  BenchmarkCell,
} from "../../src/types/comparator";

// i18n must be initialized before the service module resolves translations.
// In a node/vitest environment the i18n instance is already created on import;
// we just need the module to be loaded.
beforeAll(async () => {
  await import("../../src/i18n");
});

// ─── Fixture ─────────────────────────────────────────────────────────────────

const makeCell = (
  overrides: Partial<BenchmarkCell> = {},
): BenchmarkCell => ({
  algorithm: "bubble",
  scenario: "crescente",
  size: 100,
  averageTimeMs: 1.5,
  averageComparisons: 99,
  averageSwaps: 0,
  averageMemoryKb: 2.5,
  timeoutCount: 0,
  samples: [
    {
      durationMs: 1.2,
      comparisons: 99,
      swaps: 0,
      peakAuxBytes: 2560,
      timedOut: false,
    },
    {
      durationMs: 1.8,
      comparisons: 99,
      swaps: 0,
      peakAuxBytes: 2560,
      timedOut: false,
    },
  ],
  removedOutlierDurations: [],
  ...overrides,
});

const makeReport = (overrides: Partial<BenchmarkReport> = {}): BenchmarkReport => ({
  executedAt: "2026-05-14T12:00:00.000Z",
  config: {
    algorithms: ["bubble", "merge"],
    scenarios: ["crescente", "aleatorio"],
    sizes: [100, 1000],
    replications: 2,
    timeoutMs: 60000,
    seed: 42,
    removeOutliers: false,
  },
  cells: [
    makeCell({ algorithm: "bubble", scenario: "crescente", size: 100 }),
    makeCell({
      algorithm: "merge",
      scenario: "aleatorio",
      size: 1000,
      averageTimeMs: 3.14,
      averageComparisons: 9870,
      averageSwaps: 4320,
      averageMemoryKb: 12.8,
      timeoutCount: 0,
      removedOutlierDurations: [42.1, 55.0],
      samples: [
        {
          durationMs: 3.1,
          comparisons: 9870,
          swaps: 4320,
          peakAuxBytes: 13107,
          timedOut: false,
        },
      ],
    }),
  ],
  rows: [],
  environment: {
    os: "Windows 11",
    browser: "Chrome",
    browserVersion: "124.0",
    engine: "Blink",
    cpuThreads: 8,
    memoryGB: 16,
    mobile: false,
    gpu: "Intel UHD",
    baselineScore: 1234.5,
  },
  elapsedMs: 5000,
  ...overrides,
});

// ─── generateCsvReport ───────────────────────────────────────────────────────

describe("generateCsvReport", () => {
  it("emits all required section markers", () => {
    const csv = benchmarkReport.generateCsvReport(makeReport());
    expect(csv).toContain("# section:header");
    expect(csv).toContain("# section:config");
    expect(csv).toContain("# section:aggregated");
    expect(csv).toContain("# section:rawSamples");
  });

  it("emits environment section when report has environment", () => {
    const csv = benchmarkReport.generateCsvReport(makeReport());
    expect(csv).toContain("# section:environment");
  });

  it("omits environment section when report has no environment", () => {
    const csv = benchmarkReport.generateCsvReport(makeReport({ environment: undefined }));
    expect(csv).not.toContain("# section:environment");
  });

  it("emits outliers section only when cells have removed outliers", () => {
    const withOutliers = benchmarkReport.generateCsvReport(makeReport());
    expect(withOutliers).toContain("# section:outliers");

    const noOutliers = benchmarkReport.generateCsvReport(
      makeReport({
        cells: [makeCell({ removedOutlierDurations: [] })],
      }),
    );
    expect(noOutliers).not.toContain("# section:outliers");
  });

  it("uses English enum keys for algorithm and scenario values", () => {
    const csv = benchmarkReport.generateCsvReport(makeReport());
    // aggregated rows must contain raw enum values, not translated labels
    const lines = csv.split("\n");
    const aggStart = lines.findIndex((l) => l === "# section:aggregated");
    const aggDataLine = lines[aggStart + 2]; // header at +1, first data row at +2
    expect(aggDataLine).toMatch(/^bubble,/);
  });

  it("quotes cell values containing commas", () => {
    const report = makeReport({
      environment: {
        os: "Windows, 11",
        browser: "Chrome",
        browserVersion: "124.0",
        engine: "Blink",
        mobile: false,
        baselineScore: 100,
      },
    });
    const csv = benchmarkReport.generateCsvReport(report);
    expect(csv).toContain('"Windows, 11"');
  });

  it("stores algorithms as semicolon-separated list in config section", () => {
    const csv = benchmarkReport.generateCsvReport(makeReport());
    expect(csv).toContain("algorithms,bubble;merge");
    expect(csv).toContain("scenarios,crescente;aleatorio");
    expect(csv).toContain("sizes,100;1000");
  });

  it("stores elapsedMs when present", () => {
    const csv = benchmarkReport.generateCsvReport(makeReport({ elapsedMs: 5000 }));
    expect(csv).toContain("elapsedMs,5000");
  });

  it("omits elapsedMs when undefined", () => {
    const csv = benchmarkReport.generateCsvReport(makeReport({ elapsedMs: undefined }));
    expect(csv).not.toContain("elapsedMs");
  });
});

// ─── parseCsvReport ──────────────────────────────────────────────────────────

describe("parseCsvReport", () => {
  const roundTrip = (r: BenchmarkReport) =>
    benchmarkReport.parseCsvReport(benchmarkReport.generateCsvReport(r));

  it("reconstructs config", () => {
    const report = makeReport();
    const parsed = roundTrip(report);
    expect(parsed.config.algorithms).toEqual(["bubble", "merge"]);
    expect(parsed.config.scenarios).toEqual(["crescente", "aleatorio"]);
    expect(parsed.config.sizes).toEqual([100, 1000]);
    expect(parsed.config.replications).toBe(2);
    expect(parsed.config.timeoutMs).toBe(60000);
    expect(parsed.config.seed).toBe(42);
    expect(parsed.config.removeOutliers).toBe(false);
  });

  it("reconstructs executedAt", () => {
    const parsed = roundTrip(makeReport());
    expect(parsed.executedAt).toBe("2026-05-14T12:00:00.000Z");
  });

  it("reconstructs environment", () => {
    const parsed = roundTrip(makeReport());
    expect(parsed.environment).toBeDefined();
    expect(parsed.environment!.os).toBe("Windows 11");
    expect(parsed.environment!.browser).toBe("Chrome");
    expect(parsed.environment!.cpuThreads).toBe(8);
    expect(parsed.environment!.memoryGB).toBe(16);
    expect(parsed.environment!.mobile).toBe(false);
    expect(parsed.environment!.gpu).toBe("Intel UHD");
    expect(parsed.environment!.baselineScore).toBe(1234.5);
  });

  it("reconstructs cells with samples grouped by (algorithm, scenario, size)", () => {
    const parsed = roundTrip(makeReport());
    const bubbleCell = parsed.cells.find(
      (c) => c.algorithm === "bubble" && c.scenario === "crescente" && c.size === 100,
    );
    expect(bubbleCell).toBeDefined();
    expect(bubbleCell!.samples).toHaveLength(2);
    expect(bubbleCell!.samples[0].durationMs).toBeCloseTo(1.2);
    expect(bubbleCell!.samples[0].comparisons).toBe(99);
    expect(bubbleCell!.samples[0].timedOut).toBe(false);
  });

  it("attaches removedOutlierDurations to correct cell", () => {
    const parsed = roundTrip(makeReport());
    const mergeCell = parsed.cells.find(
      (c) => c.algorithm === "merge" && c.scenario === "aleatorio",
    );
    expect(mergeCell).toBeDefined();
    expect(mergeCell!.removedOutlierDurations).toHaveLength(2);
    expect(mergeCell!.removedOutlierDurations[0]).toBeCloseTo(42.1);
    expect(mergeCell!.removedOutlierDurations[1]).toBeCloseTo(55.0);
  });

  it("reconstructs rows from cells", () => {
    const parsed = roundTrip(makeReport());
    expect(parsed.rows).toHaveLength(2);
    const bubbleRow = parsed.rows.find((r) => r.algorithm === "bubble");
    expect(bubbleRow).toBeDefined();
    expect(bubbleRow!.id).toBe("bubble-crescente-100");
  });

  it("handles missing environment gracefully (no environment section)", () => {
    const parsed = roundTrip(makeReport({ environment: undefined }));
    expect(parsed.environment).toBeUndefined();
  });

  it("handles missing elapsedMs", () => {
    const parsed = roundTrip(makeReport({ elapsedMs: undefined }));
    expect(parsed.elapsedMs).toBeUndefined();
  });

  it("throws on missing required section 'header'", () => {
    const csv = "# section:config\nkey,value\nalgorithms,bubble\nscenarios,crescente\nsizes,100\n\n# section:aggregated\nalgorithm,scenario,size,averageTimeMs,averageComparisons,averageSwaps,averageMemoryKb,timeoutCount,outliersRemoved\nbubble,crescente,100,1,99,0,2.5,0,0";
    expect(() => benchmarkReport.parseCsvReport(csv)).toThrow(
      'parseCsvReport: missing required section "header"',
    );
  });

  it("throws on missing required section 'config'", () => {
    const csv = "# section:header\nkey,value\nexecutedAt,2026-05-14T00:00:00.000Z\nseed,42\nreplications,1\nremoveOutliers,false\ntimeoutMs,60000\n\n# section:aggregated\nalgorithm,scenario,size,averageTimeMs,averageComparisons,averageSwaps,averageMemoryKb,timeoutCount,outliersRemoved\nbubble,crescente,100,1,99,0,2.5,0,0";
    expect(() => benchmarkReport.parseCsvReport(csv)).toThrow(
      'parseCsvReport: missing required section "config"',
    );
  });

  it("throws on invalid algorithm enum value", () => {
    const report = makeReport();
    const csv = benchmarkReport.generateCsvReport(report).replace("bubble", "bogosort");
    expect(() => benchmarkReport.parseCsvReport(csv)).toThrow(
      'parseCsvReport: unknown algorithm "bogosort"',
    );
  });

  it("throws on invalid scenario enum value", () => {
    const report = makeReport();
    const csv = benchmarkReport.generateCsvReport(report).replace("crescente", "zigzag");
    expect(() => benchmarkReport.parseCsvReport(csv)).toThrow(
      'parseCsvReport: unknown scenario "zigzag"',
    );
  });

  it("throws on invalid number", () => {
    const report = makeReport();
    const csv = benchmarkReport.generateCsvReport(report).replace("seed,42", "seed,NaN");
    expect(() => benchmarkReport.parseCsvReport(csv)).toThrow("seed");
  });
});

// ─── Round-trip ───────────────────────────────────────────────────────────────

describe("round-trip", () => {
  it("parse(generate(r)) preserves all critical fields", () => {
    const original = makeReport();
    const parsed = benchmarkReport.parseCsvReport(benchmarkReport.generateCsvReport(original));

    expect(parsed.executedAt).toBe(original.executedAt);
    expect(parsed.config).toEqual(original.config);
    expect(parsed.elapsedMs).toBe(original.elapsedMs);

    expect(parsed.cells).toHaveLength(original.cells.length);

    for (const origCell of original.cells) {
      const parsedCell = parsed.cells.find(
        (c) =>
          c.algorithm === origCell.algorithm &&
          c.scenario === origCell.scenario &&
          c.size === origCell.size,
      );
      expect(parsedCell).toBeDefined();
      expect(parsedCell!.averageTimeMs).toBeCloseTo(origCell.averageTimeMs);
      expect(parsedCell!.averageComparisons).toBe(origCell.averageComparisons);
      expect(parsedCell!.averageSwaps).toBe(origCell.averageSwaps);
      expect(parsedCell!.averageMemoryKb).toBeCloseTo(origCell.averageMemoryKb);
      expect(parsedCell!.timeoutCount).toBe(origCell.timeoutCount);
      expect(parsedCell!.samples).toHaveLength(origCell.samples.length);
      expect(parsedCell!.removedOutlierDurations).toHaveLength(
        origCell.removedOutlierDurations.length,
      );
    }
  });

  it("is locale-independent: CSV data unchanged across locales", async () => {
    const { setAppLocale } = await import("../../src/i18n");

    setAppLocale("en-US");
    const csvEn = benchmarkReport.generateCsvReport(makeReport());

    setAppLocale("pt-BR");
    const csvPt = benchmarkReport.generateCsvReport(makeReport());

    // CSV must be identical regardless of locale (all keys are English)
    expect(csvEn).toBe(csvPt);

    // Both should parse correctly
    const parsedEn = benchmarkReport.parseCsvReport(csvEn);
    const parsedPt = benchmarkReport.parseCsvReport(csvPt);
    expect(parsedEn.config.algorithms).toEqual(parsedPt.config.algorithms);
  });
});
