import type {
  SortRunOptions,
  SortRunResult,
  SortStep,
} from "../types/sort-types";

const ABORT_SENTINEL = Symbol("sort-aborted");
// [BENCHMARK] Tamanho em bytes de cada número (float64)
const BYTES_PER_NUMBER = 8;

export default (A: number[], options: SortRunOptions = {}): SortRunResult => {
  // [BENCHMARK] Desestrutura opções de controle: gravação de passos, sinal de abort e frequência de checagem
  const {
    recordSteps = true,
    signal,
    yieldEveryOps = 50000,
    deadlineMs,
  } = options;

  // [BENCHMARK] Array de snapshots para animação passo a passo
  const steps: SortStep[] = [];
  // [BENCHMARK] Acumuladores de métricas: comparações e trocas realizadas
  let comparisons = 0;
  let swaps = 0;

  // [SORT] Cópia do array de entrada para não mutar o original
  const arr = [...A];

  // [BENCHMARK] Memória auxiliar de pico: apenas a cópia do array (Bubble Sort é in-place)
  const peakAux = arr.length * BYTES_PER_NUMBER;

  // [BENCHMARK] Contador de operações para espaçar verificações do sinal de abort
  let ops = 0;
  const tick = () => {
    // [BENCHMARK] Incrementa contador a cada operação interna
    ops += 1;
    // [BENCHMARK] A cada lote de yieldEveryOps operações, verifica se o sort foi cancelado
    if (ops >= yieldEveryOps) {
      ops = 0;
      if (signal && signal.aborted) {
        throw ABORT_SENTINEL;
      }
      if (deadlineMs !== undefined && Date.now() >= deadlineMs) {
        throw ABORT_SENTINEL;
      }
    }
  };

  // [BENCHMARK] Grava snapshot do estado atual do array somente se recordSteps estiver ativo
  const pushStep = (fields: SortStep) => {
    if (recordSteps) steps.push(fields);
  };

  try {
    // [SORT] Loop externo: cada passagem garante que o maior elemento não ordenado sobe ao fim
    for (let i = 0; i < arr.length; i++) {
      // [SORT] Loop interno: percorre da direita até o limite já ordenado comparando pares adjacentes
      for (let j = arr.length - 1; j >= i + 1; j--) {
        // [BENCHMARK] Snapshot antes da comparação: marca os dois índices como ativos
        pushStep({
          values: [...arr],
          activeIndexes: [j - 1, j],
          comparisons,
          swaps,
          variables: { i, j, n: arr.length },
          pivotIndex: null,
          sortedPartition: { start: arr.length - i, end: arr.length },
        });

        // [SORT] Compara par adjacente: se elemento da direita é menor, estão fora de ordem
        if (arr[j] < arr[j - 1]) {
          // [SORT] Troca os dois elementos fora de ordem via destructuring
          [arr[j], arr[j - 1]] = [arr[j - 1], arr[j]];
          // [BENCHMARK] Registra a troca realizada
          swaps++;

          // [BENCHMARK] Snapshot após a troca: reflete novo estado do array
          pushStep({
            values: [...arr],
            activeIndexes: [j - 1, j],
            comparisons,
            swaps,
            variables: { i, j, n: arr.length },
            pivotIndex: null,
            sortedPartition: { start: arr.length - i, end: arr.length },
          });
        }

        // [BENCHMARK] Registra a comparação realizada (independente do resultado)
        comparisons++;
        // [BENCHMARK] Verifica abort a cada iteração interna
        tick();
      }
    }
  } catch (error) {
    // [BENCHMARK] Captura abort: retorna resultado parcial com flag aborted=true
    if (error === ABORT_SENTINEL) {
      return {
        steps,
        finalArray: arr,
        comparisons,
        swaps,
        peakAuxBytes: peakAux,
        aborted: true,
      };
    }
    throw error;
  }

  // [BENCHMARK] Garante ao menos um snapshot quando array já está ordenado (nenhum passo gerado)
  if (recordSteps && steps.length === 0) {
    steps.push({
      values: [...arr],
      activeIndexes: [],
      comparisons: 0,
      swaps: 0,
      variables: { i: 0, j: 0, n: arr.length },
      pivotIndex: null,
      sortedPartition: { start: 0, end: arr.length },
    });
  }

  // [BENCHMARK] Resultado final: array ordenado + métricas coletadas
  return {
    steps,
    finalArray: arr,
    comparisons,
    swaps,
    peakAuxBytes: peakAux,
    aborted: false,
  };
};
