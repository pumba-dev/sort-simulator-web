<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { ComparisonResultRow, ScenarioType } from "../types/comparator";
import {
  algorithmLabelKeyByKey,
  scenarioLabelKeyByKey,
} from "../constants/comparator-options";

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

const columns = computed(() => {
  const integerFormatter = new Intl.NumberFormat(locale.value);

  return [
    {
      title: t("table.columns.algorithm"),
      dataIndex: "algorithmLabel",
      key: "algorithmLabel",
      width: 170,
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
      customRender: ({ value }: { value: number }) =>
        integerFormatter.format(value),
    },
    {
      title: t("table.columns.comparisons"),
      dataIndex: "averageComparisons",
      key: "averageComparisons",
      width: 140,
      sorter: (a: any, b: any) => a.averageComparisons - b.averageComparisons,
      customRender: ({ value }: { value: number }) =>
        integerFormatter.format(value),
    },
    {
      title: t("table.columns.swaps"),
      dataIndex: "averageSwaps",
      key: "averageSwaps",
      width: 120,
      sorter: (a: any, b: any) => a.averageSwaps - b.averageSwaps,
      customRender: ({ value }: { value: number }) =>
        integerFormatter.format(value),
    },
    {
      title: t("table.columns.avgMemoryKb"),
      dataIndex: "averageMemoryKb",
      key: "averageMemoryKb",
      width: 170,
      sorter: (a: any, b: any) => a.averageMemoryKb - b.averageMemoryKb,
      customRender: ({ value }: { value: number }) =>
        integerFormatter.format(value),
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
</script>

<template>
  <a-table
    :columns="columns"
    :data-source="dataSource"
    :loading="loading"
    :size="compact ? 'small' : 'middle'"
    :pagination="{ pageSize: 8, showSizeChanger: false }"
    row-key="id"
    :scroll="{ x: 1050 }"
  />
</template>
