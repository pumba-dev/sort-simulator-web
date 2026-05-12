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
  let maxRecursionDepth = 0;
  let peakAux = baseAux;
  const updatePeak = (depth) => {
    if (depth > maxRecursionDepth) maxRecursionDepth = depth;
    const current = baseAux + maxRecursionDepth * STACK_FRAME_BYTES;
    if (current > peakAux) peakAux = current;
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

  function partitionWithSteps(p, r) {
    const x = arr[r];
    let i = p - 1;
    let localComps = comparisons;
    let localSwaps = swaps;

    for (let j = p; j <= r - 1; j++) {
      localComps++;

      if (recordSteps) {
        steps.push({
          values: [...arr],
          activeIndexes: [j],
          comparisons: localComps,
          swaps: localSwaps,
          variables: { i, j, pivot: x, p, r },
          pivotIndex: r,
          partitionIndex: null,
        });
      }

      if (arr[j] <= x) {
        i += 1;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        localSwaps++;

        if (recordSteps) {
          steps.push({
            values: [...arr],
            activeIndexes: [i, j],
            comparisons: localComps,
            swaps: localSwaps,
            variables: { i, j, pivot: x, p, r },
            pivotIndex: r,
            partitionIndex: null,
          });
        }
      }
      tick();
    }

    [arr[i + 1], arr[r]] = [arr[r], arr[i + 1]];
    localSwaps++;

    if (recordSteps) {
      steps.push({
        values: [...arr],
        activeIndexes: [i + 1, r],
        comparisons: localComps,
        swaps: localSwaps,
        variables: { i: i + 1, j: r, pivot: x, p, r },
        pivotIndex: i + 1,
        partitionIndex: i + 1,
      });
    }

    return {
      partitionIndex: i + 1,
      comparisons: localComps,
      swaps: localSwaps,
    };
  }

  function quickSortRecursive(p, r, depth) {
    updatePeak(depth);
    if (p < r) {
      const result = partitionWithSteps(p, r);
      const q = result.partitionIndex;
      comparisons = result.comparisons;
      swaps = result.swaps;

      quickSortRecursive(p, q - 1, depth + 1);
      quickSortRecursive(q + 1, r, depth + 1);
    }
  }

  try {
    quickSortRecursive(0, arr.length - 1, 1);
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
