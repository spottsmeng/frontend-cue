import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hides the dev-only floating "N" build-activity indicator (bottom-left
  // by default) — dev-only chrome, never rendered in a production build;
  // Next.js still surfaces real compile/runtime errors without it.
  devIndicators: false,
};

export default nextConfig;
