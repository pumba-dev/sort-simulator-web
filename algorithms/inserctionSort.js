export default (A) => {
  const steps = [];
  let comparisons = 0;
  let swaps = 0;
  const arr = [...A]; // copy to avoid mutating input

  for (let j = 1; j < arr.length; j++) {
    const key = arr[j];
    let i = j - 1;

    // Record initial step with gap at position j
    steps.push({
      values: [...arr],
      activeIndexes: [j],
      comparisons: comparisons,
      swaps: swaps,
      variables: { i, j, key },
      pivotIndex: null,
      gapIndex: j,
    });

    while (i >= 0 && arr[i] > key) {
      // Shift elements to the right
      arr[i + 1] = arr[i];
      swaps++;

      // Record step after shift
      steps.push({
        values: [...arr],
        activeIndexes: [i, i + 1],
        comparisons: comparisons,
        swaps: swaps,
        variables: { i, j, key },
        pivotIndex: null,
        gapIndex: i,
      });

      i = i - 1;
      comparisons++;
    }

    comparisons++;

    // Insert key at final position
    arr[i + 1] = key;

    // Record final step for this iteration
    steps.push({
      values: [...arr],
      activeIndexes: [i + 1],
      comparisons: comparisons,
      swaps: swaps,
      variables: { i: i + 1, j, key },
      pivotIndex: null,
      gapIndex: null,
    });
  }

  // Ensure we have at least one step
  if (steps.length === 0) {
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

  return steps;
};
