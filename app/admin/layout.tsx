import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { PaymentProviderService } from "@/services/PaymentProviderService";
import type { PaymentProviderStatus } from "@/services/PaymentProviderService";

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

  let paymentStatus: PaymentProviderStatus | null = null;
  try {
    paymentStatus = await PaymentProviderService.getStatus();
  } catch (err) {
    // The banner is advisory — never block the admin area on a status probe.
    console.error("[admin] payment status unavailable", err);
  }

  return (
    <AdminShell paymentStatus={paymentStatus}>{children}</AdminShell>
  );
}
