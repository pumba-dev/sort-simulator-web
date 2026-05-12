import type { AlgorithmKey, ScenarioType } from "../types/comparator";

// Mulberry32-based seeded PRNG — deterministic, no external dependency.
export class SeededPrng {
  private state: number;

  constructor(seed: number) {
    this.state = (seed >>> 0) || 1;
  }

  // Returns the next pseudo-random float in [0, 1).
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Returns a random integer in [0, maxExclusive).
  intBelow(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }
}

const algorithmIndex: Record<AlgorithmKey, number> = {
  insertion: 1,
  bubble: 2,
  merge: 3,
  heap: 4,
  quick: 5,
};

const scenarioIndex: Record<ScenarioType, number> = {
  crescente: 1,
  decrescente: 2,
  aleatorio: 3,
};

const SIZE_MIX = 2654435761;

// Derives a deterministic seed for a benchmark cell from the job seed and cell coordinates
// (algorithm, scenario, size). All replications within the same cell share this seed so they
// run on the same input array, isolating CPU noise as the only variation across replications.
export const deriveCellSeed = (
  baseSeed: number,
  algorithm: AlgorithmKey,
  scenario: ScenarioType,
  size: number,
): number => {
  const mixed =
    (baseSeed >>> 0) ^
    Math.imul(size >>> 0, SIZE_MIX) ^
    (algorithmIndex[algorithm] << 16) ^
    (scenarioIndex[scenario] << 8);
  return mixed >>> 0;
};

// Generates the input array for a benchmark cell given a scenario type and seed.
// "crescente" → [1..n], "decrescente" → [n..1], "aleatorio" → Fisher-Yates shuffle seeded by `seed`.
export const generateScenarioArray = (
  size: number,
  scenario: ScenarioType,
  seed: number,
): number[] => {
  if (size <= 0) {
    return [];
  }

  if (scenario === "crescente") {
    return Array.from({ length: size }, (_, index) => index + 1);
  }

  if (scenario === "decrescente") {
    return Array.from({ length: size }, (_, index) => size - index);
  }

  const prng = new SeededPrng(seed);
  const arr = Array.from({ length: size }, (_, index) => index + 1);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = prng.intBelow(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
