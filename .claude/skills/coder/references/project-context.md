# Project context

Quick reference for project structure and conventions. The authoritative spec is [docs/ERS.en-US.md](../../../../docs/ERS.en-US.md); this file exists so you do not have to load 347 lines of SRS just to remember where pages live.

## Stack

- Vue 3 + TypeScript (strict mode)
- Vite build
- Ant Design Vue 4 — UI components
- SCSS (per-algorithm partials under `src/styles/`)
- Vue Router 4
- vue-i18n (3 locales: ptBR, enUS, esES)
- Chart.js + vue-chartjs (with `chartjs-plugin-zoom`)
- jsPDF (lazy import) for PDF export
- Web Workers — module workers, one orchestrator + per-run sub-workers
- Vitest + @vue/test-utils + jsdom

## Directory map

```
src/
├── algorithms/      # one file per sort, default-export the run function
├── pages/           # PascalCasePage.vue, one per route
├── components/      # PascalCase.vue, reusable UI
├── composables/     # use-kebab-case.ts, shared composition logic
├── workers/         # name.worker.ts (comparator.worker, sort.worker)
├── services/        # class-pattern services
├── utils/           # kebab-case.ts, pure functions
├── constants/       # enums, presets, learning metadata
├── types/           # shared interfaces (sort-types, comparator, etc.)
├── styles/          # SCSS partials + main.scss entry
├── i18n/locales/    # ptBR.ts, enUS.ts, esES.ts
└── router/          # index.ts
```

## File naming

- Pages: `PascalCasePage.vue` → `src/pages/`
- Components: `PascalCase.vue` → `src/components/`
- Composables: `use-kebab-case.ts` → `src/composables/`
- Workers: `name.worker.ts` → `src/workers/`
- Utils: `kebab-case.ts` → `src/utils/`
- Services: `kebab-case-service.ts` → `src/services/`

## The three modules

| Module | Route | Purpose |
|--------|-------|---------|
| M1 Learning | `/aprendizado` | Step-by-step animation of one algorithm; play/pause/resume, speed 1×–10×, indices start at 1, shows internal variables (i/j/pivot), basic metrics |
| M2 Comparator | `/comparador` | Run benchmarks across algorithms × scenarios × sizes × replications; off the main thread; outlier removal (IQR 1.5×); per-replication timeout; charts; progress streaming |
| M3 History | `/historico` | Local persistence of past runs; CSV/PDF/MD export; PNG chart export; CSV import; reopen config in Comparator |

## Vue component template

Always use `<script setup lang="ts">`. Never the Options API or `defineComponent`.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const count = ref(0)
</script>

<template>
  <button @click="count++">{{ t('common.click') }} ({{ count }})</button>
</template>
```

## Domain invariants

- Sorting is always **ascending**. There is no descending mode.
- In benchmarks, all algorithms in the same cell receive the **same base input array** per replication (fairness).
- Timeout-aborted runs must not block the queue — record them and move on.
- History eviction policy: when `MAX_ENTRIES` (default 20) is hit or storage quota is exceeded, drop the oldest non-favorite first.
