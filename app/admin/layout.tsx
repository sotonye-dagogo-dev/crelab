import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";

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

  return <AdminShell>{children}</AdminShell>;
}
