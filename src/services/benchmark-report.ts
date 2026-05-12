import type {
  AlgorithmKey,
  BenchmarkCell,
  BenchmarkReport,
  ScenarioType,
} from "../types/comparator";

const algorithmLabel: Record<AlgorithmKey, string> = {
  insertion: "Insertion Sort",
  bubble: "Bubble Sort",
  merge: "Merge Sort",
  heap: "Heap Sort",
  quick: "Quick Sort",
};

const scenarioLabel: Record<ScenarioType, string> = {
  crescente: "Crescente",
  decrescente: "Decrescente",
  aleatorio: "Aleatorio",
};

// Formats a number with Brazilian locale separators; omits decimal places for integers.
const formatNumber = (value: number): string => {
  if (Number.isInteger(value)) return value.toLocaleString("pt-BR");
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
};

// Renders a full Markdown report string: header, config block, aggregated results table,
// and per-cell raw sample tables.
export const generateMarkdownReport = (report: BenchmarkReport): string => {
  const lines: string[] = [];
  const cfg = report.config;

  lines.push("# Relatorio do Comparador de Algoritmos");
  lines.push("");
  lines.push(`- **Executado em:** ${report.executedAt}`);
  lines.push(`- **Seed:** ${cfg.seed}`);
  lines.push(`- **Replicacoes:** ${cfg.replications}`);
  lines.push(
    `- **Remocao de outliers (IQR):** ${cfg.removeOutliers ? "ativada" : "desativada"}`,
  );
  lines.push(
    `- **Timeout por execucao:** ${(cfg.timeoutMs / 60000).toFixed(2)} min (${cfg.timeoutMs} ms)`,
  );

  if (report.environment) {
    const env = report.environment;
    lines.push("");
    lines.push("## Ambiente de Execucao");
    lines.push(
      `- **Navegador:** ${env.browser} ${env.browserVersion} (${env.engine})`,
    );
    lines.push(`- **OS:** ${env.os}`);
    const hw: string[] = [];
    if (env.cpuThreads) hw.push(`${env.cpuThreads} Threads`);
    if (env.memoryGB) hw.push(`${env.memoryGB} GB RAM`);
    hw.push(env.mobile ? "Mobile" : "Desktop");
    lines.push(`- **Hardware:** ${hw.join(" · ")}`);
    if (env.gpu) lines.push(`- **GPU:** ${env.gpu}`);
    lines.push(`- **Baseline Score:** ${env.baselineScore} ms`);
  }
  lines.push("");

  lines.push("## Configuracao");
  lines.push(
    `- **Algoritmos:** ${cfg.algorithms.map((a) => algorithmLabel[a]).join(", ")}`,
  );
  lines.push(
    `- **Cenarios:** ${cfg.scenarios.map((s) => scenarioLabel[s]).join(", ")}`,
  );
  lines.push(
    `- **Tamanhos:** ${cfg.sizes.map((n) => n.toLocaleString("pt-BR")).join(", ")}`,
  );
  lines.push("");

  lines.push("## Resultados Agregados");
  lines.push("");
  lines.push(
    "| Algoritmo | Cenario | Tamanho | Tempo medio (ms) | Comparacoes | Trocas | Memoria (KB) | Timeouts | Outliers removidos |",
  );
  lines.push("| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |");
  for (const cell of report.cells) {
    lines.push(
      `| ${algorithmLabel[cell.algorithm]} | ${scenarioLabel[cell.scenario]} | ${cell.size.toLocaleString("pt-BR")} | ${formatNumber(cell.averageTimeMs)} | ${formatNumber(cell.averageComparisons)} | ${formatNumber(cell.averageSwaps)} | ${formatNumber(cell.averageMemoryKb)} | ${cell.timeoutCount} | ${cell.removedOutlierDurations.length} |`,
    );
  }
  lines.push("");

  lines.push("## Amostras Brutas (por celula)");
  for (const cell of report.cells) {
    lines.push("");
    lines.push(
      `### ${algorithmLabel[cell.algorithm]} - ${scenarioLabel[cell.scenario]} - n=${cell.size.toLocaleString("pt-BR")}`,
    );
    lines.push("");
    lines.push(buildSamplesTable(cell));
    if (cell.removedOutlierDurations.length > 0) {
      lines.push("");
      lines.push(
        `Outliers (durationMs) removidos: ${cell.removedOutlierDurations.map((v) => v.toFixed(3)).join(", ")}`,
      );
    }
  }

  return lines.join("\n");
};

// Renders a Markdown table of raw replication samples for a single benchmark cell.
const buildSamplesTable = (cell: BenchmarkCell): string => {
  const lines: string[] = [];
  lines.push(
    "| Rep | Duracao (ms) | Comparacoes | Trocas | Memoria (KB) | Timeout |",
  );
  lines.push("| ---: | ---: | ---: | ---: | ---: | :---: |");
  cell.samples.forEach((sample, index) => {
    lines.push(
      `| ${index + 1} | ${sample.durationMs.toFixed(3)} | ${sample.comparisons} | ${sample.swaps} | ${(sample.peakAuxBytes / 1024).toFixed(2)} | ${sample.timedOut ? "sim" : "nao"} |`,
    );
  });
  return lines.join("\n");
};

// Renders an A4 PDF report using jsPDF (lazy-loaded) with manual text+rect table layout.
// Returns the document as a Blob ready for download.
export const generatePdfBlob = async (
  report: BenchmarkReport,
): Promise<Blob> => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const lineHeight = 14;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeLine = (text: string, size = 10, bold = false) => {
    ensureSpace(lineHeight);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const wrapped = doc.splitTextToSize(
      text,
      pageWidth - margin * 2,
    ) as string[];
    for (const line of wrapped) {
      ensureSpace(lineHeight);
      doc.text(line, margin, y);
      y += lineHeight;
    }
  };

  const writeHeading = (text: string, size: number) => {
    ensureSpace(lineHeight + 6);
    y += 4;
    writeLine(text, size, true);
  };

  writeLine("Relatorio do Comparador de Algoritmos", 16, true);
  y += 4;
  writeLine(`Executado em: ${report.executedAt}`);
  writeLine(`Seed: ${report.config.seed}`);
  writeLine(`Replicacoes: ${report.config.replications}`);
  writeLine(
    `Remocao de outliers (IQR): ${report.config.removeOutliers ? "ativada" : "desativada"}`,
  );
  writeLine(
    `Timeout por execucao: ${(report.config.timeoutMs / 60000).toFixed(2)} min (${report.config.timeoutMs} ms)`,
  );

  if (report.environment) {
    const env = report.environment;
    writeHeading("Ambiente de Execucao", 12);
    writeLine(`Navegador: ${env.browser} ${env.browserVersion} (${env.engine})`);
    writeLine(`OS: ${env.os}`);
    const hw: string[] = [];
    if (env.cpuThreads) hw.push(`${env.cpuThreads} Threads`);
    if (env.memoryGB) hw.push(`${env.memoryGB} GB RAM`);
    hw.push(env.mobile ? "Mobile" : "Desktop");
    writeLine(`Hardware: ${hw.join(" · ")}`);
    if (env.gpu) writeLine(`GPU: ${env.gpu}`);
    writeLine(`Baseline Score: ${env.baselineScore} ms`);
  }

  writeHeading("Configuracao", 12);
  writeLine(
    `Algoritmos: ${report.config.algorithms.map((a) => algorithmLabel[a]).join(", ")}`,
  );
  writeLine(
    `Cenarios: ${report.config.scenarios.map((s) => scenarioLabel[s]).join(", ")}`,
  );
  writeLine(
    `Tamanhos: ${report.config.sizes.map((n) => n.toLocaleString("pt-BR")).join(", ")}`,
  );

  writeHeading("Resultados Agregados", 12);

  const aggregatedHeaders = [
    "Algoritmo",
    "Cenario",
    "Tamanho",
    "Tempo (ms)",
    "Comparacoes",
    "Trocas",
    "Mem (KB)",
    "Timeouts",
    "Outliers",
  ];
  const aggregatedColWidths = [70, 65, 50, 55, 70, 55, 55, 50, 50];
  drawTable(
    doc,
    aggregatedHeaders,
    aggregatedColWidths,
    margin,
    () => y,
    (newY) => {
      y = newY;
    },
    pageHeight,
    lineHeight,
    report.cells.map((cell) => [
      algorithmLabel[cell.algorithm],
      scenarioLabel[cell.scenario],
      cell.size.toLocaleString("pt-BR"),
      formatNumber(cell.averageTimeMs),
      formatNumber(cell.averageComparisons),
      formatNumber(cell.averageSwaps),
      formatNumber(cell.averageMemoryKb),
      String(cell.timeoutCount),
      String(cell.removedOutlierDurations.length),
    ]),
    () => {
      doc.addPage();
      y = margin;
    },
  );

  writeHeading("Amostras Brutas (por celula)", 12);

  for (const cell of report.cells) {
    writeLine(
      `${algorithmLabel[cell.algorithm]} - ${scenarioLabel[cell.scenario]} - n=${cell.size.toLocaleString("pt-BR")}`,
      11,
      true,
    );
    const sampleHeaders = [
      "Rep",
      "Duracao (ms)",
      "Comparacoes",
      "Trocas",
      "Mem (KB)",
      "Timeout",
    ];
    const sampleWidths = [40, 80, 80, 60, 70, 60];
    drawTable(
      doc,
      sampleHeaders,
      sampleWidths,
      margin,
      () => y,
      (newY) => {
        y = newY;
      },
      pageHeight,
      lineHeight,
      cell.samples.map((sample, index) => [
        String(index + 1),
        sample.durationMs.toFixed(3),
        String(sample.comparisons),
        String(sample.swaps),
        (sample.peakAuxBytes / 1024).toFixed(2),
        sample.timedOut ? "sim" : "nao",
      ]),
      () => {
        doc.addPage();
        y = margin;
      },
    );
    if (cell.removedOutlierDurations.length > 0) {
      writeLine(
        `Outliers removidos: ${cell.removedOutlierDurations.map((v) => v.toFixed(3)).join(", ")}`,
      );
    }
    y += 6;
  }

  return doc.output("blob");
};

// Draws a bordered table using jsPDF rect+text primitives, adding new pages when content
// would overflow the bottom margin.
const drawTable = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  headers: string[],
  colWidths: number[],
  marginX: number,
  getY: () => number,
  setY: (value: number) => void,
  pageHeight: number,
  lineHeight: number,
  rows: string[][],
  newPage: () => void,
): void => {
  const padding = 4;
  const rowHeight = lineHeight + padding;

  const drawRow = (cells: string[], bold: boolean) => {
    let y = getY();
    if (y + rowHeight > pageHeight - marginX) {
      newPage();
      y = getY();
    }
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(9);
    let x = marginX;
    for (let i = 0; i < cells.length; i += 1) {
      doc.rect(x, y, colWidths[i], rowHeight);
      doc.text(String(cells[i]), x + 2, y + lineHeight);
      x += colWidths[i];
    }
    setY(y + rowHeight);
  };

  drawRow(headers, true);
  for (const row of rows) {
    drawRow(row, false);
  }
};

// Triggers a browser file download for the given Blob by creating a temporary anchor element.
export const triggerDownload = (blob: Blob, filename: string): void => {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
