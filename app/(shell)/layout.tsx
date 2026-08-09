import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { apiServer } from "@/lib/api/server";
import { TopNav } from "@/components/app-shell/top-nav";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // proxy.ts already redirects unauthenticated requests optimistically
  // (reading the session cookie only, per Next's own guidance not to do a
  // real check there) — this is the real, request-time check, since a
  // layout wrapping every project-scoped surface is exactly the "close to
  // the data source" place PRD §11.1's "no client-side entitlement logic"
  // asks for.
  if (!session?.accessToken) {
    redirect("/login");
  }

  const api = await apiServer();
  // Already RLS + membership filtered server-side (FR-ADM-02) — rendered
  // as-is, no client-side re-filtering per this list's own docstring.
  const { data: projects } = await api.GET("/projects");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TopNav projects={(projects ?? []).map((p) => ({ id: p.id, name: p.name }))} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
