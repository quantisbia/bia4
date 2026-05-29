/**
 * BIA — Vitest config (R12.48)
 *
 * Testes unitários focados nos módulos puros do pipeline de bioimpressão:
 *   - coherence-check.ts (validador modelo↔gcode)
 *   - quick-gcode.ts     (gerador determinístico)
 *
 * NÃO testa componentes React (precisaria jsdom + testing-library).
 * NÃO testa rotas /api (precisaria mock do Next runtime).
 *
 * Roda com: npm run test
 */

import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Exclui qualquer arquivo de teste que dependa de DOM/JSX (não temos jsdom)
    exclude: ["node_modules", ".next", "dist", "tests/**/*.dom.test.ts"],
    testTimeout: 10000,
  },
})
