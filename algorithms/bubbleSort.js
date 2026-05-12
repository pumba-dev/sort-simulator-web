const ABORT_SENTINEL = Symbol("sort-aborted");
const BYTES_PER_NUMBER = 8;

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

  try {
    for (let i = 0; i < arr.length; i++) {
      for (let j = arr.length - 1; j >= i + 1; j--) {
        if (recordSteps) {
          steps.push({
            values: [...arr],
            activeIndexes: [j - 1, j],
            comparisons,
            swaps,
            variables: { i, j, n: arr.length },
            pivotIndex: null,
            sortedPartition: { start: arr.length - i, end: arr.length },
          });
        }

        if (arr[j] < arr[j - 1]) {
          [arr[j], arr[j - 1]] = [arr[j - 1], arr[j]];
          swaps++;

          if (recordSteps) {
            steps.push({
              values: [...arr],
              activeIndexes: [j - 1, j],
              comparisons,
              swaps,
              variables: { i, j, n: arr.length },
              pivotIndex: null,
              sortedPartition: { start: arr.length - i, end: arr.length },
            });
          }
        }

        comparisons++;
        tick();
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
