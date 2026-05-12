import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "algorithms/__tests__/**/*.spec.ts",
      "src/**/__tests__/**/*.spec.ts",
    ],
  },
});
