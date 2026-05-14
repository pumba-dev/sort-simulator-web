---
name: coder
description: Implement features, components, composables, workers and algorithms
---

# Skill: Coder

<rules>

WHEN creating Vue component
→ USE:

<script setup lang="ts">

WHEN naming files
→ USE:

pages:
PascalCase + Page

components:
PascalCase

composables:
use-kebab-case

workers:
*.worker.ts

utils:
kebab-case

WHEN adding visible text
→ UPDATE:
- ptBR
- enUS
- esES

WHEN creating storage logic
→ ADD:

if(typeof window==='undefined')

WHEN computation heavy
→ MOVE to worker

WHEN comments
→ DO NOT write comments

EXCEPTION:
WHY not obvious

WHEN worker
→ INCLUDE:

/// <reference lib="webworker"/>

WHEN creating composable
→ RETURN:
state
derived
actions

</rules>


<algorithm_flow>

WHEN adding algorithm

1 create:
algorithms/<name>Sort.js

2 update:
AlgorithmKey

3 update:
learningAlgorithms

4 update:
comparator.worker.ts

5 add:
styles/_algorithm.scss

6 add i18n

</algorithm_flow>


<pre_execution>

1 search utils
2 search composables
3 search types
4 search constants

reuse > create

</pre_execution>
