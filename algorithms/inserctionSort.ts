import type {
  SortRunOptions,
  SortRunResult,
  SortStep,
} from "../src/types/sort-types";

const ABORT_SENTINEL = Symbol("sort-aborted");
const BYTES_PER_NUMBER = 8;

export default (A: number[], options: SortRunOptions = {}): SortRunResult => {
  const { recordSteps = true, signal, yieldEveryOps = 50000 } = options;

  const steps: SortStep[] = [];
  let comparisons = 0;
  let swaps = 0;

  const arr = [...A];

  // Memória auxiliar: apenas o próprio array + variável key (algoritmo in-place)
  const peakAux = arr.length * BYTES_PER_NUMBER;

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

  try {
    // Loop externo: insere arr[j] na posição correta dentro do prefixo já ordenado
    for (let j = 1; j < arr.length; j++) {
      const key = arr[j];
      let i = j - 1;

      pushStep({
        values: [...arr],
        activeIndexes: [j],
        comparisons,
        swaps,
        variables: { i, j, key },
        pivotIndex: null,
        gapIndex: j,
      });

      // Desloca elementos maiores que key uma posição à direita
      while (i >= 0 && arr[i] > key) {
        arr[i + 1] = arr[i];
        swaps++;

        pushStep({
          values: [...arr],
          activeIndexes: [i, i + 1],
          comparisons,
          swaps,
          variables: { i, j, key },
          pivotIndex: null,
          gapIndex: i,
        });

        i = i - 1;
        comparisons++;
        tick();
      }

      comparisons++;
      tick();

      arr[i + 1] = key;

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
      variables: { i: 0, j: 0, key: null },
      pivotIndex: null,
      gapIndex: null,
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
