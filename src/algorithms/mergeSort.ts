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

  // [BENCHMARK] Memória viva atual: começa com a cópia do array principal
  let liveAux = arr.length * BYTES_PER_NUMBER;
  // [BENCHMARK] Pico de memória auxiliar observado durante toda a execução
  let peakAux = liveAux;
  // [BENCHMARK] Registra alocação de subarrays temporários e atualiza o pico se necessário
  const trackAlloc = (numbers: number) => {
    liveAux += numbers * BYTES_PER_NUMBER;
    if (liveAux > peakAux) peakAux = liveAux;
  };
  // [BENCHMARK] Registra liberação de subarrays temporários após o merge
  const trackFree = (numbers: number) => {
    liveAux -= numbers * BYTES_PER_NUMBER;
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
      if (deadlineMs !== undefined && Date.now() >= deadlineMs) {
        throw ABORT_SENTINEL;
      }
    }
  };

  // [BENCHMARK] Grava snapshot do estado atual do array somente se recordSteps estiver ativo
  const pushStep = (fields: SortStep) => {
    if (recordSteps) steps.push(fields);
  };

  function mergeDanceWithSteps(
    workingArr: number[],
    left: number,
    mid: number,
    right: number,
    depth: number,
  ): { comparisons: number; swaps: number } {
    // [SORT] Tamanho da metade esquerda do intervalo a ser mesclado
    const leftLen = mid - left + 1;
    // [SORT] Tamanho da metade direita do intervalo a ser mesclado
    const rightLen = right - mid;

    // [SORT] Cópias temporárias das duas metades para permitir o merge sem sobrescrever dados
    const leftArr = workingArr.slice(left, mid + 1);
    const rightArr = workingArr.slice(mid + 1, right + 1);
    // [BENCHMARK] Registra a alocação dos dois subarrays temporários
    trackAlloc(leftLen + rightLen);

    // [SORT] Ponteiros de leitura nas metades esquerda e direita
    let leftIndex = 0;
    let rightIndex = 0;
    // [BENCHMARK] Contadores locais de métricas para este merge
    let localComparisons = 0;
    let localSwaps = 0;

    // [BENCHMARK] Snapshot inicial do merge: destaca o intervalo sendo mesclado
    pushStep({
      values: [...workingArr],
      activeIndexes: [],
      comparisons: localComparisons,
      swaps: localSwaps,
      variables: { left, mid, right, depth },
      pivotIndex: null,
      merging: { start: left, end: right + 1 },
      divisionDepth: depth,
    });

    // [SORT] Ponteiro de escrita no array principal (começa no início do intervalo)
    let mainIndex = left;
    // [SORT] Loop principal do merge: intercala elementos das duas metades em ordem crescente
    while (leftIndex < leftArr.length && rightIndex < rightArr.length) {
      // [BENCHMARK] Registra a comparação entre os fronts das duas metades
      localComparisons++;
      // [SORT] Seleciona o menor entre o front da esquerda e o front da direita
      if (leftArr[leftIndex] <= rightArr[rightIndex]) {
        // [SORT] Elemento esquerdo é menor ou igual: copia para a posição atual no array principal
        workingArr[mainIndex] = leftArr[leftIndex];
        // [SORT] Avança ponteiro da metade esquerda
        leftIndex++;
      } else {
        // [SORT] Elemento direito é menor: copia para a posição atual no array principal
        workingArr[mainIndex] = rightArr[rightIndex];
        // [SORT] Avança ponteiro da metade direita
        rightIndex++;
      }
      // [BENCHMARK] Registra cada cópia/movimento como uma troca
      localSwaps++;
      // [BENCHMARK] Verifica abort a cada elemento copiado
      tick();

      // [BENCHMARK] Snapshot após cópia: reflete o novo elemento na posição mainIndex
      pushStep({
        values: [...workingArr],
        activeIndexes: [mainIndex],
        comparisons: localComparisons,
        swaps: localSwaps,
        variables: { left, mid, right, depth },
        pivotIndex: null,
        merging: { start: left, end: right + 1 },
        divisionDepth: depth,
      });

      // [SORT] Avança ponteiro de escrita no array principal
      mainIndex++;
    }

    // [SORT] Dreno esquerdo: copia elementos restantes da metade esquerda (já estão em ordem)
    while (leftIndex < leftArr.length) {
      // [SORT] Copia o próximo elemento restante da esquerda
      workingArr[mainIndex] = leftArr[leftIndex];
      // [SORT] Avança ponteiro da metade esquerda
      leftIndex++;
      // [BENCHMARK] Registra o movimento do elemento restante
      localSwaps++;
      // [SORT] Avança ponteiro de escrita
      mainIndex++;
      // [BENCHMARK] Verifica abort a cada elemento copiado
      tick();

      // [BENCHMARK] Snapshot após cópia do elemento restante da esquerda
      pushStep({
        values: [...workingArr],
        activeIndexes: [mainIndex - 1],
        comparisons: localComparisons,
        swaps: localSwaps,
        variables: { left, mid, right, depth },
        pivotIndex: null,
        merging: { start: left, end: right + 1 },
        divisionDepth: depth,
      });
    }

    // [SORT] Dreno direito: copia elementos restantes da metade direita (já estão em ordem)
    while (rightIndex < rightArr.length) {
      // [SORT] Copia o próximo elemento restante da direita
      workingArr[mainIndex] = rightArr[rightIndex];
      // [SORT] Avança ponteiro da metade direita
      rightIndex++;
      // [BENCHMARK] Registra o movimento do elemento restante
      localSwaps++;
      // [SORT] Avança ponteiro de escrita
      mainIndex++;
      // [BENCHMARK] Verifica abort a cada elemento copiado
      tick();

      // [BENCHMARK] Snapshot após cópia do elemento restante da direita
      pushStep({
        values: [...workingArr],
        activeIndexes: [mainIndex - 1],
        comparisons: localComparisons,
        swaps: localSwaps,
        variables: { left, mid, right, depth },
        pivotIndex: null,
        merging: { start: left, end: right + 1 },
        divisionDepth: depth,
      });
    }

    // [BENCHMARK] Libera memória dos subarrays temporários após conclusão do merge
    trackFree(leftLen + rightLen);
    // [BENCHMARK] Retorna métricas locais para acumulação no escopo global
    return { comparisons: localComparisons, swaps: localSwaps };
  }

  type StackFrame =
    | { left: number; right: number; depth: number; phase: "split" }
    | {
        left: number;
        right: number;
        depth: number;
        phase: "merge";
        mid: number;
      };

  try {
    // [SORT] Pilha iterativa que simula a recursão do divide-and-conquer do Merge Sort
    const stack: StackFrame[] = [
      { left: 0, right: arr.length - 1, depth: 0, phase: "split" },
    ];

    // [SORT] Processa frames até esvaziar a pilha (equivale ao retorno da recursão)
    while (stack.length > 0) {
      const frame = stack.pop()!;
      const { left, right, depth, phase } = frame;

      // [SORT] Fase de divisão: calcula o ponto médio e empurra subproblemas na pilha
      if (phase === "split") {
        // [SORT] Subarray unitário: já ordenado, não há o que dividir
        if (left >= right) continue;
        // [SORT] Ponto médio da divisão para equilibrar os dois subproblemas
        const mid = Math.floor((left + right) / 2);

        // [SORT] Empurra o merge deste nível para após os subproblemas serem resolvidos
        stack.push({ left, right, depth, phase: "merge", mid });
        // [SORT] Empurra divisão da metade direita (processada antes pelo LIFO da pilha)
        stack.push({ left: mid + 1, right, depth: depth + 1, phase: "split" });
        // [SORT] Empurra divisão da metade esquerda (processada primeiro)
        stack.push({ left, right: mid, depth: depth + 1, phase: "split" });
      } else {
        // [SORT] Fase de merge: as duas metades já estão ordenadas, mescla em ordem
        const { mid } = frame;
        const mergeResult = mergeDanceWithSteps(arr, left, mid, right, depth);
        // [BENCHMARK] Acumula métricas retornadas pelo merge no contador global
        comparisons += mergeResult.comparisons;
        swaps += mergeResult.swaps;
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
      variables: { left: 0, right: arr.length - 1, depth: 0 },
      pivotIndex: null,
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
