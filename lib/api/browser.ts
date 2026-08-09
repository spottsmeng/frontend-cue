"use client";

import { useSession } from "next-auth/react";
import { useMemo } from "react";

import { createApiClient } from "./client";

/**
 * Client Components: re-creates the client only when the session's own
 * access token changes (a sign-in, a refresh), not on every render —
 * `useSession()` itself re-renders more often than the token does.
 */
export function useApiClient() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  return useMemo(() => createApiClient(() => token), [token]);
}
