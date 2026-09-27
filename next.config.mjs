/** @type {import("next").NextConfig} */
const nextConfig = {
  // Keep the dev server's client bundles separate from `next build` output.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next"
};

export default nextConfig;
