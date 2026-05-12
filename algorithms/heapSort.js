const ABORT_SENTINEL = Symbol("sort-aborted");
const BYTES_PER_NUMBER = 8;
const STACK_FRAME_BYTES = 32;

export default (A, options = {}) => {
  const {
    recordSteps = true,
    signal,
    yieldEveryOps = 50000,
  } = options;

  const steps = [];
  let comparisons = 0;
  let swaps = 0;
  const arr = [...A];

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

  function maxHeapifyWithSteps(workingArr, heapSize, i, comps, sw) {
    let largest = i;
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    let localComps = comps;
    let localSwaps = sw;

    if (l < heapSize && workingArr[l] > workingArr[largest]) {
      localComps++;
      largest = l;
    }
    tick();

    if (r < heapSize && workingArr[r] > workingArr[largest]) {
      localComps++;
      largest = r;
    }
    tick();

    if (largest !== i) {
      localComps++;
      [workingArr[i], workingArr[largest]] = [
        workingArr[largest],
        workingArr[i],
      ];
      localSwaps++;

      if (recordSteps) {
        steps.push({
          values: [...workingArr],
          activeIndexes: [i, largest],
          comparisons: localComps,
          swaps: localSwaps,
          variables: { i, largest, heapSize },
          pivotIndex: null,
          heapifyRegion: { start: 0, end: heapSize },
        });
      }
      tick();

      return maxHeapifyWithSteps(
        workingArr,
        heapSize,
        largest,
        localComps,
        localSwaps,
      );
    }

    return { comparisons: localComps, swaps: localSwaps };
  }

  try {
    for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i--) {
      const result = maxHeapifyWithSteps(arr, arr.length, i, comparisons, swaps);
      comparisons = result.comparisons;
      swaps = result.swaps;
    }

    for (let i = arr.length - 1; i > 0; i--) {
      [arr[0], arr[i]] = [arr[i], arr[0]];
      swaps++;

      if (recordSteps) {
        steps.push({
          values: [...arr],
          activeIndexes: [0, i],
          comparisons,
          swaps,
          variables: { i, heapSize: i },
          pivotIndex: null,
          heapifyRegion: { start: 0, end: i },
        });
      }
      tick();

      const result = maxHeapifyWithSteps(arr, i, 0, comparisons, swaps);
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
