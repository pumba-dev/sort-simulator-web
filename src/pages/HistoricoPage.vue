<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { message, notification } from "ant-design-vue";
import {
  DeleteOutlined,
  StarFilled,
  StarOutlined,
  UploadOutlined,
} from "@ant-design/icons-vue";
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
const fileInput = ref<HTMLInputElement | null>(null);
const { t, locale } = useI18n();

const historyService = new ComparisonHistoryService();
const entries = ref<ComparisonHistoryEntry[]>(historyService.loadHistory());
const selectedEntryId = ref<string | null>(entries.value[0]?.id ?? null);

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

const manualEntries = computed(() =>
  entries.value.filter((entry) => entry.source !== "imported"),
);

const importedEntries = computed(() =>
  entries.value.filter((entry) => entry.source === "imported"),
);

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
    const blob = await benchmarkReport.generatePdfBlob(
      selectedEntry.value.report,
    );
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
};

const refreshHistory = (): void => {
  entries.value = historyService.loadHistory();
  if (
    !selectedEntryId.value ||
    !entries.value.some((entry) => entry.id === selectedEntryId.value)
  ) {
    selectedEntryId.value = entries.value[0]?.id ?? null;
  }
};

const clearHistory = (): void => {
  historyService.clearHistory();
  selectedEntryId.value = null;
  refreshHistory();
  message.success(t("history.feedback.cleared"));
};

const deleteEntry = (entryId: string): void => {
  historyService.deleteEntry(entryId);
  if (selectedEntryId.value === entryId) {
    selectedEntryId.value = null;
  }
  refreshHistory();
  message.success(t("history.feedback.deleted"));
};

const toggleFavorite = (entryId: string): void => {
  const updated = historyService.toggleFavorite(entryId);
  refreshHistory();
  if (updated) {
    message.success(
      updated.favorite
        ? t("history.feedback.favoriteAdded")
        : t("history.feedback.favoriteRemoved"),
    );
  }
};

const triggerImport = (): void => {
  fileInput.value?.click();
};

const handleImportFile = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }
  try {
    const text = await file.text();
    if (!text.trim()) {
      throw new Error(t("history.feedback.importEmptyFile"));
    }
    const report = benchmarkReport.parseCsvReport(text);
    const entry = historyService.importEntry(report);
    refreshHistory();
    selectedEntryId.value = entry.id;
    message.success(t("history.feedback.imported"));
  } catch (error) {
    const detail =
      error instanceof Error && error.message
        ? error.message.replace(/^parseCsvReport:\s*/, "")
        : String(error);
    notification.error({
      message: t("history.feedback.importError"),
      description: detail,
      duration: 6,
    });
  } finally {
    input.value = "";
  }
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
    message.warning(t("history.feedback.reportMissing"));
    return;
  }
  const csv = benchmarkReport.generateCsvReport(selectedEntry.value.report);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const stamp = selectedEntry.value.executedAt.replace(/[:.]/g, "-");
  benchmarkReport.triggerDownload(blob, `comparator-report-${stamp}.csv`);
  message.success(t("history.feedback.csvExported"));
};

const exportChartPng = (): void => {
  const canvas = chartHost.value?.querySelector(
    "canvas",
  ) as HTMLCanvasElement | null;
  if (!canvas || !selectedEntry.value) {
    message.error(t("history.feedback.pngExportError"));
    return;
  }

  const link = document.createElement("a");
  const filePrefix = t("history.export.filePrefix");
  link.href = canvas.toDataURL("image/png");
  link.download = `${filePrefix}-${selectedEntry.value.id}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  message.success(t("history.feedback.pngExported"));
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
        <h3 class="page-card__title" style="margin: 0 0 10px 0">
          {{ t("history.sections.saved") }}
        </h3>

        <div class="history-list__header">
          <a-space wrap>
            <a-button size="small" @click="triggerImport">
              <template #icon><UploadOutlined /></template>
              {{ t("history.buttons.import") }}
            </a-button>
            <a-popconfirm
              :title="t('history.confirm.clearAll')"
              @confirm="clearHistory"
            >
              <a-button danger ghost size="small">{{
                t("history.buttons.clear")
              }}</a-button>
            </a-popconfirm>
          </a-space>
          <input
            ref="fileInput"
            type="file"
            accept=".csv,text/csv"
            hidden
            @change="handleImportFile"
          />
        </div>

        <a-empty
          v-if="entries.length === 0"
          :description="t('history.empty.noEntries')"
        />

        <template v-else>
          <template v-if="importedEntries.length">
            <h4 class="history-section-label history-section-label--imported">
              {{ t("history.sections.imported") }}
            </h4>
            <div class="history-list">
              <div
                v-for="entry in importedEntries"
                :key="entry.id"
                class="history-item history-item--imported"
                :class="{
                  'history-item--active': selectedEntryId === entry.id,
                }"
                @click="selectEntry(entry.id)"
              >
                <div class="history-item__info">
                  <div class="history-item__date">
                    {{ formatDateTime(entry.executedAt) }}
                  </div>
                  <div class="history-item__title">
                    {{ entryCountLabel(entry) }}
                  </div>
                  <div class="history-item__meta">
                    {{ sizeReplicationLabel(entry) }}
                  </div>
                </div>
                <div class="history-item__actions">
                  <button
                    type="button"
                    class="history-item__icon-btn history-item__favorite"
                    :title="
                      entry.favorite
                        ? t('history.buttons.unfavorite')
                        : t('history.buttons.favorite')
                    "
                    @click.stop="toggleFavorite(entry.id)"
                  >
                    <StarFilled v-if="entry.favorite" />
                    <StarOutlined v-else />
                  </button>
                  <a-popconfirm
                    :title="t('history.confirm.deleteEntry')"
                    @confirm="deleteEntry(entry.id)"
                  >
                    <button
                      type="button"
                      class="history-item__icon-btn history-item__delete"
                      :title="t('history.buttons.delete')"
                      @click.stop
                    >
                      <DeleteOutlined />
                    </button>
                  </a-popconfirm>
                </div>
              </div>
            </div>
          </template>

          <template v-if="manualEntries.length">
            <h4 class="history-section-label">
              {{ t("history.sections.saved") }}
            </h4>

            <div class="history-list">
              <div
                v-for="entry in manualEntries"
                :key="entry.id"
                class="history-item"
                :class="{
                  'history-item--active': selectedEntryId === entry.id,
                }"
                @click="selectEntry(entry.id)"
              >
                <div class="history-item__info">
                  <div class="history-item__date">
                    {{ formatDateTime(entry.executedAt) }}
                  </div>
                  <div class="history-item__title">
                    {{ entryCountLabel(entry) }}
                  </div>
                  <div class="history-item__meta">
                    {{ sizeReplicationLabel(entry) }}
                  </div>
                </div>
                <div class="history-item__actions">
                  <button
                    type="button"
                    class="history-item__icon-btn history-item__favorite"
                    :title="
                      entry.favorite
                        ? t('history.buttons.unfavorite')
                        : t('history.buttons.favorite')
                    "
                    @click.stop="toggleFavorite(entry.id)"
                  >
                    <StarFilled v-if="entry.favorite" />
                    <StarOutlined v-else />
                  </button>
                  <a-popconfirm
                    :title="t('history.confirm.deleteEntry')"
                    @confirm="deleteEntry(entry.id)"
                  >
                    <button
                      type="button"
                      class="history-item__icon-btn history-item__delete"
                      :title="t('history.buttons.delete')"
                      @click.stop
                    >
                      <DeleteOutlined />
                    </button>
                  </a-popconfirm>
                </div>
              </div>
            </div>
          </template>
        </template>
      </article>

      <article class="page-card">
        <template v-if="selectedEntry">
          <div class="history-details__header">
            <h3 class="page-card__title history-details__title">
              {{ t("history.sections.details") }}
            </h3>
            <a-space wrap class="history-details__actions">
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
            </a-space>
          </div>

          <p class="history-details__line">
            {{
              t("history.summary.executedAt", {
                date: formatDateTime(selectedEntry.executedAt),
              })
            }}
          </p>
          <p
            v-if="selectedEntry.elapsedMs"
            class="history-details__line history-details__line--soft"
          >
            {{ t("history.summary.elapsed") }}:
            {{ formatElapsed(selectedEntry.elapsedMs) }}
          </p>

          <div
            v-if="selectedEntryEnvironment"
            class="benchmark-env benchmark-env--compact history-details__env"
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

          <div ref="chartHost" class="history-details__chart">
            <div class="history-chart-controls">
              <a-select
                v-model:value="selectedScenario"
                class="history-chart-controls__select"
                :options="[
                  { value: 'all', label: t('common.scenarios.all') },
                  ...scenarioOptions.map((option) => ({
                    value: option.key,
                    label: t(scenarioLabelKeyByKey[option.key]),
                  })),
                ]"
              />

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

              <a-button @click="exportChartPng">{{
                t("history.buttons.exportPng")
              }}</a-button>
            </div>

            <ComparisonResultsChart
              :rows="selectedEntry.rows"
              :metric="selectedMetric"
              :scenario="chartScenario"
            />
          </div>

          <div class="history-table-filters">
            <a-select
              v-model:value="selectedScenarioForTable"
              class="history-table-filters__select"
              :options="availableScenariosForTable"
            />
            <a-select
              v-model:value="selectedSizeForTable"
              class="history-table-filters__select"
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
      </article>
    </section>
  </div>
</template>
