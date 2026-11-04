import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// O Doca roda `npm run build` e sobe `dist/main.js` (gerado por scripts/pos-build.mjs).
export default defineConfig({
  css: { transformer: "lightningcss" },
  resolve: {
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  server: { port: 8080 },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    // src/server.ts envolve o servidor do TanStack Start (página de erro e preparo do banco).
    tanstackStart({ server: { entry: "server" } }),
    nitro({ preset: "node-server", output: { dir: "dist" } }),
    viteReact(),
  ],
});
