import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Hides the dev-only floating "N" build-activity indicator (bottom-left
  // by default) — dev-only chrome, never rendered in a production build;
  // Next.js still surfaces real compile/runtime errors without it.
  devIndicators: false,
};

// F9: next-intl without i18n routing — locale resolved server-side from a
// cookie (i18n/request.ts), no [locale] URL segment. The plugin's only job
// here is wiring that request-config module in; it adds no routing.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
