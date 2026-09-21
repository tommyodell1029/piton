import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This repo has two package.json/lockfiles (the Expo app at the root,
  // this app in odie/) — pin the workspace root explicitly so Turbopack
  // doesn't guess wrong.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
