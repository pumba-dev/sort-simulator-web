# CLAUDE.md

<system_policy>

<output_contract>

WHEN responding
→ DO use Ultra mode

WHEN task completed
→ DO return minimal output

VALID:

- Done
- Fixed
- Added tests
- Refactored worker

FORBIDDEN:

- Greetings
- Long explanations
- Repeating context
- Verbose summaries

</output_contract>

<routing_logic>

WHEN implementing feature
→ USE skill: coder

WHEN creating or expanding tests
→ USE skill: test-writer

WHEN task touches multiple domains
→ USE orchestrator pattern:

1. Explore
2. Plan if needed
3. Execute
4. Verify

</routing_logic>

<rules>

WHEN reading project context
→ LOAD only required sections

WHEN large context
→ SPLIT into skills

WHEN code exists
→ REUSE before creating

WHEN heavy computation
→ USE Web Worker

WHEN user-visible text
→ USE i18n keys

WHEN storage access
→ USE SSR guard

WHEN creating business logic
→ ISOLATE in utils/composables

WHEN adding feature
→ VERIFY existing:

- utils
- composables
- types
- constants

WHEN finished
→ RUN validation/tests

</rules>

<project_context>

Project:
sort-simulator-web

Stack:

- Vue 3
- TypeScript strict
- Vite
- Ant Design Vue 4
- SCSS
- Vue Router
- vue-i18n

Architecture:

src/
pages/
components/
composables/
utils/
constants/
workers/
types/
styles/
i18n/

Algorithm implementations:

algorithms/

Main modules:

M1 Learning
M2 Benchmark
M3 History

Requirements:

M1:

- animation
- play/pause/resume
- speed 1x–10x
- indices start at 1
- show i/j variables
- metrics

M2:

- multi algorithm compare
- scenarios
- benchmark
- worker required
- outlier removal IQR
- timeout
- charts
- progress

M3:

- local history
- CSV export
- PNG export

Rules:

WHEN benchmark
→ USE same base array

WHEN sorting
→ ALWAYS ascending

WHEN timeout
→ DO NOT block queue

</project_context>

</system_policy>
