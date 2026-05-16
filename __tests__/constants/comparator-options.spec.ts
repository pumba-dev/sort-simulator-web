import { describe, it, expect } from "vitest";
import {
  MIN_REPLICATIONS,
  REPLICATION_CAPS,
  maxReplicationsForSizes,
} from "../../src/constants/comparator-options";

describe("maxReplicationsForSizes", () => {
  it("returns the most permissive tier when no sizes are selected", () => {
    expect(maxReplicationsForSizes([])).toBe(REPLICATION_CAPS[0].maxReplications);
  });

  it("returns 40 for sizes up to 30k", () => {
    expect(maxReplicationsForSizes([10, 100, 30000])).toBe(40);
  });

  it("returns 25 when the largest size is in (30k, 100k]", () => {
    expect(maxReplicationsForSizes([100, 50000, 100000])).toBe(25);
  });

  it("returns 15 when the largest size is in (100k, 150k]", () => {
    expect(maxReplicationsForSizes([100, 100000, 150000])).toBe(15);
  });

  it("returns 10 for sizes above 150k (e.g., 200k)", () => {
    expect(maxReplicationsForSizes([100, 200000])).toBe(10);
  });

  it("uses the largest size in a mixed selection", () => {
    expect(maxReplicationsForSizes([200000, 10, 100])).toBe(10);
  });
});

describe("MIN_REPLICATIONS", () => {
  it("is a positive integer", () => {
    expect(Number.isInteger(MIN_REPLICATIONS)).toBe(true);
    expect(MIN_REPLICATIONS).toBeGreaterThan(0);
  });
});

describe("REPLICATION_CAPS", () => {
  it("is ordered by increasing sizeAtMost", () => {
    for (let i = 1; i < REPLICATION_CAPS.length; i += 1) {
      expect(REPLICATION_CAPS[i].sizeAtMost).toBeGreaterThan(
        REPLICATION_CAPS[i - 1].sizeAtMost,
      );
    }
  });

  it("has a final tier that catches arbitrarily large sizes", () => {
    const last = REPLICATION_CAPS[REPLICATION_CAPS.length - 1];
    expect(last.sizeAtMost).toBe(Number.POSITIVE_INFINITY);
  });

  it("never drops below MIN_REPLICATIONS", () => {
    for (const tier of REPLICATION_CAPS) {
      expect(tier.maxReplications).toBeGreaterThanOrEqual(MIN_REPLICATIONS);
    }
  });
});
