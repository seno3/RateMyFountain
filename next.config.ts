import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// So `pnpm dev:lan` works from a phone on the same Wi-Fi: let this machine's own
// LAN IPs load dev assets. Only affects `next dev`.
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i!.address);

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: lanAddresses,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
