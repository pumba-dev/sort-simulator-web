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


WHEN creating service
→ ALWAYS use class


FORBIDDEN:
- standalone functions
- exported loose methods
- utility-style service files


REQUIRED:

export class ExampleService {

  public execute(): Result {
    return this.validate()
  }

  private validate(): Result {
    ...
  }
}


WHEN service has internal steps
→ SPLIT logic into private methods


WHEN exposing service API
→ EXPOSE only public methods


WHEN service logic grows
→ EXTRACT internal behavior to additional private methods


WHEN creating business logic
→ DOCUMENT file and functions


APPLIES TO:
- services
- utils
- workers
- validators
- adapters
- business/domain logic


FILE HEADER REQUIRED:

/**
 * Purpose:
 * Responsibility of file
 * Main flow or business context
 */


FUNCTION HEADER REQUIRED:

/**
 * Purpose:
 * Input:
 * Output:
 * Business rules:
 */


WHEN function has complex behavior
→ EXPLAIN:
- invariants
- side effects
- edge cases
- constraints


WHEN workaround exists
→ EXPLAIN WHY


WHEN component/UI code
→ DO NOT add verbose comments


WHEN comment
→ EXPLAIN WHY not WHAT


GOOD:

/**
 * Calculates benchmark average after IQR outlier removal.
 *
 * Rules:
 * - Never return empty array
 * - Ignore outliers only with sample >=4
 */

private removeOutliersIqr(...)


BAD:

// increment i
i++

</rules>
<pre_execution>

1 search utils
2 search composables
3 search types
4 search constants

reuse > create

</pre_execution>
