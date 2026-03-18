<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import ComparisonResultsTable from "../components/ComparisonResultsTable.vue";
import ComparisonResultsChart from "../components/ComparisonResultsChart.vue";
import {
  clearComparisonHistory,
  loadComparisonHistory,
  setPendingCompareConfig,
} from "../utils/comparison-history";
import type { ComparisonHistoryEntry, ScenarioType } from "../types/comparator";

const router = useRouter();
const chartHost = ref<HTMLElement | null>(null);

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
  feedbackMessage.value = "Historico limpo com sucesso.";
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
    "algoritmo",
    "cenario",
    "tamanho",
    "tempo_medio_ms",
    "comparacoes_medias",
    "memoria_media_kb",
    "timeouts",
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
  link.download = `historico-${selectedEntry.value.id}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  feedbackMessage.value = "CSV exportado.";
};

const exportChartPng = (): void => {
  const canvas = chartHost.value?.querySelector(
    "canvas",
  ) as HTMLCanvasElement | null;
  if (!canvas || !selectedEntry.value) {
    feedbackMessage.value = "Nao foi possivel exportar o grafico.";
    return;
  }

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `historico-${selectedEntry.value.id}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  feedbackMessage.value = "Grafico exportado em PNG.";
};
</script>

<template>
  <div class="page-wrap">
    <section class="page-card page-card--hero">
      <h2 class="page-card__title">Modulo 3 - Historico e Exportacao</h2>
      <p class="page-card__description">
        Reabra simulacoes anteriores, confira detalhes e exporte os resultados.
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
          <h3 class="page-card__title" style="margin: 0">Simulacoes salvas</h3>
          <a-button danger ghost size="small" @click="clearHistory"
            >Limpar</a-button
          >
        </div>

        <a-empty
          v-if="entries.length === 0"
          description="Nenhuma simulacao registrada"
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
              {{ new Date(entry.executedAt).toLocaleString("pt-BR") }}
            </div>
            <div class="history-item__title">
              {{ entry.config.algorithms.length }} algoritmo(s) ·
              {{ entry.config.scenarios.length }} cenario(s)
            </div>
            <div style="font-size: 0.82rem; color: #6a7897">
              {{ entry.config.sizes.length }} tamanho(s),
              {{ entry.config.replications }} replicacao(oes)
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
              Detalhes da Simulacao
            </h3>
            <a-space wrap>
              <a-button type="primary" @click="reopenSimulation"
                >Reabrir no comparador</a-button
              >
              <a-button @click="exportCsv">Exportar CSV</a-button>
              <a-button @click="exportChartPng">Exportar PNG</a-button>
            </a-space>
          </div>

          <p style="margin: 0 0 12px; color: #4b5a79">
            Executado em
            {{ new Date(selectedEntry.executedAt).toLocaleString("pt-BR") }}
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
                  <a-radio-button value="averageTimeMs">Tempo</a-radio-button>
                  <a-radio-button value="averageComparisons"
                    >Comparacoes</a-radio-button
                  >
                  <a-radio-button value="averageMemoryKb"
                    >Memoria</a-radio-button
                  >
                </a-radio-group>
                <a-select
                  v-model:value="selectedScenario"
                  style="min-width: 170px"
                  :options="[
                    { value: 'all', label: 'Todos cenarios' },
                    { value: 'crescente', label: 'Crescente' },
                    { value: 'decrescente', label: 'Decrescente' },
                    { value: 'aleatorio', label: 'Aleatorio' },
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

        <a-empty
          v-else
          description="Selecione uma simulacao para ver os detalhes"
        />

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
