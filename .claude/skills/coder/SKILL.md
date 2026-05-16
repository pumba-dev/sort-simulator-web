---
name: coder
description: >
  Use for any Vue/TypeScript code task in sort-simulator-web — implementing features, adding
  components, creating composables, building Web Workers, adding or editing services, working on
  sorting algorithms, editing i18n locales, updating constants, or wiring routes. Trigger on any
  code change inside `src/`, even small ones. If the task touches TypeScript or Vue code in this
  project, this skill applies.
---

# Coder

This is the main entry point for engineering work in `sort-simulator-web`. The repo has hard rules around reuse, i18n, storage safety, off-main-thread computation, and 100% coverage on a short list of critical files — most regressions come from violating one of those. Keep this file lean and pull the relevant reference when the task hits its domain.

## Before writing anything new

Search in this order — reusing what exists is cheaper than introducing a parallel implementation that drifts later:

1. `src/utils/` — pure shared functions
2. `src/composables/` — shared Vue composition logic
3. `src/types/` — existing interfaces
4. `src/constants/` — existing enums and config values

If a similar helper already exists, extend it instead of adding a sibling.

## Decision tree

Pick the reference for your task. Load only what you need.

| Task | Read |
|------|------|
| Need project structure, modules, file naming, requirements | [references/project-context.md](references/project-context.md) |
| Touching `src/algorithms/**`, `benchmark-service`, `comparison-history-service`, `seeded-prng`, `sort-algorithm-registry` | [references/critical-services.md](references/critical-services.md) |
| Implementing or modifying a sorting algorithm function | [references/algorithm-contract.md](references/algorithm-contract.md) |
| Writing a service class, adding storage access, deciding worker vs main thread | [references/services-pattern.md](references/services-pattern.md) |
| Adding user-visible text, new SCSS, or business-logic file headers | [references/i18n-and-style.md](references/i18n-and-style.md) |
| Adding a brand-new sorting algorithm (touches 6 files) | Use the `algorithm-adder` skill instead — it covers the full integration |
| Writing or fixing tests | Use the `test-writer` skill |

## Non-negotiables (apply to every task)

- **Triple-locale rule** — every user-visible string lives behind a key in `src/i18n/locales/ptBR.ts`, `enUS.ts`, and `esES.ts`. Never hardcode strings in templates or scripts; missing locale entries break the language switcher silently.
- **SSR guard on storage** — every `localStorage`/`sessionStorage` access must early-return when `window` is undefined. The app is SSR-safe by guard, not by build. See `src/services/comparison-history-service.ts` for the canonical pattern.
- **Heavy computation off the main thread** — benchmark runs, batch sorts, anything CPU-bound goes in a worker. Freezing the UI is the main UX risk this codebase is designed to avoid.
- **Critical-service coverage stays at 100%** — `vitest.config.ts` enforces this on the files listed in `references/critical-services.md`. Optional callbacks (`opts.cb?.()`) only execute when the caller actually passes the callback, so a test that omits it leaves the optional-chain line uncovered. Always add a test that passes any new callback and asserts its effect.
- **Finish with the right validation** — type-check (`npx vue-tsc --noEmit`), run the spec for whatever you touched, and run `npx vitest run <spec> --coverage` on critical-service edits.
- **Documentation check** — after any code change, verify whether the following docs need updating: `docs/ERS.en-US.md`, `docs/ERS.md`, `README.en-US.md`, `README.md`. Update them when the change adds or removes: a `ScenarioType` value, an `AlgorithmKey`, a public service method, a `CompareJob` field, a benchmark metric, or any user-visible feature/configuration option. Keep both language versions in sync.
