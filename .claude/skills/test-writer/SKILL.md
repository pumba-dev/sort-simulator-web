---
name: test-writer
description: Create Vitest tests for sort-simulator-web
---

# Skill: Test Writer

<stack>

Vitest
@vue/test-utils
jsdom

</stack>

<local>

/**tests**

</local>

<rules>

WHEN creating tests
→ PRIORITIZE:

1 utils
2 workers
3 composables
4 components

WHEN writing expect
→ EXTRACT:

const input=
const expected=

FORBIDDEN:

expect(fn([1,2])).toEqual([2])

USE:

const input=[1,2]
const expected=[2]

expect(fn(input))
.toEqual(expected)

WHEN testing mutation
→ snapshot copy

WHEN naming test
→ DESCRIBE behavior

WHEN test
→ ONE responsibility

WHEN resetting state
→ USE beforeEach

WHEN possible
→ TEST real implementation

DO NOT mock unnecessarily

</rules>

<mocks>

WHEN localStorage

→ stub localStorage

WHEN worker

→ mock worker constructor

WHEN i18n

→ use createI18n
or simple stub

</mocks>

<coverage>

100% coverage for:

general:

algorithms
services
workers
utils
composables

components:

render
events
props
slots

</coverage>

<pre_execution>

1 read target
2 search existing spec
3 verify vitest installed
4 export worker internals if needed

</pre_execution>
