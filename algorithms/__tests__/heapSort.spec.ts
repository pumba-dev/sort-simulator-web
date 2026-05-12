import { describe, it, expect } from 'vitest'
import heapSort from '../heapSort.js'

const lastValues = (arr: number[]) => {
  const steps = heapSort(arr)
  return steps[steps.length - 1].values
}

describe('heapSort', () => {
  describe('sorting correctness', () => {
    it('sorts random array', () => {
      const input = [3, 1, 4, 1, 5, 9, 2, 6]
      const expected = [1, 1, 2, 3, 4, 5, 6, 9]
      expect(lastValues(input)).toEqual(expected)
    })

    it('sorts reverse-ordered array', () => {
      const input = [5, 4, 3, 2, 1]
      const expected = [1, 2, 3, 4, 5]
      expect(lastValues(input)).toEqual(expected)
    })

    it('handles already sorted array', () => {
      const input = [1, 2, 3, 4, 5]
      const expected = [1, 2, 3, 4, 5]
      expect(lastValues(input)).toEqual(expected)
    })

    it('handles array with duplicates', () => {
      const input = [4, 2, 4, 1, 2]
      const expected = [1, 2, 2, 4, 4]
      expect(lastValues(input)).toEqual(expected)
    })

    it('handles single element', () => {
      const input = [7]
      const expected = [7]
      expect(lastValues(input)).toEqual(expected)
    })

    it('handles empty array', () => {
      const input: number[] = []
      const expected: number[] = []
      expect(lastValues(input)).toEqual(expected)
    })
  })

  describe('input immutability', () => {
    it('does not mutate the original array', () => {
      const input = [3, 1, 2]
      const snapshot = [3, 1, 2]
      heapSort(input)
      expect(input).toEqual(snapshot)
    })
  })

  describe('step structure', () => {
    it('returns at least one step', () => {
      const input = [3, 1, 2]
      expect(heapSort(input).length).toBeGreaterThanOrEqual(1)
    })

    it('each step has required fields', () => {
      const input = [3, 1, 2]
      for (const step of heapSort(input)) {
        expect(step).toHaveProperty('values')
        expect(step).toHaveProperty('activeIndexes')
        expect(step).toHaveProperty('comparisons')
        expect(step).toHaveProperty('swaps')
        expect(step).toHaveProperty('variables')
        expect(step).toHaveProperty('pivotIndex')
        expect(step).toHaveProperty('heapifyRegion')
      }
    })

    it('comparisons and swaps are non-negative in every step', () => {
      const input = [3, 1, 2]
      for (const step of heapSort(input)) {
        expect(step.comparisons).toBeGreaterThanOrEqual(0)
        expect(step.swaps).toBeGreaterThanOrEqual(0)
      }
    })

    it('step values length matches input length', () => {
      const input = [3, 1, 2]
      for (const step of heapSort(input)) {
        expect(step.values).toHaveLength(input.length)
      }
    })

    it('heapifyRegion is null or has start and end', () => {
      const input = [3, 1, 2]
      for (const step of heapSort(input)) {
        if (step.heapifyRegion !== null) {
          expect(step.heapifyRegion).toHaveProperty('start')
          expect(step.heapifyRegion).toHaveProperty('end')
        }
      }
    })
  })
})
