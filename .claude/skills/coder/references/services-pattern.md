# Services, storage, workers

How to structure service code, where to put computation, and how to keep storage access SSR-safe.

## Service class pattern

Services are classes, not modules of standalone functions. The class boundary keeps state encapsulated, makes mocking in tests easy, and gives every service a clear public surface.

```ts
export class ExampleService {
  public execute(input: Input): Result {
    return this.validate(input)
  }

  private validate(input: Input): Result {
    // internal step
  }
}
```

Rules:

- Default-export the class. Consumers `new` it (or hold a singleton if the service is stateless).
- Public methods are the API. Internal steps live in private methods — split aggressively, name them by what they do, keep each one small.
- Don't export standalone "service-style" functions next to the class. The whole point of the class pattern is one entry point.
- Pure helpers that have nothing to do with the service's state go in `src/utils/`, not on the class.

Cross-reference: `BenchmarkService`, `ComparisonHistoryService`, `SeededPrng` all follow this shape.

## Heavy computation → Web Worker

The Comparator is designed around the assumption that the main thread never blocks. Benchmark runs, batch sorts, and any CPU-bound work belong in a worker.

Existing workers:

- `src/workers/comparator.worker.ts` — orchestrator. Receives the `CompareJob`, streams progress and results.
- `src/workers/sort.worker.ts` — per-run sub-worker, one spun up per cell so cancellation is bulletproof.

Adding new computation that may take more than a frame? Put it in a worker. Don't reach for `requestIdleCallback` or `setTimeout` chunking — those don't survive large jobs and they're harder to cancel.

## Storage SSR guard

Every `localStorage` and `sessionStorage` access must early-return when `window` is undefined. The app does not actually run in SSR today, but the tests do (jsdom-less SSR-like setups), and the guard is also what keeps the service from throwing during module evaluation in worker contexts.

Canonical pattern (see `src/services/comparison-history-service.ts`):

```ts
public load(): Entry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
```

Two things to copy:

1. The `typeof window === 'undefined'` early return.
2. The `try/catch` around `JSON.parse` — storage can hold malformed strings (user tampered, version mismatch), and a throw here would brick the service.

Quota handling for writes follows the same shape — try, catch the quota error, evict the oldest non-favorite, retry once. See the existing implementation; don't re-derive it.

## Composables for business logic

Anything stateful that's shared across components belongs in a composable (`use-*.ts`), not in a component. Components stay thin: render, emit, delegate state to the composable. The composable returns refs/computeds/functions; the component wires them to templates.

If the logic is purely pure (no Vue refs), put it in `src/utils/` instead — composables earn their `setup`-time cost only when there's reactive state involved.
