# Service tests

Per-service test recipes for the critical-services list. Each section says what must be asserted and why — the why matters because it explains which past regression the test is guarding against.

## SeededPrng (`src/services/seeded-prng.ts`)

What to assert:

- **`deriveCellSeed(baseSeed, algo, scenario, size)` is deterministic** — same args produce the same seed every call. Different args produce different seeds. Without this, benchmark reproducibility is fiction.
- **Scenario generation:**
  - `crescente` with size `n` produces `[1, 2, …, n]`.
  - `decrescente` with size `n` produces `[n, …, 2, 1]`.
  - `aleatorio` with the same seed produces the same shuffled array every call (Fisher-Yates is deterministic given the PRNG).
- Different seeds produce different `aleatorio` arrays (otherwise the seed parameter is dead).

## BenchmarkService (`src/services/benchmark-service.ts`)

What to assert:

- **Reproducibility** — same `baseSeed` produces identical input arrays per cell/replication.
- **`onProgress` fires once per completed replication.** `total = algorithms × scenarios × sizes × replications`. Assert both the fire count and the final `total`.
- **`onCellProgress` fires at the start of each replication** with `{ algorithm, scenario, size, replication, totalReplications }`. Pass the callback and capture the events — the optional-chain line stays uncovered otherwise (see [coverage.md](coverage.md)).
- **Cancel via `AbortController`** stops execution. Assert no further progress fires after abort.
- **Per-replication timeout** — timed-out reps are counted in the cell's timeout count but do not block the rest of the job. The queue continues.
- **IQR outlier removal** — with ≥4 samples, outliers are excluded from the mean. With fewer samples, IQR trimming is skipped (means must stay finite, never `NaN`).

Pattern for the callback assertion (the trap-line — read [coverage.md](coverage.md) first):

```ts
it("invokes onCellProgress for each replication", async () => {
  const events: CellProgressInfo[] = []
  await service.runJob(baseJob({ sizes: [10], replications: 3 }), {
    onCellProgress: (info) => events.push(info),
  })
  expect(events.length).toBe(3) // 1×1×1×3 replications
  expect(events[0]).toMatchObject({ replication: 1, totalReplications: 3 })
})
```

## benchmarkReport (`src/services/benchmark-report.ts`)

What to assert:

- **CSV export contains the required section markers** (`# section:<name>` for each section). Without the markers, the parser can't split sections back out on import.
- **Round-trip integrity** — `generate(report)` → `parse(csv)` returns a `BenchmarkReport` whose `cells` / `rows` / `environment` deep-equal the original.
- **Enum values in CSV are locale-independent.** Switch `vue-i18n` to another locale and re-export — the enum cells (algorithm key, scenario type) must be identical to the en locale's output.

## ComparisonHistoryService (`src/services/comparison-history-service.ts`)

What to assert:

- **SSR guard** — instantiating the service when `window` is undefined must not throw and all read methods return safe empty values.
- **Persistence** — a saved entry survives a re-instantiation that reads `localStorage`.
- **History limit** — after `MAX_ENTRIES` entries (default 20), the oldest non-favorite is evicted on the next write.
- **Favorites preserved** — favorite entries survive eviction (eviction skips them and removes the next-oldest non-favorite).
- **Null/malformed storage** — if `localStorage` returns malformed JSON, the service does not throw. It treats the storage as empty and continues.
- **Pending config** — written to `sessionStorage` by `setPending` and read back correctly by `consumePending` (and cleared on consume).

## sortAlgorithmRegistry (`src/services/sort-algorithm-registry.ts`)

What to assert:

- **Every `AlgorithmKey` value is registered.** Use `Object.values(AlgorithmKey)` (or whatever the enum exposes) and check each key maps to an entry.
- **Each registered algorithm's `run` returns a valid `SortRunResult` shape:**
  - `finalArray` is an array
  - `comparisons` and `swaps` are numbers
  - `peakAuxBytes` is a number > 0
  - `aborted` is a boolean
  - `steps` is an array

This test is the single check that catches "I added a key to the enum and forgot to wire it up" — without it, the missing entry surfaces as a runtime crash in production.
