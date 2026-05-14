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

  // [BENCHMARK] Memória auxiliar de pico: apenas a cópia do array (Insertion Sort é in-place)
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
    // [SORT] Loop externo: avança o índice do elemento a ser inserido na parte ordenada
    for (let j = 1; j < arr.length; j++) {
      // [SORT] Valor a ser inserido na posição correta dentro da parte já ordenada
      const key = arr[j];
      // [SORT] Inicia busca da posição correta imediatamente à esquerda do elemento atual
      let i = j - 1;

      // [BENCHMARK] Snapshot inicial do passo: marca o elemento sendo inserido e o gap aberto
      pushStep({
        values: [...arr],
        activeIndexes: [j],
        comparisons,
        swaps,
        variables: { i, j, key },
        pivotIndex: null,
        gapIndex: j,
      });

      // [SORT] Desloca elementos maiores que key para a direita para abrir espaço
      while (i >= 0 && arr[i] > key) {
        // [SORT] Move o elemento maior uma posição para a direita, abrindo espaço para key
        arr[i + 1] = arr[i];
        // [BENCHMARK] Registra o deslocamento como uma troca/movimento
        swaps++;

        // [BENCHMARK] Snapshot após deslocamento: reflete a nova posição do gap
        pushStep({
          values: [...arr],
          activeIndexes: [i, i + 1],
          comparisons,
          swaps,
          variables: { i, j, key },
          pivotIndex: null,
          gapIndex: i,
        });

        // [SORT] Move o ponteiro para a esquerda para comparar o próximo elemento com key
        i = i - 1;
        // [BENCHMARK] Registra a comparação do while (arr[i] > key)
        comparisons++;
        // [BENCHMARK] Verifica abort a cada deslocamento
        tick();
      }

      // [BENCHMARK] Registra a comparação que falhou no while (condição de parada)
      comparisons++;
      // [BENCHMARK] Verifica abort após encerrar o deslocamento
      tick();

      // [SORT] Insere key na posição correta: logo após o último elemento menor ou igual
      arr[i + 1] = key;

      // [BENCHMARK] Snapshot final do passo: key está na posição correta, gap fechado
      pushStep({
        values: [...arr],
        activeIndexes: [i + 1],
        comparisons,
        swaps,
        variables: { i: i + 1, j, key },
        pivotIndex: null,
        gapIndex: null,
      });
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
      variables: { i: 0, j: 0, key: null },
      pivotIndex: null,
      gapIndex: null,
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
