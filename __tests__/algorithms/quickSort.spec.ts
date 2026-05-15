import { describe, it, expect } from "vitest";
import quickSort from "../../src/algorithms/quickSort";

const runSteps = (arr: number[]) => quickSort(arr).steps;
const runFinal = (arr: number[]) => quickSort(arr).finalArray;

describe("quickSort", () => {
  describe("sorting correctness", () => {
    it("sorts random array", () => {
      const input = [3, 1, 4, 1, 5, 9, 2, 6];
      const expected = [1, 1, 2, 3, 4, 5, 6, 9];
      expect(runFinal(input)).toEqual(expected);
    });

    it("sorts reverse-ordered array", () => {
      const input = [5, 4, 3, 2, 1];
      const expected = [1, 2, 3, 4, 5];
      expect(runFinal(input)).toEqual(expected);
    });

    it("handles already sorted array", () => {
      const input = [1, 2, 3, 4, 5];
      const expected = [1, 2, 3, 4, 5];
      expect(runFinal(input)).toEqual(expected);
    });

    it("handles array with duplicates", () => {
      const input = [3, 1, 3, 2, 1];
      const expected = [1, 1, 2, 3, 3];
      expect(runFinal(input)).toEqual(expected);
    });

    it("handles two elements in reverse order", () => {
      const input = [2, 1];
      const expected = [1, 2];
      expect(runFinal(input)).toEqual(expected);
    });

    it("handles single element", () => {
      const input = [7];
      const expected = [7];
      expect(runFinal(input)).toEqual(expected);
    });

    it("handles empty array", () => {
      const input: number[] = [];
      const expected: number[] = [];
      expect(runFinal(input)).toEqual(expected);
    });
  });

  describe("input immutability", () => {
    it("does not mutate the original array", () => {
      const input = [3, 1, 2];
      const snapshot = [3, 1, 2];
      quickSort(input);
      expect(input).toEqual(snapshot);
    });
  });

  describe("step structure", () => {
    it("returns at least one step by default", () => {
      expect(runSteps([3, 1, 2]).length).toBeGreaterThanOrEqual(1);
    });

    it("each step has required fields", () => {
      for (const step of runSteps([3, 1, 2])) {
        expect(step).toHaveProperty("values");
        expect(step).toHaveProperty("activeIndexes");
        expect(step).toHaveProperty("comparisons");
        expect(step).toHaveProperty("swaps");
        expect(step).toHaveProperty("variables");
        expect(step).toHaveProperty("pivotIndex");
        expect(step).toHaveProperty("partitionIndex");
      }
    });

    it("comparisons and swaps are non-negative in every step", () => {
      for (const step of runSteps([3, 1, 2])) {
        expect(step.comparisons).toBeGreaterThanOrEqual(0);
        expect(step.swaps).toBeGreaterThanOrEqual(0);
      }
    });

    it("step values length matches input length", () => {
      const input = [3, 1, 2];
      for (const step of runSteps(input)) {
        expect(step.values).toHaveLength(input.length);
      }
    });

    it("variables contain i, j, pivot, p and r", () => {
      const steps = runSteps([3, 1, 2]).filter(
        (s: any) => s.partitionIndex == null && s.pivotIndex != null,
      );
      for (const step of steps) {
        expect(step.variables).toHaveProperty("i");
        expect(step.variables).toHaveProperty("j");
        expect(step.variables).toHaveProperty("pivot");
        expect(step.variables).toHaveProperty("p");
        expect(step.variables).toHaveProperty("r");
      }
    });
  });

  describe("benchmark mode", () => {
    it("skips step recording when recordSteps is false", () => {
      const result = quickSort([5, 4, 3, 2, 1], { recordSteps: false });
      expect(result.steps).toEqual([]);
      expect(result.finalArray).toEqual([1, 2, 3, 4, 5]);
    });

    it("reports counters and aux bytes", () => {
      const result = quickSort([3, 1, 2]);
      expect(result.peakAuxBytes).toBeGreaterThan(0);
      expect(result.aborted).toBe(false);
    });

    it("honors abort signal", () => {
      const controller = new AbortController();
      controller.abort();
      const result = quickSort([5, 4, 3, 2, 1, 6, 7, 8], {
        recordSteps: false,
        signal: controller.signal,
        yieldEveryOps: 1,
      });
      expect(result.aborted).toBe(true);
    });

    it("rethrows non-abort errors from inside try block", () => {
      const trickySignal = {
        get aborted() {
          throw new Error("boom");
        },
        addEventListener: () => {},
        removeEventListener: () => {},
      } as unknown as AbortSignal;
      expect(() =>
        quickSort([3, 1, 2], { signal: trickySignal, yieldEveryOps: 1 }),
      ).toThrow("boom");
    });

    it("aborts when deadlineMs is reached", () => {
      const reverse = Array.from({ length: 50 }, (_, i) => 50 - i);
      const result = quickSort(reverse, {
        recordSteps: false,
        yieldEveryOps: 1,
        deadlineMs: Date.now() - 1,
      });
      expect(result.aborted).toBe(true);
    });
  });
});
