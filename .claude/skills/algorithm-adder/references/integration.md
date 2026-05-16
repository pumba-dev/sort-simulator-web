# Integration

Steps 2–6 of the algorithm-adder checklist: registry, learning metadata, i18n, SCSS, tests.

## 2. Registry

File: `src/services/sort-algorithm-registry.ts`. This is a critical-services file (100% coverage threshold), so any change here needs a corresponding test update.

1. Add the new `AlgorithmKey` enum value (or string-literal entry, depending on how the file declares keys — match the existing pattern).
2. Import the algorithm's default export.
3. Register the `{ key, run }` mapping next to the existing entries.

The registry's correctness test (see [test-writer/references/service-tests.md](../../test-writer/references/service-tests.md#sortalgorithmregistry-srcservicessort-algorithm-registryts)) iterates over `AlgorithmKey` values and checks each one resolves to a valid `run` returning a valid `SortRunResult`. Forgetting the registry entry will fail this test — that's by design.

## 3. Learning metadata

File: `src/constants/learningAlgorithms.ts`. Add an entry:

```ts
{
  key: AlgorithmKey.ShellSort,        // matches the registry key
  nameKey: 'learning.shellSort.name', // i18n key for display name
  descriptionKey: 'learning.shellSort.description',
  complexity: {
    best:    'O(n log n)',
    average: 'O(n^{4/3})',
    worst:   'O(n^2)',
  },
  spaceComplexity: 'O(1)',
}
```

This entry drives:

- The algorithm picker in `/aprendizado`.
- The complexity badges shown next to the animation.
- The description panel that explains the algorithm.

Get the complexity figures right — they're shown to learners and are non-trivial to spot in code review. Use a reference for the asymptotic bounds.

## 4. i18n — all three locales

Files (update all three in the same edit cycle):

- `src/i18n/locales/ptBR.ts`
- `src/i18n/locales/enUS.ts`
- `src/i18n/locales/esES.ts`

Required keys (mirror the existing algorithms):

- Display name (referenced by `nameKey` in the learning metadata)
- Description — what the algorithm does, written for a learner (one or two paragraphs)
- Any step-specific labels if the algorithm introduces a new UI concept (e.g., "gap" for Shell Sort, "bucket" for Radix Sort)

A key present in one locale but missing from another renders as the key literal in the missing locale's UI. Always update all three.

## 5. SCSS partial (only if needed)

Location: `src/styles/_<algorithmName>.scss`. Import in `src/styles/main.scss` so it's bundled.

You only need this if the algorithm introduces a visual state the existing palette doesn't cover. The default states (active comparison, swap, sorted region, pivot) handle most algorithms. Examples of algorithms that needed extra:

- Shell Sort — color for the current gap-paired elements
- Radix Sort — color per bucket
- Tim Sort — color for the boundary of each run

If your algorithm reuses the existing states, skip this step.

## 6. Tests

Location: `__tests__/algorithms/<algorithmName>.spec.ts`. Required cases listed in [test-writer/references/algorithm-tests.md](../../test-writer/references/algorithm-tests.md):

- Sorting correctness (empty, single, ascending, descending, duplicates)
- Input immutability (original array reference unchanged)
- `SortStep` contract (required fields present, at least one step generated)
- Benchmark mode (`recordSteps: false` → empty steps, valid counters, `peakAuxBytes > 0`)
- Abort via `AbortSignal` → `aborted: true`
- Abort via `deadlineMs` → `aborted: true`

After writing the spec, run:

```bash
npx vitest run __tests__/algorithms/<algorithmName>.spec.ts --coverage
```

Confirm the algorithm file shows `100 | 100 | 100 | 100` in the coverage table. If anything's below, find the uncovered range in the report and add the test that covers it — closing the task with sub-100% coverage will break the suite later.
