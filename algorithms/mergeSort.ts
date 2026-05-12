import type {
  SortRunOptions,
  SortRunResult,
  SortStep,
} from "../src/types/sort-types";

const ABORT_SENTINEL = Symbol("sort-aborted");
const BYTES_PER_NUMBER = 8;

export default function mergeSort(
  A: number[],
  options: SortRunOptions = {},
): SortRunResult {
  const { recordSteps = true, signal, yieldEveryOps = 50000 } = options;

  const steps: SortStep[] = [];
  let comparisons = 0;
  let swaps = 0;

  const arr = [...A];

  // Rastreia memória auxiliar máxima (arrays alocados/liberados durante as fusões)
  let liveAux = arr.length * BYTES_PER_NUMBER;
  let peakAux = liveAux;
  const trackAlloc = (numbers: number) => {
    liveAux += numbers * BYTES_PER_NUMBER;
    if (liveAux > peakAux) peakAux = liveAux;
  };
  const trackFree = (numbers: number) => {
    liveAux -= numbers * BYTES_PER_NUMBER;
    if (liveAux < 0) liveAux = 0;
  };

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

  // Funde dois subarrays ordenados: workingArr[left..mid] e workingArr[mid+1..right]
  function mergeDanceWithSteps(
    workingArr: number[],
    left: number,
    mid: number,
    right: number,
    depth: number,
  ): { comparisons: number; swaps: number } {
    const leftLen = mid - left + 1;
    const rightLen = right - mid;

    const leftArr = workingArr.slice(left, mid + 1);
    const rightArr = workingArr.slice(mid + 1, right + 1);
    trackAlloc(leftLen + rightLen);

    let leftIndex = 0;
    let rightIndex = 0;
    let localComparisons = 0;
    let localSwaps = 0;

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

    let mainIndex = left;
    while (leftIndex < leftArr.length && rightIndex < rightArr.length) {
      localComparisons++;
      if (leftArr[leftIndex] <= rightArr[rightIndex]) {
        workingArr[mainIndex] = leftArr[leftIndex];
        leftIndex++;
      } else {
        workingArr[mainIndex] = rightArr[rightIndex];
        rightIndex++;
      }
      localSwaps++;
      tick();

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

    while (leftIndex < leftArr.length) {
      workingArr[mainIndex] = leftArr[leftIndex];
      leftIndex++;
      localSwaps++;
      mainIndex++;
      tick();

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

    while (rightIndex < rightArr.length) {
      workingArr[mainIndex] = rightArr[rightIndex];
      rightIndex++;
      localSwaps++;
      mainIndex++;
      tick();

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

    trackFree(leftLen + rightLen);
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
    // Pilha explícita substitui a recursão (não contabilizada na memória).
    // Cada frame: { left, right, depth, phase: 'split' | 'merge', mid? }
    const stack: StackFrame[] = [
      { left: 0, right: arr.length - 1, depth: 0, phase: "split" },
    ];

    while (stack.length > 0) {
      const frame = stack.pop()!;
      const { left, right, depth, phase } = frame;

      if (phase === "split") {
        if (left >= right) continue;
        const mid = Math.floor((left + right) / 2);

        stack.push({ left, right, depth, phase: "merge", mid });
        stack.push({ left: mid + 1, right, depth: depth + 1, phase: "split" });
        stack.push({ left, right: mid, depth: depth + 1, phase: "split" });
      } else {
        const { mid } = frame;
        const mergeResult = mergeDanceWithSteps(arr, left, mid, right, depth);
        comparisons += mergeResult.comparisons;
        swaps += mergeResult.swaps;
      }
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
