const ABORT_SENTINEL = Symbol("sort-aborted");
const BYTES_PER_NUMBER = 8;

export default function mergeSort(A, options = {}) {
  const {
    recordSteps = true,
    signal,
    yieldEveryOps = 50000,
  } = options;

  const steps = [];
  const arr = [...A];
  let comparisons = 0;
  let swaps = 0;

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

  function mergeDanceWithSteps(workingArr, left, mid, right, depth) {
    const leftLen = mid - left + 1;
    const rightLen = right - mid;
    const leftArr = workingArr.slice(left, mid + 1);
    const rightArr = workingArr.slice(mid + 1, right + 1);
    trackAlloc(leftLen + rightLen);

    let leftIndex = 0;
    let rightIndex = 0;
    let localComparisons = 0;
    let localSwaps = 0;

    if (recordSteps) {
      steps.push({
        values: [...workingArr],
        activeIndexes: [],
        comparisons: localComparisons,
        swaps: localSwaps,
        variables: { left, mid, right, depth },
        pivotIndex: null,
        merging: { start: left, end: right + 1 },
        divisionDepth: depth,
      });
    }

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

      if (recordSteps) {
        steps.push({
          values: [...workingArr],
          activeIndexes: [mainIndex],
          comparisons: localComparisons,
          swaps: localSwaps,
          variables: { left, mid, right, depth },
          pivotIndex: null,
          merging: { start: left, end: right + 1 },
          divisionDepth: depth,
        });
      }

      mainIndex++;
    }

    while (leftIndex < leftArr.length) {
      workingArr[mainIndex] = leftArr[leftIndex];
      leftIndex++;
      localSwaps++;
      mainIndex++;
      tick();

      if (recordSteps) {
        steps.push({
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
    }

    while (rightIndex < rightArr.length) {
      workingArr[mainIndex] = rightArr[rightIndex];
      rightIndex++;
      localSwaps++;
      mainIndex++;
      tick();

      if (recordSteps) {
        steps.push({
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
    }

    trackFree(leftLen + rightLen);
    return { comparisons: localComparisons, swaps: localSwaps };
  }

  function mergeSortRecursive(left, right, depth) {
    if (left >= right) {
      return { comparisons: 0, swaps: 0 };
    }
    const middle = Math.floor((left + right) / 2);
    const leftResult = mergeSortRecursive(left, middle, depth + 1);
    const rightResult = mergeSortRecursive(middle + 1, right, depth + 1);
    const mergeResult = mergeDanceWithSteps(arr, left, middle, right, depth);
    return {
      comparisons:
        leftResult.comparisons +
        rightResult.comparisons +
        mergeResult.comparisons,
      swaps: leftResult.swaps + rightResult.swaps + mergeResult.swaps,
    };
  }

  try {
    const result = mergeSortRecursive(0, arr.length - 1, 0);
    comparisons = result.comparisons;
    swaps = result.swaps;
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
