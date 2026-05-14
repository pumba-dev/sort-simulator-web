import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/algorithms/**/*.ts",
        "src/services/benchmark-service.ts",
        "src/services/comparison-history-service.ts",
        "src/services/seeded-prng.ts",
        "src/services/sort-algorithm-registry.ts",
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
