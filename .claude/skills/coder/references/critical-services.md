# Critical services

These files have `100/100/100/100` (lines / functions / branches / statements) coverage thresholds enforced in `vitest.config.ts`. A change that drops coverage will fail CI silently — local lint/typecheck won't catch it.

## The list

- `src/algorithms/**` — every sorting algorithm
- `src/services/benchmark-service.ts`
- `src/services/comparison-history-service.ts`
- `src/services/seeded-prng.ts`
- `src/services/sort-algorithm-registry.ts`

## Workflow when editing any of these

1. Make the code change.
2. Add or update tests covering every new branch, callback, option, early return, and abort path.
3. Run:
   ```bash
   npx vitest run <path-to-spec> --coverage
   ```
4. Confirm the target file shows `100 | 100 | 100 | 100` in the coverage table. If anything is below, find the uncovered line range in the report and write the test that exercises it.
5. Never close a task on a critical service with sub-100% coverage. If writing the tests is non-trivial, hand off to the `test-writer` skill.

## The optional-callback trap

The single most common reason coverage silently drops on these files is the optional-chain pattern:

```ts
options.onSomething?.(payload)
```

That line only runs when the caller actually passes the callback. A test that omits it leaves the line uncovered, and the coverage threshold fails the next time someone touches the file.

The rule: whenever you add an optional callback or option to a critical service's public API, add a test that **passes** it and asserts its effect.

Example — adding `onReplicationDone` to `BenchmarkService`:

```ts
it("invokes onReplicationDone after every replication", async () => {
  const calls: number[] = []
  await service.runJob(baseJob({ sizes: [10], replications: 3 }), {
    onReplicationDone: (info) => calls.push(info.replication),
  })
  expect(calls).toEqual([1, 2, 3])
})
```

Skipping this leaves the `options.onReplicationDone?.()` line uncovered.

Keep an existing test where the callback is **absent** too — that covers the default path where the optional chain short-circuits.

## Why this is strict

These files are the load-bearing parts of the simulator:

- **Algorithms** drive both the Learning animation (via the `SortStep[]` contract) and the Comparator benchmark — a bug here breaks two modules at once.
- **`benchmark-service`** owns reproducibility (seeds), fairness (same input per cell), cancellation, and timeout — silent regressions destroy benchmark trust.
- **`comparison-history-service`** persists user work. A wrong eviction or quota-handling change loses data.
- **`seeded-prng`** is the determinism root for the whole comparator pipeline.
- **`sort-algorithm-registry`** is the dispatch layer; a missing or wrongly-shaped entry crashes both modules.

The 100% threshold exists to catch contract drift before it ships, not to chase a metric.
