<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  algorithmOptions,
  scenarioOptions,
  scenarioLabelKeyByKey,
  sizeOptions,
} from "../constants/comparator-options";
import type {
  AlgorithmKey,
  CompareJob,
  ComparisonResultRow,
  ScenarioType,
  WorkerMessage,
} from "../types/comparator";
import ComparisonResultsTable from "../components/ComparisonResultsTable.vue";
import ComparisonResultsChart from "../components/ComparisonResultsChart.vue";
import {
  consumePendingCompareConfig,
  saveComparisonHistoryEntry,
} from "../utils/comparison-history";

const selectedAlgorithms = ref<AlgorithmKey[]>([
  "insertion",
  "bubble",
  "merge",
]);
const selectedScenarios = ref<ScenarioType[]>(["aleatorio"]);
const selectedSizes = ref<number[]>([100, 1000, 5000]);
const replications = ref<number>(3);
const timeoutMs = ref<number>(250);
const { t, locale } = useI18n();

const isRunning = ref<boolean>(false);
const completed = ref<number>(0);
const total = ref<number>(0);
const rows = ref<ComparisonResultRow[]>([]);
const feedbackMessage = ref<string>(t("comparator.feedback.initial"));

const selectedMetric = ref<
  "averageTimeMs" | "averageComparisons" | "averageMemoryKb"
>("averageTimeMs");
const selectedScenarioForChart = ref<"all" | ScenarioType>("all");

let comparatorWorker: Worker | null = null;

const algorithmSelectOptions = computed(() => {
  return algorithmOptions.map((item) => ({
    label: t(item.labelKey),
    value: item.key,
  }));
});

const scenarioSelectOptions = computed(() => {
  return scenarioOptions.map((item) => ({
    label: t(item.labelKey),
    value: item.key,
  }));
});

const sizeSelectOptions = computed(() => {
  return sizeOptions.map((item) => ({
    label: item.toLocaleString(locale.value),
    value: item,
  }));
});

const progressPercent = computed(() => {
  if (total.value === 0) {
    return 0;
  }
  return Math.round((completed.value / total.value) * 100);
});

const chartScenario = computed(() => {
  return selectedScenarioForChart.value === "all"
    ? undefined
    : selectedScenarioForChart.value;
});

const validateJob = (): string | null => {
  if (selectedAlgorithms.value.length === 0) {
    return t("comparator.feedback.validation.selectAlgorithm");
  }
  if (selectedScenarios.value.length === 0) {
    return t("comparator.feedback.validation.selectScenario");
  }
  if (selectedSizes.value.length === 0) {
    return t("comparator.feedback.validation.selectSize");
  }
  if (replications.value < 1) {
    return t("comparator.feedback.validation.replications");
  }
  if (timeoutMs.value < 1) {
    return t("comparator.feedback.validation.timeout");
  }
  return null;
};

const ensureWorker = (): Worker => {
  if (comparatorWorker) {
    return comparatorWorker;
  }

  comparatorWorker = new Worker(
    new URL("../workers/comparator.worker.ts", import.meta.url),
    {
      type: "module",
    },
  );

  comparatorWorker.onmessage = (event: MessageEvent<WorkerMessage>) => {
    const message = event.data;

    if (message.type === "progress") {
      completed.value = message.completed;
      total.value = message.total;
      feedbackMessage.value = t("comparator.feedback.running", {
        completed: message.completed,
        total: message.total,
      });
      return;
    }

    if (message.type === "result") {
      rows.value = message.rows;
      isRunning.value = false;
      feedbackMessage.value = t("comparator.feedback.finished");
      saveComparisonHistoryEntry(buildJobPayload(), message.rows);
      return;
    }

    if (message.type === "cancelled") {
      isRunning.value = false;
      feedbackMessage.value = t("comparator.feedback.cancelled");
      return;
    }

    if (message.type === "error") {
      isRunning.value = false;
      const resolvedMessage =
        message.message === "internal_worker_error"
          ? t("comparator.feedback.workerError")
          : message.message;
      feedbackMessage.value = `${t("comparator.feedback.errorPrefix")}: ${resolvedMessage}`;
    }
  };

  return comparatorWorker;
};

const buildJobPayload = (): CompareJob => {
  return {
    algorithms: [...selectedAlgorithms.value],
    scenarios: [...selectedScenarios.value],
    sizes: [...selectedSizes.value],
    replications: replications.value,
    timeoutMs: timeoutMs.value,
  };
};

const startSimulation = (): void => {
  const validationError = validateJob();
  if (validationError) {
    feedbackMessage.value = validationError;
    return;
  }

  const worker = ensureWorker();
  const payload = buildJobPayload();

  rows.value = [];
  completed.value = 0;
  total.value =
    payload.algorithms.length * payload.scenarios.length * payload.sizes.length;
  isRunning.value = true;
  feedbackMessage.value = t("comparator.feedback.starting");

  worker.postMessage({
    type: "start",
    payload,
  });
};

const cancelSimulation = (): void => {
  if (!isRunning.value || !comparatorWorker) {
    return;
  }
  comparatorWorker.postMessage({ type: "cancel" });
};

const applyPendingConfiguration = (config: CompareJob): void => {
  selectedAlgorithms.value = [...config.algorithms];
  selectedScenarios.value = [...config.scenarios];
  selectedSizes.value = [...config.sizes];
  replications.value = config.replications;
  timeoutMs.value = config.timeoutMs;
};

onMounted(() => {
  const pendingConfig = consumePendingCompareConfig();
  if (pendingConfig) {
    applyPendingConfiguration(pendingConfig);
    feedbackMessage.value = t("comparator.feedback.pendingLoaded");
  }
});

onBeforeUnmount(() => {
  if (comparatorWorker) {
    comparatorWorker.terminate();
    comparatorWorker = null;
  }
});
</script>

<template>
  <div class="page-wrap comparador-grid">
    <section class="page-card page-card--hero">
      <h2 class="page-card__title">{{ t("comparator.hero.title") }}</h2>
      <p class="page-card__description">
        {{ t("comparator.hero.description") }}
      </p>
    </section>

    <section class="page-card">
      <h3 class="page-card__title">
        {{ t("comparator.sections.configuration") }}
      </h3>
      <div class="comparador-form-grid">
        <a-form-item :label="t('comparator.form.algorithms')">
          <a-select
            v-model:value="selectedAlgorithms"
            mode="multiple"
            :options="algorithmSelectOptions"
            :disabled="isRunning"
          />
        </a-form-item>

        <a-form-item :label="t('comparator.form.scenarios')">
          <a-select
            v-model:value="selectedScenarios"
            mode="multiple"
            :options="scenarioSelectOptions"
            :disabled="isRunning"
          />
        </a-form-item>

        <a-form-item :label="t('comparator.form.sizes')">
          <a-select
            v-model:value="selectedSizes"
            mode="multiple"
            :options="sizeSelectOptions"
            :disabled="isRunning"
          />
        </a-form-item>

        <a-form-item :label="t('comparator.form.replications')">
          <a-input-number
            v-model:value="replications"
            :min="1"
            :max="40"
            :disabled="isRunning"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item :label="t('comparator.form.timeoutMs')">
          <a-input-number
            v-model:value="timeoutMs"
            :min="1"
            :step="50"
            :disabled="isRunning"
            style="width: 100%"
          />
        </a-form-item>
      </div>

      <a-space wrap>
        <a-button
          type="primary"
          :loading="isRunning"
          @click="startSimulation"
          >{{ t("comparator.buttons.start") }}</a-button
        >
        <a-button danger :disabled="!isRunning" @click="cancelSimulation">{{
          t("comparator.buttons.cancel")
        }}</a-button>
      </a-space>
    </section>

    <section class="page-card">
      <h3 class="page-card__title">{{ t("comparator.sections.progress") }}</h3>
      <a-progress
        :percent="progressPercent"
        :status="isRunning ? 'active' : 'normal'"
        :stroke-color="{ from: '#78a8ff', to: '#164fd6' }"
      />
      <p style="margin: 8px 0 0">{{ feedbackMessage }}</p>
    </section>

    <section class="page-card">
      <h3 class="page-card__title">{{ t("comparator.sections.table") }}</h3>
      <ComparisonResultsTable :rows="rows" :loading="isRunning" />
    </section>

    <section class="page-card">
      <div
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        "
      >
        <h3 class="page-card__title" style="margin: 0">
          {{ t("comparator.sections.chart") }}
        </h3>
        <a-space wrap>
          <a-radio-group v-model:value="selectedMetric" button-style="solid">
            <a-radio-button value="averageTimeMs">{{
              t("common.metrics.time")
            }}</a-radio-button>
            <a-radio-button value="averageComparisons">{{
              t("common.metrics.comparisons")
            }}</a-radio-button>
            <a-radio-button value="averageMemoryKb">{{
              t("common.metrics.memory")
            }}</a-radio-button>
          </a-radio-group>

          <a-select
            v-model:value="selectedScenarioForChart"
            style="min-width: 170px"
            :options="[
              { label: t('common.scenarios.all'), value: 'all' },
              ...scenarioOptions.map((item) => ({
                label: t(scenarioLabelKeyByKey[item.key]),
                value: item.key,
              })),
            ]"
          />
        </a-space>
      </div>

      <ComparisonResultsChart
        :rows="rows"
        :metric="selectedMetric"
        :scenario="chartScenario"
      />
    </section>
  </div>
</template>
