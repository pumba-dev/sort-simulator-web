import { describe, it, expect } from "vitest";
import timSort from "../../src/algorithms/timSort";

const runSteps = (arr: number[]) => timSort(arr).steps;
const runFinal = (arr: number[]) => timSort(arr).finalArray;

describe("timSort", () => {
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

    it("sorts large array (triggers merge phase)", () => {
      const bigArr = Array.from({ length: 33 }, (_, i) => 33 - i);
      const sorted = Array.from({ length: 33 }, (_, i) => i + 1);
      expect(runFinal(bigArr)).toEqual(sorted);
    });

    it("handles trailing partial merge group (mid==right skip path)", () => {
      const big = Array.from({ length: 65 }, (_, i) => 65 - i);
      const expected = Array.from({ length: 65 }, (_, i) => i + 1);
      expect(runFinal(big)).toEqual(expected);
    });

    it("merges runs covering left<=right path and right drain", () => {
      const ascending = Array.from({ length: 40 }, (_, i) => i + 1);
      expect(runFinal(ascending)).toEqual(ascending);
    });
  });

  describe("input immutability", () => {
    it("does not mutate the original array", () => {
      const input = [3, 1, 2];
      const snapshot = [3, 1, 2];
      timSort(input);
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
        expect(step).toHaveProperty("timPhase");
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

    it("timPhase is either insertion or merge on every step", () => {
      const bigArr = Array.from({ length: 33 }, (_, i) => 33 - i);
      for (const step of runSteps(bigArr)) {
        expect(["insertion", "merge"]).toContain(step.timPhase);
      }
    });

    it("insertion steps have timRunBoundaries with start and end", () => {
      const insertionSteps = runSteps([3, 1, 2]).filter(
        (s: any) => s.timPhase === "insertion",
      );
      expect(insertionSteps.length).toBeGreaterThan(0);
      for (const step of insertionSteps) {
        expect(Array.isArray(step.timRunBoundaries)).toBe(true);
        for (const b of step.timRunBoundaries!) {
          expect(b).toHaveProperty("start");
          expect(b).toHaveProperty("end");
        }
      }
    });

    it("insertion steps have gapIndex property", () => {
      const insertionSteps = runSteps([3, 1, 2]).filter(
        (s: any) => s.timPhase === "insertion",
      );
      expect(insertionSteps.length).toBeGreaterThan(0);
      for (const step of insertionSteps) {
        expect(step).toHaveProperty("gapIndex");
      }
    });

    it("merge steps have merging region with start and end", () => {
      const bigArr = Array.from({ length: 33 }, (_, i) => 33 - i);
      const mergeSteps = runSteps(bigArr).filter(
        (s: any) => s.timPhase === "merge",
      );
      expect(mergeSteps.length).toBeGreaterThan(0);
      for (const step of mergeSteps) {
        expect(step.merging).toHaveProperty("start");
        expect(step.merging).toHaveProperty("end");
      }
    });

    it("merge steps have divisionDepth property", () => {
      const bigArr = Array.from({ length: 33 }, (_, i) => 33 - i);
      const mergeSteps = runSteps(bigArr).filter(
        (s: any) => s.timPhase === "merge",
      );
      expect(mergeSteps.length).toBeGreaterThan(0);
      for (const step of mergeSteps) {
        expect(step).toHaveProperty("divisionDepth");
      }
    });
  });

  describe("benchmark mode", () => {
    it("skips step recording when recordSteps is false", () => {
      const result = timSort([5, 4, 3, 2, 1], { recordSteps: false });
      expect(result.steps).toEqual([]);
      expect(result.finalArray).toEqual([1, 2, 3, 4, 5]);
    });

    it("reports counters and aux bytes", () => {
      const result = timSort([3, 1, 2]);
      expect(result.peakAuxBytes).toBeGreaterThan(0);
      expect(result.aborted).toBe(false);
    });

    it("honors abort signal", () => {
      const controller = new AbortController();
      controller.abort();
      const bigArr = Array.from({ length: 33 }, (_, i) => 33 - i);
      const result = timSort(bigArr, {
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
        timSort([3, 1, 2], { signal: trickySignal, yieldEveryOps: 1 }),
      ).toThrow("boom");
    });

    it("aborts when deadlineMs is reached", () => {
      const reverse = Array.from({ length: 50 }, (_, i) => 50 - i);
      const result = timSort(reverse, {
        recordSteps: false,
        yieldEveryOps: 1,
        deadlineMs: Date.now() - 1,
      });
      expect(result.aborted).toBe(true);
    });
  });
});
