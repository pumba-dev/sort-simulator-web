import type {
  AlgorithmKey,
  BenchmarkCell,
  BenchmarkEnvironment,
  BenchmarkReport,
  BenchmarkReplicationSample,
  CompareJob,
  ComparisonResultRow,
  ScenarioType,
} from "../types/comparator";
import { i18n } from "../i18n";

/**
 * Generates and parses benchmark reports in multiple formats (Markdown, PDF, CSV).
 * All user-facing labels are localized through the shared i18n instance.
 * Exposed as the singleton `benchmarkReport` at the bottom of this module.
 */
class BenchmarkReportService {
  private static readonly ALGORITHM_KEYS: AlgorithmKey[] = [
    "insertion",
    "bubble",
    "merge",
    "heap",
    "quick",
    "tim",
  ];
  private static readonly SCENARIO_KEYS: ScenarioType[] = [
    "crescente",
    "decrescente",
    "aleatorio",
    "quaseOrdenado",
    "quaseDecrescente",
    "gaussiano",
    "organPipe",
    "comOutliers",
  ];

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Builds a Markdown document containing the header, environment, configuration,
   * aggregated results table and per-cell raw sample tables. Suitable for embedding
   * in issue trackers or for human reading.
   */
  generateMarkdownReport(report: BenchmarkReport): string {
    const lines: string[] = [];
    const cfg = report.config;
    const locale = i18n.global.locale.value as string;

    lines.push(`# ${this.t("comparator.report.title")}`);
    lines.push("");
    lines.push(`## ${this.t("comparator.report.sections.header")}`);
    lines.push("");
    lines.push(
      `- **${this.t("comparator.report.header.executedAt")}:** ${new Date(report.executedAt).toLocaleString(locale)}`,
    );
    lines.push(`- **${this.t("comparator.report.header.seed")}:** ${cfg.seed}`);
    lines.push(
      `- **${this.t("comparator.report.header.replications")}:** ${cfg.replications}`,
    );
    lines.push(
      `- **${this.t("comparator.report.header.outlierRemoval")}:** ${
        cfg.removeOutliers
          ? this.t("comparator.report.header.outlierEnabled")
          : this.t("comparator.report.header.outlierDisabled")
      }`,
    );
    lines.push(
      `- **${this.t("comparator.report.header.timeout")}:** ${
        cfg.timeoutEnabled
          ? this.t("comparator.report.header.timeoutFormat", {
              min: (cfg.timeoutMs / 60000).toFixed(2),
              ms: cfg.timeoutMs,
            })
          : this.t("comparator.report.header.outlierDisabled")
      }`,
    );
    if (report.elapsedMs !== undefined) {
      lines.push(
        `- **${this.t("comparator.report.header.elapsed")}:** ${this.formatElapsed(report.elapsedMs)}`,
      );
    }

    if (report.environment) {
      const env = report.environment;
      lines.push("");
      lines.push(`## ${this.t("comparator.report.sections.environment")}`);
      lines.push("");
      lines.push(
        `- **${this.t("comparator.report.environment.browser")}:** ${env.browser} ${env.browserVersion} (${env.engine})`,
      );
      lines.push(
        `- **${this.t("comparator.report.environment.os")}:** ${env.os}`,
      );
      const hw: string[] = [];
      if (env.cpuThreads)
        hw.push(
          this.t("comparator.report.environment.threads", {
            count: env.cpuThreads,
          }),
        );
      if (env.memoryGB)
        hw.push(
          this.t("comparator.report.environment.memory", {
            gb: env.memoryGB,
          }),
        );
      hw.push(
        env.mobile
          ? this.t("comparator.report.environment.mobile")
          : this.t("comparator.report.environment.desktop"),
      );
      lines.push(
        `- **${this.t("comparator.report.environment.hardware")}:** ${hw.join(" · ")}`,
      );
      if (env.gpu)
        lines.push(
          `- **${this.t("comparator.report.environment.gpu")}:** ${env.gpu}`,
        );
      lines.push(
        `- **${this.t("comparator.report.environment.baselineScore")}:** ${env.baselineScore} ms`,
      );
    }

    lines.push("");
    lines.push(`## ${this.t("comparator.report.sections.configuration")}`);
    lines.push("");
    lines.push(
      `- **${this.t("comparator.report.config.algorithms")}:** ${cfg.algorithms.map((k) => this.algLabel(k)).join(", ")}`,
    );
    lines.push(
      `- **${this.t("comparator.report.config.scenarios")}:** ${cfg.scenarios.map((k) => this.scnLabel(k)).join(", ")}`,
    );
    lines.push(
      `- **${this.t("comparator.report.config.sizes")}:** ${cfg.sizes.map((n) => n.toLocaleString(locale)).join(", ")}`,
    );

    const ac = (k: string) =>
      this.t(`comparator.report.aggregated.columns.${k}`);

    lines.push("");
    lines.push(`## ${this.t("comparator.report.sections.aggregated")}`);
    lines.push("");
    lines.push(
      `| ${ac("algorithm")} | ${ac("scenario")} | ${ac("size")} | ${ac("avgTime")} | ${ac("avgComparisons")} | ${ac("avgSwaps")} | ${ac("avgMemory")} | ${ac("timeouts")} | ${ac("outliersRemoved")} |`,
    );
    lines.push("| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |");
    for (const cell of report.cells) {
      lines.push(
        `| ${this.algLabel(cell.algorithm)} | ${this.scnLabel(cell.scenario)} | ${cell.size.toLocaleString(locale)} | ${this.formatNumber(cell.averageTimeMs)} | ${this.formatNumber(cell.averageComparisons)} | ${this.formatNumber(cell.averageSwaps)} | ${this.formatNumber(cell.averageMemoryKb)} | ${cell.timeoutCount} | ${cell.removedOutlierDurations.length} |`,
      );
    }

    const rc = (k: string) => this.t(`comparator.report.raw.columns.${k}`);

    lines.push("");
    lines.push(`## ${this.t("comparator.report.sections.raw")}`);

    for (const cell of report.cells) {
      lines.push("");
      lines.push(
        `### ${this.t("comparator.report.raw.cellHeading", {
          algorithm: this.algLabel(cell.algorithm),
          scenario: this.scnLabel(cell.scenario),
          size: cell.size.toLocaleString(locale),
        })}`,
      );
      lines.push("");
      lines.push(
        `| ${rc("rep")} | ${rc("duration")} | ${rc("comparisons")} | ${rc("swaps")} | ${rc("memory")} | ${rc("timeout")} |`,
      );
      lines.push("| ---: | ---: | ---: | ---: | ---: | :---: |");
      cell.samples.forEach((sample, index) => {
        lines.push(
          `| ${index + 1} | ${this.formatNumber(sample.durationMs)} | ${this.formatNumber(sample.comparisons)} | ${this.formatNumber(sample.swaps)} | ${this.formatNumber(sample.peakAuxBytes / 1024)} | ${sample.timedOut ? this.t("comparator.report.boolean.yes") : this.t("comparator.report.boolean.no")} |`,
        );
      });
      if (cell.removedOutlierDurations.length > 0) {
        lines.push("");
        lines.push(
          this.t("comparator.report.raw.outliersRemoved", {
            values: cell.removedOutlierDurations
              .map((v) => this.formatNumber(v))
              .join(", "),
          }),
        );
      }
    }

    return lines.join("\n");
  }

  /**
   * Renders the report as a printable A4 PDF and returns it as a Blob.
   * jsPDF is loaded lazily so it is excluded from the main bundle.
   * Tables and headings handle page breaks via the `ensureSpace` helper.
   */
  async generatePdfBlob(report: BenchmarkReport): Promise<Blob> {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36;
    let y = margin;

    const lineFor = (size: number) => Math.ceil(size * 1.4);

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const writeLine = (text: string, size = 10, bold = false) => {
      const lh = lineFor(size);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      const wrapped = doc.splitTextToSize(
        text,
        pageWidth - margin * 2,
      ) as string[];
      for (const line of wrapped) {
        ensureSpace(lh);
        doc.text(line, margin, y + size);
        y += lh;
      }
    };

    const writeHeading = (text: string, size: number) => {
      const lh = lineFor(size);
      ensureSpace(lh + 10);
      y += 8;
      writeLine(text, size, true);
    };

    const writeKV = (label: string, value: string) => {
      writeLine(`${label}: ${value}`);
    };

    const cfg = report.config;
    const locale = i18n.global.locale.value as string;

    writeLine(this.t("comparator.report.title"), 16, true);
    y += 6;

    writeHeading(this.t("comparator.report.sections.header"), 12);
    writeKV(
      this.t("comparator.report.header.executedAt"),
      new Date(report.executedAt).toLocaleString(locale),
    );
    writeKV(this.t("comparator.report.header.seed"), String(cfg.seed));
    writeKV(
      this.t("comparator.report.header.replications"),
      String(cfg.replications),
    );
    writeKV(
      this.t("comparator.report.header.outlierRemoval"),
      cfg.removeOutliers
        ? this.t("comparator.report.header.outlierEnabled")
        : this.t("comparator.report.header.outlierDisabled"),
    );
    writeKV(
      this.t("comparator.report.header.timeout"),
      cfg.timeoutEnabled
        ? this.t("comparator.report.header.timeoutFormat", {
            min: (cfg.timeoutMs / 60000).toFixed(2),
            ms: cfg.timeoutMs,
          })
        : this.t("comparator.report.header.outlierDisabled"),
    );
    if (report.elapsedMs !== undefined) {
      writeKV(
        this.t("comparator.report.header.elapsed"),
        this.formatElapsed(report.elapsedMs),
      );
    }

    if (report.environment) {
      const env = report.environment;
      writeHeading(this.t("comparator.report.sections.environment"), 12);
      writeKV(
        this.t("comparator.report.environment.browser"),
        `${env.browser} ${env.browserVersion} (${env.engine})`,
      );
      writeKV(this.t("comparator.report.environment.os"), env.os);
      const hw: string[] = [];
      if (env.cpuThreads)
        hw.push(
          this.t("comparator.report.environment.threads", {
            count: env.cpuThreads,
          }),
        );
      if (env.memoryGB)
        hw.push(
          this.t("comparator.report.environment.memory", {
            gb: env.memoryGB,
          }),
        );
      hw.push(
        env.mobile
          ? this.t("comparator.report.environment.mobile")
          : this.t("comparator.report.environment.desktop"),
      );
      writeKV(this.t("comparator.report.environment.hardware"), hw.join(" · "));
      if (env.gpu)
        writeKV(this.t("comparator.report.environment.gpu"), env.gpu);
      writeKV(
        this.t("comparator.report.environment.baselineScore"),
        `${env.baselineScore} ms`,
      );
    }

    writeHeading(this.t("comparator.report.sections.configuration"), 12);
    writeKV(
      this.t("comparator.report.config.algorithms"),
      cfg.algorithms.map((k) => this.algLabel(k)).join(", "),
    );
    writeKV(
      this.t("comparator.report.config.scenarios"),
      cfg.scenarios.map((k) => this.scnLabel(k)).join(", "),
    );
    writeKV(
      this.t("comparator.report.config.sizes"),
      cfg.sizes.map((n) => n.toLocaleString(locale)).join(", "),
    );

    writeHeading(this.t("comparator.report.sections.aggregated"), 12);
    const aggHeaders = [
      this.t("comparator.report.aggregated.columns.algorithm"),
      this.t("comparator.report.aggregated.columns.scenario"),
      this.t("comparator.report.aggregated.columns.size"),
      this.t("comparator.report.aggregated.columns.avgTime"),
      this.t("comparator.report.aggregated.columns.avgComparisons"),
      this.t("comparator.report.aggregated.columns.avgSwaps"),
      this.t("comparator.report.aggregated.columns.avgMemory"),
      this.t("comparator.report.aggregated.columns.timeouts"),
      this.t("comparator.report.aggregated.columns.outliersRemoved"),
    ];
    const aggWidths = [70, 65, 50, 55, 70, 50, 55, 50, 50];
    this.drawTable(
      doc,
      aggHeaders,
      aggWidths,
      margin,
      () => y,
      (v) => {
        y = v;
      },
      pageHeight,
      margin,
      report.cells.map((cell) => [
        this.algLabel(cell.algorithm),
        this.scnLabel(cell.scenario),
        cell.size.toLocaleString(locale),
        this.formatNumber(cell.averageTimeMs),
        this.formatNumber(cell.averageComparisons),
        this.formatNumber(cell.averageSwaps),
        this.formatNumber(cell.averageMemoryKb),
        String(cell.timeoutCount),
        String(cell.removedOutlierDurations.length),
      ]),
      () => {
        doc.addPage();
        y = margin;
      },
    );

    y += 6;
    writeHeading(this.t("comparator.report.sections.raw"), 12);

    const rawHeaders = [
      this.t("comparator.report.raw.columns.rep"),
      this.t("comparator.report.raw.columns.duration"),
      this.t("comparator.report.raw.columns.comparisons"),
      this.t("comparator.report.raw.columns.swaps"),
      this.t("comparator.report.raw.columns.memory"),
      this.t("comparator.report.raw.columns.timeout"),
    ];
    const rawWidths = [35, 80, 80, 55, 65, 55];
    const yes = this.t("comparator.report.boolean.yes");
    const no = this.t("comparator.report.boolean.no");

    for (const cell of report.cells) {
      writeLine(
        this.t("comparator.report.raw.cellHeading", {
          algorithm: this.algLabel(cell.algorithm),
          scenario: this.scnLabel(cell.scenario),
          size: cell.size.toLocaleString(locale),
        }),
        10,
        true,
      );
      this.drawTable(
        doc,
        rawHeaders,
        rawWidths,
        margin,
        () => y,
        (v) => {
          y = v;
        },
        pageHeight,
        margin,
        cell.samples.map((sample, index) => [
          String(index + 1),
          this.formatNumber(sample.durationMs),
          this.formatNumber(sample.comparisons),
          this.formatNumber(sample.swaps),
          this.formatNumber(sample.peakAuxBytes / 1024),
          sample.timedOut ? yes : no,
        ]),
        () => {
          doc.addPage();
          y = margin;
        },
      );
      if (cell.removedOutlierDurations.length > 0) {
        writeLine(
          this.t("comparator.report.raw.outliersRemoved", {
            values: cell.removedOutlierDurations
              .map((v) => this.formatNumber(v))
              .join(", "),
          }),
        );
      }
      y += 6;
    }

    return doc.output("blob");
  }

  /**
   * Serializes the report into a sectioned CSV string. Each section is preceded
   * by a `# section:<name>` marker, allowing `parseCsvReport` to reconstruct
   * the report later. Sections emitted: header, environment, config, aggregated,
   * rawSamples, outliers (last two optional).
   */
  generateCsvReport(report: BenchmarkReport): string {
    const sections: string[] = [];
    const cfg = report.config;

    const headerRows = [
      this.csvRow(["key", "value"]),
      this.csvRow(["executedAt", report.executedAt]),
      this.csvRow(["seed", cfg.seed]),
      this.csvRow(["replications", cfg.replications]),
      this.csvRow(["removeOutliers", cfg.removeOutliers]),
      this.csvRow(["timeoutMs", cfg.timeoutMs]),
      this.csvRow(["timeoutEnabled", cfg.timeoutEnabled]),
    ];
    if (report.elapsedMs !== undefined) {
      headerRows.push(this.csvRow(["elapsedMs", report.elapsedMs]));
    }
    sections.push(["# section:header", ...headerRows].join("\n"));

    if (report.environment) {
      const env = report.environment;
      const envRows = [
        this.csvRow(["key", "value"]),
        this.csvRow(["os", env.os]),
        this.csvRow(["browser", env.browser]),
        this.csvRow(["browserVersion", env.browserVersion]),
        this.csvRow(["engine", env.engine]),
        this.csvRow(["cpuThreads", env.cpuThreads ?? ""]),
        this.csvRow(["memoryGB", env.memoryGB ?? ""]),
        this.csvRow(["mobile", env.mobile]),
        this.csvRow(["gpu", env.gpu ?? ""]),
        this.csvRow(["baselineScore", env.baselineScore]),
      ];
      sections.push(["# section:environment", ...envRows].join("\n"));
    }

    const configRows = [
      this.csvRow(["key", "value"]),
      this.csvRow(["algorithms", cfg.algorithms.join(";")]),
      this.csvRow(["scenarios", cfg.scenarios.join(";")]),
      this.csvRow(["sizes", cfg.sizes.join(";")]),
    ];
    sections.push(["# section:config", ...configRows].join("\n"));

    const aggHeader = this.csvRow([
      "algorithm",
      "scenario",
      "size",
      "averageTimeMs",
      "averageComparisons",
      "averageSwaps",
      "averageMemoryKb",
      "timeoutCount",
      "outliersRemoved",
    ]);
    const aggRows = report.cells.map((cell) =>
      this.csvRow([
        cell.algorithm,
        cell.scenario,
        cell.size,
        cell.averageTimeMs,
        cell.averageComparisons,
        cell.averageSwaps,
        cell.averageMemoryKb,
        cell.timeoutCount,
        cell.removedOutlierDurations.length,
      ]),
    );
    sections.push(["# section:aggregated", aggHeader, ...aggRows].join("\n"));

    const rawHeader = this.csvRow([
      "algorithm",
      "scenario",
      "size",
      "rep",
      "durationMs",
      "comparisons",
      "swaps",
      "peakAuxBytes",
      "timedOut",
    ]);
    const rawRows: string[] = [];
    for (const cell of report.cells) {
      cell.samples.forEach((sample, idx) => {
        rawRows.push(
          this.csvRow([
            cell.algorithm,
            cell.scenario,
            cell.size,
            idx + 1,
            sample.durationMs,
            sample.comparisons,
            sample.swaps,
            sample.peakAuxBytes,
            sample.timedOut,
          ]),
        );
      });
    }
    sections.push(["# section:rawSamples", rawHeader, ...rawRows].join("\n"));

    const outlierRows: string[] = [];
    for (const cell of report.cells) {
      for (const d of cell.removedOutlierDurations) {
        outlierRows.push(
          this.csvRow([cell.algorithm, cell.scenario, cell.size, d]),
        );
      }
    }
    if (outlierRows.length > 0) {
      const outlierHeader = this.csvRow([
        "algorithm",
        "scenario",
        "size",
        "durationMs",
      ]);
      sections.push(
        ["# section:outliers", outlierHeader, ...outlierRows].join("\n"),
      );
    }

    return sections.join("\n\n");
  }

  /**
   * Inverse of `generateCsvReport`. Reads the sectioned CSV produced by this
   * service and rebuilds a BenchmarkReport. Throws when required sections
   * (header, config, aggregated) are missing or when values cannot be parsed.
   */
  parseCsvReport(csv: string): BenchmarkReport {
    const sectionMap = new Map<string, string[]>();
    let currentName = "";
    let currentLines: string[] = [];

    for (const raw of csv.split(/\r?\n/)) {
      const line = raw.trimEnd();
      const markerMatch = line.match(/^#\s*section:(\S+)$/);
      if (markerMatch) {
        if (currentName) sectionMap.set(currentName, currentLines);
        currentName = markerMatch[1];
        currentLines = [];
      } else if (currentName && line !== "") {
        currentLines.push(line);
      }
    }
    if (currentName) sectionMap.set(currentName, currentLines);

    for (const req of ["header", "config", "aggregated"] as const) {
      if (!sectionMap.has(req))
        throw new Error(`parseCsvReport: missing required section "${req}"`);
    }

    const hdr = this.parseKVSection(sectionMap.get("header")!);
    const executedAt = hdr.get("executedAt") ?? new Date().toISOString();
    const seed = this.assertNum(hdr.get("seed"), "seed");
    const replications = this.assertNum(
      hdr.get("replications"),
      "replications",
    );
    const removeOutliers = hdr.get("removeOutliers") === "true";
    const timeoutMs = this.assertNum(hdr.get("timeoutMs"), "timeoutMs");
    const timeoutEnabledRaw = hdr.get("timeoutEnabled");
    const timeoutEnabled =
      timeoutEnabledRaw === undefined ? true : timeoutEnabledRaw === "true";
    const elapsedMsRaw = hdr.get("elapsedMs");
    const elapsedMs =
      elapsedMsRaw !== undefined && elapsedMsRaw !== ""
        ? this.assertNum(elapsedMsRaw, "elapsedMs")
        : undefined;

    let environment: BenchmarkEnvironment | undefined;
    if (sectionMap.has("environment")) {
      const env = this.parseKVSection(sectionMap.get("environment")!);
      const cpuThreadsRaw = env.get("cpuThreads");
      const memoryGBRaw = env.get("memoryGB");
      const gpuRaw = env.get("gpu");
      environment = {
        os: env.get("os") ?? "",
        browser: env.get("browser") ?? "",
        browserVersion: env.get("browserVersion") ?? "",
        engine: env.get("engine") ?? "",
        cpuThreads:
          cpuThreadsRaw && cpuThreadsRaw !== ""
            ? Number(cpuThreadsRaw)
            : undefined,
        memoryGB:
          memoryGBRaw && memoryGBRaw !== "" ? Number(memoryGBRaw) : undefined,
        mobile: env.get("mobile") === "true",
        gpu: gpuRaw && gpuRaw !== "" ? gpuRaw : undefined,
        baselineScore: this.assertNum(
          env.get("baselineScore"),
          "baselineScore",
        ),
      };
    }

    const cfgSec = this.parseKVSection(sectionMap.get("config")!);
    const algorithms = (cfgSec.get("algorithms") ?? "")
      .split(";")
      .filter(Boolean)
      .map((v) => this.assertAlgorithm(v));
    const scenarios = (cfgSec.get("scenarios") ?? "")
      .split(";")
      .filter(Boolean)
      .map((v) => this.assertScenario(v));
    const sizes = (cfgSec.get("sizes") ?? "")
      .split(";")
      .filter(Boolean)
      .map((v) => this.assertNum(v, "size"));

    if (algorithms.length === 0)
      throw new Error('parseCsvReport: "algorithms" is empty');
    if (scenarios.length === 0)
      throw new Error('parseCsvReport: "scenarios" is empty');
    if (sizes.length === 0) throw new Error('parseCsvReport: "sizes" is empty');

    const config: CompareJob = {
      algorithms,
      scenarios,
      sizes,
      replications,
      timeoutMs,
      timeoutEnabled,
      seed,
      removeOutliers,
    };

    const cellMap = new Map<
      string,
      {
        algorithm: AlgorithmKey;
        scenario: ScenarioType;
        size: number;
        averageTimeMs: number;
        averageComparisons: number;
        averageSwaps: number;
        averageMemoryKb: number;
        timeoutCount: number;
        samples: BenchmarkReplicationSample[];
        removedOutlierDurations: number[];
      }
    >();

    const aggLines = sectionMap.get("aggregated")!;
    for (let i = 1; i < aggLines.length; i++) {
      const parts = this.parseCsvLine(aggLines[i]);
      if (parts.length < 9) continue;
      const algorithm = this.assertAlgorithm(parts[0]);
      const scenario = this.assertScenario(parts[1]);
      const size = this.assertNum(parts[2], "size");
      cellMap.set(`${algorithm}|${scenario}|${size}`, {
        algorithm,
        scenario,
        size,
        averageTimeMs: this.assertNum(parts[3], "averageTimeMs"),
        averageComparisons: this.assertNum(parts[4], "averageComparisons"),
        averageSwaps: this.assertNum(parts[5], "averageSwaps"),
        averageMemoryKb: this.assertNum(parts[6], "averageMemoryKb"),
        timeoutCount: this.assertNum(parts[7], "timeoutCount"),
        samples: [],
        removedOutlierDurations: [],
      });
    }

    if (sectionMap.has("rawSamples")) {
      const rawLines = sectionMap.get("rawSamples")!;
      for (let i = 1; i < rawLines.length; i++) {
        const parts = this.parseCsvLine(rawLines[i]);
        if (parts.length < 9) continue;
        const key = `${this.assertAlgorithm(parts[0])}|${this.assertScenario(parts[1])}|${this.assertNum(parts[2], "size")}`;
        const cell = cellMap.get(key);
        if (!cell) continue;
        cell.samples.push({
          durationMs: this.assertNum(parts[4], "durationMs"),
          comparisons: this.assertNum(parts[5], "comparisons"),
          swaps: this.assertNum(parts[6], "swaps"),
          peakAuxBytes: this.assertNum(parts[7], "peakAuxBytes"),
          timedOut: parts[8] === "true",
        });
      }
    }

    if (sectionMap.has("outliers")) {
      const outLines = sectionMap.get("outliers")!;
      for (let i = 1; i < outLines.length; i++) {
        const parts = this.parseCsvLine(outLines[i]);
        if (parts.length < 4) continue;
        const key = `${this.assertAlgorithm(parts[0])}|${this.assertScenario(parts[1])}|${this.assertNum(parts[2], "size")}`;
        const cell = cellMap.get(key);
        if (!cell) continue;
        cell.removedOutlierDurations.push(
          this.assertNum(parts[3], "durationMs"),
        );
      }
    }

    const cells: BenchmarkCell[] = Array.from(cellMap.values());

    const rows: ComparisonResultRow[] = cells.map((cell) => ({
      id: `${cell.algorithm}-${cell.scenario}-${cell.size}`,
      algorithm: cell.algorithm,
      scenario: cell.scenario,
      size: cell.size,
      averageTimeMs: cell.averageTimeMs,
      averageComparisons: cell.averageComparisons,
      averageMemoryKb: cell.averageMemoryKb,
      averageSwaps: cell.averageSwaps,
      timeoutCount: cell.timeoutCount,
    }));

    return { config, executedAt, cells, rows, environment, elapsedMs };
  }

  /**
   * Triggers a browser download for a Blob by creating a temporary `<a>` element.
   * No-op when called outside a browser context (SSR guard).
   */
  triggerDownload(blob: Blob, filename: string): void {
    if (typeof window === "undefined") return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ─── i18n / formatting helpers ──────────────────────────────────────────────

  /** Short alias for `i18n.global.t` with optional interpolation params. */
  private t(key: string, params?: Record<string, unknown>): string {
    return i18n.global.t(key, params ?? {}) as string;
  }

  /** Returns the localized label for an algorithm key. */
  private algLabel(key: AlgorithmKey): string {
    return this.t(`common.algorithms.${key}`);
  }

  /** Returns the localized label for a scenario key. */
  private scnLabel(key: ScenarioType): string {
    return this.t(`common.scenarios.${key}`);
  }

  /**
   * Formats a duration in milliseconds as a human-readable string,
   * picking the most appropriate unit (ms, s, m s, or h m).
   */
  private formatElapsed(ms: number): string {
    if (ms < 1000) return `${ms} ms`;
    const s = ms / 1000;
    if (s < 60) return `${s.toFixed(1)} s`;
    const m = Math.floor(s / 60);
    const rs = Math.floor(s % 60);
    if (m < 60) return `${m}m ${rs}s`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  }

  /**
   * Formats a number using the current locale. Integers are shown in full,
   * non-integers are truncated to 3 significant digits.
   */
  private formatNumber(value: number): string {
    const locale = i18n.global.locale.value as string;
    if (Number.isInteger(value)) return value.toLocaleString(locale);
    return value.toLocaleString(locale, { maximumSignificantDigits: 3 });
  }

  // ─── CSV helpers ────────────────────────────────────────────────────────────

  /**
   * Quotes a CSV field when it contains characters that would otherwise
   * break parsing (comma, double-quote, or newline). Inner quotes are doubled.
   */
  private csvQuote(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /** Builds a single CSV row by stringifying and quoting each cell. */
  private csvRow(cells: (string | number | boolean)[]): string {
    return cells.map((c) => this.csvQuote(String(c))).join(",");
  }

  /**
   * Parses a single CSV line into its raw fields, honoring quoted values and
   * escaped double-quotes (`""`). Returns the fields without enclosing quotes.
   */
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          result.push(current);
          current = "";
        } else {
          current += ch;
        }
      }
    }
    result.push(current);
    return result;
  }

  /**
   * Parses a key/value CSV section (header, environment, config) into a Map.
   * The first line is assumed to be the column header and is skipped.
   */
  private parseKVSection(lines: string[]): Map<string, string> {
    const map = new Map<string, string>();
    for (let i = 1; i < lines.length; i++) {
      const parts = this.parseCsvLine(lines[i]);
      if (parts.length >= 2) map.set(parts[0], parts[1]);
    }
    return map;
  }

  /** Parses a numeric CSV cell, throwing a descriptive error when invalid. */
  private assertNum(v: string | undefined, field: string): number {
    const n = Number(v);
    if (v === undefined || v === "" || isNaN(n))
      throw new Error(`parseCsvReport: invalid number for "${field}": ${v}`);
    return n;
  }

  /** Narrows a string to an `AlgorithmKey`, throwing when the value is unknown. */
  private assertAlgorithm(v: string): AlgorithmKey {
    if (!BenchmarkReportService.ALGORITHM_KEYS.includes(v as AlgorithmKey))
      throw new Error(`parseCsvReport: unknown algorithm "${v}"`);
    return v as AlgorithmKey;
  }

  /** Narrows a string to a `ScenarioType`, throwing when the value is unknown. */
  private assertScenario(v: string): ScenarioType {
    if (!BenchmarkReportService.SCENARIO_KEYS.includes(v as ScenarioType))
      throw new Error(`parseCsvReport: unknown scenario "${v}"`);
    return v as ScenarioType;
  }

  // ─── PDF table helper ───────────────────────────────────────────────────────

  /**
   * Renders a table in the jsPDF document at the current Y cursor, wrapping cell
   * text inside fixed column widths and handling page breaks via `newPage`.
   * `getY`/`setY` allow the caller to keep their own Y state in sync.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private drawTable(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doc: any,
    headers: string[],
    colWidths: number[],
    marginX: number,
    getY: () => number,
    setY: (value: number) => void,
    pageHeight: number,
    marginBottom: number,
    rows: string[][],
    newPage: () => void,
  ): void {
    const fontSize = 9;
    const lineHeight = Math.ceil(fontSize * 1.4);
    const padding = 4;

    const drawRow = (cells: string[], bold: boolean) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(fontSize);

      const wrappedCells = cells.map(
        (cell, i) =>
          doc.splitTextToSize(String(cell), colWidths[i] - 4) as string[],
      );
      const maxLines = Math.max(...wrappedCells.map((lines) => lines.length));
      const rowHeight = lineHeight * maxLines + padding;

      let currentY = getY();
      if (currentY + rowHeight > pageHeight - marginBottom) {
        newPage();
        currentY = getY();
      }

      let x = marginX;
      for (let i = 0; i < cells.length; i += 1) {
        doc.rect(x, currentY, colWidths[i], rowHeight);
        wrappedCells[i].forEach((line, lineIdx) => {
          doc.text(line, x + 2, currentY + fontSize + 2 + lineIdx * lineHeight);
        });
        x += colWidths[i];
      }
      setY(currentY + rowHeight);
    };

    drawRow(headers, true);
    for (const row of rows) {
      drawRow(row, false);
    }
  }
}

export const benchmarkReport = new BenchmarkReportService();
