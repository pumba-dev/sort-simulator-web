<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { ComparisonResultRow } from "../types/comparator";
import {
  algorithmLabelKeyByKey,
  scenarioLabelKeyByKey,
} from "../constants/comparator-options";

const props = withDefaults(
  defineProps<{
    rows: ComparisonResultRow[];
    loading?: boolean;
    compact?: boolean;
  }>(),
  {
    loading: false,
    compact: false,
  },
);

const { t, locale } = useI18n();

const columns = computed(() => {
  return [
    {
      title: t("table.columns.algorithm"),
      dataIndex: "algorithmLabel",
      key: "algorithmLabel",
      width: 170,
    },
    {
      title: t("table.columns.scenario"),
      dataIndex: "scenarioLabel",
      key: "scenarioLabel",
      width: 130,
    },
    {
      title: t("table.columns.size"),
      dataIndex: "size",
      key: "size",
      width: 120,
    },
    {
      title: t("table.columns.avgTimeMs"),
      dataIndex: "averageTimeMs",
      key: "averageTimeMs",
      width: 140,
    },
    {
      title: t("table.columns.comparisons"),
      dataIndex: "averageComparisons",
      key: "averageComparisons",
      width: 140,
    },
    {
      title: t("table.columns.avgMemoryKb"),
      dataIndex: "averageMemoryKb",
      key: "averageMemoryKb",
      width: 170,
    },
    {
      title: t("table.columns.timeouts"),
      dataIndex: "timeoutCount",
      key: "timeoutCount",
      width: 110,
    },
  ];
});

const dataSource = computed(() => {
  const integerFormatter = new Intl.NumberFormat(locale.value);
  const decimalFormatter = new Intl.NumberFormat(locale.value, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

  return props.rows.map((row) => {
    return {
      ...row,
      algorithmLabel: t(algorithmLabelKeyByKey[row.algorithm]),
      scenarioLabel: t(scenarioLabelKeyByKey[row.scenario]),
      averageTimeMs: decimalFormatter.format(row.averageTimeMs),
      averageComparisons: integerFormatter.format(row.averageComparisons),
      averageMemoryKb: integerFormatter.format(row.averageMemoryKb),
    };
  });
});
</script>

<template>
  <a-table
    :columns="columns"
    :data-source="dataSource"
    :loading="loading"
    :size="compact ? 'small' : 'middle'"
    :pagination="compact ? false : { pageSize: 8, showSizeChanger: false }"
    row-key="id"
    :scroll="{ x: 930 }"
  />
</template>
