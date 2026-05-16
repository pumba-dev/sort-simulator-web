# Mocks

The repo's policy is "prefer real implementations, mock only at boundaries". The boundaries are: browser storage, Web Workers, and i18n. Everything else (algorithms, services, utils) should be exercised directly.

## localStorage / sessionStorage

Use a per-test in-memory object. The pattern below works in Vitest with `vi.stubGlobal`:

```ts
import { beforeEach, vi } from 'vitest'

let store: Record<string, string>

beforeEach(() => {
  store = {}
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { store = {} },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length },
  })
})
```

For tests that need to simulate quota errors, throw from `setItem` after a threshold:

```ts
const quotaStore = {
  setItem: () => { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e },
  // ...
}
```

## Web Workers

Never spin up a real worker in a test — they're flaky, slow, and the harness has to bundle separately. Mock the `Worker` constructor:

```ts
const sent: unknown[] = []
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null
  postMessage(data: unknown) { sent.push(data) }
  terminate() {}
}
vi.stubGlobal('Worker', MockWorker)
```

If the code under test needs to receive a message back, expose a way to fire `onmessage` from the test:

```ts
const worker = new (window as any).Worker()
worker.onmessage?.(new MessageEvent('message', { data: { type: 'progress', value: 0.5 } }))
```

For services that own worker lifecycle (creating, sending, terminating), assert the messages sent and the termination call — that's the observable contract.

## i18n

Two strategies depending on what you're testing:

**Real `vue-i18n` with a minimal message set** — preferred when the test asserts rendered text:

```ts
import { createI18n } from 'vue-i18n'

const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  messages: {
    'en-US': { learning: { play: 'Play' } },
  },
})
```

**Key-passthrough stub** — when the test only cares that *some* translated string was rendered, not which one:

```ts
const i18nStub = {
  install(app: App) {
    app.config.globalProperties.$t = (key: string) => key
    app.provide('useI18n', { t: (k: string) => k })
  },
}
```

## What not to mock

- **Algorithms.** They're pure, fast, deterministic — call them directly.
- **`SeededPrng`.** Deterministic by design — mocking it defeats the test.
- **`BenchmarkService` internals.** When testing the service, exercise the real class. When testing a component that *uses* the service, inject a fake at the call site (e.g., pass a stub function) — don't `vi.mock()` the module.

The general rule: mock what crosses the process / DOM boundary, exercise what stays in JS.
