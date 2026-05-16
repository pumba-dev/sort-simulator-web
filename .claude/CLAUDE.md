# sort-simulator-web

Vue 3 + TypeScript sorting algorithm simulator. Full spec in [docs/ERS.en-US.md](../docs/ERS.en-US.md).

## Output style

Be terse. Return the minimum that proves the task is done — `Done`, `Fixed`, `Added tests`, `Refactored worker`. Skip greetings, restated context, and verbose summaries. The user reads diffs; they do not need a recap of what changed unless they ask.

## Skills

Three skills cover the work in this repo. Claude triggers them automatically from their descriptions; this list exists so you know what is available without loading every SKILL.md.

- **coder** — any Vue/TypeScript code change in `src/` (components, composables, workers, services, algorithms, i18n, constants, routes).
- **test-writer** — creating or expanding Vitest tests for algorithms, services, workers, composables, components. Also the place to go when coverage drops or a spec fails.
- **algorithm-adder** — full integration checklist when adding a new sorting algorithm (algorithm file → registry → constants → i18n → SCSS → tests).
