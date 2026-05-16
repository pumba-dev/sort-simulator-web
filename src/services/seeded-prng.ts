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
    quaseOrdenado: 4,
    quaseDecrescente: 5,
    gaussiano: 6,
    organPipe: 7,
    comOutliers: 8,
  };

  private static readonly SIZE_MIX = 2654435761;

  /** Fraction of pairs swapped for quase-ordenado / quase-decrescente. */
  private static readonly NEARLY_SORTED_SWAP_RATIO = 0.05;

  /** Fraction of positions disturbed for comOutliers. */
  private static readonly OUTLIER_SWAP_RATIO = 0.01;

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
   *
   * Returns an `Int32Array` so its backing buffer can be transferred (zero-copy)
   * across worker boundaries, cutting transient heap usage on heavy benchmark jobs.
   *
   * `allowDuplicates` only affects the `aleatorio` scenario: when true, values
   * are sampled with replacement from [1..n] instead of permuting [1..n].
   * Other scenarios either preserve distinct base values (perturbations of
   * 1..n) or already produce duplicates intrinsically (`gaussiano`).
   */
  static generateScenarioArray(
    size: number,
    scenario: ScenarioType,
    seed: number,
    allowDuplicates = false,
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

    if (scenario === "aleatorio") {
      const prng = new SeededPrng(seed);
      if (allowDuplicates) {
        for (let i = 0; i < size; i += 1) arr[i] = prng.intBelow(size) + 1;
        return arr;
      }
      for (let i = 0; i < size; i += 1) arr[i] = i + 1;
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = prng.intBelow(i + 1);
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
      return arr;
    }

    if (scenario === "quaseOrdenado" || scenario === "quaseDecrescente") {
      if (scenario === "quaseOrdenado") {
        for (let i = 0; i < size; i += 1) arr[i] = i + 1;
      } else {
        for (let i = 0; i < size; i += 1) arr[i] = size - i;
      }
      const prng = new SeededPrng(seed);
      const swaps = Math.floor(size * SeededPrng.NEARLY_SORTED_SWAP_RATIO);
      for (let s = 0; s < swaps; s += 1) {
        const i = prng.intBelow(size);
        const j = prng.intBelow(size);
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
      return arr;
    }

    if (scenario === "organPipe") {
      const half = Math.floor(size / 2);
      for (let i = 0; i < half; i += 1) arr[i] = i + 1;
      for (let i = half; i < size; i += 1) arr[i] = size - i;
      return arr;
    }

    if (scenario === "comOutliers") {
      for (let i = 0; i < size; i += 1) arr[i] = i + 1;
      const prng = new SeededPrng(seed);
      const swaps = Math.max(1, Math.floor(size * SeededPrng.OUTLIER_SWAP_RATIO));
      for (let s = 0; s < swaps; s += 1) {
        const i = prng.intBelow(size);
        const j = prng.intBelow(size);
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
      return arr;
    }

    // gaussiano: Box-Muller centered at n/2, stddev n/6 so ~99.7% lands in [1, n].
    const prng = new SeededPrng(seed);
    const mean = size / 2;
    const stddev = size / 6;
    let pending: number | null = null;
    for (let i = 0; i < size; i += 1) {
      let z: number;
      if (pending !== null) {
        z = pending;
        pending = null;
      } else {
        const u1 = Math.max(prng.next(), 1e-12);
        const u2 = prng.next();
        const mag = Math.sqrt(-2 * Math.log(u1));
        z = mag * Math.cos(2 * Math.PI * u2);
        pending = mag * Math.sin(2 * Math.PI * u2);
      }
      let value = Math.floor(mean + z * stddev);
      if (value < 1) value = 1;
      else if (value > size) value = size;
      arr[i] = value;
    }
    return arr;
  }
}
