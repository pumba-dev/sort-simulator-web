export default (A) => {
  const steps = [];
  let comparisons = 0;
  let swaps = 0;
  const arr = [...A]; // copy to avoid mutating input

  function quickSortRecursive(p, r) {
    if (p < r) {
      const result = partitionWithSteps(p, r);
      const q = result.partitionIndex;
      comparisons = result.comparisons;
      swaps = result.swaps;

      quickSortRecursive(p, q - 1);
      quickSortRecursive(q + 1, r);
    }
  }

  function partitionWithSteps(p, r) {
    const x = arr[r];
    let i = p - 1;
    let localComps = comparisons;
    let localSwaps = swaps;

    for (let j = p; j <= r - 1; j++) {
      localComps++;

      steps.push({
        values: [...arr],
        activeIndexes: [j],
        comparisons: localComps,
        swaps: localSwaps,
        variables: { i, j, pivot: x, p, r },
        pivotIndex: r,
        partitionIndex: null,
      });

      if (arr[j] <= x) {
        i += 1;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        localSwaps++;

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

    [arr[i + 1], arr[r]] = [arr[r], arr[i + 1]];
    localSwaps++;

    steps.push({
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

  quickSortRecursive(0, arr.length - 1);

  // Ensure we have at least one step
  if (steps.length === 0) {
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

  return steps;
};
