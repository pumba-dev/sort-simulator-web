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
    for (let j = 1; j < arr.length; j++) {
      const key = arr[j];
      let i = j - 1;

      if (recordSteps) {
        steps.push({
          values: [...arr],
          activeIndexes: [j],
          comparisons,
          swaps,
          variables: { i, j, key },
          pivotIndex: null,
          gapIndex: j,
        });
      }

      while (i >= 0 && arr[i] > key) {
        arr[i + 1] = arr[i];
        swaps++;

        if (recordSteps) {
          steps.push({
            values: [...arr],
            activeIndexes: [i, i + 1],
            comparisons,
            swaps,
            variables: { i, j, key },
            pivotIndex: null,
            gapIndex: i,
          });
        }

        i = i - 1;
        comparisons++;
        tick();
      }

      comparisons++;
      tick();

      arr[i + 1] = key;

      if (recordSteps) {
        steps.push({
          values: [...arr],
          activeIndexes: [i + 1],
          comparisons,
          swaps,
          variables: { i: i + 1, j, key },
          pivotIndex: null,
          gapIndex: null,
        });
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
