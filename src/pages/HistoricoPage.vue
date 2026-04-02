<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import ComparisonResultsTable from "../components/ComparisonResultsTable.vue";
import ComparisonResultsChart from "../components/ComparisonResultsChart.vue";
import {
  clearComparisonHistory,
  loadComparisonHistory,
  setPendingCompareConfig,
} from "../utils/comparison-history";
import type { ComparisonHistoryEntry, ScenarioType } from "../types/comparator";
import {
  scenarioLabelKeyByKey,
  scenarioOptions,
} from "../constants/comparator-options";

const router = useRouter();
const chartHost = ref<HTMLElement | null>(null);
const { t, locale } = useI18n();

const entries = ref<ComparisonHistoryEntry[]>(loadComparisonHistory());
const selectedEntryId = ref<string | null>(entries.value[0]?.id ?? null);
const feedbackMessage = ref<string>("");

const selectedMetric = ref<
  "averageTimeMs" | "averageComparisons" | "averageMemoryKb"
>("averageTimeMs");
const selectedScenario = ref<"all" | ScenarioType>("all");

const selectedEntry = computed(() => {
  return (
    entries.value.find((entry) => entry.id === selectedEntryId.value) ?? null
  );
});

const chartScenario = computed(() => {
  return selectedScenario.value === "all" ? undefined : selectedScenario.value;
});

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
  entries.value = loadComparisonHistory();
  selectedEntryId.value = entries.value[0]?.id ?? null;
};

const clearHistory = (): void => {
  clearComparisonHistory();
  refreshHistory();
  feedbackMessage.value = t("history.feedback.cleared");
};

const reopenSimulation = async (): Promise<void> => {
  if (!selectedEntry.value) {
    return;
  }

  setPendingCompareConfig(selectedEntry.value.config);
  await router.push("/comparador");
};

const exportCsv = (): void => {
  if (!selectedEntry.value) {
    return;
  }

  const header = [
    t("history.csvHeaders.algorithm"),
    t("history.csvHeaders.scenario"),
    t("history.csvHeaders.size"),
    t("history.csvHeaders.avgTimeMs"),
    t("history.csvHeaders.avgComparisons"),
    t("history.csvHeaders.avgMemoryKb"),
    t("history.csvHeaders.timeouts"),
  ];

  const rows = selectedEntry.value.rows.map((row) => {
    return [
      row.algorithm,
      row.scenario,
      row.size,
      row.averageTimeMs,
      row.averageComparisons,
      row.averageMemoryKb,
      row.timeoutCount,
    ].join(",");
  });

  const csv = [header.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  const filePrefix = t("history.export.filePrefix");
  link.download = `${filePrefix}-${selectedEntry.value.id}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

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
              <a-button @click="exportCsv">{{
                t("history.buttons.exportCsv")
              }}</a-button>
              <a-button @click="exportChartPng">{{
                t("history.buttons.exportPng")
              }}</a-button>
            </a-space>
          </div>

          <p style="margin: 0 0 12px; color: #4b5a79">
            {{
              t("history.summary.executedAt", {
                date: formatDateTime(selectedEntry.executedAt),
              })
            }}
          </p>

          <ComparisonResultsTable :rows="selectedEntry.rows" compact />

          <div ref="chartHost" style="margin-top: 14px">
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
