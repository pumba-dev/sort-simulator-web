# i18n, styles, and docs

The user-visible side of the codebase: translations, SCSS, and the documentation conventions for business-logic files.

## i18n — update all three locales

Any user-visible string lives behind a key. There are three locale files and they must stay in sync — a key present in one but missing from another breaks the language switcher silently (the missing key renders as the key literal at runtime).

The three files:

- `src/i18n/locales/ptBR.ts`
- `src/i18n/locales/enUS.ts`
- `src/i18n/locales/esES.ts`

Workflow when adding a string:

1. Pick a key in the existing namespace tree (`learning.*`, `comparator.*`, `history.*`, `common.*`).
2. Add the key + translation to **all three** files in the same edit cycle.
3. Use it in the template via `{{ t('namespace.key') }}` or in script via `const { t } = useI18n(); t('namespace.key')`.

Never hardcode user-visible strings — not in templates, not in script, not in error messages thrown back to the UI. Internal log lines (console.warn for developers) are fine to leave in English.

## SCSS

Per-algorithm visual states live in partials under `src/styles/`. Naming: `_<algorithmName>.scss`. Import the partial in `src/styles/main.scss` so it's bundled.

Only add a new partial if the algorithm introduces a visual state not covered by the existing palette (active comparison, swap, sorted region, pivot, etc.). Most algorithms reuse the existing classes.

Component-scoped styles use `<style scoped lang="scss">` in the SFC — fine for component-private styling. Global step coloring should go in the styles directory so it can be shared.

## Documentation

Business-logic files (services, utils, workers, validators) get a brief file header so future readers understand the purpose without reading the implementation:

```ts
/**
 * Purpose:
 * Responsibility:
 * Main flow:
 */
```

Complex functions in those files get a function header:

```ts
/**
 * Purpose:
 * Input:
 * Output:
 * Business rules:
 */
```

Comments explain **why**, not what. Well-named identifiers already say what the code does — a comment that restates the name is noise.

Good:

```ts
/**
 * Calculates the benchmark average after IQR outlier removal.
 * Rule: never return an empty array; only trim when sample ≥ 4.
 */
```

Bad:

```ts
// increment i
i++
```

UI code (Vue templates, simple event handlers, layout components) doesn't need this — the template *is* the documentation. Reserve the headers for the load-bearing logic.
