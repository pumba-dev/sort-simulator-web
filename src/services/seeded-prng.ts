import type { ScenarioType } from "../types/comparator";

/**
 * Mulberry32-based seeded PRNG — deterministic, with no external dependencies.
 * Also exposes static helpers to derive cell-specific seeds and to build the
 * input arrays used by each benchmark scenario.
 */
export class SeededPrng {
  private static readonly SCENARIO_INDEX: Record<ScenarioType, number> = {
    crescente: 1,
    decrescente: 2,
    aleatorio: 3,
  };

  private static readonly SIZE_MIX = 2654435761;

  private state: number;

  constructor(seed: number) {
    this.state = (seed >>> 0) || 1;
  }

  /** Returns the next pseudo-random float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns a random integer in [0, maxExclusive). */
  intBelow(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  /**
   * Derives a deterministic seed for a benchmark cell from the job seed and
   * cell coordinates (scenario, size, rep). All algorithms within the same
   * (scenario, size, rep) share this seed so they sort the same input array,
   * ensuring a fair comparison. Each replication uses a distinct seed so
   * algorithms are not biased by a single array permutation.
   */
  static deriveCellSeed(
    baseSeed: number,
    scenario: ScenarioType,
    size: number,
    rep: number,
  ): number {
    const mixed =
      (baseSeed >>> 0) ^
      Math.imul(size >>> 0, SeededPrng.SIZE_MIX) ^
      ((rep & 0xff) << 16) ^
      (SeededPrng.SCENARIO_INDEX[scenario] << 8);
    return mixed >>> 0;
  }

  /**
   * Generates the input array for a benchmark cell given a scenario type and seed.
   * "crescente" → [1..n], "decrescente" → [n..1], "aleatorio" → Fisher-Yates shuffle seeded by `seed`.
   *
   * Returns an `Int32Array` so its backing buffer can be transferred (zero-copy)
   * across worker boundaries, cutting transient heap usage on heavy benchmark jobs.
   */
  static generateScenarioArray(
    size: number,
    scenario: ScenarioType,
    seed: number,
  ): Int32Array {
    if (size <= 0) {
      return new Int32Array(0);
    }

    const arr = new Int32Array(size);

    if (scenario === "crescente") {
      for (let i = 0; i < size; i += 1) arr[i] = i + 1;
      return arr;
    }

    if (scenario === "decrescente") {
      for (let i = 0; i < size; i += 1) arr[i] = size - i;
      return arr;
    }

    for (let i = 0; i < size; i += 1) arr[i] = i + 1;
    const prng = new SeededPrng(seed);
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = prng.intBelow(i + 1);
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }
}
