/// <reference lib="webworker" />

import type { WorkerCommand } from "../types/comparator";
import { BenchmarkService } from "../services/benchmark-service";
import { detectEnvironment } from "../services/device-detector";
import { createSubWorkerRegistry } from "./sub-worker-registry";

const workerScope: DedicatedWorkerGlobalScope =
  self as unknown as DedicatedWorkerGlobalScope;

let activeController: AbortController | null = null;
const service = new BenchmarkService(createSubWorkerRegistry());

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

    const environment = detectEnvironment();

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
