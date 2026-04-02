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

type PseudoTokenKind =
  | "plain"
  | "space"
  | "keyword"
  | "operator"
  | "array"
  | "number"
  | "routine";

type PseudoToken = {
  value: string;
  kind: PseudoTokenKind;
};

const pseudoKeywords = new Set([
  "function",
  "procedure",
  "for",
  "to",
  "downto",
  "if",
  "then",
  "else",
  "while",
  "return",
  "and",
  "or",
  "not",
  "break",
]);

const pseudoOperators = new Set([
  "<-",
  "!=",
  "<=",
  ">=",
  "<",
  ">",
  "=",
  "+",
  "-",
  "*",
  "/",
  "..",
]);

const pseudoRoutines = new Set([
  "INSERTION-SORT",
  "BUBBLE-SORT",
  "MERGE-SORT",
  "MERGE",
  "BUILD-MAX-HEAP",
  "MAX-HEAPIFY",
  "HEAP-SORT",
  "QUICK-SORT",
  "PARTITION",
]);

const tokenizePseudoLine = (line: string): PseudoToken[] => {
  if (!line) {
    return [{ value: " ", kind: "space" }];
  }

  const tokens = line.match(
    /[A-Za-z][A-Za-z0-9_]*\[[^\]]+\]|[A-Za-z]+(?:-[A-Za-z]+)?|\d+|!=|<=|>=|<-|\.{2}|[(),:+*/=-]|\s+|\S/g,
  ) ?? [line];

  return tokens.map((token) => {
    if (/^\s+$/.test(token)) {
      return { value: token, kind: "space" };
    }

    if (/^[A-Za-z][A-Za-z0-9_]*\[[^\]]+\]$/.test(token)) {
      return { value: token, kind: "array" };
    }

    if (/^\d+$/.test(token)) {
      return { value: token, kind: "number" };
    }

    if (pseudoOperators.has(token)) {
      return { value: token, kind: "operator" };
    }

    const normalized = token.toLowerCase();
    if (pseudoKeywords.has(normalized)) {
      return { value: token, kind: "keyword" };
    }

    if (pseudoRoutines.has(token)) {
      return { value: token, kind: "routine" };
    }

    return { value: token, kind: "plain" };
  });
};

const pseudoLineTooltips: Record<AlgorithmKey, string[]> = {
  insertion: [
    "Define a funcao principal do Insertion Sort para um vetor indexado de 1 ate n.",
    "Percorre o vetor da segunda posicao ate o fim, inserindo um elemento por iteracao.",
    "Copia o valor atual para a variavel temporaria X antes dos deslocamentos.",
    "Inicializa j na posicao imediatamente anterior a i para comparar com os elementos ja ordenados.",
    "Continua deslocando enquanto houver elementos maiores que a chave na parte ordenada.",
    "Desloca o elemento de A[j] uma posicao para a direita para abrir espaco.",
    "Move j para a esquerda para seguir procurando a posicao correta de insercao.",
    "Insere a chave na posicao final encontrada apos os deslocamentos.",
  ],
  bubble: [
    "Define a funcao principal do Bubble Sort para o vetor inteiro.",
    "Controla as passagens externas; a cada passagem, o maior elemento restante vai para o fim.",
    "Reinicia a flag de troca para detectar se ainda ha desordem nesta passagem.",
    "Percorre pares adjacentes da parte ainda nao consolidada do vetor.",
    "Compara o par atual e verifica se esta fora de ordem.",
    "Troca os dois elementos para corrigir a ordem local.",
    "Marca que houve troca nesta passagem.",
    "Se nenhuma troca ocorreu, o vetor ja esta ordenado.",
    "Encerra antecipadamente para evitar iteracoes desnecessarias.",
  ],
  merge: [
    "Define a funcao recursiva principal do Merge Sort para o intervalo [p, r].",
    "Verifica o caso recursivo: so divide se houver pelo menos dois elementos.",
    "Calcula o ponto medio q para separar o intervalo em duas metades.",
    "Ordena recursivamente a metade esquerda [p, q].",
    "Ordena recursivamente a metade direita [q + 1, r].",
    "Intercala as duas metades ja ordenadas no intervalo original.",
    "Separador visual entre a funcao principal e a funcao auxiliar de merge.",
    "Define a funcao auxiliar que intercala duas particoes ordenadas.",
    "Calcula o tamanho da particao esquerda.",
    "Calcula o tamanho da particao direita.",
    "Percorre os elementos da particao esquerda temporaria.",
    "Copia cada elemento da metade esquerda para o vetor auxiliar L.",
    "Percorre os elementos da particao direita temporaria.",
    "Copia cada elemento da metade direita para o vetor auxiliar R.",
    "Adiciona sentinela no fim de L para simplificar comparacoes de limite.",
    "Adiciona sentinela no fim de R para simplificar comparacoes de limite.",
    "Inicializa o ponteiro i para o inicio de L.",
    "Inicializa o ponteiro j para o inicio de R.",
    "Percorre todas as posicoes do intervalo original [p, r].",
    "Compara os elementos atuais de L e R para decidir qual entra no vetor final.",
    "Grava em A[k] o menor elemento entre as cabecas de L e R.",
    "Avanca o ponteiro i apos consumir um elemento de L.",
    "Caminho alternativo quando o elemento de R e menor.",
    "Grava em A[k] o elemento atual de R.",
    "Avanca o ponteiro j apos consumir um elemento de R.",
  ],
  heap: [
    "Define a funcao principal do Heap Sort para um vetor indexado de 1 ate n.",
    "Constroi inicialmente um max-heap com todos os elementos do vetor.",
    "Percorre o fim do vetor para extrair o maior elemento da heap em cada iteracao.",
    "Move o maior elemento (raiz) para sua posicao final no fim do vetor.",
    "Reduz o tamanho util da heap apos fixar um elemento no final.",
    "Restaura a propriedade de max-heap a partir da raiz.",
    "Separador visual entre a funcao principal e as funcoes auxiliares.",
    "Define a funcao auxiliar para construir o max-heap inicial.",
    "Inicializa o tamanho da heap com o tamanho total do vetor.",
    "Percorre os nos internos de baixo para cima para heapificar tudo.",
    "Aplica heapify em cada no interno para garantir a propriedade de max-heap.",
    "Separador visual antes da rotina de ajuste local da heap.",
    "Define a funcao que corrige a heap no no i considerando um heapSize atual.",
    "Calcula o indice do filho esquerdo do no i.",
    "Calcula o indice do filho direito do no i.",
    "Assume inicialmente que o maior elemento esta na raiz local i.",
    "Compara o filho esquerdo com o maior atual, respeitando o limite heapSize.",
    "Atualiza o indice do maior quando o filho esquerdo vence a comparacao.",
    "Compara o filho direito com o maior atual, respeitando o limite heapSize.",
    "Atualiza o indice do maior quando o filho direito vence a comparacao.",
    "Verifica se o maior elemento nao esta na raiz local e precisa de ajuste.",
    "Troca a raiz local com o maior filho para restaurar a ordem da heap.",
    "Continua recursivamente o ajuste na subarvore afetada pela troca.",
  ],
  quick: [
    "Define a funcao recursiva principal do Quick Sort para o intervalo [p, r].",
    "Executa o particionamento apenas quando o intervalo possui mais de um elemento.",
    "Particiona o intervalo e obtem a posicao final q do pivo.",
    "Ordena recursivamente a particao esquerda do pivo.",
    "Ordena recursivamente a particao direita do pivo.",
    "Separador visual entre Quick Sort e sua rotina de particionamento.",
    "Define a funcao de particionamento usada pelo Quick Sort.",
    "Seleciona o ultimo elemento como pivo da particao atual.",
    "Inicializa i para delimitar a fronteira dos elementos menores ou iguais ao pivo.",
    "Percorre o intervalo de comparacao de p ate r - 1.",
    "Testa se o elemento atual deve ir para o lado esquerdo do pivo.",
    "Avanca a fronteira de elementos menores ou iguais ao pivo.",
    "Troca para manter os elementos <= pivo agrupados a esquerda.",
    "Coloca o pivo entre os dois grupos apos o fim do loop.",
    "Retorna o indice final do pivo para dividir as chamadas recursivas.",
  ],
};

const describePseudoLine = (
  algorithm: AlgorithmKey,
  line: string,
  lineIndex: number,
): string => {
  const tips = pseudoLineTooltips[algorithm];
  if (tips && tips[lineIndex]) {
    return tips[lineIndex];
  }

  if (!line.trim()) {
    return "Separador visual entre blocos do pseudo-codigo.";
  }

  const algorithmTitle = learningByKey[algorithm]?.title ?? "algoritmo";
  return `Executa o passo ${lineIndex + 1} do ${algorithmTitle}.`;
};

const selectedAlgorithm = ref<AlgorithmKey>("insertion");
const inputMode = ref<InputMode>("gerado");
const generatedScenario = ref<ScenarioType>("aleatorio");
const generatedSize = ref<number>(24);
const manualVectorText = ref<string>("8, 4, 6, 1, 3, 9, 2, 7");
const speed = ref<number>(3);

const manualVectorFormatRegex = /^\s*-?\d+(?:(?:\s*[,;]\s*|\s+)-?\d+)*\s*$/;

const steps = ref<AnimationStep[]>([]);
const currentStepIndex = ref<number>(0);
const comparisons = ref<number>(0);
const swaps = ref<number>(0);
const elapsedMs = ref<number>(0);
const isPlaying = ref<boolean>(false);
const hasPlaybackStarted = ref<boolean>(false);
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

const displayIndex = (index: number | null | undefined): number | string => {
  if (index === null || index === undefined) {
    return "—";
  }

  return index + 1;
};

const displayBubbleNMinusI = (
  outerIndex: number | null | undefined,
): number | string => {
  if (outerIndex === null || outerIndex === undefined) {
    return "—";
  }

  return Math.max(0, bars.value.length - (outerIndex + 1));
};

const manualVectorValidationMessage = computed(() => {
  if (inputMode.value !== "manual") {
    return "";
  }

  const trimmedInput = manualVectorText.value.trim();
  if (trimmedInput.length === 0) {
    return "Informe números separados por vírgula, espaço ou ponto e vírgula.";
  }

  if (!manualVectorFormatRegex.test(trimmedInput)) {
    return "Formato inválido. Exemplo: 8, 4, 6, 1 ou 8 4 6 1.";
  }

  const valuesCount = trimmedInput.split(/[\s,;]+/).filter(Boolean).length;
  if (valuesCount < 2) {
    return "Informe pelo menos 2 números para iniciar a simulação.";
  }

  return "";
});

const hasValidManualVector = computed(() => {
  return manualVectorValidationMessage.value.length === 0;
});

const canPrepare = computed(() => {
  return (
    !isPlaying.value &&
    (inputMode.value !== "manual" || hasValidManualVector.value)
  );
});

const canStart = computed(() => {
  return (
    steps.value.length > 0 &&
    !isPlaying.value &&
    !hasPlaybackStarted.value &&
    (inputMode.value !== "manual" || hasValidManualVector.value)
  );
});

const canPause = computed(() => {
  return isPlaying.value && hasPlaybackStarted.value;
});

const canContinue = computed(() => {
  return (
    !isPlaying.value &&
    hasPlaybackStarted.value &&
    currentStepIndex.value < steps.value.length - 1 &&
    steps.value.length > 0
  );
});

const canStepBackward = computed(() => {
  return (
    !isPlaying.value &&
    hasPlaybackStarted.value &&
    currentStepIndex.value > 0 &&
    steps.value.length > 0
  );
});

const canStepForward = computed(() => {
  return (
    !isPlaying.value &&
    hasPlaybackStarted.value &&
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
  if (!hasPlaybackStarted.value) {
    return "Pronto para iniciar";
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

const syncMetricsWithCurrentStep = (): void => {
  const current = steps.value[currentStepIndex.value];
  comparisons.value = current?.comparisons ?? 0;
  swaps.value = current?.swaps ?? 0;
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
  if (!hasValidManualVector.value) {
    return [];
  }

  const parsed = manualVectorText.value
    .split(/[\s,;]+/)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));

  return parsed.slice(0, 80);
};

const handleManualVectorInput = (value: string): void => {
  manualVectorText.value = value.replace(/[^0-9,;\s-]/g, "");
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

  if (inputMode.value === "manual" && !hasValidManualVector.value) {
    steps.value = [];
    currentStepIndex.value = 0;
    hasPlaybackStarted.value = false;
    syncMetricsWithCurrentStep();
    elapsedMs.value = 0;
    return;
  }

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
  hasPlaybackStarted.value = false;
  syncMetricsWithCurrentStep();
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
  syncMetricsWithCurrentStep();
};

const startSimulation = (): void => {
  if (inputMode.value === "manual" && !hasValidManualVector.value) {
    return;
  }

  if (steps.value.length === 0) {
    prepareSimulation();
  }

  stopTimer();
  isPlaying.value = true;
  hasPlaybackStarted.value = true;

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

const stepBackwardSimulation = (): void => {
  if (!canStepBackward.value) {
    return;
  }

  currentStepIndex.value -= 1;
  syncMetricsWithCurrentStep();
};

const stepForwardSimulation = (): void => {
  if (!canStepForward.value) {
    return;
  }

  currentStepIndex.value += 1;
  syncMetricsWithCurrentStep();
};

const resetSimulation = (): void => {
  stopTimer();
  isPlaying.value = false;
  currentStepIndex.value = 0;
  hasPlaybackStarted.value = false;
  syncMetricsWithCurrentStep();
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

            <a-form-item
              v-else
              :validate-status="
                manualVectorValidationMessage ? 'error' : undefined
              "
              :help="
                manualVectorValidationMessage ||
                'Formato aceito: números separados por vírgula, espaço ou ponto e vírgula.'
              "
            >
              <template #label>
                <a-tooltip
                  title="Insira números separados por vírgula, espaço ou ponto e vírgula. Máximo 80 valores."
                >
                  <span>Vetor manual (numeros separados por virgula)</span>
                </a-tooltip>
              </template>
              <a-textarea
                :value="manualVectorText"
                :disabled="isPlaying"
                :rows="4"
                @update:value="handleManualVectorInput"
              />
            </a-form-item>

            <a-space>
              <a-button
                type="default"
                :disabled="!canPrepare"
                @click="regenerateVector"
                >Preparar</a-button
              >
            </a-space>
          </a-form>
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

          <a-space v-if="!hasPlaybackStarted" wrap>
            <a-tooltip title="Inicia a execução automatizada do algoritmo">
              <a-button
                type="primary"
                :disabled="!canStart"
                @click="startSimulation"
                >Iniciar</a-button
              >
            </a-tooltip>
          </a-space>

          <a-space v-else-if="canPause" wrap>
            <a-tooltip title="Pausa a animação no passo atual">
              <a-button @click="pauseSimulation">Pausar</a-button>
            </a-tooltip>
            <a-tooltip title="Volta ao primeiro passo da animação">
              <a-button :disabled="!canReset" @click="resetSimulation"
                >Reiniciar</a-button
              >
            </a-tooltip>
          </a-space>

          <a-space v-else-if="canContinue" direction="vertical" :size="16">
            <a-space wrap>
              <a-tooltip title="Continua a animação do ponto onde foi pausada">
                <a-button
                  type="primary"
                  :disabled="!canContinue"
                  @click="continueSimulation"
                  >Continuar</a-button
                >
              </a-tooltip>
              <a-tooltip title="Volta ao primeiro passo da animação">
                <a-button :disabled="!canReset" @click="resetSimulation"
                  >Reiniciar</a-button
                >
              </a-tooltip>
            </a-space>

            <a-space wrap>
              <a-tooltip title="Volta para o estado anterior da animação">
                <a-button
                  :disabled="!canStepBackward"
                  @click="stepBackwardSimulation"
                  >Passo Anterior</a-button
                >
              </a-tooltip>
              <a-tooltip title="Avança para o próximo passo da animação">
                <a-button
                  :disabled="!canStepForward"
                  @click="stepForwardSimulation"
                  >Próximo Passo</a-button
                >
              </a-tooltip>
            </a-space>
          </a-space>

          <a-space v-else wrap>
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

      <div class="aprendizado-grid__middle">
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
                  title="Variável i do pseudo-código (passagem externa do bubble sort)"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">i:</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.i)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  title="Variável j do pseudo-código (loop interno de comparação)"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">j:</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.j)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  title="Faixa já ordenada associada ao limite n - i do pseudo-código"
                >
                  <div v-if="sortedPartition" class="variable-item">
                    <span class="variable-item__label">n - i:</span>
                    <span class="variable-item__value">{{
                      displayBubbleNMinusI(currentStep.variables.i)
                    }}</span>
                  </div>
                </a-tooltip>
              </template>

              <!-- Insertion Sort variables -->
              <template v-else-if="selectedAlgorithm === 'insertion'">
                <a-tooltip
                  title="Variável i do pseudo-código (índice do elemento sendo inserido)"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">i:</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.j)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  title="Variável j do pseudo-código (posição analisada na parte ordenada)"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">j:</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.i)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  title="Variável X do pseudo-código (valor temporário sendo inserido)"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">X:</span>
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
                    <span class="variable-item__value">{{
                      displayIndex(gapIndex)
                    }}</span>
                  </div>
                </a-tooltip>
              </template>

              <!-- Merge Sort variables -->
              <template v-else-if="selectedAlgorithm === 'merge'">
                <a-tooltip
                  title="Variável p do pseudo-código (início da partição)"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">p:</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.left)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip title="Variável q do pseudo-código (ponto médio)">
                  <div class="variable-item">
                    <span class="variable-item__label">q:</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.mid)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  title="Variável r do pseudo-código (fim da partição)"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">r:</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.right)
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
                  title="Variável i do pseudo-código (nó sendo heapificado)"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">i:</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.i)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip title="Variável largest do pseudo-código">
                  <div class="variable-item">
                    <span class="variable-item__label">largest:</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.largest)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip title="Variável heapSize do pseudo-código">
                  <div class="variable-item">
                    <span class="variable-item__label">heapSize:</span>
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
                  title="Variável p do pseudo-código (início da partição)"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">p:</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.p)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  title="Variável r do pseudo-código (fim da partição)"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">r:</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.r)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  title="Variável i do pseudo-código (fronteira dos valores <= pivot)"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">i:</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.i)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  title="Variável j do pseudo-código (índice atualmente comparado)"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">j:</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.j)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip title="Variável pivot do pseudo-código">
                  <div class="variable-item">
                    <span class="variable-item__label">pivot:</span>
                    <span class="variable-item__value">{{
                      currentStep.variables.pivot !== null
                        ? currentStep.variables.pivot
                        : "—"
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip
                  title="Variável q do pseudo-código (posição final do pivot após PARTITION)"
                >
                  <div class="variable-item">
                    <span class="variable-item__label">q:</span>
                    <span class="variable-item__value">{{
                      displayIndex(partitionIndex)
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
                      displayIndex(currentStep.variables.i)
                    }}</span>
                  </div>
                </a-tooltip>
                <a-tooltip title="Índice de iteração do loop interno">
                  <div class="variable-item">
                    <span class="variable-item__label">j:</span>
                    <span class="variable-item__value">{{
                      displayIndex(currentStep.variables.j)
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
              title="Resumo das estatísticas da execução: tempo decorrido, total de comparações e total de trocas/deslocamentos."
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
          </div>
        </article>
      </div>

      <div class="aprendizado-grid__right">
        <article class="page-card">
          <h3 class="page-card__title">
            <a-tooltip
              title="Pseudo-codigo didatico do algoritmo selecionado, usando arrays indexados a partir de 1."
            >
              <span>Pseudo Algoritmo</span>
            </a-tooltip>
          </h3>
          <div class="pseudo-code" role="region" aria-label="Pseudo algoritmo">
            <a-tooltip
              v-for="(line, index) in selectedMetadata.pseudocodeLines"
              :key="`${selectedAlgorithm}-pseudo-${index}`"
              :title="describePseudoLine(selectedAlgorithm, line, index)"
              placement="left"
            >
              <span class="pseudo-code__line pseudo-code__line--interactive">
                <span class="pseudo-code__number">{{ index + 1 }}</span>
                <span class="pseudo-code__text">
                  <template
                    v-for="(token, tokenIndex) in tokenizePseudoLine(line)"
                    :key="`${selectedAlgorithm}-pseudo-${index}-${tokenIndex}`"
                  >
                    <span
                      :class="[
                        'pseudo-code__token',
                        `pseudo-code__token--${token.kind}`,
                      ]"
                      >{{ token.value }}</span
                    >
                  </template>
                </span>
              </span>
            </a-tooltip>
          </div>
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
      </div>
    </section>
  </div>
</template>
