const ABORT_SENTINEL = Symbol("sort-aborted");
const BYTES_PER_NUMBER = 8;
const STACK_FRAME_BYTES = 32;

export default (A, options = {}) => {
  const {
    recordSteps = true,
    signal,
    yieldEveryOps = 50000,
  } = options;

  // [BENCHMARK] Acumuladores de métricas e array de passos
  const steps = [];
  let comparisons = 0;
  let swaps = 0;

  // [SORT] Cópia do array de entrada para não mutar o original
  const arr = [...A];

  // [BENCHMARK] Rastreia a profundidade lógica máxima para cálculo de memória auxiliar
  const baseAux = arr.length * BYTES_PER_NUMBER;
  let maxRecursionDepth = 0;
  let peakAux = baseAux;
  const updatePeak = (depth) => {
    if (depth > maxRecursionDepth) maxRecursionDepth = depth;
    const current = baseAux + maxRecursionDepth * STACK_FRAME_BYTES;
    if (current > peakAux) peakAux = current;
  };

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
  const pushStep = (fields) => { if (recordSteps) steps.push(fields); };

  // [SORT] Particionamento de Lomuto: escolhe arr[r] como pivô e rearranja o subarray
  function partitionWithSteps(p, r) {
    const x = arr[r]; // [SORT] pivô
    let i = p - 1;
    let localComps = comparisons;
    let localSwaps = swaps;

    for (let j = p; j <= r - 1; j++) {
      localComps++; // [BENCHMARK]

      // [BENCHMARK] Snapshot antes da comparação com o pivô
      pushStep({
        values: [...arr],
        activeIndexes: [j],
        comparisons: localComps,
        swaps: localSwaps,
        variables: { i, j, pivot: x, p, r },
        pivotIndex: r,
        partitionIndex: null,
      });

      if (arr[j] <= x) {
        // [SORT] Elemento ≤ pivô: move para o lado esquerdo da partição
        i += 1;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        localSwaps++; // [BENCHMARK]

        // [BENCHMARK] Snapshot após troca
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
      tick(); // [BENCHMARK]
    }

    // [SORT] Coloca o pivô na sua posição final correta
    [arr[i + 1], arr[r]] = [arr[r], arr[i + 1]];
    localSwaps++; // [BENCHMARK]

    // [BENCHMARK] Snapshot com o pivô na posição final
    pushStep({
      values: [...arr],
      activeIndexes: [i + 1, r],
      comparisons: localComps,
      swaps: localSwaps,
      variables: { i: i + 1, j: r, pivot: x, p, r },
      pivotIndex: i + 1,
      partitionIndex: i + 1,
    });

    return {
      partitionIndex: i + 1,
      comparisons: localComps,
      swaps: localSwaps,
    };
  }

  try {
    // [SORT] Pilha explícita substitui a recursão (não contabilizada na memória)
    const stack = [{ p: 0, r: arr.length - 1, depth: 1 }];

    while (stack.length > 0) {
      const { p, r, depth } = stack.pop();
      updatePeak(depth); // [BENCHMARK] atualiza profundidade lógica máxima

      if (p < r) {
        // [SORT] Particiona o subarray e obtém o índice final do pivô
        const result = partitionWithSteps(p, r);
        const q = result.partitionIndex;
        comparisons = result.comparisons; // [BENCHMARK]
        swaps = result.swaps; // [BENCHMARK]

        // [SORT] Empilha subarrays à direita e à esquerda do pivô
        stack.push({ p: q + 1, r, depth: depth + 1 });
        stack.push({ p, r: q - 1, depth: depth + 1 });
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
      variables: { i: 0, j: 0, pivot: null, p: 0, r: arr.length - 1 },
      pivotIndex: null,
      partitionIndex: null,
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
