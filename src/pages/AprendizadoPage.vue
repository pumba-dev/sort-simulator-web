<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  learningAlgorithms,
  learningByKey,
} from "../constants/learning-algorithms";
import type { AlgorithmKey, ScenarioType } from "../types/comparator";
// @ts-ignore
import bubbleSort from "../../algorithms/bubbleSort";
// @ts-ignore
import insertionSort from "../../algorithms/inserctionSort";
// @ts-ignore
import mergeSort from "../../algorithms/mergeSort";
// @ts-ignore
import heapSort from "../../algorithms/heapSort";
// @ts-ignore
import quickSort from "../../algorithms/quickSort";

type InputMode = "gerado" | "manual";

type AnimationStep = {
  values: number[];
  activeIndexes: number[];
  pivotIndex: number | null;
  comparisons: number;
  swaps: number;
  variables: Record<string, number | null>;
  // Algorithm-specific visualization data
  gapIndex?: number | null; // insertion sort
  divisions?: number[][]; // merge sort: arrays being divided
  divisionDepth?: number; // merge sort: recursion depth
  merging?: { start: number; end: number }; // merge sort: range being merged
  heapifyRegion?: { start: number; end: number }; // heap sort: region being heapified
  partitionIndex?: number | null; // quick sort: pivot final position
  sortedPartition?: { start: number; end: number }; // bubble sort: already sorted region
};

const selectedAlgorithm = ref<AlgorithmKey>("bubble");
const inputMode = ref<InputMode>("gerado");
const generatedScenario = ref<ScenarioType>("aleatorio");
const generatedSize = ref<number>(24);
const manualVectorText = ref<string>("8, 4, 6, 1, 3, 9, 2, 7");
const speed = ref<number>(3);

const steps = ref<AnimationStep[]>([]);
const currentStepIndex = ref<number>(0);
const comparisons = ref<number>(0);
const swaps = ref<number>(0);
const elapsedMs = ref<number>(0);
const isPlaying = ref<boolean>(false);
const playbackStartedAt = ref<number | null>(null);

let timerId: number | null = null;

const scenarioLabelByKey: Record<ScenarioType, string> = {
  crescente: "Crescente",
  decrescente: "Decrescente",
  aleatorio: "Aleatorio",
};

const selectedMetadata = computed(() => {
  return learningByKey[selectedAlgorithm.value];
});

const bars = computed(() => {
  const currentStep = steps.value[currentStepIndex.value];
  return currentStep ? currentStep.values : [];
});

const activeIndexes = computed(() => {
  const currentStep = steps.value[currentStepIndex.value];
  return currentStep ? currentStep.activeIndexes : [];
});

const pivotIndex = computed(() => {
  const currentStep = steps.value[currentStepIndex.value];
  return currentStep ? currentStep.pivotIndex : null;
});

const gapIndex = computed(() => {
  const currentStep = steps.value[currentStepIndex.value];
  return currentStep ? (currentStep.gapIndex ?? null) : null;
});

const sortedPartition = computed(() => {
  const currentStep = steps.value[currentStepIndex.value];
  return currentStep ? (currentStep.sortedPartition ?? null) : null;
});

const heapifyRegion = computed(() => {
  const currentStep = steps.value[currentStepIndex.value];
  return currentStep ? (currentStep.heapifyRegion ?? null) : null;
});

const merging = computed(() => {
  const currentStep = steps.value[currentStepIndex.value];
  return currentStep ? (currentStep.merging ?? null) : null;
});

const partitionIndex = computed(() => {
  const currentStep = steps.value[currentStepIndex.value];
  return currentStep ? (currentStep.partitionIndex ?? null) : null;
});

const currentStep = computed(() => {
  return steps.value[currentStepIndex.value] ?? null;
});

const maxBarValue = computed(() => {
  const source = bars.value;
  if (source.length === 0) {
    return 1;
  }
  return Math.max(...source);
});

const progressPercent = computed(() => {
  if (steps.value.length <= 1) {
    return 0;
  }
  return Math.round((currentStepIndex.value / (steps.value.length - 1)) * 100);
});

const canStart = computed(() => {
  return steps.value.length > 0 && !isPlaying.value;
});

const canPause = computed(() => {
  return isPlaying.value;
});

const canContinue = computed(() => {
  return (
    !isPlaying.value &&
    currentStepIndex.value < steps.value.length - 1 &&
    steps.value.length > 0
  );
});

const canReset = computed(() => {
  return steps.value.length > 0;
});

const statusText = computed(() => {
  if (steps.value.length === 0) {
    return "Pronto para preparar simulacao";
  }
  if (isPlaying.value) {
    return "Executando";
  }
  if (currentStepIndex.value >= steps.value.length - 1) {
    return "Concluido";
  }
  return "Pausado";
});

const delayMs = computed(() => {
  const normalized = Math.max(1, Math.min(speed.value, 10));
  return 800 - normalized * 65;
});

const stopTimer = (): void => {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
};

const createArrayByScenario = (
  size: number,
  scenario: ScenarioType,
): number[] => {
  if (scenario === "crescente") {
    return Array.from({ length: size }, (_, index) => index + 1);
  }

  if (scenario === "decrescente") {
    return Array.from({ length: size }, (_, index) => size - index);
  }

  // Aleatorio: create array with unique numbers from 1 to size, then shuffle
  const arr = Array.from({ length: size }, (_, index) => index + 1);
  // Fisher-Yates shuffle algorithm
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const parseManualValues = (): number[] => {
  const parsed = manualVectorText.value
    .split(/[\s,;]+/)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));

  return parsed.slice(0, 80);
};

const buildAnimationSteps = (baseVector: number[]): AnimationStep[] => {
  // Select and execute the appropriate algorithm
  let algorithmSteps: AnimationStep[] = [];

  switch (selectedAlgorithm.value) {
    case "bubble":
      algorithmSteps = bubbleSort(baseVector);
      break;
    case "insertion":
      algorithmSteps = insertionSort(baseVector);
      break;
    case "merge":
      algorithmSteps = mergeSort(baseVector);
      break;
    case "heap":
      algorithmSteps = heapSort(baseVector);
      break;
    case "quick":
      algorithmSteps = quickSort(baseVector);
      break;
    default:
      // Fallback to bubble sort
      algorithmSteps = bubbleSort(baseVector);
  }

  // Ensure we always have at least one step
  if (algorithmSteps.length === 0) {
    algorithmSteps = [
      {
        values: [...baseVector],
        activeIndexes: [],
        pivotIndex: null,
        comparisons: 0,
        swaps: 0,
        variables: { i: null, j: null },
      },
    ];
  }

  return algorithmSteps;
};

const prepareSimulation = (): void => {
  stopTimer();
  isPlaying.value = false;
  playbackStartedAt.value = null;

  const sourceVector =
    inputMode.value === "manual"
      ? parseManualValues()
      : createArrayByScenario(
          Math.min(generatedSize.value, 80),
          generatedScenario.value,
        );

  const fallbackVector =
    sourceVector.length > 1 ? sourceVector : [5, 1, 4, 2, 3];
  steps.value = buildAnimationSteps(fallbackVector);
  currentStepIndex.value = 0;

  const firstStep = steps.value[0];
  comparisons.value = firstStep?.comparisons ?? 0;
  swaps.value = firstStep?.swaps ?? 0;
  elapsedMs.value = 0;
};

const advanceOneStep = (): void => {
  if (currentStepIndex.value >= steps.value.length - 1) {
    stopTimer();
    isPlaying.value = false;
    if (playbackStartedAt.value !== null) {
      elapsedMs.value = Math.round(performance.now() - playbackStartedAt.value);
    }
    return;
  }

  currentStepIndex.value += 1;
  const current = steps.value[currentStepIndex.value];
  if (current) {
    comparisons.value = current.comparisons;
    swaps.value = current.swaps;
  }
};

const startSimulation = (): void => {
  if (steps.value.length === 0) {
    prepareSimulation();
  }

  stopTimer();
  isPlaying.value = true;

  if (playbackStartedAt.value === null) {
    playbackStartedAt.value = performance.now() - elapsedMs.value;
  }

  timerId = window.setInterval(() => {
    advanceOneStep();
  }, delayMs.value);
};

const pauseSimulation = (): void => {
  if (!isPlaying.value) {
    return;
  }

  stopTimer();
  isPlaying.value = false;

  if (playbackStartedAt.value !== null) {
    elapsedMs.value = Math.round(performance.now() - playbackStartedAt.value);
  }
};

const continueSimulation = (): void => {
  if (canContinue.value) {
    startSimulation();
  }
};

const resetSimulation = (): void => {
  stopTimer();
  isPlaying.value = false;
  currentStepIndex.value = 0;
  comparisons.value = steps.value[0]?.comparisons ?? 0;
  swaps.value = steps.value[0]?.swaps ?? 0;
  elapsedMs.value = 0;
  playbackStartedAt.value = null;
};

const regenerateVector = (): void => {
  prepareSimulation();
};

watch(speed, () => {
  if (isPlaying.value) {
    startSimulation();
  }
});

watch([selectedAlgorithm, generatedScenario, generatedSize], () => {
  // Automatically regenerate vector when algorithm, scenario, or size changes
  prepareSimulation();
});

onBeforeUnmount(() => {
  stopTimer();
});

prepareSimulation();
</script>

<template>
  <div class="page-wrap">
    <section class="page-card page-card--hero">
      <h2 class="page-card__title">Aprendizado e Teste</h2>
      <p class="page-card__description">
        Estude como cada algoritmo evolui no vetor com visualizacao iterativa e
        controles de execucao.
      </p>
    </section>

    <section class="aprendizado-grid">
      <div class="aprendizado-grid__left">
        <article class="page-card">
          <h3 class="page-card__title">Configuracao do Algoritmo</h3>
          <a-form layout="vertical">
            <a-form-item>
              <template #label>
                <a-tooltip
                  title="Escolha o algoritmo de ordenação a visualizar. Cada um tem comportamento e performance diferentes."
                >
                  <span>Algoritmo</span>
                </a-tooltip>
              </template>
              <a-select
                v-model:value="selectedAlgorithm"
                :disabled="isPlaying"
                :options="
                  learningAlgorithms.map((item) => ({
                    value: item.key,
                    label: item.title,
                  }))
                "
              />
            </a-form-item>

            <a-form-item>
              <template #label>
                <a-tooltip
                  title="Escolha se quer um vetor gerado automaticamente ou inserir seus próprios valores."
                >
                  <span>Tipo de entrada</span>
                </a-tooltip>
              </template>
              <a-radio-group v-model:value="inputMode" :disabled="isPlaying">
                <a-radio-button value="gerado">Gerado</a-radio-button>
                <a-radio-button value="manual">Manual</a-radio-button>
              </a-radio-group>
            </a-form-item>

            <template v-if="inputMode === 'gerado'">
              <a-form-item>
                <template #label>
                  <a-tooltip
                    title="Crescente: vetor já ordenado. Decrescente: vetor invertido. Aleatório: ordem aleatória."
                  >
                    <span>Cenario</span>
                  </a-tooltip>
                </template>
                <a-segmented
                  v-model:value="generatedScenario"
                  :disabled="isPlaying"
                  :options="[
                    { value: 'crescente', label: scenarioLabelByKey.crescente },
                    {
                      value: 'decrescente',
                      label: scenarioLabelByKey.decrescente,
                    },
                    { value: 'aleatorio', label: scenarioLabelByKey.aleatorio },
                  ]"
                />
              </a-form-item>

              <a-form-item>
                <template #label>
                  <a-tooltip
                    title="Quantidade de elementos no vetor (máximo 80 para visualização clara)."
                  >
                    <span>Tamanho para visualizacao (maximo 80)</span>
                  </a-tooltip>
                </template>
                <a-slider
                  v-model:value="generatedSize"
                  :disabled="isPlaying"
                  :min="8"
                  :max="80"
                  :step="1"
                />
              </a-form-item>
            </template>

            <a-form-item v-else>
              <template #label>
                <a-tooltip
                  title="Insira números separados por vírgula, espaço ou ponto e vírgula. Máximo 80 valores."
                >
                  <span>Vetor manual (numeros separados por virgula)</span>
                </a-tooltip>
              </template>
              <a-textarea
                v-model:value="manualVectorText"
                :disabled="isPlaying"
                :rows="4"
              />
            </a-form-item>

            <a-space>
              <a-button
                type="default"
                :disabled="isPlaying"
                @click="regenerateVector"
                >Preparar</a-button
              >
            </a-space>
          </a-form>
        </article>

        <article class="page-card">
          <h3 class="page-card__title">
            <a-tooltip
              title="Informações sobre o algoritmo selecionado: conceito, estratégia de funcionamento e complexidade em diferentes cenários."
            >
              <span>Descricao e Complexidade</span>
            </a-tooltip>
          </h3>
          <a-space direction="vertical" style="width: 100%" :size="10">
            <p>{{ selectedMetadata.concept }}</p>
            <p>{{ selectedMetadata.strategy }}</p>
            <a-space wrap>
              <a-tag color="green"
                >Melhor: {{ selectedMetadata.bestCase }}</a-tag
              >
              <a-tag color="blue"
                >Medio: {{ selectedMetadata.averageCase }}</a-tag
              >
              <a-tag color="volcano"
                >Pior: {{ selectedMetadata.worstCase }}</a-tag
              >
            </a-space>
          </a-space>
        </article>

        <article class="page-card">
          <h3 class="page-card__title">Controles da Animacao</h3>
          <a-form layout="vertical">
            <a-form-item>
              <template #label>
                <a-tooltip
                  title="Ajuste a velocidade de reprodução da animação. Valores maiores = mais rápido."
                >
                  <span>Velocidade</span>
                </a-tooltip>
              </template>
              <div style="display: flex; align-items: center; gap: 12px">
                <a-slider
                  v-model:value="speed"
                  :min="1"
                  :max="10"
                  :step="1"
                  style="flex: 1"
                />
                <span style="font-weight: bold; min-width: 40px"
                  >{{ speed }}x</span
                >
              </div>
            </a-form-item>
          </a-form>

          <a-space wrap>
            <a-tooltip title="Inicia a execução automatizada do algoritmo">
              <a-button
                type="primary"
                :disabled="!canStart"
                @click="startSimulation"
                >Iniciar</a-button
              >
            </a-tooltip>
            <a-tooltip title="Pausa a animação no passo atual">
              <a-button :disabled="!canPause" @click="pauseSimulation"
                >Pausar</a-button
              >
            </a-tooltip>
            <a-tooltip title="Continua a animação do ponto onde foi pausada">
              <a-button :disabled="!canContinue" @click="continueSimulation"
                >Continuar</a-button
              >
            </a-tooltip>
            <a-tooltip title="Volta ao primeiro passo da animação">
              <a-button :disabled="!canReset" @click="resetSimulation"
                >Reiniciar</a-button
              >
            </a-tooltip>
          </a-space>
          <a-divider style="margin: 14px 0" />
          <p style="margin: 0">
            Status: <strong>{{ statusText }}</strong>
          </p>
          <a-progress
            :percent="progressPercent"
            :stroke-color="{ from: '#78a8ff', to: '#164fd6' }"
          />
        </article>
      </div>

      <div class="aprendizado-grid__right">
        <article class="page-card">
          <h3 class="page-card__title">
            <a-tooltip
              title="Gráfico visual do vetor. As cores mudam conforme o algoritmo executa: barra ativa (amarelo), já ordenada (verde), pivot (vermelho), etc."
            >
              <span>Visualizacao do Vetor</span>
            </a-tooltip>
          </h3>
          <div
            class="sort-bars"
            role="img"
            aria-label="Animacao do vetor sendo ordenado"
          >
            <div
              v-for="(value, index) in bars"
              :key="`${index}-${value}`"
              class="sort-bars-wrapper"
              :class="{
                'sort-bars-wrapper--gap':
                  selectedAlgorithm === 'insertion' && gapIndex === index,
                'sort-bars-wrapper--comparing':
                  selectedAlgorithm === 'insertion' &&
                  (index === currentStep?.variables.i ||
                    index === currentStep?.variables.j),
                'sort-bars-wrapper--sorted':
                  selectedAlgorithm === 'bubble' &&
                  sortedPartition &&
                  index >= sortedPartition.start &&
                  index < sortedPartition.end,
                'sort-bars-wrapper--heapifying':
                  selectedAlgorithm === 'heap' &&
                  heapifyRegion &&
                  index >= heapifyRegion.start &&
                  index < heapifyRegion.end,
                'sort-bars-wrapper--merging':
                  selectedAlgorithm === 'merge' &&
                  merging &&
                  index >= merging.start &&
                  index < merging.end,
                'sort-bars-wrapper--merge-comparing':
                  selectedAlgorithm === 'merge' &&
                  (index === currentStep?.variables.left ||
                    index === currentStep?.variables.mid ||
                    index === currentStep?.variables.right),
                'sort-bars-wrapper--quick-partition':
                  selectedAlgorithm === 'quick' && partitionIndex === index,
              }"
            >
              <div class="sort-bars__value">
                {{ value !== null && value !== undefined ? value : "—" }}
              </div>
              <div
                v-if="selectedAlgorithm === 'insertion' && gapIndex === index"
                class="sort-bars__item sort-bars__item--gap"
                style="opacity: 0.3"
              />
              <div
                v-else
                class="sort-bars__item"
                :class="{
                  'sort-bars__item--active': activeIndexes.includes(index),
                  'sort-bars__item--pivot': pivotIndex === index,
                  'sort-bars__item--partition':
                    selectedAlgorithm === 'quick' && partitionIndex === index,
                  'sort-bars__item--sorted':
                    selectedAlgorithm === 'bubble' &&
                    sortedPartition &&
                    index >= sortedPartition.start &&
                    index < sortedPartition.end,
                }"
                :style="{
                  height:
                    value !== null && value !== undefined
                      ? `${Math.max(6, (value / maxBarValue) * 100)}%`
                      : '0%',
                }"
              />
              <div class="sort-bars__index">{{ index + 1 }}</div>
            </div>
          </div>
        </article>

        <article class="page-card">
          <h3 class="page-card__title">
            <a-tooltip
              title="Monitore as variáveis internas do algoritmo em tempo real conforme ele executa. Cada algoritmo expõe suas próprias variáveis de controle."
            >
              <span>Estado das Variaveis</span>
            </a-tooltip>
          </h3>
          <div class="variables-display">
            <div v-if="currentStep" class="variables-display__grid">
              <!-- Bubble Sort variables -->
              <template v-if="selectedAlgorithm === 'bubble'">
                <a-tooltip
                  title="Índice da passagem externa (quantas vezes a bolha passou)"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">i (passagem):</span>
                    <span class="variable-item__value">{{
                      currentStep.variables.i !== null
                        ? currentStep.variables.i
                        : "—"
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  title="Índice de comparação na passagem atual (comparando com o anterior)"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">j (comparacao):</span>
                    <span class="variable-item__value">{{
                      currentStep.variables.j !== null
                        ? currentStep.variables.j
                        : "—"
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  title="A partir deste índice, os elementos já estão na posição final"
                >
                  <div v-if="sortedPartition" class="variable-item">
                    <span class="variable-item__label">Ordenado desde:</span>
                    <span class="variable-item__value">{{
                      sortedPartition.start
                    }}</span>
                  </div>
                </a-tooltip>
              </template>

              <!-- Insertion Sort variables -->
              <template v-else-if="selectedAlgorithm === 'insertion'">
                <a-tooltip
                  title="Índice do elemento sendo inserido na sequência ordenada"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">j (elemento):</span>
                    <span class="variable-item__value">{{
                      currentStep.variables.j !== null
                        ? currentStep.variables.j
                        : "—"
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  title="Índice da comparação durante a busca da posição correta"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">i (comparacao):</span>
                    <span class="variable-item__value">{{
                      currentStep.variables.i !== null
                        ? currentStep.variables.i
                        : "—"
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip title="Valor do elemento que está sendo inserido">
                  <div class="variable-item">
                    <span class="variable-item__label">key:</span>
                    <span class="variable-item__value">{{
                      currentStep.variables.key !== null
                        ? currentStep.variables.key
                        : "—"
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  title="Posição da lacuna aberta onde o elemento será inserido"
                >
                  <div v-if="gapIndex !== null" class="variable-item">
                    <span class="variable-item__label">Lacuna em:</span>
                    <span class="variable-item__value">{{ gapIndex }}</span>
                  </div>
                </a-tooltip>
              </template>

              <!-- Merge Sort variables -->
              <template v-else-if="selectedAlgorithm === 'merge'">
                <a-tooltip title="Índice do início da partição esquerda">
                  <div class="variable-item">
                    <span class="variable-item__label">Esquerda:</span>
                    <span class="variable-item__value">{{
                      currentStep.variables.left !== null
                        ? currentStep.variables.left
                        : "—"
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  title="Índice do ponto meio (divisão entre esquerda e direita)"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">Meio:</span>
                    <span class="variable-item__value">{{
                      currentStep.variables.mid !== null
                        ? currentStep.variables.mid
                        : "—"
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip title="Índice do final da partição direita">
                  <div class="variable-item">
                    <span class="variable-item__label">Direita:</span>
                    <span class="variable-item__value">{{
                      currentStep.variables.right !== null
                        ? currentStep.variables.right
                        : "—"
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  title="Nível de profundidade na recursão (0 = merge final, maiores = recursão mais profunda)"
                >
                  <div
                    v-if="currentStep.divisionDepth !== undefined"
                    class="variable-item"
                  >
                    <span class="variable-item__label">Profundidade:</span>
                    <span class="variable-item__value">{{
                      currentStep.divisionDepth
                    }}</span>
                  </div>
                </a-tooltip>
              </template>

              <!-- Heap Sort variables -->
              <template v-else-if="selectedAlgorithm === 'heap'">
                <a-tooltip
                  title="Índice do nó sendo heapificado (comparado com seus filhos)"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">i (indice):</span>
                    <span class="variable-item__value">{{
                      currentStep.variables.i !== null
                        ? currentStep.variables.i
                        : "—"
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  title="Índice do maior elemento entre o nó e seus filhos"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">Maior:</span>
                    <span class="variable-item__value">{{
                      currentStep.variables.largest !== null
                        ? currentStep.variables.largest
                        : "—"
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  title="Tamanho atual do heap (diminui a cada extração do máximo)"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">Heap Size:</span>
                    <span class="variable-item__value">{{
                      currentStep.variables.heapSize !== null
                        ? currentStep.variables.heapSize
                        : "—"
                    }}</span>
                  </div>
                </a-tooltip>
              </template>

              <!-- Quick Sort variables -->
              <template v-else-if="selectedAlgorithm === 'quick'">
                <a-tooltip
                  title="Índice esquerdo (p) da partição sendo processada"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">Esquerda (p):</span>
                    <span class="variable-item__value">{{
                      currentStep.variables.p !== null
                        ? currentStep.variables.p
                        : "—"
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  title="Índice direito (r) da partição sendo processada (pivot)"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">Direita (r):</span>
                    <span class="variable-item__value">{{
                      currentStep.variables.r !== null
                        ? currentStep.variables.r
                        : "—"
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  title="Índice sendo comparado com o pivot durante particionamento"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">Comparando (j):</span>
                    <span class="variable-item__value">{{
                      currentStep.variables.j !== null
                        ? currentStep.variables.j
                        : "—"
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  title="Valor do pivot (elemento usado como referência para partição)"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">Pivot:</span>
                    <span class="variable-item__value">{{
                      currentStep.variables.pivot !== null
                        ? currentStep.variables.pivot
                        : "—"
                    }}</span>
                  </div>
                </a-tooltip>
              </template>

              <!-- Fallback for other cases -->
              <template v-else>
                <a-tooltip title="Índice de iteração do loop externo">
                  <div class="variable-item">
                    <span class="variable-item__label">i:</span>
                    <span class="variable-item__value">{{
                      currentStep.variables.i !== null
                        ? currentStep.variables.i
                        : "—"
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip title="Índice de iteração do loop interno">
                  <div class="variable-item">
                    <span class="variable-item__label">j:</span>
                    <span class="variable-item__value">{{
                      currentStep.variables.j !== null
                        ? currentStep.variables.j
                        : "—"
                    }}</span>
                  </div>
                </a-tooltip>
              </template>
            </div>
            <div v-else class="variables-display__empty">
              Prepare uma simulacao para ver as variaveis
            </div>
          </div>
        </article>

        <article class="page-card">
          <h3 class="page-card__title">
            <a-tooltip
              title="Resumo das estatísticas da execução: tempo decorrido, total de comparações, total de trocas/deslocamentos e memória estimada."
            >
              <span>Metricas Basicas</span>
            </a-tooltip>
          </h3>
          <div class="page-kpis">
            <a-tooltip
              title="Tempo total decorrido desde o início da animação, em milissegundos."
            >
              <div class="kpi-tile">
                <div class="kpi-tile__label">Tempo (ms)</div>
                <div class="kpi-tile__value">{{ elapsedMs }}</div>
              </div>
            </a-tooltip>
            <a-tooltip
              title="Número total de comparações entre elementos até o momento."
            >
              <div class="kpi-tile">
                <div class="kpi-tile__label">Comparacoes</div>
                <div class="kpi-tile__value">{{ comparisons }}</div>
              </div>
            </a-tooltip>
            <a-tooltip
              title="Número total de trocas ou deslocamentos de elementos realizados."
            >
              <div class="kpi-tile">
                <div class="kpi-tile__label">Trocas</div>
                <div class="kpi-tile__value">{{ swaps }}</div>
              </div>
            </a-tooltip>
            <a-tooltip
              title="Estimativa de memória usada pelo vetor (cada número = 8 bytes)."
            >
              <div class="kpi-tile">
                <div class="kpi-tile__label">Memoria estimada</div>
                <div class="kpi-tile__value">
                  {{ Math.max(1, Math.round((bars.length * 8) / 1024)) }} KB
                </div>
              </div>
            </a-tooltip>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
