import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep tracing inside this app when a parent lockfile exists (e.g. C:\Users\flowp).
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
