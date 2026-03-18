<script setup lang="ts">
import { computed } from "vue";
import type { ComparisonResultRow } from "../types/comparator";
import {
  algorithmLabelByKey,
  scenarioLabelByKey,
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

const columns = [
  {
    title: "Algoritmo",
    dataIndex: "algorithmLabel",
    key: "algorithmLabel",
    width: 170,
  },
  {
    title: "Cenario",
    dataIndex: "scenarioLabel",
    key: "scenarioLabel",
    width: 130,
  },
  {
    title: "Tamanho",
    dataIndex: "size",
    key: "size",
    width: 120,
  },
  {
    title: "Tempo medio (ms)",
    dataIndex: "averageTimeMs",
    key: "averageTimeMs",
    width: 140,
  },
  {
    title: "Comparacoes",
    dataIndex: "averageComparisons",
    key: "averageComparisons",
    width: 140,
  },
  {
    title: "Memoria media (KB)",
    dataIndex: "averageMemoryKb",
    key: "averageMemoryKb",
    width: 170,
  },
  {
    title: "Timeouts",
    dataIndex: "timeoutCount",
    key: "timeoutCount",
    width: 110,
  },
];

const dataSource = computed(() => {
  return props.rows.map((row) => {
    return {
      ...row,
      algorithmLabel: algorithmLabelByKey[row.algorithm],
      scenarioLabel: scenarioLabelByKey[row.scenario],
      averageTimeMs: row.averageTimeMs.toFixed(3),
      averageComparisons: new Intl.NumberFormat("pt-BR").format(
        row.averageComparisons,
      ),
      averageMemoryKb: new Intl.NumberFormat("pt-BR").format(
        row.averageMemoryKb,
      ),
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
