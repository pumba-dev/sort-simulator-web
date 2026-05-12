const ABORT_SENTINEL = Symbol("sort-aborted");
const BYTES_PER_NUMBER = 8;

export default (A, options = {}) => {
  const { recordSteps = true, signal, yieldEveryOps = 50000 } = options;

  // [BENCHMARK] Acumuladores de métricas e array de passos
  const steps = [];
  let comparisons = 0;
  let swaps = 0;

  // [SORT] Cópia do array de entrada para não mutar o original
  const arr = [...A];

  // [BENCHMARK] Memória auxiliar: apenas o próprio array (algoritmo in-place)
  const peakAux = arr.length * BYTES_PER_NUMBER;

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

  try {
    // [SORT] Loop externo: cada iteração garante que o menor elemento restante
    // sobe para a posição correta (bubble up da esquerda para direita)
    for (let i = 0; i < arr.length; i++) {
      for (let j = arr.length - 1; j >= i + 1; j--) {
        // [BENCHMARK] Snapshot antes da comparação
        pushStep({
          values: [...arr],
          activeIndexes: [j - 1, j],
          comparisons,
          swaps,
          variables: { i, j, n: arr.length },
          pivotIndex: null,
          sortedPartition: { start: arr.length - i, end: arr.length },
        });

        if (arr[j] < arr[j - 1]) {
          // [SORT] Troca elementos fora de ordem
          [arr[j], arr[j - 1]] = [arr[j - 1], arr[j]];
          swaps++; // [BENCHMARK]

          // [BENCHMARK] Snapshot após troca
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

        comparisons++; // [BENCHMARK]
        tick(); // [BENCHMARK]
      }
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
      variables: { i: 0, j: 0, n: arr.length },
      pivotIndex: null,
      sortedPartition: { start: 0, end: arr.length },
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
