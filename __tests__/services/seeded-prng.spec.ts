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
});
