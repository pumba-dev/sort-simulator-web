<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  algorithmOptions,
  scenarioOptions,
  scenarioLabelKeyByKey,
  sizeOptions,
  MIN_REPLICATIONS,
  maxReplicationsForSizes,
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
import { Modal, notification } from "ant-design-vue";
import { InfoCircleOutlined } from "@ant-design/icons-vue";
import { DeviceDetector } from "../services/device-detector";
import ComparisonResultsTable from "../components/ComparisonResultsTable.vue";
import ComparisonResultsChart from "../components/ComparisonResultsChart.vue";
import ComparatorHelpModal from "../components/ComparatorHelpModal.vue";
import { ComparisonHistoryService } from "../services/comparison-history-service";
import { benchmarkReport } from "../services/benchmark-report";

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => ctx.close();
  } catch {
    // AudioContext not available (e.g. headless environment)
  }
}

const selectedAlgorithms = ref<AlgorithmKey[]>([]);
const selectedScenarios = ref<ScenarioType[]>([]);
const selectedSizes = ref<number[]>([]);
const replications = ref<number>(MIN_REPLICATIONS);
const timeoutMinutes = ref<number>(1);
const timeoutEnabled = ref<boolean>(false);
const seed = ref<number>(42);
const removeOutliers = ref<boolean>(false);
const allowDuplicates = ref<boolean>(false);
const isHelpOpen = ref<boolean>(false);
const { t, locale } = useI18n();

const isRunning = ref<boolean>(false);
const completed = ref<number>(0);
const total = ref<number>(0);
const rows = ref<ComparisonResultRow[]>([]);
const report = ref<BenchmarkReport | null>(null);
const environment = ref<BenchmarkEnvironment | null>(null);
const isExporting = ref<boolean>(false);
const feedbackMessage = ref<string>(t("comparator.feedback.initial"));
const elapsedMs = ref<number>(0);
const currentCell = ref<{
  algorithm: AlgorithmKey;
  scenario: ScenarioType;
  size: number;
  replication: number;
  totalReplications: number;
} | null>(null);
const historyService = new ComparisonHistoryService();
let timerInterval: ReturnType<typeof setInterval> | null = null;
let timerStart = 0;

const formatElapsed = (ms: number): string => {
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  const rs = Math.floor(s % 60);
  if (m < 60) return `${m}m ${rs}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

const stopTimer = (finalMs?: number) => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (finalMs !== undefined) elapsedMs.value = finalMs;
};

const selectedMetric = ref<
  "averageTimeMs" | "averageComparisons" | "averageMemoryKb"
>("averageTimeMs");
const selectedScenarioForChart = ref<"all" | ScenarioType>("all");
const selectedScenarioForTable = ref<"all" | ScenarioType>("all");
const selectedSizeForTable = ref<"all" | number>("all");

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

// Replications cap derived from the largest selected size. Heavier sizes get a
// stricter cap so the worker heap (input clone + sub-worker clone + aux buffers)
// stays bounded on devices with tight memory budgets.
const maxReplications = computed(() =>
  maxReplicationsForSizes(selectedSizes.value),
);

// Silently clamp replications whenever the selection grows past the new cap.
// Skipped while a job is running so the user can't have the value yanked
// out from under an in-progress benchmark.
watch(maxReplications, (cap) => {
  if (isRunning.value) return;
  if (replications.value > cap) {
    replications.value = cap;
  }
  if (replications.value < MIN_REPLICATIONS) {
    replications.value = MIN_REPLICATIONS;
  }
});

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
    selectedSizes.value = [...selectedSizes.value, val].sort((a, b) => a - b);
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

const tableScenario = computed(() =>
  selectedScenarioForTable.value === "all"
    ? undefined
    : (selectedScenarioForTable.value as ScenarioType),
);

const tableSize = computed(() =>
  selectedSizeForTable.value === "all"
    ? undefined
    : (selectedSizeForTable.value as number),
);

const availableScenariosForTable = computed(() => [
  { label: t("common.scenarios.all"), value: "all" },
  ...[...new Set(rows.value.map((r) => r.scenario))].map((s) => ({
    label: t(scenarioLabelKeyByKey[s]),
    value: s,
  })),
]);

const availableSizesForTable = computed(() => [
  { label: t("common.sizes.all"), value: "all" },
  ...[...new Set(rows.value.map((r) => r.size))]
    .sort((a, b) => a - b)
    .map((s) => ({ label: s.toLocaleString(locale.value), value: s })),
]);

const isJobValid = computed(() => {
  return (
    selectedAlgorithms.value.length > 0 &&
    selectedScenarios.value.length > 0 &&
    selectedSizes.value.length > 0 &&
    replications.value >= MIN_REPLICATIONS &&
    replications.value <= maxReplications.value &&
    (!timeoutEnabled.value || timeoutMinutes.value >= 1) &&
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
  if (
    replications.value < MIN_REPLICATIONS ||
    replications.value > maxReplications.value
  ) {
    return t("comparator.feedback.validation.replications", {
      min: MIN_REPLICATIONS,
      max: maxReplications.value,
    });
  }
  if (timeoutEnabled.value && timeoutMinutes.value < 1) {
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

    if (message.type === "cell-progress") {
      console.log(
        `Progress: ${message.algorithm} - ${message.scenario} - ${message.size} (replication ${message.replication}/${message.totalReplications})`,
      );
      currentCell.value = {
        algorithm: message.algorithm,
        scenario: message.scenario,
        size: message.size,
        replication: message.replication,
        totalReplications: message.totalReplications,
      };
      return;
    }

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
      stopTimer(message.report.elapsedMs);
      currentCell.value = null;
      rows.value = message.rows;
      report.value = message.report;
      environment.value = message.report.environment ?? null;
      isRunning.value = false;
      playBeep();
      notification.success({
        message: t("comparator.feedback.finishedTitle"),
        description: t("comparator.feedback.finished"),
        placement: "bottomRight",
        duration: 5,
      });
      feedbackMessage.value = t("comparator.feedback.finished");
      historyService.saveEntry(
        buildJobPayload(),
        message.rows,
        environment.value ?? undefined,
        message.report,
      );
      return;
    }

    if (message.type === "cancelled") {
      stopTimer();
      currentCell.value = null;
      isRunning.value = false;
      feedbackMessage.value = t("comparator.feedback.cancelled");
      return;
    }

    if (message.type === "error") {
      stopTimer();
      currentCell.value = null;
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
    sizes: [...selectedSizes.value].sort((a, b) => a - b),
    replications: replications.value,
    timeoutMs: timeoutMinutes.value * 60000,
    timeoutEnabled: timeoutEnabled.value,
    seed: seed.value,
    removeOutliers: removeOutliers.value,
    allowDuplicates: allowDuplicates.value,
  };
};

// Worst-case live heap during a single replication, roughly:
//   input array + sub-worker clone + algorithm aux buffers ≈ 4× raw bytes.
// Used only for the pre-flight estimate shown in the warning modal.
const HEAVY_JOB_MEM_FACTOR = 4;
const HEAVY_JOB_BYTES_PER_NUMBER = 8;
const HEAVY_JOB_SIZE_THRESHOLD = 100_000;
const HEAVY_JOB_TOTAL_RUNS_THRESHOLD = 100;

const estimateJobLoad = (payload: CompareJob) => {
  const maxSize = Math.max(...payload.sizes);
  const cells =
    payload.algorithms.length * payload.scenarios.length * payload.sizes.length;
  const peakBytes = maxSize * HEAVY_JOB_BYTES_PER_NUMBER * HEAVY_JOB_MEM_FACTOR;
  return { cells, peakBytes, totalRuns: cells * payload.replications };
};

const isHeavyJob = (payload: CompareJob): boolean => {
  const maxSize = Math.max(...payload.sizes);
  const totalRuns =
    payload.algorithms.length *
    payload.scenarios.length *
    payload.sizes.length *
    payload.replications;
  return (
    maxSize >= HEAVY_JOB_SIZE_THRESHOLD &&
    totalRuns >= HEAVY_JOB_TOTAL_RUNS_THRESHOLD
  );
};

const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
};

const dispatchJob = (payload: CompareJob): void => {
  const worker = ensureWorker();

  rows.value = [];
  report.value = null;
  completed.value = 0;
  selectedScenarioForTable.value = "all";
  selectedSizeForTable.value = "all";
  elapsedMs.value = 0;
  timerStart = Date.now();
  timerInterval = setInterval(() => {
    elapsedMs.value = Date.now() - timerStart;
  }, 200);
  total.value =
    payload.algorithms.length * payload.scenarios.length * payload.sizes.length;
  isRunning.value = true;
  feedbackMessage.value = t("comparator.feedback.starting");

  worker.postMessage({
    type: "start",
    payload,
  });
};

const startSimulation = (): void => {
  const validationError = validateJob();
  if (validationError) {
    feedbackMessage.value = validationError;
    return;
  }

  const payload = buildJobPayload();

  if (isHeavyJob(payload)) {
    const load = estimateJobLoad(payload);
    Modal.confirm({
      title: t("comparator.confirm.heavyJob.title"),
      content: t("comparator.confirm.heavyJob.description", {
        totalRuns: load.totalRuns.toLocaleString(locale.value),
        cells: load.cells.toLocaleString(locale.value),
        peakMemory: formatBytes(load.peakBytes),
      }),
      okText: t("comparator.confirm.heavyJob.proceed"),
      cancelText: t("comparator.confirm.heavyJob.cancel"),
      okType: "primary",
      onOk: () => dispatchJob(payload),
    });
    return;
  }

  dispatchJob(payload);
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
  selectedSizes.value = [...config.sizes].sort((a, b) => a - b);
  const cap = maxReplicationsForSizes(selectedSizes.value);
  replications.value = Math.min(
    Math.max(config.replications, MIN_REPLICATIONS),
    cap,
  );
  timeoutMinutes.value = Math.max(1, Math.round(config.timeoutMs / 60000));
  timeoutEnabled.value =
    typeof config.timeoutEnabled === "boolean" ? config.timeoutEnabled : false;
  seed.value = typeof config.seed === "number" ? config.seed : 42;
  removeOutliers.value =
    typeof config.removeOutliers === "boolean" ? config.removeOutliers : true;
  allowDuplicates.value =
    typeof config.allowDuplicates === "boolean"
      ? config.allowDuplicates
      : false;
};

const downloadCsv = (): void => {
  if (!report.value) return;
  const csv = benchmarkReport.generateCsvReport(report.value);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  benchmarkReport.triggerDownload(blob, buildReportFilename("csv"));
};

const downloadMarkdown = (): void => {
  if (!report.value) return;
  const md = benchmarkReport.generateMarkdownReport(report.value);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  benchmarkReport.triggerDownload(blob, buildReportFilename("md"));
};

const downloadPdf = async (): Promise<void> => {
  if (!report.value) return;
  isExporting.value = true;
  try {
    const blob = await benchmarkReport.generatePdfBlob(report.value);
    benchmarkReport.triggerDownload(blob, buildReportFilename("pdf"));
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
  const pendingConfig = historyService.consumePendingConfig();
  if (pendingConfig) {
    applyPendingConfiguration(pendingConfig);
    feedbackMessage.value = t("comparator.feedback.pendingLoaded");
  }
  environment.value = DeviceDetector.detect();
});

onBeforeUnmount(() => {
  stopTimer();
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

    <a-collapse
      v-if="environment"
      class="page-card benchmark-env"
      ghost
      :default-active-key="[]"
    >
      <a-collapse-panel
        key="env"
        :header="t('comparator.sections.environment')"
      >
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
            t("environment.baselineScore", {
              score: environment.baselineScore,
            })
          }}
        </p>
      </a-collapse-panel>
    </a-collapse>

    <section class="page-card">
      <h3 class="page-card__title comparador-section-title">
        {{ t("comparator.sections.configuration") }}
        <a-tooltip :title="t('comparator.help.openTooltip')">
          <a-button
            type="text"
            size="small"
            class="comparador-help-button"
            :aria-label="t('comparator.help.openTooltip')"
            @click="isHelpOpen = true"
          >
            <template #icon><InfoCircleOutlined /></template>
          </a-button>
        </a-tooltip>
      </h3>

      <a-form layout="vertical" class="comparador-form-grid">
        <a-form-item>
          <template #label>
            <a-tooltip :title="t('comparator.tooltips.algorithms')">
              <span>{{ t("comparator.form.algorithms") }}</span>
            </a-tooltip>
          </template>
          <a-select
            :value="null"
            :options="availableAlgorithmOptions"
            :disabled="isRunning"
            :placeholder="t('comparator.form.algorithms')"
            @change="(v: AlgorithmKey) => addAlgorithm(v)"
          />
        </a-form-item>

        <a-form-item>
          <template #label>
            <a-tooltip :title="t('comparator.tooltips.scenarios')">
              <span>{{ t("comparator.form.scenarios") }}</span>
            </a-tooltip>
          </template>
          <a-select
            :value="null"
            :options="availableScenarioOptions"
            :disabled="isRunning"
            :placeholder="t('comparator.form.scenarios')"
            @change="(v: ScenarioType) => addScenario(v)"
          />
        </a-form-item>

        <a-form-item>
          <template #label>
            <a-tooltip :title="t('comparator.tooltips.sizes')">
              <span>{{ t("comparator.form.sizes") }}</span>
            </a-tooltip>
          </template>
          <a-select
            :value="null"
            :options="availableSizeOptions"
            :disabled="isRunning"
            :placeholder="t('comparator.form.sizes')"
            @change="(v: number) => addSize(v)"
          />
        </a-form-item>

        <a-form-item>
          <template #label>
            <a-tooltip
              :title="
                t('comparator.tooltips.replicationsCap', {
                  min: MIN_REPLICATIONS,
                  max: maxReplications,
                })
              "
            >
              <span>{{ t("comparator.form.replications") }}</span>
            </a-tooltip>
          </template>
          <a-input-number
            v-model:value="replications"
            :min="MIN_REPLICATIONS"
            :max="maxReplications"
            :disabled="isRunning"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item>
          <template #label>
            <a-tooltip :title="t('comparator.tooltips.seed')">
              <span>{{ t("comparator.form.seed") }}</span>
            </a-tooltip>
          </template>
          <a-input-number
            v-model:value="seed"
            :min="0"
            :step="1"
            :disabled="isRunning"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item class="comparador-timeout-item">
          <template #label>
            <a-tooltip :title="t('comparator.tooltips.timeoutEnabled')">
              <span>{{ t("comparator.form.timeoutEnabled") }}</span>
            </a-tooltip>
          </template>
          <div class="comparador-timeout-cell">
            <a-switch v-model:checked="timeoutEnabled" :disabled="isRunning" />
            <a-tooltip
              v-if="timeoutEnabled"
              :title="t('comparator.tooltips.timeoutMinutes')"
            >
              <a-input-number
                v-model:value="timeoutMinutes"
                :min="1"
                :step="1"
                :disabled="isRunning"
                :placeholder="t('comparator.form.timeoutMinutes')"
                style="flex: 1; min-width: 0"
              />
            </a-tooltip>
          </div>
        </a-form-item>

        <a-form-item>
          <template #label>
            <a-tooltip :title="t('comparator.tooltips.removeOutliers')">
              <span>{{ t("comparator.form.removeOutliers") }}</span>
            </a-tooltip>
          </template>
          <a-switch v-model:checked="removeOutliers" :disabled="isRunning" />
        </a-form-item>

        <a-form-item>
          <template #label>
            <a-tooltip :title="t('comparator.tooltips.allowDuplicates')">
              <span>{{ t("comparator.form.allowDuplicates") }}</span>
            </a-tooltip>
          </template>
          <a-switch v-model:checked="allowDuplicates" :disabled="isRunning" />
        </a-form-item>
      </a-form>

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
        <a-tooltip :title="t('comparator.tooltips.start')">
          <a-button
            type="primary"
            :loading="isRunning"
            :disabled="!isJobValid"
            @click="startSimulation"
            >{{ t("comparator.buttons.start") }}
          </a-button>
        </a-tooltip>
        <a-tooltip :title="t('comparator.tooltips.cancel')">
          <a-button danger :disabled="!isRunning" @click="cancelSimulation">
            {{ t("comparator.buttons.cancel") }}
          </a-button>
        </a-tooltip>
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
      <p
        v-if="currentCell && isRunning"
        style="margin: 4px 0 0; font-size: 0.88rem; color: var(--sl-text-soft)"
      >
        {{
          t("comparator.feedback.currentCell", {
            algorithm: algorithmLabel(currentCell.algorithm),
            scenario: scenarioLabel(currentCell.scenario),
            size: currentCell.size.toLocaleString(locale),
            replication: currentCell.replication,
            total: currentCell.totalReplications,
          })
        }}
      </p>
      <p
        v-if="isRunning || elapsedMs > 0"
        style="margin: 4px 0 0; font-size: 0.88rem; color: var(--sl-text-soft)"
      >
        {{ formatElapsed(elapsedMs) }}
      </p>
    </section>

    <section class="page-card">
      <div class="comparador-table-header">
        <h3 class="page-card__title" style="margin: 0">
          {{ t("comparator.sections.table") }}
        </h3>
        <a-space wrap>
          <a-select
            v-model:value="selectedScenarioForTable"
            style="min-width: 150px"
            :options="availableScenariosForTable"
          />
          <a-select
            v-model:value="selectedSizeForTable"
            style="min-width: 120px"
            :options="availableSizesForTable"
          />
          <a-dropdown :disabled="!canExport">
            <a-tooltip :title="t('comparator.tooltips.download')">
              <a-button :disabled="!canExport" :loading="isExporting">
                {{ t("comparator.buttons.download") }} ▾
              </a-button>
            </a-tooltip>
            <template #overlay>
              <a-menu>
                <a-menu-item @click="downloadCsv">CSV</a-menu-item>
                <a-menu-item @click="downloadMarkdown">Markdown</a-menu-item>
                <a-menu-item @click="downloadPdf">PDF</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </a-space>
      </div>
      <ComparisonResultsTable
        :rows="rows"
        :loading="isRunning"
        :scenario="tableScenario"
        :size="tableSize"
      />
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

    <ComparatorHelpModal v-model:open="isHelpOpen" />
  </div>
</template>

<style scoped>
.comparador-section-title {
  display: flex;
  align-items: center;
  gap: 4px;
}

.comparador-help-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  color: var(--sl-text-soft, #888);
}

.comparador-help-button:hover {
  color: var(--sl-primary, #164fd6);
}
</style>
