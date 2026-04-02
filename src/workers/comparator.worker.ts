/// <reference lib="webworker" />

import type {
  AlgorithmKey,
  CompareJob,
  ComparisonResultRow,
  ScenarioType,
  WorkerCommand,
} from "../types/comparator";

const workerScope: DedicatedWorkerGlobalScope =
  self as unknown as DedicatedWorkerGlobalScope;

let cancelled = false;

const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const estimateDurationMs = (
  algorithm: AlgorithmKey,
  scenario: ScenarioType,
  size: number,
): number => {
  const n = size;
  const nLogN = n * Math.log2(Math.max(n, 2));

  const complexityValueByAlgorithm: Record<AlgorithmKey, number> = {
    insertion: (n * n) / 250000,
    bubble: (n * n) / 200000,
    merge: nLogN / 2200,
    heap: nLogN / 1800,
    quick: nLogN / 1700,
  };

  const scenarioFactorByAlgorithm: Record<
    AlgorithmKey,
    Record<ScenarioType, number>
  > = {
    insertion: {
      crescente: 0.2,
      decrescente: 1.5,
      aleatorio: 1,
    },
    bubble: {
      crescente: 0.6,
      decrescente: 1.4,
      aleatorio: 1,
    },
    merge: {
      crescente: 1,
      decrescente: 1,
      aleatorio: 1,
    },
    heap: {
      crescente: 1,
      decrescente: 1.05,
      aleatorio: 1,
    },
    quick: {
      crescente: 1.25,
      decrescente: 1.25,
      aleatorio: 1,
    },
  };

  const jitter = 0.82 + Math.random() * 0.36;
  return (
    complexityValueByAlgorithm[algorithm] *
    scenarioFactorByAlgorithm[algorithm][scenario] *
    jitter
  );
};

const estimateComparisons = (
  algorithm: AlgorithmKey,
  scenario: ScenarioType,
  size: number,
): number => {
  const n = size;
  const nLogN = n * Math.log2(Math.max(n, 2));

  const base: Record<AlgorithmKey, number> = {
    insertion:
      scenario === "crescente"
        ? n
        : scenario === "decrescente"
          ? (n * n) / 2
          : (n * n) / 4,
    bubble:
      scenario === "crescente"
        ? (n * n) / 3
        : scenario === "decrescente"
          ? (n * n) / 2
          : (n * n) / 2.5,
    merge: nLogN,
    heap: nLogN * 1.1,
    quick: scenario === "aleatorio" ? nLogN * 1.2 : nLogN * 1.7,
  };

  return Math.round(base[algorithm]);
};

const estimateMemoryKb = (algorithm: AlgorithmKey, size: number): number => {
  const baseKb = (size * 8) / 1024;
  if (algorithm === "merge") {
    return Math.round(baseKb * 2.2);
  }
  if (algorithm === "quick") {
    return Math.round(baseKb * 1.2);
  }
  return Math.round(baseKb);
};

const average = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  const total = values.reduce((sum, value) => {
    return sum + value;
  }, 0);
  return total / values.length;
};

const percentile = (sortedValues: number[], p: number): number => {
  const position = (sortedValues.length - 1) * p;
  const baseIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);

  if (baseIndex === upperIndex) {
    return sortedValues[baseIndex];
  }

  const weight = position - baseIndex;
  return (
    sortedValues[baseIndex] * (1 - weight) + sortedValues[upperIndex] * weight
  );
};

const removeOutliersIqr = (values: number[]): number[] => {
  if (values.length < 4) {
    return values;
  }

  const sorted = [...values].sort((a, b) => {
    return a - b;
  });

  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const filtered = sorted.filter((value) => {
    return value >= lowerBound && value <= upperBound;
  });

  return filtered.length > 0 ? filtered : sorted;
};

const runSimulation = async (job: CompareJob): Promise<void> => {
  const rows: ComparisonResultRow[] = [];
  const total = job.algorithms.length * job.scenarios.length * job.sizes.length;
  let completed = 0;

  for (const algorithm of job.algorithms) {
    for (const scenario of job.scenarios) {
      for (const size of job.sizes) {
        if (cancelled) {
          workerScope.postMessage({ type: "cancelled" });
          return;
        }

        const durationSamples: number[] = [];
        const comparisonSamples: number[] = [];
        const memorySamples: number[] = [];
        let timeoutCount = 0;

        for (
          let replication = 0;
          replication < job.replications;
          replication += 1
        ) {
          if (cancelled) {
            workerScope.postMessage({ type: "cancelled" });
            return;
          }

          const duration = estimateDurationMs(algorithm, scenario, size);
          const comparisons = estimateComparisons(algorithm, scenario, size);
          const memory = estimateMemoryKb(algorithm, size);

          if (duration > job.timeoutMs) {
            timeoutCount += 1;
          } else {
            durationSamples.push(duration);
            comparisonSamples.push(comparisons);
            memorySamples.push(memory);
          }

          await delay(0);
        }

        const filteredDurations = removeOutliersIqr(durationSamples);

        rows.push({
          id: `${algorithm}-${scenario}-${size}`,
          algorithm,
          scenario,
          size,
          averageTimeMs: Number(average(filteredDurations).toFixed(3)),
          averageComparisons: Math.round(average(comparisonSamples)),
          averageMemoryKb: Math.round(average(memorySamples)),
          timeoutCount,
        });

        completed += 1;
        workerScope.postMessage({
          type: "progress",
          completed,
          total,
        });
      }
    }
  }

  workerScope.postMessage({ type: "result", rows });
};

workerScope.onmessage = (event: MessageEvent<WorkerCommand>): void => {
  const command = event.data;

  if (command.type === "cancel") {
    cancelled = true;
    return;
  }

  cancelled = false;

  void runSimulation(command.payload).catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "internal_worker_error";
    workerScope.postMessage({
      type: "error",
      message,
    });
  });
};

export {};
