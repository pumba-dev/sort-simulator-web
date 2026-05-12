export interface BenchmarkEnvironment {
  os: string;
  browser: string;
  browserVersion: string;
  engine: string;
  cpuThreads?: number;
  memoryGB?: number;
  mobile: boolean;
  gpu?: string;
  baselineScore: number;
}

// Parses browser name, major version, and JS engine from a User-Agent string.
const parseBrowser = (
  ua: string,
): { browser: string; browserVersion: string; engine: string } => {
  let m: RegExpMatchArray | null;

  m = ua.match(/Edg\/(\d+)/);
  if (m) return { browser: "Edge", browserVersion: m[1], engine: "V8" };

  m = ua.match(/OPR\/(\d+)/);
  if (m) return { browser: "Opera", browserVersion: m[1], engine: "V8" };

  m = ua.match(/Firefox\/(\d+)/);
  if (m) return { browser: "Firefox", browserVersion: m[1], engine: "SpiderMonkey" };

  m = ua.match(/Chrome\/(\d+)/);
  if (m) return { browser: "Chrome", browserVersion: m[1], engine: "V8" };

  m = ua.match(/Version\/(\d+).*Safari/);
  if (m) return { browser: "Safari", browserVersion: m[1], engine: "JavaScriptCore" };

  m = ua.match(/Safari\/(\d+)/);
  if (m) return { browser: "Safari", browserVersion: "", engine: "JavaScriptCore" };

  return { browser: "Unknown", browserVersion: "", engine: "Unknown" };
};

// Parses OS name from a User-Agent string.
const parseOS = (ua: string): string => {
  if (/Windows NT 10\.0/.test(ua)) return "Windows 10/11";
  if (/Windows NT 6\.3/.test(ua)) return "Windows 8.1";
  if (/Windows NT 6\.1/.test(ua)) return "Windows 7";
  if (/Windows/.test(ua)) return "Windows";

  const macMatch = ua.match(/Mac OS X (\d+[._]\d+)/);
  if (macMatch) return `macOS ${macMatch[1].replace("_", ".")}`;
  if (/Mac OS X/.test(ua)) return "macOS";

  const androidMatch = ua.match(/Android (\d+)/);
  if (androidMatch) return `Android ${androidMatch[1]}`;

  if (/iPhone|iPad/.test(ua)) {
    const iosMatch = ua.match(/OS (\d+_\d+)/);
    return iosMatch ? `iOS ${iosMatch[1].replace("_", ".")}` : "iOS";
  }

  if (/CrOS/.test(ua)) return "Chrome OS";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown";
};

// Attempts to read the unmasked GPU renderer string via WebGL.
// Uses OffscreenCanvas so it can run inside a Web Worker.
// Returns undefined when the API is unavailable or the extension is blocked.
const tryGetGpu = (): string | undefined => {
  try {
    if (typeof OffscreenCanvas === "undefined") return undefined;
    const canvas = new OffscreenCanvas(1, 1);
    const gl = canvas.getContext("webgl") as WebGLRenderingContext | null;
    if (!gl) return undefined;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return undefined;
    const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
    return renderer || undefined;
  } catch {
    return undefined;
  }
};

// Runs a 50M-iteration accumulator loop and returns elapsed milliseconds (rounded).
// Lower scores indicate faster single-thread JS execution.
const runBaseline = (): number => {
  const start = performance.now();
  let x = 0;
  for (let i = 0; i < 50_000_000; i++) {
    x += i;
  }
  void x;
  return Math.round(performance.now() - start);
};

// Collects browser, OS, hardware, and baseline performance data for the current execution context.
// Safe to call from a Web Worker (no DOM dependency).
export const detectEnvironment = (): BenchmarkEnvironment => {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const { browser, browserVersion, engine } = parseBrowser(ua);
  const os = parseOS(ua);

  const cpuThreads =
    typeof navigator !== "undefined" && navigator.hardwareConcurrency
      ? navigator.hardwareConcurrency
      : undefined;

  const nav = navigator as Navigator & { deviceMemory?: number };
  const memoryGB = typeof nav.deviceMemory === "number" ? nav.deviceMemory : undefined;

  const mobile =
    /Mobi|Android/i.test(ua) ||
    (typeof navigator !== "undefined" &&
      navigator.maxTouchPoints > 1 &&
      !/Windows NT/i.test(ua));

  const gpu = tryGetGpu();
  const baselineScore = runBaseline();

  return { os, browser, browserVersion, engine, cpuThreads, memoryGB, mobile, gpu, baselineScore };
};
