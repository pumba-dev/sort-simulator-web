<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { ComparisonResultRow, ScenarioType } from "../types/comparator";
import {
  algorithmLabelKeyByKey,
  scenarioLabelKeyByKey,
} from "../constants/comparator-options";
import { useViewportBreakpoint } from "../composables/use-viewport-breakpoint";

const props = withDefaults(
  defineProps<{
    rows: ComparisonResultRow[];
    loading?: boolean;
    compact?: boolean;
    scenario?: ScenarioType;
    size?: number;
  }>(),
  {
    loading: false,
    compact: false,
  },
);

const { t, locale } = useI18n();

const isMobile = useViewportBreakpoint(600);

const integerFormatter = computed(() => new Intl.NumberFormat(locale.value));

const formatInt = (value: number): string =>
  integerFormatter.value.format(value);

const columns = computed(() => {
  return [
    {
      title: t("table.columns.algorithm"),
      dataIndex: "algorithmLabel",
      key: "algorithmLabel",
      width: 150,
      sorter: (a: any, b: any) =>
        a.algorithmLabel.localeCompare(b.algorithmLabel),
    },
    {
      title: t("table.columns.scenario"),
      dataIndex: "scenarioLabel",
      key: "scenarioLabel",
      width: 130,
      sorter: (a: any, b: any) =>
        a.scenarioLabel.localeCompare(b.scenarioLabel),
    },
    {
      title: t("table.columns.size"),
      dataIndex: "size",
      key: "size",
      width: 120,
      sorter: (a: any, b: any) => a.size - b.size,
    },
    {
      title: t("table.columns.avgTimeMs"),
      dataIndex: "averageTimeMs",
      key: "averageTimeMs",
      width: 140,
      sorter: (a: any, b: any) => a.averageTimeMs - b.averageTimeMs,
      customRender: ({ value }: { value: number }) => formatInt(value),
    },
    {
      title: t("table.columns.comparisons"),
      dataIndex: "averageComparisons",
      key: "averageComparisons",
      width: 120,
      sorter: (a: any, b: any) => a.averageComparisons - b.averageComparisons,
      customRender: ({ value }: { value: number }) => formatInt(value),
    },
    {
      title: t("table.columns.swaps"),
      dataIndex: "averageSwaps",
      key: "averageSwaps",
      width: 120,
      sorter: (a: any, b: any) => a.averageSwaps - b.averageSwaps,
      customRender: ({ value }: { value: number }) => formatInt(value),
    },
    {
      title: t("table.columns.avgMemoryKb"),
      dataIndex: "averageMemoryKb",
      key: "averageMemoryKb",
      width: 150,
      sorter: (a: any, b: any) => a.averageMemoryKb - b.averageMemoryKb,
      customRender: ({ value }: { value: number }) => formatInt(value),
    },
    {
      title: t("table.columns.timeouts"),
      dataIndex: "timeoutCount",
      key: "timeoutCount",
      width: 110,
      sorter: (a: any, b: any) => a.timeoutCount - b.timeoutCount,
    },
  ];
});

const dataSource = computed(() => {
  const filtered = props.rows
    .filter((row) => !props.scenario || row.scenario === props.scenario)
    .filter((row) => !props.size || row.size === props.size);

  return filtered.map((row) => ({
    ...row,
    algorithmLabel: t(algorithmLabelKeyByKey[row.algorithm]),
    scenarioLabel: t(scenarioLabelKeyByKey[row.scenario]),
  }));
});

const mobilePage = ref(1);
const mobilePageSize = 6;

const paginatedMobileRows = computed(() => {
  const start = (mobilePage.value - 1) * mobilePageSize;
  return dataSource.value.slice(start, start + mobilePageSize);
});
</script>

<template>
  <div v-if="isMobile" class="comparison-cards">
    <a-spin :spinning="loading">
      <template v-if="dataSource.length > 0">
        <div
          v-for="row in paginatedMobileRows"
          :key="row.id"
          class="comparison-card"
        >
          <div class="comparison-card__head">
            <strong class="comparison-card__title">
              {{ row.algorithmLabel }}
            </strong>
            <a-tag color="blue">{{ row.scenarioLabel }}</a-tag>
          </div>
          <div class="comparison-card__size">
            {{ t("table.columns.size") }}:
            <strong>{{ formatInt(row.size) }}</strong>
          </div>
          <div class="comparison-card__grid">
            <div class="comparison-card__metric">
              <span>{{ t("table.columns.avgTimeMs") }}</span>
              <strong>{{ formatInt(row.averageTimeMs) }}</strong>
            </div>
            <div class="comparison-card__metric">
              <span>{{ t("table.columns.comparisons") }}</span>
              <strong>{{ formatInt(row.averageComparisons) }}</strong>
            </div>
            <div class="comparison-card__metric">
              <span>{{ t("table.columns.swaps") }}</span>
              <strong>{{ formatInt(row.averageSwaps) }}</strong>
            </div>
            <div class="comparison-card__metric">
              <span>{{ t("table.columns.avgMemoryKb") }}</span>
              <strong>{{ formatInt(row.averageMemoryKb) }}</strong>
            </div>
            <div class="comparison-card__metric">
              <span>{{ t("table.columns.timeouts") }}</span>
              <strong>{{ formatInt(row.timeoutCount) }}</strong>
            </div>
          </div>
        </div>
        <a-pagination
          v-model:current="mobilePage"
          :total="dataSource.length"
          :page-size="mobilePageSize"
          :show-size-changer="false"
          size="small"
          class="comparison-cards__pagination"
        />
      </template>
      <a-empty v-else />
    </a-spin>
  </div>
  <a-table
    v-else
    :columns="columns"
    :data-source="dataSource"
    :loading="loading"
    :size="compact ? 'small' : 'middle'"
    :pagination="{ pageSize: 8, showSizeChanger: false }"
    row-key="id"
    :scroll="{ x: 600 }"
  />
</template>
