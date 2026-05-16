# Algorithm contract

The shape every file in `src/algorithms/` must follow. Both Learning (which needs steps) and the Comparator benchmark (which doesn't) call the same `run` function — the contract has to satisfy both.

Canonical types live in [src/types/sort-types.ts](../../../../src/types/sort-types.ts). Treat this file as a tutorial; the type file as truth.

## Signature

```ts
import type { SortRunOptions, SortRunResult, SortStep } from '../types/sort-types'

export default (A: number[], options: SortRunOptions = {}): SortRunResult => { ... }
```

Default export, takes the input array and an options bag, returns a fully-populated result. Never mutate `A` — work on a copy.

## `SortRunOptions` (all optional)

| Field | Type | Meaning |
|-------|------|---------|
| `recordSteps` | `boolean` (default `true`) | Off in benchmark mode — skip pushing to `steps` to keep allocations tiny |
| `signal` | `AbortSignal` | External cancel from the worker pool |
| `yieldEveryOps` | `number` (default `50000`) | How often to check the abort/deadline conditions |
| `deadlineMs` | `number` | Absolute `Date.now()` timestamp to abort at |

## `SortRunResult` (always return all fields)

| Field | Type | Meaning |
|-------|------|---------|
| `steps` | `SortStep[]` | Empty array when `recordSteps=false` |
| `finalArray` | `number[]` | Sorted (or partial if aborted) |
| `comparisons` | `number` | Total comparisons |
| `swaps` | `number` | Total swaps |
| `peakAuxBytes` | `number` | Auxiliary memory estimate in bytes, excluding the input copy |
| `aborted` | `boolean` | `true` only if abort/deadline fired |

## `SortStep` (required fields every step)

| Field | Type | Meaning |
|-------|------|---------|
| `values` | `number[]` | Snapshot of the array at this moment |
| `activeIndexes` | `number[]` | Indices being compared or swapped |
| `comparisons` | `number` | Running count up to this step |
| `swaps` | `number` | Running count up to this step |
| `variables` | `Record<string, unknown>` | Loop variables to display (i, j, pivot, gap, etc.) |
| `pivotIndex` | `number \| null` | `null` if the algorithm has no pivot |

Optional algorithm-specific fields (add what applies, declare the new field in `sort-types.ts` if missing):

| Field | Type | Used by |
|-------|------|---------|
| `sortedPartition` | `{ start, end }` | Bubble Sort |
| `heapifyRegion` | `{ start, end } \| null` | Heap Sort |
| `gapIndex` | `number \| null` | Insertion Sort |
| `merging` | `{ start, end }` | Merge Sort |
| `divisionDepth` | `number` | Merge / Quick Sort |
| `partitionIndex` | `number \| null` | Quick Sort |
| `timPhase` | `"insertion" \| "merge"` | Tim Sort |
| `timRunBoundaries` | `{ start, end }[]` | Tim Sort |

## Abort pattern

Use the `ABORT_SENTINEL` symbol — every existing algorithm uses it, so the registry and the worker pool already handle it:

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

Throwing the sentinel (instead of returning early) lets you bail out of nested loops without threading a flag through every level.

## Guarantee at least one step

The Learning module needs something to render. If the input is already sorted and your main loops exit without pushing a step, push a final snapshot:

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

## Header pattern

```ts
const {
  recordSteps = true,
  signal,
  yieldEveryOps = 50000,
  deadlineMs,
} = options

const steps: SortStep[] = []
let comparisons = 0
let swaps = 0
const arr = [...A]
const BYTES_PER_NUMBER = 8
let peakAux = 0
```

For in-place algorithms (Bubble, Insertion, Shell, Heap, Quick), `peakAux` typically stays at `arr.length * BYTES_PER_NUMBER`. For algorithms with auxiliary buffers (Merge, Tim, Counting, Radix), update `peakAux` as the buffers grow.
