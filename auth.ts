import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Temporary scaffolding, by design — see CUE-Tech-Stack.md §2.2: Auth.js's
// real production shape is federated to an IdP broker (Keycloak/Zitadel),
// which the backend's own CUE_AUTH_PROVIDER=oidc already supports as a
// config change. This Credentials provider hitting our own /auth/dev-login
// is the frontend-side half of that same seam, left deliberately open
// rather than implemented this session (Prompt F0's own explicit scope) —
// swapping this provider for an OIDC one later does not require touching
// anything downstream of `auth()`/`useSession()`, since both already only
// ever see `session.accessToken`, never how it was obtained.
const CUE_API_URL = process.env.NEXT_PUBLIC_CUE_API_URL ?? "http://localhost:8000";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Auth.js only auto-trusts the request Host header on a few recognized
  // platforms (Vercel among them); anywhere else it 500s with "There is a
  // problem with the server configuration" — surfaced by CI's own
  // `next start` on a GitHub-hosted runner, not by any local `next dev`
  // (which trusts localhost regardless). Safe here specifically because
  // nothing sits between this app and its own traffic yet — revisit if a
  // reverse proxy/load balancer is ever added in front of it.
  trustHost: true,
  providers: [
    Credentials({
      id: "cue-dev-login",
      name: "CUE dev login",
      credentials: {
        organisation_id: { label: "Organisation ID", type: "text" },
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        const organisationId = credentials?.organisation_id;
        const email = credentials?.email;
        if (typeof organisationId !== "string" || typeof email !== "string") {
          return null;
        }
        if (!organisationId || !email) return null;

        // POST /auth/dev-login (backend/app/api/auth.py) — no credential
        // check beyond CUE_AUTH_PROVIDER=local, per that endpoint's own
        // docstring. This call is the entire "authentication" this
        // provider performs; a bad organisation_id doesn't fail here (the
        // endpoint mints a token unconditionally) but on the first real
        // API request, per that same docstring.
        const res = await fetch(`${CUE_API_URL}/auth/dev-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organisation_id: organisationId, email }),
        });
        if (!res.ok) return null;

        const body = (await res.json()) as { access_token: string; expires_in: number };
        return {
          id: email,
          email,
          accessToken: body.access_token,
          accessTokenExpires: Date.now() + body.expires_in * 1000,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // `user` is only present on the initial sign-in call — this is where
      // the backend's own access token (not Auth.js's session token) gets
      // carried into the JWT that backs the session from then on.
      if (user) {
        token.accessToken = user.accessToken;
        token.accessTokenExpires = user.accessTokenExpires;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
});
