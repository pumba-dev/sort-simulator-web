# Algorithm tests

Required test cases for every file in `src/algorithms/`. These cover both the Learning module's animation contract and the Comparator's benchmark contract — same `run` function serves both.

The full contract lives in [coder/references/algorithm-contract.md](../../coder/references/algorithm-contract.md). This file lists what the spec must assert.

Test file location: `__tests__/algorithms/<algorithmName>.spec.ts`.

## Correctness cases (always)

- Empty array → `finalArray: []`
- Single element → returned unchanged
- Already sorted (ascending) → still correct, sorted output
- Reverse sorted (descending) → correctly sorted
- Array with duplicates → handled (assert stability only for stable algorithms — Merge, Tim, Insertion, Bubble)
- Input immutability — the original array reference is never mutated

```ts
const input = [3, 1, 2]
const inputCopy = [...input]
run(input)
expect(input).toEqual(inputCopy) // original untouched
```

## `SortStep` contract (when `recordSteps=true`)

Every step must have the required fields. Easiest way to assert this is a loop:

```ts
for (const step of result.steps) {
  expect(step).toHaveProperty('values')
  expect(step).toHaveProperty('activeIndexes')
  expect(step).toHaveProperty('comparisons')
  expect(step).toHaveProperty('swaps')
  expect(step).toHaveProperty('variables')
  expect(step).toHaveProperty('pivotIndex')
  expect(Array.isArray(step.values)).toBe(true)
  expect(Array.isArray(step.activeIndexes)).toBe(true)
}
```

At least one step must be generated, even when the input is already sorted. The Learning module needs something to render — without this assertion, an algorithm that early-exits on sorted input would leave the animation blank.

```ts
const result = run([1, 2, 3])
expect(result.steps.length).toBeGreaterThan(0)
```

## Benchmark mode (`recordSteps=false`)

```ts
const result = run([5, 3, 1, 4, 2], { recordSteps: false })
expect(result.steps).toHaveLength(0)
expect(result.aborted).toBe(false)
expect(result.comparisons).toBeGreaterThanOrEqual(0)
expect(result.swaps).toBeGreaterThanOrEqual(0)
expect(result.peakAuxBytes).toBeGreaterThan(0)
```

Why each assertion:

- `steps` empty — confirms the allocation optimization works; a regression that always pushes steps would balloon memory in benchmarks.
- `aborted: false` — normal runs must report false, not undefined or true.
- counters non-negative — guards against integer overflow / sign bugs.
- `peakAuxBytes > 0` — even in-place sorts report the input-copy buffer.

## Abort paths

Both abort triggers — `AbortSignal` and `deadlineMs` — must result in `aborted: true` and a partial `finalArray`.

`AbortSignal`:

```ts
const controller = new AbortController()
controller.abort()
const result = run(largeArray, { signal: controller.signal, yieldEveryOps: 1 })
expect(result.aborted).toBe(true)
```

`deadlineMs`:

```ts
const result = run(largeArray, { deadlineMs: Date.now() - 1, yieldEveryOps: 1 })
expect(result.aborted).toBe(true)
```

`yieldEveryOps: 1` forces the abort check on every operation, so the test doesn't depend on input size to actually fire.

## Stability (optional, only for stable algorithms)

For algorithms where stability matters (Merge, Tim, Insertion, Bubble), test that equal keys keep their relative order:

```ts
const input = [
  { key: 2, id: 'a' },
  { key: 1, id: 'b' },
  { key: 2, id: 'c' },
]
// Adapt the algorithm wrapper if it sorts objects, or use a tagged-number trick.
```

This codebase sorts plain `number[]`, so stability is only observable when the algorithm is wrapped — most algorithm specs can skip this case.
