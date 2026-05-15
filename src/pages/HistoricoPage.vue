<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import ComparisonResultsTable from "../components/ComparisonResultsTable.vue";
import ComparisonResultsChart from "../components/ComparisonResultsChart.vue";
import { ComparisonHistoryService } from "../services/comparison-history-service";
import { benchmarkReport } from "../services/benchmark-report";
import type {
  BenchmarkEnvironment,
  ComparisonHistoryEntry,
  ScenarioType,
} from "../types/comparator";
import {
  scenarioLabelKeyByKey,
  scenarioOptions,
} from "../constants/comparator-options";

const router = useRouter();
const chartHost = ref<HTMLElement | null>(null);
const { t, locale } = useI18n();

const historyService = new ComparisonHistoryService();
const entries = ref<ComparisonHistoryEntry[]>(historyService.loadHistory());
const selectedEntryId = ref<string | null>(entries.value[0]?.id ?? null);
const feedbackMessage = ref<string>("");

const isExporting = ref(false);

const selectedMetric = ref<
  "averageTimeMs" | "averageComparisons" | "averageMemoryKb"
>("averageTimeMs");
const selectedScenario = ref<"all" | ScenarioType>("all");
const selectedScenarioForTable = ref<"all" | ScenarioType>("all");
const selectedSizeForTable = ref<"all" | number>("all");

watch(selectedEntryId, () => {
  selectedScenarioForTable.value = "all";
  selectedSizeForTable.value = "all";
});

const selectedEntry = computed(() => {
  return (
    entries.value.find((entry) => entry.id === selectedEntryId.value) ?? null
  );
});

const chartScenario = computed(() => {
  return selectedScenario.value === "all" ? undefined : selectedScenario.value;
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
  ...[...new Set((selectedEntry.value?.rows ?? []).map((r) => r.scenario))].map(
    (s) => ({
      label: t(scenarioLabelKeyByKey[s]),
      value: s,
    }),
  ),
]);

const availableSizesForTable = computed(() => [
  { label: t("common.scenarios.all"), value: "all" },
  ...[...new Set((selectedEntry.value?.rows ?? []).map((r) => r.size))]
    .sort((a, b) => a - b)
    .map((s) => ({ label: s.toLocaleString(locale.value), value: s })),
]);

const formatElapsed = (ms: number): string => {
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  const rs = Math.floor(s % 60);
  if (m < 60) return `${m}m ${rs}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

const canExportReport = computed(() => !!selectedEntry.value?.report);

const buildHistoryFilename = (ext: string): string => {
  const stamp =
    selectedEntry.value?.executedAt.replace(/[:.]/g, "-") ?? "report";
  return `comparator-report-${stamp}.${ext}`;
};

const downloadMarkdown = (): void => {
  if (!selectedEntry.value?.report) return;
  const md = benchmarkReport.generateMarkdownReport(selectedEntry.value.report);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  benchmarkReport.triggerDownload(blob, buildHistoryFilename("md"));
};

const downloadPdf = async (): Promise<void> => {
  if (!selectedEntry.value?.report) return;
  isExporting.value = true;
  try {
    const blob = await benchmarkReport.generatePdfBlob(selectedEntry.value.report);
    benchmarkReport.triggerDownload(blob, buildHistoryFilename("pdf"));
  } finally {
    isExporting.value = false;
  }
};

const selectedEntryEnvironment = computed(
  (): BenchmarkEnvironment | undefined => selectedEntry.value?.environment,
);

const formatDateTime = (isoDate: string): string => {
  return new Date(isoDate).toLocaleString(locale.value);
};

const entryCountLabel = (entry: ComparisonHistoryEntry): string => {
  return t("history.summary.entryCounts", {
    algorithms: entry.config.algorithms.length,
    scenarios: entry.config.scenarios.length,
  });
};

const sizeReplicationLabel = (entry: ComparisonHistoryEntry): string => {
  return t("history.summary.sizeReplication", {
    sizes: entry.config.sizes.length,
    replications: entry.config.replications,
  });
};

const selectEntry = (entryId: string): void => {
  selectedEntryId.value = entryId;
  feedbackMessage.value = "";
};

const refreshHistory = (): void => {
  entries.value = historyService.loadHistory();
  selectedEntryId.value = entries.value[0]?.id ?? null;
};

const clearHistory = (): void => {
  historyService.clearHistory();
  refreshHistory();
  feedbackMessage.value = t("history.feedback.cleared");
};

const reopenSimulation = async (): Promise<void> => {
  if (!selectedEntry.value) {
    return;
  }

  historyService.setPendingConfig(selectedEntry.value.config);
  await router.push("/comparador");
};

const exportCsv = (): void => {
  if (!selectedEntry.value) return;
  if (!selectedEntry.value.report) {
    feedbackMessage.value = t("history.feedback.reportMissing");
    return;
  }
  const csv = benchmarkReport.generateCsvReport(selectedEntry.value.report);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const stamp = selectedEntry.value.executedAt.replace(/[:.]/g, "-");
  benchmarkReport.triggerDownload(blob, `comparator-report-${stamp}.csv`);
  feedbackMessage.value = t("history.feedback.csvExported");
};

const exportChartPng = (): void => {
  const canvas = chartHost.value?.querySelector(
    "canvas",
  ) as HTMLCanvasElement | null;
  if (!canvas || !selectedEntry.value) {
    feedbackMessage.value = t("history.feedback.pngExportError");
    return;
  }

  const link = document.createElement("a");
  const filePrefix = t("history.export.filePrefix");
  link.href = canvas.toDataURL("image/png");
  link.download = `${filePrefix}-${selectedEntry.value.id}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  feedbackMessage.value = t("history.feedback.pngExported");
};
</script>

<template>
  <div class="page-wrap">
    <section class="page-card page-card--hero">
      <h2 class="page-card__title">{{ t("history.hero.title") }}</h2>
      <p class="page-card__description">
        {{ t("history.hero.description") }}
      </p>
    </section>

    <section class="historico-grid">
      <article class="page-card">
        <div
          style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
          "
        >
          <h3 class="page-card__title" style="margin: 0">
            {{ t("history.sections.saved") }}
          </h3>
          <a-button danger ghost size="small" @click="clearHistory">{{
            t("history.buttons.clear")
          }}</a-button>
        </div>

        <a-empty
          v-if="entries.length === 0"
          :description="t('history.empty.noEntries')"
        />

        <div v-else class="history-list">
          <div
            v-for="entry in entries"
            :key="entry.id"
            class="history-item"
            :class="{ 'history-item--active': selectedEntryId === entry.id }"
            @click="selectEntry(entry.id)"
          >
            <div class="history-item__date">
              {{ formatDateTime(entry.executedAt) }}
            </div>
            <div class="history-item__title">
              {{ entryCountLabel(entry) }}
            </div>
            <div style="font-size: 0.82rem; color: #6a7897">
              {{ sizeReplicationLabel(entry) }}
            </div>
          </div>
        </div>
      </article>

      <article class="page-card">
        <template v-if="selectedEntry">
          <div
            style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 12px;
              flex-wrap: wrap;
              margin-bottom: 10px;
            "
          >
            <h3 class="page-card__title" style="margin: 0">
              {{ t("history.sections.details") }}
            </h3>
            <a-space wrap>
              <a-button type="primary" @click="reopenSimulation">{{
                t("history.buttons.reopen")
              }}</a-button>
              <a-dropdown>
                <a-button :loading="isExporting">
                  {{ t("history.buttons.export") }} ▾
                </a-button>
                <template #overlay>
                  <a-menu>
                    <a-menu-item @click="exportCsv">CSV</a-menu-item>
                    <a-menu-item
                      :disabled="!canExportReport"
                      @click="downloadMarkdown"
                      >Markdown</a-menu-item
                    >
                    <a-menu-item
                      :disabled="!canExportReport"
                      @click="downloadPdf"
                      >PDF</a-menu-item
                    >
                  </a-menu>
                </template>
              </a-dropdown>
              <a-button @click="exportChartPng">{{
                t("history.buttons.exportPng")
              }}</a-button>
            </a-space>
          </div>

          <p style="margin: 0 0 4px; color: #4b5a79">
            {{
              t("history.summary.executedAt", {
                date: formatDateTime(selectedEntry.executedAt),
              })
            }}
          </p>
          <p
            v-if="selectedEntry.elapsedMs"
            style="margin: 0 0 12px; font-size: 0.88rem; color: var(--sl-text-soft)"
          >
            {{ t("history.summary.elapsed") }}:
            {{ formatElapsed(selectedEntry.elapsedMs) }}
          </p>

          <div
            v-if="selectedEntryEnvironment"
            class="benchmark-env benchmark-env--compact"
            style="margin-bottom: 14px"
          >
            <p class="benchmark-env__label">
              {{ t("environment.executedOn") }}
            </p>
            <p class="benchmark-env__line benchmark-env__line--strong">
              {{ selectedEntryEnvironment.browser }}
              {{ selectedEntryEnvironment.browserVersion }}
              <span v-if="selectedEntryEnvironment.engine">
                ({{ selectedEntryEnvironment.engine }})</span
              >
            </p>
            <p class="benchmark-env__line">{{ selectedEntryEnvironment.os }}</p>
            <p class="benchmark-env__line">
              <span v-if="selectedEntryEnvironment.cpuThreads">{{
                t("environment.threads", {
                  count: selectedEntryEnvironment.cpuThreads,
                })
              }}</span>
              <span
                v-if="
                  selectedEntryEnvironment.cpuThreads &&
                  selectedEntryEnvironment.memoryGB
                "
              >
                ·
              </span>
              <span v-if="selectedEntryEnvironment.memoryGB">{{
                t("environment.memory", {
                  gb: selectedEntryEnvironment.memoryGB,
                })
              }}</span>
              <span
                v-if="
                  selectedEntryEnvironment.cpuThreads ||
                  selectedEntryEnvironment.memoryGB
                "
              >
                ·
              </span>
              {{
                selectedEntryEnvironment.mobile
                  ? t("environment.mobile")
                  : t("environment.desktop")
              }}
            </p>
            <p class="benchmark-env__score">
              {{
                t("environment.baselineScore", {
                  score: selectedEntryEnvironment.baselineScore,
                })
              }}
            </p>
          </div>

          <div ref="chartHost" style="margin-bottom: 14px">
            <div
              style="
                display: flex;
                justify-content: flex-end;
                margin-bottom: 8px;
              "
            >
              <a-space wrap>
                <a-radio-group
                  v-model:value="selectedMetric"
                  button-style="solid"
                >
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
                  v-model:value="selectedScenario"
                  style="min-width: 170px"
                  :options="[
                    { value: 'all', label: t('common.scenarios.all') },
                    ...scenarioOptions.map((option) => ({
                      value: option.key,
                      label: t(scenarioLabelKeyByKey[option.key]),
                    })),
                  ]"
                />
              </a-space>
            </div>

            <ComparisonResultsChart
              :rows="selectedEntry.rows"
              :metric="selectedMetric"
              :scenario="chartScenario"
            />
          </div>

          <div
            style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px"
          >
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
          </div>
          <ComparisonResultsTable
            :rows="selectedEntry.rows"
            :scenario="tableScenario"
            :size="tableSize"
          />
        </template>

        <a-empty v-else :description="t('history.empty.selectEntry')" />

        <a-alert
          v-if="feedbackMessage"
          style="margin-top: 12px"
          type="info"
          :message="feedbackMessage"
          show-icon
        />
      </article>
    </section>
  </div>
</template>
