import { describe, it, expect } from "vitest";
import {
  SeededPrng,
  deriveCellSeed,
  generateScenarioArray,
} from "../seeded-prng";

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
});

describe("deriveCellSeed", () => {
  it("is deterministic", () => {
    expect(deriveCellSeed(42, "bubble", "aleatorio", 100)).toBe(
      deriveCellSeed(42, "bubble", "aleatorio", 100),
    );
  });

  it("differs for distinct sizes", () => {
    const seedA = deriveCellSeed(42, "bubble", "aleatorio", 100);
    const seedB = deriveCellSeed(42, "bubble", "aleatorio", 200);
    expect(seedA).not.toBe(seedB);
  });
});

describe("generateScenarioArray", () => {
  it("generates ascending arrays", () => {
    expect(generateScenarioArray(5, "crescente", 1)).toEqual([1, 2, 3, 4, 5]);
  });

  it("generates descending arrays", () => {
    expect(generateScenarioArray(5, "decrescente", 1)).toEqual([5, 4, 3, 2, 1]);
  });

  it("generates reproducible aleatorio arrays for same seed", () => {
    const a = generateScenarioArray(20, "aleatorio", 42);
    const b = generateScenarioArray(20, "aleatorio", 42);
    expect(a).toEqual(b);
  });

  it("aleatorio array contains every value 1..n", () => {
    const arr = generateScenarioArray(50, "aleatorio", 99);
    const sorted = [...arr].sort((x, y) => x - y);
    expect(sorted).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });

  it("returns empty array for size <= 0", () => {
    expect(generateScenarioArray(0, "aleatorio", 1)).toEqual([]);
  });
});
