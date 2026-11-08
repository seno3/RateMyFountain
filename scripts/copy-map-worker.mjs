// MapLibre GL v6 runs map rendering work in a Web Worker loaded from a separate file,
// which Next's bundler doesn't ship. Copy it into public/ so the browser can fetch it.
// Runs on postinstall, predev and prebuild. The copy is gitignored.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve("maplibre-gl/package.json"));
mkdirSync("public/maplibre", { recursive: true });
copyFileSync(join(pkgDir, "dist/maplibre-gl-worker.mjs"), "public/maplibre/maplibre-gl-worker.mjs");
