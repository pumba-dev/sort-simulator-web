import { describe, it, expect } from "vitest";
import { SeededPrng } from "../../src/services/seeded-prng";

const deriveCellSeed = SeededPrng.deriveCellSeed;
const generateScenarioArray = SeededPrng.generateScenarioArray;

describe("SeededPrng", () => {
  it("returns identical sequence for identical seed", () => {
    const a = new SeededPrng(42);
    const b = new SeededPrng(42);
    for (let i = 0; i < 50; i += 1) {
      expect(a.next()).toBe(b.next());
    }
  });

  it("returns different sequences for different seeds", () => {
    const a = new SeededPrng(42);
    const b = new SeededPrng(43);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it("next produces values in [0, 1)", () => {
    const prng = new SeededPrng(1);
    for (let i = 0; i < 100; i += 1) {
      const value = prng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("intBelow respects upper bound", () => {
    const prng = new SeededPrng(7);
    for (let i = 0; i < 100; i += 1) {
      const value = prng.intBelow(10);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(10);
    }
  });

  it("falls back to state=1 when seed is 0", () => {
    const a = new SeededPrng(0);
    const b = new SeededPrng(1);
    expect(a.next()).toBe(b.next());
  });
});

describe("deriveCellSeed", () => {
  it("is deterministic", () => {
    expect(deriveCellSeed(42, "aleatorio", 100, 0)).toBe(
      deriveCellSeed(42, "aleatorio", 100, 0),
    );
  });

  it("differs for distinct sizes", () => {
    const seedA = deriveCellSeed(42, "aleatorio", 100, 0);
    const seedB = deriveCellSeed(42, "aleatorio", 200, 0);
    expect(seedA).not.toBe(seedB);
  });

  it("differs for distinct replications", () => {
    const seedA = deriveCellSeed(42, "aleatorio", 100, 0);
    const seedB = deriveCellSeed(42, "aleatorio", 100, 1);
    expect(seedA).not.toBe(seedB);
  });

  it("is identical for same (scenario, size, rep) — algorithm does not affect seed", () => {
    const s1 = deriveCellSeed(42, "aleatorio", 100, 0);
    const s2 = deriveCellSeed(42, "aleatorio", 100, 0);
    expect(s1).toBe(s2);
  });
});

describe("generateScenarioArray", () => {
  it("returns Int32Array so the buffer can be transferred to a worker", () => {
    expect(generateScenarioArray(10, "crescente", 1)).toBeInstanceOf(
      Int32Array,
    );
  });

  it("generates ascending arrays", () => {
    expect(Array.from(generateScenarioArray(5, "crescente", 1))).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("generates descending arrays", () => {
    expect(Array.from(generateScenarioArray(5, "decrescente", 1))).toEqual([
      5, 4, 3, 2, 1,
    ]);
  });

  it("generates reproducible aleatorio arrays for same seed", () => {
    const a = generateScenarioArray(20, "aleatorio", 42);
    const b = generateScenarioArray(20, "aleatorio", 42);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("aleatorio array contains every value 1..n", () => {
    const arr = generateScenarioArray(50, "aleatorio", 99);
    const sorted = Array.from(arr).sort((x, y) => x - y);
    expect(sorted).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });

  it("returns empty array for size <= 0", () => {
    expect(generateScenarioArray(0, "aleatorio", 1).length).toBe(0);
  });

  it("aleatorio with allowDuplicates produces values in [1, n] with repetitions", () => {
    const n = 100;
    const arr = generateScenarioArray(n, "aleatorio", 7, true);
    expect(arr.length).toBe(n);
    for (const v of arr) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(n);
    }
    expect(new Set(arr).size).toBeLessThan(n);
  });

  it("aleatorio with allowDuplicates is reproducible for same seed", () => {
    const a = generateScenarioArray(80, "aleatorio", 33, true);
    const b = generateScenarioArray(80, "aleatorio", 33, true);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("quaseOrdenado has at least 80% of adjacent pairs already in order", () => {
    const n = 200;
    const arr = generateScenarioArray(n, "quaseOrdenado", 11);
    let ordered = 0;
    for (let i = 1; i < n; i += 1) if (arr[i] >= arr[i - 1]) ordered += 1;
    expect(ordered / (n - 1)).toBeGreaterThanOrEqual(0.8);
    const sorted = Array.from(arr).sort((x, y) => x - y);
    expect(sorted).toEqual(Array.from({ length: n }, (_, i) => i + 1));
  });

  it("quaseDecrescente has at least 80% of adjacent pairs descending", () => {
    const n = 200;
    const arr = generateScenarioArray(n, "quaseDecrescente", 11);
    let descending = 0;
    for (let i = 1; i < n; i += 1) if (arr[i] <= arr[i - 1]) descending += 1;
    expect(descending / (n - 1)).toBeGreaterThanOrEqual(0.8);
  });

  it("organPipe ascends to midpoint then descends", () => {
    const n = 20;
    const arr = generateScenarioArray(n, "organPipe", 1);
    const half = Math.floor(n / 2);
    for (let i = 1; i < half; i += 1) expect(arr[i]).toBeGreaterThan(arr[i - 1]);
    for (let i = half + 1; i < n; i += 1) expect(arr[i]).toBeLessThan(arr[i - 1]);
  });

  it("gaussiano produces values within [1, n] and mean near n/2", () => {
    const n = 1000;
    const arr = generateScenarioArray(n, "gaussiano", 5);
    let sum = 0;
    for (const v of arr) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(n);
      sum += v;
    }
    const mean = sum / n;
    expect(mean).toBeGreaterThan(n / 2 - n / 10);
    expect(mean).toBeLessThan(n / 2 + n / 10);
  });

  it("comOutliers preserves the 1..n value set (only permutes)", () => {
    const n = 100;
    const arr = generateScenarioArray(n, "comOutliers", 13);
    const sorted = Array.from(arr).sort((x, y) => x - y);
    expect(sorted).toEqual(Array.from({ length: n }, (_, i) => i + 1));
  });

  it("new scenarios are deterministic for same seed", () => {
    const scenarios = [
      "quaseOrdenado",
      "quaseDecrescente",
      "gaussiano",
      "organPipe",
      "comOutliers",
    ] as const;
    for (const sc of scenarios) {
      const a = generateScenarioArray(64, sc, 21);
      const b = generateScenarioArray(64, sc, 21);
      expect(Array.from(a)).toEqual(Array.from(b));
    }
  });
});
