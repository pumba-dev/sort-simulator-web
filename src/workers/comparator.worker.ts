/// <reference lib="webworker" />

import type { WorkerCommand } from "../types/comparator";
import { BenchmarkService } from "../services/benchmark-service";
import { detectEnvironment } from "../services/device-detector";

const workerScope: DedicatedWorkerGlobalScope =
  self as unknown as DedicatedWorkerGlobalScope;

let activeController: AbortController | null = null;
const service = new BenchmarkService();

workerScope.onmessage = (event: MessageEvent<WorkerCommand>): void => {
  const command = event.data;

  console.log("Worker received command:", command);

  if (command.type === "cancel") {
    console.log("Recebido comando de cancelamento");
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
        console.log("Worker finished processing command:", command);
        if (activeController === controller) {
          activeController = null;
        }
      });
  }
};

export {};
