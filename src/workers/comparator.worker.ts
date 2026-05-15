/// <reference lib="webworker" />

import type { WorkerCommand } from "../types/comparator";
import { BenchmarkService } from "../services/benchmark-service";
import { DeviceDetector } from "../services/device-detector";
import { createSubWorkerRegistry } from "./sub-worker-registry";

/**
 * Dedicated Web Worker that drives benchmark execution off the main thread.
 * Receives `WorkerCommand` messages (start/cancel) from the UI, runs the
 * BenchmarkService against a sub-worker registry (one Worker per algorithm
 * run for true parallelism), and posts back `WorkerMessage` updates
 * (progress, result, cancelled, error).
 */

const workerScope: DedicatedWorkerGlobalScope =
  self as unknown as DedicatedWorkerGlobalScope;

/** Controller for the currently running job; aborted on "cancel". */
let activeController: AbortController | null = null;

/** Singleton service wired to a sub-worker registry so each algorithm runs in its own Worker. */
const service = new BenchmarkService(createSubWorkerRegistry());

/**
 * Dispatches incoming worker commands. On "start", spawns a job and streams
 * progress events; on "cancel", aborts the active job (if any). Captures
 * device environment data once per job and attaches it to the final report.
 */
workerScope.onmessage = (event: MessageEvent<WorkerCommand>): void => {
  const command = event.data;

  if (command.type === "cancel") {
    if (activeController) {
      activeController.abort();
    }
    return;
  }

  if (command.type === "start") {
    const controller = new AbortController();
    activeController = controller;

    const environment = DeviceDetector.detect();

    service
      .runJob(command.payload, {
        signal: controller.signal,
        onProgress: (completed, total) => {
          workerScope.postMessage({ type: "progress", completed, total });
        },
      })
      .then((report) => {
        report.environment = environment;
        if (controller.signal.aborted) {
          workerScope.postMessage({ type: "cancelled" });
        } else {
          workerScope.postMessage({
            type: "result",
            rows: report.rows,
            report,
          });
        }
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "internal_worker_error";
        workerScope.postMessage({ type: "error", message });
      })
      .finally(() => {
        if (activeController === controller) {
          activeController = null;
        }
      });
  }
};

export {};
