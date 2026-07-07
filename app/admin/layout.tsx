import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });

  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <AdminSidebar />
      <main className="flex-1 ml-[240px] p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
