export default function mergeSort(A) {
  const steps = [];
  const arr = [...A];
  let comparisons = 0;
  let swaps = 0;

  function mergeSortRecursive(left, mid, right, depth = 0) {
    if (left >= right) {
      return { comparisons: 0, swaps: 0 };
    }

    // Divide step
    const middle = Math.floor((left + right) / 2);

    // Recursively sort left and right
    const leftResult = mergeSortRecursive(left, left, middle, depth + 1);
    const rightResult = mergeSortRecursive(
      middle + 1,
      middle + 1,
      right,
      depth + 1,
    );

    // Merge step
    const mergeResult = mergeDanceWithSteps(
      arr,
      left,
      middle,
      right,
      steps,
      depth,
    );

    return {
      comparisons:
        leftResult.comparisons +
        rightResult.comparisons +
        mergeResult.comparisons,
      swaps: leftResult.swaps + rightResult.swaps + mergeResult.swaps,
    };
  }

  const result = mergeSortRecursive(0, 0, arr.length - 1);
  comparisons = result.comparisons;
  swaps = result.swaps;

  // Final sorted step
  if (steps.length === 0) {
    steps.push({
      values: [...arr],
      activeIndexes: [],
      comparisons: 0,
      swaps: 0,
      variables: { left: 0, right: arr.length - 1, depth: 0 },
      pivotIndex: null,
    });
  }

  return steps;
}

function mergeDanceWithSteps(arr, left, mid, right, steps, depth = 0) {
  const leftArr = arr.slice(left, mid + 1);
  const rightArr = arr.slice(mid + 1, right + 1);
  let leftIndex = 0;
  let rightIndex = 0;
  let comparisons = 0;
  let swaps = 0;

  // Record merge start
  steps.push({
    values: [...arr],
    activeIndexes: [],
    comparisons: comparisons,
    swaps: swaps,
    variables: { left, mid, right, depth },
    pivotIndex: null,
    merging: { start: left, end: right + 1 },
    divisionDepth: depth,
  });

  let mainIndex = left;
  while (leftIndex < leftArr.length && rightIndex < rightArr.length) {
    comparisons++;
    if (leftArr[leftIndex] <= rightArr[rightIndex]) {
      arr[mainIndex] = leftArr[leftIndex];
      leftIndex++;
    } else {
      arr[mainIndex] = rightArr[rightIndex];
      rightIndex++;
    }
    swaps++;

    // Record merge progress
    steps.push({
      values: [...arr],
      activeIndexes: [mainIndex],
      comparisons: comparisons,
      swaps: swaps,
      variables: { left, mid, right, depth },
      pivotIndex: null,
      merging: { start: left, end: right + 1 },
      divisionDepth: depth,
    });

    mainIndex++;
  }

  // Copy remaining elements
  while (leftIndex < leftArr.length) {
    arr[mainIndex] = leftArr[leftIndex];
    leftIndex++;
    swaps++;
    mainIndex++;

    steps.push({
      values: [...arr],
      activeIndexes: [mainIndex - 1],
      comparisons: comparisons,
      swaps: swaps,
      variables: { left, mid, right, depth },
      pivotIndex: null,
      merging: { start: left, end: right + 1 },
      divisionDepth: depth,
    });
  }

  while (rightIndex < rightArr.length) {
    arr[mainIndex] = rightArr[rightIndex];
    rightIndex++;
    swaps++;
    mainIndex++;

    steps.push({
      values: [...arr],
      activeIndexes: [mainIndex - 1],
      comparisons: comparisons,
      swaps: swaps,
      variables: { left, mid, right, depth },
      pivotIndex: null,
      merging: { start: left, end: right + 1 },
      divisionDepth: depth,
    });
  }

  return { comparisons, swaps };
}
