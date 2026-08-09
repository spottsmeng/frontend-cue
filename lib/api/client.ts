import createClient, { type Middleware } from "openapi-fetch";

import type { paths } from "./schema.gen";

// Judgment call, documented per Prompt F0's own instruction to note it:
// openapi-typescript only generates types, no runtime client, so a thin fetch
// wrapper is still needed to pair with it. openapi-fetch (same maintainer as
// openapi-typescript) is the standard companion — chosen over a heavier
// generated client (Orval, OpenAPI Generator's Axios output) the same way
// earlier backend sessions named and justified their own similarly-scoped
// picks (k6 over locust, per backend/PROGRESS.md).
const baseUrl = process.env.NEXT_PUBLIC_CUE_API_URL ?? "http://localhost:8000";

/**
 * `getToken` is called on every request rather than once at client-creation
 * time, since the caller's own token can change between requests (a session
 * refresh on the server; a `useSession()` re-render on the client) and this
 * client is otherwise created once per render/request, not once per call.
 */
export function createApiClient(
  getToken: () => string | undefined | Promise<string | undefined>,
) {
  const client = createClient<paths>({ baseUrl });

  const authMiddleware: Middleware = {
    async onRequest({ request }) {
      const token = await getToken();
      if (token) {
        request.headers.set("Authorization", `Bearer ${token}`);
      }
      return request;
    },
  };
  client.use(authMiddleware);

  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;
