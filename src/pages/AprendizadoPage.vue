<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  learningAlgorithms,
  learningByKey,
} from "../constants/learningAlgorithms";
import type { AlgorithmKey, ScenarioType } from "../types/comparator";
// @ts-ignore
import bubbleSort from "../../algorithms/bubbleSort";
// @ts-ignore
import insertionSort from "../../algorithms/inserctionSort";
// @ts-ignore
import mergeSort from "../../algorithms/mergeSort";
// @ts-ignore
import heapSort from "../../algorithms/heapSort";
// @ts-ignore
import quickSort from "../../algorithms/quickSort";

type InputMode = "gerado" | "manual";

type AnimationStep = {
  values: number[];
  activeIndexes: number[];
  pivotIndex: number | null;
  comparisons: number;
  swaps: number;
  variables: Record<string, number | null>;
  // Algorithm-specific visualization data
  gapIndex?: number | null; // insertion sort
  divisions?: number[][]; // merge sort: arrays being divided
  divisionDepth?: number; // merge sort: recursion depth
  merging?: { start: number; end: number }; // merge sort: range being merged
  heapifyRegion?: { start: number; end: number }; // heap sort: region being heapified
  partitionIndex?: number | null; // quick sort: pivot final position
  sortedPartition?: { start: number; end: number }; // bubble sort: already sorted region
};

type PseudoTokenKind =
  | "plain"
  | "space"
  | "keyword"
  | "operator"
  | "array"
  | "number"
  | "routine";

type PseudoToken = {
  value: string;
  kind: PseudoTokenKind;
};

const pseudoKeywords = new Set([
  "function",
  "procedure",
  "for",
  "to",
  "downto",
  "if",
  "then",
  "else",
  "while",
  "return",
  "and",
  "or",
  "not",
  "break",
]);

const pseudoOperators = new Set([
  "<-",
  "!=",
  "<=",
  ">=",
  "<",
  ">",
  "=",
  "+",
  "-",
  "*",
  "/",
  "..",
]);

const pseudoRoutines = new Set([
  "INSERTION-SORT",
  "BUBBLE-SORT",
  "MERGE-SORT",
  "MERGE",
  "BUILD-MAX-HEAP",
  "MAX-HEAPIFY",
  "HEAP-SORT",
  "QUICK-SORT",
  "PARTITION",
]);

const tokenizePseudoLine = (line: string): PseudoToken[] => {
  if (!line) {
    return [{ value: " ", kind: "space" }];
  }

  const tokens = line.match(
    /[A-Za-z][A-Za-z0-9_]*\[[^\]]+\]|[A-Za-z]+(?:-[A-Za-z]+)?|\d+|!=|<=|>=|<-|\.{2}|[(),:+*/=-]|\s+|\S/g,
  ) ?? [line];

  return tokens.map((token) => {
    if (/^\s+$/.test(token)) {
      return { value: token, kind: "space" };
    }

    if (/^[A-Za-z][A-Za-z0-9_]*\[[^\]]+\]$/.test(token)) {
      return { value: token, kind: "array" };
    }

    if (/^\d+$/.test(token)) {
      return { value: token, kind: "number" };
    }

    if (pseudoOperators.has(token)) {
      return { value: token, kind: "operator" };
    }

    const normalized = token.toLowerCase();
    if (pseudoKeywords.has(normalized)) {
      return { value: token, kind: "keyword" };
    }

    if (pseudoRoutines.has(token)) {
      return { value: token, kind: "routine" };
    }

    return { value: token, kind: "plain" };
  });
};

const { t, tm } = useI18n();

const getPseudoTips = (algorithm: AlgorithmKey): string[] => {
  const localizedTips = tm(learningByKey[algorithm].pseudoTipsKey);
  if (!Array.isArray(localizedTips)) {
    return [];
  }

  return localizedTips.map((item) => String(item));
};

const describePseudoLine = (
  algorithm: AlgorithmKey,
  line: string,
  lineIndex: number,
): string => {
  const tips = getPseudoTips(algorithm);
  if (tips && tips[lineIndex]) {
    return tips[lineIndex];
  }

  if (!line.trim()) {
    return t("learning.pseudoTips.separator");
  }

  const algorithmTitle = t(
    learningByKey[algorithm]?.titleKey ?? "common.algorithms.insertion",
  );
  return t("learning.pseudoTips.fallbackStep", {
    step: lineIndex + 1,
    algorithm: algorithmTitle,
  });
};

const selectedAlgorithm = ref<AlgorithmKey>("insertion");
const inputMode = ref<InputMode>("gerado");
const generatedScenario = ref<ScenarioType>("aleatorio");
const MAX_VISUALIZATION_SIZE = 30;
const generatedSize = ref<number>(10);
const manualVectorText = ref<string>("8, 4, 6, 1, 3, 9, 2, 7");
const speed = ref<number>(3);

const manualVectorFormatRegex = /^\s*-?\d+(?:(?:\s*[,;]\s*|\s+)-?\d+)*\s*$/;

const steps = ref<AnimationStep[]>([]);
const currentStepIndex = ref<number>(0);
const comparisons = ref<number>(0);
const swaps = ref<number>(0);
const elapsedMs = ref<number>(0);
const isPlaying = ref<boolean>(false);
const hasPlaybackStarted = ref<boolean>(false);
const playbackStartedAt = ref<number | null>(null);

let timerId: number | null = null;

const scenarioLabelByKey = computed<Record<ScenarioType, string>>(() => {
  return {
    crescente: t("common.scenarios.crescente"),
    decrescente: t("common.scenarios.decrescente"),
    aleatorio: t("common.scenarios.aleatorio"),
  };
});

const selectedMetadata = computed(() => {
  return learningByKey[selectedAlgorithm.value];
});

const selectedPseudocodeLines = computed<string[]>(() => {
  const localizedLines = tm(selectedMetadata.value.pseudocodeKey);
  if (!Array.isArray(localizedLines)) {
    return [];
  }

  return localizedLines.map((item) => String(item));
});

const bars = computed(() => {
  const currentStep = steps.value[currentStepIndex.value];
  return currentStep ? currentStep.values : [];
});

const activeIndexes = computed(() => {
  const currentStep = steps.value[currentStepIndex.value];
  return currentStep ? currentStep.activeIndexes : [];
});

const pivotIndex = computed(() => {
  const currentStep = steps.value[currentStepIndex.value];
  return currentStep ? currentStep.pivotIndex : null;
});

const gapIndex = computed(() => {
  const currentStep = steps.value[currentStepIndex.value];
  return currentStep ? (currentStep.gapIndex ?? null) : null;
});

const sortedPartition = computed(() => {
  const currentStep = steps.value[currentStepIndex.value];
  return currentStep ? (currentStep.sortedPartition ?? null) : null;
});

const heapifyRegion = computed(() => {
  const currentStep = steps.value[currentStepIndex.value];
  return currentStep ? (currentStep.heapifyRegion ?? null) : null;
});

const merging = computed(() => {
  const currentStep = steps.value[currentStepIndex.value];
  return currentStep ? (currentStep.merging ?? null) : null;
});

const partitionIndex = computed(() => {
  const currentStep = steps.value[currentStepIndex.value];
  return currentStep ? (currentStep.partitionIndex ?? null) : null;
});

const currentStep = computed(() => {
  return steps.value[currentStepIndex.value] ?? null;
});

const maxBarValue = computed(() => {
  const source = bars.value;
  if (source.length === 0) {
    return 1;
  }
  return Math.max(...source);
});

const progressPercent = computed(() => {
  if (steps.value.length <= 1) {
    return 0;
  }
  return Math.round((currentStepIndex.value / (steps.value.length - 1)) * 100);
});

const displayIndex = (index: number | null | undefined): number | string => {
  if (index === null || index === undefined) {
    return "—";
  }

  return index + 1;
};

const displayBubbleNMinusI = (
  outerIndex: number | null | undefined,
): number | string => {
  if (outerIndex === null || outerIndex === undefined) {
    return "—";
  }

  return Math.max(0, bars.value.length - (outerIndex + 1));
};

const manualVectorValidationMessage = computed(() => {
  if (inputMode.value !== "manual") {
    return "";
  }

  const trimmedInput = manualVectorText.value.trim();
  if (trimmedInput.length === 0) {
    return t("learning.validation.manualEmpty");
  }

  if (!manualVectorFormatRegex.test(trimmedInput)) {
    return t("learning.validation.manualInvalid");
  }

  const valuesCount = trimmedInput.split(/[\s,;]+/).filter(Boolean).length;
  if (valuesCount < 2) {
    return t("learning.validation.manualMinValues");
  }

  return "";
});

const hasValidManualVector = computed(() => {
  return manualVectorValidationMessage.value.length === 0;
});

const canPrepare = computed(() => {
  return (
    !isPlaying.value &&
    (inputMode.value !== "manual" || hasValidManualVector.value)
  );
});

const canStart = computed(() => {
  return (
    steps.value.length > 0 &&
    !isPlaying.value &&
    !hasPlaybackStarted.value &&
    (inputMode.value !== "manual" || hasValidManualVector.value)
  );
});

const canPause = computed(() => {
  return isPlaying.value && hasPlaybackStarted.value;
});

const canContinue = computed(() => {
  return (
    !isPlaying.value &&
    hasPlaybackStarted.value &&
    currentStepIndex.value < steps.value.length - 1 &&
    steps.value.length > 0
  );
});

const canStepBackward = computed(() => {
  return (
    !isPlaying.value &&
    hasPlaybackStarted.value &&
    currentStepIndex.value > 0 &&
    steps.value.length > 0
  );
});

const canStepForward = computed(() => {
  return (
    !isPlaying.value &&
    hasPlaybackStarted.value &&
    currentStepIndex.value < steps.value.length - 1 &&
    steps.value.length > 0
  );
});

const canReset = computed(() => {
  return steps.value.length > 0;
});

const statusText = computed(() => {
  if (steps.value.length === 0) {
    return t("learning.status.readyPrepare");
  }
  if (!hasPlaybackStarted.value) {
    return t("learning.status.readyStart");
  }
  if (isPlaying.value) {
    return t("learning.status.running");
  }
  if (currentStepIndex.value >= steps.value.length - 1) {
    return t("learning.status.completed");
  }
  return t("learning.status.paused");
});

const delayMs = computed(() => {
  const normalized = Math.max(1, Math.min(speed.value, 10));
  return 800 - normalized * 65;
});

const stopTimer = (): void => {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
};

const syncMetricsWithCurrentStep = (): void => {
  const current = steps.value[currentStepIndex.value];
  comparisons.value = current?.comparisons ?? 0;
  swaps.value = current?.swaps ?? 0;
};

const createArrayByScenario = (
  size: number,
  scenario: ScenarioType,
): number[] => {
  if (scenario === "crescente") {
    return Array.from({ length: size }, (_, index) => index + 1);
  }

  if (scenario === "decrescente") {
    return Array.from({ length: size }, (_, index) => size - index);
  }

  // Aleatorio: create array with unique numbers from 1 to size, then shuffle
  const arr = Array.from({ length: size }, (_, index) => index + 1);
  // Fisher-Yates shuffle algorithm
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const parseManualValues = (): number[] => {
  if (!hasValidManualVector.value) {
    return [];
  }

  const parsed = manualVectorText.value
    .split(/[\s,;]+/)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));

  return parsed.slice(0, MAX_VISUALIZATION_SIZE);
};

const handleManualVectorInput = (value: string): void => {
  manualVectorText.value = value.replace(/[^0-9,;\s-]/g, "");
};

const buildAnimationSteps = (baseVector: number[]): AnimationStep[] => {
  // Select and execute the appropriate algorithm
  let algorithmSteps: AnimationStep[] = [];

  switch (selectedAlgorithm.value) {
    case "bubble":
      algorithmSteps = bubbleSort(baseVector).steps;
      break;
    case "insertion":
      algorithmSteps = insertionSort(baseVector).steps;
      break;
    case "merge":
      algorithmSteps = mergeSort(baseVector).steps;
      break;
    case "heap":
      algorithmSteps = heapSort(baseVector).steps;
      break;
    case "quick":
      algorithmSteps = quickSort(baseVector).steps;
      break;
    default:
      algorithmSteps = bubbleSort(baseVector).steps;
  }

  // Ensure we always have at least one step
  if (algorithmSteps.length === 0) {
    algorithmSteps = [
      {
        values: [...baseVector],
        activeIndexes: [],
        pivotIndex: null,
        comparisons: 0,
        swaps: 0,
        variables: { i: null, j: null },
      },
    ];
  }

  return algorithmSteps;
};

const prepareSimulation = (): void => {
  stopTimer();
  isPlaying.value = false;
  playbackStartedAt.value = null;

  if (inputMode.value === "manual" && !hasValidManualVector.value) {
    steps.value = [];
    currentStepIndex.value = 0;
    hasPlaybackStarted.value = false;
    syncMetricsWithCurrentStep();
    elapsedMs.value = 0;
    return;
  }

  const sourceVector =
    inputMode.value === "manual"
      ? parseManualValues()
      : createArrayByScenario(
          Math.min(generatedSize.value, MAX_VISUALIZATION_SIZE),
          generatedScenario.value,
        );

  const fallbackVector =
    sourceVector.length > 1 ? sourceVector : [5, 1, 4, 2, 3];
  steps.value = buildAnimationSteps(fallbackVector);
  currentStepIndex.value = 0;
  hasPlaybackStarted.value = false;
  syncMetricsWithCurrentStep();
  elapsedMs.value = 0;
};

const advanceOneStep = (): void => {
  if (currentStepIndex.value >= steps.value.length - 1) {
    stopTimer();
    isPlaying.value = false;
    if (playbackStartedAt.value !== null) {
      elapsedMs.value = Math.round(performance.now() - playbackStartedAt.value);
    }
    return;
  }

  currentStepIndex.value += 1;
  syncMetricsWithCurrentStep();
};

const startSimulation = (): void => {
  if (inputMode.value === "manual" && !hasValidManualVector.value) {
    return;
  }

  if (steps.value.length === 0) {
    prepareSimulation();
  }

  stopTimer();
  isPlaying.value = true;
  hasPlaybackStarted.value = true;

  if (playbackStartedAt.value === null) {
    playbackStartedAt.value = performance.now() - elapsedMs.value;
  }

  timerId = window.setInterval(() => {
    advanceOneStep();
  }, delayMs.value);
};

const pauseSimulation = (): void => {
  if (!isPlaying.value) {
    return;
  }

  stopTimer();
  isPlaying.value = false;

  if (playbackStartedAt.value !== null) {
    elapsedMs.value = Math.round(performance.now() - playbackStartedAt.value);
  }
};

const continueSimulation = (): void => {
  if (canContinue.value) {
    startSimulation();
  }
};

const stepBackwardSimulation = (): void => {
  if (!canStepBackward.value) {
    return;
  }

  currentStepIndex.value -= 1;
  syncMetricsWithCurrentStep();
};

const stepForwardSimulation = (): void => {
  if (!canStepForward.value) {
    return;
  }

  currentStepIndex.value += 1;
  syncMetricsWithCurrentStep();
};

const resetSimulation = (): void => {
  stopTimer();
  isPlaying.value = false;
  currentStepIndex.value = 0;
  hasPlaybackStarted.value = false;
  syncMetricsWithCurrentStep();
  elapsedMs.value = 0;
  playbackStartedAt.value = null;
};

const regenerateVector = (): void => {
  prepareSimulation();
};

watch(speed, () => {
  if (isPlaying.value) {
    startSimulation();
  }
});

watch([selectedAlgorithm, generatedScenario, generatedSize], () => {
  // Automatically regenerate vector when algorithm, scenario, or size changes
  prepareSimulation();
});

onBeforeUnmount(() => {
  stopTimer();
});

prepareSimulation();
</script>

<template>
  <div class="page-wrap">
    <section class="page-card page-card--hero">
      <h2 class="page-card__title">{{ t("learning.hero.title") }}</h2>
      <p class="page-card__description">
        {{ t("learning.hero.description") }}
      </p>
    </section>

    <section class="aprendizado-grid">
      <div class="aprendizado-grid__left">
        <article class="page-card">
          <h3 class="page-card__title">
            {{ t("learning.sections.configuration") }}
          </h3>
          <a-form layout="vertical">
            <a-form-item>
              <template #label>
                <a-tooltip :title="t('learning.tooltips.configAlgorithm')">
                  <span>{{ t("learning.form.algorithm") }}</span>
                </a-tooltip>
              </template>
              <a-select
                v-model:value="selectedAlgorithm"
                :disabled="isPlaying"
                :options="
                  learningAlgorithms.map((item) => ({
                    value: item.key,
                    label: t(item.titleKey),
                  }))
                "
              />
            </a-form-item>

            <a-form-item>
              <template #label>
                <a-tooltip :title="t('learning.tooltips.configInputType')">
                  <span>{{ t("learning.form.inputType") }}</span>
                </a-tooltip>
              </template>
              <a-radio-group v-model:value="inputMode" :disabled="isPlaying">
                <a-radio-button value="gerado">{{
                  t("learning.form.generated")
                }}</a-radio-button>
                <a-radio-button value="manual">{{
                  t("learning.form.manual")
                }}</a-radio-button>
              </a-radio-group>
            </a-form-item>

            <template v-if="inputMode === 'gerado'">
              <a-form-item>
                <template #label>
                  <a-tooltip :title="t('learning.tooltips.configScenario')">
                    <span>{{ t("learning.form.scenario") }}</span>
                  </a-tooltip>
                </template>
                <a-segmented
                  v-model:value="generatedScenario"
                  :disabled="isPlaying"
                  :options="[
                    { value: 'crescente', label: scenarioLabelByKey.crescente },
                    {
                      value: 'decrescente',
                      label: scenarioLabelByKey.decrescente,
                    },
                    { value: 'aleatorio', label: scenarioLabelByKey.aleatorio },
                  ]"
                />
              </a-form-item>

              <a-form-item>
                <template #label>
                  <a-tooltip :title="t('learning.tooltips.configSize')">
                    <span>{{
                      t("learning.form.sizeVisualization", {
                        max: MAX_VISUALIZATION_SIZE,
                      })
                    }}</span>
                  </a-tooltip>
                </template>
                <a-slider
                  v-model:value="generatedSize"
                  :disabled="isPlaying"
                  :min="8"
                  :max="30"
                  :step="1"
                />
              </a-form-item>
            </template>

            <a-form-item
              v-else
              :validate-status="
                manualVectorValidationMessage ? 'error' : undefined
              "
              :help="
                manualVectorValidationMessage || t('learning.form.manualHelp')
              "
            >
              <template #label>
                <a-tooltip :title="t('learning.tooltips.configManualVector')">
                  <span>{{ t("learning.form.manualVector") }}</span>
                </a-tooltip>
              </template>
              <a-textarea
                :value="manualVectorText"
                :disabled="isPlaying"
                :rows="4"
                @update:value="handleManualVectorInput"
              />
            </a-form-item>

            <a-space>
              <a-button
                type="default"
                :disabled="!canPrepare"
                @click="regenerateVector"
                >{{ t("learning.form.prepare") }}</a-button
              >
            </a-space>
          </a-form>
        </article>

        <article class="page-card">
          <h3 class="page-card__title">
            {{ t("learning.sections.controls") }}
          </h3>
          <a-form layout="vertical">
            <a-form-item>
              <template #label>
                <a-tooltip :title="t('learning.tooltips.controlsSpeed')">
                  <span>{{ t("learning.form.speed") }}</span>
                </a-tooltip>
              </template>
              <div class="learning-speed-control">
                <a-slider
                  v-model:value="speed"
                  :min="1"
                  :max="10"
                  :step="1"
                  class="learning-speed-control__slider"
                />
                <span class="learning-speed-control__value">{{ speed }}x</span>
              </div>
            </a-form-item>
          </a-form>

          <a-space v-if="!hasPlaybackStarted" wrap>
            <a-tooltip :title="t('learning.tooltips.controlsStart')">
              <a-button
                type="primary"
                :disabled="!canStart"
                @click="startSimulation"
                >{{ t("learning.form.start") }}</a-button
              >
            </a-tooltip>
          </a-space>

          <a-space v-else-if="canPause" wrap>
            <a-tooltip :title="t('learning.tooltips.controlsPause')">
              <a-button @click="pauseSimulation">{{
                t("learning.form.pause")
              }}</a-button>
            </a-tooltip>
            <a-tooltip :title="t('learning.tooltips.controlsReset')">
              <a-button :disabled="!canReset" @click="resetSimulation">{{
                t("learning.form.reset")
              }}</a-button>
            </a-tooltip>
          </a-space>

          <a-space v-else-if="canContinue" direction="vertical" :size="16">
            <a-space wrap>
              <a-tooltip :title="t('learning.tooltips.controlsContinue')">
                <a-button
                  type="primary"
                  :disabled="!canContinue"
                  @click="continueSimulation"
                  >{{ t("learning.form.continue") }}</a-button
                >
              </a-tooltip>
              <a-tooltip :title="t('learning.tooltips.controlsReset')">
                <a-button :disabled="!canReset" @click="resetSimulation">{{
                  t("learning.form.reset")
                }}</a-button>
              </a-tooltip>
            </a-space>

            <a-space wrap>
              <a-tooltip :title="t('learning.tooltips.controlsStepBackward')">
                <a-button
                  :disabled="!canStepBackward"
                  @click="stepBackwardSimulation"
                  >{{ t("learning.form.stepPrevious") }}</a-button
                >
              </a-tooltip>
              <a-tooltip :title="t('learning.tooltips.controlsStepForward')">
                <a-button
                  :disabled="!canStepForward"
                  @click="stepForwardSimulation"
                  >{{ t("learning.form.stepNext") }}</a-button
                >
              </a-tooltip>
            </a-space>
          </a-space>

          <a-space v-else wrap>
            <a-tooltip :title="t('learning.tooltips.controlsReset')">
              <a-button :disabled="!canReset" @click="resetSimulation">{{
                t("learning.form.reset")
              }}</a-button>
            </a-tooltip>
          </a-space>
          <a-divider class="learning-status-divider" />
          <p class="learning-status-text">
            {{ t("learning.form.statusPrefix") }}
            <strong>{{ statusText }}</strong>
          </p>
          <a-progress
            :percent="progressPercent"
            :stroke-color="{ from: '#78a8ff', to: '#164fd6' }"
          />
        </article>
      </div>

      <div class="aprendizado-grid__middle">
        <article class="page-card">
          <h3 class="page-card__title">
            <a-tooltip :title="t('learning.tooltips.visualization')">
              <span>{{ t("learning.sections.visualization") }}</span>
            </a-tooltip>
          </h3>
          <div
            class="sort-bars"
            role="img"
            :aria-label="t('learning.aria.vectorAnimation')"
          >
            <div
              v-for="(value, index) in bars"
              :key="`${index}-${value}`"
              class="sort-bars-wrapper"
              :class="{
                'sort-bars-wrapper--gap':
                  selectedAlgorithm === 'insertion' && gapIndex === index,
                'sort-bars-wrapper--comparing':
                  selectedAlgorithm === 'insertion' &&
                  (index === currentStep?.variables.i ||
                    index === currentStep?.variables.j),
                'sort-bars-wrapper--sorted':
                  selectedAlgorithm === 'bubble' &&
                  sortedPartition &&
                  index >= sortedPartition.start &&
                  index < sortedPartition.end,
                'sort-bars-wrapper--heapifying':
                  selectedAlgorithm === 'heap' &&
                  heapifyRegion &&
                  index >= heapifyRegion.start &&
                  index < heapifyRegion.end,
                'sort-bars-wrapper--merging':
                  selectedAlgorithm === 'merge' &&
                  merging &&
                  index >= merging.start &&
                  index < merging.end,
                'sort-bars-wrapper--merge-comparing':
                  selectedAlgorithm === 'merge' &&
                  (index === currentStep?.variables.left ||
                    index === currentStep?.variables.mid ||
                    index === currentStep?.variables.right),
                'sort-bars-wrapper--quick-partition':
                  selectedAlgorithm === 'quick' && partitionIndex === index,
              }"
            >
              <div class="sort-bars__value">
                {{ value !== null && value !== undefined ? value : "—" }}
              </div>
              <div
                v-if="selectedAlgorithm === 'insertion' && gapIndex === index"
                class="sort-bars__item sort-bars__item--gap sort-bars__item--ghost"
              />
              <div
                v-else
                class="sort-bars__item"
                :class="{
                  'sort-bars__item--active': activeIndexes.includes(index),
                  'sort-bars__item--pivot': pivotIndex === index,
                  'sort-bars__item--partition':
                    selectedAlgorithm === 'quick' && partitionIndex === index,
                  'sort-bars__item--sorted':
                    selectedAlgorithm === 'bubble' &&
                    sortedPartition &&
                    index >= sortedPartition.start &&
                    index < sortedPartition.end,
                }"
                :style="{
                  height:
                    value !== null && value !== undefined
                      ? `${Math.max(6, (value / maxBarValue) * 100)}%`
                      : '0%',
                }"
              />
              <div class="sort-bars__index">{{ index + 1 }}</div>
            </div>
          </div>
        </article>

        <article class="page-card">
          <h3 class="page-card__title">
            <a-tooltip :title="t('learning.tooltips.variables')">
              <span>{{ t("learning.sections.variables") }}</span>
            </a-tooltip>
          </h3>
          <div class="variables-display">
            <div v-if="currentStep" class="variables-display__grid">
              <!-- Bubble Sort variables -->
              <template v-if="selectedAlgorithm === 'bubble'">
                <a-tooltip
                  :title="t('learning.tooltips.variablesByAlgorithm.bubbleI')"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">{{
                      t("learning.variableLabels.i")
                    }}</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.i)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  :title="t('learning.tooltips.variablesByAlgorithm.bubbleJ')"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">{{
                      t("learning.variableLabels.j")
                    }}</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.j)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  :title="
                    t('learning.tooltips.variablesByAlgorithm.bubbleNMinusI')
                  "
                >
                  <div v-if="sortedPartition" class="variable-item">
                    <span class="variable-item__label">{{
                      t("learning.variableLabels.nMinusI")
                    }}</span>
                    <span class="variable-item__value">{{
                      displayBubbleNMinusI(currentStep.variables.i)
                    }}</span>
                  </div>
                </a-tooltip>
              </template>

              <!-- Insertion Sort variables -->
              <template v-else-if="selectedAlgorithm === 'insertion'">
                <a-tooltip
                  :title="
                    t('learning.tooltips.variablesByAlgorithm.insertionI')
                  "
                >
                  <div class="variable-item">
                    <span class="variable-item__label">{{
                      t("learning.variableLabels.i")
                    }}</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.j)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  :title="
                    t('learning.tooltips.variablesByAlgorithm.insertionJ')
                  "
                >
                  <div class="variable-item">
                    <span class="variable-item__label">{{
                      t("learning.variableLabels.j")
                    }}</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.i)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  :title="
                    t('learning.tooltips.variablesByAlgorithm.insertionX')
                  "
                >
                  <div class="variable-item">
                    <span class="variable-item__label">{{
                      t("learning.variableLabels.x")
                    }}</span>
                    <span class="variable-item__value">{{
                      currentStep.variables.key !== null
                        ? currentStep.variables.key
                        : "—"
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  :title="
                    t('learning.tooltips.variablesByAlgorithm.insertionGap')
                  "
                >
                  <div class="variable-item">
                    <span class="variable-item__label">{{
                      t("learning.variableLabels.gapAt")
                    }}</span>
                    <span class="variable-item__value">{{
                      displayIndex(gapIndex)
                    }}</span>
                  </div>
                </a-tooltip>
              </template>

              <!-- Merge Sort variables -->
              <template v-else-if="selectedAlgorithm === 'merge'">
                <a-tooltip
                  :title="t('learning.tooltips.variablesByAlgorithm.mergeP')"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">{{
                      t("learning.variableLabels.p")
                    }}</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.left)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  :title="t('learning.tooltips.variablesByAlgorithm.mergeQ')"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">{{
                      t("learning.variableLabels.q")
                    }}</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.mid)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  :title="t('learning.tooltips.variablesByAlgorithm.mergeR')"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">{{
                      t("learning.variableLabels.r")
                    }}</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.right)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  :title="
                    t('learning.tooltips.variablesByAlgorithm.mergeDepth')
                  "
                >
                  <div
                    v-if="currentStep.divisionDepth !== undefined"
                    class="variable-item"
                  >
                    <span class="variable-item__label">{{
                      t("learning.variableLabels.depth")
                    }}</span>
                    <span class="variable-item__value">{{
                      currentStep.divisionDepth
                    }}</span>
                  </div>
                </a-tooltip>
              </template>

              <!-- Heap Sort variables -->
              <template v-else-if="selectedAlgorithm === 'heap'">
                <a-tooltip
                  :title="t('learning.tooltips.variablesByAlgorithm.heapI')"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">{{
                      t("learning.variableLabels.i")
                    }}</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.i)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  :title="
                    t('learning.tooltips.variablesByAlgorithm.heapLargest')
                  "
                >
                  <div class="variable-item">
                    <span class="variable-item__label">{{
                      t("learning.variableLabels.largest")
                    }}</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.largest)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  :title="t('learning.tooltips.variablesByAlgorithm.heapSize')"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">{{
                      t("learning.variableLabels.heapSize")
                    }}</span>
                    <span class="variable-item__value">{{
                      currentStep.variables.heapSize !== null
                        ? currentStep.variables.heapSize
                        : "—"
                    }}</span>
                  </div>
                </a-tooltip>
              </template>

              <!-- Quick Sort variables -->
              <template v-else-if="selectedAlgorithm === 'quick'">
                <a-tooltip
                  :title="t('learning.tooltips.variablesByAlgorithm.quickP')"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">{{
                      t("learning.variableLabels.p")
                    }}</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.p)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  :title="t('learning.tooltips.variablesByAlgorithm.quickR')"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">{{
                      t("learning.variableLabels.r")
                    }}</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.r)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  :title="t('learning.tooltips.variablesByAlgorithm.quickI')"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">{{
                      t("learning.variableLabels.i")
                    }}</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.i)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  :title="t('learning.tooltips.variablesByAlgorithm.quickJ')"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">{{
                      t("learning.variableLabels.j")
                    }}</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.j)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  :title="
                    t('learning.tooltips.variablesByAlgorithm.quickPivot')
                  "
                >
                  <div class="variable-item">
                    <span class="variable-item__label">{{
                      t("learning.variableLabels.pivot")
                    }}</span>
                    <span class="variable-item__value">{{
                      currentStep.variables.pivot !== null
                        ? currentStep.variables.pivot
                        : "—"
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  :title="t('learning.tooltips.variablesByAlgorithm.quickQ')"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">{{
                      t("learning.variableLabels.q")
                    }}</span>
                    <span class="variable-item__value">{{
                      displayIndex(partitionIndex)
                    }}</span>
                  </div>
                </a-tooltip>
              </template>

              <!-- Fallback for other cases -->
              <template v-else>
                <a-tooltip
                  :title="t('learning.tooltips.variablesByAlgorithm.fallbackI')"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">{{
                      t("learning.variableLabels.i")
                    }}</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.i)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  :title="t('learning.tooltips.variablesByAlgorithm.fallbackJ')"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">{{
                      t("learning.variableLabels.j")
                    }}</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.j)
                    }}</span>
                  </div>
                </a-tooltip>
              </template>
            </div>
            <div v-else class="variables-display__empty">
              {{ t("learning.empty.variables") }}
            </div>
          </div>
        </article>

        <article class="page-card">
          <h3 class="page-card__title">
            <a-tooltip :title="t('learning.tooltips.basicMetrics')">
              <span>{{ t("learning.sections.basicMetrics") }}</span>
            </a-tooltip>
          </h3>
          <div class="page-kpis">
            <a-tooltip :title="t('learning.tooltips.kpiTime')">
              <div class="kpi-tile">
                <div class="kpi-tile__label">{{ t("learning.kpi.time") }}</div>
                <div class="kpi-tile__value">{{ elapsedMs }}</div>
              </div>
            </a-tooltip>
            <a-tooltip :title="t('learning.tooltips.kpiComparisons')">
              <div class="kpi-tile">
                <div class="kpi-tile__label">
                  {{ t("learning.kpi.comparisons") }}
                </div>
                <div class="kpi-tile__value">{{ comparisons }}</div>
              </div>
            </a-tooltip>
            <a-tooltip :title="t('learning.tooltips.kpiSwaps')">
              <div class="kpi-tile">
                <div class="kpi-tile__label">{{ t("learning.kpi.swaps") }}</div>
                <div class="kpi-tile__value">{{ swaps }}</div>
              </div>
            </a-tooltip>
          </div>
        </article>
      </div>

      <div class="aprendizado-grid__right">
        <article class="page-card">
          <h3 class="page-card__title">
            <a-tooltip :title="t('learning.tooltips.pseudo')">
              <span>{{ t("learning.sections.pseudo") }}</span>
            </a-tooltip>
          </h3>
          <div
            class="pseudo-code"
            role="region"
            :aria-label="t('learning.aria.pseudoRegion')"
          >
            <a-tooltip
              v-for="(line, index) in selectedPseudocodeLines"
              :key="`${selectedAlgorithm}-pseudo-${index}`"
              :title="describePseudoLine(selectedAlgorithm, line, index)"
              placement="left"
            >
              <span class="pseudo-code__line pseudo-code__line--interactive">
                <span class="pseudo-code__number">{{ index + 1 }}</span>
                <span class="pseudo-code__text">
                  <template
                    v-for="(token, tokenIndex) in tokenizePseudoLine(line)"
                    :key="`${selectedAlgorithm}-pseudo-${index}-${tokenIndex}`"
                  >
                    <span
                      :class="[
                        'pseudo-code__token',
                        `pseudo-code__token--${token.kind}`,
                      ]"
                      >{{ token.value }}</span
                    >
                  </template>
                </span>
              </span>
            </a-tooltip>
          </div>
        </article>

        <article class="page-card">
          <h3 class="page-card__title">
            <a-tooltip :title="t('learning.tooltips.description')">
              <span>{{ t("learning.sections.description") }}</span>
            </a-tooltip>
          </h3>
          <a-space
            direction="vertical"
            class="learning-description-stack"
            :size="10"
          >
            <p>{{ t(selectedMetadata.conceptKey) }}</p>
            <p>{{ t(selectedMetadata.strategyKey) }}</p>
            <a-space wrap :style="{ margin: 0 }">
              <a-tag color="green"
                >{{ t("learning.complexity.best") }}:
                {{ selectedMetadata.bestCase }}</a-tag
              >
              <a-tag color="blue"
                >{{ t("learning.complexity.average") }}:
                {{ selectedMetadata.averageCase }}</a-tag
              >
              <a-tag color="volcano"
                >{{ t("learning.complexity.worst") }}:
                {{ selectedMetadata.worstCase }}</a-tag
              >
            </a-space>
          </a-space>
        </article>
      </div>
    </section>
  </div>
</template>
