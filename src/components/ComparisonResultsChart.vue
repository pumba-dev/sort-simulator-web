<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Line } from "vue-chartjs";
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import type { ChartOptions, TooltipItem } from "chart.js";
import type { ComparisonResultRow, ScenarioType } from "../types/comparator";
import { algorithmLabelKeyByKey } from "../constants/comparator-options";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

type MetricKey = "averageTimeMs" | "averageComparisons" | "averageMemoryKb";

const props = withDefaults(
  defineProps<{
    rows: ComparisonResultRow[];
    metric: MetricKey;
    scenario?: ScenarioType;
  }>(),
  {
    scenario: undefined,
  },
);

const { t, locale } = useI18n();

const palette = ["#1d4ed8", "#d97706", "#0f766e", "#a21caf", "#b91c1c"];

const filteredRows = computed(() => {
  if (!props.scenario) {
    return props.rows;
  }
  return props.rows.filter((row) => {
    return row.scenario === props.scenario;
  });
});

const labels = computed(() => {
  return [...new Set(filteredRows.value.map((row) => row.size))].sort(
    (a, b) => a - b,
  );
});

const datasets = computed(() => {
  const algorithms = [
    ...new Set(filteredRows.value.map((row) => row.algorithm)),
  ];

  return algorithms.map((algorithm, index) => {
    const valuesBySize = new Map<number, number[]>();

    filteredRows.value
      .filter((row) => row.algorithm === algorithm)
      .forEach((row) => {
        const current = valuesBySize.get(row.size) ?? [];
        current.push(row[props.metric]);
        valuesBySize.set(row.size, current);
      });

    const data = labels.value.map((size) => {
      const values = valuesBySize.get(size) ?? [];
      if (values.length === 0) {
        return 0;
      }
      const total = values.reduce((sum, value) => sum + value, 0);
      return Number((total / values.length).toFixed(3));
    });

    return {
      label: t(algorithmLabelKeyByKey[algorithm]),
      data,
      borderColor: palette[index % palette.length],
      backgroundColor: palette[index % palette.length],
      borderWidth: 2,
      tension: 0.24,
      pointRadius: 3,
      pointHoverRadius: 5,
    };
  });
});

const chartData = computed(() => {
  return {
    labels: labels.value,
    datasets: datasets.value,
  };
});

const yAxisLabel = computed(() => {
  if (props.metric === "averageTimeMs") {
    return t("chart.yAxis.avgTimeMs");
  }
  if (props.metric === "averageComparisons") {
    return t("chart.yAxis.avgComparisons");
  }
  return t("chart.yAxis.avgMemoryKb");
});

const chartOptions = computed<ChartOptions<"line">>(() => {
  const numberFormatter = new Intl.NumberFormat(locale.value, {
    maximumFractionDigits: 3,
  });

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "bottom",
      },
      tooltip: {
        callbacks: {
          label(context: TooltipItem<"line">) {
            const value = context.parsed.y ?? 0;
            return `${context.dataset.label ?? t("chart.series")}: ${numberFormatter.format(value)}`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: t("chart.vectorSize"),
        },
      },
      y: {
        title: {
          display: true,
          text: yAxisLabel.value,
        },
        beginAtZero: true,
      },
    },
  };
});
</script>

<template>
  <div style="height: 320px">
    <Line v-if="rows.length > 0" :data="chartData" :options="chartOptions" />
    <a-empty v-else :description="t('chart.empty')" />
  </div>
</template>
