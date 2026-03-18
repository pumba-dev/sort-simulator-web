export default (A) => {
  const steps = [];
  let comparisons = 0;
  let swaps = 0;
  const arr = [...A]; // copy to avoid mutating input

  for (let i = 0; i < arr.length; i++) {
    for (let j = arr.length - 1; j >= i + 1; j--) {
      // Record step before comparison
      steps.push({
        values: [...arr],
        activeIndexes: [j - 1, j],
        comparisons: comparisons,
        swaps: swaps,
        variables: { i, j, n: arr.length },
        pivotIndex: null,
        sortedPartition: { start: arr.length - i, end: arr.length },
      });

      if (arr[j] < arr[j - 1]) {
        [arr[j], arr[j - 1]] = [arr[j - 1], arr[j]];
        swaps++;

        // Record step after swap
        steps.push({
          values: [...arr],
          activeIndexes: [j - 1, j],
          comparisons: comparisons,
          swaps: swaps,
          variables: { i, j, n: arr.length },
          pivotIndex: null,
          sortedPartition: { start: arr.length - i, end: arr.length },
        });
      }

      comparisons++;
    }
  }

  // Final sorted step
  if (steps.length === 0) {
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

  return steps;
};
