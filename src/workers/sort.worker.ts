/// <reference lib="webworker" />

import type { AlgorithmKey } from "../types/comparator";
import type { SortRunOptions, SortRunResult } from "../types/sort-types";
import { sortAlgorithmRegistry } from "../services/sort-algorithm-registry";

interface SortJobMessage {
  algorithm: AlgorithmKey;
  input: number[];
  options: Omit<SortRunOptions, "signal">;
}

interface SortDoneMessage {
  type: "done";
  result: SortRunResult;
}

interface SortErrorMessage {
  type: "error";
  message: string;
}

type SortReplyMessage = SortDoneMessage | SortErrorMessage;

const workerScope: DedicatedWorkerGlobalScope =
  self as unknown as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<SortJobMessage>): void => {
  const { algorithm, input, options } = event.data;
  try {
    const result = sortAlgorithmRegistry[algorithm].run(input, options);
    const reply: SortReplyMessage = { type: "done", result: result as SortRunResult };
    workerScope.postMessage(reply);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const reply: SortReplyMessage = { type: "error", message };
    workerScope.postMessage(reply);
  }
};

export {};
