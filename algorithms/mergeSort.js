const ABORT_SENTINEL = Symbol("sort-aborted");
const BYTES_PER_NUMBER = 8;

export default function mergeSort(A, options = {}) {
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

  // [BENCHMARK] Rastreia memória auxiliar máxima (arrays alocados/liberados durante as fusões)
  let liveAux = arr.length * BYTES_PER_NUMBER;
  let peakAux = liveAux;
  const trackAlloc = (numbers) => {
    liveAux += numbers * BYTES_PER_NUMBER;
    if (liveAux > peakAux) peakAux = liveAux;
  };
  const trackFree = (numbers) => {
    liveAux -= numbers * BYTES_PER_NUMBER;
    if (liveAux < 0) liveAux = 0;
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

  // [SORT] Funde dois subarrays ordenados: workingArr[left..mid] e workingArr[mid+1..right]
  function mergeDanceWithSteps(workingArr, left, mid, right, depth) {
    const leftLen = mid - left + 1;
    const rightLen = right - mid;

    // [SORT] Cópias temporárias dos dois subarrays a fundir
    const leftArr = workingArr.slice(left, mid + 1);
    const rightArr = workingArr.slice(mid + 1, right + 1);
    trackAlloc(leftLen + rightLen); // [BENCHMARK] contabiliza memória auxiliar alocada

    let leftIndex = 0;
    let rightIndex = 0;
    let localComparisons = 0;
    let localSwaps = 0;

    // [BENCHMARK] Snapshot do início da fusão
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

    // [SORT] Intercala os dois subarrays em ordem crescente
    let mainIndex = left;
    while (leftIndex < leftArr.length && rightIndex < rightArr.length) {
      localComparisons++; // [BENCHMARK]
      if (leftArr[leftIndex] <= rightArr[rightIndex]) {
        workingArr[mainIndex] = leftArr[leftIndex];
        leftIndex++;
      } else {
        workingArr[mainIndex] = rightArr[rightIndex];
        rightIndex++;
      }
      localSwaps++; // [BENCHMARK]
      tick(); // [BENCHMARK]

      // [BENCHMARK] Snapshot após cada escrita
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

      mainIndex++;
    }

    // [SORT] Copia os elementos restantes do subarray esquerdo
    while (leftIndex < leftArr.length) {
      workingArr[mainIndex] = leftArr[leftIndex];
      leftIndex++;
      localSwaps++; // [BENCHMARK]
      mainIndex++;
      tick(); // [BENCHMARK]

      // [BENCHMARK] Snapshot após cópia
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

    // [SORT] Copia os elementos restantes do subarray direito
    while (rightIndex < rightArr.length) {
      workingArr[mainIndex] = rightArr[rightIndex];
      rightIndex++;
      localSwaps++; // [BENCHMARK]
      mainIndex++;
      tick(); // [BENCHMARK]

      // [BENCHMARK] Snapshot após cópia
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

    trackFree(leftLen + rightLen); // [BENCHMARK] libera memória auxiliar contabilizada
    return { comparisons: localComparisons, swaps: localSwaps };
  }

  try {
    // [SORT] Pilha explícita substitui a recursão (não contabilizada na memória)
    // Cada frame: { left, right, depth, phase: 'split' | 'merge', mid? }
    const stack = [{ left: 0, right: arr.length - 1, depth: 0, phase: 'split' }];

    while (stack.length > 0) {
      const frame = stack.pop();
      const { left, right, depth, phase } = frame;

      if (phase === 'split') {
        // [SORT] Divide o subarray ao meio e empilha os subproblemas
        if (left >= right) continue;
        const mid = Math.floor((left + right) / 2);

        // Empilha a fusão primeiro (LIFO: executa por último, após os filhos)
        stack.push({ left, right, depth, phase: 'merge', mid });
        // Empilha filho direito (executa antes da fusão)
        stack.push({ left: mid + 1, right, depth: depth + 1, phase: 'split' });
        // Empilha filho esquerdo (executa primeiro)
        stack.push({ left, right: mid, depth: depth + 1, phase: 'split' });
      } else {
        // [SORT] Funde os dois subarrays já ordenados
        const { mid } = frame;
        const mergeResult = mergeDanceWithSteps(arr, left, mid, right, depth);
        comparisons += mergeResult.comparisons; // [BENCHMARK]
        swaps += mergeResult.swaps; // [BENCHMARK]
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
      variables: { left: 0, right: arr.length - 1, depth: 0 },
      pivotIndex: null,
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
}
