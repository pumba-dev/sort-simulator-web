import { describe, it, expect } from 'vitest'
import quickSort from '../quickSort.ts'

const runSteps = (arr: number[]) => quickSort(arr).steps
const runFinal = (arr: number[]) => quickSort(arr).finalArray

describe('quickSort', () => {
  describe('sorting correctness', () => {
    it('sorts random array', () => {
      expect(runFinal([3, 1, 4, 1, 5, 9, 2, 6])).toEqual([1, 1, 2, 3, 4, 5, 6, 9])
    })

    it('sorts reverse-ordered array', () => {
      expect(runFinal([5, 4, 3, 2, 1])).toEqual([1, 2, 3, 4, 5])
    })

    it('handles already sorted array', () => {
      expect(runFinal([1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4, 5])
    })

    it('handles array with duplicates', () => {
      expect(runFinal([3, 1, 3, 2, 1])).toEqual([1, 1, 2, 3, 3])
    })

    it('handles two elements in reverse order', () => {
      expect(runFinal([2, 1])).toEqual([1, 2])
    })

    it('handles single element', () => {
      expect(runFinal([7])).toEqual([7])
    })

    it('handles empty array', () => {
      expect(runFinal([])).toEqual([])
    })
  })

  describe('input immutability', () => {
    it('does not mutate the original array', () => {
      const input = [3, 1, 2]
      const snapshot = [3, 1, 2]
      quickSort(input)
      expect(input).toEqual(snapshot)
    })
  })

  describe('step structure', () => {
    it('returns at least one step by default', () => {
      expect(runSteps([3, 1, 2]).length).toBeGreaterThanOrEqual(1)
    })

    it('each step has required fields', () => {
      for (const step of runSteps([3, 1, 2])) {
        expect(step).toHaveProperty('values')
        expect(step).toHaveProperty('activeIndexes')
        expect(step).toHaveProperty('comparisons')
        expect(step).toHaveProperty('swaps')
        expect(step).toHaveProperty('variables')
        expect(step).toHaveProperty('pivotIndex')
        expect(step).toHaveProperty('partitionIndex')
      }
    })

    it('comparisons and swaps are non-negative in every step', () => {
      for (const step of runSteps([3, 1, 2])) {
        expect(step.comparisons).toBeGreaterThanOrEqual(0)
        expect(step.swaps).toBeGreaterThanOrEqual(0)
      }
    })

    it('step values length matches input length', () => {
      const input = [3, 1, 2]
      for (const step of runSteps(input)) {
        expect(step.values).toHaveLength(input.length)
      }
    })

    it('variables contain i, j, pivot, p and r', () => {
      const steps = runSteps([3, 1, 2]).filter(
        (s: any) => s.partitionIndex == null && s.pivotIndex != null,
      )
      for (const step of steps) {
        expect(step.variables).toHaveProperty('i')
        expect(step.variables).toHaveProperty('j')
        expect(step.variables).toHaveProperty('pivot')
        expect(step.variables).toHaveProperty('p')
        expect(step.variables).toHaveProperty('r')
      }
    })
  })

  describe('benchmark mode', () => {
    it('skips step recording when recordSteps is false', () => {
      const result = quickSort([5, 4, 3, 2, 1], { recordSteps: false })
      expect(result.steps).toEqual([])
      expect(result.finalArray).toEqual([1, 2, 3, 4, 5])
    })

    it('reports counters and aux bytes', () => {
      const result = quickSort([3, 1, 2])
      expect(result.peakAuxBytes).toBeGreaterThan(0)
      expect(result.aborted).toBe(false)
    })

    it('honors abort signal', () => {
      const controller = new AbortController()
      controller.abort()
      const result = quickSort([5, 4, 3, 2, 1, 6, 7, 8], {
        recordSteps: false,
        signal: controller.signal,
        yieldEveryOps: 1,
      })
      expect(result.aborted).toBe(true)
    })
  })
})
