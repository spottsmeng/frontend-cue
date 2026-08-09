import "server-only";

import { auth } from "@/auth";

import { createApiClient } from "./client";

/**
 * Server Components / Server Actions: `auth()` (Auth.js's own universal
 * accessor) reads the session cookie for this request, and the resulting
 * client attaches the backend's real access token — never Auth.js's own
 * session token — to every call, per lib/api/client.ts.
 */
export async function apiServer() {
  const session = await auth();
  return createApiClient(() => session?.accessToken);
}
