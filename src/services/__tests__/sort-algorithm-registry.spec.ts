import { describe, it, expect } from 'vitest'
import { sortAlgorithmRegistry } from '../sort-algorithm-registry'
import type { AlgorithmKey } from '../../types/comparator'

const KEYS: AlgorithmKey[] = ['bubble', 'heap', 'insertion', 'merge', 'quick']

describe('sortAlgorithmRegistry', () => {
  describe('registry completeness', () => {
    it('has exactly 5 algorithms registered', () => {
      expect(Object.keys(sortAlgorithmRegistry)).toHaveLength(5)
    })

    it.each(KEYS)('%s entry exists', (key) => {
      expect(sortAlgorithmRegistry[key]).toBeDefined()
    })

    it.each(KEYS)('%s entry has correct key property', (key) => {
      expect(sortAlgorithmRegistry[key].key).toBe(key)
    })

    it.each(KEYS)('%s entry has a run function', (key) => {
      expect(typeof sortAlgorithmRegistry[key].run).toBe('function')
    })
  })

  describe('run output shape', () => {
    it.each(KEYS)('%s returns a valid SortRunResult', (key) => {
      const result = sortAlgorithmRegistry[key].run([3, 1, 2])
      expect(result).toMatchObject({
        finalArray: expect.any(Array),
        steps: expect.any(Array),
        comparisons: expect.any(Number),
        swaps: expect.any(Number),
        peakAuxBytes: expect.any(Number),
        aborted: false,
      })
    })

    it.each(KEYS)('%s sorts [5,3,1,4,2] to [1,2,3,4,5]', (key) => {
      const { finalArray } = sortAlgorithmRegistry[key].run([5, 3, 1, 4, 2])
      expect(finalArray).toEqual([1, 2, 3, 4, 5])
    })

    it.each(KEYS)('%s sorts already-sorted array correctly', (key) => {
      const { finalArray } = sortAlgorithmRegistry[key].run([1, 2, 3])
      expect(finalArray).toEqual([1, 2, 3])
    })

    it.each(KEYS)('%s sorts reverse array correctly', (key) => {
      const { finalArray } = sortAlgorithmRegistry[key].run([5, 4, 3, 2, 1])
      expect(finalArray).toEqual([1, 2, 3, 4, 5])
    })

    it.each(KEYS)('%s does not mutate the input array', (key) => {
      const input = [3, 1, 2]
      const snapshot = [...input]
      sortAlgorithmRegistry[key].run(input)
      expect(input).toEqual(snapshot)
    })

    it.each(KEYS)('%s reports non-negative comparisons and swaps', (key) => {
      const result = sortAlgorithmRegistry[key].run([3, 1, 2])
      expect(result.comparisons).toBeGreaterThanOrEqual(0)
      expect(result.swaps).toBeGreaterThanOrEqual(0)
    })

    it.each(KEYS)('%s reports positive peakAuxBytes', (key) => {
      const result = sortAlgorithmRegistry[key].run([3, 1, 2])
      expect(result.peakAuxBytes).toBeGreaterThan(0)
    })
  })

  describe('step structure', () => {
    it.each(KEYS)('%s produces at least one step by default', (key) => {
      const { steps } = sortAlgorithmRegistry[key].run([3, 1, 2])
      expect(steps.length).toBeGreaterThanOrEqual(1)
    })

    it.each(KEYS)('%s each step has required SortStep fields', (key) => {
      const { steps } = sortAlgorithmRegistry[key].run([3, 1, 2])
      for (const step of steps) {
        expect(step).toHaveProperty('values')
        expect(step).toHaveProperty('activeIndexes')
        expect(step).toHaveProperty('comparisons')
        expect(step).toHaveProperty('swaps')
        expect(step).toHaveProperty('variables')
        expect('pivotIndex' in step).toBe(true)
        expect(Array.isArray(step.values)).toBe(true)
        expect(Array.isArray(step.activeIndexes)).toBe(true)
      }
    })

    it.each(KEYS)('%s step values length matches input length', (key) => {
      const input = [3, 1, 4, 1, 5]
      const { steps } = sortAlgorithmRegistry[key].run(input)
      for (const step of steps) {
        expect(step.values).toHaveLength(input.length)
      }
    })

    it.each(KEYS)('%s step comparisons and swaps are non-negative', (key) => {
      const { steps } = sortAlgorithmRegistry[key].run([3, 1, 2])
      for (const step of steps) {
        expect(step.comparisons).toBeGreaterThanOrEqual(0)
        expect(step.swaps).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('options handling', () => {
    it.each(KEYS)('%s with recordSteps=false returns empty steps array', (key) => {
      const { steps, finalArray } = sortAlgorithmRegistry[key].run(
        [5, 4, 3, 2, 1],
        { recordSteps: false },
      )
      expect(steps).toHaveLength(0)
      expect(finalArray).toEqual([1, 2, 3, 4, 5])
    })

    it.each(KEYS)('%s honors a pre-aborted AbortSignal', (key) => {
      const controller = new AbortController()
      controller.abort()
      const { aborted } = sortAlgorithmRegistry[key].run(
        Array.from({ length: 100 }, (_, i) => 100 - i),
        { signal: controller.signal, yieldEveryOps: 1 },
      )
      expect(aborted).toBe(true)
    })
  })
})
