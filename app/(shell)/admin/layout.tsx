import { AdminSubnav } from "@/components/admin/admin-subnav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border bg-surface px-4 py-3">
        <h1 className="text-sm font-semibold text-ink">Admin console</h1>
      </div>
      <AdminSubnav />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
