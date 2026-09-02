import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/actions/auth";
import { AppShell } from "@/components/layout/AppShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/admin-secure");

  const isAuthorized = Boolean(profile.isAdmin || profile.role === "admin" || profile.role === "collector");
  if (!isAuthorized) {
    redirect("/dashboard/contributor");
  }

  return (
    <AppShell 
      role="admin" 
      userName={profile?.full_name ?? profile?.email ?? profile?.phone_number ?? "Admin"}
      userId={profile?.id}
      isAdmin={true}
    >
      {children}
    </AppShell>
  );
}
