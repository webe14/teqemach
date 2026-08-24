import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/actions/auth";
import { AppShell } from "@/components/layout/AppShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/admin-secure");

  if (profile.role !== "admin" && profile.role !== "collector") redirect("/login");

  return (
    <AppShell role="admin" userName={profile?.full_name ?? profile?.email ?? profile?.phone_number ?? "Admin"}>
      {children}
    </AppShell>
  );
}
