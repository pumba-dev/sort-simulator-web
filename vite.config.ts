/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'node',
    include: ['algorithms/__tests__/**/*.spec.ts', 'src/**/__tests__/**/*.spec.ts'],
  },
})
