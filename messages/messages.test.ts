import { describe, expect, it } from "vitest";

import { MESSAGE_NAMESPACES, type MessageNamespace } from "@/i18n/namespaces";

import enCommon from "./en/common.json";
import enNav from "./en/nav.json";
import enLivingWip from "./en/livingWip.json";
import enTwin from "./en/twin.json";
import enForesight from "./en/foresight.json";
import enDocuments from "./en/documents.json";
import enAsk from "./en/ask.json";
import enVendors from "./en/vendors.json";
import enAdmin from "./en/admin.json";
import enAnalytics from "./en/analytics.json";

import zhHansCommon from "./zh-Hans/common.json";
import zhHansNav from "./zh-Hans/nav.json";
import zhHansLivingWip from "./zh-Hans/livingWip.json";
import zhHansTwin from "./zh-Hans/twin.json";
import zhHansForesight from "./zh-Hans/foresight.json";
import zhHansDocuments from "./zh-Hans/documents.json";
import zhHansAsk from "./zh-Hans/ask.json";
import zhHansVendors from "./zh-Hans/vendors.json";
import zhHansAdmin from "./zh-Hans/admin.json";
import zhHansAnalytics from "./zh-Hans/analytics.json";

import zhHantCommon from "./zh-Hant/common.json";
import zhHantNav from "./zh-Hant/nav.json";
import zhHantLivingWip from "./zh-Hant/livingWip.json";
import zhHantTwin from "./zh-Hant/twin.json";
import zhHantForesight from "./zh-Hant/foresight.json";
import zhHantDocuments from "./zh-Hant/documents.json";
import zhHantAsk from "./zh-Hant/ask.json";
import zhHantVendors from "./zh-Hant/vendors.json";
import zhHantAdmin from "./zh-Hant/admin.json";
import zhHantAnalytics from "./zh-Hant/analytics.json";

/**
 * The common i18n bug this guards against: a key added to one locale's
 * namespace file and never backfilled into the other two — next-intl falls
 * back to the raw key (or throws in strict mode) at runtime, silently, for
 * exactly the locale a real reader is using. Recurses into nested objects
 * within a namespace and checks in both directions (missing-in-B,
 * extra-in-B) so a stale key left behind in only one bundle is caught too.
 *
 * Static imports, not a glob — `import.meta.glob` is Vite-only and this
 * file also runs through plain `tsc` via `pnpm typecheck`, which doesn't
 * know that API. One more line per namespace when a new one is added
 * (i18n/namespaces.ts's MESSAGE_NAMESPACES, lib/test-utils.tsx and this
 * file all need the same addition — a real but small maintenance cost,
 * traded for typecheck staying clean without a vite/client types
 * dependency this project otherwise has no reason to add).
 */
const BUNDLES: Record<"en" | "zh-Hans" | "zh-Hant", Record<MessageNamespace, unknown>> = {
  en: {
    common: enCommon,
    nav: enNav,
    livingWip: enLivingWip,
    twin: enTwin,
    foresight: enForesight,
    documents: enDocuments,
    ask: enAsk,
    vendors: enVendors,
    admin: enAdmin,
    analytics: enAnalytics,
  },
  "zh-Hans": {
    common: zhHansCommon,
    nav: zhHansNav,
    livingWip: zhHansLivingWip,
    twin: zhHansTwin,
    foresight: zhHansForesight,
    documents: zhHansDocuments,
    ask: zhHansAsk,
    vendors: zhHansVendors,
    admin: zhHansAdmin,
    analytics: zhHansAnalytics,
  },
  "zh-Hant": {
    common: zhHantCommon,
    nav: zhHantNav,
    livingWip: zhHantLivingWip,
    twin: zhHantTwin,
    foresight: zhHantForesight,
    documents: zhHantDocuments,
    ask: zhHantAsk,
    vendors: zhHantVendors,
    admin: zhHantAdmin,
    analytics: zhHantAnalytics,
  },
};

function collectKeyPaths(obj: unknown, prefix = ""): Set<string> {
  const keys = new Set<string>();
  if (obj === null || typeof obj !== "object") return keys;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      for (const nested of collectKeyPaths(value, path)) keys.add(nested);
    } else {
      keys.add(path);
    }
  }
  return keys;
}

const LOCALES = ["en", "zh-Hans", "zh-Hant"] as const;

describe("message bundle key parity", () => {
  for (const namespace of MESSAGE_NAMESPACES) {
    it(`"${namespace}" has an identical key set across all three locales`, () => {
      const keySets = LOCALES.map((locale) => collectKeyPaths(BUNDLES[locale][namespace]));
      const [reference, ...rest] = keySets;

      rest.forEach((keys, i) => {
        const locale = LOCALES[i + 1];
        const missing = [...reference].filter((k) => !keys.has(k));
        const extra = [...keys].filter((k) => !reference.has(k));
        expect(missing, `${locale}/${namespace} is missing keys present in en`).toEqual([]);
        expect(extra, `${locale}/${namespace} has keys not present in en`).toEqual([]);
      });
    });
  }

  it("has no empty string values in any bundle", () => {
    for (const locale of LOCALES) {
      for (const namespace of MESSAGE_NAMESPACES) {
        const bundle = BUNDLES[locale][namespace];
        const empties = [...collectKeyPaths(bundle)].filter((path) => {
          const value = path.split(".").reduce<unknown>((acc, segment) => {
            return acc && typeof acc === "object" ? (acc as Record<string, unknown>)[segment] : undefined;
          }, bundle);
          return value === "";
        });
        expect(empties, `${locale}/${namespace} has empty-string values at: ${empties.join(", ")}`).toEqual(
          [],
        );
      }
    }
  });
});
