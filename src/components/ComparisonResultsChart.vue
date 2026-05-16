<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import { useI18n } from "vue-i18n";
import { Line } from "vue-chartjs";
import { useViewportBreakpoint } from "../composables/use-viewport-breakpoint";
import {
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  LogarithmicScale,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import type { Chart, ChartOptions, TooltipItem } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import type { ComponentPublicInstance } from "vue";
import type { ComparisonResultRow, ScenarioType } from "../types/comparator";
import { algorithmLabelKeyByKey } from "../constants/comparator-options";

ChartJS.register(
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin,
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

const palette = [
  "#1d4ed8",
  "#d97706",
  "#0f766e",
  "#a21caf",
  "#b91c1c",
  "#0891b2",
  "#65a30d",
  "#db2777",
  "#7c3aed",
  "#525252",
];

const isMobile = useViewportBreakpoint(600);
const useLogScale = ref(false);
const isZoomed = ref(false);

type LineChartInstance = ComponentPublicInstance & { chart: Chart<"line"> };
const chartRef = shallowRef<LineChartInstance | null>(null);

const filteredRows = computed(() => {
  if (!props.scenario) {
    return props.rows;
  }
  return props.rows.filter((row) => {
    return row.scenario === props.scenario;
  });
});

const sortedSizes = computed(() => {
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

    const data = sortedSizes.value.map((size) => {
      const values = valuesBySize.get(size) ?? [];
      if (values.length === 0) {
        return { x: size, y: null as number | null };
      }
      const total = values.reduce((sum, value) => sum + value, 0);
      const average = Number((total / values.length).toFixed(3));
      const safeY =
        useLogScale.value && average <= 0 ? null : (average as number | null);
      return { x: size, y: safeY };
    });

    const color = palette[index % palette.length];

    return {
      label: t(algorithmLabelKeyByKey[algorithm]),
      data,
      borderColor: color,
      backgroundColor: color,
      borderWidth: 2,
      tension: 0.24,
      pointRadius: 3,
      pointHoverRadius: 5,
      spanGaps: true,
    };
  });
});

const chartData = computed(() => {
  return {
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
  const sizeFormatter = new Intl.NumberFormat(locale.value, {
    maximumFractionDigits: 0,
  });
  const axisType = useLogScale.value ? "logarithmic" : "linear";

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
        itemSort: (a: TooltipItem<"line">, b: TooltipItem<"line">) => {
          const aValue =
            typeof a.parsed.y === "number" ? a.parsed.y : -Infinity;
          const bValue =
            typeof b.parsed.y === "number" ? b.parsed.y : -Infinity;
          return bValue - aValue;
        },
        callbacks: {
          title(items: TooltipItem<"line">[]) {
            const first = items[0];
            if (!first) {
              return "";
            }
            const x = typeof first.parsed.x === "number" ? first.parsed.x : 0;
            return `${t("chart.vectorSize")}: ${sizeFormatter.format(x)}`;
          },
          label(context: TooltipItem<"line">) {
            const value =
              typeof context.parsed.y === "number" ? context.parsed.y : 0;
            return `${context.dataset.label ?? t("chart.series")}: ${numberFormatter.format(value)}`;
          },
        },
      },
      zoom: {
        limits: {
          x: { min: "original", max: "original" },
          y: { min: "original", max: "original" },
        },
        pan: {
          enabled: !isMobile.value,
          mode: "xy",
          modifierKey: "ctrl",
        },
        zoom: {
          wheel: { enabled: !isMobile.value },
          pinch: { enabled: false },
          drag: {
            enabled: !isMobile.value,
            backgroundColor: "rgba(29, 78, 216, 0.15)",
            borderColor: "rgba(29, 78, 216, 0.6)",
            borderWidth: 1,
          },
          mode: "xy",
          onZoomComplete: () => {
            isZoomed.value = true;
          },
        },
      },
    },
    scales: {
      x: {
        type: axisType,
        title: {
          display: true,
          text: t("chart.vectorSize"),
        },
        ticks: {
          callback: (value: number | string) => {
            const numericValue =
              typeof value === "number" ? value : Number(value);
            return sizeFormatter.format(numericValue);
          },
        },
      },
      y: {
        type: axisType,
        title: {
          display: true,
          text: yAxisLabel.value,
        },
        beginAtZero: !useLogScale.value,
      },
    },
  };
});

const resetZoom = (): void => {
  chartRef.value?.chart.resetZoom();
  isZoomed.value = false;
};
</script>

<template>
  <div class="comparison-chart">
    <div v-if="rows.length > 0" class="comparison-chart__toolbar">
      <a-space :size="12" wrap>
        <a-tooltip :title="t('chart.zoomHint')">
          <label class="comparison-chart__switch">
            <a-switch v-model:checked="useLogScale" size="small" />
            <span>{{ t("chart.scaleLog") }}</span>
          </label>
        </a-tooltip>
        <a-button v-if="!isMobile" size="small" :disabled="!isZoomed" @click="resetZoom">
          {{ t("chart.resetZoom") }}
        </a-button>
      </a-space>
    </div>
    <div class="comparison-chart__canvas">
      <Line
        v-if="rows.length > 0"
        ref="chartRef"
        :data="chartData"
        :options="chartOptions"
      />
      <a-empty v-else :description="t('chart.empty')" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.comparison-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.comparison-chart__toolbar {
  display: flex;
  justify-content: flex-end;
}

.comparison-chart__switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 13px;
}

.comparison-chart__canvas {
  height: clamp(220px, 42vh, 320px);
}
</style>
