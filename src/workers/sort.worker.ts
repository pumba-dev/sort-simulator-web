/// <reference lib="webworker" />

import type { AlgorithmKey } from "../types/comparator";
import type {
  SortInput,
  SortRunOptions,
  SortRunResult,
} from "../types/sort-types";
import { sortAlgorithmRegistry } from "../services/sort-algorithm-registry";

/**
 * Sub-worker that runs a single sort algorithm in isolation.
 * Spawned per replication by `createSubWorkerRegistry` so cancellation is
 * cheap (terminate the Worker) and a stuck algorithm cannot block sibling
 * runs on the parent comparator worker.
 */

/** Input message: the algorithm key, the array to sort, and the run options (sans AbortSignal — not transferable). */
interface SortJobMessage {
  algorithm: AlgorithmKey;
  input: SortInput;
  options: Omit<SortRunOptions, "signal">;
}

/** Successful reply carrying the SortRunResult back to the parent. */
interface SortDoneMessage {
  type: "done";
  result: SortRunResult;
}

/** Failure reply with a human-readable error message. */
interface SortErrorMessage {
  type: "error";
  message: string;
}

type SortReplyMessage = SortDoneMessage | SortErrorMessage;

const workerScope: DedicatedWorkerGlobalScope =
  self as unknown as DedicatedWorkerGlobalScope;

/**
 * Executes the requested algorithm via the shared registry and posts the
 * result back. Any thrown error is converted into an `error` reply so the
 * parent never sees an unhandled promise rejection.
 */
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
