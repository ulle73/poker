import { build } from "vite";
await build({
  configFile: false,
  publicDir: false,
  build: {
    outDir: "public/live",
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: "src/live/reader.ts",
      name: "PokerTableReader",
      formats: ["iife"],
      fileName: () => "live-reader.js",
    },
  },
});
