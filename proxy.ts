import { NextResponse } from "next/server";

import { auth } from "@/auth";

// Named `proxy.ts`, not `middleware.ts` — Next.js 16 renamed the file
// convention (frontend/AGENTS.md's own warning to check
// node_modules/next/dist/docs/ rather than trained-in knowledge; see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
// proxy.md). Functionality is unchanged from what Auth.js's own docs still
// call "middleware".
//
// Optimistic only (Next's own authentication guide: "avoid database checks
// to prevent performance issues... it's important to only read the session
// from the cookie") — this reads the Auth.js session cookie, not the
// backend, and exists to redirect obviously-unauthenticated requests before
// they render. The real check is app/(shell)/layout.tsx's own `auth()` call
// server-side, which is what PRD §11.1's "no client-side entitlement logic"
// actually requires — this proxy is a UX nicety on top of that, never a
// substitute for it.
export default auth((req) => {
  const isAuthenticated = Boolean(req.auth?.accessToken);
  const { pathname } = req.nextUrl;

  if (!isAuthenticated && pathname !== "/login") {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
