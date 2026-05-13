import type {
  SortRunOptions,
  SortRunResult,
  SortStep,
} from "../types/sort-types";

const ABORT_SENTINEL = Symbol("sort-aborted");
// [BENCHMARK] Tamanho em bytes de cada número (float64)
const BYTES_PER_NUMBER = 8;
// [BENCHMARK] Estimativa de bytes por frame de chamada na pilha de recursão simulada
const STACK_FRAME_BYTES = 32;

export default (A: number[], options: SortRunOptions = {}): SortRunResult => {
  // [BENCHMARK] Desestrutura opções de controle: gravação de passos, sinal de abort e frequência de checagem
  const { recordSteps = true, signal, yieldEveryOps = 50000 } = options;

  // [BENCHMARK] Array de snapshots para animação passo a passo
  const steps: SortStep[] = [];
  // [BENCHMARK] Acumuladores de métricas: comparações e trocas realizadas
  let comparisons = 0;
  let swaps = 0;

  // [SORT] Cópia do array de entrada para não mutar o original
  const arr = [...A];

  // [BENCHMARK] Base da memória auxiliar: apenas a cópia do array principal
  const baseAux = arr.length * BYTES_PER_NUMBER;
  // [BENCHMARK] Profundidade máxima de recursão observada durante a execução
  let maxRecursionDepth = 0;
  // [BENCHMARK] Pico de memória auxiliar inicial: apenas a cópia do array
  let peakAux = baseAux;
  // [BENCHMARK] Atualiza o pico de memória com base na profundidade atual da pilha de recursão
  const updatePeak = (depth: number) => {
    if (depth > maxRecursionDepth) maxRecursionDepth = depth;
    const current = baseAux + maxRecursionDepth * STACK_FRAME_BYTES;
    if (current > peakAux) peakAux = current;
  };

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
    }
  };

  // [BENCHMARK] Grava snapshot do estado atual do array somente se recordSteps estiver ativo
  const pushStep = (fields: SortStep) => {
    if (recordSteps) steps.push(fields);
  };

  function partitionWithSteps(
    p: number,
    r: number,
  ): { partitionIndex: number; comparisons: number; swaps: number } {
    // [SORT] Pivot: último elemento do subarray (partição de Lomuto)
    const x = arr[r];
    // [SORT] Ponteiro da fronteira: separa elementos ≤ pivot (à esquerda) dos > pivot (à direita)
    let i = p - 1;
    // [BENCHMARK] Cópias locais de métricas para acumular nesta partição
    let localComps = comparisons;
    let localSwaps = swaps;

    // [SORT] Escaneia todos os elementos do subarray exceto o pivot
    for (let j = p; j <= r - 1; j++) {
      // [BENCHMARK] Registra a comparação do elemento atual com o pivot
      localComps++;

      // [BENCHMARK] Snapshot antes da decisão: destaca o elemento sendo comparado com o pivot
      pushStep({
        values: [...arr],
        activeIndexes: [j],
        comparisons: localComps,
        swaps: localSwaps,
        variables: { i, j, pivot: x, p, r },
        pivotIndex: r,
        partitionIndex: null,
      });

      // [SORT] Elemento ≤ pivot: deve ir para a partição esquerda
      if (arr[j] <= x) {
        // [SORT] Expande a fronteira dos menores para incluir mais uma posição
        i += 1;
        // [SORT] Troca arr[j] para a posição correta na partição esquerda
        [arr[i], arr[j]] = [arr[j], arr[i]];
        // [BENCHMARK] Registra a troca de partição
        localSwaps++;

        // [BENCHMARK] Snapshot após troca: reflete o elemento em sua nova posição na partição esquerda
        pushStep({
          values: [...arr],
          activeIndexes: [i, j],
          comparisons: localComps,
          swaps: localSwaps,
          variables: { i, j, pivot: x, p, r },
          pivotIndex: r,
          partitionIndex: null,
        });
      }
      // [BENCHMARK] Verifica abort a cada iteração do loop de partição
      tick();
    }

    // [SORT] Posiciona o pivot em seu lugar definitivo: logo após a fronteira dos menores
    [arr[i + 1], arr[r]] = [arr[r], arr[i + 1]];
    // [BENCHMARK] Registra a troca final que coloca o pivot na posição correta
    localSwaps++;

    // [BENCHMARK] Snapshot final da partição: pivot na posição definitiva, partições separadas
    pushStep({
      values: [...arr],
      activeIndexes: [i + 1, r],
      comparisons: localComps,
      swaps: localSwaps,
      variables: { i: i + 1, j: r, pivot: x, p, r },
      pivotIndex: i + 1,
      partitionIndex: i + 1,
    });

    // [BENCHMARK] Retorna índice do pivot e métricas para propagação ao escopo global
    return {
      partitionIndex: i + 1,
      comparisons: localComps,
      swaps: localSwaps,
    };
  }

  try {
    // [SORT] Pilha iterativa que simula a recursão do Quick Sort
    const stack: Array<{ p: number; r: number; depth: number }> = [
      { p: 0, r: arr.length - 1, depth: 1 },
    ];

    // [SORT] Processa subpartições até esvaziar a pilha (equivale ao retorno da recursão)
    while (stack.length > 0) {
      const { p, r, depth } = stack.pop()!;
      // [BENCHMARK] Atualiza pico de memória com a profundidade atual da pilha simulada
      updatePeak(depth);

      // [SORT] Subarray com mais de um elemento: precisa ser particionado
      if (p < r) {
        const result = partitionWithSteps(p, r);
        // [SORT] Índice onde o pivot foi posicionado após a partição
        const q = result.partitionIndex;
        // [BENCHMARK] Acumula métricas retornadas pela partição no contador global
        comparisons = result.comparisons;
        swaps = result.swaps;

        // [SORT] Empurra subpartição direita (elementos > pivot) para processar depois
        stack.push({ p: q + 1, r, depth: depth + 1 });
        // [SORT] Empurra subpartição esquerda (elementos ≤ pivot) para processar depois
        stack.push({ p, r: q - 1, depth: depth + 1 });
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
      variables: { i: 0, j: 0, pivot: null, p: 0, r: arr.length - 1 },
      pivotIndex: null,
      partitionIndex: null,
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
