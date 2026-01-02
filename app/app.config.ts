import { defineConfig } from "@solidjs/start/config";
import tsconfigPaths from "vite-tsconfig-paths";
import lucidePreprocess from "vite-plugin-lucide-preprocess";

export default defineConfig({
  vite: {
    plugins: [lucidePreprocess(), tsconfigPaths()],
    optimizeDeps: {},
  },
});
