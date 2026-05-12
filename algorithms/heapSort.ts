import type {
  SortRunOptions,
  SortRunResult,
  SortStep,
} from "../src/types/sort-types";

const ABORT_SENTINEL = Symbol("sort-aborted");
const BYTES_PER_NUMBER = 8;
const STACK_FRAME_BYTES = 32;

export default (A: number[], options: SortRunOptions = {}): SortRunResult => {
  const { recordSteps = true, signal, yieldEveryOps = 50000 } = options;

  const steps: SortStep[] = [];
  let comparisons = 0;
  let swaps = 0;

  const arr = [...A];

  // Estimativa estática de memória auxiliar baseada na profundidade máxima do heap
  const baseAux = arr.length * BYTES_PER_NUMBER;
  const maxRecursionDepth = Math.max(
    1,
    Math.ceil(Math.log2(Math.max(arr.length, 2))),
  );
  const peakAux = baseAux + maxRecursionDepth * STACK_FRAME_BYTES;

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

  const pushStep = (fields: SortStep) => {
    if (recordSteps) steps.push(fields);
  };

  // Restaura a propriedade de max-heap a partir do índice i descendo até heapSize.
  // Versão iterativa — substitui a recursão em cauda sem pilha explícita.
  function maxHeapifyIterative(
    A: number[],
    heapSize: number,
    startI: number,
    comps: number,
    sw: number,
  ): { comparisons: number; swaps: number } {
    let i = startI;
    let localComps = comps;
    let localSwaps = sw;

    while (true) {
      let largest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;

      if (l < heapSize && A[l] > A[largest]) {
        localComps++;
        largest = l;
      }
      tick();

      if (r < heapSize && A[r] > A[largest]) {
        localComps++;
        largest = r;
      }
      tick();

      if (largest !== i) {
        localComps++;

        [A[i], A[largest]] = [A[largest], A[i]];
        localSwaps++;

        pushStep({
          values: [...A],
          activeIndexes: [i, largest],
          comparisons: localComps,
          swaps: localSwaps,
          variables: { i, largest, heapSize },
          pivotIndex: null,
          heapifyRegion: { start: 0, end: heapSize },
        });
        tick();

        i = largest;
      } else {
        break;
      }
    }

    return { comparisons: localComps, swaps: localSwaps };
  }

  try {
    // Fase 1: constrói o max-heap (heapify bottom-up)
    for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i--) {
      const result = maxHeapifyIterative(
        arr,
        arr.length,
        i,
        comparisons,
        swaps,
      );
      comparisons = result.comparisons;
      swaps = result.swaps;
    }

    // Fase 2: extrai elementos do heap em ordem crescente
    for (let i = arr.length - 1; i > 0; i--) {
      [arr[0], arr[i]] = [arr[i], arr[0]];
      swaps++;

      pushStep({
        values: [...arr],
        activeIndexes: [0, i],
        comparisons,
        swaps,
        variables: { i, heapSize: i },
        pivotIndex: null,
        heapifyRegion: { start: 0, end: i },
      });
      tick();

      const result = maxHeapifyIterative(arr, i, 0, comparisons, swaps);
      comparisons = result.comparisons;
      swaps = result.swaps;
    }
  } catch (error) {
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

  // Garante ao menos um passo para arrays já ordenados ou unitários
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
