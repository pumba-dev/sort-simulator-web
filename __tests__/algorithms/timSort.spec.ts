import { describe, it, expect } from "vitest";
import timSort from "../../src/algorithms/timSort.ts";

const runSteps = (arr: number[]) => timSort(arr).steps;
const runFinal = (arr: number[]) => timSort(arr).finalArray;

describe("timSort", () => {
  describe("sorting correctness", () => {
    it("sorts random array", () => {
      expect(runFinal([3, 1, 4, 1, 5, 9, 2, 6])).toEqual([
        1, 1, 2, 3, 4, 5, 6, 9,
      ]);
    });

    it("sorts reverse-ordered array", () => {
      expect(runFinal([5, 4, 3, 2, 1])).toEqual([1, 2, 3, 4, 5]);
    });

    it("handles already sorted array", () => {
      expect(runFinal([1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4, 5]);
    });

    it("handles array with duplicates", () => {
      expect(runFinal([3, 1, 3, 2, 1])).toEqual([1, 1, 2, 3, 3]);
    });

    it("handles two elements in reverse order", () => {
      expect(runFinal([2, 1])).toEqual([1, 2]);
    });

    it("handles single element", () => {
      expect(runFinal([7])).toEqual([7]);
    });

    it("handles empty array", () => {
      expect(runFinal([])).toEqual([]);
    });

    it("sorts large array (triggers merge phase)", () => {
      const bigArr = Array.from({ length: 33 }, (_, i) => 33 - i);
      const sorted = Array.from({ length: 33 }, (_, i) => i + 1);
      expect(runFinal(bigArr)).toEqual(sorted);
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
  });
});
