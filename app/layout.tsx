import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_SC, Noto_Sans_TC } from "next/font/google";
import Script from "next/script";
import "./globals.css";

import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// P7 ("the original language is never lost") needs real, self-hosted CJK
// coverage, not a system-font gamble — Simplified and Traditional are two
// separate families (CUE-Tech-Stack.md §6: "the same word misses across
// the boundary"), so both are loaded, applied via :lang(zh-Hans) /
// :lang(zh-Hant) in globals.css, never merged into one "Chinese" stack.
const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const notoSansTC = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "CUE",
  description: "Production intelligence for live brand activation",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansSC.variable} ${notoSansTC.variable} h-full antialiased`}
      // The beforeInteractive script below deliberately sets data-theme on
      // this element ahead of hydration (a returning visitor's stored theme
      // choice must paint on the first frame, not flash the OS theme then
      // snap) — the server render can never see localStorage, so this
      // attribute always legitimately differs at hydration time. Scoped to
      // this element's own attributes only, not the subtree.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-bg text-ink font-sans">
        {/* Runs before hydration so a returning visitor's explicit theme
            choice (lib/store/ui-store.ts, localStorage key "cue-theme")
            paints on the very first frame — without this, the page would
            flash the OS theme and then snap to the stored override once
            React mounts. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            try {
              var t = window.localStorage.getItem("cue-theme");
              if (t === "light" || t === "dark") {
                document.documentElement.setAttribute("data-theme", t);
              }
            } catch (e) {}
          `}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
