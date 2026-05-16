---
name: algorithm-adder
description: >
  Use when adding a new sorting algorithm to sort-simulator-web. Trigger on any request to
  implement a sort (Shell Sort, Counting Sort, Radix Sort, etc.), create a file in
  `src/algorithms/`, or wire a new algorithm into the Learning or Comparator modules. This skill
  covers the full integration checklist — algorithm file, registry, learning metadata, i18n,
  styles, and tests — because a half-finished integration breaks either the animation or the
  benchmark.
---

# Algorithm adder

Adding a new sorting algorithm touches six places. Skipping any one of them leaves the simulator in a half-broken state: the algorithm runs but doesn't appear in the picker, or appears in the picker but crashes the Learning animation, or animates but is missing from the Comparator's checklist. This skill enforces the full checklist.

## Checklist

- [ ] **1. Algorithm file** — `src/algorithms/<name>.ts` (default export, full `SortRunResult` shape)
- [ ] **2. Registry** — register the key in `src/services/sort-algorithm-registry.ts`
- [ ] **3. Learning metadata** — add the entry in `src/constants/learningAlgorithms.ts`
- [ ] **4. i18n** — add keys to all three locales (`ptBR`, `enUS`, `esES`)
- [ ] **5. SCSS partial** — only if the algorithm needs new visual states (`src/styles/_<name>.scss`)
- [ ] **6. Tests** — `__tests__/algorithms/<name>.spec.ts` with the full contract

## Where to read

| Step | Reference |
|------|-----------|
| Algorithm function shape, abort pattern, step recording, `peakAuxBytes` estimation | [references/algorithm-file.md](references/algorithm-file.md) |
| Registry, learning metadata, i18n keys, SCSS wiring, test file scaffolding | [references/integration.md](references/integration.md) |
| Full `SortRunOptions` / `SortRunResult` / `SortStep` type contract | [coder/references/algorithm-contract.md](../coder/references/algorithm-contract.md) |
| Required test cases for any algorithm | [test-writer/references/algorithm-tests.md](../test-writer/references/algorithm-tests.md) |

## Why every step matters

Each of the six items has a failure mode the rest of the codebase can't recover from:

1. **Algorithm file** — wrong shape and the registry crashes at module load (every page).
2. **Registry** — missing entry and the algorithm key picked in Learning or Comparator throws "no implementation".
3. **Learning metadata** — missing entry and the Learning picker hides the algorithm; the animation can't render description/complexity.
4. **i18n** — missing keys render as raw key strings in the UI. Users see `learning.shellSort.description` instead of the description.
5. **SCSS** — only matters if the algorithm has a new visual state (e.g., gap region for Shell Sort, bucket index for Radix). Existing palette covers active/swap/sorted/pivot.
6. **Tests** — without the contract tests, a future refactor of `BenchmarkService` or the Learning animation can break this algorithm without anyone noticing.

## Recommended order

Work the checklist top-to-bottom. Each step compiles and unblocks the next:

1. Write the algorithm file in isolation, then call it from a quick scratch test.
2. Register it.
3. Add it to the Learning metadata.
4. Add the i18n keys — running the dev server will surface missing keys as console warnings.
5. Add SCSS only if needed.
6. Write the spec last, when you know the algorithm's actual behavior.

Skipping ahead to "write the spec first" is fine if you prefer TDD — just make sure the algorithm contract tests from [test-writer/references/algorithm-tests.md](../test-writer/references/algorithm-tests.md) all pass before closing out.

## Final gate (mandatory)

Run `npm run build` after completing the checklist. Fix every TypeScript and Vite error before reporting the task as done. A passing spec with a broken build is not done.
