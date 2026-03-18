<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  algorithmOptions,
  scenarioOptions,
  sizeOptions,
  scenarioLabelByKey,
} from "../constants/comparator-options";
import type {
  AlgorithmKey,
  CompareJob,
  ComparisonResultRow,
  ScenarioType,
  WorkerMessage,
} from "../types/comparator";
import ComparisonResultsTable from "../components/ComparisonResultsTable.vue";
import ComparisonResultsChart from "../components/ComparisonResultsChart.vue";
import {
  consumePendingCompareConfig,
  saveComparisonHistoryEntry,
} from "../utils/comparison-history";

const selectedAlgorithms = ref<AlgorithmKey[]>([
  "insertion",
  "bubble",
  "merge",
]);
const selectedScenarios = ref<ScenarioType[]>(["aleatorio"]);
const selectedSizes = ref<number[]>([100, 1000, 5000]);
const replications = ref<number>(3);
const timeoutMs = ref<number>(250);

const isRunning = ref<boolean>(false);
const completed = ref<number>(0);
const total = ref<number>(0);
const rows = ref<ComparisonResultRow[]>([]);
const feedbackMessage = ref<string>(
  "Configure e inicie uma simulacao comparativa.",
);

const selectedMetric = ref<
  "averageTimeMs" | "averageComparisons" | "averageMemoryKb"
>("averageTimeMs");
const selectedScenarioForChart = ref<"all" | ScenarioType>("all");

let comparatorWorker: Worker | null = null;

const algorithmSelectOptions = computed(() => {
  return algorithmOptions.map((item) => ({
    label: item.label,
    value: item.key,
  }));
});

const scenarioSelectOptions = computed(() => {
  return scenarioOptions.map((item) => ({
    label: item.label,
    value: item.key,
  }));
});

const sizeSelectOptions = computed(() => {
  return sizeOptions.map((item) => ({
    label: item.toLocaleString("pt-BR"),
    value: item,
  }));
});

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

const validateJob = (): string | null => {
  if (selectedAlgorithms.value.length === 0) {
    return "Selecione ao menos um algoritmo.";
  }
  if (selectedScenarios.value.length === 0) {
    return "Selecione ao menos um cenario.";
  }
  if (selectedSizes.value.length === 0) {
    return "Selecione ao menos um tamanho de vetor.";
  }
  if (replications.value < 1) {
    return "Replicacoes deve ser maior que zero.";
  }
  if (timeoutMs.value < 1) {
    return "Timeout deve ser maior que zero.";
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

    if (message.type === "progress") {
      completed.value = message.completed;
      total.value = message.total;
      feedbackMessage.value = `Simulacao em andamento (${message.completed}/${message.total})`;
      return;
    }

    if (message.type === "result") {
      rows.value = message.rows;
      isRunning.value = false;
      feedbackMessage.value = "Simulacao finalizada.";
      saveComparisonHistoryEntry(buildJobPayload(), message.rows);
      return;
    }

    if (message.type === "cancelled") {
      isRunning.value = false;
      feedbackMessage.value = "Simulacao cancelada pelo usuario.";
      return;
    }

    if (message.type === "error") {
      isRunning.value = false;
      feedbackMessage.value = `Erro no comparador: ${message.message}`;
    }
  };

  return comparatorWorker;
};

const buildJobPayload = (): CompareJob => {
  return {
    algorithms: [...selectedAlgorithms.value],
    scenarios: [...selectedScenarios.value],
    sizes: [...selectedSizes.value],
    replications: replications.value,
    timeoutMs: timeoutMs.value,
  };
};

const startSimulation = (): void => {
  const validationError = validateJob();
  if (validationError) {
    feedbackMessage.value = validationError;
    return;
  }

  const worker = ensureWorker();
  const payload = buildJobPayload();

  rows.value = [];
  completed.value = 0;
  total.value =
    payload.algorithms.length * payload.scenarios.length * payload.sizes.length;
  isRunning.value = true;
  feedbackMessage.value = "Iniciando simulacao...";

  worker.postMessage({
    type: "start",
    payload,
  });
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
  selectedSizes.value = [...config.sizes];
  replications.value = config.replications;
  timeoutMs.value = config.timeoutMs;
};

onMounted(() => {
  const pendingConfig = consumePendingCompareConfig();
  if (pendingConfig) {
    applyPendingConfiguration(pendingConfig);
    feedbackMessage.value =
      "Configuracao carregada do historico. Clique em Iniciar para rodar novamente.";
  }
});

onBeforeUnmount(() => {
  if (comparatorWorker) {
    comparatorWorker.terminate();
    comparatorWorker = null;
  }
});
</script>

<template>
  <div class="page-wrap comparador-grid">
    <section class="page-card page-card--hero">
      <h2 class="page-card__title">Modulo 2 - Comparador de Algoritmos</h2>
      <p class="page-card__description">
        Configure cenarios, tamanhos e replicacoes para comparar desempenho
        medio entre algoritmos.
      </p>
    </section>

    <section class="page-card">
      <h3 class="page-card__title">Configuracao da Simulacao</h3>
      <div class="comparador-form-grid">
        <a-form-item label="Algoritmos">
          <a-select
            v-model:value="selectedAlgorithms"
            mode="multiple"
            :options="algorithmSelectOptions"
            :disabled="isRunning"
          />
        </a-form-item>

        <a-form-item label="Cenarios">
          <a-select
            v-model:value="selectedScenarios"
            mode="multiple"
            :options="scenarioSelectOptions"
            :disabled="isRunning"
          />
        </a-form-item>

        <a-form-item label="Tamanhos">
          <a-select
            v-model:value="selectedSizes"
            mode="multiple"
            :options="sizeSelectOptions"
            :disabled="isRunning"
          />
        </a-form-item>

        <a-form-item label="Replicacoes">
          <a-input-number
            v-model:value="replications"
            :min="1"
            :max="40"
            :disabled="isRunning"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item label="Timeout por execucao (ms)">
          <a-input-number
            v-model:value="timeoutMs"
            :min="1"
            :step="50"
            :disabled="isRunning"
            style="width: 100%"
          />
        </a-form-item>
      </div>

      <a-space wrap>
        <a-button type="primary" :loading="isRunning" @click="startSimulation"
          >Iniciar comparacao</a-button
        >
        <a-button danger :disabled="!isRunning" @click="cancelSimulation"
          >Cancelar</a-button
        >
      </a-space>
    </section>

    <section class="page-card">
      <h3 class="page-card__title">Progresso da Simulacao</h3>
      <a-progress
        :percent="progressPercent"
        :status="isRunning ? 'active' : 'normal'"
        :stroke-color="{ from: '#78a8ff', to: '#164fd6' }"
      />
      <p style="margin: 8px 0 0">{{ feedbackMessage }}</p>
    </section>

    <section class="page-card">
      <h3 class="page-card__title">Resultados em Tabela</h3>
      <ComparisonResultsTable :rows="rows" :loading="isRunning" />
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
          Resultados em Grafico
        </h3>
        <a-space wrap>
          <a-radio-group v-model:value="selectedMetric" button-style="solid">
            <a-radio-button value="averageTimeMs">Tempo</a-radio-button>
            <a-radio-button value="averageComparisons"
              >Comparacoes</a-radio-button
            >
            <a-radio-button value="averageMemoryKb">Memoria</a-radio-button>
          </a-radio-group>

          <a-select
            v-model:value="selectedScenarioForChart"
            style="min-width: 170px"
            :options="[
              { label: 'Todos cenarios', value: 'all' },
              ...scenarioOptions.map((item) => ({
                label: scenarioLabelByKey[item.key],
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
  </div>
</template>
