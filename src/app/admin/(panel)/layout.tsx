import { AdminShell } from "@/components/admin/AdminShell";
import { logout } from "@/app/actions/auth";
import { requireStaffPage } from "@/lib/auth/guards";
import { can, permissions, roleLabels } from "@/lib/auth/permissions";
import { currentPaymentMode } from "@/lib/orders";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffPage();
  return (
    <AdminShell
      allowed={permissions.filter((p) => can(user.role, p))}
      user={{ email: user.email, name: `${user.firstName} ${user.lastName}`.trim() }}
      roleLabel={roleLabels[user.role]}
      logout={logout}
      paymentMode={currentPaymentMode()}
    >
      {children}
    </AdminShell>
  );
}
