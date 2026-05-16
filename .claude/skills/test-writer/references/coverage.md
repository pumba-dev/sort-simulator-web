# Coverage workflow

The repo enforces `100/100/100/100` (lines / functions / branches / statements) on a critical-files list via `vitest.config.ts`. Sub-100% on these files fails the suite — silently from the perspective of unit tests passing, then loudly in CI.

## Critical files

- `src/algorithms/**`
- `src/services/benchmark-service.ts`
- `src/services/comparison-history-service.ts`
- `src/services/seeded-prng.ts`
- `src/services/sort-algorithm-registry.ts`

`benchmark-report.ts` is not in the threshold list but is tested to the same standard — the round-trip CSV invariant matters and is easy to break.

## Mandatory final step on any edit

After writing or updating tests for a critical file:

```bash
npx vitest run <path-to-spec> --coverage
```

The output shows a coverage table per file. The target file must read `100 | 100 | 100 | 100`. Anything below means an uncovered branch or statement — locate it in the report's "uncovered line ranges" column and write the test that exercises it.

Other components-level coverage (pages, components, utils): aim for meaningful behavioral coverage but no hard threshold.

## The optional-callback rule

The single most common reason coverage drops on these files is the optional-chain pattern:

```ts
options.onSomething?.(payload)
```

That line runs only when the caller actually passes the callback. A spec that omits it leaves the line uncovered — coverage stays at 100% today, then drops the next time someone touches the file.

Rule: every optional callback or option in a service's public API needs a test that **passes** it and asserts its effect.

```ts
it("invokes onCellProgress for each replication", async () => {
  const events: CellProgressInfo[] = []
  await service.runJob(baseJob({ sizes: [10] }), {
    onCellProgress: (info) => events.push(info),
  })
  expect(events.length).toBe(3) // 1×1×1×3 replications
  expect(events[0]).toMatchObject({ replication: 1, totalReplications: 3 })
})
```

Keep a separate test where the callback is **absent** (or add one) so the default path stays covered. The optional chain short-circuits there — without the absent-callback test, the branch around the chain ends up half-covered.

## When to bring in a brand-new dependency

If a test needs a feature jsdom doesn't ship (`ResizeObserver`, `IntersectionObserver`, `URL.createObjectURL`, etc.), stub it globally in the spec's `beforeEach`. Adding a polyfill to `setup.ts` should be a deliberate decision — global polyfills hide real bugs in other tests.

## Reading the coverage report

The summary table at the end is the at-a-glance check. For diagnosing a miss, the HTML report at `coverage/index.html` highlights the uncovered lines in red — fastest way to find which branch a test missed.
