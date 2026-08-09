// `export {}` marks this file as a module rather than a global script —
// without it, the `declare module "..."` blocks below stop being
// augmentations (merged into the real package's types) and instead become
// brand-new ambient modules that *replace* the originals outright, e.g.
// silently making `NextAuth(...)`'s own default export disappear.
export {};

// Augments Auth.js's own types with the one non-standard thing this app's
// session carries: the backend's real JWT (app/identity/tokens.py), not
// Auth.js's own session token — lib/api/client.ts attaches this, never the
// Auth.js session cookie itself, to every request against backend/.
//
// Targets "@auth/core/types"/"@auth/core/jwt" directly, not "next-auth" /
// "next-auth/jwt" — the latter two only *re-export* these interfaces
// (`export type { Session, User } from "@auth/core/types"`,
// `export * from "@auth/core/jwt"`), which is a distinct symbol alias, not
// the original declaration. "next-auth/react"'s `useSession()` in
// particular imports `Session` straight from "@auth/core/types" rather
// than through "next-auth" at all, so augmenting only "next-auth" leaves
// that call site (components/app-shell/user-menu.tsx) unaugmented. Ambient
// `declare module "x"` patches are matched by string across the whole
// program regardless of whether this file itself could resolve "x" — pnpm
// only exposes "@auth/core" nested inside next-auth's own install, not
// hoisted to this project's root, but that doesn't matter for this to work.
declare module "@auth/core/types" {
  interface Session {
    accessToken?: string;
  }

  interface User {
    accessToken?: string;
    accessTokenExpires?: number;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string;
    accessTokenExpires?: number;
  }
}
