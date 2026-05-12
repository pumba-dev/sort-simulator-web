const ABORT_SENTINEL = Symbol("sort-aborted");
const BYTES_PER_NUMBER = 8;
const STACK_FRAME_BYTES = 32;

export default (A, options = {}) => {
  const { recordSteps = true, signal, yieldEveryOps = 50000 } = options;

  // [BENCHMARK] Acumuladores de métricas e array de passos
  const steps = [];
  let comparisons = 0;
  let swaps = 0;

  // [SORT] Cópia do array de entrada para não mutar o original
  const arr = [...A];

  // [BENCHMARK] Estimativa estática de memória auxiliar baseada na profundidade máxima do heap
  const baseAux = arr.length * BYTES_PER_NUMBER;
  const maxRecursionDepth = Math.max(
    1,
    Math.ceil(Math.log2(Math.max(arr.length, 2))),
  );
  const peakAux = baseAux + maxRecursionDepth * STACK_FRAME_BYTES;

  // [BENCHMARK] Controle de abort e yield periódico
  let ops = 0;
  const tick = () => {
    ops += 1;
    if (ops >= yieldEveryOps) {
      ops = 0;
      if (signal && signal.aborted) {
        throw ABORT_SENTINEL;
      }
    }
  };

  // [BENCHMARK] Registra snapshot para visualização passo a passo
  const pushStep = (fields) => {
    if (recordSteps) steps.push(fields);
  };

  // [SORT] Restaura a propriedade de max-heap a partir do índice i descendo até heapSize
  // Versão iterativa — substitui a recursão em cauda sem pilha explícita
  function maxHeapifyIterative(A, heapSize, startI, comps, sw) {
    let i = startI;
    let localComps = comps;
    let localSwaps = sw;

    while (true) {
      // [SORT] Encontra o maior entre o nó atual e seus filhos
      let largest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;

      if (l < heapSize && A[l] > A[largest]) {
        localComps++; // [BENCHMARK]
        largest = l;
      }
      tick(); // [BENCHMARK]

      if (r < heapSize && A[r] > A[largest]) {
        localComps++; // [BENCHMARK]
        largest = r;
      }
      tick(); // [BENCHMARK]

      if (largest !== i) {
        localComps++; // [BENCHMARK]

        // [SORT] Troca nó atual com o maior filho para restaurar heap
        [A[i], A[largest]] = [A[largest], A[i]];
        localSwaps++; // [BENCHMARK]

        // [BENCHMARK] Snapshot após troca
        pushStep({
          values: [...A],
          activeIndexes: [i, largest],
          comparisons: localComps,
          swaps: localSwaps,
          variables: { i, largest, heapSize },
          pivotIndex: null,
          heapifyRegion: { start: 0, end: heapSize },
        });
        tick(); // [BENCHMARK]

        // [SORT] Desce para o filho trocado (substitui a chamada recursiva)
        i = largest;
      } else {
        break;
      }
    }

    return { comparisons: localComps, swaps: localSwaps };
  }

  try {
    // [SORT] Fase 1: constrói o max-heap (heapify bottom-up)
    for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i--) {
      const result = maxHeapifyIterative(
        arr,
        arr.length,
        i,
        comparisons,
        swaps,
      );
      comparisons = result.comparisons; // [BENCHMARK]
      swaps = result.swaps; // [BENCHMARK]
    }

    // [SORT] Fase 2: extrai elementos do heap em ordem crescente
    for (let i = arr.length - 1; i > 0; i--) {
      // [SORT] Move a raiz (maior elemento) para a posição final
      [arr[0], arr[i]] = [arr[i], arr[0]];
      swaps++; // [BENCHMARK]

      // [BENCHMARK] Snapshot após extração
      pushStep({
        values: [...arr],
        activeIndexes: [0, i],
        comparisons,
        swaps,
        variables: { i, heapSize: i },
        pivotIndex: null,
        heapifyRegion: { start: 0, end: i },
      });
      tick(); // [BENCHMARK]

      // [SORT] Restaura o heap sem o elemento extraído
      const result = maxHeapifyIterative(arr, i, 0, comparisons, swaps);
      comparisons = result.comparisons; // [BENCHMARK]
      swaps = result.swaps; // [BENCHMARK]
    }
  } catch (error) {
    if (error === ABORT_SENTINEL) {
      // [BENCHMARK] Retorno parcial ao abortar
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

  // [BENCHMARK] Garante ao menos um passo para arrays já ordenados ou unitários
  if (recordSteps && steps.length === 0) {
    steps.push({
      values: [...arr],
      activeIndexes: [],
      comparisons: 0,
      swaps: 0,
      variables: { i: 0, heapSize: arr.length },
      pivotIndex: null,
      heapifyRegion: null,
    });
  }

  return {
    steps,
    finalArray: arr,
    comparisons,
    swaps,
    peakAuxBytes: peakAux,
    aborted: false,
  };
};
