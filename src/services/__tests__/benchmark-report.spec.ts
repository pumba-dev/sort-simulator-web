import { describe, it, expect } from "vitest";
import { generateMarkdownReport, generatePdfBlob } from "../benchmark-report";
import { BenchmarkService } from "../benchmark-service";
import type { CompareJob } from "../../types/comparator";

const job: CompareJob = {
  algorithms: ["bubble"],
  scenarios: ["aleatorio"],
  sizes: [20],
  replications: 2,
  timeoutMs: 60000,
  seed: 42,
  removeOutliers: true,
};

describe("generateMarkdownReport", () => {
  it("contains expected sections", async () => {
    const service = new BenchmarkService();
    const report = await service.runJob(job);
    const md = generateMarkdownReport(report);
    expect(md).toContain("# Relatorio do Comparador de Algoritmos");
    expect(md).toContain("## Resultados Agregados");
    expect(md).toContain("## Amostras Brutas");
    expect(md).toContain("Bubble Sort");
    expect(md).toContain("Aleatorio");
    expect(md).toContain("Seed");
  });
});

describe("generatePdfBlob", () => {
  it("returns a non-empty pdf blob", async () => {
    const service = new BenchmarkService();
    const report = await service.runJob(job);
    const blob = await generatePdfBlob(report);
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe("application/pdf");
  });
});
