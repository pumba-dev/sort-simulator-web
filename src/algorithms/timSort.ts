import type {
  SortInput,
  SortRunOptions,
  SortRunResult,
  SortStep,
} from "../types/sort-types";

const ABORT_SENTINEL = Symbol("sort-aborted");
// [BENCHMARK] Tamanho em bytes de cada número (float64)
const BYTES_PER_NUMBER = 8;
// [SORT] Tamanho fixo de cada run: blocos de 32 elementos são ordenados por insertion sort
const RUN = 32;

export default (A: SortInput, options: SortRunOptions = {}): SortRunResult => {
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
  const arr = Array.isArray(A) ? A.slice() : A.slice();
  // [SORT] Tamanho total do array: usado como limite nos loops de fase 1 e fase 2
  const n = arr.length;

  // [BENCHMARK] Memória viva atual: começa com a cópia do array principal
  let liveAux = n * BYTES_PER_NUMBER;
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

  // [SORT] Calcula os limites visuais de cada run de tamanho RUN para exibição na animação
  const buildRunBoundaries = () => {
    const boundaries: { start: number; end: number }[] = [];
    // [SORT] Divide o array em blocos de RUN elementos, respeitando o limite do array
    for (let i = 0; i < n; i += RUN) {
      boundaries.push({ start: i, end: Math.min(i + RUN - 1, n - 1) });
    }
    return boundaries;
  };

  function insertionSortRange(left: number, right: number): void {
    // [BENCHMARK] Recalcula limites dos runs para exibição nesta chamada de insertion sort
    const runBoundaries = buildRunBoundaries();

    // [SORT] Loop externo: avança o índice do elemento a ser inserido na parte ordenada do run
    for (let j = left + 1; j <= right; j++) {
      // [SORT] Valor a ser inserido na posição correta dentro da parte já ordenada do run
      const key = arr[j];
      // [SORT] Inicia busca da posição correta imediatamente à esquerda do elemento atual
      let i = j - 1;

      // [BENCHMARK] Snapshot inicial do passo: marca o elemento sendo inserido e o gap aberto
      pushStep({
        values: Array.from(arr),
        activeIndexes: [j],
        comparisons,
        swaps,
        variables: { i, j, key, left, right },
        pivotIndex: null,
        gapIndex: j,
        timPhase: "insertion",
        timRunBoundaries: runBoundaries,
      });

      // [SORT] Desloca elementos maiores que key para a direita dentro dos limites do run
      while (i >= left && arr[i] > key) {
        // [SORT] Move o elemento maior uma posição para a direita, abrindo espaço para key
        arr[i + 1] = arr[i];
        // [BENCHMARK] Registra o deslocamento como uma troca/movimento
        swaps++;

        // [BENCHMARK] Snapshot após deslocamento: reflete a nova posição do gap no run
        pushStep({
          values: Array.from(arr),
          activeIndexes: [i, i + 1],
          comparisons,
          swaps,
          variables: { i, j, key, left, right },
          pivotIndex: null,
          gapIndex: i,
          timPhase: "insertion",
          timRunBoundaries: runBoundaries,
        });

        // [SORT] Move o ponteiro para a esquerda para comparar o próximo elemento com key
        i--;
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
        values: Array.from(arr),
        activeIndexes: [i + 1],
        comparisons,
        swaps,
        variables: { i: i + 1, j, key, left, right },
        pivotIndex: null,
        gapIndex: null,
        timPhase: "insertion",
        timRunBoundaries: runBoundaries,
      });
    }
  }

  function mergeRuns(
    left: number,
    mid: number,
    right: number,
    depth: number,
  ): void {
    // [SORT] Tamanho da metade esquerda do intervalo a ser mesclado
    const leftLen = mid - left + 1;
    // [SORT] Tamanho da metade direita do intervalo a ser mesclado
    const rightLen = right - mid;

    // [SORT] Cópias temporárias das duas metades para permitir o merge sem sobrescrever dados
    const leftArr = arr.slice(left, mid + 1);
    const rightArr = arr.slice(mid + 1, right + 1);
    // [BENCHMARK] Registra a alocação dos dois subarrays temporários
    trackAlloc(leftLen + rightLen);

    // [SORT] Ponteiros de leitura nas metades esquerda e direita
    let leftIndex = 0;
    let rightIndex = 0;

    // [BENCHMARK] Snapshot inicial do merge: destaca o intervalo sendo mesclado
    pushStep({
      values: Array.from(arr),
      activeIndexes: [],
      comparisons,
      swaps,
      variables: { left, mid, right, depth },
      pivotIndex: null,
      merging: { start: left, end: right + 1 },
      divisionDepth: depth,
      timPhase: "merge",
    });

    // [SORT] Ponteiro de escrita no array principal (começa no início do intervalo)
    let mainIndex = left;

    // [SORT] Loop principal do merge: intercala elementos das duas metades em ordem crescente
    while (leftIndex < leftArr.length && rightIndex < rightArr.length) {
      // [BENCHMARK] Registra a comparação entre os fronts das duas metades
      comparisons++;
      // [SORT] Seleciona o menor entre o front da esquerda e o front da direita
      if (leftArr[leftIndex] <= rightArr[rightIndex]) {
        // [SORT] Elemento esquerdo é menor ou igual: copia para a posição atual no array principal
        arr[mainIndex] = leftArr[leftIndex];
        // [SORT] Avança ponteiro da metade esquerda
        leftIndex++;
      } else {
        // [SORT] Elemento direito é menor: copia para a posição atual no array principal
        arr[mainIndex] = rightArr[rightIndex];
        // [SORT] Avança ponteiro da metade direita
        rightIndex++;
      }
      // [BENCHMARK] Registra cada cópia/movimento como uma troca
      swaps++;
      // [BENCHMARK] Verifica abort a cada elemento copiado
      tick();

      // [BENCHMARK] Snapshot após cópia: reflete o novo elemento na posição mainIndex
      pushStep({
        values: Array.from(arr),
        activeIndexes: [mainIndex],
        comparisons,
        swaps,
        variables: { left, mid, right, depth },
        pivotIndex: null,
        merging: { start: left, end: right + 1 },
        divisionDepth: depth,
        timPhase: "merge",
      });

      // [SORT] Avança ponteiro de escrita no array principal
      mainIndex++;
    }

    // [SORT] Dreno esquerdo: copia elementos restantes da metade esquerda (já estão em ordem)
    while (leftIndex < leftArr.length) {
      // [SORT] Copia o próximo elemento restante da esquerda
      arr[mainIndex] = leftArr[leftIndex];
      // [SORT] Avança ponteiro da metade esquerda
      leftIndex++;
      // [BENCHMARK] Registra o movimento do elemento restante
      swaps++;
      // [SORT] Avança ponteiro de escrita
      mainIndex++;
      // [BENCHMARK] Verifica abort a cada elemento copiado
      tick();

      // [BENCHMARK] Snapshot após cópia do elemento restante da esquerda
      pushStep({
        values: Array.from(arr),
        activeIndexes: [mainIndex - 1],
        comparisons,
        swaps,
        variables: { left, mid, right, depth },
        pivotIndex: null,
        merging: { start: left, end: right + 1 },
        divisionDepth: depth,
        timPhase: "merge",
      });
    }

    // [SORT] Dreno direito: copia elementos restantes da metade direita (já estão em ordem)
    while (rightIndex < rightArr.length) {
      // [SORT] Copia o próximo elemento restante da direita
      arr[mainIndex] = rightArr[rightIndex];
      // [SORT] Avança ponteiro da metade direita
      rightIndex++;
      // [BENCHMARK] Registra o movimento do elemento restante
      swaps++;
      // [SORT] Avança ponteiro de escrita
      mainIndex++;
      // [BENCHMARK] Verifica abort a cada elemento copiado
      tick();

      // [BENCHMARK] Snapshot após cópia do elemento restante da direita
      pushStep({
        values: Array.from(arr),
        activeIndexes: [mainIndex - 1],
        comparisons,
        swaps,
        variables: { left, mid, right, depth },
        pivotIndex: null,
        merging: { start: left, end: right + 1 },
        divisionDepth: depth,
        timPhase: "merge",
      });
    }

    // [BENCHMARK] Libera memória dos subarrays temporários após conclusão do merge
    trackFree(leftLen + rightLen);
  }

  try {
    // [SORT] Fase 1 — Insertion Sort: ordena cada run de tamanho RUN individualmente
    for (let i = 0; i < n; i += RUN) {
      // [SORT] Limite direito do run atual: não ultrapassa o fim do array
      const right = Math.min(i + RUN - 1, n - 1);
      insertionSortRange(i, right);
    }

    // [SORT] Profundidade de merge atual: incrementa a cada nível de fusão bottom-up
    let depth = 1;
    // [SORT] Fase 2 — Merge bottom-up: funde runs em grupos cada vez maiores (RUN → 2*RUN → 4*RUN...)
    for (let size = RUN; size < n; size *= 2) {
      // [SORT] Percorre o array fundindo pares de grupos do tamanho atual
      for (let left = 0; left < n; left += 2 * size) {
        // [SORT] Ponto médio entre os dois grupos a serem fundidos
        const mid = Math.min(left + size - 1, n - 1);
        // [SORT] Limite direito do segundo grupo, respeitando o fim do array
        const right = Math.min(left + 2 * size - 1, n - 1);
        // [SORT] Só mescla se o segundo grupo existe (mid < right garante dois runs distintos)
        if (mid < right) {
          mergeRuns(left, mid, right, depth);
        }
      }
      // [SORT] Avança para o próximo nível de fusão
      depth++;
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
      values: Array.from(arr),
      activeIndexes: [],
      comparisons: 0,
      swaps: 0,
      variables: { left: 0, right: n - 1, depth: 0 },
      pivotIndex: null,
      timPhase: "insertion",
      timRunBoundaries: buildRunBoundaries(),
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
