export default (A) => {
  const steps = [];
  let comparisons = 0;
  let swaps = 0;
  const arr = [...A]; // copy to avoid mutating input

  // Build max heap
  for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i--) {
    const result = maxHeapifyWithSteps(
      arr,
      arr.length,
      i,
      steps,
      comparisons,
      swaps,
    );
    comparisons = result.comparisons;
    swaps = result.swaps;
  }

  // Extract elements from heap
  for (let i = arr.length - 1; i > 0; i--) {
    // Swap root with last element
    [arr[0], arr[i]] = [arr[i], arr[0]];
    swaps++;

    steps.push({
      values: [...arr],
      activeIndexes: [0, i],
      comparisons: comparisons,
      swaps: swaps,
      variables: { i, heapSize: i },
      pivotIndex: null,
      heapifyRegion: { start: 0, end: i },
    });

    // Heapify reduced heap
    const result = maxHeapifyWithSteps(arr, i, 0, steps, comparisons, swaps);
    comparisons = result.comparisons;
    swaps = result.swaps;
  }

  // Ensure we have at least one step
  if (steps.length === 0) {
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

  return steps;
};

function maxHeapifyWithSteps(A, heapSize, i, steps, comparisons, swaps) {
  let largest = i;
  const l = 2 * i + 1;
  const r = 2 * i + 2;
  let localComps = comparisons;
  let localSwaps = swaps;

  if (l < heapSize && A[l] > A[largest]) {
    localComps++;
    largest = l;
  }

  if (r < heapSize && A[r] > A[largest]) {
    localComps++;
    largest = r;
  }

  if (largest !== i) {
    localComps++;
    [A[i], A[largest]] = [A[largest], A[i]];
    localSwaps++;

    steps.push({
      values: [...A],
      activeIndexes: [i, largest],
      comparisons: localComps,
      swaps: localSwaps,
      variables: { i, largest, heapSize },
      pivotIndex: null,
      heapifyRegion: { start: 0, end: heapSize },
    });

    return maxHeapifyWithSteps(
      A,
      heapSize,
      largest,
      steps,
      localComps,
      localSwaps,
    );
  }

  return { comparisons: localComps, swaps: localSwaps };
}
