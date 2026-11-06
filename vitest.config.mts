import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit tests run anywhere. DB tests need local Supabase running: `pnpm test:db`.
    include: ["tests/unit/**/*.test.ts"],
  },
});
