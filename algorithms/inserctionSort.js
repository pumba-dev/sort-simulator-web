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

  // [BENCHMARK] Memória auxiliar: apenas o próprio array + variável key (algoritmo in-place)
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
    // [SORT] Loop externo: insere arr[j] na posição correta dentro do prefixo já ordenado
    for (let j = 1; j < arr.length; j++) {
      const key = arr[j]; // [SORT] elemento a ser inserido
      let i = j - 1; // [SORT] índice do último elemento do prefixo ordenado

      // [BENCHMARK] Snapshot com o elemento sendo selecionado para inserção
      pushStep({
        values: [...arr],
        activeIndexes: [j],
        comparisons,
        swaps,
        variables: { i, j, key },
        pivotIndex: null,
        gapIndex: j,
      });

      // [SORT] Desloca elementos maiores que key uma posição à direita
      while (i >= 0 && arr[i] > key) {
        arr[i + 1] = arr[i]; // [SORT] deslocamento
        swaps++; // [BENCHMARK]

        // [BENCHMARK] Snapshot após deslocamento
        pushStep({
          values: [...arr],
          activeIndexes: [i, i + 1],
          comparisons,
          swaps,
          variables: { i, j, key },
          pivotIndex: null,
          gapIndex: i,
        });

        i = i - 1; // [SORT] move para o próximo elemento do prefixo ordenado
        comparisons++; // [BENCHMARK]
        tick(); // [BENCHMARK]
      }

      comparisons++; // [BENCHMARK] conta a comparação que encerrou o while
      tick(); // [BENCHMARK]

      // [SORT] Insere key na posição encontrada
      arr[i + 1] = key;

      // [BENCHMARK] Snapshot após inserção
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
