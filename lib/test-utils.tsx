import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";

import common from "@/messages/en/common.json";
import nav from "@/messages/en/nav.json";
import livingWip from "@/messages/en/livingWip.json";
import twin from "@/messages/en/twin.json";
import foresight from "@/messages/en/foresight.json";
import documents from "@/messages/en/documents.json";
import ask from "@/messages/en/ask.json";
import vendors from "@/messages/en/vendors.json";
import admin from "@/messages/en/admin.json";
import analytics from "@/messages/en/analytics.json";

// Static imports, one per messages/en/*.json file — kept in the same list
// i18n/namespaces.ts's MESSAGE_NAMESPACES enumerates; a namespace added
// there needs its import added here too (a test-time-only duplication,
// not a runtime one — i18n/request.ts's own dynamic `import()` loop is
// what actually serves the app).
const enMessages = { common, nav, livingWip, twin, foresight, documents, ask, vendors, admin, analytics };

function IntlWrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {children}
    </NextIntlClientProvider>
  );
}

/**
 * F9: every component under `useTranslations()`/`getTranslations()` needs a
 * `NextIntlClientProvider` ancestor to render at all — this wraps `render()`
 * with the real `en` bundles (not a hand-picked stub), so a test
 * exercising real message keys also catches a genuinely missing key the
 * same way production would surface it, rather than passing against a
 * fixture that's silently drifted from the real bundle.
 *
 * Uses testing-library's own `wrapper` option (rather than manually
 * nesting the provider around `ui`) specifically so the `rerender()` this
 * returns re-applies the same provider automatically — a manually-nested
 * provider is only present on the first render; a plain-element `rerender`
 * call would otherwise unmount it and every hook relying on it throws.
 */
export function renderWithIntl(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: IntlWrapper, ...options });
}
