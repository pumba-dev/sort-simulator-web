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
  BenchmarkEnvironment,
  BenchmarkReport,
  CompareJob,
  ComparisonResultRow,
  ScenarioType,
  WorkerMessage,
} from "../types/comparator";
import { detectEnvironment } from "../services/device-detector";
import ComparisonResultsTable from "../components/ComparisonResultsTable.vue";
import ComparisonResultsChart from "../components/ComparisonResultsChart.vue";
import {
  consumePendingCompareConfig,
  saveComparisonHistoryEntry,
} from "../utils/comparison-history";
import {
  generateMarkdownReport,
  generatePdfBlob,
  triggerDownload,
} from "../services/benchmark-report";

const selectedAlgorithms = ref<AlgorithmKey[]>([]);
const selectedScenarios = ref<ScenarioType[]>([]);
const selectedSizes = ref<number[]>([]);
const replications = ref<number>(3);
const timeoutMinutes = ref<number>(1);
const seed = ref<number>(42);
const removeOutliers = ref<boolean>(false);
const { t, locale } = useI18n();

const isRunning = ref<boolean>(false);
const completed = ref<number>(0);
const total = ref<number>(0);
const rows = ref<ComparisonResultRow[]>([]);
const report = ref<BenchmarkReport | null>(null);
const environment = ref<BenchmarkEnvironment | null>(null);
const isExporting = ref<boolean>(false);
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

const availableAlgorithmOptions = computed(() =>
  algorithmSelectOptions.value.filter(
    (o) => !selectedAlgorithms.value.includes(o.value as AlgorithmKey),
  ),
);

const availableScenarioOptions = computed(() =>
  scenarioSelectOptions.value.filter(
    (o) => !selectedScenarios.value.includes(o.value as ScenarioType),
  ),
);

const availableSizeOptions = computed(() =>
  sizeSelectOptions.value.filter(
    (o) => !selectedSizes.value.includes(o.value as number),
  ),
);

const algorithmLabel = (key: AlgorithmKey): string =>
  algorithmSelectOptions.value.find((o) => o.value === key)?.label ?? key;

const scenarioLabel = (key: ScenarioType): string =>
  scenarioSelectOptions.value.find((o) => o.value === key)?.label ?? key;

const sizeLabel = (val: number): string => val.toLocaleString(locale.value);

const addAlgorithm = (val: AlgorithmKey): void => {
  if (!selectedAlgorithms.value.includes(val)) {
    selectedAlgorithms.value = [...selectedAlgorithms.value, val];
  }
};

const removeAlgorithm = (val: AlgorithmKey): void => {
  selectedAlgorithms.value = selectedAlgorithms.value.filter((a) => a !== val);
};

const addScenario = (val: ScenarioType): void => {
  if (!selectedScenarios.value.includes(val)) {
    selectedScenarios.value = [...selectedScenarios.value, val];
  }
};

const removeScenario = (val: ScenarioType): void => {
  selectedScenarios.value = selectedScenarios.value.filter((s) => s !== val);
};

const addSize = (val: number): void => {
  if (!selectedSizes.value.includes(val)) {
    selectedSizes.value = [...selectedSizes.value, val];
  }
};

const removeSize = (val: number): void => {
  selectedSizes.value = selectedSizes.value.filter((s) => s !== val);
};

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

const isJobValid = computed(() => {
  return (
    selectedAlgorithms.value.length > 0 &&
    selectedScenarios.value.length > 0 &&
    selectedSizes.value.length > 0 &&
    replications.value >= 1 &&
    timeoutMinutes.value >= 1 &&
    Number.isFinite(seed.value)
  );
});

const canExport = computed(
  () => report.value !== null && rows.value.length > 0 && !isRunning.value,
);

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
  if (timeoutMinutes.value < 1) {
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
      report.value = message.report;
      environment.value = message.report.environment ?? null;
      isRunning.value = false;
      feedbackMessage.value = t("comparator.feedback.finished");
      saveComparisonHistoryEntry(
        buildJobPayload(),
        message.rows,
        environment.value ?? undefined,
      );
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
    timeoutMs: timeoutMinutes.value * 60000,
    seed: seed.value,
    removeOutliers: removeOutliers.value,
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
  report.value = null;
  environment.value = null;
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
  timeoutMinutes.value = Math.max(1, Math.round(config.timeoutMs / 60000));
  seed.value = typeof config.seed === "number" ? config.seed : 42;
  removeOutliers.value =
    typeof config.removeOutliers === "boolean" ? config.removeOutliers : true;
};

const downloadMarkdown = (): void => {
  if (!report.value) return;
  const md = generateMarkdownReport(report.value);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  triggerDownload(blob, buildReportFilename("md"));
};

const downloadPdf = async (): Promise<void> => {
  if (!report.value) return;
  isExporting.value = true;
  try {
    const blob = await generatePdfBlob(report.value);
    triggerDownload(blob, buildReportFilename("pdf"));
  } finally {
    isExporting.value = false;
  }
};

const buildReportFilename = (extension: string): string => {
  const stamp = (report.value?.executedAt ?? new Date().toISOString()).replace(
    /[:.]/g,
    "-",
  );
  return `comparator-report-${stamp}.${extension}`;
};

onMounted(() => {
  const pendingConfig = consumePendingCompareConfig();
  if (pendingConfig) {
    applyPendingConfiguration(pendingConfig);
    feedbackMessage.value = t("comparator.feedback.pendingLoaded");
  } else {
    // If no pending config, we can detect the environment right away
    environment.value = detectEnvironment();
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

    <section v-if="environment" class="page-card benchmark-env">
      <h3 class="page-card__title">
        {{ t("comparator.sections.environment") }}
      </h3>
      <p class="benchmark-env__label">{{ t("environment.executedOn") }}</p>
      <p class="benchmark-env__line benchmark-env__line--strong">
        {{ environment.browser }} {{ environment.browserVersion }}
        <span v-if="environment.engine"> ({{ environment.engine }})</span>
      </p>
      <p class="benchmark-env__line">{{ environment.os }}</p>
      <p class="benchmark-env__line">
        <span v-if="environment.cpuThreads">{{
          t("environment.threads", { count: environment.cpuThreads })
        }}</span>
        <span v-if="environment.cpuThreads && environment.memoryGB"> · </span>
        <span v-if="environment.memoryGB">{{
          t("environment.memory", { gb: environment.memoryGB })
        }}</span>
        <span v-if="environment.cpuThreads || environment.memoryGB"> · </span>
        {{
          environment.mobile
            ? t("environment.mobile")
            : t("environment.desktop")
        }}
      </p>
      <p
        v-if="environment.gpu"
        class="benchmark-env__line benchmark-env__line--soft"
      >
        {{ t("environment.gpu", { name: environment.gpu }) }}
      </p>
      <p class="benchmark-env__score">
        {{
          t("environment.baselineScore", { score: environment.baselineScore })
        }}
      </p>
    </section>

    <section class="page-card">
      <h3 class="page-card__title">
        {{ t("comparator.sections.configuration") }}
      </h3>

      <div class="comparador-form-grid">
        <a-form-item :label="t('comparator.form.algorithms')">
          <a-select
            :value="null"
            :options="availableAlgorithmOptions"
            :disabled="isRunning"
            :placeholder="t('comparator.form.algorithms')"
            @change="(v: AlgorithmKey) => addAlgorithm(v)"
          />
        </a-form-item>

        <a-form-item :label="t('comparator.form.scenarios')">
          <a-select
            :value="null"
            :options="availableScenarioOptions"
            :disabled="isRunning"
            :placeholder="t('comparator.form.scenarios')"
            @change="(v: ScenarioType) => addScenario(v)"
          />
        </a-form-item>

        <a-form-item :label="t('comparator.form.sizes')">
          <a-select
            :value="null"
            :options="availableSizeOptions"
            :disabled="isRunning"
            :placeholder="t('comparator.form.sizes')"
            @change="(v: number) => addSize(v)"
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

        <a-form-item :label="t('comparator.form.timeoutMinutes')">
          <a-input-number
            v-model:value="timeoutMinutes"
            :min="1"
            :step="1"
            :disabled="isRunning"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item :label="t('comparator.form.seed')">
          <a-input-number
            v-model:value="seed"
            :min="0"
            :step="1"
            :disabled="isRunning"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item :label="t('comparator.form.removeOutliers')">
          <a-switch v-model:checked="removeOutliers" :disabled="isRunning" />
        </a-form-item>
      </div>

      <div class="comparador-tags-row">
        <div class="comparador-tags-group">
          <span class="comparador-tags-label"
            >{{ t("comparator.form.algorithms") }}:</span
          >
          <template v-if="selectedAlgorithms.length > 0">
            <a-tag
              v-for="alg in selectedAlgorithms"
              :key="alg"
              closable
              :disabled="isRunning"
              @close="removeAlgorithm(alg)"
              >{{ algorithmLabel(alg) }}</a-tag
            >
          </template>
          <span v-else class="comparador-tags-empty">{{
            t("common.notSelected")
          }}</span>
        </div>
        <div class="comparador-tags-group">
          <span class="comparador-tags-label"
            >{{ t("comparator.form.scenarios") }}:</span
          >
          <template v-if="selectedScenarios.length > 0">
            <a-tag
              v-for="sc in selectedScenarios"
              :key="sc"
              closable
              :disabled="isRunning"
              @close="removeScenario(sc)"
              >{{ scenarioLabel(sc) }}</a-tag
            >
          </template>
          <span v-else class="comparador-tags-empty">{{
            t("common.notSelected")
          }}</span>
        </div>
        <div class="comparador-tags-group">
          <span class="comparador-tags-label"
            >{{ t("comparator.form.sizes") }}:</span
          >
          <template v-if="selectedSizes.length > 0">
            <a-tag
              v-for="sz in selectedSizes"
              :key="sz"
              closable
              :disabled="isRunning"
              @close="removeSize(sz)"
              >{{ sizeLabel(sz) }}</a-tag
            >
          </template>
          <span v-else class="comparador-tags-empty">{{
            t("common.notSelected")
          }}</span>
        </div>
      </div>

      <div class="comparador-form-buttons">
        <a-button
          type="primary"
          :loading="isRunning"
          :disabled="!isJobValid"
          @click="startSimulation"
          >{{ t("comparator.buttons.start") }}
        </a-button>
        <a-button danger :disabled="!isRunning" @click="cancelSimulation">
          {{ t("comparator.buttons.cancel") }}
        </a-button>
      </div>
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
      <div class="comparador-table-header">
        <h3 class="page-card__title" style="margin: 0">
          {{ t("comparator.sections.table") }}
        </h3>
        <a-space wrap>
          <a-button :disabled="!canExport" @click="downloadMarkdown">{{
            t("comparator.buttons.downloadMarkdown")
          }}</a-button>
          <a-button
            type="primary"
            :disabled="!canExport"
            :loading="isExporting"
            @click="downloadPdf"
            >{{ t("comparator.buttons.downloadPdf") }}</a-button
          >
        </a-space>
      </div>
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
