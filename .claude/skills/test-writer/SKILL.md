---
name: test-writer
description: >
  Use for creating or expanding Vitest tests in sort-simulator-web. Trigger on any request to
  write, add, fix, or cover tests — for algorithms, services, workers, composables, or
  components. Also trigger when coverage is missing, a critical-service file dropped below the
  100% threshold, or a spec is failing. Test files live under `__tests__/` mirroring the `src/`
  structure.
---

# Test writer

Vitest-based test authoring for `sort-simulator-web`. The repo uses v8 coverage with `100/100/100/100` thresholds on a critical-files list, so tests are not just smoke checks — they are how contracts on algorithms and services are enforced.

## Stack

- Vitest + @vue/test-utils + jsdom
- Coverage provider: v8 (`vitest.config.ts` enforces the thresholds)
- Test files live in `__tests__/`, mirroring `src/`. Spec filename pattern: `<unit>.spec.ts`.

## Before writing a test

1. Read the file under test in full — you can't assert on what you haven't seen.
2. Search `__tests__/` for an existing spec for this unit. Extend it if it exists; don't add a parallel file.
3. Confirm `vitest.config.ts` is present (it is — this is just the sanity check before adding new globs).
4. If testing a worker, export the internal functions you need for assertions (don't spin up real workers in tests).

## Decision tree

Pick the reference for what you're testing.

| What you're testing | Read |
|---------------------|------|
| Anything in `src/algorithms/**` | [references/algorithm-tests.md](references/algorithm-tests.md) |
| Critical services (`benchmark-service`, `comparison-history-service`, `seeded-prng`, `sort-algorithm-registry`, `benchmark-report`) | [references/service-tests.md](references/service-tests.md) |
| Vue components or pages | [references/component-tests.md](references/component-tests.md) |
| Need to stub storage, workers, or i18n | [references/mocks.md](references/mocks.md) |
| Hit the 100% threshold on a critical file | [references/coverage.md](references/coverage.md) |

## Universal test rules

These apply everywhere in the suite. They exist because the failure modes they prevent have already happened in this codebase.

- **One responsibility per `it` block.** A test that asserts five unrelated things hides which one broke.
- **Name tests by behavior, not by mechanism.** `"returns sorted array for descending input"` beats `"test sort"`. Future-you will scan failure output, not function names.
- **Reset state in `beforeEach`.** Never let state bleed between tests — they should pass in any order.
- **Prefer real implementations.** Mock only at boundaries (`localStorage`, workers, i18n). Mocking your own code under test produces tests that pass while the code is broken.
- **Extract `input` and `expected` into variables.** This makes intent visible and lets the assertion read like English.

  ```ts
  // Correct
  const input = [3, 1, 2]
  const expected = [1, 2, 3]
  expect(fn(input)).toEqual(expected)

  // Wrong — what is being asserted?
  expect(fn([3, 1, 2])).toEqual([1, 2, 3])
  ```

- **When testing for non-mutation, snapshot first, compare after.**

  ```ts
  const original = [...input]
  fn(input)
  expect(input).toEqual(original)
  ```

## Always for critical-service edits

After writing or editing tests for any of the files in [references/coverage.md](references/coverage.md), run:

```bash
npx vitest run <path-to-spec> --coverage
```

Confirm the target file shows `100 | 100 | 100 | 100` in the coverage table. Sub-100% coverage on critical files breaks CI later — fix it now while context is fresh.

## Final gate (mandatory)

After all tests pass, run `npm run build`. Fix any TypeScript errors before reporting done. A green test suite with a broken build is not done.
