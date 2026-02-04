import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardShell
      user={{
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        email: session.user.email!,
        role: session.user.role,
      }}
    >
      {children}
    </DashboardShell>
  );
}
