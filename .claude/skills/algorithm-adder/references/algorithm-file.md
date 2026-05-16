# Algorithm file

Location: `src/algorithms/<algorithmName>.ts`. Use camelCase for the filename — `shellSort.ts`, `countingSort.ts`, `radixSort.ts`.

The signature, options, return shape, and `SortStep` contract are all defined in [coder/references/algorithm-contract.md](../../coder/references/algorithm-contract.md). Read it once before writing. This file is the "how to apply the contract" tutorial, with copy-paste-ready scaffolding.

A working example to crib from: [src/algorithms/bubbleSort.ts](../../../../src/algorithms/bubbleSort.ts).

## Header — copy this

```ts
import type { SortRunOptions, SortRunResult, SortStep } from '../types/sort-types'

export default (A: number[], options: SortRunOptions = {}): SortRunResult => {
  const {
    recordSteps = true,
    signal,
    yieldEveryOps = 50000,
    deadlineMs,
  } = options

  const steps: SortStep[] = []
  let comparisons = 0
  let swaps = 0
  const arr = [...A]           // never mutate the original input
  const BYTES_PER_NUMBER = 8
  let peakAux = arr.length * BYTES_PER_NUMBER

  // … abort scaffolding (next section) …
  // … sort body …
  // … final step guarantee …

  return { steps, finalArray: arr, comparisons, swaps, peakAuxBytes: peakAux, aborted: false }
}
```

## Abort scaffolding — copy this

```ts
const ABORT_SENTINEL = Symbol('sort-aborted')
let ops = 0
const tick = () => {
  ops += 1
  if (ops >= yieldEveryOps) {
    ops = 0
    if (signal?.aborted) throw ABORT_SENTINEL
    if (deadlineMs !== undefined && Date.now() >= deadlineMs) throw ABORT_SENTINEL
  }
}

try {
  // sort loops — call tick() inside the inner loops
} catch (e) {
  if (e === ABORT_SENTINEL) {
    return { steps, finalArray: arr, comparisons, swaps, peakAuxBytes: peakAux, aborted: true }
  }
  throw e
}
```

Throwing the sentinel (instead of returning early) lets the abort bail out of arbitrarily nested loops without threading a flag through each level.

## Step recording

Wrap step pushes in a helper so `recordSteps=false` is a free no-op in benchmark mode:

```ts
const pushStep = (fields: SortStep) => {
  if (recordSteps) steps.push(fields)
}
```

Push around each comparison/swap. Required fields on every step:

```ts
pushStep({
  values: [...arr],
  activeIndexes: [i, j],         // indices being compared or swapped
  comparisons,
  swaps,
  variables: { i, j, gap },      // all loop variables in scope
  pivotIndex: null,              // null if the algorithm has no pivot
})
```

For algorithm-specific visualizations, add the optional fields (see the table in [coder/references/algorithm-contract.md](../../coder/references/algorithm-contract.md#sortstep-required-fields-every-step)). If your algorithm needs a field that doesn't exist yet, add it to `SortStep` in `src/types/sort-types.ts` first.

## Guarantee at least one step

If the input is already sorted and your loops exit without pushing, push a final snapshot — the Learning module renders the steps array and needs at least one frame:

```ts
if (recordSteps && steps.length === 0) {
  steps.push({
    values: [...arr],
    activeIndexes: [],
    comparisons: 0,
    swaps: 0,
    variables: {},
    pivotIndex: null,
  })
}
```

## `peakAuxBytes` estimation

This is an estimate (the SRS calls it out — JS doesn't expose real memory usage). The convention:

- **In-place** algorithms (Bubble, Insertion, Shell, Heap, Quick): keep `peakAux = arr.length * BYTES_PER_NUMBER` (the input copy you made).
- **Algorithms with auxiliary buffers** (Merge, Tim, Counting, Radix): update `peakAux` whenever an aux buffer is allocated, e.g.

  ```ts
  const buffer = new Array(end - start)
  peakAux = Math.max(peakAux, arr.length * BYTES_PER_NUMBER + buffer.length * BYTES_PER_NUMBER)
  ```

  Track the peak across the whole run, not the current allocation.

The value drives the "Estimated aux memory" column in the Comparator benchmark report — it doesn't need to be exact, but it needs to differentiate in-place from buffered algorithms.

## Return — always all fields, always

```ts
return { steps, finalArray: arr, comparisons, swaps, peakAuxBytes: peakAux, aborted: false }
```

The registry, the worker pool, and the report generator all assume every field is present. Returning a partial object will fail TypeScript and crash at runtime.
